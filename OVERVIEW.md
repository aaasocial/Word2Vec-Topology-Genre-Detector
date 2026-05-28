# Literary Genre Topology — Project Overview

*Last updated: 2026-05-28 (v2.0)*

A hosted web application that makes the hidden geometric structure of literary genres visible and usable. Books are embedded in a shared Word2Vec space weighted by TF-IDF, forming genre-specific shapes that you can explore through interactive 3D visualizations and use to classify new books via a kernel SVM.

**Core value:** Upload any book and see where it lives in semantic space — and *why* the algorithm predicts the genre it does.

**Live:** https://word2vec-topology-genre-detector-production.up.railway.app

---

## Goals

1. **Make abstract NLP geometry tangible.** Turn an invisible high-dimensional embedding space into something you can rotate, brighten, and interrogate.
2. **Classify honestly.** Don't just return a single genre — show ranked, calibrated alternatives and the uncertainty behind them.
3. **Explain, don't assert.** Every prediction comes with a "why" — nearest training books, which feature track mattered, and the words that drove it.
4. **Work out of the box.** Ship with a bundled, validated corpus so the app is useful the moment it loads; let users add their own text on top.
5. **Stay mathematically honest.** Preserve the invariants that make the analysis meaningful (see below), and disclose the limits of the model rather than overclaiming.

---

## What the app does

### Explore the embedding space (3D Scatter)
- Rotate / pan / zoom a 3D point cloud of ~61,000 word embeddings at interactive frame rates.
- Switch projection: **PCA · Kernel PCA · UMAP · t-SNE** (keyboard `1`–`4`).
- Toggle **2D ↔ 3D** rendering of the same projection.
- **Hover** a word → tooltip with the word, its TF-IDF weight, its genre, and its 5 nearest neighbors.
- **Click** a word → persistent selection with a full nearest-neighbor list.
- **Search** any word → matches highlight in the cloud and list in a side panel.
- Select a **genre** → its signature vocabulary brightens, genre-neutral words fade.
- Slide through **individual books** within a genre and watch the brightness pattern shift.
- Live display controls: **point size, opacity, brightness, TF-IDF threshold**, color scheme.
- `R` resets the camera, `Esc` deselects.

### Inspect topology (Topology tab)
- 2D heatmap of the **H₁ persistence image** for a selected genre or book (axes: scale × persistence).
- Birth/death **persistence diagram** scatter.
- Adjustable grid resolution, Gaussian smoothing σ, and max-persistence threshold.

### Watch the filtration (Vietoris-Rips tab)
- Animated 3D view of edges appearing and disappearing as the filtration parameter ε slides from 0 to ε_max — the topological "fingerprint" forming in real time.

### Compare two genres (Compare tab)
- Side-by-side brightness maps and persistence images for any two genres on a shared color scale, revealing where their vocabularies overlap and diverge.

### Classify a book (the core upload flow)
- Drag-and-drop or pick a `.txt` file (≤5MB, ≥500 words).
- A staged progress indicator streams each pipeline step: tokenize → TF-IDF → point cloud → homology → features → classify.
- Results:
  - **Top-3 calibrated genre predictions** as honest probability bars (summing to 1), with a "+5 more" expander for all 8 genres.
  - An **uncertainty badge** when the top two genres are close or the distribution is high-entropy.
  - The uploaded book **appears in the 3D scatter** with its own bright words.
- **"Why this genre?"** opens an explainability panel:
  - The **5 nearest training books** (title, author, genre, distance).
  - **Track contribution** — how much *topology* vs *vocabulary* drove the verdict (as percentages summing to 100).
  - **Driving words** — the TF-IDF terms most associated with the predicted genre, with an explicit "proxies, not literal classifier inputs" disclosure.

### Learn the math (How It Works)
- A 7-step walkthrough of the pipeline: tokenization & TF-IDF → Word2Vec → point clouds → Vietoris-Rips → persistence images → k-means location features → SVM — capped by a validation & limitations note framing accuracy as an *upper bound*.

### Theming & onboarding
- **Light / dark / system** themes, persisted across sessions; the 3D scene recolors live.
- A **first-visit onboarding tour** (4 steps) plus the auto-running How-It-Works intro for new visitors.
- Polished empty states across the upload zone, Compare, classification failures, and the explanation panel.

### Export
- Current visualization as **PNG / SVG**; persistence diagram data as **CSV**.

---

## How it works (the idea)

A book's vocabulary, placed in Word2Vec space and weighted by TF-IDF, forms a **weighted point cloud**. Two complementary signals encode genre:

- **Shape** — *persistent homology* tracks the clusters and loops (H₁) that survive across scales. This is location-invariant: it captures structure regardless of where the cloud sits.
- **Location** — a *k-means word-cluster distribution* captures where the book's weight falls across the shared vocabulary.

These two feature tracks are each normalized and concatenated with a weighting α, then classified by a **kernel SVM (RBF)**. Shape alone misses position; location alone misses structure — together they're richer than either.

---

## Current state (v2.0)

| Dimension | v2.0 |
|---|---|
| Corpus | 154 verified-clean public-domain books across 8 genres (`adventure`, `gothic_horror`, `historical`, `literary`, `mystery`, `romance`, `speculative`, `western`) |
| Classifier | Calibrated RBF SVM (libsvm Platt), hold-out macro-F1 **0.7367** vs v1 baseline 0.3235 (permutation p = 0.0010) |
| Calibration | predict_proba sums to 1; deployed Brier score 0.0481 |
| Explainability | Nearest-neighbour books + zero-ablation track contributions + driving words + entropy/uncertainty badge |
| Explain latency | ~15 ms (cache-miss) / ~1 ms (cache-hit); Redis-cached |
| Theming | Light / dark / system with live 3D recolor |

**Known limitation (disclosed in-app):** the macro-F1 is an *upper bound* — the model generalizes poorly to unseen authors (per-author held-out gap ≈ 45pp). This is honestly surfaced in the How-It-Works walkthrough and the Why-panel footnote, and is a candidate for a v2.1 follow-up (stricter per-author caps or per-author fine-tuning).

---

## Mathematical invariants (non-negotiable)

These are preserved everywhere in the pipeline:

1. **A single shared Word2Vec embedding space** — all books use identical word coordinates, so geometry is comparable across books. (Separate per-book models would break comparability.)
2. **Persistent homology runs in full N-dimensional space**, never on the 3D projection — the 3D scatter is a lossy display for human intuition only.
3. **TF-IDF is computed without genre labels** — corpus-level IDF, no circular dependency between features and the thing being predicted.
4. **Both feature tracks are L2-normalized before the α-weighted concatenation** — so neither track dominates by scale.

---

## Architecture

- **Frontend:** React 18 + TypeScript + Vite, 3D via react-three-fiber (Three.js), state via Zustand, server cache via React Query. Stateless; renders precomputed data and streams classification progress over SSE.
- **Backend:** FastAPI serving a content-addressed cache of precomputed artifacts; an arq + Redis background worker runs the heavy pipeline (Word2Vec inference, homology, classification) off the request path.
- **Pipeline:** Python (gensim, scikit-learn, ripser, numpy). Word2Vec + persistent homology run server-side and are precomputed at build time; the browser only visualizes.
- **Model lineage:** every cache key includes the corpus hash and Word2Vec model SHA, so a retrain can never silently serve stale precomputed results.
- **Deployment:** Dockerized, hosted on Railway, public with no login. Model assets ship via a versioned GitHub Release.

---

## Constraints

- **Performance:** Vietoris-Rips complex construction is O(n²)–O(n³) in point count, so TF-IDF filtering and configurable ε_max / max-words caps are essential safety valves.
- **Compute split:** training and homology are server-side; the browser handles visualization only.
- **Small-data classification:** leave-one-out / hold-out evaluation is appropriate; quality degrades below ~5 books per genre.
- **Hosting:** must remain publicly accessible, balancing stateless serving against compute-heavy background jobs.

---

## Out of scope (deferred to v3+)

- Counterfactual explanations ("what would make this a mystery?").
- Mobile-native app (3D interaction is desktop-class; responsive read-only view is a candidate).
- Multi-language corpora (current stopword/tokenization assumptions are English-centric).
- User accounts, sharing, and real-time collaboration.
- H₀ / H₂ homology in the UI (H₀ is degenerate under weighted Vietoris-Rips; H₂ deferred — sparse high-D clouds rarely contain voids and the runtime cost isn't justified yet).
- PDF / EPUB upload (currently `.txt` only).

---

## Milestone history

- **v1.0** (shipped 2026-04-13) — pipeline validation, FastAPI + job queue, React/R3F scatter, advanced viz + parameter controls, Railway deployment.
- **v2.0** (2026-05) — bug-fix sweep, corpus-sourcing research, corpus expansion + retrain, classification depth (top-N + explainability), visual polish (theming + tour + empty states), and onboarding/theme-default refinements.
