---
phase: 02-api-layer-and-job-queue
plan: 03
subsystem: pipeline
tags: [pipeline-refactor, cancel-event, precompute, svm, persistence-images, cache]

# Dependency graph
requires:
  - phase: 01-pipeline-validation-spike
    provides: "Pipeline scripts (tokenization, embeddings, homology, features, validation) and config/params.yaml"
  - phase: 02-api-layer-and-job-queue
    plan: 01
    provides: "FastAPI app skeleton, upload validation, shared pipeline types"
provides:
  - "Importable pipeline functions in backend/pipeline/ with cancel_event support"
  - "build_weighted_distance_matrix, compute_book_homology in backend/pipeline/homology.py"
  - "diagram_to_birth_persistence, build_persistence_imager, build_feature_vector in backend/pipeline/features.py"
  - "project_into_space in backend/pipeline/embed.py"
  - "predict_genre in backend/pipeline/classify.py"
  - "precompute_all() in backend/pipeline/precompute.py"
  - "Content-addressed disk cache in backend/cache/store.py"
  - "GET /corpus/books/{id}/results endpoint"
affects: [02-02-PLAN, 03-frontend]

# Tech tracking
tech-stack:
  added: [ripser, persim, scipy]
  patterns: [cancel-event-cooperative-cancellation, content-addressed-disk-cache, persistence-image-transform]

key-files:
  created:
    - backend/pipeline/embed.py
    - backend/pipeline/homology.py
    - backend/pipeline/features.py
    - backend/pipeline/classify.py
    - backend/pipeline/precompute.py
    - backend/cache/__init__.py
    - backend/cache/store.py
    - backend/tests/test_pipeline.py
    - backend/tests/test_precompute.py
    - backend/tests/test_classify.py
  modified:
    - backend/api/routes/corpus.py

key-decisions:
  - "Created backend/cache/store.py early (Rule 3: blocking dep for precompute.py) -- Plan 02 will consume it as-is"
  - "Used ripser directly instead of giotto-tda for homology (simpler API, no subprocess timeout needed)"
  - "SVM pipeline uses VarianceThreshold instead of PCA (matches precompute.py plan spec)"

patterns-established:
  - "All pipeline functions accept cancel_event: asyncio.Event = None and check before heavy computation"
  - "Pipeline functions accept data as arguments, return results (no file I/O)"
  - "Content-addressed cache: cache_key(step_name, params) -> sha256 hex digest"

requirements-completed: [CORPUS-02, CLASS-02]

# Metrics
duration: 5min
completed: 2026-04-12
---

# Phase 2 Plan 03: Classification Pipeline Modules Summary

**Importable pipeline functions refactored from Phase 1 scripts with cancel_event cooperative cancellation, precompute script for build-time SVM training and disk caching, and corpus results endpoint**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-12T09:10:20Z
- **Completed:** 2026-04-12T09:15:10Z
- **Tasks:** 2 of 3 (Task 3 is human-verify checkpoint)
- **Files created:** 10
- **Files modified:** 1

## Accomplishments
- All four pipeline modules (embed, homology, features, classify) created with cancel_event support and matching Phase 1 math
- Precompute script with concrete executable code (Blocker 3 fix) that loads Phase 1 models, builds features, trains SVM, caches results
- Content-addressed disk cache module created early (Rule 3 blocking dependency)
- GET /corpus/books/{id}/results endpoint serving pre-computed data from disk cache
- 34 backend tests passing (17 from Plan 01 + 17 new)

## Task Commits

1. **Task 1: Pipeline modules with cancel_event** - `0631633` (feat)
2. **Task 2: Precompute script and corpus results endpoint** - `7ff62d2` (feat)

## Files Created/Modified
- `backend/pipeline/embed.py` - project_into_space: Word2Vec projection with OOV counting
- `backend/pipeline/homology.py` - build_weighted_distance_matrix, compute_book_homology via ripser
- `backend/pipeline/features.py` - diagram_to_birth_persistence, build_persistence_imager, build_feature_vector
- `backend/pipeline/classify.py` - predict_genre with SVM decision function confidence
- `backend/pipeline/precompute.py` - precompute_all() build-time script
- `backend/cache/__init__.py` - Package init
- `backend/cache/store.py` - cache_key, cache_get, cache_put, cache_exists
- `backend/api/routes/corpus.py` - Added GET /corpus/books/{id}/results
- `backend/tests/test_pipeline.py` - 12 unit tests for pipeline math and cancel_event
- `backend/tests/test_precompute.py` - 3 unit tests for precompute importability
- `backend/tests/test_classify.py` - 2 unit tests for corpus results 404 and classify job_id

## Decisions Made
- Created backend/cache/store.py as part of this plan (originally in Plan 02) because precompute.py imports it -- Rule 3 blocking dependency resolution
- Used ripser directly for homology computation instead of giotto-tda (simpler API, matches scripts/04 math without subprocess timeout wrapper)
- SVM pipeline spec uses VarianceThreshold per plan (not PCA as in Phase 1 scripts/06)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created backend/cache/store.py early**
- **Found during:** Task 2 (precompute.py imports backend.cache.store)
- **Issue:** backend/cache/store.py is specified in Plan 02 but precompute.py (this plan) imports it
- **Fix:** Created cache store module matching Plan 02's spec exactly so Plan 02 can consume it as-is
- **Files created:** backend/cache/__init__.py, backend/cache/store.py
- **Commit:** 0631633 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Cache store created early; Plan 02 should use it as-is rather than recreating.

## Known Stubs

None -- all pipeline functions contain concrete implementations matching Phase 1 script math.

## Self-Check: PASSED
