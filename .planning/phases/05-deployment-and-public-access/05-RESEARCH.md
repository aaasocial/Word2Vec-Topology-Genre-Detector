# Phase 5: Deployment and Public Access - Research

**Researched:** 2026-04-13
**Domain:** Docker containerization, Railway PaaS deployment, FastAPI + Vite SPA serving
**Confidence:** HIGH

## Summary

This phase containerizes the existing FastAPI + React application and deploys it to Railway. The research uncovers one critical blocker: **Railway does not support git-lfs** -- model files tracked via git-lfs will appear as pointer stubs during Railway's build, not actual files. The 300MB model figure is also overstated; only ~71MB of models are needed at runtime (window=15 configuration). The solution is to download model files from GitHub LFS during the Docker build via `git lfs pull` installed in the builder stage, or host them as GitHub Release assets.

A second significant finding is that both `arq` Redis connection points (`app.py` line 14 and `worker/settings.py` line 67) use `RedisSettings()` with localhost defaults, ignoring the `REDIS_URL` environment variable. This must be fixed for Railway's managed Redis to work.

The frontend API routing requires attention: the React app sends requests to `/api/...` (via the `API_BASE` constant), but the FastAPI routes are mounted without an `/api` prefix. In dev mode, the Vite proxy strips `/api`. In production, FastAPI must either mount routes under `/api` or the frontend build must override `VITE_API_BASE=''`.

**Primary recommendation:** Use a multi-stage Dockerfile (Node builder -> Python runtime), download LFS model files during build via curl/git-lfs, run precompute as a build step, fix arq Redis connections to use `REDIS_URL`, and mount all API routes under `/api` prefix for production parity.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Hosting Platform:** Railway via git-push or Docker image push
- **Docker Architecture:** Single Dockerfile, multi-stage build (Node builder -> Python runtime)
- **Model Files:** Bake into Docker image at build time (no volume mounts)
- **Precomputed Caches:** Bake into Docker image (run precompute during build)
- **Redis:** Railway managed Redis addon via `REDIS_URL` env var
- **Access Control:** Fully public, no authentication
- **Frontend Serving:** FastAPI serves built React static files (single container, single port)
- **docker-compose for Local Dev:** Two services: app + redis
- **URL:** Railway-assigned URL (no custom domain)

### Claude's Discretion
- Exact Railway service name and project structure
- Health check endpoint implementation (`GET /health`)
- Environment variable names beyond `REDIS_URL` (PORT, PYTHONPATH, etc.)
- `.dockerignore` contents
- Railway `railway.toml` or `Procfile` configuration details

### Deferred Ideas (OUT OF SCOPE)
- Custom domain
- CI/CD pipeline
- Monitoring / uptime alerts
- CDN for static assets
- Auth / password protection
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-05 | Application is containerized (Docker) for reproducible deployment | Multi-stage Dockerfile pattern, docker-compose.yml for local dev, .dockerignore |
| INFRA-06 | Application is publicly accessible via URL with no login required | Railway deployment with railway.toml, health check, public networking |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Hosting constraint:** "Must be deployed and publicly accessible -- architecture decisions must account for stateless serving vs. compute-intensive background jobs" [VERIFIED: CLAUDE.md]
- **Computation constraint:** "Word2Vec training and persistent homology run server-side; the browser handles visualization only" [VERIFIED: CLAUDE.md]
- **WAT framework:** Workflows/Agents/Tools architecture -- `.tmp/` for temporary files, `tools/` for scripts [VERIFIED: parent CLAUDE.md]
- **GSD workflow enforcement:** All file changes through GSD commands [VERIFIED: CLAUDE.md]

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Docker | 25.0+ | Container runtime | Industry standard; already installed locally (v25.0.3) |
| Docker Compose | 2.24+ | Multi-container local dev | Already installed (v2.24.6); single `docker compose up` command |
| Railway | N/A (PaaS) | Hosting platform | User's locked decision; git-push deploy, managed Redis addon |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Railway CLI | latest | Deploy/manage from terminal | Optional; git-push also works via dashboard |
| python:3.12-slim | 3.12 | Docker base image | Matches local Python 3.12.0; slim variant reduces image size |
| node:20-slim | 20 | Frontend build stage | LTS; needed only in builder stage |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Railway | Render, Fly.io | User locked Railway; no alternatives needed |
| Single container | Separate frontend/backend containers | More complex; user decision is single container |
| Baked models | Volume-mounted models | User decision is bake into image; volume would persist across deploys but adds complexity |

