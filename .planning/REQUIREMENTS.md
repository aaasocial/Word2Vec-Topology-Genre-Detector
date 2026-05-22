# Requirements: Literary Genre Topology

**Defined:** 2026-04-11
**Core Value:** A user uploads any book and sees where it lives in semantic space — and why the algorithm predicts the genre it does.

---

## v1.0 Requirements (Validated — shipped 2026-04-13)

> All v1 requirements were delivered in phases 1–5. Marked `[x]` below. Traceability table reflects the final status. v2 requirements follow.



### Validation Spike

- [x] **VALID-01**: CLI prototype trains Word2Vec on a 15-book mini-corpus (3 genres × 5 books), computes persistence images for each book, and runs a permutation test confirming topology signal separates genres above chance
- [x] **VALID-02**: CLI prototype validates that the weighted Vietoris-Rips filtration (`d_weighted(i,j) = d(i,j) / (w_i + w_j)`) produces stable persistence diagrams and meaningful separation between genre classes
- [x] **VALID-03**: CLI prototype benchmarks Vietoris-Rips computation time vs. word count and establishes the safe `max_words` cap (target: ≤10s per book)

### Shared Pipeline

- [x] **PIPE-01**: System ingests raw .txt files labeled by genre (bundled corpus + user uploads) and prepares them for analysis
- [x] **PIPE-02**: System tokenizes text, normalizes case, removes punctuation, and filters English stopwords from all input files
- [x] **PIPE-03**: System trains a single shared skip-gram Word2Vec model on the entire corpus (all genres combined), producing one embedding vector per unique word in a shared N-dimensional space
- [x] **PIPE-04**: System computes TF-IDF weights per book, using corpus-level IDF (log(total books / books containing word)) computed without genre labels
- [x] **PIPE-05**: System constructs a per-book weighted point cloud from the shared word vectors (positions) and TF-IDF scores (weights)

### Classification Pipeline

- [x] **HOM-01**: System computes per-book Vietoris-Rips persistent homology in the full N-dimensional embedding space using TF-IDF-weighted filtration (heavy TF-IDF words grow balls faster, modeled via modified distance matrix)
- [x] **HOM-02**: System computes H₀ (connected components) and H₁ (loops) always; H₂ (voids) on-demand when user enables the H₂ toggle
- [x] **HOM-03**: System converts persistence diagrams to fixed-length persistence image vectors using configurable grid resolution (M×M → M² dimensions), Gaussian kernel smoothing (σ adjustable), and (birth, death) → (birth, persistence) coordinate rotation
- [x] **HOM-04**: System clusters all word vectors in the shared embedding space into K semantic regions using k-means (K adjustable, default 50), computed once on the full vocabulary
- [x] **HOM-05**: System computes a per-book K-dimensional word-cluster distribution vector: the total TF-IDF weight of each book falling into each of the K clusters
- [x] **HOM-06**: System concatenates normalized persistence image vector and normalized cluster distribution vector, weighted by user-adjustable α: (α × structure) ⊕ ((1−α) × location)
- [x] **HOM-07**: System trains a kernel SVM (RBF) on the concatenated feature vectors, evaluates using leave-one-out cross-validation, and reports per-class accuracy
- [x] **HOM-08**: System applies PCA dimensionality reduction to the concatenated feature vector before SVM training to prevent overfitting (450D features / ~50-100 books regime)

### Visualization — 3D Brightness Map

- [x] **VIZ-01**: User sees a 3D scatter plot of word embeddings rendered at interactive frame rates (60fps) with up to 50,000 visible points
- [x] **VIZ-02**: User can switch between four projection methods: PCA, Kernel PCA, UMAP, and t-SNE — same words, different 3D arrangements
- [x] **VIZ-03**: Each word's visual brightness and size scales proportionally to its TF-IDF weight in the currently selected genre or book
- [x] **VIZ-04**: User can select any genre from a dropdown; the visualization illuminates that genre's distinctive vocabulary while dimming genre-neutral words
- [x] **VIZ-05**: User can slide through individual books within the selected genre; brightness pattern shifts book-by-book, revealing subgenre structure
- [x] **VIZ-06**: User can hover over any point to see word, TF-IDF weight, genre of origin, and top-5 nearest neighbors in embedding space
- [x] **VIZ-07**: User can click a point to select it; selected point stays highlighted through camera movements and shows detailed panel with nearest neighbors list
- [x] **VIZ-08**: User can orbit, pan, and zoom the scatter plot with mouse/trackpad; a reset-camera button (also R shortcut) returns to default view
- [x] **VIZ-09**: User can toggle between 3D and 2D projection of the scatter plot
- [x] **VIZ-10**: User can search for a specific word; matching points are highlighted in the scatter and listed in a side panel
- [x] **VIZ-11**: Genres are consistently color-coded across all views in the application

