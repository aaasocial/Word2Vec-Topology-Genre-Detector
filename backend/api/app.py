from contextlib import asynccontextmanager
from fastapi import FastAPI
import os


@asynccontextmanager
async def lifespan(app: FastAPI):
    redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379')
    try:
        import redis.asyncio as aioredis
        from arq import create_pool
        from arq.connections import RedisSettings
        app.state.redis = aioredis.from_url(redis_url)
        app.state.arq_pool = await create_pool(RedisSettings())
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
    app = FastAPI(title='Literary Genre Topology', lifespan=lifespan)
    from backend.api.routes.health import router as health_router
    from backend.api.routes.corpus import router as corpus_router
    app.include_router(health_router)
    app.include_router(corpus_router)
    from backend.api.routes.classify import router as classify_router
    app.include_router(classify_router)
    return app


app = create_app()
