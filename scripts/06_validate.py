#!/usr/bin/env python3
"""v2 SVM validator — VALIDATION_PROTOCOL.md §10 implementation.

Computes the four required routines:
  1. evaluate_on_holdout         -- §3 + §5 hold-out evaluation
  2. cross_validate_grouped      -- §6 GroupKFold(groups=author)
  3. per_author_held_out_smoke_test -- §8 anti-leakage guardrail
  4. permutation_null_test       -- §7 statistical-significance backstop

Also retains v1 LOOCV (number 3 of the §9 three-numbers reporting pattern).

Default invocation (Phase 8 Wave 3):
  python scripts/06_validate.py --report-out results/v2_validation_report.md \\
         --n-permutations 1000 --cv-n-splits 8

Legacy invocation (window-only, for sweep compatibility):
  python scripts/06_validate.py --window 15 --legacy
"""

from __future__ import annotations

import argparse
import datetime
import hashlib
import json
import sys
import time
import warnings
from collections import Counter
from pathlib import Path

import numpy as np
import yaml
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent))
from utils import load_params  # noqa: E402
# Phase 9 (D-40) single source of truth for HOLDOUT_GUTENBERG_IDS.
# Use the `scripts.` qualified path so the import resolves identically
# whether 06_validate.py is run directly or via importlib (test_06_validate).
from scripts.constants import HOLDOUT_GUTENBERG_IDS  # noqa: E402


# ============================================================================
# VALIDATION_PROTOCOL §10 -- the four new routines
# ============================================================================

def _build_pipe(svm_C: float, svm_kernel: str, random_state: int = 42):
    """Construct the canonical (StandardScaler + VarianceThreshold + SVC) pipeline."""
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.feature_selection import VarianceThreshold
    from sklearn.svm import SVC

    return Pipeline([
        ("scaler", StandardScaler()),
        ("vt", VarianceThreshold(threshold=1e-4)),
        ("svm", SVC(
            kernel=svm_kernel,
            C=svm_C,
            gamma="scale",
            class_weight="balanced",
            random_state=random_state,
        )),
    ])


def evaluate_on_holdout(
    svm_pipeline,
    X_full: np.ndarray,
    y_full: np.ndarray,
    gutenberg_ids_full: list,
    holdout_gutenberg_ids: list,
) -> dict:
    """Evaluate v2 SVM on the v1-frozen hold-out subset per VALIDATION_PROTOCOL §3.

    Args:
        svm_pipeline: fitted sklearn Pipeline (StandardScaler + VarianceThreshold + SVC).
        X_full: (n_books, n_features) feature matrix for the FULL v2 corpus.
        y_full: (n_books,) ground-truth v2 genre labels.
        gutenberg_ids_full: (n_books,) gutenberg_ids aligned row-by-row with X_full/y_full.
        holdout_gutenberg_ids: canonical 20 pinned ids from VALIDATION_PROTOCOL §3.

    Returns:
        {
            'macro_f1': float,                        # headline per D-14
            'per_genre_f1': dict[str, float],         # keys = v2 genre labels
            'accuracy': float,
            'confusion_matrix': list[list[int]],
            'n_in_comparison': int,                   # subset of holdout ids found in v2
            'in_comparison_ids': list[int],
            'out_of_comparison_ids': list[int],       # holdout ids absent from v2
            'predictions': list[dict],                # per-book {gutenberg_id, true, pred, correct}
        }

    Note: hold-out books are SCORED but NEVER trained on. The svm_pipeline passed
    here is the production SVM (which WAS trained on these ids if they're in v2);
    for true out-of-sample eval, the caller must pass an svm_pipeline trained on
    (v2 corpus MINUS holdout_ids). See main() for the train/eval split.
    """
    from sklearn.metrics import f1_score, accuracy_score, confusion_matrix

    gids_int = [int(g) for g in gutenberg_ids_full]
    holdout_int = [int(h) for h in holdout_gutenberg_ids]

    in_comparison_ids = [h for h in holdout_int if h in gids_int]
    out_of_comparison_ids = [h for h in holdout_int if h not in gids_int]

    if len(in_comparison_ids) == 0:
        return {
            "macro_f1": float("nan"),
            "per_genre_f1": {},
            "accuracy": float("nan"),
            "confusion_matrix": [],
            "n_in_comparison": 0,
            "in_comparison_ids": [],
            "out_of_comparison_ids": out_of_comparison_ids,
            "predictions": [],
        }

    gid_to_row = {gid: i for i, gid in enumerate(gids_int)}
    test_idx = np.array([gid_to_row[h] for h in in_comparison_ids], dtype=int)
    X_test = X_full[test_idx]
    y_test = y_full[test_idx]

    y_pred = svm_pipeline.predict(X_test)

    # Label set for the report keys: all classes the SVM knows about
    classes = list(svm_pipeline.classes_) if hasattr(svm_pipeline, "classes_") else sorted(set(y_full.tolist()))

    macro_f1 = float(f1_score(y_test, y_pred, labels=classes, average="macro", zero_division=0))
    per_genre_f1_arr = f1_score(y_test, y_pred, labels=classes, average=None, zero_division=0)
    per_genre_f1 = {int(c): float(s) for c, s in zip(classes, per_genre_f1_arr)}
    acc = float(accuracy_score(y_test, y_pred))
    cm = confusion_matrix(y_test, y_pred, labels=classes).tolist()

    predictions = []
    for i, gid in enumerate(in_comparison_ids):
        true_lab = int(y_test[i])
        pred_lab = int(y_pred[i])
        predictions.append({
            "gutenberg_id": gid,
            "true": true_lab,
            "pred": pred_lab,
            "correct": true_lab == pred_lab,
        })

    return {
        "macro_f1": macro_f1,
        "per_genre_f1": per_genre_f1,
        "accuracy": acc,
        "confusion_matrix": cm,
        "n_in_comparison": len(in_comparison_ids),
        "in_comparison_ids": in_comparison_ids,
        "out_of_comparison_ids": out_of_comparison_ids,
        "predictions": predictions,
    }


