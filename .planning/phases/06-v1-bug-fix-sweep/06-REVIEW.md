---
phase: 06-v1-bug-fix-sweep
reviewed: 2026-05-22T00:00:00Z
depth: standard
files_reviewed: 47
files_reviewed_list:
  - .gitattributes
  - .githooks/pre-commit
  - .github/workflows/planning-files-check.yml
  - .gitignore
  - backend/api/models.py
  - backend/api/routes/corpus.py
  - backend/api/routes/viz.py
  - backend/cache/lineage.py
  - backend/cache/store.py
  - backend/pipeline/homology.py
  - backend/pipeline/precompute.py
  - backend/pipeline/precompute_viz.py
  - backend/pipeline/precompute_vr.py
  - backend/pipeline/tests/test_precompute_vr.py
  - backend/tests/test_cache.py
  - backend/tests/test_classify.py
  - backend/tests/test_corpus_genres_books.py
  - backend/tests/test_corpus_models.py
  - backend/tests/test_lineage.py
  - backend/tests/test_lineage_smoke.py
  - backend/tests/test_persistence_api.py
  - backend/tests/test_pipeline.py
  - backend/worker/jobs.py
  - corpus/books.yaml
  - data/corpus_metadata.json
  - frontend/src/components/compare/__tests__/CompareHeatmaps.test.tsx
  - frontend/src/components/explanation/steps/Step3PointCloud.tsx
  - frontend/src/components/explanation/steps/Step4Homology.tsx
  - frontend/src/components/settings/SlowTierParams.tsx
  - frontend/src/components/settings/__tests__/SettingsDrawer.test.tsx
  - frontend/src/components/sidebar/BookSlider.tsx
  - frontend/src/components/sidebar/Sidebar.tsx
  - frontend/src/components/sidebar/__tests__/SlowTierParams.test.tsx
  - frontend/src/components/topology/HomologyTabs.tsx
  - frontend/src/components/topology/PersistenceDiagram.tsx
  - frontend/src/components/topology/__tests__/HomologyTabs.test.tsx
  - frontend/src/components/topology/__tests__/PersistenceDiagram.test.tsx
  - frontend/src/components/topology/__tests__/PersistenceHeatmap.test.tsx
  - frontend/src/hooks/useCorpusBooks.test.ts
  - frontend/src/hooks/useCorpusBooks.ts
  - frontend/src/stores/visualizationStore.test.ts
  - frontend/src/stores/visualizationStore.ts
  - scripts/02_preprocess.py
  - scripts/build_corpus_metadata.py
  - scripts/flush_v1_cache.py
  - scripts/install-hooks.sh
findings:
  critical: 0
  warning: 5
  info: 7
  total: 12
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-05-22T00:00:00Z
**Depth:** standard
**Files Reviewed:** 47
**Status:** issues_found

## Summary

Phase 06 is a bug-fix sweep covering BUG-01..BUG-05. The core fixes are well executed and well tested:

- **BUG-01 (H₁ honesty)** — `compute_book_homology` and `precompute_vr_edges` both assert `homology_dims == [1]`; FastAPI uses `Annotated[Literal[1], BeforeValidator]` to enforce `dim=1` at the query layer (`backend/api/routes/viz.py:29-37`); store + UI types narrowed to `HomologyDim = 1`. Strong end-to-end enforcement with negative tests.
- **BUG-02 (PersistenceDiagram)** — sqrt dot-scaling implemented per D-06, infinity-strip per D-07, axis bounds computed from finite values only. Tests cover finite-only, finite+infinity, all-infinity, and empty fixtures.
- **BUG-03 (BookSlider wiring)** — `GET /api/corpus/genres/{genre}/books` returns full per-book metadata via `CorpusBookFull`; `useCorpusBooks` React Query hook with `staleTime: Infinity`; BookSlider consumes the new schema. Allowlist on path parameter blocks traversal.
- **BUG-04 (planning-file zero-byte trap)** — Pre-commit hook rejects 0-byte `.planning/**/*.md`, snapshots ROADMAP/STATE/PROJECT into `.planning/.snapshots/`. CI backstop runs the same check on push/PR. `.gitattributes` strips LFS from planning markdown; `.gitignore` excludes snapshot dir.
- **BUG-05 (cache lineage)** — `cache_key` requires keyword-only `corpus_hash` and `w2v_model_sha256`; lineage hashes are memoized on (path, mtime, size); SVM sidecar pins training-data lineage; smoke tests verify retrain/corpus-change invalidation.

Findings below are non-blocking quality issues. No critical bugs, no security vulnerabilities, no broken fixes.

## Warnings

### WR-01: `verify_svm_lineage` crashes on null lineage values in sidecar

