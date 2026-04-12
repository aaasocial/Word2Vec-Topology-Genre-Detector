# Roadmap: Literary Genre Topology

**Created:** 2026-04-11
**Granularity:** Standard (5 phases)
**Total v1 requirements:** 63

## Overview

This project builds outward from a mathematical hypothesis: that persistent homology on TF-IDF-weighted word embeddings produces distinguishable genre signals. Phase 1 proves or disproves that hypothesis as a CLI pipeline before any web investment. Phases 2-4 progressively wrap the validated pipeline in an API, a 3D interactive frontend, and advanced visualization features. Phase 5 containerizes and deploys the application for public access.

## Phases

- [ ] **Phase 1: Pipeline Validation Spike** - CLI proof that topology distinguishes genres (go/no-go gate)
- [ ] **Phase 2: API Layer and Job Queue** - FastAPI backend wrapping the validated pipeline with caching and async compute
- [ ] **Phase 3: Frontend Core and 3D Visualization** - React + R3F scatter plot with TF-IDF brightness, genre coloring, and file upload
- [ ] **Phase 4: Advanced Visualization and Parameter Controls** - Animated Vietoris-Rips, persistence images, genre comparison, and full parameter tiering
- [ ] **Phase 5: Deployment and Public Access** - Containerized deployment, publicly accessible via URL

## Phase Details

### Phase 1: Pipeline Validation Spike
**Goal**: Prove that persistent homology on TF-IDF-weighted word embeddings produces statistically significant genre separation before investing in web infrastructure. This is the project's go/no-go gate.
**Depends on**: Nothing (first phase)
**Requirements**: VALID-01, VALID-02, VALID-03, PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, HOM-01, HOM-02, HOM-03, HOM-04, HOM-05, HOM-06, HOM-07, HOM-08, CORPUS-01, CORPUS-03, CORPUS-04
**Success Criteria** (what must be TRUE):
  1. A developer can run a CLI command that trains Word2Vec on the bundled mini-corpus, computes persistence images for each book, trains SVM, and prints per-genre accuracy plus a permutation test p-value
  2. A developer can run the weighted Vietoris-Rips filtration on any book and see stable persistence diagrams that visibly differ between genres (not random noise)
  3. A developer can run a benchmark command that reports computation time vs. word count and confirms the safe max_words cap keeps per-book homology under 10 seconds
  4. The permutation test confirms genre separation is statistically significant (p < 0.05), or the project pivots
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md -- Corpus assembly and text processing pipeline
- [ ] 01-02-PLAN.md -- Word2Vec training and TF-IDF computation
- [ ] 01-03-PLAN.md -- Persistent homology and classification pipeline with validation tests

---

### Phase 2: API Layer and Job Queue
**Goal**: Wrap the validated CLI pipeline in a FastAPI backend with content-addressed caching, async job processing, and real-time progress streaming so the frontend can consume pipeline results without blocking.
**Depends on**: Phase 1
**Requirements**: INFRA-01, INFRA-02, INFRA-03, CORPUS-02, CLASS-01, CLASS-02, CLASS-04, CLASS-05, UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. A client can POST a .txt file to the API and receive a genre prediction with confidence score within 60 seconds, with WebSocket messages naming each pipeline step as it runs
  2. A client can GET pre-computed results for any bundled corpus book instantly (cache hit, no recomputation)
  3. A client uploading an invalid file (wrong format, too large, too few words, encoding issues) receives a specific, actionable error message explaining the problem
  4. Long-running computations execute in a background worker without blocking other API requests
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md -- FastAPI app skeleton, upload validation, WebSocket progress format, and test infrastructure
- [ ] 02-02-PLAN.md -- Content-addressed disk cache, arq worker with Redis pub/sub progress bridge
- [ ] 02-03-PLAN.md -- Pipeline module refactor, build-time precompute, corpus results endpoint

---

