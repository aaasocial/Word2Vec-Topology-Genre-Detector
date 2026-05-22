# Features Research

**Domain:** Computational literary analysis with TDA + NLP visualization
**Researched:** 2026-04-11
**Overall confidence:** MEDIUM-HIGH

## Existing Tools Landscape

### TDA Visualization Tools

**Giotto-TDA** — The most complete Python TDA library with scikit-learn compatibility. Provides Mapper, persistent homology, and persistence diagram vectorization. Has interactive plotting with memory caching for real-time hyperparameter tuning. However, it is a library, not a hosted app — users must write Python code. No web deployment story.

**KeplerMapper** — Python implementation of the Mapper algorithm. Generates standalone HTML visualizations with d3-force graphs, color-coded nodes, histograms per node, and a search bar. Limitations: no real-time parameter tuning in the browser, no caching, not scikit-learn pipeline compatible. Visualizations are static exports, not live-interactive apps.

**TDAview** — Online Mapper visualization tool targeting biologists/clinicians without programming knowledge. Handles tens of thousands of data points. Supports Euclidean and correlation distances, several filter functions. Limitation: restricted set of built-in analysis options — users needing custom distances must pre-compute in R and upload JSON. No persistent homology visualization (Mapper only).

**TopoEmbedding** — Web tool for interactive visualization of persistence-based descriptors. Designed for non-experts. Simplifies exploration of TDA descriptor similarities. Academic prototype — limited polish and maintenance.

**VisualizePH** — WebGL-based interactive tool for persistent homology of triangle shapes. Features persistence pair visualization in 3D, lasso/box selection linking persistence diagram to 3D view. Narrow scope (triangle shapes only), but demonstrates good linked-view interaction patterns.

**RIVET** — Desktop tool for computing and visualizing 2-parameter persistent homology. Powerful but desktop-only, steep learning curve.

### NLP / Embedding Visualization Tools

**TensorFlow Embedding Projector** — The gold standard for embedding visualization UX. Features: 3D scatter with PCA/t-SNE/UMAP/custom projections, click-to-inspect nearest neighbors, search with highlight, bookmarks for saving/sharing state, color-by-metadata, 2D/3D toggle. Standalone at projector.tensorflow.org or embedded in TensorBoard. Limitation: designed for generic embeddings, no domain-specific features (no TF-IDF weighting, no topological features, no genre-specific views).

**BertViz** — Attention visualization for transformers. Different domain (attention heads, not embeddings in space) but demonstrates good patterns for layered, selectable views of model internals.

### Literary / Digital Humanities Tools

**Voyant Tools** — The dominant web-based text analysis tool for humanities scholars. Word clouds, frequency trends, collocations, concordance. Drag-and-drop text upload. Limitations: unstable/slow under load, no automated topic grouping, no semantic embeddings, frequency-only analysis (no geometry, no topology). No machine learning pipeline.

**InfraNodus** — Text network analysis tool positioned as a Voyant alternative. Uses network graphs to reveal conceptual connections. More semantic than Voyant but no embedding-space geometry.

**Bookworm** — Visualizes trends in digitized text repositories. Time-series focused, not geometric/topological.

### Gap Analysis

No existing tool combines:
1. Word embedding visualization with TF-IDF weighting per book
2. Persistent homology computation and visualization
3. Genre classification via SVM on topological + location features
4. Interactive parameter tuning with live recomputation
5. User text upload for classification

The closest composite would be: TensorFlow Projector (embedding viz) + Giotto-TDA (persistent homology) + Voyant Tools (literary text upload) — but they do not interoperate and none provides the topological-genre-classification pipeline.

**Confidence: HIGH** — these are well-known tools verified through official documentation and published papers.

## Table Stakes

