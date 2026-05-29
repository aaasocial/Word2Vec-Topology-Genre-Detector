# Phase 12: The Reading Room (full front-end redesign) - Context

**Gathered:** 2026-05-29
**Status:** Ready for execution (discuss skipped — design handoff is the contract; two user decisions captured below)

<domain>
## Phase Boundary

A wholesale editorial redesign of the entire front end into a "reading room" idiom (Spectral + JetBrains Mono, warm-paper palettes, square rules, hard offset shadows, marginalia), wrapping the **same** word2vec/topology product. It is a **reskin + restructure, not a backend change** — every data hook and endpoint is reused unchanged.

8 masthead-routed screens (landing, collection, card, topology, study, upload, verdict, about) + 3 cross-cutting systems (Guide side-sheet, 6-stop guided tour, Tweaks). Authoritative spec: `.planning/phases/12-reading-room-redesign/design_handoff/design_handoff_reading_room/README.md` and `design_files/tokens.md` — **README wins** over prototype/screenshots on any conflict.

**This supersedes the Phase 10/11 front end** (see D-U2). Phase 10 (indigo theme, light/dark/system) and Phase 11 (onboarding chain) remain historically "met" for their milestone; their UI is replaced by this redesign.
</domain>

<decisions>
## User decisions (2026-05-29 — override the handoff where noted)