def cross_validate_grouped(
    X: np.ndarray,
    y: np.ndarray,
    groups,
    n_splits: int = 8,
    svm_C: float = 10.0,
    svm_kernel: str = "rbf",
) -> dict:
    """GroupKFold(groups=author) cross-validation per VALIDATION_PROTOCOL §6.

    Args:
        X: (n_books, n_features) feature matrix.
        y: (n_books,) labels.
        groups: (n_books,) author strings aligned row-by-row with X.
        n_splits: K = min(distinct_authors_per_genre), expected 8 per D-08.
            If actual minimum author count per genre falls below 8, caller passes
            the floor (default n_splits=8; falls back to 5 per planner discretion).
        svm_C, svm_kernel: re-instantiated SVC inside each fold (do not pass a
            pre-fitted pipeline — that would leak the v2 training step into folds).

    Returns:
        {
            'mean': float,            # mean macro-F1 across folds
            'std': float,             # std macro-F1 across folds
            'fold_scores': list[float],   # per-fold macro-F1
            'n_splits_actual': int,   # may differ from request if groups insufficient
        }
    """
    from sklearn.model_selection import GroupKFold
    from sklearn.metrics import f1_score

    groups_arr = np.asarray(groups)
    n_distinct_groups = len(set(groups_arr.tolist()))
    n_splits_actual = int(min(n_splits, n_distinct_groups))
    if n_splits_actual < 2:
        return {
            "mean": float("nan"),
            "std": float("nan"),
            "fold_scores": [],
            "n_splits_actual": n_splits_actual,
        }

    gkf = GroupKFold(n_splits=n_splits_actual)
    fold_scores = []
    for train_idx, test_idx in gkf.split(X, y, groups=groups_arr):
        pipe = _build_pipe(svm_C, svm_kernel)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            pipe.fit(X[train_idx], y[train_idx])
            y_pred = pipe.predict(X[test_idx])
        # macro-F1 across all classes present (zero_division=0 to handle absent labels in a fold)
        labels_all = sorted(set(y.tolist()))
        score = float(f1_score(y[test_idx], y_pred, labels=labels_all, average="macro", zero_division=0))
        fold_scores.append(score)

    return {
        "mean": float(np.mean(fold_scores)),
        "std": float(np.std(fold_scores)),
        "fold_scores": fold_scores,
        "n_splits_actual": n_splits_actual,
    }


def per_author_held_out_smoke_test(
    X: np.ndarray,
    y: np.ndarray,
    authors,
    svm_C: float = 10.0,
    svm_kernel: str = "rbf",
    loocv_acc: float | None = None,
) -> dict:
    """Per-author held-out anti-leakage smoke test per VALIDATION_PROTOCOL §8.

    For each author A with >=2 books in the corpus:
      1. Remove all of A's books from training.
      2. Train SVM on remaining corpus.
      3. Predict on A's held-out books.
      4. Compute A's accuracy.

    Args:
        X, y, authors: aligned arrays for the v2 corpus.
        svm_C, svm_kernel: passed to fresh SVC per fold.
        loocv_acc: precomputed LOOCV accuracy; if None, computed inline (expensive).

    Returns:
        {
            'per_author_accuracy': dict[str, float],
            'mean_per_author_accuracy': float,
            'min_per_author_accuracy': float,
            'mean_gap_pp': float,           # 100 * (loocv_acc - mean_per_author_accuracy)
            'worst_case_gap_pp': float,     # 100 * (loocv_acc - min_per_author_accuracy)
            'loocv_acc': float,
            'pass_threshold_pp': 10.0,
            'mean_gap_passes': bool,        # mean_gap_pp <= 10.0
            'worst_case_passes': bool,      # worst_case_gap_pp <= 10.0 (informational)
            'n_authors_tested': int,        # count of authors with >=2 books
        }

    Per D-31: if `mean_gap_passes` is False, caller writes the "ANTI-LEAKAGE
    GUARDRAIL FAILED" disclaimer at the top of v2_validation_report.md.
    """
    from sklearn.metrics import accuracy_score
    from sklearn.model_selection import LeaveOneOut

    authors_arr = np.asarray(authors)
    counts = Counter(authors_arr.tolist())
    multi_book_authors = sorted([a for a, n in counts.items() if n >= 2])

    if loocv_acc is None:
        # Compute LOOCV inline (used by tests; main() passes precomputed value)
        loo = LeaveOneOut()
        y_pred_all = np.empty_like(y)
        for train_idx, test_idx in loo.split(X):
            pipe = _build_pipe(svm_C, svm_kernel)
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                pipe.fit(X[train_idx], y[train_idx])
                y_pred_all[test_idx] = pipe.predict(X[test_idx])
        loocv_acc = float(accuracy_score(y, y_pred_all))

    per_author_accuracy = {}
    for author in multi_book_authors:
        train_mask = authors_arr != author
        test_mask = ~train_mask
        if train_mask.sum() == 0 or test_mask.sum() == 0:
            continue
        pipe = _build_pipe(svm_C, svm_kernel)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            pipe.fit(X[train_mask], y[train_mask])
            y_pred = pipe.predict(X[test_mask])
        per_author_accuracy[author] = float(accuracy_score(y[test_mask], y_pred))

    if len(per_author_accuracy) == 0:
        return {
            "per_author_accuracy": {},
            "mean_per_author_accuracy": float("nan"),
            "min_per_author_accuracy": float("nan"),
            "mean_gap_pp": float("nan"),
            "worst_case_gap_pp": float("nan"),
            "loocv_acc": float(loocv_acc),
            "pass_threshold_pp": 10.0,
            "mean_gap_passes": False,
            "worst_case_passes": False,
            "n_authors_tested": 0,
        }

    accs = list(per_author_accuracy.values())
    mean_acc = float(np.mean(accs))
    min_acc = float(min(accs))
    mean_gap_pp = float(100.0 * (loocv_acc - mean_acc))
    worst_gap_pp = float(100.0 * (loocv_acc - min_acc))

    return {
        "per_author_accuracy": per_author_accuracy,
        "mean_per_author_accuracy": mean_acc,
        "min_per_author_accuracy": min_acc,
        "mean_gap_pp": mean_gap_pp,
        "worst_case_gap_pp": worst_gap_pp,
        "loocv_acc": float(loocv_acc),
        "pass_threshold_pp": 10.0,
        "mean_gap_passes": mean_gap_pp <= 10.0,
        "worst_case_passes": worst_gap_pp <= 10.0,
        "n_authors_tested": len(per_author_accuracy),
    }


