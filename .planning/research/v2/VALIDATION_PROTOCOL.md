# Validation Protocol — v2.0 Research Output

> Phase 7 research deliverable for RES-02.
> **Companion document:** `CORPUS_SOURCING.md` (RES-01 + RES-03).
> **Reading audience:** Phase 8 (Corpus Expansion) executes this protocol verbatim during retrain validation.

**Reality check (consistent with CORPUS_SOURCING.md):** v1 is the **100-book corpus, not 15-book** (10 genres × 10 books, as of commit `db7b1f8`, 2026-04-13), not the stale "3 genres × 5 books" wording in REQUIREMENTS.md / PROJECT.md. The hold-out subset pinned below is drawn from this 100-book universe.

## 1. Overview

This protocol pins the validation methodology Phase 8 follows when measuring v2 vs v1. The protocol delivers:

- A **v1-frozen hold-out test set** (specific gutenberg_ids) — `§ 3` and `§ 4`
- A **v1 baseline** macro-F1 number computed in Phase 7 — `§ 5`
- The **GroupKFold-by-author** cross-validation specification — `§ 6`
- The **headline metric and reporting panel** Phase 8 must produce — `§ 7`
- The **per-author held-out smoke test** with the tight pass criterion that's the anti-leakage guard — `§ 8`
- The **three-numbers reporting pattern** (v1-on-hold-out / v2-on-hold-out / v2 LOOCV) — `§ 9`
- The **Phase 8 entry checklist** (D-20) — `§ 10`

Every methodological choice traces to a pitfall in `.planning/research/PITFALLS.md`:

| Choice | Source pitfall |
|--------|----------------|
| v1-frozen hold-out test set | PITFALLS §4 (comparing v2 to v1 without held-out test is meaningless) |
| GroupKFold(groups=author) | PITFALLS §5 (author overlap leakage) |
| Macro-F1 as headline (D-14) | PITFALLS §6 (class imbalance accuracy inflation) |
| Per-author held-out smoke test | PITFALLS §5 (author leakage final guard) |
| Permutation null hypothesis test | PITFALLS §4 (statistical-significance discipline) |
| Three-numbers reporting | PITFALLS §4 (apples-to-apples comparability) |

## 2. Hyperparameters held fixed for the comparison

Per 07-CONTEXT.md domain block: choosing α / K / window in the same phase as corpus expansion would confound the v1-vs-v2 comparison per PITFALLS §4. v1 hyperparameters (`config/params.yaml`) are held fixed for Phase 8's v2 retrain:

| Parameter | Value | Source |
|-----------|-------|--------|
| `word2vec.window` | 15 | `config/params.yaml::word2vec.window` |
| `features.k_clusters` | 200 | `config/params.yaml::features.k_clusters` |
| `features.alpha` | 0.7 | `config/params.yaml::features.alpha` |
| `validation.svm_C` | 10 | `config/params.yaml::validation.svm_C` |
| `validation.svm_kernel` | rbf | `config/params.yaml::validation.svm_kernel` |
| `validation.svm_class_weight` | balanced | `config/params.yaml::validation.svm_class_weight` |
| `validation.permutation_n` | 1000 | `config/params.yaml::validation.permutation_n` |

Hyperparameter sweeps (if Phase 8 wants them) happen in a **separate** retrain phase after the corpus-only comparison lands.

## 3. Test set: v1-frozen 20% hold-out

Per D-11 + D-12, the hold-out is selected by the rule "each test book's author has ≥1 other book by the same author in training" (stratified 2 per genre, 20 books total ≈ 20% of the trainable 99-book v1 corpus; one v1 entry is `unknown`-labelled and excluded from training/hold-out).

The pinned hold-out gutenberg_ids (from `v1_baseline_results.json::holdout_gutenberg_ids`):

```
78
83
84
103
105
120
121
144
169
175
244
284
863
1184
1257
1528
2565
3285
50133
70652
```

These 20 IDs are the v1-frozen evaluation set. Phase 8 uses this same list (intersected with the v2 corpus per `corpus_candidates.yaml` — books that survive the v2 restructure are in-comparison; books dropped during restructure are noted as "out-of-comparison" with rationale in the Phase 8 validation report).

## 4. Hold-out selection rule (D-12)

> Each hold-out book's author has ≥1 OTHER book by the same author remaining in the training set. Models the realistic upload scenario.

Stratification: 2 books per genre × 10 genres = 20 books.

