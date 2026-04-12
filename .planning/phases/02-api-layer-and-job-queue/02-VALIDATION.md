---
phase: 2
slug: api-layer-and-job-queue
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x |
| **Config file** | `backend/pytest.ini` — Wave 0 installs |
| **Quick run command** | `pytest backend/tests/ -x -q` |
| **Full suite command** | `pytest backend/tests/ -v` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest backend/tests/ -x -q`
- **After every plan wave:** Run `pytest backend/tests/ -v`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 02-01-01 | 01 | 0 | INFRA-01 | unit | `pytest backend/tests/test_api.py -x -q` | ⬜ pending |
| 02-01-02 | 01 | 1 | CLASS-01, CLASS-05 | unit | `pytest backend/tests/test_upload.py -x -q` | ⬜ pending |
| 02-01-03 | 01 | 1 | CLASS-04, UX-01 | unit | `pytest backend/tests/test_websocket.py -x -q` | ⬜ pending |
| 02-01-04 | 01 | 1 | UX-02 | unit | `pytest backend/tests/test_errors.py -x -q` | ⬜ pending |
| 02-02-01 | 02 | 1 | INFRA-02 | unit | `pytest backend/tests/test_worker.py -x -q` | ⬜ pending |
| 02-02-02 | 02 | 1 | INFRA-03 | unit | `pytest backend/tests/test_cache.py -x -q` | ⬜ pending |
| 02-02-03 | 02 | 2 | INFRA-02 | integration | `pytest backend/tests/test_cancellation.py -x -q` | ⬜ pending |
| 02-03-01 | 03 | 2 | CORPUS-02 | unit | `pytest backend/tests/test_precompute.py -x -q` | ⬜ pending |
| 02-03-02 | 03 | 2 | CLASS-02 | integration | `pytest backend/tests/test_classify.py -x -q` | ⬜ pending |
| 02-03-03 | 03 | 3 | CLASS-02, UX-01 | e2e | manual — upload .txt, verify WebSocket steps + result | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/__init__.py` — test package init
- [ ] `backend/tests/conftest.py` — shared fixtures (FastAPI test client, mock Redis, mock arq)
- [ ] `backend/tests/test_api.py` — stubs for INFRA-01 endpoint existence
- [ ] `backend/tests/test_upload.py` — stubs for CLASS-01, CLASS-05 validation
- [ ] `backend/tests/test_websocket.py` — stubs for CLASS-04, UX-01 progress streaming
- [ ] `backend/tests/test_errors.py` — stubs for UX-02 error messages
- [ ] `backend/tests/test_worker.py` — stubs for INFRA-02 job queue
- [ ] `backend/tests/test_cache.py` — stubs for INFRA-03 content-addressed cache
- [ ] `backend/tests/test_cancellation.py` — stubs for abort-on-disconnect
- [ ] `backend/tests/test_precompute.py` — stubs for CORPUS-02 build-time pre-computation
- [ ] `backend/tests/test_classify.py` — stubs for CLASS-02 upload classification
- [ ] `pytest` + `httpx` + `pytest-asyncio` — installed in `backend/requirements-dev.txt`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Upload .txt → see 6-step WebSocket progress → receive genre prediction within 60s | CLASS-02, CLASS-04 | Requires real Redis + arq worker + full pipeline models | `curl` upload or browser; watch WS messages; verify result JSON |
| Cancel mid-computation by closing WebSocket | INFRA-02 | Requires observing worker process state | Upload large book, disconnect mid-homology, verify worker stops between steps |
| GET bundled book returns instantly (no job queue) | CORPUS-02 | Requires pre-computed build artifacts on disk | `curl GET /corpus/{book_id}` — verify response < 100ms |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