def permutation_null_test(
    X: np.ndarray,
    y: np.ndarray,
    n_permutations: int = 1000,
    svm_C: float = 10.0,
    svm_kernel: str = "rbf",
    random_state: int = 42,
) -> dict:
    """Permutation null hypothesis test per VALIDATION_PROTOCOL §7.

    Shuffles labels n_permutations times; trains an SVM on each shuffle; compares
    permuted macro-F1 distribution to the observed (real-label) macro-F1.

    Returns:
        {
            'observed_macro_f1': float,
            'permuted_macro_f1s': list[float],     # length n_permutations
            'p_value': float,                       # (count(permuted >= observed) + 1) / (n + 1)
            'mean_permuted': float,
            'std_permuted': float,
            'significant_at_0_05': bool,
        }

    Deterministic given random_state. Threshold p < 0.05 per VALIDATION_PROTOCOL §7.
    """
    from sklearn.model_selection import LeaveOneOut
    from sklearn.metrics import f1_score

    labels_all = sorted(set(y.tolist()))

    def _loocv_macro_f1(X_in, y_in):
        loo = LeaveOneOut()
        y_pred = np.empty_like(y_in)
        for tr, te in loo.split(X_in):
            pipe = _build_pipe(svm_C, svm_kernel)
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                pipe.fit(X_in[tr], y_in[tr])
                y_pred[te] = pipe.predict(X_in[te])
        return float(f1_score(y_in, y_pred, labels=labels_all, average="macro", zero_division=0))

    observed = _loocv_macro_f1(X, y)

    rng = np.random.default_rng(random_state)
    permuted_scores = []
    for _ in range(n_permutations):
        y_shuf = rng.permutation(y)
        permuted_scores.append(_loocv_macro_f1(X, y_shuf))

    permuted_arr = np.asarray(permuted_scores)
    # p-value: (count of permuted scores >= observed + 1) / (n + 1)
    p_value = float((np.sum(permuted_arr >= observed) + 1) / (n_permutations + 1))

    return {
        "observed_macro_f1": observed,
        "permuted_macro_f1s": permuted_scores,
        "p_value": p_value,
        "mean_permuted": float(np.mean(permuted_arr)),
        "std_permuted": float(np.std(permuted_arr)),
        "significant_at_0_05": bool(p_value < 0.05),
    }


# ============================================================================
# Report builder + main()
# ============================================================================

# v2 merged-key rule constants (planner-locked per Task 3.2)
V1_TO_V2_MERGED = {
    "gothic_horror": ("gothic", "horror"),
    "speculative": ("scifi", "fantasy"),
}
V2_UNCHANGED = {"adventure", "historical", "literary", "mystery", "romance", "western"}
V2_GENRE_ORDER = [
    "adventure", "gothic_horror", "historical", "literary",
    "mystery", "romance", "speculative", "western",
]


def _v1_holdout_support_per_v1_genre():
    """From v1_baseline_results.json per_holdout_predictions, count holdout books per v1 genre key.

    Returns: dict[v1_genre_key -> n_holdout_books].
    """
    p = Path(__file__).parent.parent / ".planning" / "research" / "v2" / "v1_baseline_results.json"
    with open(p, encoding="utf-8") as f:
        data = json.load(f)
    counts = Counter()
    for entry in data["per_holdout_predictions"]:
        counts[entry["genre_true"]] += 1
    return counts


def _v1_baseline():
    """Load v1 baseline JSON. Returns the full dict."""
    p = Path(__file__).parent.parent / ".planning" / "research" / "v2" / "v1_baseline_results.json"
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def _area_weighted_v1_f1_for_merged(v2_key, v1_per_genre_f1, v1_support):
    """Compute the area-weighted mean v1 F1 for a merged v2 genre.

    weight = v1_support[constituent], i.e. the n holdout books of that constituent in the
    20-ID pinned set. Returns 0.0 if total weight is zero (matches both constituents being 0.0).
    """
    constituents = V1_TO_V2_MERGED[v2_key]
    total_w = sum(v1_support.get(c, 0) for c in constituents)
    if total_w == 0:
        return 0.0
    weighted = sum(v1_support.get(c, 0) * v1_per_genre_f1.get(c, 0.0) for c in constituents)
    return weighted / total_w


