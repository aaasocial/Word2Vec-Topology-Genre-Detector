# Phase 06 — Deferred Items

Out-of-scope discoveries during plan execution. Each item is documented for the
phase-level cleanup or for a future plan.

## Discovered during Plan 06-02 (Persistence diagram dot scaling)

### HomologyTabs.test.tsx — "H2 tab is disabled when h2Enabled=false" failing

- **Discovered:** 2026-05-22 while running the full topology test suite to
  validate no regressions from the PersistenceDiagram changes.
- **Symptom:** `expect(h2).toHaveAttribute('title', 'Enable H2 in Settings')` —
  element renders without the `title` attribute. Pre-existing failure on
  master HEAD (`83b97f1`); unrelated to Plan 06-02 changes.
- **Why deferred:** Plan 06-01 (BUG-01) removes the H2 tab entirely (per
  06-CONTEXT.md decision D-01/D-02), which will delete this test case.
  Fixing it here would be discarded work.
- **Owner:** Plan 06-01 (BUG-01 H2 removal).
