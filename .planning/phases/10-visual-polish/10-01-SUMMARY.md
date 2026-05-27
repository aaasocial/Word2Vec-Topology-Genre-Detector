---
phase: 10-visual-polish
plan: 10-01
subsystem: ui
tags: [theming, zustand, persist, tailwind, hsl-css-vars, three.js, playwright, tour, react-r3f]

requires:
  - phase: 09-classification-depth
    provides: Phase 9 inline-hex Why-panel components (TopNList, UncertaintyBadge, ClassificationExplain, NearestBooksList, TrackContributionBars, DrivingWordsPills, Step7ValidationLimitations); D-55 deferred-sweep contract
  - phase: 08-corpus-expansion
    provides: v2 genre keys (gothic_horror, speculative); 154-book corpus
  - phase: 06-v1-bug-fix-sweep
    provides: theme-store-separate-from-session-store ruling
  - phase: 03-frontend-core-and-3d-visualization
    provides: dark-default-first-paint Phase 3 CONTEXT lock
provides:
  - "Theme toggle (light/system/dark) persisted via preferencesStore"
  - "v2 dual-token GENRE_COLORS palette + genreColor(key, theme) helper"
  - "Imperative scene.background updates that preserve WebGL context (PITFALLS §13)"
  - "Hand-rolled 4-step onboarding tour anchored on centralised TOUR_ANCHORS"
  - "Header Help dropdown with 3-state theme segmented control + GitHub link"
  - "Four polished empty states (UploadZone, Compare, classification failure, Explain pre-upload) + Topology empty"
  - "Playwright smoke test guarding tour anchor presence on fresh mount"
affects: [future tour additions, future polish phases, v3 mobile-responsive work]

tech-stack:
  added: ["@playwright/test ^1.60", "zustand persist middleware (already present, newly used)"]
  patterns:
    - "HSL CSS variables in :root + :root.light scope (D-55 / D-59) — single source of theme truth"
    - "Imperative scene.background via getComputedStyle round-trip — never key Canvas on theme"
    - "Dual-token Record<Theme, Record<Genre, string>> palette — one map per theme"
    - "Centralised TOUR_ANCHORS constant; no string literals in JSX (PITFALLS §14)"
    - "Empty-state copy locked verbatim from README §9.4"
    - "Signals stay literal: UncertaintyBadge amber + persistence-diagram finite/infinity colors don't theme away"

key-files:
  created:
    - frontend/src/stores/preferencesStore.ts
    - frontend/src/tour/anchors.ts
    - frontend/src/tour/TourOverlay.tsx
    - frontend/src/tour/TourProvider.tsx
    - frontend/src/components/nav/HelpDropdown.tsx
    - frontend/src/components/compare/CompareEmptyState.tsx
    - frontend/src/components/sidebar/FailureCard.tsx
    - frontend/src/components/sidebar/ExplainEmptyState.tsx
    - frontend/playwright.config.ts
    - frontend/tests/e2e/tour-anchors.spec.ts
  modified:
    - frontend/src/index.css
    - frontend/src/constants/genres.ts
    - frontend/src/lib/buffers.ts
    - frontend/src/App.tsx
    - frontend/src/components/canvas/ScatterCanvas.tsx
    - frontend/src/components/canvas/HoverTooltip.tsx
    - frontend/src/components/compare/CompareControls.tsx
    - frontend/src/components/compare/CompareHeatmaps.tsx
    - frontend/src/components/explanation/steps/Step7ValidationLimitations.tsx
    - frontend/src/components/nav/DisclaimerBanner.tsx
    - frontend/src/components/nav/TopNavTabs.tsx
    - frontend/src/components/sidebar/BookSlider.tsx
    - frontend/src/components/sidebar/ClassificationExplain.tsx
    - frontend/src/components/sidebar/ClassificationResult.tsx
    - frontend/src/components/sidebar/ControlSliders.tsx
    - frontend/src/components/sidebar/DetailPanel.tsx
    - frontend/src/components/sidebar/DrivingWordsPills.tsx
    - frontend/src/components/sidebar/GenreLegend.tsx
    - frontend/src/components/sidebar/GenreSelect.tsx
    - frontend/src/components/sidebar/KeyboardHint.tsx
    - frontend/src/components/sidebar/NearestBooksList.tsx
    - frontend/src/components/sidebar/ProjectionTabs.tsx
    - frontend/src/components/sidebar/ResetCamera.tsx
    - frontend/src/components/sidebar/Sidebar.tsx
    - frontend/src/components/sidebar/Toggle2D3D.tsx
    - frontend/src/components/sidebar/TopNList.tsx
    - frontend/src/components/sidebar/TrackContributionBars.tsx
    - frontend/src/components/sidebar/UncertaintyBadge.tsx
    - frontend/src/components/sidebar/UploadProgress.tsx
    - frontend/src/components/sidebar/UploadZone.tsx
    - frontend/src/components/sidebar/UploadZone.test.tsx
    - frontend/src/components/sidebar/WordSearch.tsx
    - frontend/src/components/topology/EpsilonSlider.tsx
    - frontend/src/components/topology/HomologyTabs.tsx
    - frontend/src/components/topology/PersistenceDiagram.tsx
    - frontend/src/components/topology/PersistenceHeatmap.tsx
    - frontend/src/components/topology/TopologyPanel.tsx
    - frontend/src/components/topology/VRViewer.tsx
    - frontend/package.json
    - frontend/vitest.config.ts
    - .gitignore

