---
phase: 04-advanced-visualization-and-parameter-controls
plan: 03
subsystem: frontend-compare, frontend-settings, frontend-explanation, frontend-export, backend-recompute
tags: [compare-mode, dual-brightness, settings-drawer, parameter-tiers, recompute, pipeline-explanation, export, csv, png]
dependency_graph:
  requires: [04-01-tab-navigation, 04-01-persistence-heatmap, 04-02-vr-viewer]
  provides: [compare-mode, settings-drawer, recompute-endpoint, pipeline-explanation, export-utils]
  affects: [phase-5-deployment]
tech_stack:
  added: [pydantic-recompute-validation, param-dependency-map]
  patterns: [dirty-param-tracking, dual-tfidf-brightness, tiered-parameter-controls, svg-vr-mini-animation]
key_files:
  created:
    - frontend/src/components/compare/CompareControls.tsx
    - frontend/src/components/compare/CompareHeatmaps.tsx
    - frontend/src/components/compare/__tests__/CompareControls.test.tsx
    - frontend/src/components/compare/__tests__/CompareHeatmaps.test.tsx
    - frontend/src/components/settings/SettingsDrawer.tsx
    - frontend/src/components/settings/SlowTierParams.tsx
    - frontend/src/components/settings/VerySlowTierParams.tsx
    - frontend/src/components/settings/RecomputeOverlay.tsx
    - frontend/src/components/settings/__tests__/SettingsDrawer.test.tsx
    - frontend/src/components/settings/__tests__/RecomputeOverlay.test.tsx
    - frontend/src/components/sidebar/__tests__/SlowTierParams.test.tsx
    - frontend/src/hooks/useRecompute.ts
    - frontend/src/lib/exportUtils.ts
    - frontend/src/lib/exportUtils.test.ts
    - frontend/src/components/explanation/PipelineExplanation.tsx
    - frontend/src/components/explanation/steps/Step1WordEmbed.tsx
    - frontend/src/components/explanation/steps/Step2TfidfWeight.tsx
    - frontend/src/components/explanation/steps/Step3PointCloud.tsx
    - frontend/src/components/explanation/steps/Step4Homology.tsx
    - frontend/src/components/explanation/steps/Step5PersistenceImage.tsx
    - frontend/src/components/explanation/steps/Step6Classification.tsx
    - backend/tests/test_recompute.py
  modified:
    - frontend/src/App.tsx
    - frontend/src/stores/visualizationStore.ts
    - frontend/src/components/sidebar/Sidebar.tsx
    - frontend/src/components/canvas/PointCloud.tsx
    - frontend/src/components/canvas/ScatterCanvas.tsx
    - frontend/src/components/topology/PersistenceHeatmap.tsx
    - backend/api/routes/viz.py
decisions:
  - "SVG-based VR mini animation in pipeline explanation Step 4 (not full R3F -- lighter weight for educational context)"
  - "Export PNG uses preserveDrawingBuffer on WebGL canvas (set in ScatterCanvas) with toDataURL"
  - "PARAM_DEPENDENCY_MAP in backend for selective recomputation -- each param maps to affected pipeline steps"
  - "Dirty param tracking via Zustand Set with add/remove/clear -- amber badge appears when size > 0"
  - "RecomputeOverlay uses pointer-events: none so canvas orbit/pan/zoom works underneath"
metrics:
  duration_seconds: 948
  completed: "2026-04-13T09:19:19Z"
  tasks_completed: 4
  tasks_total: 5
  tests_added: 35
  tests_total_passing: 134
---

# Phase 4 Plan 03: Genre Comparison, Settings, Explanation, Export Summary

Compare mode with dual TF-IDF brightness and shared-scale heatmaps, settings drawer with 8 slow-tier + 2 very-slow-tier parameters and selective recomputation via PARAM_DEPENDENCY_MAP, 6-step fullscreen pipeline explanation with interactive SVG VR animation, and PNG/CSV export utilities.

## What Was Built

### Task 1: Compare Mode with Dual Brightness and Stacked Heatmaps
- **CompareControls**: Toggle button (Columns2 icon) activates compare mode; second genre picker appears below primary. Active state uses indigo-500 background. Deactivating clears compareGenre.
- **CompareHeatmaps**: Two stacked 260x260px persistence heatmaps with shared vmin/vmax computed from combined datasets (COMP-02). Each labeled with genre name in genre color. Uses `computeMinMax([...dataA.data, ...dataB.data])` for consistent color scale.
- **PointCloud dual brightness**: When compareMode active, Genre A and Genre B render at full opacity with TF-IDF-based brightness; all other points dim to 4%. Compare TF-IDF weights fetched separately via `useGenreTfidf`.
- **App.tsx compare tab**: Replaces placeholder with full scatter canvas in compare mode, passing both tfidfWeights and compareTfidfWeights.
- **ScatterCanvas**: Added `preserveDrawingBuffer: true` and `onCanvasReady` callback for export support.

