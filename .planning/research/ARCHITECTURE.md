# Architecture Research

**Project:** Literary Genre Topology
**Researched:** 2026-04-11
**Overall confidence:** HIGH (well-trodden architecture pattern: FastAPI + Celery + Redis + React)

## Computation Architecture

### The Core Tension

This app has two competing needs: (a) interactive parameter sliders that imply fast feedback, and (b) backend computations that take seconds to minutes. The solution is a **tiered response strategy** based on which parameter changed and how expensive the downstream recomputation is.

### Tiered Recomputation Model

**Tier 1 -- Instant (< 200ms, synchronous HTTP response):**
- Alpha weighting change: just re-concatenates two pre-computed vectors. Pure arithmetic.
- SVM gamma/C change: re-trains SVM on pre-computed feature vectors. Fast on < 1000 samples.
- Visualization projection method change (PCA/UMAP/t-SNE): if pre-computed projections are cached per method, this is a cache lookup.

**Tier 2 -- Fast (1-10s, async with optimistic UI):**
- Persistence image grid resolution change: re-grids from cached persistence diagrams. No homology recomputation needed.
- Sigma (persistence image bandwidth) change: re-kernels from cached diagrams.
- K (cluster count) change: re-clusters from cached embeddings.
- Dimensionality reduction re-run with new parameters (UMAP neighbors, t-SNE perplexity).

**Tier 3 -- Slow (30s-5min, background job with progress streaming):**
- Epsilon-max change: re-runs Vietoris-Rips persistent homology per book. The most expensive step.
- Word2Vec dimensionality or window size change: re-trains the entire Word2Vec model, invalidating everything downstream.
- Corpus change (new book upload or removal): re-trains Word2Vec on the expanded corpus, then cascades.

### Implementation Pattern

- **Tier 1**: Handle in the FastAPI request handler directly. Return result synchronously.
- **Tier 2**: Submit as a Celery task, return task ID immediately, client polls or receives WebSocket push. Show a spinner but keep the UI interactive.
- **Tier 3**: Submit as a Celery task, stream progress updates via WebSocket. Show a progress bar with estimated time. Pre-compute defaults on server startup so the app is immediately usable.

### Precomputed Defaults

On deployment (or corpus change), pre-compute results for a sensible set of default parameters. Users see instant results on first load. Only when they adjust parameters do they trigger recomputation. This is critical for perceived performance.

## Pipeline Caching Strategy

### The Pipeline DAG

```
Word2Vec training (dim, window, corpus)
    |
    v
Per-book TF-IDF (corpus vocabulary)
    |
    v
Per-book weighted point clouds (Word2Vec vectors + TF-IDF weights)
    |
    +---> Persistent homology (epsilon_max, word count filter)
    |         |
    |         v
    |     Persistence images (grid_resolution, sigma)
    |         |
    |         v
    |     Structure feature vector (per book)
    |
    +---> Word clustering (K clusters)
    |         |
    |         v
    |     Location feature vector (per book, TF-IDF distribution across clusters)
    |
    +---> Dimensionality reduction (method, params) --> 3D coordinates for viz
    |
    v
Concatenation (alpha weighting) --> Combined feature vector
    |
    v
SVM training (gamma, C) --> Trained classifier
```

### Cache Key Strategy

Each pipeline step produces output that is a deterministic function of its inputs. The cache key for each step is a hash of its input parameters plus the hash of its upstream cache key. This creates a content-addressed cache where changing any parameter automatically invalidates exactly the right downstream results.

```
cache_key = hash(step_name, upstream_cache_key, step_params)
```

**Example:**
- `w2v_key = hash("word2vec", corpus_hash, dim=100, window=5)`
- `tfidf_key = hash("tfidf", w2v_key, book_id)`
- `homology_key = hash("homology", tfidf_key, epsilon_max=2.0, max_words=500)`
- `persistence_img_key = hash("pers_img", homology_key, grid=20, sigma=0.1)`

### Storage Backend

**Redis** for cache metadata (key lookups, TTL management, task state) and small results (feature vectors, SVM parameters, 3D coordinates).

**Filesystem (or object storage)** for large intermediate results:
- Trained Word2Vec model (~10-100MB depending on corpus/dim)
- Persistence diagrams per book (variable, typically KB to low MB)
- Persistence images per book (~KB)
- Precomputed 3D projection coordinates

Use a `cache/` directory on disk, keyed by content hash. Redis stores the mapping from parameter combinations to file paths.

**Not a database.** This data is all recomputable. If the cache is lost, the system regenerates from raw corpus. No need for durability guarantees beyond what the filesystem provides.

