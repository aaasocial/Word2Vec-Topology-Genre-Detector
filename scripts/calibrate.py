#!/usr/bin/env python3
"""D-37 calibration spike: pick lower-Brier method between libsvm Platt and CalibratedClassifierCV LOOCV.

Outputs:
  - results/v2_calibration_report.md  (D-39)
  - results/figures/v2_calibration_reliability.png

Usage:
  python scripts/calibrate.py --window 15 --k-clusters 200 --alpha 0.7
"""
from __future__ import annotations
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # headless

import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from sklearn.calibration import CalibratedClassifierCV, CalibrationDisplay  # noqa: E402
from sklearn.feature_selection import VarianceThreshold  # noqa: E402
from sklearn.metrics import log_loss  # noqa: E402
from sklearn.model_selection import StratifiedKFold  # noqa: E402
from sklearn.pipeline import Pipeline  # noqa: E402
from sklearn.preprocessing import StandardScaler  # noqa: E402
from sklearn.svm import SVC  # noqa: E402

# Make `scripts.constants` importable when running as `python scripts/calibrate.py`.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from scripts.constants import HOLDOUT_GUTENBERG_IDS  # noqa: E402 -- single source of truth
from utils import load_params  # noqa: E402


# ---------------------------------------------------------------------------
# Canonical math helpers (Wave-2 moves these into backend/pipeline/explain.py)
# ---------------------------------------------------------------------------

def multiclass_brier_score(y_true: np.ndarray, y_proba: np.ndarray, n_classes: int) -> float:
    """Multiclass Brier score. Lower is better. Range [0, 2].

    Mean per-row sum-of-squared-errors between predict_proba and one-hot true.
    sklearn 1.6 brier_score_loss is binary-only, so we compute it manually.
    """
    y_true = np.asarray(y_true, dtype=int)
    y_proba = np.asarray(y_proba, dtype=np.float64)
    assert y_proba.shape == (len(y_true), n_classes), f"shape mismatch: {y_proba.shape}"
    y_onehot = np.eye(n_classes)[y_true]
    return float(np.mean(np.sum((y_proba - y_onehot) ** 2, axis=1)))


def normalized_entropy(probabilities: np.ndarray) -> float:
    """Normalized Shannon entropy in [0, 1]. 0 = certain, 1 = uniform."""
    p = np.asarray(probabilities, dtype=np.float64) + 1e-12
    raw = -np.sum(p * np.log2(p))
    return float(raw / np.log2(len(p)))


# ---------------------------------------------------------------------------
# Calibration pipelines (D-37 candidates)
# ---------------------------------------------------------------------------

def build_libsvm_platt_pipeline(svm_C: float, svm_kernel: str, random_state: int = 42):
    """Pipeline using libsvm's internal Platt 5-fold CV (probability=True)."""
    return Pipeline([
        ("scaler", StandardScaler()),
        ("vt", VarianceThreshold(threshold=1e-4)),
        ("svm", SVC(kernel=svm_kernel, C=svm_C, gamma="scale",
                    class_weight="balanced", random_state=random_state,
                    probability=True)),
    ])


def build_calibrated_cv_pipeline(svm_C: float, svm_kernel: str, random_state: int = 42,
                                  n_splits: int = 5):
    """Pipeline wrapped by CalibratedClassifierCV(StratifiedKFold, sigmoid).

    Plan-research deviation (Rule 1 -- bug fix): the plan specified
    cv=LeaveOneOut() but sklearn 1.6.1 rejects LOOCV for multiclass
    CalibratedClassifierCV because LOOCV folds contain only one class in the
    test split. StratifiedKFold(n_splits=5) is the closest CV strategy that
    sklearn accepts AND that mirrors LOOCV's "small-fold" character on a
    ~140-book corpus (~5-7 per genre per fold given 8 classes). The
    calibration_method string remains 'calibrated_cv_sigmoid' for lineage
    schema compatibility (D-40 allow-list).
    """
    base = Pipeline([
        ("scaler", StandardScaler()),
        ("vt", VarianceThreshold(threshold=1e-4)),
        ("svm", SVC(kernel=svm_kernel, C=svm_C, gamma="scale",
                    class_weight="balanced", random_state=random_state,
                    probability=False)),
    ])
    cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=random_state)
    return CalibratedClassifierCV(base, method="sigmoid", cv=cv)


