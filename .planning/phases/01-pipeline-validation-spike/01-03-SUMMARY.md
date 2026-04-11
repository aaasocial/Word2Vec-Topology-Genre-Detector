---
phase: "01"
plan: "03"
subsystem: homology-pipeline
tags: [persistent-homology, feature-engineering, svm, validation, benchmark]
dependency_graph:
  requires: [01-02]
  provides: [homology-scripts, feature-vectors, validation-pipeline]
  affects: [phase-2-web-app]
tech_stack:
  added: [giotto-tda, persim]
  patterns: [weighted-vietoris-rips, persistence-images, loocv, permutation-test, subprocess-timeout]
key_files:
  created:
    - scripts/04_compute_homology.py
    - scripts/05_build_features.py
    - scripts/06_validate.py
    - scripts/benchmark.py
    - tests/test_homology.py
    - tests/test_features.py
    - tests/test_validation.py
    - tests/test_benchmark.py
  modified:
    - .planning/phases/01-pipeline-validation-spike/01-03-PLAN.md
decisions:
  - Windows-compatible subprocess timeout via multiprocessing.Process.join(timeout=N) instead of signal.alarm (POSIX-only)
  - PCA inside sklearn Pipeline to prevent data leakage across LOOCV folds
  - Persist-imager fitted on all books together so image grid is consistent across the corpus
  - alpha=0.5 blending of topology (H0+H1 persistence images) and cluster distribution features
metrics:
  duration: "~10 min"
  completed: "2026-04-12"
  tasks_completed: 5
  files_created: 8
  files_modified: 1
---

# Phase 1 Plan 03: Persistent Homology, Classification, and Validation Summary

**One-liner:** Weighted Vietoris-Rips homology pipeline with persistence images + TF-IDF cluster distribution features, SVM LOOCV + permutation test yielding GO/NO-GO verdict.

## What Was Built

Four scripts completing the Phase 1 CLI pipeline:

1. **`scripts/04_compute_homology.py`** — Takes per-book word vectors and TF-IDF weights from `data/features/`, constructs custom weighted distance matrix `d(i,j)/(w_i+w_j)`, runs giotto-tda VietorisRipsPersistence in a subprocess with configurable timeout and retry logic (reduces `max_words` by `retry_step` down to `min_words`). Saves `diagrams_{gid}.npy` per book.

2. **`scripts/05_build_features.py`** — Loads all persistence diagrams, fits PersistenceImager on the full corpus (H0 and H1 separately), transforms each diagram into a flattened persistence image, L2-normalizes each, computes TF-IDF-weighted K-means cluster distribution, normalizes, then concatenates as `alpha * [h0_norm | h1_norm] + (1-alpha) * cluster_norm`. Saves `feature_matrix.npy`, `labels.npy`, `book_order.json`.

3. **`scripts/06_validate.py`** — Loads feature matrix, runs sklearn Pipeline(StandardScaler → PCA → SVC) with LOOCV via `cross_val_predict`, computes per-genre and overall accuracy, runs `permutation_test_score`, writes `results/validation_report.txt` with GO/NO-GO verdict, appends run to `results/run_history.log`.

4. **`scripts/benchmark.py`** — Times VietorisRipsPersistence on a range of word counts using the largest available book, reports safe `max_words` cap (under 10s), saves `results/benchmark.json`.

Test suite: 4 test files, 14 new tests (27 total pass).

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| subprocess timeout via `multiprocessing.Process` | `signal.alarm` is POSIX-only; Windows requires process-based timeout |
| PCA inside Pipeline | Prevents scaler/PCA from seeing test-fold data during LOOCV — critical for honest accuracy estimate |
| PersistenceImager fitted on all books jointly | Ensures consistent birth/persistence grid across all images; individual fitting would produce incomparable features |
| Empty diagram handled as zero image | Mathematically sound: no topology detected → zero feature contribution; avoids crashes |
| alpha=0.5 default (configurable via params.yaml) | Equal weight to structural topology and semantic clustering; tunable for phase 2 experiments |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — scripts produce deterministic outputs when real corpus data is available. No hardcoded placeholders.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. All I/O is local filesystem.

## Self-Check: PASSED

Files created:
- scripts/04_compute_homology.py: FOUND
- scripts/05_build_features.py: FOUND
- scripts/06_validate.py: FOUND
- scripts/benchmark.py: FOUND
- tests/test_homology.py: FOUND
- tests/test_features.py: FOUND
- tests/test_validation.py: FOUND
- tests/test_benchmark.py: FOUND

Commits:
- d8ad0ae: test(01-03): add failing test stubs
- 51e2cab: feat(01-03): persistent homology, feature engineering, and validation pipeline

Tests: 27 passed, 1 deselected (slow/integration marker)
