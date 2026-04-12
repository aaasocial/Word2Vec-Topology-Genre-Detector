---
phase: 3
slug: frontend-core-and-3d-visualization
status: draft
created: 2026-04-12
---

# Phase 3: Frontend Core and 3D Visualization — Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the frontend application: an interactive 3D word embedding scatter plot with TF-IDF brightness encoding, genre coloring, projection switching (PCA/KPCA/UMAP/t-SNE), hover/click interactions, and a file upload panel that classifies a book and shows it in the scatter.

The Phase 2 FastAPI backend (already built) handles all computation. This phase is purely frontend + the new API endpoints the frontend needs.

**In scope (Phase 3):** INFRA-04, VIZ-01–11, CLASS-03, PARAM-01, PARAM-02, UX-04
**NOT in scope (Phase 4):** Topology views (TOPO-01–05), slow/very-slow parameter controls (PARAM-03–06), pipeline explanation (EXPLAIN-01)

</domain>

<decisions>
## Implementation Decisions

### Layout & Visual Theme
- **Decision: Dark full-screen canvas with right sidebar**
- 3D scatter fills the entire viewport. Controls float in a minimal right sidebar/overlay panel.
- Dark background makes TF-IDF point brightness encoding visually pop.
- Visual language: scientific visualization tool feel (not a dashboard).
- The UI research agent (`/gsd-ui-phase`) should produce a full UI-SPEC.md design contract before planning — this is mandatory for professional visual quality.

### Projection Computation
- **Decision: Server pre-computes all 4 projections at build time**
- All four projections (PCA, Kernel PCA, UMAP, t-SNE) are computed server-side at build/precompute time.
- Served as pre-computed JSON from the API — switching projections is instant (no in-browser recompute).
- Word vectors are NOT sent to the browser — only 3D coordinates + metadata.
- Projection computation runs via a new `python -m backend.pipeline.precompute_viz` script (or extension of existing precompute.py).
- Two new API endpoints (see API Surface below).

### API Surface — New Endpoints Required
- **Decision: Two clean pre-computed endpoints**
- `GET /viz/scatter/{projection}` — returns all word-point records with 3D coords, genre label, word string, TF-IDF weight. Projection is one of: `pca`, `kpca`, `umap`, `tsne`.
- `GET /viz/tfidf/{genre}` — returns per-word TF-IDF weight map for the selected genre (aggregate across all books in that genre).
- `GET /viz/tfidf/book/{gutenberg_id}` — returns per-word TF-IDF weight map for a specific book.
- Both endpoints served from pre-computed disk cache (same content-addressed cache as Phase 2).
- These endpoints live in `backend/api/routes/viz.py` — new file.

### Upload UI
- **Decision: Sidebar panel with drag-and-drop**
- File upload zone lives in the right sidebar panel.
- Supports both drag-and-drop and click-to-browse for .txt and .pdf files.
- pdf → txt conversion happens client-side using the `pdf_to_txt.py` logic ported to a browser-compatible approach, OR user is instructed to use the `scripts/pdf_to_txt.py` script first (simpler for v1).
- Progress shows the 6 WebSocket pipeline steps inline in the sidebar panel (step name + progress bar).
- On classification complete: the uploaded book's word-points appear in the scatter plot highlighted in a distinct accent colour (white/gold), separate from genre colours. A label floats near the centroid of the book's points.
- Classification result (genre, confidence, OOV count) shown inline in the sidebar below the upload zone.

### Component Library & Styling
- **Decision: Tailwind CSS + shadcn/ui**
- Tailwind CSS for all utility styling.
- shadcn/ui for pre-built accessible components: dropdowns, sliders, tooltips, progress bars, dialog, command palette.
- shadcn components are copy-paste into `frontend/src/components/ui/` — full ownership, no library lock-in.
- Dark theme is default; shadcn dark mode class strategy.
- Font: system-ui or a clean mono/sans pairing (UI researcher to specify).

