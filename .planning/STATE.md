---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: — Shipped
status: executing
last_updated: "2026-05-24T15:28:22.729Z"
last_activity: 2026-05-24
progress:
  total_phases: 7
  completed_phases: 5
  total_plans: 26
  completed_plans: 20
  percent: 77
---

# STATE

## Current Position

Phase: 07 (corpus-sourcing-research-spike) — EXECUTING
Plan: 1 of 5

- **Milestone:** v2.0 — Accuracy, Depth, and Polish
- **Phase:** 07
- **Plan:** Not started — `/gsd-plan-phase 7` next
- **Status:** Executing Phase 07
- **Last activity:** 2026-05-24

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260524-w2l | v1.0.1 patch: wire useRecompute into SlowTierParams + VerySlowTierParams | 2026-05-24 | b2d5ee7 | [260524-w2l-v1-0-1-patch-wire-userecompute-into-slow](./quick/260524-w2l-v1-0-1-patch-wire-userecompute-into-slow/) |

## Milestone v2.0 — Phases

| # | Phase | Status |
|---|---|---|
| 6 | v1 Bug-Fix Sweep | Complete (2026-05-23; commits 5a37a28, e57ea67) |
| 7 | Corpus Sourcing Research Spike | Context gathered (2026-05-24); ready to plan |
| 8 | Corpus Expansion | Pending (blocked on Phase 6 BUG-05 + Phase 7) |
| 9 | Classification Depth | Pending (blocked on Phase 8) |
| 10 | Visual Polish | Pending (blocked on Phases 6–9) |

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

- H₂ homology not computed; H₂ tab tooltip not firing → BUG-01
- Persistence-diagram dot scaling unreadable → BUG-02
- BookSlider receives `books={[]}` — per-book slide-through hidden (needs corpus metadata endpoint) → BUG-03
- ROADMAP.md and STATE.md were 0 bytes on disk at v2.0 start (this rebuild restores them) → BUG-04
- Latent: `cache_key` does not include `corpus_hash` / `w2v_model_sha256` (must land before Phase 8 retrain) → BUG-05

### Key Architectural Anchors

- Single shared Word2Vec embedding space (mathematical invariant)
- Persistent homology runs in full N-D, never on projections
- TF-IDF fit corpus-wide without genre labels (no circular dependency)
- Both feature tracks L2-normalized before α-weighted concatenation
- `backend/pipeline/` functions accept `cancel_event` for cooperative cancellation
- Content-addressed cache: `sha256(step_name, params)` → result (will become `sha256(step_name, params, corpus_hash, w2v_model_sha256)` after BUG-05)
- Frontend state in Zustand; React Query for server cache with `staleTime: Infinity` on precomputed data

### v2.0 Phase Map (drafted 2026-05-22)

| # | Phase | Goal | Requirements |
|---|---|---|---|
| 6 | v1 Bug-Fix Sweep | Close H₂, BookSlider, dot-scaling, planning-doc, and latent cache-key bug before any retrain | BUG-01..05 |
| 7 | Corpus Sourcing Research Spike | Defensible written plan for sources, per-genre counts, author distribution, validation protocol — research only | RES-01..03 |
| 8 | Corpus Expansion | Larger, balanced, author-diverse corpus; retrained model beats v1 baseline on frozen test | CEXP-01..05 |
| 9 | Classification Depth | Top-N calibrated predictions + "why this genre?" with nearest-neighbours + per-track contribution | DEPTH-01..07 |
| 10 | Visual Polish | Light/dark/system theming, onboarding tour, empty-state polish — horizontal sweep last | POLISH-01..05 |

### Key Decisions Recorded in v2.0 Research

- **H₂ is visualisation-only in v2** — not a feature-vector input (`ARCHITECTURE.md §5a` + `PITFALLS.md §3`).
- **Explainability via nearest-neighbour + per-track contribution** — no synchronous Kernel SHAP (`ARCHITECTURE.md §5b` + `PITFALLS.md §8`); commits to option (c) from `ARCHITECTURE.md §11`.
- **Theme store separate from visualization store** — different lifetimes (persisted vs session) (`ARCHITECTURE.md §5c`).
- **Dark mode last** — horizontal concern touching ~30 components (`ARCHITECTURE.md §6`).
- **Cache-key correction (BUG-05) in Phase 6, not Phase 8** — prevents stale-cache footgun during retrain (`ARCHITECTURE.md §10`).
- **Within Phase 6: BookSlider before H₂** — smaller "new endpoint" pattern proves out first (`ARCHITECTURE.md §6`).

## Performance Metrics

| Metric | Target | Current |
|---|---|---|
| v2 macro-F1 (v1-frozen test set) | > v1 baseline | — (measured in Phase 8) |
| Per-author held-out gap vs LOOCV | ≤ 15pp | — (measured in Phase 8) |
| H₂ P95 runtime per book | < 30s | — (benched in Phase 6) |
| Explainability response time | < 5s (target ~200ms) | — (measured in Phase 9) |
| Corpus metadata endpoint payload | < 100KB total | — (measured in Phase 6) |

## Open Blockers

None. Phase 7 context gathered; ready to plan via `/gsd-plan-phase 7`.

Documentation drift to clean up (separate `/gsd-docs-update` pass — surfaced during Phase 7 discuss):

- REQUIREMENTS.md CORPUS-01 still says "3 genres × 5 books"; PROJECT.md "Validated" list mirrors this. v1 actually shipped with 10 genres × 10 books per commit db7b1f8 (2026-04-13).
- ROADMAP.md "v1 outcomes" implicitly references the same stale framing.

## Session Continuity

**Next command:** `/gsd-plan-phase 7`

**Reading order for the next session:**

1. `.planning/phases/07-corpus-sourcing-research-spike/07-CONTEXT.md` — locked decisions (read FIRST)
2. `.planning/phases/07-corpus-sourcing-research-spike/07-DISCUSSION-LOG.md` — alternatives considered for each decision
3. `.planning/ROADMAP.md` §"Phase 7" — success criteria + dependencies
4. `.planning/REQUIREMENTS.md` RES-01..03 — Phase 7 requirements verbatim
5. `.planning/research/SUMMARY.md` §"Phase 7" + §"Gaps to Address" — v2 spine; pre-states what this phase must close
6. `.planning/research/PITFALLS.md` §4, §5, §6, §11 — every guard in VALIDATION_PROTOCOL.md must trace to one of these
7. `corpus/books.yaml` — current 100-book manifest; Phase 7 picks the 20% hold-out from this universe
8. `results/validation_report.txt` — v1 baseline reference (54.6% overall, p=0.001); Phase 7 computes a NEW number for the hold-out subset
9. `scripts/06_validate.py` — current LOOCV + permutation skeleton; VALIDATION_PROTOCOL.md specifies the diff Phase 8 must apply

---
*v1.0 shipped: 2026-04-13*
*v2.0 milestone started: 2026-05-22*
*Last updated: 2026-05-22 — Phase 6 context gathered; BUG-01 recast to H₂ removal, H₀ cleanup added*