**No installation needed** -- Docker and Docker Compose are already available on the local machine.

## Architecture Patterns

### Recommended Project Structure (new files)
```
project-root/
+-- Dockerfile              # Multi-stage: node-builder -> python-runtime
+-- docker-compose.yml      # Local dev: app + redis services
+-- .dockerignore           # Exclude .git, node_modules, venv, etc.
+-- railway.toml            # Railway deploy config (health check, start command)
```

### Pattern 1: Multi-Stage Dockerfile
**What:** Three-stage build: (1) Node stage builds frontend, (2) Python stage installs deps + downloads models + runs precompute, (3) Runtime stage copies only needed artifacts.
**When to use:** Always -- this is the locked decision.
**Example:**
```dockerfile
# Source: FastAPI Docker docs + Railway docs pattern
# Stage 1: Build frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build
# -> produces /app/frontend/dist/

# Stage 2: Python deps + models + precompute
FROM python:3.12-slim AS backend-builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    git git-lfs curl && rm -rf /var/lib/apt/lists/*
RUN git lfs install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Fetch actual LFS files (Railway clone only has pointers)
RUN git lfs pull || true
# Run precompute to generate data/cache/
RUN python -c "from backend.pipeline.precompute import precompute_all; precompute_all()"

# Stage 3: Runtime (lean)
FROM python:3.12-slim
WORKDIR /app
COPY --from=backend-builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=backend-builder /usr/local/bin/uvicorn /usr/local/bin/uvicorn
COPY --from=backend-builder /app/backend ./backend
COPY --from=backend-builder /app/config ./config
COPY --from=backend-builder /app/corpus ./corpus
COPY --from=backend-builder /app/scripts/utils.py ./scripts/utils.py
COPY --from=backend-builder /app/data/models ./data/models
COPY --from=backend-builder /app/data/cache ./data/cache
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
EXPOSE 8000
CMD ["uvicorn", "backend.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
```
[ASSUMED: exact COPY paths may need adjustment based on final dependency analysis]

### Pattern 2: Railway Configuration (railway.toml)
**What:** Config-as-code for Railway deploy settings.
**When to use:** Deploy to Railway.
**Example:**
```toml
# Source: https://docs.railway.com/reference/config-as-code
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 300
startCommand = "uvicorn backend.api.app:app --host 0.0.0.0 --port ${PORT:-8000}"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```
[CITED: docs.railway.com/reference/config-as-code]

### Pattern 3: FastAPI SPA Serving with API Prefix
**What:** Mount API routes under `/api` prefix; serve React build as static files with SPA fallback.
**When to use:** Production single-container serving.
**Example:**
```python
# Source: FastAPI discussions + official StaticFiles docs
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

app = FastAPI()

# Mount API routes under /api prefix
api_app = FastAPI()
api_app.include_router(health_router)
api_app.include_router(corpus_router)
# ... etc
app.mount("/api", api_app)

# Serve static files with SPA fallback (MUST be last)
FRONTEND_DIR = Path(__file__).parent.parent.parent / "frontend" / "dist"

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    file_path = FRONTEND_DIR / full_path
    if file_path.is_file():
        return FileResponse(file_path)
    return FileResponse(FRONTEND_DIR / "index.html")
```
[CITED: github.com/fastapi/fastapi/discussions/5134]

**IMPORTANT NOTE on API prefix approach:** An alternative (simpler) pattern is to set `VITE_API_BASE=''` during the production frontend build. This makes the frontend call `/corpus/books` directly instead of `/api/corpus/books`, matching the existing FastAPI route structure. This avoids restructuring the backend but creates a divergence between dev and production API paths. The API prefix approach is cleaner long-term.

