from contextlib import asynccontextmanager
from fastapi import FastAPI


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Redis and arq pool are initialized here when Redis is available.
    # For now, set to None so tests can run without Redis.
    app.state.redis = None
    app.state.arq_pool = None
    yield


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
