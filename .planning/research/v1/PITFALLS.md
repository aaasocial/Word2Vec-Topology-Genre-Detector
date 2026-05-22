# Pitfalls Research

**Domain:** Literary Genre Topology (NLP + TDA + Interactive 3D Web Visualization)
**Researched:** 2026-04-11

---

## Word2Vec Pitfalls

### Critical: Corpus Too Small for Meaningful Embeddings

**What goes wrong:** Word2Vec trained on a small literary corpus (e.g., 30 books, ~3-5M tokens total) produces unstable embeddings where nearest-neighbor relationships shift dramatically between training runs. Genre-distinctive vocabulary ends up with near-random vectors because individual words appear too few times for gradient descent to converge.

**Why it happens:** Word2Vec needs millions of co-occurrence observations to learn stable geometry. Research shows Word2Vec underperforms LSA on corpora below ~10M words. Literary corpora of 30-50 books (~50-80k words each) yield only 1.5-4M tokens -- right at the danger zone. Rare but genre-critical words (e.g., "eldritch" for horror, "warp-drive" for sci-fi) may appear fewer than 5 times total, producing garbage vectors.

**Consequences:** The entire downstream pipeline (TF-IDF weighting, point clouds, persistent homology, classification) operates on meaningless geometry. Results look plausible but are not reproducible.

**Prevention:**
- Set `min_count` conservatively (5-10) to exclude words without enough training signal. Accept smaller vocabulary rather than noisy vectors.
- Use `vector_size=100-150` rather than 300 for small corpora -- fewer parameters need fewer observations to train.
- Use `window=10-15` (larger windows) to capture topical/semantic relationships rather than syntactic ones. Genre signal is semantic, not syntactic. Small windows (2-5) capture syntax which is less genre-distinctive.
- Fix `seed` and set `workers=1` for reproducibility. Run training 3 times and compare nearest-neighbor stability as a smoke test.
- Consider supplementing with a pre-trained embedding (GloVe/fastText) and fine-tuning on the literary corpus. This gives rare words a reasonable starting point.

**Detection:** Compare cosine similarity rankings for known genre-distinctive words across 3 training runs. If top-10 neighbors change substantially, embeddings are unstable.

**Phase:** Must be validated in the very first phase. If embeddings are garbage, nothing downstream works.

**Confidence:** HIGH (well-documented in literature)

---

### Moderate: Window Size Controls What the Embedding Captures

**What goes wrong:** Default window size (~5) optimizes for syntactic similarity. Words that appear in similar grammatical contexts cluster together regardless of genre. Genre signal requires larger windows that capture topical co-occurrence.

**Why it happens:** Small windows make "ran" and "walked" similar (both follow "he/she"). Large windows (10-20) make "spaceship" and "galaxy" similar (both appear in sci-fi paragraphs). Genre classification needs the latter.

**Prevention:** Use window=10-15 for skip-gram. Validate by checking that known genre-specific word pairs (e.g., "vampire"-"blood", "detective"-"clue") have higher cosine similarity than syntactically-similar but genre-unrelated pairs.

**Confidence:** HIGH

---

### Moderate: OOV Words from User Uploads

**What goes wrong:** A user uploads a book containing words not in the training vocabulary. These words are silently dropped, potentially losing the most genre-distinctive vocabulary of the uploaded book (neologisms in sci-fi, archaic terms in historical fiction).

**Why it happens:** Word2Vec has a fixed vocabulary after training. Any word not seen during training has no vector.

