---
phase: 04-advanced-visualization-and-parameter-controls
plan: 01
subsystem: frontend-topology-navigation, backend-persistence-api
tags: [topology, persistence-image, heatmap, tabs, navigation, plasma-colorscale]
dependency_graph:
  requires: [03-frontend-core]
  provides: [tab-navigation-shell, persistence-image-endpoint, heatmap-renderer, homology-tabs]
  affects: [04-02-vr-viewer, 04-03-export-params]
tech_stack:
  added: [plasma-colorscale, canvas2d-heatmap]
  patterns: [zustand-phase4-slices, react-query-persistence, tab-conditional-rendering]
key_files:
  created:
    - frontend/src/components/nav/TopNavTabs.tsx
    - frontend/src/components/nav/DisclaimerBanner.tsx
    - frontend/src/components/topology/TopologyPanel.tsx
    - frontend/src/components/topology/PersistenceHeatmap.tsx
    - frontend/src/components/topology/HomologyTabs.tsx
    - frontend/src/hooks/usePersistenceImage.ts
    - frontend/src/lib/plasma.ts
    - frontend/src/lib/heatmap.ts
    - frontend/src/lib/heatmap.test.ts
    - frontend/src/components/nav/__tests__/DisclaimerBanner.test.tsx
    - frontend/src/components/topology/__tests__/HomologyTabs.test.tsx
    - frontend/src/components/topology/__tests__/PersistenceHeatmap.test.tsx
    - backend/tests/test_persistence_api.py
  modified:
    - frontend/src/stores/visualizationStore.ts
    - frontend/src/stores/visualizationStore.test.ts
    - frontend/src/App.tsx
    - frontend/src/test/setup.ts
    - backend/api/routes/viz.py
    - backend/pipeline/precompute_viz.py
decisions:
  - "Used matplotlib-generated 256-stop plasma LUT for exact colormap fidelity"
  - "Canvas 2D fillRect per cell for heatmap rendering (sharp pixel boundaries per UI-SPEC)"
  - "WeakMap-based getContext cache in test setup to ensure mock 2d context consistency"
  - "TOP_OFFSET = 78px (48px nav + 28px disclaimer + 2px borders) for content positioning"
metrics:
  duration_seconds: 685
  completed: "2026-04-13T08:47:40Z"
  tasks_completed: 2
  tasks_total: 2
  tests_added: 22
  tests_total_passing: 88
---

# Phase 4 Plan 01: Topology Tab Navigation and Persistence Heatmap Summary

Tab navigation shell with Scatter/Topology/Compare modes, persistence image heatmap with plasma colorscale and H0/H1/H2 dimension switching, backend persistence image endpoints with genre and book-level caching.

## What Was Built

### Task 1: Tab Navigation Shell and Store Extension
- **TopNavTabs**: Fixed top bar (48px) with 3 tabs (Scatter/Topology/Compare), Settings gear icon, and "How It Works" button. Active tab highlighted with indigo-500 bottom border.
- **DisclaimerBanner**: Below tab bar (28px), shows topology projection disclaimer on Scatter/Topology tabs, hidden on Compare tab (UX-05).
- **visualizationStore extended**: 12 new Phase 4 state slices (activeTab, selectedHomologyDim, vrEpsilon, compareMode, compareGenre, settingsDrawerOpen, pipelineExplanationOpen, isRecomputing, isRetraining, dirtyParams, h2Enabled) with setters.
- **plasma.ts**: 256-stop plasma colorscale LUT generated from matplotlib, each entry integer RGB [0-255].
- **heatmap.ts**: `renderHeatmap()` Canvas 2D renderer with vmin/vmax normalization and `computeMinMax()` utility for COMP-02 shared scale.
- **TopologyPanel**: 50/50 flex layout for persistence heatmap (left) and VR viewer placeholder (right).
- **App.tsx refactored**: Tab-based conditional rendering with 78px top offset for nav+disclaimer.

### Task 2: Backend Persistence Endpoint and Frontend Heatmap
- **Backend endpoints**: `GET /viz/persistence/{genre}?dim=` and `GET /viz/persistence/book/{id}?dim=` returning `{data, M, dim, vmin, vmax}`. Genre validated against _KNOWN_GENRES (T-4-01), ID validated with regex (T-4-02).
- **precompute_persistence_images()**: Aggregates homology diagrams per genre/book, applies persistence imager, caches results with dimension key.
- **usePersistenceImage hook**: React Query with staleTime: Infinity, enabled when genre/book selected.
- **PersistenceHeatmap**: Full component with canvas renderer, "Birth scale" / "Persistence" axis labels, vertical plasma color bar with min/max labels (JetBrains Mono), empty/loading/data states, export button placeholders.
- **HomologyTabs**: H0/H1/H2 switcher with H2 disabled state (cursor-not-allowed, "Enable H2 in Settings" tooltip).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Canvas 2D mock inconsistency in test setup**
- **Found during:** Task 1
- **Issue:** Each `getContext('2d')` call returned a new mock object, breaking test assertions on `_calls` array since `renderHeatmap` got a different context than the test.
- **Fix:** Added WeakMap-based context cache per canvas instance in `setup.ts` so repeated `getContext('2d')` calls return the same object.
- **Files modified:** `frontend/src/test/setup.ts`
- **Commit:** d212136

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| VR viewer placeholder | `frontend/src/components/topology/TopologyPanel.tsx` | 49 | Intentional -- replaced in Plan 04-02 |
| Export buttons disabled | `frontend/src/components/topology/PersistenceHeatmap.tsx` | 73, 87 | Intentional -- wired in Plan 04-03 |
| Compare tab placeholder | `frontend/src/App.tsx` | ~155 | Intentional -- built in Plan 04-02 |
| Settings gear click stub | `frontend/src/components/nav/TopNavTabs.tsx` | ~98 | Toggles store flag; drawer UI built in Plan 04-03 |
| "How It Works" click stub | `frontend/src/components/nav/TopNavTabs.tsx` | ~88 | Toggles store flag; slide deck built in Plan 04-03 |

All stubs are intentional placeholders for downstream plans and do not block this plan's goals.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | d212136 | Tab nav shell, store extension, plasma/heatmap utilities |
| 2 | cadaa14 | Persistence image endpoint, heatmap panel, H0/H1/H2 tabs |

## Test Results

- **Frontend**: 88 tests passing across 13 test files
- **Backend**: 7 new persistence API tests passing
- **New tests added**: 22 (heatmap: 8, store: 6, disclaimer: 3, homology tabs: 5, persistence heatmap: 5, backend API: 7... some counted in existing files)

## Self-Check: PASSED

All 12 key files verified present. Both commits (d212136, cadaa14) verified in git log.
