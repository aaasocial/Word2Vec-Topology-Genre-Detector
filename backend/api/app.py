import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import APIRouter, FastAPI
from fastapi.responses import FileResponse

log = logging.getLogger(__name__)

FRONTEND_DIR = Path(__file__).resolve().parents[2] / 'frontend' / 'dist'
PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _load_phase9_state(app: FastAPI) -> None:
    """Phase 9 Q6: load SVM + w2v + explain_artifacts + NN index into app.state.

    Each sub-load is wrapped in its own try/except so partial failures don't
    block startup (Pitfall 3): a corrupt explain_artifacts.npz must not disable
    /classify, and Redis unavailability must not block model loading.

    Default values are set BEFORE the first try/except so downstream endpoints
    can safely test `app.state.X is None` without AttributeError.
    """
    import sys

    import joblib
    import json
    import numpy as np
    from gensim.models import Word2Vec
    from sklearn.neighbors import NearestNeighbors

    # scripts/utils.load_params is needed for the configured window.
    sys.path.insert(0, str(PROJECT_ROOT / 'scripts'))
    from utils import load_params

    from backend.cache.lineage import verify_svm_lineage

    models_dir = PROJECT_ROOT / 'data' / 'models'

    # --- Defaults (set FIRST so partial loads have known fallbacks) ---
    app.state.svm_pipeline = None
    app.state.w2v_model = None
    app.state.genre_names = None
    app.state.lineage = None
    app.state.calibration_available = False
    app.state.explain_artifacts = None
    app.state.nn_index = None
    app.state.params = None

    # --- 1. Params (required for the configured window value) ---
    try:
        app.state.params = load_params()
        window = app.state.params['word2vec']['window']
    except Exception as exc:
        log.error(f"Phase 9 startup: params load failed: {exc}")
        return  # nothing else can proceed without window

    # --- 2. SVM + lineage + calibration gate (D-38 + D-40) ---
    svm_path = models_dir / 'svm_pipeline.joblib'
    try:
        app.state.svm_pipeline = joblib.load(svm_path)
        lineage_sidecar = svm_path.with_suffix(svm_path.suffix + '.lineage.json')
        with open(lineage_sidecar) as f:
            app.state.lineage = json.load(f)
        ok, reason = verify_svm_lineage(svm_path, window=window)
        app.state.calibration_available = ok
        if not ok:
            log.warning(f"Phase 9 startup: SVM lineage refused -- {reason}")
    except Exception as exc:
        log.error(f"Phase 9 startup: SVM load failed: {exc}")

    # --- 3. Genre names (label-to-genre mapping for top-N response) ---
    try:
        with open(models_dir / 'genre_names.json') as f:
            app.state.genre_names = json.load(f)
    except Exception as exc:
        log.error(f"Phase 9 startup: genre_names load failed: {exc}")

    # --- 4. Word2Vec (~70 MB) -- needed by future /explain for word->centroid lookup ---
    try:
        app.state.w2v_model = Word2Vec.load(
            str(models_dir / f'word2vec_w{window}.model')
        )
    except Exception as exc:
        log.error(f"Phase 9 startup: w2v_model load failed: {exc}")

    # --- 5. Explain artifacts + NN index (D-45 / D-50) ---
    artifacts_path = models_dir / 'explain_artifacts.npz'
    if not artifacts_path.exists():
        log.warning(
            f"Phase 9 startup: {artifacts_path.name} missing -- /explain will 503"
        )
        return
    try:
        data = np.load(artifacts_path, allow_pickle=True)
        artifacts = {k: data[k] for k in data.files}
        # Pitfall 5: cross-check corpus_hash against the loaded SVM lineage.
        meta_raw = artifacts['metadata']
        artifact_meta = (
            meta_raw.item() if meta_raw.dtype == object else dict(meta_raw)
        )
        if app.state.lineage and artifact_meta.get('corpus_hash') != app.state.lineage.get('corpus_hash'):
            artifact_ch = (artifact_meta.get('corpus_hash') or '?')[:12]
            lineage_ch = (app.state.lineage.get('corpus_hash') or '?')[:12]
            log.error(
                f"Phase 9 startup: corpus_hash drift -- "
                f"artifact={artifact_ch}... lineage={lineage_ch}... -- "
                f"/explain will 503"
            )
            return
        app.state.explain_artifacts = artifacts
        app.state.nn_index = NearestNeighbors(n_neighbors=5, metric='euclidean')
        app.state.nn_index.fit(artifacts['feature_matrix_l2'])
        log.info(
            f"Phase 9 startup: explain_artifacts + NN index loaded "
            f"(n_books={artifacts['feature_matrix_l2'].shape[0]})"
        )
    except Exception as exc:
        log.error(f"Phase 9 startup: explain_artifacts load failed: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Existing Redis + arq pool setup (unchanged) ---
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

    # --- Phase 9 (Q6): SVM + w2v + explain artifacts + NN index on app.state ---
    # Each sub-load is isolated so a corrupt artifact never blocks /classify.
    _load_phase9_state(app)

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
    from backend.api.routes.explain import router as explain_router
    from backend.api.routes.viz import router as viz_router

    # Mount all API routers under /api prefix via a parent router.
    # Using APIRouter (not a sub-app) so all routes share app.state
    # -- this is critical for WebSocket routes that access redis/arq_pool.
    api_router = APIRouter(prefix='/api')
    api_router.include_router(health_router)
    api_router.include_router(corpus_router)
    api_router.include_router(classify_router)
    api_router.include_router(explain_router)  # Phase 9 /classify/{job_id}/explain
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
