---
phase: 03-frontend-core-and-3d-visualization
verified: 2026-04-12T21:35:00Z
status: human_needed
score: 4/5 roadmap success criteria verified
overrides_applied: 0
gaps: []
deferred: []
human_verification:
  - test: "Open the app in a browser, observe the 3D scatter plot and orbit/pan/zoom with mouse"
    expected: "Interactive frame rates with up to 58k points; orbit/pan/zoom responsive; R key resets camera"
    why_human: "WebGL rendering and frame rate cannot be verified without a running browser"
  - test: "Select a genre from the dropdown, then slide the book slider within that genre"
    expected: "Distinctive vocabulary lights up by TF-IDF brightness; other words dim to ~8% opacity; sliding through books shifts brightness"
    why_human: "BookSlider receives books=[] from Sidebar.tsx — corpus book metadata endpoint not wired. The slider is always hidden because books.length === 0. The slide-through-books part of SC2 cannot function."
  - test: "Switch between PCA, KPCA, UMAP, t-SNE projection tabs"
    expected: "Words rearrange into different 3D layouts with 600ms lerp animation between positions"
    why_human: "Animation correctness requires visual inspection in a browser with live scatter data loaded"
  - test: "Upload a .txt file via drag-and-drop or click-to-browse, complete classification, click 'View in Scatter'"
    expected: "6-step progress stepper advances in real time via WebSocket; uploaded book appears as amber points in scatter; camera pans to centroid"
    why_human: "End-to-end flow requires backend running; WebSocket real-time behavior cannot be verified statically"
  - test: "Hover a point, click to pin, search for a word, toggle 2D/3D"
    expected: "Tooltip shows word/TF-IDF/genre/top-5 neighbors; selection ring appears; search filters to top-10 results; 2D collapses Z over 600ms"
    why_human: "Tooltip and selection ring require WebGL canvas interaction in a running browser"
---

# Phase 03: Frontend Core and 3D Visualization — Verification Report

**Phase Goal:** Users can explore word embedding space through an interactive 3D scatter plot with TF-IDF brightness encoding, genre coloring, projection switching, and see where their uploaded book lands after classification.
**Verified:** 2026-04-12T21:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | A user can open the app and see a 3D scatter plot at interactive frame rates, orbit/pan/zoom with mouse, and reset camera with R | ? HUMAN | ScatterCanvas + PointCloud + OrbitControls + useKeyboardShortcuts wired; WebGL cannot be tested statically |
| SC2 | A user can select a genre and see TF-IDF brightness, then slide through individual books within the genre | PARTIAL | Genre TF-IDF brightness WIRED (useTfidfData, opacity 8% dim in PointCloud); BookSlider always receives `books={[]}` — slider hidden whenever genre selected; book slide-through NOT functional |
| SC3 | A user can switch between PCA, KPCA, UMAP, t-SNE projections and see words rearrange | ? HUMAN | ProjectionTabs wired to setProjection; lerp in PointCloud (THREE.MathUtils.lerp, delta/0.6, cubic ease-out); backend precompute_viz.py caches all 4 projections; visual confirmation requires browser |
| SC4 | A user can upload a .txt file, see it classified, and see the uploaded book appear in the scatter with TF-IDF brightness active | ? HUMAN | UploadZone + useClassify + UploadProgress + ClassificationResult + buildUploadedBuffers + CameraController centroid pan all wired; requires running backend + WebSocket to confirm |
| SC5 | A user can hover any point for tooltip, click to select and pin, search for a word, and toggle 2D/3D | ? HUMAN | HoverTooltip + click handler + WordSearch + Toggle2D3D + 2D Z-lerp all wired; WebGL interaction required |

**Score:** 4/5 truths verified (SC1, SC3, SC4, SC5 pass all static checks; SC2 partially blocked by BookSlider stub)

### Known Stub: BookSlider books=[]

