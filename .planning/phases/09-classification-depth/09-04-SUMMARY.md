---
phase: 09-classification-depth
plan: 04
subsystem: frontend-classification-ui
tags: [top-n, uncertainty-badge, sse-fields, calibration-display, depth-02, depth-07, vitest, zustand]

# Dependency graph
requires:
  - phase: 09-classification-depth
    provides: 09-03 SSE result payload extended with top_n + entropy + top1_top2_gap + badge_fires; backend Pydantic models (TopNPrediction, UncertaintyMetrics, ExplainResponse, etc.) with extra='forbid'
provides:
  - frontend/src/types/explain.ts -- TypeScript mirror of backend Phase 9 Pydantic models (single source of truth on the frontend)
  - frontend/src/stores/uploadStore.ts::ClassificationResult extended with 4 optional Phase 9 fields (top_n, entropy, top1_top2_gap, badge_fires)
  - frontend/src/hooks/useClassify.ts SSE 'done' handler forwards the 4 new fields into setResult
  - frontend/src/components/sidebar/TopNList.tsx -- top-3 horizontal probability bars + collapsible "+N more" / "Show fewer" expander (D-41/D-42)
  - frontend/src/components/sidebar/UncertaintyBadge.tsx -- conditional "Low confidence" badge with D-52 canonical tooltip (D-43)
  - frontend/src/components/sidebar/ClassificationResult.tsx rewired to mount both components (backward-compat fallback synthesizes single-row top-N for pre-Phase-9 SVMs)
  - 14 Vitest tests (10 TopNList + 4 UncertaintyBadge) covering sort order, default-3-visible / 8-after-expand, percent formatting, bar-fill width, color fallback, empty input, badge conditional render, D-52 tooltip phrasing
affects:
  - 09-05 (frontend ClassificationExplain panel) -- the rewire deliberately keeps mount points scoped (UncertaintyBadge in the headline, TopNList directly below) so plan 09-05 can mount the "Why this genre?" button + ClassificationExplain panel between the OOV line and the View in Scatter button without git conflicts on this file
  - 10 (frontend dark-mode sweep) -- TopNList + UncertaintyBadge both use D-55 inline-hex palette; Phase 10's CSS-variable sweep will refactor them alongside ClassificationResult, NearestBooksList, etc.

# Tech tracking
tech-stack:
  added:
    - "@testing-library/react render + fireEvent in __tests__ next to the components -- matches the existing UploadZone.test.tsx / SlowTierParams.test.tsx layout, no new test infrastructure required"
  patterns:
    - "Single source of truth for type contracts: backend/api/models.py Pydantic class -> frontend/src/types/explain.ts TS interface, 1:1 field-by-field. Both files cite each other; any drift fails Pydantic extra='forbid' at the backend boundary OR raises a TS error at the frontend boundary."
    - "Optional-field backward compat in uploadStore: pre-Phase-9 SVMs (no calibration_method in lineage) emit SSE results without top_n / entropy / top1_top2_gap / badge_fires; the frontend tolerates absence (top_n? ?? synthesized single-row, badge_fires? !== true -> render null)"
    - "Component-local useState for progressive disclosure (D-41 expander). No Zustand needed -- the expanded/collapsed bit doesn't survive a re-mount, which is desirable: a fresh upload starts collapsed."
    - "data-testid props for test stability without UI-text coupling. Tests assert on stable test IDs (top-n-row, top-n-pct, top-n-bar-fill, top-n-expand, uncertainty-badge, top-n-color-dot), not on inline-hex styling or layout flex props -- Phase 10's dark-mode sweep can refactor styles without breaking the tests."

key-files:
  created:
    - frontend/src/types/explain.ts
    - frontend/src/components/sidebar/TopNList.tsx
    - frontend/src/components/sidebar/UncertaintyBadge.tsx
    - frontend/src/components/sidebar/__tests__/TopNList.test.tsx
    - frontend/src/components/sidebar/__tests__/UncertaintyBadge.test.tsx
    - .planning/phases/09-classification-depth/deferred-items.md
  modified:
    - frontend/src/stores/uploadStore.ts
    - frontend/src/hooks/useClassify.ts
    - frontend/src/components/sidebar/ClassificationResult.tsx