Features users of TDA/NLP research visualization tools expect. Absence would feel broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Progress indicators for long computations** | Word2Vec training, persistent homology, and dimensionality reduction take seconds to minutes. Users will assume the app froze without feedback. | Medium | Must show which pipeline stage is running, not just a spinner. "Computing persistent homology (step 3/5)..." |
| **Export persistence diagrams / images** | Researchers need publication-quality figures. Every TDA tool supports PNG/SVG export of diagrams. | Low | SVG preferred for publications. Include axis labels and scales. |
| **Export raw data (CSV/JSON)** | Researchers need to take computed features into their own analysis pipelines. TDAview, Giotto-TDA, and Projector all support data export. | Low | Persistence diagrams, feature vectors, projection coordinates. |
| **Hover/click inspection of points** | TensorFlow Projector, KeplerMapper, and every scatter plot tool shows point details on hover. Users will try to hover immediately. | Low | Show word, TF-IDF weight, book of origin, nearest neighbors. |
| **Color coding by category** | Every embedding visualizer colors by metadata. Genre color is the minimum. | Low | Consistent color palette across all views. |
| **Responsive 3D navigation** | Orbit, pan, zoom via mouse. TensorFlow Projector and Plotly both provide this. Laggy rotation kills the experience. | Low | Use WebGL-accelerated rendering (Plotly GL or Three.js). |
| **Linked views** | When selecting a book in one panel, the other panels (persistence image, scatter plot) should update. VisualizePH demonstrates this well with lasso selection linking to persistence pairs. | Medium | Core to the multi-view layout. |
| **Loading states with stage names** | Distinguish "uploading file" from "tokenizing" from "computing homology." Users need to know where they are. | Low | Especially critical for the classification pipeline which has 5+ stages. |
| **Error messages with actionable guidance** | "File too large" is useless. "File exceeds 5MB limit. Try uploading a shorter excerpt or a plain .txt file." is useful. | Low | Cover: wrong file type, too large, too few words, encoding issues. |
| **Keyboard shortcuts for common actions** | Researchers exploring data want to toggle views, reset camera, cycle projections without reaching for buttons. | Low | At minimum: R to reset camera, 1-4 for projection methods, Esc to deselect. |

**Confidence: HIGH** — derived from direct feature analysis of TensorFlow Projector, Giotto-TDA, KeplerMapper, TDAview, and Voyant Tools.

## Differentiators

Features that no existing tool provides, which would make this app uniquely valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **TF-IDF brightness/size encoding in 3D** | No embedding visualizer weights points by per-document importance. Seeing which words "light up" for horror vs. romance is immediately compelling and intuitive. | Medium | This is the app's signature visual. Size + brightness + color = three visual channels encoding genre, importance, and position simultaneously. |
| **Animated Vietoris-Rips assembly** | No web tool animates the filtration process. Watching edges and simplices appear as epsilon grows makes persistent homology tangible for non-experts. Existing tools show static barcodes/diagrams. | High | Needs efficient edge-drawing at interactive frame rates. Pre-compute edge lists at discrete epsilon values server-side, stream to client. |
| **Per-book slider within genre** | No tool lets you "scrub" through individual books within a genre to see vocabulary emphasis shift. This reveals subgenre structure (e.g., cosmic horror vs. gothic horror) interactively. | Medium | Requires per-book TF-IDF precomputed. UI: genre dropdown then book slider. |
| **Integrated classification pipeline** | Upload text, get genre prediction with confidence, AND see where the book lands in the visualization. No tool closes the loop from "classify my text" to "show me why." | High | The "show me why" part (placing the uploaded book in the existing visualization) is the differentiator. Just a prediction score is commodity. |
| **Live parameter exploration** | Change Word2Vec dimensions, TF-IDF threshold, epsilon max, persistence image resolution, SVM kernel parameters — and watch everything downstream recompute. Giotto-TDA has caching for Mapper params but not a full pipeline. | High | This is an exploration/learning tool. Parameters are the point. Requires careful dependency graph for partial recomputation. |
| **Interactive pipeline explanation** | Step-by-step walkthrough of the math with the user's actual data. Not a static tutorial — shows "here is YOUR book's point cloud" at each stage. | Medium | Differentiated because it teaches with the user's own data, not toy examples. |
| **Side-by-side genre comparison** | Select two genres, see their brightness maps and persistence images juxtaposed. No tool provides comparative TDA views. | Medium | Simple layout but powerful for understanding what makes genres topologically distinct. |
| **Persistence image heatmap with H0/H1/H2 tabs** | Most tools show barcodes or scatter diagrams. Persistence images as heatmaps are more visually intuitive for non-experts, and tabbing between homology dimensions reveals different structural aspects. | Medium | Persistence images are a vectorization — showing them as heatmaps makes the "fingerprint" metaphor tangible. |

