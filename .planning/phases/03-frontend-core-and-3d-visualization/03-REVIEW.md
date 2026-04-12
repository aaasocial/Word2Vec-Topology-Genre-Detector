---
phase: 03-frontend-core-and-3d-visualization
reviewed: 2026-04-12T00:00:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - frontend/src/components/canvas/CameraController.test.tsx
  - frontend/src/components/canvas/CameraController.tsx
  - frontend/src/components/canvas/HoverTooltip.test.tsx
  - frontend/src/components/canvas/HoverTooltip.tsx
  - frontend/src/components/sidebar/BookSlider.tsx
  - frontend/src/components/sidebar/ControlSliders.tsx
  - frontend/src/components/sidebar/DetailPanel.tsx
  - frontend/src/components/sidebar/GenreLegend.tsx
  - frontend/src/components/sidebar/GenreSelect.tsx
  - frontend/src/components/sidebar/KeyboardHint.tsx
  - frontend/src/components/sidebar/ProjectionTabs.tsx
  - frontend/src/components/sidebar/ResetCamera.tsx
  - frontend/src/components/sidebar/Sidebar.tsx
  - frontend/src/components/sidebar/Toggle2D3D.tsx
  - frontend/src/components/sidebar/WordSearch.test.tsx
  - frontend/src/components/sidebar/WordSearch.tsx
  - frontend/src/hooks/useDebounce.test.ts
  - frontend/src/hooks/useDebounce.ts
  - frontend/src/hooks/useKeyboardShortcuts.test.ts
  - frontend/src/hooks/useKeyboardShortcuts.ts
  - frontend/src/hooks/useTfidfData.test.ts
  - frontend/src/hooks/useTfidfData.ts
  - frontend/src/stores/visualizationStore.test.ts
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-12T00:00:00Z
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Reviewed 23 frontend source files covering the 3D canvas camera controller, hover tooltip, all sidebar UI components, three custom hooks, and their corresponding test suites. The code is generally well-structured and demonstrates deliberate security awareness (XSS guards are in place and tested). Most logic is correct.

Four issues of note stand out:

1. **Critical:** `useBookTfidf` constructs a URL from an unsanitized caller-supplied `bookId` string with no allowlist or format guard, creating a path-injection vector. The genre variant correctly validates against `GENRE_LIST`; the book variant has no equivalent protection.
2. **Warning:** `WordSearch` calls `setSearchQuery` during render (not in an effect), which is a React rules violation — calling a store setter synchronously during the render phase can cause cascading re-renders and subtle state inconsistencies.
3. **Warning:** `CameraController` uses a lerp formula that does not converge to exactly the target position — applying `lerp(target, t)` each frame where `t` grows toward 1 overshoots and accumulates floating-point drift at the tail of the animation.
4. **Warning:** `BookSlider` is always passed an empty array (`books={[]}`) from `Sidebar`, making the component permanently invisible. This looks like a placeholder that was never wired up.
5. **Warning:** `GenreSelect` has a state synchronisation gap — its `localValue` is initialised from `selectedGenre` at mount time but does not resync when `selectedGenre` is changed externally (e.g. by clicking a genre in `GenreLegend`), so the dropdown display can drift from store state.

---

## Critical Issues

### CR-01: Path injection in `useBookTfidf` — unsanitized `bookId` interpolated into URL

**File:** `frontend/src/hooks/useTfidfData.ts:27`
**Issue:** `bookId` is interpolated directly into the fetch path `/viz/tfidf/book/${bookId}` with no validation. A malicious or malformed value such as `../../admin` or `12345?injected=true` would be sent to the API verbatim. The sister function `useGenreTfidf` demonstrates the correct pattern: validate against an allowlist before constructing the URL. No equivalent guard exists for `bookId`.
**Fix:**
```typescript
// Add a format guard before the fetch — Gutenberg IDs are positive integers
export function useBookTfidf(bookId: string | null) {
  return useQuery<TfidfMap>({
    queryKey: ['tfidf', 'book', bookId],
    queryFn: () => {
      if (!bookId) throw new Error('no bookId')
      // T-3-02: guard against path injection
      if (!/^\d+$/.test(bookId)) throw new Error(`Invalid bookId: ${bookId}`)
      return apiFetch<TfidfMap>(`/viz/tfidf/book/${bookId}`)
    },
    enabled: bookId !== null,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
```
Add a corresponding test case to `useTfidfData.test.ts` asserting that `useBookTfidf('../secret')` produces `isError: true`.

