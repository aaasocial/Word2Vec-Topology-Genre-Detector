# Research Summary — Literary Genre Topology

**Synthesized:** 2026-04-11
**Sources:** STACK.md · FEATURES.md · ARCHITECTURE.md · PITFALLS.md

---

## Executive Summary

Literary Genre Topology applies Topological Data Analysis (TDA) to word embedding geometry: per-book Word2Vec point clouds filtered by TF-IDF are fed through Vietoris-Rips persistent homology to extract topological "fingerprints," then classified by genre via SVM. The approach is technically feasible with well-supported Python libraries. The entire project hinges on one existential question that must be answered before any web infrastructure is built: **does persistent homology produce distinguishable genre signals at the corpus sizes being contemplated (30-50 books)?**

The recommended stack is mature and well-integrated. The one genuinely non-standard requirement — TF-IDF-weighted Vietoris-Rips filtration — requires a custom distance matrix modification rather than any built-in library feature. The two biggest risks are mathematical and statistical, not engineering.

---

## Recommended Stack

| Layer | Choice | Version | Rationale |
|-------|--------|---------|-----------|
| Persistent Homology | giotto-tda | 0.6.2 | giotto-ph backend outperforms Ripser on multi-core; scikit-learn API |
| Persistence Images | persim (scikit-tda) | 0.3.8 | Explicit grid resolution control; flat vector output for SVM |
| Word2Vec | gensim | 4.4.0 | Battle-tested skip-gram; full parameter exposure; 3.12 wheels |
| TF-IDF | scikit-learn TfidfVectorizer | 1.8.x | Must be fit without genre labels to avoid circular dependency |
| Dimensionality Reduction | umap-learn + openTSNE + scikit-learn PCA | 0.5.x / 1.0.x / 1.8.x | Visualization only; openTSNE is 20× faster than sklearn TSNE |
| SVM | scikit-learn SVC (RBF) | 1.8.x | Optimal for small datasets + high-dimensional features |
| Backend | FastAPI | 0.135.x | Native async, WebSocket, Pydantic validation |
| Task Queue | arq + Redis | 0.26.x | Async-native, lightweight for demo scale (Celery alternative if DAG grows complex) |
| 3D Visualization | Three.js via react-three-fiber | R3F 9.x | Only option with custom geometry for Vietoris-Rips edge animation |
| Frontend | React 19 + TypeScript | 19.x | R3F ecosystem is the deciding factor |
| Deployment | Fly.io | — | Separate web+worker machines; scale-to-zero workers; ~$10-20/mo |
| Python | 3.12 | 3.12.x | 3.13 has open gensim issues; all packages have 3.12 wheels |

---

## Architecture Pattern

The application uses a **tiered recomputation model** over a **content-addressed pipeline cache**.

The pipeline is a DAG: Word2Vec → TF-IDF (per book) → weighted point clouds → (parallel) persistent homology + word clustering + dimensionality reduction → feature vector concatenation → SVM. Each node's cache key is `hash(step_name, upstream_key, step_params)`, so changing any parameter invalidates exactly the right downstream nodes while leaving unaffected branches cached.

Parameter changes are tiered by cost:
- **Instant** (<100ms): projection toggle, point size, color — update immediately
- **Fast** (100ms–2s): TF-IDF threshold, brightness, genre toggle — debounce 200ms
- **Slow** (2s–30s): persistence image resolution, σ, K, α, SVM params — explicit Recompute button
- **Very slow** (30s+): Word2Vec retraining — warning + confirm step

The Vietoris-Rips animation follows server-computes/client-renders: the server pre-computes edge lists at 50-100 discrete epsilon steps and ships them as JSON; the browser animates with Three.js BufferGeometry.

---

## Table Stakes Features

Features whose absence would make the tool feel broken:
- Staged progress indicators naming each pipeline step (not just a spinner)
- 3D scatter with genre color coding, orbit/pan/zoom, click-to-inspect, hover tooltip
- TF-IDF brightness and size encoding (the signature visual)
- Projection method switching (PCA / UMAP / t-SNE / Kernel PCA)
- Reset camera button + R shortcut (users will get disoriented)
- Linked views (select book in one panel → all panels update)
- Persistence image heatmap with H₀/H₁/H₂ tabs
- Actionable error messages ("Text contains only 150 unique words, minimum 500" — not "Processing error")
- Export PNG/SVG/CSV for researchers
- Loading states that distinguish pipeline stages

---

## Differentiators

