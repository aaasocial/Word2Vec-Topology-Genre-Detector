---
phase: 9
slug: classification-depth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-27
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. To be filled by gsd-planner per RESEARCH.md `## Validation Architecture`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | _TBD by planner — pytest 7.x (backend) + vitest (frontend), per existing project conventions_ |
| **Config file** | _TBD — backend/tests/conftest.py + frontend vite.config.ts_ |
| **Quick run command** | _TBD_ |
| **Full suite command** | _TBD_ |
| **Estimated runtime** | _TBD_ |

---

## Sampling Rate

- **After every task commit:** Run `{quick run command}`
- **After every plan wave:** Run `{full suite command}`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** _TBD_

---

## Per-Task Verification Map

_To be filled by gsd-planner based on the wave structure._

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

_To be filled by gsd-planner based on RESEARCH.md `## Validation Architecture`._

---

## Manual-Only Verifications

_To be filled by gsd-planner — likely includes "verify reliability diagram matches Brier comparison" (visual inspection) and "user can click Why? and see all five sub-components render correctly" (manual UAT)._

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