### Pattern 4: arq Redis from REDIS_URL
**What:** Parse `REDIS_URL` environment variable into arq `RedisSettings`.
**When to use:** Both in `app.py` (arq pool) and `worker/settings.py`.
**Example:**
```python
# Source: arq docs + verified via local help(RedisSettings)
import os
from arq.connections import RedisSettings

redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379')
redis_settings = RedisSettings.from_dsn(redis_url)
```
[VERIFIED: `RedisSettings.from_dsn()` confirmed via local `help(RedisSettings)` inspection]

### Anti-Patterns to Avoid
- **Building frontend at runtime:** Always build frontend in Docker build stage, not at startup. Adds startup latency and Node.js to runtime image.
- **Using `StaticFiles(html=True)` alone for SPA:** This only serves `index.html` for directory paths, NOT for arbitrary client-side routes like `/dashboard`. Need explicit catch-all route. [CITED: fastapi.tiangolo.com/reference/staticfiles/]
- **Hardcoded Redis localhost:** Both `app.py` and `worker/settings.py` currently hardcode `RedisSettings()` which defaults to localhost. Must use `REDIS_URL`. [VERIFIED: codebase inspection]
- **Running precompute at runtime startup:** Adds 5-10 minutes to every container start. Precompute during Docker build instead (locked decision).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SPA routing fallback | Custom middleware for every route | Catch-all `/{path:path}` endpoint | Simple, proven pattern from FastAPI community |
| Health check | Complex liveness/readiness probes | Simple `GET /health` returning `{"status": "ok"}` | Railway only needs a single HTTP health check path |
| Redis URL parsing | Manual URL string splitting | `RedisSettings.from_dsn(url)` for arq; `aioredis.from_url(url)` for redis-py | Both libraries have built-in URL parsing |
| Docker layer caching | Manual cache management | Docker BuildKit layer caching with proper COPY ordering | Standard Docker optimization |
| Process management | supervisord / custom entrypoint | Railway's built-in process management + uvicorn workers | Railway handles restarts; uvicorn handles worker processes |

**Key insight:** The deployment phase creates configuration files (Dockerfile, docker-compose.yml, railway.toml) and makes small code changes (Redis URL, API prefix, SPA serving). It does NOT introduce new libraries or complex architecture.

## Common Pitfalls

### Pitfall 1: Railway Does Not Support Git LFS
**What goes wrong:** Railway clones the repo but does NOT run `git lfs pull`. Model files (tracked via git-lfs in `.gitattributes`) will be 130-byte pointer stubs instead of actual model files. App crashes on startup with "file is not a Word2Vec model" or similar.
**Why it happens:** Railway's build infrastructure does not have git-lfs support. This is a known, documented limitation. [CITED: station.railway.com/questions/is-there-anyway-to-pull-github-lfs-files-2a46e90d]
**How to avoid:** Install `git-lfs` in the Docker builder stage and run `git lfs pull` explicitly. Since Railway builds with Docker, the Dockerfile controls the build environment. Alternatively, host model files as GitHub Release assets and download via `curl` during build.
**Warning signs:** Model files are 130 bytes instead of 68MB+ in the container.

### Pitfall 2: Railway PORT Variable
**What goes wrong:** App binds to hardcoded port 8000 but Railway expects it to listen on `$PORT` (dynamically assigned).
**Why it happens:** Railway injects a `PORT` environment variable at runtime. If the app doesn't read it, Railway's health check and routing fail.
**How to avoid:** Use `--port ${PORT:-8000}` in the start command. Railway's health check hits the same port.
**Warning signs:** "Application failed to respond" error in Railway dashboard. [CITED: docs.railway.com/reference/errors/application-failed-to-respond]

### Pitfall 3: arq Worker Redis Connection
**What goes wrong:** The arq worker connects to localhost:6379 instead of Railway's Redis instance. Classification jobs silently fail.
**Why it happens:** `WorkerSettings.redis_settings = RedisSettings()` in `worker/settings.py` defaults to localhost. The `create_pool(RedisSettings())` in `app.py` has the same issue.
**How to avoid:** Change both to `RedisSettings.from_dsn(os.environ.get('REDIS_URL', 'redis://localhost:6379'))`.
**Warning signs:** Worker starts but never receives jobs; `redis.exceptions.ConnectionError` in logs. [VERIFIED: codebase inspection of backend/worker/settings.py line 67 and backend/api/app.py line 14]

