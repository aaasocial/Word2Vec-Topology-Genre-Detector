# v2 Validation Report — Phase 8 / CEXP-03 + CEXP-04

**Generated:** 2026-05-26T05:09:38Z
**Phase:** 08-corpus-expansion / Wave 3
**Reference:** .planning/research/v2/VALIDATION_PROTOCOL.md
**v1 baseline source:** .planning/research/v2/v1_baseline_results.json

## Status

**Per-author smoke test (D-31 trigger):** ANTI-LEAKAGE GUARDRAIL FAILED (see §"Anti-Leakage Disclaimer" below)

**CEXP-03:** PARTIAL-VALIDATED  (macro-F1 > 0.3235 AND p<0.05)
**CEXP-04:** FAIL  (GroupKFold gap <=15pp vs hold-out)

## Anti-Leakage Disclaimer

**Per VALIDATION_PROTOCOL.md §8 (second option) and Phase 8 decision D-31:**

The per-author held-out smoke test produced a mean-author-gap of 36.96pp (threshold is <=10pp). This indicates that the v2 SVM relies more on per-author style than on per-genre signal at the held-out boundary. The v2 macro-F1 reported below should be treated as an **upper bound**, not as the expected generalization performance.

Affected authors (per-author accuracy < mean = 0.3191):
- Alexandre Dumas: 0.00%
- Ann Radcliffe: 0.00%
- Charles Dickens: 0.00%
- Edgar Rice Burroughs: 0.00%
- Ernest Hemingway: 0.00%

**Ship decision:** the v2 model still publishes to v2.0-data because: (a) it beats the v1 baseline on the published comparison test set, (b) the alternative (restructure-and-retry) was weighed against this disclosure path per D-31 and the user authorized the disclaimer route.

## Three-numbers headline (VALIDATION_PROTOCOL §9)

| # | Number | Value | Notes |
|---|--------|-------|-------|
| 1 | v1 SVM on hold-out | **0.3235** | Pinned anchor from v1_baseline_results.json. Phase 7 / D-13 caveat: in-sample-leaning. |
| 2 | v2 SVM on hold-out | **0.7367** | Headline result. Compared to (1) for CEXP-03. |
| 3 | v2 LOOCV on full v2 | **0.6887** | Context only; never the headline. |

**CEXP-03 verdict:** v2 macro-F1 (0.7367) > v1 macro-F1 (0.3235). Permutation p=0.0010. Pass criteria: STRICTLY > AND p<0.05. -> **PARTIAL-VALIDATED**.

## Hold-out evaluation detail (VALIDATION_PROTOCOL §3 + §5)

**Test set:** 20 pinned gutenberg_ids from VALIDATION_PROTOCOL.md §3:
`[78, 83, 84, 103, 105, 120, 121, 144, 169, 175, 244, 284, 863, 1184, 1257, 1528, 2565, 3285, 50133, 70652]`

**In-comparison subset (present in v2 corpus):** 17 of 20. List: `[78, 83, 103, 105, 120, 121, 144, 169, 175, 244, 284, 863, 1184, 1257, 2565, 50133, 70652]`
**Out-of-comparison (absent from v2):** 3 of 20. List: `[84, 1528, 3285]`. Rationale: see `.planning/research/v2/v1_to_v2_migration.md` for per-id verdicts; the Phase 8.1 drop strategy removed ~86 SERIOUS rows from the original 240-book corpus.

| Metric | Value |
|--------|-------|
| Macro-F1 | 0.7367 |
| Accuracy | 0.8235 |
| Permutation p-value | 0.0010 |
| Significant at 0.05? | yes |

### Per-genre F1

> **Merged-key rule (planner-locked, see Task 3.2):** For merged-key v2 genres (gothic_horror = v1 gothic + v1 horror; speculative = v1 scifi + v1 fantasy), the v1 F1 column shows the area-weighted mean of constituent v1 keys' F1 (weighted by their hold-out support count from the 20-ID §3 pinned set); the delta column reads `n/a — schema mismatch`. Unchanged-genre rows compute delta normally as `v2 F1 - v1 F1`.

| Genre | v1 F1 | v2 F1 | Delta |
|-------|------:|------:|------:|
| adventure | 0.6667 | 0.6667 | +0.0000 |
| gothic_horror | 0.0000 (area-weighted mean of v1 gothic 0.0000 + horror 0.0000) | 0.5000 | n/a — schema mismatch |
| historical | 0.0000 | 1.0000 | +1.0000 |
| literary | 0.0000 | 1.0000 | +1.0000 |
| mystery | 1.0000 | 1.0000 | +0.0000 |
| romance | 0.6667 | 1.0000 | +0.3333 |
| speculative | 0.3333 (area-weighted mean of v1 scifi 0.0000 + fantasy 0.6667) | 0.7273 | n/a — schema mismatch |
| western | 0.2353 | 0.0000 | -0.2353 |

### Confusion matrix

(rows = true v2 genre, cols = predicted v2 genre)

| true \ pred | adventure | gothic_horror | historical | literary | mystery | romance | speculative | western |
|---|---|---|---|---|---|---|---|---|
| adventure | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| gothic_horror | 0 | 1 | 0 | 0 | 0 | 0 | 2 | 0 |
| historical | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 |
| literary | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| mystery | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 |
| romance | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 |
| speculative | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 0 |
| western | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