**Confidence: HIGH** — gap analysis based on direct examination of existing tools confirms none provide these specific features.

## Anti-Features

Things to explicitly NOT build, based on what frustrates users of similar tools.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **User accounts / authentication** | Adds complexity with no value for an exploration tool. Voyant Tools works without login and that is a major adoption driver. Adding auth kills casual exploration. | Stateless sessions. If sharing state is needed later, use URL-encoded state or shareable links with embedded parameters. |
| **Server-side session state** | Fragile, doesn't scale, causes "your session expired" errors that destroy work. Voyant Tools suffers from this. | Client holds all UI state. Server is stateless compute: receives parameters + data, returns results. |
| **Auto-play animations** | The Vietoris-Rips animation should NOT auto-play on load. Users need to control the pace. Auto-playing complex 3D animations causes confusion and performance issues. | Default to static view. User clicks play or drags the epsilon slider. |
| **Overwhelming parameter panels** | Exposing every parameter at once (Word2Vec dim, window, min_count, TF-IDF threshold, epsilon max, grid resolution, SVM C, gamma, alpha...) will paralyze users. | Progressive disclosure: show 3-4 key parameters by default. "Advanced" expandable section for the rest. Sensible defaults that work well. |
| **Real-time recomputation on every keystroke/pixel of slider drag** | Heavy computations (persistent homology, Word2Vec) triggered on every slider movement will make the app unusable. | Debounce sliders (200-400ms). For expensive operations (>2s), use explicit "Recompute" button instead of auto-trigger. Show "parameters changed, click to update" indicator. |
| **3D-only visualization** | 3D scatter plots have well-documented UX issues: occlusion, difficulty judging position on z-axis, disorientation after rotation. Forcing 3D-only alienates users who want quick comparisons. | Provide 2D projection option alongside 3D. Default to 3D but make 2D one click away. |
| **Massive file upload support** | Accepting arbitrarily large files (entire novel collections, 100MB+ uploads) would require infrastructure for long-running jobs, progress tracking, failure recovery — all complex. The app's value is per-book analysis. | Cap at reasonable limits (e.g., 5MB per file, plain text only). The bundled corpus handles the multi-book case. User uploads are for "classify MY book." |
| **Custom Word2Vec model upload** | Letting users bring their own pre-trained models introduces compatibility nightmares (different dimensions, different vocabularies, version mismatches). | One shared model trained on the bundled corpus. If users upload books, those books get TF-IDF weights in the existing space — they don't retrain the model. |
| **Mobile-optimized 3D** | 3D interactive WebGL on mobile is a poor experience: small touch targets, no hover, limited GPU. Trying to make it work degrades the desktop experience. | Responsive layout that is usable on tablet (read-only, simplified views) but the full 3D interactive experience is desktop-targeted. Show a "best on desktop" note on mobile. |
| **PDF / EPUB parsing** | Format parsing is an entire problem domain. PDFs have headers, footers, page numbers embedded in text. EPUBs have markup. Getting clean text from these formats is error-prone and the errors are invisible (corrupted tokenization). | Accept plain .txt only. Provide clear instructions: "Copy your text into a .txt file." This is an analysis tool, not a file converter. |

**Confidence: HIGH** — anti-features derived from documented limitations and user complaints about Voyant Tools, TensorFlow Projector, KeplerMapper, and TDAview.

## Parameter UI Patterns

Best practices for the "adjust parameter, recompute, visualize" loop that is central to this app.

### Tiered Computation Cost Model

