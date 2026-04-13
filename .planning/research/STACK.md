# Stack Research

**Project:** Literary Genre Topology
**Researched:** 2026-04-11
**Overall confidence:** HIGH

## Recommendation Summary

| Layer | Recommended | Version | Runner-up | Rejected |
|-------|-------------|---------|-----------|----------|
| Persistent Homology | giotto-tda | 0.6.2 | ripser.py + persim | GUDHI (verbose API) |
| Persistence Images | persim (via scikit-tda) | 0.3.8 | giotto-tda built-in | Manual implementation |
| Word2Vec | gensim | 4.4.0 | -- | PyTorch (overkill), fasttext (wrong focus) |
| TF-IDF | scikit-learn TfidfVectorizer | 1.8.x | -- | Manual implementation |
| Dimensionality Reduction | umap-learn + openTSNE + scikit-learn | 0.5.x / 1.0.x / 1.8.x | -- | sklearn TSNE (too slow) |
| SVM | scikit-learn SVC (RBF) | 1.8.x | -- | -- |
| Backend Framework | FastAPI | 0.135.x | -- | Flask (no native async), Django (too heavy) |
| Task Queue | arq | 0.26.x | Celery | RQ (no async) |
| 3D Visualization | Three.js via react-three-fiber | R3F 9.x / Three.js r170+ | Plotly.js | Babylon.js (overkill), deck.gl (wrong use case) |
| Frontend Framework | React | 19.x | Svelte | Vue (no advantage here) |
| Deployment | Fly.io | -- | Railway | Render (compute limits) |
| Python Version | 3.12 | 3.12.x | 3.11 | 3.13 (ecosystem gaps) |

---

## Persistent Homology

**Recommendation: giotto-tda 0.6.2 + persim 0.3.8**
**Confidence: HIGH**

### Why giotto-tda

giotto-tda is the clear winner for this project for one critical reason: it has a built-in `WeightedRipsPersistence` transformer that natively supports weighted Vietoris-Rips filtrations. This maps directly to the TF-IDF weighted point cloud requirement. The class accepts custom 1D arrays of vertex weights or distance-to-measure (DTM) reweighting, and follows scikit-learn transformer conventions (`fit`, `transform`, `fit_transform`).

Performance-wise, giotto-tda uses giotto-ph as its backend, which benchmarks faster than Ripser v1.2 across all dataset sizes. giotto-ph's lockfree multicore implementation surpasses even GPU-accelerated Ripser++ when using 5-10 CPU cores -- relevant since server-side computation will have multiple cores available.

giotto-tda 0.6.2 ships with Python 3.12 wheels. No compilation from source required.

### Why persim for persistence images

persim 0.3.8 from the scikit-tda ecosystem provides `PersistenceImager` with configurable:
- `pixel_size` (grid resolution control -- directly maps to the "configurable grid resolution" requirement)
- `birth_range` and `pers_range` (domain bounds)
- `weight` function (default: persistence-weighted)
- `kernel` (default: Gaussian CDF)

Attribute updates dynamically propagate to dependent parameters. The output is a flat vector suitable for direct concatenation with the word-cluster distribution vector before SVM training.

giotto-tda also has built-in persistence image support, but persim's API is more explicit about grid resolution control and is the established standard in the scikit-tda ecosystem.

### What NOT to use

- **GUDHI**: Comprehensive but verbose API designed for computational geometry researchers, not ML pipelines. No scikit-learn-compatible transformer interface. No native weighted Rips support matching giotto-tda's convenience.
- **ripser.py alone**: Fast for unweighted Rips, but weighted filtration support is less mature than giotto-tda's `WeightedRipsPersistence`. Would require manual weight handling.
- **ripser++**: GPU-accelerated but harder to install, and giotto-ph matches or exceeds it on multi-core CPU.

### Gotchas

- Vietoris-Rips is O(n^2) to O(n^3) in point count. For a 10k-word vocabulary, even after TF-IDF filtering to top-k words per book, expect the Rips computation to take seconds to minutes per book depending on `max_edge_length` (epsilon_max). This MUST be a configurable parameter with a sane default.
- H2 (2-dimensional holes / voids) computation is much more expensive than H0/H1. Consider making H2 optional or computing it only on demand.
- Memory usage scales with the number of simplices. Set `max_edge_length` conservatively to avoid blowup.