key-decisions:
  - "Light theme = Paper (warm cream #FBF9F2 canvas, white cards) — D-56"
  - "v2 GENRE_COLORS becomes Record<Theme, Record<Genre, string>> with 8 v2 keys — D-60"
  - "UPLOADED_BOOK_COLOR.light = #1D4ED8 (saffron melts into cream → deep blue) — D-61"
  - "preferencesStore is a new Zustand persist store, key lgt-prefs-v1; separate from visualizationStore — D-65"
  - "applyTheme toggles <html>.light class; system mode subscribes to OS prefers-color-scheme live — D-63"
  - "Scene background updates imperatively via getComputedStyle round-trip — Canvas never keyed on theme (PITFALLS §13) — D-64"
  - "Hand-rolled tour overlay (~250 LoC) — no external dep, no R3F z-index conflicts — D-69"
  - "Tour anchors centralised in src/tour/anchors.ts; no string literals in JSX — D-71"
  - "Missing-anchor fallback is silent-skip after 600ms grace, never throw — D-72"
  - "UncertaintyBadge stays amber-on-amber-tint in both themes (D-84 exception)"
  - "PersistenceDiagram finite (#FACC15) + infinity (#F87171) markers stay theme-neutral; signals don't theme away"
  - "Disclaimer banner copy + position unchanged; only colors lift (D-85 NOT-list)"

patterns-established:
  - "HSL CSS variable scope: :root for dark default, :root.light for light theme; new tokens land in both"
  - "buildBuffers(points, theme) — theme-aware buffer construction; called from App.tsx with effectiveTheme from preferencesStore"
  - "Imperative scene.background via readSceneBgFromCss() in useEffect([theme]) — pattern reused by VRViewer"
  - "resolveCssVar(name, fallback) — Canvas 2D contexts (PersistenceDiagram) re-read theme tokens on theme change"
  - "TOUR_ANCHORS constants only — JSX wires data-tour-id={TOUR_ANCHORS.xxx}"
  - "FailureCard variant table maps HTTP status + error keywords to locked headline/body copy"
  - "Empty states render their data-tour-id anchor on the placeholder so the tour finds it even pre-upload"

requirements-completed: [POLISH-01, POLISH-02, POLISH-03, POLISH-04, POLISH-05]

duration: ~6h
completed: 2026-05-28
---

# Phase 10 Plan 10-01: Visual Polish Summary

**Light/Dark/System theming, hand-rolled 4-step onboarding tour, four polished empty states, v2 dual-token genre palette, and Playwright tour-anchor smoke test — Phase 10 ships v2.0 polish end-to-end.**

## Performance

- **Duration:** ~6 hours
- **Started:** 2026-05-28
- **Completed:** 2026-05-28
- **Tasks:** 12 (per plan), 22 atomic commits
- **Files modified:** ~40 (10 created, ~30 modified)

