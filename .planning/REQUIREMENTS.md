# Requirements: Literary Genre Topology

**Defined:** 2026-04-11
**Core Value:** A user uploads any book and sees where it lives in semantic space — and why the algorithm predicts the genre it does.

---

## v1 Requirements

### Validation Spike

- [ ] **VALID-01**: CLI prototype trains Word2Vec on a 15-book mini-corpus (3 genres × 5 books), computes persistence images for each book, and runs a permutation test confirming topology signal separates genres above chance
- [ ] **VALID-02**: CLI prototype validates that the weighted Vietoris-Rips filtration (`d_weighted(i,j) = d(i,j) / (w_i + w_j)`) produces stable persistence diagrams and meaningful separation between genre classes
- [ ] **VALID-03**: CLI prototype benchmarks Vietoris-Rips computation time vs. word count and establishes the safe `max_words` cap (target: ≤10s per book)

### Shared Pipeline

- [ ] **PIPE-01**: System ingests raw .txt files labeled by genre (bundled corpus + user uploads) and prepares them for analysis
- [ ] **PIPE-02**: System tokenizes text, normalizes case, removes punctuation, and filters English stopwords from all input files
- [ ] **PIPE-03**: System trains a single shared skip-gram Word2Vec model on the entire corpus (all genres combined), producing one embedding vector per unique word in a shared N-dimensional space
- [ ] **PIPE-04**: System computes TF-IDF weights per book, using corpus-level IDF (log(total books / books containing word)) computed without genre labels
- [ ] **PIPE-05**: System constructs a per-book weighted point cloud from the shared word vectors (positions) and TF-IDF scores (weights)

### Classification Pipeline

- [ ] **HOM-01**: System computes per-book Vietoris-Rips persistent homology in the full N-dimensional embedding space using TF-IDF-weighted filtration (heavy TF-IDF words grow balls faster, modeled via modified distance matrix)
- [ ] **HOM-02**: System computes H₀ (connected components) and H₁ (loops) always; H₂ (voids) on-demand when user enables the H₂ toggle
- [ ] **HOM-03**: System converts persistence diagrams to fixed-length persistence image vectors using configurable grid resolution (M×M → M² dimensions), Gaussian kernel smoothing (σ adjustable), and (birth, death) → (birth, persistence) coordinate rotation
- [ ] **HOM-04**: System clusters all word vectors in the shared embedding space into K semantic regions using k-means (K adjustable, default 50), computed once on the full vocabulary
- [ ] **HOM-05**: System computes a per-book K-dimensional word-cluster distribution vector: the total TF-IDF weight of each book falling into each of the K clusters
- [ ] **HOM-06**: System concatenates normalized persistence image vector and normalized cluster distribution vector, weighted by user-adjustable α: (α × structure) ⊕ ((1−α) × location)
- [ ] **HOM-07**: System trains a kernel SVM (RBF) on the concatenated feature vectors, evaluates using leave-one-out cross-validation, and reports per-class accuracy
- [ ] **HOM-08**: System applies PCA dimensionality reduction to the concatenated feature vector before SVM training to prevent overfitting (450D features / ~50-100 books regime)

### Visualization — 3D Brightness Map

- [ ] **VIZ-01**: User sees a 3D scatter plot of word embeddings rendered at interactive frame rates (60fps) with up to 50,000 visible points
- [ ] **VIZ-02**: User can switch between four projection methods: PCA, Kernel PCA, UMAP, and t-SNE — same words, different 3D arrangements
- [ ] **VIZ-03**: Each word's visual brightness and size scales proportionally to its TF-IDF weight in the currently selected genre or book
- [ ] **VIZ-04**: User can select any genre from a dropdown; the visualization illuminates that genre's distinctive vocabulary while dimming genre-neutral words
- [ ] **VIZ-05**: User can slide through individual books within the selected genre; brightness pattern shifts book-by-book, revealing subgenre structure
- [ ] **VIZ-06**: User can hover over any point to see word, TF-IDF weight, genre of origin, and top-5 nearest neighbors in embedding space
- [ ] **VIZ-07**: User can click a point to select it; selected point stays highlighted through camera movements and shows detailed panel with nearest neighbors list
- [ ] **VIZ-08**: User can orbit, pan, and zoom the scatter plot with mouse/trackpad; a reset-camera button (also R shortcut) returns to default view
- [ ] **VIZ-09**: User can toggle between 3D and 2D projection of the scatter plot
- [ ] **VIZ-10**: User can search for a specific word; matching points are highlighted in the scatter and listed in a side panel
- [ ] **VIZ-11**: Genres are consistently color-coded across all views in the application