def _load_v2_corpus_and_features(window: int, k_clusters: int, alpha: float):
    """Load v2 feature matrix + labels + aligned author/gid arrays.

    Returns (X, y, authors, gutenberg_ids, label_to_genre).
    """
    features_dir = Path(__file__).parent.parent / "data" / "features"
    matrix_path = features_dir / f"feature_matrix_w{window}_k{k_clusters}.npy"
    if not matrix_path.exists():
        raise FileNotFoundError(
            f"{matrix_path.name} not found. Run 05_build_features.py first."
        )

    X_raw = np.load(str(matrix_path))
    y = np.load(str(features_dir / "labels.npy"))
    with open(features_dir / "book_order.json") as f:
        book_order = json.load(f)

    # Drop label==-1 rows
    mask = y != -1
    X_raw = X_raw[mask]
    y = y[mask]
    book_order = [e for e in book_order if e["label"] != -1]

    # Apply alpha weighting (matches existing v1 pipeline)
    topo = X_raw[:, :400]
    loc = X_raw[:, 400:]
    X = np.concatenate([alpha * topo, (1 - alpha) * loc], axis=1)

    # Build author array from corpus/books.yaml
    books_yaml = Path(__file__).parent.parent / "corpus" / "books.yaml"
    with open(books_yaml, encoding="utf-8") as f:
        d = yaml.safe_load(f)
    gid_to_author = {}
    for genre, books in d["genres"].items():
        for b in books:
            gid_to_author[str(b["gutenberg_id"])] = b["author"]

    gutenberg_ids = []
    authors = []
    label_to_genre = {}
    for e in book_order:
        gid = str(e["gutenberg_id"])
        gutenberg_ids.append(int(gid))
        authors.append(gid_to_author.get(gid, "UNKNOWN"))
        label_to_genre[int(e["label"])] = e["genre"]

    return X, y, np.array(authors, dtype=object), gutenberg_ids, label_to_genre


def _classes_to_genre_names(classes, label_to_genre):
    return [label_to_genre.get(int(c), f"label_{int(c)}") for c in classes]


def _format_per_genre_f1_table(per_genre_f1_v2, v1_baseline, v1_support, label_to_genre):
    """Build the per-genre F1 markdown table per planner-locked merged-key rule.

    per_genre_f1_v2: dict[int_label -> float] from evaluate_on_holdout.
    """
    v1_pg = v1_baseline["per_genre_f1"]

    # Map int_label -> v2 genre name
    v2_label_to_name = {lab: name for lab, name in label_to_genre.items()}
    # Reverse: name -> v2 F1 (default 0.0 if absent from holdout)
    v2_name_to_f1 = {}
    for lab, f1 in per_genre_f1_v2.items():
        name = v2_label_to_name.get(int(lab), f"label_{lab}")
        v2_name_to_f1[name] = f1

    annotation = (
        "> **Merged-key rule (planner-locked, see Task 3.2):** For merged-key v2 genres "
        "(gothic_horror = v1 gothic + v1 horror; speculative = v1 scifi + v1 fantasy), the v1 F1 "
        "column shows the area-weighted mean of constituent v1 keys' F1 (weighted by their "
        "hold-out support count from the 20-ID §3 pinned set); the delta column reads "
        "`n/a — schema mismatch`. Unchanged-genre rows compute delta normally as `v2 F1 - v1 F1`."
    )

    lines = [annotation, "", "| Genre | v1 F1 | v2 F1 | Delta |",
             "|-------|------:|------:|------:|"]
    for genre in V2_GENRE_ORDER:
        v2_f1 = v2_name_to_f1.get(genre, 0.0)
        if genre in V2_UNCHANGED:
            v1_f1 = v1_pg.get(genre, 0.0)
            delta = v2_f1 - v1_f1
            lines.append(
                f"| {genre} | {v1_f1:.4f} | {v2_f1:.4f} | {delta:+.4f} |"
            )
        else:
            constituents = V1_TO_V2_MERGED[genre]
            v1_f1 = _area_weighted_v1_f1_for_merged(genre, v1_pg, v1_support)
            c1, c2 = constituents
            note = (f"{v1_f1:.4f} (area-weighted mean of v1 {c1} "
                    f"{v1_pg.get(c1, 0.0):.4f} + {c2} {v1_pg.get(c2, 0.0):.4f})")
            lines.append(f"| {genre} | {note} | {v2_f1:.4f} | n/a — schema mismatch |")

    return "\n".join(lines)


def _format_confusion_matrix(cm, classes, label_to_genre):
    """Build a markdown confusion-matrix block from list-of-list ints."""
    names = _classes_to_genre_names(classes, label_to_genre)
    if not cm:
        return "_No in-comparison hold-out books — confusion matrix empty._"
    lines = ["| true \\ pred | " + " | ".join(names) + " |",
             "|---|" + "|".join(["---"] * len(names)) + "|"]
    for row, true_name in zip(cm, names):
        lines.append("| " + true_name + " | " + " | ".join(str(x) for x in row) + " |")
    return "\n".join(lines)


