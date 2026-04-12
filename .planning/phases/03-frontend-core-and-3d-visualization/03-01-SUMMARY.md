---
phase: 03-frontend-core-and-3d-visualization
plan: 01
subsystem: ui
tags: [react, vite, three.js, react-three-fiber, zustand, react-query, vitest, typescript]

requires: []
provides:
  - React/Vite/R3F frontend scaffold with pinned dependencies
  - THREE.Points ShaderMaterial PointCloud rendering 58k word points
  - Zustand stores: visualizationStore, uploadStore, uiStore
  - React Query useScatterData hook (staleTime Infinity)
  - Genre palette 10 entries (VIZ-11) + projection constants
  - Upload sidebar scaffolds: UploadZone, UploadProgress, ClassificationResult
  - useClassify hook with client-side validation and WebSocket 3-retry
  - buildBuffers / buildUploadedBuffers helpers
affects:
  - 03-02 (controls layer reads these stores and hooks)
  - 03-03 (upload flow refines UploadZone/useClassify)
  - 03-04 (backend endpoints consumed by useScatterData)

tech-stack:
  added:
    - react@18, react-dom@18
    - vite@5, "@vitejs/plugin-react"
    - "@react-three/fiber", "@react-three/drei", three
    - zustand
    - "@tanstack/react-query"
    - vitest, "@testing-library/react", "@testing-library/user-event", jsdom
    - typescript, tailwindcss, shadcn/ui scaffold
  patterns:
    - THREE.Points with custom ShaderMaterial for GPU-accelerated point cloud
    - Zustand atomic stores per domain (viz, upload, ui)
    - React Query with staleTime Infinity for static scatter data
    - Float32Array buffers for position/color/size passed directly to BufferGeometry

key-files:
  created:
    - frontend/package.json
    - frontend/vite.config.ts
    - frontend/vitest.config.ts
    - frontend/src/types/scatter.ts
    - frontend/src/constants/genres.ts
    - frontend/src/constants/projections.ts
    - frontend/src/stores/visualizationStore.ts
    - frontend/src/stores/uploadStore.ts
    - frontend/src/stores/uiStore.ts
    - frontend/src/lib/api.ts
    - frontend/src/lib/buffers.ts
    - frontend/src/lib/utils.ts
    - frontend/src/hooks/useScatterData.ts
    - frontend/src/hooks/useClassify.ts
    - frontend/src/hooks/useClassify.test.ts
    - frontend/src/components/canvas/PointCloud.tsx
    - frontend/src/components/canvas/ScatterCanvas.tsx
    - frontend/src/components/sidebar/UploadZone.tsx
    - frontend/src/components/sidebar/UploadZone.test.tsx
    - frontend/src/components/sidebar/UploadProgress.tsx
    - frontend/src/components/sidebar/ClassificationResult.tsx
    - frontend/src/App.tsx
    - frontend/src/main.tsx
  modified: []

key-decisions:
  - "THREE.Points + custom vertex/fragment ShaderMaterial chosen over instanced meshes for 58k point scale"
  - "Zustand split into 3 stores (viz, upload, ui) to minimize re-render surface"
  - "React Query staleTime Infinity — scatter data is static per session"
  - "useClassify: 50k uploadedPoints cap (T-3-03 DoS guard)"
  - "UMAP/t-SNE projection selection deferred to backend (precomputed cache)"

patterns-established:
  - "GPU buffers: build Float32Array in buildBuffers(), pass to BufferGeometry via bufferAttribute"
  - "Genre colors: GENRE_COLORS[genre] with UPLOADED_BOOK_COLOR #FBBF24 amber for uploads"
  - "API base URL: import.meta.env.VITE_API_URL with /api fallback"

requirements-completed: [INFRA-04, VIZ-01, VIZ-11]

duration: ~15min
completed: 2026-04-12
---

# Plan 03-01: scaffold-and-pointcloud Summary

**React/Vite/R3F frontend scaffold with GPU-accelerated 58k-point ShaderMaterial PointCloud, Zustand stores, React Query data layer, and upload sidebar scaffolds**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2
- **Files modified:** 23 created

## Accomplishments
- Full Vite + React 18 + TypeScript frontend scaffolded with pinned deps
- `PointCloud.tsx`: custom `THREE.Points` ShaderMaterial renders 58k word points at interactive frame rates; per-vertex color drawn from 10-entry genre palette (VIZ-11)
- `ScatterCanvas.tsx`: R3F Canvas wrapper with OrbitControls, ambient+directional lighting, fog
- Zustand stores: `visualizationStore` (projection, selectedGenre, pointSize, opacity, tfidfThreshold, brightnessSensitivity, is2D), `uploadStore` (upload state + uploadedPoints), `uiStore` (sidebar + tooltip)
- `useScatterData`: React Query hook fetching `/viz/scatter/{projection}`, `staleTime: Infinity`
- `useClassify`: WebSocket classify hook with .txt/.5MB client-side guard, 3-retry reconnect, 50k point cap
- Upload sidebar scaffolds: `UploadZone`, `UploadProgress`, `ClassificationResult` — ready for Wave 2 refinement
- 12 vitest tests pass (UploadZone: 5, useClassify: 7)

## Task Commits

1. **Task 1: scaffold, stores, hooks, constants** — `e6c771c` (feat)
2. **Task 2: canvas components, upload scaffold, App entry** — `527f139` (feat)

## Files Created/Modified
- `frontend/src/components/canvas/PointCloud.tsx` — THREE.Points ShaderMaterial, Float32Array buffers
- `frontend/src/components/canvas/ScatterCanvas.tsx` — R3F Canvas + OrbitControls
- `frontend/src/stores/visualizationStore.ts` — Zustand viz state
- `frontend/src/hooks/useScatterData.ts` — React Query scatter data hook
- `frontend/src/hooks/useClassify.ts` — WebSocket classify hook
- `frontend/src/constants/genres.ts` — 10-entry genre palette (GENRE_COLORS, GENRE_LIST)
- `frontend/src/lib/buffers.ts` — buildBuffers / buildUploadedBuffers helpers

## Decisions Made
- THREE.Points + ShaderMaterial over InstancedMesh — simpler geometry, sufficient for points at this scale
- Zustand 3-store split to avoid cross-domain re-renders
- staleTime Infinity for scatter data — server cache serves pre-computed projections only

## Deviations from Plan
- Scaffold commit included useClassify/uploadStore/UploadZone (plan 03-03 domain) as the agent batched Task 1 content broadly. These components are ready and tested; plan 03-03 will confirm and extend them rather than recreate.

## Issues Encountered
- Agent ran without Bash permission; orchestrator committed remaining untracked files and ran tests directly. All 12 tests pass.

## Next Phase Readiness
- Wave 2 (03-02, 03-03) can build directly on these stores, hooks, and canvas components
- UploadZone/useClassify scaffolds are already present for 03-03 to extend
- Backend viz endpoints (03-04) are also complete — `useScatterData` will resolve against real data immediately

---
*Phase: 03-frontend-core-and-3d-visualization*
*Completed: 2026-04-12*