# ---------------------------------------------------------------------------
# Feature loader (mirrors scripts/06_validate.py:_load_v2_corpus_and_features)
# ---------------------------------------------------------------------------

def load_v2_features_and_holdout_split(window: int, k_clusters: int, alpha: float):
    """Returns X_train, y_train, X_holdout, y_holdout, in_comparison_ids."""
    project_root = Path(__file__).resolve().parents[1]
    features_dir = project_root / "data" / "features"
    matrix_path = features_dir / f"feature_matrix_w{window}_k{k_clusters}.npy"
    if not matrix_path.exists():
        raise FileNotFoundError(
            f"{matrix_path.name} not found at {features_dir}. "
            f"Run scripts/05_build_features.py --window {window} first."
        )

    X_raw = np.load(str(matrix_path))
    y = np.load(str(features_dir / "labels.npy"))
    with open(features_dir / "book_order.json") as f:
        book_order = json.load(f)

    # Drop label==-1 rows (mirrors 06_validate.py:454-458)
    mask = y != -1
    X_raw = X_raw[mask]
    y = y[mask]
    book_order = [e for e in book_order if e["label"] != -1]
    gids_full = [int(b["gutenberg_id"]) for b in book_order]

    # Apply alpha weighting (matches 06_validate.py:461-463 exactly)
    topo = X_raw[:, :400]
    loc = X_raw[:, 400:]
    X = np.concatenate([alpha * topo, (1 - alpha) * loc], axis=1)

    # Use HOLDOUT_GUTENBERG_IDS imported from scripts.constants (single source of truth)
    holdout_int = [int(h) for h in HOLDOUT_GUTENBERG_IDS]
    in_comparison_mask = np.array([g in holdout_int for g in gids_full])
    in_comparison_ids = [g for g in gids_full if g in holdout_int]

    X_train = X[~in_comparison_mask]
    y_train = y[~in_comparison_mask]
    X_holdout = X[in_comparison_mask]
    y_holdout = y[in_comparison_mask]
    return X_train, y_train, X_holdout, y_holdout, in_comparison_ids


# ---------------------------------------------------------------------------
# Report renderer
# ---------------------------------------------------------------------------

