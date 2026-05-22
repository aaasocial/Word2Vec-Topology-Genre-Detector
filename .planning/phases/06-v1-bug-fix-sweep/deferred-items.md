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

