---
phase: 11-onboarding-theme-defaults
plan: 11-01
subsystem: ui
tags: [react, zustand, theming, onboarding, vite, playwright, localStorage]

# Dependency graph
requires:
  - phase: 10-visual-polish
    provides: preferencesStore (theme + tourCompleted), TourProvider/useTour, PipelineExplanation (How It Works), visualizationStore.pipelineExplanationOpen, applyTheme + :root.light token scope
provides:
  - Light is the default theme for new users with a no-FOUC inline pre-hydration script
  - introSeenAt timestamp + 30-day staleness helper (isIntroStale / INTRO_TTL_MS) in preferencesStore
  - First-visit (or ≥30-day) How-It-Works → tour onboarding chain orchestrated in App
  - Tour no longer auto-starts independently; fires only via the chain or manual Replay
affects: [onboarding, theming, first-run-experience, tour, future-onboarding-tweaks]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pre-hydration inline <head> script toggles theme class before the bundle loads (no FOUC)"
    - "Consume-on-fire timestamp gate (introSeenAt set at open time) survives mid-sequence reloads"
    - "Provider-boundary orchestrator: a child rendered inside TourProvider runs useTour()-dependent side effects without prop drilling"
    - "Observe store transition (pipelineExplanationOpen true→false) instead of prop-drilled onClose callbacks"

key-files:
  created: []
  modified:
    - frontend/index.html
    - frontend/src/stores/preferencesStore.ts
    - frontend/src/tour/TourProvider.tsx
    - frontend/src/components/explanation/PipelineExplanation.tsx
    - frontend/src/App.tsx
    - frontend/tests/e2e/tour-anchors.spec.ts

key-decisions:
  - "D-86: light is the default theme for new users; reverses D-58 dark-default lock"
  - "D-87: re-trigger window is first-visit OR ≥30 days, gated by persisted introSeenAt"
  - "D-88: intro = How It Works → tour; introSeenAt consumed-on-fire so a reload mid-sequence does not reopen"
  - "D-89: tour no longer auto-starts off tourCompleted; only via chain or manual Replay (reverses D-73)"
  - "D-90: early dismissal of How It Works during the auto-intro still chains; manual opens do not (introSequenceActive flag)"

patterns-established:
  - "No-FOUC: inline <head> script reads Zustand persist payload (.state.theme), falls back to light on parse error (Rule 1)"
  - "Onboarding orchestration lives in a null-rendering child inside TourProvider so it can call useTour().start()"
  - "Auto-intro distinguished from manual opens via an introSequenceActiveRef set only when App auto-opens the modal"

requirements-completed: [ONBOARD-01, ONBOARD-02, ONBOARD-03]

# Metrics
duration: ~6min
completed: 2026-05-28
---

# Phase 11 Plan 11-01: Onboarding & Theme Defaults Summary

**Light is now the default theme (no dark flash via an inline pre-hydration script), and a first-visit How-It-Works → 4-step-tour onboarding chain fires once per 30 days, gated by a persisted `introSeenAt` timestamp; the tour no longer auto-starts on its own.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-28T11:54:35Z
- **Completed:** 2026-05-28T12:00:15Z
- **Tasks:** 6
- **Files modified:** 6

## Accomplishments
- New users (cleared localStorage) load in **light** mode with no dark flicker — an inline `<head>` script adds `.light` to `<html>` before the React bundle loads, reading the existing `lgt-prefs-v1` persist payload and defaulting to light for new users (D-86).
- `preferencesStore` default theme flipped `'system' → 'light'`; persisted dark/system users are untouched.
- Added `introSeenAt: number | null` + `setIntroSeenAt`, plus exported `INTRO_TTL_MS` (30 days) and `isIntroStale()` helper (D-87).
- Removed the tour's independent first-load auto-start; it now fires only via the onboarding chain or the manual "Replay tour" Help item (D-89, reverses D-73).
- Built the first-visit onboarding chain in App: stale `introSeenAt` → auto-open How It Works (consume-on-fire) → on close, start the 4-step tour after a 300ms unmount delay; manual opens do not chain (D-88/D-90).

## Task Commits

Each task was committed atomically:

1. **Task 1: Light default + no-FOUC first paint** - `0f0d111` (feat)
2. **Task 2: introSeenAt timestamp + staleness helper** - `11860ad` (feat)
3. **Task 3: tour no longer auto-starts independently** - `aec093e` (refactor)
4. **Task 4: expose How It Works close signal** - `4877723` (feat)
5. **Task 5: first-visit How-It-Works→tour chain** - `e622e95` (feat)
6. **Task 6 (deviation): seed introSeenAt in tour-anchor smoke** - `8397206` (test)

**Plan metadata:** see final `docs(11-01)` commit.

