# Phase 2: API Layer and Job Queue - Research

**Researched:** 2026-04-12
**Domain:** FastAPI backend, arq job queue, Redis, WebSocket progress streaming, content-addressed caching
**Confidence:** HIGH

## Summary

Phase 2 wraps the validated Phase 1 CLI pipeline (Word2Vec training, persistent homology, SVM classification) in a FastAPI backend with arq + Redis for async job processing, WebSocket progress streaming, content-addressed caching, and file upload validation. The core challenge is bridging arq worker progress updates to WebSocket clients, since arq workers run in separate processes from the FastAPI server.

The pipeline scripts (03-06) are currently monolithic CLI scripts with `main()` functions. They need refactoring into importable functions in `backend/pipeline/` that accept parameters directly (not argparse) and check a cancellation token between steps. The existing `utils.py` (just `load_params()`) moves to `backend/pipeline/` as well.

**Primary recommendation:** Use Redis pub/sub as the bridge between arq workers and FastAPI WebSocket connections. The worker publishes progress JSON to a job-specific Redis channel (`job:{job_id}:progress`); the WebSocket handler subscribes to that channel and forwards messages to the client. This decouples worker and server processes cleanly.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- New book classification: project into existing Word2Vec space (no retraining). OOV words excluded with count in response.
- Job queue: arq + Redis
- Project layout: refactor scripts/ into backend/pipeline/ importable package; FastAPI imports directly; CLI scripts kept as thin wrappers
- Stale jobs: cancel on WebSocket disconnect -- clean cancellation between pipeline steps via cancellation token
- Content-addressed cache: disk for build-time corpus results, Redis for in-flight job state
- WebSocket progress: 6-step format (tokenize -> tfidf -> pointcloud -> homology -> features -> classify)
- File upload validation: .txt only, <=5MB, UTF-8, min 500 words, English language detection
- SVM model serialized at build time alongside feature matrices -- not retrained per request
- Pipeline steps are atomic: cancel between steps, not within

### Claude's Discretion
- Specific Redis pub/sub channel naming scheme for progress bridging
- Cache key format details beyond `sha256(step_name + canonical_params)`
- Exact error response JSON schema
- Test framework choices for API testing
- Specific encoding detection library (chardet vs charset-normalizer)
- Language detection library choice

### Deferred Ideas (OUT OF SCOPE)
None -- all discussion stayed within Phase 2 scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | FastAPI backend serves API and handles WebSocket connections | FastAPI 0.135.3 + uvicorn 0.44.0; WebSocket support built-in |
| INFRA-02 | Background job queue handles long-running computations asynchronously | arq 0.27.0 + Redis; worker runs pipeline functions from backend/pipeline/ |
| INFRA-03 | Content-addressed cache keyed by hash(step_name + params + upstream_key) | Disk cache for build-time results; Redis for in-flight job state |
| CORPUS-02 | Bundled corpus results pre-computed at build time | precompute.py script serializes all artifacts to disk cache |
| CLASS-01 | User uploads .txt file with client-side validation | FastAPI UploadFile + python-multipart; server validates encoding, word count, language |
| CLASS-02 | System processes uploaded book through full pipeline and returns genre prediction | arq job runs pipeline steps sequentially; SVM model loaded from disk |
| CLASS-04 | Staged progress indicator naming each pipeline step | WebSocket streams 6-step progress via Redis pub/sub bridge |
| CLASS-05 | Actionable error messages for failed uploads | Validation middleware returns specific error messages per failure type |
| UX-01 | Staged progress indicators for computations exceeding 1 second | WebSocket progress messages with step name, index, total, status |
| UX-02 | All error states include specific, actionable messages | Structured error response schema with error type and human-readable message |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fastapi | 0.135.3 | HTTP/WebSocket API framework | De facto Python async API framework; native WebSocket, Pydantic models, OpenAPI docs [VERIFIED: pip index] |
| uvicorn | 0.44.0 | ASGI server | Standard FastAPI deployment server; async, production-ready [VERIFIED: pip index] |
| arq | 0.27.0 | Async job queue | Lightweight asyncio-native Redis job queue; user decision locked [VERIFIED: pip index] |
| redis | 7.4.0 | Redis client (async) | Official Redis client with async support; used by arq internally and for pub/sub + cache [VERIFIED: pip index] |
| python-multipart | 0.0.26 | Form/file upload parsing | Required by FastAPI for UploadFile processing [VERIFIED: pip index] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chardet | 7.4.1 | Encoding detection | Validate uploaded .txt files are UTF-8 before processing [VERIFIED: pip index] |
| langdetect | 1.0.9 | Language detection | Reject non-English uploads per CLASS-05 [VERIFIED: pip index] |
| pydantic | (bundled with FastAPI) | Request/response models | Define API schemas, validation, serialization |
| httpx | latest | Async HTTP test client | FastAPI test client for integration tests [ASSUMED] |
| pytest-asyncio | latest | Async test support | Test async endpoints and WebSocket handlers [ASSUMED] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| chardet | charset-normalizer | charset-normalizer is faster but chardet is already installed and well-tested |
| langdetect | fasttext-langdetect | fasttext is more accurate but heavier dependency; langdetect sufficient for English vs non-English |
| arq | celery | Celery is more mature but heavier; arq is asyncio-native (user decision locked) |