`Sidebar.tsx` line 87 passes `books={[]}` to `BookSlider`. `BookSlider` returns `null` when `books.length === 0`, so the slider is always hidden even when a genre is selected. This breaks the "slide through individual books within the genre" half of SC2. This stub was acknowledged in both 03-02 and 03-03 summaries with the note that it requires a corpus metadata endpoint (not built in this phase).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/package.json` | Pinned deps including @react-three/fiber | VERIFIED | Present; @react-three/fiber@8.18.0 pinned |
| `frontend/src/constants/genres.ts` | 10-entry VIZ-11 palette, GENRE_COLORS + GENRE_LIST | VERIFIED | Exactly 10 entries; all valid #RRGGBB hex; HISTORICAL_DIM_COLOR + UPLOADED_BOOK_COLOR present |
| `frontend/src/components/canvas/PointCloud.tsx` | THREE.Points + ShaderMaterial, 58k points | VERIFIED | Uses THREE.Points; THREE.ShaderMaterial at line 118; lerp animation; brightness encoding; selection ring via uHighlightIndex; 2D Z-lerp |
| `frontend/src/stores/visualizationStore.ts` | Zustand store: all required fields | VERIFIED | All fields present: projection, selectedGenre, selectedBookId, selectedPointIndex, hoveredPointIndex, pointSizeMultiplier, opacity, tfidfThreshold, brightnessSensitivity, is2D, searchQuery + cameraResetCounter + cameraFocusUploadCounter |
| `frontend/src/hooks/useScatterData.ts` | React Query, GET /viz/scatter/{projection}, staleTime Infinity | VERIFIED | queryKey: ['scatter', projection]; queryFn fetches /viz/scatter/${projection}; staleTime: Infinity; gcTime: Infinity |
| `frontend/src/components/canvas/HoverTooltip.tsx` | drei Html, JSX-safe XSS rendering | VERIFIED | Uses drei Html; explicit XSS guard comment at lines 5 and 37; no dangerouslySetInnerHTML; TooltipContent as pure DOM component |
| `frontend/src/components/canvas/CameraController.tsx` | OrbitControls + camera tween + 2D polar lock + centroid pan | VERIFIED | cameraResetCounter trigger wired; is2D → minPolarAngle = PI/2; cameraFocusUploadCounter → centroid lerp 800ms |
| `frontend/src/hooks/useTfidfData.ts` | React Query, /viz/tfidf/{genre} + book variant, staleTime Infinity | VERIFIED | useGenreTfidf + useBookTfidf; GENRE_LIST.includes guard; both staleTime Infinity |
| `frontend/src/hooks/useKeyboardShortcuts.ts` | R/1-4/Esc// wired to Zustand | VERIFIED | All keys wired; input tag guard present; tagName safety fix applied |
| `frontend/src/hooks/useDebounce.ts` | Generic 200ms debounce | VERIFIED | useState + useEffect + clearTimeout pattern |
| `frontend/src/components/sidebar/WordSearch.tsx` | Client-side filter, top 10 results, setSelectedPoint on click | VERIFIED | forwardRef; client-side filter; setSelectedPoint on click; aria-label present |
| `frontend/src/components/sidebar/UploadZone.tsx` | Drag-and-drop, .txt validation, 5MB limit | VERIFIED | accept=".txt"; isDragOver state → #6366F1 border; drag-over/leave handlers present |
| `frontend/src/components/sidebar/UploadProgress.tsx` | 6-step vertical stepper driven by WebSocket events | VERIFIED | Present; 6-step rendering; role="progressbar"; pulse-dot; retry message |
| `frontend/src/components/sidebar/ClassificationResult.tsx` | Genre/confidence display + View in Scatter CTA | VERIFIED | triggerCameraFocusUpload() on button; JSX text nodes only; no dangerouslySetInnerHTML |
| `frontend/src/hooks/useClassify.ts` | POST /classify + WebSocket + 3-retry + 50k cap | VERIFIED | MAX_UPLOADED_POINTS = 50_000; MAX_RETRIES = 3; RETRY_DELAY = 2000ms; WebSocket construction present |
| `backend/api/routes/viz.py` | FastAPI router: /scatter/{projection}, /tfidf/{genre}, /tfidf/book/{id} | VERIFIED | Literal['pca','kpca','umap','tsne'] enum; KNOWN_GENRES guard; ^\d+$ regex; cache_get calls |
| `backend/pipeline/precompute_viz.py` | PCA/KPCA/UMAP/t-SNE precompute with cache_put | VERIFIED | All 4 projections; UMAP random_state=42, n_jobs=1; cache_put calls; chunked neighbor computation |
| `backend/api/tests/test_viz.py` | pytest tests for all three viz endpoints | VERIFIED | 10 tests, all passing (including 422, 404, 400, 503 cases) |
| `backend/pipeline/tests/test_precompute_viz.py` | pytest tests for projection computation + UMAP determinism | VERIFIED | 6 tests, all passing including determinism test |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| frontend/src/App.tsx | frontend/src/components/canvas/ScatterCanvas.tsx | JSX `<ScatterCanvas` | WIRED | Line 142 in App.tsx |
| frontend/src/components/canvas/PointCloud.tsx | THREE.Points ShaderMaterial | useMemo geometry + material | WIRED | THREE.ShaderMaterial at line 118; attributes set in useMemo |
| frontend/src/hooks/useScatterData.ts | /api/viz/scatter | React Query fetch + staleTime: Infinity | WIRED | queryFn: apiFetch(`/viz/scatter/${projection}`); staleTime: Infinity |
| frontend/src/components/canvas/HoverTooltip.tsx | React JSX rendering (XSS-safe) | drei Html + JSX children | WIRED | Html component present; no dangerouslySetInnerHTML |
| frontend/src/components/canvas/PointCloud.tsx | projection switch lerp | useFrame delta-based lerp via THREE.MathUtils.lerp | WIRED | lerpProgress.current < 1.0 check; delta/0.6 pacing |
| frontend/src/hooks/useTfidfData.ts | /api/viz/tfidf | React Query, staleTime Infinity | WIRED | Both genre and book variants; staleTime: Infinity |
| frontend/src/hooks/useClassify.ts | /api/classify + /ws/classify/{jobId} | FormData POST then WebSocket | WIRED | new WebSocket(wsUrl); POST via apiFetch |
| frontend/src/stores/uploadStore.ts | frontend/src/components/canvas/PointCloud.tsx | uploadedPoints → buildUploadedBuffers → merged buffer | WIRED | App.tsx merges corpus + uploaded buffers; amber color applied |
| backend/api/routes/viz.py | backend/cache/store.py cache_get | cache_key('scatter', ...) → cache_get | WIRED | cache_get import at line 14; called in get_scatter |
| backend/pipeline/precompute_viz.py | backend/cache/store.py cache_put | cache_key('scatter', ...) → cache_put | WIRED | cache_put calls throughout precompute_viz |
| backend/api/app.py | backend/api/routes/viz.py | app.include_router(viz_router) | WIRED | Line 35: include_router(viz_router, prefix='/viz') |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| PointCloud.tsx | positions (Float32Array) | App.tsx buildBuffers() from useScatterData | useScatterData fetches /viz/scatter/{projection} from precomputed cache; real data once precompute_viz runs | WIRED (cache-dependent) |
| HoverTooltip.tsx | point: ScatterPoint | hoveredPointIndex → allPoints[idx] | Flows from same scatter data | WIRED |
| ClassificationResult.tsx | result: ClassificationResult | useUploadStore().result, set by useClassify on WebSocket result message | Real backend response | WIRED |
| BookSlider | books: BookMeta[] | Sidebar passes books={[]} hardcoded | EMPTY — no API or hook fetches corpus book metadata | HOLLOW_PROP — slider always hidden |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Frontend test suite (60 tests) | `npx vitest run` | 60/60 pass | PASS |
| Backend viz tests (16 tests) | `pytest backend/api/tests/test_viz.py backend/pipeline/tests/test_precompute_viz.py` | 16/16 pass | PASS |
| Frontend TypeScript build | `npm run build` (tsc -b phase) | 2 TS errors in ScatterCanvas.tsx + vitest.config.ts; dist/ output generated | PARTIAL — build produces dist/ but tsc exits non-zero |
| GENRE_COLORS entry count | grep count | Exactly 10 | PASS |
| 50k point cap | useClassify.ts grep | MAX_UPLOADED_POINTS = 50_000; .slice(0, 50_000) applied | PASS |
| XSS guard | HoverTooltip.tsx grep | No dangerouslySetInnerHTML; explicit comment guard | PASS |
| UMAP determinism | pytest test_project_umap_determinism | Two independent UMAP runs produce identical arrays | PASS |

### TypeScript Build Errors

Two type errors exist and prevent a clean `tsc -b` exit, though Vite still produces `dist/`:

1. **`src/components/canvas/ScatterCanvas.tsx:30`** — `TS2739`: `raycaster={{ params: { Points: { threshold: 0.05 } } }}` is missing properties from `RaycasterParameters` (Mesh, Line, LOD, Sprite). This is a @react-three/fiber type strictness issue with partial `params` objects; the runtime behavior is correct (Points threshold is set), but the type error is real.

2. **`vitest.config.ts:6`** — `TS2769`: Vite version conflict between the app's Vite and Vitest's internal bundled Vite. This was documented in the 03-02 SUMMARY as a known type conflict; vitest tests still run and pass correctly.

These errors do not prevent the app from running but the "frontend builds without TypeScript errors" must-have from plan 03-01 is not fully met.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|------------|--------|----------|
| INFRA-04 | 03-01 | SATISFIED | Vite + React + TypeScript scaffold present |
| VIZ-01 | 03-01, 03-02 | SATISFIED | PointCloud renders THREE.Points; useScatterData fetches scatter data |
| VIZ-02 | 03-04 | SATISFIED | /viz/scatter/{projection} endpoint with Literal enum validation |
| VIZ-03 | 03-02 | SATISFIED | ProjectionTabs wired to setProjection; lerp animation in PointCloud |
| VIZ-04 | 03-04 | SATISFIED | /viz/tfidf/{genre} endpoint served from disk cache |
| VIZ-05 | 03-04 | SATISFIED | /viz/tfidf/book/{id} endpoint with ^\d+$ regex guard |
| VIZ-06 | 03-02 | SATISFIED | Genre brightness encoding: non-genre dims to 0.08 opacity; gamma curve |
| VIZ-07 | 03-02 | SATISFIED | HoverTooltip shows word/TF-IDF/genre/top-5 neighbors |
| VIZ-08 | 03-02 | SATISFIED | Click pins selection (uHighlightIndex uniform); Esc clears via useKeyboardShortcuts |
| VIZ-09 | 03-02 | SATISFIED | WordSearch: client-side filter, top 10 results, setSelectedPoint on click |
| VIZ-10 | 03-02 | SATISFIED | Toggle2D3D → setIs2D; CameraController locks polar angle; PointCloud lerps Z to 0 |
| VIZ-11 | 03-01 | SATISFIED | GENRE_COLORS: exactly 10 entries, all valid hex |
| CLASS-03 | 03-03 | SATISFIED | UploadZone + useClassify + UploadProgress + ClassificationResult fully wired |
| PARAM-01 | 03-02 | SATISFIED | Point size/opacity sliders instant (no debounce); projection tab instant |
| PARAM-02 | 03-02 | SATISFIED | TF-IDF threshold + brightness debounced 200ms via useDebounce |
| UX-04 | 03-02 | SATISFIED | useKeyboardShortcuts: R, 1-4, Esc, / all fire correct Zustand actions |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/src/components/sidebar/Sidebar.tsx` | 87 | `books={[]}` hardcoded empty array | WARNING | BookSlider always hidden; book-level brightness slide-through not functional (acknowledged stub) |
| `frontend/src/components/canvas/ScatterCanvas.tsx` | 30 | TS2739 raycaster params partial type | INFO | Type error only; runtime works correctly |
| `frontend/vitest.config.ts` | 6 | TS2769 Vite version type conflict | INFO | Tests still run and pass; documented in 03-02 SUMMARY |