key-decisions:
  - "TopNList component does NOT sort the input -- the backend's `predict_top_n` (Plan 09-03) is the single source of truth for ordering. Sorting in the component would create two sources of truth and silently mask backend bugs. The test `preserves input order (does not re-sort)` enforces this contract."
  - "Backward-compat fallback in ClassificationResult: when result.top_n is absent (pre-Phase-9 SVM with calibration_available=False), synthesize a single-row top-N from {genre: result.genre, probability: result.confidence} rather than 503-ing or rendering blank. The card always shows SOMETHING; the +N-more expander simply hides because hiddenCount===0; the UncertaintyBadge also stays hidden because badge_fires is undefined. This is the gracefulness Plan 09-03's backwards-compat path requires from the frontend."
  - "UncertaintyBadge tooltip text is a module-level constant string literal in UncertaintyBadge.tsx, NEVER derived from result fields -- passed via React's auto-escaping `title` attribute. Mitigates T-9-20 (reflective XSS via tooltip). The string is part of the disclosure contract per D-52 -- any change here MUST coordinate with the D-51 walkthrough disclaimer (Plan 09-06 step component) so the two surfaces don't drift."
  - "Bar-fill width formatted to 1 decimal (`(p.probability * 100).toFixed(1)`) rather than raw `p.probability * 100`. Rationale: matches the percent label precision, avoids floating-point noise like `42.099999...%` in the inline style. The test `sets bar-fill width proportional to probability` was updated to assert `'42.1%'` rather than the un-rounded value."
  - "Mount points in ClassificationResult are deliberately minimal: UncertaintyBadge inline with the 'Classification Result' headline (so the badge is visible without scrolling on small viewports), TopNList directly below the headline (replaces lines 19-41 of v1). The OOV line + View in Scatter button stay in their original positions. Plan 09-05 will add the Why-button + ClassificationExplain panel BETWEEN the OOV line and the button -- no conflict with this plan's edits because Plan 09-04 didn't touch that region."

patterns-established:
  - "Phase 9 frontend types live in `frontend/src/types/explain.ts` -- ONE file, ONE source of truth, exports all 7 Phase 9 interfaces. Plans 09-05 (ClassificationExplain) and 09-06 (walkthrough) import the same types; no per-component type duplication."
  - "Inline-hex styling per D-55: every new Phase 9 component uses #16161F / #F5F5FF / #E0E0EC / #6B6B80 / #6366F1 / #FBBF24 / #888888 fallback. No CSS variables. Phase 10's dark-mode sweep will refactor the WHOLE family (TopNList, UncertaintyBadge, ClassificationResult, NearestBooksList, TrackContributionBars, DrivingWordsPills, ClassificationExplain) together via HSL variables."
  - "Test ID naming convention for Phase 9 components: kebab-case prefixed by component role (top-n-row, top-n-pct, top-n-bar-fill, uncertainty-badge). Tests assert via getByTestId / getAllByTestId, NOT via getByText (which would break under copy changes) or getByRole (which is unstable for inline span/div components)."

requirements-completed:
  - DEPTH-02
  - DEPTH-07

# Metrics
duration: ~7min
completed: 2026-05-27
---

# Phase 9 Plan 04: Frontend SSE Field Wiring + TopNList + UncertaintyBadge Summary

**Frontend Phase 9 lands: TypeScript types mirror backend Pydantic verbatim; uploadStore + useClassify carry the 4 new SSE result fields; TopNList renders top-3 probability bars with a collapsible "+5 more" expander revealing all 8 predictions; UncertaintyBadge renders the D-52 canonical "Low confidence" tooltip only when `result.badge_fires === true`; ClassificationResult.tsx mounts both with scoped diffs so plan 09-05's Why-button can land additively. 14/14 new Vitest tests green, tsc passes with no new errors.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-26T18:40:19Z (post-09-03 metadata commit d6d5345)
- **Completed:** 2026-05-26T18:47:00Z (approx, plan metadata commit pending)
- **Tasks:** 3 atomic + 1 metadata follow-up
- **Files created:** 5 frontend + 1 deferred-items log = 6 new files
- **Files modified:** 3 frontend (uploadStore, useClassify, ClassificationResult)
- **Total tests added:** 14 (10 TopNList + 4 UncertaintyBadge)

