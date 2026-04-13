# Phase 5: Deployment and Public Access — Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase containerizes the full application stack and deploys it to a publicly accessible URL. No new features — the goal is to take the working local app (Phase 1–4) and make it accessible to anyone with a browser.

**In scope (Phase 5):** INFRA-05, INFRA-06
- Docker containerization of FastAPI backend + Vite frontend + Redis
- Deployment to Railway with Railway Redis addon
- Model files and precomputed caches baked into the Docker image
- Public URL with no authentication

**NOT in scope:** New features, CI/CD automation, monitoring, user analytics, custom domain, auth.

</domain>

<decisions>
## Implementation Decisions

### Hosting Platform
- **Decision: Railway**
- Deploy to Railway via git-push or Docker image push.
- Railway handles environment variables, networking, and TLS automatically.
- Use Railway's assigned URL (e.g. `myapp.railway.app`) — no custom domain for now.

### Docker Architecture
- **Decision: Single Dockerfile, multi-stage build**
- Stage 1 (builder): Install Python deps, Node deps, build the Vite frontend (`npm run build`).
- Stage 2 (runtime): Python runtime only — copy built frontend `dist/` into FastAPI static file serving.
- FastAPI serves the built React frontend as static files (no separate Nginx needed).
- Single container exposing one port (default 8000).

### Model Files Strategy
- **Decision: Bake into Docker image at build time**
- Copy `data/models/` into the image during the Docker build.
- Models are already in git-lfs — Docker build pulls them via `git lfs pull` before building.
- Resulting image will be ~1–1.5GB. Acceptable tradeoff for zero-runtime-download startup.
- No volume mounts needed for models.

### Precomputed Cache Strategy
- **Decision: Bake into Docker image at build time**
- Run the full precompute pipeline (`python -c "from backend.pipeline.precompute import precompute_all; precompute_all(window=15)"`) during Docker build after models are copied in.
- Cache files land in `data/cache/` inside the image — instant serving on startup.
- Adds ~5–10 min to image build time (acceptable for a one-time build).
- No volume mounts needed for cache.

### Redis
- **Decision: Railway Redis addon**
- Add Railway's managed Redis service to the project.
- Backend connects via `REDIS_URL` environment variable (Railway injects this automatically).
- No docker-compose Redis sidecar needed — Railway handles the separate Redis instance.
- Backend must read `REDIS_URL` from environment (not hardcoded localhost).

### Access Control
- **Decision: Fully public, no authentication**
- Anyone with the Railway URL can access the app.
- Matches INFRA-06 requirement.

### Frontend Serving Strategy
- **Decision: FastAPI serves built React static files**
- `vite build` produces `frontend/dist/` — this is copied into the container.
- FastAPI mounts `frontend/dist/` as a StaticFiles directory and serves `index.html` for all non-API routes (SPA fallback).
- No Nginx, no separate frontend service — single container, single port.

### docker-compose for Local Dev
- **Decision: Keep docker-compose for local one-command setup**
- `docker-compose.yml` with two services: `app` (FastAPI + frontend) and `redis`.
- Satisfies the success criterion: "developer can run the entire stack with `docker compose up`".
- Railway deployment uses the single-service Dockerfile (not docker-compose).

### Claude's Discretion
- Exact Railway service name and project structure
- Health check endpoint implementation (`GET /health`)
- Environment variable names beyond `REDIS_URL` (PORT, PYTHONPATH, etc.)
- `.dockerignore` contents
- Railway `railway.toml` or `Procfile` configuration details

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Structure
- `CLAUDE.md` — Project constraints including "stateless serving vs. compute-intensive background jobs"
- `backend/api/app.py` — FastAPI app entry point (what gets served)
- `frontend/package.json` — Frontend build command (`npm run build`)

### Pipeline
- `backend/pipeline/precompute.py` — Precompute entry point to run during Docker build
- `config/params.yaml` — Pipeline params (window=15 default)

### Models
- `data/models/` — 300MB model files (tracked via git-lfs, bake into image)
- `.gitattributes` — LFS tracking patterns

### Requirements
- `.planning/REQUIREMENTS.md` — INFRA-05, INFRA-06

</canonical_refs>

<specifics>
## Specific Ideas

- Railway Redis addon injects `REDIS_URL` env var automatically — backend must use `os.environ.get("REDIS_URL", "redis://localhost:6379")` fallback for local dev
- The precompute step during Docker build needs the models already present — order matters: copy models → run precompute → copy result into final image
- `docker compose up` as the single local dev command is a success criterion (from ROADMAP.md)
- Railway-assigned URL is the deployment target — no custom domain needed for v1

</specifics>

<deferred>
## Deferred Ideas

- Custom domain (e.g. genreanalyser.com) — noted for future, not v1
- CI/CD pipeline (auto-deploy on push) — Railway supports this but out of scope for now
- Monitoring / uptime alerts — post-launch
- CDN for static assets — post-launch
- Auth / password protection — user confirmed not needed

</deferred>

---

*Phase: 05-deployment-and-public-access*
*Context gathered: 2026-04-13 via /gsd-discuss-phase*
