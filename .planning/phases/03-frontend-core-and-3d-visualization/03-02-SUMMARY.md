---
phase: 03-frontend-core-and-3d-visualization
plan: 02
subsystem: ui
tags: [react, three.js, react-three-fiber, zustand, react-query, vitest, typescript, tfidf, interactions]

requires:
  - 03-01 (scaffold, stores, PointCloud, genres constant, buildBuffers)

provides:
  - Full sidebar controls wired to Zustand store
  - Projection lerp animation (600ms cubic ease-out) in PointCloud
  - TF-IDF brightness encoding — non-genre points dim to 8% opacity
  - HoverTooltip with JSX-safe XSS-proof rendering (T-3-01 mitigated)
  - CameraController with OrbitControls, camera tween reset, 2D polar lock
  - useKeyboardShortcuts: R/1-4/Esc// global handler
  - useDebounce: 200ms generic debounce hook
  - useTfidfData: useGenreTfidf + useBookTfidf with GENRE_LIST guard (T-3-02 mitigated)
  - WordSearch: client-side filter, top 10 results, setSelectedPoint on click
  - GenreLegend and KeyboardHint canvas overlays
  - Selection ring via uHighlightIndex shader uniform
  - 2D toggle Z lerp animation (600ms)

affects:
  - 03-03 (upload flow builds on same stores/canvas)
  - 03-04 (backend TF-IDF endpoints consumed by useTfidfData)

tech-stack:
  added:
    - drei Html (HoverTooltip overlay)
    - lucide-react icons (RotateCcw, Search, X, ChevronLeft, ChevronRight)
  patterns:
    - TooltipContent as pure DOM component (testable without R3F Canvas)
    - useFrame + getState() for instant reads inside animation loop (no selector subscriptions)
    - Float32Array tfidfWeights aligned to corpus points array index
    - forwardRef on WordSearch for searchInputRef threading from App

key-files:
  created:
    - frontend/src/hooks/useDebounce.ts
    - frontend/src/hooks/useTfidfData.ts
    - frontend/src/hooks/useKeyboardShortcuts.ts
    - frontend/src/hooks/useDebounce.test.ts
    - frontend/src/hooks/useTfidfData.test.ts
    - frontend/src/hooks/useKeyboardShortcuts.test.ts
    - frontend/src/stores/visualizationStore.test.ts
    - frontend/src/components/canvas/HoverTooltip.tsx
    - frontend/src/components/canvas/HoverTooltip.test.tsx
    - frontend/src/components/canvas/CameraController.tsx
    - frontend/src/components/canvas/CameraController.test.tsx
    - frontend/src/components/sidebar/Sidebar.tsx
    - frontend/src/components/sidebar/ProjectionTabs.tsx
    - frontend/src/components/sidebar/GenreSelect.tsx
    - frontend/src/components/sidebar/BookSlider.tsx
    - frontend/src/components/sidebar/ControlSliders.tsx
    - frontend/src/components/sidebar/Toggle2D3D.tsx
    - frontend/src/components/sidebar/ResetCamera.tsx
    - frontend/src/components/sidebar/WordSearch.tsx
    - frontend/src/components/sidebar/WordSearch.test.tsx
    - frontend/src/components/sidebar/DetailPanel.tsx
    - frontend/src/components/sidebar/GenreLegend.tsx
    - frontend/src/components/sidebar/KeyboardHint.tsx
  modified:
    - frontend/src/components/canvas/PointCloud.tsx (lerp, brightness, selection ring, 2D toggle, aIndex)
    - frontend/src/components/canvas/ScatterCanvas.tsx (CameraController, new props)
    - frontend/src/stores/visualizationStore.ts (cameraResetCounter + triggerCameraReset)
    - frontend/src/App.tsx (full wiring — keyboard shortcuts, tfidf, sidebar, overlays)

key-decisions:
  - "TooltipContent extracted as pure DOM component to enable JSX testing without R3F Canvas"
  - "useFrame reads store via getState() (not selector) inside animation loops to avoid subscription overhead"
  - "tfidfWeights passed as Float32Array aligned by corpus point index — avoids per-frame word lookup"
  - "vitest.config.ts has pre-existing Vite version type conflict (vitest bundles its own vite); tsc --noEmit passes clean; vite build exits 0"
  - "HoverTooltip.tsx comment explicitly forbids dangerouslySetInnerHTML (T-3-01 STRIDE mitigation)"
  - "useTfidfData.ts has GENRE_LIST.includes runtime guard before URL construction (T-3-02 STRIDE mitigation)"

metrics:
  duration: ~20min
  tasks: 2
  files_created: 23
  files_modified: 4
  tests_added: 48
  tests_total: 60
  completed: 2026-04-12
---

# Phase 03 Plan 02: controls-and-interactions Summary

**Full interactive sidebar, PointCloud lerp animations, TF-IDF brightness encoding, XSS-safe tooltip, keyboard shortcuts, word search, and genre legend — 60 tests passing, vite build clean.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2
- **Files created:** 23 new, 4 modified
- **Tests:** 60 passing (48 added in this plan)

## Accomplishments