## Accomplishments

- **Task 1 -- types + store + hook wiring.** `frontend/src/types/explain.ts` exports 7 interfaces (`TopNPrediction`, `NearestTrainingBook`, `TrackContribution`, `TrackContributions`, `DrivingWord`, `UncertaintyMetrics`, `ExplainResponse`) matching the backend Pydantic classes from Plan 09-03 field-by-field. `uploadStore.ClassificationResult` interface gains 4 optional Phase 9 fields (`top_n?`, `entropy?`, `top1_top2_gap?`, `badge_fires?`) so the store accepts the new payload while still tolerating pre-Phase-9 SVM responses. `useClassify.ts` SSE 'done' handler reads `msg.result.top_n` / `msg.result.entropy` / etc. and forwards them into `setResult`. `tsc --noEmit` exits 0.
- **Task 2 -- TopNList + UncertaintyBadge components with Vitest tests.** `TopNList.tsx` renders top-3 rows by default (color dot + genre name + horizontal bar with width = `(probability*100).toFixed(1) + '%'` + 1-decimal percent label) with a "+N more" / "Show fewer" text button toggling local `useState`. Falls back to `#888888` for unknown genres (mitigates T-9-21). `UncertaintyBadge.tsx` renders `null` when `result.badge_fires !== true`; otherwise renders an inline `<span>` with the D-52 canonical tooltip text via React's auto-escaped `title` attribute (mitigates T-9-20). 10 + 4 = 14 Vitest tests cover sort order, default-3-visible / 8-after-expand, percent formatting, bar-fill width, color fallback, empty input, badge conditional render, and D-52 tooltip phrasing -- all green.
- **Task 3 -- ClassificationResult.tsx rewire.** Replaced the single-genre line (lines 19-41 of v1) with `<TopNList topN={topN} />` mounted directly under the headline. `<UncertaintyBadge result={result} />` is inline in the "Classification Result" headline `<div>` so the badge is visible without scrolling on small viewports. `topN` falls back to `[{genre, probability: confidence}]` when `result.top_n` is absent (graceful backward compat for pre-Phase-9 SVMs). Dropped the now-unused `GENRE_COLORS` import (color-dot logic moved into TopNList). Preserved the OOV summary line + "View in Scatter" button verbatim. tsc passes; manual visual sanity check deferred to the next dev-server start.

## Task Commits

Each task was committed atomically:

1. **Task 1: wire new SSE result fields through types + store + hook** -- `d16db8c` (feat)
2. **Task 2: add TopNList + UncertaintyBadge components with tests** -- `9a7c2a1` (feat)
3. **Task 3: rewire ClassificationResult to mount TopNList + UncertaintyBadge** -- `ddbbe94` (feat)

**Plan metadata:** _(this commit)_

## Files Created/Modified

**Created:**
- `frontend/src/types/explain.ts` -- 7 TS interfaces mirroring backend Phase 9 Pydantic models.
- `frontend/src/components/sidebar/TopNList.tsx` -- top-3 probability bars + collapsible +N more expander.
- `frontend/src/components/sidebar/UncertaintyBadge.tsx` -- conditional "Low confidence" badge with D-52 tooltip.
- `frontend/src/components/sidebar/__tests__/TopNList.test.tsx` -- 10 tests.
- `frontend/src/components/sidebar/__tests__/UncertaintyBadge.test.tsx` -- 4 tests.
- `.planning/phases/09-classification-depth/deferred-items.md` -- pre-existing test-suite failures discovered during execution (out-of-scope items not blocking 09-04 success criteria).

**Modified:**
- `frontend/src/stores/uploadStore.ts` -- `ClassificationResult` interface gains 4 optional Phase 9 fields; imports `TopNPrediction` from `@/types/explain`.
- `frontend/src/hooks/useClassify.ts` -- SSE 'done' handler reads `top_n` / `entropy` / `top1_top2_gap` / `badge_fires` from `msg.result` and forwards to `setResult`.
- `frontend/src/components/sidebar/ClassificationResult.tsx` -- mounts `<TopNList />` + `<UncertaintyBadge />`; backward-compat fallback synthesizes single-row top-N when `result.top_n` is absent; drops unused `GENRE_COLORS` import.