**File:** `backend/cache/lineage.py:153-164`
**Issue:** When the sidecar JSON contains `"corpus_hash": null` (or any non-string), the verification correctly identifies a mismatch — but the error formatter then computes `payload.get("corpus_hash", "<missing>")[:12]`. `payload.get` returns `None` (because the key exists with value `null`), and `None[:12]` raises `TypeError` instead of returning a useful diagnostic. The `<missing>` default is only used when the key is absent.
**Fix:**
```python
sidecar_value = payload.get('corpus_hash')
if sidecar_value != current_corpus:
    label = (sidecar_value[:12] + '...') if isinstance(sidecar_value, str) else '<missing>'
    return False, f'corpus_hash mismatch: sidecar={label} current={current_corpus[:12]}...'
```
Apply the same defensive pattern to the `w2v_model_sha256` branch.

### WR-02: `verify_svm_lineage` doesn't handle corrupted sidecar JSON

**File:** `backend/cache/lineage.py:147-148`
**Issue:** `json.load(f)` is called without try/except. A truncated or malformed sidecar (e.g., a partial write killed by Ctrl-C) raises `json.JSONDecodeError`, which propagates out of the verifier. The docstring promises `(bool, str)`, so the caller cannot uniformly handle a "lineage check failed" signal. Defense-in-depth (D-25) is partly undermined: the caller might catch the exception and continue, or might not catch it and crash the server at request time.
**Fix:**
```python
try:
    with open(sidecar, encoding='utf-8') as f:
        payload = json.load(f)
except (OSError, json.JSONDecodeError) as exc:
    return False, f'lineage sidecar unreadable: {exc.__class__.__name__}: {exc}'
```

### WR-03: Inconsistent `allow_pickle` flag for the same diagram files

**File:** `backend/pipeline/precompute_viz.py:400, 442, 529, 560`
**Issue:** `precompute_viz.py` loads `diagrams_{gid}_w{window}.npy` with `allow_pickle=True` in four places. The same files are loaded by `backend/pipeline/precompute.py:123` with `allow_pickle=False` and `np.save` at the producer site stores plain `float32` arrays — so pickling is never required. `allow_pickle=True` is a known unsafe-deserialization vector in numpy (arbitrary code execution if an attacker can substitute the file). Currently low-risk because these files are local pipeline artifacts, but the inconsistency is a footgun: any future operator who treats `data/features/` as a publishable artifact (mounted volume, downloaded cache) inherits the risk.
**Fix:** Change all four `precompute_viz.py` sites to `allow_pickle=False`. If numpy complains about object arrays at runtime, the `np.save` in `04_compute_homology.py` needs to be fixed first (canonicalize to homogeneous float arrays).

### WR-04: `cache_key` canonicalization silently collides if `step_name` is `"__corpus_hash__"` or `"__w2v_model_sha256__"`

**File:** `backend/cache/store.py:42-50`
**Issue:** The canonical JSON is built as
```python
{step_name: params, '__corpus_hash__': corpus_hash, '__w2v_model_sha256__': w2v_model_sha256}
```
If `step_name == '__corpus_hash__'`, Python's dict literal stores the second binding (the lineage string), silently dropping `params` from the keying material. Two different parameter sets would then collide. All current call sites use safe names (`feature_vector`, `book_result`, `scatter`, `tfidf_book`, `tfidf_genre`, `persistence_image`, `persistence_image_book`, `persistence_diagram`, `persistence_diagram_book`, `vr_edges`, `viz_neighbors`), so this is latent — but the contract is fragile.
**Fix:** Reserve and validate the namespace:
```python
RESERVED_KEYS = {'__corpus_hash__', '__w2v_model_sha256__'}
if step_name in RESERVED_KEYS:
    raise ValueError(f'step_name {step_name!r} collides with reserved lineage key')
```
Alternatively, nest params under a single reserved key (`{'step': step_name, 'params': params, 'lineage': {...}}`).

### WR-05: BookSlider may briefly display the previous book when switching genres

**File:** `frontend/src/components/sidebar/BookSlider.tsx:30-44`
**Issue:** Two `useEffect` hooks coordinate the genre switch:
1. Line 33-39 watches `[debouncedIdx, books, setSelectedBook]` and calls `setSelectedBook(books[debouncedIdx])`.
2. Line 42-44 watches `[selectedGenre]` and calls `setLocalIdx(0)`.