Within each genre, books are scored by `(count_of_other_books_by_same_author_in_full_corpus, gutenberg_id_ascending)`. Top-2 picked per genre. Deterministic with `random_state=42`. Implementation in `scripts/phase7_v1_baseline.py::select_holdout()`.

**Pure-unseen-author testing is handled by §8 (per-author smoke test), not by the hold-out.** The hold-out reflects the realistic "user uploads another Austen" workflow; the smoke test stress-tests the "user uploads a brand-new author" edge case.

**One-genre caveat (gothic):** Plan 04 found gothic had only 1 D-12-eligible book in the v1 corpus (all 10 v1 gothic authors appear exactly once — 0 same-author training neighbours). The second gothic hold-out slot was filled by the next-best-by-author-count book within gothic, making the gothic hold-out slightly weaker on the D-12 signal. Flagged for Phase 8 corpus restructure — the v2 candidate list has 28 distinct gothic authors with multi-work coverage, so this caveat does not recur in v2.

## 5. v1 baseline (computed Phase 7)

The numeric values quoted here are sourced from `.planning/research/v2/v1_baseline_results.json` — Phase 8 re-runs `scripts/phase7_v1_baseline.py` before training the v2 SVM to verify the file is byte-identical (deterministic reproducibility check).

### Headline

| Metric | v1 value | Notes |
|--------|----------|-------|
| Macro-F1 | `0.3235` | Headline per D-14. v2 (Phase 8) must beat this. |
| Accuracy | `0.3500` | v1 continuity metric. |
| Hold-out size | `20` | 20% of trainable v1 corpus. |

v1 macro-F1 = **0.3235** on the 20-book hold-out subset of the current 100-book corpus.

### Hold-out gutenberg_ids

The 20 pinned gutenberg_ids (sorted ascending): 78, 83, 84, 103, 105, 120, 121, 144, 169, 175, 244, 284, 863, 1184, 1257, 1528, 2565, 3285, 50133, 70652. See §3 for the verbatim list.

### Per-genre F1

| Genre | v1 hold-out F1 |
|-------|----------------|
| romance     | `0.6667` |
| mystery     | `1.0000` |
| western     | `0.2353` |
| fantasy     | `0.6667` |
| scifi       | `0.0000` |
| horror      | `0.0000` |
| historical  | `0.0000` |
| literary    | `0.0000` |
| adventure   | `0.6667` |
| gothic      | `0.0000` |

### Confusion matrix

Rows = true label, columns = predicted label. Both axes use the same genre order.

|              | romance | mystery | western | fantasy | scifi | horror | historical | literary | adventure | gothic |
|--------------|--------:|--------:|--------:|--------:|------:|-------:|-----------:|---------:|----------:|-------:|
| romance      |       1 |       0 |       1 |       0 |     0 |      0 |          0 |        0 |         0 |      0 |
| mystery      |       0 |       2 |       0 |       0 |     0 |      0 |          0 |        0 |         0 |      0 |
| western      |       0 |       0 |       2 |       0 |     0 |      0 |          0 |        0 |         0 |      0 |
| fantasy      |       0 |       0 |       1 |       1 |     0 |      0 |          0 |        0 |         0 |      0 |
| scifi        |       0 |       0 |       2 |       0 |     0 |      0 |          0 |        0 |         0 |      0 |
| horror       |       0 |       0 |       2 |       0 |     0 |      0 |          0 |        0 |         0 |      0 |
| historical   |       0 |       0 |       2 |       0 |     0 |      0 |          0 |        0 |         0 |      0 |
| literary     |       0 |       0 |       2 |       0 |     0 |      0 |          0 |        0 |         0 |      0 |
| adventure    |       0 |       0 |       1 |       0 |     0 |      0 |          0 |        0 |         1 |      0 |
| gothic       |       0 |       0 |       2 |       0 |     0 |      0 |          0 |        0 |         0 |      0 |

The diagonal sum is 7 correct out of 20 (accuracy = 0.35). The dominant failure mode is a strong `western` over-prediction: 13 of the 20 hold-out books were classified as `western`, including all of `scifi`, `horror`, `historical`, `literary`, and `gothic`. This is consistent with the v1 corpus's western imbalance (Zane Grey has 6 books in `western`, making it the largest single-author genre block) and the v1 SVM's `class_weight='balanced'` only partially compensating in a 99-row training set.

### Per-book predictions