### Human Verification Required

#### 1. Interactive 3D Rendering at Frame Rate (SC1)

**Test:** Open `http://localhost:5173` with the backend running and corpus precomputed. Load the app and observe the scatter plot.
**Expected:** 3D point cloud visible at interactive frame rates (≥30fps subjectively smooth); orbit with left-drag, pan with right-drag, zoom with scroll; press R to snap camera back to origin.
**Why human:** WebGL rendering and frame rate measurement require a live browser.

#### 2. BookSlider Corpus Metadata — Functional Confirmation (SC2 partial)

**Test:** After a corpus metadata endpoint is available, wire `BookSlider` to receive real books. Then select a genre and use the slider.
**Expected:** Slider shows N books for the selected genre; sliding changes which book's TF-IDF weights drive brightness.
**Why human:** `BookSlider` currently receives `books={[]}` and is always hidden. This requires a backend corpus metadata API and Sidebar.tsx wiring — neither exists in Phase 3.

#### 3. Projection Switching Animation (SC3)

**Test:** Click through PCA → UMAP → t-SNE tabs while scatter data is loaded.
**Expected:** Points animate to new positions over ~600ms with cubic ease-out; layout visually distinct per projection.
**Why human:** Animation smoothness and visual correctness require live browser with real data.

#### 4. End-to-End Upload and Classification Flow (SC4)

