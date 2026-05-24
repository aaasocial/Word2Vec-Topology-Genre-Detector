---
phase: quick-260524-w2l
plan: 01
subsystem: frontend-settings
tags: [v1.0.1, audit-fix, frontend, recompute, retrain, regression-test]
dependency_graph:
  requires:
    - frontend/src/hooks/useRecompute.ts (already present, zero import sites before this patch)
    - backend POST /api/viz/recompute (viz.py:315, fully wired with PARAM_DEPENDENCY_MAP)
  provides:
    - Wired user-gesture path: slider edit -> button click -> POST /viz/recompute
    - Regression guard against dropping the hook call
  affects:
    - frontend/src/components/settings/SlowTierParams.tsx
    - frontend/src/components/settings/VerySlowTierParams.tsx
    - frontend/src/components/settings/__tests__/SettingsDrawer.test.tsx
    - frontend/src/components/sidebar/__tests__/SlowTierParams.test.tsx (Rule 3 follow-on)
tech_stack:
  added: []
  patterns:
    - vi.hoisted for sharing mock fns with hoisted vi.mock factories
    - QueryClientProvider wrapper for any test that renders a useRecompute consumer
key_files:
  created:
    - frontend/src/components/settings/__tests__/SlowTierParams.test.tsx
    - frontend/src/components/settings/__tests__/VerySlowTierParams.test.tsx
  modified:
    - frontend/src/components/settings/SlowTierParams.tsx
    - frontend/src/components/settings/VerySlowTierParams.tsx
    - frontend/src/components/settings/__tests__/SettingsDrawer.test.tsx
    - frontend/src/components/sidebar/__tests__/SlowTierParams.test.tsx
decisions:
  - "Removed useVisualizationStore import from VerySlowTierParams entirely (setIsRetraining was its sole consumer and useRecompute owns that flag now)"
  - "Used void on triggerRecompute/triggerRetrain calls to make fire-and-forget explicit; per plan, no try/catch in components because the hook self-recovers"
  - "vi.hoisted instead of vi.mock factory referencing outer const to avoid TDZ error when the mock is evaluated before the test file body runs"
  - "Wrapped pre-existing sidebar SlowTierParams.test.tsx in QueryClientProvider (Rule 3 follow-on) because the new useQueryClient dependency would otherwise crash 6 unrelated tests"
metrics:
  duration: ~10 minutes
  completed: 2026-05-24
  tasks_total: 2
  tasks_completed: 2
  files_created: 2
  files_modified: 4
---

# Quick Task 260524-w2l: v1.0.1 useRecompute Wiring Patch Summary

One-liner: Closes the v1.0 audit's PARAM-03..06 broken-flow finding by
importing `useRecompute` into the two slow-tier param components and
adding regression tests that assert `POST /api/viz/recompute` fires
from the actual user-gesture path.

## Audit Context

`v1.0-MILESTONE-AUDIT.md` flagged that the parameter-change-recomputes-cache
loop was severed in git:

- Backend `POST /api/viz/recompute` (viz.py:315) was fully implemented with
  `PARAM_DEPENDENCY_MAP` and a 429 concurrency guard.
- `frontend/src/hooks/useRecompute.ts` was authored but had **zero import sites** in the
  frontend tree.
- `SlowTierParams.handleRecompute` only ran `console.log('Recompute triggered with:', changed)`.
- `VerySlowTierParams.handleConfirmRetrain` only set the `isRetraining` flag with no HTTP call.

Result: dragging a slider and clicking Recompute would visibly do nothing in the
network panel, even though every backend dependency was ready.

This patch wires the hook into both consumers (the only surface change needed; the
hook itself is correct) and adds regression tests so a future refactor cannot
silently drop the call again.

## Files Modified (5)

### Created

| File | Purpose |
|------|---------|
| `frontend/src/components/settings/__tests__/SlowTierParams.test.tsx` | Asserts dirtying a slider + clicking Recompute issues `POST /viz/recompute` with `{ changed_params: { grid_resolution: 40 } }`; asserts disabled state never fires apiFetch. |
| `frontend/src/components/settings/__tests__/VerySlowTierParams.test.tsx` | Asserts confirming the retrain dialog issues `POST /viz/recompute` with `{ changed_params: { vector_size: 150, window: 10 } }`; asserts Keep Current Model reverts the slider and never POSTs. |

### Modified

| File | Change |
|------|--------|
| `frontend/src/components/settings/SlowTierParams.tsx` | `import { useRecompute }`; `const { triggerRecompute } = useRecompute()`; replaced `console.log` with `void triggerRecompute(changed)`; added `triggerRecompute` to `useCallback` deps. |
| `frontend/src/components/settings/VerySlowTierParams.tsx` | `import { useRecompute }`; `const { triggerRetrain } = useRecompute()`; replaced `setIsRetraining(true)` with `void triggerRetrain({ vector_size, window })`; dropped now-unused `useVisualizationStore` import + `setIsRetraining` selector. |
| `frontend/src/components/settings/__tests__/SettingsDrawer.test.tsx` | Wrapped renders in `QueryClientProvider` (SettingsDrawer renders SlowTier + VerySlowTier which now consume `useQueryClient` indirectly). |
| `frontend/src/components/sidebar/__tests__/SlowTierParams.test.tsx` | Same `QueryClientProvider` wrapper (Rule 3 follow-on; would otherwise have broken 6 pre-existing tests). |