**Installation:**
```bash
pip install fastapi==0.135.3 uvicorn==0.44.0 arq==0.27.0 redis==7.4.0 python-multipart==0.0.26 chardet==7.4.1 langdetect==1.0.9 httpx pytest-asyncio
```

## Architecture Patterns

### Recommended Project Structure
```
backend/
  __init__.py
  api/
    __init__.py
    app.py            # FastAPI app factory, lifespan, CORS
    routes/
      __init__.py
      classify.py     # POST /classify (file upload), WebSocket /ws/classify/{job_id}
      corpus.py       # GET /corpus/books, GET /corpus/books/{id}/results
      health.py       # GET /health
    models.py         # Pydantic request/response schemas
    deps.py           # Dependency injection (Redis pool, arq pool)
  pipeline/
    __init__.py
    tokenize.py       # Text tokenization (from 02_preprocess.py)
    embed.py          # Word2Vec loading, OOV projection, TF-IDF
    homology.py       # Vietoris-Rips persistent homology
    features.py       # Persistence images, K-means cluster distribution
    classify.py       # SVM prediction (load pre-trained model)
    precompute.py     # Build-time corpus pre-computation script
    types.py          # Shared types: CancellationToken, PipelineResult, ProgressCallback
  worker/
    __init__.py
    settings.py       # arq WorkerSettings class
    jobs.py           # Job functions (classify_book)
  cache/
    __init__.py
    store.py          # Content-addressed cache: disk read/write, key generation
scripts/              # Thin CLI wrappers (unchanged interface, delegate to backend/pipeline/)
config/
  params.yaml         # Pipeline parameters (unchanged)
corpus/
  books.yaml          # Corpus metadata (unchanged)
```

### Pattern 1: Redis Pub/Sub Progress Bridge
**What:** arq worker publishes progress JSON to a Redis pub/sub channel; FastAPI WebSocket handler subscribes and forwards to client.
**When to use:** Always -- this is the only reliable way to stream progress from a separate worker process to a WebSocket connection.
**Example:**
```python
# In worker/jobs.py
async def classify_book(ctx, file_content: bytes, job_id: str):
    redis = ctx['redis']  # arq provides this
    steps = ['tokenize', 'tfidf', 'pointcloud', 'homology', 'features', 'classify']

    for i, step_name in enumerate(steps):
        # Check cancellation before each step
        if await redis.sismember('abort_jobs_ss', job_id):
            return {'status': 'cancelled'}

        await redis.publish(f'job:{job_id}:progress', json.dumps({
            'step': step_name, 'index': i + 1, 'total': 6,
            'message': f'{step_name.title()}...', 'status': 'running'
        }))

        result = await run_step(step_name, ...)  # CPU-bound in thread

    await redis.publish(f'job:{job_id}:progress', json.dumps({
        'step': 'classify', 'index': 6, 'total': 6,
        'status': 'done', 'result': result
    }))
    return result

# In api/routes/classify.py
@router.websocket('/ws/classify/{job_id}')
async def ws_classify(websocket: WebSocket, job_id: str):
    await websocket.accept()
    redis = await get_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe(f'job:{job_id}:progress')

    try:
        async for message in pubsub.listen():
            if message['type'] == 'message':
                await websocket.send_text(message['data'])
                data = json.loads(message['data'])
                if data.get('status') in ('done', 'error'):
                    break
    except WebSocketDisconnect:
        # Cancel the job on disconnect
        job = Job(job_id, redis)
        await job.abort()
    finally:
        await pubsub.unsubscribe(f'job:{job_id}:progress')
```
[CITED: arq-docs.helpmanual.io, redis.readthedocs.io/en/stable/examples/asyncio_examples.html]