| gutenberg_id | true genre | predicted genre | correct |
|-------------:|------------|-----------------|:-------:|
|           78 | adventure  | adventure       |   yes   |
|           83 | scifi      | western         |    no   |
|           84 | gothic     | western         |    no   |
|          103 | scifi      | western         |    no   |
|          105 | romance    | western         |    no   |
|          120 | adventure  | western         |    no   |
|          121 | romance    | romance         |   yes   |
|          144 | literary   | western         |    no   |
|          169 | fantasy    | western         |    no   |
|          175 | gothic     | western         |    no   |
|          244 | mystery    | mystery         |   yes   |
|          284 | literary   | western         |    no   |
|          863 | mystery    | mystery         |   yes   |
|         1184 | historical | western         |    no   |
|         1257 | historical | western         |    no   |
|         1528 | western    | western         |   yes   |
|         2565 | fantasy    | fantasy         |   yes   |
|         3285 | western    | western         |   yes   |
|        50133 | horror     | western         |    no   |
|        70652 | horror     | western         |    no   |

### Lineage audit trail

| Field | Value | Source |
|-------|-------|--------|
| alpha | 0.7 | `config/params.yaml::features.alpha` |
| k_clusters | 200 | `config/params.yaml::features.k_clusters` |
| window | 15 | `config/params.yaml::word2vec.window` |
| seed | 42 | `scripts/phase7_v1_baseline.py::SEED` |
| corpus_hash | `208db2bc132b481ed68c22920b967287cd0031e195d437867f74be652adbd57a` | `data/models/svm_pipeline.joblib.lineage.json::corpus_hash` |
| w2v_model_sha256 | `2bf13ce0aa9e9a4fde86ca880f29cbcb5dc36fc77bf4f3142ad536c6aa3ec47b` | `data/models/svm_pipeline.joblib.lineage.json::w2v_model_sha256` |

### Caveat (D-13)

The v1 SVM was trained on these same 97 books (LOOCV was used during selection, but every book was in training at some point). The v1 macro-F1 reported here is therefore in-sample-leaning and will look unrealistically good. The v2 SVM (Phase 8) will be trained on the v2-restructured corpus per `corpus_candidates.yaml`, which has different books and different per-genre composition, so v2's score on this same hold-out is genuine out-of-sample.

This **biases the comparison in v1's favour**. Despite the handicap, v2 must beat v1's macro-F1 here to demonstrate genuine improvement.

Note that on THIS run the bias did not save v1: a macro-F1 of `0.3235` with 13/20 predictions collapsing onto `western` indicates the v1 model is poorly calibrated on the held-out subset even when given the in-sample advantage. Read this two ways for Phase 8 planning:

1. The bar is genuinely low — Phase 8 should be able to clear it with a better-balanced corpus, even before topological feature improvements.
2. The D-12 hold-out structure is harsher than v1 LOOCV (which reports 54.6% accuracy in `results/validation_report.txt`) because the held-out books happen to be the highest-author-density picks per genre, which biases against any model that learned author-shaped clusters rather than genre-shaped ones. Phase 8's `GroupKFold(groups=author)` validation directly attacks this failure mode.

If the v1 baseline turns out poor enough that Phase 8 trivially beats it (e.g., v1 = 0.32, v2 = 0.55), interpret cautiously — the bar may have been too low. Conversely if v1 = 0.85 and v2 = 0.65, that would be a real regression, not an apples-to-oranges artefact.

### Reproducibility

```bash
python scripts/phase7_v1_baseline.py --out .planning/research/v2/v1_baseline_results.json
```

Re-running this command on the same v1 artifacts produces byte-identical JSON (verified in Phase 7 Plan 04: two consecutive runs produced byte-identical output under `diff`). Phase 8 verifies this as part of CEXP-04 before training the v2 SVM.

## 6. Cross-validation: GroupKFold by author (D-16)

Per PITFALLS §5, unrestricted LOOCV on the v2 corpus would learn author style instead of genre. v2 replaces LOOCV with `GroupKFold(groups=author)`:

```python
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.feature_selection import VarianceThreshold
from sklearn.svm import SVC

K = min(distinct_authors_per_genre)   # expected: K = 8 per D-08
gkf = GroupKFold(n_splits=K)

# groups[i] = author of book i — must align row-by-row with X and y
# Implementation note: pull author from corpus/books.yaml into a parallel array
# at feature-load time in 06_validate.py.

pipe = Pipeline([
    ('scaler', StandardScaler()),
    ('vt', VarianceThreshold(threshold=1e-4)),
    ('svm', SVC(kernel='rbf', C=10, gamma='scale', class_weight='balanced')),
])

scores = []
for train_idx, test_idx in gkf.split(X, y, groups=groups):
    pipe.fit(X[train_idx], y[train_idx])
    scores.append(pipe.score(X[test_idx], y[test_idx]))

mean_score = np.mean(scores)
std_score = np.std(scores)
```

