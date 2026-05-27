# Phase 09 — Deferred Items

Out-of-scope discoveries logged during plan execution. Each item is pre-existing
(not caused by the current plan's edits) and should be addressed in a follow-up
plan or quick-fix workflow.

---

## Found during 09-04 execution

### 1. `frontend/src/hooks/useClassify.test.ts` — 5 failing tests

**Severity:** medium (test suite hygiene, no production impact)
**Pre-existing:** confirmed by `git stash` + re-running the suite at commit
`9a7c2a1` (just after Task 2, before any Task 3 edits). The same 5 failures
reproduce.
**Root cause:** the test file mocks `WebSocket` + `WS_BASE`, but production
`useClassify.ts` uses `EventSource` + `API_BASE` (SSE migration landed in an
earlier phase but the tests were not updated to mock EventSource). All five
failures throw before reaching any code this plan touched -- they fail at
line 49 (`const es = new EventSource(sseUrl)`) where the mock is never wired.
**Failing tests:**
- `sets jobId after successful POST`
- `updates steps on progress messages`
- `caps uploadedPoints at 50k`
- `retries on WebSocket error`
- `sets Unable to connect after 3 retries`

**Recommended fix:** rewrite the test file to mock `EventSource` (the
`apiFetch` mock can stay) and update the message-shape assertions for the
SSE `{step, index, total, message, status, result?}` payload.

### 2. `frontend/src/components/sidebar/__tests__/SlowTierParams.test.tsx` -- 1 failing test

**Severity:** low (test suite hygiene, no production impact)
**Pre-existing:** confirmed by the same `git stash` re-run.
**Root cause:** `setH2Enabled is not a function` -- the test sets
`useVisualizationStore` state via `setState({ dirtyParams: new Set(), ... })`
but the `SlowTierParams.tsx` component reads a `setH2Enabled` selector that
the test fixture does not provide; the store shape and the test fixture are
out of sync.
**Failing test:** `H2 toggle adds "h2" to dirtyParams when enabled`

**Recommended fix:** add the missing setters to the test's `setState` call,
or update the component to derive H2-enabled state from `dirtyParams` rather
than a separate setter.

---

*Neither item blocks plan 09-04 success criteria (the new TopNList +
UncertaintyBadge tests are 14/14 green; tsc passes; ClassificationResult
mounts both components per the contract).*

---

## Found during 09-06 execution (full-suite gate)

### 3. 29 pre-existing failures in `backend/tests/test_upload.py`, `test_classify.py`, `test_recompute.py`, `test_corpus_genres_books.py`, `test_websocket.py`, `test_vr_api.py`, `test_api.py`, and `backend/api/tests/test_viz.py`

**Severity:** environmental — not a Phase 9 regression
**Pre-existing:** confirmed via `git stash` re-run at 09-06 HEAD before any 09-06 edits. The failures reproduce against the same SHA prior to plan 09-06's commits.
**Root cause:** Redis is not running on the local dev machine (`Could not connect to Redis at 127.0.0.1:6379: Connection refused`). The FastAPI lifespan opens the Redis pool best-effort but the arq pool init still emits 5 retries × 2s of warnings before falling through; some test fixtures (TestClient bootstraps) end up with routers unmounted, cascading into 404/405 responses from any endpoint that depends on the worker context (upload, classify, recompute, corpus-genres-books, ws, vr, viz).
**Failing tests (29 total):**
- `backend/api/tests/test_viz.py` (6 failures)
- `backend/tests/test_upload.py` (6 failures)
- `backend/tests/test_recompute.py` (5 failures)
- `backend/tests/test_vr_api.py` (4 failures)
- `backend/tests/test_classify.py` (3 failures)
- `backend/tests/test_corpus_genres_books.py` (3 failures)
- `backend/tests/test_api.py` (1 failure)
- `backend/tests/test_websocket.py` (1 failure)

**Why these are environmental, not Phase 9 regressions:**
- The 54 Phase 9 backend tests in scope (`test_explain_math.py`, `test_lineage_calibration.py`, `test_explain_artifacts.py`, `test_app_lifespan.py`, `test_explain_endpoint.py`) all pass — they mock Redis directly.
- The failing tests are integration tests authored in Phase 2 / Phase 4 / Phase 6 that have always required a live Redis instance; CI runs them inside a docker-compose stack with Redis.
- The 09-03 SUMMARY explicitly notes the explain endpoint tests use `MagicMock` Redis to avoid this dependency, confirming the project pattern is "unit tests mock Redis; integration tests need a real one".

**Recommended fix:** either (a) start Redis locally (`docker run -p 6379:6379 redis:7`) before running the full backend suite, or (b) add a `@pytest.mark.requires_redis` skip marker to the 29 tests so a no-Redis dev environment exits cleanly. Option (b) is the project-hygiene fix; option (a) is the developer-workflow workaround.

---

*The Phase 9 success criteria do not require the 29 environmental tests to pass — only the Phase 9 surface tests (which all do). 09-06's full-suite gate is satisfied by the green Phase 9 backend suite + green Phase 9 frontend surface suite + clean tsc.*

---

## Found during the post-Wave-4 regression gate

### 4. `tests/test_corpus.py::test_books_yaml_valid` — stale shape assertion

**Severity:** low (test hygiene; production unaffected — corpus is correct)
**Pre-existing:** asserts `len(genres) == 3` and "5 books per genre"; the corpus
was expanded to 8 genres × ~20 books = 154 books in Phase 8 but this Phase-1
era test was never updated. The test was already failing at master commit
`1fc3e3f` (Phase 8 close) before Phase 9 began. `git log 1fc3e3f..HEAD --
tests/test_corpus.py corpus/books.yaml` returns empty → Phase 9 did not modify
either file.
**Recommended fix:** update assertion to `len(genres) == 8` and a min-books-
per-genre check matching the v2 corpus, or convert to a structural-only test
(YAML loads, every genre has ≥1 book entry with required fields).

### 5. `backend/api/tests/test_viz.py` — 6 path-prefix failures

**Severity:** medium (test suite hygiene, no production impact — routes work,
tests use wrong URL)
**Pre-existing:** the viz router has been mounted at `/api/viz/...` since
Phase 5 (`api_router = APIRouter(prefix='/api')` then
`api_router.include_router(viz_router, prefix='/viz')`). The test file uses
bare `/viz/...` paths. This exact issue was logged in
`06-VERIFICATION.md` as "10/13 tests wrong path prefix" — three tests were
since fixed but six remain. `git log 1fc3e3f..HEAD -- backend/api/tests/test_viz.py
backend/api/routes/viz.py` returns empty → Phase 9 did not touch either file.
**Failing tests:**
- `test_scatter_valid_projection`
- `test_scatter_invalid_projection`
- `test_scatter_cache_miss`
- `test_tfidf_genre`
- `test_tfidf_book`
- `test_tfidf_book_invalid_id_string`

**Recommended fix:** sed `'/viz/' → '/api/viz/'` and `'/tfidf/' → '/api/viz/tfidf/'`
across the file. Trivial mechanical edit; all six should pass after the prefix
change. The `test_path_traversal_blocked` warning from `06-VERIFICATION.md`
remains a separate known issue (SPA catch-all serves `index.html` for the
URL-decoded path) and is not in this list.

---

*Regression gate verdict (post Wave 4): zero new Phase 9 regressions. All
failures listed in this file are pre-existing technical debt at the Phase 8
close (commit `1fc3e3f`).*