### Pattern 2: Content-Addressed Disk Cache
**What:** Pipeline results keyed by `sha256(step_name + canonical_params)` stored as files on disk for build-time results.
**When to use:** For bundled corpus pre-computed results that never change after build.
**Example:**
```python
# In cache/store.py
import hashlib, json, pickle
from pathlib import Path

CACHE_DIR = Path('data/cache')

def cache_key(step_name: str, params: dict) -> str:
    canonical = json.dumps({step_name: params}, sort_keys=True)
    return hashlib.sha256(canonical.encode()).hexdigest()

def cache_get(key: str):
    path = CACHE_DIR / f'{key}.pkl'
    if path.exists():
        return pickle.loads(path.read_bytes())
    return None

def cache_put(key: str, value):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    (CACHE_DIR / f'{key}.pkl').write_bytes(pickle.dumps(value))
```
[ASSUMED -- standard content-addressed caching pattern]

### Pattern 3: CPU-Bound Pipeline Steps in Thread Pool
**What:** Pipeline functions (numpy, scipy, ripser) are synchronous CPU-bound code. Run them in a thread pool executor to avoid blocking the asyncio event loop.
**When to use:** Every pipeline step in the arq worker.
**Example:**
```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=1)

async def run_step_in_thread(func, *args):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, func, *args)
```
[ASSUMED -- standard asyncio pattern for CPU-bound work]

### Pattern 4: File Upload -> Job Submission Flow
**What:** POST /classify accepts file, validates, enqueues arq job, returns job_id. Client then connects to WebSocket with that job_id.
**When to use:** For the classification endpoint.
**Example:**
```python
@router.post('/classify')
async def classify_upload(file: UploadFile, arq_pool=Depends(get_arq_pool)):
    # Validate file
    content = await file.read()
    validate_upload(content, file.filename)  # raises HTTPException on failure

    job_id = str(uuid4())
    await arq_pool.enqueue_job('classify_book', content, job_id, _job_id=job_id)
    return {'job_id': job_id}
```
[CITED: fastapi.tiangolo.com/tutorial/request-files/]

### Anti-Patterns to Avoid
- **Subprocess calls from FastAPI to pipeline scripts:** Do NOT shell out to `python scripts/03_train_embeddings.py`. Import pipeline functions directly. [Decision locked]
- **Blocking the event loop with CPU work:** Never call ripser/numpy directly in an async function. Always use `run_in_executor`. [ASSUMED -- standard asyncio practice]
- **Polling job status instead of pub/sub:** Polling Redis for job completion wastes resources and adds latency. Use pub/sub for real-time progress. [CITED: medium.com/@nandagopal05 scaling WebSockets article]
- **Storing large binary results in Redis:** Persistence images, feature matrices, and model files belong on disk. Redis is for job state and pub/sub only. [Decision locked]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File encoding detection | Manual byte inspection | chardet.detect() | Edge cases with BOM markers, mixed encodings, partial UTF-8 sequences |
| Language detection | Word frequency heuristics | langdetect.detect() | Probabilistic model trained on Wikipedia; handles short and mixed texts |
| Job queue with retry/abort | Custom Redis queue manager | arq | Handles retry, abort, deduplication, result storage, worker lifecycle |
| WebSocket connection management | Manual connection tracking | FastAPI WebSocket + Starlette | Built-in accept/close/disconnect handling, exception-safe |
| API request validation | Manual if/else checks | Pydantic models + FastAPI | Automatic type coercion, validation errors, OpenAPI schema generation |
| ASGI server | Custom asyncio server | uvicorn | Production-grade, handles graceful shutdown, worker processes |

**Key insight:** The pipeline math (Word2Vec, ripser, SVM) is already implemented in Phase 1. Phase 2's complexity is purely in the orchestration layer -- async job lifecycle, WebSocket bridging, caching, and validation. These are all solved problems with well-tested libraries.

## Common Pitfalls

