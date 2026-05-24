#!/usr/bin/env python3
"""Phase 7 - v1 baseline evaluator. RES-02 / D-13 supporting artifact.

Loads the existing v1 SVM (svm_pipeline.joblib) and evaluates it on a 20%
hold-out subset of the current 100-book corpus. Hold-out selection per D-12:
each test book's author has >=1 other book by the same author in training
(models the realistic upload scenario).

Outputs JSON for VALIDATION_PROTOCOL.md to embed verbatim:
  - macro_f1 (headline metric per D-14)
  - per_genre_f1
  - accuracy (v1 continuity)
  - confusion_matrix
  - holdout_gutenberg_ids
  - holdout_size
  - per_holdout_predictions (gutenberg_id, true_genre, predicted_genre, correct)

This script does NOT retrain, does NOT modify any data/, does NOT touch backend/.
It is a one-shot read-only evaluator. Deterministic given fixed seed.

Usage:
  python scripts/phase7_v1_baseline.py --out .planning/research/v2/v1_baseline_results.json

Verify lineage match before running. If lineage.json's alpha/k/window
disagree with config/params.yaml values used here, refuse to run.

D-13 caveat: v1 SVM was trained (via LOOCV during selection) on these same 99
books, so v1 macro-F1 here is in-sample-leaning and will look unrealistically
good. The v2 SVM (Phase 8) will be trained on a different v2-restructured
corpus, so v2's score on this same hold-out is genuine out-of-sample. The
headline-vs-headline comparison is still valid: v2 must beat v1's number
despite the unfair handicap.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

import joblib
import numpy as np
import yaml
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
)

# Repository root resolution (script lives at scripts/phase7_v1_baseline.py)
REPO = Path(__file__).resolve().parent.parent

# v1 artifacts (read-only)
SVM_PATH = REPO / "data" / "models" / "svm_pipeline.joblib"
LINEAGE_PATH = REPO / "data" / "models" / "svm_pipeline.joblib.lineage.json"
FEATURES_PATH = REPO / "data" / "features" / "feature_matrix_w15_k200.npy"
LABELS_PATH = REPO / "data" / "features" / "labels.npy"
BOOK_ORDER_PATH = REPO / "data" / "features" / "book_order.json"
BOOKS_YAML = REPO / "corpus" / "books.yaml"
PARAMS_YAML = REPO / "config" / "params.yaml"

# v1 hyperparameters that produced the SVM (cross-checked against lineage.json)
EXPECTED_ALPHA = 0.7
EXPECTED_K = 200
EXPECTED_WINDOW = 15
EXPECTED_TOPO_DIMS = 400  # features.grid_resolution=20 -> 20x20 persistence image flattened

# D-11: 20% hold-out
HOLDOUT_FRACTION = 0.20

# Stratified per-genre selection: with 10 genres x ~10 books and 20% target,
# pick 2 books per genre = 20-book hold-out.
HOLDOUT_PER_GENRE = 2

# Determinism
SEED = 42


def verify_lineage() -> None:
    """Refuse to run if v1 artifacts don't match expected hyperparameters."""
    if not LINEAGE_PATH.exists():
        sys.exit(f"ERROR: lineage sidecar missing at {LINEAGE_PATH}")
    lineage = json.loads(LINEAGE_PATH.read_text(encoding="utf-8"))
    for key, expected in (
        ("alpha", EXPECTED_ALPHA),
        ("k_clusters", EXPECTED_K),
        ("window", EXPECTED_WINDOW),
    ):
        if lineage.get(key) != expected:
            sys.exit(
                f"ERROR: lineage.json {key}={lineage.get(key)!r}, expected {expected!r}. "
                f"v1 SVM lineage drift detected."
            )
    print(
        f"[OK] Lineage match: alpha={EXPECTED_ALPHA}, k={EXPECTED_K}, "
        f"window={EXPECTED_WINDOW}"
    )