### Task 2: Settings Drawer with Tiered Parameters and Recomputation
- **SettingsDrawer**: 400px slide-in Sheet from right, 300ms ease-out animation. Esc/X/overlay-click to close. Contains SlowTierParams and VerySlowTierParams separated by divider.
- **SlowTierParams**: 8 parameter sliders (grid_resolution, sigma, k_clusters, alpha, svm_gamma, svm_C, epsilon_max, epsilon_step) with dirty tracking per param. Amber badge ("Parameters changed -- Recompute Results") when dirty. Full-width Recompute button (indigo-500, disabled when clean). H2 toggle checkbox.
- **VerySlowTierParams**: 2 parameter sliders (vector_size, window) with red warning banner and confirm dialog. "Retrain Word2Vec Model?" dialog with destructive action styling. Cancel reverts slider value.
- **RecomputeOverlay**: Semi-transparent overlay (z-25) with `pointer-events: none` so canvas stays interactive. "Updating..." or "Retraining model..." badge. Spinner animation.
- **useRecompute hook**: POST to `/viz/recompute`, WebSocket progress listening, cache invalidation on completion. Supports triggerRecompute, triggerRetrain, cancelRecompute.
- **POST /viz/recompute endpoint**: Pydantic validation with `extra='forbid'` (T-4-07). Range constraints on all params. PARAM_DEPENDENCY_MAP determines affected pipeline steps. 429 on concurrent recompute (T-4-08). Returns job_id and affected_steps.
- **Store extended**: Added `removeDirtyParam` setter for clean-when-reverted tracking.

### Task 3: Export Utilities (PNG and CSV)
- **exportUtils.ts**: `exportScatterPNG` (canvas.toDataURL -> anchor click), `exportHeatmapPNG`, `exportPersistenceCSV` (Blob with birth,death,dimension,persistence columns). All filenames follow `lgt-{type}-{genre}-{detail}-{timestamp}.{ext}` pattern.
- **PersistenceHeatmap**: PNG and CSV buttons wired (replacing Plan 01 disabled stubs). 2-second check icon feedback after export.
- **Sidebar**: Export PNG button with Download icon, wired via scatterCanvasRef from App.tsx.

### Task 4: Pipeline Explanation Dialog
- **PipelineExplanation**: Fullscreen dialog (z-50, 95% opacity overlay). Max-width 960px content area. Step indicator "Step N / 6" top-right. Navigation: Previous/Next buttons, 6 step dots (active=indigo-500), keyboard Left/Right/Esc. 200ms crossfade between steps. Final step shows "Close" button.
- **Step1WordEmbed**: Mini scatter of 12 labeled words showing semantic clustering.
- **Step2TfidfWeight**: Before/after word cloud comparison (uniform vs. TF-IDF weighted).
- **Step3PointCloud**: Static genre-colored clusters with sized points reflecting TF-IDF.
- **Step4Homology**: Interactive SVG VR animation with 12 points, 20 edges, draggable epsilon slider. Yellow highlight for newly-born edges.
- **Step5PersistenceImage**: 8x8 example heatmap using actual PLASMA_256 colorscale.
- **Step6Classification**: Horizontal bar chart with genre confidence scores.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Store removeDirtyParam setter**
- **Found during:** Task 2
- **Issue:** Store had `addDirtyParam` and `clearDirtyParams` but no `removeDirtyParam` for individual param cleanup when slider reverts to original value.
- **Fix:** Added `removeDirtyParam` to VisualizationState interface and implementation.
- **Files modified:** `frontend/src/stores/visualizationStore.ts`
- **Commit:** 833d68d

**2. [Rule 2 - Missing] ScatterCanvas onCanvasReady callback**
- **Found during:** Task 3
- **Issue:** No way to get the WebGL canvas element reference for PNG export. R3F Canvas doesn't expose the DOM element directly.
- **Fix:** Added `onCanvasReady` prop to ScatterCanvas that fires with `gl.domElement` in `onCreated`. App.tsx passes ref to Sidebar.
- **Files modified:** `frontend/src/components/canvas/ScatterCanvas.tsx`, `frontend/src/App.tsx`
- **Commit:** 3827e01

## Known Stubs

None. All Plan 01 stubs resolved:
- Export buttons: wired in Task 3
- Compare tab placeholder: replaced in Task 1
- Settings gear click: opens SettingsDrawer in Task 2
- "How It Works" click: opens PipelineExplanation in Task 4

## Threat Surface

| Flag | File | Description |
|------|------|-------------|
| T-4-07 mitigated | `backend/api/routes/viz.py` | Pydantic `extra='forbid'` + param name validation + range constraints on POST /viz/recompute |
| T-4-08 mitigated | `backend/api/routes/viz.py` | Concurrent recompute rejection via `_recompute_in_progress` flag returning 429 |
| T-4-09 mitigated | `frontend/src/components/settings/VerySlowTierParams.tsx` | Confirm dialog prevents accidental retrain trigger |
| T-4-10 accepted | `frontend/src/lib/exportUtils.ts` | Exports only data user is already viewing; no auth needed |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 833d68d | Compare mode with dual brightness and stacked heatmaps |
| 2 | 3d2d1d4 | Settings drawer with tiered params and recomputation |
| 3 | 3827e01 | Export utilities for PNG scatter, PNG heatmap, CSV persistence |
| 4 | 6c6b74f | 6-step pipeline explanation dialog with keyboard nav |

## Test Results

- **Frontend**: 128 tests passing across 20 test files
- **Backend**: 6 new recompute endpoint tests passing (93+ total)
- **New tests added**: 35 (10 compare + 6 SlowTierParams + 2 SettingsDrawer + 4 RecomputeOverlay + 7 exportUtils + 6 backend recompute)

## Task 5: Checkpoint Pending

Task 5 is a human visual verification checkpoint. All automated tasks (1-4) are complete and committed. The checkpoint requires manual verification of the complete Phase 4 feature set in the running application.

## Self-Check: PASSED

All 23 key files verified present. All 4 commits (833d68d, 3d2d1d4, 3827e01, 6c6b74f) verified in git log.
