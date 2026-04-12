---
phase: 3
slug: frontend-core-and-3d-visualization
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-12
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (backend)** | pytest 8.0+ (already in requirements.txt) |
| **Framework (frontend)** | vitest (standard for Vite projects) |
| **Config file (backend)** | `pytest.ini` / `pyproject.toml` (existing) |
| **Config file (frontend)** | `frontend/vitest.config.ts` (Wave 0 — create) |
| **Quick run command (backend)** | `pytest backend/api/tests/test_viz.py -x` |
| **Quick run command (frontend)** | `cd frontend && npx vitest run --reporter=verbose` |
| **Full suite command** | `pytest backend/ -x && cd frontend && npx vitest run` |
| **Estimated runtime** | ~30s (backend pytest) + ~20s (frontend vitest) |

---

## Sampling Rate

- **After every task commit:** `cd frontend && npx vitest run` + `pytest backend/api/tests/test_viz.py -x`
- **After every plan wave:** Full suite: `pytest backend/ -x && cd frontend && npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | INFRA-04 | — | N/A | infra | `cd frontend && npm run build` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 0 | INFRA-04 | — | N/A | infra | `cd frontend && npx vitest run` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | VIZ-01 | T-3-03 | Points renders 58k items without WebGL crash | unit | `cd frontend && npx vitest run src/components/canvas/PointCloud.test.tsx` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 1 | VIZ-03 | — | TF-IDF opacity in [0,1] range | unit | `cd frontend && npx vitest run src/components/canvas/PointCloud.test.tsx` | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 1 | VIZ-11 | — | Genre palette has exactly 10 entries | unit | `cd frontend && npx vitest run src/constants/genres.test.ts` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 1 | VIZ-02 | — | Projection switch updates position buffer | unit | `cd frontend && npx vitest run src/hooks/useScatterData.test.ts` | ❌ W0 | ⬜ pending |
| 3-03-02 | 03 | 1 | VIZ-08 | — | Camera reset action fires | unit | `cd frontend && npx vitest run src/components/canvas/CameraController.test.tsx` | ❌ W0 | ⬜ pending |
| 3-03-03 | 03 | 1 | VIZ-09 | — | 2D toggle locks Z and polar angle | unit | `cd frontend && npx vitest run src/stores/visualizationStore.test.ts` | ❌ W0 | ⬜ pending |
| 3-03-04 | 03 | 1 | UX-04 | — | Keyboard shortcuts (R, 1-4, Esc) fire Zustand actions | unit | `cd frontend && npx vitest run src/hooks/useKeyboardShortcuts.test.ts` | ❌ W0 | ⬜ pending |
| 3-04-01 | 04 | 1 | VIZ-04 | — | Genre select triggers TF-IDF fetch | unit | `cd frontend && npx vitest run src/hooks/useTfidfData.test.ts` | ❌ W0 | ⬜ pending |
| 3-04-02 | 04 | 1 | VIZ-05 | — | Book slider debounces 200ms | unit | `cd frontend && npx vitest run src/hooks/useDebounce.test.ts` | ❌ W0 | ⬜ pending |
| 3-04-03 | 04 | 1 | VIZ-06 | T-3-01 | Tooltip word/genre rendered via React JSX (XSS safe) | unit | `cd frontend && npx vitest run src/components/canvas/HoverTooltip.test.tsx` | ❌ W0 | ⬜ pending |
| 3-04-04 | 04 | 1 | VIZ-07 | — | Click selects point; Zustand selectedPointIndex updated | unit | `cd frontend && npx vitest run src/stores/visualizationStore.test.ts` | ❌ W0 | ⬜ pending |
| 3-04-05 | 04 | 1 | VIZ-10 | — | Word search filters matched words in store | unit | `cd frontend && npx vitest run src/components/sidebar/WordSearch.test.tsx` | ❌ W0 | ⬜ pending |
| 3-04-06 | 04 | 1 | PARAM-01 | — | Instant controls mutate store without debounce | unit | `cd frontend && npx vitest run src/stores/visualizationStore.test.ts` | ❌ W0 | ⬜ pending |
| 3-04-07 | 04 | 1 | PARAM-02 | — | Fast controls call API after 200ms wait | unit | `cd frontend && npx vitest run src/hooks/useDebounce.test.ts` | ❌ W0 | ⬜ pending |
| 3-05-01 | 05 | 2 | CLASS-03 | T-3-04 | Upload rejects non-.txt files client-side | unit | `cd frontend && npx vitest run src/components/sidebar/UploadZone.test.tsx` | ❌ W0 | ⬜ pending |
| 3-05-02 | 05 | 2 | CLASS-03 | — | Upload result appends amber-highlighted points to store | unit | `cd frontend && npx vitest run src/hooks/useClassify.test.ts` | ❌ W0 | ⬜ pending |
| 3-05-03 | 05 | 2 | CLASS-03 | — | WebSocket progress steps emit 6 stages | unit | `cd frontend && npx vitest run src/hooks/useClassify.test.ts` | ❌ W0 | ⬜ pending |
| 3-06-01 | 06 | 2 | VIZ-01 | T-3-02 | GET /viz/scatter/{projection} validates projection enum | unit | `pytest backend/api/tests/test_viz.py::test_scatter_invalid_projection -x` | ❌ W0 | ⬜ pending |
| 3-06-02 | 06 | 2 | VIZ-04 | T-3-02 | GET /viz/tfidf/{genre} returns per-word weights | unit | `pytest backend/api/tests/test_viz.py::test_tfidf_genre -x` | ❌ W0 | ⬜ pending |
| 3-06-03 | 06 | 2 | VIZ-05 | T-3-02 | GET /viz/tfidf/book/{id} returns per-word weights | unit | `pytest backend/api/tests/test_viz.py::test_tfidf_book -x` | ❌ W0 | ⬜ pending |
| 3-07-01 | 07 | 2 | VIZ-02 | — | precompute_viz produces all 4 projections (PCA/KPCA/UMAP/t-SNE) | unit | `pytest backend/pipeline/tests/test_precompute_viz.py -x` | ❌ W0 | ⬜ pending |
| 3-07-02 | 07 | 2 | VIZ-02 | — | UMAP deterministic with random_state=42 | unit | `pytest backend/pipeline/tests/test_precompute_viz.py::test_umap_determinism -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/vitest.config.ts` — Vitest configuration for React + R3F (jsdom environment, Three.js mock)
- [ ] `frontend/src/test/setup.ts` — Test setup (jsdom globals, THREE mock stubs for WebGL)
- [ ] `backend/api/tests/test_viz.py` — Test stubs for GET /viz/scatter and /viz/tfidf endpoints
- [ ] `backend/pipeline/tests/test_precompute_viz.py` — Test stubs for projection computation
- [ ] Frontend devDependencies: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `@vitest/coverage-v8`
- [ ] Test stub files for all frontend test paths listed in task map above

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 60fps maintained at 58k points during orbit/pan | VIZ-01 | WebGL rendering cannot run in jsdom | Open browser, open DevTools Performance tab, orbit the scatter for 10s, confirm avg frame time <16ms |
| Projection switch animation (lerp transition) | VIZ-02 | Animation timing requires visual inspection | Switch projections, confirm points smoothly transition over ~0.8s |
| Hover tooltip placement doesn't clip viewport | VIZ-06 | Viewport edge cases not testable in jsdom | Hover points near all 4 corners of the canvas |
| Drag-and-drop file upload triggers progress | CLASS-03 | Browser drag API not fully simulable in jsdom | Drag a .txt file onto the upload zone, confirm 6 progress steps animate |
| Uploaded book appears in scatter highlighted amber | CLASS-03 | 3D rendering requires visual inspection | After classification, confirm amber points in scatter with genre label |
| Camera reset (R key / button) returns to home view | VIZ-08 | Requires visual 3D inspection | Press R, confirm camera smoothly returns to default orbit position |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
