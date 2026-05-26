# v2.0-data — 154-book verified-clean corpus + retrained pipeline

**Tag:** `v2.0-data`
**Phase:** 08-corpus-expansion (Word2Vec Genre Analyser v2.0 milestone)
**Date:** 2026-05-26
**Pipeline lineage:** corpus_hash `3f4fe9400b023f0847bc6975da4f3793fdd3b4db4dfc44979d43cc9b75a869d9` · w2v_model_sha256 `cd81f9e69cb2d12799c62b5d06a03870e511ff35b044d5301d78f6f75cde5b1a`

## Headline

The v2 SVM retrained on the **154-book verified-clean corpus** (Phase 8.1 drop-strategy output of the original 240-book Proposal-A target — see Limitations below) achieves **macro-F1 = 0.7367** on the v1-frozen 20-book hold-out, versus the v1 baseline of **0.3235** — a **+41 percentage-point improvement**, statistically significant at permutation **p = 0.0010**.

- **CEXP-03 verdict:** PARTIAL-VALIDATED (D-31 disclaimer path — see Limitations)
- **CEXP-04 verdict:** BLOCKED (GroupKFold-by-author gap exceeds threshold — see Limitations)
- **Per-author smoke test:** ANTI-LEAKAGE GUARDRAIL FAILED (mean-gap 36.96pp >> 10pp threshold)

## Limitations / Disclaimer (D-31)

> **Read this before deploying or interpreting v2 predictions.**

The per-author held-out smoke test (`VALIDATION_PROTOCOL.md §8`) failed. When each of the 34 multi-book authors in the v2 corpus was held out one at a time and the SVM trained on the remaining books, **15 of those 34 authors scored 0.00% accuracy on their own held-out books**. The mean per-author accuracy was 0.3191 — barely above the 12.5% chance baseline for an 8-genre problem.

| Metric | Value | Threshold | Pass? |
|--------|------:|----------:|:-----:|
| Mean per-author gap (LOOCV vs held-out-author) | **36.96 pp** | ≤ 10.00 pp | NO |
| Worst-case per-author gap | 68.87 pp | — | — |
| GroupKFold-by-author mean macro-F1 | 0.2865 ± 0.0331 | — | — |
| Gap: hold-out (0.7367) vs GroupKFold (0.2865) | **45.03 pp** | ≤ 15.00 pp | NO |

**Affected authors (zero accuracy when held out):**
Alexandre Dumas, Ann Radcliffe, Charles Dickens, Edgar Rice Burroughs, Ernest Hemingway, H. P. Lovecraft, H. Rider Haggard, Henry James, James Joyce, Joseph Conrad, Leo Tolstoy, Sinclair Lewis, Thomas Hardy, Walter Scott, William Morris.

**Authors who held up well (≥ 0.75 accuracy):**
Agatha Christie, Anthony Trollope, Arthur Conan Doyle, Dorothy L. Sayers, Virginia Woolf, Elizabeth Gaskell.

**What this means for users:**

- The v2 SVM learned **per-author features more strongly than per-genre features** at the multi-book-author boundary. This is the known `PITFALLS.md §5` failure mode.
- **Predictions on books by authors not in the training set may be unreliable** — the v2 macro-F1 of 0.7367 should be treated as an **upper bound**, not as the expected generalization performance to unseen authors.
- The 0.7367 hold-out number is honest for the published 20-book test set (Phase 7 / `VALIDATION_PROTOCOL.md §3` pinned IDs), 17 of which survived into the v2 corpus.
- **Recommendation:** If your use case primarily involves classifying books by authors who are NOT in the training corpus, **the existing v1 model may be more appropriate** until the v2.1 author-leakage follow-up lands. v1 has its own weaknesses (macro-F1 = 0.3235) but does not exhibit the same author-overfitting pathology because of its more diverse author distribution per genre.