**Task 1 — Hooks and store:**
- `useDebounce`: generic 200ms debounce; cleanup on unmount; tested with fake timers
- `useTfidfData`: `useGenreTfidf` (staleTime Infinity, GENRE_LIST runtime guard per T-3-02) + `useBookTfidf`
- `useKeyboardShortcuts`: R/1-4/Esc// wired to Zustand actions; input tag guard prevents firing while typing
- `visualizationStore.ts`: added `cameraResetCounter` + `triggerCameraReset` action

**Task 2 — Components and wiring:**
- `PointCloud.tsx`: projection lerp (600ms cubic ease-out via `THREE.MathUtils.lerp` in `useFrame`), TF-IDF brightness (non-genre → 8% opacity, genre words gamma-curved by weight), selection ring (GLSL `uHighlightIndex` uniform + annular ring check), 2D Z-lerp toggle (600ms), `aIndex` attribute for ring targeting
- `HoverTooltip.tsx`: drei `Html` overlay using `TooltipContent` pure DOM component — all text rendered as JSX children (XSS safe per T-3-01); comment guard present; XSS payload test confirms `<script>` nodes are zero
- `CameraController.tsx`: `OrbitControls` + camera tween reset on `cameraResetCounter` change, polar angle lock in 2D mode
- Full sidebar: `ProjectionTabs` (instant setProjection), `GenreSelect` (200ms debounce), `BookSlider` (200ms debounce, only shown when genre selected), `ControlSliders` (pointSize/opacity instant; tfidfThreshold/brightness debounced), `Toggle2D3D`, `ResetCamera`, `WordSearch` (top-10 client filter, forwardRef), `DetailPanel` (selected point details + scrollable neighbors), `GenreLegend` (canvas overlay, genre click filter), `KeyboardHint` (fades 5s, reappears on shortcuts)
- `App.tsx`: full wiring — `useKeyboardShortcuts` at root with `searchInputRef`, `useGenreTfidf`/`useBookTfidf`, `tfidfWeights` Float32Array built per corpus point, `<Sidebar>`, `<GenreLegend>`, `<KeyboardHint>` overlays, responsive unsupported overlay via CSS media query

## Task Commits

1. **Task 1: TF-IDF hooks, debounce, keyboard shortcuts, store tests** — `922bcff` (feat)
2. **Task 2: PointCloud interactions, sidebar controls, canvas components** — `e8938ac` (feat)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] KeyboardShortcuts handler guarded against undefined target.tagName**
- **Found during:** Task 1 test run
- **Issue:** `e.target` is `window` when `window.dispatchEvent` is called; `window.tagName` is undefined, causing TypeError
- **Fix:** Changed `(e.target as HTMLElement).tagName.toLowerCase()` to `target?.tagName?.toLowerCase() ?? ''`
- **Files modified:** `frontend/src/hooks/useKeyboardShortcuts.ts`
- **Commit:** `922bcff`

**2. [Rule 1 - Bug] HoverTooltip test used getByText for ambiguous "mystery" element**
- **Found during:** Task 2 test run
- **Issue:** Both word and genre fields render "mystery"; `getByText` threw multiple elements found
- **Fix:** Changed to `getAllByText` + forEach assertion; also used `getAllByText` in dangerouslySetInnerHTML test
- **Files modified:** `frontend/src/components/canvas/HoverTooltip.test.tsx`
- **Commit:** `e8938ac`

## Known Stubs

- `BookSlider` always receives `books={[]}` from `Sidebar.tsx` — no corpus book metadata API/hook exists yet. The slider renders correctly but is always hidden (selectedGenre is required AND books.length > 0). This will be wired when the corpus metadata endpoint is available (plan 03-04 or beyond). This does not block the plan's primary goal (genre TF-IDF brightness works independently of the book slider).

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-3-01 | HoverTooltip.tsx renders all text as JSX children; `dangerouslySetInnerHTML` is forbidden by comment; XSS payload test confirms no `<script>` node injection |
| T-3-02 | useTfidfData.ts: `if (!GENRE_LIST.includes(genre)) throw new Error(...)` before URL construction |
| T-3-03 | Accepted — lerp is O(n) per frame, early exit at t >= 1.0 implemented |

## Self-Check: PASSED

- `frontend/src/hooks/useDebounce.ts` — FOUND
- `frontend/src/hooks/useTfidfData.ts` — FOUND
- `frontend/src/hooks/useKeyboardShortcuts.ts` — FOUND
- `frontend/src/components/canvas/HoverTooltip.tsx` — FOUND
- `frontend/src/components/canvas/CameraController.tsx` — FOUND
- `frontend/src/components/sidebar/Sidebar.tsx` — FOUND
- `frontend/src/components/sidebar/WordSearch.tsx` — FOUND
- Commits `922bcff` and `e8938ac` — FOUND in git log
- All 60 vitest tests pass
- `vite build` exits 0 (7.67s, 2256 modules transformed)
- `tsc --noEmit` exits 0 (zero type errors in app code)
- `dangerouslySetInnerHTML` absent from HoverTooltip.tsx
- `GENRE_LIST.includes` present in useTfidfData.ts
- `THREE.MathUtils.lerp` present in PointCloud.tsx useFrame

*Phase: 03-frontend-core-and-3d-visualization*
*Completed: 2026-04-12*