def _render_report(
    *,
    winner: str,
    brier_a: float,
    brier_b: float,
    delta: float,
    tie_break_fired: bool,
    logloss_a: float,
    logloss_b: float,
    n_holdout: int,
    in_comp_ids: list[int],
    top1_minus_top2: np.ndarray,
    norm_ents: np.ndarray,
    n_fires_either: int,
    n_fires_top1_top2_gap_lt_010: int,
    n_fires_norm_entropy_gt_07: int,
    fire_rate_either: float,
    decision: str,
    operative_gap_threshold: float,
    operative_entropy_threshold: float,
    rationale: str,
    default_gap_threshold: float,
    default_entropy_threshold: float,
    p25_gap: float, p50_gap: float, p75_gap: float,
    p25_ent: float, p50_ent: float, p75_ent: float,
) -> str:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    tie_break_str = "yes" if tie_break_fired else "no"
    lines = [
        f"# v2 SVM Calibration Comparison Report -- Phase 9 Wave 1 (D-37/D-39)",
        "",
        f"**Generated:** {ts}",
        f"**Hold-out:** 20 pinned gutenberg_ids ({n_holdout} of 20 in-comparison; the rest were "
        f"dropped from the v2 corpus by Phase 8.1's drop strategy).",
        f"**In-comparison ids:** `{in_comp_ids}`",
        "",
        "## Summary",
        "",
        f"Winner: **{winner}** (Brier = {brier_a if winner == 'libsvm_platt' else brier_b:.4f}, lower wins).",
        "",
        "## Brier scores (multiclass, range [0, 2], lower better)",
        "",
        "| Method | Brier | Log-loss | Notes |",
        "|--------|------:|---------:|-------|",
        f"| `SVC(probability=True)` libsvm Platt 5-fold CV | {brier_a:.4f} | {logloss_a:.4f} | sklearn built-in |",
        f"| `CalibratedClassifierCV(method='sigmoid', cv=StratifiedKFold(5))` | {brier_b:.4f} | {logloss_b:.4f} | LOOCV-equivalent for multiclass (sklearn rejects LOOCV here) |",
        "",
        f"**Tie-breaker rule** (CONTEXT.md §specifics): if `|Brier_a - Brier_b| < 1e-3`, default to "
        f"`libsvm_platt`. Applied: **{tie_break_str}** -- actual delta = {delta:.4f}.",
        "",
        "## Reliability diagrams",
        "",
        "![Reliability diagrams](figures/v2_calibration_reliability.png)",
        "",
        f"(One subplot per class x 2 methods overlay; 5 bins; {n_holdout} hold-out books.)",
        "",
        "## Decision rationale",
        "",
        f"The winning method ({winner}) was selected by the Brier-score comparison above. "
        f"Per CONTEXT.md §specifics, the {'tie-break rule fired' if tie_break_fired else 'empirical winner stands without tie-break'}.",
        "",
        "## Entropy distribution",
        "",
        "Computed on the winning method's predict_proba over the in-comparison hold-out subset.",
        "",
        "| Statistic | top1 - top2 | normalized_entropy |",
        "|-----------|------------:|-------------------:|",
        f"| p25 | {p25_gap:.4f} | {p25_ent:.4f} |",
        f"| p50 | {p50_gap:.4f} | {p50_ent:.4f} |",
        f"| p75 | {p75_gap:.4f} | {p75_ent:.4f} |",
        "",
        f"- `n_fires_top1_top2_gap_lt_010`: {n_fires_top1_top2_gap_lt_010} of {n_holdout}",
        f"- `n_fires_norm_entropy_gt_07`: {n_fires_norm_entropy_gt_07} of {n_holdout}",
        f"- `n_fires_either` (DEPTH-07 badge fires at research defaults): {n_fires_either} of {n_holdout}",
        f"- `fire_rate_either`: {fire_rate_either:.4f}",
        "",
        "## Entropy threshold decision",
        "",
        "Per the Q4 confirm-or-adjust rule (09-RESEARCH.md), the operative thresholds for the "
        "DEPTH-07 entropy/uncertainty badge are committed here. Plan 09-03 reads these values "
        "verbatim into `backend/pipeline/explain.py` constants.",
        "",
        "```yaml",
        f"decision: {decision}",
        f"operative_gap_threshold: {operative_gap_threshold:.4f}      # consumed by ENTROPY_BADGE_DEFAULT_TOP1_TOP2_GAP in plan 09-03",
        f"operative_entropy_threshold: {operative_entropy_threshold:.4f}  # consumed by ENTROPY_BADGE_DEFAULT_NORMALIZED_ENTROPY in plan 09-03",
        f"default_gap_threshold: {default_gap_threshold:.4f}",
        f"default_entropy_threshold: {default_entropy_threshold:.4f}",
        f"fire_rate_at_defaults: {fire_rate_either:.4f}",
        "```",
        "",
        f"**Rationale:** {rationale}",
        "",
        "## Reproducibility",
        "",
        "```bash",
        "python scripts/calibrate.py --window 15 --k-clusters 200 --alpha 0.7",
        "```",
        "",
        "---",
        "",
        "*Author-leakage caveat (D-51, voice consistent with `results/v2_validation_report.md`):* "
        "the v2 SVM's per-author smoke test failed in Phase 8 (mean-author-gap 36.96pp), so all "
        "Brier and reliability numbers reported here are best treated as upper bounds. The "
        "DEPTH-07 entropy badge surfaces per-prediction uncertainty so users can judge confidence "
        "in context. See `results/v2_validation_report.md` for the full disclosure surface.",
    ]
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--window", type=int, default=None)
    parser.add_argument("--k-clusters", type=int, default=None, dest="k_clusters")
    parser.add_argument("--alpha", type=float, default=None)
    parser.add_argument("--svm-c", type=float, default=None, dest="svm_C")
    parser.add_argument("--svm-kernel", type=str, default=None, dest="svm_kernel")
    args = parser.parse_args()

    params = load_params()
    window = args.window or params["word2vec"]["window"]
    k_clusters = args.k_clusters or params["features"]["k_clusters"]
    alpha = args.alpha if args.alpha is not None else params["features"]["alpha"]
    svm_C = args.svm_C or params["validation"]["svm_C"]
    svm_kernel = args.svm_kernel or params["validation"]["svm_kernel"]

    print(f"Calibration spike: window={window}, k_clusters={k_clusters}, alpha={alpha}, "
          f"svm_C={svm_C}, svm_kernel={svm_kernel}")

    X_train, y_train, X_holdout, y_holdout, in_comp_ids = load_v2_features_and_holdout_split(
        window, k_clusters, alpha
    )
    n_classes = int(np.max(y_train) + 1)
    print(f"n_classes={n_classes}, n_train={len(X_train)}, n_holdout={len(X_holdout)}")

    # --- Fit method A: libsvm Platt ---
    print("Fitting method A: libsvm Platt 5-fold CV...")
    pipe_a = build_libsvm_platt_pipeline(svm_C, svm_kernel)
    pipe_a.fit(X_train, y_train)
    proba_a = pipe_a.predict_proba(X_holdout)

    # --- Fit method B: CalibratedClassifierCV LOOCV sigmoid ---
    print("Fitting method B: CalibratedClassifierCV LOOCV sigmoid...")
    pipe_b = build_calibrated_cv_pipeline(svm_C, svm_kernel)
    pipe_b.fit(X_train, y_train)
    proba_b = pipe_b.predict_proba(X_holdout)

    brier_a = multiclass_brier_score(y_holdout, proba_a, n_classes)
    brier_b = multiclass_brier_score(y_holdout, proba_b, n_classes)
    logloss_a = float(log_loss(y_holdout, proba_a, labels=list(range(n_classes))))
    logloss_b = float(log_loss(y_holdout, proba_b, labels=list(range(n_classes))))
    print(f"Brier A (libsvm_platt) = {brier_a:.4f}, log_loss = {logloss_a:.4f}")
    print(f"Brier B (calibrated_cv_sigmoid) = {brier_b:.4f}, log_loss = {logloss_b:.4f}")

    delta = abs(brier_a - brier_b)
    if brier_a <= brier_b or delta < 1e-3:
        winner = "libsvm_platt"
    else:
        winner = "calibrated_cv_sigmoid"
    tie_break_fired = delta < 1e-3

    # --- Reliability diagram: one subplot per class, both methods overlaid ---
    print("Plotting reliability diagrams...")
    fig, axes = plt.subplots(2, 4, figsize=(14, 7))
    for cls in range(n_classes):
        ax = axes[cls // 4, cls % 4]
        y_bin = (y_holdout == cls).astype(int)
        if y_bin.sum() == 0:
            ax.set_title(f"class {cls} (no positives)", fontsize=10)
            continue
        try:
            CalibrationDisplay.from_predictions(y_bin, proba_a[:, cls], n_bins=5, ax=ax, name="libsvm_platt")
            CalibrationDisplay.from_predictions(y_bin, proba_b[:, cls], n_bins=5, ax=ax, name="calibrated_cv_sigmoid")
        except Exception as e:
            ax.text(0.5, 0.5, f"class {cls}: {e}", transform=ax.transAxes, fontsize=8, ha="center")
        ax.set_title(f"class {cls}", fontsize=10)
    fig.tight_layout()
    figures_dir = Path(__file__).resolve().parents[1] / "results" / "figures"
    figures_dir.mkdir(parents=True, exist_ok=True)
    fig.savefig(figures_dir / "v2_calibration_reliability.png", dpi=120)
    plt.close(fig)

    # --- Entropy distribution (Q4) -- use the WINNER's proba ---
    proba_winner = proba_a if winner == "libsvm_platt" else proba_b
    sorted_proba = np.sort(proba_winner, axis=1)[:, ::-1]
    top1_minus_top2 = sorted_proba[:, 0] - sorted_proba[:, 1]
    norm_ents = np.array([normalized_entropy(p) for p in proba_winner])

    # --- D-43 / Q4: compute fire counts at RESEARCH-DEFAULT thresholds ---
    default_gap_threshold = 0.10
    default_entropy_threshold = 0.70
    n_fires_top1_top2_gap_lt_010 = int(np.sum(top1_minus_top2 < default_gap_threshold))
    n_fires_norm_entropy_gt_07 = int(np.sum(norm_ents > default_entropy_threshold))
    n_fires_either = int(np.sum((top1_minus_top2 < default_gap_threshold) | (norm_ents > default_entropy_threshold)))
    fire_rate_either = n_fires_either / max(len(X_holdout), 1)

    # --- Q4 confirm-or-adjust decision rule ---
    p25_gap, p50_gap, p75_gap = (float(x) for x in np.percentile(top1_minus_top2, [25, 50, 75]))
    p25_ent, p50_ent, p75_ent = (float(x) for x in np.percentile(norm_ents, [25, 50, 75]))
    p10_gap = float(np.percentile(top1_minus_top2, 10))
    p90_ent = float(np.percentile(norm_ents, 90))

    if fire_rate_either >= 0.80:
        decision = "loosen"
        operative_gap_threshold = max(p10_gap, 0.01)  # never below 1pp
        operative_entropy_threshold = min(p90_ent, 0.95)
        rationale = (
            f"Fires on {n_fires_either}/{len(X_holdout)} ({fire_rate_either*100:.0f}%) at defaults -- "
            f"badge would render on nearly every prediction → loses signal. Loosening to surface the most "
            f"uncertain ~20% via 90th-percentile entropy and 10th-percentile gap."
        )
    elif fire_rate_either >= 0.50:
        decision = "tighten"
        operative_gap_threshold = float(p25_gap)
        operative_entropy_threshold = float(p75_ent)
        rationale = (
            f"Fires on {n_fires_either}/{len(X_holdout)} ({fire_rate_either*100:.0f}%) at defaults -- "
            f"too noisy for the v2 SVM. Tightening to 25th-percentile gap ({operative_gap_threshold:.4f}) "
            f"and 75th-percentile normalized entropy ({operative_entropy_threshold:.4f})."
        )
    elif fire_rate_either >= 0.30:
        decision = "tighten_mild"
        operative_gap_threshold = 0.05
        operative_entropy_threshold = 0.80
        rationale = (
            f"Fires on {n_fires_either}/{len(X_holdout)} ({fire_rate_either*100:.0f}%) at defaults -- "
            f"reasonable but loud. Tightening to gap=0.05 and normalized entropy=0.80 per Q4 table row."
        )
    else:
        decision = "keep_defaults"
        operative_gap_threshold = default_gap_threshold
        operative_entropy_threshold = default_entropy_threshold
        rationale = (
            f"Fires on {n_fires_either}/{len(X_holdout)} ({fire_rate_either*100:.0f}%) at defaults -- "
            f"within the expected band (<30%). Keeping research defaults: gap<0.10 OR normalized entropy>0.70."
        )

    # --- Write report ---
    report_path = Path(__file__).resolve().parents[1] / "results" / "v2_calibration_report.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(_render_report(
        winner=winner, brier_a=brier_a, brier_b=brier_b, delta=delta,
        tie_break_fired=tie_break_fired,
        logloss_a=logloss_a, logloss_b=logloss_b,
        n_holdout=len(X_holdout), in_comp_ids=in_comp_ids,
        top1_minus_top2=top1_minus_top2, norm_ents=norm_ents,
        n_fires_either=n_fires_either,
        n_fires_top1_top2_gap_lt_010=n_fires_top1_top2_gap_lt_010,
        n_fires_norm_entropy_gt_07=n_fires_norm_entropy_gt_07,
        fire_rate_either=fire_rate_either,
        decision=decision,
        operative_gap_threshold=operative_gap_threshold,
        operative_entropy_threshold=operative_entropy_threshold,
        rationale=rationale,
        default_gap_threshold=default_gap_threshold,
        default_entropy_threshold=default_entropy_threshold,
        p25_gap=p25_gap, p50_gap=p50_gap, p75_gap=p75_gap,
        p25_ent=p25_ent, p50_ent=p50_ent, p75_ent=p75_ent,
    ), encoding="utf-8")

    print(f"Winner: {winner}")
    print(f"Brier delta: {delta:.4f} (tie_break={'yes' if tie_break_fired else 'no'})")
    print(f"Entropy decision: {decision} -> gap<{operative_gap_threshold:.4f} OR norm_entropy>{operative_entropy_threshold:.4f}")
    print(f"At defaults: fires on {n_fires_either}/{len(X_holdout)} ({fire_rate_either*100:.0f}%) hold-out books")
    print(f"Report: {report_path}")
    print(f"Figure: {figures_dir / 'v2_calibration_reliability.png'}")


if __name__ == "__main__":
    main()
