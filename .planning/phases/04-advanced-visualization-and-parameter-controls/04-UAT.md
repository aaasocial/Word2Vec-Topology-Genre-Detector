---
status: complete
phase: 04-advanced-visualization-and-parameter-controls
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md]
started: "2026-04-13T00:00:00Z"
updated: "2026-04-13T00:00:00Z"
---

## Current Test

[testing complete]

## Tests

### 1. Tab Navigation
expected: Three tabs visible at the top — Scatter, Topology, Compare. Clicking each switches the main content. Active tab has an indigo bottom border. Settings gear and "How It Works" button visible in the nav bar.
result: pass

### 2. Disclaimer Banner
expected: A slim banner appears below the tab bar on the Scatter and Topology tabs explaining the projection disclaimer. It is hidden (not shown) when on the Compare tab.
result: pass

### 3. Persistence Heatmap
expected: Clicking the Topology tab with a genre selected shows a plasma-coloured heatmap (dark purple → yellow). H0, H1, H2 tab switcher above it. Switching H0/H1 changes the heatmap. H2 is greyed out with a "Enable H2 in Settings" tooltip.
result: issue
reported: "the heatmap is there. hovering over H2 does not show a tooltip though. additionally, the actual H2 data doesn't seem to be computed"
severity: minor

### 4. VR Filtration Viewer
expected: Right side of the Topology tab shows a dark 3D canvas with word position dots. Below it is an epsilon slider (0 → 10). Dragging the slider adds/removes edges in the 3D view. The live edge count updates as you drag.
result: pass

### 5. VR Edge Birth Highlighting
expected: As you move the epsilon slider, edges that just appeared at the current epsilon value flash yellow briefly then fade to a subdued grey-blue colour.
result: pass

### 6. Persistence Diagram
expected: Below the persistence heatmap in the Topology tab is a birth/death scatter plot. X-axis = birth, Y-axis = death, both from 0 to epsilon_max (~10). A dashed diagonal line y=x is visible. Points are yellow dots. Title or axis labels identify it.
result: issue
reported: "yep, but i would want the persistence image to be better scaled so i can see the dots better"
severity: cosmetic

### 7. VR All Projections
expected: There is a way to switch the VR viewer projection (PCA / KPCA / UMAP / t-SNE). Changing the projection updates the 3D word positions and the VR edge layout.
result: pass

### 8. Compare Mode
expected: On the Compare tab, there is a toggle to activate compare mode. When active, a second genre picker appears. In the scatter view, the two selected genres render at full brightness while all other genres dim to near-invisible (~4% opacity).
result: pass

### 9. Compare Heatmaps
expected: When compare mode is active with two genres selected, two persistence heatmaps appear stacked. Both use the same colour scale (computed from both datasets combined). Each is labelled with its genre name.
result: pass

### 10. Settings Drawer
expected: Clicking the gear icon slides in a settings drawer from the right. It contains parameter sliders (grid_resolution, sigma, k_clusters, alpha, svm_gamma, svm_C, epsilon_max, epsilon_step). Pressing Esc or clicking outside closes it.
result: pass

### 11. Dirty Param Badge + Recompute
expected: Changing a slider in the settings drawer shows an amber "Parameters changed — Recompute Results" badge. The Recompute button becomes active. Clicking it triggers a recomputation (spinner/overlay appears).
result: pass

### 12. Very Slow Tier Confirmation
expected: Changing window or vector_size parameters in settings shows a red warning banner and a confirmation dialog ("Retrain Word2Vec Model?"). Cancelling reverts the slider. Confirming would start retraining.
result: pass

### 13. Pipeline Explanation Dialog
expected: Clicking "How It Works" opens a fullscreen dialog. There are 6 steps navigable with Previous/Next buttons, dot indicators, and Left/Right arrow keys. Step 4 has an interactive SVG VR animation. Pressing Esc or the final "Close" button closes the dialog.
result: pass

### 14. Export PNG
expected: There is a Download/Export button for the scatter plot (in the sidebar) and for the persistence heatmap (in the Topology tab). Clicking either downloads a PNG file named with the lgt- prefix.
result: pass

### 15. Export CSV
expected: There is a CSV export button for persistence data in the Topology tab. Clicking it downloads a .csv file with columns: birth, death, dimension, persistence.
result: pass

## Summary

total: 15
passed: 13
issues: 2
skipped: 0
pending: 0

## Gaps

- truth: "H2 tab shows a tooltip on hover ('Enable H2 in Settings') and H2 data is available after enabling"
  status: failed
  reason: "User reported: tooltip does not appear on hover; H2 data not computed"
  severity: minor
  test: 3
  artifacts: []
  missing: []

- truth: "Persistence diagram dots are clearly visible and well-sized relative to the canvas"
  status: failed
  reason: "User reported: dots need better scaling to be visible"
  severity: cosmetic
  test: 6
  artifacts: []
  missing: []
