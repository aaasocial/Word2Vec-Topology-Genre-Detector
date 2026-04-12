# Phase 4: Advanced Visualization and Parameter Controls — Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the advanced topology visualization layer, genre comparison mode, recompute-tier parameter controls, pipeline explanation, export, and a topology disclaimer.

**In scope (Phase 4):** TOPO-01–07, COMP-01–02, PARAM-03–06, EXPLAIN-01, UX-03, UX-05

**NOT in scope:** Deployment (Phase 5), basic scatter/sidebar controls (Phase 3 — already built), any new classification pipeline logic.

The Phase 3 frontend (scatter, sidebar, upload flow) is the foundation. Phase 4 extends it with new tabs, panels, and the settings drawer — it does NOT replace or refactor Phase 3 components.

</domain>

<decisions>
## Implementation Decisions

### Top-Level Navigation — Tab Layout
- **Decision: Top nav tabs with three modes: Scatter / Topology / Compare**
- Three tabs rendered as a top navigation bar (same dark visual language as Phase 3).
- Each tab is a full-canvas view — switching tabs replaces the main content area.
- Scatter tab = Phase 3 app unchanged.
- Topology tab = persistence image heatmap (with H0/H1/H2 switcher) + Vietoris-Rips 3D viewer.
- Compare tab = overlay comparison mode within the scatter canvas (see Compare Layout below).
- Active tab is visually highlighted (same style as existing projection tabs in Phase 3).

### Topology Tab Layout
- **Decision: Two-panel layout within the Topology tab**
- Left panel: Persistence image heatmap (2D, scale vs. persistence axes, H0/H1/H2 tabs).
- Right panel: Vietoris-Rips 3D viewer — same word positions as current scatter projection, separate orbit camera.
- Both panels share the same selected genre/book — changing selection in sidebar updates both simultaneously (TOPO-06, TOPO-07 brushing-and-linking).
- H0/H1/H2 tabs on the persistence panel — H2 tab disabled unless enabled by toggle.

### Vietoris-Rips Data Strategy
- **Decision: Precomputed full edge graph, browser-side filtering**
- Backend precomputes all VR edges up to ε_max at build time and caches as a compact JSON payload.
- Payload structure: `[{word_a, word_b, eps_birth, feature_type}...]` where `feature_type` indicates H0/H1/H2 boundary membership.
- Browser receives the full payload once on tab load; slider drag filters edges by `eps_birth <= current_ε` in real time — no server round-trips.
- Birth/death highlight events (TOPO-05): edges that are born or die at the current ε step are highlighted in a distinct accent color (separate from genre colors).
- New backend precompute step: `python -m backend.pipeline.precompute_vr` adds to the existing precompute pipeline.

### Genre Comparison Layout
- **Decision: Compare mode overlaid within the Scatter tab**
- A "Compare" toggle/button in the sidebar activates comparison mode within the main scatter canvas.
- A second genre picker appears in the sidebar below the first.
- Both genres' brightness overlays render simultaneously in the 3D scatter using dual coloring (each genre's palette color, with non-selected points dimmed to near-invisible).
- Persistence heatmaps for both genres appear stacked in the sidebar below the genre pickers (Genre A heatmap → Genre B heatmap).
- Consistent color scale applied across both heatmaps (COMP-02) — scale range computed from both datasets combined.
- Selecting a second genre activates compare mode; deselecting it returns to single-genre mode.

### Advanced Parameter Controls
- **Decision: Separate settings drawer (gear icon)**
- A gear/settings icon in the top navigation opens a slide-in drawer from the right.
- Drawer contains slow-tier and very-slow-tier parameters, separate from the main sidebar.
- Slow-tier parameters (PARAM-03): persistence image resolution (M×M), Gaussian σ, K (cluster count), α (feature weighting), SVM γ and C, ε_max and step size — each with a slider/input, plus a "Parameters changed — Recompute" badge when dirty.
- Very-slow-tier (PARAM-04): Word2Vec dimension, context window — these show a ⚠ warning ("This will retrain the Word2Vec model — est. 2–5 min") with a confirm dialog before triggering.
- Recompute button at the drawer bottom triggers only the affected downstream subtree (PARAM-06): changing projection recomputes 3D coords only; changing σ recomputes persistence images only.
- While recomputation runs: visualization remains interactive with a dim overlay + "Updating…" badge (PARAM-05).

### Pipeline Explanation
- **Decision: Fullscreen slide deck overlay**
- A "How it works" button (in the sidebar or top nav) opens a fullscreen overlay on top of the main app.
- 6 slides covering: Word2Vec embedding → TF-IDF weighting → Weighted point cloud → Persistent homology (with mini VR animation) → Persistence image → SVM classification.
- Each slide uses the user's currently selected/uploaded book's actual data where available; falls back to genre average or corpus average if no book selected.
- Navigation: Prev / Next buttons + step indicator (e.g. "Step 3 / 6"). Keyboard left/right arrows work. Esc closes.
- Overlay close returns user to wherever they were in the app.

### Topology Disclaimer (UX-05)
- **Decision: Persistent banner below the top nav tabs**
- A single-line disclaimer appears below the tab bar in both Scatter and Topology tabs:
  "Topology computed in N-dimensional space — 3D view is a lossy projection."
- Styled as a subtle muted text bar (not a dismissible alert). Always visible.

