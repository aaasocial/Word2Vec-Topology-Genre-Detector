---
status: partial
phase: 09-classification-depth
source:
  - 09-VERIFICATION.md
  - 09-VALIDATION.md
started: 2026-05-27T03:50:00Z
updated: 2026-05-27T03:50:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. UAT-01 — Top-N expander interaction
expected: 3 horizontal bars visible by default sorted descending; "+5 more" reveals all 8; percent labels show XX.X%; nothing permanently hidden
result: [pending]

### 2. UAT-02 — 410 expired path
expected: After 5+ min OR manual Redis eviction, Why-button renders the canonical "Upload expired — re-upload to see the explanation." prompt pointing at the existing UploadZone; no silent retry
result: [pending]

### 3. UAT-03 — Happy-path explain panel
expected: NearestBooksList renders 5 rows with title/author/genre/Euclidean-distance; TrackContributionBars shows topology + vocabulary bars with direction glyphs and pcts summing to 100; DrivingWordsPills shows TF-IDF-ranked pills with D-46 "proxies, not literal classifier inputs" disclosure; uncertainty + D-51 footnote visible
result: [pending]

### 4. UAT-04 — 503 uncalibrated path
expected: With a pre-Phase-9 SVM lineage missing calibration_method, /explain returns 503 routed to onUncalibrated; panel renders calibration-required message; /classify still serves single-genre top-1 (graceful degradation per Q8)
result: [pending]

### 5. UAT-05 — Walkthrough Step 7 navigation
expected: Step indicator shows "Step 7 / 7"; copy contains "upper bound" verbatim; no retraction terms ("wrong"/"broken"/"invalid"); validation report link opens on GitHub in new tab
result: [pending]

### 6. UAT-06 — Reliability diagram visual sanity
expected: results/figures/v2_calibration_reliability.png has 8 subplots; both methods plotted per subplot with 5-bin binning; libsvm_platt curves closer to diagonal at high probability; numbers match the Brier table in results/v2_calibration_report.md
result: [pending]

### 7. UAT-07 — Entropy badge fires appropriately on real uploads
expected: Clearly-classifiable upload (e.g., Pride and Prejudice → Romance) does NOT render the badge; borderline upload fires the badge with D-52 canonical tooltip text
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
