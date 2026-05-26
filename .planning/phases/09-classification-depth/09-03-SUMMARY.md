---
phase: 09-classification-depth
plan: 03
subsystem: ml-classification
tags: [explain-endpoint, top-n, zero-ablation, nearest-neighbours, driving-words, entropy-badge, redis-cache, calibration, fastapi]

# Dependency graph
requires:
  - phase: 09-classification-depth
    provides: 09-01 calibrated SVM with predict_proba sum-to-1 + operative entropy thresholds (gap 0.2801, norm_entropy 0.7738) in v2_calibration_report.md
  - phase: 09-classification-depth
    provides: 09-02 app.state.svm_pipeline + w2v_model + explain_artifacts + nn_index loaded by lifespan; verify_svm_lineage gates app.state.calibration_available
provides:
  - backend/pipeline/explain.py with 7 exported helpers (math + cache_key) -- SINGLE source of truth for operative entropy thresholds
  - backend/pipeline/classify.py::predict_top_n returning sorted (genre, prob) list summing to 1 (legacy predict_genre kept as top-1 wrapper)
  - backend/worker/jobs.py D-47 feature_vec Redis write (5-min TTL) + D-41/D-43 SSE result payload extension (top_n / entropy / top1_top2_gap / badge_fires)
  - backend/api/routes/explain.py POST /api/classify/{job_id}/explain endpoint with 410/503/404 fallbacks + 1-h cache (D-48)
  - 8 new Pydantic models in backend/api/models.py with extra='forbid' (TopNPrediction, NearestTrainingBook, TrackContribution(s), DrivingWord, UncertaintyMetrics, ExplainResponse, ExtendedClassifyResult)
  - 24 new explain math tests (zero-ablation batching, NN order, driving-words sort, OOV skip, cache key rotation, top-N sum-to-1)
  - 8 integration tests for /explain endpoint (happy + 410 + 3x503 + 404 + cache-hit + cache-miss TTL)
affects:
  - 09-04 (frontend TopNList + UncertaintyBadge -- consumes new SSE fields top_n / entropy / top1_top2_gap / badge_fires)
  - 09-05 (frontend ClassificationExplain panel -- consumes POST /explain ExplainResponse shape)
  - 09-06 (walkthrough disclaimer -- references 410 re-upload prompt copy)

