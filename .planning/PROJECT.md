# Literary Genre Topology

## What This Is

A hosted web application that makes the hidden geometric structure of literary genres visible and usable. Books are embedded in a shared word2vec space weighted by TF-IDF, forming genre-specific shapes that can be explored through interactive 3D visualizations and used to classify new books via kernel SVM. Ships with a bundled labeled corpus so it works immediately; users can also upload their own text files for classification and visualization.

## Core Value

A user uploads any book and sees where it lives in semantic space — and why the algorithm predicts the genre it does.

## Current Milestone: v2.0 — Accuracy, Depth, and Polish

**Goal:** Improve classification accuracy via a better-sourced corpus, add explainability and top-N predictions, sweep v1 bugs, and round out the visual experience with theming and onboarding.

**Target features:**
- Sweep v1 carry-over bugs: H₂ homology + tooltip, persistence-diagram dot scaling, BookSlider stub (corpus metadata endpoint), restore empty ROADMAP/STATE files
- Corpus sourcing research spike — recommendation doc on how comparable projects build training corpora
- Corpus expansion driven by research findings; measurable accuracy improvement vs v1 baseline
- Classification depth: top-N predictions with confidence scores + "why this genre" explainability (feature importance, nearest training books)
- Visual polish: dark mode / theming refinement, onboarding, empty-state polish

## Requirements

### Validated (v1.0 — shipped 2026-04-13)

**Shared Pipeline**
- [x] Single skip-gram Word2Vec model trained on entire corpus (Phase 1)
- [x] Per-book TF-IDF weights computed corpus-wide without genre leakage (Phase 1)
- [x] Per-book weighted point clouds in shared embedding space (Phase 1)
- [x] All numerical parameters exposed as live UI controls with recompute on change (Phase 4)

**Classification Pipeline**
- [x] Vietoris-Rips persistent homology weighted by TF-IDF in full N-D (Phase 1, H₀+H₁ only — H₂ deferred to v2)
- [x] Persistence images at configurable grid resolution (Phase 1)
- [x] K-means cluster distribution feature track (Phase 1)
- [x] α-weighted concatenation of normalized structure + location vectors (Phase 1)
- [x] Kernel SVM (RBF) classifier (Phase 1)
- [x] Upload .txt → genre prediction with confidence (Phase 2)
- [x] LOOCV + permutation test evaluation (Phase 1)

**Visualization Suite**
- [x] 3D scatter with PCA / KPCA / UMAP / t-SNE projections (Phase 3)
- [x] Genre TF-IDF brightness toggle (Phase 3)
- [x] Animated Vietoris-Rips ε-slider with edge birth highlighting (Phase 4)
- [x] Persistence image heatmap with H₀/H₁ views (Phase 4 — H₂ deferred)
- [x] Genre comparison view with stacked brightness + heatmaps (Phase 4)
- [x] Pipeline explanation walkthrough dialog (Phase 4)

**Corpus & Data**
- [x] Bundled corpus (10 genres × 10 books = 100 books) (Phase 1; per commit `db7b1f8`, 2026-04-13 — corrected from earlier framing that referenced the Phase-1 validation-spike subset rather than the shipped v1 corpus)
- [x] User can upload .txt files into the classification + viz pipeline (Phase 2)
- [x] Hosted and publicly accessible (Phase 5 — Railway deployment)

### Active (v2.0)

**Bug-Fix Sweep**
- [ ] H₂ homology computed and exposed via H₂ heatmap tab with working tooltip
- [ ] Persistence-diagram dot scaling improved for readability
- [ ] BookSlider wired to a corpus metadata endpoint so per-book slide-through within a genre works
- [ ] ROADMAP.md and STATE.md restored as living documents

**Corpus Quality**
- [x] Research how comparable NLP/genre-classification projects source and structure training corpora; produce recommendation document (Phase 7 — `CORPUS_SOURCING.md` + `VALIDATION_PROTOCOL.md`; v1 baseline pinned at macro_f1=0.3235; corpus shape committed to 8 genres × 30 books = 240)
- [x] Expand or restructure the bundled corpus per research findings; demonstrate measurable accuracy improvement vs v1 baseline (Phase 8 + Phase 8.1 — 154-book verified-clean corpus, 8 genres × 15–25 books each; v2 macro-F1 = 0.7367 vs v1 = 0.3235 on the v1-frozen 20-book hold-out, permutation p = 0.0010; results in [`results/v2_validation_report.md`](../results/v2_validation_report.md). Ships with D-31 disclaimer per `VALIDATION_PROTOCOL.md §8` — per-author smoke-test gap 36.96pp exceeds 10pp threshold, so the macro-F1 is an upper bound rather than expected author-out-of-sample generalization performance.)

