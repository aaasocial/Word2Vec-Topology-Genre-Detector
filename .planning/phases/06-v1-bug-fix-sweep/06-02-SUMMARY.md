---
phase: 06-v1-bug-fix-sweep
plan: 02
subsystem: frontend
tags: [bug-fix, persistence-diagram, topology, ui]
requires: []
provides:
  - "Readable H₁ persistence dots (sqrt scaling)"
  - "Infinity-strip rendering for loops not closed within ε_max"
affects:
  - "frontend/src/components/topology/PersistenceDiagram.tsx"
  - "frontend/src/components/topology/__tests__/PersistenceDiagram.test.tsx"
tech-stack:
  added: []
  patterns:
    - "Canvas 2D ctx Proxy spy for granular call assertions in Vitest"
    - "Defensive Number.isFinite gating on backend-supplied data"
key-files:
  created:
    - "frontend/src/components/topology/__tests__/PersistenceDiagram.test.tsx"
  modified:
    - "frontend/src/components/topology/PersistenceDiagram.tsx"
decisions:
  - "Honored CONTEXT D-06 dot-scaling formula with BASE_RADIUS=1.5, RADIUS_SCALE=5.0, MAX_RADIUS=6.5"
  - "Honored CONTEXT D-07 infinity-strip layout: 14-px band, #F87171 triangle markers, 16-px separator line, ∞ label"
  - "Executed Task 2 first (RED test commit), then Task 1 (GREEN implementation) — true TDD order despite the plan numbering"
metrics:
  duration: "~5 min"
  completed: "2026-05-22T10:12:01Z"
  tasks: 2
  files: 2
  commits: 2
---

# Phase 06 Plan 02: Persistence Diagram Dot Scaling Summary

**One-liner:** Replaces the unreadable step-function radius with continuous
sqrt scaling, plus a dedicated top strip + tooltip for the infinity-death
H₁ loops that previously vanished or auto-rescaled the chart.

## Outcome