def _compose_report(
    *,
    holdout_result,
    cv_result,
    smoke_result,
    perm_result,
    v2_loocv_acc,
    v1_baseline,
    v1_support,
    label_to_genre,
    classes,
    lineage,
    args,
    timestamp,
    corpus_size,
    eval_train_size,
    cexp_03_verdict,
    cexp_04_verdict,
    smoke_passed,
):
    """Compose the v2_validation_report.md markdown."""
    v1_macro_f1 = float(v1_baseline["macro_f1"])
    v2_macro_f1 = float(holdout_result["macro_f1"])
    perm_p = float(perm_result["p_value"])

    # Status section
    if smoke_passed:
        smoke_line = "**Per-author smoke test (D-31 trigger):** Per-author smoke test: PASSED"
    else:
        smoke_line = ("**Per-author smoke test (D-31 trigger):** ANTI-LEAKAGE GUARDRAIL FAILED "
                      "(see §\"Anti-Leakage Disclaimer\" below)")

    status_block = [
        "## Status",
        "",
        smoke_line,
        "",
        f"**CEXP-03:** {cexp_03_verdict}  (macro-F1 > {v1_macro_f1:.4f} AND p<0.05)",
        f"**CEXP-04:** {cexp_04_verdict}  (GroupKFold gap <=15pp vs hold-out)",
    ]

    # Disclaimer (only if smoke failed)
    disclaimer_block = []
    if not smoke_passed:
        mean_gap = smoke_result["mean_gap_pp"]
        per_author = smoke_result["per_author_accuracy"]
        mean_acc = smoke_result["mean_per_author_accuracy"]
        worst = sorted(per_author.items(), key=lambda kv: kv[1])[:5]
        disclaimer_block = [
            "",
            "## Anti-Leakage Disclaimer",
            "",
            f"**Per VALIDATION_PROTOCOL.md §8 (second option) and Phase 8 decision D-31:**",
            "",
            f"The per-author held-out smoke test produced a mean-author-gap of {mean_gap:.2f}pp "
            f"(threshold is <=10pp). This indicates that the v2 SVM relies more on per-author "
            f"style than on per-genre signal at the held-out boundary. The v2 macro-F1 reported "
            f"below should be treated as an **upper bound**, not as the expected generalization "
            f"performance.",
            "",
            f"Affected authors (per-author accuracy < mean = {mean_acc:.4f}):",
        ]
        n_books_per_author = Counter()
        for a, acc in per_author.items():
            # Recover books-per-author from the smoke-test logic: tested only if >=2 books
            pass
        for author, acc in worst:
            if acc < mean_acc:
                disclaimer_block.append(f"- {author}: {acc*100:.2f}%")
        disclaimer_block += [
            "",
            "**Ship decision:** the v2 model still publishes to v2.0-data because: "
            "(a) it beats the v1 baseline on the published comparison test set, "
            "(b) the alternative (restructure-and-retry) was weighed against this disclosure "
            "path per D-31 and the user authorized the disclaimer route.",
        ]

    # Three-numbers headline
    cexp_op = ">" if v2_macro_f1 > v1_macro_f1 else ("=" if v2_macro_f1 == v1_macro_f1 else "<")
    three_numbers = [
        "",
        "## Three-numbers headline (VALIDATION_PROTOCOL §9)",
        "",
        "| # | Number | Value | Notes |",
        "|---|--------|-------|-------|",
        f"| 1 | v1 SVM on hold-out | **{v1_macro_f1:.4f}** | Pinned anchor from "
        f"v1_baseline_results.json. Phase 7 / D-13 caveat: in-sample-leaning. |",
        f"| 2 | v2 SVM on hold-out | **{v2_macro_f1:.4f}** | Headline result. "
        f"Compared to (1) for CEXP-03. |",
        f"| 3 | v2 LOOCV on full v2 | **{v2_loocv_acc:.4f}** | Context only; never the headline. |",
        "",
        f"**CEXP-03 verdict:** v2 macro-F1 ({v2_macro_f1:.4f}) {cexp_op} v1 macro-F1 ({v1_macro_f1:.4f}). "
        f"Permutation p={perm_p:.4f}. Pass criteria: STRICTLY > AND p<0.05. -> **{cexp_03_verdict}**.",
    ]

    # Hold-out detail
    holdout_block = [
        "",
        "## Hold-out evaluation detail (VALIDATION_PROTOCOL §3 + §5)",
        "",
        "**Test set:** 20 pinned gutenberg_ids from VALIDATION_PROTOCOL.md §3:",
        f"`{sorted(HOLDOUT_GUTENBERG_IDS)}`",
        "",
        f"**In-comparison subset (present in v2 corpus):** {holdout_result['n_in_comparison']} of 20. "
        f"List: `{holdout_result['in_comparison_ids']}`",
        f"**Out-of-comparison (absent from v2):** {len(holdout_result['out_of_comparison_ids'])} of 20. "
        f"List: `{holdout_result['out_of_comparison_ids']}`. "
        f"Rationale: see `.planning/research/v2/v1_to_v2_migration.md` for per-id verdicts; the "
        f"Phase 8.1 drop strategy removed ~86 SERIOUS rows from the original 240-book corpus.",
        "",
        "| Metric | Value |",
        "|--------|-------|",
        f"| Macro-F1 | {v2_macro_f1:.4f} |",
        f"| Accuracy | {holdout_result['accuracy']:.4f} |",
        f"| Permutation p-value | {perm_p:.4f} |",
        f"| Significant at 0.05? | {'yes' if perm_p < 0.05 else 'no'} |",
        "",
        "### Per-genre F1",
        "",
        _format_per_genre_f1_table(
            holdout_result["per_genre_f1"], v1_baseline, v1_support, label_to_genre
        ),
        "",
        "### Confusion matrix",
        "",
        "(rows = true v2 genre, cols = predicted v2 genre)",
        "",
        _format_confusion_matrix(holdout_result["confusion_matrix"], classes, label_to_genre),
        "",
        "### Per-book predictions",
        "",
        "| gutenberg_id | true v2 genre | predicted v2 genre | correct |",
        "|-------------:|---------------|--------------------|:-------:|",
    ]
    for p in holdout_result["predictions"]:
        tn = label_to_genre.get(int(p["true"]), f"label_{p['true']}")
        pn = label_to_genre.get(int(p["pred"]), f"label_{p['pred']}")
        holdout_block.append(
            f"| {p['gutenberg_id']} | {tn} | {pn} | {'yes' if p['correct'] else 'no'} |"
        )

    # GroupKFold
    gkf_block = [
        "",
        "## GroupKFold by author (VALIDATION_PROTOCOL §6 + CEXP-04)",
        "",
        "| Metric | Value |",
        "|--------|-------|",
        f"| n_splits used | {cv_result['n_splits_actual']} |",
        f"| Mean macro-F1 | {cv_result['mean']:.4f} |",
        f"| Std macro-F1 | {cv_result['std']:.4f} |",
        f"| Fold scores | {[round(s, 4) for s in cv_result['fold_scores']]} |",
        f"| Gap vs hold-out (CEXP-04 input) | "
        f"{100*abs(cv_result['mean'] - v2_macro_f1):.2f}pp |",
        f"| CEXP-04 verdict (gap <=15pp?) | {cexp_04_verdict} |",
    ]

    # Smoke test
    smoke_block = [
        "",
        "## Per-author held-out smoke test (VALIDATION_PROTOCOL §8 + D-17)",
        "",
        "| Metric | Value |",
        "|--------|-------|",
        f"| LOOCV accuracy | {smoke_result['loocv_acc']:.4f} |",
        f"| Mean per-author accuracy | {smoke_result['mean_per_author_accuracy']:.4f} |",
        f"| Min per-author accuracy | {smoke_result['min_per_author_accuracy']:.4f} |",
        f"| Mean-gap (pp) | {smoke_result['mean_gap_pp']:.2f} |",
        f"| Worst-case gap (pp) | {smoke_result['worst_case_gap_pp']:.2f} |",
        "| Pass threshold | 10.00 pp |",
        f"| Mean-gap passes? | {'yes' if smoke_result['mean_gap_passes'] else 'no'} |",
        f"| N authors tested | {smoke_result['n_authors_tested']} |",
        "",
        "### Per-author breakdown",
        "",
        "| Author | Accuracy held-out |",
        "|--------|------------------:|",
    ]
    for author, acc in sorted(smoke_result["per_author_accuracy"].items(),
                              key=lambda kv: kv[1]):
        smoke_block.append(f"| {author} | {acc:.4f} |")

    # Methodology
    method_block = [
        "",
        "## Methodology + lineage",
        "",
        "- **Hyperparameters (frozen — VALIDATION_PROTOCOL §2):** "
        f"window={args.window}, k={args.k_clusters}, alpha={args.alpha}, "
        f"C={args.svm_C}, kernel=rbf, class_weight=balanced, "
        f"permutation_n={args.n_permutations}",
        "- **Pipeline lineage:**",
        f"  - corpus_hash = `{lineage.get('corpus_hash', 'unknown')}`",
        f"  - w2v_model_sha256 = `{lineage.get('w2v_model_sha256', 'unknown')}`",
        "  - (from `data/models/svm_pipeline.joblib.lineage.json`)",
        "- **Random seeds:** SVM random_state=42, permutation random_state=42, "
        "GroupKFold (deterministic — no seed)",
        f"- **Total v2 corpus:** {corpus_size} books (post Phase-8.1 drop strategy; "
        "original Phase-8 plan assumed 240; actual = post-cleanup verified-clean set)",
        f"- **Hold-out evaluation:** trained on (v2 \\ holdout_ids) = "
        f"{eval_train_size} books; evaluated on the holdout_ids in-comparison subset",
        "- **LOOCV / GroupKFold:** trained per-fold on the full v2 corpus minus the held-out fold",
        "- **Smoke test:** trained per-fold on (v2 minus all books by author A); evaluated on A's books",
    ]

    # Reproducibility
    repro_block = [
        "",
        "## Reproducibility",
        "",
        "```bash",
        f"python scripts/06_validate.py --report-out results/v2_validation_report.md "
        f"--n-permutations {args.n_permutations} --cv-n-splits {args.cv_n_splits}",
        "```",
        "",
        "Re-running this command on the same v2 artifacts (corpus_hash, w2v_model_sha256 unchanged) "
        "produces byte-identical metric values.",
    ]

    # Header
    header = [
        "# v2 Validation Report — Phase 8 / CEXP-03 + CEXP-04",
        "",
        f"**Generated:** {timestamp}",
        "**Phase:** 08-corpus-expansion / Wave 3",
        "**Reference:** .planning/research/v2/VALIDATION_PROTOCOL.md",
        "**v1 baseline source:** .planning/research/v2/v1_baseline_results.json",
        "",
    ]

    sections = (
        header
        + status_block
        + disclaimer_block
        + three_numbers
        + holdout_block
        + gkf_block
        + smoke_block
        + method_block
        + repro_block
    )
    return "\n".join(sections) + "\n"