### Frontend Stack (Locked by INFRA-04)
- **Framework:** React 18+ with Vite as bundler
- **3D rendering:** react-three-fiber (R3F) + @react-three/drei for helpers
- **State management:** Zustand (lightweight, no boilerplate, good with R3F)
- **Data fetching:** React Query (TanStack Query) for REST endpoints; native WebSocket for classification progress
- **Root:** `frontend/` directory at project root, separate from `backend/`

### 3D Scatter Implementation Details
- Points rendered as instanced mesh (Three.js InstancedMesh) for performance at 50k points.
- TF-IDF brightness mapped to point opacity and emissive intensity, not separate geometry.
- Genre colours from a fixed palette (VIZ-11 — consistent across all views). Palette defined in a shared constants file.
- Camera controls via `@react-three/drei` OrbitControls — orbit, pan, zoom. Reset camera on R key or button click.
- Hover via raycasting — tooltip shows word, TF-IDF weight, genre, top-5 nearest neighbours.
- Click to select point — selected point stays highlighted through camera movement; detail panel appears in sidebar.
- Word search (VIZ-10): filter/highlight matching points; matched points listed in sidebar.

### Phase 2 Backend — Unchanged
- The Phase 2 API (`/health`, `/corpus/books`, `/corpus/books/{id}/results`, `/classify`, `/ws/classify/{job_id}`) is consumed as-is.
- Only NEW backend additions this phase: `/viz/scatter/{projection}`, `/viz/tfidf/{genre}`, `/viz/tfidf/book/{id}`, and the precompute script extension for projections.

### PDF Upload in v1
- For Phase 3, PDF support via the browser is deferred. Users upload .txt files directly.
- The `scripts/pdf_to_txt.py` script (already built) serves as the PDF→txt conversion path for now.
- Browser-native PDF conversion is a Phase 4 or later enhancement.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 2 API (integration points)
- `backend/api/routes/classify.py` — POST /classify + WS /ws/classify/{job_id} (subscribe-before-enqueue pattern)
- `backend/api/routes/corpus.py` — GET /corpus/books, GET /corpus/books/{id}/results
- `backend/api/app.py` — FastAPI app factory, lifespan with Redis/arq
- `backend/pipeline/precompute.py` — Build-time precompute script (extend for viz projections)
- `backend/cache/store.py` — Content-addressed disk cache (cache_key, cache_get, cache_put)

### Configuration
- `config/params.yaml` — Pipeline parameters (word2vec window=15, k=200, etc.)

### Corpus Metadata
- `corpus/books.yaml` — Genre labels and Gutenberg IDs for all 100 bundled books

### Requirements
- `.planning/REQUIREMENTS.md` — Full requirement specs for VIZ-01–11, CLASS-03, PARAM-01–02, UX-04, INFRA-04

### Roadmap
- `.planning/ROADMAP.md` — Phase 3 goal and requirement IDs in scope

</canonical_refs>

<specifics>
## Specific Ideas

- Use Three.js `InstancedMesh` for 50k points — individual `Mesh` per point will kill framerate
- Zustand store should have slices: `visualizationSlice` (selected genre, book, point, projection), `uploadSlice` (job state, progress, result), `uiSlice` (sidebar open/closed, search query)
- Genre colour palette should be defined once in `frontend/src/constants/genres.ts` and imported everywhere (VIZ-11)
- shadcn/ui Slider component for the per-book slider (VIZ-05) — smooth with debounce at 200ms (PARAM-02)
- The UI researcher agent should be run via `/gsd-ui-phase 3` BEFORE planning — it produces a UI-SPEC.md that locks typography, spacing, colour palette, and component visual specs
- React Query's `staleTime: Infinity` for scatter data (pre-computed, never stale mid-session)

</specifics>

<deferred>
## Deferred Ideas

- Browser-native PDF→txt conversion (deferred to Phase 4+; `scripts/pdf_to_txt.py` covers the use case)
- Topology views (persistence images, animated Vietoris-Rips) — Phase 4 scope
- Slow/very-slow parameter recompute controls — Phase 4 scope
- Pipeline explanation walkthrough — Phase 4 scope
- Mobile responsive layout — mentioned in PROJECT.md as out of scope for v1

</deferred>

---

*Phase: 03-frontend-core-and-3d-visualization*
*Context gathered: 2026-04-12 via discuss-phase*
