---
phase: 4
slug: advanced-visualization-and-parameter-controls
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 1.x (frontend), pytest 7.x (backend) |
| **Config file** | `frontend/vitest.config.ts`, `backend/tests/` |
| **Quick run command** | `cd frontend && npm run test -- --run` |
| **Full suite command** | `cd frontend && npm run test -- --run && cd .. && python -m pytest backend/tests/ -q` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npm run test -- --run`
- **After every plan wave:** Run full suite (frontend + backend)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 04-01-01 | 01 | 1 | TOPO-01 | unit | `vitest run PersistencePanel` | ⬜ pending |
| 04-01-02 | 01 | 1 | TOPO-02 | unit | `vitest run HomologyTabs` | ⬜ pending |
| 04-01-03 | 01 | 1 | TOPO-06 | unit | `vitest run usePersistenceData` | ⬜ pending |
| 04-01-04 | 01 | 1 | TOPO-07 | unit | `vitest run brushingLinking` | ⬜ pending |
| 04-02-01 | 02 | 2 | TOPO-03 | unit | `vitest run VRCanvas` | ⬜ pending |
| 04-02-02 | 02 | 2 | TOPO-04 | unit | `vitest run EpsilonSlider` | ⬜ pending |
| 04-02-03 | 02 | 2 | TOPO-05 | unit | `vitest run VREdgeHighlight` | ⬜ pending |
| 04-02-04 | 02 | 2 | TOPO-03 | integration | `pytest test_precompute_vr` | ⬜ pending |
| 04-03-01 | 03 | 3 | COMP-01 | unit | `vitest run CompareMode` | ⬜ pending |
| 04-03-02 | 03 | 3 | COMP-02 | unit | `vitest run ColorScale` | ⬜ pending |
| 04-03-03 | 03 | 3 | PARAM-03 | unit | `vitest run SettingsDrawer` | ⬜ pending |
| 04-03-04 | 03 | 3 | PARAM-04 | unit | `vitest run VerySlowConfirm` | ⬜ pending |
| 04-03-05 | 03 | 3 | PARAM-05 | unit | `vitest run RecomputeOverlay` | ⬜ pending |
| 04-03-06 | 03 | 3 | EXPLAIN-01 | unit | `vitest run PipelineExplain` | ⬜ pending |
| 04-03-07 | 03 | 3 | UX-03 | unit | `vitest run ExportButton` | ⬜ pending |
| 04-03-08 | 03 | 3 | UX-05 | unit | `vitest run DisclaimerBanner` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/components/topology/__tests__/PersistencePanel.test.tsx` — stubs for TOPO-01/02/06
- [ ] `frontend/src/components/topology/__tests__/VRViewer.test.tsx` — stubs for TOPO-03/04/05
- [ ] `frontend/src/components/sidebar/__tests__/CompareMode.test.tsx` — stubs for COMP-01/02
- [ ] `frontend/src/components/sidebar/__tests__/SettingsDrawer.test.tsx` — stubs for PARAM-03/04/05
- [ ] `frontend/src/components/explain/__tests__/PipelineExplain.test.tsx` — stubs for EXPLAIN-01
- [ ] `backend/pipeline/tests/test_precompute_vr.py` — stubs for VR edge precompute

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| VR animation smooth as ε drags | TOPO-04 | WebGL rendering quality requires browser | Open Topology tab, drag ε slider — edges should appear smoothly without flicker |
| Heatmap color scale visually correct | TOPO-01 | Plasma colorscale correctness is visual | Open Topology tab — heatmap should show plasma gradient from dark purple (low) to yellow (high) |
| Compare dual-brightness looks correct | COMP-01 | Visual rendering of two overlaid genres | Switch to Compare mode — both genres should be visible simultaneously with distinct dimming |
| Pipeline explanation slide content | EXPLAIN-01 | Content correctness is semantic | Open "How it works" — 6 slides should have user's book data where available |
| PNG export quality | UX-03 | Image quality requires visual inspection | Click Export PNG — file should open as a clear, non-blurry image |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