No existing tool (TensorFlow Projector, giotto-tda, KeplerMapper, Voyant Tools, TDAview) provides:

1. **TF-IDF brightness/size in 3D word space** — simultaneously encodes genre (color), per-book importance (brightness/size), semantic position (3D). The app's signature visual.
2. **Animated Vietoris-Rips filtration** — watching edges appear as ε grows makes persistent homology tangible for non-experts. No web tool does this.
3. **Classification with placement** — upload text → genre prediction → see WHERE the book lands in the visualization. The "show me why" placement is the differentiator.
4. **Live parameter exploration across the full pipeline** — no existing tool does this across a combined NLP+TDA+classification pipeline.

---

## Critical Warnings

1. **Weighted Vietoris-Rips is NOT a standard library feature.** giotto-tda's WeightedRipsPersistence uses DTM weighting, not TF-IDF ball-growth. Correct approach: compute modified distance matrix `d_weighted(i,j) = d(i,j) / (w_i + w_j)`, then run standard Rips on that matrix. Metric validity (triangle inequality) must be verified. **Required Phase 1 spike.**

2. **450D features / 30 samples = guaranteed overfitting.** PCA reduction to 20-50D before SVM is non-negotiable. Permutation testing required for honest accuracy reporting.

3. **Vietoris-Rips is computationally explosive — hard cap at 500-1,000 words per book.** Above 1,000 words, H₁ computation escalates from minutes to hours. Server-side 60-second timeout required.

4. **Phase 1 must prove topology distinguishes genres before building web UI.** If persistence images look similar across genres, the premise is false. This is the project's go/no-go gate.

5. **3D visualizations necessarily distort N-D topology.** UMAP/t-SNE exaggerate cluster separation and create spurious structures. Every 3D view must display a disclaimer. Vietoris-Rips animation must use N-D distances, not projected 3D distances.

---

## Key Decisions To Make

| Decision | Recommendation | When |
|----------|----------------|------|
| Weighted filtration implementation | Modified distance matrix `d/(w_i+w_j)` — validate metric properties in Phase 1 | Phase 1 |
| Feature vector dimensionality | PCA to 20-50D before SVM — determine exact target empirically | Phase 1 |
| H₀/H₁/H₂ scope | Start H₀+H₁ only; H₂ as opt-in toggle; validate H₂ signal before enabling by default | Phase 1 |
| Task queue: arq vs Celery | arq for simplicity at current scale; migrate to Celery if DAG orchestration becomes painful | Before Phase 2 |
| Word count cap for homology | Benchmark on target hardware; 500 is safe starting point | Phase 1 benchmarks |
| Minimum corpus size | Determine empirically: add 5 books/genre until accuracy stabilizes | Phase 1 |

---

## Build Order Recommendation

**5 phases, data-dependency-ordered:**

1. **Pipeline Validation Spike** — CLI only: Word2Vec → TF-IDF → weighted point cloud → persistent homology → persistence images → SVM. Permutation test. Word count benchmark. **Go/no-go gate.**
2. **API Layer + Job Queue** — FastAPI + arq + Redis wrapping the validated pipeline. Content-addressed cache. WebSocket progress. Pre-compute bundled corpus at build time.
3. **Frontend Core + 3D Visualization** — React + R3F. 3D scatter with TF-IDF brightness. Genre coloring/toggle. Projection switching. File upload. Classification display.
4. **Advanced Visualization + Interactive Features** — Animated Vietoris-Rips. Persistence image panel. Per-book slider. Genre comparison. Pipeline explanation. Full parameter controls.
5. **Deployment + Hardening** — Docker Compose, Fly.io, TLS, rate limiting, memory/time limits, health checks.

---

## Confidence Assessment

| Area | Level | Notes |
|------|-------|-------|
| Stack choices | HIGH | All packages mature, 3.12-compatible, well-documented |
| Features and UX | HIGH | Derived from direct analysis of 6 comparable tools |
| Architecture patterns | HIGH | FastAPI + Redis + React is a standard, battle-tested pattern |
| Mathematical validity | MEDIUM | Weighted filtration requires Phase 1 validation spike |
| Classification performance | LOW-MEDIUM | 30 books = high variance; actual accuracy unknown until Phase 1 |
| Deployment cost | MEDIUM | Fly.io estimates accurate; some reliability concerns |

**Overall: MEDIUM-HIGH.** Engineering path is clear. Mathematical and empirical questions require Phase 1 spikes.