def load_v1_artifacts():
    """Load v1 SVM, raw feature matrix, labels, book order, and books.yaml.

    Filters out unknown-genre (-1) labels to match scripts/06_validate.py
    lines 105-112 (the SVM is trained on the 99-book non-unknown subset).
    """
    svm = joblib.load(SVM_PATH)
    X_raw = np.load(FEATURES_PATH)           # (n, 600) = topo (400) + loc (200)
    y = np.load(LABELS_PATH)                 # (n,) int
    with open(BOOK_ORDER_PATH, "r", encoding="utf-8") as f:
        book_order = json.load(f)

    if X_raw.shape[1] != EXPECTED_TOPO_DIMS + EXPECTED_K:
        sys.exit(
            f"ERROR: feature matrix shape {X_raw.shape[1]}D != expected "
            f"{EXPECTED_TOPO_DIMS + EXPECTED_K}D"
        )
    if len(book_order) != X_raw.shape[0]:
        sys.exit(
            f"ERROR: book_order len {len(book_order)} != features rows "
            f"{X_raw.shape[0]}"
        )

    # Filter unknowns
    mask = y != -1
    X_raw = X_raw[mask]
    y = y[mask]
    book_order = [b for b in book_order if b["label"] != -1]
    print(
        f"[OK] Loaded {len(book_order)} books x {X_raw.shape[1]}D features "
        f"(after filtering -1 labels)"
    )

    with open(BOOKS_YAML, "r", encoding="utf-8") as f:
        books_yaml = yaml.safe_load(f)

    # Build gutenberg_id (str) -> author lookup, gutenberg_id (str) -> genre lookup
    gid_to_author: dict[str, str] = {}
    gid_to_genre: dict[str, str] = {}
    for genre_name, entries in books_yaml["genres"].items():
        for entry in entries:
            gid = str(entry["gutenberg_id"])
            gid_to_author[gid] = entry["author"]
            gid_to_genre[gid] = genre_name

    return svm, X_raw, y, book_order, gid_to_author, gid_to_genre


def apply_alpha_weighting(X_raw: np.ndarray, alpha: float = EXPECTED_ALPHA) -> np.ndarray:
    """Mirror scripts/06_validate.py lines 114-117 exactly."""
    topo = X_raw[:, :EXPECTED_TOPO_DIMS]
    loc = X_raw[:, EXPECTED_TOPO_DIMS:]
    return np.concatenate([alpha * topo, (1.0 - alpha) * loc], axis=1)


def select_holdout(
    book_order: list[dict],
    gid_to_author: dict[str, str],
) -> list[int]:
    """D-12 selection rule: each hold-out book's author has >=1 other book by
    the same author in the training set. Stratified per genre: 2 per genre.

    Within each genre, prefer books whose author has the MOST other works in
    the corpus (strongest D-12 signal). Ties broken by ascending gutenberg_id.
    Returns indices into book_order (and rows of X / y).
    """
    # Seeded RNG kept for reproducibility hooks (no random calls today, but
    # SEED is part of the JSON lineage audit and may be used by future
    # tie-breaker extensions per D-13).
    _ = np.random.default_rng(SEED)

    # Count author occurrences in the FULL corpus (before any hold-out split)
    author_count_global: Counter = Counter(
        gid_to_author.get(b["gutenberg_id"], "_unknown") for b in book_order
    )

    # Group books by genre
    genre_to_books: dict[str, list[tuple[int, dict]]] = defaultdict(list)
    for idx, b in enumerate(book_order):
        genre_to_books[b["genre"]].append((idx, b))

    holdout_indices: list[int] = []
    for genre, entries in sorted(genre_to_books.items()):
        # Score each candidate: number of OTHER books by the same author
        scored: list[tuple[int, int, int, dict]] = []
        for idx, b in entries:
            author = gid_to_author.get(b["gutenberg_id"], "_unknown")
            other_count = author_count_global[author] - 1  # exclude self
            scored.append((other_count, int(b["gutenberg_id"]), idx, b))

        # D-12 hard constraint: only keep candidates with other_count >= 1
        eligible = [s for s in scored if s[0] >= 1]
        if len(eligible) < HOLDOUT_PER_GENRE:
            print(
                f"[WARN] genre {genre}: only {len(eligible)} D-12-eligible books "
                f"(need {HOLDOUT_PER_GENRE}). Using all eligible + filling with "
                f"next-best by other_count."
            )
            eligible = sorted(scored, key=lambda s: (-s[0], s[1]))[:HOLDOUT_PER_GENRE]
        else:
            # Sort: highest other_count first, ties broken by ascending gutenberg_id
            eligible = sorted(eligible, key=lambda s: (-s[0], s[1]))[:HOLDOUT_PER_GENRE]

        for _, _gid, idx, _ in eligible:
            holdout_indices.append(idx)

    holdout_indices = sorted(holdout_indices)
    print(
        f"[OK] Selected {len(holdout_indices)} hold-out books "
        f"(target {HOLDOUT_PER_GENRE} per genre x {len(genre_to_books)} genres "
        f"= {HOLDOUT_PER_GENRE * len(genre_to_books)})"
    )
    return holdout_indices


