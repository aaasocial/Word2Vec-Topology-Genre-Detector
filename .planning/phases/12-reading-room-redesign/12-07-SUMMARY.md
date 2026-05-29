---
phase: 12-reading-room-redesign
plan: 12-07
subsystem: ui
tags: [react, css-grid, responsive, media-queries, animation-robustness, background-tab-safe, reading-room, phase-close]

# Dependency graph
requires:
  - phase: 12-01
    provides: reading-room tokens/index.css, .rr-* type scale, masthead shell, readingRoomStore (route + tweaks density), the fluid layout scaffold
  - phase: 12-02
    provides: Collection 3-col carrel + PlateFrame (R3F plate) + Marginalia
  - phase: 12-03
    provides: Card 3-col carrel + Study 3-col folio
  - phase: 12-04
    provides: Verdict 2-col essay + Upload reading desk + ProbabilityBars
  - phase: 12-05
    provides: Topology 1.5fr/300 grid + PersistenceDiagram/PersistenceHeatmap loading skeletons
  - phase: 12-06
    provides: Guide side-sheet (maxWidth:100%) + 5 background-tab-safe GuideFigures + TourOverlay four-panel spotlight + tour card
provides:
  - Reusable responsive CSS-grid classes in index.css (.rr-carrel / .rr-carrel-card / .rr-verdict / .rr-desk / .rr-folio / .rr-topo) with @media breakpoints — collapse at ≤1100px (drop marginalia/sibling rail/topology side panels/study center binding), stack to one column in source order at ≤768px; `.rr-dense` keeps the existing `study` density 2-col fallback at any width
  - .rr-shell — the app shell lifts its artboard scroll-lock below 768px so stacked columns scroll vertically instead of clipping
  - Plate min-height clamp (320) so the WebGL plate stays a usable square when the carrel stacks; tour margin card clamped to the viewport (maxWidth: calc(100vw - 56px))
  - Animation-robustness: topology loading skeletons render valid static frames (orphaned `pulse` keyframes removed); FigVerdict replay is visibility-gated so a backgrounded tab never strands the bars at width:0
  - Phase 12 closeout: RR-01..RR-09 all complete; PROJECT.md recast around the Reading Room; REQUIREMENTS.md traceability extended
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Screen column grids live as CSS classes (not inline gridTemplateColumns) so @media breakpoints can collapse them; the React tree always renders the marginalia/sibling rail and CSS controls collapse, so they can restack as rows at ≤768px rather than vanishing"
    - "`.rr-dense` modifier = the `study` density Tweak forces the 2-col fallback at any width; viewport @media queries apply the same fallback automatically below 1100px"
    - "Background-tab safety: loading skeletons are static labelled frames (no timeline dependence); transition-driven replays are gated on document.visibilityState and forced back to target on visibilitychange"

key-files:
  created:
    - .planning/phases/12-reading-room-redesign/12-07-SUMMARY.md
  modified:
    - frontend/src/index.css
    - frontend/src/App.tsx
    - frontend/src/components/screens/Collection.tsx
    - frontend/src/components/screens/Card.tsx
    - frontend/src/components/screens/Topology.tsx
    - frontend/src/components/collection/Marginalia.tsx
    - frontend/src/components/collection/PlateFrame.tsx
    - frontend/src/components/reading/VerdictEssay.tsx
    - frontend/src/components/reading/ReadingDesk.tsx
    - frontend/src/components/study/StudyFolio.tsx
    - frontend/src/tour/TourOverlay.tsx
    - frontend/src/components/topology/PersistenceHeatmap.tsx
    - frontend/src/components/topology/PersistenceDiagram.tsx
    - frontend/src/components/guide/GuideFigures.tsx
    - .planning/REQUIREMENTS.md
    - .planning/PROJECT.md

key-decisions:
  - "Converted every screen's inline gridTemplateColumns to shared CSS classes with @media breakpoints rather than JS resize listeners — media queries are the idiomatic, dependency-free way to honour README §10, and they collapse without a React re-render. The plate/figures stay square + clamped (PlateFrame min-height 320; HEATMAP_SIZE stays 150)."
  - "Always render the marginalia (Collection) and sibling rail (Card) and let CSS hide/show them — so the ≤768px stack can bring them back as rows in source order, and the `study` density (.rr-dense) hides them at any width via higher CSS specificity. The previous {!studyMode && ...} React-tree gating could not be reached by a viewport media query."
  - "Lifted the shell's 100vh/overflow:hidden artboard lock to a .rr-shell class that switches to height:auto/overflow:visible (with body overflow-y:auto) below 768px, so stacked columns scroll instead of clipping — without changing the single-screen editorial spread on wide viewports."
  - "Animation-robustness was largely already satisfied by 12-06 (the 5 GuideFigures, VR birth-fade, probability fills). The only real gaps were the topology loading skeletons (which referenced `pulse` keyframes that were unreachable/undefined, so they never animated and the reference was misleading) — replaced with valid static frames — and FigVerdict's 120ms replay window, now visibility-gated."