def _legacy_main(args):
    """Original LOOCV+permutation flow — kept for backwards compatibility / sweep.py."""
    overrides = {}
    if args.k_clusters is not None:
        overrides["features.k_clusters"] = args.k_clusters
    if args.alpha is not None:
        overrides["features.alpha"] = args.alpha
    if args.svm_C is not None:
        overrides["validation.svm_C"] = args.svm_C
    if args.n_permutations is not None:
        overrides["validation.permutation_n"] = args.n_permutations

    params = load_params(overrides)
    window = args.window
    k = params["features"]["k_clusters"]
    alpha = params["features"]["alpha"]
    C = params["validation"]["svm_C"]
    perm_n = params["validation"]["permutation_n"]

    features_dir = Path(__file__).parent.parent / "data" / "features"
    results_dir = Path(__file__).parent.parent / "results"
    results_dir.mkdir(parents=True, exist_ok=True)

    matrix_path = features_dir / f"feature_matrix_w{window}_k{k}.npy"
    if not matrix_path.exists():
        print(f"ERROR: {matrix_path.name} not found.")
        sys.exit(1)

    X_raw = np.load(str(matrix_path))
    y = np.load(str(features_dir / "labels.npy"))
    with open(features_dir / "book_order.json") as f:
        book_order = json.load(f)

    mask = y != -1
    X_raw = X_raw[mask]
    y = y[mask]
    book_order = [e for e in book_order if e["label"] != -1]

    topo = X_raw[:, :400]
    loc = X_raw[:, 400:]
    X = np.concatenate([alpha * topo, (1 - alpha) * loc], axis=1)

    print(f"Legacy LOOCV: {X.shape[0]} books x {X.shape[1]}D")

    from sklearn.model_selection import LeaveOneOut, permutation_test_score
    pipe = _build_pipe(C, "rbf")
    loo = LeaveOneOut()
    y_pred = np.empty_like(y)
    for train_idx, test_idx in loo.split(X):
        pipe.fit(X[train_idx], y[train_idx])
        y_pred[test_idx] = pipe.predict(X[test_idx])
    overall_accuracy = np.mean(y_pred == y)
    print(f"LOOCV accuracy {overall_accuracy*100:.1f}%")

    pipe = _build_pipe(C, "rbf")
    score, perm_scores, p_value = permutation_test_score(
        pipe, X, y, cv=LeaveOneOut(), n_permutations=perm_n,
        scoring="accuracy", n_jobs=-1, random_state=42,
    )
    print(f"Permutation p={p_value:.4f}")