## Accomplishments

- **Theming infrastructure:** :root.light HSL token block lands a warm "Paper" cream theme alongside the existing dark; 13 new tokens (--scene-bg, --sidebar-bg/border, --warn family, --good family, --error wash) added to both scopes
- **Persistent preferences:** new preferencesStore (Zustand persist, key `lgt-prefs-v1`) holds theme + tourCompleted; applyTheme toggles `<html>.light`; system mode subscribes to OS prefers-color-scheme live
- **v2 genre palette:** GENRE_COLORS is now Record<'light' | 'dark', Record<Genre, string>>; UPLOADED_BOOK_COLOR and HISTORICAL_DIM_COLOR follow the same shape; saffron melts into cream on light → deep blue replaces it
- **Imperative scene background:** ScatterCanvas + VRViewer read `--scene-bg` via getComputedStyle round-trip and write to `scene.background` in useEffect([theme]) — no Canvas remount, no WebGL context loss, no camera-pose reset (PITFALLS §13 anti-pattern avoided)
- **Component sweep:** ~30 Phase 9 components lifted from inline hex to `hsl(var(--*))` tokens following the D-82 canonical pattern; UncertaintyBadge keeps amber-on-amber identity per D-84
- **Onboarding tour:** hand-rolled 4-step overlay (~250 LoC TourOverlay + ~100 LoC TourProvider); glow ring tracks live anchor via getBoundingClientRect; card pinned bottom-right; keyboard Esc/←/→ wired; missing-anchor silent-skip after 600ms grace (PITFALLS §14)
- **Centralised anchors:** TOUR_ANCHORS constant in src/tour/anchors.ts is the single source for `data-tour-id` strings; `grep 'data-tour-id="' frontend/src/components/` returns 0 hits in JSX
- **Help dropdown:** header `?` button + popover with Replay tour / How It Works / Keyboard shortcuts / 3-state theme segmented control / GitHub link; closes on outside-pointerdown or Esc
- **Four empty states:** UploadZone constraints + ghost-scatter helper; Compare tab two-panel ghost preview with `+ Pick genre` shortcuts and gothic_horror/speculative hint; classification FailureCard with 5 variants (red/amber severity per D-79) preserving top-1 prediction on 503; Explain pre-upload three-ghost-row placeholder; Topology empty 320×240 ghost heatmap
- **Playwright smoke test:** 9 specs guard tour anchor presence on fresh mount — including a negative assertion that classification-result is absent pre-upload (anti-over-attachment guard). 9/9 green locally in ~10s

## Task Commits

Each task committed atomically; component sweep split into focused clusters for bisect sanity:

1. **Task 1: Foundation tokens** — `b760036` (feat)
2. **Task 2: v2 genre palette** — `26efeff` (feat)
3. **Task 3: preferencesStore** — `f3bf7a6` (feat)
4. **Task 4: Scene background imperative** — `a8f63a8` (feat)
5. **Task 5: Finalize palette consumers** — `7741dd7` (feat)
6. **Task 6: Component sweep (7 cluster commits)**
   - ClassificationResult canonical pattern — `7528de8` (refactor)
   - TopNList + UncertaintyBadge + ClassificationExplain — `419ba1a` (refactor)
   - NearestBooksList + TrackContributionBars + DrivingWordsPills — `097a731` (refactor)
   - Sidebar control cluster (8 files) — `245dae3` (refactor)
   - Sidebar shell + tooltip + detail + search + upload (7 files) — `acd45b1` (refactor)
   - Topology tab (6 files including canvas-aware PersistenceDiagram) — `c8024b7` (refactor)
   - Compare + Nav + Step7Validation — `fe21871` (refactor)
7. **Task 7: tour anchors centralisation** — `c2127da` (feat)
8. **Task 8: Hand-rolled tour overlay + provider** — `0282eb7` (feat)
9. **Task 9: Help dropdown + theme segmented control** — `b89d3c5` (feat)
10. **Task 10: Empty states (5 surfaces, 4 commits)**
    - UploadZone pre-upload — `92ad588` (feat)
    - Compare empty — `b6702d5` (feat)
    - Failure card — `d9868db` (feat)
    - Explain + Topology empty — `d153b30` (feat)