**Validated (v2.0 Phase 8 — closed 2026-05-26):** Wave 4 closing summary of CEXP-01..05 (each row's status was flipped in the wave that closed it per D-36; this section does not introduce new status changes):

- [x] **CEXP-01:** `corpus/books.yaml` restructured to 8 v2 genre keys with `author` + `word_count` + `source` provenance schema (D-10) — closed Wave 1 (240-book Proposal-A target), revalidated post-drop by Phase 8.1 (154 verified-clean books).
- [x] **CEXP-02:** full pipeline retrained end-to-end on the v2 corpus; new `svm_pipeline.joblib` + `lineage.json` shipped via the `v2.0-data` Release (lineage: corpus_hash `3f4fe940…`, w2v_model_sha256 `cd81f9e6…`) — closed Wave 2 (re-retrained post Phase 8.1).
- [x] **CEXP-03:** Validated with anti-leakage disclaimer — v2 macro-F1 = 0.7367 (> v1 = 0.3235), permutation p = 0.0010 satisfies D-32 strict-`>` AND p<0.05 leg; per-author smoke test failed (36.96pp gap) triggers D-31 disclaimer path. Closed Wave 3. See `results/v2_validation_report.md`.
- [ ] **CEXP-04:** Blocked — GroupKFold-by-author mean macro-F1 = 0.2865 vs hold-out = 0.7367 = 45.03pp gap (threshold ≤ 15pp). Author-leakage exceeds threshold; v2.1 follow-up should tighten per-author caps or per-author fine-tune. Closed Wave 3 with Blocked status (per D-36).
- [x] **CEXP-05:** deterministic `scripts/build_corpus.py` reproducibly emits canonical `corpus/books.yaml` from `corpus_candidates.yaml` per `CORPUS_SOURCING.md §5` selection rule — closed Wave 1.

**Classification Depth**
- [x] Top-N (N=3 or configurable) genre predictions with confidence scores (Phase 9 — `SVC(probability=True)` libsvm Platt calibration retrained; `predict_proba` returns (1,8) sum-to-1; TopNList renders top-3 + collapsible "+5 more" expander with 1-decimal labels per D-41/D-42)
- [x] "Why this genre" explainability: surface driving features (words, persistence features, nearest training books) (Phase 9 — `POST /api/classify/{job_id}/explain` p50 = 15ms; zero-ablation track contributions + 5 NN on L2-normalized features + w2v-centroid driving words + entropy/gap badge per D-44/D-45/D-46/D-43; Step7ValidationLimitations walkthrough disclaimer uses D-53 "upper bound" framing; 7 UAT items pending live walkthrough in `.planning/phases/09-classification-depth/09-HUMAN-UAT.md`)

**Validated (v2.0 Phase 9 — closed 2026-05-27):** DEPTH-01..07 closure summary:

- [x] **DEPTH-01:** `SVC(probability=True)` libsvm Platt won the empirical Brier comparison (0.3459 vs 0.6041 for CalibratedClassifierCV LOOCV sigmoid); `data/models/svm_pipeline.joblib` retrained; lineage extended with `calibration_method` / `calibration_brier_score` (0.0481 deployed) / `calibration_report`. See `results/v2_calibration_report.md`.
- [x] **DEPTH-02:** `TopNList.tsx` renders top-3 horizontal probability bars + collapsible "+5 more" expander revealing all 8 genres; no pie chart imports anywhere in `frontend/src` (`grep -r "pie\|Pie\|PieChart"` = 0); 1-decimal `XX.X%` labels.
- [x] **DEPTH-03:** `POST /api/classify/{job_id}/explain` measured at p50 = 15ms cache-miss / 1ms cache-hit (200ms target); Redis cache `explain:{hash}:{model_hash}` 1-hour TTL; 410 Gone on expired `feature_vec:{job_id}` (5-min TTL).
- [x] **DEPTH-04:** `data/models/explain_artifacts.npz` ships pre-built kNN index (`n_neighbors=5, metric='euclidean'`) over L2-normalized feature matrix (151×600 float32); `NearestBooksList.tsx` renders 5 rows with title/author/genre/distance.
- [x] **DEPTH-05:** Per-track contributions via zero-ablation (D-44 — extra SVM calls with topology=0 then vocabulary=0); `compute_track_contributions` normalizes by construction (`100·abs(c)/total`) so the two bars sum to 100.
- [x] **DEPTH-06 (P2):** `DrivingWordsPills.tsx` renders TF-IDF-driven words ranked by per-genre w2v centroid attribution; D-46 disclosure copy "proxies, not literal classifier inputs" rendered verbatim.
- [x] **DEPTH-07 (P2):** `UncertaintyBadge` fires on `badge_fires === true`; operative thresholds gap<0.2801 OR norm_entropy>0.7738 declared exactly once in `backend/pipeline/explain.py:33-34` (tightened from research defaults 0.10/0.70 after a 53% fire-rate audit on hold-out).

**Visual Polish**
- [ ] Dark mode / refined theming pass
- [ ] Onboarding flow / first-load tour
- [ ] Empty-state polish across the app

### Out of Scope

- Per-book Word2Vec models — the mathematical invariant is one shared embedding space; separate models break comparability
- Dimensionality reduction in the classification pipeline — persistent homology runs in full N-D; 3D is for human visualization only
- Real-time collaborative editing or user accounts — authentication complexity deferred; this is an exploration tool
- Mobile-native app — 3D interactive visualizations require desktop-class rendering; responsive web is sufficient
- Support for non-English corpora in v1 — stopword lists and Word2Vec training assumptions are English-centric

## Context

The core mathematical insight: a book's vocabulary in word2vec space forms a weighted point cloud whose topological features (clusters, gaps, voids tracked by persistent homology) and spatial positioning (word-cluster distribution) jointly encode genre. Persistent homology extracts shape; word-cluster distributions extract location. Shape alone is location-invariant; location alone misses topology. Together, concatenated and weighted by α, they form a richer feature vector than either alone.

The word2vec embedding space has no privileged coordinate system — all semantic information is in relative geometry (cosine similarity, angles, distances), not in individual dimensions. A global rotation of all vectors preserves all semantic relationships. This means 3D projections (PCA, UMAP, etc.) are lossy displays for human intuition; all computational analysis must happen in the original high-dimensional space.

TF-IDF weighting is computed without genre labels, preventing circular dependency. Heavy TF-IDF words are book-distinctive; light words are corpus-generic. Filtering high-TF-IDF words before dimensionality reduction keeps visualization focused on genre-relevant vocabulary.

Persistent homology scales poorly with point count (Vietoris-Rips complex construction is combinatorially expensive), so the TF-IDF filtering and vocabulary size tuning are critical performance levers.

## Constraints

- **Performance**: Vietoris-Rips complex construction is O(n²) to O(n³) in point count — TF-IDF filtering and configurable ε_max/word count limits are essential safety valves
- **Computation**: Word2Vec training and persistent homology run server-side; the browser handles visualization only
- **Dataset size**: SVM cross-validation on small corpora → leave-one-out CV is appropriate; results degrade with fewer than ~5 books per genre
- **Hosting**: Must be deployed and publicly accessible — architecture decisions must account for stateless serving vs. compute-intensive background jobs
- **Mathematical invariants**: Must preserve: (1) single shared embedding space, (2) persistent homology in full N-D not reduced space, (3) TF-IDF computed without genre labels, (4) both feature tracks normalized before concatenation

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single shared Word2Vec space | Comparability across books requires identical embedding coordinates — separate models break the geometric interpretation | Validated — v1.0 |
| Persistent homology in full N-D | Topology computed on 3D projections would reflect projection artifacts, not true genre structure | Validated — v1.0 |
| Kernel SVM with RBF | Robust with small datasets (relies only on support vectors near boundary); nonlinear boundary in high-D feature space | Validated — v1.0 |
| Hosted deployment | Sharable via URL; computation too heavy for reliable client-side execution | Validated — v1.0 (Railway) |
| Bundled corpus + user upload | Works out of the box for exploration; user upload enables the core use case (classify my book) | Validated — v1.0 |
| All parameters live-adjustable | The app is an exploration and learning tool — seeing how parameters change results is central to the value | Validated — v1.0 |
| SSE over WebSocket for progress | Railway edge dropped WS frames; SSE is unidirectional and works through the proxy | Validated — v1.0 (post-deploy fix) |
| Ripser over giotto-tda for homology | Simpler API, no subprocess timeout wrapper; matches Phase 1 weighted-distance math | Validated — v1.0 (Phase 2) |
| Models shipped as GitHub Release asset | Avoids LFS quota on Railway builds; container downloads at start via RELEASE_URL | Validated — v1.0 (Phase 5) |
| v2: corpus expansion preceded by research spike | User wants accuracy improvement grounded in how comparable projects source training data, not arbitrary additions | Validated — v2.0 (Phase 7: CORPUS_SOURCING.md + VALIDATION_PROTOCOL.md; Proposal A merges gothic+horror, scifi+fantasy → 8 genres × 30 books = 240; multi-label deferred to v3) |
| v2: bug-fix phase first, then features | Clean slate before new features makes verification easier; resolves v1 carry-overs (H₂, BookSlider, persistence-diagram scaling, empty ROADMAP/STATE) | Validated — v2.0 (Phase 6) |
| v2: H₀ and H₂ removed from UI | H₀ mathematically degenerate in weighted Vietoris-Rips (birth axis collapses to filtration time 0); H₂ deferred to v3 — sparse high-D point clouds rarely contain voids and the O(n⁴) runtime cliff (PITFALLS.md §2) is not worth the engineering for empirical-zero gain (PITFALLS.md §3) | Validated — v2.0 (Phase 6, BUG-01) |
| Cache key includes corpus_hash + w2v_model_sha256 | Latent v1 footgun: cache key omitted model-lineage inputs, so a retrain could silently return stale precomputed artifacts. Lands before Phase 8 retrain to avoid mid-flight migration. | Validated — v2.0 (Phase 6, BUG-05) |
| Planning files protected by pre-commit + CI + snapshots | v1 ROADMAP/STATE were wiped to 0 bytes by a GSD wrap-up template (commit 336eb7c, 2026-04-13). Hook rejects 0-byte commits to `.planning/**/*.md`; `.gitattributes` excludes from LFS; CI is a backstop. | Validated — v2.0 (Phase 6, BUG-04) |
| v2: Phase 8 closes with ship-with-disclaimer for CEXP-04 (2026-05-26) | v2 corpus integrity was rebuilt via Phase 8.1's drop strategy after a Wave-1.5 audit found 141/240 books had wrong gid bindings — the verified-clean corpus is 154 books (8 genres × 15–25 each). v2 SVM macro-F1 = 0.7367 beats v1 = 0.3235 by +41pp (permutation p = 0.0010) on the 20-book hold-out, satisfying D-32 strict-`>` + significance. However, GroupKFold-by-author gap = 45.03pp (>> 15pp threshold) and the per-author smoke test fails (mean-gap 36.96pp >> 10pp threshold), indicating significant author-leakage in the v2 corpus. Per D-31, ship with explicit public disclaimer rather than restructure-and-retry. | Validated with disclaimer — v2.0 Phase 8 (v2.0-data Release published with `v2_validation_report.md` attached; Phase 9 inherits a working v2 SVM; v2.1 follow-up addresses author-leakage via stricter per-author caps OR per-author fine-tuning) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-27 — v2.0 Phase 9 complete: classification depth landed end-to-end. Calibrated SVM (libsvm Platt, Brier 0.0481) retrained; explain artifact + FastAPI lifespan loader + `POST /explain` endpoint operational at p50 = 15ms; frontend renders top-3 + UncertaintyBadge + ClassificationExplain panel (5 NN + track contributions + driving words) + Step7 walkthrough disclaimer with D-53 "upper bound" framing. 7 UAT items pending live walkthrough (see `09-HUMAN-UAT.md`). Phase 10 (Visual Polish — dark mode + onboarding + empty-state polish) next; depends on Phases 6–9 (all upstream complete).*

**Shipped milestones:**
- **v1.0** (2026-04-13, archived 2026-05-24) — see [`.planning/milestones/v1.0-ROADMAP.md`](milestones/v1.0-ROADMAP.md) and [`milestones/v1.0-REQUIREMENTS.md`](milestones/v1.0-REQUIREMENTS.md). Live at https://word2vec-topology-genre-detector-production.up.railway.app.