**Prevention:**
- Use fastText-style subword embeddings (gensim's FastText) instead of pure Word2Vec. Subword models can synthesize vectors for unseen words from character n-grams. This is the single most impactful change for user-upload robustness.
- If sticking with Word2Vec, log OOV percentage per uploaded book and warn users when it exceeds 15-20%.
- Never silently drop OOV words -- surface the count in the UI so users understand the limitation.

**Confidence:** HIGH

---

### Minor: Non-Deterministic Training

**What goes wrong:** Multi-threaded Word2Vec training is non-deterministic. Different runs produce different embeddings, making debugging impossible and A/B comparisons of parameter changes unreliable.

**Prevention:** Set `workers=1` during development/evaluation. Accept the performance cost. Only switch to multi-worker for final production training where reproducibility is less critical than speed.

**Confidence:** HIGH

---

## TF-IDF Pitfalls

### Critical: IDF Instability with Few Documents

**What goes wrong:** With only 30-50 books, IDF scores are extremely coarse. A word appearing in 1 book vs. 2 books causes IDF to jump from log(30/1)=3.4 to log(30/2)=2.7 -- a 20% drop from a single additional occurrence. Adding or removing one book from the corpus can significantly change the IDF landscape and therefore all downstream point clouds and topology.

**Why it happens:** IDF = log(N/df). With small N, the denominator increments in large relative steps.

**Consequences:** Persistent homology results are sensitive to corpus composition rather than genre structure. The "topological signature" of a genre may actually be an artifact of which specific books happen to be in the corpus.

**Prevention:**
- Use smoothed IDF: `log(1 + N/(1 + df))` to dampen the effect of single-document changes.
- Test robustness by running leave-one-book-out on the corpus and checking whether persistence diagrams change qualitatively. If they do, the TF-IDF weighting is too fragile.
- Document this limitation prominently. The system's reliability improves with more books per genre.
- Consider sub-linear TF (1 + log(tf)) to prevent very long books from dominating through raw term frequency.

**Detection:** Compute the coefficient of variation of IDF scores across bootstrap samples of the corpus. If CV > 0.3 for important words, IDF is too noisy.

**Confidence:** HIGH (basic statistics)

---

### Moderate: Genre Imbalance Skews IDF

**What goes wrong:** If the corpus has 15 romance novels and 3 sci-fi novels, words common across romance appear in many documents and get low IDF, while sci-fi-specific words appear in few documents and get high IDF. This is correct IDF behavior, but it means sci-fi books will have more extreme TF-IDF values, making their point clouds geometrically different from romance point clouds for reasons of corpus composition rather than genre structure.

**Prevention:**
- Balance the corpus: aim for equal books per genre (minimum 5 per genre, ideally 8-10+).
- Alternatively, compute IDF within-genre and normalize, but this introduces genre labels into the "unsupervised" TF-IDF step, creating a subtle circular dependency.
- The cleanest fix: balance the corpus and accept IDF as-is.

**Confidence:** MEDIUM

---

### Minor: Common Words Surviving Stopword Removal

**What goes wrong:** Words like "said", "would", "just", "like" survive standard stopword lists but appear in nearly every book. They get low TF-IDF but nonzero, creating a dense cluster of near-zero-weight words in the point cloud that adds computational cost to persistent homology without topological signal.

**Prevention:** After TF-IDF computation, apply a minimum TF-IDF threshold to exclude words below it from the point cloud. This is already implied by the "top-K words by TF-IDF" approach but should be explicit. A threshold of the bottom 30-50% of TF-IDF scores is a reasonable starting point.

**Confidence:** HIGH

---

## Persistent Homology Pitfalls

### Critical: Weighted Vietoris-Rips Is Not a Standard Off-the-Shelf Feature

**What goes wrong:** The project specifies "Vietoris-Rips filtration, weighted by TF-IDF" where "heavy TF-IDF words grow balls faster." This is NOT how standard weighted Rips works in existing libraries. Standard WeightedRipsPersistence in giotto-tda uses distance-to-measure (DTM) weighting, which assigns weights based on local density (outlier detection), not per-point importance weights.

**Why it happens:** The project's weighting concept (important words = faster ball growth = earlier appearance in filtration) requires modifying the effective distance metric. Specifically, if word i has TF-IDF weight w_i, its "ball" at filtration parameter epsilon has effective radius w_i * epsilon. Two words i,j form an edge when d(i,j) <= w_i * epsilon + w_j * epsilon. This is a custom weighted filtration that does NOT match DTM weighting.

**Consequences:** You cannot simply pass TF-IDF weights to giotto-tda's WeightedRipsPersistence and get the intended behavior. The DTM weights would treat low-TF-IDF words as "outliers" and suppress them, which is sort of similar but mathematically different.

**Prevention:**
- **Option A (recommended):** Implement the custom weighted filtration by modifying the distance matrix. Given points with positions p_i and weights w_i, compute a modified distance matrix where d_weighted(i,j) = d(i,j) / (w_i + w_j). Then run standard (unweighted) Vietoris-Rips on this modified distance matrix. This is mathematically equivalent to the "balls grow at different rates" model and works with any standard Ripser/giotto-tda implementation.
- **Option B:** Use giotto-tda's WeightedRipsPersistence with a custom callable that returns TF-IDF weights. This is supported (the `weights` parameter accepts callables returning 1D arrays) but the mathematical semantics are DTM-style, not the "ball growth rate" model described in the project spec.
- **Option C:** Accept DTM-style weighting and reframe the project description. DTM weighting suppresses outlier words (low-density regions), which overlaps with but is not identical to TF-IDF importance weighting.
- Whichever option: document the exact mathematical definition of the filtration used, because "weighted Vietoris-Rips" is ambiguous.

**This needs a spike.** The mathematical translation from "TF-IDF weights control ball growth rate" to a concrete distance matrix modification must be validated before building the pipeline.

**Confidence:** HIGH (verified against giotto-tda docs)

---

### Critical: Computational Explosion with Point Count

**What goes wrong:** Vietoris-Rips complex construction is O(n^d) where n is point count and d is the maximum homology dimension. For H_1 (1-dimensional holes), you need all triangles; for H_2, all tetrahedra. With 5,000 words per book, the number of potential triangles is C(5000,3) ~ 20 billion.

**Practical limits based on benchmarks:**
- **< 500 points:** Fast, seconds on a laptop. Safe for all homology dimensions.
- **500-2,000 points:** Minutes for H_0 and H_1. Feasible but needs max_edge_length cutoff.
- **2,000-5,000 points:** H_0 feasible in minutes, H_1 may take tens of minutes to hours. H_2 likely infeasible.
- **5,000-10,000 points:** H_0 only, and even that may require sparse approximations. H_1 likely requires hours and 16GB+ RAM.
- **> 10,000 points:** Requires subsampling, landmarks, or approximate methods.

**Why it happens:** Ripser is highly optimized but the combinatorial explosion is fundamental. The distance matrix alone for 10,000 points in 100D is 10,000^2 * 8 bytes = 800MB.

**Consequences:** A user uploads a long novel (100k words), TF-IDF selects the top 5,000, and the server hangs for 30 minutes computing persistent homology.

**Prevention:**
- **Hard cap at 500-1,000 words per book for persistent homology input.** This is the most important performance lever. Use TF-IDF ranking to select the most genre-distinctive words.
- Set `max_edge_length` (epsilon_max) to a reasonable cutoff (e.g., 95th percentile of pairwise distances) to avoid computing simplices at unrealistically large filtration values.
- Compute only H_0 and H_1. H_2 (voids) is computationally expensive and unlikely to yield interpretable signal in word embedding space.
- Use Ripser (via giotto-tda or ripser.py) rather than GUDHI for standard Rips -- Ripser is 40x faster and 15x more memory efficient.
- Implement server-side timeouts (30-60 seconds) that return a partial result or error rather than hanging.

**Detection:** Benchmark with 100, 300, 500, 1000, 2000 words and plot runtime. Identify the knee of the curve for your hardware.

**Confidence:** HIGH (verified against benchmarks and documentation)

---

### Moderate: H_1/H_2 Features May Not Be Meaningful in Word Embedding Space

**What goes wrong:** Persistent homology detects "loops" (H_1) and "voids" (H_2) in the point cloud. But word embedding space is high-dimensional (100-300D) and the point cloud is sparse relative to the ambient dimension. In such spaces, points are approximately equidistant (concentration of measure), making genuine topological features unlikely. What you observe may be noise topology rather than genre-characteristic structure.

**Why it happens:** In high dimensions, distances concentrate around their mean. A sparse point cloud (500 words in 100D) fills essentially none of the space. Loops that appear in the persistence diagram may just be artifacts of the point cloud being too sparse to distinguish signal from noise.

**Consequences:** Persistence images encode noise topology, and the SVM learns to classify noise patterns that happen to correlate with genre labels by chance (overfitting).

**Prevention:**
- Focus on H_0 (connected components) which is robust and interpretable: it measures cluster structure.
- Treat H_1 features with long persistence as potentially meaningful but validate by permutation testing: shuffle genre labels and check whether H_1 persistence images still separate genres. If they do, the signal is spurious.
- Consider using cosine distance rather than Euclidean for Rips filtration, since word2vec semantics are angular.
- Do NOT expect H_2 to be informative. Include it in exploratory analysis but do not depend on it for classification.

**Confidence:** MEDIUM (theoretical concern well-grounded; empirical impact on this specific application unclear)

---

### Moderate: Persistence Image Parameter Sensitivity

**What goes wrong:** Persistence images require choosing sigma (bandwidth), grid resolution, and a weighting function. Poor choices produce degenerate images: too-small sigma creates spiky, overfitting-prone images; too-large sigma smears all topological features into a uniform blob.

**Practical guidance:**
- **Sigma:** Start with sigma proportional to the interquartile range of persistence values. Adams et al. (2017) show classification accuracy is "fairly robust" to sigma, but extreme values (sigma < 0.01 or sigma > 10 relative to persistence scale) cause problems.
- **Resolution:** 20x20 is a standard starting point (400 features). Going finer (50x50 = 2500) adds features without proportional signal in small datasets. Going coarser (5x5 = 25) loses detail.
- **Weighting:** Linear ramp weighting (weight = persistence) is standard; it downweights short-lived features (noise) and upweights long-lived features (signal).

**Prevention:**
- Use persim (scikit-tda) or giotto-tda's PersistenceImage with default parameters as a baseline.
- Grid-search sigma over [0.01, 0.05, 0.1, 0.5, 1.0] relative to the persistence range.
- Fix resolution at 20x20 unless there's a strong reason to change it.

**Confidence:** MEDIUM (Adams et al. is authoritative; specific values need empirical tuning)

---

### Minor: Cosine vs. Euclidean Distance for Rips Filtration

**What goes wrong:** Word2Vec similarity is conventionally measured by cosine similarity, but Vietoris-Rips uses a metric (typically Euclidean). If embeddings are not L2-normalized, Euclidean distance conflates magnitude (word frequency-related) with direction (semantic). Two words could be semantically similar (small angle) but far apart in Euclidean distance because one has a large magnitude.

**Prevention:** L2-normalize all word vectors before computing the distance matrix for Rips filtration. This makes Euclidean distance proportional to cosine distance: d_euclidean(u/||u||, v/||v||) = sqrt(2(1 - cos(u,v))). This is standard practice.

**Confidence:** HIGH

---

## SVM Classification Pitfalls

### Critical: 450 Features with 30 Samples Is Severe Overfitting Territory

**What goes wrong:** The feature vector is persistence_image (400D at 20x20) + cluster_distribution (50D) = 450 dimensions. With only 30 books, the ratio is 15 features per sample. This is deep in the "p >> n" regime where any classifier can find a separating hyperplane by chance.

**Why it happens:** In 450-dimensional space, 30 points are always linearly separable (for up to 450 classes). The SVM will find a perfect fit that does not generalize.

**Consequences:** Leave-one-out CV reports high accuracy that does not replicate on new data. The entire classification pipeline appears to work but is memorizing, not learning.

**Prevention:**
- **Reduce dimensionality aggressively.** Apply PCA to the persistence image to retain 90-95% variance (likely 5-20 components, not 400). Do the same for cluster distributions. Target a total feature vector of 20-50 dimensions max.
- **Strong regularization.** Use small C values in the SVM (C=0.01 to 1.0). RBF kernel SVMs are somewhat resistant to the curse of dimensionality because they depend on pairwise kernel values rather than individual dimensions, but this resistance has limits.
- **Permutation testing.** After computing LOOCV accuracy, run the same pipeline with shuffled labels 100 times. If the real accuracy is not significantly above the permutation distribution, the classifier is fitting noise.
- **Fewer genres.** With 30 books across 5 genres (6 per genre), expect high variance. With 30 books across 10 genres (3 per genre), the task is almost certainly underpowered. Keep genre count to 3-5 with the bundled corpus.

**Confidence:** HIGH (fundamental statistical concern)

---

### Moderate: Leave-One-Out CV Variance with Small Datasets

**What goes wrong:** LOOCV on 30 samples produces 30 correlated estimates. The variance of the accuracy estimate is high because each training fold differs by only one sample. A single unusual book can swing accuracy by 3-5 percentage points. Results like "83% accuracy" could easily be "73% or 93%" on a different corpus of the same size.

**Why it happens:** LOOCV averaging n models trained on nearly identical data produces high-variance estimates. Recent research (2025) shows LOOCV can also suffer from distributional bias when class ratios are imbalanced.

**Prevention:**
- Report confidence intervals, not point estimates. Use bootstrapped LOOCV or repeated stratified K-fold (K=5, repeated 10 times) as a sanity check.
- Be honest in the UI: display accuracy as a range, not a single number.
- Include the permutation baseline (see above) so users can see whether the accuracy is meaningful.

**Confidence:** HIGH

---

### Moderate: Class Imbalance

**What goes wrong:** If the bundled corpus has 10 romance novels and 3 horror novels, the SVM baseline (always predict "romance") achieves 33% accuracy. LOOCV accuracy of 50% looks good but is barely above chance. Worse, the SVM may learn to always predict the majority class.

**Prevention:**
- Balance the corpus (equal books per genre).
- Use `class_weight='balanced'` in scikit-learn's SVC.
- Report per-class precision/recall in addition to overall accuracy.
- Use macro-averaged F1 rather than accuracy as the primary metric.

**Confidence:** HIGH

---

## 3D Visualization Pitfalls

### Critical: Projection Destroys Topology -- The Visualization Lies

**What goes wrong:** Persistent homology is computed in the full N-dimensional embedding space (100-300D). The 3D visualization shows a PCA/UMAP/t-SNE projection. Topological features visible in 3D (apparent clusters, gaps, loops) may not correspond to actual high-dimensional topology. Conversely, real topological features may be invisible in the projection. Users will naturally assume "what I see is what the math computed" -- this is false.

**Why it happens:** Dimensionality reduction from 100D to 3D necessarily destroys most of the geometric structure. t-SNE and UMAP specifically distort distances and can create spurious clusters or merge real ones. Recent research (2025) demonstrates that "two forms of map discontinuity distort visualizations: one exaggerates cluster separation and the other creates spurious local structures."

**Consequences:** Users draw incorrect conclusions about genre relationships. A sci-fi cluster that appears far from fantasy in 3D might actually overlap in 100D. The animated Vietoris-Rips in 3D shows edges forming between projected points, but the actual filtration in N-D connects different points at different times.

**Prevention:**
- **Explicit disclaimers in the UI.** Label every 3D view with "This is a projection. Distances and structures may not reflect the full-dimensional computation."
- **Show the variance explained** (for PCA) or stress metric (for MDS). If PCA explains 15% of variance in 3 components, say so prominently.
- **Let users switch projection methods** and observe what changes vs. what stays stable. Stable structures across PCA, UMAP, and t-SNE are more trustworthy.
- **The Vietoris-Rips animation must use N-D computation projected to 3D**, not 3D-computed Rips. This means edges appear when the N-D distance criterion is met, even if the 3D projected distance looks wrong. This is confusing but mathematically honest. Add a tooltip: "Edges form when words are close in 100D space, which may not match their apparent distance in this 3D view."

**Confidence:** HIGH (well-documented limitation of DR methods)

---

### Critical: Animated Vietoris-Rips Edge Count Explosion

**What goes wrong:** At small epsilon, few edges exist. As epsilon grows, edge count grows as O(n^2). For 500 words, the maximum is C(500,2) = 124,750 edges. For 1,000 words, it's ~500,000. For 2,000 words, ~2 million. Three.js can handle 50-100k line segments at 60fps but will choke above that. Triangles (for 2-simplices) are even worse.

**Consequences:** The epsilon slider animation becomes increasingly laggy, then the browser tab crashes at high epsilon values.

**Prevention:**
- **Cap the visualization vocabulary at 300-500 words.** Even if persistent homology uses 1,000 words for computation, the 3D animation should only render a subset.
- **Progressive rendering:** At each epsilon, only draw edges for the current frame. Don't accumulate all edges from 0 to epsilon -- use instanced rendering or GPU-side filtering.
- **LOD (level of detail):** At high epsilon where most points are connected, switch to a convex hull or alpha shape visualization instead of individual edges.
- **Throttle the epsilon slider** so it doesn't update on every pixel of mouse movement. Debounce to ~10 updates/second.
- **Never render 2-simplices (triangles) as filled geometry.** The count is cubic. Show edges only, with births/deaths of topological features highlighted as colored markers.
- Use Three.js BufferGeometry with pre-allocated buffers. Avoid creating/destroying geometry objects per frame.

**Confidence:** HIGH (verified against Three.js performance data)

---

### Moderate: WebGL Limits on Point Count and Interactivity

**What goes wrong:** 50k+ points in Three.js with picking (hover to see word labels) requires spatial indexing. Without it, raycasting against 50k points per mouse move creates jank. GPU point size limits (gl_PointSize typically capped at 64-256px depending on hardware) affect visual design.

**Prevention:**
- Use BufferGeometry with a single Points object (one draw call).
- Implement k-d tree or octree for picking (three-mesh-bvh or similar).
- Keep point size small (1-5px) for the full cloud; enlarge on hover/selection only.
- For >10k words, provide a search/filter to highlight specific words rather than relying on visual scanning.
- Center all data near the origin to avoid floating-point precision issues in WebGL.

**Confidence:** HIGH

---

## Parameter Sensitivity Pitfalls

### Critical: Pathological Parameter Combinations

**What goes wrong:** Certain parameter combinations produce meaningless or degenerate results without any obvious error:

| Parameter Combo | Pathology |
|----------------|-----------|
| Small corpus + fine persistence image grid (50x50) | 2,500 features from ~30 samples. Guaranteed overfitting. |
| Small vocab per book (< 100 words) + high homology dim (H_2) | Too few points for voids to be meaningful. H_2 is empty or noise. |
| Very large window size (>20) + small books | Context windows larger than paragraphs capture document-level co-occurrence, not word-level semantics. |
| alpha=0 (cluster-only) or alpha=1 (topology-only) | Loses the complementary signal. The whole point is both. |
| Large epsilon_max + many words | Edge explosion in visualization; computation timeout in homology. |
| Very small sigma in persistence images | Spiky images that overfit to individual persistence points. |

**Prevention:**
- Define valid parameter ranges in the UI. Don't let users set grid resolution above 25x25 or vocabulary above 1,000 for homology.
- Implement "smart defaults" that adapt to corpus size: if N_books < 20, auto-reduce persistence image resolution to 10x10.
- Show warnings when parameter combinations enter dangerous territory (e.g., "Feature dimension exceeds sample count -- results may be unreliable").

**Confidence:** HIGH

---

### Moderate: Cliff-Edge vs. Smooth Parameters

**What goes wrong:** Some parameters degrade gracefully; others hit sudden failure modes.

**Smooth (safe to expose as sliders):**
- alpha (topology/cluster weighting): interpolates smoothly between two feature tracks
- sigma (persistence image bandwidth): smooth effect on image blurriness
- Projection method perplexity/n_neighbors: gradual effect on cluster tightness

**Cliff-edge (dangerous as live sliders):**
- min_count for Word2Vec: dropping below the threshold suddenly includes thousands of garbage words
- max_words for homology: above ~1,000, runtime jumps from seconds to minutes
- epsilon_max: above a threshold, edge count explodes combinatorially
- K (cluster count): wrong K produces meaningless cluster distributions (but this is a standard hyperparameter tuning problem)

**Prevention:**
- For cliff-edge parameters, use discrete presets ("fast/balanced/thorough") rather than continuous sliders.
- For max_words, show estimated computation time before running.
- For epsilon_max, show estimated edge count before animating.

**Confidence:** MEDIUM (cliff-edge locations need empirical calibration)

---

## Deployment Pitfalls

### Critical: Memory Footprint of Word2Vec Model

**What goes wrong:** A Word2Vec model with 50,000 vocabulary words at 100 dimensions requires 50,000 * 100 * 4 bytes * 3 matrices = ~57MB during training. After training, using only KeyedVectors reduces this to ~19MB (one matrix). With 150D: ~29MB. This is manageable for a single user but problematic if the full model is loaded per-session.

**For reference:** Pre-trained Google News Word2Vec (3M words, 300D) is ~3.6GB. You are NOT using this, but users may expect it.

**Prevention:**
- Train a domain-specific model with limited vocabulary (10k-50k words). This is already the plan.
- After training, save only KeyedVectors (not the full model with training weights).
- Use memory-mapped loading (`mmap='r'`) so the OS can share the model across processes.
- For a hosted web app, load the model once at server startup, not per-request.

**Confidence:** HIGH (verified memory formula against gensim docs)

---

### Critical: Concurrent Persistent Homology Computations

**What goes wrong:** Each persistent homology computation for a user-uploaded book may take 5-60 seconds and consume 100MB-1GB RAM (depending on word count). If 10 users upload simultaneously, the server needs 1-10GB RAM and 10 CPU-saturated threads. On a single-server deployment, this causes request timeouts and potential OOM kills.

**Prevention:**
- **Queue-based architecture.** User uploads go into a task queue (Celery, RQ, or similar). Workers process one-at-a-time with configurable concurrency.
- **Hard resource limits.** Cap words-per-book at 500-1000 for homology. Set computation timeout at 60 seconds.
- **Pre-compute bundled corpus results.** All persistent homology for the bundled corpus should be computed at build time and cached. Only user uploads trigger live computation.
- **Show progress/status.** "Computing topological features... estimated 15 seconds" with a real progress indicator, not a spinner.

**Confidence:** HIGH

---

### Moderate: User Upload Handling

**What goes wrong:** Users will upload:
- Non-UTF8 files (Latin-1, Windows-1252, etc.) causing decode errors
- PDF/DOCX/EPUB instead of plain text
- 500MB files (complete works of someone)
- Files in languages other than English (breaking the English-centric preprocessing)
- Adversarial inputs (extremely long "words", binary data disguised as .txt)

**Prevention:**
- Accept only .txt files. Reject other formats with a clear error message pointing to conversion tools.
- Enforce a file size limit (5MB is generous -- that's ~1 million words).
- Use `chardet` or `charset-normalizer` to detect encoding and convert to UTF-8.
- After tokenization, reject if >50% of tokens are not in a basic English dictionary (flags non-English or binary files).
- Sanitize: strip null bytes, limit maximum word length to 50 characters, limit maximum vocabulary to 100k unique tokens.

**Confidence:** HIGH

---

### Moderate: Cold Start and Pre-computation

**What goes wrong:** If the app computes everything on first load, the user waits 2-5 minutes before seeing anything. Word2Vec training alone on a 3M token corpus takes 30-120 seconds.

**Prevention:**
- Pre-train the Word2Vec model at build/deploy time. Ship the trained KeyedVectors as a static asset.
- Pre-compute TF-IDF, persistence diagrams, persistence images, and cluster distributions for the bundled corpus.
- The first page load should display pre-computed results instantly. Live computation only happens for parameter changes and user uploads.
- Cache parameter-specific results (e.g., persistence images at sigma=0.1, resolution=20 with word_count=500) so repeated parameter exploration doesn't re-trigger homology.

**Confidence:** HIGH

---

### Minor: Server-Side vs. Client-Side Computation Boundary

**What goes wrong:** Running Word2Vec or Ripser in the browser via WASM is theoretically possible but practically slow and memory-constrained. However, running all computation server-side means every parameter change requires a round-trip, making the "live adjustable" experience laggy.

**Prevention:**
- **Server-side:** Word2Vec training, persistent homology, SVM training/prediction. These are compute-heavy and benefit from optimized C extensions.
- **Client-side:** 3D rendering (Three.js), persistence image display (2D canvas), parameter UI, projection (PCA/UMAP can run client-side for <10k points using umap-js or similar).
- **Hybrid:** Pre-compute results for a grid of parameter values and interpolate client-side. For example, pre-compute persistence images at 5 sigma values and let the client interpolate.

**Confidence:** MEDIUM

---

## Critical Unknowns

These are things that could fundamentally undermine the project and need spike/prototype validation before committing to the architecture:

### 1. Does Persistent Homology Actually Distinguish Genres?

**The question:** When you compute persistence diagrams for 30 books across 5 genres, do books of the same genre produce more similar persistence images than books of different genres? Or is the topological signal swamped by noise, book length effects, and author style?

**Why it matters:** The entire project premise depends on this. If persistence images are genre-invariant (all books look the same) or author-specific (not genre-specific), the classification pipeline is fundamentally flawed.

**How to validate:** Build a minimal prototype with 5 books per genre for 3 genres. Compute persistence images. Visualize them. Run a permutation test: does a simple classifier beat random with shuffled labels? This should be done in Phase 1 before building any web infrastructure.

**Risk level:** HIGH. This is the existential risk.

### 2. Weighted Filtration Mathematical Validity

**The question:** Is the TF-IDF-weighted filtration (where heavy words grow balls faster) mathematically well-defined and producing valid persistence diagrams? The modified distance matrix approach (dividing distances by weight sums) may violate metric properties (triangle inequality), which could make Ripser produce incorrect results.

**How to validate:** Prove or empirically verify that the modified distance matrix is a valid metric. If not, determine whether the violation matters in practice (Ripser may still work but results may not have the standard stability guarantees).

**Risk level:** HIGH. Silent mathematical errors are the worst kind.

### 3. Sufficient Corpus Size for the Pipeline

**The question:** Is a bundled corpus of 30-50 books enough to simultaneously:
- Train meaningful Word2Vec embeddings
- Compute stable IDF scores
- Produce distinguishable persistence images
- Train a generalizing SVM

Each step has its own minimum data requirement. The pipeline's minimum is the maximum of these individual minimums. What is that number?

**How to validate:** Start with 5 books per genre (3 genres = 15 books). Add 5 more per genre incrementally. At each step, measure: embedding stability, IDF coefficient of variation, persistence image inter-vs-intra-genre distance, LOOCV accuracy. Find the knee where results stabilize.

**Risk level:** MEDIUM-HIGH. The answer determines whether the project ships with 30 or 100+ books.

### 4. End-to-End Latency for User Uploads

**The question:** When a user uploads a book, how long until they see results? The pipeline is: tokenize -> TF-IDF (using pre-computed IDF) -> select top words -> look up vectors -> compute Rips -> persistence image -> concatenate -> SVM predict -> update 3D view. What is the realistic end-to-end time on commodity server hardware?

**How to validate:** Benchmark each step. The bottleneck is almost certainly Rips computation. Determine the maximum word count that keeps total time under 10 seconds.

**Risk level:** MEDIUM. Affects UX significantly but has known engineering solutions (reduce word count, pre-compute, queue).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Word2Vec training | Corpus too small, unstable embeddings | Validate with nearest-neighbor stability test before proceeding |
| TF-IDF computation | IDF instability with few books | Use smoothed IDF, test leave-one-book-out robustness |
| Persistent homology | Weighted filtration not standard, computational explosion | Spike the math first, hard-cap word count at 500-1000 |
| Persistence images | Parameter sensitivity | Start with defaults (20x20, sigma=0.1), tune later |
| SVM classification | 450D features / 30 samples overfitting | PCA down to 20-50D, permutation test, strong regularization |
| 3D visualization | Projection lies, edge explosion | Disclaimers, cap viz vocabulary at 300-500, LOD rendering |
| Parameter UI | Pathological combinations | Constrain ranges, show warnings, use presets for cliff-edge params |
| User uploads | Encoding, size, format, adversarial input | Strict validation, size limits, timeout |
| Deployment | Memory, concurrency, cold start | Pre-compute bundled corpus, queue uploads, mmap model |

---

## Sources

- [Gensim Word2Vec documentation](https://radimrehurek.com/gensim/models/word2vec.html)
- [Adams et al. (2017) - Persistence Images: A Stable Vector Representation](https://jmlr.org/papers/volume18/16-337/16-337.pdf)
- [Giotto-TDA WeightedRipsPersistence documentation](https://giotto-ai.github.io/gtda-docs/latest/modules/generated/homology/gtda.homology.WeightedRipsPersistence.html)
- [Ripser: efficient computation of Vietoris-Rips persistence barcodes](https://link.springer.com/article/10.1007/s41468-021-00071-5)
- [Persim Persistence Images documentation](https://persim.scikit-tda.org/en/latest/notebooks/Persistence%20images.html)
- [TDA for NLP survey (2024)](https://arxiv.org/html/2411.10298)
- [Stop Misusing t-SNE and UMAP (2025)](https://arxiv.org/html/2506.08725v2)
- [Distributional bias in LOOCV (2025)](https://www.science.org/doi/10.1126/sciadv.adx6976)
- [Three.js Point Cloud Limitations](https://discourse.threejs.org/t/point-cloud-limitations/38805)
- [GUDHI WeightedRipsComplex documentation](https://gudhi.inria.fr/python/latest/rips_complex_user.html)
- [Optimizing word embeddings for small datasets (2024)](https://www.nature.com/articles/s41598-024-66319-z)

---

*Pitfalls analysis: 2026-04-11*