11. **Task 11: Playwright smoke test** — `8c87b1a` (test)
12. **Task 12: Final cleanup** — `00d7cbb` (refactor)

**Plan metadata commit:** appended by /gsd-execute-phase after this SUMMARY.

## Files Created/Modified

### Created (10)

- `frontend/src/stores/preferencesStore.ts` — Zustand persist store + applyTheme/resolveEffectiveTheme/subscribeToSystemTheme/useEffectiveTheme helpers
- `frontend/src/tour/anchors.ts` — TOUR_ANCHORS constant, TourAnchorId type, TOUR_STEPS 4-step script (verbatim copy), findAnchor()
- `frontend/src/tour/TourOverlay.tsx` — dim layer + glow ring + bottom-right tour card; keyboard nav; missing-anchor silent-skip
- `frontend/src/tour/TourProvider.tsx` — useTour() hook with start/next/prev/skip/done; first-load detection (600ms grace if tourCompleted=false)
- `frontend/src/components/nav/HelpDropdown.tsx` — `?` button + popover with replay/how-it-works/keyboard/theme/github
- `frontend/src/components/compare/CompareEmptyState.tsx` — two ghost panels with `+ Pick genre` inline selects + gothic_horror/speculative hint
- `frontend/src/components/sidebar/FailureCard.tsx` — 5 failure variants (encoding/too_short/wrong_format/expired_410/uncalibrated_503) + classifyError(message, status) mapper
- `frontend/src/components/sidebar/ExplainEmptyState.tsx` — three ghost rows mirroring real explain sub-panels; "Upload a book first." headline
- `frontend/playwright.config.ts` — Chromium single-browser; auto-boots Vite dev server
- `frontend/tests/e2e/tour-anchors.spec.ts` — 9 specs covering all 10 anchors + negative classification-result pre-upload guard

### Modified (significant)

