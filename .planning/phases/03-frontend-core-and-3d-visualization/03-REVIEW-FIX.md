---
phase: 03-frontend-core-and-3d-visualization
fixed_at: 2026-04-12T00:00:00Z
review_path: .planning/phases/03-frontend-core-and-3d-visualization/03-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-04-12T00:00:00Z
**Source review:** .planning/phases/03-frontend-core-and-3d-visualization/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: Path injection in `useBookTfidf` — unsanitized `bookId` interpolated into URL

**Files modified:** `frontend/src/hooks/useTfidfData.ts`, `frontend/src/hooks/useTfidfData.test.ts`
**Commit:** e60f4b0
**Applied fix:** Added a `!/^\d+$/.test(bookId)` format guard in the `queryFn` before constructing the URL, matching the pattern already used by `useGenreTfidf`. Also added a test case `throws error for invalid bookId (path injection guard)` to `useTfidfData.test.ts` asserting that `useBookTfidf('../secret')` produces `isError: true`.

### WR-01: Side effect called during render in `WordSearch` — violates React rules

**Files modified:** `frontend/src/components/sidebar/WordSearch.tsx`
**Commit:** 9586938
**Applied fix:** Removed the `prevDebounced` ref and the render-phase conditional that called `setSearchQuery`. Replaced with a `useEffect(() => { setSearchQuery(debouncedQuery) }, [debouncedQuery, setSearchQuery])`. Also removed the now-unused `useRef` from the React import to keep the import clean.

### WR-02: Camera lerp formula accumulates floating-point drift and does not converge cleanly

**Files modified:** `frontend/src/components/canvas/CameraController.tsx`
**Commit:** 55dd793
**Applied fix:** Added a snap-to-exact-target block inside `useFrame` that fires when `lerpProgress.current === 1.0` (after `Math.min` clamps it). At that point `camera.position.copy(lerpTargetPosition.current)` and `controlsRef.current?.target.copy(lerpTargetLookAt.current)` are called before the final `update()`, guaranteeing the camera lands precisely on the target with no floating-point residual.

### WR-03: `BookSlider` always receives `books={[]}` — component is permanently hidden

**Files modified:** `frontend/src/components/sidebar/Sidebar.tsx`, `frontend/src/types/scatter.ts`
**Commit:** 23902f6
**Applied fix:** Added optional `bookId?: string` and `bookTitle?: string` fields to the `ScatterPoint` interface (these will be populated by the API when book-scoped data is available). In `Sidebar.tsx`, imported `useMemo`, subscribed to `selectedGenre` from the store, and derived a deduplicated `books` array from `points` filtered by genre. Passed the derived `books` to `<BookSlider books={books} />` instead of the hardcoded empty array.

### WR-04: `GenreSelect` local state does not resync when `selectedGenre` changes externally

**Files modified:** `frontend/src/components/sidebar/GenreSelect.tsx`
**Commit:** 32893d5
**Applied fix:** Added a second `useEffect` after the existing debounce effect: `useEffect(() => { setLocalValue(selectedGenre ?? '') }, [selectedGenre])`. This resets the dropdown's display value whenever the store's `selectedGenre` is updated from an external source (e.g. a genre click in `GenreLegend`). The resulting no-op dispatch through the debounce cycle is safe as the reviewer noted.

---

_Fixed: 2026-04-12T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
