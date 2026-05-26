---
phase: 09-classification-depth
plan: 02
subsystem: ml-classification
tags: [explain-artifacts, npz, fastapi-lifespan, nearest-neighbors, sklearn, w2v-centroid, lfs]

# Dependency graph
requires:
  - phase: 09-classification-depth
    provides: D-38 calibrated SVM + D-40 extended lineage sidecar (calibration_method present) -- precompute_explain reads the lineage hashes, lifespan calls verify_svm_lineage to gate calibration_available
  - phase: 08-corpus-expansion
    provides: 154-book v2 corpus + word2vec_w15.model + per-book TF-IDF artifacts (words_*_w15.json + tfidf_*_w15.npy) + raw feature_matrix_w15_k200.npy (151 books × 600D, no alpha applied) + book_order.json
provides:
  - data/models/explain_artifacts.npz (269.7 KB, LFS-tracked) with the six canonical keys (feature_matrix_l2, book_metadata, per_genre_centroids, genre_names, cluster_to_representative_words, metadata)
  - backend/pipeline/precompute_explain.py CLI + reusable helpers compute_per_genre_centroids + compute_cluster_representative_words
  - backend/api/app.py lifespan extension loading svm_pipeline + w2v_model + genre_names + lineage + explain_artifacts + nn_index + params onto app.state with verify_svm_lineage gating
  - .gitattributes LFS line for data/models/*.npz (closes Q7 gap)
  - backend/tests/test_explain_artifacts.py (7 schema tests) + backend/tests/test_app_lifespan.py (5 lifespan contract tests)
  - CLAUDE.md Fresh Machine Setup updated with the new precompute_explain step
affects:
  - 09-03 (classify/explain endpoint -- reads app.state.svm_pipeline / w2v_model / explain_artifacts / nn_index for top-N + nearest-books + per-track ablation + driving-words attribution)
  - 09-04..06 (frontend top-N + explain panel -- the explain endpoint built on this state is what they fetch from)

# Tech tracking
tech-stack:
  added:
    - sklearn.neighbors.NearestNeighbors (n_neighbors=5, metric='euclidean') fitted once at lifespan startup
    - np.savez_compressed atomic-write pattern for build-time .npz artifacts
  patterns:
    - "Build-time artifact emit (precompute_explain) + run-time load (app.state) mirror -- matches the precompute / precompute_viz / precompute_vr family pattern"
    - "Isolated try/except per sub-load in lifespan (Pitfall 3) -- a corrupt explain_artifacts.npz never disables /classify; Redis failure never blocks model loading; missing genre_names never blocks the NN index"
    - "Defaults-first lifespan attribute initialization -- every app.state.X is None before any try/except, so downstream endpoints can rely on `app.state.X is None` checks without AttributeError"
    - "Pitfall 5 drift check: lifespan compares explain_artifacts['metadata']['corpus_hash'] vs app.state.lineage['corpus_hash'] and refuses the NN index on mismatch (logs an error so /explain can 503 cleanly)"

key-files:
  created:
    - backend/pipeline/precompute_explain.py
    - backend/tests/test_explain_artifacts.py
    - backend/tests/test_app_lifespan.py
    - data/models/explain_artifacts.npz
  modified:
    - backend/api/app.py
    - .gitattributes
    - CLAUDE.md

key-decisions:
  - "explain_artifacts.npz schema: six canonical keys (feature_matrix_l2 (151, 600) float32 L2-normed, book_metadata (151,) object array of dicts, per_genre_centroids (8, 150) float32 L2-normed, genre_names (8,) object array, cluster_to_representative_words (200,) object array of 10-word lists, metadata dict with corpus_hash + w2v_model_sha256 + window + k_clusters + alpha + created_utc)"
  - "feature_matrix_l2 is alpha-weighted BEFORE L2-norm so it matches the runtime feature_vec produced by backend.pipeline.features.build_feature_vector -- 09-03 nearest-neighbor lookup is correct without recomputing"
  - "cluster_to_representative_words built via pre-allocated 1-D object array with explicit element assignment (NOT np.array(list_of_lists, dtype=object) which collapses equal-length lists into a 2-D array)"
  - "Lifespan defaults all Phase 9 attributes to None BEFORE any try/except (every endpoint can safely test `app.state.X is None` without AttributeError); each sub-load is isolated so partial failures degrade gracefully"
  - "Atomic write via explain_artifacts.tmp.npz -> os.replace(...) so a precompute crash (KeyboardInterrupt, disk full) never leaves a half-written .npz that crashes the next lifespan boot (T-9-07 mitigation)"

patterns-established:
  - "Build-time artifact = precompute_explain.py -> data/models/*.npz (LFS-tracked) -> lifespan loads once at startup -> request handlers read from app.state -- mirror the precompute / precompute_viz / precompute_vr family pattern"
  - "Drift check on every artifact load: artifact metadata.corpus_hash is cross-checked against SVM lineage.corpus_hash; mismatch refuses the artifact and logs (NOT raises) so the rest of startup proceeds"
  - "verify_svm_lineage is the single gate for calibration_available -- D-40 calibration_method allow-list is enforced at the lifespan boundary, not duplicated per-endpoint"

requirements-completed:
  - DEPTH-04
  - DEPTH-06

# Metrics
duration: ~25min
completed: 2026-05-27
---

# Phase 9 Plan 02: Precompute Explain Artifact + FastAPI Lifespan Wiring Summary

**data/models/explain_artifacts.npz (269.7 KB LFS) emitted with six canonical keys; FastAPI lifespan loads SVM + w2v + lineage + explain_artifacts + fitted NearestNeighbors(5, euclidean) onto app.state with verify_svm_lineage gating and Pitfall 5 drift check; 12 tests green; .gitattributes Q7 gap closed.**

## Performance

- **Duration:** ~25 min (precompute itself runs in ~6 s including w2v load; tests run in ~12 s including a full lifespan boot)
- **Started:** 2026-05-27T03:08:00Z
- **Completed:** 2026-05-27T03:14:00Z
- **Tasks:** 2 atomic (1 precompute + 1 lifespan; each TDD-driven with test-then-impl in a single commit)
- **Files modified:** 7 (4 created + 3 modified)

## Accomplishments

- **D-50 build-time artifact lands.** `data/models/explain_artifacts.npz` is 269.7 KB (compressed), LFS-tracked, and exposes exactly six keys (`feature_matrix_l2`, `book_metadata`, `per_genre_centroids`, `genre_names`, `cluster_to_representative_words`, `metadata`). Built atomically via `os.replace(tmp, final)` so a precompute crash never leaves a half-written file (T-9-07 mitigation).
- **Q7 LFS gap closed.** `.gitattributes` now LFS-tracks `data/models/*.npz` -- verified via `git check-attr filter -- data/models/explain_artifacts.npz` returning `filter: lfs`. The .npz was committed as an LFS object, not a regular blob (T-9-10 mitigation).
- **Q6 lifespan extension lands.** `backend/api/app.py` now loads `svm_pipeline` + `w2v_model` + `genre_names` + `lineage` + `explain_artifacts` + `nn_index` + `params` onto `app.state` at startup. `nn_index` is a fitted `NearestNeighbors(n_neighbors=5, metric='euclidean')` over the 600-D L2-normalized feature matrix -- ready for the 09-03 explain endpoint to call `kneighbors(feat_l2_norm)`.
- **D-40 calibration gate enforced at lifespan boundary.** `verify_svm_lineage(svm_path, window=window)` is called once at startup; `app.state.calibration_available` is set to True only if it returns `(True, ...)`. The 09-03 endpoint reads this bool and 503s on False.
- **Pitfall 5 drift check enforced.** Lifespan compares `explain_artifacts['metadata']['corpus_hash']` against `app.state.lineage['corpus_hash']`; a mismatch sets `nn_index = None` and logs an error (NOT raises) so the rest of startup completes and `/health` stays green (T-9-06 mitigation).
- **Pitfall 3 partial-failure isolation.** Every sub-load (params, SVM, genre_names, w2v, explain_artifacts) lives in its own try/except. A corrupt `explain_artifacts.npz` does NOT disable `/classify`; missing `genre_names.json` does NOT block the NN-index load; Redis failure does NOT block model loading. Every `app.state.X` is initialized to `None` BEFORE any try/except so the rest of the codebase can do `app.state.X is None` checks without AttributeError.
- **CLAUDE.md "Fresh Machine Setup" updated.** Step 3 now references `python -m backend.pipeline.precompute_explain --window 15` so future fresh-machine bootstraps emit the new artifact (Q7 gap-closure follow-through).
- **12 tests green.** 7 schema tests in `backend/tests/test_explain_artifacts.py` cover the artifact-on-disk contract; 5 lifespan contract tests in `backend/tests/test_app_lifespan.py` cover attribute presence, calibration_available gating, NN-index shape + n_neighbors=5, all six artifact keys exposed on `app.state.explain_artifacts`, and `/health` staying 200 in degraded mode.

## Task Commits

Each task was committed atomically (test + impl per task per the TDD plan):

1. **Task 1: precompute_explain.py + explain_artifacts.npz + LFS line + tests** -- `77311c1` (feat)
2. **Task 2: FastAPI lifespan extension + lifespan tests** -- `07f8c34` (feat)

**Plan metadata:** _(this commit)_

## Files Created/Modified

**Created:**
- `backend/pipeline/precompute_explain.py` -- D-50 CLI + reusable helpers (`compute_per_genre_centroids` Q2 verbatim, `compute_cluster_representative_words` top-10-by-cosine).
- `backend/tests/test_explain_artifacts.py` -- 7 tests for the on-disk schema (keys, shapes, L2-normalization, metadata lineage hashes).
- `backend/tests/test_app_lifespan.py` -- 5 tests for the lifespan contract (attribute presence, calibration gate, NN-index shape, artifact key surfacing, /health in degraded mode).
- `data/models/explain_artifacts.npz` -- 269.7 KB LFS-tracked artifact with the six canonical keys and lineage-hash metadata.

**Modified:**
- `backend/api/app.py` -- added `_load_phase9_state(app)` helper invoked from the existing `lifespan` async context manager. Initializes `app.state.{svm_pipeline, w2v_model, genre_names, lineage, calibration_available, explain_artifacts, nn_index, params}` with default-None-first + isolated try/except per sub-load. Pitfall 5 drift check between artifact metadata and SVM lineage.
- `.gitattributes` -- added `data/models/*.npz filter=lfs diff=lfs merge=lfs -text` line (Q7 gap closed; T-9-10 mitigation).
- `CLAUDE.md` -- "Fresh Machine Setup" step 3 references the new `python -m backend.pipeline.precompute_explain --window 15` invocation.

## Decisions Made

- **Six-key .npz schema** (Q2 verbatim): `feature_matrix_l2`, `book_metadata`, `per_genre_centroids`, `genre_names`, `cluster_to_representative_words`, `metadata`. Object arrays used for the heterogeneous-shape values (`book_metadata` is a 1-D array of dicts; `cluster_to_representative_words` is a 1-D array of 10-word lists). `feature_matrix_l2` and `per_genre_centroids` are float32 for storage compactness while keeping enough precision for cosine math (no observed accuracy loss against float64 baseline).
- **Alpha weighting applied at precompute time, NOT at lookup time.** The raw `feature_matrix_w15_k200.npy` on disk has NO alpha applied (scripts/05_build_features.py contract; matches script 06 sweep needs). The runtime `feature_vec` produced by `backend/pipeline/features.py::build_feature_vector` IS alpha-weighted before L2-norming. Therefore precompute_explain.py must mirror the runtime path -- apply `[alpha*topo, (1-alpha)*loc]` BEFORE L2-norm so the NN lookup is correct against runtime inputs without re-deriving alpha at request time.
- **Atomic write via `explain_artifacts.tmp.npz` + `os.replace(...)`.** `np.savez_compressed` auto-appends `.npz` to filenames that don't already end in `.npz`, so the temp filename must be chosen carefully. Initial plan code used `out_path.with_suffix(".npz.tmp")` -- which produced `explain_artifacts.npz.tmp` on disk as `explain_artifacts.npz.tmp.npz`, breaking `os.replace`. Fixed by using `explain_artifacts.tmp.npz` as the temp name.
- **Default-None FIRST in lifespan, then sub-load.** Every `app.state.X` is initialized to its `None` default BEFORE any try/except. This means partial loads (e.g., SVM loads but w2v fails) don't leave `app.state.w2v_model` as an AttributeError-raising missing attribute -- it's `None`, and downstream endpoints can test for that.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan code referenced `book["id"]` but corpus/books.yaml uses `gutenberg_id`**
- **Found during:** Task 1 (Step 3 -- `compute_per_genre_centroids` helper)
- **Issue:** The plan's `compute_per_genre_centroids` body did `gid = book["id"]` but the actual `corpus/books.yaml` schema is `{gutenberg_id, title, author, word_count, source}` -- there is no `id` key. The same `book.get("title")` / `book.get("author")` calls would succeed but `book["id"]` would KeyError on the first iteration, breaking the whole centroid build.
- **Fix:** Used `gid = book.get("gutenberg_id") or book.get("id")` so both the corpus YAML and any future legacy fixture using `id` are accepted. The wider `book_meta_lookup` builder in `precompute_explain_all` got the same treatment.
- **Files modified:** `backend/pipeline/precompute_explain.py` (both `compute_per_genre_centroids` and the main lookup block).
- **Verification:** All 8 genres got non-zero centroids; `pytest test_explain_artifacts.py::test_per_genre_centroids_shape_and_l2` passes (norms ≈ 1.0 within 1e-5 for all 8 rows).
- **Commit:** `77311c1`.

**2. [Rule 1 - Bug] `np.savez_compressed` auto-`.npz`-appends broke the atomic-write pattern**
- **Found during:** Task 1 (Step 6 -- first end-to-end run of `python -m backend.pipeline.precompute_explain --window 15`)
- **Issue:** Plan code used `tmp_path = out_path.with_suffix(".npz.tmp")` which produces `explain_artifacts.npz.tmp` as the intended temp name. But `np.savez_compressed` auto-appends `.npz` if the path doesn't already end in `.npz`, so the actual file written to disk was `explain_artifacts.npz.tmp.npz`, and `os.replace(tmp_path, out_path)` raised `FileNotFoundError: ...explain_artifacts.npz.tmp -> ...explain_artifacts.npz`. The artifact never lands on disk.
- **Fix:** Renamed `tmp_path` to `models_dir / "explain_artifacts.tmp.npz"` so the suffix is already `.npz` and `np.savez_compressed` doesn't append anything -- the file written to disk matches the path `os.replace` is given.
- **Files modified:** `backend/pipeline/precompute_explain.py` (lines around the atomic-write block, plus an explanatory comment).
- **Verification:** Re-ran the precompute; file landed at `data/models/explain_artifacts.npz` (269.7 KB).
- **Commit:** `77311c1`.

**3. [Rule 1 - Bug] `np.array(list_of_equal_length_lists, dtype=object)` collapses to 2-D**
- **Found during:** Task 1 (Step 6 -- first test pass; `test_cluster_representative_words_length` failed with `(200, 10) != (200,)`)
- **Issue:** Plan code used `cluster_to_representative_words = np.array(cluster_words, dtype=object)`. When all inner lists have the same length (10, since `top_n=10`), NumPy collapses to a 2-D `(200, 10)` array of dtype=object containing individual strings, NOT a 1-D `(200,)` array of lists. The test contract (and downstream 09-03 consumers) expect a 1-D object array where each element is a `list[str]`.
- **Fix:** Switched to `np.empty(len(cluster_words), dtype=object)` followed by `for i, words in enumerate(cluster_words): cluster_to_representative_words[i] = words`. The explicit element assignment keeps each list as a Python list inside a 1-D object array.
- **Files modified:** `backend/pipeline/precompute_explain.py` (Section "K-means cluster -> representative words").
- **Verification:** Re-ran the precompute; `cluster_to_representative_words.shape == (200,)` and `isinstance(cw[0], list)` both pass.
- **Commit:** `77311c1`.

---

**Total deviations:** 3 auto-fixed (3 Rule-1 bug fixes in plan-prescribed code that did not match the actual on-disk corpus schema or NumPy API behavior).
**Impact on plan:** All three are correctness-required -- bug #1 would have produced an artifact with all-zero per-genre centroids (KeyError caught only on the corpus loop), bug #2 would have crashed before writing the artifact at all, bug #3 would have shipped an artifact with the wrong schema and broken the downstream 09-03 consumer. No scope creep; the plan's intent was preserved verbatim.

## Issues Encountered

- **3 books skipped during centroid computation.** `Skipping {68283, 5200, 8395}: per-book TF-IDF files missing` -- these are the same 3 v2 books that fell below `min_unique_words=3000` during Phase 8 preprocessing (matches the 154→151 effective-corpus pattern that 09-01 SUMMARY already documented). NOT a regression; expected behavior given the v2 corpus state.
- **Pre-existing `test_corpus_books_returns_list` failure.** Verified pre-existing by stashing my changes and re-running: `GET /corpus/books` returns 404 under the test client without my changes too. Out-of-scope for plan 09-02; tracked separately, recommend addressing in a follow-up quick task.
- **Redis connection-retry warnings in test output.** Expected: tests run without Redis on localhost:6379 -- the existing arq pool gracefully retries 5 times then falls back to `app.state.arq_pool = None`. The Phase 9 sub-load runs AFTER the Redis section so the warnings don't affect the lifespan contract tests.

## Lifespan Memory Footprint

Observed at lifespan startup:
- `svm_pipeline` (joblib): ~5 MB
- `w2v_model` (gensim Word2Vec): ~70 MB
- `explain_artifacts.npz` (in-memory dict): ~3 MB unpacked
- `nn_index` (NearestNeighbors with stored 151 × 600 training matrix): ~0.4 MB
- **Total Phase 9 addition: ~78 MB**

This matches the Q6 budget (~75 MB) and stays well within Railway's 1 GB worker budget (T-9-09 acceptable per CONTEXT.md).

## User Setup Required

None -- the precompute is a build-time CLI invocation (already documented in CLAUDE.md). No external service configuration required.

## Next Phase Readiness

**Ready for Plan 09-03 (DEPTH-07 entropy badge + Wave-2 explain endpoint logic):**

- `app.state.svm_pipeline` is the calibrated SVM whose `predict_proba(...)` 09-03 needs for the two zero-ablation calls (D-44 per-track contributions) and for top-N + entropy.
- `app.state.nn_index` is the fitted `NearestNeighbors(5, euclidean)` 09-03 calls via `kneighbors(feat_l2_norm)` for D-45 nearest-books.
- `app.state.explain_artifacts['per_genre_centroids']` is the `(8, 150)` L2-normed w2v-centroid matrix 09-03 uses for D-46 driving-words nearest-genre attribution.
- `app.state.explain_artifacts['book_metadata']` is the aligned-to-feature-matrix-rows array 09-03 uses to turn neighbor indices into human-readable {title, author, genre} dicts.
- `app.state.calibration_available` is the bool 09-03 checks at request time -- False -> 503 with the explicit retrain instruction (per Q8 graceful-fallback rule).
- `app.state.lineage['corpus_hash']` + `app.state.lineage['w2v_model_sha256']` are available for 09-03's explain cache key (`explain:{feature_vec_hash}:{model_hash}` per D-48).

**Anticipated additive extension to lifespan in 09-03:** likely a small classify/explain endpoint wiring + Redis `feature_vec:{job_id}` write in the worker (D-47). The current `_load_phase9_state` is intentionally scoped to "load state into app.state" -- 09-03 adds endpoint logic that READS that state without needing to modify the lifespan function itself.

## Self-Check

Verified deliverables on disk:
- `backend/pipeline/precompute_explain.py` -- FOUND (4 public symbols: `compute_per_genre_centroids`, `compute_cluster_representative_words`, `precompute_explain_all`, `main`).
- `backend/tests/test_explain_artifacts.py` -- FOUND (7 tests passing).
- `backend/tests/test_app_lifespan.py` -- FOUND (5 tests passing).
- `data/models/explain_artifacts.npz` -- FOUND (269.7 KB; LFS-tracked confirmed via `git check-attr filter`).
- `.gitattributes` contains `data/models/*.npz filter=lfs diff=lfs merge=lfs -text` -- FOUND.
- `CLAUDE.md` Fresh Machine Setup contains the new precompute_explain line -- FOUND.

Verified commits exist:
- `77311c1` -- feat(09-02): land precompute_explain artifact + LFS tracking (D-50) -- FOUND.
- `07f8c34` -- feat(09-02): extend FastAPI lifespan to load Phase 9 ML state (Q6) -- FOUND.

Verified test suite:
- `pytest backend/tests/test_explain_artifacts.py backend/tests/test_app_lifespan.py -x -q` -> 12 passed, 0 failed.

Verified artifact schema (all six canonical keys present, lineage metadata embedded):
- `feature_matrix_l2`: (151, 600) float32, all rows L2-normed within 1e-5.
- `book_metadata`: (151,) object array; each element has keys {`gutenberg_id`, `title`, `author`, `genre`}.
- `per_genre_centroids`: (8, 150) float32, all rows L2-normed within 1e-5.
- `genre_names`: 8 v2 genres in expected order.
- `cluster_to_representative_words`: (200,) object array; first cluster sample = `['adulterous', 'palliated', 'destines']`.
- `metadata`: dict with `corpus_hash=3f4fe9400b023f0847bc6975da4f3793fdd3b4db4dfc44979d43cc9b75a869d9` and `w2v_model_sha256=cd81f9e69cb2d12799c62b5d06a03870e511ff35b044d5301d78f6f75cde5b1a` -- matches deployed SVM lineage exactly.

## Self-Check: PASSED

---
*Phase: 09-classification-depth*
*Completed: 2026-05-27*