### Installation

```bash
pip install giotto-tda==0.6.2 persim==0.3.8
```

### Sources

- [giotto-tda PyPI](https://pypi.org/project/giotto-tda/)
- [WeightedRipsPersistence docs](https://giotto-ai.github.io/gtda-docs/latest/modules/generated/homology/gtda.homology.WeightedRipsPersistence.html)
- [giotto-ph benchmarks](https://arxiv.org/abs/2107.05412)
- [persim PersistenceImager docs](https://persim.scikit-tda.org/en/latest/reference/stubs/persim.PersistenceImager.html)
- [ripser.py PyPI](https://pypi.org/project/ripser/)

---

## Word2Vec

**Recommendation: gensim 4.4.0**
**Confidence: HIGH**

### Why gensim

gensim is the standard Python library for Word2Vec and gives the most control over skip-gram parameters:

- `sg=1` for skip-gram (vs. CBOW)
- `vector_size`: embedding dimensionality (directly controls the N-D space for persistent homology)
- `window`: context window size
- `min_count`: minimum word frequency threshold
- `negative`: number of negative samples
- `ns_exponent`: negative sampling distribution exponent
- `alpha` / `min_alpha`: learning rate schedule
- `epochs`: training iterations
- `workers`: parallel training threads

All of these should be exposed as UI parameters (with sane defaults) since the project requires "all numerical parameters exposed as live UI controls."

gensim 4.4.0 supports Python 3.12, ships with precompiled wheels, and has a stable, well-documented API.

### What NOT to use

- **fastText (via gensim or Facebook's fasttext)**: Designed for character n-gram subword embeddings. Useful for morphologically rich languages and OOV words -- neither is relevant here. English corpus, closed vocabulary. FastText's subword information adds model size and training time with no benefit for this use case.
- **PyTorch nn.Embedding + custom skip-gram loop**: Gives maximum control but requires implementing the entire training loop (negative sampling, subsampling, learning rate decay). Weeks of work for no practical benefit over gensim's battle-tested implementation.

### Gotchas

- gensim's Word2Vec trains in-memory. For a corpus of ~50-200 books, this is fine. For thousands of books, monitor RAM.
- The `workers` parameter benefits from setting `PYTHONHASHSEED=0` for reproducibility.
- Model serialization: use `model.save()` / `Word2Vec.load()` for full model (allows continued training), or `model.wv.save_word2vec_format()` for export.
- Re-training on parameter change is expensive. Cache trained models keyed by parameter hash.

### Installation

```bash
pip install gensim==4.4.0
```

### Sources

- [gensim Word2Vec docs](https://radimrehurek.com/gensim/models/word2vec.html)
- [gensim PyPI](https://pypi.org/project/gensim/)

---

## TF-IDF

**Recommendation: scikit-learn TfidfVectorizer (part of scikit-learn 1.8.x)**
**Confidence: HIGH**

### Why scikit-learn

`TfidfVectorizer` is the industry standard. It handles tokenization, vocabulary building, and TF-IDF computation in one pass. Key parameters to expose:

- `max_features`: vocabulary size cap (critical performance lever for persistent homology downstream)
- `max_df` / `min_df`: document frequency thresholds
- `sublinear_tf`: whether to apply `1 + log(tf)` (recommended: True)
- `norm`: L1 or L2 normalization
- `use_idf`, `smooth_idf`: IDF computation variants

The output sparse matrix can be converted to per-book weight vectors over the shared vocabulary, which then weight the Word2Vec point cloud.

### Critical architectural note

TF-IDF must be computed WITHOUT genre labels (per PROJECT.md constraints). This means fitting `TfidfVectorizer` on the entire corpus treating each book as a document, NOT per-genre. The IDF component reflects corpus-wide document frequency, making high-TF-IDF words book-distinctive rather than genre-distinctive. This prevents circular dependency.

### Gotchas

- The default tokenizer strips single-character words and applies basic lowercasing. For literary text, you may want a custom `tokenizer` or `preprocessor` to handle contractions, proper nouns, etc.
- `TfidfVectorizer` returns sparse matrices. When constructing per-book weighted point clouds, you need to convert to dense for the subset of words that appear in each book.
- Vocabulary must be shared between the TF-IDF vectorizer and the Word2Vec model. Build Word2Vec first, then restrict TF-IDF vocabulary to words present in the Word2Vec model.

### Installation

Already included with scikit-learn:
```bash
pip install scikit-learn>=1.8
```

---

## Dimensionality Reduction (for Visualization Only)

**Recommendation: scikit-learn (PCA, Kernel PCA) + umap-learn (UMAP) + openTSNE (t-SNE)**
**Confidence: HIGH**

### PCA and Kernel PCA: scikit-learn

`sklearn.decomposition.PCA` and `sklearn.decomposition.KernelPCA` are the only reasonable choices. Fast, well-tested, deterministic (PCA) or configurable (Kernel PCA with RBF/poly/cosine kernels).

For Kernel PCA, expose: `kernel` type, `gamma`, `degree`, `n_components=3`.

### UMAP: umap-learn 0.5.x

umap-learn is the standard UMAP implementation. Completes embedding of 70k samples in under a minute vs. 45 minutes for sklearn t-SNE. Key parameters to expose:

- `n_neighbors`: local vs. global structure balance
- `min_dist`: how tightly points cluster
- `metric`: distance metric (cosine recommended for word embeddings)
- `n_components=3`

Install `pynndescent` alongside for optimal nearest-neighbor performance on multicore.

### t-SNE: openTSNE 1.0.x

openTSNE is 20x faster than sklearn's TSNE implementation. Uses interpolation-based approximation (FIt-SNE) instead of Barnes-Hut, scaling much better to large vocabularies. Key parameters to expose:

- `perplexity`: local neighborhood size
- `learning_rate`: optimization step size
- `n_iter`: iteration count
- `metric`: distance metric

### What NOT to use

- **sklearn.manifold.TSNE**: Unacceptably slow for 10k+ points. Barnes-Hut approximation does not scale. openTSNE is a drop-in replacement with 20x speedup.

### Gotchas

- All 3D projections are for visualization only. Persistent homology MUST run in full N-D space, never on projected coordinates. This is a mathematical invariant of the project.
- UMAP and t-SNE are stochastic. Set `random_state` for reproducibility, but warn users that re-runs may produce different layouts.
- Kernel PCA with RBF kernel on 100k points can be slow (O(n^2) kernel matrix). Consider subsampling for interactive use.
- UMAP requires `numba`, which adds to dependency weight but is already a transitive dependency of several other packages.

### Installation

```bash
pip install umap-learn>=0.5.7 pynndescent openTSNE>=1.0
# scikit-learn already installed
```

### Sources

- [umap-learn performance](https://umap-learn.readthedocs.io/en/latest/performance.html)
- [openTSNE GitHub](https://github.com/pavlin-policar/openTSNE)
- [openTSNE 20x speedup](https://blog.dailydoseofds.com/p/effortlessly-scale-tsne-to-millions)

---

## SVM

**Recommendation: scikit-learn SVC with RBF kernel**
**Confidence: HIGH**

### Why scikit-learn SVC

`sklearn.svm.SVC(kernel='rbf')` is the right tool. SVM with RBF kernel is specifically designed for:
- Small datasets (relies only on support vectors near decision boundary)
- High-dimensional feature vectors (the concatenated persistence image + word-cluster distribution vector)
- Nonlinear decision boundaries in feature space

Key parameters to expose:
- `C`: regularization (higher = less regularization, risk of overfitting)
- `gamma`: RBF kernel bandwidth ('scale' or 'auto' or explicit float)
- `class_weight`: 'balanced' for imbalanced genre distributions

### Cross-validation

With small datasets (5-20 books per genre), use `LeaveOneOut` cross-validation as specified in PROJECT.md. `sklearn.model_selection.LeaveOneOut` + `cross_val_score` handles this.

### Gotchas

- `probability=True` enables Platt scaling for confidence scores but uses internal CV, producing slightly different results than `predict()`. On very small datasets, probability estimates may be unreliable -- document this.
- Feature normalization is critical before SVM. Both the persistence image vector and word-cluster distribution vector must be independently normalized (L2 or StandardScaler) before concatenation with alpha weighting.
- Use `C-ordered numpy.ndarray` with `dtype=float64` for optimal SVC performance.
- GridSearchCV over `C` and `gamma` is essential. Use `StratifiedKFold` inside `GridSearchCV` (not LeaveOneOut, which is too expensive for hyperparameter search).

### Installation

Already included with scikit-learn.

---

## Backend Framework

**Recommendation: FastAPI 0.135.x**
**Confidence: HIGH**

### Why FastAPI

FastAPI wins on every criterion for this project:

1. **Native async**: Built on ASGI (Starlette), handles concurrent requests without blocking. Critical when multiple users trigger recomputation simultaneously.
2. **WebSocket support**: Native `@app.websocket()` decorator. Required for live parameter updates -- when a user drags a slider, the browser sends a WebSocket message, server recomputes, streams result back. No polling.
3. **Background tasks**: Built-in `BackgroundTasks` for lightweight work, plus clean integration with arq for heavy computation.
4. **File upload**: `UploadFile` class with streaming support for book text file uploads.
5. **Auto-generated API docs**: OpenAPI/Swagger UI out of the box -- useful during development.
6. **Type validation**: Pydantic models validate all parameter inputs automatically.
7. **Performance**: Benchmarks at 15-20k req/s vs Flask's 2-3k req/s. Handles 3,200 concurrent WebSocket connections per instance.

### What NOT to use

- **Flask**: WSGI-based. Async support is bolted on (runs async in a per-request loop). WebSocket requires Flask-SocketIO (Socket.IO protocol, not native WebSocket). Benchmarks at 2,100 concurrent WebSocket connections vs. FastAPI's 3,200.
- **Django**: Full-featured ORM, admin panel, auth system -- none of which this project needs. Django Channels adds WebSocket support but with significant complexity. Overkill.

### Architecture pattern

```
FastAPI app
  /api/upload          POST   - Upload book text file
  /api/train           POST   - Trigger Word2Vec training
  /api/compute/{book}  POST   - Trigger persistent homology for a book
  /api/classify/{book} GET    - Get SVM classification result
  /api/project         GET    - Get projection data (PCA/UMAP/tSNE)
  /ws/parameters       WS     - Live parameter updates + result streaming
  /ws/progress         WS     - Computation progress updates
```

### Installation

```bash
pip install "fastapi[standard]>=0.135"
```

The `[standard]` extra includes uvicorn, pydantic, and other essentials.

### Sources

- [FastAPI vs Flask 2025](https://syntha.ai/blog/flask-vs-fastapi-a-complete-2025-comparison-for-python-web-development)
- [FastAPI PyPI](https://pypi.org/project/fastapi/)

---

## Task Queue

**Recommendation: arq 0.26.x**
**Confidence: MEDIUM**

### Why arq

arq is purpose-built for asyncio Python applications:

1. **Native async**: Designed from the ground up for `asyncio`, making it a natural extension of FastAPI's event loop. No bridging between sync and async worlds.
2. **Redis-backed**: Simple, fast, reliable message broker. Redis is also useful for caching computed results (projection data, persistence diagrams).
3. **Lightweight**: Minimal configuration. Define async worker functions, enqueue jobs, done.
4. **Result storage**: Built-in result backend in Redis -- retrieve job results by ID.

### Why not Celery

Celery is battle-tested and scales to millions of tasks, but:
- Built for synchronous code. Using it with FastAPI's async requires `sync_to_async` bridges.
- Heavier operational overhead (needs RabbitMQ or Redis, Flower for monitoring, complex configuration).
- For this project's scale (tens of concurrent users, not thousands), arq's simplicity wins.

### Why the confidence is MEDIUM

arq is less battle-tested than Celery. If the project scales to heavy concurrent usage, Celery's retry mechanisms, task routing, and monitoring (Flower) become more valuable. For the initial deployment targeting a portfolio/demo project, arq is the right choice. Migrate to Celery only if arq's limitations surface.

### Architecture

```
FastAPI server --> enqueue job --> Redis --> arq worker process
     ^                                          |
     |______ WebSocket progress update _________|
```

The arq worker runs as a separate process. Heavy computation (Word2Vec training, persistent homology, SVM training) happens in the worker. The FastAPI server streams progress updates to the browser via WebSocket.

### Installation

```bash
pip install arq>=0.26
# Redis required (managed Redis on Fly.io via Upstash or similar)
```

### Sources

- [arq vs Celery for FastAPI](https://medium.com/@komalbaparmar007/fastapi-background-tasks-vs-celery-vs-arq-picking-the-right-asynchronous-workhorse-b6e0478ecf4a)
- [FastAPI + arq integration](https://davidmuraya.com/blog/fastapi-background-tasks-arq-vs-built-in/)

---

## 3D Visualization

**Recommendation: Three.js via react-three-fiber (R3F)**
**Confidence: HIGH**

### Why Three.js / react-three-fiber

This project has three distinct visualization needs, and Three.js handles all of them:

**1. Interactive 3D scatter plots (10k-100k word points)**
- Use `InstancedMesh` or `Points` (WebGL `gl.POINTS`) for rendering 100k+ points at 60fps.
- `InstancedMesh` allows per-point color, size, and opacity control -- required for TF-IDF brightness/size encoding and genre highlighting.
- react-three-fiber wraps Three.js in React's component model, making it natural to bind point properties to React state (which is driven by parameter sliders).

**2. Animated Vietoris-Rips filtration**
- Edges appearing as epsilon increases: render with `LineSegments` geometry, dynamically adding edges as the epsilon slider moves.
- Three.js gives direct control over geometry buffers for efficient edge addition/removal.
- No other library provides this level of control for custom animated geometric primitives.

**3. Persistence image heatmaps**
- 2D heatmaps can be rendered as `PlaneGeometry` with a `DataTexture` mapped to a color gradient, or more simply as a 2D canvas overlay using a lightweight charting library (e.g., a simple canvas-based heatmap).

### Why not Plotly.js

Plotly.js renders 3D scatter plots via WebGL and handles 100k points with `Scatter3d`. However:
- **No custom geometry**: Cannot render arbitrary edge sets for Vietoris-Rips animation. Plotly's 3D is limited to scatter, surface, mesh, and line traces.
- **Limited interactivity**: Camera controls and hover tooltips are good, but no programmatic animation of individual geometric elements.
- **WebGL context limits**: Plotly can consume multiple WebGL contexts per figure. Browsers limit to 8-16 contexts total. With multiple visualization panels (scatter + Rips + heatmap), this is a real constraint.

Plotly is excellent for static scientific plots but wrong for this project's interactive, animated requirements.

### Why not Babylon.js or deck.gl

- **Babylon.js**: Full game engine. Massive bundle size, steep learning curve, designed for 3D scenes with physics/lighting/materials. Overkill for data visualization.
- **deck.gl**: Designed for geospatial data on maps. Wrong abstraction for word embedding space visualization.

### react-three-fiber specifics

react-three-fiber (R3F) is the React renderer for Three.js. Benefits:
- Declarative: 3D scene is React components, state changes trigger re-renders of only affected objects.
- `@react-three/drei` provides pre-built helpers: `OrbitControls` (camera), `Html` (DOM overlays in 3D), `Instances` (efficient instanced rendering).
- `@react-three/postprocessing` for effects if needed (bloom for highlighted points).
- Hooks: `useFrame` for animation loops, `useThree` for renderer/camera access.

### Performance strategy for 100k points

```javascript
// Use InstancedMesh for per-point control (color, size, opacity)
<instancedMesh args={[geometry, material, pointCount]}>
  // Update instanceMatrix and instanceColor buffers directly
  // Trigger needsUpdate on buffer attributes, not React re-render
</instancedMesh>
```

For the Vietoris-Rips edge animation, use `BufferGeometry` with pre-allocated edge buffer and toggle visibility via draw range.

### Installation

```bash
npm install three @react-three/fiber @react-three/drei
```

### Sources

- [R3F point cloud example](https://codesandbox.io/s/three-fiber-point-cloud-6q2wh)
- [Three.js point cloud visualization](https://betterprogramming.pub/point-clouds-visualization-with-three-js-5ef2a5e24587)
- [react-three-fiber docs](https://r3f.docs.pmnd.rs/getting-started/examples)

---

## Frontend Framework

**Recommendation: React 19.x**
**Confidence: HIGH**

### Why React

For this specific project, React wins over Svelte despite Svelte's raw performance advantages:

1. **react-three-fiber**: The best Three.js integration in any framework. Svelte has `threlte`, but R3F is more mature, better documented, and has a larger ecosystem (`@react-three/drei`, `@react-three/postprocessing`).
2. **Parameter-heavy UI**: React's state management (useState/useReducer + context, or Zustand for global state) handles complex interdependent parameter state well. When one slider changes, only dependent visualizations re-render.
3. **Ecosystem**: Pre-built slider/input components (Radix UI, shadcn/ui), WebSocket hooks (react-use-websocket), state management (Zustand).
4. **Concurrent rendering**: React 19's concurrent features allow non-blocking UI updates while heavy state changes propagate. When a user drags a slider rapidly, intermediate states can be batched.

### Supporting libraries

| Library | Purpose |
|---------|---------|
| Zustand | Global state management for parameters + computed results |
| react-use-websocket | WebSocket connection to FastAPI backend |
| @radix-ui/react-slider | Accessible slider components |
| shadcn/ui | Component library built on Radix primitives |
| Vite | Build tool (fast HMR, ESM-native) |
| TypeScript | Type safety across parameter definitions and API contracts |

### What NOT to use

- **Svelte**: Better raw DOM performance and smaller bundles, but `threlte` (Svelte's Three.js wrapper) is less mature than R3F. The Three.js integration is the deciding factor here.
- **Vue**: No compelling advantage over React for this use case. `TresJS` (Vue Three.js wrapper) exists but is even less mature than threlte.

### Installation

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install zustand react-use-websocket @radix-ui/react-slider
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three
```

### Sources

- [Svelte vs React 2025](https://dev.to/paulthedev/svelte-vs-react-in-2025-the-ultimate-showdown-for-future-proof-frontend-development-5694)
- [react-three-fiber](https://r3f.docs.pmnd.rs/)

---

## Deployment

**Recommendation: Fly.io**
**Confidence: MEDIUM**

### Why Fly.io

1. **Separate web + worker processes**: Fly.io natively supports running multiple process types (web server + arq worker) as separate machines within the same app. This is the architecture this project needs.
2. **Pay-per-second compute**: Background workers only cost money when actively computing. For a demo/portfolio project with sporadic usage, this is significantly cheaper than always-on instances.
3. **Persistent volumes**: $0.15/GB/month for storing trained models, corpus data, and cached results. Models persist across deployments.
4. **Redis via Upstash**: Fly.io integrates with Upstash for managed Redis (arq's message broker). Free tier covers low-traffic usage.
5. **Docker-based**: Deploy any Python environment via Dockerfile. No platform-specific buildpack constraints.

### Pricing estimate (low-traffic demo)

| Resource | Spec | Est. Cost/mo |
|----------|------|-------------|
| Web server | shared-cpu-1x, 512MB | ~$3.50 |
| Worker (on-demand) | shared-cpu-2x, 1GB | ~$5-15 (usage-based) |
| Persistent volume | 3GB | $0.45 |
| Redis (Upstash) | Free tier | $0 |
| **Total** | | **~$10-20/mo** |

### Why not alternatives

- **Render**: Simpler but background workers run on always-on instances (no scale-to-zero). More expensive for sporadic compute. Free tier spins down after 15 min inactivity with cold start delays.
- **Railway**: Usage-based pricing (good), but less control over machine specs and networking. Better for simpler apps.
- **AWS**: Maximum flexibility but massive operational overhead for a single-developer project. ECS/Fargate + SQS + S3 is the right architecture but wrong complexity level.

### Why the confidence is MEDIUM

Fly.io has had reliability issues reported in 2024-2025 (occasional outages, networking problems). For a portfolio/demo project this is acceptable. For production-critical deployment, Railway or AWS would be safer. Monitor Fly.io's status page.

### Deployment architecture

```
Fly.io
  Machine 1: FastAPI web server (uvicorn)
    - Serves API + WebSocket connections
    - Enqueues heavy jobs to arq via Redis
    - Serves static frontend (or separate CDN)
  
  Machine 2: arq worker (scales to 0 when idle)
    - Word2Vec training
    - Persistent homology computation
    - SVM training/prediction
    - Writes results to Redis + persistent volume
  
  Upstash Redis:
    - arq message broker
    - Result cache (projections, persistence diagrams)
  
  Persistent Volume (3GB):
    - Trained Word2Vec models
    - Bundled corpus
    - Cached persistence diagrams
```

### Sources

- [Fly.io pricing](https://fly.io/pricing)
- [Fly.io Python async workers](https://fly.io/blog/python-async-workers-on-fly-machines/)
- [Platform comparison](https://codeyaan.com/blog/top-5/railway-vs-render-vs-flyio-comparison-2624)

---

## Full Dependency Summary

### Python (backend)

```bash
# Core ML/TDA pipeline
pip install gensim==4.4.0
pip install scikit-learn>=1.8
pip install giotto-tda==0.6.2
pip install persim==0.3.8
pip install numpy scipy

# Dimensionality reduction
pip install umap-learn>=0.5.7 pynndescent
pip install openTSNE>=1.0

# Web framework + task queue
pip install "fastapi[standard]>=0.135"
pip install arq>=0.26
pip install redis

# Utilities
pip install python-multipart  # file uploads
pip install orjson             # fast JSON serialization for large arrays
```

### JavaScript (frontend)

```bash
npm install react react-dom
npm install three @react-three/fiber @react-three/drei
npm install zustand
npm install react-use-websocket
npm install @radix-ui/react-slider
```

---

## Critical Warnings

### 1. Vietoris-Rips computational explosion

The single biggest risk in this project. Rips complex construction on N points is O(n^2) for H0, O(n^3) for H1, and worse for H2. With a 10k-word vocabulary:
- **Mitigation 1**: TF-IDF filtering to top-k words per book (k=200-500 is a reasonable range)
- **Mitigation 2**: Configurable `max_edge_length` (epsilon_max) to limit simplex construction
- **Mitigation 3**: Make H2 computation optional (off by default)
- **Mitigation 4**: Progress reporting via WebSocket so users know computation is running, not hung
- **Without these mitigations**: A single persistent homology computation could take 10+ minutes or exhaust server memory.

### 2. Word2Vec retraining is expensive

When a user changes Word2Vec parameters (vector_size, window, etc.), the entire model must retrain. This invalidates ALL downstream computations (TF-IDF weighting, point clouds, persistent homology, projections, SVM).
- **Mitigation**: Cache trained models keyed by parameter hash. Warn users that Word2Vec parameter changes trigger full pipeline recomputation.
- **UX**: Clearly separate "model parameters" (expensive to change) from "visualization parameters" (cheap to change).

### 3. WebSocket state management complexity

Live parameter updates via WebSocket create complex state synchronization between browser and server. A user dragging a slider rapidly can flood the server with recomputation requests.
- **Mitigation**: Debounce slider inputs (200-300ms). Cancel in-flight computations when new parameters arrive. Use request IDs to discard stale results.

### 4. Persistence image + word-cluster vector normalization

The alpha-weighted concatenation of persistence image vectors and word-cluster distribution vectors is mathematically sensitive to normalization. If one vector dominates in magnitude, the SVM will effectively ignore the other.
- **Mitigation**: Independently L2-normalize (or StandardScaler) each vector before concatenation. Expose alpha as a UI parameter so users can see the effect.

### 5. Three.js memory leaks

Three.js geometries, materials, and textures must be explicitly disposed when no longer needed. React-three-fiber helps with automatic cleanup on unmount, but custom buffer geometries (used for Vietoris-Rips edges) need manual disposal.
- **Mitigation**: Use R3F's `useEffect` cleanup functions. Profile memory in Chrome DevTools during development.

### 6. Python 3.12, not 3.13

Python 3.13 has compatibility issues with some scientific computing packages (gensim has open issues for 3.13). Stick with 3.12 for maximum ecosystem compatibility. All recommended packages have 3.12 wheels.

---

*Stack research: 2026-04-11*