### Pitfall 4: Frontend API Routing Mismatch
**What goes wrong:** Frontend sends requests to `/api/corpus/books` but FastAPI routes are at `/corpus/books`. All API calls return 404 or the SPA index.html.
**Why it happens:** In dev, the Vite proxy rewrites `/api/foo` to `http://localhost:8000/foo` (stripping the prefix). In production (same container), there is no proxy -- requests go directly to FastAPI.
**How to avoid:** Either (a) mount API routes under `/api` prefix in FastAPI, or (b) build frontend with `VITE_API_BASE=''`. Option (a) is cleaner.
**Warning signs:** All API calls return HTML (the SPA fallback) instead of JSON. [VERIFIED: frontend/src/lib/api.ts line 1 + frontend/vite.config.ts proxy config]

### Pitfall 5: WebSocket Routing in Production
**What goes wrong:** WebSocket connections to `/ws/classify/{job_id}` fail because the SPA catch-all route intercepts them.
**Why it happens:** FastAPI's `@app.get("/{full_path:path}")` catch-all must NOT match WebSocket upgrade requests.
**How to avoid:** WebSocket routes are registered as `@router.websocket(...)` which FastAPI handles separately from HTTP GET routes. Ensure WebSocket routes are registered BEFORE the SPA catch-all mount. Route ordering matters.
**Warning signs:** WebSocket connection returns 200 with HTML instead of 101 Upgrade. [ASSUMED: based on FastAPI routing precedence knowledge]

### Pitfall 6: Docker Build Timeout on Railway Hobby Plan
**What goes wrong:** Build exceeds 20-minute timeout (Hobby plan) because precompute step takes 5-10 minutes AND model download takes time.
**Why it happens:** Railway Hobby plan has a 20-minute build timeout. [CITED: station.railway.com build timeout discussions]
**How to avoid:** Optimize: (1) only copy needed model files (w15 variants = 71MB, not all 294MB), (2) ensure precompute is efficient, (3) use Docker layer caching so models aren't re-downloaded on code-only changes. If 20 min is tight, Railway Pro has 60-minute timeout.
**Warning signs:** "Build timed out" in Railway build logs.

### Pitfall 7: Precompute Fails During Docker Build (No Redis)
**What goes wrong:** The precompute step during Docker build tries to connect to Redis (for caching) and fails because there's no Redis in the build environment.
**Why it happens:** The cache store (`backend/cache/store.py`) uses disk-based caching (not Redis), so this is actually fine. However, if any precompute code path touches Redis (e.g., via app imports), it will fail.
**How to avoid:** Verify that `precompute_all()` only uses disk cache (it does -- confirmed from code inspection). The `backend/cache/store.py` writes to `data/cache/` on disk, not Redis.
**Warning signs:** `ConnectionRefusedError` during build. [VERIFIED: backend/cache/store.py uses Path-based disk IO only]

### Pitfall 8: data/features/ Directory Missing in Docker
**What goes wrong:** Precompute step reads from `data/features/` which contains per-book diagram/word/tfidf files from the Phase 1 pipeline. These are gitignored and won't be in the Docker build context.
**Why it happens:** `.gitignore` excludes `data/features/`. The precompute step depends on these intermediate pipeline outputs.
**How to avoid:** Either (1) un-gitignore `data/features/` and commit them, (2) run the full pipeline (scripts 01-06) during Docker build, or (3) run the full pipeline locally, copy `data/features/` into the build context via a separate mechanism. Option (2) adds significant build time. Option (1) adds ~1.7GB to the repo. Option (3) requires a custom build script.
**Warning signs:** `FileNotFoundError` for `data/features/diagrams_*.npy` during Docker build precompute step. [VERIFIED: .gitignore contains `data/features/`, and precompute.py reads from `features_dir / f'diagrams_{gid}_w{window}.npy'`]

