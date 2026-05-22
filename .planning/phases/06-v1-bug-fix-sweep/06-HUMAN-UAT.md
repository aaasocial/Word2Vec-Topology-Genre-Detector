---
status: partial
phase: 06-v1-bug-fix-sweep
source: [06-VERIFICATION.md]
started: 2026-05-22T21:05:00Z
updated: 2026-05-22T21:05:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. H₁-only tab visual confirmation
expected: Topology panel shows exactly one tab labeled "H1" (or "H₁") with no disabled H₂ or H₀ tabs visible. Persistence diagram + heatmap views all render under this single tab.
result: [pending]

### 2. BookSlider walk-through per genre
expected: User selects a genre from the sidebar, then slides through every book in that genre. Each slide renders title, author, and word_count. Slider count matches the number of books bundled for that genre (e.g. horror=10, fantasy=10, etc.). No empty/blank slides.
result: [pending]

### 3. Settings drawer — H₂ row absent
expected: Open Settings drawer. SlowTierParams section shows no "Enable H₂" checkbox / toggle. No leftover "H2 cap" or "H2 timeout" fields. Only H₁ parameters remain.
result: [pending]

### 4. Infinity-strip tooltip on persistence diagram
expected: Load a persistence diagram for a genre (or upload) that produces at least one H₁ loop unclosed within ε_max. Hover the triangle marker in the top infinity strip. Tooltip text reads exactly: "loop survives beyond ε_max — feature persists past the filtration window".
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