- `frontend/src/index.css` — :root.light scope + 13 new tokens; body uses hsl(var(--background)) with 240ms transition
- `frontend/src/constants/genres.ts` — full replacement: Record<Theme, Record<Genre, string>> shape, v2 genre keys, genreColor() helper
- `frontend/src/lib/buffers.ts` — buildBuffers accepts Theme | Record<string,string>; buildUploadedBuffers takes optional theme param
- `frontend/src/App.tsx` — theme effect mounts + subscribes to OS pref; buffers consume effectiveTheme; CompareEmptyState wired on Compare tab when genres unpicked; TourProvider wraps root
- `frontend/src/components/canvas/ScatterCanvas.tsx` — sceneRef + imperative scene.background; data-tour-id={TOUR_ANCHORS.scatterCanvas}
- `frontend/src/components/topology/VRViewer.tsx` — mirrors ScatterCanvas pattern for VR canvas; particle color flips with theme
- `frontend/src/components/topology/PersistenceDiagram.tsx` — canvas paint reads CSS vars via resolveCssVar(); effect depends on theme; finite + infinity markers stay literal signals
- `frontend/src/components/sidebar/UploadZone.tsx` — border shorthand split for jsdom; ghost-scatter helper SVG; constraints copy; FailureCard wired on error
- `frontend/src/components/sidebar/Sidebar.tsx` — bg → --sidebar-bg/border; ExplainEmptyState rendered alongside UploadZone pre-upload
- `frontend/src/components/sidebar/UncertaintyBadge.tsx` — amber-on-amber (D-84 exception) via --warn-soft / --warn-strong
- `frontend/src/components/explanation/steps/Step7ValidationLimitations.tsx` — hex → tokens; copy locked unchanged
- `frontend/src/components/nav/TopNavTabs.tsx` — top bar bg → --card; tab tourId fields typed against TourAnchorId; HelpDropdown mounted
- `frontend/src/components/sidebar/UploadZone.test.tsx` — assertions updated for new contract (locked failure-card copy + token-based border colors)
- `frontend/vitest.config.ts` — exclude tests/e2e/** so vitest doesn't try to load Playwright specs
- `frontend/package.json` — @playwright/test devDep + e2e/e2e:ui scripts
- `.gitignore` — frontend/test-results, playwright-report, blob-report

## Decisions Made

All 12 plan tasks executed; **no architectural deviations from the plan**. The decisions enumerated in 10-CONTEXT.md (D-56 through D-85) were applied verbatim.

A few in-flight pragmatic calls (documented inline in commit messages):

- **GhostScatterHelper SVG color uses `currentColor`** for the dim genre dots so the muted-foreground inherited via the parent helper text flows through.
- **PersistenceDiagram canvas-paint colors** resolved via a `resolveCssVar(name, fallback)` helper that round-trips through a temp DOM element. Same approach as ScatterCanvas's `readSceneBgFromCss()`. The effect re-runs on `theme` change so the diagram re-paints on every flip.
- **TopologyEmpty + Compare empty both carry the same data-tour-id as the corresponding nav tab.** `document.querySelector(...).first()` returns one match — both the tab button and the empty-state body anchor the tour validly.
- **Scope of UncertaintyBadge exception extended in spirit:** the persistence-diagram finite (#FACC15) and infinity (#F87171) markers + the EpsilonSlider's amber track-fill all stay literal hex. These are diagram signals — same identity contract as the badge per D-84's "signals shouldn't theme away" rationale.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Border shorthand collapses in jsdom**
- **Found during:** Task 10 — UploadZone empty state
- **Issue:** UploadZone used `border: '2px ${style} ${color}'` shorthand. jsdom doesn't split shorthand into individual borderColor/borderStyle properties for non-keyword colors like `hsl(var(--*))`, so existing Phase 5 tests asserting `style.borderColor === 'rgb(99, 102, 241)'` started failing on `''`. The shorthand worked when colors were hex but the lifted token form breaks it.
- **Fix:** Split into explicit `borderWidth: '2px'`, `borderStyle`, `borderColor`. jsdom now reads each property correctly. Tests asserting the new contract (`hsl(var(--primary))` on drag, `hsl(var(--border))` idle) pass.
- **Files modified:** `frontend/src/components/sidebar/UploadZone.tsx`, `frontend/src/components/sidebar/UploadZone.test.tsx`
- **Verification:** `npx vitest run src/components/sidebar/UploadZone.test.tsx` → 5/5 green
- **Committed in:** `92ad588`

**2. [Rule 2 - Missing Critical] Vitest picks up Playwright specs**
- **Found during:** Task 11 — Playwright smoke test
- **Issue:** Vitest's default include glob `**/*.spec.*` would try to load `tests/e2e/tour-anchors.spec.ts` and crash because Playwright's `test` import is not Vitest's. Without an explicit exclude, `npm test` would break on any future PR adding e2e specs.
- **Fix:** Added `exclude: ['node_modules', 'tests/e2e/**', 'dist']` to vitest.config.ts.
- **Files modified:** `frontend/vitest.config.ts`
- **Verification:** `npx vitest run` confirms only src/ test files load (167 passing, no e2e spec attempts).
- **Committed in:** `8c87b1a`

**3. [Rule 1 - Bug] Final inline-hex leftover in PersistenceDiagram loading skeleton**
- **Found during:** Task 12 — final sweep audit
- **Issue:** A `background: '#1A1A25'` literal slipped through the topology sweep on the persistence-diagram loading-skeleton placeholder.
- **Fix:** Lifted to `hsl(var(--muted))`.
- **Files modified:** `frontend/src/components/topology/PersistenceDiagram.tsx`
- **Verification:** Final grep on the sweep-target surfaces returns 0 hex matches outside intentional signal-color exceptions (finite #FACC15, infinity #F87171, SSR fallback #0A0A0F, VR points dark-vs-light).
- **Committed in:** `00d7cbb`

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 missing-critical-test-config).
**Impact on plan:** All three were small in-flight fixes — no scope creep. The border-shorthand workaround in particular preserves jsdom compatibility so the existing Phase 5 test suite continues to gate Phase 10 component edits.

## Issues Encountered

- **Phase 9 pre-existing test failures unchanged.** 6 failures (5 useClassify EventSource mock mismatches + 1 SlowTierParams setH2Enabled) confirmed unchanged before, during, and after Phase 10 work. These are documented in `.planning/phases/09-classification-depth/deferred-items.md` and are out of scope per Rule 3.
- **HMR + dev server stayed reachable throughout.** No file-edit forced a server restart; user could refresh after each commit to verify the visual progression live.

## Known Stubs

None. Every empty-state placeholder is wired to real store state (preferencesStore, uploadStore, visualizationStore) and renders real data once it lands. The four ghost rows in ExplainEmptyState are intentionally static — they're the canonical empty state per D-80, not unfilled placeholders.

## Threat Flags

None. This plan modifies only frontend rendering surfaces; no new network endpoints, auth paths, or schema changes. The Playwright dependency adds dev-only tooling. localStorage usage is scoped to the `lgt-prefs-v1` key (theme preference + tour-completed flag) — no PII, no auth state.

## Verification

All success criteria from 10-01-PLAN.md confirmed:

- [x] All 12 tasks in 10-01-PLAN.md executed
- [x] Each task committed individually (22 atomic commits)
- [x] SUMMARY.md created (this file)
- [x] Theme toggle works (light/system/dark) and persists in localStorage (`lgt-prefs-v1`)
- [x] Scene background updates imperatively — no Canvas remount, no camera-pose loss
- [x] All ~30 sweep-target components use `hsl(var(--*))` (UncertaintyBadge amber + diagram signal colors excepted per D-84 spirit)
- [x] v2 GENRE_COLORS dual-token map drives every consumer (legend, scatter, BookSlider, tooltip, sidebar dots, explain sub-panels)
- [x] `grep 'data-tour-id="' frontend/src/components/` returns 0 JSX literals
- [x] Hand-rolled tour: 4 steps, replayable from Help, missing-anchor silent skip, Esc/arrows work, dim-layer click → skip
- [x] HelpDropdown mounted with `?` button, 3-state theme segmented control, Replay tour, GitHub link
- [x] 4 empty states polished with locked copy + 5th (empty Topology) per D-81
- [x] Playwright installed; `npx playwright test` → 9/9 green in 9.1s
- [x] `npx tsc --noEmit` → exit 0
- [x] `npm run test -- --run` → 167 passing, 6 pre-existing Phase 9 deferred failures (unchanged)

## Self-Check: PASSED

All claimed files exist on disk:

- preferencesStore.ts, anchors.ts, TourOverlay.tsx, TourProvider.tsx, HelpDropdown.tsx, CompareEmptyState.tsx, FailureCard.tsx, ExplainEmptyState.tsx, playwright.config.ts, tour-anchors.spec.ts — all present

All claimed commits resolve in `git log`:

- b760036, 26efeff, f3bf7a6, a8f63a8, 7741dd7, 7528de8, 419ba1a, 097a731, 245dae3, acd45b1, c8024b7, fe21871, c2127da, 0282eb7, b89d3c5, 92ad588, b6702d5, d9868db, d153b30, 8c87b1a, 00d7cbb — all 21 plan commits present plus this docs commit.

## Next Phase Readiness

Phase 10 is the final v2.0 phase. After this plan:

- **Ready for `/gsd-secure-phase 10`** — verify no security regressions (localStorage scope, XSS, CSRF concerns) introduced by the new prefs store + tour overlay.
- **Ready for `/gsd-code-review 10`** — broad sweep for advisory issues across the ~40 modified files.
- **Ready for `/gsd-verify-work 10`** — checklist run against ROADMAP.md Phase 10 success criteria.

**Deferred follow-ups (v2.1 polish backlog):**

- Keyboard shortcut cheat sheet overlay (Help dropdown item links to it but no overlay yet)
- Mobile-responsive read-only view (POL-02 backlog)
- Lift inline hex in PipelineExplanation Steps 1–6 (NOT-list item #2 froze copy; styles could lift in a future polish pass without touching the math)
- Fix Phase 9 pre-existing test failures (useClassify EventSource mocks, SlowTierParams setH2Enabled) — tracked in `.planning/phases/09-classification-depth/deferred-items.md`

---
*Phase: 10-visual-polish*
*Completed: 2026-05-28*