The persistence diagram canvas now scales finite H₁ dots by
`radius = clamp(1.5 + 5.0 · sqrt(persistence / max_finite_persistence), .., 6.5)`,
so dot size encodes feature significance at every zoom. Loops whose death
is `Infinity` (`np.inf` from the backend's persistent-homology output)
render on a dedicated 16-px-tall top strip with `#F87171` triangle markers,
separated by a thin line and labelled `∞`. Axis bounds are computed from
finite values only — `Infinity` never enters `Math.max`, which was the
root cause of the v1 auto-rescale bug.

Hovering an infinity-strip marker pops a tooltip with the exact phrasing
mandated by decision D-07:

> loop survives beyond ε_max — feature persists past the filtration window

## Formula Constants Chosen

| Constant       | Value | Why                                                                                |
| -------------- | ----- | ---------------------------------------------------------------------------------- |
| `BASE_RADIUS`  | `1.5` | Even near-zero-persistence noise stays visible (≥ 1 px after device-pixel scaling) |
| `RADIUS_SCALE` | `5.0` | Stretches the curve so the gap between top-decile and noise is visually obvious    |
| `MAX_RADIUS`   | `6.5` | Caps a single outlier from dominating the canvas; equals base + scale at sqrt(1.0) |

At `persistence/max = 1.0` the formula yields exactly `6.5`, hitting the cap
exactly — no discontinuity at the top.
At `persistence/max = 0.25` (a quarter of the max) the formula yields
`1.5 + 5·0.5 = 4.0` — still clearly distinct from the cap, confirming the
sqrt curve does what it should.

## Infinity-Strip Visual Decisions

- **Position:** Top 16 px of the canvas, separated from the plot by a
  `#4A4A5A` 0.5-px line at `y = 16`.
- **Marker:** Upward-pointing triangle, 8-px side, drawn with `moveTo`
  (apex at `y = 4`) + two `lineTo` + `closePath` + `fill`. The apex
  y-coordinate is asserted by the tests (it's the cleanest "did we draw on
  the strip?" signal a canvas-call spy can capture).
- **Color:** `#F87171` (red-400), distinct from the finite dot color
  `#FACC15` (yellow-400). Color-blind safe because the marker shape
  (triangle vs. circle) is also distinct.
- **Label:** `∞` glyph at `(4, 12)` in the same JetBrains Mono used by the
  axis ticks.
- **Tooltip:** `position: absolute` div pinned to the canvas wrapper, only
  shown when the cursor is within the strip band (`y ≤ 16`) and within
  `±6 px` of a marker x. Birth value shown alongside the literal phrasing.
- **Edge cases handled:**
  - Birth > axisMax → marker x clamped into the strip rather than drawn
    off-canvas.
  - All-infinity input → strip renders, plot area is empty (no NaN, no
    crash; the `maxFinitePersistence` fallback to `1.0` keeps the math
    safe).
  - Empty input → nothing drawn beyond grid + diagonal.

## Test Coverage Matrix

| Fixture        | Points                                | What's asserted                                                                                                       |
| -------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| finite-only    | `[[0.1,0.3], [0.1,0.9], [0.2,0.5]]`   | ≥ 3 `arc` calls; no NaN/Infinity in args; max radius ∈ [6.0, 6.5] (sqrt-max hits cap); min radius < max (variance)    |
| finite + inf   | `[[0.1,0.5], [0.2,Infinity]]`         | At least one `moveTo` apex at `y = 4` (triangle drawn); ≥ 1 `arc` for finite dot; no Infinity in any numeric draw arg |
| all-infinity   | `[[0.1,Infinity], [0.3,Infinity]]`    | Zero `arc` calls; exactly 2 apex `moveTo(x, 4)` calls (one per infinity point)                                        |
| empty          | `[]`                                  | Renders without throwing; zero `arc` and zero apex `moveTo` calls (grid + diagonal only)                              |

Implementation note: the four tests use a Proxy-based `getContext('2d')`
stub that captures every method call as `{method, args}`. This overrides
the default `src/test/setup.ts` mock (which only stubs a fixed subset of
methods). Per-canvas-instance caching mirrors real browser semantics so
the renderer's repeated `getContext` calls return a stable stub.

## Self-Verification

| Check                                              | Status |
| -------------------------------------------------- | ------ |
| `grep -c "Math.sqrt"` ≥ 1                          | 1 ✓    |
| `grep -c "BASE_RADIUS\|MAX_RADIUS\|RADIUS_SCALE"` ≥ 3 | 6 ✓    |
| `grep -c "Number.isFinite\|isFinite"` ≥ 1          | 3 ✓    |
| `grep -c "loop survives beyond"` == 1              | 1 ✓    |
| `grep -n "pts.length > 500"` returns nothing       | empty ✓ |
| `grep -c "Infinity"` in test file ≥ 2              | 6 ✓    |
| `grep -c "describe\|it("` in test file ≥ 5         | 6 ✓    |
| `npx vitest run …PersistenceDiagram.test.tsx`      | 4/4 ✓  |
| `npx tsc --noEmit -p tsconfig.app.json`            | clean ✓ |

## Deviations from Plan

- **Task order inverted** (Task 2 committed before Task 1). Both tasks were
  marked `tdd="true"` but Task 1 was the implementation and Task 2 was the
  tests. Standard TDD requires writing failing tests before the
  implementation, so the test commit (`cbd0753`) lands first, then the
  GREEN renderer commit (`ea2c1c3`). Plan acceptance criteria are still
  fully satisfied. Tracked as `[Rule 1 – Bug] Re-order TDD steps for true
  RED → GREEN progression`.
- **Removed a redundant JSX comment containing the tooltip literal** to
  satisfy the strict `grep -c "loop survives beyond" == 1` acceptance
  criterion (the constant `INF_TOOLTIP_TEXT` is the sole source of truth;
  the comment used the literal again for self-documentation, which would
  have produced `count = 2`).
- **Added a `this: HTMLCanvasElement` annotation to the canvas spy**
  function in the test file so `tsc --noEmit` for the whole app stays
  clean. Pure type fix, no behavior change. Tracked as `[Rule 1 – Bug] Fix
  implicit-this TypeScript error in the test spy`.

## Deferred Issues

- **HomologyTabs.test.tsx — "H2 tab is disabled" failing on master HEAD.**
  Pre-existing, unrelated to Plan 06-02 scope. Logged to
  `.planning/phases/06-v1-bug-fix-sweep/deferred-items.md`. Will be
  resolved by Plan 06-01 (BUG-01 H2 removal), which deletes the test file
  entirely.

## Authentication Gates

None — pure frontend rendering change, no server interaction touched.

## Commits

| # | Hash      | Type | Description                                                              |
| - | --------- | ---- | ------------------------------------------------------------------------ |
| 1 | `cbd0753` | test | Add failing PersistenceDiagram fixtures (RED)                            |
| 2 | `ea2c1c3` | feat | Sqrt-scaled diagram with infinity-strip rendering (GREEN)                |

## Self-Check: PASSED

- `frontend/src/components/topology/PersistenceDiagram.tsx` — FOUND
- `frontend/src/components/topology/__tests__/PersistenceDiagram.test.tsx` — FOUND
- Commit `cbd0753` — FOUND (`test(06-02): add PersistenceDiagram fixtures…`)
- Commit `ea2c1c3` — FOUND (`feat(06-02): sqrt-scaled persistence diagram…`)
