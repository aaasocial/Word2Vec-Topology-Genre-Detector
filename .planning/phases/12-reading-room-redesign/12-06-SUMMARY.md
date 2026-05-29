---
phase: 12-reading-room-redesign
plan: 12-06
subsystem: ui
tags: [react, zustand, onboarding, guide-side-sheet, guided-tour, svg-figures, spotlight, playwright, reading-room]

# Dependency graph
requires:
  - phase: 12-01
    provides: readingRoomStore (guideOpen/guideSeen/tourActive/tourStep + startTour/setTourStep/endTour + goTo route), masthead "Guide" button, FootnoteHost shell, RR_GENRE_HEX, reading-room CSS vars
  - phase: 12-02
    provides: Collection screen with the `plate` (PlateFrame) + `catalog-rail` (CatalogRail) tour anchors
  - phase: 12-03
    provides: Card screen with the `catalog-card` (CatalogCard) anchor + Study folio with the `study-pickers` (StudyFolio) anchor
  - phase: 12-04
    provides: Submit-a-Text screen with the `reading-desk` (ReadingDesk) anchor
  - phase: 12-05
    provides: Topology screen with the `topology-plate` (VRViewer hero) anchor, gated on a selected region
provides:
  - The Guide right side-sheet (480-wide, 3 tabs: 01 Welcome / 02 How to wander / 03 How it works) — the new onboarding (D-U2), auto-opens once per browser via rr.guide.seen.v1, reopens from the masthead, backdrop-closes
  - 5 live "How it works" method figures (FigWordEmbed/FigCentroid/FigTopology/FigProjection/FigVerdict) that render at rest and degrade to a valid static frame in a background tab (L-08)
  - 6-stop guided tour navigating the real screens in masthead order with the reading-room four-panel spotlight + corner-ticked accent frame + opposite-quadrant margin card; pre-selects Mystery at the Topology stop; ←/→/Esc; missing-anchor waits ~700ms then advances
  - tour/anchors.ts TOUR_STEPS rewritten to the 6 reading-room stops (each carrying its route); the 6 reading-room anchors added to TOUR_ANCHORS
affects: [12-07-responsive]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Store-driven tour: readingRoomStore holds tourActive/tourStep; GuidedTour navigates goTo() per stop + pre-selects the region the Topology hero needs; the overlay only frames the named [data-tour-id]"
    - "Animation-robust figures: seed rAF sweeps at a valid frame + initialise transition-driven bars to their target so a paused background tab still shows a coherent figure (never opacity:0→forwards gating)"
    - "Full-viewport four-panel spotlight (fixed-position dim bands + accent frame) replacing the single box-shadow glow — works in the fluid editorial layout (L-14), no fixed artboard"

key-files:
  created:
    - frontend/src/components/guide/Guide.tsx
    - frontend/src/components/guide/GuideFigures.tsx
  modified:
    - frontend/src/tour/anchors.ts
    - frontend/src/tour/TourOverlay.tsx
    - frontend/src/tour/TourProvider.tsx
    - frontend/src/App.tsx
    - frontend/tests/e2e/tour-anchors.spec.ts

key-decisions:
  - "Drove the tour entirely off readingRoomStore (tourActive/tourStep) + a store-backed GuidedTour mount, instead of resurrecting the Phase 10 preferencesStore/useState TourProvider. The legacy TourProvider/useTour exports were kept as thin store-backed shims so the now-dead HelpDropdown still compiles."
  - "Tour navigation lives in GuidedTour (an effect keyed on tourStep), not in TourOverlay: it goTo()s each step's route and setSelectedGenre('mystery') before the Topology stop so the region-gated VR hero actually mounts. The overlay stays presentational + frames whatever anchor the step names."
  - "FigVerdict initialises its bars visible (on=true) and FigTopology seeds ε=0.18 — both render a valid static frame if the document timeline is paused (background tab), satisfying L-08/§7 rather than the prototype's start-hidden-then-reveal."
  - "The 6-stop Playwright test drives the tour itself (begin from the Guide → step Next through all 6) to reach the Card screen's catalog-card anchor, which has no masthead item; the per-masthead checks cover the other five."

patterns-established:
  - "Guide auto-open-once: App mount effect reads guideSeen, openGuide()+markGuideSeen() on first visit (consume-on-fire); persisted via rr.tweaks.v1 payload, semantic key rr.guide.seen.v1"
  - "Reading-room spotlight: four fixed dim bands (rgba(38,33,27,0.46)) + 1.5px accent frame with 4 corner ticks; margin card pins to the viewport quadrant opposite the anchor centre"

requirements-completed: [RR-07, RR-08]

# Metrics
duration: ~10min
completed: 2026-05-29
---

# Phase 12 Plan 06: Guide + guided tour Summary