When the genre changes, `localIdx` is reset to 0 immediately, but `debouncedIdx` lags by the 200ms debounce window. During that window, if `books` (the new genre's data from React Query) arrives, effect #1 runs with the stale `debouncedIdx` (say, 9) against the new `books` array. If `books.length > debouncedIdx`, `setSelectedBook` fires with the NEW genre's book at the OLD index — i.e., the wrong selection. The downstream PersistenceDiagram + DetailPanel would briefly render the wrong book for up to ~200ms.

The `safeIdx = Math.min(localIdx, books.length - 1)` shown in the slider UI is correct, but the store's `selectedBookId` (which other components read) is driven by `debouncedIdx`, not `safeIdx`.
**Fix:** Either drive the `setSelectedBook` effect from `safeIdx` instead of `debouncedIdx`, or also reset the debounced value on genre change:
```typescript
useEffect(() => {
  if (books.length > 0 && books[debouncedIdx]) {
    setSelectedBook(bookId(books[debouncedIdx]))
  } else if (books.length > 0) {
    // Index out of range -- clamp to a valid book rather than clearing.
    setSelectedBook(bookId(books[0]))
  } else {
    setSelectedBook(null)
  }
}, [debouncedIdx, books, setSelectedBook])
```
Or, more cleanly, derive the canonical index in one place and pass it to both the store and the UI.

## Info

### IN-01: Dead variable in `precompute_all`

**File:** `backend/pipeline/precompute.py:62`
**Issue:** `homology_dims = params['homology']['homology_dimensions']` is loaded but never referenced — diagrams are loaded from disk by `04_compute_homology.py`'s output, not recomputed here. Mildly misleading because the assignment looks load-bearing.
**Fix:** Delete the line, or pass it to a future assertion that the loaded diagrams contain only dim=1 rows.

### IN-02: Stylistically unusual length check

**File:** `backend/pipeline/precompute_vr.py:94`
**Issue:** `if 1 < len(result['dgms']):` is harder to read than `if len(result['dgms']) > 1:`. Functionally identical, but the unusual ordering invites a second look.
**Fix:** `if len(result['dgms']) > 1:`. Even better, since we only ever index `dgms[1]`, the explicit check `if len(result['dgms']) >= 2:` documents intent.

### IN-03: `default=str` in `cache_key` JSON canonicalization can mask cache-key drift across numeric types

**File:** `backend/cache/store.py:42-50`
**Issue:** `json.dumps(..., default=str)` stringifies any non-JSON-native value. If a caller passes `{'k': np.int64(100)}` vs `{'k': 100}`, the first produces `"100"` (string), the second `100` (number) — different cache keys for the same logical value. No current call site does this, but it's an easy footgun (e.g., if `params.yaml` is loaded through a library that returns numpy scalars).
**Fix:** Either reject unknown types (`default=...` raising) or normalize numpy scalars explicitly via `.item()` at call sites. A regression test pinning the canonical JSON for a few common type combinations would lock the contract.

### IN-04: `_HASH_CACHE` in `lineage.py` grows unbounded across the process lifetime

**File:** `backend/cache/lineage.py:31`
**Issue:** `_HASH_CACHE: dict[tuple[str, float, int], str]` has no size cap. In production this is essentially bounded by the number of unique (path, mtime, size) triples, which in practice is ~2 (`corpus/books.yaml` + one Word2Vec model per window). Risk is theoretical. Mentioned only because the comment explicitly markets the cache as request-time critical, and an unbounded request-time cache is the kind of structure where future contributors might add more keys (per-book hashes, etc.) without thinking about eviction.
**Fix:** Either add a comment explicitly capping intent ("only used for the ~2 lineage roots — do not add per-book hashes here"), or swap to `functools.lru_cache(maxsize=64)` on a small wrapper.

### IN-05: `data?.points.length` assumes truthiness of `data` only

**File:** `frontend/src/components/topology/PersistenceDiagram.tsx:232`
**Issue:** `{data ? `${data.points.length} features` : ''}` — fine functionally, but if the API ever returns `{ ...without points }` (shape drift), this would throw. The renderer below uses `(data?.points ?? [])`, which is more defensive. Low priority because Pydantic on the backend pins the shape.
**Fix:** `{data?.points ? `${data.points.length} features` : ''}` or read once into a local.

### IN-06: `install-hooks.sh` does not gracefully report Windows / PowerShell users

**File:** `scripts/install-hooks.sh:1`
**Issue:** Pure POSIX `sh` script. On Windows, `git config core.hooksPath .githooks` works fine inside Git Bash, but a developer using PowerShell-native git might not realize they need a POSIX shell to install the hook (and to run it — though Git for Windows ships its own `sh.exe` that handles hook execution transparently). The smoke test at line 13 redirects from `</dev/null` which is also POSIX-only at the shell level.
**Fix:** Add a one-line README note next to the script, or split into `install-hooks.sh` (POSIX) and `install-hooks.ps1` (Windows). The CI backstop (`.github/workflows/planning-files-check.yml`) already covers the case where a Windows dev forgets to install the hook, so this is purely DX polish.

### IN-07: H₁-only assert message is duplicated across two pipeline functions

**File:** `backend/pipeline/homology.py:56-59` and `backend/pipeline/precompute_vr.py:69-72`
**Issue:** Both `compute_book_homology` and `precompute_vr_edges` assert `homology_dims == [1]` with nearly identical multi-line messages. The wording is good (cites PROJECT.md Key Decisions), but the duplication invites drift — if v3 widens H₁-only to H₁+H₂, both sites must be updated, and the test `test_compute_book_homology_rejects_non_h1_dims` only covers the homology one. A small shared helper would avoid this.
**Fix:** Extract to `backend/pipeline/_homology_dims.py`:
```python
SUPPORTED_HOMOLOGY_DIMS = [1]

def assert_v2_homology_dims(dims: list[int]) -> None:
    assert dims == SUPPORTED_HOMOLOGY_DIMS, (
        f"v2 only supports homology_dims=[1]; got {dims}. "
        "H0 degenerate, H2 deferred -- see PROJECT.md Key Decisions."
    )
```
Then both call sites become a single line. Tests follow.

---

_Reviewed: 2026-05-22T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