### Cache Eviction

- LRU eviction on the filesystem cache when total size exceeds a configurable limit (e.g., 2GB).
- TTL on Redis keys (e.g., 24 hours for non-default parameter combinations, indefinite for defaults).
- On corpus change: invalidate the entire Word2Vec cache and everything downstream. This is a full recompute event.

## Job Queue Architecture

### Celery + Redis

**Use Celery with Redis as both broker and result backend.** This is the standard, battle-tested stack for Python web apps with long-running computation. RQ is simpler but Celery's workflow primitives (chains, groups, chords) are needed for the pipeline DAG.

**Why Celery over RQ:**
- Pipeline steps have dependencies (chain: Word2Vec -> TF-IDF -> homology -> persistence images)
- Need parallel fan-out (group: compute homology for all books simultaneously across workers)
- Need fan-in (chord: wait for all books' feature vectors, then train SVM)
- Celery handles all of these natively with `chain()`, `group()`, and `chord()`

**Why Redis over RabbitMQ as broker:**
- Already need Redis for caching. One fewer service to operate.
- Redis is simpler to deploy and monitor.
- For this workload (low task volume, long tasks), RabbitMQ's durability advantages are irrelevant. If a task fails, we re-submit it.

### Worker Configuration

- **Concurrency:** Use `prefork` pool (not threads) because computation is CPU-bound (numpy, giotto-tda are GIL-releasing but still CPU-intensive).
- **Worker count:** One worker per CPU core. On a 4-core VPS, run 4 worker processes.
- **Task time limits:** Set `soft_time_limit=600` (10 min) to prevent runaway homology computations. The Vietoris-Rips step on large point clouds can explode; enforce the limit and return an error asking the user to reduce word count or epsilon.
- **Task priorities:** Tier 1 tasks (if any overflow to Celery) get high priority. Tier 3 tasks get low priority so interactive parameter tweaks are not starved.

### Progress Streaming

**WebSocket connection per user session.** When a Tier 2 or Tier 3 task runs:

1. FastAPI endpoint receives parameter change request.
2. FastAPI submits Celery task, gets task ID.
3. FastAPI returns task ID to client via HTTP response.
4. Celery worker updates progress in Redis (`task:{id}:progress = 0.35`).
5. A lightweight asyncio loop on the FastAPI side checks Redis and pushes updates to the client's WebSocket.
6. On completion, the final result (or a URL to fetch it) is pushed over WebSocket.

**Alternative considered:** Server-Sent Events (SSE). Simpler than WebSocket but unidirectional. Since we also need client-to-server messages (parameter changes, cancellation), WebSocket is the right choice.

### Task Cancellation

When a user changes a parameter while a previous computation is still running, the old task should be cancelled (via `task.revoke(terminate=True)`). The new parameter set triggers a fresh computation. Without this, changing a slider rapidly would queue dozens of expensive tasks.

## Data Model

### What Must Be Persisted (survives server restart)

| Data | Format | Storage | Rationale |
|------|--------|---------|-----------|
| Raw corpus text files | `.txt` files | Filesystem (`data/corpus/`) | Source of truth. Cannot be recomputed. |
| Genre labels | JSON manifest | Filesystem (`data/corpus/manifest.json`) | Maps filenames to genres |
| User-uploaded books | `.txt` files | Filesystem (`data/uploads/`) | User data. Must survive restarts. |
| Precomputed default results | Serialized (pickle/numpy) | Filesystem (`cache/defaults/`) | Avoids cold-start recomputation. Regenerable but expensive. |

### What Can Be Recomputed (cache, not persistent)

| Data | Typical Size | Cache Location |
|------|-------------|----------------|
| Trained Word2Vec model | 10-100 MB | `cache/models/` |
| Per-book TF-IDF vectors | KB per book | Redis or `cache/tfidf/` |
| Per-book persistence diagrams | KB-MB per book | `cache/homology/` |
| Per-book persistence images | KB per book | `cache/pers_images/` |
| Word cluster assignments | KB | Redis |
| Feature vectors (structure + location) | KB per book | Redis |
| 3D projection coordinates | KB | Redis |
| Trained SVM model | KB | Redis (pickled) |

### No Traditional Database Needed

This application does not need PostgreSQL or SQLite. The data model is:
- Raw files on disk (corpus).
- Computed artifacts in a content-addressed file cache.
- Ephemeral state in Redis (task queue, cache keys, session data).

Adding a database would be overengineering. If user accounts are added later, that changes; but the project scope explicitly excludes authentication.

## Frontend/Backend Boundary

### Server-Side (Python)

All numerically intensive computation runs on the server:
- Word2Vec training (gensim)
- TF-IDF computation (scikit-learn)
- Persistent homology / Vietoris-Rips (giotto-tda with giotto-ph backend)
- Persistence image generation (giotto-tda)
- Word clustering (scikit-learn KMeans)
- Dimensionality reduction for viz (scikit-learn PCA, umap-learn, openTSNE)
- SVM training and prediction (scikit-learn)
- Feature vector concatenation and normalization

### Client-Side (JavaScript/TypeScript)

All rendering and interaction runs in the browser:
- 3D scatter plot rendering (Three.js via React Three Fiber)
- Vietoris-Rips animation (Three.js -- server sends edge lists at discrete epsilon values, client animates between them)
- Persistence image heatmap rendering (Canvas 2D or a lightweight heatmap library)
- Parameter controls (React UI)
- Genre brightness/size mapping (shader-level: pass TF-IDF weights as vertex attributes)

### The Vietoris-Rips Animation Decision

**Server computes, client renders.** The server pre-computes a sequence of simplicial complexes at discrete epsilon values (e.g., 50-100 steps). It sends the client a JSON payload with:
- Vertex positions (3D projected coordinates)
- For each epsilon step: which edges exist, which triangles exist, birth/death events

The client uses Three.js to animate through these steps as the user drags the epsilon slider. This avoids shipping a computational topology library to the browser while keeping the animation smooth (interpolating between precomputed frames).

### API Surface

**REST endpoints:**
- `GET /api/corpus` -- list books and genres
- `POST /api/upload` -- upload a new book
- `POST /api/compute` -- trigger recomputation with parameter set, returns task ID
- `GET /api/results/{cache_key}` -- fetch computed results (projections, feature vectors, etc.)
- `GET /api/predict/{book_id}` -- get genre prediction for a book
- `GET /api/rips/{book_id}` -- get precomputed Vietoris-Rips animation frames

**WebSocket:**
- `/ws/progress` -- bidirectional channel for task progress updates and parameter change events

## Deployment Architecture

### Single VPS with Docker Compose

For a publicly hosted educational/research tool (not high-traffic SaaS), a single VPS is the right starting point. Over-engineering with Kubernetes or separate microservices adds complexity without proportional benefit at this scale.

**Services (all in one Docker Compose file):**

```
+--------------------------------------------------+
|  VPS (4-8 CPU cores, 8-16 GB RAM recommended)    |
|                                                   |
|  +------------+  +------------+  +-------------+ |
|  |  Nginx     |  |  FastAPI   |  |  Celery     | |
|  |  (reverse  |->|  (uvicorn  |  |  Workers    | |
|  |   proxy +  |  |   2-4      |  |  (4 procs,  | |
|  |   static)  |  |   workers) |  |   prefork)  | |
|  +------------+  +-----+------+  +------+------+ |
|        |               |               |         |
|        |         +-----v------+        |         |
|  +-----v------+  |   Redis    |<-------+         |
|  | Static     |  | (broker +  |                   |
|  | Frontend   |  |  cache +   |                   |
|  | (React     |  |  results)  |                   |
|  |  build)    |  +------------+                   |
|  +------------+                                   |
|                                                   |
|  Filesystem:                                      |
|    /data/corpus/    (bundled + uploaded texts)     |
|    /cache/          (intermediate computation)     |
+--------------------------------------------------+
```

**Why this topology:**
- **Nginx:** Serves the static React frontend build. Reverse-proxies `/api/*` and `/ws/*` to FastAPI. Handles TLS termination.
- **FastAPI + Uvicorn:** 2-4 async workers handle HTTP and WebSocket connections. Light on CPU since heavy work is delegated to Celery.
- **Celery Workers:** 4 prefork workers (one per core) crunch the actual computation. These are the CPU-hungry processes.
- **Redis:** Single instance handles task brokering, result backend, and caching. Memory footprint is small for this workload.

### Resource Sizing

| Component | CPU | RAM | Notes |
|-----------|-----|-----|-------|
| Nginx | Negligible | Negligible | Static file serving |
| FastAPI (uvicorn) | 0.5 core | 512 MB | Async I/O, not CPU-bound |
| Celery workers (x4) | 4 cores | 4-8 GB | Word2Vec + homology are memory-hungry |
| Redis | 0.5 core | 512 MB - 1 GB | Cache + broker |
| **Total** | 4-8 cores | 8-16 GB | A $40-80/mo VPS |

**Recommended providers:** Hetzner (best price/performance for CPU-heavy workloads in Europe), DigitalOcean or Linode for US-based hosting. Avoid AWS/GCP unless cost is not a concern -- a single dedicated VPS outperforms equivalent cloud instances for this workload pattern.

### Concurrent User Handling

With 4 Celery workers, 4 users can run heavy computations simultaneously. Additional users see their tasks queued (with progress updates). For an educational/research tool, this is adequate. If traffic grows, add more workers on the same VPS or scale to a second VPS for workers.

**Key constraint:** Each Vietoris-Rips computation can consume 1-4 GB of RAM depending on point count. With 4 workers at peak, that is 4-16 GB just for homology. This is the memory bottleneck and why enforcing `max_words` limits in the UI is critical.

## Suggested Build Order

### Phase 1: Core Pipeline (CLI)

**Build the computation pipeline as a standalone Python package with no web concerns.**

- Word2Vec training on bundled corpus (gensim)
- Per-book TF-IDF computation
- Persistent homology via giotto-tda (Vietoris-Rips)
- Persistence image generation
- Word clustering
- Feature vector construction (structure + location + alpha concatenation)
- SVM training and cross-validation
- Dimensionality reduction (PCA, UMAP, t-SNE) for visualization coordinates

**Rationale:** Every subsequent phase depends on this working correctly. Build it as importable Python modules with a CLI entry point. Validate the math before adding any web complexity. This phase can be developed and tested entirely locally.

**Dependency:** None. This is the foundation.

### Phase 2: API Layer + Job Queue

**Wrap the pipeline in FastAPI endpoints with Celery for async execution.**

- FastAPI app structure
- Celery + Redis integration
- REST endpoints for triggering computation and fetching results
- Pipeline caching layer (content-addressed cache keys)
- WebSocket progress streaming
- File upload endpoint for new books
- Task cancellation on parameter change

**Rationale:** The API layer is the integration point between computation and visualization. Building it before the frontend means the frontend team (or phase) has a stable API contract to build against.

**Dependency:** Phase 1 (pipeline must exist to wrap it).

### Phase 3: Frontend Core + 3D Visualization

**Build the React frontend with Three.js visualizations.**

- React app scaffold (Vite + TypeScript)
- Parameter control panel (sliders, dropdowns)
- 3D scatter plot with React Three Fiber (word embeddings, genre coloring)
- Genre brightness/size toggle (TF-IDF weighting)
- Projection method switching (PCA/UMAP/t-SNE)
- WebSocket integration for progress streaming
- File upload UI
- Genre prediction display

**Rationale:** Requires API endpoints from Phase 2 to exist. The 3D scatter plot is the primary interaction surface and should be built before the more complex Vietoris-Rips animation.

**Dependency:** Phase 2 (API must exist for the frontend to consume).

### Phase 4: Advanced Visualization + Polish

**Build the remaining visualization features and polish the UX.**

- Animated Vietoris-Rips visualization (epsilon slider, edge/simplex assembly)
- Persistence image heatmap panel (H0/H1/H2 views)
- Per-book slider within genre (subgenre structure exploration)
- Genre comparison view (side-by-side)
- Pipeline explanation / interactive walkthrough
- Responsive layout, loading states, error handling
- Performance optimization (debounce sliders, cancel stale requests)

**Rationale:** These are differentiating features that build on the core visualization. The Rips animation is the most complex frontend component and depends on the server-side Rips frame precomputation from Phase 2.

**Dependency:** Phase 3 (core visualization framework must exist).

### Phase 5: Deployment + Production Hardening

**Dockerize, deploy, and harden for public access.**

- Docker Compose setup (Nginx + FastAPI + Celery + Redis)
- TLS via Let's Encrypt (certbot)
- Rate limiting on upload and compute endpoints
- Memory/time limits on homology computation
- Pre-computation of default parameter results on startup
- Health checks and basic monitoring
- Input sanitization (uploaded text files)

**Rationale:** Deployment is last because it is the thinnest layer over working software. All features should work locally before adding deployment concerns. Pre-computation of defaults (the cold-start problem) is a deployment concern, not a feature concern.

**Dependency:** Phases 1-4 (deploy what works).

### Phase Ordering Rationale

The ordering follows the data dependency chain: **compute -> serve -> render -> enhance -> deploy**. Each phase produces a testable artifact:
1. CLI that processes a corpus and outputs classification results
2. API server that accepts parameters and returns computed results
3. Web app that visualizes results and accepts user input
4. Full-featured interactive exploration tool
5. Publicly accessible deployed application

## Key Architectural Decisions

These decisions are hard to change later and should be made at the start:

### 1. Python Backend Framework: FastAPI

**Decision:** FastAPI over Django or Flask.
**Rationale:** Native async support (critical for WebSocket progress streaming), automatic OpenAPI docs, Pydantic validation, and first-class Celery integration patterns. Django is overkill (no ORM needed, no admin, no auth). Flask could work but lacks native async and type validation.

### 2. Task Queue: Celery with Redis

**Decision:** Celery + Redis, not RQ, not background threads.
**Rationale:** Need workflow primitives (chain, group, chord) for the pipeline DAG. Redis serves triple duty as broker, result backend, and cache -- one service instead of three. Background threads do not survive process restarts and cannot distribute across cores (GIL).

### 3. Frontend: React + TypeScript + React Three Fiber

**Decision:** React with R3F for 3D, not raw Three.js, not Plotly.
**Rationale:** The app is a parameter-driven interactive tool -- React's component model and state management are ideal. R3F wraps Three.js in React's declarative model, making it maintainable. Raw Three.js would require imperative scene management alongside React state, creating two sources of truth. Plotly lacks the custom shader/animation control needed for the Rips visualization.

### 4. Persistent Homology Library: giotto-tda

**Decision:** giotto-tda (which uses giotto-ph backend), not ripser.py directly.
**Rationale:** giotto-ph is faster than Ripser v1.2 on multi-core systems (lockfree parallel implementation). giotto-tda provides a scikit-learn-compatible API and includes persistence image generation, so it handles both the homology computation and the featurization step.

### 5. No Database

**Decision:** Filesystem + Redis, no PostgreSQL/SQLite.
**Rationale:** All persistent data is files (corpus text, cached computation artifacts). All ephemeral state is in Redis (task queue, progress, cache keys). Adding a relational database adds operational complexity (migrations, backups, connection pooling) for zero benefit. Revisit only if user accounts are added.

### 6. Monolith, Not Microservices

**Decision:** Single deployable unit (Docker Compose on one VPS).
**Rationale:** The application has one purpose, one team, and moderate traffic expectations. Microservices add network hops, deployment complexity, and debugging difficulty. A monolith with well-separated Python modules (pipeline, api, cache) achieves the same code organization without the operational tax.

### 7. Content-Addressed Caching

**Decision:** Cache keys are deterministic hashes of (step_name + input_params + upstream_cache_key).
**Rationale:** This makes cache invalidation automatic and correct. Changing any parameter in the pipeline produces a new cache key for that step and all downstream steps, while unchanged branches remain cached. No manual invalidation logic needed.

## Sources

- [Celery + Redis + FastAPI Production Guide 2025](https://medium.com/@dewasheesh.rana/celery-redis-fastapi-the-ultimate-2025-production-guide-broker-vs-backend-explained-5b84ef508fa7)
- [Python Background Tasks 2025: Celery vs RQ vs Dramatiq](https://devproportal.com/languages/python/python-background-tasks-celery-rq-dramatiq-comparison-2025/)
- [Choosing the Right Python Task Queue](https://judoscale.com/blog/choose-python-task-queue)
- [FastAPI WebSockets and Async Tasks](https://blog.poespas.me/posts/2025/03/05/fastapi-websockets-asynchronous-tasks/)
- [FastAPI Best Practices: Production Patterns 2025](https://orchestrator.dev/blog/2025-1-30-fastapi-production-patterns/)
- [Deploying ML Models with FastAPI and Celery](https://towardsdatascience.com/deploying-ml-models-in-production-with-fastapi-and-celery-7063e539a5db/)
- [Pipeline Caching: Storing Intermediate Results](https://softwarepatternslexicon.com/machine-learning/infrastructure-and-scalability/workflow-management/pipeline-caching/)
- [giotto-ph: High-Performance Persistent Homology](https://arxiv.org/abs/2107.05412)
- [giotto-tda Documentation](https://giotto-ai.github.io/gtda-docs/latest/modules/generated/homology/gtda.homology.VietorisRipsPersistence.html)
- [React Three Fiber vs Three.js in 2026](https://graffersid.com/react-three-fiber-vs-three-js/)
- [Asynchronous Tasks with FastAPI and Celery (TestDriven.io)](https://testdriven.io/blog/fastapi-and-celery/)
- [FastAPI + PostgreSQL + Celery Docker Compose Setup](https://oneuptime.com/blog/post/2026-02-08-how-to-set-up-a-fastapi-postgresql-celery-stack-with-docker-compose/view)
