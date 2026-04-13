"""arq worker settings with model preloading.

Start the worker:
  arq backend.worker.settings.WorkerSettings

The worker loads all ML models once at startup (Word2Vec, TF-IDF vectorizer,
SVM pipeline, K-means) so they are available in ctx for every job. This avoids
re-loading models per request.

The best window size is read from config/params.yaml (word2vec.window field).
"""
import os
from arq.connections import RedisSettings
from backend.worker.jobs import classify_book


def _get_redis_settings():
    url = os.environ.get('REDIS_URL', 'redis://localhost:6379')
    return RedisSettings.from_dsn(url)


async def startup(ctx):
    """Load ML models once at worker start."""
    from gensim.models import Word2Vec
    import joblib
    from pathlib import Path
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
    from utils import load_params

    params = load_params()
    window = params['word2vec']['window']
    k = params['features']['k_clusters']

    models_dir = Path(__file__).resolve().parents[2] / 'data' / 'models'

    ctx['params'] = params
    ctx['window'] = window
    ctx['w2v_model'] = Word2Vec.load(str(models_dir / f'word2vec_w{window}.model'))
    ctx['tfidf_vectorizer'] = joblib.load(str(models_dir / f'tfidf_vectorizer_w{window}.joblib'))
    ctx['kmeans'] = joblib.load(str(models_dir / f'kmeans_w{window}_k{k}.pkl'))

    # Load the pre-trained SVM pipeline (serialized at build time by precompute.py)
    svm_path = models_dir / 'svm_pipeline.joblib'
    if svm_path.exists():
        ctx['svm_pipeline'] = joblib.load(str(svm_path))
    else:
        ctx['svm_pipeline'] = None  # Will be created by precompute.py (Plan 03)

    # Load persistence imager transform (serialized at build time)
    imager_path = models_dir / 'persistence_imager.joblib'
    if imager_path.exists():
        ctx['persistence_imager'] = joblib.load(str(imager_path))
    else:
        ctx['persistence_imager'] = None

    # Load genre names for label-to-genre mapping
    import yaml
    corpus_path = Path(__file__).resolve().parents[2] / 'corpus' / 'books.yaml'
    with open(corpus_path) as f:
        books_data = yaml.safe_load(f)
    ctx['genre_names'] = list(books_data['genres'].keys())


async def shutdown(ctx):
    pass


class WorkerSettings:
    functions = [classify_book]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = _get_redis_settings()
    max_jobs = 1              # Sequential processing -- model is not thread-safe
    job_timeout = 120         # 2 minutes max per job
    allow_abort_jobs = True   # Enable cancellation on WebSocket disconnect
    keep_result = 60          # Results expire after 60s
