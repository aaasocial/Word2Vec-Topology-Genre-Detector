---
phase: 05
slug: deployment-and-public-access
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.0+ (backend smoke tests), manual curl (Docker/Railway) |
| **Config file** | `pytest.ini` (existing) |
| **Quick run command** | `docker build -t genre-topology .` |
| **Full suite command** | `docker compose up -d && curl http://localhost:8000/health && docker compose down` |
| **Estimated runtime** | ~5–10 min (Docker build with model download) |

---

## Sampling Rate

- **After every task commit:** Run `docker build -t genre-topology .` (verify build succeeds)
- **After every plan wave:** Run `docker compose up -d && curl http://localhost:8000/health && docker compose down`
- **Before `/gsd-verify-work`:** Full suite must be green + public Railway URL responds
- **Max feedback latency:** ~600 seconds (Docker build)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | INFRA-05 | — | No secrets in image layers (.env excluded) | smoke | `docker build -t genre-topology . && echo BUILD_OK` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | INFRA-05 | — | Both services start cleanly | smoke | `docker compose up -d && curl http://localhost:8000/health && docker compose down` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | INFRA-05 | — | API routes respond under /api prefix | smoke | `docker compose up -d && curl http://localhost:8000/api/viz/genres && docker compose down` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | INFRA-06 | — | Public URL serves health check | manual | `curl https://<railway-url>/health` | N/A | ⬜ pending |
| 05-02-02 | 02 | 2 | INFRA-06 | — | Public URL serves React frontend | manual | `curl https://<railway-url>/ \| grep -q 'root'` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `Dockerfile` — multi-stage build (created in Plan 05-01)
- [ ] `docker-compose.yml` — local dev stack (created in Plan 05-01)
- [ ] `.dockerignore` — excludes .env, data/, texts/, node_modules/ (created in Plan 05-01)
- [ ] `entrypoint.sh` — starts arq worker + uvicorn (created in Plan 05-01)
- [ ] `railway.toml` — Railway config (created in Plan 05-01)

*All infrastructure files are new for this phase.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Public URL accessible without login | INFRA-06 | Requires Railway deploy to be live | Open `<railway-url>` in browser — app loads without credentials |
| Classification end-to-end on Railway | INFRA-06 | Requires live Railway + arq worker | Upload a .txt file and confirm genre prediction returns |
| GitHub Release tarball downloads correctly | INFRA-05 | Requires RELEASE_URL to be set at build time | `docker build --build-arg RELEASE_URL=<url> -t genre-topology . && docker run --rm -e REDIS_URL=redis://localhost:6379 genre-topology curl http://localhost:8000/health` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 600s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
