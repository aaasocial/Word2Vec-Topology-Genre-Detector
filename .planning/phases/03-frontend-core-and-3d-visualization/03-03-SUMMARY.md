---
phase: 03-frontend-core-and-3d-visualization
plan: 03
subsystem: ui
tags: [react, zustand, websocket, upload, classification, three.js, react-three-fiber, vitest, typescript]

requires:
  - 03-01 (scaffold, stores, PointCloud, useClassify, uploadStore, UploadZone scaffolds)
  - 03-02 (Sidebar, CameraController, visualizationStore with cameraFocusUploadCounter)

provides:
  - Complete upload → classify → scatter visualization flow
  - CameraController pan-to-centroid on "View in Scatter" (cameraFocusUploadCounter)
  - All upload flow components fully wired: UploadZone, UploadProgress, ClassificationResult
  - useClassify: POST /classify + WebSocket with 3-retry reconnect and 50k point cap
  - 60 tests passing (all existing tests preserved, camera pan not unit-tested — R3F useFrame)

affects:
  - 03-04 (backend viz endpoints consumed by upload flow)

tech-stack:
  added: []
  patterns:
    - CameraController reads uploadedPoints from uploadStore via getState() inside useEffect (not selector — avoids subscription overhead in non-frame context)
    - Separate lerpTargetPosition/lerpTargetLookAt refs allow reset and focus-upload to share one animation loop
    - 800ms cubic ease-out tween for camera pan (consistent with 600ms lerp used for projection change)

key-files:
  created: []
  modified:
    - frontend/src/components/canvas/CameraController.tsx (cameraFocusUpload centroid pan)

key-decisions:
  - "All plan components (useClassify, uploadStore, UploadZone, UploadProgress, ClassificationResult, buffers.ts, App.tsx, Sidebar.tsx) were already fully implemented by plan 03-01 (agent batched upload flow domain broadly). Plan 03-03 verified and confirmed correctness."
  - "CameraController reads uploadedPoints via useUploadStore.getState() inside useEffect (not selector) to avoid re-render on every uploadedPoints change; only triggers on cameraFocusUploadCounter increment"
  - "lerpTargetPosition/lerpTargetLookAt refs unified reset and focus-upload animations into single useFrame path"

metrics:
  duration: ~8min
  tasks: 2
  files_created: 0
  files_modified: 1
  tests_added: 0
  tests_total: 60
  completed: 2026-04-12
---

# Phase 03 Plan 03: upload-and-classify-flow Summary

**Upload → classify pipeline + scatter visualization confirmed complete; CameraController extended with 800ms cubic pan-to-centroid on "View in Scatter".**

## Performance

- **Duration:** ~8 min
- **Tasks:** 2 (verified + extended)
- **Files created:** 0 new (all plan artifacts already existed from 03-01)
- **Files modified:** 1 (`CameraController.tsx`)
- **Tests:** 60 passing (no new tests — upload flow tests added by 03-01)

## Accomplishments

**Task 1 — useClassify hook and upload store (verification):**
- `useClassify.ts`: POST /classify → FormData, WebSocket with 3-retry at 2s intervals, 50k uploadedPoints cap (T-3-03), correct step progression on `progress` messages
- `uploadStore.ts`: full state — jobId, steps (6 labels), result, uploadedPoints, retryMessage; `reset()` clears all fields
- All 7 useClassify tests pass: non-txt rejection, 5MB rejection, jobId set, steps update, 50k cap, retry, Unable-to-connect after 3 retries

**Task 2 — UI components + App wiring + CameraController:**
- `UploadZone.tsx`: drag-and-drop + click-to-browse, `isDragOver` state → `#6366F1` border, 3-second error flash, hidden input with `accept=".txt"` (T-3-04 UX guard)
- `UploadProgress.tsx`: 6-step vertical stepper, pulse-dot for active step, CheckCircle/XCircle icons, `role="progressbar"`, `width` transition 300ms, retry spinner
- `ClassificationResult.tsx`: genre color dot, confidence %, OOV count, "View in Scatter" button → `triggerCameraFocusUpload()` (T-3-01: JSX text nodes only, no `dangerouslySetInnerHTML`)
- `buffers.ts`: `buildUploadedBuffers` with amber `#FBBF24`, size 3.0 + tfidf*10, opacity 0.3 floor
- `App.tsx`: mergedBuffers = corpus + uploaded (amber), `allPoints` array, uploadedBuffers memoized
- `Sidebar.tsx`: upload section at bottom; showProgress → UploadProgress; showResult → UploadZone + ClassificationResult
- `CameraController.tsx` **(NEW in this plan):** watches `cameraFocusUploadCounter` via `useEffect`; reads `uploadedPoints` via `useUploadStore.getState()`; computes centroid; offsets camera position maintaining current view distance; triggers 800ms cubic ease-out lerp via shared `useFrame` path

