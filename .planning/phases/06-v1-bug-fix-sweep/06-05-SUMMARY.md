---
phase: 06-v1-bug-fix-sweep
plan: 05
subsystem: backend/cache
tags: [BUG-05, cache-key, corpus-hash, w2v-model-sha256, svm-lineage, eager-flush, PITFALLS-1]
requires:
  - 06-01 (planning protection — pre-commit hook lets us land planning docs cleanly)
  - 06-02 (persistence-diagram dot scaling — independent; runs in parallel build order)
  - 06-03 (BookSlider endpoint pattern — proved out the additive-endpoint flow)
  - 06-04 (H₂/H₀ removal — narrows the homology_dims surface area before cache-key change)
provides:
  - cache_key() requires keyword-only corpus_hash + w2v_model_sha256 (TypeError on omission)
  - backend/cache/lineage.py with file_sha256 (memoized), corpus_hash, w2v_model_sha256,
    write_svm_lineage, verify_svm_lineage helpers
  - Every backend cache_key() call site (39 in total) passes both lineage args
  - SVM training writes svm_pipeline.joblib.lineage.json sidecar at precompute time
  - scripts/flush_v1_cache.py one-shot eager-flush utility (with --dry-run / --yes)
  - .planning/phases/06-v1-bug-fix-sweep/06-05-MIGRATION-NOTES.md operator runbook
affects:
  - Phase 7 (Corpus Sourcing Research Spike) — research-only; nothing breaks
  - Phase 8 (Corpus Expansion) — unblocks safe retrain workflow; CONTEXT D-22..D-25 implemented
  - Phase 9 (Classification Depth) — SVM lineage sidecar provides the input contract
    explainability and top-N need to trust the SVM coordinate system
  - Phase 10 (Visual Polish) — no impact
tech-stack:
  added:
    - "hashlib stream-sha256 over Word2Vec model file (~70 MB) with (path,mtime,size) memoization"
    - "Keyword-only TypeError-on-omission contract on cache_key() — no silent backward-compat path"
    - "JSON lineage sidecar next to SVM joblib (defense in depth on top of cache key)"
  patterns:
    - "Lineage computed ONCE at function entry, passed through to every cache_key() call in that scope"
    - "Module-level _HASH_CACHE keyed on (path, mtime_ns, size) so request-time hashes stay cheap"
    - "Hermetic smoke tests that monkeypatch corpus_hash + w2v_model_sha256 so D-24 doesn't need a real W2V model"
    - "Eager flush over migration script — eliminates the 'did the migrator handle corner case X?' risk class"
key-files:
  created:
    - "Desktop/CC/Word2Vec Genre Analyser/backend/cache/lineage.py"
    - "Desktop/CC/Word2Vec Genre Analyser/backend/tests/test_lineage.py"
    - "Desktop/CC/Word2Vec Genre Analyser/backend/tests/test_lineage_smoke.py"
    - "Desktop/CC/Word2Vec Genre Analyser/scripts/flush_v1_cache.py"
    - "Desktop/CC/Word2Vec Genre Analyser/.planning/phases/06-v1-bug-fix-sweep/06-05-PLAN.md"
    - "Desktop/CC/Word2Vec Genre Analyser/.planning/phases/06-v1-bug-fix-sweep/06-05-MIGRATION-NOTES.md"
  modified:
    - "Desktop/CC/Word2Vec Genre Analyser/backend/cache/store.py"
    - "Desktop/CC/Word2Vec Genre Analyser/backend/pipeline/precompute.py"
    - "Desktop/CC/Word2Vec Genre Analyser/backend/pipeline/precompute_viz.py"
    - "Desktop/CC/Word2Vec Genre Analyser/backend/pipeline/precompute_vr.py"
    - "Desktop/CC/Word2Vec Genre Analyser/backend/api/routes/corpus.py"
    - "Desktop/CC/Word2Vec Genre Analyser/backend/tests/test_cache.py"
    - "Desktop/CC/Word2Vec Genre Analyser/backend/tests/test_classify.py"
    - "Desktop/CC/Word2Vec Genre Analyser/.planning/phases/06-v1-bug-fix-sweep/deferred-items.md"
