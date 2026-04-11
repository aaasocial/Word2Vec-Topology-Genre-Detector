# Literary Genre Topology

## What This Is

A hosted web application that makes the hidden geometric structure of literary genres visible and usable. Books are embedded in a shared word2vec space weighted by TF-IDF, forming genre-specific shapes that can be explored through interactive 3D visualizations and used to classify new books via kernel SVM. Ships with a bundled labeled corpus so it works immediately; users can also upload their own text files for classification and visualization.

## Core Value

A user uploads any book and sees where it lives in semantic space — and why the algorithm predicts the genre it does.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Shared Pipeline**
- [ ] Train a single skip-gram Word2Vec model on the entire corpus (all genres combined)
- [ ] Compute per-book TF-IDF weights for all vocabulary
- [ ] Construct per-book weighted point clouds (shared word vectors + per-book TF-IDF weights)
- [ ] All numerical parameters exposed as live UI controls (sliders/inputs); downstream recomputes on change

**Classification Pipeline**
- [ ] Compute persistent homology (Vietoris-Rips filtration, weighted by TF-IDF) in full N-D space per book
- [ ] Convert persistence diagrams to fixed-length persistence image vectors (configurable grid resolution)
- [ ] Cluster full vocabulary into K semantic regions; compute per-book TF-IDF distribution across clusters
- [ ] Concatenate normalized structure + location vectors with adjustable α weighting
- [ ] Train kernel SVM (RBF) on combined feature vectors for genre classification
- [ ] Upload a raw text file → receive genre prediction with confidence score
- [ ] Cross-validation evaluation (leave-one-out given small dataset)

**Visualization Suite**
- [ ] 3D scatter plot of word embeddings with four projection options: PCA, Kernel PCA, UMAP, t-SNE
- [ ] Genre brightness toggle: illuminate that genre's distinctive vocabulary by TF-IDF brightness/size
- [ ] Per-book slider within a genre to watch vocabulary emphasis shift (reveals subgenre structure)
- [ ] Animated Vietoris-Rips plot (separate 3D view): ε slider assembles edges/simplices in real time, highlights births/deaths of topological features
- [ ] Persistence image panel: 2D heatmap (scale vs. persistence) updating per genre/book; separate H₀/H₁/H₂ views
- [ ] Genre comparison view: side-by-side brightness maps + persistence images for two selected genres
- [ ] Pipeline explanation: interactive walkthrough of the mathematical method

**Corpus & Data**
- [ ] Ships with bundled pre-labeled corpus (horror, romance, detective, sci-fi, literary fiction, etc.) — works out of the box
- [ ] User can upload additional text files; those books enter the classification + visualization pipeline
- [ ] Hosted and publicly accessible via URL — no local install required

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
| Single shared Word2Vec space | Comparability across books requires identical embedding coordinates — separate models break the geometric interpretation | — Pending |
| Persistent homology in full N-D | Topology computed on 3D projections would reflect projection artifacts, not true genre structure | — Pending |
| Kernel SVM with RBF | Robust with small datasets (relies only on support vectors near boundary); nonlinear boundary in high-D feature space | — Pending |
| Hosted deployment | Sharable via URL; computation too heavy for reliable client-side execution | — Pending |
| Bundled corpus + user upload | Works out of the box for exploration; user upload enables the core use case (classify my book) | — Pending |
| All parameters live-adjustable | The app is an exploration and learning tool — seeing how parameters change results is central to the value | — Pending |

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
*Last updated: 2026-04-11 after initialization*