### Visualization — Topology Views

- [x] **TOPO-01**: User sees a 2D heatmap of the persistence image for the currently selected genre or book, with axes labeled (scale, persistence) after the 45-degree coordinate rotation
- [x] **TOPO-02**: User can switch the persistence image between H₀, H₁, and H₂ tabs (H₂ tab disabled unless H₂ toggle is on)
- [x] **TOPO-03**: User sees a separate 3D scatter plot showing the animated Vietoris-Rips filtration — same word positions from the selected projection, separate camera
- [x] **TOPO-04**: User controls a filtration radius slider (ε) in the Vietoris-Rips plot; as ε increases, edges appear between words whose TF-IDF-weighted balls have overlapped
- [x] **TOPO-05**: When a topological feature (H₁ loop, H₂ void) is born or dies at the current ε value, the relevant boundary edges are highlighted in a distinct color
- [x] **TOPO-06**: Persistence image panel updates when the selected genre or book changes without user needing to trigger manual recomputation
- [x] **TOPO-07**: Selecting a book/genre in any panel (scatter, Vietoris-Rips, persistence image) updates all synchronized panels simultaneously (brushing and linking)

### Genre Comparison

- [x] **COMP-01**: User can select any two genres for side-by-side comparison; both genres' brightness maps and persistence images are displayed simultaneously
- [x] **COMP-02**: Comparison view uses a consistent color scale so brightness intensities are directly comparable between the two genres

### Genre Classification

- [x] **CLASS-01**: User can upload a plain .txt file via drag-and-drop or file picker; client validates file extension, size (≤5MB), and encoding before upload
- [x] **CLASS-02**: System processes the uploaded book through the full pipeline (tokenize → TF-IDF → point cloud → persistent homology → feature vector → SVM) and returns a predicted genre with confidence score
- [x] **CLASS-03**: After classification, the uploaded book appears in the 3D scatter visualization with its TF-IDF brightness active, positioned in the shared embedding space
- [x] **CLASS-04**: User sees a staged progress indicator naming each pipeline step during classification ("Tokenizing text...", "Computing TF-IDF...", "Computing persistent homology (step 3/5)...", etc.)
- [x] **CLASS-05**: System returns actionable error messages for failed uploads (wrong format, too large, too few words <500, encoding issues, language detection failure)

### Parameter Controls

- [x] **PARAM-01**: Instant-tier controls update without debounce: projection method (PCA/KPCA/UMAP/t-SNE), point size, opacity, color scheme, H₀/H₁/H₂ tab
- [x] **PARAM-02**: Fast-tier controls (100ms-2s) are debounced at 200ms: TF-IDF threshold filter, brightness sensitivity, book selection slider, genre dropdown, 2D/3D toggle
- [x] **PARAM-03**: Slow-tier parameters show a "Parameters changed — click Recompute" badge; user triggers recomputation explicitly: persistence image resolution (M×M), Gaussian σ, K (cluster count), α (feature weighting), SVM γ and C, ε_max and step size
- [x] **PARAM-04**: Very-slow-tier parameters (Word2Vec dimension, context window) show an explicit warning ("This will retrain the Word2Vec model — est. 2-5 min") with a confirm step before triggering
- [x] **PARAM-05**: While recomputation runs in the background, current visualization remains interactive with a dim overlay and "Updating..." badge; new results replace the view when ready
- [x] **PARAM-06**: System recomputes only the affected downstream pipeline subtree when a parameter changes (e.g., changing projection method recomputes 3D coordinates only; changing σ recomputes persistence images only — does not retrain SVM)

### Pipeline Explanation

- [x] **EXPLAIN-01**: User can access an interactive step-by-step walkthrough of the mathematical pipeline, where each step shows the user's actual uploaded/selected book's data (not toy examples)

