---
phase: 1
slug: pipeline-validation-spike
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.x |
| **Config file** | `tests/conftest.py` — Wave 0 installs |
| **Quick run command** | `pytest tests/ -x -q` |
| **Full suite command** | `pytest tests/ -v` |
| **Estimated runtime** | ~60-120 seconds (homology tests use small synthetic fixtures) |

---

## Sampling Rate

- **After every task commit:** Run `pytest tests/ -x -q`
- **After every plan wave:** Run `pytest tests/ -v`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| corpus-download | 01-01 | 1 | CORPUS-01, PIPE-01 | — | N/A | integration | `pytest tests/test_corpus.py::test_download_returns_text` | ❌ W0 | ⬜ pending |
| corpus-preprocess | 01-01 | 1 | PIPE-02 | — | N/A | unit | `pytest tests/test_preprocess.py` | ❌ W0 | ⬜ pending |
| min-word-filter | 01-01 | 1 | CORPUS-03, PIPE-02 | — | N/A | unit | `pytest tests/test_preprocess.py::test_min_word_filter` | ❌ W0 | ⬜ pending |
| word2vec-train | 01-02 | 1 | PIPE-03 | — | N/A | integration | `pytest tests/test_embeddings.py::test_word2vec_vocabulary` | ❌ W0 | ⬜ pending |
| tfidf-compute | 01-02 | 1 | PIPE-04 | — | N/A | unit | `pytest tests/test_embeddings.py::test_tfidf_no_genre_labels` | ❌ W0 | ⬜ pending |
| weighted-rips | 01-03 | 1 | HOM-01, VALID-02 | — | N/A | unit | `pytest tests/test_homology.py::test_weighted_distance_matrix` | ❌ W0 | ⬜ pending |
| persistence-image | 01-03 | 1 | HOM-03 | — | N/A | unit | `pytest tests/test_homology.py::test_persistence_image_shape` | ❌ W0 | ⬜ pending |
| cluster-distribution | 01-03 | 1 | HOM-04, HOM-05 | — | N/A | unit | `pytest tests/test_features.py::test_cluster_distribution_sums_to_one` | ❌ W0 | ⬜ pending |
| feature-concat | 01-03 | 1 | HOM-06 | — | N/A | unit | `pytest tests/test_features.py::test_feature_vector_normalization` | ❌ W0 | ⬜ pending |
| svm-loocv | 01-03 | 1 | HOM-07, VALID-01 | — | N/A | integration | `pytest tests/test_validation.py::test_svm_loocv_runs` | ❌ W0 | ⬜ pending |
| permutation-test | 01-03 | 1 | VALID-01 | — | N/A | integration | `pytest tests/test_validation.py::test_permutation_test_output` | ❌ W0 | ⬜ pending |
| benchmark | 01-03 | 1 | VALID-03 | — | N/A | integration | `pytest tests/test_benchmark.py::test_homology_within_time_cap` | ❌ W0 | ⬜ pending |
| timeout-retry | 01-03 | 1 | CORPUS-03 | — | N/A | unit | `pytest tests/test_homology.py::test_timeout_reduces_max_words` | ❌ W0 | ⬜ pending |
| report-output | 01-03 | 1 | VALID-01 | — | N/A | unit | `pytest tests/test_validation.py::test_report_written_to_file` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/conftest.py` — Shared fixtures: synthetic 5-book mini-corpus (100 synthetic "words" per genre), pre-built Word2Vec model fixture (tiny, 10D), pre-built persistence diagram fixture
- [ ] `tests/test_corpus.py` — Stubs for corpus download and preprocessing tests
- [ ] `tests/test_preprocess.py` — Stubs for tokenization, stopword removal, min-word filter
- [ ] `tests/test_embeddings.py` — Stubs for Word2Vec training and TF-IDF computation
- [ ] `tests/test_homology.py` — Stubs for weighted distance matrix, persistence image construction, timeout-retry
- [ ] `tests/test_features.py` — Stubs for cluster distribution and feature concatenation
- [ ] `tests/test_validation.py` — Stubs for SVM+LOOCV, permutation test, report output
- [ ] `tests/test_benchmark.py` — Stubs for homology runtime benchmark

*Note: Tests use synthetic small corpora — real Gutenberg downloads are NOT required for the test suite to run.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GO/NO-GO verdict printed correctly | VALID-01 | Requires actual corpus + full pipeline run | Run `python scripts/06_validate.py`, inspect final output for GO/NO-GO line and p-value |
| Persistence diagrams visibly differ across genres | VALID-02 | Visual inspection required | Run pipeline, open results/, compare persistence diagrams for Horror vs Sci-Fi vs Romance |
| Verbose timing output at each step | D-06 | Human judgment on readability | Run any script, confirm each sub-step prints timing in `"... done (N.Ns)"` format |
| results/run_history.log appends across runs | D-08 | File state across runs | Run validation twice, confirm history log has two entries |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