Not all parameters cost the same to recompute. The UI must reflect this.

| Tier | Example Parameters | Latency | UI Pattern |
|------|-------------------|---------|------------|
| **Instant** (<100ms) | Projection method toggle, color scheme, point size, opacity | Immediate | Update on change. No debounce needed. No loading indicator. |
| **Fast** (100ms-2s) | TF-IDF brightness threshold, genre toggle, book selection, 2D/3D toggle | Debounced | Debounce 200ms. Brief fade/skeleton during update. |
| **Slow** (2s-30s) | Dimensionality reduction (UMAP, t-SNE), persistence image resolution, SVM hyperparameters | Explicit trigger | Show "Parameters changed" badge. User clicks "Recompute." Progress bar with stage name. Cancel button. |
| **Very slow** (30s+) | Word2Vec retraining, full persistent homology on large point clouds | Background job | "This will take ~2 minutes. Computing..." with progress. Results replace current view when ready. User can continue exploring current state while waiting. |

### Debouncing Strategy

- Sliders: 200-400ms debounce. Show the value in real time (label updates instantly) but defer computation.
- Text inputs (numeric): 500ms debounce after last keystroke.
- Dropdowns/toggles: Immediate (these are deliberate user choices, not continuous adjustments).

### Partial Recomputation

Build a dependency graph of computations:

```
Word2Vec model
  -> TF-IDF weights (per book)
    -> Point clouds
      -> Dimensionality reduction (for viz)
      -> Persistent homology (for classification)
        -> Persistence images
          -> Feature vectors
            -> SVM classification
```

When a parameter changes, only recompute the affected subtree. For example, changing the projection method (PCA to UMAP) only recomputes the visualization projection — it does not touch persistent homology or classification.

### Loading State Patterns

- **Skeleton screens** for fast updates (show the layout with placeholder content).
- **Progress bars with stage labels** for slow computations ("Computing Vietoris-Rips filtration... 45%").
- **Stale data overlay** for background recomputation: dim the current visualization slightly, show "Updating..." badge, replace when new data arrives. User can still interact with stale data.
- **Cancel button** for any computation over 2 seconds. Use web worker termination + restart pattern.

### Server vs. Client Computation

- **Client-side** (web workers): Dimensionality reduction on pre-computed embeddings, persistence image rendering, 3D scene updates, TF-IDF threshold filtering.
- **Server-side**: Word2Vec training, persistent homology (Ripser), SVM training/prediction, initial corpus processing.

**Confidence: MEDIUM-HIGH** — patterns synthesized from Giotto-TDA caching approach, general reactive UI best practices, and Plotly/d3 interaction patterns. The tiered model is an original synthesis for this project's specific computation profile.

## Corpus Management Patterns

### Upload Flow

1. **Pre-upload expectations**: Show accepted format (.txt), size limit (e.g., 5MB), and what will happen ("Your text will be tokenized, weighted by TF-IDF, and classified").
2. **Drag-and-drop zone** with fallback file picker button. Large, obvious drop target.
3. **Client-side validation before upload**: Check file extension, file size, basic encoding sniff. Reject immediately with specific reason.
4. **Upload progress bar** (for the HTTP transfer itself).
5. **Server-side processing pipeline with stage updates**:
   - "Tokenizing text..." (fast)
   - "Computing TF-IDF weights..." (fast)
   - "Building point cloud..." (fast)
   - "Computing persistent homology..." (slow — show progress %)
   - "Running classifier..." (fast)
   - "Generating projections..." (medium)
6. **Result display**: Genre prediction with confidence score, then the book appears in the visualization.

### Validation Rules

| Check | When | Error Message |
|-------|------|---------------|
| File extension | Client-side, before upload | "Only .txt files are accepted. Please save your text as a plain text file." |
| File size | Client-side, before upload | "File exceeds 5MB limit. Try a shorter excerpt." |
| Encoding | Server-side, after upload | "Could not read file encoding. Please save as UTF-8." |
| Minimum word count | Server-side, after tokenization | "Text contains only 150 unique words (minimum: 500). The analysis needs more text for meaningful results." |
| Language detection | Server-side, after tokenization | "Text appears to be in French. This tool currently supports English text only." |

