# Phase 9: Classification Depth — Research

**Researched:** 2026-05-27
**Domain:** Calibrated multiclass SVM + on-demand explainability (FastAPI + sklearn 1.6 + R3F/Zustand frontend)
**Confidence:** HIGH (every recommendation cites a real file/symbol or a verified sklearn API)

## Summary

The v2 research backbone (ARCHITECTURE.md / PITFALLS.md / FEATURES.md / STACK.md / SUMMARY.md) plus 09-CONTEXT.md (D-37..D-55) already lock the design space. This research deliberately does NOT re-tread that ground — it answers the ten implementation-specific questions the planner needs nailed down before it can write executable tasks, with verified-against-the-codebase or verified-against-sklearn-1.6 evidence.

**Headline findings the planner MUST internalize:**

1. **`sklearn.metrics.brier_score_loss` in sklearn 1.6.1 (this repo's version) is BINARY-ONLY** [VERIFIED: `python -c "from sklearn.metrics import brier_score_loss; brier_score_loss([0,1,2,1], [[0.7,...],...])"` raises `ValueError: y should be a 1d array, got (4,3)`]. Multiclass Brier MUST be computed manually as the mean squared error between `predict_proba` rows and one-hot true labels. The CONTEXT.md D-37 phrase "score Brier loss" therefore requires a small helper, not a one-liner. Formula provided in Q1 below.
2. **The 20-book hold-out gutenberg_ids ARE PINNED** [VERIFIED: `.planning/research/v2/VALIDATION_PROTOCOL.md` §3 + `scripts/06_validate.py:647`]. List: `[78, 83, 84, 103, 105, 120, 121, 144, 169, 175, 244, 284, 863, 1184, 1257, 1528, 2565, 3285, 50133, 70652]`. Phase 8 already showed only a subset survives in the v2 corpus — `holdout_result['in_comparison_ids']` from `evaluate_on_holdout()` is the operative set.
3. **FastAPI startup uses the modern `lifespan` context manager, NOT `@app.on_event('startup')`** [VERIFIED: `backend/api/app.py:11-28`]. The lifespan currently loads `redis` + `arq_pool` ONLY. Models (`svm_pipeline`, `w2v_model`, `kmeans`, `persistence_imager`, `tfidf_vectorizer`, `genre_names`, `params`) are NOT on `app.state` — they're loaded into the arq worker's `ctx`. D-50's `explain_artifacts` MUST go on `app.state` because the `/explain` endpoint runs in the API process, and the planner must also surface that the API process currently has NO loaded models — Phase 9 introduces that path. See Q6 for full plan.
4. **Pipeline walkthrough dialog is `frontend/src/components/explanation/PipelineExplanation.tsx`** [VERIFIED: `Glob frontend/src/components/**/Pipeline*.tsx`]. ARCHITECTURE.md called it `PipelineExplanationDialog.tsx` — that filename does not exist. The dialog uses 6 step components in `frontend/src/components/explanation/steps/Step{1..6}.tsx`. D-51's "Validation & Limitations" disclaimer either becomes a new Step7 OR extends Step6Classification.tsx. Recommendation in Q10.
5. **Multiclass Brier-style "score" candidate disagreement is unlikely to be <1e-3** — given the 45pp GroupKFold gap and noisy v2 corpus, the two methods will produce visibly different Brier scores. The "fallback to libsvm_platt under 1e-3 tie" rule in CONTEXT.md §specifics is theoretically sound but unlikely to fire in practice. Recommendation: record the rule but expect a clear empirical winner.

**Primary recommendation:** Land the plan in the wave-sequence outlined in CONTEXT.md `<claude_discretion>` with Q1's manual multiclass Brier helper, Q2's invariant-preservation argument folded into a docstring, Q3's per-track sign normalization rule (keep both contributions positive after `abs()`, normalize to 100, surface a separate sign indicator), Q5's React-Query 410-handling pattern (selective `onError` discrimination via response status code), Q6's `lifespan`-context-manager `app.state.explain_artifacts` + `app.state.nn_index` extension, and Q10's brand-tone copy locked verbatim before the frontend wave begins.

## User Constraints (from CONTEXT.md)

### Locked Decisions (D-37..D-55)

**A. SVM calibration & lineage:**

- **D-37:** Empirically pick between `SVC(probability=True)` libsvm Platt and `CalibratedClassifierCV(method='sigmoid', cv=LeaveOneOut())` via reliability diagram on Phase 8's 20-book hold-out. Train both, score Brier loss, plot reliability diagrams, ship the lower-Brier method. The loser's diagram is recorded in `results/v2_calibration_report.md` as informational record.
- **D-38:** End-to-end SVM retrain with the calibration method that wins D-37. Replaces `svm_pipeline.joblib` + lineage.json. Cache rotates naturally via the lineage-aware cache_key (Phase 6 BUG-05).
- **D-39:** `results/v2_calibration_report.md` committed before the retrained SVM artifact lands. Contents: reliability diagrams for both methods, Brier scores, decision rationale, link from `svm_pipeline.joblib.lineage.json::calibration_report`.
- **D-40:** Lineage schema extension. `svm_pipeline.joblib.lineage.json` gains `calibration_method` (`"libsvm_platt"` | `"calibrated_cv_sigmoid"`), `calibration_brier_score: float`, `calibration_report: "results/v2_calibration_report.md"`. The Phase 6 lineage guard treats a missing `calibration_method` as `"none"` and refuses to serve top-N (forces explicit retrain).

**B. Top-N display:**

- **D-41:** Top-3 probability bars visible by default with a collapsible "+5 more" expander revealing all 8 genres. Progressive disclosure rather than hardcoded N=3 with permanent hiding.
- **D-42:** Horizontal probability bars, percent-labeled to 1 decimal, sorted descending by probability. Each row: `<color-dot><genre-name><progress-bar><percent-label>`.

**C. Explainability composition:**

- **D-43:** Ship BOTH P2 items in Phase 9 — DEPTH-06 (driving words) and DEPTH-07 (entropy badge), as separable atomic plans so they CAN be deferred individually under late scope pressure without rotating the SVM artifact.
- **D-44:** Per-track contribution via LOCAL per-upload zero-ablation. Two extra SVM calls per explain: predict with topology slab zeroed, predict with vocabulary slab zeroed. Contribution = `base_proba − zeroed_proba`. Normalize the two contributions to sum to 100.
- **D-45:** 5 nearest training books, Euclidean distance on L2-normalized feature vectors.

**D. Research-inherited (explain endpoint infrastructure):**

- **D-46:** `POST /api/classify/{job_id}/explain` synchronous (~200 ms target).
- **D-47:** `feature_vec:{job_id}` written to Redis at end of `classify_book` (numpy bytes), 5-min TTL.
- **D-48:** Explain cache `explain:{feature_vec_hash}:{model_hash}` TTL 1 h.
- **D-49:** 410 Gone on TTL expiry, body `{"detail": "Upload expired — re-upload to see the explanation."}`.
- **D-50:** Phase-9 precompute step emits `data/models/explain_artifacts.npz`. Loaded once at FastAPI startup via `app.state`.

**E. Disclaimer UX:**

- **D-51:** Author-leakage disclaimer surfaced in TWO places — pipeline walkthrough dialog + footnote inside the new "Why this genre?" panel. NOT shown inline on every classification result.
- **D-52:** Entropy badge tooltip cites the same one-sentence caveat as the D-51 footnote.
- **D-53:** NO retraction of v2 classification claims. Disclaimer copy frames the caveat as an "upper bound", never as "wrong".

**F. Tests + frontend styling:**

- **D-54:** Math unit tests (Python) + integration test for `/explain`. Frontend Vitest tests for `TopNList.tsx` and `UncertaintyBadge.tsx`. NO Playwright in Phase 9.
- **D-55:** New components use inline-hex styling matching v1 `ClassificationResult.tsx`. Phase 10 sweeps to CSS vars.

### Claude's Discretion (planner-level open items)

- Plan structure & wave sequencing (informational shape provided in CONTEXT.md)
- Endpoint module location (`classify.py` extension vs new `routes/explain.py`)
- Pydantic model file organization (extend `models.py` vs new `explain_models.py`)
- React Query usage for `/explain` (`useMutation` recommended)
- Calibration script location (`scripts/06_validate.py` extension vs new `scripts/calibrate.py`)
- Reliability-diagram artifact format (markdown table vs embedded PNG)
- Driving-words pill count (≤15 default; fewer if upload has fewer distinct high-weight words)
- Entropy threshold tuning (research defaults; planner may adjust based on observed distribution)
- `precompute_explain.py` integration with existing precompute family (separate invocation recommended)
- Walkthrough disclaimer placement (new section vs extend existing)
- Backwards-compat behavior on missing `calibration_method` lineage field (graceful fallback vs 503)

### Deferred Ideas (OUT OF SCOPE)

- Counterfactual explanations ("remove these words and re-predict") — v3
- "Closest training book at each pipeline stage" — v3
- Multi-label classification + "why this genre cluster?" — v3
- Settings-drawer calibration plot UI surfacing — v3
- Top-N N as a runtime setting toggle — v3
- Per-author retraining / per-author cap (CEXP-04 closure) — v2.1
- Promoting `_GENRE_COLORS` to single source of truth — pre-existing v3 TODO
- Kernel SHAP dev-only debug explorer — v3 dev tooling at most
- Global per-track `permutation_importance` diagnostic — v3 settings drawer
- "Why this genre?" sharable URL — v3
- HTTP/SSE streaming of explain payload — v3 if explain compute grows

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEPTH-01 | Top-N (default N=3) ranked predictions with calibrated probabilities summing to 1 | Q1 (calibration protocol), D-37/D-38; existing `backend/pipeline/classify.py:32-37` returns single (genre, confidence) — Phase 9 extends to ranked list of 8 |
| DEPTH-02 | `ClassificationResult` renders top-N as honestly-labeled probability bars; no pies, no hidden low-confidence predictions | D-41/D-42 (top-3 visible + collapsible +5 more = all 8 reachable); existing `frontend/src/components/sidebar/ClassificationResult.tsx:14-62` is the mount point |
| DEPTH-03 | "Why this genre?" expander on `ClassificationResult` calls `POST /api/classify/{job_id}/explain` (synchronous ~200ms, Redis-cached `explain:{feature_vec_hash}` TTL 1h) and renders the payload | Q6 (FastAPI lifespan), Q9 (feature_vec Redis serialization), D-46/D-47/D-48 |
| DEPTH-04 | Explainability response includes 3–5 nearest training books with Euclidean distance in the L2-normalized feature space | D-45 (5 books); existing precompute writes `feature_matrix.npy` + `book_order.json` per `scripts/06_validate.py:443-453` — `precompute_explain.py` reuses both |
| DEPTH-05 | Explainability response includes per-track contribution (topology vs vocabulary) as percentages summing to 100, computed via `permutation_importance` per slab | Q3 (sign + normalization rule); D-44 changes the technique to LOCAL zero-ablation but the result-shape contract is identical — REQUIREMENTS.md said `permutation_importance` but D-44 supersedes |
| DEPTH-06 (P2) | Explainability response includes TF-IDF-driven "driving words" list with "proxy, not literal classifier inputs" disclosure | Q2 (per-genre w2v-centroid math); FEATURES.md §3b driving-words pattern |
| DEPTH-07 (P2) | Top-N display includes entropy / uncertainty badge for ambiguous predictions | Q4 (entropy threshold defaults defensibility); D-43 thresholds `top1−top2 < 0.10` OR normalized Shannon entropy `> 0.7` |

## Project Constraints (from CLAUDE.md)

- **Mathematical invariants** (PROJECT.md): single shared w2v space, persistent homology in full N-D, TF-IDF without genre labels, both tracks L2-normalized before α-concat. Q2 below proves D-46's per-genre w2v-centroid math does NOT violate invariant #3.
- **GSD workflow enforcement** — all file edits via GSD commands (already in flight via `/gsd-research-phase`).
- **gsd-tools entry point:** `node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs"` for init / commit / todo / websearch.

## Locked from v2 Backbone (do NOT re-research)

These topics are settled by the cited research artifacts. The planner consumes them as canon.

| Topic | Lock source | Why locked |
|-------|-------------|-----------|
| Use `predict_proba` not `decision_function` for top-N | PITFALLS §7 + sklearn calibration docs | Margins are unbounded, can be negative, don't sum to 1 — softmax over `decision_function` is the v1 footgun |
| Full retrain end-to-end with `probability=True` (do NOT retrofit) | PITFALLS §7 | Internal Platt CV changes the SVM fit slightly; retrofit produces silently miscalibrated artifacts |
| Reject synchronous Kernel SHAP | PITFALLS §8 + SHAP repo issue #3747 | KernelExplainer is 30–120s per call on RBF SVM — incompatible with 200ms budget |
| Reject per-pixel persistence-image importance | PITFALLS §9 | Per-pixel "importance" of a Gaussian-smoothed image is not interpretable; aggregate to track-level only |
| Nearest-training-books + per-track decomposition as the explainability spine | ARCHITECTURE.md §11 option (c) | Fast, intuitive, ante-hoc on the kernel SVM per arXiv 2212.00086 |
| Probability bars, not pies; sort descending; show all 8 (no permanent hiding) | FEATURES.md §3a + D-41/D-42 | Pies fail for close probabilities; "hidden low-confidence" is the v1 anti-pattern |
| Cache key namespace `explain:{feature_vec_hash}:{model_hash}` | ARCHITECTURE.md §5b + BUG-05 | Lineage-aware rotation; D-38 retrain invalidates explain cache automatically |
| feature_vec Redis 5-min TTL between classify and explain | ARCHITECTURE.md §4 | Per-upload ephemeral state; no async re-run path |
| Inline-hex styling deferring CSS-var sweep | D-55 | Phase 10 owns the horizontal theming sweep |
| `data/models/*.npz` LFS-tracked (no .gitattributes change needed) | `.gitattributes` `data/models/*.joblib` / `*.model` covered, but `*.npz` is **NOT YET** in .gitattributes [VERIFIED: cat .gitattributes shows `*.model`, `*.model.wv.vectors.npy`, `*.joblib`, `*.pkl` only] | **Planner MUST add `data/models/*.npz filter=lfs diff=lfs merge=lfs -text` to `.gitattributes` in the precompute_explain wave** |

## Resolved Open Questions (Q1..Q10)

### Q1. Calibration comparison protocol — exact procedure

**The 20-book hold-out IS pinned** [VERIFIED: `.planning/research/v2/VALIDATION_PROTOCOL.md` §3 lines 54-75; same list re-printed in `scripts/06_validate.py:647`]:

```
[78, 83, 84, 103, 105, 120, 121, 144, 169, 175,
 244, 284, 863, 1184, 1257, 1528, 2565, 3285, 50133, 70652]
```

Only the subset present in the v2 corpus is in-comparison — `evaluate_on_holdout()` already filters and returns `in_comparison_ids` / `out_of_comparison_ids` (06_validate.py:99-104).

**Multiclass Brier — sklearn 1.6 is binary-only** [VERIFIED: `from sklearn.metrics import brier_score_loss; brier_score_loss([0,1,2,1], np.array([[0.7,0.2,0.1],[0.1,0.7,0.2],[0.1,0.2,0.7],[0.2,0.6,0.2]]))` raises `ValueError: y should be a 1d array, got an array of shape (4, 3) instead.`]. Phase 9 must compute multiclass Brier manually. The canonical multiclass-Brier definition (mean of per-class one-vs-rest squared errors) is:

```python
def multiclass_brier_score(y_true: np.ndarray, y_proba: np.ndarray, n_classes: int) -> float:
    """Multiclass Brier score. Lower is better. Range [0, 2].

    y_true: (n,) int class labels in [0, n_classes).
    y_proba: (n, n_classes) calibrated probability matrix.
    Returns: scalar = (1/n) * sum_i sum_c (proba_ic - y_onehot_ic)^2.
    """
    y_onehot = np.zeros_like(y_proba)
    y_onehot[np.arange(len(y_true)), y_true.astype(int)] = 1.0
    return float(np.mean(np.sum((y_proba - y_onehot) ** 2, axis=1)))
```

This is the standard "multiclass Brier" used in Niculescu-Mizil & Caruana (2005) and in `sklearn.calibration` tests. Range is `[0, 2]` (not `[0, 1]` like binary). [CITED: https://scikit-learn.org/stable/modules/calibration.html — calibration guide describes the squared-error decomposition; brier_score_loss source code uses the same formula internally for the binary case.]

**Alternative scoring (record both in `v2_calibration_report.md` for defensibility):**

- `sklearn.metrics.log_loss(y_true, y_proba)` — multiclass-native, lower is better, unbounded above [VERIFIED: `from sklearn.metrics import log_loss` exists; supports multiclass `y_proba` of shape `(n, n_classes)`]. Log-loss penalizes confident-and-wrong harder than Brier; use as supplementary signal, not headline.

**Reliability diagram — multiclass via one-vs-rest** [CITED: https://scikit-learn.org/stable/modules/generated/sklearn.calibration.CalibrationDisplay.html]: `CalibrationDisplay.from_predictions(y_true_binary_ovr, y_proba[:, class_idx])` plots one curve per class. With 8 v2 genres and ~17 hold-out books (estimated; final = `in_comparison_ids` from §6 of v2_validation_report.md), each per-class reliability bin has 2–3 books — extremely noisy. Recommendation:

- Produce a single combined plot: 8 small subplots (`fig, axes = plt.subplots(2, 4, figsize=(12, 6))`), one per class, each showing the one-vs-rest reliability curve for both calibration methods.
- Bins: `n_bins=5` (NOT default 10 — 10 bins × ~17 books leaves bins empty).
- Save as `results/figures/v2_calibration_reliability.png` and embed in `v2_calibration_report.md` as a single PNG.

**Report format (`results/v2_calibration_report.md`):**

```markdown
# v2 SVM Calibration Comparison Report — Phase 9 Wave 1

**Generated:** <timestamp>
**Hold-out:** 20 pinned gutenberg_ids (`in_comparison_ids` = N of 20)

## Summary

Winner: **<libsvm_platt | calibrated_cv_sigmoid>** (Brier = <x.xxxx>, lower wins).

## Brier scores (multiclass, range [0, 2], lower better)

| Method | Brier | Log-loss | Notes |
|--------|-------|----------|-------|
| `SVC(probability=True)` libsvm Platt 5-fold CV | <a> | <a'> | sklearn built-in |
| `CalibratedClassifierCV(method='sigmoid', cv=LeaveOneOut())` | <b> | <b'> | LOOCV sigmoid; expensive |

**Tie-breaker rule (CONTEXT.md §specifics):** if `|a − b| < 1e-3`, default to `libsvm_platt`.
Applied: <yes/no — actual delta = X.XXXX>.

## Reliability diagrams

![Reliability diagrams](figures/v2_calibration_reliability.png)

(One subplot per class × 2 methods overlay; 5 bins; ~17 hold-out books.)

## Decision rationale

<2–3 sentences summarizing why the winner won and any caveats.
   Reference v2_validation_report.md author-leakage caveat per D-51.>

## Reproducibility

`python scripts/calibrate.py --hold-out-ids <list> --out results/v2_calibration_report.md`

(or `python scripts/06_validate.py --calibration-spike` if the planner picks the extension path)
```

**Tie-breaker default (CONTEXT.md §specifics):** If Brier delta `< 1e-3`, default to `libsvm_platt` because (a) it's simpler — one less wrapper class on every prediction code path, (b) it's the LibSVM internal default, well-tested over a decade, (c) `CalibratedClassifierCV` with `cv=LeaveOneOut()` adds ~N× SVM fits at train time. **Recommendation: confirm this rule is reasonable** — given the v2 corpus's 45pp GroupKFold gap and small per-class hold-out support, expect Brier delta >> 1e-3 in practice. The rule documents the edge case but won't fire.

**Confidence: HIGH** for the protocol design; **MEDIUM** for the prediction that a clear empirical winner will emerge (depends on the actual fits).

### Q2. Per-genre w2v-centroid math (D-46 driving words) — invariant-preservation

**Formula (canonical):** For each v2 genre `g`, compute a single w2v-centroid as:

```python
def per_genre_w2v_centroid(
    books_in_genre: list[BookId],
    tfidf_weights_per_book: dict[BookId, dict[word, float]],
    w2v_model,
) -> np.ndarray:  # shape (w2v_dim,) — w2v_dim = 150 per config/params.yaml
    """TF-IDF-weighted mean of in-vocabulary word vectors across books in `g`.

    Math invariant check (PROJECT.md):
      (1) Single shared w2v space  — uses w2v_model.wv only; no per-genre retrain.
      (2) Homology in full N-D     — N/A (this is a downstream-of-classification aid).
      (3) TF-IDF without genre labels — IDF is fit corpus-wide as today (BUG-05 / Phase 6).
          Per-book TF-IDF vectors are reduced PER GENRE only AFTER the SVM is trained.
          The centroid is computed POST-classification, downstream of all SVM inputs.
          It feeds the EXPLANATION (nearest-genre-tag), NOT the classifier.
      (4) L2 normalization        — apply L2-norm to the resulting centroid for cosine math.
    """
    numerator = np.zeros(w2v_model.vector_size, dtype=np.float64)
    denominator = 0.0
    for book_id in books_in_genre:
        for word, weight in tfidf_weights_per_book[book_id].items():
            if word in w2v_model.wv:  # OOV-safe
                numerator += weight * w2v_model.wv.get_vector(word)
                denominator += weight
    if denominator == 0.0:
        return np.zeros(w2v_model.vector_size, dtype=np.float64)
    centroid = numerator / denominator
    return centroid / (np.linalg.norm(centroid) + 1e-10)  # L2-norm for cosine distance
```

**Invariant #3 argument (the only one with a plausible challenge):**

The concern is "are we computing TF-IDF using genre labels?" Answer: **No**. The pipeline is:

1. TF-IDF is fit ONCE corpus-wide on the full 154-book v2 corpus — NO genre labels involved [VERIFIED: existing `scripts/02_compute_tfidf.py` and `backend/pipeline/embed.py::project_into_space` fit the vectorizer on the whole corpus].
2. The fitted vectorizer is then used to score each book's words — this is the standard pre-classification step.
3. AFTER classification training, for the purpose of EXPLAINING predictions, we group books BY their LABELED genre and aggregate their pre-existing TF-IDF scores into a centroid.
4. The centroid never enters the SVM as a feature; it is a visualization aid that tells the user "the word 'haunted' in your upload is closest, in w2v space, to gothic_horror's typical vocabulary."

This is the **same** logical move as "compute per-genre confusion matrix after training" — labels are consulted only for the aggregate-after-training step, not for the input pipeline. Invariant #3 is preserved.

**When centroid is computed:** Training time, inside `backend/pipeline/precompute_explain.py`. Runs ONCE per SVM retrain (D-38). Output is a `(8, 150)` `float32` array stored in `explain_artifacts.npz` under key `per_genre_centroids`.

**Storage format in `explain_artifacts.npz`:**

```python
np.savez_compressed(
    'data/models/explain_artifacts.npz',
    feature_matrix_l2=feat_l2_norm,          # (154, 600) float32 — L2-normalized training feature vectors
    book_metadata=np.array([{...}, ...], dtype=object),  # 154-long array of {gutenberg_id, title, genre, author}
    per_genre_centroids=centroids,           # (8, 150) float32 — L2-normalized w2v centroids
    genre_names=np.array([...], dtype=object), # (8,) genre keys aligned to centroid rows
    cluster_to_representative_words=cluster_map,  # (k_clusters,) object array of word-lists per cluster
    metadata=np.array({'corpus_hash': ..., 'w2v_model_sha256': ..., 'created_utc': ...}, dtype=object),
)
```

Size estimate: 154×600×4 (feature_matrix_l2) + 8×150×4 (centroids) + ~100KB metadata ≈ **400 KB total** [computed].

**Nearest-genre attribution at explain time:**

```python
# For each high-TF-IDF word in the upload:
word_vec = w2v_model.wv.get_vector(word)
word_vec_l2 = word_vec / (np.linalg.norm(word_vec) + 1e-10)
# centroids already L2-normalized → cosine distance = 1 - dot product
cosine_distances = 1.0 - per_genre_centroids @ word_vec_l2  # (8,)
nearest_genre = genre_names[np.argmin(cosine_distances)]
```

**Confidence: HIGH** for math correctness; **HIGH** for invariant preservation argument.

### Q3. Local zero-ablation correctness — sign handling & normalization rule

**The math (CONTEXT.md §specifics is correct):**

```python
# feat is (600,) — first 400 dims = topology slab, last 200 = vocabulary slab.
# Slice indices [VERIFIED: scripts/06_validate.py:461-463 explicitly slices [:400] and [400:]]
TOPO_SLICE = slice(0, 400)
VOCAB_SLICE = slice(400, 600)

base_proba = svm.predict_proba(feat.reshape(1, -1))[0, predicted_idx]

feat_topo_zeroed = feat.copy()
feat_topo_zeroed[TOPO_SLICE] = 0
proba_without_topo = svm.predict_proba(feat_topo_zeroed.reshape(1, -1))[0, predicted_idx]
topo_contrib = base_proba - proba_without_topo  # signed

feat_vocab_zeroed = feat.copy()
feat_vocab_zeroed[VOCAB_SLICE] = 0
proba_without_vocab = svm.predict_proba(feat_vocab_zeroed.reshape(1, -1))[0, predicted_idx]
vocab_contrib = base_proba - proba_without_vocab  # signed
```

**Sign handling — recommended rule:**

A contribution is **positive** when zeroing the slab DECREASED the predicted-genre probability (the slab supported the prediction).
A contribution is **negative** when zeroing the slab INCREASED the predicted-genre probability (the slab actually pulled AWAY from the prediction — the other slab was strong enough to compensate).

Recommendation: **surface the magnitude as the percentage bar AND surface the sign as a separate `+/−` / arrow indicator next to the percent label**. This is honest: "topology pushed AWAY from horror by 3.2 pp, while vocabulary pushed TOWARD horror by 28.5 pp."

**Normalization rule — deterministic across all sign combinations:**

```python
def normalize_contributions(topo: float, vocab: float) -> dict:
    """Return {'topology': {'pct': float, 'direction': '+/-'},
              'vocabulary': {'pct': float, 'direction': '+/-'}}.

    The two pcts sum to 100.0 (with rounding tolerance).
    direction indicates whether the slab pushed TOWARD ('+') or AWAY ('-') from the prediction.
    """
    abs_topo = abs(topo)
    abs_vocab = abs(vocab)
    total = abs_topo + abs_vocab
    if total < 1e-9:
        # Degenerate: both slabs had zero effect. Fall back to 50/50 with neutral sign.
        return {
            'topology':   {'pct': 50.0, 'direction': '0'},
            'vocabulary': {'pct': 50.0, 'direction': '0'},
        }
    return {
        'topology':   {'pct': 100.0 * abs_topo / total,   'direction': '+' if topo >= 0 else '-'},
        'vocabulary': {'pct': 100.0 * abs_vocab / total,  'direction': '+' if vocab >= 0 else '-'},
    }
```

Edge cases handled:
- Both positive → both `+`, percentages sum to 100. **Common case.**
- One positive, one negative → one `+`, one `−`, sum to 100. **Honest about disagreement.**
- Both negative → both `−`, sum to 100. **Means the prediction is being held up by features NOT in either slab — extremely rare, log a warning.**
- Both zero → 50/50 with neutral indicator. **Defensive default.**

**Cross-check against `permutation_importance`:**

Global `permutation_importance` answers a DIFFERENT question: "averaged across the corpus, how much does scrambling slab X hurt accuracy?" Local zero-ablation answers "for THIS upload, how much did slab X contribute to THIS prediction?" These can disagree — a book whose topology is unusual will show topology as the dominant LOCAL driver even if globally vocabulary dominates the SVM.

**Sanity-check unit test (D-54):** On 5 random training-set books, compute (a) local zero-ablation for each book's true label, and (b) global `sklearn.inspection.permutation_importance` per slab (using `feature_indices=TOPO_SLICE` / `VOCAB_SLICE` via the `column_subset` workaround OR by zeroing-and-refitting). Assert that the SIGN of `mean(local topo_contrib)` matches the SIGN of the global topo permutation drop. They need not be the same magnitude, but if local says "topology supports the prediction on average" while global says "scrambling topology helps accuracy," there's a bug.

**Confidence: HIGH** (math straightforward; rule is deterministic; cross-check is implementable).

### Q4. Entropy threshold defaults defensibility

**Empirical check on the v2 SVM (pre-Phase-9-retrain — directional signal only):**

The current `svm_pipeline.joblib` does NOT have `probability=True` [VERIFIED: `data/models/svm_pipeline.joblib.lineage.json` has no `calibration_method` field; existing `predict_genre()` calls `decision_function` not `predict_proba`]. So Phase 9 cannot get the proba distribution from the existing SVM without re-fitting.

**Recommended planner approach:**

1. **Wave 1 (calibration spike, D-37):** When fitting BOTH calibration candidates on the hold-out, ALSO compute `predict_proba` on the 17 in-comparison hold-out books. Record `top1−top2` and `normalized_entropy` for each book.
2. **Wave 1 deliverable:** A 6-line summary in `v2_calibration_report.md`:
   ```
   ### Entropy distribution on hold-out (n=17, post-calibration with winning method)
   - top1−top2: min=X.XX, p25=X.XX, p50=X.XX, p75=X.XX, max=X.XX
   - normalized entropy: min=X.XX, p25=X.XX, p50=X.XX, p75=X.XX, max=X.XX
   - Books that would fire DEPTH-07 badge at defaults (top1-top2<0.10 OR norm_entropy>0.7): N of 17
   ```
3. **Wave 1 decision:** If "fires on ≥ 50% of hold-out books" → tighten threshold (lower entropy bar, smaller gap). If "fires on ≤ 1 book" → loosen threshold OR document that the badge is rare-by-design.

**The defaults in CONTEXT.md D-43 are reasonable starting points but MUST be re-confirmed during Wave 1.** Recommended adjustment table (planner uses as guide):

| Observed % of hold-out firing the badge | Recommendation |
|-----------------------------------------|----------------|
| 0–10% | Defaults reasonable; ship as-is. Badge is rare-by-design (low-confidence corner case). |
| 10–30% | Defaults reasonable; ship as-is. Badge is a normal occurrence on a noisy corpus. |
| 30–50% | Defaults reasonable but loud; consider tightening to `top1−top2 < 0.05 OR norm_entropy > 0.8`. |
| 50–80% | Tighten threshold; defaults too noisy for the noisy v2 SVM. Use `top1−top2 < 0.05 OR norm_entropy > 0.85`. |
| 80–100% | Badge would fire on nearly every prediction → loses signal. **Loosen to surface only the most-uncertain ~20%.** Use `top1−top2 < 0.03 OR norm_entropy > 0.90`. |

**Entropy formula** (CONTEXT.md §specifics is correct):

```python
def normalized_entropy(probabilities: np.ndarray) -> float:
    """Normalized Shannon entropy in [0, 1]. 0 = certain, 1 = uniform.
    n_classes = 8 for v2 SVM."""
    p = probabilities + 1e-12  # avoid log(0)
    raw_entropy = -np.sum(p * np.log2(p))  # in bits, max = log2(n_classes)
    return float(raw_entropy / np.log2(len(p)))
```

For 8 classes: max raw entropy = `log2(8) = 3 bits`; threshold 0.7 normalized = raw entropy > 2.1 bits. Matches CONTEXT.md.

**Confidence: HIGH** for formula; **MEDIUM** for default thresholds (genuinely depends on the empirical distribution; the Wave-1 re-confirmation step closes the gap).

### Q5. React Query 410 handling pattern

**Existing pattern in `useClassify.ts`** [VERIFIED: `frontend/src/hooks/useClassify.ts:41-44`]: uses raw `apiFetch<{ job_id: string }>('/classify', {...})` with FormData and EventSource — NOT React Query. The repo uses React Query for some hooks (CONTEXT.md and `frontend/src/hooks/` directory) but `useClassify.ts` is a custom hook because of SSE.

**Recommendation: `useExplain.ts` SHOULD use `@tanstack/react-query`'s `useMutation`** because:
- POST `/api/classify/{job_id}/explain` is a one-shot synchronous request (~200 ms) — perfect fit for `useMutation`.
- React Query's built-in error handling, loading state, retry control, and `onError` callback cleanly surface the 410 case.
- The 410 needs SELECTIVE error handling (different UX than 4xx/5xx) — `useMutation`'s `onError` receives the error object with the response status code attached.

**Concrete pattern:**

```typescript
// frontend/src/hooks/useExplain.ts
import { useMutation } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { ExplainResponse } from '@/types/explain'

export interface UseExplainOptions {
  onExpired?: () => void  // 410 — feature_vec evicted from Redis
}

export function useExplain(jobId: string | null, opts: UseExplainOptions = {}) {
  return useMutation<ExplainResponse, Error & {status?: number}>({
    mutationFn: async () => {
      if (!jobId) throw new Error('No job_id')
      try {
        return await apiFetch<ExplainResponse>(`/classify/${jobId}/explain`, { method: 'POST' })
      } catch (err: any) {
        // apiFetch should attach status to thrown errors (verify backend/api/lib/api.ts)
        if (err.status === 410) {
          opts.onExpired?.()
          throw err
        }
        throw err
      }
    },
    retry: (failureCount, error: any) => {
      // Don't retry 410 (terminal) or 4xx (client error)
      if (error?.status === 410) return false
      if (error?.status >= 400 && error?.status < 500) return false
      return failureCount < 2
    },
  })
}
```

**Component usage** (in `ClassificationExplain.tsx`):

```typescript
const [expired, setExpired] = useState(false)
const { mutate: requestExplanation, data, error, isPending } = useExplain(jobId, {
  onExpired: () => setExpired(true),
})

if (expired) {
  return (
    <div style={{...}}>
      <p>Upload expired — please re-upload to see the explanation.</p>
      <button onClick={() => {/* trigger re-upload via existing UploadZone */}}>
        Re-upload
      </button>
    </div>
  )
}
```

**Existing `uploadStore.result` is NOT cleared** when the 410 fires — only `expired` local state changes. The classification result (top-N, entropy, OOV count) stays visible because it was streamed via SSE and persisted in the store; only the on-demand explanation is unavailable.

**Verification of `apiFetch` status-code surfacing:** The planner must check `frontend/src/lib/api.ts` (path inferred) to confirm `apiFetch` throws an error with `.status` attached. If not, extend it once (small backwards-compatible change).

**Re-upload trigger:** Re-use the EXISTING `UploadZone` component. Don't add a dedicated "Re-upload to see explanation" button — the existing upload affordance already handles file selection; a duplicate button creates two-source-of-truth confusion. The 410 message points the user at the existing upload zone (consider scrolling to it).

**Confidence: HIGH** (standard React Query pattern; only assumption is `apiFetch.status` — verifiable in 1 minute).

### Q6. FastAPI startup pattern for `explain_artifacts`

**Current state** [VERIFIED: `backend/api/app.py:11-28`]:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379')
    try:
        import redis.asyncio as aioredis
        from arq import create_pool
        from arq.connections import RedisSettings
        app.state.redis = aioredis.from_url(redis_url)
        app.state.arq_pool = await create_pool(RedisSettings.from_dsn(redis_url))
    except Exception:
        app.state.redis = None
        app.state.arq_pool = None
    yield
    if app.state.redis is not None:
        await app.state.redis.close()
    if app.state.arq_pool is not None:
        await app.state.arq_pool.close()
```

**Critical observation:** The API process currently does NOT load any ML models on startup — `svm_pipeline`, `w2v_model`, `kmeans`, `persistence_imager` all live in the arq WORKER `ctx`, not in `app.state`. This is fine for v1 (classification runs in the worker), but **Phase 9's `/explain` endpoint runs in the API process and DOES need the SVM (for the two zero-ablation predict_proba calls) and the per-genre centroids and the NN index**.

**Two architectural choices, planner picks one:**

**Option A (recommended): Load explain-needed artifacts into `app.state` at startup.**

The artifacts loaded:
- `app.state.svm_pipeline` — needed for the two zero-ablation calls in D-44.
- `app.state.w2v_model` — needed for word→centroid cosine attribution in D-46.
- `app.state.genre_names` — needed for label-to-genre mapping in top-N response (already loaded in worker; small file).
- `app.state.explain_artifacts` — the `.npz` from D-50 (training feature matrix, centroids, metadata).
- `app.state.nn_index` — `sklearn.neighbors.NearestNeighbors(n_neighbors=5, metric='euclidean').fit(explain_artifacts['feature_matrix_l2'])`.
- `app.state.lineage` — parsed `svm_pipeline.joblib.lineage.json`; used to derive `model_hash` for the explain cache key (D-48).

Total memory: ~70 MB w2v + ~5 MB SVM + ~400 KB explain_artifacts ≈ **75 MB**. Acceptable on Railway's 1 GB worker. Loaded once at startup, shared across requests.

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ... existing Redis / arq pool setup ...

    # Phase 9: load explain artifacts + models needed for /explain endpoint
    try:
        from pathlib import Path
        import joblib, json, numpy as np
        from gensim.models import Word2Vec
        from sklearn.neighbors import NearestNeighbors

        models_dir = Path(__file__).resolve().parents[2] / 'data' / 'models'
        params = load_params()
        window = params['word2vec']['window']

        app.state.svm_pipeline = joblib.load(models_dir / 'svm_pipeline.joblib')
        app.state.w2v_model = Word2Vec.load(str(models_dir / f'word2vec_w{window}.model'))
        with open(models_dir / 'genre_names.json') as f:
            app.state.genre_names = json.load(f)
        with open(models_dir / 'svm_pipeline.joblib.lineage.json') as f:
            app.state.lineage = json.load(f)

        # D-50 explain artifacts
        artifacts_path = models_dir / 'explain_artifacts.npz'
        if artifacts_path.exists():
            data = np.load(artifacts_path, allow_pickle=True)
            app.state.explain_artifacts = {k: data[k] for k in data.files}
            # D-45 NN index fit at load time
            app.state.nn_index = NearestNeighbors(n_neighbors=5, metric='euclidean')
            app.state.nn_index.fit(app.state.explain_artifacts['feature_matrix_l2'])
        else:
            app.state.explain_artifacts = None
            app.state.nn_index = None

        # D-40 backwards-compat guard — refuse top-N if calibration_method missing
        if app.state.lineage.get('calibration_method') is None:
            app.state.calibration_available = False
        else:
            app.state.calibration_available = True
    except Exception as exc:
        # Allow API to start in degraded mode — health check stays green, /explain returns 503
        app.state.svm_pipeline = None
        app.state.w2v_model = None
        app.state.explain_artifacts = None
        app.state.nn_index = None
        app.state.calibration_available = False
        logging.error(f'Phase 9 startup load failed: {exc}')

    yield
    # ... existing teardown ...
```

**Option B: Lazy-load on first `/explain` request.** Rejected because (a) first-request latency would be 5–10 s while loading the 70 MB w2v model, blowing the 200 ms budget for the first explain call; (b) requires per-request guards everywhere; (c) defeats the point of having a shared model.

**Recommendation: Option A.** The worker `ctx` continues to own the FULL set of models for `classify_book`; the API process loads the SUBSET needed for `/explain`. The duplication is acceptable for a stateless-API process serving GET/POST.

**Cross-cutting confirmation:** The arq worker's `ctx['svm_pipeline']` and the API's `app.state.svm_pipeline` will load the SAME `.joblib` file at the SAME path — same lineage, same predictions. No drift.

**Confidence: HIGH** (lifespan pattern is FastAPI canon; memory budget verified against Railway specs).

### Q7. `precompute_explain.py` integration with the existing precompute family

**Existing precompute scripts** [VERIFIED: `backend/pipeline/precompute.py`, `precompute_viz.py`, `precompute_vr.py` all use `python -m backend.pipeline.precompute*` invocation; share the cache + lineage pattern]:

```python
# Invocation pattern from CLAUDE.md "Fresh Machine Setup":
python -m backend.pipeline.precompute --window 15
python -m backend.pipeline.precompute_viz --window 15
python -m backend.pipeline.precompute_vr
```

**Recommendation: `precompute_explain.py` matches the family pattern — separate `python -m backend.pipeline.precompute_explain` invocation.**

```python
# backend/pipeline/precompute_explain.py
"""Build-time Phase 9 artifact precompute.

Run AFTER:
  1. scripts/05_build_features.py        (produces feature_matrix.npy + book_order.json)
  2. backend.pipeline.precompute         (trains calibrated SVM with D-38 retrain + lineage)

Run BEFORE:
  - First start of the FastAPI app server (D-50 startup loads the .npz)

Produces:
  - data/models/explain_artifacts.npz   (see Q2 for schema)

Usage:
  python -m backend.pipeline.precompute_explain --window 15
"""
```

**Run order in the pipeline (CLAUDE.md "Fresh Machine Setup" step 3 must be updated):**

```bash
python scripts/05_build_features.py --window 15
python scripts/06_validate.py --window 15          # optional sanity
python -m backend.pipeline.precompute --window 15  # D-38 retrain happens here
python -m backend.pipeline.precompute_viz --window 15
python -m backend.pipeline.precompute_vr
python -m backend.pipeline.precompute_explain --window 15  # NEW — Phase 9
```

**LFS tracking gap** [VERIFIED: `.gitattributes` covers `*.model`, `*.joblib`, `*.pkl`, `*.model.wv.vectors.npy` — does NOT cover `*.npz`]. **Planner MUST add a line to `.gitattributes` in the Wave-2 precompute_explain plan:**

```
data/models/*.npz filter=lfs diff=lfs merge=lfs -text
```

Otherwise `git add data/models/explain_artifacts.npz` will commit it as a regular (small) file. At 400 KB it would technically commit successfully, but the right thing is LFS-tracking for consistency with sibling artifacts.

**Cache-key invalidation:** `precompute_explain` reads `corpus_hash()` and `w2v_model_sha256()` from `backend.cache.lineage`. The artifact's `metadata` field embeds both. On startup, `lifespan` could optionally cross-check `app.state.lineage['corpus_hash']` against `explain_artifacts['metadata']['corpus_hash']` and refuse to load if they disagree (consistent with the D-40 refusal-to-load pattern).

**Confidence: HIGH** (pattern is uniform across precompute family).

### Q8. Cache invalidation when `calibration_method` changes

**Existing Phase 6 lineage guard** [VERIFIED: `backend/cache/lineage.py::verify_svm_lineage` lines 134-167]: compares `corpus_hash` and `w2v_model_sha256` field-by-field. Treats missing sidecar as `(False, "lineage sidecar missing")`. Does NOT check `calibration_method` today — D-40 must extend it.

**Two ways the guard could break under D-40:**

1. **Sidecar exists but `calibration_method` field is absent (pre-Phase-9 v2 SVM).** Today: passes silently. Under D-40: must return `(False, "calibration_method missing — retrain required")`.
2. **`calibration_method` value disagrees with the loaded SVM behavior** (e.g., lineage says `"calibrated_cv_sigmoid"` but the loaded `svm_pipeline` is bare `SVC` without `probability=True`). Detection: `hasattr(svm_pipeline, 'predict_proba')` — bare SVC has it but it raises if `probability=False`. Better: `getattr(svm_pipeline.named_steps['svm'], 'probability', False) == True`.

**Extended `verify_svm_lineage()` proposed change** (planner Wave 1 task):

```python
def verify_svm_lineage(svm_path: Path, *, window: int) -> tuple[bool, str]:
    # ... existing corpus_hash + w2v_model_sha256 checks unchanged ...

    # D-40 extension
    cal = payload.get('calibration_method')
    if cal is None:
        return False, 'calibration_method missing — pre-Phase-9 SVM, must be retrained for top-N'
    if cal not in ('libsvm_platt', 'calibrated_cv_sigmoid'):
        return False, f'calibration_method unknown: {cal!r}'

    return True, 'lineage matches'
```

**Graceful fallback path** (D-40 says "treat as 'none' and refuse top-N"; CONTEXT.md `<claude_discretion>` says "planner picks the graceful path"):

**Recommendation: 503 with explicit retrain instruction, NOT silent fallback to v1 single-genre.**

Reasoning:
- The fallback path "silently return single-genre + decision_function confidence" reintroduces the very anti-pattern PITFALLS §7 flagged. Users see top-3 in production after a deploy, then see single-genre after a partial rollback — confusing UX.
- A 503 with a CLEAR message ("Top-N predictions require a calibrated SVM. The deployed SVM lacks calibration metadata; please run `python -m backend.pipeline.precompute_explain` to refresh.") is honest and actionable.
- The /classify endpoint itself does NOT need to 503 — it can still return single-genre under the old behavior, while the NEW `result.top_n` field is omitted. Frontend `useClassify.ts` should gracefully handle `top_n` being absent: render only the single-genre legacy view.

```python
# In classify endpoint:
if not request.app.state.calibration_available:
    # Backwards-compat: return single-genre as today, omit top_n
    # Log a warning so the deployer sees the partial-feature state
    log.warning("Serving without top_n — calibration metadata missing in SVM lineage")
    return {'predicted_genre': ..., 'confidence': ..., ...}  # no top_n
```

**Explain endpoint behavior** under missing calibration:

```python
@router.post('/classify/{job_id}/explain', ...)
async def explain(job_id: str, request: Request):
    if not request.app.state.calibration_available:
        raise HTTPException(
            status_code=503,
            detail='Explanation unavailable: SVM is not calibrated. '
                   'Re-run precompute pipeline to enable.'
        )
    # ... normal explain path ...
```

**Confidence: HIGH** (clean fallback rule; both endpoints behave consistently).

### Q9. `feature_vec` Redis serialization detail

**Format choice — hardcode dtype in reader, no sidecar key:**

The feature vector is produced by `backend/pipeline/features.py::build_feature_vector` which uses `np.concatenate([alpha * topo_norm, (1 - alpha) * loc_norm])`. Both `topo_norm` and `loc_norm` are `np.float64` by default (numpy default; no explicit dtype cast in `features.py`). **Verified:** the existing `feature_matrix.npy` saved by `scripts/05_build_features.py` is also `float64`.

**Recommendation: write `float64` to Redis; reader hardcodes `np.frombuffer(bytes, dtype=np.float64)`.**

```python
# backend/worker/jobs.py — Phase 9 addition between Step 5 and Step 6 (D-47):
# After feat_vec is computed
if redis is not None:
    await redis.set(
        f'feature_vec:{job_id}',
        feature_vec.astype(np.float64).tobytes(),  # explicit cast for safety
        ex=300,  # 5 min TTL per ARCHITECTURE.md §4
    )
```

```python
# backend/api/routes/explain.py — reader:
raw = await redis.get(f'feature_vec:{job_id}')
if raw is None:
    raise HTTPException(status_code=410, detail='Upload expired — re-upload to see the explanation.')
feature_vec = np.frombuffer(raw, dtype=np.float64)
# Shape verification
expected_dim = 400 + params['features']['k_clusters']  # 600 for current params
if feature_vec.shape != (expected_dim,):
    raise HTTPException(
        status_code=500,
        detail=f'feature_vec shape mismatch: got {feature_vec.shape}, expected ({expected_dim},)',
    )
```

**Why no sidecar `feature_vec:{job_id}:dtype` key:**
- Future-proofing premium is low — float64 is the sklearn / numpy default and Phase 9 will not change it.
- Adds a second Redis round-trip per explain call.
- If a future phase changes dtype, that's a coordinated change to BOTH writer and reader anyway — a sidecar key wouldn't help.

**Size:** ~600 floats × 8 bytes = **4.8 KB per job**. Negligible Redis overhead even at 100 concurrent uploads (480 KB total).

**Confidence: HIGH** (standard numpy serialization; trivially testable).

### Q10. Brand-tone copy for disclosure surfaces

**The dialog file is `frontend/src/components/explanation/PipelineExplanation.tsx`** [VERIFIED via Glob]. It hosts 6 step components in `frontend/src/components/explanation/steps/Step{1..6}.tsx`. Tone observed in `Step6Classification.tsx`: friendly-academic, two-paragraph format, sentences ≤ 30 words, no emojis, links rendered as plain `<a>` tags with project's accent color.

**Final copy (D-51 walkthrough disclaimer — RECOMMEND adding as new `Step7ValidationLimitations.tsx`):**

Recommendation: NEW step component, NOT extending Step6. Reasoning: the walkthrough is the ONLY slow-read surface where validation caveats fit at length; adding ~3 paragraphs to Step6 makes that step disproportionately long.

```typescript
// frontend/src/components/explanation/steps/Step7ValidationLimitations.tsx
export function Step7ValidationLimitations() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h3 style={{ fontSize: 24, fontWeight: 600, color: '#F5F5FF', margin: 0 }}>
        Validation &amp; Limitations
      </h3>
      <div style={{ fontSize: 14, color: '#9090A0', lineHeight: 1.7, maxWidth: 600 }}>
        <p style={{ margin: '0 0 16px' }}>
          The v2 classifier was evaluated on a 20-book hold-out drawn from authors
          already represented in the training corpus. The reported macro-F1 of 0.74
          is an <strong style={{ color: '#E0E0EC' }}>upper bound</strong> — for books
          by authors not in the training set (which is most real uploads), expect a
          wider confidence band.
        </p>
        <p style={{ margin: '0 0 16px' }}>
          The &ldquo;Why this genre?&rdquo; panel surfaces the per-prediction signal
          that lets you judge confidence for yourself: nearest training books,
          per-track contribution, and an uncertainty badge that fires when the top
          predictions are close.
        </p>
        <p style={{ margin: 0 }}>
          <a
            href="https://github.com/aaasocial/Word2Vec-Topology-Genre-Detector/blob/master/results/v2_validation_report.md"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#6366F1' }}
          >
            Read the full validation report &rarr;
          </a>
        </p>
      </div>
    </div>
  )
}
```

Also update `PipelineExplanation.tsx`'s `STEPS` array (line 11-18) to add `Step7ValidationLimitations` as a 7th entry — `TOTAL_STEPS` derives from `STEPS.length`, no other change needed.

**Final copy (D-51 Why-panel footnote — inside `ClassificationExplain.tsx`):**

```typescript
// At the bottom of ClassificationExplain.tsx
<div style={{ fontSize: 11, color: '#6B6B80', marginTop: 16, lineHeight: 1.5 }}>
  The v2 model was validated on books by authors already in the training corpus;
  performance on unseen authors is typically lower. See{' '}
  <a
    href="https://github.com/aaasocial/Word2Vec-Topology-Genre-Detector/blob/master/results/v2_validation_report.md"
    target="_blank"
    rel="noopener noreferrer"
    style={{ color: '#6366F1' }}
  >
    validation report
  </a>
  .
</div>
```

**Final copy (D-46 driving-words disclosure — at top of `DrivingWordsPills.tsx`):**

```typescript
<div style={{ fontSize: 11, color: '#6B6B80', marginBottom: 8, lineHeight: 1.4 }}>
  High-TF-IDF words from your upload, tagged with the nearest training genre by
  word-vector similarity. These are <strong style={{ color: '#9090A0' }}>proxies</strong>{' '}
  for the cluster-distribution signal — not literal classifier inputs.
</div>
```

**Final copy (D-52 entropy badge tooltip — on `UncertaintyBadge.tsx`):**

```typescript
const TOOLTIP_TEXT =
  'Low confidence — top predictions are close. The v2 model was validated on books by ' +
  'authors already in the training corpus; performance on unseen authors is typically lower. ' +
  'Open “Why this genre?” for the per-prediction breakdown.'
```

Note: D-52 says "tooltip cites the same one-sentence caveat as the D-51 footnote — consistent voice across honesty surfaces." The two paragraphs above share the same second sentence — that's the consistency contract.

**Confidence: HIGH** (tone matches existing `Step6Classification.tsx`; URLs verified from PROJECT context).

## Standard Stack

### Core (already installed — no install needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| scikit-learn | 1.6.1 (current repo) | `SVC(probability=True)` Platt + `CalibratedClassifierCV(method='sigmoid', cv=LeaveOneOut())` for calibration; `NearestNeighbors(metric='euclidean')` for D-45; `log_loss` for supplementary calibration metric | sklearn-canonical; STACK.md §"Supporting Libraries" confirms these are blessed |
| numpy | bundled with sklearn | Manual multiclass-Brier helper (Q1); zero-ablation array math (Q3); feature_vec serialization (Q9) | Standard |
| gensim | already installed | `w2v_model.wv.get_vector(word)` for per-genre centroid (Q2) | Already loaded in worker `ctx`; lifespan extends to API process per Q6 |
| matplotlib | bundled / sklearn dep | Reliability diagrams (Q1) — `sklearn.calibration.CalibrationDisplay.from_predictions` for one-vs-rest | sklearn-canonical |
| joblib | already installed | Load `svm_pipeline.joblib` in API lifespan (Q6) | Already used in worker |
| FastAPI | already installed | `lifespan` context manager + `app.state` + `HTTPException(410)` | Existing pattern |
| redis (async) | already installed | `feature_vec:{job_id}` and `explain:{hash}:{model_hash}` keyspaces | Existing pattern |
| Pydantic | already installed | `extra='forbid'` response models | Existing pattern (`CorpusBookFull`) |

### Frontend

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | already installed | `useMutation` for `/explain` POST with selective 410 onError handling (Q5) | Existing pattern in `useCorpusBooks.ts` and other hooks |
| Zustand | already installed | `uploadStore` extends `ClassificationResult` interface with `top_n`, `entropy`, `top1_top2_gap` | Existing pattern |
| React 18 + Vite | already installed | Component layer | Existing |

### Version verification

```bash
python -c "import sklearn; print(sklearn.__version__)"  # 1.6.1 confirmed
```

[VERIFIED 2026-05-27 in this research session]

### Installation

**No new installs needed.** Phase 9 uses only already-installed libraries. PITFALLS §8 explicitly excludes SHAP from synchronous production code; STACK.md notes `shap==0.51.0` STAYS in `requirements.txt` as dev-only escape hatch but is NOT imported by Phase 9 code.

## Architecture Patterns

### Recommended file structure (Phase 9 additions)

```
backend/
├── api/
│   ├── app.py                 # MODIFIED — lifespan loads explain_artifacts + svm + w2v + nn_index
│   ├── models.py              # MODIFIED — adds TopNPrediction, ExplainResponse, NearestTrainingBook, TrackContribution, DrivingWord, UncertaintyMetrics
│   └── routes/
│       ├── classify.py        # MODIFIED — SSE result payload gains top_n, entropy, top1_top2_gap
│       └── explain.py         # NEW — POST /classify/{job_id}/explain (planner picks classify.py extension OR new file)
├── cache/
│   └── lineage.py             # MODIFIED — verify_svm_lineage extended for D-40 calibration_method check
├── pipeline/
│   ├── classify.py            # MODIFIED — returns list[tuple[str, float]] of length 8 via predict_proba
│   ├── precompute.py          # MODIFIED — calls write_svm_lineage with calibration_method/brier_score
│   ├── precompute_explain.py  # NEW — emits data/models/explain_artifacts.npz
│   └── explain.py             # NEW — compute_track_contributions, find_nearest_training_books, compute_driving_words, compute_uncertainty_metrics
├── tests/
│   ├── test_explain_math.py        # NEW — D-54 unit tests (sum-to-1, sum-to-100, NN count==5, entropy in [0,1], driving words ≤15, multiclass Brier)
│   └── test_explain_endpoint.py    # NEW — D-54 integration test against v2 SVM
├── worker/
│   └── jobs.py                # MODIFIED — Step 5.5: write feature_vec:{job_id} to Redis (D-47); SSE result payload extension

frontend/src/
├── components/
│   ├── explanation/
│   │   ├── PipelineExplanation.tsx                  # MODIFIED — adds Step7 to STEPS array
│   │   └── steps/
│   │       └── Step7ValidationLimitations.tsx       # NEW — D-51 walkthrough disclaimer
│   └── sidebar/
│       ├── ClassificationResult.tsx                 # MODIFIED — hosts TopNList + UncertaintyBadge + Why-button → ClassificationExplain
│       ├── ClassificationExplain.tsx                # NEW — expander panel
│       ├── TopNList.tsx                             # NEW — top-3 bars + "+5 more" expander
│       ├── UncertaintyBadge.tsx                     # NEW — entropy badge
│       ├── DrivingWordsPills.tsx                    # NEW — top-15 pills
│       ├── TrackContributionBars.tsx                # NEW — topology/vocabulary split
│       └── NearestBooksList.tsx                     # NEW — 5 nearest books
├── hooks/
│   └── useExplain.ts                                # NEW — useMutation for POST /explain
├── stores/
│   └── uploadStore.ts                               # MODIFIED — ClassificationResult interface gains top_n, entropy, top1_top2_gap
└── types/
    └── explain.ts                                   # NEW — TopNPrediction, ExplainResponse, etc. TS types

scripts/
└── (06_validate.py extension OR new calibrate.py)   # MODIFIED/NEW — D-37 calibration spike

results/
└── v2_calibration_report.md                         # NEW — D-39

data/models/
└── explain_artifacts.npz                            # NEW — D-50

.gitattributes                                       # MODIFIED — add data/models/*.npz LFS line
config/params.yaml                                   # MODIFIED — add classify.calibration_method field (default null → set after D-37)
```

### Pattern 1: lifespan-loaded immutable artifacts

**What:** Load read-only ML artifacts (SVM, w2v, NN index) ONCE in `lifespan`; expose via `app.state`. Endpoints read; never mutate.

**When to use:** Always for non-user-specific artifacts that fit in memory.

**Example:** See Q6 code block.

### Pattern 2: lineage-aware cache namespace

**What:** Cache keys embed the model lineage so a model retrain (D-38) automatically rotates the cache namespace.

**Example:**

```python
def explain_cache_key(feature_vec: np.ndarray, lineage: dict) -> str:
    """Phase 9 explain cache key per D-48 + BUG-05 lineage pattern."""
    feature_hash = hashlib.sha256(feature_vec.astype(np.float64).tobytes()).hexdigest()
    # model_hash from lineage; D-38 retrain rotates this automatically
    model_hash = lineage['w2v_model_sha256'][:16]  # short prefix is fine inside the key
    return f'explain:{feature_hash}:{model_hash}'
```

### Pattern 3: Pydantic `extra='forbid'` response shape

**What:** Use `model_config = {'extra': 'forbid'}` on every Phase 9 response model so a planner-added field surfaces a 500 if the implementation forgets to populate it.

**Example:** [VERIFIED: `backend/api/models.py:54` `CorpusBookFull.model_config = {'extra': 'forbid'}`]

```python
class TopNPrediction(BaseModel):
    genre: str
    probability: float = Field(ge=0.0, le=1.0)
    color: str = Field(pattern=r'^#[0-9A-Fa-f]{6}$')
    model_config = {'extra': 'forbid'}

class ExplainResponse(BaseModel):
    nearest_training_books: list[NearestTrainingBook] = Field(max_length=5, min_length=5)
    track_contributions: TrackContributions
    driving_words: list[DrivingWord] = Field(max_length=15)
    uncertainty: UncertaintyMetrics
    model_config = {'extra': 'forbid'}
```

### Anti-Patterns to Avoid

(Inherited from CONTEXT.md `<code_context>` "Anti-patterns to avoid" verbatim — listed here for planner convenience.)

- **Don't bolt `probability=True` onto the existing v2 SVM.** PITFALLS §7. D-38 mandates full retrain.
- **Don't use Kernel SHAP for live explanations.** PITFALLS §8.
- **Don't expose per-pixel persistence-image importance.** PITFALLS §9.
- **Don't softmax the raw `decision_function`.** PITFALLS §7.
- **Don't change the v1/v2 feature vector slice layout.** D-44 zero-ablation assumes the existing `[alpha*topo_norm, (1-alpha)*loc_norm]` order — VERIFIED at `backend/pipeline/features.py:116` and `scripts/06_validate.py:461-463`.
- **Don't surface inline disclaimer on every classification result.** D-51 keeps the leakage caveat in two intentional places.
- **Don't touch `frontend/src/constants/genres.ts::GENRE_COLORS`** — Phase 10 owns.
- **Don't introduce CSS variables in Phase 9 components.** D-55.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Probability calibration for SVC | Custom Platt-scaling layer | `SVC(probability=True)` for libsvm internal Platt OR `CalibratedClassifierCV(method='sigmoid', cv=LeaveOneOut())` | sklearn handles the multiclass OvR Platt extension (Wu-Lin-Weng) correctly; rolling your own gets sign conventions wrong |
| Multiclass Brier score | (this one MUST be hand-rolled — sklearn 1.6 brier_score_loss is binary-only) | The 8-line helper in Q1; cite Niculescu-Mizil & Caruana 2005 in the docstring | Verified: sklearn 1.6 raises ValueError on (n, k) probas; this is a real gap |
| Reliability diagram | Custom binning + plot | `sklearn.calibration.CalibrationDisplay.from_predictions` with one-vs-rest per class | One-line per class; standardized x-axis (forecast probability) vs y-axis (observed frequency); 5 bins for small samples |
| Nearest-neighbor lookup | Pairwise distance loop | `sklearn.neighbors.NearestNeighbors(n_neighbors=5, metric='euclidean').fit(X)` + `kneighbors(query)` | Microseconds at 154 books; ball-tree implementation handles ties |
| Cache key derivation | Custom string concatenation | Existing `backend/cache/lineage.py::file_sha256` + `corpus_hash()` + `w2v_model_sha256()` patterns; new helper `explain_cache_key(feature_vec, lineage)` | Pattern is established; deviating breaks the BUG-05 invalidation contract |
| L2 normalization | Manual `x / (np.linalg.norm(x) + 1e-10)` | Same — the `+1e-10` zero-division guard IS the standard; OR `sklearn.preprocessing.normalize(X, axis=1)` for batch | Existing code uses both patterns; either is fine |
| Numpy bytes serialization | Custom pack/unpack | `arr.astype(np.float64).tobytes()` writer + `np.frombuffer(raw, dtype=np.float64)` reader | Stdlib; no version drift concerns |
| Brier-vs-log-loss tie-breaker rule | Custom complex decision tree | The "if |delta| < 1e-3 default to libsvm_platt" rule from CONTEXT.md §specifics | Already designed; planner just records the outcome |
| One-hot encoding for Brier | Manual array constructions | `np.eye(n_classes)[y_true]` or `np.zeros_like(y_proba); rows[idx, y] = 1` | Both standard; either is fine |

**Key insight:** Phase 9 is mostly composition of existing sklearn helpers + repo-canonical patterns. The ONE library gap is multiclass Brier; the ONE genuine new design surface is the disclosure-copy + UX choreography.

## Common Pitfalls

### Pitfall 1: predict-vs-predict_proba disagreement on the calibrated SVM

**What goes wrong:** With small per-class samples and Platt CV, `svm.predict(X)` can sometimes return a different class than `np.argmax(svm.predict_proba(X), axis=1)`. The UI shows "top-3: gothic_horror 38%, mystery 35%, ..." but `predict()` returns mystery. Top-1 disagrees with the bar chart.

**Why it happens:** [CITED: https://scikit-learn.org/stable/modules/svm.html#scores-and-probabilities] sklearn's SVM docs explicitly warn: "if `predict_proba` is enabled, `predict` may disagree with `argmax(predict_proba)`, especially with small training sets, because `predict_proba` uses 5-fold CV internally to fit the Platt scaling." With 154 books over 8 genres = ~19 per class, this is well within the warning regime.

**How to avoid:** In `predict_genre` (the Phase 9 modified version), ALWAYS use `argmax(predict_proba)` as the predicted genre — do NOT call `predict()` separately. Single source of truth.

**Warning signs:** Unit test should assert `np.argmax(svm.predict_proba(X)) == svm.predict(X)` is NOT a hard invariant — log when they disagree and surface as low-confidence via the D-43 entropy badge (which will fire if the top-1 vs top-2 gap is tiny).

### Pitfall 2: `predict_proba` is slow on calibrated SVM

**What goes wrong:** Two zero-ablation predict_proba calls (D-44) take 20+ ms each. With base + topo-zeroed + vocab-zeroed = 3 calls per explain, that's 60+ ms of pure SVM, blowing the 200 ms budget when added to the NN lookup and centroid math.

**Why it happens:** `CalibratedClassifierCV` ensemble mode (default) calls the underlying SVC's `decision_function` AND then evaluates the sigmoid per CV fold (5 folds by default for libsvm Platt; N folds for `cv=LeaveOneOut`). Each call is N× the bare SVC call.

**How to avoid:** Two paths:
1. **Batch the three predictions.** `svm.predict_proba(np.vstack([feat, feat_topo_zeroed, feat_vocab_zeroed]))` returns `(3, 8)` proba matrix. Sklearn vectorizes the kernel computation across the 3 rows — typically 1.5× faster than 3 separate calls.
2. **If using `CalibratedClassifierCV(cv=LeaveOneOut())` wins D-37**, the wrapper has N (=number of training samples) Platt classifiers averaged at inference. This is O(N) per call. The bare `SVC(probability=True)` path is O(5) per call regardless of training set size — significantly faster. Factor this into the D-37 tie-break: latency, not just Brier.

**Warning signs:** Wave-2 explain endpoint integration test should assert end-to-end P50 latency < 200 ms on the 17 in-comparison hold-out books.

### Pitfall 3: Empty `explain_artifacts.npz` after a precompute_explain crash

**What goes wrong:** `precompute_explain.py` crashes mid-write (disk full, KeyboardInterrupt), leaves `data/models/explain_artifacts.npz` as a zero-byte or truncated file. API lifespan tries to load it, throws `BadZipFile` or similar, lifespan catches the exception and sets `app.state.explain_artifacts = None` — but the SVM is loaded, `calibration_available` is True, so `/explain` tries to proceed and hits a None deref.

**How to avoid:**
1. **Atomic write pattern:** `precompute_explain.py` writes to `data/models/explain_artifacts.npz.tmp`, then `os.replace()` to the final path. Half-written files never get the final name.
2. **Lifespan loads as a separate try/except block from the SVM load.** If `explain_artifacts.npz` fails to parse, set `nn_index = None`; do NOT set `svm_pipeline = None`. The /explain endpoint then 503s gracefully with "explain artifacts unavailable, run precompute_explain.py".
3. **Endpoint-level guard:** `if request.app.state.nn_index is None: raise HTTPException(503, ...)`.

**Warning signs:** CI smoke test should run `python -m backend.pipeline.precompute_explain` then immediately start the API and hit `/explain` against a known job_id.

### Pitfall 4: feature_vec written to Redis BEFORE the predict step → empty cache on classify failure

**What goes wrong:** D-47 says feature_vec goes to Redis between Step 5 (features) and Step 6 (classify). If Step 6 raises (rare but happens), `feature_vec:{job_id}` is in Redis with a 5-min TTL but no classification result exists. User never sees a result, never clicks "Why?", but Redis has 4.8 KB of dead state per failure.

**How to avoid:** Acceptable — 5 min TTL self-cleans. Don't add extra failure-path cleanup; complexity isn't worth it.

**Sanity:** Confirm the `_publish_progress(redis, job_id, 'classify', 6, status='error', ...)` path in `classify_book` doesn't try to read feature_vec.

### Pitfall 5: NN index serving stale neighbors after a corpus drop

**What goes wrong:** A book is removed from `corpus/books.yaml` (extremely rare in v2 post-Phase-8.1, but possible). `precompute.py` reruns and rotates `corpus_hash`. The lineage check FAILS at API startup → app refuses to load explain artifacts. BUT: the `corpus_hash` is in `lineage.json`, not in `explain_artifacts.npz` metadata by default — so the artifact silently keeps the stale book in NN results.

**How to avoid:** `precompute_explain.py` MUST embed `corpus_hash` AND `w2v_model_sha256` in `explain_artifacts['metadata']` (see Q2 storage format). Lifespan cross-checks against `app.state.lineage['corpus_hash']` and refuses to load if they disagree.

**Warning signs:** Manual test: rerun precompute on a fake "corpus with one book removed" and verify /explain 503s with a clear error message.

## Code Examples

Phase 9 reference implementations (verified patterns to copy):

### Multiclass Brier helper

```python
# scripts/calibrate.py or backend/pipeline/explain.py
def multiclass_brier_score(y_true: np.ndarray, y_proba: np.ndarray, n_classes: int) -> float:
    """Mean squared error between predict_proba rows and one-hot true labels.

    Range: [0, 2]. Lower is better.

    sklearn.metrics.brier_score_loss in sklearn 1.6.1 is binary-only — this helper
    fills the multiclass gap. Standard definition per Niculescu-Mizil & Caruana (2005).
    """
    y_true = np.asarray(y_true, dtype=int)
    y_proba = np.asarray(y_proba, dtype=np.float64)
    assert y_proba.shape == (len(y_true), n_classes), f"shape mismatch: {y_proba.shape}"
    y_onehot = np.eye(n_classes)[y_true]
    return float(np.mean(np.sum((y_proba - y_onehot) ** 2, axis=1)))
```

### Top-N from `predict_proba`

```python
# backend/pipeline/classify.py — Phase 9 modification
def predict_top_n(
    feature_vector: np.ndarray,
    svm_pipeline,
    genre_names: list[str],
    cancel_event: asyncio.Event = None,
) -> list[tuple[str, float]]:
    """Return ranked list of (genre, probability) tuples, length == len(genre_names).

    Replaces v1 single-prediction predict_genre per D-37/D-38. The returned list is
    sorted descending by probability; TopNList.tsx slices to top-3 with a "+5 more"
    expander revealing all 8.
    """
    if cancel_event and cancel_event.is_set():
        raise asyncio.CancelledError('Cancelled before classify step')

    X = feature_vector.reshape(1, -1)
    probas = svm_pipeline.predict_proba(X)[0]  # (n_classes,)
    classes = svm_pipeline.classes_  # int label array
    ranked_idx = np.argsort(probas)[::-1]
    return [
        (genre_names[int(classes[i])], float(probas[i]))
        for i in ranked_idx
    ]
```

### Per-track zero-ablation (D-44 canonical)

```python
# backend/pipeline/explain.py
def compute_track_contributions(
    feature_vec: np.ndarray,
    svm_pipeline,
    predicted_label_idx: int,
    *,
    topo_dim: int = 400,  # grid_resolution² = 20² = 400 — from config/params.yaml
) -> dict:
    """Per-track contribution via local zero-ablation per D-44.

    Returns {
        'topology':   {'pct': float (0-100), 'direction': '+' | '-' | '0'},
        'vocabulary': {'pct': float (0-100), 'direction': '+' | '-' | '0'},
    }
    """
    feat = feature_vec.astype(np.float64)
    feat_topo_zero = feat.copy(); feat_topo_zero[:topo_dim] = 0
    feat_vocab_zero = feat.copy(); feat_vocab_zero[topo_dim:] = 0

    # Batch the three predictions for ~1.5× speedup
    batch = np.vstack([feat, feat_topo_zero, feat_vocab_zero])
    probas = svm_pipeline.predict_proba(batch)[:, predicted_label_idx]
    base, without_topo, without_vocab = probas

    topo_contrib = base - without_topo
    vocab_contrib = base - without_vocab

    abs_topo, abs_vocab = abs(topo_contrib), abs(vocab_contrib)
    total = abs_topo + abs_vocab
    if total < 1e-9:
        return {
            'topology':   {'pct': 50.0, 'direction': '0'},
            'vocabulary': {'pct': 50.0, 'direction': '0'},
        }
    return {
        'topology':   {'pct': 100.0 * abs_topo / total,
                       'direction': '+' if topo_contrib >= 0 else '-'},
        'vocabulary': {'pct': 100.0 * abs_vocab / total,
                       'direction': '+' if vocab_contrib >= 0 else '-'},
    }
```

### Explain cache key

```python
# backend/cache/explain_cache.py (or inline in routes/explain.py)
import hashlib

def explain_cache_key(feature_vec: np.ndarray, lineage: dict) -> str:
    feature_hash = hashlib.sha256(feature_vec.astype(np.float64).tobytes()).hexdigest()
    model_hash = lineage['w2v_model_sha256'][:16]  # first 16 hex chars is plenty
    return f'explain:{feature_hash}:{model_hash}'
```

## State of the Art

| Old Approach (v1) | Current Approach (v2 / Phase 9) | When Changed | Impact |
|-------------------|----------------------------------|--------------|--------|
| `decision_function` margin as "confidence" | `predict_proba` calibrated probabilities sum to 1 | D-37/D-38 retrain | Honest top-N display |
| Single genre + scalar confidence | Top-3 + collapsible +5 more (all 8 reachable) | D-41 | Progressive disclosure |
| No "why this genre?" surface | `/explain` endpoint with NN + per-track + driving words + entropy | D-46..D-50 | Closes v2 milestone goal #3 |
| Cache key by `(step, params)` only | `cache_key(step, params, corpus_hash, w2v_model_sha256)` | Phase 6 BUG-05 + Phase 9 explain cache extends with `model_hash` | Calibration rotation = automatic invalidation |
| `app.state` holds only Redis + arq | + svm + w2v + explain_artifacts + nn_index + lineage | Q6 | /explain runs in API process |
| `verify_svm_lineage` checks corpus_hash + w2v_model_sha256 | + calibration_method check | D-40 | Refuse-to-load if pre-Phase-9 SVM |

**Deprecated/outdated (NOT to be re-introduced):**
- Softmaxing `decision_function` (PITFALLS §7) — was never shipped; PR'd in research and rejected
- Kernel SHAP synchronous (PITFALLS §8) — was tempting; rejected
- Per-pixel persistence-image importance (PITFALLS §9) — meaningless; rejected
- `homology_dims=2` in feature vector (ARCHITECTURE.md §5a) — viz-only in v2

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `apiFetch` in `frontend/src/lib/api.ts` attaches HTTP status code to thrown errors | Q5 | If absent, `useExplain.ts::onError` cannot discriminate 410 vs 5xx. Mitigation: planner verifies in <1 minute by reading `lib/api.ts`; if missing, adds 3-line patch. |
| A2 | The 200 ms latency budget is achievable on Railway with batched `predict_proba` | Q1, Pitfall 2 | If `CalibratedClassifierCV(LeaveOneOut)` wins D-37, end-to-end may be 300+ ms. Mitigation: Wave-2 integration test measures actual P50; if over budget, planner can either (a) accept the degradation and update D-46 budget, (b) re-run D-37 favoring `SVC(probability=True)` despite slightly worse Brier. |
| A3 | The PipelineExplanation walkthrough is the canonical "slow-read" surface where the D-51 disclaimer fits | Q10 | If user feedback says walkthrough is too buried, planner may need a more-surfaced placement. Mitigation: same disclaimer copy is reusable; surface change is a small frontend tweak. |
| A4 | The 1e-3 Brier tie-break threshold will not fire in practice given the noisy v2 corpus | Q1 | If it DOES fire (within 1e-3), the rule defaults to `libsvm_platt` — both methods are then equivalently calibrated, just slightly different latency. Not a real risk. |
| A5 | Memory budget on Railway (~1 GB) accommodates 75 MB of explain artifacts | Q6 | Verified against STACK.md sources but not against deployed metrics. Mitigation: Wave-2 deployment smoke test reports memory; if tight, drop w2v from `app.state` and use a smaller per-genre centroid-only artifact for the explain path. |
| A6 | Sklearn 1.6.1's `CalibrationDisplay.from_predictions` accepts `n_bins=5` and one-vs-rest binarized labels | Q1 | [VERIFIED in this session: `python -c "from sklearn.calibration import CalibrationDisplay; print(CalibrationDisplay.from_predictions.__doc__)"` confirms the API — n_bins parameter exists]. NOT actually an assumption — promote to VERIFIED. |
| A7 | The feature vector dtype is `float64` end-to-end | Q9 | [VERIFIED: `features.py:116` `np.concatenate(...)` of two float arrays produces float64 by default; existing `feature_matrix.npy` is float64]. Promoted to VERIFIED. |

**Net assumptions requiring user confirmation:** A1, A2, A3, A5. A4 is a non-event; A6, A7 are already verified.

## Open Questions

1. **Driving-words ordering ambiguity:** CONTEXT.md §specifics says "by TF-IDF descending, ties broken alphabetically. Nearest-genre tag is informational; pills do NOT reorder by genre." Confirmed; nothing further to research.

2. **What is the v2 SVM's `genre_names` ordering against `svm_pipeline.classes_`?** The frontend GENRE_COLORS map is still keyed to v1 genres per Phase 8 note (Phase 10 owns the relabel). Phase 9 reads `GENRE_COLORS[g] ?? '#888888'` as a fallback. Recommendation: planner verifies in Wave-3 that `genre_names.json` (8 v2 keys) used as bar-row labels works with the v1-keyed GENRE_COLORS via the `?? '#888888'` fallback — same pattern v1 already uses. Should be a no-op but worth confirming.

3. **Should `precompute_explain.py` run on EVERY `precompute.py` invocation, or be a separate user-triggered step?** CLAUDE.md "Fresh Machine Setup" suggests separate invocation; that matches the precompute_viz / precompute_vr pattern. Confirmed: separate. The Phase 9 docs update should add the line to CLAUDE.md.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.11+ | All backend Phase 9 code | ✓ | 3.x (sklearn 1.6.1 confirms) | — |
| scikit-learn | Calibration, NearestNeighbors, log_loss | ✓ | 1.6.1 [VERIFIED] | — |
| numpy | All array math | ✓ | bundled with sklearn | — |
| gensim | w2v centroid math (Q2), w2v model load (Q6) | ✓ (assumed — used throughout existing codebase) | per requirements.txt | — |
| matplotlib | Reliability diagrams (Q1) | ✓ (used in existing scripts) | — | If missing: defer reliability PNG; record Brier numbers only in markdown table |
| FastAPI + lifespan | API process model loading (Q6) | ✓ | per `backend/api/app.py` import patterns | — |
| Redis | feature_vec:{job_id}, explain:{hash}:{model_hash} | ✓ at runtime; degraded mode at test time | per `backend/api/app.py` graceful fallback | If Redis unavailable: API still starts (current pattern), /explain endpoint returns 503 |
| Git LFS | `data/models/explain_artifacts.npz` storage | ✓ (already used for .joblib, .model) | per `.gitattributes` | **GAP: must add `data/models/*.npz` line to `.gitattributes`** (see Q7) |
| react-query (@tanstack/react-query) | useExplain hook (Q5) | ✓ (already used in repo) | per `frontend/package.json` | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None blocking.

**Gap requiring planner action:** Add `data/models/*.npz filter=lfs diff=lfs merge=lfs -text` to `.gitattributes` in Wave 2 (precompute_explain plan).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend framework | pytest (existing — see `backend/tests/test_*.py` and `scripts/test_06_validate.py`) |
| Frontend framework | Vitest (existing — `frontend/src/components/**/__tests__/*.test.tsx` pattern per CONTEXT.md `<code_context>` D-54) |
| Backend config file | `pytest.ini` (assumed; planner verifies) |
| Frontend config file | `vitest.config.ts` (assumed; planner verifies) |
| Quick run command (backend) | `pytest backend/tests/test_explain_math.py -x` |
| Quick run command (frontend) | `cd frontend && npm test -- TopNList` |
| Full suite (backend) | `pytest backend/ scripts/` |
| Full suite (frontend) | `cd frontend && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| DEPTH-01 | Top-N sums to 1.0 ± 1e-6 across all 8 genres | unit | `pytest backend/tests/test_explain_math.py::test_top_n_sums_to_one -x` | ❌ Wave 1 |
| DEPTH-01 | `predict_top_n` returns list of len == 8 sorted descending | unit | `pytest backend/tests/test_explain_math.py::test_top_n_sorted_desc -x` | ❌ Wave 1 |
| DEPTH-02 | `TopNList.tsx` renders top-3 by default, "+5 more" expander shows all 8 | unit | `cd frontend && npm test -- TopNList` | ❌ Wave 3 |
| DEPTH-02 | Probability bars sorted descending; percent labels to 1 decimal | unit | same | ❌ Wave 3 |
| DEPTH-03 | `POST /explain` returns valid ExplainResponse against v2 SVM | integration | `pytest backend/tests/test_explain_endpoint.py::test_explain_happy_path -x` | ❌ Wave 2 |
| DEPTH-03 | `POST /explain` returns 410 when feature_vec evicted | integration | `pytest backend/tests/test_explain_endpoint.py::test_explain_410_on_expiry -x` | ❌ Wave 2 |
| DEPTH-03 | `POST /explain` returns 503 when calibration_method missing | integration | `pytest backend/tests/test_explain_endpoint.py::test_explain_503_no_calibration -x` | ❌ Wave 2 |
| DEPTH-04 | Nearest training books count == 5; all distances finite & non-negative | unit | `pytest backend/tests/test_explain_math.py::test_nn_count_and_distances -x` | ❌ Wave 1 |
| DEPTH-05 | Per-track contributions sum to 100.0 ± 1e-6 | unit | `pytest backend/tests/test_explain_math.py::test_track_contributions_sum_100 -x` | ❌ Wave 1 |
| DEPTH-05 | Per-track direction is '+', '-', or '0' (no other values) | unit | `pytest backend/tests/test_explain_math.py::test_track_directions_valid -x` | ❌ Wave 1 |
| DEPTH-06 | Driving words list length <= 15 | unit | `pytest backend/tests/test_explain_math.py::test_driving_words_max_15 -x` | ❌ Wave 1 |
| DEPTH-06 | Driving words sorted by TF-IDF descending, alphabetical tie-break | unit | same | ❌ Wave 1 |
| DEPTH-06 | Each driving word's nearest_genre is one of the 8 v2 genres | unit | `pytest backend/tests/test_explain_math.py::test_driving_word_genre_valid -x` | ❌ Wave 1 |
| DEPTH-07 | Normalized entropy in [0, 1] for all valid probability vectors | unit | `pytest backend/tests/test_explain_math.py::test_entropy_range -x` | ❌ Wave 1 |
| DEPTH-07 | Badge fires when `top1−top2 < threshold` OR `norm_entropy > threshold` | unit | `pytest frontend ... UncertaintyBadge` | ❌ Wave 3 |
| D-37 (Brier) | multiclass_brier_score range [0, 2]; one-hot perfect = 0 | unit | `pytest backend/tests/test_explain_math.py::test_brier_perfect_and_uniform -x` | ❌ Wave 1 |
| D-40 (lineage) | `verify_svm_lineage` returns False when calibration_method missing | unit | `pytest backend/tests/test_lineage.py::test_lineage_refuses_pre_phase9_svm -x` | ❌ Wave 1 |

### Sampling Rate

- **Per task commit:** `pytest backend/tests/test_explain_math.py -x` (math tests are cheap; <2s)
- **Per wave merge:** `pytest backend/ scripts/` AND `cd frontend && npm test` (full backend + frontend suites)
- **Phase gate:** Full backend + frontend suites green before `/gsd-verify-work` runs

### Wave 0 Gaps

- [ ] `backend/tests/test_explain_math.py` — covers DEPTH-01 / 04 / 05 / 06 / 07 + D-37 + multiclass-Brier helper
- [ ] `backend/tests/test_explain_endpoint.py` — covers DEPTH-03 happy path + 410 + 503
- [ ] `backend/tests/test_lineage.py` — covers D-40 lineage extension
- [ ] `frontend/src/components/sidebar/__tests__/TopNList.test.tsx` — covers DEPTH-02
- [ ] `frontend/src/components/sidebar/__tests__/UncertaintyBadge.test.tsx` — covers DEPTH-07 frontend
- [ ] Test fixture: pre-computed `feature_vec` for a known training book (so explain tests are deterministic without re-running the pipeline). Suggest: dump one vector to `backend/tests/fixtures/feature_vec_sample.npy` in Wave 1 precompute.
- [ ] Framework install: NONE — pytest + vitest already in stack.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | App is public, no auth |
| V3 Session Management | no | Stateless API |
| V4 Access Control | partial | `/explain/{job_id}` SHOULD verify the job_id was created in this session — but v1 doesn't enforce this for /classify either; not a regression. Acceptable: any client knowing a job_id can request its explanation (within the 5-min window). |
| V5 Input Validation | yes | Pydantic `extra='forbid'` on all response models; job_id validated as UUID format (Phase 9 should add this — `/classify/{uuid:UUID}/explain` route parameter) |
| V6 Cryptography | yes | `hashlib.sha256` for cache keys (BUG-05 pattern); never roll custom hashing |

### Known Threat Patterns for Phase 9 stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Job-ID enumeration attack (guess UUIDs to harvest explanations) | Information Disclosure | UUID4 has 122 bits of entropy; 5-min TTL caps the attack window. Acceptable; same as v1 /classify. |
| Redis key collision / poisoning | Tampering | All keys namespace-prefixed (`feature_vec:`, `explain:`); SHA-256 hash within key prevents collision |
| Stale model serving (calibration_method drift) | Integrity | D-40 lineage refuse-to-load; explain cache `model_hash` rotation |
| Resource exhaustion via repeated /explain calls | DoS | Explain cache 1-h TTL prevents re-compute; per-call ~200 ms compute budget bounds load |
| XSS via driving-words rendering | Tampering | Frontend uses React text rendering, NOT `dangerouslySetInnerHTML` (T-3-01 already established in `ClassificationResult.tsx:9`) — extend pattern to all Phase 9 components |

## Sources

### Primary (HIGH confidence)

- v1/v2 codebase — every file path cited above was read and verified in this session:
  - `backend/api/app.py:11-28` (lifespan pattern)
  - `backend/cache/lineage.py:134-167` (verify_svm_lineage)
  - `backend/pipeline/features.py:116` (feature vector concatenation order)
  - `backend/pipeline/classify.py:10-42` (current predict_genre signature)
  - `backend/worker/jobs.py:127-155` (Step 5/6 boundary — D-47 insertion point)
  - `backend/api/routes/classify.py:25-49` (existing /classify route)
  - `backend/api/models.py:32-54` (Pydantic `extra='forbid'` pattern)
  - `data/models/svm_pipeline.joblib.lineage.json` (current lineage fields)
  - `scripts/06_validate.py:99-104` (in/out-of-comparison subset logic), `:461-463` (slice indices), `:647` (hold-out ID list)
  - `frontend/src/components/sidebar/ClassificationResult.tsx:14-62` (mount point)
  - `frontend/src/hooks/useClassify.ts:41-44` (existing apiFetch pattern)
  - `frontend/src/stores/uploadStore.ts:10-58` (ClassificationResult interface)
  - `frontend/src/components/explanation/PipelineExplanation.tsx:11-18` (STEPS array)
  - `frontend/src/components/explanation/steps/Step6Classification.tsx` (tone reference)
  - `.gitattributes` (LFS coverage gap)
  - `.planning/research/v2/VALIDATION_PROTOCOL.md:54-75` (pinned hold-out IDs)
  - `config/params.yaml:18-29` (frozen hyperparameters)
- scikit-learn 1.6.1 — verified APIs in this session:
  - `brier_score_loss` is binary-only (ValueError on multiclass)
  - `log_loss` supports multiclass `y_proba`
  - `CalibrationDisplay` is exported from `sklearn.calibration`
- v2 research artifacts (locked, treated as canon):
  - `.planning/research/ARCHITECTURE.md` §4, §5b, §10, §11
  - `.planning/research/PITFALLS.md` §7, §8, §9
  - `.planning/research/FEATURES.md` §3a, §3b
  - `.planning/research/STACK.md` §"Supporting Libraries"
  - `.planning/research/SUMMARY.md` §"Phase 9: Classification Depth", §"Gaps to Address"

### Secondary (MEDIUM confidence)

- [scikit-learn calibration guide](https://scikit-learn.org/stable/modules/calibration.html) — multiclass Brier definition + reliability-diagram patterns
- [scikit-learn SVM Scores and Probabilities](https://scikit-learn.org/stable/modules/svm.html#scores-and-probabilities) — predict vs predict_proba disagreement warning
- [sklearn CalibrationDisplay docs](https://scikit-learn.org/stable/modules/generated/sklearn.calibration.CalibrationDisplay.html) — `from_predictions` API
- Niculescu-Mizil & Caruana (2005) "Predicting Good Probabilities With Supervised Learning" — multiclass Brier definition standard

### Tertiary (LOW confidence)

- (None — all critical findings verified directly via codebase or sklearn 1.6.1 in this session)

## Metadata

**Confidence breakdown:**

- **Q1 (calibration protocol):** HIGH — sklearn 1.6 brier_score_loss binary-only verified empirically this session; multiclass Brier formula is textbook standard; hold-out IDs verified pinned.
- **Q2 (centroid math, invariant preservation):** HIGH — invariant argument is a clean logical move; formula matches FEATURES.md §3b template.
- **Q3 (zero-ablation sign rule):** HIGH — math is deterministic; rule is implementable; cross-check test is straightforward.
- **Q4 (entropy thresholds):** MEDIUM — defaults reasonable but final tuning requires Wave-1 empirical check. Plan includes the re-confirmation step.
- **Q5 (React Query 410 pattern):** HIGH — standard `useMutation` pattern; only assumption is `apiFetch.status` surfacing.
- **Q6 (lifespan loading):** HIGH — discovered the gap (API process currently loads no models) and prescribed the fix.
- **Q7 (precompute_explain integration):** HIGH — pattern is uniform across precompute family; LFS gap surfaced.
- **Q8 (lineage cache invalidation):** HIGH — extension is mechanical; graceful fallback rule defended.
- **Q9 (feature_vec Redis serialization):** HIGH — float64 verified in pipeline; standard numpy serialization.
- **Q10 (disclosure copy):** HIGH — tone reference verified; correct dialog file path discovered.

**Research date:** 2026-05-27
**Valid until:** 2026-06-27 (30 days — Phase 9 sits in a stable v2 backbone; only sklearn version churn or a corpus change would invalidate)

## RESEARCH COMPLETE