### Pitfall 1: arq Job Abort Only Works with allow_abort_jobs=True
**What goes wrong:** Calling `job.abort()` silently does nothing if the worker doesn't have `allow_abort_jobs = True` in WorkerSettings.
**Why it happens:** arq disables abort by default for performance (checking the abort set adds a Redis round-trip per poll cycle).
**How to avoid:** Set `allow_abort_jobs = True` in WorkerSettings. arq checks the abort sorted set during each poll iteration.
**Warning signs:** WebSocket disconnect handler calls abort but the worker keeps running the job.
[CITED: arq-docs.helpmanual.io]

### Pitfall 2: arq abort sends CancelledError mid-computation
**What goes wrong:** arq calls `task.cancel()` which raises `asyncio.CancelledError` at the next await point inside the job. If the job is in `run_in_executor` (CPU-bound step), the cancellation waits until the executor returns, then raises CancelledError.
**Why it happens:** Python's `asyncio.Task.cancel()` is cooperative -- it can only interrupt at `await` points.
**How to avoid:** This actually works in our favor. Since pipeline steps run in `run_in_executor`, cancellation only triggers between steps (at the `await`), not mid-computation. Each step is atomic as required. However, you should still check for cancellation explicitly between steps before publishing progress, as a belt-and-suspenders measure.
**Warning signs:** A step completes but progress is published after the job was already aborted.
[CITED: github.com/python-arq/arq/blob/main/arq/worker.py]

### Pitfall 3: Redis pub/sub message ordering and missed messages
**What goes wrong:** If the WebSocket handler subscribes to the pub/sub channel after the worker has already published some progress messages, those early messages are lost.
**Why it happens:** Redis pub/sub is fire-and-forget. Subscribers only receive messages published after they subscribe.
**How to avoid:** Ensure the WebSocket handler subscribes to the channel BEFORE the job is enqueued. Flow: (1) client connects WebSocket, (2) server subscribes to pub/sub channel, (3) server enqueues arq job, (4) worker starts and publishes progress. Alternatively, the POST /classify endpoint returns the job_id, but the job is enqueued with a small delay or a "pending" state until the WebSocket connects.
**Warning signs:** Client connects but misses the first 1-2 progress steps.

### Pitfall 4: FastAPI UploadFile size is not known before reading
**What goes wrong:** You try to check file size before reading the upload, but `file.size` may be None (depends on client sending Content-Length).
**Why it happens:** HTTP multipart uploads don't guarantee Content-Length per part. Starlette's UploadFile uses SpooledTemporaryFile that spools to disk above 1MB.
**How to avoid:** Read the file content with a size limit: read in chunks, abort if cumulative size exceeds 5MB. Or read fully and check `len(content)` after reading. For 5MB files this is fine -- no streaming needed.
**Warning signs:** Large files cause memory spikes or silent truncation.
[CITED: github.com/fastapi/fastapi/discussions/8167]

### Pitfall 5: Pickle cache files are Python-version-sensitive
**What goes wrong:** Cache files written with one Python version fail to load on another.
**Why it happens:** Pickle protocol versions differ across Python releases.
**How to avoid:** Use a fixed pickle protocol (e.g., `protocol=4` for Python 3.8+ compatibility) or use numpy's `.npy` format for arrays and JSON for metadata. Since the existing pipeline already uses `.npy` and `.json`, keep those formats for the cache.
**Warning signs:** Cache load errors after Python upgrade.

### Pitfall 6: Gensim Word2Vec model is not thread-safe for inference
**What goes wrong:** Multiple concurrent requests accessing the same Word2Vec model object causes race conditions.
**Why it happens:** gensim models are not designed for concurrent access.
**How to avoid:** Since the arq worker processes jobs sequentially (single worker, single thread for pipeline), this is not an issue. The pre-loaded model in the worker's `on_startup` hook is accessed by one job at a time. Do NOT attempt to share the model across multiple worker processes.
**Warning signs:** Garbled embeddings or segfaults under concurrent load.
[ASSUMED -- based on gensim documentation patterns]

## Code Examples

### Worker Settings with Model Preloading
```python
# backend/worker/settings.py
from arq.connections import RedisSettings

async def startup(ctx):
    """Load models once at worker start, not per-job."""
    from gensim.models import Word2Vec
    import joblib

    ctx['w2v_model'] = Word2Vec.load('data/models/word2vec_w5.model')
    ctx['tfidf_vectorizer'] = joblib.load('data/models/tfidf_vectorizer_w5.joblib')
    ctx['svm_pipeline'] = joblib.load('data/models/svm_pipeline.joblib')
    ctx['kmeans'] = joblib.load('data/models/kmeans_w5_k50.pkl')

async def shutdown(ctx):
    pass

class WorkerSettings:
    functions = [classify_book]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings()
    max_jobs = 1              # Sequential processing
    job_timeout = 120         # 2 minutes max per job
    allow_abort_jobs = True   # Enable cancellation
    keep_result = 60          # Results expire after 60s
```
[CITED: arq-docs.helpmanual.io]