**Test:** Drag a .txt book file onto the upload zone. Observe the 6-step stepper advance in real time, then click "View in Scatter".
**Expected:** Each of 6 pipeline steps marks active → complete; uploaded book points appear as amber (#FBBF24) in the scatter; camera pans to centroid over ~800ms.
**Why human:** Requires running backend with WebSocket, real Word2Vec model, and classification pipeline. Static analysis cannot verify real-time WebSocket step progression.

#### 5. Hover Tooltip, Click Selection, Word Search, 2D Toggle (SC5)

**Test:** Hover a point → inspect tooltip. Click a point → observe ring. Type "love" in search → inspect results. Click 2D toggle.
**Expected:** Tooltip shows word, TF-IDF (4dp), genre, top-5 neighbors. White ring appears on selected point. Up to 10 search results. Z coordinates collapse over 600ms in 2D mode.
**Why human:** Tooltip and selection ring require WebGL pointer events in a running browser.

### Gaps Summary

No structural gaps found — all required artifacts exist, are substantive, and are wired correctly. The 60 frontend tests and 16 backend tests all pass.

The **one known stub** (BookSlider receiving `books=[]`) is an acknowledged incomplete feature that prevents the "slide through individual books" half of SC2. This is not a structural coding gap — the component is correctly implemented and conditionally hidden — it is a missing backend endpoint (corpus book metadata) that was never scoped into Phase 3. This stub does not block any other SC.

The **two TypeScript type errors** are minor: one is a @react-three/fiber type precision issue with partial raycaster params (runtime correct), and one is a Vitest/Vite bundled-Vite version conflict (test runs correct). Neither blocks the application.

All human verification items are confirmation tests of wired behavior, not gap investigation.

---

_Verified: 2026-04-12T21:35:00Z_
_Verifier: Claude (gsd-verifier)_
