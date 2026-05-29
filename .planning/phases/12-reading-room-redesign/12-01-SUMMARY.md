---
phase: 12-reading-room-redesign
plan: 12-01
subsystem: ui
tags: [react, zustand, tailwind-v4, css-custom-properties, theming, spectral, jetbrains-mono, editorial-redesign]

# Dependency graph
requires:
  - phase: 10-visual-polish
    provides: GENRE_COLORS dual-token palette + buildBuffers + theme infrastructure (now replaced wholesale by the reading-room system)
  - phase: 11-onboarding-theme-defaults
    provides: light-default FOUC script + How-It-Works→tour onboarding chain (now removed from the live UI per D-U2)
provides:
  - Reading-room token system in index.css (paper/paper2/card/ink/muted + accent + rule/shadow + type-scale helpers), cream/oxblood defaults, no indigo remaining
  - theme/readingRoom.ts — 4 paper palettes + 4 accents + RR_GENRE_HEX + applyReadingRoomTheme writing CSS vars onto <html>
  - constants/genres.ts — L-05 reading-room genre hexes (theme-independent), public API preserved so all consumers compile
  - readingRoomStore — route (8 screens), guideOpen/guideSeen (persisted), tweaks{paper,accent,density} (persisted), tour cursor
  - Shell components — Masthead (L-04), Footer, FootnoteHost (6 verbatim notes), TweaksPanel + TweaksToggle
  - App.tsx masthead router replacing the Phase 10/11 tabbed shell + onboarding orchestrator; Landing + About screens
affects: [12-02-collection, 12-03-card-study, 12-04-upload-verdict, 12-05-topology, 12-06-guide-tour, 12-07-responsive]

# Tech tracking
tech-stack:
  added: [Spectral webfont, JetBrains Mono webfont]
  patterns:
    - "CSS custom properties on <html> as the single theming channel (no .light class, no prefers-color-scheme); one paper palette + one accent per session"
    - "Shell store (route/guide/tweaks) split from data-side stores (visualization/upload); session-scoped route vs persisted shell prefs"
    - "Reading-room type-scale + rule/shadow utility classes (.rr-*) backed by tokens.md"

key-files:
  created:
    - frontend/src/theme/readingRoom.ts
    - frontend/src/stores/readingRoomStore.ts
    - frontend/src/components/shell/Masthead.tsx
    - frontend/src/components/shell/Footer.tsx
    - frontend/src/components/shell/FootnoteHost.tsx
    - frontend/src/components/shell/TweaksPanel.tsx
    - frontend/src/components/screens/Landing.tsx
    - frontend/src/components/screens/About.tsx
    - frontend/src/components/screens/PlaceholderScreen.tsx
  modified:
    - frontend/index.html
    - frontend/src/index.css
    - frontend/src/main.tsx
    - frontend/src/App.tsx
    - frontend/src/constants/genres.ts

key-decisions:
  - "Kept constants/genres.ts public API (Record<Theme,...> shape + genreColor(genre,theme) + GENRE_LIST + UPLOADED_BOOK_COLOR[theme]) so all ~14 consumers compile unchanged; light/dark subrecords are now identical reading-room hexes (palette is theme-independent per L-05)"
  - "New readingRoomStore for shell concerns (route/guide/tweaks/tour) rather than overloading visualizationStore; data-side stores untouched (CONTEXT Claude's-discretion)"
  - "Landing plate preview is a cheap static seeded-SVG scatter; the live reskinned R3F plate lands in 12-02 (plan discretion)"
  - "Built a reading-room-native TweaksPanel (swatches + segmented density) instead of porting the prototype's host-iframe postMessage tweaks-panel.jsx, which has no analogue in this stack"
  - "Routes not yet built render a shared PlaceholderScreen so the masthead is fully navigable from the foundation plan"

patterns-established:
  - "applyReadingRoomTheme(palette, accent) is the only writer of surface/accent CSS vars; index.css carries cream/oxblood defaults so first paint is correct before store apply-on-init"
  - "Persisted shell prefs ride rr.tweaks.v1 (tweaks + guideSeen); route/guideOpen/tour cursor are session-scoped"
  - "FootnoteHost context + <Footnote n /> superscript pattern for inline accent footnotes opening a centered modal"

requirements-completed: [RR-01]

# Metrics
duration: ~40min
completed: 2026-05-29
---

# Phase 12 Plan 01: Reading Room Foundation Summary