## Audit Gaps Closed

| Requirement | Gap (before) | Status (after) |
|-------------|--------------|----------------|
| PARAM-03 | Slow-tier slider dirty state had no consumer wired to the hook | Wired: `handleRecompute -> triggerRecompute(changed)` |
| PARAM-04 | Recompute Results button click was a no-op (`console.log` only) | Wired: button issues `POST /viz/recompute` |
| PARAM-05 | Retrain confirm only flipped the `isRetraining` flag locally | Wired: `handleConfirmRetrain -> triggerRetrain({vector_size, window})` |
| PARAM-06 | `useRecompute` had zero import sites in `frontend/src/` | 2 import sites (SlowTierParams, VerySlowTierParams) |

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | `b2d5ee7` | `fix(v1.0.1): wire useRecompute into SlowTierParams + VerySlowTierParams` |
| 2 | `bb1d195` | `test(v1.0.1): add regression tests for recompute/retrain HTTP wiring` |

## Verification Evidence

### Hook import-site count (audit's "zero import sites" finding)
```
$ grep -rn "from '@/hooks/useRecompute'" frontend/src
frontend/src/components/settings/SlowTierParams.tsx:3:import { useRecompute } from '@/hooks/useRecompute'
frontend/src/components/settings/VerySlowTierParams.tsx:3:import { useRecompute } from '@/hooks/useRecompute'
```
2 matches (expected: 2).

### Dead-string check
```
$ grep -rn "Recompute triggered with" frontend/src
(no matches)
```
0 matches (expected: 0).

### Test results
```
$ vitest run SlowTierParams VerySlowTierParams SettingsDrawer
Test Files  4 passed (4)
     Tests  12 passed (12)
```
- 2 new SlowTierParams wiring tests pass
- 2 new VerySlowTierParams wiring tests pass
- 2 SettingsDrawer tests pass (with QueryClient wrapper)
- 6 pre-existing sidebar SlowTierParams tests pass (with QueryClient wrapper)
- 4 RecomputeOverlay tests pass (unchanged)

### Type check
```
$ tsc --noEmit
(no output, exit 0)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Wrap SettingsDrawer + sidebar SlowTierParams tests in QueryClientProvider**
- Found during: Task 1 (typecheck + adjacent test run after wiring)
- Issue: Both components now indirectly consume `useQueryClient` via `useRecompute()`. Any test that renders them without a `QueryClientProvider` throws `No QueryClient set` at mount.
- Fix: Added a tiny `QueryClientProvider` wrapper to both test files. No behavior change to assertions.
- Files modified:
  - `frontend/src/components/settings/__tests__/SettingsDrawer.test.tsx`
  - `frontend/src/components/sidebar/__tests__/SlowTierParams.test.tsx`
- Commits: `b2d5ee7` (SettingsDrawer wrapper) and `bb1d195` (sidebar wrapper)

**2. [Rule 3 - Blocking] Use `vi.hoisted` instead of outer-scope `const` for mock fn**
- Found during: Task 2 (first run of new tests)
- Issue: `vi.mock('@/lib/api', () => ({ apiFetch: apiFetchMock, ... }))` is hoisted above the `const apiFetchMock = vi.fn()` line, so the factory tries to reference an uninitialized binding -> TDZ ReferenceError.
- Fix: Use `const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn().mockResolvedValue(...) }))`. The plan's example mock pattern didn't account for vitest 2.x hoisting strictness.
- Files modified: both new test files.
- Commit: `bb1d195`

**3. [Rule 2 - Cleanup] Drop unused `useVisualizationStore` import + `setIsRetraining` selector from VerySlowTierParams**
- Found during: Task 1 (after replacing `setIsRetraining(true)` with `triggerRetrain(...)`).
- Issue: `setIsRetraining` was the only thing the file pulled from the store. Leaving the import in would have introduced an unused-import lint warning.
- Fix: Removed the import line and the selector.
- Files modified: `frontend/src/components/settings/VerySlowTierParams.tsx`.
- Commit: `b2d5ee7`

## Recommendation for Orchestrator

Update `v1.0-MILESTONE-AUDIT.md` status from `gaps_found` to `resolved` for the
PARAM-03..06 cluster in a follow-up commit (not done here because audit doc
is outside this patch's commit boundary).

## Self-Check: PASSED

- `frontend/src/components/settings/__tests__/SlowTierParams.test.tsx` — created and at `bb1d195` (committed)
- `frontend/src/components/settings/__tests__/VerySlowTierParams.test.tsx` — created and at `bb1d195` (committed)
- `frontend/src/components/settings/SlowTierParams.tsx` — wiring at `b2d5ee7` (committed)
- `frontend/src/components/settings/VerySlowTierParams.tsx` — wiring at `b2d5ee7` (committed)
- `frontend/src/components/settings/__tests__/SettingsDrawer.test.tsx` — wrapper at `b2d5ee7` (committed)
- `frontend/src/components/sidebar/__tests__/SlowTierParams.test.tsx` — wrapper at `bb1d195` (committed)
- Commit `b2d5ee7` (Task 1) — verified present in git log
- Commit `bb1d195` (Task 2) — verified present in git log
- All commits prefixed `fix(v1.0.1)` / `test(v1.0.1)` per lock
- 12/12 tests pass; tsc exits 0