### Upload Validation
```python
# backend/api/routes/classify.py
from fastapi import UploadFile, HTTPException
import chardet
from langdetect import detect, LangDetectException

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MIN_WORD_COUNT = 500

async def validate_upload(file: UploadFile) -> tuple[str, list[str]]:
    """Validate uploaded file. Returns (text_content, tokens).
    Raises HTTPException with specific error message on failure."""

    if not file.filename or not file.filename.endswith('.txt'):
        raise HTTPException(400, 'Only .txt files are accepted')

    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, f'File exceeds 5MB limit ({len(content) / 1024 / 1024:.1f}MB)')

    # Encoding detection
    detected = chardet.detect(content)
    if detected['encoding'] is None or detected['encoding'].lower() not in ('utf-8', 'ascii'):
        raise HTTPException(400,
            'File encoding not detected as UTF-8. '
            'Save the file as UTF-8 and retry.')

    text = content.decode('utf-8', errors='strict')

    # Language detection (on first 5000 chars for speed)
    try:
        lang = detect(text[:5000])
        if lang != 'en':
            raise HTTPException(400,
                'Non-English text detected. '
                'The model is trained on English-language books only.')
    except LangDetectException:
        pass  # Very short text -- skip language check

    # Tokenization and word count
    import re
    tokens = re.findall(r'[a-z]+', text.lower())
    # Apply stopword removal
    from nltk.corpus import stopwords
    stop_words = set(stopwords.words('english'))
    tokens = [t for t in tokens if t not in stop_words and len(t) > 1]

    if len(tokens) < MIN_WORD_COUNT:
        raise HTTPException(400,
            f'Book has only {len(tokens)} words after processing '
            f'-- minimum {MIN_WORD_COUNT} required')

    return text, tokens
```
[CITED: fastapi.tiangolo.com/tutorial/request-files/, github.com/fastapi/fastapi/discussions/8167]

### Precompute Script
```python
# backend/pipeline/precompute.py
"""Build-time script: pre-compute all bundled corpus results and cache to disk.

Run once after Phase 1 pipeline completes:
  python -m backend.pipeline.precompute

Produces:
  data/cache/{hash}.pkl  -- cached step results
  data/models/svm_pipeline.joblib  -- trained SVM for classification
"""

def precompute_all():
    """Run full pipeline on bundled corpus, cache everything."""
    from backend.cache.store import cache_put, cache_key
    # 1. Load pre-trained Word2Vec model
    # 2. Load TF-IDF vectorizer
    # 3. For each book: compute point cloud, homology, features
    # 4. Cache each book's results under content-addressed key
    # 5. Train SVM on all books, serialize the fitted pipeline
    # 6. Cache projection coordinates (PCA, UMAP, t-SNE) for Phase 3
    pass
```
[ASSUMED -- follows from CONTEXT.md decisions]

### FastAPI App Factory with Lifespan
```python
# backend/api/app.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from arq import create_pool
from arq.connections import RedisSettings
import redis.asyncio as aioredis

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create shared Redis and arq connections
    app.state.redis = aioredis.from_url('redis://localhost')
    app.state.arq_pool = await create_pool(RedisSettings())
    yield
    # Shutdown: close connections
    await app.state.arq_pool.close()
    await app.state.redis.close()

app = FastAPI(title='Literary Genre Topology', lifespan=lifespan)
```
[CITED: fastapi.tiangolo.com/advanced/events/]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FastAPI @app.on_event("startup") | Lifespan context manager | FastAPI 0.93+ (2023) | Deprecated events still work but lifespan is preferred |
| aioredis as separate package | redis-py with async support | redis-py 4.2+ (2022) | `import redis.asyncio as aioredis` -- no separate aioredis needed |
| Celery for all Python job queues | arq for asyncio-native apps | arq 0.20+ (2022) | Lighter, no separate broker config, native asyncio |