**Editorial reading-room visual system (Spectral + JetBrains Mono, paper/accent/density Tweaks) with masthead router, footnote modal, and live Landing + About screens — replacing the Phase 10 indigo theme and Phase 11 tabbed shell wholesale.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-05-29T04:08:00Z
- **Completed:** 2026-05-29T04:48:22Z
- **Tasks:** 6
- **Files modified:** 14 (9 created, 5 modified)

## Accomplishments
- Reading-room token system replaces the indigo `:root`/`:root.light` HSL block: paper/paper2/card/ink/muted surfaces + accent + rule/shadow tokens + a `.rr-*` type-scale, with cream/oxblood defaults and no indigo anywhere in the live UI.
- `theme/readingRoom.ts` is the theme system of record — 4 paper palettes, 4 accents, the fixed 8-hex genre palette (L-05), and `applyReadingRoomTheme()` writing CSS vars (including alpha-derived ink shadows) onto `<html>`.
- `readingRoomStore` models the new shell: 8-route masthead router, Guide open/seen flags (persisted via `rr.tweaks.v1`, semantic key `rr.guide.seen.v1`), persisted `tweaks{paper,accent,density}`, and a tour cursor. Persisted palette reapplies on rehydrate and at app init.
- Shell components: sticky Masthead (L-04 active styling), running Footer, FootnoteHost with the 6 verbatim notes + a centered modal (backdrop/Esc close, block shadow), and a native TweaksPanel (Warmth/Mark/Layout swatches) toggled from a bottom-right pill.
- New App.tsx masthead router replaces the Phase 10/11 tabbed shell + the Phase 11 How-It-Works→tour onboarding orchestrator; Landing (§6.1, copy verbatim, matches `01-landing.png`) and About (§6.8, copy verbatim, matches `08-about.png`) ship, with PlaceholderScreens making collection/card/topology/study/upload/verdict navigable.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fonts + type system + reading-room tokens** — `d81d7d5` (feat)
2. **Task 2: Reading-room store (route + ui + tweaks)** — `0af70d2` (feat)
3. **Task 3: Masthead + Footer + FootnoteHost** — `15bbc63` (feat)
4. **Task 4: Tweaks panel** — `7fa231b` (feat)
5. **Task 5: App shell + router + Landing + About** — `e72fc06` (feat)

**Plan metadata:** _(this docs commit)_

## Files Created/Modified
- `frontend/index.html` — load Spectral + JetBrains Mono; remove Phase 11 light-default FOUC script + Inter
- `frontend/src/index.css` — replace indigo HSL theme with reading-room paper/accent/genre/rule/shadow tokens + `.rr-*` type scale (cream/oxblood defaults)
- `frontend/src/theme/readingRoom.ts` — 4 palettes + 4 accents + RR_GENRE_HEX + `applyReadingRoomTheme`
- `frontend/src/constants/genres.ts` — L-05 reading-room genre hexes (theme-independent), public API preserved
- `frontend/src/stores/readingRoomStore.ts` — route/guide/tweaks/tour shell store (persisted tweaks + guideSeen)
- `frontend/src/main.tsx` — `initReadingRoomTheme()` before first render
- `frontend/src/App.tsx` — masthead router shell (replaces tabbed shell + onboarding orchestrator)
- `frontend/src/components/shell/Masthead.tsx` — L-04 sticky nav
- `frontend/src/components/shell/Footer.tsx` — running footer
- `frontend/src/components/shell/FootnoteHost.tsx` — Footnote superscript + 6-note modal
- `frontend/src/components/shell/TweaksPanel.tsx` — Warmth/Mark/Layout controls + bottom-right toggle
- `frontend/src/components/screens/Landing.tsx` — two-column cover (§6.1)
- `frontend/src/components/screens/About.tsx` — two-column prose (§6.8)
- `frontend/src/components/screens/PlaceholderScreen.tsx` — navigable stubs for unbuilt routes