## Task Commits

1. **Task 1+2: wire cameraFocusUpload centroid pan in CameraController** — `3dd7e37` (feat)

(All other plan artifacts were already committed by 03-01: `e6c771c`, `527f139`)

## Verification Results

| Check | Result |
|-------|--------|
| `npx vitest run` 60 tests | PASS |
| `npx vite build` exits 0 | PASS |
| `UploadZone.tsx` has `accept=".txt"` | PASS |
| `useClassify.ts` has `MAX_UPLOADED_POINTS = 50_000` | PASS |
| `ClassificationResult.tsx` has no `dangerouslySetInnerHTML` usage | PASS |
| `uploadStore.ts` reset() clears all 5 fields | PASS |
| Sidebar: upload section at bottom after WordSearch/DetailPanel | PASS |

## Deviations from Plan

### Pre-existing Implementation (from 03-01)

**[03-01 Deviation] Upload flow domain batched into 03-01**
- The 03-01 agent implemented all upload flow artifacts (useClassify, uploadStore, UploadZone, UploadProgress, ClassificationResult, buildUploadedBuffers, App.tsx wiring, Sidebar.tsx) as a broad batch in its Task 2.
- This plan (03-03) confirmed correctness, ran all tests, and extended only the missing piece: `CameraController.tsx` camera pan logic.
- No rework was needed; all test assertions from the plan matched the existing implementation.

### Auto-added Missing Functionality

**[Rule 2 - Missing Critical Functionality] CameraController centroid pan not wired**
- **Found during:** Task 2 review
- **Issue:** `cameraFocusUploadCounter` existed in `visualizationStore` and `ClassificationResult` triggered it, but `CameraController.tsx` had no listener — "View in Scatter" would silently no-op
- **Fix:** Added `useEffect` watching `focusUploadCounter`; reads `uploadedPoints` via `getState()`, computes centroid, sets `lerpTargetPosition` and `lerpTargetLookAt`, triggers 800ms animation
- **Files modified:** `frontend/src/components/canvas/CameraController.tsx`
- **Commit:** `3dd7e37`

## Threat Mitigations Applied

| Threat ID | Status | Implementation |
|-----------|--------|----------------|
| T-3-04 | Mitigated | `UploadZone.tsx`: client-side `.txt` extension + MIME type check before calling `onClassify`; error flashed for 3s |
| T-3-01 | Mitigated | `ClassificationResult.tsx`: all text rendered as JSX text nodes; explicit "never use dangerouslySetInnerHTML" comment present |
| T-3-03 | Mitigated | `useClassify.ts`: `scatter_points.slice(0, 50_000)` before `setUploadedPoints`; 50k cap enforced in test |

## Known Stubs

- `BookSlider` receives `books={[]}` from `Sidebar.tsx` (inherited from 03-02) — no corpus book metadata API exists yet. Not introduced by this plan.

## Self-Check: PASSED

- `frontend/src/components/canvas/CameraController.tsx` — FOUND
- Commit `3dd7e37` — FOUND in git log
- `npx vitest run`: 60/60 pass
- `npx vite build`: exits 0 (8.24s, 2256 modules)
- `MAX_UPLOADED_POINTS = 50_000` in useClassify.ts — FOUND
- `accept=".txt"` in UploadZone.tsx — FOUND
- No `dangerouslySetInnerHTML` usage in ClassificationResult.tsx — CONFIRMED (only in comment)
- `cameraFocusUploadCounter` listener in CameraController.tsx — FOUND

*Phase: 03-frontend-core-and-3d-visualization*
*Completed: 2026-04-12*
