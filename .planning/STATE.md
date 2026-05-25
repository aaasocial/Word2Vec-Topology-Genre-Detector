---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: — Accuracy, Depth, and Polish
status: paused
last_updated: "2026-05-25T08:30:00.000Z"
last_activity: 2026-05-25
progress:
  total_phases: 8
  completed_phases: 6
  total_plans: 30
  completed_plans: 27
  percent: 90
---

# STATE

## Current Position

Phase: 08 (corpus-expansion) — **PAUSED after Wave 1.5** (corpus integrity defect)

- **Milestone:** v2.0 — Accuracy, Depth, and Polish
- **Phase:** 08
- **Plan:** Wave 1 + Wave 2 + Wave 1.5 patch executed; Wave 3 + Wave 4 deferred
- **Status:** Paused — corpus integrity blocker discovered
- **Last activity:** 2026-05-25

### Phase 8 Pause Note (2026-05-25)

Phase 8 was paused after Wave 1.5 because a full gid integrity audit (run during Wave-1.5 patch — see [wave-1-5-full-gid-audit.log](phases/08-corpus-expansion/wave-1-5-full-gid-audit.log)) found **141 of 240 books (58.75%) have wrong `gid` bindings** in `corpus/books.yaml`. Wave 1.5 fixed the 6 documented duplicate-gid defects; 135 single-mapping mismatches remain.

What ran:

- Wave 1 (08-01): v2 240-book corpus built, byte-identical v1 baseline gate held. (commits d620e89 + ancestors)
- Wave 2 (08-02): full pipeline retrained on v2 corpus; SVM artifacts produced. (commit 8b9be64)
- Wave 1.5 (08-02.1): 6 duplicate-gid defects patched; pipeline re-retrained; lineage rotated. Full audit log produced. (commit 9b3c95a)

What did NOT run:

- Wave 3 (08-03): validation report — would measure noise, not v2 quality
- Wave 4 (08-04): GitHub Release publish — cannot ship known-broken corpus

Wave 2 + Wave 1.5 produced real trained artifacts (`data/models/svm_pipeline.joblib` + sidecar + W2V/k-means/persistence imager) on the patched-but-still-largely-wrong corpus. These are NOT v2.0-release-grade.

Mismatch breakdown by genre (out of 30 per genre): western 30, historical 21, adventure 21, mystery 18, literary 17, romance 14, gothic_horror 11, speculative 9.

Root cause: `.planning/research/v2/corpus_candidates.yaml` had wrong `gutenberg_id` values for many entries. `build_corpus.py` trusted them verbatim because the v1 source-of-truth pattern was author-and-title-driven, not gid-validated.

### Recommended next step

Create a sub-phase `08.1 corpus-integrity` (via `/gsd-insert-phase` or `/gsd-discuss-phase` then plan) that:

1. Rebuilds `corpus_candidates.yaml` by querying Gutenberg's authoritative metadata index for each `(title, author)` to get the correct gid
2. Regenerates `corpus/books.yaml` via deterministic `build_corpus.py`
3. Re-runs Wave 2 retrain pipeline
4. Re-runs the strict gid audit as an entry gate

After 08.1 closes with a clean corpus, resume Phase 8 by re-running `/gsd-execute-phase 8 --wave 3` and then `--wave 4`.



### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260524-w2l | v1.0.1 patch: wire useRecompute into SlowTierParams + VerySlowTierParams | 2026-05-24 | b2d5ee7 | [260524-w2l-v1-0-1-patch-wire-userecompute-into-slow](./quick/260524-w2l-v1-0-1-patch-wire-userecompute-into-slow/) |

## Milestone v2.0 — Phases

| # | Phase | Status |
|---|---|---|
| 6 | v1 Bug-Fix Sweep | Complete (2026-05-23; commits 5a37a28, e57ea67) |
| 7 | Corpus Sourcing Research Spike | Complete (2026-05-25; CORPUS_SOURCING.md + VALIDATION_PROTOCOL.md + corpus_candidates.yaml + v1_baseline_results.json delivered) |
| 8 | Corpus Expansion | Context gathered (2026-05-25); ready to plan (4 waves: build → retrain → validate → release; 15 decisions captured in 08-CONTEXT.md) |
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

**B-08-01 (2026-05-25) — Phase 8 paused on corpus integrity blocker.**

141/240 books in `corpus/books.yaml` have wrong gid bindings (audit log: `phases/08-corpus-expansion/wave-1-5-full-gid-audit.log`). Wave 3 validation + Wave 4 release blocked until a corpus-integrity sub-phase rebuilds candidates.yaml against Gutenberg's authoritative metadata.

Recommended next: `/gsd-discuss-phase 08.1` (or `/gsd-insert-phase 08.1`) then plan + execute, then resume Phase 8 with `/gsd-execute-phase 8 --wave 3`.

---

Phase 8 plans the **4-wave structure** (build → retrain → validate → release) per 08-CONTEXT.md D-22. Wave 1 includes `scripts/build_corpus.py` (D-24 upgraded CEXP-05 from P2 to P1) and the byte-identical re-run of `scripts/phase7_v1_baseline.py` as the entry gate.

Documentation drift to clean up (folded into Wave 4 per D-34, no longer a separate `/gsd-docs-update` pass):

- REQUIREMENTS.md CORPUS-01 still says "3 genres × 5 books"; PROJECT.md "Validated" list mirrors this. v1 actually shipped with 10 genres × 10 books per commit db7b1f8 (2026-04-13); v2 ships with 8 genres × 30 books = 240 books per Proposal A.
- ROADMAP.md "v1 outcomes" implicitly references the same stale framing.
- CEXP-01..05 traceability rows flip from Pending → Validated per-wave (D-36), not as a terminal sweep.

## Session Continuity

**Next command:** `/gsd-plan-phase 8`

**Reading order for the next session:**

1. `.planning/phases/08-corpus-expansion/08-CONTEXT.md` — Phase 8 locked decisions (read FIRST)
2. `.planning/phases/08-corpus-expansion/08-DISCUSSION-LOG.md` — alternatives considered for each Phase 8 decision
3. `.planning/phases/07-corpus-sourcing-research-spike/07-CONTEXT.md` — Phase 7 decisions D-01..D-21 (inherited; not re-litigated)
4. `.planning/research/v2/CORPUS_SOURCING.md` §5 selection rule + §8 entry checklist — `build_corpus.py` implements verbatim
5. `.planning/research/v2/VALIDATION_PROTOCOL.md` §6 GroupKFold + §8 smoke test + §10 entry checklist — `scripts/06_validate.py` modifications + Wave-3 protocol
6. `.planning/research/v2/corpus_candidates.yaml` — `build_corpus.py` reads verbatim
7. `.planning/research/v2/v1_baseline_results.json` — Wave-1 byte-identical gate verifies against this
8. `.planning/ROADMAP.md` §"Phase 8: Corpus Expansion" — success criteria + dependency on Phase 6 + Phase 7
9. `.planning/REQUIREMENTS.md` CEXP-01..05 — Phase 8 requirements verbatim
10. `.planning/research/PITFALLS.md` §1 (cache key + lineage), §4 (held-out), §5 (author leakage), §6 (class imbalance), §11 (LOOCV cost) — every Phase 8 guard traces here
11. `corpus/books.yaml` + `config/params.yaml` — atomic-swap target + frozen hyperparameters

---
*v1.0 shipped: 2026-04-13*
*v2.0 milestone started: 2026-05-22*
*Last updated: 2026-05-25 — Phase 7 complete; Phase 8 context gathered (4 waves, 15 decisions); STATE.md milestone frontmatter corrected from v1.0 → v2.0*