# Tech tracking
tech-stack:
  added:
    - fastapi.testclient.TestClient pattern with module-scoped fixture snapshotting app.state.redis (so per-test MagicMock swaps don't leak into lifespan-exit close())
    - hashlib.sha256 stream-free key derivation on the in-memory feature_vec (no file I/O on the hot path)
  patterns:
    - "Single source of truth for operative thresholds (ENTROPY_BADGE_DEFAULT_TOP1_TOP2_GAP/_NORMALIZED_ENTROPY in backend.pipeline.explain) -- worker SSE + /explain endpoint both import from this module; literals NOT duplicated"
    - "Batched zero-ablation: one predict_proba call on (3, n_features) instead of three (1, n_features) calls -- measured 2.79x speedup, beats the Pitfall 2 1.5x estimate"
    - "Legacy thin-wrapper preservation: predict_genre stays as a top-1 alias for predict_top_n so back-compat callers (and tests) don't need churn"
    - "Defense-in-depth ordering on the explain endpoint: UUID format -> calibration -> artifacts -> Redis -> feature_vec key -> cache -> compute; cheap rejections short-circuit expensive checks"

key-files:
  created:
    - backend/pipeline/explain.py
    - backend/api/routes/explain.py
    - backend/tests/test_explain_endpoint.py
  modified:
    - backend/pipeline/classify.py
    - backend/api/models.py
    - backend/api/app.py
    - backend/worker/jobs.py
    - backend/tests/test_explain_math.py
    - backend/tests/test_pipeline.py
    - backend/tests/test_worker.py

key-decisions:
  - "Operative thresholds (0.2801 gap, 0.7738 norm_entropy from results/v2_calibration_report.md's `## Entropy threshold decision` block) are baked into backend/pipeline/explain.py as the SINGLE source of truth -- worker SSE result and /explain endpoint both call compute_uncertainty_metrics() with those defaults rather than re-declaring the numbers. Plan 09-01's Q4 tighten decision is honored without literal duplication."
  - "Driving-words endpoint surrogate: the worker does NOT publish per-upload (words, tfidf) to Redis (out of scope for Phase 9), so /explain derives surrogate driving words from the upload's vocab slab (feature_vec[400:600]). Top clusters by slab weight -> each cluster's representative word from artifacts['cluster_to_representative_words'] -> compute_driving_words tags each via per_genre_centroids cosine. This matches the D-46 cluster-centric semantics without needing a new Redis hand-off; honest-by-construction."
  - "Legacy predict_genre kept as a thin wrapper around predict_top_n[0] (D-37/D-38 contract): predict_proba + classes_ replaces the v1 predict + decision_function path, so existing tests + back-compat callers continue to work after rotating the SVM artifact."
  - "Test fixture restores app.state.redis on module teardown so per-test MagicMock swaps don't leak into lifespan-exit `await app.state.redis.close()` -- avoided a TypeError that the first test run surfaced."

patterns-established:
  - "Build-time .npz artifact (Plan 09-02) -> run-time app.state.* -> request handler reads via request.app.state.X -- explain endpoint extends this pattern without modifying the lifespan function 09-02 wrote (additive only)"
  - "Pydantic `extra='forbid'` is the contract enforcement boundary at the route entry point (validate inputs) AND exit point (model_dump the ExplainResponse before caching) -- catches schema drift at both ends"
  - "Cache namespace rotation via lineage: explain:{sha256(feature_vec)}:{w2v_model_sha256[:16]} -- a D-38 retrain rotates w2v_model_sha256 which rotates the namespace which guarantees old keys never hit (mitigates T-9-17)"
  - "Authentication-equivalent UUID4 validation before any Redis lookup -- protects against path-traversal probes (T-9-12) AND keeps the 410-vs-404 disclosure differential at acceptable levels (T-9-14)"

requirements-completed:
  - DEPTH-03
  - DEPTH-04
  - DEPTH-05
  - DEPTH-07

# Metrics
duration: 35min
completed: 2026-05-27
---

# Phase 9 Plan 03: Explain Spine -- math, worker hand-off, endpoint Summary

**backend explain spine landed: top-N + zero-ablation + nearest-books + driving-words + entropy badge math, worker SSE result extension (feature_vec Redis write at D-47 + top_n/entropy/top1_top2_gap/badge_fires in result), POST /api/classify/{job_id}/explain with 410/503/404 fallbacks + 1-h cache, 30 unit tests + 8 integration tests all green, measured cache-miss p50 = 15 ms / cache-hit p50 = 1 ms on the deployed v2 SVM.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-05-27T03:14:00Z (right after 09-02 metadata commit 5276323)
- **Completed:** 2026-05-27T03:49:00Z
- **Tasks:** 3 atomic + 1 metadata follow-up
- **Files modified:** 10 (3 created + 7 modified)
- **Total tests added:** 32 (24 explain-math + 8 endpoint integration)
- **Total tests touched (incl. fixed legacy contracts):** 35

## /explain endpoint latency (the measurement the plan requires)

Measured on the deployed v2 SVM via `TestClient`, sample feature_vec fixture, MagicMock Redis (so latency reflects compute, not Redis network):

| Path | Runs | p50 | p95 |
|------|-----:|----:|----:|
| Cache miss (full compute) | 5 | **15.1 ms** | 19.0 ms (excl. cold-start 1712 ms warm-up) |
| Cache hit (JSON decode + return) | 5 | **1.1 ms** | 1.5 ms |

The p95 ARCHITECTURE.md §5b target is 200 ms -- comfortable margin. The first cache-miss call includes sklearn's lazy `predict_proba` initialization (~1.7 s) which is a one-time per-process cost, not a per-request cost.

## Batched predict_proba speedup (Pitfall 2 check)

Per-call timing of `compute_track_contributions`-equivalent work on the same SVM:

| Strategy | Avg over 30 iter |
|----------|-----------------:|
| Three separate `predict_proba((1, n_features))` calls | 1.48 ms |
| One batched `predict_proba((3, n_features))` call | 0.53 ms |
| **Speedup** | **2.79x** |

Pitfall 2 estimated ~1.5x. Actual speedup is ~2.8x -- the batched path materialized as planned.

## Cache-hit rate observed during integration tests

The dedicated `test_explain_cache_hit_returns_cached_payload` test verifies the cache hit path returns the cached JSON verbatim AND that `redis.set` is NOT called on a hit (avoids redundant writes). `test_explain_cache_miss_writes_with_1h_ttl` verifies the cache miss path SETs with `ex=3600`. In the latency micro-benchmark above (5 runs each), every call to a unique feature_vec was a cache miss (15 ms) and every call to a repeated feature_vec was a hit (1 ms) -- 100% hit rate on the repeat path.

## Accomplishments

- **Task 1 -- math + Pydantic spine.** `backend/pipeline/explain.py` exports seven helpers: `multiclass_brier_score`, `normalized_entropy`, `compute_uncertainty_metrics`, `compute_track_contributions` (batched per Pitfall 2), `find_nearest_training_books`, `compute_driving_words` (sort: tfidf desc with alpha tie-break, OOV skipped), `explain_cache_key`. The operative thresholds `ENTROPY_BADGE_DEFAULT_TOP1_TOP2_GAP = 0.2801` and `ENTROPY_BADGE_DEFAULT_NORMALIZED_ENTROPY = 0.7738` are the SINGLE source of truth (callers import them, never re-declare). `backend/pipeline/classify.py::predict_top_n` returns the full ranked list using calibrated `predict_proba` + `classes_`; legacy `predict_genre` wraps `predict_top_n[0]` for back-compat. `backend/api/models.py` gains eight Pydantic models with `extra='forbid'` and length constraints (`nearest_training_books == 5`, `driving_words <= 15`).
- **Task 2 -- worker hand-off.** Between step 5 (features) and step 6 (classify), `backend/worker/jobs.py::classify_book` writes `feature_vec:{job_id}` as `np.float64.tobytes()` to Redis with `ex=300`. Step 6 now calls `predict_top_n` instead of `predict_genre`; the SSE result payload gains `top_n` (list of `{genre, probability}`), `entropy`, `top1_top2_gap`, `badge_fires`. Legacy keys (`predicted_genre`, `confidence`, `oov_word_count`, `total_words`, `processing_time_s`) preserved verbatim for Wave-3 frontend back-compat. Single source of truth for top-1: derived from `top_n[0]`, never from `svm.predict()` (Pitfall 1 avoided).
- **Task 3 -- /explain endpoint.** `backend/api/routes/explain.py` implements POST `/api/classify/{job_id}/explain` with the nine-step flow documented in the module docstring: UUID4 validation (T-9-12) -> calibration gate -> NN/artifacts gate (Pitfall 3) -> Redis gate -> feature_vec read (D-47, shape-validated against T-9-16) -> cache lookup (D-48) -> compute (track contributions, nearest books, surrogate driving words from vocab slab, uncertainty) -> Pydantic validation -> cache SET with `ex=3600`. Canonical 410 phrasing "Upload expired -- re-upload to see the explanation." preserved verbatim per D-49. `backend/api/app.py` mounts the new router additively without modifying the lifespan function 09-02 wrote.
- **8 integration tests landed.** Happy path, 410 on missing feature_vec, 503 on missing calibration / NN / Redis (three separate tests), 404 on non-UUID, cache hit short-circuits compute, cache miss writes ex=3600.
- **24 explain-math tests added.** Coverage spans pure-math (uncertainty range, badge fire/no-fire at operative thresholds, threshold override, cache key shape + rotation), mock-based zero-ablation (sum-to-100, valid directions, batched-call assertion via recording-mock, 50/50 fallback on zero total), mock-based NN (count + ordering + dict shape), and mock-based driving-words (sort, max_n cap, OOV skip). The 6 existing Wave-0 brier/entropy tests are preserved.
- **Threat model mitigations verified.** T-9-12 (UUID validation), T-9-16 (feature_vec shape validation), T-9-17 (lineage-rotated cache namespace) all implemented as planned. No new endpoints / file access / schema at trust boundaries beyond what the threat model already covered -- no Threat Flags section needed.

## Task Commits

Each task was committed atomically:

1. **Task 1: explain math helpers + Pydantic models + predict_top_n** -- `3bee4b7` (feat)
2. **Task 2: worker hand-off + SSE result extension** -- `4795ad5` (feat)
3. **Task 3: POST /classify/{job_id}/explain endpoint** -- `b859ab0` (feat)

**Plan metadata:** _(this commit)_

## Files Created/Modified

**Created:**
- `backend/pipeline/explain.py` -- seven exported math helpers + operative-threshold constants. Single source of truth for the entropy/badge thresholds.
- `backend/api/routes/explain.py` -- POST /api/classify/{job_id}/explain with the nine-step defense-in-depth flow.
- `backend/tests/test_explain_endpoint.py` -- 8 integration tests covering all error branches + cache hit + cache miss TTL.

**Modified:**
- `backend/pipeline/classify.py` -- replaced `predict_genre`'s `decision_function` flow with the calibrated `predict_top_n` (D-37/D-38). Legacy `predict_genre` retained as a thin top-1 wrapper.
- `backend/api/models.py` -- 8 new Pydantic models with `extra='forbid'` (TopNPrediction, NearestTrainingBook, TrackContribution, TrackContributions, DrivingWord, UncertaintyMetrics, ExplainResponse, ExtendedClassifyResult).
- `backend/api/app.py` -- imports + mounts `explain_router` via `api_router.include_router`. No lifespan changes.
- `backend/worker/jobs.py` -- D-47 feature_vec Redis write (`ex=300`); step 6 calls `predict_top_n`; SSE result payload gains `top_n / entropy / top1_top2_gap / badge_fires`.
- `backend/tests/test_explain_math.py` -- imports the math helpers from explain.py (Wave-0 inline definitions deleted); 24 new tests added.
- `backend/tests/test_pipeline.py` -- updated `test_predict_genre_returns_tuple` for the new `predict_proba` + `classes_` contract (Rule 1 fix: the test was asserting the old `decision_function` API).
- `backend/tests/test_worker.py` -- updated import-assertion test for the new `predict_top_n` + `compute_uncertainty_metrics` imports; added two new tests for D-47 Redis key shape + TTL and the SSE result Phase 9 additions.

## Decisions Made

- **Operative thresholds live in `backend/pipeline/explain.py` as module constants, not in a separate scripts/constants module.** Rationale: the worker SSE result and /explain endpoint both depend on these values; placing them in `explain.py` keeps the import dependency on the same module that owns the badge-firing logic. `scripts/constants.py` is reserved for build-time / cross-script-only constants (it's only imported by scripts/, not by backend/). Single source of truth honored without cross-package coupling.
- **Driving-words endpoint surrogate.** The worker does NOT publish per-upload (words, tfidf) to Redis (out of Phase 9 scope -- would need a new D-47-style hand-off). The /explain endpoint instead surfaces surrogate driving words from the upload's vocab-slab top clusters via `artifacts['cluster_to_representative_words']`. This matches the D-46 cluster-centric semantics ("which cluster does this upload's vocab fire on") without needing a new Redis key. Wave-3 frontend renders them with the same disclosure copy.
- **`predict_genre` legacy wrapper kept.** It's a one-line top-1 of `predict_top_n` so the contract change is invisible to back-compat callers (notably the test suite). The new tests for `predict_top_n` carry the calibrated-probability contract; the legacy `predict_genre` tests are updated to match the new API but assert the same `(genre, confidence)` shape.
- **Module-scoped TestClient fixture snapshots `app.state.redis`.** First run of the endpoint tests surfaced a `TypeError: object MagicMock can't be used in 'await' expression` in `lifespan` exit because tests had left MagicMock instances on `app.state.redis`. Fix: snapshot the original at fixture entry, restore at exit. Test isolation honored, no leakage into lifespan teardown.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Operative thresholds default mismatch with plan's research-default literals**
- **Found during:** Task 1 (writing explain.py)
- **Issue:** The plan's `<action>` block hardcodes `ENTROPY_BADGE_DEFAULT_TOP1_TOP2_GAP = 0.10` and `ENTROPY_BADGE_DEFAULT_NORMALIZED_ENTROPY = 0.7`. But the success criteria explicitly says: "Operative entropy thresholds (gap<0.2801 OR norm_entropy>0.7738) are imported from a single source". And 09-01-SUMMARY.md notes: "Plan 09-03 reads these values verbatim into `backend/pipeline/explain.py` constants". The plan's `<action>` and `<success_criteria>` disagreed on the numeric defaults.
- **Fix:** Used the operative values (0.2801 / 0.7738) per the success criteria + 09-01's Q4 tighten decision in `results/v2_calibration_report.md`. The constant names match the plan's `<action>` (so the worker import line in Task 2's `<action>` still works verbatim). Tests added (`test_uncertainty_thresholds_overridable`) verify callers CAN pass the research-default thresholds if they need to.
- **Files modified:** `backend/pipeline/explain.py`.
- **Verification:** `test_uncertainty_badge_fires_on_low_gap` + `test_uncertainty_badge_does_not_fire_when_certain` + `test_uncertainty_badge_fires_on_high_entropy_with_wide_gap` + `test_uncertainty_thresholds_overridable` all pass (4 tests, ~10 ms).
- **Committed in:** `3bee4b7`.

**2. [Rule 1 - Bug] Legacy `test_predict_genre_returns_tuple` mocked the v1 SVM API (predict + decision_function)**
- **Found during:** Task 1 (verifying that classify.py's new contract didn't break existing tests)
- **Issue:** `backend/tests/test_pipeline.py::test_predict_genre_returns_tuple` instantiated a MagicMock with `mock_svm.predict.return_value = np.array([1])` and `mock_svm.decision_function.return_value = np.array([[0.5, 1.2, 0.3]])`. My new `predict_genre` is a wrapper around `predict_top_n` which uses `svm.predict_proba` + `svm.classes_`. The test would have thrown `AttributeError: <MagicMock>.predict_proba()` or returned a MagicMock auto-attribute instead of the expected probabilities.
- **Fix:** Updated the mock to use the new contract: `mock_svm.predict_proba.return_value = np.array([[0.2, 0.6, 0.2]])` + `mock_svm.classes_ = np.array([0, 1, 2])`. Same assertion shape (`genre == 'romance'`, `confidence == 0.6` via pytest.approx).
- **Files modified:** `backend/tests/test_pipeline.py`.
- **Verification:** `pytest backend/tests/test_pipeline.py -q` -- all 14 tests pass.
- **Committed in:** `3bee4b7`.

**3. [Rule 1 - Bug] `test_jobs_imports_pipeline_functions` asserted the old `predict_genre`-only import line**
- **Found during:** Task 2 (running test_worker.py after the jobs.py rewrite)
- **Issue:** The test had `assert 'from backend.pipeline.classify import predict_genre' in source`. Task 2 changed the import to `from backend.pipeline.classify import predict_genre, predict_top_n` + added `from backend.pipeline.explain import compute_uncertainty_metrics`. The exact-substring match would have failed.
- **Fix:** Updated the assertion to match the new multi-name import line, and added two new tests (`test_jobs_writes_feature_vec_to_redis` + `test_jobs_sse_result_includes_phase9_fields`) covering the D-47 Redis write + the D-41/D-43 SSE result keys.
- **Files modified:** `backend/tests/test_worker.py`.
- **Verification:** `pytest backend/tests/test_worker.py -q` -- all 8 tests pass (5 existing + 3 new/updated).
- **Committed in:** `4795ad5`.

**4. [Rule 1 - Bug] Module-scoped TestClient fixture leaked MagicMock instances into lifespan exit**
- **Found during:** Task 3 (first pytest run of test_explain_endpoint.py)
- **Issue:** Each test swaps `app.state.redis` with a `MagicMock()`. The LAST test in the module leaves a MagicMock on `app.state.redis`. When the module-scoped TestClient fixture exits, `lifespan` runs `await app.state.redis.close()` -- which raises `TypeError: object MagicMock can't be used in 'await' expression` because `MagicMock.close()` returns a `MagicMock`, not a coroutine.
- **Fix:** Updated the fixture to snapshot the original `app.state.redis` at yield time and restore it in a `try/finally`. The original Redis client (or None) is what lifespan exit will close cleanly.
- **Files modified:** `backend/tests/test_explain_endpoint.py`.
- **Verification:** `pytest backend/tests/test_explain_endpoint.py -q` -- all 8 tests pass + clean teardown.
- **Committed in:** `b859ab0`.

---

**Total deviations:** 4 auto-fixed (1 Rule-1 bug fix in plan-prescribed default values that contradicted the plan's own success criteria; 3 Rule-1 bug fixes in pre-existing legacy tests / fixtures that asserted the v1 contract or didn't account for the new lifespan-exit interaction).

**Impact on plan:** All four are correctness-required. Deviation #1 honors the success criteria + 09-01's documented Q4 decision (operative thresholds, not research defaults). Deviations #2/#3 keep the test suite passing under the new SVM contract. Deviation #4 fixes a real interaction between FastAPI lifespan and the test fixture pattern; without the fix the LAST test would always fail at teardown. No scope creep; the plan's intent was preserved verbatim.

## Issues Encountered

- **First-call SVM warmup adds ~1.7 s on a cold process.** This is sklearn's `predict_proba` lazy initialization (Platt sigmoid parameter loading + the underlying libsvm probability calibration). It's a one-time per-process cost, not per-request. Production deployments (uvicorn workers) warm up at startup so users never see it. Latency numbers in this report exclude the warmup.
- **No actual `/explain` curl smoke test against a live server.** The plan's acceptance criteria says "starting the app and `curl -X POST http://localhost:8000/api/classify/00000000-0000-0000-0000-000000000000/explain` returns 410". I verified the equivalent via `TestClient.post(...)` (in-process) which exercises the same FastAPI router + lifespan. Result: bogus UUID returns 503 (not 410) when Redis is unavailable -- which is correct behavior: the Redis guard fires before the feature_vec lookup. The 410 path requires Redis to be reachable but the feature_vec key absent, which is what `test_explain_410_when_feature_vec_missing` covers via a MagicMock that returns None on the feature_vec GET. The plan's curl example assumed Redis was running locally; without Redis the 503 is the correct response.
- **Driving-words for synthetic uploads:** the surrogate "driving words via vocab slab + cluster representative words" path produces empty lists when the upload's vocab slab is all-zero (e.g., a synthetic feature_vec). In the integration test happy path with the real fixture, the path produces 0-15 words depending on how many of the top-15 clusters have a representative word that's in w2v vocab. This is honest-by-construction behavior (no fake driving words); Wave-3 frontend renders "(none)" for empty lists.

## User Setup Required

None -- no external service configuration. The endpoint binds to the existing FastAPI app + Redis + arq stack. CLAUDE.md's "Fresh Machine Setup" already covers all prerequisite artifacts (svm_pipeline.joblib + explain_artifacts.npz are LFS-tracked; precompute_explain.py is documented in step 3).

## Next Phase Readiness

**Ready for Plan 09-04 (frontend TopNList + ClassificationResult rewire):**

- SSE `result` payload from `/classify/{job_id}/progress` now includes `top_n` (length 8, sorted desc, sums to 1.0), `entropy` (float in [0, 1]), `top1_top2_gap` (float), `badge_fires` (bool). `useClassify.ts` parses these into `uploadStore.result`.
- `top_n` shape: `list[{genre: str, probability: float}]`. `TopNList.tsx` slices to top-3 + "+5 more" expander.
- `badge_fires` is precomputed by the backend (operative thresholds applied) -- frontend renders without recomputing.

**Ready for Plan 09-05 (frontend ClassificationExplain panel + useExplain hook):**

- POST `/api/classify/{job_id}/explain` returns `ExplainResponse`:
  ```ts
  {
    nearest_training_books: [{gutenberg_id, title, author, genre, distance}] × 5,
    track_contributions: {
      topology:   {pct: number, direction: '+' | '-' | '0'},
      vocabulary: {pct: number, direction: '+' | '-' | '0'},
    },
    driving_words: [{word, tfidf, nearest_genre}] (max 15),
    uncertainty: {entropy, top1_top2_gap, badge_fires},
    predicted_genre: string,
  }
  ```
- 410 detail string is exactly `"Upload expired — re-upload to see the explanation."` -- `useExplain.ts::onError` can substring-match `"Upload expired"` to trigger the re-upload prompt.
- 503 detail strings are stable: `"Explanation unavailable: SVM is not calibrated. ..."` / `"Explanation unavailable: explain artifacts not loaded. ..."` / `"Explanation cache unavailable."`.
- 404 fires on non-UUID job_id with detail `"Job not found."`.
- Cache: repeat calls with the same job_id within 5 min hit `explain:{sha256(feature_vec)}:{model_hash}` (1-h TTL). The endpoint is idempotent.

**Ready for Plan 09-06 (walkthrough disclaimer):**

- The 410 copy "Upload expired -- re-upload to see the explanation." is the canonical phrase for the disclaimer panel to reference if a user reaches the explain UI after their feature_vec has expired. The 9-step flow + threat-model mitigations are documented in `backend/api/routes/explain.py`'s module docstring, available for ARCHITECTURE.md cross-references.

## Self-Check: PASSED

Verified deliverables on disk:
- `backend/pipeline/explain.py` -- FOUND (7 helpers + 2 operative-threshold constants).
- `backend/api/routes/explain.py` -- FOUND (POST /classify/{job_id}/explain with 410/503/404/cache).
- `backend/tests/test_explain_endpoint.py` -- FOUND (8 tests passing).
- `backend/tests/test_explain_math.py` -- UPDATED (30 tests passing, 24 new + 6 Wave-0).
- `backend/pipeline/classify.py` -- UPDATED (predict_top_n + legacy predict_genre wrapper).
- `backend/api/models.py` -- UPDATED (8 new Phase 9 Pydantic models; `extra='forbid'` count = 11).
- `backend/api/app.py` -- UPDATED (explain_router mounted; lifespan unchanged).
- `backend/worker/jobs.py` -- UPDATED (D-47 Redis write + SSE result extension).
- `backend/tests/test_pipeline.py` -- UPDATED (predict_proba/classes_ mock).
- `backend/tests/test_worker.py` -- UPDATED (3 new/updated tests for the new imports + Redis + SSE).

Verified commits exist:
- `3bee4b7` -- feat(09-03): land explain math helpers + Pydantic models + predict_top_n -- FOUND.
- `4795ad5` -- feat(09-03): worker hand-off + SSE result extension (D-47/D-41/D-43) -- FOUND.
- `b859ab0` -- feat(09-03): POST /classify/{job_id}/explain endpoint (D-46/D-48/D-49) -- FOUND.

Verified test suite:
- `pytest backend/tests/test_explain_math.py backend/tests/test_explain_endpoint.py backend/tests/test_app_lifespan.py backend/tests/test_worker.py backend/tests/test_pipeline.py backend/tests/test_lineage.py backend/tests/test_lineage_calibration.py backend/tests/test_lineage_smoke.py backend/tests/test_explain_artifacts.py -q` -> **90 passed, 1 warning, 26.71 s**.

Verified acceptance criteria:
- `grep -n "^def " backend/pipeline/explain.py` lists multiclass_brier_score, normalized_entropy, compute_uncertainty_metrics, compute_track_contributions, find_nearest_training_books, compute_driving_words, explain_cache_key (7 functions).
- `grep -n "^class " backend/api/models.py` includes TopNPrediction, NearestTrainingBook, TrackContribution, TrackContributions, DrivingWord, UncertaintyMetrics, ExplainResponse, ExtendedClassifyResult (8 new).
- `grep -c "extra.*forbid" backend/api/models.py` = 11 (8 new + 1 existing CorpusBookFull is the older one; matches the >=8 acceptance bar with margin).
- `grep -n "feature_vec:{job_id}" backend/worker/jobs.py` = 1 match.
- `grep -n "ex=300" backend/worker/jobs.py` = 1 match.
- `grep -n "'top_n':\\|'entropy':\\|'top1_top2_gap':\\|'badge_fires':" backend/worker/jobs.py` = 4 matches.
- `grep -n "Upload expired — re-upload to see the explanation" backend/api/routes/explain.py` = 1 match.
- `grep -n "SVM is not calibrated" backend/api/routes/explain.py` = 1 match.
- `grep -n "explain artifacts not loaded" backend/api/routes/explain.py` = 1 match.
- `grep -n "explain_router" backend/api/app.py` = 2 matches (import + include_router).
- `grep -n "ex=3600\\|EXPLAIN_CACHE_TTL_SECONDS = 3600" backend/api/routes/explain.py` = 1 match (via the named constant).

---
*Phase: 09-classification-depth*
*Completed: 2026-05-27*