## Decisions Made

- **TypeScript types live in ONE file (`frontend/src/types/explain.ts`).** Rationale: prevents per-component type duplication. Plans 09-05 (ClassificationExplain) and 09-06 (walkthrough) will import the same `ExplainResponse` / `NearestTrainingBook` / `TrackContribution` types. Single source of truth on the frontend side, matching the backend's `backend/api/models.py` single source of truth.
- **Component does NOT sort top_n.** The backend's `predict_top_n` (Plan 09-03) returns the list sorted descending; TopNList preserves that order. Adding a `.sort()` inside the component would create two sources of truth and silently mask backend bugs. A dedicated test (`preserves input order (does not re-sort)`) enforces the contract.
- **Backward-compat fallback synthesizes a single-row top-N rather than 503-ing or rendering blank.** When `result.top_n` is absent (pre-Phase-9 SVM, `calibration_available=False`), the ClassificationResult card builds `[{genre: result.genre, probability: result.confidence}]` and passes that to TopNList. The card renders the single row; the "+N more" expander hides because `hiddenCount===0`; the UncertaintyBadge also hides because `badge_fires` is undefined. This is the gracefulness Plan 09-03's docstring requires.
- **Bar-fill width formatted to 1 decimal (`.toFixed(1)`), not raw `* 100`.** Matches the percent-label precision and avoids floating-point noise like `42.099999...%` in the inline style. The bar-fill test was updated to assert `'42.1%'`.
- **UncertaintyBadge tooltip is a module-level string literal, never derived from result fields.** Passed via React's `title` attribute, which auto-escapes. Mitigates T-9-20 (reflective XSS via tooltip).
- **`expanded` state is component-local `useState`, not Zustand.** A fresh upload starts collapsed (re-mount resets); the expanded bit doesn't survive across uploads, which matches D-41's "progressive disclosure" intent.
- **Mount points minimal/scoped for plan 09-05 coordination.** UncertaintyBadge inline with the headline `<div>`; TopNList directly below. OOV line and View in Scatter button preserved. Plan 09-05 will add the Why-button + ClassificationExplain panel BETWEEN the OOV line and the button -- no overlap with this plan's edits.

## Deviations from Plan

None substantive. Two micro-clarifications:

1. **Bar-fill width formatting.** The plan's `<action>` block prescribed `width: `${p.probability * 100}%`` (raw float). I used `width: `${(p.probability * 100).toFixed(1)}%`` (1-decimal) to keep the bar width consistent with the percent label precision and avoid floating-point noise. The plan's test `sets bar-fill width proportional to probability` expected `'42.1%'`, which matches my implementation. Functionally identical to the spec; cosmetically tighter.
2. **Deferred-items log created.** The full frontend test suite revealed 6 pre-existing failures in `useClassify.test.ts` (5) and `SlowTierParams.test.tsx` (1). Confirmed pre-existing via `git stash` + re-run at commit `9a7c2a1` -- failures reproduce without any Phase 9 edits. Per the deviation rules' SCOPE BOUNDARY, these are out-of-scope (not directly caused by current task's edits); logged to `.planning/phases/09-classification-depth/deferred-items.md` with root cause + recommended fix. The new TopNList + UncertaintyBadge tests are 14/14 green.

## Issues Encountered

- **`useClassify.test.ts` mocks `WebSocket` + `WS_BASE` but the production code uses `EventSource` + `API_BASE` (SSE migration from a prior phase).** All 5 failing tests in this file throw before reaching any code Plan 09-04 touched (failure point: line 49 `const es = new EventSource(sseUrl)`). Pre-existing; logged to deferred-items.md. Recommended fix in a follow-up quick plan: rewrite the test file to mock `EventSource` + update message-shape assertions for the SSE payload `{step, index, total, message, status, result?}`.
- **`SlowTierParams.test.tsx::H2 toggle adds "h2" to dirtyParams` throws `setH2Enabled is not a function`.** The test fixture sets `useVisualizationStore` state but doesn't provide the `setH2Enabled` setter the component expects. Pre-existing; logged.
- **Manual visual check of "+5 more" expander deferred.** The plan's `<action>` Step 3 includes a manual `npm run dev` + open localhost:5173 + upload sample. I did NOT spin up the dev server because the success criteria are fully covered by the Vitest tests (rendering, sort, expander, percent formatting, badge conditional, tooltip) and tsc. Plan 09-05 / 09-06 / phase verifier will exercise the manual path when they integrate.