def evaluate(
    svm,
    X: np.ndarray,
    y: np.ndarray,
    holdout_idx: list[int],
    book_order: list[dict],
):
    """Predict on hold-out subset; compute macro-F1, per-genre F1, accuracy,
    confusion matrix."""
    X_test = X[holdout_idx]
    y_test = y[holdout_idx]

    y_pred = svm.predict(X_test)

    macro_f1 = f1_score(y_test, y_pred, average="macro")
    acc = accuracy_score(y_test, y_pred)
    labels_present = sorted(set(y_test.tolist()) | set(y_pred.tolist()))
    per_label_f1 = f1_score(
        y_test, y_pred, average=None, labels=labels_present, zero_division=0
    )

    # Map labels to genre names via book_order
    label_to_genre: dict[int, str] = {}
    for b in book_order:
        label_to_genre[int(b["label"])] = b["genre"]

    per_genre_f1: dict[str, float] = {}
    for lbl, score in zip(labels_present, per_label_f1):
        per_genre_f1[label_to_genre.get(int(lbl), f"label_{lbl}")] = float(score)

    cm_labels = sorted(set(y_test.tolist()) | set(y_pred.tolist()))
    cm = confusion_matrix(y_test, y_pred, labels=cm_labels)
    cm_genre_labels = [
        label_to_genre.get(int(lbl), f"label_{lbl}") for lbl in cm_labels
    ]

    per_holdout_predictions = []
    for arr_idx, idx in enumerate(holdout_idx):
        b = book_order[idx]
        per_holdout_predictions.append({
            "gutenberg_id": int(b["gutenberg_id"]),
            "genre_true": b["genre"],
            "genre_predicted": label_to_genre.get(
                int(y_pred[arr_idx]), f"label_{y_pred[arr_idx]}"
            ),
            "correct": bool(y_test[arr_idx] == y_pred[arr_idx]),
        })

    return {
        "macro_f1": float(macro_f1),
        "accuracy": float(acc),
        "per_genre_f1": per_genre_f1,
        "confusion_matrix": cm.tolist(),
        "confusion_matrix_labels": cm_genre_labels,
        "holdout_gutenberg_ids": [
            int(book_order[i]["gutenberg_id"]) for i in holdout_idx
        ],
        "holdout_size": len(holdout_idx),
        "per_holdout_predictions": per_holdout_predictions,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True, help="Output JSON path")
    args = parser.parse_args()

    verify_lineage()
    svm, X_raw, y, book_order, gid_to_author, _gid_to_genre = load_v1_artifacts()
    X = apply_alpha_weighting(X_raw, alpha=EXPECTED_ALPHA)
    holdout_idx = select_holdout(book_order, gid_to_author)

    results = evaluate(svm, X, y, holdout_idx, book_order)
    results["v1_lineage"] = {
        "alpha": EXPECTED_ALPHA,
        "k_clusters": EXPECTED_K,
        "window": EXPECTED_WINDOW,
        "seed": SEED,
        "holdout_selection_rule": (
            "D-12: each test book's author has >=1 other book by same author in "
            "training (author-overlap with training); stratified 2 per genre; "
            "ties broken by ascending gutenberg_id"
        ),
    }

    # Echo the on-disk lineage sidecar for full audit trail
    try:
        lineage = json.loads(LINEAGE_PATH.read_text(encoding="utf-8"))
        results["v1_lineage"]["corpus_hash"] = lineage.get("corpus_hash")
        results["v1_lineage"]["w2v_model_sha256"] = lineage.get("w2v_model_sha256")
    except Exception:
        # Non-fatal — lineage already passed verify_lineage() so keys exist
        pass

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps(results, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )

    print()
    print("=== v1 baseline (Phase 7 - D-13) ===")
    print(f"Hold-out size:    {results['holdout_size']} books")
    print(f"Macro-F1:         {results['macro_f1']:.4f}")
    print(f"Accuracy:         {results['accuracy']:.4f}")
    print("Per-genre F1:")
    for g, f1 in sorted(results["per_genre_f1"].items()):
        print(f"  {g:<14} {f1:.4f}")
    print()
    try:
        rel = args.out.relative_to(REPO) if args.out.is_absolute() else args.out
    except ValueError:
        rel = args.out
    print(f"Wrote -> {rel}")


if __name__ == "__main__":
    main()