## Files Created/Modified
- `frontend/index.html` - Added inline pre-hydration theme script in `<head>`; removed `class="dark"` from `<html>` so the script controls first paint.
- `frontend/src/stores/preferencesStore.ts` - Default theme `'light'`; added `introSeenAt` + `setIntroSeenAt`, `INTRO_TTL_MS`, `isIntroStale()`; updated stale dark-default comments.
- `frontend/src/tour/TourProvider.tsx` - Removed the `tourCompleted`-driven first-load `useEffect` + `firstLoadFiredRef`; dropped now-unused `useEffect`/`useRef` imports and `FIRST_LOAD_DELAY_MS`. `start/next/prev/skip/done` + `useTour()` unchanged.
- `frontend/src/components/explanation/PipelineExplanation.tsx` - Documented the single close funnel (every dismissal routes through `handleClose → setPipelineExplanationOpen(false)`) so App can observe the close; content untouched (Phase 10 §12 NOT-list).
- `frontend/src/App.tsx` - Added `OnboardingOrchestrator` (rendered inside `TourProvider`): once-on-mount auto-intro + true→false observation of `pipelineExplanationOpen` to chain into the tour; `introSequenceActiveRef` distinguishes auto-intro from manual opens.
- `frontend/tests/e2e/tour-anchors.spec.ts` - Seed a fresh `introSeenAt` in the smoke fixture so the new auto-intro modal does not intercept anchor clicks (deviation, see below).

## Decisions Made
- Implemented the onboarding orchestration as a null-rendering `OnboardingOrchestrator` child **inside** `<TourProvider>` rather than in App's body, because `useTour().start()` is only available inside the provider and App itself is the provider's parent. This avoids prop-drilling the tour API.
- Chose to **observe the `visualizationStore.pipelineExplanationOpen` true→false transition** (via a `prevOpenRef`) rather than add an `onClose` prop to `PipelineExplanation`, matching the plan's "prefer observing the transition to avoid prop drilling" guidance. Every existing close path already routes through `setPipelineExplanationOpen(false)`, so no component API change was needed.
- Left `resolveEffectiveTheme`'s SSR/no-`matchMedia` fallback at `'dark'` — it only applies to the `system` branch in test environments and does not affect the new-user light default (new users get `theme: 'light'`, not `system`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Seed `introSeenAt` in the Playwright tour-anchor smoke fixture**
- **Found during:** Task 6 (Verification)
- **Issue:** The smoke `beforeEach` pre-seeded `lgt-prefs-v1` with `tourCompleted: true` to suppress the old first-load tour, but did not set `introSeenAt`. With the Phase 11 auto-intro, `isIntroStale(undefined)` returns `true`, so the How It Works dialog auto-opened on mount and its `role="dialog"` overlay intercepted pointer events — failing the `theme-toggle` and `compare-tab` anchor click tests.
- **Fix:** Seeded `introSeenAt: Date.now()` (plus the existing `tourCompleted: true`) in the fixture so `isIntroStale()` is false and the modal stays closed — mirroring the existing tour suppression. No production code changed.
- **Files modified:** `frontend/tests/e2e/tour-anchors.spec.ts`
- **Verification:** `npx playwright test` → 9/9 passed (was 7 passed / 2 failed).
- **Committed in:** `8397206`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The deviation is a test-fixture update made necessary by the intentional behavior change (the new auto-intro). No production scope creep; the fixture now reflects the Phase 11 onboarding contract.

## Issues Encountered
- Vitest reports 6 pre-existing failures (5 in `src/hooks/useClassify.test.ts`, 1 in `src/components/sidebar/__tests__/SlowTierParams.test.tsx`) — these are the documented Phase 9 deferred items (`.planning/phases/09-classification-depth/deferred-items.md` #1 and #2) and are out of scope per the plan's Rule 3. None are touched by this plan's edits (167/173 tests, 28/30 files green).

## Verification Results
- `npx tsc --noEmit` → exit 0 (clean after every task).
- `npm run test -- --run` → 167 passed / 6 failed; all 6 failures are the Phase-9-deferred `useClassify` + `SlowTierParams` tests (expected, out of scope).
- `npx playwright test` → 9/9 passed (tour-anchor smoke green after the fixture fix).
- Manual browser verification (light first paint, auto-intro chain, persisted-theme respect, manual-open no-chain, Replay, ≥30-day re-fire) is pending the user's in-browser check per the sequential-executor handoff.

## User Setup Required
None - no external service configuration required. Frontend-only; no backend or env changes.

## Next Phase Readiness
- ONBOARD-01..03 delivered and verified via tsc + Vitest (in-scope green) + Playwright smoke.
- User should perform the in-browser checks listed in Task 6 (clear localStorage → light + intro chain; dark stays dark; manual open no-chain; Replay; simulate 30-day-old `introSeenAt`).
- No blockers for subsequent work.

## Self-Check: PASSED

All 6 modified files exist on disk; all 6 task commits (`0f0d111`, `11860ad`, `aec093e`, `4877723`, `e622e95`, `8397206`) are present in git history.

---
*Phase: 11-onboarding-theme-defaults*
*Completed: 2026-05-28*