### Visualization — Topology Views

- [ ] **TOPO-01**: User sees a 2D heatmap of the persistence image for the currently selected genre or book, with axes labeled (scale, persistence) after the 45-degree coordinate rotation
- [ ] **TOPO-02**: User can switch the persistence image between H₀, H₁, and H₂ tabs (H₂ tab disabled unless H₂ toggle is on)
- [ ] **TOPO-03**: User sees a separate 3D scatter plot showing the animated Vietoris-Rips filtration — same word positions from the selected projection, separate camera
- [ ] **TOPO-04**: User controls a filtration radius slider (ε) in the Vietoris-Rips plot; as ε increases, edges appear between words whose TF-IDF-weighted balls have overlapped
- [ ] **TOPO-05**: When a topological feature (H₁ loop, H₂ void) is born or dies at the current ε value, the relevant boundary edges are highlighted in a distinct color
- [ ] **TOPO-06**: Persistence image panel updates when the selected genre or book changes without user needing to trigger manual recomputation
- [ ] **TOPO-07**: Selecting a book/genre in any panel (scatter, Vietoris-Rips, persistence image) updates all synchronized panels simultaneously (brushing and linking)

### Genre Comparison

- [ ] **COMP-01**: User can select any two genres for side-by-side comparison; both genres' brightness maps and persistence images are displayed simultaneously
- [ ] **COMP-02**: Comparison view uses a consistent color scale so brightness intensities are directly comparable between the two genres

### Genre Classification

- [ ] **CLASS-01**: User can upload a plain .txt file via drag-and-drop or file picker; client validates file extension, size (≤5MB), and encoding before upload
- [ ] **CLASS-02**: System processes the uploaded book through the full pipeline (tokenize → TF-IDF → point cloud → persistent homology → feature vector → SVM) and returns a predicted genre with confidence score
- [ ] **CLASS-03**: After classification, the uploaded book appears in the 3D scatter visualization with its TF-IDF brightness active, positioned in the shared embedding space
- [ ] **CLASS-04**: User sees a staged progress indicator naming each pipeline step during classification ("Tokenizing text...", "Computing TF-IDF...", "Computing persistent homology (step 3/5)...", etc.)
- [ ] **CLASS-05**: System returns actionable error messages for failed uploads (wrong format, too large, too few words <500, encoding issues, language detection failure)

### Parameter Controls

- [ ] **PARAM-01**: Instant-tier controls update without debounce: projection method (PCA/KPCA/UMAP/t-SNE), point size, opacity, color scheme, H₀/H₁/H₂ tab
- [ ] **PARAM-02**: Fast-tier controls (100ms-2s) are debounced at 200ms: TF-IDF threshold filter, brightness sensitivity, book selection slider, genre dropdown, 2D/3D toggle
- [ ] **PARAM-03**: Slow-tier parameters show a "Parameters changed — click Recompute" badge; user triggers recomputation explicitly: persistence image resolution (M×M), Gaussian σ, K (cluster count), α (feature weighting), SVM γ and C, ε_max and step size
- [ ] **PARAM-04**: Very-slow-tier parameters (Word2Vec dimension, context window) show an explicit warning ("This will retrain the Word2Vec model — est. 2-5 min") with a confirm step before triggering
- [ ] **PARAM-05**: While recomputation runs in the background, current visualization remains interactive with a dim overlay and "Updating..." badge; new results replace the view when ready
- [ ] **PARAM-06**: System recomputes only the affected downstream pipeline subtree when a parameter changes (e.g., changing projection method recomputes 3D coordinates only; changing σ recomputes persistence images only — does not retrain SVM)