### Per-book predictions

| gutenberg_id | true v2 genre | predicted v2 genre | correct |
|-------------:|---------------|--------------------|:-------:|
| 78 | adventure | speculative | no |
| 83 | speculative | speculative | yes |
| 103 | speculative | speculative | yes |
| 105 | romance | romance | yes |
| 120 | adventure | adventure | yes |
| 121 | romance | romance | yes |
| 144 | literary | literary | yes |
| 169 | speculative | speculative | yes |
| 175 | gothic_horror | speculative | no |
| 244 | mystery | mystery | yes |
| 284 | literary | literary | yes |
| 863 | mystery | mystery | yes |
| 1184 | historical | historical | yes |
| 1257 | historical | historical | yes |
| 2565 | speculative | speculative | yes |
| 50133 | gothic_horror | gothic_horror | yes |
| 70652 | gothic_horror | speculative | no |

## GroupKFold by author (VALIDATION_PROTOCOL §6 + CEXP-04)

| Metric | Value |
|--------|-------|
| n_splits used | 5 |
| Mean macro-F1 | 0.2865 |
| Std macro-F1 | 0.0331 |
| Fold scores | [0.2909, 0.272, 0.2343, 0.3347, 0.3004] |
| Gap vs hold-out (CEXP-04 input) | 45.03pp |
| CEXP-04 verdict (gap <=15pp?) | FAIL |

## Per-author held-out smoke test (VALIDATION_PROTOCOL §8 + D-17)

| Metric | Value |
|--------|-------|
| LOOCV accuracy | 0.6887 |
| Mean per-author accuracy | 0.3191 |
| Min per-author accuracy | 0.0000 |
| Mean-gap (pp) | 36.96 |
| Worst-case gap (pp) | 68.87 |
| Pass threshold | 10.00 pp |
| Mean-gap passes? | no |
| N authors tested | 34 |

### Per-author breakdown

| Author | Accuracy held-out |
|--------|------------------:|
| Alexandre Dumas | 0.0000 |
| Ann Radcliffe | 0.0000 |
| Charles Dickens | 0.0000 |
| Edgar Rice Burroughs | 0.0000 |
| Ernest Hemingway | 0.0000 |
| H. P. Lovecraft | 0.0000 |
| H. Rider Haggard | 0.0000 |
| Henry James | 0.0000 |
| James Joyce | 0.0000 |
| Joseph Conrad | 0.0000 |
| Leo Tolstoy | 0.0000 |
| Sinclair Lewis | 0.0000 |
| Thomas Hardy | 0.0000 |
| Walter Scott | 0.0000 |
| William Morris | 0.0000 |
| H. G. Wells | 0.1667 |
| Jack London | 0.1667 |
| Jules Verne | 0.1667 |
| D. H. Lawrence | 0.3333 |
| Jane Austen | 0.3333 |
| Robert Louis Stevenson | 0.3333 |
| Baroness Orczy | 0.5000 |
| Clarence E. Mulford | 0.5000 |
| Edith Wharton | 0.5000 |
| G. K. Chesterton | 0.5000 |
| Gaston Leroux | 0.5000 |
| George Eliot | 0.5000 |
| Zane Grey | 0.6000 |
| Elizabeth Gaskell | 0.7500 |
| Agatha Christie | 1.0000 |
| Anthony Trollope | 1.0000 |
| Arthur Conan Doyle | 1.0000 |
| Dorothy L. Sayers | 1.0000 |
| Virginia Woolf | 1.0000 |

## Methodology + lineage

- **Hyperparameters (frozen — VALIDATION_PROTOCOL §2):** window=15, k=200, alpha=0.7, C=10.0, kernel=rbf, class_weight=balanced, permutation_n=1000
- **Pipeline lineage:**
  - corpus_hash = `3f4fe9400b023f0847bc6975da4f3793fdd3b4db4dfc44979d43cc9b75a869d9`
  - w2v_model_sha256 = `cd81f9e69cb2d12799c62b5d06a03870e511ff35b044d5301d78f6f75cde5b1a`
  - (from `data/models/svm_pipeline.joblib.lineage.json`)
- **Random seeds:** SVM random_state=42, permutation random_state=42, GroupKFold (deterministic — no seed)
- **Total v2 corpus:** 151 books (post Phase-8.1 drop strategy; original Phase-8 plan assumed 240; actual = post-cleanup verified-clean set)
- **Hold-out evaluation:** trained on (v2 \ holdout_ids) = 134 books; evaluated on the holdout_ids in-comparison subset
- **LOOCV / GroupKFold:** trained per-fold on the full v2 corpus minus the held-out fold
- **Smoke test:** trained per-fold on (v2 minus all books by author A); evaluated on A's books

## Reproducibility

```bash
python scripts/06_validate.py --report-out results/v2_validation_report.md --n-permutations 1000 --cv-n-splits 5
```

Re-running this command on the same v2 artifacts (corpus_hash, w2v_model_sha256 unchanged) produces byte-identical metric values.
