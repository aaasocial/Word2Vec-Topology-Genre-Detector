# STATE

## Current Position

- **Milestone:** v2.0 — Accuracy, Depth, and Polish
- **Phase:** Not started (defining requirements)
- **Plan:** —
- **Status:** Defining requirements
- **Last activity:** 2026-05-22 — Milestone v2.0 started

## Milestone v2.0 — Phases

| # | Phase | Status |
|---|---|---|
| 6 | v1 Bug-Fix Sweep | Pending |
| 7 | Corpus Sourcing Research Spike | Pending |
| 8 | Corpus Expansion | Pending (blocked on Phase 7) |
| 9 | Classification Depth | Pending |
| 10 | Visual Polish | Pending |

## Accumulated Context

### v1.0 — Shipped 2026-04-13

Live at https://word2vec-topology-genre-detector-production.up.railway.app

| # | Phase | Outcome |
|---|---|---|
| 1 | Pipeline Validation Spike | 6-script CLI pipeline; 27 tests green; weighted VR homology proven via permutation test |
| 2 | API Layer and Job Queue | FastAPI + arq/Redis backend; pipeline refactored into `backend/pipeline/`; content-addressed cache; 34 tests green |
| 3 | Frontend Core and 3D Visualization | React + R3F scatter (PCA/KPCA/UMAP/t-SNE); brightness/hover/search/upload flow; 4/5 success criteria verified |
| 4 | Advanced Viz and Parameter Controls | Topology/Compare tabs; VR ε-slider; persistence heatmap (H₀/H₁); settings drawer; PNG/CSV export; 13/15 UAT pass |
| 5 | Deployment and Public Access | Dockerized; Railway deploy; models via GitHub Release asset; SSE replaces WS post-deploy |

### v1 Carry-overs (addressed in v2.0 Phase 6)

- H₂ homology not computed; H₂ tab tooltip not firing
- Persistence-diagram dot scaling unreadable
- BookSlider receives `books={[]}` — per-book slide-through hidden (needs corpus metadata endpoint)
- ROADMAP.md and STATE.md were 0 bytes on disk at v2.0 start (this rebuild restores them)

### Key Architectural Anchors

- Single shared Word2Vec embedding space (mathematical invariant)
- Persistent homology runs in full N-D, never on projections
- TF-IDF fit corpus-wide without genre labels (no circular dependency)
- Both feature tracks L2-normalized before α-weighted concatenation
- `backend/pipeline/` functions accept `cancel_event` for cooperative cancellation
- Content-addressed cache: `sha256(step_name, params)` → result
- Frontend state in Zustand; React Query for server cache with `staleTime: Infinity` on precomputed data

## Open Blockers

None. Ready to define requirements.