patterns-established:
  - "Reading-room responsive grid vocabulary: .rr-carrel/-card (3-col library), .rr-verdict/.rr-desk (2-col), .rr-folio (3-col study), .rr-topo (hero+side); all collapse at 1100/768 and respect .rr-dense"
  - "Loading states are static labelled frames ('reading…'), never timeline-gated shimmer — the §7 'degrade to a valid static frame' contract applied uniformly"

requirements-completed: [RR-09]

# Metrics
duration: ~10min
completed: 2026-05-29
---

# Phase 12 Plan 07: Responsive + Animation-Robustness + Phase Close Summary

**The fixed-artboard demo becomes a genuinely fluid editorial layout (README §10) — CSS-grid screens that drop the marginalia/rail at ~1100px and stack to one column at ~768px — and every "alive" figure is confirmed/hardened to degrade to a valid static frame in a background tab (§7 / L-08); then the full verification sweep runs green and Phase 12 (The Reading Room) closes with RR-01..RR-09 all complete.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-29T06:06:03Z
- **Completed:** 2026-05-29T06:16:01Z
- **Tasks:** 3
- **Files modified:** 16 (1 created, 15 modified)

## Accomplishments

- **Fluid responsive layout (RR-09 / §10 / L-14).** Replaced every screen's inline `gridTemplateColumns` with reusable CSS-grid classes in `index.css` (`.rr-carrel`, `.rr-carrel-card`, `.rr-verdict`, `.rr-desk`, `.rr-folio`, `.rr-topo`) driven by `@media` breakpoints: at **≤1100px** the marginalia (Collection), sibling rail (Card), topology side panels, and study center binding drop (the existing `study` density 2-col fallback, applied by viewport); at **≤768px** every grid stacks to **one column in source order**. The `study` density Tweak now toggles a `.rr-dense` modifier that forces the 2-col fallback at any width (the historical behaviour, preserved). The fixed 1240×780 artboard is **not** shipped.
- **Shell scroll-lock lifted on narrow screens.** The app shell switched from inline `100vw/100vh/overflow:hidden` to a `.rr-shell` class that becomes `height:auto/min-height:100vh/overflow:visible` (with `body { overflow-y:auto }`) below 768px, so the stacked columns scroll vertically instead of being clipped — while the single-screen editorial spread is unchanged on wide viewports.
- **Plates/figures stay square + clamped.** The Collection R3F plate figure gained a `min-height: 320` clamp so the WebGL canvas stays a usable square when the carrel stacks (it still grows via `flex:1` on wide screens); the topology heatmap keeps its existing `HEATMAP_SIZE = 150` clamp; the decorative SVG mini-plates were already `width:100%/height:auto`. The Guide side-sheet was already `maxWidth:100%` (full-width on narrow); the tour margin card is now clamped to `maxWidth: calc(100vw - 56px)` with the same opposite-quadrant logic.
- **Animation-robustness pass (RR-09 / §7 / L-08).** Audited every live "alive" element. The 5 Guide method figures (FigVerdict `on=true`, FigTopology seeds ε=0.18, decorative pulse/flatten start visible), the VR birth-fade (R3F `useFrame` holds the last-computed ε frame when rAF pauses — driven by the store's `vrEpsilon`, not an entrance animation), and the verdict probability-bar fills (width set straight from data, no `opacity:0→forwards` gating) were **already correct** from 12-06. Two gaps were fixed: the topology **loading skeletons** referenced a `pulse` keyframe that was either scoped to the data-state return (heatmap) or never defined (diagram) — so they never animated and the reference was misleading — now replaced with valid static "reading…" frames (zero timeline dependence); and **FigVerdict's** 120ms replay window is now gated on `document.visibilityState` and forced back to its target bar widths on `visibilitychange`, so a tab backgrounded mid-replay can never strand the bars at width:0.
- **Full verification sweep + phase close.** `tsc --noEmit` exit 0; Vitest **167 in-scope green** (the only 6 failures are the documented Phase 9 deferred set — `useClassify.test.ts` ×5 + `SlowTierParams.test.tsx` ×1 — unchanged from baseline; no tests retired); Playwright **5/5 green** including the end-to-end 6-stop guided-tour test. Manual screenshot cross-check confirmed: no indigo theme remains, the verdict voice is "marginal", and the topology is H₁-only with the N-D disclaimer. RR-01..RR-09 flipped to complete; PROJECT.md recast around the Reading Room (Phase 10/11 UI superseded, data layer unchanged); REQUIREMENTS.md traceability extended.

## Task Commits

Each task was committed atomically (every commit carries the `Co-Authored-By: Claude Opus 4.7 (1M context)` trailer):

1. **Task 1: Fluid responsive editorial layout (collapse at ~1100 / ~768)** — `4b61181` (feat)
2. **Task 2: Animation-robustness — figures/fades degrade to static frames** — `b2dabde` (fix)

**Plan metadata + closeout (docs):** _(this commit — includes the ReadingDesk duplicate-className fix, 12-07-SUMMARY.md, STATE.md, ROADMAP.md, REQUIREMENTS.md, PROJECT.md)_

## Files Created/Modified

- `frontend/src/index.css` — responsive `@media` grid classes (`.rr-carrel/-card/.rr-verdict/.rr-desk/.rr-folio/.rr-topo` + `.rr-dense`) collapsing at 1100/768; `.rr-shell` scroll-lock that lifts below 768px
- `frontend/src/App.tsx` — shell uses `.rr-shell` (drops the inline 100vw/100vh/overflow:hidden artboard lock)
- `frontend/src/components/screens/Collection.tsx` — `.rr-carrel` + `.rr-dense`; always renders Marginalia (CSS controls collapse)
- `frontend/src/components/screens/Card.tsx` — `.rr-carrel-card` + `.rr-dense`; always renders the sibling rail (`.rr-siblings-rail`)
- `frontend/src/components/screens/Topology.tsx` — `.rr-topo` + `.rr-dense`; side panels tagged `.rr-side` (CSS-hidden ≤1100px)
- `frontend/src/components/collection/Marginalia.tsx` — `.rr-marginalia` class hook for CSS collapse
- `frontend/src/components/collection/PlateFrame.tsx` — plate figure `min-height: 320` clamp for the stacked layout
- `frontend/src/components/reading/VerdictEssay.tsx` — `.rr-verdict` grid
- `frontend/src/components/reading/ReadingDesk.tsx` — `.rr-desk` grid (and the duplicate-`className` fix, see Deviations)
- `frontend/src/components/study/StudyFolio.tsx` — `.rr-folio` grid; center binding tagged `.rr-folio-center` (dropped ≤1100px)
- `frontend/src/tour/TourOverlay.tsx` — tour margin card clamped to `calc(100vw - 56px)`
- `frontend/src/components/topology/PersistenceHeatmap.tsx` — loading skeleton → static "reading…" frame; orphaned `pulse` keyframe removed
- `frontend/src/components/topology/PersistenceDiagram.tsx` — loading skeleton → static "reading…" frame (it referenced an undefined `pulse`)
- `frontend/src/components/guide/GuideFigures.tsx` — FigVerdict replay visibility-gated + forced-visible on `visibilitychange`
- `.planning/REQUIREMENTS.md` — RR-09 flipped to `[x]`; RR-01..RR-09 added to the traceability table + coverage note
- `.planning/PROJECT.md` — front end recast as The Reading Room; Phase 10 indigo + Phase 11 onboarding marked superseded (data layer unchanged); new D-U2 Key Decision row

## Decisions Made

- **CSS media queries, not JS resize listeners.** Honouring README §10 with `@media` breakpoints over shared grid classes keeps the collapse dependency-free, render-free, and idiomatic. The plate/figures stay square + min/max-clamped per the env note.
- **Render the asides always; let CSS collapse them.** The previous `{!studyMode && <Marginalia/>}` (and the Card sibling rail) gated visibility in the React tree, which a viewport media query cannot reach. Always rendering them + tagging classes (`.rr-marginalia`, `.rr-siblings-rail`, `.rr-side`, `.rr-folio-center`) lets the ≤768px stack restack them as rows in source order, while `.rr-dense .rr-*` (higher specificity) keeps them hidden under the `study` density at any width.
- **The animation-robustness work was mostly verification.** 12-06 had already built the figures + fades to the L-08 contract; the audit confirmed VR/figures/probability-fills are background-tab-safe and found only the topology loading skeletons (misleading dangling `pulse` references) and the FigVerdict replay window to harden.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Duplicate `className` on the ReadingDesk `<main>`**
- **Found during:** Task 3 (the Playwright run surfaced a Vite `Duplicate "className" attribute in JSX element` warning).
- **Issue:** My Task 1 edit added `className="rr-desk rr-scroll"` to the `<main>` opener, but the element already carried a trailing `className="rr-scroll"`. JSX keeps the **last** attribute, so `rr-desk` was silently dropped — the Upload screen would not have picked up the responsive grid class.
- **Fix:** Removed the duplicate trailing `className`, leaving the single `className="rr-desk rr-scroll"`. Re-ran tsc (0) + vite build (no warning, 715 modules).
- **Files modified:** `frontend/src/components/reading/ReadingDesk.tsx`
- **Commit:** folded into the Task 3 docs/closeout commit (the Task 1 commit `4b61181` had already landed; per git-safety I did not amend it).

No Rule 2/3/4 deviations. Phase 9 deferred test failures stay deferred (×6); no tests were retired (all surviving/updated components stay green).

## Issues Encountered

- **Phase 9 deferred unit failures persist (×6):** `useClassify.test.ts` ×5 (EventSource/WebSocket mock mismatch) + `SlowTierParams.test.tsx` ×1 (`setH2Enabled`). Unchanged from baseline, out of scope, still deferred.
- The Vite line-ending warnings (LF → CRLF on Windows) on commit are cosmetic and pre-existing across the repo.

## Verification

- `npx tsc --noEmit` → **exit 0** (clean) after every task and at the end.
- `npx vite build` → **715 modules** built clean (unchanged from 12-06; the duplicate-className warning is resolved). Pre-existing chunk-size advisory only.
- `npx vitest run` → **167 in-scope tests pass**; the only 6 failures are the documented Phase 9 deferred set (unchanged baseline). The PersistenceHeatmap loading-state test still passes (it asserts zero canvases, which the static frame keeps). No tests retired.
- `npx playwright test` → **5/5 green** (backend up on :8000; Vite auto-booted): collection plate+rail, topology-plate after Mystery, study-pickers, reading-desk, and the full 6-stop guided tour.
- **Manual screenshot sweep:** cross-checked the implementation against `01-landing` … `10-guided-tour` — the 8 routes + Guide + tour + Tweaks match the warm-paper editorial idiom; **no indigo** remains; the verdict reads **"marginal"** (confidence < 0.80); topology is **H₁-only** with the N-D disclaimer footnote. Responsive collapse verified by code review of the breakpoints (the live in-browser 3-width pass is the user's optional confirmation).

## Known Stubs

None introduced. The carry-over Known Stubs from earlier plans (derived id-seeded book coordinates / shelfmarks on the catalog card, the where-it-landed pin position, the sample-passage filler) are unchanged and remain documented in 12-03/12-04 — they are decorative/derived because the corpus payload carries no per-book embedding coordinate; all real fields come from the hooks. This plan added no data-bound surfaces.

## Threat Flags

None. This plan changed only layout (CSS grids + a scroll-lock) and client-side animation timing — no new network endpoints, auth paths, file access, or schema changes. The backend math/semantics are untouched (§11 / D-U2).

## Next Phase Readiness

- **Phase 12 (The Reading Room) is complete** — all 7 plans landed; RR-01..RR-09 all met. The front end is a fluid editorial layout reusing the unchanged word2vec/topology data layer; the Phase 10/11 indigo UI is superseded in the live app (milestone requirements remain historically met).
- The dead Phase 10 indigo-only components (TopNavTabs, Sidebar, HelpDropdown, PipelineExplanation, UploadZone, RecomputeOverlay, Step2/Step3, etc.) remain on disk, tree-shaken out of the live bundle and only referenced by each other + their own tests; a future cleanup pass can delete them.
- Phase 9 deferred test failures (×6) remain deferred per scope — a candidate quick fix for v2.1.

## Self-Check: PASSED

(verified below — created file + both task commit hashes present.)

---
*Phase: 12-reading-room-redesign*
*Completed: 2026-05-29*