---

## Warnings

### WR-01: Side effect called during render in `WordSearch` — violates React rules

**File:** `frontend/src/components/sidebar/WordSearch.tsx:22-25`
**Issue:** The component calls `setSearchQuery(debouncedQuery)` unconditionally during the render body when `debouncedQuery` differs from the ref. Calling a Zustand setter (which triggers store subscribers, which may trigger re-renders of other components) during render is a React rules violation. It can cause React to warn about "Cannot update a component while rendering a different component" and may produce cascading re-renders or stale closure bugs in Strict Mode.

```tsx
// Current (line 22-25) — setter called during render:
const prevDebounced = useRef('')
if (debouncedQuery !== prevDebounced.current) {
  prevDebounced.current = debouncedQuery
  setSearchQuery(debouncedQuery)   // <-- side effect during render
}
```

**Fix:** Move the sync into a `useEffect`, which is the correct place for derived-state propagation to an external store:

```tsx
// Replace lines 21-25 with:
useEffect(() => {
  setSearchQuery(debouncedQuery)
}, [debouncedQuery, setSearchQuery])
```

### WR-02: Camera lerp formula accumulates floating-point drift and does not converge cleanly

**File:** `frontend/src/components/canvas/CameraController.tsx:66-74`
**Issue:** The animation loop applies `camera.position.lerp(lerpTargetPosition.current, t)` each frame, where `t` grows from 0 toward 1 over 0.8 s. `THREE.Vector3.lerp(target, t)` mutates the vector in-place as `this + (target - this) * t`. Because `t` grows but never equals exactly 1.0 until clamped, and because the source position changes each frame (it was just lerped), the camera never reaches the exact target — it halts at `lerpProgress === 1.0` before the final lerp completes, leaving a sub-pixel residual. Additionally, when `lerpProgress` reaches exactly 1.0 the lerp is skipped entirely (early return on line 67), so the final snap to target never happens.

**Fix:** Clamp to the exact target when the animation finishes:

```tsx
useFrame((_, delta) => {
  if (lerpProgress.current >= 1.0) return
  lerpProgress.current = Math.min(lerpProgress.current + delta / 0.8, 1.0)
  const t = 1 - Math.pow(1 - lerpProgress.current, 3)
  camera.position.lerp(lerpTargetPosition.current, t)
  controlsRef.current?.target.lerp(lerpTargetLookAt.current, t)
  // Snap exactly to target when animation completes
  if (lerpProgress.current === 1.0) {
    camera.position.copy(lerpTargetPosition.current)
    controlsRef.current?.target.copy(lerpTargetLookAt.current)
  }
  controlsRef.current?.update()
})
```

### WR-03: `BookSlider` always receives `books={[]}` — component is permanently hidden

**File:** `frontend/src/components/sidebar/Sidebar.tsx:87`
**Issue:** `<BookSlider books={[]} />` is hardcoded with an empty array. `BookSlider` returns `null` whenever `books.length === 0` (line 35 of `BookSlider.tsx`), so it is unconditionally invisible. The prop accepts book metadata but the caller never passes real data. This indicates the book-filtering data flow was never connected.

**Fix:** Derive the book list from the available scatter points filtered by `selectedGenre`, and pass it down:

```tsx
// In Sidebar.tsx — derive books from props
const selectedGenre = useVisualizationStore(s => s.selectedGenre)
const books = React.useMemo(() => {
  if (!selectedGenre) return []
  // Deduplicate by a book-level field; adapt to actual data shape
  const seen = new Set<string>()
  const result: { id: string; title: string }[] = []
  for (const p of points) {
    if (p.genre === selectedGenre && p.bookId && !seen.has(p.bookId)) {
      seen.add(p.bookId)
      result.push({ id: p.bookId, title: p.bookTitle ?? p.bookId })
    }
  }
  return result
}, [points, selectedGenre])

// Then: <BookSlider books={books} />
```
If the `ScatterPoint` type does not yet carry `bookId`/`bookTitle`, that field needs to be added when the data contract is finalised.