**The Guide side-sheet (3 tabs incl. 5 background-tab-safe live method figures) plus a 6-stop guided tour that walks the real reading-room screens with a four-panel accent spotlight — the new onboarding that replaces the Phase 11 How-It-Works → tour chain (RR-07/RR-08, D-U2).**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-29T05:49:14Z
- **Completed:** 2026-05-29T05:59:10Z
- **Tasks:** 4
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments
- **The Guide (RR-07, §6.9):** a 480-wide right side-sheet with header "Reader's aid / The Guide" and 3 tabs — **01 Welcome** (what this is + a "you can do three things" card), **02 How to wander** (a prominent "Begin the guided tour" button that closes the sheet and starts the tour + the 6-stop itinerary), **03 How it works** (the 5 live figures). It **auto-opens once per browser** via the persisted `guideSeen` flag (semantic key `rr.guide.seen.v1`, consume-on-fire in an App mount effect), **reopens from the masthead "Guide" button**, and **closes on backdrop click**. Copy is verbatim from the prototype `guide.jsx`; the skin reads the live reading-room CSS vars so it tracks Tweaks.
- **5 live method figures (RR-07, L-08):** `GuideFigures.tsx` recreates FigWordEmbed (the embedding), FigCentroid (weighted-mean position), FigTopology (auto-sweeping VR filtration + drag-scrub), FigProjection (a 300-D cloud flattening onto the UMAP plane), and FigVerdict (probability bars + the marginal verdict). Every figure **renders a valid static frame at rest** and **degrades safely in a background tab** — no `opacity:0→forwards` entrance gating, no document-timeline dependence: FigTopology seeds ε=0.18 (rAF only enriches), FigVerdict initialises bars at their target widths, and FigCentroid/FigProjection animate purely decorative loops over already-visible content. Supersedes the Phase 9/10 `PipelineExplanation` modal visuals.
- **6-stop guided tour (RR-08, §6.10 / L-09/L-10):** `tour/anchors.ts` TOUR_STEPS rewritten to the 6 reading-room stops in masthead order — ① plate ② catalog-rail (collection) ③ catalog-card (card) ④ topology-plate (topology, **pre-selects Mystery**) ⑤ study-pickers (study) ⑥ reading-desk (upload). The store-driven `GuidedTour` navigates `goTo()` to each stop's route (and `setSelectedGenre('mystery')` before Topology so the region-gated VR hero mounts); `TourOverlay` frames the live anchor with the **four-panel spotlight** (`rgba(38,33,27,0.46)` dim bands + a 1.5px accent frame with corner ticks) and pins the **margin card to the viewport quadrant opposite the anchor** (STOP n/6 · title · body · End tour · ← Back · Next →). ←/→/Esc work; a missing anchor waits ~700ms then advances. This **replaces** (not stacks on) the Phase 10 single box-shadow glow + 4-step script.
- **Playwright smoke updated to the 6 stops:** the spec keeps the per-masthead anchor checks (plate/catalog-rail, topology-plate after Mystery, study-pickers, reading-desk) and adds an **end-to-end 6-stop tour test** that begins the tour from the Guide and steps Next through all six stops, asserting each `data-tour-id` mounts and the STOP n/6 card shows — which also reaches the masthead-less Card screen via the tour's own navigation. **5/5 green.**

## Task Commits

Each task was committed atomically (every commit carries the `Co-Authored-By: Claude Opus 4.7 (1M context)` trailer):

1. **Task 1: Guide side-sheet — Welcome + How to wander + auto-open-once** — `eea2f69` (feat)
2. **Task 2: How-it-works 5 live method figures (background-tab safe)** — `2ef0f14` (feat)
3. **Task 3: 6-stop guided tour navigating real screens + reading-room spotlight** — `3df110c` (feat)

**Plan metadata + e2e spec:** _(this docs commit — includes the updated tour-anchors.spec.ts)_

## Files Created/Modified
- `frontend/src/components/guide/Guide.tsx` — the 480-wide right side-sheet: 3-tab header/nav, Welcome + How-to-wander panels, footer (Continue / Enter the room →), backdrop close; "Begin the guided tour" calls `startTour()` (which flips `guideOpen` off + sets `tourActive`)
- `frontend/src/components/guide/GuideFigures.tsx` — `MethodPanel` (5 numbered steps) + the 5 live figures, recreated in the reading-room skin from the prototype; deterministic mulberry32 scatter for FigProjection; genre hexes from `RR_GENRE_HEX`
- `frontend/src/tour/anchors.ts` — TOUR_STEPS → the 6 reading-room stops (each with `route`); TOUR_ANCHORS gains plate/catalog-rail/catalog-card/topology-plate/study-pickers/reading-desk (legacy Phase 10 anchors retained for dead-component compile)
- `frontend/src/tour/TourOverlay.tsx` — four-panel fixed-position spotlight + accent frame + corner ticks; opposite-quadrant margin card; ←/→/Esc; ~700ms missing-anchor wait-then-advance (replaces the single glow ring)
- `frontend/src/tour/TourProvider.tsx` — store-driven `GuidedTour` (per-stop `goTo()` + Mystery pre-select at Topology) + back-compat `TourProvider`/`useTour` store-backed shims for the dead HelpDropdown
- `frontend/src/App.tsx` — mounts `<Guide />` + `<GuidedTour />`; the auto-open-once effect (guideSeen)
- `frontend/tests/e2e/tour-anchors.spec.ts` — per-masthead anchor checks + the end-to-end 6-stop tour test

