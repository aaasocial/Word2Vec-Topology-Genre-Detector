---
phase: 09-classification-depth
reviewed: 2026-05-27T00:00:00Z
depth: deep
files_reviewed: 38
files_reviewed_list:
  - backend/api/app.py
  - backend/api/models.py
  - backend/api/routes/explain.py
  - backend/cache/lineage.py
  - backend/pipeline/classify.py
  - backend/pipeline/explain.py
  - backend/pipeline/precompute.py
  - backend/pipeline/precompute_explain.py
  - backend/tests/fixtures/__init__.py
  - backend/tests/test_app_lifespan.py
  - backend/tests/test_explain_artifacts.py
  - backend/tests/test_explain_endpoint.py
  - backend/tests/test_explain_math.py
  - backend/tests/test_lineage_calibration.py
  - backend/tests/test_lineage_smoke.py
  - backend/tests/test_pipeline.py
  - backend/tests/test_worker.py
  - backend/worker/jobs.py
  - frontend/src/components/explanation/PipelineExplanation.tsx
  - frontend/src/components/explanation/steps/Step7ValidationLimitations.tsx
  - frontend/src/components/sidebar/ClassificationExplain.tsx
  - frontend/src/components/sidebar/ClassificationResult.tsx
  - frontend/src/components/sidebar/DrivingWordsPills.tsx
  - frontend/src/components/sidebar/NearestBooksList.tsx
  - frontend/src/components/sidebar/TopNList.tsx
  - frontend/src/components/sidebar/TrackContributionBars.tsx
  - frontend/src/components/sidebar/UncertaintyBadge.tsx
  - frontend/src/components/sidebar/__tests__/DrivingWordsPills.test.tsx
  - frontend/src/components/sidebar/__tests__/NearestBooksList.test.tsx
  - frontend/src/components/sidebar/__tests__/TopNList.test.tsx
  - frontend/src/components/sidebar/__tests__/TrackContributionBars.test.tsx
  - frontend/src/components/sidebar/__tests__/UncertaintyBadge.test.tsx
  - frontend/src/hooks/useClassify.ts
  - frontend/src/hooks/useExplain.test.tsx
  - frontend/src/hooks/useExplain.ts
  - frontend/src/lib/api.ts
  - frontend/src/stores/uploadStore.ts
  - frontend/src/types/explain.ts
  - scripts/06_validate.py
  - scripts/calibrate.py
  - scripts/constants.py
  - scripts/rebuild_per_book_artifacts.py
findings:
  critical: 0
  warning: 5
  info: 8
  total: 13
status: warnings
---

# Phase 9: Code Review Report

**Reviewed:** 2026-05-27
**Depth:** deep
**Files Reviewed:** 38 (incl. tests)
**Status:** warnings (no critical issues; 5 warnings, 8 info)

## Summary

Phase 9 lands the calibrated-SVM top-N + on-demand "Why this genre?" spine across backend (pipeline math, explain endpoint, lifespan startup), frontend (TopNList, UncertaintyBadge, ClassificationExplain), and build-time pipeline (calibration spike, explain_artifacts precompute, D-40 lineage extension). The code adheres to the locked decisions (D-37..D-55) cleanly:

- Math correctness is good — `compute_track_contributions` batches the three predict_proba calls per Pitfall 2, signs are surfaced separately from pct magnitudes per Q3, `compute_uncertainty_metrics` consumes the operative thresholds (0.2801/0.7738) as a single source of truth in `backend/pipeline/explain.py`, and the threshold literals are NOT duplicated elsewhere (`worker/jobs.py` and `routes/explain.py` both import `compute_uncertainty_metrics` rather than re-declare).
- Cache lineage discipline (BUG-05) is preserved — `explain_cache_key` embeds `lineage['w2v_model_sha256'][:16]` so a D-38 retrain automatically rotates the namespace; the `verify_svm_lineage` extension correctly refuses pre-Phase-9 SVMs.
- The four mathematical invariants per CLAUDE.md are preserved — `precompute_explain` documents and honors invariant #3 (TF-IDF without genre labels) in its docstring; per-genre centroids are L2-normalized after aggregation; the runtime feature_vec is L2-normalized before NN lookup matching the precomputed `feature_matrix_l2`.
- Test coverage is meaningful — pure-math tests, mock-based zero-ablation tests, real-artifact integration tests behind skip-gates, and frontend Vitest tests with realistic UAT-aligned assertions.
- Security posture is sound — UUID validation on `/explain`, shape validation on Redis-deserialized feature_vec, ApiError class for structured frontend error routing.