### WR-04: `GenreSelect` local state does not resync when `selectedGenre` changes externally

**File:** `frontend/src/components/sidebar/GenreSelect.tsx:10`
**Issue:** `localValue` is initialised once from `selectedGenre` at mount time: `useState<string>(selectedGenre ?? '')`. When the user clicks a genre in `GenreLegend` (which calls `setSelectedGenre` in the store directly), the `GenreSelect` dropdown is not updated because `localValue` is never re-read from the store after mount. The dropdown will show the stale previous selection while the rest of the UI reflects the new genre.

**Fix:** Add a `useEffect` that resets `localValue` when `selectedGenre` changes from an external source:

```tsx
// Add after the existing useEffect (line 13):
useEffect(() => {
  setLocalValue(selectedGenre ?? '')
}, [selectedGenre])
```

Note: this creates a two-way sync loop that must be guarded. Because the debounce effect already writes `selectedGenre` back from `localValue`, the sequence is: external change → `selectedGenre` updated → `localValue` reset → debounce fires → `setSelectedGenre` called with same value (no-op). This is safe but produces one extra no-op dispatch. An alternative is to remove debouncing from this component entirely, since a `<select>` change is already a discrete user action.

---

## Info

### IN-01: `key={i}` index-as-key in list renders across multiple components

**Files:** `frontend/src/components/canvas/HoverTooltip.tsx:59`, `frontend/src/components/sidebar/DetailPanel.tsx:97`
**Issue:** Neighbor lists use the array index `i` as the React `key`. This is harmless when the list is static (tooltip content does not reorder), but it is a recognised anti-pattern that suppresses React's reconciliation optimisations and would cause incorrect diffing if list order could change.
**Fix:** Use a stable identifier. If neighbor word tokens are unique within the list (they should be by definition for nearest-neighbor results), use `key={n.word}`:

```tsx
{point.neighbors.slice(0, 5).map((n, i) => (
  <div key={n.word} ...>
```

### IN-02: `select` element in `GenreSelect` lacks an accessible `<label>`

**File:** `frontend/src/components/sidebar/GenreSelect.tsx:22`
**Issue:** The `<select>` element is identified only by a visual `<div>` with the text "Genre" rendered above it. There is no `<label>` element with a `htmlFor` attribute, so screen readers will not associate the label with the control. The `<select>` also has no `aria-label` fallback.
**Fix:**
```tsx
<label
  htmlFor="genre-select"
  style={{ fontSize: 12, color: '#6B6B80', fontWeight: 600, marginBottom: 8, display: 'block' }}
>
  Genre
</label>
<select id="genre-select" value={localValue} onChange={...}>
```

### IN-03: `KeyboardHint` triggers both `useEffect`s simultaneously on mount, creating a double-timer

**File:** `frontend/src/components/sidebar/KeyboardHint.tsx:10-20`
**Issue:** On initial mount, both `useEffect` blocks fire — the first schedules a 5 s timer (lines 10-13), and the second also fires because `resetCounter` and `projection` are treated as having "changed" from React's perspective (mount counts as a dependency change). This means two concurrent 5 s timers run on mount. The second effect also calls `setVisible(true)` on mount even though visibility is already `true`. The timers do not race visibly (both set `visible = false` at roughly the same time) but it is wasteful and may produce a brief flicker in React Strict Mode where effects fire twice.
**Fix:** Consolidate into a single effect:

```tsx
useEffect(() => {
  setVisible(true)
  const timer = setTimeout(() => setVisible(false), 5000)
  return () => clearTimeout(timer)
}, [resetCounter, projection])
```

Remove the separate mount-only effect. This single effect handles both mount (initial values trigger it) and subsequent shortcut activations.

---

_Reviewed: 2026-04-12T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