## Decisions Made
- **Store-driven tour, not the Phase 10 provider.** The readingRoomStore already modelled `tourActive`/`tourStep`/`startTour`/`setTourStep`/`endTour` (12-01), and the Guide already calls `startTour()`. I drove the whole tour off that store via a small `GuidedTour` mount, rather than wiring the old `preferencesStore`/`useState` `TourProvider`. The legacy `TourProvider`/`useTour` exports were preserved as thin store-backed shims so the now-dead `HelpDropdown` (not in the live shell) keeps compiling — consistent with 12-01's "leave clearly-dead Phase 10 components on disk" call.
- **Navigation belongs in `GuidedTour`, framing in `TourOverlay`.** The tour walks the real screens (L-09), so route changes + the Mystery pre-select live in an effect keyed on `tourStep`; the overlay stays presentational and just frames whatever `[data-tour-id]` the current step names. This keeps the missing-anchor wait-then-advance logic clean (the screen may still be mounting after a route change).
- **Figures render at rest (L-08), so I diverged from the prototype's reveal-then-show.** FigVerdict initialises `on=true` (bars at target width) and FigTopology seeds ε=0.18; both show a coherent static frame if rAF/`setTimeout` never fire in a background tab. This is the explicit §7 robustness requirement, not a paraphrase of the prototype (which starts the verdict bars hidden).
- **The e2e reaches Card via the tour itself.** The Card screen has no masthead item, so the 6-stop test exercises the actual tour to land on `catalog-card` — which doubles as end-to-end coverage of the navigation + Mystery pre-select + STOP-n/6 card.

## Deviations from Plan

None — plan executed exactly as written. All four tasks landed in order with the prescribed commit messages (+ the Co-Authored-By trailer). No Rule 1/2/3 auto-fixes were required during implementation: tsc stayed green at every step, the 6 anchors were all already placed by 12-02..12-05, and `PipelineExplanation` was already unmounted from the live masthead shell (since 12-01) so nothing had to be torn out.

The only mid-task correction was a **test-only locator fix** (not a deviation rule): the first Playwright run of the new 6-stop test failed because `getByRole('button', { name: /^guide$/i })` could not match the masthead Guide button (its accessible name is "? Guide", from the `?` icon span). Changed the locator to `page.getByRole('banner').getByRole('button', { name: /guide/i })`; the test then passed. This was caught and fixed before the Task 4 commit — no product code changed.

## Issues Encountered
- **Playwright Guide-button locator** (above): an over-strict anchored regex against an accessible name that includes the "?" icon. Resolved by scoping to the `banner` role + a non-anchored `/guide/i`. 5/5 green afterward.
- **Phase 9 deferred unit failures persist (×6):** `useClassify.test.ts` ×5 (EventSource/WebSocket mock mismatch) + `SlowTierParams.test.tsx` ×1 (`setH2Enabled`). Unchanged from baseline, out of scope, still deferred.

## Verification
- `npx tsc --noEmit` → **exit 0** (clean) after every task and at the end.
- `npx vite build` → **715 modules** built clean (+4 vs 12-05's 711 — Guide + figures + tour). Pre-existing chunk-size advisory only.
- `npx vitest run` → **167 in-scope tests pass**; the only 6 failures are the documented Phase 9 deferred set (unchanged baseline). No unit test imports the rewritten tour modules.
- `npx playwright test` → **5/5 green** (backend up on :8000; Vite auto-booted by the Playwright webServer block). Covers: collection plate+rail, topology-plate after Mystery, study-pickers, reading-desk, and the full 6-stop guided tour stepping through every anchor.
- Visual ground truth: the Guide layout/copy match `09-guide-how-it-works.png` (3 tabs, figures animate at rest) and the spotlight + margin card match `10-guided-tour.png` (four dim panels + accent frame + corner ticks, card opposite the anchor). Live in-browser confirmation is the user's optional step.

## Known Stubs

None. The Guide copy/figures are illustrative-by-design (the method figures are deliberately schematic teaching diagrams, per the prototype + §6.9 — they are not data-bound and are not stubs). The tour frames live anchors on the real screens and pre-selects a real region (Mystery) via the real `visualizationStore`.

## Next Phase Readiness
- Onboarding is complete: the Guide auto-opens once, the masthead reopens it, and the 6-stop tour walks the real screens. 12-07 (the responsive + animation-robustness pass) can now do its final sweep over the whole reading-room front end — the figures are already built to the L-08 background-tab-safe contract, and the spotlight is fixed-viewport (no fixed-artboard assumptions) so it should survive the responsive collapse.
- The dead Phase 10 indigo components (HelpDropdown, TopNavTabs, PipelineExplanation, etc.) remain on disk but out of the live bundle; a cleanup pass can delete them once 12-07 confirms nothing live references them.
- Phase 9 deferred test failures (×6) remain deferred per scope.

## Self-Check: PASSED

All 2 created files + 5 modified files exist on disk; all 3 task commit hashes (`eea2f69`, `2ef0f14`, `3df110c`) present in git history.

---
*Phase: 12-reading-room-redesign*
*Completed: 2026-05-29*