### Error Recovery

- Failed uploads: Retain the file reference so user can retry without re-selecting.
- Processing failures: Show which stage failed and why. Offer "Try again" button.
- Partial results: If classification succeeds but visualization projection fails, show the classification result and retry the visualization.

**Confidence: MEDIUM** — patterns from general file upload UX best practices applied to this specific domain. No direct precedent for "upload book for TDA classification" exists.

## 3D Viz UX Patterns

### Essential Interactions (from TensorFlow Projector model)

| Interaction | Implementation | Why |
|-------------|---------------|-----|
| **Orbit rotation** | Click + drag on empty space | Primary exploration mode. Must be smooth (60fps). |
| **Pan** | Right-click + drag OR Shift + click + drag | Navigate to different regions without losing orientation. |
| **Zoom** | Scroll wheel | Zoom into dense clusters. |
| **Click to select point** | Click on point, highlight it, show details in side panel | Primary data inspection mode. |
| **Hover tooltip** | Hover shows word + brief metadata | Quick scanning without committing to selection. |
| **Search and highlight** | Text input highlights matching words in the scatter | Finding specific words in a cloud of thousands. |
| **Reset camera** | Button + keyboard shortcut (R) | Users get disoriented after aggressive rotation. Instant recovery is critical. |
| **Nearest neighbors** | Click point, see N nearest neighbors highlighted and listed | TensorFlow Projector's best feature. Shows local embedding structure. |

### Known Frustrations with 3D Scatter Plots

| Frustration | Mitigation |
|-------------|------------|
| **Occlusion** — points hidden behind others | Adjustable point opacity/size. Toggle to 2D. Rotation. Selection highlights through occlusion. |
| **Disorientation** — losing sense of axes after rotation | Persistent axis indicator (small XYZ widget in corner). Reset camera button. Optional grid floor plane. |
| **Meaningless axes** — PCA/UMAP dimensions have no semantic meaning | Do NOT label axes with misleading names. Label as "Component 1" or simply hide axis labels. Show explained variance % for PCA. |
| **Performance with many points** — WebGL struggles above 100K-200K points | Word vocabularies will be 5K-50K points — well within WebGL limits. Use Plotly's WebGL scatter3d or Three.js with instanced rendering. |
| **Accidental navigation** — trying to click a point but rotating instead | Distinct click vs. drag detection (e.g., click = mousedown + mouseup within 200ms and 5px movement threshold). |
| **Lost selection** — rotating clears the selection | Persist selection through camera changes. Selected point stays highlighted. |

### Multi-View Coordination

The app has multiple synchronized views (scatter plot, persistence image, Vietoris-Rips animation). Coordination patterns:

- **Brushing and linking**: Selection in one view highlights corresponding elements in all views.
- **Master-detail**: Scatter plot is the master view; side panels show details for the current selection.
- **Synchronized camera**: The Vietoris-Rips plot and the main scatter plot should NOT share camera state — they show different things. Independent cameras.
- **Consistent color mapping**: Same genre = same color everywhere. Define a palette once, use it in all views.

**Confidence: HIGH** — TensorFlow Projector, Plotly 3D scatter, and 3D visualization UX research are well-documented domains.

## Feature Priority Summary