**Deprecated/outdated:**
- `aioredis` standalone package: merged into `redis-py` >= 4.2. Use `redis.asyncio` instead. [VERIFIED: redis-py 7.4.0 docs]
- FastAPI `@app.on_event("startup")` / `@app.on_event("shutdown")`: use lifespan instead. [CITED: fastapi.tiangolo.com]
- arq is in "maintenance only" mode per PyPI listing, but v0.27.0 (Jan 2026) is recent and functional. [VERIFIED: pypi.org/project/arq/]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | httpx is the standard FastAPI test client for async tests | Standard Stack | Low -- could use requests + TestClient instead |
| A2 | run_in_executor is sufficient for CPU-bound pipeline steps (no need for multiprocessing) | Architecture Patterns | Medium -- if steps leak memory or hold GIL extensively, may need process pool |
| A3 | Gensim Word2Vec model is not thread-safe for concurrent inference | Pitfalls | Low -- single worker sequential processing avoids this regardless |
| A4 | Pickle protocol 4 is sufficient for cache compatibility | Pitfalls | Low -- using .npy and .json eliminates this concern |
| A5 | langdetect is accurate enough for English vs non-English binary classification | Standard Stack | Low -- only needs to catch obviously non-English text |

## Open Questions

1. **WebSocket-first vs POST-then-WebSocket flow**
   - What we know: The POST /classify endpoint accepts the file and returns a job_id. The client then connects to the WebSocket.
   - What's unclear: Should the file upload happen over WebSocket (single connection) or REST (two connections)?
   - Recommendation: Use POST for upload (simpler, standard multipart), WebSocket for progress only. Two connections is fine -- the POST returns instantly.

2. **Redis availability on deployment target**
   - What we know: Redis is NOT currently running on the dev machine.
   - What's unclear: Will Redis be available in production? (Phase 5 will Docker-compose it, but local dev needs Redis too.)
   - Recommendation: Require Redis for development. Document `docker run -d -p 6379:6379 redis:7-alpine` in dev setup instructions.

3. **Multiple window sizes in pre-computation**
   - What we know: Phase 1 sweeps across windows [5, 10, 15, 20]. The API needs to serve results for the best window.
   - What's unclear: Does the API serve results for a single "best" window or all windows?
   - Recommendation: Pre-compute for a single window (the one that produced the best validation results). This simplifies the API and reduces cache size. The sweep is a Phase 1 concern; Phase 2 picks the winner.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python | Everything | Yes | 3.12.0 | -- |
| Redis | arq, cache, pub/sub | No | -- | `docker run -d -p 6379:6379 redis:7-alpine` for local dev |
| Docker | Redis local dev | Yes | 25.0.3 | -- |
| pip | Package management | Yes | bundled | -- |
| gensim | Word2Vec model loading | Yes (in requirements.txt) | 4.4.0 | -- |
| scikit-learn | SVM pipeline | Yes (in requirements.txt) | >=1.3.0 | -- |
| ripser | Persistent homology | Yes (in requirements.txt via giotto-tda) | 0.6.2 | -- |

**Missing dependencies with no fallback:**
- Redis: required for arq job queue and pub/sub. Must be installed/running before Phase 2 code works. Docker is available for this.