Phase 8 modifies `scripts/06_validate.py` to add this routine (the existing LOOCV stays as a context number per the three-numbers pattern in §9; it is no longer the headline).

**K selection:** `K = min(distinct_authors_per_genre)`. Per D-08, every v2 genre has ≥8 distinct authors. K should typically be 8. If any genre has more than 8, K still floors at the minimum.

**Edge case — non-uniform author count per genre.** `GroupKFold` does not require each group to appear the same number of times; it partitions groups (authors) into K folds while keeping each author entirely within one fold. With K = 8 and genres ranging from 11 distinct authors (fantasy) to 28 (gothic) in the v2 candidate list, every genre's authors are distributed across the 8 folds. The largest genre (gothic, 28 authors) contributes 3-4 authors per fold; the smallest (fantasy, 11 authors) contributes 1-2 per fold. Imbalance is acceptable — what matters is that no author straddles a fold boundary.

**Why GroupKFold and not StratifiedGroupKFold?** `StratifiedGroupKFold` (sklearn ≥1.0) preserves class-balance within each fold but is **incompatible** with our constraint that author-stratification dominates: in a small corpus with one very prolific author per genre (Zane Grey 17 western books in candidate list), the stratification objective would force Grey across multiple folds (splitting his books) to keep western balanced — exactly the author-leakage we are preventing. `GroupKFold` keeps Grey on one side or the other, accepting fold-level genre imbalance as a deliberate trade.

**Reproducibility:** `GroupKFold` is deterministic given (X, y, groups) — no `random_state` parameter. Two consecutive runs produce identical fold assignments. Phase 8's `06_validate.py` does NOT need to seed for GroupKFold reproducibility (separate from the SVM's own `random_state=42`).

## 7. Full reporting panel (D-15)

Every Phase 8 retrain run produces this exact panel:

| Section | Metric | Source |
|---------|--------|--------|
| Headline | **Macro-F1 (headline per D-14)** | unweighted mean of per-genre F1; D-14 |
| Headline | Per-genre F1 | `sklearn.metrics.f1_score(average=None)` |
| Headline | Overall accuracy | v1 continuity metric |
| Headline | Confusion matrix | `sklearn.metrics.confusion_matrix` |
| Statistical | Permutation null | `n_permutations=1000`, `p<0.05` threshold (matches v1 defaults preserved per §2) |
| Cross-validation | GroupKFold mean ± std | §6 |
| Anti-leakage | Per-author held-out gap | §8 |