### UX & Polish

- [x] **UX-01**: Staged progress indicators with step names appear for all computations exceeding 1 second; computations exceeding 2 seconds include a cancel button
- [x] **UX-02**: All error states include specific, actionable messages (not generic "error occurred")
- [x] **UX-03**: User can export current visualization as PNG or SVG; user can export current persistence diagram data as CSV
- [x] **UX-04**: Keyboard shortcuts available: R = reset camera, 1-4 = switch projection methods, Esc = deselect point
- [x] **UX-05**: A persistent disclaimer is visible in the Vietoris-Rips and scatter views noting that topology is computed in the original N-dimensional space and the 3D view is a lossy projection

### Corpus & Data

- [x] **CORPUS-01**: App ships with a bundled labeled corpus of 50-100 public domain books sourced from Project Gutenberg, spanning 5-8 literary genres (horror, romance, detective, sci-fi, literary fiction, etc.) with genre labels assigned by the development team
- [x] **CORPUS-02**: Bundled corpus results (Word2Vec model, TF-IDF weights, persistence diagrams, feature vectors, projections) are pre-computed at build time — not recomputed on each server start
- [x] **CORPUS-03**: Vietoris-Rips computation enforces a configurable `max_words` cap per book (default 500, max 1000) to prevent computational explosion
- [x] **CORPUS-04**: All books in the bundled corpus are public domain texts (e.g., Project Gutenberg) to avoid copyright issues

### Infrastructure

- [x] **INFRA-01**: FastAPI backend serves the API and handles WebSocket connections for real-time pipeline progress streaming
- [x] **INFRA-02**: Background job queue (arq or Celery + Redis) handles long-running computations asynchronously without blocking the HTTP server
- [x] **INFRA-03**: Content-addressed cache stores intermediate pipeline results keyed by hash(step_name + params + upstream_key); changing a parameter automatically invalidates only downstream steps
- [x] **INFRA-04**: React + react-three-fiber (Three.js) frontend handles all 3D rendering and UI state; server is stateless compute
- [x] **INFRA-05**: Application is containerized (Docker) for reproducible deployment
- [x] **INFRA-06**: Application is publicly accessible via URL with no login required

---

## v2.0 Requirements

**Milestone goal:** Improve classification accuracy via a better-sourced corpus, add explainability and top-N predictions, sweep v1 bugs, and round out the visual experience with theming and onboarding. See `.planning/research/SUMMARY.md` for the research that grounds these requirements.

### Bug-Fix Sweep (Phase 6)

- [ ] **BUG-01**: System computes H₂ persistent homology and exposes it via the H₂ heatmap tab; tooltip on the disabled H₂ control surfaces guidance ("Enable H₂ in Settings"). Backed by `ripser(maxdim=2)` with a hard timeout and dedicated worker queue per `PITFALLS.md §2`.
- [ ] **BUG-02**: Persistence-diagram dots scale by sqrt(persistence) for finite points; H₀ infinite-persistence points use a dedicated marker so all classes are readable at any zoom level (`PITFALLS.md §10`).
- [ ] **BUG-03**: BookSlider fetches book metadata from a new `GET /api/corpus/genres/{genre}/books` endpoint and lets the user slide through every book within the selected genre, with title + author + word count surfaced.
- [ ] **BUG-04**: ROADMAP.md and STATE.md are restored as living planning documents; a pre-commit hook rejects 0-byte commits to `.planning/**/*.md` to prevent recurrence (`PITFALLS.md §15`).
- [ ] **BUG-05**: Content-addressed `cache_key` includes `corpus_hash` and `w2v_model_sha256` so a corpus change or Word2Vec retrain forces a cache miss across all precomputed artifacts (latent v1 bug, must land before Phase 8 — `PITFALLS.md §1`).

### Corpus Sourcing Research Spike (Phase 7) — research-only, no implementation

- [ ] **RES-01**: Produce `.planning/research/v2/CORPUS_SOURCING.md` selecting source(s) (Gutenberg / Open Library / HuggingFace datasets / Internet Archive), target book count per genre, target genre count, and per-genre author distribution constraints.
- [ ] **RES-02**: Produce `.planning/research/v2/VALIDATION_PROTOCOL.md` defining a v1-frozen test set, `GroupKFold(groups=author)` cross-validation, macro-F1 as the headline metric, and permutation null hypothesis test (`PITFALLS.md §4–6`).
- [ ] **RES-03**: Decide whether v2 adopts multi-label classification (recommendation: defer to v3); document decision and rationale in the sourcing doc.