**THIS IS THE MOST CRITICAL PITFALL.** The precompute step cannot run in Docker build without the `data/features/` files. Resolution options are analyzed in the Open Questions section.

## Code Examples

### 1. Fix arq Redis Settings (app.py)
```python
# Source: verified via help(RedisSettings) -- from_dsn() method exists
# In backend/api/app.py lifespan():
import os
from arq.connections import RedisSettings

redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379')
app.state.redis = aioredis.from_url(redis_url)
app.state.arq_pool = await create_pool(RedisSettings.from_dsn(redis_url))
```

### 2. Fix arq Worker Settings
```python
# In backend/worker/settings.py:
import os
from arq.connections import RedisSettings

def _get_redis_settings():
    url = os.environ.get('REDIS_URL', 'redis://localhost:6379')
    return RedisSettings.from_dsn(url)

class WorkerSettings:
    functions = [classify_book]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = _get_redis_settings()
    # ... rest unchanged
```

### 3. docker-compose.yml for Local Dev
```yaml
# Source: Docker Compose docs pattern
version: "3.8"
services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - REDIS_URL=redis://redis:6379
      - PORT=8000
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### 4. .dockerignore
```
# Source: Docker best practices
.git
.planning
.claude
.pytest_cache
__pycache__
*.pyc
node_modules
frontend/node_modules
frontend/dist
.env
venv
.venv
dump.rdb
results/
tests/
*.md
!requirements.txt
```

### 5. Health Check (Already Exists)
```python
# backend/api/routes/health.py -- already implemented
@router.get('/health', response_model=HealthResponse)
async def health():
    return HealthResponse(status='ok')
