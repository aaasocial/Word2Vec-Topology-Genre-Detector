---
phase: 05-deployment-and-public-access
plan: 01
subsystem: infra
tags: [docker, railway, fastapi, redis, spa-serving, containerization]

# Dependency graph
requires:
  - phase: 04-advanced-visualization-and-parameter-controls
    provides: Complete working frontend+backend application
provides:
  - Dockerfile with multi-stage build (node builder + python runtime)
  - docker-compose.yml for local one-command dev stack
  - entrypoint.sh running arq worker + uvicorn in single container
  - railway.toml for Railway deployment configuration
  - FastAPI /api prefix routing with SPA fallback
  - Redis connection fix using REDIS_URL environment variable
affects: [05-02-railway-deployment]

# Tech tracking
tech-stack:
  added: [docker, docker-compose, railway-toml]
  patterns: [api-prefix-routing, spa-fallback-catch-all, multi-stage-docker-build, entrypoint-dual-process]

key-files:
  created:
    - Dockerfile
    - docker-compose.yml
    - .dockerignore
    - entrypoint.sh
    - railway.toml
  modified:
    - backend/api/app.py
    - backend/worker/settings.py
    - frontend/src/lib/api.ts
    - frontend/vite.config.ts

key-decisions:
  - "Used APIRouter with /api prefix instead of sub-app mount to share app.state (redis/arq) with WebSocket routes"
  - "Disabled Swagger UI and ReDoc in production (docs_url=None, redoc_url=None) per T-5-02"
  - "Root-level /health endpoint for Railway health checks (separate from /api/health)"
  - "SPA fallback returns JSON 404 when frontend/dist not built instead of crashing"

patterns-established:
  - "API prefix routing: all API routes under /api via APIRouter prefix, SPA catch-all at root"
  - "Redis URL from environment: RedisSettings.from_dsn(os.environ.get('REDIS_URL', 'redis://localhost:6379'))"
  - "Dual-process entrypoint: arq worker backgrounded, uvicorn foreground with exec for signal propagation"
  - "Multi-stage Docker: node:20-slim builds frontend, python:3.12-slim runs everything"

requirements-completed: [INFRA-05, INFRA-06]

# Metrics
duration: 4min
completed: 2026-04-13
---

# Phase 5 Plan 1: Containerization Summary

**Docker containerization with multi-stage build, /api prefix routing, Redis connection fixes, SPA serving, and Railway config**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-13T13:07:46Z
- **Completed:** 2026-04-13T13:11:50Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Fixed Redis connection bugs in both app.py and worker settings (was ignoring REDIS_URL env var)
- Restructured FastAPI routing with /api prefix and SPA catch-all with path traversal protection
- Created complete Docker infrastructure: Dockerfile, docker-compose.yml, .dockerignore, entrypoint.sh
- Created railway.toml for Railway deployment with health check and restart policy

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Redis connections, restructure FastAPI routing, add SPA fallback** - `96ea14e` (feat)
2. **Task 2: Create Dockerfile, docker-compose.yml, .dockerignore, entrypoint.sh** - `6cce833` (feat)
3. **Task 3: Create railway.toml for Railway deployment** - `70cd2bf` (feat)

## Files Created/Modified
- `Dockerfile` - Multi-stage build: node:20-slim frontend builder, python:3.12-slim runtime with RELEASE_URL model download
- `docker-compose.yml` - Local dev stack: app + redis services
- `.dockerignore` - Excludes .git, node_modules, .planning, tests, intermediate data from build context
- `entrypoint.sh` - Starts arq worker in background, uvicorn in foreground with exec
- `railway.toml` - Railway deploy config: DOCKERFILE builder, /health check, ON_FAILURE restart
- `backend/api/app.py` - Restructured: /api prefix via APIRouter, root /health, SPA catch-all, RedisSettings.from_dsn fix, disabled Swagger UI
- `backend/worker/settings.py` - Fixed: redis_settings uses RedisSettings.from_dsn(REDIS_URL) instead of hardcoded localhost
- `frontend/src/lib/api.ts` - Updated WS_BASE default from '' to '/api' for production WebSocket routing
- `frontend/vite.config.ts` - Simplified proxy: removed rewrite rules and /ws entry (backend handles /api prefix natively)

## Decisions Made
- **APIRouter over sub-app mount:** Used `APIRouter(prefix='/api')` instead of `FastAPI()` sub-app mount. Sub-apps have separate `app.state`, which breaks WebSocket routes that need access to Redis/arq pool. APIRouter shares state with the parent app.
- **Disabled Swagger UI in production:** Set `docs_url=None, redoc_url=None` on the main app per threat model T-5-02.
- **JSON 404 for missing frontend:** SPA fallback returns a JSON error instead of crashing when `frontend/dist/` doesn't exist, improving developer experience.
- **No Docker build test in CI:** Docker build requires ~400MB of model+cache files. Verification was structural (file existence, TOML parsing, route inspection) rather than full `docker build`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing return statement in create_app()**
- **Found during:** Task 1 (FastAPI restructure)
- **Issue:** After restructuring create_app() to use APIRouter, the `return app` statement was missing at the end of the function, causing `app = create_app()` to be `None`
- **Fix:** Added `return app` before the module-level `app = create_app()` call
- **Files modified:** backend/api/app.py
- **Verification:** `from backend.api.app import app; assert app is not None` passes
- **Committed in:** 96ea14e (Task 1 commit)

**2. [Rule 1 - Bug] Used APIRouter instead of sub-app to fix WebSocket state sharing**
- **Found during:** Task 1 (FastAPI restructure)
- **Issue:** Plan specified using `FastAPI()` sub-app mounted at `/api`, but sub-apps have isolated `app.state`. WebSocket routes in classify.py access `websocket.app.state.redis` and `websocket.app.state.arq_pool` -- these would be None on a sub-app since the lifespan sets state on the parent app only. HTTP middleware can propagate state for HTTP requests, but WebSocket connections bypass middleware.
- **Fix:** Used `APIRouter(prefix='/api')` instead of a separate `FastAPI()` sub-app. APIRouter routes are registered directly on the main app, sharing `app.state` transparently.
- **Files modified:** backend/api/app.py
- **Verification:** Route inspection shows `/api/ws/classify/{job_id}` as `APIWebSocketRoute` on the main app, with access to `app.state`
- **Committed in:** 96ea14e (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes were necessary for correctness. The sub-app vs APIRouter change preserves the same external behavior (/api prefix) while fixing the WebSocket state sharing issue. No scope creep.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required

Before deploying to Railway, the user must:
1. **Create a GitHub Release** containing `genre-topology-data.tar.gz` with `data/models/` and `data/cache/` directories
2. **Set RELEASE_URL** in Railway dashboard build args to the tarball download URL
3. **Add Railway Redis addon** to the Railway project (injects REDIS_URL automatically)

For local Docker testing, no setup needed beyond having `data/models/` and `data/cache/` populated locally (from the pipeline or `git lfs pull`).

## Next Phase Readiness
- All Docker infrastructure files are in place for Railway deployment (Plan 02)
- railway.toml configures the build and deploy settings
- RELEASE_URL build arg is the mechanism for model/cache delivery to Railway
- The user must create the GitHub Release tarball before Railway deployment can succeed

## Self-Check: PASSED

All 9 created/modified files verified on disk. All 3 task commits verified in git log.

---
*Phase: 05-deployment-and-public-access*
*Completed: 2026-04-13*