- **D-U1 — Plate engine: keep the existing R3F/WebGL scatter, reskinned (OVERRIDES handoff L-12).** The handoff draws plates as SVG with a CSS-tilt "3D". The user chose to **retain the existing react-three-fiber WebGL scatter** (`ScatterCanvas`/`PointCloud`) for the **main interactive plates** (Collection, Catalog-card detail), restyled to the reading-room look: scene background → `paper`, point colors → the 8 reading-room genre hexes, reading-room frame + corner rulings around the canvas, projection chips + 2D/3D wired to the existing store. Rationale: preserve true 3D + 60fps WebGL already built.
  - **Nuance (Claude's discretion):** small *decorative* mini-plates (Study folio left/right + center, Verdict "where it landed", Card sibling thumbnails) should be lightweight **SVG**, NOT additional WebGL canvases — multiple R3F contexts on one screen is wasteful and slow. Only the primary interactive plate per screen is R3F. The Topology VR viewer stays R3F (existing `VRViewer`).
- **D-U2 — Full replacement of the Phase 10/11 front end.** The Reading Room wholly replaces the indigo theme + the light/dark/system toggle (→ paper/accent/density Tweaks) and the How-It-Works→tour onboarding chain (→ the Guide side-sheet + 6-stop guided tour). Remove the Phase 10 indigo `:root`/`:root.light` system and the Phase 11 onboarding orchestration from the live UI. Keep the underlying data/stores/hooks.

## Locked decisions from the handoff (L-01..L-14)

- **L-01 — Visual system:** Editorial reading-room (Spectral + JetBrains Mono, paper palettes, square rules, hard `Npx Npx 0` shadows). Replaces Phase 10 indigo entirely.
- **L-02 — Theming model:** one paper palette + one accent per session (Tweaks). 4 palettes (cream default / bone / ivory / newsprint), 4 accents (oxblood default / libgreen / ink / prussian). Values in tokens.md.
- **L-03 — Density:** Tweak `carrel` (3-col w/ marginalia, default) vs `study` (2-col, marginalia hidden).
- **L-04 — Navigation:** top masthead — wordmark + items (The Collection · Topology · A Comparative Study · Submit a Text · About) + "Guide" button. Active item: accent underline, ink color, roman; others italic, muted.
- **L-05 — Genre palette:** fixed 8 hexes (tokens.md §Genre palette), theme-independent. NOTE these differ from the Phase 9/10 genre hexes — use the reading-room values: adventure `#C45533`, gothic `#6E4A8E`, historical `#B68D3F`, literary `#3E7F75`, mystery `#3A6CA8`, romance `#B65385`, speculative `#5E5EA6`, western `#A85C2D`.
- **L-06 — Footnotes:** inline accent superscripts open a centered modal note (`FootnoteHost`). 6 notes, copy locked in prototype `app.jsx FOOTNOTES`.
- **L-07 — Guide:** right side-sheet, 3 tabs. Auto-opens once on first visit (localStorage `rr.guide.seen.v1`); reopenable from masthead.
- **L-08 — "How it works":** 5 numbered method steps, each with a **live mini-figure** (embedding · centroid · persistent-homology ε-sweep · projection · verdict bars). Figures render at rest (not gated behind entrance animations / document timeline).
- **L-09 — Guided tour:** 6 stops, spotlight + margin card; navigates the **real** screens. Order = masthead reading order. Pre-selects a region when it reaches Topology.
- **L-10 — Tour spotlight:** four dim panels frame the live anchor (`rgba(38,33,27,0.46)`) + a `1.5px accent` frame with corner ticks. Card pins to the quadrant opposite the anchor.
- **L-11 — Topology tab:** hero VR filtration viewer + ε slider (left); persistence diagram + image (right). H₁ only. ε links all three. Projection changes only the 3D view. Reading-room skin uses the **accent** for the ε slider/sweep and the selected **genre hex** for the heatmap ramp (`paper2 → genreHex → ink`) — NOT the amber `#FACC15` from the standalone topology bundle.
- **L-12 — Plate (scatter):** *(superseded by D-U1 — use reskinned R3F instead of SVG for the main interactive plates; SVG only for decorative mini-plates.)* Behaviour to preserve: hover → margin note + tooltip; click → catalog card; region filter dims non-selected to ~0.15; 2D/3D toggle + projection chips.
- **L-13 — Verdict voice:** confidence < 0.80 reported as **"marginal"**, never "wrong". Two-track framing (centroid ~0.76 / topology ~0.24 contributions). (Map to real `useExplain` track contributions; don't hardcode the demo numbers.)
- **L-14 — Stage:** the fixed 1240×780 artboard is a **prototype framing device only**. Production is a **fluid editorial layout** (README §10) — sticky masthead, CSS-grid columns that collapse, square/centered figures. Do NOT ship the fixed artboard.

## Claude's Discretion

- Mini-plate engine (SVG) per D-U1 nuance.
- Mapping the prototype's `useReducer` router to Zustand: extend `visualizationStore` (route, genreFilter, hovered/selectedBookId, studyA/studyB, projection, dim) + `uiStore` (guideOpen, tourActive/tourStep, tweaks) — or a small new `readingRoomStore`. Executor picks the cleanest split consistent with existing stores.
- Whether to keep the now-unused Phase 10 components on disk (dead) or delete them — prefer deleting clearly-dead indigo-only components once their responsibility is re-homed, but never delete a data hook or a component still referenced.

</decisions>

<canonical_refs>
## Canonical References

### The contract (read FIRST, every plan)
- `.planning/phases/12-reading-room-redesign/design_handoff/design_handoff_reading_room/README.md` — authoritative spec (§4 locked decisions, §6 per-screen layout+copy, §7 interactions, §8 reused-vs-new, §9 data contracts, §10 responsive, §11 NOT-list, §12 implementation order)
- `.../design_files/tokens.md` — full token system (type scale, 4 palettes, 4 accents, 8 genre hexes, rules/shadows)

### Runnable prototype (behavioural reference — do NOT ship verbatim; SVG→reskinned-R3F per D-U1)
- `.../design_files/prototype/shell.jsx` — palettes/accents, masthead, footer, footnote host
- `.../design_files/prototype/app.jsx` — reducer/router, FOOTNOTES copy, Stage, Tweaks wiring
- `.../design_files/prototype/shared.jsx` — GENRES, scatter generators, shared primitives
- `.../design_files/prototype/screens_landing.jsx` — Landing + About
- `.../design_files/prototype/screens_collection.jsx` — Collection + CorpusScatter
- `.../design_files/prototype/screens_card.jsx` — Catalog card
- `.../design_files/prototype/screens_study.jsx` — Comparative Study
- `.../design_files/prototype/screens_topology.jsx` — Topology (reading-room skin)
- `.../design_files/prototype/screens_reading.jsx` — Submit a Text + The Reading
- `.../design_files/prototype/guide.jsx` + `guide_figures.jsx` — Guide side-sheet + 5 live figures
- `.../design_files/prototype/tour.jsx` — 6-stop spotlight tour
- `.../design_files/prototype/tweaks-panel.jsx` — Tweaks host + controls
- `.../screenshots/01-landing.png` … `10-guided-tour.png` — visual ground truth per screen

### Existing app (reused unchanged — README §8)
- Data hooks: `frontend/src/hooks/useScatterData.ts`, `useCorpusBooks.ts` (verify exact names), `useClassify.ts`, `useExplain.ts`, `useVRData.ts`, `usePersistenceDiagram.ts`, `usePersistenceImage.ts`
- Stores: `frontend/src/stores/visualizationStore.ts`, `uploadStore.ts`, `uiStore.ts`, `preferencesStore.ts`
- Reused components (restyle skin): `components/canvas/ScatterCanvas.tsx` + `PointCloud.tsx` (reskinned per D-U1), `components/topology/*` (VRViewer, EpsilonSlider, PersistenceDiagram, PersistenceHeatmap), tour `tour/anchors.ts` + `TourOverlay.tsx`
- `frontend/src/index.css` — replace the Phase 10 indigo `:root`/`:root.light` with the reading-room token system
- `frontend/src/App.tsx` — replace the current tabbed shell + Phase 11 onboarding orchestration with the masthead router + Guide/tour/Tweaks
- `frontend/src/constants/genres.ts` — genre hexes get the reading-room values (L-05); check every consumer

### Endpoints (unchanged — README §9)
- `GET /api/viz/vr/{genre}?projection=…` · `GET /api/viz/persistence-diagram/{genre}?dim=1` (+ `/book/{id}`) · `GET /api/viz/persistence/{genre}?dim=1` (+ `/book/{id}`)
- Plate/classify/explain via the existing hooks (their shapes are source of truth; the prototype's `data.js` mock is layout-only, NOT canonical).

</canonical_refs>

<code_context>
## Existing Code Insights

- Current front end is the Phase 10/11 tabbed indigo app: `App.tsx` (tab router + onboarding orchestrator), `index.css` (`:root`/`:root.light` HSL), `components/{canvas,sidebar,topology,compare,nav,explanation,settings}`, `tour/`, stores, hooks.
- The redesign keeps the **data layer + R3F scatter + topology components** and rewrites the **shell, screens, theming, onboarding** around them.
- `death === Infinity` arrives from the backend's custom JSON encoder in persistence-diagram payloads — filter finite vs infinite BEFORE computing axis bounds (known v1 auto-rescale trap; still applies in the reskinned topology diagram).
- Dev server runs on :5173 (Vite HMR); backend :8000 + Redis + arq worker live. The app will be in heavy flux during the rewrite — keep it booting between commits.
- Tests: Vitest + RTL (`__tests__/`), Playwright tour-anchor smoke (`tests/e2e/`). Phase 9 deferred test failures (useClassify.test.ts ×5, SlowTierParams.test.tsx ×1) stay deferred. Many Phase 9/10 component tests will need updating or removing as their components are replaced — treat test churn as expected, but keep the suite green for surviving components and add tour-anchor coverage for the new 6-stop tour.

## Integration Points

- Masthead router replaces the tab bar; routes drive which screen renders.
- The existing tour system (`tour/anchors.ts` + `TourOverlay`) is extended: new anchors `plate`, `catalog-rail`, `catalog-card`, `topology-plate`, `study-pickers`, `reading-desk`; new 6-stop `TOUR_STEPS`; reading-room spotlight styling (four dim panels, not the Phase 10 single glow ring).
- `PipelineExplanation` (Phase 9/10 modal) becomes the Guide's "How it works" tab with the 5 live figures.

</code_context>

<specifics>
## Plan structure (7 plans, waved per README §12)

- **12-01 (Wave 1, foundation)** — RR-01: tokens + type system in `index.css` (replace indigo), paper/accent/genre tokens, Tweaks store + panel (persisted), masthead + footer + FootnoteHost, Zustand route/ui state, the fluid editorial layout scaffold, and the two simplest screens to prove the shell: **Landing** + **About**. Everything else depends on this.
- **12-02 (Wave 2)** — RR-02: Collection (catalog rail + reskinned-R3F plate + marginalia + region filter + Find), on `useScatterData`/`useCorpusBooks`.
- **12-03 (Wave 2)** — RR-03 + RR-04: Catalog card screen + Comparative Study folio.
- **12-04 (Wave 2)** — RR-05: Submit a Text → The Reading (verdict) on `useClassify`/`useExplain`.
- **12-05 (Wave 3)** — RR-06: Topology reading-room reskin (existing R3F VRViewer + EpsilonSlider + PersistenceDiagram + PersistenceHeatmap; accent ε signal; genre-hex heatmap ramp).
- **12-06 (Wave 3)** — RR-07 + RR-08: About-already-done-in-12-01 so this is the **Guide** (Welcome / How to wander / How-it-works 5 figures) + the **6-stop guided tour**.
- **12-07 (Wave 4)** — RR-09: responsive pass + animation-robustness pass; final theme/Tweaks verification; suite + Playwright green.

Plans run sequentially (worktrees disabled). 12-01 must land before all others (shared shell/tokens/router). 12-02..12-04 depend only on 12-01. 12-05 depends on 12-01. 12-06 depends on 12-01 (+ ideally the screens exist so the tour can navigate them). 12-07 last.

</specifics>

<deferred>
## Deferred Ideas

- The standalone `topology_tab_handoff` bundle (indigo-themed topology spec with amber ε signal) was set aside; the reading-room topology skin (RR-06) is built from this bundle's `screens_topology.jsx` instead. If a future phase wants the indigo topology polish independently, that bundle can be revisited.
- Deleting dead Phase 10 indigo-only components vs leaving them — executor's call per plan; not a blocker.
- Mobile-native experience — still out of scope (README §10 only asks for graceful fluid collapse, not a mobile app).

</deferred>

---

*Phase: 12-reading-room-redesign*
*Context gathered: 2026-05-29 (design handoff folded in; 2 user decisions D-U1/D-U2 override/confirm scope)*