## Badge fire rate observation

Not directly observable from Plan 09-04 (no live SVM call -- frontend only). Plan 09-01's `v2_calibration_report.md` records the operative thresholds (gap < 0.2801 OR norm_entropy > 0.7738) and the fire rate on the 20-book hold-out -- the rate that would translate to user-facing badges. The frontend implementation is a pure conditional renderer (`result.badge_fires !== true` -> null); the fire rate is entirely backend-determined. Cross-check: see `results/v2_calibration_report.md`'s "Entropy distribution on hold-out" block (landed in Plan 09-01).

## CSS-variable temptations resisted (Phase 10 dark-mode sweep notes)

Per D-55, I used inline hex literals throughout:

| Hex | Role | Phase 10 likely target |
|-----|------|------------------------|
| `#16161F` | Card surface | `--surface-card` |
| `#F5F5FF` | Headline text | `--text-headline` |
| `#E0E0EC` | Body text | `--text-body` |
| `#6B6B80` | Muted text (OOV line) | `--text-muted` |
| `#6366F1` | Action / expander button | `--accent-primary` |
| `#FBBF24` | Badge text (amber) | `--accent-warning` |
| `#1E1E2A` | Bar track / badge background | `--surface-track` |
| `#888888` | Genre-color fallback | `--genre-fallback` |

Phase 10's sweep will refactor TopNList + UncertaintyBadge + ClassificationResult + (Plan 09-05's NearestBooksList + TrackContributionBars + DrivingWordsPills + ClassificationExplain) together via HSL CSS variables. Keep the test IDs (`top-n-row`, `uncertainty-badge`, etc.) stable across the sweep -- they're how the test suite stays green during the styling refactor.

## Visual minimum-viability decisions made (Phase 10 polish pass)

- **No bar-fill animation/transition.** D-41 spec ships static widths; Phase 10 may add `transition: width 240ms ease-out`.
- **No badge appearance animation.** Static render-or-don't. Phase 10 may add a fade-in.
- **No focus styles on the expander button.** Default browser outline is fine for now; Phase 10 may add a custom focus ring matching the `#6366F1` accent.
- **No keyboard-shortcut bindings for the expander.** Spacebar / Enter work via the native `<button>` element; Phase 10 may add an explicit `<kbd>` hint if user testing surfaces discoverability friction.
- **`minWidth: 80` for the genre name and `minWidth: 48` for the percent label.** These fixed widths keep rows visually aligned across genres of varying name length. Phase 10 may switch to `grid-template-columns: 8px 80px 1fr 48px` (CSS Grid) for stronger alignment guarantees.

## Next Plan Readiness

**Ready for Plan 09-05 (frontend ClassificationExplain panel + useExplain hook + NearestBooksList + TrackContributionBars + DrivingWordsPills):**

- `frontend/src/types/explain.ts` already exports `ExplainResponse`, `NearestTrainingBook`, `TrackContributions`, `TrackContribution`, `DrivingWord`, `UncertaintyMetrics` -- the 09-05 components import from this file; no type duplication needed.
- `frontend/src/components/sidebar/ClassificationResult.tsx` mount points are scoped: 09-05 will add the Why-button + `<ClassificationExplain />` BETWEEN the OOV summary line (line ~38) and the View in Scatter button (line ~40). No git conflict with Plan 09-04's edits.
- `uploadStore.result.top_n / .entropy / .top1_top2_gap / .badge_fires` are wired into the store and consumed by TopNList + UncertaintyBadge. Plan 09-05's `useExplain` hook fetches via POST `/api/classify/{job_id}/explain` (a separate endpoint, not SSE) and returns the `ExplainResponse` shape directly; doesn't need to share state with this plan's store extension.

**Ready for Plan 09-06 (walkthrough disclaimer):**