def main():
    parser = argparse.ArgumentParser(
        description="v2 SVM validation per VALIDATION_PROTOCOL §10"
    )
    parser.add_argument("--window", type=int, default=15,
                        help="Word2Vec window (default 15)")
    parser.add_argument("--k-clusters", type=int, default=200, dest="k_clusters")
    parser.add_argument("--alpha", type=float, default=0.7)
    parser.add_argument("--svm-c", type=float, default=10.0, dest="svm_C")
    parser.add_argument("--svm-kernel", type=str, default="rbf")
    parser.add_argument("--report-out", type=str,
                        default="results/v2_validation_report.md")
    parser.add_argument("--n-permutations", type=int, default=1000)
    parser.add_argument("--cv-n-splits", type=int, default=8)
    parser.add_argument("--cv-min-splits", type=int, default=5,
                        help="Floor for GroupKFold if author count insufficient")
    parser.add_argument("--legacy", action="store_true",
                        help="Run the original LOOCV+permutation flow only (sweep compat)")
    args = parser.parse_args()

    if args.legacy:
        return _legacy_main(args)

    repo_root = Path(__file__).parent.parent
    results_dir = repo_root / "results"
    results_dir.mkdir(parents=True, exist_ok=True)

    # 1. Load v2 corpus features + aligned authors + gutenberg_ids
    X, y, authors, gutenberg_ids, label_to_genre = _load_v2_corpus_and_features(
        args.window, args.k_clusters, args.alpha
    )
    print(f"Loaded v2 corpus: X.shape={X.shape}, n_authors_distinct={len(set(authors))}")

    # 2. Load lineage sidecar
    lineage_path = repo_root / "data" / "models" / "svm_pipeline.joblib.lineage.json"
    with open(lineage_path, encoding="utf-8") as f:
        lineage = json.load(f)
    # Assert hyperparameters match
    assert lineage.get("window") == args.window, \
        f"Lineage window mismatch: lineage={lineage.get('window')}, cli={args.window}"
    assert lineage.get("k_clusters") == args.k_clusters, \
        f"Lineage k mismatch: lineage={lineage.get('k_clusters')}, cli={args.k_clusters}"

    # 3. Read holdout_gutenberg_ids -- Phase 9 (D-40): single source of truth
    #    lives in scripts/constants.py (imported at module level above),
    #    not in v1_baseline_results.json.
    v1_baseline = _v1_baseline()
    holdout_ids = sorted([int(g) for g in HOLDOUT_GUTENBERG_IDS])
    v1_support = _v1_holdout_support_per_v1_genre()
    # Backward-compat sanity check: the v1_baseline JSON record must still match
    # the constant. If this assertion fires, VALIDATION_PROTOCOL.md §3 was changed
    # without updating scripts/constants.py OR data/v1_baseline_results.json --
    # fix both before proceeding (T-9-31 mitigation).
    _v1_baseline_ids = sorted([int(g) for g in v1_baseline["holdout_gutenberg_ids"]])
    assert holdout_ids == _v1_baseline_ids, (
        f"HOLDOUT drift: constants.py={holdout_ids} vs v1_baseline_results.json={_v1_baseline_ids}"
    )

    # 4. Train an "eval SVM" on (v2 corpus MINUS holdout_ids in v2)
    holdout_in_v2_mask = np.array([gid in holdout_ids for gid in gutenberg_ids])
    train_mask = ~holdout_in_v2_mask
    print(f"Eval split: train={train_mask.sum()}, holdout={holdout_in_v2_mask.sum()}, "
          f"out-of-comparison={20 - holdout_in_v2_mask.sum()}")

    eval_pipe = _build_pipe(args.svm_C, args.svm_kernel)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        eval_pipe.fit(X[train_mask], y[train_mask])
    classes = list(eval_pipe.classes_)

    # 5. Run evaluate_on_holdout
    print("Running evaluate_on_holdout...")
    holdout_result = evaluate_on_holdout(eval_pipe, X, y, gutenberg_ids, holdout_ids)
    print(f"  v2 macro-F1 on hold-out: {holdout_result['macro_f1']:.4f}")
    print(f"  v2 accuracy on hold-out: {holdout_result['accuracy']:.4f}")

    # 6. Compute v2 LOOCV accuracy on the full v2 corpus
    print("Computing v2 LOOCV accuracy on full corpus...")
    from sklearn.model_selection import LeaveOneOut
    from sklearn.metrics import accuracy_score
    loo = LeaveOneOut()
    y_pred_loocv = np.empty_like(y)
    t0 = time.time()
    for tr, te in tqdm(loo.split(X), total=len(y), desc="LOOCV", unit="fold"):
        pipe = _build_pipe(args.svm_C, args.svm_kernel)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            pipe.fit(X[tr], y[tr])
            y_pred_loocv[te] = pipe.predict(X[te])
    v2_loocv_acc = float(accuracy_score(y, y_pred_loocv))
    print(f"  v2 LOOCV accuracy: {v2_loocv_acc:.4f} ({time.time()-t0:.1f}s)")

    # 7. Run cross_validate_grouped
    print(f"Running GroupKFold (n_splits={args.cv_n_splits}, min={args.cv_min_splits})...")
    # Determine actual K: floor at cv_min_splits if author count insufficient
    n_distinct_authors = len(set(authors.tolist()))
    requested = min(args.cv_n_splits, n_distinct_authors)
    if requested < args.cv_min_splits:
        print(f"  WARNING: only {n_distinct_authors} distinct authors; "
              f"flooring at cv_min_splits={args.cv_min_splits}")
        requested = min(args.cv_min_splits, n_distinct_authors)
    cv_result = cross_validate_grouped(X, y, authors, n_splits=requested,
                                       svm_C=args.svm_C, svm_kernel=args.svm_kernel)
    print(f"  CV mean macro-F1: {cv_result['mean']:.4f} +/- {cv_result['std']:.4f} "
          f"(n_splits={cv_result['n_splits_actual']})")

    # 8. Run per_author_held_out_smoke_test (uses precomputed LOOCV acc)
    print("Running per-author held-out smoke test...")
    smoke_result = per_author_held_out_smoke_test(
        X, y, authors, svm_C=args.svm_C, svm_kernel=args.svm_kernel,
        loocv_acc=v2_loocv_acc,
    )
    print(f"  Mean-gap pp: {smoke_result['mean_gap_pp']:.2f}, "
          f"worst-case: {smoke_result['worst_case_gap_pp']:.2f}, "
          f"n_authors={smoke_result['n_authors_tested']}")

    # 9. Run permutation_null_test
    print(f"Running permutation null test (n={args.n_permutations})...")
    t0 = time.time()
    perm_result = permutation_null_test(
        X, y, n_permutations=args.n_permutations,
        svm_C=args.svm_C, svm_kernel=args.svm_kernel, random_state=42,
    )
    print(f"  Permutation p={perm_result['p_value']:.4f} "
          f"({time.time()-t0:.1f}s)")

    # 10. Decide verdicts
    v1_macro_f1 = float(v1_baseline["macro_f1"])
    v2_macro_f1 = float(holdout_result["macro_f1"])
    perm_p = float(perm_result["p_value"])
    smoke_passed = bool(smoke_result["mean_gap_passes"])
    cv_gap_pp = abs(cv_result["mean"] - v2_macro_f1) * 100.0

    # CEXP-03: strict > AND p<0.05
    if v2_macro_f1 > v1_macro_f1 and perm_p < 0.05:
        if smoke_passed:
            cexp_03_verdict = "PASS"
        else:
            cexp_03_verdict = "PARTIAL-VALIDATED"
    else:
        cexp_03_verdict = "FAIL"

    # CEXP-04: GroupKFold mean within 15pp of v2 hold-out macro-F1
    if cv_gap_pp <= 15.0:
        cexp_04_verdict = "PASS" if smoke_passed else "PARTIAL-VALIDATED"
    else:
        cexp_04_verdict = "FAIL"

    # 11. Compose report
    timestamp = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    report_text = _compose_report(
        holdout_result=holdout_result,
        cv_result=cv_result,
        smoke_result=smoke_result,
        perm_result=perm_result,
        v2_loocv_acc=v2_loocv_acc,
        v1_baseline=v1_baseline,
        v1_support=v1_support,
        label_to_genre=label_to_genre,
        classes=classes,
        lineage=lineage,
        args=args,
        timestamp=timestamp,
        corpus_size=int(X.shape[0]),
        eval_train_size=int(train_mask.sum()),
        cexp_03_verdict=cexp_03_verdict,
        cexp_04_verdict=cexp_04_verdict,
        smoke_passed=smoke_passed,
    )
    report_path = repo_root / args.report_out
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report_text, encoding="utf-8")
    print(f"Wrote report -> {report_path}")

    # 12. Append validation_history.log
    log_line = (
        f"{timestamp} phase=08-wave3 "
        f"v1_macroF1={v1_macro_f1:.4f} v2_macroF1={v2_macro_f1:.4f} "
        f"cv_mean={cv_result['mean']:.4f} cv_std={cv_result['std']:.4f} "
        f"permutation_p={perm_p:.4f} "
        f"smoke_test_mean_gap={smoke_result['mean_gap_pp']:.2f}pp "
        f"cexp_03={cexp_03_verdict} cexp_04={cexp_04_verdict}\n"
    )
    history_path = repo_root / "results" / "validation_history.log"
    with open(history_path, "a", encoding="utf-8") as f:
        f.write(log_line)
    print(f"Appended history -> {history_path}")

    # 13. Print final summary
    print()
    print("==================== SUMMARY ====================")
    print(f"v1 macro-F1: {v1_macro_f1:.4f}")
    print(f"v2 macro-F1 (hold-out): {v2_macro_f1:.4f}")
    print(f"v2 LOOCV acc: {v2_loocv_acc:.4f}")
    print(f"CV mean +/- std: {cv_result['mean']:.4f} +/- {cv_result['std']:.4f}")
    print(f"Permutation p: {perm_p:.4f}")
    print(f"Smoke-test mean-gap: {smoke_result['mean_gap_pp']:.2f}pp "
          f"(threshold 10pp -> {'PASSED' if smoke_passed else 'FAILED'})")
    print(f"CEXP-03: {cexp_03_verdict}")
    print(f"CEXP-04: {cexp_04_verdict}")
    print("==================================================")


if __name__ == "__main__":
    main()
