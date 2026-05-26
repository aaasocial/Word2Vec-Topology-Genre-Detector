# Phase 09 — Deferred Items

Out-of-scope discoveries logged during plan execution. Each item is pre-existing
(not caused by the current plan's edits) and should be addressed in a follow-up
plan or quick-fix workflow.

---

## Found during 09-04 execution

### 1. `frontend/src/hooks/useClassify.test.ts` — 5 failing tests

**Severity:** medium (test suite hygiene, no production impact)
**Pre-existing:** confirmed by `git stash` + re-running the suite at commit
`9a7c2a1` (just after Task 2, before any Task 3 edits). The same 5 failures
reproduce.
**Root cause:** the test file mocks `WebSocket` + `WS_BASE`, but production
`useClassify.ts` uses `EventSource` + `API_BASE` (SSE migration landed in an
earlier phase but the tests were not updated to mock EventSource). All five
failures throw before reaching any code this plan touched -- they fail at
line 49 (`const es = new EventSource(sseUrl)`) where the mock is never wired.
**Failing tests:**
- `sets jobId after successful POST`
- `updates steps on progress messages`
- `caps uploadedPoints at 50k`
- `retries on WebSocket error`
- `sets Unable to connect after 3 retries`

**Recommended fix:** rewrite the test file to mock `EventSource` (the
`apiFetch` mock can stay) and update the message-shape assertions for the
SSE `{step, index, total, message, status, result?}` payload.

### 2. `frontend/src/components/sidebar/__tests__/SlowTierParams.test.tsx` -- 1 failing test

**Severity:** low (test suite hygiene, no production impact)
**Pre-existing:** confirmed by the same `git stash` re-run.
**Root cause:** `setH2Enabled is not a function` -- the test sets
`useVisualizationStore` state via `setState({ dirtyParams: new Set(), ... })`
but the `SlowTierParams.tsx` component reads a `setH2Enabled` selector that
the test fixture does not provide; the store shape and the test fixture are
out of sync.
**Failing test:** `H2 toggle adds "h2" to dirtyParams when enabled`

**Recommended fix:** add the missing setters to the test's `setState` call,
or update the component to derive H2-enabled state from `dirtyParams` rather
than a separate setter.

---

*Neither item blocks plan 09-04 success criteria (the new TopNList +
UncertaintyBadge tests are 14/14 green; tsc passes; ClassificationResult
mounts both components per the contract).*
