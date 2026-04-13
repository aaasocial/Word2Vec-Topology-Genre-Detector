from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter
from fastapi.responses import FileResponse
from pathlib import Path
import os


FRONTEND_DIR = Path(__file__).resolve().parents[2] / 'frontend' / 'dist'


@asynccontextmanager
async def lifespan(app: FastAPI):
    redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379')
    try:
        import redis.asyncio as aioredis
        from arq import create_pool
        from arq.connections import RedisSettings
        app.state.redis = aioredis.from_url(redis_url)
        app.state.arq_pool = await create_pool(RedisSettings.from_dsn(redis_url))
    except Exception:
        # Redis not available -- tests and dev without Redis still work
        app.state.redis = None
        app.state.arq_pool = None
    yield
    if app.state.redis is not None:
        await app.state.redis.close()
    if app.state.arq_pool is not None:
        await app.state.arq_pool.close()


def create_app() -> FastAPI:
    app = FastAPI(
        title='Literary Genre Topology',
        lifespan=lifespan,
        docs_url=None,   # T-5-02: disable Swagger UI in production
        redoc_url=None,
    )

    from backend.api.routes.health import router as health_router
    from backend.api.routes.corpus import router as corpus_router
    from backend.api.routes.classify import router as classify_router
    from backend.api.routes.viz import router as viz_router

    # Mount all API routers under /api prefix via a parent router.
    # Using APIRouter (not a sub-app) so all routes share app.state
    # -- this is critical for WebSocket routes that access redis/arq_pool.
    api_router = APIRouter(prefix='/api')
    api_router.include_router(health_router)
    api_router.include_router(corpus_router)
    api_router.include_router(classify_router)
    api_router.include_router(viz_router, prefix='/viz', tags=['viz'])
    app.include_router(api_router)

    # --- Root-level health check for Railway ---
    # Railway hits /health (not /api/health) for health checks
    @app.get('/health')
    async def root_health():
        return {'status': 'ok'}

    # --- SPA fallback: serve frontend/dist/ ---
    # MUST be registered AFTER /api routes so API takes precedence.
    # WebSocket upgrade requests are handled separately by FastAPI
    # and will NOT be intercepted by this HTTP GET catch-all.
    @app.get('/{full_path:path}')
    async def serve_spa(full_path: str):
        """Serve React SPA -- static files or index.html fallback."""
        file_path = FRONTEND_DIR / full_path
        # Path traversal protection (T-5-03)
        try:
            resolved = file_path.resolve()
            if resolved.is_file() and FRONTEND_DIR.resolve() in resolved.parents:
                return FileResponse(resolved)
        except (OSError, ValueError):
            pass
        index = FRONTEND_DIR / 'index.html'
        if index.exists():
            return FileResponse(index)
        # No frontend build available -- return plain 404
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=404,
            content={'detail': 'Frontend not built. Run: cd frontend && npm run build'},
        )

    return app


app = create_app()
