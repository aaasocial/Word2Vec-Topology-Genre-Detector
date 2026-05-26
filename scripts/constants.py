"""Phase-9 single source of truth for cross-script constants.

The 20 pinned gutenberg_ids per VALIDATION_PROTOCOL.md §3 are imported by:
  - scripts/calibrate.py (Phase 9 D-37 calibration spike)
  - scripts/06_validate.py (Phase 8 hold-out evaluation)

DO NOT duplicate the list inline anywhere. If you need to reference these ids,
import from this module.
"""
from __future__ import annotations

# Canonical 20-book hold-out per VALIDATION_PROTOCOL.md §3.
# Pinned in Phase 8 from v1_baseline_results.json; frozen for v2 evaluation continuity.
# If this list ever changes, update VALIDATION_PROTOCOL.md §3 + this constant together.
HOLDOUT_GUTENBERG_IDS: list[int] = [
    78, 83, 84, 103, 105, 120, 121, 144, 169, 175,
    244, 284, 863, 1184, 1257, 1528, 2565, 3285, 50133, 70652,
]