| Feature | Priority | Complexity | Phase | Notes |
|---------|----------|------------|-------|-------|
| 3D scatter with PCA/UMAP/t-SNE/KPCA | P0 - Core | Medium | 1 | Foundation of all visualization |
| Genre color coding | P0 - Core | Low | 1 | Minimum viable visual encoding |
| Hover/click point inspection | P0 - Core | Low | 1 | Table stakes for any scatter viz |
| TF-IDF brightness/size encoding | P0 - Core | Medium | 1 | Signature differentiator |
| Genre toggle (illuminate one genre) | P0 - Core | Low | 1 | Core exploration interaction |
| Per-book slider | P0 - Core | Medium | 1 | Key differentiator for subgenre exploration |
| Persistence image heatmap panel | P0 - Core | Medium | 2 | Second visual pillar (topology viz) |
| H0/H1/H2 tabs | P0 - Core | Low | 2 | Essential context for persistence images |
| Animated Vietoris-Rips plot | P0 - Core | High | 2 | Third visual pillar (filtration animation) |
| Epsilon slider for Vietoris-Rips | P0 - Core | Medium | 2 | Controls the animation |
| Genre comparison view | P1 - Important | Medium | 3 | Side-by-side comparative analysis |
| Genre classifier (upload + predict) | P1 - Important | High | 3 | Closes the "classify my book" loop |
| Pipeline explanation walkthrough | P1 - Important | Medium | 3 | Educational value, differentiation |
| Live parameter controls (basic) | P1 - Important | Medium | 2 | Key sliders for TF-IDF threshold, point count |
| Live parameter controls (advanced) | P2 - Nice | High | 4 | Full pipeline recomputation |
| Progress indicators (staged) | P0 - Core | Medium | 1 | Without these, app feels broken during computation |
| Export (PNG/SVG/CSV) | P1 - Important | Low | 2 | Researchers need publication figures |
| Search and highlight words | P1 - Important | Low | 2 | Find specific words in the cloud |
| Nearest neighbors panel | P2 - Nice | Medium | 3 | Shows local embedding structure |
| Keyboard shortcuts | P2 - Nice | Low | 3 | Power user efficiency |
| Reset camera button | P0 - Core | Low | 1 | Users WILL get disoriented |
| 2D projection toggle | P1 - Important | Low | 2 | Mitigates 3D frustrations |
| Shareable state URLs | P2 - Nice | Medium | 4 | Encoding params in URL for sharing specific views |
| Stale data overlay during recompute | P1 - Important | Medium | 2 | Users can keep exploring while updates compute |

### Phase Grouping Rationale

- **Phase 1**: Get the core 3D scatter visualization working with the bundled corpus. This is the "wow" moment — TF-IDF brightness on word embeddings with genre coloring.
- **Phase 2**: Add the topology visualization layer (persistence images, Vietoris-Rips animation) and basic parameter controls. This completes the visual story.
- **Phase 3**: Add the interactive features that close loops (classifier upload, genre comparison, pipeline explanation). These require a stable foundation.
- **Phase 4**: Polish and power-user features (advanced parameter tuning, shareable URLs, full export suite).

## Sources

- [TensorFlow Embedding Projector](https://projector.tensorflow.org/)
- [TensorFlow Embedding Projector paper](https://arxiv.org/pdf/1611.05469)
- [Giotto-TDA paper](https://arxiv.org/pdf/2004.02551)
- [KeplerMapper documentation](https://kepler-mapper.scikit-tda.org/en/latest/html-visualization-features.html)
- [TDAview paper](https://academic.oup.com/bioinformatics/article/36/18/4805/5866542)
- [TopoEmbedding paper](https://arxiv.org/abs/2204.09783)
- [VisualizePH](https://github.com/IuricichF/VisualizePH)
- [Voyant Tools](https://guides.library.upenn.edu/penntdm/tools/voyant)
- [3D visualization best practices](https://www.highcharts.com/blog/best-practices/3d-graph-useful-visualization-or-misleading-illusion/)
- [3D visualization pitfalls](https://clauswilke.com/dataviz/no-3d.html)
- [Plotly WebGL performance](https://plotly.com/python/performance/)
- [Web worker cancellation patterns](https://webjose.hashnode.dev/finally-cancel-web-workers-work-without-terminating-the-worker)
- [File upload UX best practices](https://uploadcare.com/blog/file-uploader-ux-best-practices/)
- [Async workflow UI patterns](https://blog.logrocket.com/ux-design/ui-patterns-for-async-workflows-background-jobs-and-data-pipelines/)
- [Debouncing in React](https://www.developerway.com/posts/debouncing-in-react)