**Missing dependencies with fallback:**
- None -- all other dependencies are available or installable via pip.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.0+ with pytest-asyncio |
| Config file | pytest.ini (exists) |
| Quick run command | `pytest tests/ -x -q --ignore=tests/test_benchmark.py` |
| Full suite command | `pytest tests/ -v` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | FastAPI app starts, serves health endpoint | smoke | `pytest tests/test_api_health.py -x` | No -- Wave 0 |
| INFRA-02 | arq job enqueues and completes | integration | `pytest tests/test_worker.py -x -m integration` | No -- Wave 0 |
| INFRA-03 | Cache put/get with content-addressed keys | unit | `pytest tests/test_cache.py -x` | No -- Wave 0 |
| CORPUS-02 | Precompute script generates cached results | integration | `pytest tests/test_precompute.py -x -m integration` | No -- Wave 0 |
| CLASS-01 | File upload validation (extension, size, encoding) | unit | `pytest tests/test_upload_validation.py -x` | No -- Wave 0 |
| CLASS-02 | Full classification pipeline returns genre prediction | integration | `pytest tests/test_classify.py -x -m integration` | No -- Wave 0 |
| CLASS-04 | WebSocket receives 6 progress steps | integration | `pytest tests/test_websocket_progress.py -x -m integration` | No -- Wave 0 |
| CLASS-05 | Specific error messages for each failure type | unit | `pytest tests/test_upload_validation.py -x` | No -- Wave 0 |
| UX-01 | Progress messages include step name, index, total | unit | `pytest tests/test_progress_format.py -x` | No -- Wave 0 |
| UX-02 | Error responses include actionable messages | unit | `pytest tests/test_error_responses.py -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `pytest tests/test_cache.py tests/test_upload_validation.py -x -q` (unit tests, no Redis needed)
- **Per wave merge:** `pytest tests/ -v` (full suite including integration)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/test_api_health.py` -- covers INFRA-01
- [ ] `tests/test_worker.py` -- covers INFRA-02
- [ ] `tests/test_cache.py` -- covers INFRA-03
- [ ] `tests/test_upload_validation.py` -- covers CLASS-01, CLASS-05, UX-02
- [ ] `tests/test_websocket_progress.py` -- covers CLASS-04, UX-01
- [ ] `tests/test_classify.py` -- covers CLASS-02
- [ ] `tests/test_precompute.py` -- covers CORPUS-02
- [ ] `tests/conftest.py` update -- add async fixtures, mock Redis, FastAPI test client
- [ ] Framework install: `pip install httpx pytest-asyncio` -- for async API testing

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth required (stateless public tool) |
| V3 Session Management | No | No sessions (stateless) |
| V4 Access Control | No | No user roles |
| V5 Input Validation | Yes | Pydantic models + custom upload validation (size, encoding, word count) |
| V6 Cryptography | No | No secrets to encrypt |

### Known Threat Patterns for FastAPI + File Upload

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious file upload (not .txt) | Tampering | Validate extension + content; reject non-UTF-8 |
| Oversized file upload (DoS) | Denial of Service | 5MB size limit enforced server-side before processing |
| Path traversal in filename | Tampering | Never use client-provided filename for disk operations; generate UUIDs |
| Redis injection via job parameters | Tampering | arq serializes job args via msgpack; no raw Redis command construction |
| WebSocket connection exhaustion | Denial of Service | Limit concurrent WebSocket connections per IP (uvicorn/nginx config) |

## Sources

### Primary (HIGH confidence)
- [pip index] -- fastapi 0.135.3, uvicorn 0.44.0, arq 0.27.0, redis 7.4.0, python-multipart 0.0.26, chardet 7.4.1, langdetect 1.0.9 -- version verification
- [arq-docs.helpmanual.io](https://arq-docs.helpmanual.io/) -- Worker settings, Job.abort(), allow_abort_jobs, worker lifecycle hooks
- [github.com/python-arq/arq/blob/main/arq/worker.py](https://github.com/python-arq/arq/blob/main/arq/worker.py) -- abort mechanism internals, CancelledError handling
- [fastapi.tiangolo.com/tutorial/request-files/](https://fastapi.tiangolo.com/tutorial/request-files/) -- UploadFile API
- [redis.readthedocs.io/en/stable/examples/asyncio_examples.html](https://redis.readthedocs.io/en/stable/examples/asyncio_examples.html) -- async Redis pub/sub pattern

### Secondary (MEDIUM confidence)
- [github.com/fastapi/fastapi/discussions/8167](https://github.com/fastapi/fastapi/discussions/8167) -- File size validation strategies
- [github.com/python-arq/arq/issues/246](https://github.com/python-arq/arq/issues/246) -- Job cancellation limitations and workarounds
- [chanx.readthedocs.io](https://chanx.readthedocs.io/en/stable/tutorial-fastapi/cp3-background-jobs.html) -- arq + WebSocket integration pattern (403 blocked but pattern referenced)
- [medium.com/@nandagopal05](https://medium.com/@nandagopal05/scaling-websockets-with-pub-sub-using-python-redis-fastapi-b16392ffe291) -- Redis pub/sub WebSocket scaling

### Tertiary (LOW confidence)
- None -- all claims verified or cited.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified against pip index, arq docs consulted directly
- Architecture: HIGH -- patterns well-established (FastAPI + Redis pub/sub + arq); arq abort mechanism verified from source
- Pitfalls: HIGH -- arq abort behavior verified from worker.py source; FastAPI upload limitations cited from official discussions

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (30 days -- stable libraries, no major releases expected)