### Export (UX-03)
- **Decision: Export button in each panel header**
- Scatter tab: "Export PNG" button in sidebar exports the current WebGL canvas as PNG (using Three.js `renderer.domElement.toDataURL()`).
- Topology tab: "Export PNG" for heatmap canvas; "Export CSV" for current persistence diagram data.
- No SVG export (WebGL renders to bitmap; Canvas 2D renders for heatmap can support PNG or SVG as implementation allows).

### Claude's Discretion
- Exact animation/transition when switching between tabs
- Loading skeleton style for topology panels while data loads
- Exact color for VR birth/death highlight (must be distinct from genre palette — likely white or bright yellow)
- Slider debounce timing for ε slider (suggest 16ms for 60fps feel)
- Exact compact payload format for VR edges (binary vs. JSON — optimize for size)

</decisions>

<specifics>
## Specific Ideas

- VR 3D viewer should reuse the same word positions as the current scatter projection (not a separate embedding) so the user can mentally correlate the two views
- Compare mode heatmaps should use a shared colormap range — compute min/max from both datasets combined, not independently per genre
- The "How it works" slide for persistent homology should embed a mini interactive VR animation (not just a static image) — this is the most important educational moment
- Existing `PointCloud.tsx` shader approach can be extended for the VR viewer (THREE.Points for words + THREE.LineSegments for edges)
- shadcn/ui `Sheet` component (slide-in drawer) is the right primitive for the settings drawer
- shadcn/ui `Dialog` for the pipeline explanation overlay and for the very-slow-tier confirm dialog

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 3 Frontend (integration base)
- `frontend/src/components/canvas/PointCloud.tsx` — ShaderMaterial approach for THREE.Points; extend for VR edge rendering
- `frontend/src/components/canvas/ScatterCanvas.tsx` — R3F canvas setup, camera controller integration
- `frontend/src/stores/visualizationStore.ts` — Zustand store; extend with topology/comparison state
- `frontend/src/components/sidebar/Sidebar.tsx` — Sidebar structure; settings drawer connects here
- `frontend/src/components/sidebar/ControlSliders.tsx` — Existing slider pattern to follow for new param controls
- `frontend/src/App.tsx` — Top-level layout; tab navigation added here

### Backend Pipeline (precompute extension)
- `backend/pipeline/precompute_viz.py` — Existing precompute for scatter projections; add VR precompute here or as sibling
- `backend/cache/store.py` — Content-addressed disk cache (cache_key, cache_get, cache_put) — VR data uses same cache
- `backend/api/routes/viz.py` — Existing viz endpoints; new VR + persistence endpoints added here

### Configuration & Data
- `config/params.yaml` — Pipeline parameters (σ, K, α, ε_max, resolution) — all slow-tier params sourced from here
- `corpus/books.yaml` — Genre labels; needed for persistence image per-genre precompute
- `.planning/REQUIREMENTS.md` — Full specs for TOPO-01–07, COMP-01–02, PARAM-03–06, EXPLAIN-01, UX-03, UX-05

### Roadmap
- `.planning/ROADMAP.md` — Phase 4 goal, success criteria, and requirement IDs in scope

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PointCloud.tsx` + custom ShaderMaterial — extend for VR viewer (add `THREE.LineSegments` layer for edges on top of existing points)
- `ScatterCanvas.tsx` — R3F canvas wrapper; VR viewer needs its own canvas instance (separate `<Canvas>` with its own OrbitControls)
- `visualizationStore.ts` — Add `selectedHomologyDim`, `vrEpsilon`, `compareGenre`, `compareMode` slices
- `useVisualizationStore` pattern — hooks for new data fetching (VR edges, persistence images) follow same React Query pattern as `useScatterData`
- `ControlSliders.tsx` — Slider + label pattern is the template for new parameter sliders in the settings drawer
- shadcn/ui `Sheet` (already installed) — Settings drawer primitive
- shadcn/ui `Dialog` (already installed) — Pipeline explanation overlay + very-slow confirm dialog
- shadcn/ui `Tabs` (already installed) — H0/H1/H2 tab switcher on persistence panel

### Established Patterns
- Zustand `useVisualizationStore.getState()` in `useFrame` for hot-path reads (no subscription overhead)
- React Query `staleTime: Infinity` for precomputed data (VR edges, persistence images are also precomputed)
- `THREE.BufferGeometry` with typed arrays for high-performance rendering

### Integration Points
- Top nav tab bar slots into `App.tsx` above the canvas/sidebar flex layout
- Settings drawer (gear icon) likely rendered from `Sidebar.tsx` or `App.tsx`
- Topology tab replaces the `<ScatterCanvas>` region with a new two-panel layout when active
- Compare mode adds a second `GenreSelect` to the existing sidebar without restructuring it

</code_context>

<deferred>
## Deferred Ideas

- SVG export for WebGL canvas (not technically feasible for THREE.js renderer; PNG only)
- Mobile-responsive topology views (out of scope per PROJECT.md)
- Per-book pipeline explanation (only corpus/genre-level data is precomputed; book-level requires user upload first — show genre average as fallback)
- Animated slide transitions between pipeline explanation steps (nice-to-have; static crossfade acceptable)

</deferred>

---

*Phase: 04-advanced-visualization-and-parameter-controls*
*Context gathered: 2026-04-12 via discuss-phase*