All numbers reported in a structured markdown file (proposed: `results/v2_validation_report.md`, written by Phase 8's modified `06_validate.py`).

## 8. Per-author held-out smoke test — ≤10pp gap pass criterion (D-17)

**This is the only remaining anti-leakage guardrail given D-07 (no per-author cap).** The threshold is deliberately tight: a 10 percentage points gap is the pass bar.

**Algorithm:**

```python
# For every author A in the v2 corpus with >=2 books:
#   1. Remove all of A's books from training
#   2. Train SVM on the remaining corpus
#   3. Predict on A's held-out books
#   4. Compute A's accuracy

per_author_results = {}
for author in multi_book_authors:   # authors with >=2 books in the v2 corpus
    train_mask = ~(authors == author)
    pipe.fit(X[train_mask], y[train_mask])
    y_pred = pipe.predict(X[~train_mask])
    per_author_results[author] = accuracy_score(y[~train_mask], y_pred)

# Pass criterion: |LOOCV_acc - mean(per_author_results.values())| <= 10 percentage points
# OR worst-case |LOOCV_acc - min(per_author_results.values())| <= 10 percentage points
# Pick which one. RECOMMENDATION: report BOTH; require the mean-gap version to pass;
# surface the worst-case as a "watch this" signal.
```

**Implementation site:** new function `per_author_held_out_smoke_test()` in `scripts/06_validate.py`.

**Pass criterion:** mean-author-gap ≤10pp (≤ 10 percentage points). Anything wider flags author-style memorisation as the dominant signal.

**Failure mode:** if the smoke test fails, Phase 8 does NOT ship the v2 model. Either:
- Restructure the corpus to reduce author concentration (drop the dominant author's surplus works), OR
- Document the leakage publicly and treat the v2 number as upper-bound rather than expected

**Aggregated worst-case gap surfaced in every report** alongside the headline macro-F1.

## 9. Three-numbers reporting pattern (D-15)

Every v2 retrain run reports three numbers, in this order. This is the **three-numbers** pattern:

1. **v1 SVM on hold-out — `0.3235` macro-F1** (from `v1_baseline_results.json`; this Phase 7 number is the comparison anchor).
2. **v2 SVM on hold-out — headline v2 result** (Phase 8 computes; must exceed (1) per CEXP-03).
3. **v2 LOOCV on full v2 training set — context only** (overall-accuracy-style number for v1 continuity; never the headline).

Improvement claims reference (2) vs (1). Number (3) is for context and confidence interval, never standalone.

## 10. Phase 8 entry checklist

> Phase 8 executes this checklist top-to-bottom. Each item is a deterministic action with no further methodology decisions required.

1. **Read CORPUS_SOURCING.md and this document end-to-end** (entry gate).
2. **Re-run `scripts/phase7_v1_baseline.py --out .planning/research/v2/v1_baseline_results.json`** — verify byte-identical output (deterministic reproducibility check). If output differs from committed file, halt and investigate before any v2 work.
3. **Complete CEXP-01 / CEXP-02 per CORPUS_SOURCING.md §8 checklist** — build the v2 corpus, retrain Word2Vec + features + SVM end-to-end.
4. **Modify `scripts/06_validate.py`** to add:
   - `evaluate_on_holdout(X, y, holdout_indices)` returning macro-F1, per-genre F1, accuracy, confusion matrix
   - `cross_validate_grouped(X, y, groups=author)` using `GroupKFold(n_splits=K)` per §6
   - `per_author_held_out_smoke_test(X, y, authors)` per §8 algorithm
   - Permutation null hypothesis test with `n_permutations=1000`, `p<0.05` (preserves v1 default)
5. **Run validation:** execute the modified `06_validate.py` against the v2 corpus.
6. **Report three numbers** per §9. Number (1) is fixed at `0.3235` from `v1_baseline_results.json`. Compute numbers (2) and (3).
7. **Apply CEXP-03 pass criterion:** v2 macro-F1 (number 2) strictly greater than v1 macro-F1 (number 1 = 0.3235) AND permutation p < 0.05.
8. **Apply per-author smoke test** per §8. Pass criterion: mean-author-gap ≤10pp. Worst-case gap reported as supplemental signal.
9. **Apply CEXP-04 pass criterion:** GroupKFold-by-author mean macro-F1 within 15pp of v2 macro-F1 on hold-out. (CEXP-04 is the published v2 stability number; smoke test §8 is the tighter anti-leakage guard.)
10. **Write `results/v2_validation_report.md`** containing the full reporting panel (§7) — Phase 8 final artifact for CEXP-03 + CEXP-04.

## 11. Failure-mode dictionary (quick reference)

For Phase 8 — if any of these metrics regress, here's the diagnostic table:

| Symptom | Likely cause | Diagnostic action |
|---------|--------------|-------------------|
| v2 macro-F1 ≤ v1 macro-F1 on hold-out | Corpus restructure removed signal, or v2 mis-labelled | Compare per-genre F1 row-by-row vs §5 v1 table; identify which genres regressed |
| Permutation p ≥ 0.05 | Signal indistinguishable from chance — model is essentially guessing | Inspect confusion matrix; check class_weight; verify features.alpha not collapsed |
| GroupKFold gap > 15pp vs hold-out | Author-style memorisation present | Tighten per-author smoke test; consider dropping prolific-author surplus |
| Per-author smoke test gap > 10pp | Same as above, more severe | Phase 8 MUST NOT ship; restructure corpus before retry |
| One genre's per-genre F1 = 0 | Single-class collapse (no positives predicted) | Verify v2 corpus has that genre, check label encoding parity |
| LOOCV >> hold-out macro-F1 | LOOCV is leaky (in-sample) — expected behaviour, surface in three-numbers report | No action — this is the reason LOOCV is context-only per §9 |

## Document provenance

- **Phase:** 07 — Corpus Sourcing Research Spike
- **Plans:** assembled by Plan 05 from Plan 04 v1 baseline computation
- **Sibling artifacts:** `CORPUS_SOURCING.md` (RES-01 + RES-03), `v1_baseline_results.json` (Plan 04 numeric source of truth), `scripts/phase7_v1_baseline.py` (Plan 04 evaluator)
- **PITFALLS traceability:** §4, §5, §6, §11 — see §1 traceability table
- **Last updated:** 2026-05-25