**Why ship anyway?** Per Phase 8 decision D-31, the user explicitly authorized the "ship with explicit public disclaimer" path (the second of two options offered in `VALIDATION_PROTOCOL.md §8`) over the restructure-and-retry alternative. The v2 model beats the v1 baseline on the published comparison test set with high statistical confidence (p = 0.0010), and the disclaimer ships as part of the Release artifact (`v2_validation_report.md` is attached below) so consumers can read it at the source.

## Three-numbers headline (per VALIDATION_PROTOCOL §9)

| # | Number | Value |
|---|--------|------:|
| 1 | v1 SVM on hold-out | **0.3235** |
| 2 | v2 SVM on hold-out | **0.7367** |
| 3 | v2 LOOCV on full v2 corpus (context only) | **0.6887** |

## Per-genre F1 (v2 hold-out)

> **Merged-key rule:** For merged-key v2 genres (`gothic_horror` = v1 gothic + v1 horror; `speculative` = v1 scifi + v1 fantasy), the v1 F1 column shows the area-weighted mean of constituent v1 keys' F1; the delta column reads `n/a — schema mismatch`.

| Genre | v1 F1 | v2 F1 | Delta |
|-------|------:|------:|------:|
| adventure | 0.6667 | 0.6667 | +0.0000 |
| gothic_horror | 0.0000 (area-weighted) | 0.5000 | n/a — schema mismatch |
| historical | 0.0000 | 1.0000 | +1.0000 |
| literary | 0.0000 | 1.0000 | +1.0000 |
| mystery | 1.0000 | 1.0000 | +0.0000 |
| romance | 0.6667 | 1.0000 | +0.3333 |
| speculative | 0.3333 (area-weighted) | 0.7273 | n/a — schema mismatch |
| western | 0.2353 | 0.0000 | -0.2353 |

## Corpus composition

- **Books:** 154 (verified-clean post Phase-8.1 drop strategy; 151 survive the `min_unique_words=3000` filter at feature-build time)
- **Genres:** 8 (`adventure`, `gothic_horror`, `historical`, `literary`, `mystery`, `romance`, `speculative`, `western`)
- **Distinct authors:** 66 total
- **Per-genre distribution:**

| Genre | Books (feature-matrix) | Distinct authors |
|-------|-----------------------:|-----------------:|
| adventure | 20 | 9 |
| gothic_horror | 15 | 12 |
| historical | 15 | 7 |
| literary | 20 | 12 |
| mystery | 19 | 12 |
| romance | 22 | 7 |
| speculative | 24 | 9 |
| western | 16 | 6 |
| **total** | **151** | **66** |

The original Phase-8 plan targeted a 240-book Proposal-A corpus (30 books × 8 genres). Phase 8.1's drop strategy removed ~86 SERIOUS rows that failed integrity audits (wrong gid bindings against Gutenberg's authoritative metadata). The 154-book result is the verified-clean subset that survived. A v2.1 follow-up should investigate restoring the 86 dropped entries via authoritative author bibliographies + gutendex re-source.

## Lineage

| Field | Value |
|-------|-------|
| corpus_hash | `3f4fe9400b023f0847bc6975da4f3793fdd3b4db4dfc44979d43cc9b75a869d9` |
| w2v_model_sha256 | `cd81f9e69cb2d12799c62b5d06a03870e511ff35b044d5301d78f6f75cde5b1a` |
| Hyperparameters | window=15 · k=200 · α=0.7 · C=10 · kernel=rbf · class_weight=balanced · permutation_n=1000 |
| Hyperparameter policy | Frozen at v1 values per `VALIDATION_PROTOCOL.md §2` (no co-tuning with corpus expansion) |
| SVM random_state | 42 |
| Permutation random_state | 42 |
| GroupKFold | deterministic (no seed; floored to K=5 per planner discretion — corpus has only 6 distinct authors in western) |

## Assets

**D-33-mandatory (6):**

