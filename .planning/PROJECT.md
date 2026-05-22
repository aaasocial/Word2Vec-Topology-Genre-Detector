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
- [x] Bundled corpus (horror, sci-fi, romance — 3 genres × 5 books) (Phase 1)
- [x] User can upload .txt files into the classification + viz pipeline (Phase 2)
- [x] Hosted and publicly accessible (Phase 5 — Railway deployment)

### Active (v2.0)

**Bug-Fix Sweep**
- [ ] H₂ homology computed and exposed via H₂ heatmap tab with working tooltip
- [ ] Persistence-diagram dot scaling improved for readability
- [ ] BookSlider wired to a corpus metadata endpoint so per-book slide-through within a genre works
- [ ] ROADMAP.md and STATE.md restored as living documents

**Corpus Quality**
- [ ] Research how comparable NLP/genre-classification projects source and structure training corpora; produce recommendation document
- [ ] Expand or restructure the bundled corpus per research findings; demonstrate measurable accuracy improvement vs v1 baseline

**Classification Depth**
- [ ] Top-N (N=3 or configurable) genre predictions with confidence scores
- [ ] "Why this genre" explainability: surface driving features (words, persistence features, nearest training books)

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
| v2: corpus expansion preceded by research spike | User wants accuracy improvement grounded in how comparable projects source training data, not arbitrary additions | — Pending (v2.0 Phase 7) |
| v2: bug-fix phase first, then features | Clean slate before new features makes verification easier; resolves v1 carry-overs (H₂, BookSlider, persistence-diagram scaling, empty ROADMAP/STATE) | — Pending (v2.0 Phase 6) |
| v2: H₀ and H₂ removed from UI | H₀ mathematically degenerate in weighted Vietoris-Rips (birth axis collapses to filtration time 0); H₂ deferred to v3 — sparse high-D point clouds rarely contain voids and the O(n⁴) runtime cliff (PITFALLS.md §2) is not worth the engineering for empirical-zero gain (PITFALLS.md §3) | — Pending (v2.0 Phase 6, BUG-01) |

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
*Last updated: 2026-05-22 — v2.0 milestone initialized (v1.0 shipped 2026-04-13)*
