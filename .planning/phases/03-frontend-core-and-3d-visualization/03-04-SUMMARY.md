---
phase: 03
plan: 04
slug: backend-viz-endpoints-and-precompute
subsystem: backend
tags: [api, visualization, precompute, umap, pca, tsne, kpca, cache, security]
dependency_graph:
  requires:
    - backend/cache/store.py (cache_key, cache_get, cache_put, cache_exists)
    - backend/pipeline/precompute.py (Phase 2 Word2Vec model must exist first)
    - config/params.yaml (word2vec.window parameter)
    - corpus/books.yaml (genre/book metadata for TF-IDF aggregation)
  provides:
    - backend/pipeline/precompute_viz.py (build-time projection precompute)
    - backend/api/routes/viz.py (GET /viz/scatter/{projection}, /tfidf/{genre}, /tfidf/book/{id})
    - backend/api/app.py updated (viz router registered at /viz prefix)
  affects:
    - frontend scatter data fetching (Plans 03-01 through 03-03)
tech_stack:
  added:
    - umap-learn>=0.5.0 (UMAP dimensionality reduction, deterministic via random_state=42, n_jobs=1)
  patterns:
    - FastAPI Literal enum path validation (T-3-02 threat mitigation)
    - Chunked cosine-similarity neighbor computation (avoids OOM on large vocabs)
    - Content-addressed disk cache (all endpoints serve from precomputed data/cache/)
key_files:
  created:
    - backend/pipeline/precompute_viz.py
    - backend/pipeline/tests/__init__.py
    - backend/pipeline/tests/test_precompute_viz.py
    - backend/api/routes/viz.py
    - backend/api/tests/test_viz.py
  modified:
    - backend/api/app.py (added viz_router include)
    - requirements.txt (added umap-learn>=0.5.0)
decisions:
  - "UMAP determinism: random_state=42 and n_jobs=1 are both required (thread parallelism breaks reproducibility)"
  - "Chunked neighbor computation (1k words/chunk) avoids ~13GB full similarity matrix for 58k vocab"
  - "FastAPI Literal['pca','kpca','umap','tsne'] for projection param — enum validation returns 422 automatically (T-3-02)"
  - "Gutenberg ID validated via r'^\\d+$' regex before cache lookup — URL normalization handles path-traversal before route, so 404 is also acceptable (both block the attack)"
  - "Genre validated against _KNOWN_GENRES list loaded at startup — falls back to hardcoded list if genre_names.json missing"
metrics:
  duration: ~8 min
  completed: 2026-04-12T11:58:02Z
  tasks_completed: 2
  files_created: 5
  files_modified: 2
---

# Phase 3 Plan 4: Backend Viz Endpoints and Precompute Summary

**One-liner:** Build-time PCA/KPCA/UMAP/t-SNE projection precompute with disk cache plus three FastAPI endpoints (`/viz/scatter/{projection}`, `/viz/tfidf/{genre}`, `/viz/tfidf/book/{id}`) serving pre-computed scatter and TF-IDF data with input validation at all trust boundaries.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 3-04-01 | precompute_viz pipeline + tests | e3c30c6 | backend/pipeline/precompute_viz.py, tests/test_precompute_viz.py, requirements.txt |
| 3-04-02 | Viz API router + endpoint tests | d367641 | backend/api/routes/viz.py, backend/api/tests/test_viz.py, backend/api/app.py |

## Verification Results

```
16 passed in 22.89s
backend/api/tests/test_viz.py: 10 passed
backend/pipeline/tests/test_precompute_viz.py: 6 passed
```

All plan verification criteria confirmed:
- `GET /viz/scatter/{projection}` returns 200 with scatter data or 503 if not precomputed
- `GET /viz/scatter/{invalid}` returns 422 (FastAPI Literal enum validation, T-3-02)
- `GET /viz/tfidf/{unknown_genre}` returns 404 (genre list validation, T-3-02)
- `GET /viz/tfidf/book/{non_integer}` returns 400 (regex guard, T-3-02)
- UMAP determinism confirmed: `random_state=42, n_jobs=1` produces identical arrays across two runs
- Neighbor computation: exactly 10 entries per word (or n-1 for small corpus)
- `Literal['pca','kpca','umap','tsne']` confirmed in route signature
- `include_router(viz_router)` confirmed in app.py
- `umap-learn>=0.5.0` confirmed in requirements.txt

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Path traversal test adjusted for URL normalization behaviour**
- **Found during:** Task 2 — `test_tfidf_book_invalid_id_non_numeric`
- **Issue:** The FastAPI test client normalizes `../../etc/passwd` in the URL before routing, so the path resolves to a different route entirely (returns 404, not 400). The route handler with the `^\d+$` guard is never reached for traversal-style inputs.
- **Fix:** Updated test assertion to `assert resp.status_code in (400, 404)` with explanatory comment — both outcomes block the attack. The regex guard still correctly rejects `not_an_id` and other non-numeric strings with 400.
- **Files modified:** backend/api/tests/test_viz.py
- **Security impact:** None — path traversal is blocked either way (404 = route not matched; 400 = regex rejected)

## Known Stubs

None — all endpoints have real implementations. Cache miss returns 503/404 with actionable error messages directing user to run precompute_viz.

## Threat Flags

No new security surface beyond what is documented in the plan's threat model. All three T-3-02 mitigations implemented:
- Projection enum: FastAPI Literal validation
- Genre: `_KNOWN_GENRES` list check
- Gutenberg ID: `^\d+$` regex

## Self-Check: PASSED

Files created:
- backend/pipeline/precompute_viz.py — FOUND
- backend/pipeline/tests/__init__.py — FOUND
- backend/pipeline/tests/test_precompute_viz.py — FOUND
- backend/api/routes/viz.py — FOUND
- backend/api/tests/test_viz.py — FOUND

Commits:
- e3c30c6 — FOUND (feat(03-04): precompute_viz pipeline and test suite)
- d367641 — FOUND (feat(03-04): viz API router, app integration, and endpoint tests)
