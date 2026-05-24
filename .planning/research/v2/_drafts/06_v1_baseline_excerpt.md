# v1 baseline excerpt (Phase 7 draft fragment — to be embedded in VALIDATION_PROTOCOL.md)

> Source for VALIDATION_PROTOCOL.md §"v1 baseline (computed Phase 7)". Decision IDs implemented: D-13.
> Generated from `.planning/research/v2/v1_baseline_results.json` (output of `scripts/phase7_v1_baseline.py`).

## v1 baseline (computed Phase 7)

**Headline:** v1 macro-F1 = `0.3235` on the 20-book hold-out subset of the current 100-book corpus.

**Hold-out size:** `20` books (target 20 books ≈ 20% of 97 non-unknown corpus per D-11; the 100-book manifest contains 3 unknown-label entries which are excluded from training and from the hold-out — see `data/features/labels.npy`).

**Hold-out selection rule (D-12):** Each hold-out book's author has ≥1 other book by the same author remaining in the training set. Stratified 2 books per genre. Ties broken by ascending `gutenberg_id`. Deterministic with `random_state=42`. One genre (`gothic`) had only 1 D-12-eligible book in the 100-book v1 corpus; the second slot was filled by the next-best-by-author-count book (still gothic-genre), making the gothic hold-out slightly weaker on the D-12 signal — flagged for Phase 8 corpus restructure.

**Hold-out gutenberg_ids (pinned for v2 evaluation):**

```
78, 83, 84, 103, 105, 120, 121, 144, 169, 175, 244, 284, 863, 1184, 1257, 1528, 2565, 3285, 50133, 70652
```

These 20 IDs are the v1-frozen evaluation set. Phase 8 evaluates the v2 SVM on these same IDs (where they survive the v2 corpus restructure per `corpus_candidates.yaml`) to produce the apples-to-apples v1-vs-v2 macro-F1 comparison.

**Headline metrics:**

| Metric | v1 value | Notes |
|--------|----------|-------|
| Macro-F1 | `0.3235` | Headline per D-14. v2 (Phase 8) must beat this. |
| Accuracy | `0.3500` | v1 continuity metric. |
| Hold-out size | `20` | 20% of trainable v1 corpus. |

**Per-genre F1:**

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

**Confusion matrix:**

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

**Per-book predictions:**

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

**v1 lineage (audit trail):**

| Field | Value | Source |
|-------|-------|--------|
| alpha | 0.7 | `config/params.yaml::features.alpha` |
| k_clusters | 200 | `config/params.yaml::features.k_clusters` |
| window | 15 | `config/params.yaml::word2vec.window` |
| seed | 42 | `scripts/phase7_v1_baseline.py::SEED` |
| corpus_hash | `208db2bc132b481ed68c22920b967287cd0031e195d437867f74be652adbd57a` | `data/models/svm_pipeline.joblib.lineage.json::corpus_hash` |
| w2v_model_sha256 | `2bf13ce0aa9e9a4fde86ca880f29cbcb5dc36fc77bf4f3142ad536c6aa3ec47b` | `data/models/svm_pipeline.joblib.lineage.json::w2v_model_sha256` |

**Caveat (D-13):**

The v1 SVM was trained on these same 97 books (LOOCV was used during selection, but every book was in training at some point). The v1 macro-F1 reported here is therefore in-sample-leaning and will look unrealistically good. The v2 SVM (Phase 8) will be trained on the v2-restructured corpus per `corpus_candidates.yaml`, which has different books and different per-genre composition, so v2's score on this same hold-out is genuine out-of-sample.

This **biases the comparison in v1's favour**. Despite the handicap, v2 must beat v1's macro-F1 here to demonstrate genuine improvement.

Note that on THIS run the bias did not save v1: a macro-F1 of `0.3235` with 13/20 predictions collapsing onto `western` indicates the v1 model is poorly calibrated on the held-out subset even when given the in-sample advantage. Read this two ways for Phase 8 planning:

1. The bar is genuinely low — Phase 8 should be able to clear it with a better-balanced corpus, even before topological feature improvements.
2. The D-12 hold-out structure is harsher than v1 LOOCV (which reports 54.6% accuracy in `results/validation_report.txt`) because the held-out books happen to be the highest-author-density picks per genre, which biases against any model that learned author-shaped clusters rather than genre-shaped ones. Phase 8's `GroupKFold(groups=author)` validation directly attacks this failure mode.

If the v1 baseline turns out poor enough that Phase 8 trivially beats it (e.g., v1 = 0.32, v2 = 0.55), interpret cautiously — the bar may have been too low. Conversely if v1 = 0.85 and v2 = 0.65, that would be a real regression, not an apples-to-oranges artefact.

**Reproducibility:**

```bash
python scripts/phase7_v1_baseline.py --out .planning/research/v2/v1_baseline_results.json
```

Re-running this command on the same v1 artifacts produces byte-identical JSON (verified in Phase 7 Plan 04: two consecutive runs produced byte-identical output under `diff`). Phase 8 verifies this as part of CEXP-04 before training the v2 SVM.
