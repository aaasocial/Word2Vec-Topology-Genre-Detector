---
phase: 12-reading-room-redesign
plan: 12-05
subsystem: ui
tags: [react, r3f, three, canvas-2d, zustand, react-query, reading-room, topology, persistent-homology]

# Dependency graph
requires:
  - phase: 12-01
    provides: reading-room tokens/theme (paper/paper2/card/ink/muted + accent), readingRoomStore (route + tweaks), L-05 genre hexes, masthead router, FootnoteHost (note 5 = topology track), the imperative scene-bg pattern
  - phase: 04-frontend-core-and-3d-visualization
    provides: VRViewer/VREdges/EpsilonSlider R3F filtration + useVRData
  - phase: 06-v1-bug-fix-sweep
    provides: PersistenceDiagram/PersistenceHeatmap + usePersistenceDiagram/usePersistenceImage (Infinity-before-bounds, √persistence dots, ∞ strip)
provides:
  - Topology screen (screens/Topology.tsx) — reading-room §6.4 / L-11 composition: header (title + Region chips + projection chips), 1.5fr R3F VR hero + accent ε slider + loops-alive readout, 300px side column (persistence diagram + image), empty state, N-D disclaimer
  - Reskinned VRViewer (paper scene bg, genre-hex nodes, accent edge flash → ink hairline rest)
  - Reskinned EpsilonSlider (accent-filled track, replaces #FACC15)
  - Reskinned PersistenceDiagram (accent sweep lines + shaded alive corner at ε, alive dots opaque+ink outline, √ dots, ∞ strip, Infinity filtered before bounds)
  - Reskinned PersistenceHeatmap (paper2→genreHex→ink ramp + horizontal density legend + ε birth-axis guide)
  - lib/heatmap.ts: readingRoomRamp + renderReadingRoomHeatmap (genre-hex ramp; PLASMA renderHeatmap retained)
  - lib/vrFiltering.ts: filterEdgesByEpsilon now takes highlight/rest colors (accent + ink)
  - data-tour-id="topology-plate" anchor (for the 12-06 tour)
affects: [12-06-guide-tour, 12-07-responsive]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "VRViewer scene.background reads --paper imperatively (re-applied on the paper Tweak, no canvas remount — PITFALLS §13 / the ScatterCanvas pattern); edge highlight/rest colors read --accent/--ink and recompute on the accent Tweak"
    - "ε links all three windows from one store field (visualizationStore.vrEpsilon): VREdges hot-path reads it per frame; PersistenceDiagram re-paints sweep+alive shading on it; PersistenceHeatmap draws an ε birth-axis guide on it; the screen derives the {n} edges · {k} loops-alive readout from useVRData + usePersistenceDiagram"
    - "Topology computed in the full embedding — projection chips drive only useVRData (the hero), never the diagram/image (both keyed on genre+dim only)"

key-files:
  created:
    - frontend/src/components/screens/Topology.tsx
  modified:
    - frontend/src/components/topology/VRViewer.tsx
    - frontend/src/components/topology/VREdges.tsx
    - frontend/src/components/topology/EpsilonSlider.tsx
    - frontend/src/components/topology/PersistenceDiagram.tsx
    - frontend/src/components/topology/PersistenceHeatmap.tsx
    - frontend/src/components/topology/TopologyPanel.tsx
    - frontend/src/lib/vrFiltering.ts
    - frontend/src/lib/heatmap.ts
    - frontend/src/App.tsx
    - frontend/src/components/topology/__tests__/PersistenceHeatmap.test.tsx
    - frontend/tests/e2e/tour-anchors.spec.ts

key-decisions:
  - "vrFiltering signature kept birthWindow as the 4th positional arg (highlight/rest appended as 5th/6th) so the existing vrFiltering.test.ts 4-arg calls (passing 0.005 as birthWindow) stay green — additive, not breaking"
  - "Density legend rendered with stepped fillRect (readingRoomRamp per column) instead of ctx.createLinearGradient — the jsdom canvas mock lacks createLinearGradient, and this keeps the legend identical to the heatmap's own ramp"
  - "TopologyPanel re-exports the new Topology screen (the Phase 10 dual-panel container is superseded); the screen owns the whole §6.4 composition"
  - "tour-anchors.spec.ts rewritten to assert the live reading-room anchors (plate, catalog-rail, topology-plate, study-pickers, reading-desk) via masthead navigation — the Phase 10 anchors it used (scatter-canvas/genre-select/topology-tab/etc.) were orphaned when 12-01 replaced the tabbed shell; the full 6-stop TOUR_STEPS rewrite remains 12-06's job"
  - "All points in the VR cloud take the region's genre hex (the backend payload doesn't flag ring-vs-dust); matches the screenshot where the region's loop is the whole cloud. Dust recession comes from sizeAttenuation, not a separate ink color"

requirements-completed: [RR-06]

# Metrics
duration: ~11min
completed: 2026-05-29
---

# Phase 12 Plan 05: Topology screen (reading-room skin) Summary

**Re-skinned the Topology tab into the reading-room idiom (RR-06 / L-11): a header (title + Region chips + projection chips), a 1.5fr R3F Vietoris–Rips filtration hero with an accent-filled ε slider and a "{n} edges · {k} loops alive" readout, and a 300px side column with the persistence diagram (accent sweep + shaded alive corner) and persistence image (paper2→genreHex→ink ramp) — one store-held ε links all three, the projection chips reshuffle only the 3D hero, H₁ only.**

## Performance
- **Duration:** ~11 min
- **Started:** 2026-05-29T05:30:34Z
- **Completed:** 2026-05-29T05:41:46Z
- **Tasks:** 4
- **Files modified:** 11 (1 created, 10 modified)

## Accomplishments
- **VR hero reskin.** `VRViewer` now paints its scene background from `--paper` imperatively (re-applied when the paper Tweak changes, no WebGL remount — the same PITFALLS §13 pattern as `ScatterCanvas`); ring/structural nodes take the selected region's reading-room genre hex; freshly-born edges flash the active **accent** (read live from `--accent`) and fade to an ink-ish resting hairline (`--ink`) over ~500ms. The amber `#FACC15` and the indigo subdued literals are gone — `vrFiltering.filterEdgesByEpsilon` now takes the highlight/rest colors as args, and `VREdges` lerps accent→ink in its per-frame fade.
- **Accent ε slider.** `EpsilonSlider`'s filled track is `--accent` (replacing the `#FACC15` literal), reading-room serif/mono type, a 3-decimal `ε` readout, and the edge count below — still store-driven with no server calls.
- **Linked diagram + image.** `PersistenceDiagram` recolored to the reading room (accent dots + ink outline + card ground) with **accent sweep lines** at ε (vertical at birth=ε, horizontal at death=ε) and a **shaded alive corner** (birth ≤ ε ≤ death); loops alive at ε are opaque with an ink outline, the rest dimmed; finite dots scale by √persistence; ∞-death loops sit on the top strip — and `Infinity` is filtered from the finite set **before** axis bounds (the v1 auto-rescale trap, preserved). `PersistenceHeatmap` swaps PLASMA for the **`paper2 → genreHex → ink`** ramp (genreHex = the region's reading-room hex), adds a horizontal **density legend** (vmin · density · vmax), and a faint **ε birth-axis guide** line.
- **Screen composition.** New `screens/Topology.tsx` lays out the header (Plate II label + "The topology of *{Region}*" + the 8 Region chips + the 4 projection chips), the 1.5fr hero (framed R3F viewer with `data-tour-id="topology-plate"`, the "PCA · drag to rotate" + "{n} edges · {k} loop(s) alive" corner rulings, the ε slider, and the caption), the 300px side column (ii diagram + iii image with their descriptive marginalia), the dashed-ring **empty state** ("Pick a region to see its topology."), and the **N-D disclaimer** footer with footnote⁵. Collapses to one column (side hidden) under `study` density.
- **ε wiring + projection invariant.** The screen derives `visibleEdges` from `useVRData` + `getVisibleEdgeCount` and `aliveLoops` from `usePersistenceDiagram` (birth ≤ ε ≤ death, ∞-aware), both off the single `visualizationStore.vrEpsilon`. Projection chips set `visualizationStore.projection`, which keys only `useVRData` (the hero) — the diagram/image hooks are keyed on genre+dim only, so changing the projection never moves them (L-11).

## Task Commits
1. **Task 1: VR hero + ε slider + edge-color plumbing** — `04af82a` (feat)
2. **Task 2: diagram + image reskin + ε links** — `8988e7b` (feat)
3. **Task 3: topology screen composition + header + route** — `ea3f16e` (feat)
4. **Task 4: verify + SUMMARY** — _(this docs commit)_

## Files Created/Modified
- `frontend/src/components/screens/Topology.tsx` — the §6.4 screen (created)
- `frontend/src/components/topology/VRViewer.tsx` — paper scene bg, genre-hex nodes, accent/ink edge colors threaded into VREdges
- `frontend/src/components/topology/VREdges.tsx` — accentColor/restColor props; per-frame fade lerps accent→ink
- `frontend/src/components/topology/EpsilonSlider.tsx` — accent-filled track (was #FACC15), reading-room type
- `frontend/src/components/topology/PersistenceDiagram.tsx` — reading-room recolor + accent sweep + shaded alive corner + alive-aware dots (Infinity still filtered before bounds)
- `frontend/src/components/topology/PersistenceHeatmap.tsx` — paper2→genreHex→ink ramp + density legend + ε birth-axis guide (dropped HomologyTabs + PNG/CSV buttons for the side column)
- `frontend/src/components/topology/TopologyPanel.tsx` — re-exports the new Topology screen
- `frontend/src/lib/vrFiltering.ts` — highlight/rest colors are now passed in (birthWindow stays 4th positional)
- `frontend/src/lib/heatmap.ts` — readingRoomRamp + renderReadingRoomHeatmap (PLASMA renderHeatmap retained for other consumers)
- `frontend/src/App.tsx` — register the Topology route (drops the last PlaceholderScreen + its now-unused import)
- `frontend/src/components/topology/__tests__/PersistenceHeatmap.test.tsx` — updated for the reskin (empty copy, legend caption, vmin/vmax labels)
- `frontend/tests/e2e/tour-anchors.spec.ts` — rewritten for the reading-room anchors (incl. topology-plate)

## Decisions Made
- **Additive vrFiltering signature.** Inserting `highlight`/`rest` as the 4th/5th args would have shifted `birthWindow`, breaking the existing `vrFiltering.test.ts` calls that pass `0.005` positionally. Keeping `birthWindow` 4th and appending the colors 5th/6th preserves those tests verbatim while giving the reading-room edges their accent/ink colors.
- **Stepped-fillRect legend.** The jsdom canvas mock (`src/test/setup.ts`) implements `fillRect` but not `createLinearGradient`, so the density legend renders the ramp column-by-column with `readingRoomRamp` + `fillRect` (jsdom-safe and identical to the heatmap's own ramp).
- **TopologyPanel → re-export.** The Phase 10 dual-panel container is superseded by the screen, so `TopologyPanel` re-exports `Topology` rather than duplicating the layout. Nothing in the live bundle imported it; the re-export keeps any residual importer rendering the new body.
- **Whole cloud = region hex.** `/viz/vr/{genre}` doesn't flag which points are the "ring", so all VR points take the region's genre hex — matching the screenshot, where the region's dominant loop is the cloud. Depth recession is handled by `sizeAttenuation`, not a second ink color.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] jsdom canvas mock lacks `createLinearGradient`**
- **Found during:** Task 2
- **Issue:** the density legend originally used `ctx.createLinearGradient`, which the test-env canvas stub doesn't implement → 3 PersistenceHeatmap tests threw `createLinearGradient is not a function`.
- **Fix:** render the legend ramp with stepped `fillRect` calls driven by `readingRoomRamp` (same ramp math as the heatmap). Works in both jsdom and the browser.
- **Files modified:** `frontend/src/components/topology/PersistenceHeatmap.tsx`
- **Commit:** `8988e7b`

**2. [Rule 3 - Blocking] orphaned Phase 10 anchors in the tour-anchor smoke**
- **Found during:** Task 4
- **Issue:** `tour-anchors.spec.ts` iterated the Phase 10 `TOUR_STEPS` anchors (`scatter-canvas`, `genre-select`, `upload-zone`, `topology-tab`, plus `help-menu`/`theme-toggle`/`compare-tab`/`explain-panel`) — all of which live in the tabbed-shell components that 12-01 unmounted (D-U2). The smoke was broken against the reading-room app before this plan touched it.
- **Fix (scoped to the prompt directive "update the tour-anchor smoke if it references topology"):** rewrote the smoke to navigate the masthead router and assert the live reading-room anchors — `plate` + `catalog-rail` (Collection), **`topology-plate`** (Topology, after selecting Mystery), `study-pickers` (Study), `reading-desk` (Submit a Text). The full 6-stop `TOUR_STEPS`/`anchors.ts` rewrite is explicitly 12-06's scope, so `anchors.ts` was left untouched.
- **Files modified:** `frontend/tests/e2e/tour-anchors.spec.ts`
- **Commit:** _(this docs commit; the spec change rides Task 4)_

## Known Stubs
None. The screen is wired to the real `useVRData` / `usePersistenceDiagram` / `usePersistenceImage` hooks (verified live against the running backend, see below).

## Verification
- `npx tsc --noEmit` → exit 0 (clean) after every task.
- `npx vite build` → 711 modules, built clean (chunk-size warning pre-existing/advisory).
- `npx vitest run` → **167 in-scope tests pass**; the only 6 failures are the documented Phase 9 deferred set (`useClassify.test.ts` ×5 EventSource/WebSocket mock + `SlowTierParams.test.tsx` ×1 `setH2Enabled`), unchanged from the 12-01/12-02 baseline. The topology unit tests pass: `vrFiltering.test.ts` (11), `heatmap.test.ts` (8), `PersistenceDiagram.test.tsx` (4), `PersistenceHeatmap.test.tsx` (5, updated for the reskin).
- `npx playwright test` → **4/4 pass**, including `topology-plate` mounting after the masthead Topology nav + selecting Mystery.
- **Live visual check vs `04-topology.png`** (backend :8000 up, returned 200): captured the Topology screen with Mystery selected + ε scrubbed. Confirmed — header ("PLATE II · THE SHAPE OF A REGION" + "The topology of *Mystery*" in the blue hex), Region chips (Mystery active in its hex), projection chips (PCA active), the framed VR hero on paper with real edges/points + "PCA · drag to rotate" + "93 edges · {k} loops alive" readout, the **accent (oxblood) ε slider** + "ε 2.000" + edge count + caption, the side-column diagram (dots + diagonal + ε sweep) and the genre-hex heatmap + density legend, and the N-D disclaimer with footnote⁵. Layout, copy, accent ε signal, and genre-hex ramp all match. (Live ε scrubbing in the user's browser remains the user's confirm step; the executor verified the end-to-end render programmatically.)

## Next Phase Readiness
- Topology is complete and matches the screenshot. `data-tour-id="topology-plate"` is in place for the 12-06 tour (stop ④, which pre-selects Mystery).
- 12-06 should rewrite `tour/anchors.ts` `TOUR_ANCHORS`/`TOUR_STEPS` to the 6-stop reading-room script (`plate`, `catalog-rail`, `catalog-card`, `topology-plate`, `study-pickers`, `reading-desk`) and extend the tour-anchor smoke accordingly; this plan's smoke already exercises those five live anchors.
- Phase 9 deferred test failures (×6) remain deferred per scope.

## Self-Check: PASSED

Created file `frontend/src/components/screens/Topology.tsx` exists on disk; task commits `04af82a`, `8988e7b`, `ea3f16e` are present in git history.

---
*Phase: 12-reading-room-redesign*
*Completed: 2026-05-29*