decisions:
  - "Keyword-only cache_key args (corpus_hash + w2v_model_sha256) over positional or default-value — forces every call site to express lineage intent explicitly; no silent backward-compat path that would re-introduce the v1 footgun"
  - "Memoize file_sha256 on (path, mtime_ns, size) at module level — hashing the 70 MB Word2Vec model on every /api/corpus/books/{id}/results call would add ~250 ms per request; mtime invalidation naturally tracks operator changes"
  - "Sidecar JSON next to the SVM file (svm_pipeline.joblib.lineage.json) over an embedded field — lets verify_svm_lineage check provenance WITHOUT loading the full joblib (which is the part we're trying to gate)"
  - "Eager flush via scripts/flush_v1_cache.py over a migration script (CONTEXT D-23) — operator runs one command, ~20 min recompute follows; eliminates the entire risk class of migration-script edge-case bugs"
  - "verify_svm_lineage helper is available but NOT wired into FastAPI startup — Phase 8 will own that gate; v2.0 ships the contract without the enforcement surface"
metrics:
  duration: "~16m (11:23 UTC to 11:39 UTC)"
  completed: 2026-05-22
  tasks_completed: 3 / 3
  files_created: 6 (plus PLAN.md committed before task 1)
  files_modified: 8
  commits: 5 (e960d66 PLAN + 5761b24 RED + 3ad45a9 GREEN + c21fb3f migrate + f71965e flush/sidecar/smoke)
---

# Phase 6 Plan 05: BUG-05 — Cache Key + corpus_hash + w2v_model_sha256 Summary

**One-liner:** Latent v1 cache-key footgun closed before Phase 8 retrain — every backend `cache_key()` call now mixes in `corpus_hash` (sha256 of `corpus/books.yaml`) and `w2v_model_sha256` (sha256 of `data/models/word2vec_w{window}.model`) as required keyword-only args, with an eager-flush script for v1 artifacts, an SVM lineage sidecar pinned at training time, and 8 hermetic smoke tests proving cache-miss-on-retrain works end-to-end.

## Implementation Approach

Three atomic feat/test commits, one PLAN commit up front, one TDD RED commit. All share the same north star: **a corpus change OR a W2V retrain MUST invalidate every downstream artifact — and that contract must be enforced at the type system, not at the call site.**

### Task 1 — TDD: cache_key() lineage args + lineage helpers (commits 5761b24 RED, 3ad45a9 GREEN)

**RED (5761b24):**
- `backend/tests/test_cache.py` — bumped all six existing tests to pass dummy lineage; added five new assertions:
  - `test_cache_key_includes_corpus_hash` — different `corpus_hash` produces different keys.
  - `test_cache_key_includes_w2v_model_sha256` — different `w2v_model_sha256` produces different keys.
  - `test_cache_key_corpus_hash_required` — omitting `corpus_hash` raises `TypeError`.
  - `test_cache_key_w2v_model_sha256_required` — omitting `w2v_model_sha256` raises `TypeError`.
  - `test_cache_key_order_invariant_still_holds_with_lineage` — param ordering remains irrelevant.