```
[VERIFIED: backend/api/routes/health.py already has GET /health endpoint]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `docker-compose` command | `docker compose` (plugin) | Docker Compose v2 (2022) | Use `docker compose` not `docker-compose` |
| Railway Nixpacks default | Railway Railpack default | 2025 | If no Dockerfile found, Railway uses Railpack; we override with Dockerfile |
| Railway IPv4 only | Railway dual-stack IPv6/IPv4 | Oct 2025 | Redis private networking may use IPv6; `REDIS_URL` handles this |
| `StaticFiles(html=True)` for SPA | Catch-all route pattern | Ongoing | `html=True` doesn't do full SPA fallback; need explicit catch-all |

**Deprecated/outdated:**
- Railway's Hobby plan formerly had a free trial (now $5/month with $5 credit) [CITED: docs.railway.com/reference/pricing/plans]
- `docker-compose` (v1 standalone) is deprecated in favor of `docker compose` (v2 plugin) [ASSUMED]

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Exact COPY paths in Dockerfile may need adjustment based on final dependency analysis | Architecture Pattern 1 | LOW -- paths are derived from codebase inspection, but some hidden deps may exist |
| A2 | WebSocket routes are handled separately from HTTP GET catch-all in FastAPI | Pitfall 5 | MEDIUM -- if wrong, WebSocket classification would break in production |
| A3 | `docker-compose` v1 standalone is deprecated | State of the Art | LOW -- informational only |
| A4 | The `data/features/` approach chosen (see Open Questions) will determine Docker build feasibility | Pitfall 8 | HIGH -- this is the critical unresolved question |

## Open Questions (RESOLVED)

### 1. data/features/ Files in Docker Build (CRITICAL)
**What we know:** The precompute step (`precompute_all()`) reads from `data/features/` which contains `.npy` and `.json` files generated by the Phase 1 pipeline scripts (01-06). These files are gitignored (`data/features/` in .gitignore). The directory is 1.7GB locally. Without these files, precompute cannot run.
**What's unclear:** How to make these files available during Docker build without bloating the repo.
**Options:**
1. **Un-gitignore and commit `data/features/`** -- Adds 1.7GB to repo (impractical for git-lfs; entire repo would balloon).
2. **Run full pipeline (scripts 01-06) during Docker build** -- Adds ~30-60 min to build time. Requires downloading raw texts from Project Gutenberg during build. Exceeds Railway's 20-min Hobby timeout and possibly 60-min Pro timeout.
3. **Run precompute locally, commit `data/cache/` instead** -- The `data/cache/` directory (336MB) contains the precomputed results. Un-gitignore it, commit it (via git-lfs), and skip the precompute step in Docker build entirely. BUT: Railway doesn't support git-lfs.
4. **Host `data/cache/` + `data/models/` as GitHub Release assets** -- Upload a tarball (~400MB) to GitHub Releases. Download during Docker build via `curl`. This is the Railway-recommended pattern for large files. [CITED: station.railway.com git-lfs discussions]
5. **Use Railway Volume** -- Mount a volume, upload files once via filebrowser template, persist across deploys. Railway-recommended for large persistent files. [CITED: docs.railway.com/volumes]
**Recommendation:** Option 4 (GitHub Release assets) is most reliable and keeps the build self-contained. Option 5 (Railway Volume) is simpler for ongoing use but requires manual initial upload. The planner should evaluate both and possibly use Option 4 for models + cache, avoiding the precompute step entirely during Docker build.

RESOLVED: GitHub Release tarball (Option 4) — models + cache bundled in `genre-topology-data.tar.gz`, downloaded via `RELEASE_URL` ARG during Docker build. Precompute step skipped entirely in Docker build; `data/cache/` is included pre-built in the tarball alongside models.

### 2. arq Worker Process in Production
**What we know:** The classification pipeline uses arq (Redis job queue) with a separate worker process. In development, you run `arq backend.worker.settings.WorkerSettings` as a separate process. In production (single Railway container), we need both uvicorn and the arq worker running.
**What's unclear:** How to run both processes in a single container on Railway.
**Options:**
1. **Subprocess spawned by FastAPI lifespan** -- Start the arq worker as a subprocess in the lifespan context manager.
2. **Shell entrypoint script** -- `CMD ["sh", "-c", "arq backend.worker.settings.WorkerSettings & uvicorn ..."]`
3. **Separate Railway service** -- Run the worker as a second Railway service sharing the same Redis.
**Recommendation:** Option 2 (shell entrypoint) is simplest. The `&` backgrounds the worker, and uvicorn is the foreground process. Railway's health check hits uvicorn. If the worker dies, the container restarts (Railway restart policy).

RESOLVED: Shell entrypoint script (Option 2) — `entrypoint.sh` backgrounds the arq worker, uvicorn runs in the foreground as the primary process.

### 3. Model File Download Strategy
**What we know:** Railway doesn't support git-lfs. Only ~71MB of models are needed (window=15 variants + SVM + persistence imager + genre names). Total including cache would be ~407MB.
**What's unclear:** Whether GitHub LFS hosting allows direct download via URL (it does -- GitHub LFS files are downloadable if the repo is public).
**Recommendation:** For a public repo, git-lfs files CAN be downloaded directly from GitHub by installing git-lfs in the Dockerfile and running `git lfs pull`. The Docker build context from Railway won't have them, but we can `git lfs pull` inside the Dockerfile if we have the `.git` directory. HOWEVER, Railway's Docker build may strip `.git`. Safer approach: create a GitHub Release with model tarball.

RESOLVED: GitHub Release assets — same tarball as Q1 resolution (`genre-topology-data.tar.gz`). Models and cache are co-located in one download, avoiding separate LFS pull entirely.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | Container build | Yes | 25.0.3 | -- |
| Docker Compose | Local dev | Yes | 2.24.6 | -- |
| Python | Backend runtime | Yes | 3.12.0 | -- |
| Node.js | Frontend build | Yes | 24.14.1 | -- |
| npm | Frontend deps | Yes | 11.11.0 | -- |
| Railway CLI | Deploy management | No | -- | Use Railway dashboard + git push |
| git-lfs | Model file access | Yes (local) | -- | GitHub Release assets for Railway |
| Redis | Job queue | Yes (local via dump.rdb) | -- | Railway managed addon |

**Missing dependencies with no fallback:**
- None -- all critical dependencies are available locally.

**Missing dependencies with fallback:**
- Railway CLI not installed -- use Railway web dashboard for project setup, then git push to deploy.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.0+ (backend), vitest 2.0+ (frontend) |
| Config file | `pytest.ini` (backend), `frontend/package.json` scripts (frontend) |
| Quick run command | `pytest tests/ -x --timeout=30` |
| Full suite command | `pytest && cd frontend && npm run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-05 | Docker build succeeds | smoke | `docker build -t genre-topology .` | No -- Wave 0 |
| INFRA-05 | docker compose up starts both services | smoke | `docker compose up -d && curl http://localhost:8000/health` | No -- Wave 0 |
| INFRA-06 | Public URL responds to health check | smoke | `curl https://<railway-url>/health` | No -- manual post-deploy |
| INFRA-06 | Public URL serves frontend | smoke | `curl https://<railway-url>/ | grep -q '<div id="root">'` | No -- manual post-deploy |