## Decisions Made
- **Preserve the `genres.ts` API surface.** The reading-room palette is theme-independent (L-05), but the existing `Record<Theme, Record<Genre, string>>` shape and the `genreColor`/`GENRE_LIST`/`UPLOADED_BOOK_COLOR[theme]`/`HISTORICAL_DIM_COLOR` helpers are consumed by ~14 components. I set both `light` and `dark` subrecords to the same reading-room hexes so every consumer compiles unchanged and `buildBuffers` keeps working — the canonical RR genre map lives in `theme/readingRoom.ts::RR_GENRE_HEX`. The `Genre` key `gothic_horror` maps to the tokens.md `gothic` hex (`#6E4A8E`). `UPLOADED_BOOK_COLOR` is now the oxblood accent (the text under reading) against any paper.
- **Shell store split.** Per CONTEXT's Claude's-discretion note, route/guide/tweaks/tour go in a new small `readingRoomStore`; `visualizationStore` + `uploadStore` stay as the data-side stores untouched. Session-scoped route + persisted shell prefs are cleanly separated.
- **Landing plate = static SVG.** A deterministic seeded-SVG scatter preview keeps Landing cheap; the live reskinned R3F plate is explicitly 12-02's job (D-U1).
- **Native Tweaks panel.** The prototype `tweaks-panel.jsx` is an editor-iframe `postMessage` host harness with no analogue here; I built an equivalent reading-room-native control set (paper/accent swatches + carrel/study segmented) writing through the store.

## Deviations from Plan

None — plan executed exactly as written. All six tasks landed in order with the prescribed commit messages; no Rule 1/2/3 auto-fixes were required (tsc stayed green at every step, the genre-token API was kept compatible so no consumer churn, and no test imported the replaced App or asserted old genre hexes).

## Issues Encountered
- The full test run on this machine briefly contended for port 5173 (the user's dev server) — Vite fell back to 5174 for the boot probe; no impact on tests or build.
- Stopping the boot-probe dev server killed all `node.exe` processes (Windows `taskkill`), which would also stop the user's running `npm run dev`; it restarts cleanly on the next invocation.

## Verification
- `npx tsc --noEmit` → exit 0 (clean) after every task.
- `npx vite build` → 87 modules, built clean (confirms dead Phase 10/11 components are tree-shaken out of the live bundle).
- Dev server boots (HTTP 200); served HTML carries Spectral + JetBrains Mono and no indigo FOUC script; `main.tsx` transforms with `initReadingRoomTheme()` wired.
- `npx vitest run` → **167 in-scope tests pass**; the only 6 failures are the documented Phase 9 deferred set (`useClassify.test.ts` ×5 EventSource/WebSocket mock mismatch + `SlowTierParams.test.tsx` ×1 `setH2Enabled`), unchanged from baseline. No tests needed retiring — no test imports the replaced App.tsx, and no test asserts the old genre hexes (the one genre-color assertion checks only the unchanged `#888888` fallback).
- Landing matches `01-landing.png`; About matches `08-about.png` (copy verbatim).

## Known Stubs

These are intentional foundation stubs, each owned by a later plan (documented so the verifier doesn't flag them as accidental):

| Stub | File | Resolves in |
|------|------|-------------|
| PlaceholderScreen renders for collection/card/topology/study/upload/verdict routes | `frontend/src/components/screens/PlaceholderScreen.tsx` (mounted in `App.tsx`) | 12-02 (collection), 12-03 (card/study), 12-04 (upload/verdict), 12-05 (topology) |
| Landing plate is a static seeded-SVG preview, not the live R3F plate | `frontend/src/components/screens/Landing.tsx` (`PlatePreview`) | 12-02 (live reskinned R3F plate) |
| Guide button opens nothing yet (`openGuide` flips store state; no side-sheet mounted) | `App.tsx` (Guide/tour mount points noted) | 12-06 (Guide side-sheet + 6-stop tour) |

None of these prevent the plan's goal (boot into the Reading Room masthead with working Landing/About + live persisted Tweaks), which is fully met.

## Next Phase Readiness
- Foundation complete: tokens, theme apply, shell store, masthead router, footnote system, Tweaks, and Landing/About all live and compiling. 12-02..12-07 can build their screens against this shell.
- The dead Phase 10/11 indigo-only components (TopNavTabs, Sidebar, TourProvider, PipelineExplanation, SettingsDrawer, etc.) remain on disk but are no longer in the live bundle; later plans (or a cleanup pass) can delete clearly-dead ones once their responsibility is re-homed. Data hooks and surviving components were not touched.
- Phase 9 deferred test failures (×6) remain deferred per scope.

## Self-Check: PASSED

All 9 created files exist on disk; all 5 task commit hashes (`d81d7d5`, `0af70d2`, `15bbc63`, `7fa231b`, `e72fc06`) present in git history.

---
*Phase: 12-reading-room-redesign*
*Completed: 2026-05-29*