### Phase 3: Frontend Core and 3D Visualization
**Goal**: Users can explore word embedding space through an interactive 3D scatter plot with TF-IDF brightness encoding, genre coloring, projection switching, and see where their uploaded book lands after classification.
**Depends on**: Phase 2
**Requirements**: INFRA-04, VIZ-01, VIZ-02, VIZ-03, VIZ-04, VIZ-05, VIZ-06, VIZ-07, VIZ-08, VIZ-09, VIZ-10, VIZ-11, CLASS-03, PARAM-01, PARAM-02, UX-04
**Success Criteria** (what must be TRUE):
  1. A user can open the app and see a 3D scatter plot of word embeddings at interactive frame rates, orbit/pan/zoom with mouse, and reset the camera with R
  2. A user can select a genre from a dropdown and see that genre's distinctive vocabulary light up by TF-IDF brightness while other words dim, then slide through individual books within the genre to watch brightness shift
  3. A user can switch between PCA, Kernel PCA, UMAP, and t-SNE projections and see the same words rearrange into different 3D layouts
  4. A user can upload a .txt file, see it classified, and then see the uploaded book appear in the scatter plot with its TF-IDF brightness active among the existing corpus
  5. A user can hover any point for tooltip details, click to select and pin, search for a word, and toggle between 2D and 3D views
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 03-01: React app scaffold with Three.js/R3F 3D scatter plot renderer
- [ ] 03-02: TF-IDF brightness, genre coloring, projection switching, and interaction controls
- [ ] 03-03: File upload flow, classification display, and instant/fast parameter controls

---

### Phase 4: Advanced Visualization and Parameter Controls
**Goal**: Users can explore the topological structure behind genre classification through animated Vietoris-Rips filtration, persistence image heatmaps, side-by-side genre comparison, and full control over all pipeline parameters with tiered recomputation.
**Depends on**: Phase 3
**Requirements**: TOPO-01, TOPO-02, TOPO-03, TOPO-04, TOPO-05, TOPO-06, TOPO-07, COMP-01, COMP-02, PARAM-03, PARAM-04, PARAM-05, PARAM-06, EXPLAIN-01, UX-03, UX-05
**Success Criteria** (what must be TRUE):
  1. A user can view a persistence image heatmap for any genre or book, switch between H0/H1/H2 tabs, and see the heatmap update automatically when the selection changes in any panel
  2. A user can drag the epsilon slider on the Vietoris-Rips animation and watch edges appear between words as filtration radius increases, with birth/death events highlighted in a distinct color
  3. A user can select two genres for side-by-side comparison with consistent color scales, seeing both brightness maps and persistence images simultaneously
  4. A user can adjust slow-tier parameters (persistence image resolution, sigma, K, alpha, SVM params) via a "Recompute" button and very-slow-tier parameters (Word2Vec dimension) via a confirm dialog, while the current visualization remains interactive during background recomputation
  5. A user sees a persistent disclaimer on all 3D views noting that topology is computed in N-dimensional space and the 3D view is a lossy projection
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 04-01: Persistence image panel and H0/H1/H2 tabs with brushing-and-linking
- [ ] 04-02: Animated Vietoris-Rips filtration viewer
- [ ] 04-03: Genre comparison view, parameter control tiers, pipeline explanation, and export/disclaimer

---

### Phase 5: Deployment and Public Access
**Goal**: The application is containerized and publicly accessible via URL with no local install required.
**Depends on**: Phase 4
**Requirements**: INFRA-05, INFRA-06
**Success Criteria** (what must be TRUE):
  1. A user can access the full application via a public URL without installing anything locally
  2. A developer can build and run the entire application stack with a single `docker compose up` command
**Plans**: TBD

Plans:
- [ ] 05-01: Docker containerization and hosted deployment

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Pipeline Validation Spike | 0/3 | Not started | - |
| 2. API Layer and Job Queue | 0/3 | Not started | - |
| 3. Frontend Core and 3D Visualization | 0/3 | Not started | - |
| 4. Advanced Visualization and Parameter Controls | 0/3 | Not started | - |
| 5. Deployment and Public Access | 0/1 | Not started | - |