The warnings below are real but advisory (none are blockers per the user's note that this review is advisory). The most consequential is W-01 (stale state in `ClassificationExplain` on jobId change while panel is open), which is an actual UX bug if a user uploads a second file while the panel is open.

## Warnings

### WR-01: Stale `expired`/`uncalibrated` state persists across new uploads in `ClassificationExplain`

**File:** `frontend/src/components/sidebar/ClassificationExplain.tsx:29-45`
**Issue:** The `expired` and `uncalibrated` local state flags are set from `onExpired` / `onUncalibrated` callbacks but never cleared. If a user (a) opens the Why-panel, (b) waits past the 5-min TTL and sees the "Upload expired" message, then (c) uploads a NEW file while the panel stays open, the new jobId triggers the `useEffect` re-fire — but the `expired` flag is still `true`, so the new (successful) mutation result is masked by the 410 branch. Same issue applies to `uncalibrated` if the operator re-runs precompute mid-session.

The useEffect dep array is `[jobId]` but only fires `mutate()`; it does not reset the branch flags.

**Fix:** Reset both flags inside the useEffect when jobId changes:
```typescript
useEffect(() => {
  if (jobId && !data && !error) {
    setExpired(false)
    setUncalibrated(false)
    mutate()
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [jobId])
```

### WR-02: `routes/explain.py` bypasses `svm.classes_` mapping for predicted-genre lookup

**File:** `backend/api/routes/explain.py:135-141`
**Issue:** The explain endpoint derives `predicted_genre` via `np.argmax(proba)` then `genre_names[predicted_idx]`. This works in v2 only because `svm.classes_` happens to be `[0, 1, ..., 7]` (no genre dropouts during training), so the proba column index equals the label index equals the genre name index. `backend/pipeline/classify.py::predict_top_n` correctly threads through `svm.classes_[i]` to map back to the integer label first. The explain endpoint should follow the same contract — otherwise, if a future training run produces non-contiguous `classes_` (e.g., a genre with zero training samples is silently dropped by sklearn), the explain endpoint would return the wrong predicted_genre while classify.py would still be correct.

**Fix:** Reuse the canonical mapping:
```python
classes = svm.classes_
predicted_idx = int(np.argmax(proba))
predicted_label = int(classes[predicted_idx])
predicted_genre = (
    genre_names[predicted_label]
    if predicted_label < len(genre_names)
    else f'unknown({predicted_label})'
)
```

Note: `predict_top_n` already does this; refactoring `routes/explain.py` to call `predict_top_n` once and reuse `top_n[0]` would eliminate the duplication entirely.

### WR-03: Cache hit on `/explain` bypasses Pydantic validation

**File:** `backend/api/routes/explain.py:117-126`
**Issue:** On cache hit, the endpoint returns `JSONResponse(content=payload)` directly, with no validation against `ExplainResponse`. FastAPI's `response_model=ExplainResponse` decorator only validates plain `return value`s — explicit `Response` objects bypass that. If the cache value were ever corrupted by an out-of-band process (e.g., direct `redis-cli SET`) or a future serializer change writes a slightly different shape, the corrupted payload propagates to the frontend silently. The recompute branch (line 196-204) DOES validate via `ExplainResponse.model_validate(payload)`.

The risk surface is small in the current architecture (only the backend writes the explain cache namespace), but defense-in-depth would treat both paths identically.

**Fix:** Validate after the cache deserialization too:
```python
if cached is not None:
    try:
        if isinstance(cached, (bytes, bytearray)):
            cached = cached.decode('utf-8')
        payload = json.loads(cached)
        validated = ExplainResponse.model_validate(payload)
        return validated.model_dump()
    except Exception as exc:
        log.warning(f'Corrupt explain cache for {cache_key}: {exc} -- recomputing')
```

### WR-04: Stale comment in `config/params.yaml` says `cv=LeaveOneOut()` but code uses `StratifiedKFold(5)`

**File:** `config/params.yaml:42`
**Issue:** The comment block above `classify.calibration_method` documents the two allowed values; for `calibrated_cv_sigmoid` it says:
```yaml
#   - calibrated_cv_sigmoid  : CalibratedClassifierCV(method='sigmoid', cv=LeaveOneOut())
```
But both `scripts/calibrate.py` and `backend/pipeline/precompute.py` use `StratifiedKFold(n_splits=5, ...)` — sklearn 1.6 rejects LOOCV for multiclass `CalibratedClassifierCV` (documented in the plan-09-01 SUMMARY's deviation log). The mismatch will mislead a future operator who reads `params.yaml` to understand what calibration the deployed SVM actually uses.

**Fix:**
```yaml
#   - calibrated_cv_sigmoid  : CalibratedClassifierCV(method='sigmoid',
#                              cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=42))
#                              -- sklearn 1.6 rejects LOOCV for multiclass calibration;
#                              StratifiedKFold(5) is the closest accepted CV strategy.
```

### WR-05: `feature_vec` from Redis is shape-validated but not finite-validated

**File:** `backend/api/routes/explain.py:104-113`
**Issue:** The endpoint does `np.frombuffer(raw, dtype=np.float64)` and asserts shape `(600,)`, but does not check `np.all(np.isfinite(feature_vec))`. If the Redis bytes are corrupted (e.g., partial write under back-pressure) OR a future worker writes NaN/Inf (e.g., a degenerate upload where L2-normalization divides by zero pre-Phase-9 guard), the downstream `svm.predict_proba(feature_vec.reshape(1, -1))` may produce NaN probabilities. NaN propagation hits Pydantic at the `UncertaintyMetrics.entropy: Field(ge=0.0, le=1.0)` validator and 500s — better than a silent wrong answer, but a clearer 400-class error at the read step would be more honest.

The shape check already exists with a 500; finite-check fits the same pattern.

**Fix:**
```python
feature_vec = np.frombuffer(raw, dtype=np.float64)
if feature_vec.shape != (EXPECTED_FEATURE_DIM,):
    raise HTTPException(status_code=500, detail=...)
if not np.all(np.isfinite(feature_vec)):
    raise HTTPException(
        status_code=500,
        detail='feature_vec contains non-finite values',
    )
```

## Info

### IN-01: Magic number `400` in `routes/explain.py` duplicates `VOCAB_SLICE.start`

**File:** `backend/api/routes/explain.py:161`
**Issue:** `vocab_slab = feature_vec[400:]` hardcodes the topology/vocab split point that is already canonicalized in `backend/pipeline/explain.py` as `VOCAB_SLICE = slice(400, 600)`. The module is already imported (lines 39-45) but `VOCAB_SLICE` is not pulled into the namespace.
**Fix:** Import `VOCAB_SLICE` and use `feature_vec[VOCAB_SLICE]`. Same single-source-of-truth discipline that the entropy thresholds already follow.

### IN-02: Brittle source-string assertions in `test_worker.py`

**File:** `backend/tests/test_worker.py:65-88`
**Issue:** `test_jobs_writes_feature_vec_to_redis` and `test_jobs_sse_result_includes_phase9_fields` assert substrings against `inspect.getsource(classify_book)`. These pass-by-formatting checks (`"f'feature_vec:{job_id}'"`, `"ex=300"`, `"'top_n':"`) break under cosmetic refactors (double-quote → single-quote, key rename via dict-spread, etc.) without indicating an actual contract violation. A behavioural test (mock Redis, run classify_book, assert `.set` calls) would catch real regressions while surviving refactors.
**Fix:** Replace with an integration test that runs `classify_book` against an AsyncMock Redis and asserts on `.set.call_args_list` and on the published result payload keys. The current substring tests can stay as defense-in-depth but are insufficient on their own.

### IN-03: `Optional`/`Any` imports in `backend/api/models.py`

**File:** `backend/api/models.py:2`
**Issue:** `from typing import Optional, Any` — `Any` is no longer used after Phase 9 additions (only `Optional` is referenced on `ProgressWsMessage.result`). Phase 9 added six Pydantic models using PEP 604 union syntax for nullables elsewhere; this is a mild style inconsistency.
**Fix:** Drop `Any` from the import. Pre-existing inconsistency, not a Phase 9 regression — note only.

### IN-04: `predict_genre` / `predict_top_n` type annotations use `= None` without `Optional`

**File:** `backend/pipeline/classify.py:21, 61`
**Issue:** `cancel_event: asyncio.Event = None` is a common shorthand but technically violates strict type-checking (mypy --strict would flag it). The legacy convention in the codebase uses this pattern, so consistency with prior art is preserved.
**Fix:** When the codebase adopts stricter type-checking, change to `cancel_event: asyncio.Event | None = None`. Not Phase 9 specific.

### IN-05: `compute_track_contributions` direction sign for `contrib == 0` exactly

**File:** `backend/pipeline/explain.py:133-138`
**Issue:** The sign assignment `'+' if topo_contrib >= 0 else '-'` treats exact 0.0 as `'+'`. The `'0'` direction is only used when BOTH slabs' absolute contributions sum to < 1e-9. Edge case: if topo_contrib is exactly 0 but vocab_contrib is non-zero, topology shows `'+'` (misleadingly "supporting"). With float arithmetic on calibrated probabilities this is vanishingly unlikely, but a `> 0 → '+'`, `< 0 → '-'`, `== 0 → '0'` ternary would be unambiguous.
**Fix:**
```python
def _sign(x: float) -> str:
    if x > 0: return '+'
    if x < 0: return '-'
    return '0'
```

### IN-06: `find_nearest_training_books` defensive fallback for non-dict meta is dead code in practice

**File:** `backend/pipeline/explain.py:155-158`
**Issue:** The `get = meta.get if hasattr(meta, 'get') else (lambda k, default='': meta[k] if k in meta else default)` fallback handles the case where `meta` is not a dict (e.g., a numpy structured-array record). In the current `precompute_explain.py` flow, `book_metadata` is `np.empty(N, dtype=object)` with each element being a Python dict, so `hasattr(meta, 'get')` is always True. The fallback's `k in meta` semantics for a structured numpy record do not match dict-style key existence — if exercised, the fallback could behave incorrectly (numpy `__contains__` checks for values, not field names).
**Fix:** Either remove the fallback (rely on dict-only contract) or document the structured-array contract explicitly. Add an assertion at load time: `assert all(isinstance(m, dict) for m in book_metadata[:5])`.

### IN-07: Worker writes `feature_vec` before classify step; orphaned key on cancel

**File:** `backend/worker/jobs.py:150-165`
**Issue:** The Redis write happens between Step 5 (features) and Step 6 (classify). If classify is cancelled or errors AFTER the write but before sending the SSE 'done' message, the `feature_vec:{job_id}` key sits in Redis for 5 minutes with no corresponding result for the frontend. Hitting `/explain` against that job_id would compute a fresh prediction via `svm.predict_proba(feature_vec)` and return explanations for a result the user never saw. The 5-min TTL self-cleans, but the surface exists.

Severity is low because (a) the frontend only mounts ClassificationExplain after seeing a `done` SSE message, so it has no jobId to call /explain with for cancelled jobs; (b) the TTL bounds the leak; (c) re-deriving the prediction would still be correct (deterministic SVM).
**Fix:** Either move the write to AFTER classify (at the cost of a wasted compute on cancel) OR explicitly delete `feature_vec:{job_id}` in the `except asyncio.CancelledError` / `except Exception` blocks. Current behavior is defensible; flagging as a design note.

### IN-08: SPA path-traversal check uses `parents` which would allow exact `FRONTEND_DIR`

**File:** `backend/api/app.py:188-194`
**Issue:** `if resolved.is_file() and FRONTEND_DIR.resolve() in resolved.parents` checks STRICT ancestry. If `resolved` is exactly `FRONTEND_DIR` (i.e., `full_path` is empty), the `is_file()` check would be False (it's a directory), so the branch is skipped and the code falls through to `index.html`. Practically safe. But the convention `parents` not including self is subtle — if a future refactor swaps `is_file()` for `exists()`, the check would allow serving the FRONTEND_DIR path itself.

This is pre-existing code (not in Phase 9's modifications), surfaced only because Phase 9 expanded `app.py` significantly. Note only.
**Fix:** Defensive alternative using `Path.is_relative_to` (3.9+):
```python
if resolved.is_file() and resolved.is_relative_to(FRONTEND_DIR.resolve()):
    return FileResponse(resolved)
```

---

## Cross-cutting positives worth recording

These are NOT issues — they're things Phase 9 got right that future phases should preserve:

- **Single source of truth for operative thresholds.** `ENTROPY_BADGE_DEFAULT_TOP1_TOP2_GAP = 0.2801` and `ENTROPY_BADGE_DEFAULT_NORMALIZED_ENTROPY = 0.7738` live ONLY in `backend/pipeline/explain.py`. The worker (`jobs.py`) and the /explain route both call `compute_uncertainty_metrics(proba)` rather than re-declaring the literals. Pydantic's `UncertaintyMetrics` docstring mentions the values but does NOT use them as `Field` defaults, which is the right call (they're computed, not validated against).
- **D-48 cache key rotates correctly on retrain.** `explain_cache_key` uses `lineage['w2v_model_sha256'][:16]` so D-38 retrain (which rotates `w2v_model_sha256` via the corpus + model file changes) invalidates the explain namespace automatically without a manual flush. Tests `test_explain_cache_key_*` confirm both axes (feature_vec change → new key; model_hash change → new key).
- **D-44 batched zero-ablation.** `compute_track_contributions` issues ONE `predict_proba` call on a `(3, n_features)` batch instead of three sequential calls (test_track_contributions_uses_batched_predict_proba enforces this). Material to the ~200 ms /explain p95 budget.
- **D-40 lineage refusal is honest and actionable.** Pre-Phase-9 SVMs without `calibration_method` get rejected by `verify_svm_lineage` with a specific reason string; the /explain endpoint returns 503 with retrain instructions; the frontend `useExplain` routes 503 to a dedicated `onUncalibrated` callback. End-to-end the failure mode is informative, not silent.
- **Worker SSE preserves Pitfall-1 invariant.** `predicted_genre` is derived from `top_n[0]['genre']` (i.e., the top of the calibrated `predict_proba` ranking), not from `svm.predict()`. This eliminates the "argmax of predict_proba" vs "result of predict" disagreement risk that sklearn warns about with small datasets.
- **Mathematical invariants preserved.** `precompute_explain.compute_per_genre_centroids` documents invariant #3 in its docstring AND honors it in code (TF-IDF fit corpus-wide upstream; centroid is a post-classification aggregation aid). Centroids are L2-normalized for cosine math; runtime feature_vec is L2-normalized before NN-lookup matching `feature_matrix_l2`. Track-ablation never mutates the SVM-input feature_vec (it copies).
- **Frontend ApiError class** is a small but load-bearing addition — it lets `useExplain` route 410 vs 503 vs generic failures via `.status` without parsing the message string, which would be brittle to backend wording changes (the canonical 'Upload expired' phrase IS still asserted in the integration test, but the routing logic doesn't depend on it).
- **`.gitattributes` LFS line for `*.npz`** was correctly added per the 09-RESEARCH Q7 callout.

---

_Reviewed: 2026-05-27_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