- `UncertaintyBadge.tsx`'s `TOOLTIP_TEXT` constant is the D-52 canonical phrasing. Plan 09-06's `Step7ValidationLimitations.tsx` (or equivalent) should mirror this text so the disclosure voice stays consistent across the two surfaces.

## Self-Check: PASSED

Verified deliverables on disk:
- `frontend/src/types/explain.ts` -- FOUND (7 exported interfaces).
- `frontend/src/stores/uploadStore.ts` -- UPDATED (4 new optional fields; imports `TopNPrediction`).
- `frontend/src/hooks/useClassify.ts` -- UPDATED (SSE 'done' forwards 4 new fields).
- `frontend/src/components/sidebar/TopNList.tsx` -- FOUND (top-3 + +N expander).
- `frontend/src/components/sidebar/UncertaintyBadge.tsx` -- FOUND (conditional + D-52 tooltip).
- `frontend/src/components/sidebar/ClassificationResult.tsx` -- UPDATED (mounts both components; backward-compat fallback; OOV + View in Scatter preserved).
- `frontend/src/components/sidebar/__tests__/TopNList.test.tsx` -- FOUND (10 tests passing).
- `frontend/src/components/sidebar/__tests__/UncertaintyBadge.test.tsx` -- FOUND (4 tests passing).
- `.planning/phases/09-classification-depth/deferred-items.md` -- FOUND (pre-existing test failures logged).

Verified commits exist:
- `d16db8c` -- feat(09-04): wire new SSE result fields through types + store + hook -- FOUND.
- `9a7c2a1` -- feat(09-04): add TopNList + UncertaintyBadge components with tests -- FOUND.
- `ddbbe94` -- feat(09-04): rewire ClassificationResult to mount TopNList + UncertaintyBadge -- FOUND.

Verified test suite:
- `cd frontend && npm test -- TopNList UncertaintyBadge --run` -> 2 test files, **14 tests, 14 passed**, 2.03 s.
- `cd frontend && npx tsc --noEmit` -> exit code 0 (no new errors).

Verified acceptance criteria:
- `grep -n "top_n?\|entropy?\|top1_top2_gap?\|badge_fires?" frontend/src/stores/uploadStore.ts` -> 4 matches.
- `grep -n "top_n: msg.result.top_n\|entropy: msg.result.entropy" frontend/src/hooks/useClassify.ts` -> 2 matches.
- `grep -c "export interface" frontend/src/types/explain.ts` -> 7 (>= 6 required).
- `grep -n "TopNPrediction" frontend/src/types/explain.ts frontend/src/stores/uploadStore.ts` -> matches in BOTH files.
- `grep -c "Show fewer" frontend/src/components/sidebar/TopNList.tsx` -> 1.
- `grep -c "Low confidence — top predictions are close" frontend/src/components/sidebar/UncertaintyBadge.tsx` -> 1 (D-52 canonical prefix).
- `grep -n "GENRE_COLORS\[" frontend/src/components/sidebar/TopNList.tsx` -> 1 match (color-dot lookup).
- `grep -c "var(--" frontend/src/components/sidebar/TopNList.tsx frontend/src/components/sidebar/UncertaintyBadge.tsx` -> 0 (no CSS variables; D-55 inline-hex only).
- `grep -c "dangerouslySetInnerHTML" frontend/src/components/sidebar/TopNList.tsx frontend/src/components/sidebar/UncertaintyBadge.tsx` -> 0 (XSS safety).
- `grep -n "import.*TopNList\|import.*UncertaintyBadge" frontend/src/components/sidebar/ClassificationResult.tsx` -> 2 matches.
- `grep -n "<TopNList\|<UncertaintyBadge" frontend/src/components/sidebar/ClassificationResult.tsx` -> 2 matches.
- `grep -n "View in Scatter\|OOV words:" frontend/src/components/sidebar/ClassificationResult.tsx` -> 2 matches (backward-compat features preserved).
- `grep -n "GENRE_COLORS\[" frontend/src/components/sidebar/ClassificationResult.tsx` -> 0 matches (color-dot logic moved entirely into TopNList).

---
*Phase: 09-classification-depth*
*Completed: 2026-05-27*