### Pipeline Explanation

- [ ] **EXPLAIN-01**: User can access an interactive step-by-step walkthrough of the mathematical pipeline, where each step shows the user's actual uploaded/selected book's data (not toy examples)

### UX & Polish

- [ ] **UX-01**: Staged progress indicators with step names appear for all computations exceeding 1 second; computations exceeding 2 seconds include a cancel button
- [ ] **UX-02**: All error states include specific, actionable messages (not generic "error occurred")
- [ ] **UX-03**: User can export current visualization as PNG or SVG; user can export current persistence diagram data as CSV
- [ ] **UX-04**: Keyboard shortcuts available: R = reset camera, 1-4 = switch projection methods, Esc = deselect point
- [ ] **UX-05**: A persistent disclaimer is visible in the Vietoris-Rips and scatter views noting that topology is computed in the original N-dimensional space and the 3D view is a lossy projection

### Corpus & Data

- [ ] **CORPUS-01**: App ships with a bundled labeled corpus of 50-100 public domain books sourced from Project Gutenberg, spanning 5-8 literary genres (horror, romance, detective, sci-fi, literary fiction, etc.) with genre labels assigned by the development team
- [ ] **CORPUS-02**: Bundled corpus results (Word2Vec model, TF-IDF weights, persistence diagrams, feature vectors, projections) are pre-computed at build time — not recomputed on each server start
- [ ] **CORPUS-03**: Vietoris-Rips computation enforces a configurable `max_words` cap per book (default 500, max 1000) to prevent computational explosion
- [ ] **CORPUS-04**: All books in the bundled corpus are public domain texts (e.g., Project Gutenberg) to avoid copyright issues

### Infrastructure

- [ ] **INFRA-01**: FastAPI backend serves the API and handles WebSocket connections for real-time pipeline progress streaming
- [ ] **INFRA-02**: Background job queue (arq or Celery + Redis) handles long-running computations asynchronously without blocking the HTTP server
- [ ] **INFRA-03**: Content-addressed cache stores intermediate pipeline results keyed by hash(step_name + params + upstream_key); changing a parameter automatically invalidates only downstream steps
- [ ] **INFRA-04**: React + react-three-fiber (Three.js) frontend handles all 3D rendering and UI state; server is stateless compute
- [ ] **INFRA-05**: Application is containerized (Docker) for reproducible deployment
- [ ] **INFRA-06**: Application is publicly accessible via URL with no login required

---

## v2 Requirements

### Advanced Sharing & Collaboration
- **SHARE-01**: Shareable URLs encode current view state (selected genre, projection method, parameter values) so users can share specific visualizations
- **SHARE-02**: Bookmarking of parameter configurations with user-defined labels

### Extended Topology
- **EXT-01**: H₃ and higher-dimensional homology (deferred — feasibility unclear at typical word counts)
- **EXT-02**: Mapper algorithm as alternative topological representation (complement to Rips filtration)

### Advanced Corpus Management
- **CORP-01**: User can define custom genre labels for their uploaded books and add them to the classification pool
- **CORP-02**: Batch upload of multiple books at once