- `backend/tests/test_lineage.py` (new) — six tests covering `file_sha256` (matches hashlib, streams large files, returns 64-char hex), `corpus_hash` (equals sha256 of books.yaml), `w2v_model_sha256` (equals sha256 of the model file, raises on missing window).
- Pytest output: **14 failed, 3 passed**. The 3 passing were the required-kwarg tests (right outcome, wrong reason — they were passing because the old signature didn't accept those kwargs).

**GREEN (3ad45a9):**
- `backend/cache/store.py` — `cache_key(step_name, params, *, corpus_hash, w2v_model_sha256)`. Lineage flows into the canonical JSON payload under reserved keys `__corpus_hash__` and `__w2v_model_sha256__`. `sort_keys=True` keeps params order-invariant.
- `backend/cache/lineage.py` (new) — `file_sha256(path)` streams 64 KB chunks; `corpus_hash()` and `w2v_model_sha256(window)` resolve repo-root paths; `write_svm_lineage(svm_path, ...)` and `verify_svm_lineage(svm_path, ...)` round-trip the sidecar.
- Pytest output: **17 passed in 0.18s.**

### Task 2 — Migrate every cache_key() call site (commit c21fb3f)

Lineage must be computed ONCE per function (so we don't re-hash the 70 MB W2V model in a hot loop) and passed through to every `cache_key()` call in that scope. Sites updated:

| File | Sites | Strategy |
|---|---|---|
| `backend/pipeline/precompute.py` | 2 | Compute lineage once at top; pass `corpus_hash=lineage_ch, w2v_model_sha256=lineage_wh` to both calls. |
| `backend/pipeline/precompute_viz.py` | 16 | `precompute_viz`, `_load_tfidf_by_genre`, `precompute_persistence_images`, `precompute_persistence_diagrams` each compute lineage once at entry. The four module-level `get_cached_*` helpers (`get_cached_scatter`, `get_cached_tfidf_genre`, `get_cached_tfidf_book`, `get_cached_persistence_image`, `get_cached_persistence_diagram`) compute lineage inline — they're called at request time, where the memoized `file_sha256` keeps the cost trivial. |
| `backend/pipeline/precompute_vr.py` | 3 | Lineage computed once at top of `_precompute_vr_for_projection`; `get_cached_vr_edges` uses inline-memoized lookup. |
| `backend/api/routes/corpus.py` | 1 | Inline-memoized lineage at request time; route docstring updated. |
| `backend/tests/test_classify.py` | 1 | Integration test imports `corpus_hash`/`w2v_model_sha256` and computes the SAME values the route uses, so the cached entry is reachable. |

Memoization added to `backend/cache/lineage.py`:

```python
_HASH_CACHE: dict[tuple[str, float, int], str] = {}

def file_sha256(path):
    stat = path.stat()
    key = (str(path.resolve()), stat.st_mtime_ns, stat.st_size)
    if key in _HASH_CACHE:
        return _HASH_CACHE[key]
    # ... stream ... store ...
```

Keyed on `(path, mtime_ns, size)` so any operator-visible change to the file invalidates naturally — no filesystem watcher needed.

**Final grep verification:**

```
$ grep -rn "cache_key(" backend/ --include="*.py" | grep -v "def cache_key\|lineage.py\|store.py:15" | wc -l
39        # 39 total call sites: 21 in src, 16 in tests, 2 in pytest fixtures.

$ grep -rn "cache_key(" backend/ --include="*.py" | grep -v "corpus_hash\|def cache_key\|lineage.py\|store.py:15"
# Empty -- no orphan call sites without lineage.
```

### Task 3 — Eager flush + SVM lineage sidecar + smoke test (commit f71965e)

**Eager flush (`scripts/flush_v1_cache.py`):**

- Idempotent: re-running on an empty cache prints "nothing to flush".
- `--dry-run` reports byte-count + file-count without touching the filesystem.
- `--yes` bypasses the confirm prompt for CI / Docker entrypoints.
- Prints the recompute next-steps (precompute → precompute_viz → precompute_vr) on success.

**SVM lineage sidecar (D-25):**

`backend/pipeline/precompute.py` now writes `data/models/svm_pipeline.joblib.lineage.json` next to the joblib at training time:

```json
{
  "svm_file": "svm_pipeline.joblib",
  "w2v_model_sha256": "<sha256 of the W2V model in use>",
  "corpus_hash": "<sha256 of corpus/books.yaml>",
  "window": 15,
  "k_clusters": 100,
  "alpha": 0.5,
  "feature_normalization": {"structure": "l2", "location": "l2"},
  "created_utc": "2026-05-22T11:38:42Z",
  "created_by": "Plan 06-05 (BUG-05)"
}
```

`verify_svm_lineage(svm_path, window=...)` returns `(False, reason)` on any of: missing sidecar, corpus_hash mismatch, w2v_model_sha256 mismatch. **Phase 8 will wire this into FastAPI startup**; v2.0 ships the helper without the gate.

**Smoke test (`backend/tests/test_lineage_smoke.py`, 8 tests):**

| # | Test | What it proves |
|---|---|---|
| 1 | `test_cache_miss_when_w2v_model_hash_changes` | Same step + params + corpus, different W2V model → different key + `cache_exists` returns False. The PITFALLS §1 scenario. |
| 2 | `test_cache_miss_when_corpus_hash_changes` | Same step + params + W2V, different corpus → different key + `cache_exists` False. |
| 3 | `test_cache_hit_when_lineage_unchanged` | Positive control: same lineage → cache hit. |
| 4 | `test_svm_lineage_verify_matches` | `write_svm_lineage` then `verify_svm_lineage` agree when nothing changed. |
| 5 | `test_svm_lineage_verify_mismatch_w2v` | Pretend retrain → `verify_svm_lineage` returns `(False, "w2v_model_sha256 mismatch: ...")`. |
| 6 | `test_svm_lineage_verify_mismatch_corpus` | Pretend corpus change → returns `(False, "corpus_hash mismatch: ...")`. |
| 7 | `test_svm_lineage_verify_missing_sidecar` | No sidecar on disk → `(False, "lineage sidecar missing: ...")`. |
| 8 | `test_svm_lineage_sidecar_contents` | All D-25 required fields present (`w2v_model_sha256`, `corpus_hash`, `window`, `k_clusters`, `alpha`, `feature_normalization`, `created_by`). |

All 8 pass in 0.07s — hermetic, no real W2V model needed.

## Acceptance Criteria Status

| Criterion | Status |
|---|---|
| `cache_key()` requires keyword-only `corpus_hash` + `w2v_model_sha256` | PASS — `TypeError` on omission verified by two tests |
| `backend/cache/lineage.py` exposes `file_sha256`, `corpus_hash`, `w2v_model_sha256`, `write_svm_lineage`, `verify_svm_lineage` | PASS — module imports cleanly |
| Every `cache_key()` call site passes both lineage args | PASS — 39 sites, 0 orphans (grep confirmed) |
| `cache_key()` is order-invariant on `params` (same lineage) | PASS — `test_cache_key_order_invariant_still_holds_with_lineage` |
| Eager flush script exists and is idempotent | PASS — `scripts/flush_v1_cache.py --dry-run` ran clean |
| SVM lineage sidecar writer + verifier helpers exist | PASS — 5 sidecar tests in `test_lineage_smoke.py` |
| `data/cache/` is in `.gitignore` | PASS — already there since v1 |
| `06-05-MIGRATION-NOTES.md` documents deploy + rollback for operators | PASS |
| Smoke test for cache-miss-on-retrain (D-24) | PASS — 8/8 in `test_lineage_smoke.py` |
| Full in-scope pytest suite green | PASS — 46/46 (test_cache + test_lineage + test_lineage_smoke + test_pipeline + test_precompute_vr); test_persistence_api 9/9 still passes |

## Diagrams

```
                       ┌──────────────────────────────┐
                       │  v1 cache_key (the footgun)  │
                       │                              │
                       │  sha256(step_name, params)   │
                       │                              │
                       │  -- corpus retrain --> SAME  │
                       │     KEY -- STALE HIT         │
                       │  -- W2V retrain ----> SAME   │
                       │     KEY -- STALE HIT         │
                       └─────────────┬────────────────┘
                                     │
                       Plan 06-05    │ PITFALLS.md §1 / CONTEXT D-22
                                     ▼
                ┌────────────────────────────────────────────┐
                │  v2 cache_key (the fix)                    │
                │                                            │
                │  sha256(                                   │
                │    step_name: params,                      │
                │    __corpus_hash__: sha256(books.yaml),    │
                │    __w2v_model_sha256__:                   │
                │      sha256(word2vec_w{window}.model),     │
                │  )                                         │
                │                                            │
                │  -- corpus retrain --> DIFFERENT KEY       │
                │  -- W2V retrain ----> DIFFERENT KEY        │
                │                                            │
                │  + svm_pipeline.joblib.lineage.json (D-25) │
                │  + scripts/flush_v1_cache.py (D-23)        │
                │  + verify_svm_lineage helper (D-25)        │
                └────────────────────────────────────────────┘
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Lineage hashing on every API request would add ~250 ms per call**

- **Found during:** Task 2 review of `backend/api/routes/corpus.py:get_book_results`.
- **Issue:** Streaming sha256 over a 70 MB Word2Vec model is ~250 ms on a warm SSD. The `/api/corpus/books/{id}/results` endpoint is supposed to serve from disk cache in well under 100 ms. Without memoization, every request would pay the lineage hash cost — turning a 50 ms hot endpoint into a 300 ms one.
- **Fix:** Added a module-level `_HASH_CACHE: dict[(str, float, int), str]` in `backend/cache/lineage.py`. `file_sha256` looks up by `(resolved_path, mtime_ns, size)`. Any operator-visible change to the file (rebuild, `touch`, content edit) invalidates the cache entry naturally — no filesystem watcher needed.
- **Files modified:** `backend/cache/lineage.py`.
- **Commit:** `c21fb3f`.

**2. [Rule 1 — Bug, pre-existing, logged for deferral] `backend/tests/test_classify.py` uses `/corpus/...` paths but routes are at `/api/corpus/...`**

- **Found during:** Task 2 verification run.
- **Issue:** Three tests in `test_classify.py` (`test_corpus_book_results_not_found`, `test_classify_returns_job_id_for_valid_file`, `test_corpus_book_results_found_after_cache`) call paths that miss the `/api/` prefix. Two also depend on a running Redis instance (arq backend). Pre-existing on master HEAD (`a922d1f`) with all Plan 06-05 changes stashed.
- **Fix:** Logged to `.planning/phases/06-v1-bug-fix-sweep/deferred-items.md` under the Plan 06-05 entry. Updated the in-scope `cache_key()` call in `test_corpus_book_results_found_after_cache` for future rebasing convenience (so the test will work once the path prefix is fixed).
- **Why deferred:** Same root cause as the `test_api.py` (Plan 06-03) and `test_viz.py` (Plan 06-04) deferrals — `/api/` prefix migration was never rebased into these test files. Out of scope for Plan 06-05's cache-key surface.

### Out-of-scope discoveries (logged to deferred-items.md)

- `backend/tests/test_classify.py` — 3 tests pre-existing failure (path prefix + Redis dep).

### File-list deviation

The PLAN.md listed `data/models/svm_pipeline.lineage.json` (without the doubled extension); the actual sidecar lands at `data/models/svm_pipeline.joblib.lineage.json` (= `svm_path.with_suffix(svm_path.suffix + '.lineage.json')`). This matches the conventional `joblib` neighbor-file pattern and was the smaller-surface change vs. stripping the `.joblib` first. The sidecar's `svm_file` field still pins the canonical file name, so the renaming is self-documenting.

## Acceptance Criteria from PLAN.md

| Plan criterion | Status |
|---|---|
| All five new test_cache.py tests pass | PASS |
| backend/cache/lineage.py exists with all helpers | PASS |
| `grep -n "def cache_key" backend/cache/store.py` shows new signature | PASS |
| Every cache_key() caller passes lineage; no orphan sites | PASS (39 sites, grep verified) |
| All in-scope tests pass | PASS (46 total) |
| backend/tests/test_lineage_smoke.py passes (4+ tests) | PASS (8 tests, all green) |
| scripts/flush_v1_cache.py exists and dry-runs cleanly | PASS |
| 06-05-MIGRATION-NOTES.md documents the migration | PASS |
| .gitignore contains `data/cache/` | PASS (pre-existing since v1) |

## Smoke Test (manual)

The smoke tests in `backend/tests/test_lineage_smoke.py` are hermetic and exercise the load-bearing cache-invalidation paths without needing a real Word2Vec model or live SVM file. Visual verification of the API endpoints (e.g. that `/api/corpus/books/{id}/results` still returns cached data) requires a populated cache and a live Redis instance, neither of which are available in this sandbox — that smoke test belongs in the operator's deploy procedure (see `06-05-MIGRATION-NOTES.md` step 5).

## Known Stubs

None. The `verify_svm_lineage` helper is intentionally not yet wired into FastAPI startup — that gate belongs to Phase 8 per the plan's "What this plan did NOT do" section. It is a contract awaiting a consumer, not a stub.

## Self-Check

- Commits exist:
  - `e960d66` (PLAN.md) — `git log` confirms.
  - `5761b24` (Task 1 RED) — `git log` confirms.
  - `3ad45a9` (Task 1 GREEN) — `git log` confirms.
  - `c21fb3f` (Task 2 migration) — `git log` confirms.
  - `f71965e` (Task 3 flush + sidecar + smoke) — `git log` confirms.
- All `files_created` and `files_modified` from the plan are present:
  - `backend/cache/lineage.py` — exists.
  - `backend/tests/test_lineage.py` — exists.
  - `backend/tests/test_lineage_smoke.py` — exists.
  - `scripts/flush_v1_cache.py` — exists.
  - `.planning/phases/06-v1-bug-fix-sweep/06-05-PLAN.md` — exists.
  - `.planning/phases/06-v1-bug-fix-sweep/06-05-MIGRATION-NOTES.md` — exists.
  - All modified files compile + import cleanly.
- Acceptance grep criteria pass (zero orphan call sites).
- In-scope tests all green (46 passed + 9 persistence-api passed).

## Self-Check: PASSED
