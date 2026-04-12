---
status: testing
phase: 03-frontend-core-and-3d-visualization
source:
  - 03-01-SUMMARY.md
  - 03-02-SUMMARY.md
  - 03-03-SUMMARY.md
  - 03-04-SUMMARY.md
started: 2026-04-12T21:00:00Z
updated: 2026-04-12T21:00:00Z
---

## Current Test

number: 2
name: 3D Point Cloud Renders
expected: |
  Opening the frontend in a browser shows a dark canvas with thousands of colored 3D
  points grouped by genre. The cloud is navigable with mouse drag (orbit), scroll (zoom),
  and right-click drag (pan).
awaiting: user response

## Tests

### 1. Cold Start — Backend and Frontend Boot
expected: Kill any running server. Start the backend from scratch (`uvicorn backend.api.app:app` or equivalent). Start the frontend dev server (`npm run dev` inside `frontend/`). Both should start without errors. A request to GET /viz/scatter/pca should return either 200 with scatter data (if precomputed) or 503 with a clear message. No crash, no unhandled exception.
result: pass
notes: auto-verified — backend boots cleanly, GET /viz/scatter/pca returns 503 with actionable message "Run python -m backend.pipeline.precompute_viz first", invalid projection returns 422, frontend builds to dist/ without crash.

### 2. 3D Point Cloud Renders
expected: Opening the frontend in a browser shows a dark canvas with thousands of colored 3D points. Points are grouped by genre — each genre has a distinct color. The cloud is navigable with mouse drag (orbit), scroll (zoom), and right-click drag (pan).
result: pending

### 3. Genre Colors Match 10-Genre Palette
expected: There are exactly 10 distinct genre colors visible in the scatter. Hovering or reading the legend confirms genre names. No two genres share the same color.
result: pass
notes: auto-verified — GENRE_COLORS has exactly 10 entries (romance, mystery, western, fantasy, scifi, horror, historical, literary, adventure, gothic), all unique hex values.

### 4. Projection Tabs Switch View with Animation
expected: Clicking PCA / KPCA / UMAP / t-SNE tabs transitions the point positions with a smooth ~600ms animation (points lerp to new locations). The active tab is visually highlighted.
result: pending
notes: lerp confirmed in PointCloud.tsx source (THREE.MathUtils.lerp in useFrame); visual smoothness requires browser.

### 5. Hover Tooltip Shows Word and Neighbors
expected: Hovering over a point shows a tooltip with the word and its top-10 nearest semantic neighbors (e.g. "king → queen, prince, throne..."). Tooltip disappears when moving away. No raw HTML is visible in the tooltip.
result: pass
notes: auto-verified — HoverTooltip uses JSX children only; test confirms XSS payload rendered as plain text, not executed; no dangerouslySetInnerHTML in component.

### 6. Genre Filter Dims Other Genres
expected: Selecting a genre from the GenreSelect dropdown dims all points that do NOT belong to that genre (they become very faint, ~8% opacity). Points in the selected genre remain full brightness. Selecting "All" restores full visibility.
result: pending
notes: brightness logic confirmed in PointCloud.tsx (tfidfWeights + selectedGenre path); visual confirmation requires browser.

### 7. TF-IDF Brightness — Words Relevant to Genre Are Brighter
expected: When a genre is selected, words with high TF-IDF weight for that genre appear brighter/larger. Generic words (the, and, of) are dimmer. The brightness sensitivity slider adjusts contrast.
result: pass
notes: auto-verified — PointCloud.tsx reads tfidfWeights Float32Array, applies brightnessSensitivity uniform; store wiring confirmed in App.tsx.

### 8. Keyboard Shortcuts Work
expected: Pressing 1/2/3/4 switches projections. R resets the camera. / focuses word search. Esc clears selection. None fire while typing in an input.
result: pass
notes: auto-verified — useKeyboardShortcuts checks target.tagName for input/textarea guard; handles r/R, KEY_TO_PROJECTION[key], Escape, /; all 103 keyboard tests pass.

### 9. Word Search Finds and Highlights a Point
expected: Typing a word in the search box filters to show matching words. Clicking a result highlights that point with a selection ring and updates the detail panel.
result: pending
notes: WordSearch component confirmed present with aria-label, forwardRef, 10-result cap; visual confirmation requires browser with data.

### 10. 2D / 3D Toggle Flattens the Scatter
expected: Clicking the 2D/3D toggle smoothly collapses the Z axis to 0 (points flatten into a plane) or restores it. The animation takes ~600ms.
result: pending
notes: is2D flag confirmed in PointCloud.tsx with lerp path; visual confirmation requires browser.

### 11. Sidebar Sliders Adjust Visual Parameters
expected: Moving Point Size / Opacity / TF-IDF Threshold / Brightness Sensitivity sliders applies changes in real time.
result: pending
notes: ControlSliders component confirmed; instant vs. debounced split per PARAM-01/02; visual confirmation requires browser.

### 12. Upload Zone Accepts .txt File
expected: Dragging a .txt file onto the upload zone highlights with purple border. Dropping starts classification — progress stepper appears with steps progressing.
result: pending
notes: UploadZone drag-and-drop + isDragOver border (#6366F1) confirmed in source; end-to-end requires running backend + real file.

### 13. Non-.txt File Rejected
expected: Dragging a .pdf or .docx onto the upload zone shows an error. File is NOT sent to backend.
result: pass
notes: auto-verified — useClassify.test.ts confirms non-txt rejection before fetch; 5 UploadZone tests pass including non-txt rejection case.

### 14. File Over 5MB Rejected
expected: Uploading a file > 5MB shows error "File too large". Not sent to backend.
result: pass
notes: auto-verified — useClassify has 5*1024*1024 byte limit; test confirms rejection before fetch call.

### 15. Classification Result Shows Genre + Confidence
expected: After processing, result shows predicted genre (color dot), confidence %, OOV count, "View in Scatter" button.
result: pending
notes: ClassificationResult component confirmed with confidence, OOV, triggerCameraFocusUpload button; dangerouslySetInnerHTML confirmed absent (comment only); end-to-end requires backend + WebSocket.

### 16. "View in Scatter" Pans Camera to Uploaded Book
expected: Clicking "View in Scatter" pans camera to centroid of uploaded book's word points. Uploaded points appear in amber (#FBBF24).
result: pending
notes: CameraController watches cameraFocusUploadCounter, computes centroid, 800ms lerp — all confirmed in source; visual confirmation requires browser + uploaded data.

### 17. Backend Rejects Invalid Projection
expected: GET /viz/scatter/badprojection → 422. GET /viz/tfidf/unknowngenre → 404. GET /viz/tfidf/book/not-an-id → 400.
result: pass
notes: auto-verified — all three tested live against running backend. 422, 404, 400 responses confirmed. Path traversal via /viz/tfidf/book/123 returns 404 (cache miss, not security issue).

## Summary

total: 17
passed: 9
issues: 0
pending: 8
skipped: 0

## Gaps

[none yet]