### Polish
- **POL-01**: Nearest neighbors panel (click a word → see N nearest words in embedding space ranked by cosine similarity)
- **POL-02**: Mobile-responsive read-only view (simplified, no 3D interaction; "best on desktop" prompt)
- **POL-03**: Keyboard shortcut cheat sheet (overlay triggered by ?)

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Per-book Word2Vec models | Breaks the shared embedding space mathematical invariant — all semantic comparisons require identical coordinate systems |
| PDF or EPUB parsing | Format extraction is a separate problem domain; dirty text corrupts tokenization invisibly. Accept .txt only. |
| User accounts / authentication | Adds infrastructure complexity with no value for a stateless exploration tool; kills casual adoption |
| Server-side session persistence | Fragile at scale; all UI state lives client-side, server is stateless compute |
| Custom user-uploaded Word2Vec models | Dimension/vocabulary mismatches cause silent failures; one shared model trained on bundled corpus |
| Non-English corpora | Stopword lists, tokenization, and Word2Vec training assumptions are English-centric |
| Mobile-native 3D interaction | Interactive 3D WebGL is a poor mobile experience; desktop-targeted with basic tablet read-only |
| Real-time recomputation on every slider pixel | Would make the app unusable; tiered computation model with debounce and explicit triggers |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VALID-01 | Phase 1 | Pending |
| VALID-02 | Phase 1 | Pending |
| VALID-03 | Phase 1 | Pending |
| PIPE-01 | Phase 1 | Pending |
| PIPE-02 | Phase 1 | Pending |
| PIPE-03 | Phase 1 | Pending |
| PIPE-04 | Phase 1 | Pending |
| PIPE-05 | Phase 1 | Pending |
| HOM-01 | Phase 1 | Pending |
| HOM-02 | Phase 1 | Pending |
| HOM-03 | Phase 1 | Pending |
| HOM-04 | Phase 1 | Pending |
| HOM-05 | Phase 1 | Pending |
| HOM-06 | Phase 1 | Pending |
| HOM-07 | Phase 1 | Pending |
| HOM-08 | Phase 1 | Pending |
| CORPUS-01 | Phase 1 | Pending |
| CORPUS-03 | Phase 1 | Pending |
| CORPUS-04 | Phase 1 | Pending |
| INFRA-01 | Phase 2 | Pending |
| INFRA-02 | Phase 2 | Pending |
| INFRA-03 | Phase 2 | Pending |
| CORPUS-02 | Phase 2 | Pending |
| CLASS-01 | Phase 2 | Pending |
| CLASS-02 | Phase 2 | Pending |
| CLASS-04 | Phase 2 | Pending |
| CLASS-05 | Phase 2 | Pending |
| UX-01 | Phase 2 | Pending |
| UX-02 | Phase 2 | Pending |
| INFRA-04 | Phase 3 | Pending |
| VIZ-01 | Phase 3 | Pending |
| VIZ-02 | Phase 3 | Pending |
| VIZ-03 | Phase 3 | Pending |
| VIZ-04 | Phase 3 | Pending |
| VIZ-05 | Phase 3 | Pending |
| VIZ-06 | Phase 3 | Pending |
| VIZ-07 | Phase 3 | Pending |
| VIZ-08 | Phase 3 | Pending |
| VIZ-09 | Phase 3 | Pending |
| VIZ-10 | Phase 3 | Pending |
| VIZ-11 | Phase 3 | Pending |
| CLASS-03 | Phase 3 | Pending |
| PARAM-01 | Phase 3 | Pending |
| PARAM-02 | Phase 3 | Pending |
| UX-04 | Phase 3 | Pending |
| TOPO-01 | Phase 4 | Pending |
| TOPO-02 | Phase 4 | Pending |
| TOPO-03 | Phase 4 | Pending |
| TOPO-04 | Phase 4 | Pending |
| TOPO-05 | Phase 4 | Pending |
| TOPO-06 | Phase 4 | Pending |
| TOPO-07 | Phase 4 | Pending |
| COMP-01 | Phase 4 | Pending |
| COMP-02 | Phase 4 | Pending |
| PARAM-03 | Phase 4 | Pending |
| PARAM-04 | Phase 4 | Pending |
| PARAM-05 | Phase 4 | Pending |
| PARAM-06 | Phase 4 | Pending |
| EXPLAIN-01 | Phase 4 | Pending |
| UX-03 | Phase 4 | Pending |
| UX-05 | Phase 4 | Pending |
| INFRA-05 | Phase 5 | Pending |
| INFRA-06 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 63 total
- Mapped to phases: 63
- Unmapped: 0

**Note:** The original count of 57 was incorrect. Actual count is 63 requirements across 12 categories.

---
*Requirements defined: 2026-04-11*
*Last updated: 2026-04-11 after roadmap creation*