### Corpus Expansion (Phase 8)

- [ ] **CEXP-01**: `corpus/books.yaml` extended with `author` and `word_count` fields per book; new books added per Phase 7's `CORPUS_SOURCING.md` recommendation.
- [ ] **CEXP-02**: System retrains Word2Vec and SVM end-to-end on the expanded corpus; new model assets pushed to a versioned GitHub Release (`v2.0-data`).
- [ ] **CEXP-03**: System evaluates the v2 model on the v1-frozen test set defined in `VALIDATION_PROTOCOL.md` and reports macro-F1, per-genre F1, and permutation p-value; v2 macro-F1 must exceed v1 baseline.
- [ ] **CEXP-04**: System validates the expanded corpus with `GroupKFold(groups=author)` cross-validation; per-author held-out test confirms ≤15pp gap vs. LOOCV (`PITFALLS.md §5`).
- [ ] **CEXP-05** *(P2)*: Reproducible `scripts/build_corpus.py` regenerates the corpus from source manifests for audit and reuse.

### Classification Depth (Phase 9)

- [ ] **DEPTH-01**: System returns top-N (default N=3) ranked genre predictions with calibrated probabilities summing to 1 (via `SVC(probability=True)` Platt-scaled, or `CalibratedClassifierCV` if reliability diagram requires) (`PITFALLS.md §7`).
- [ ] **DEPTH-02**: `ClassificationResult` renders top-N as honestly-labeled probability bars — no pie charts, no hidden low-confidence predictions.
- [ ] **DEPTH-03**: "Why this genre?" expander on `ClassificationResult` calls `POST /api/classify/{job_id}/explain` (synchronous ~200ms, Redis-cached `explain:{feature_vec_hash}` TTL 1h) and renders the explainability payload.
- [ ] **DEPTH-04**: Explainability response includes the 3–5 nearest training books with Euclidean distance in the L2-normalized feature space.
- [ ] **DEPTH-05**: Explainability response includes per-track contribution (topology vs vocabulary) as percentages summing to 100, computed via `permutation_importance` per slab (`PITFALLS.md §9`).
- [ ] **DEPTH-06** *(P2)*: Explainability response includes a TF-IDF-driven "driving words" list with explicit "proxy, not literal classifier inputs" disclosure.
- [ ] **DEPTH-07** *(P2)*: Top-N display includes an entropy / uncertainty badge for ambiguous predictions.

### Visual Polish (Phase 10)

- [ ] **POLISH-01**: User can toggle between light / dark / system themes; choice persists across sessions via a new `preferencesStore` with Zustand `persist` middleware (separate from session-scoped `visualizationStore`).
- [ ] **POLISH-02**: R3F scatter scene background, HoverTooltip, persistence diagrams, and all sidebar/topology/compare components honor the selected theme. Scene background updates imperatively via `scene.background` (no canvas remount — `PITFALLS.md §13`).
- [ ] **POLISH-03**: First-load detection presents a 3–5 step onboarding tour anchored on stable `data-tour-id` selectors (centralised in `src/tour/anchors.ts`); skippable and replayable from a Help menu (`PITFALLS.md §14`).
- [ ] **POLISH-04**: Tour steps cover scatter exploration, genre selection + brightness, upload + classification flow, and the topology tab — NOT the underlying mathematics (that remains in "How It Works").
- [ ] **POLISH-05**: Empty states polished for the upload zone (pre-upload), comparison mode (no genres selected), classification failure, and the explanation panel (no upload yet).

---

## Future Work (Parking Lot)

Captured during v1 planning; deferred from v2.0 scope. Re-evaluate at v3 boundary.

### Advanced Sharing & Collaboration
- **SHARE-01**: Shareable URLs encode current view state (selected genre, projection method, parameter values) so users can share specific visualizations
- **SHARE-02**: Bookmarking of parameter configurations with user-defined labels

### Extended Topology
- **EXT-01**: H₃ and higher-dimensional homology (deferred — feasibility unclear at typical word counts; `FEATURES.md §1` argues hard-cap at maxdim=2)
- **EXT-02**: Mapper algorithm as alternative topological representation (complement to Rips filtration)

