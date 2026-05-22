# Phase 06 — Deferred Items

Out-of-scope discoveries during plan execution. Each item is documented for the
phase-level cleanup or for a future plan.

## Discovered during Plan 06-02 (Persistence diagram dot scaling)

### HomologyTabs.test.tsx — "H2 tab is disabled when h2Enabled=false" failing

- **Discovered:** 2026-05-22 while running the full topology test suite to
  validate no regressions from the PersistenceDiagram changes.
- **Symptom:** `expect(h2).toHaveAttribute('title', 'Enable H2 in Settings')` —
  element renders without the `title` attribute. Pre-existing failure on
  master HEAD (`83b97f1`); unrelated to Plan 06-02 changes.
- **Why deferred:** Plan 06-01 (BUG-01) removes the H2 tab entirely (per
  06-CONTEXT.md decision D-01/D-02), which will delete this test case.
  Fixing it here would be discarded work.
- **Owner:** Plan 06-01 (BUG-01 H2 removal).

## Discovered during Plan 06-03 (BookSlider metadata endpoint)

### backend/tests/test_api.py::test_corpus_books_returns_list — wrong path

- **Discovered:** 2026-05-22 while running the corpus-related backend tests
  to validate no regression from the new /genres/{genre}/books endpoint.
- **Symptom:** Test calls ``await client.get('/corpus/books')`` but the
  router is mounted at ``/api/corpus/books`` (via the ``api_router`` parent
  in ``backend/api/app.py``). Always returned 404; the test never ran the
  real endpoint. Confirmed pre-existing by re-running on master HEAD
  (b33dc54 with my changes stashed).
- **Why deferred:** Out-of-scope for Plan 06-03's BUG-03 surface (the test
  belongs to Plan 02-01 / FastAPI skeleton). Fix is trivial (prepend
  ``/api/``) but should land with whoever owns the API-prefix migration.
- **Owner:** Phase 06 cleanup (or whoever next touches test_api.py).

### frontend/src/hooks/useClassify.test.ts — 5/7 tests failing

- **Discovered:** 2026-05-22 while running the broader frontend hook suite
  to validate no regression from the new ``useCorpusBooks`` hook.
- **Symptom:** Test errors trace into ``useClassify.ts:49:23`` -- the SSE URL
  construction blows up under the test's mock setup. Confirmed pre-existing
  by re-running with my changes stashed (5/7 still fail on `ce99cfa`).
- **Why deferred:** Unrelated to Plan 06-03's BookSlider surface. Likely
  belongs to whichever phase last touched the SSE classify pipeline
  (Phase 5 deployment migration?). The new ``useCorpusBooks.test.ts``
  passes 4/4 in the same run, isolating the failure to ``useClassify``.
- **Owner:** Phase 06 cleanup (or whoever next touches useClassify).

## Discovered during Plan 06-04 (H₂/H₀ removal sweep)

### backend/api/tests/test_viz.py — 10/13 tests failing (wrong path prefix)

- **Discovered:** 2026-05-22 while running the broader viz/persistence test
  suite to validate the new ``Literal[1]`` enforcement on ``dim``.
- **Symptom:** Tests in ``backend/api/tests/test_viz.py`` call paths like
  ``/viz/scatter/pca`` and ``/viz/tfidf/{genre}``, but routes are mounted at
  ``/api/viz/...`` (via the ``api_router`` parent in ``backend/api/app.py``).
  All hit the SPA catch-all and return 200 (or invalid JSON), so the asserts
  fail. Confirmed pre-existing by checking the git history: this file was
  last touched in Phase 3 and was already broken on master HEAD before
  Plan 06-04 began.
- **Why deferred:** Same root cause as ``test_api.py::test_corpus_books_returns_list``
  (recorded under Plan 06-03 above) -- the FastAPI ``/api`` prefix
  migration left these tests un-rebased. Out of scope for Plan 06-04's
  BUG-01 surface; I fixed the same issue in ``backend/tests/test_persistence_api.py``
  because that file IS in Plan 06-04's ``files_modified`` list and the new
  ``Literal[1]`` rejection tests had to actually reach the routes.
- **Owner:** Phase 06 cleanup (or whoever next touches the FastAPI
  ``/api/`` prefix migration in tests).

## Discovered during Plan 06-05 (cache_key corpus_hash + w2v_model_sha256)

### backend/tests/test_classify.py — 3/3 tests failing (wrong path prefix + redis dep)

- **Discovered:** 2026-05-22 while running the in-scope cache suite to
  verify the migration to the new ``cache_key()`` signature.
- **Symptoms:**
  - ``test_corpus_book_results_not_found``: calls ``GET /corpus/books/99999/results``
    but the route is mounted at ``/api/corpus/books/{id}/results``; gets a
    generic 404 from the SPA catch-all instead of the "pre-computed" detail.
  - ``test_classify_returns_job_id_for_valid_file``: calls ``POST /classify``
    but the route is at ``/api/classify``; gets 405 Method Not Allowed.
    Even if rebased, the test still needs a running Redis (arq backend)
    which is not available in this sandbox.
  - ``test_corpus_book_results_found_after_cache``: same ``/api/`` prefix
    bug; once that's fixed it would exercise my updated lineage path
    (test now imports ``backend.cache.lineage`` and computes the same
    hashes the route uses).
- **Why deferred:** Same root cause as ``test_api.py`` (Plan 06-03) and
  ``test_viz.py`` (Plan 06-04) -- the ``/api/`` prefix migration was never
  rebased into these test files. Confirmed pre-existing on master HEAD
  (``a922d1f``) with all my Plan 06-05 changes stashed.
- **Owner:** Phase 06 cleanup (or whoever owns the ``/api/`` prefix
  migration in tests). Plan 06-05 already updated the in-scope cache_key
  call in ``test_corpus_book_results_found_after_cache`` for future
  rebasing convenience.