### Sampling Rate
- **Per task commit:** `docker build -t genre-topology .` (verify build succeeds)
- **Per wave merge:** `docker compose up -d && pytest tests/ -x` (verify local stack works)
- **Phase gate:** Full suite green + public URL responds

### Wave 0 Gaps
- [ ] Dockerfile -- does not exist yet
- [ ] docker-compose.yml -- does not exist yet
- [ ] .dockerignore -- does not exist yet
- [ ] railway.toml -- does not exist yet
- [ ] Smoke test script for Docker build verification

*(All files are new for this phase -- no existing infrastructure to leverage)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Decision: fully public, no auth |
| V3 Session Management | No | Stateless server |
| V4 Access Control | No | Fully public |
| V5 Input Validation | Yes (existing) | Already implemented: file upload validation in classify.py |
| V6 Cryptography | No | Railway handles TLS termination |

### Known Threat Patterns for Docker + Railway

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secrets in Docker image layers | Information Disclosure | Use ARG/ENV at runtime, not build-time secrets in layers; .dockerignore excludes .env |
| Exposed debug endpoints | Information Disclosure | No debug mode in production; FastAPI docs auto-disabled in production with `docs_url=None` |
| Large upload DoS | Denial of Service | Existing 5MB file size limit in classify endpoint |
| Container escape | Elevation of Privilege | Railway's container isolation; no privileged mode needed |

## Sources

### Primary (HIGH confidence)
- Railway Dockerfile docs: https://docs.railway.com/builds/dockerfiles -- build detection, ARG usage
- Railway Config as Code: https://docs.railway.com/reference/config-as-code -- railway.toml format
- Railway Redis guide: https://docs.railway.com/guides/redis -- addon setup, env vars
- Railway Pricing: https://docs.railway.com/reference/pricing/plans -- Hobby 48GB RAM, 20min build timeout
- Railway Public Networking: https://docs.railway.com/public-networking -- PORT env var injection
- FastAPI StaticFiles: https://fastapi.tiangolo.com/reference/staticfiles/ -- html=True behavior
- arq RedisSettings.from_dsn() -- verified locally via `help(RedisSettings)`
- Codebase inspection -- all code references verified by reading source files

### Secondary (MEDIUM confidence)
- Railway git-lfs limitation: https://station.railway.com/questions/is-there-anyway-to-pull-github-lfs-files-2a46e90d -- confirmed by Railway employee response
- Railway build timeout: https://station.railway.com/questions/deployment-is-failing-during-the-build-p-000d6784 -- Hobby 20min, Pro 60min
- FastAPI SPA pattern: https://github.com/fastapi/fastapi/discussions/5134 -- community pattern for serving React

### Tertiary (LOW confidence)
- None -- all findings verified against official docs or codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Docker, Railway are straightforward; all tooling verified locally
- Architecture: HIGH -- multi-stage Dockerfile is a well-documented pattern; code changes are small and well-understood
- Pitfalls: HIGH -- Railway LFS limitation confirmed by official support; Redis connection bug confirmed by code inspection; data/features issue confirmed by .gitignore + precompute.py code review

**Critical decision needed from planner:**
The `data/features/` + `data/models/` + `data/cache/` availability in Docker build is the pivotal design decision for this phase. The planner must choose between GitHub Release assets (Option 4) or Railway Volume (Option 5) to resolve Open Question #1. This choice affects the entire Dockerfile structure and deployment workflow.

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (Railway docs are stable; Docker patterns are mature)