### Advanced Corpus Management
- **CORP-01**: User can define custom genre labels for their uploaded books and add them to the classification pool
- **CORP-02**: Batch upload of multiple books at once

### Additional Polish
- **POL-01**: Nearest neighbors panel (click a word → see N nearest words in embedding space ranked by cosine similarity) — partially absorbed by DEPTH-04 nearest-training-books explainability
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
| VALID-01 | Phase 1 | Validated |
| VALID-02 | Phase 1 | Validated |
| VALID-03 | Phase 1 | Validated |
| PIPE-01 | Phase 1 | Validated |
| PIPE-02 | Phase 1 | Validated |
| PIPE-03 | Phase 1 | Validated |
| PIPE-04 | Phase 1 | Validated |
| PIPE-05 | Phase 1 | Validated |
| HOM-01 | Phase 1 | Validated |
| HOM-02 | Phase 1 | Validated |
| HOM-03 | Phase 1 | Validated |
| HOM-04 | Phase 1 | Validated |
| HOM-05 | Phase 1 | Validated |
| HOM-06 | Phase 1 | Validated |
| HOM-07 | Phase 1 | Validated |
| HOM-08 | Phase 1 | Validated |
| CORPUS-01 | Phase 1 | Validated |
| CORPUS-03 | Phase 1 | Validated |
| CORPUS-04 | Phase 1 | Validated |
| INFRA-01 | Phase 2 | Validated |
| INFRA-02 | Phase 2 | Validated |
| INFRA-03 | Phase 2 | Validated |
| CORPUS-02 | Phase 2 | Validated |
| CLASS-01 | Phase 2 | Validated |
| CLASS-02 | Phase 2 | Validated |
| CLASS-04 | Phase 2 | Validated |
| CLASS-05 | Phase 2 | Validated |
| UX-01 | Phase 2 | Validated |
| UX-02 | Phase 2 | Validated |
| INFRA-04 | Phase 3 | Validated |
| VIZ-01 | Phase 3 | Validated |
| VIZ-02 | Phase 3 | Validated |
| VIZ-03 | Phase 3 | Validated |
| VIZ-04 | Phase 3 | Validated |
| VIZ-05 | Phase 3 | Validated |
| VIZ-06 | Phase 3 | Validated |
| VIZ-07 | Phase 3 | Validated |
| VIZ-08 | Phase 3 | Validated |
| VIZ-09 | Phase 3 | Validated |
| VIZ-10 | Phase 3 | Validated |
| VIZ-11 | Phase 3 | Validated |
| CLASS-03 | Phase 3 | Validated |
| PARAM-01 | Phase 3 | Validated |
| PARAM-02 | Phase 3 | Validated |
| UX-04 | Phase 3 | Validated |
| TOPO-01 | Phase 4 | Validated |
| TOPO-02 | Phase 4 | Validated |
| TOPO-03 | Phase 4 | Validated |
| TOPO-04 | Phase 4 | Validated |
| TOPO-05 | Phase 4 | Validated |
| TOPO-06 | Phase 4 | Validated |
| TOPO-07 | Phase 4 | Validated |
| COMP-01 | Phase 4 | Validated |
| COMP-02 | Phase 4 | Validated |
| PARAM-03 | Phase 4 | Validated |
| PARAM-04 | Phase 4 | Validated |
| PARAM-05 | Phase 4 | Validated |
| PARAM-06 | Phase 4 | Validated |
| EXPLAIN-01 | Phase 4 | Validated |
| UX-03 | Phase 4 | Validated |
| UX-05 | Phase 4 | Validated |
| INFRA-05 | Phase 5 | Validated |
| INFRA-06 | Phase 5 | Validated |

**Coverage:**
- v1.0 requirements: 63 total — all Validated (shipped 2026-04-13)
- v2.0 requirements: 25 total (20 must-ship + 5 P2) — pending roadmap mapping
- Unmapped: 0 (v1); 25 awaiting roadmapper for v2

v2 traceability rows will be appended by the roadmapper.

---
*v1 requirements defined: 2026-04-11 — validated 2026-04-13*
*v2 requirements defined: 2026-05-22*
*Last updated: 2026-05-22 — v2.0 milestone scoped*