- `svm_pipeline.joblib` — retrained kernel-SVM pipeline (RBF, C=10, class_weight=balanced)
- `svm_pipeline.joblib.lineage.json` — refuse-to-load lineage guard sidecar (corpus_hash + w2v_model_sha256 + hyperparameters)
- `kmeans_w15_k200.pkl` — k-means cluster centroids (k=200, window=15)
- `word2vec_w15.model` — Word2Vec model (skip-gram, window=15)
- `persistence_imager.joblib` — persistence-image vectorizer
- `corpus_metadata.json` — per-book `top_10_tfidf_words` sidecar (BUG-03 endpoint backing)

**Claude's-discretion auditability (1):**

- `v2_validation_report.md` — full validation evidence (D-31 disclaimer included; per `VALIDATION_PROTOCOL.md §8`)

**Companion files** (required for the model bundle to load; gensim splits Word2Vec across 3 files at save-time, and TF-IDF is a peer of the W2V model used by the feature pipeline):

- `word2vec_w15.model.syn1neg.npy` — Word2Vec negative-sampling weights
- `word2vec_w15.model.wv.vectors.npy` — Word2Vec word vectors
- `tfidf_vectorizer_w15.joblib` — TF-IDF vectorizer (window=15; loaded alongside W2V for feature extraction)

## References

- **Validation report (attached):** `v2_validation_report.md`
- **Corpus integrity rebuild audit:** [`.planning/phases/08.1-corpus-integrity-rebuild-fix-141-240-wrong-gid-bindings-in-c/08.1-01-SUMMARY.md`](https://github.com/aaasocial/Word2Vec-Topology-Genre-Detector/blob/master/.planning/phases/08.1-corpus-integrity-rebuild-fix-141-240-wrong-gid-bindings-in-c/08.1-01-SUMMARY.md)
- **Wave-3 validation summary:** [`.planning/phases/08-corpus-expansion/08-03-SUMMARY.md`](https://github.com/aaasocial/Word2Vec-Topology-Genre-Detector/blob/master/.planning/phases/08-corpus-expansion/08-03-SUMMARY.md)
- **Validation protocol:** [`.planning/research/v2/VALIDATION_PROTOCOL.md`](https://github.com/aaasocial/Word2Vec-Topology-Genre-Detector/blob/master/.planning/research/v2/VALIDATION_PROTOCOL.md)
- **Corpus sourcing rationale:** [`.planning/research/v2/CORPUS_SOURCING.md`](https://github.com/aaasocial/Word2Vec-Topology-Genre-Detector/blob/master/.planning/research/v2/CORPUS_SOURCING.md)

## Deployment

Railway pulls these assets at container boot via the `RELEASE_URL` environment variable (Phase 5 deployment pattern). To switch the live app from v1 to v2:

1. Update Railway `RELEASE_URL` env var to point at the `v2.0-data` tag (e.g., `https://github.com/aaasocial/Word2Vec-Topology-Genre-Detector/releases/download/v2.0-data/`).
2. Restart the Railway container so it re-pulls the assets.
3. Verify the running app reports the new corpus via `/api/corpus/genres` (should list the 8 v2 keys including `gothic_horror` and `speculative`; the frontend will render the two new keys with the fallback gray color until Phase 10's visual relabel sweep).

If your deployment is using `RELEASE_URL=latest`, no env-var change is needed — the next restart picks up `v2.0-data` automatically once it becomes the latest tag.

## Known follow-ups

- **v2.1 author-leakage mitigation** — either tighten per-author book caps (e.g., max 3 books per author per genre) or fine-tune per held-out author. Targets the 45pp GroupKFold gap and the 15 zero-accuracy held-out authors.
- **v2.1 corpus restoration** — investigate the 86 SERIOUS rows dropped by Phase 8.1's integrity audit; re-source via authoritative bibliographies + gutendex.
- **Phase 10 visual relabel** — `gothic_horror` and `speculative` will render with fallback gray in the frontend until `frontend/src/constants/genres.ts::GENRE_COLORS` is updated.
