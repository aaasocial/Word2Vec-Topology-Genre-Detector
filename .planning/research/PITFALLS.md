# Pitfalls Research — v2.0

**Domain:** Adding accuracy, depth, and polish features to an already-deployed Literary Genre Topology web app
**Researched:** 2026-05-22
**Confidence:** HIGH (most pitfalls verified against official docs / well-known failure modes; some are mechanically derived from v1 invariants)

> This document covers **only** pitfalls specific to v2.0 work. For domain-level NLP/TDA/3D pitfalls that already shipped (small-corpus W2V instability, IDF instability, VR computational explosion, projection-destroys-topology, etc.), see `.planning/research/v1/PITFALLS.md`. Do not re-litigate v1 work here.

---

## Critical Pitfalls

### Pitfall 1: Word2Vec Retraining Silently Rotates the Embedding Space (Invariant #1 Violation)

**What goes wrong:**
Adding new books to the corpus and re-running `01_train_word2vec.py` produces a new model whose vectors are an arbitrary rotation/reflection of the v1 vectors. Any cached v1 artifact that references coordinates — pre-computed persistence diagrams, projections (PCA/UMAP), point clouds, persistence images, the trained SVM, cached topology animations — becomes geometrically meaningless against the new vectors. The app keeps serving them because Redis cache keys hash by `(step_name, params)`, not by model identity. Result: visualizations look plausible but the points are in a different coordinate system than the SVM was trained on.

**Why it happens:**
Skip-gram Word2Vec is initialized randomly, trained with non-deterministic SGD updates, and has rotational invariance — `R·W` for any orthogonal `R` is an equally valid optimum. Even with `seed` fixed and `workers=1`, adding a single new book changes the vocabulary, the random-init shapes, and the gradient trajectory. The new model is not just "slightly different" — it lives in a fundamentally different coordinate system. Teams forget this because the v1 mental model is "Word2Vec is deterministic with seed=X" — which is true *for the same input data*, not across corpora.

**How to avoid:**
- **Treat every retrain as a hard cache bust.** Hash the *model file's sha256* into every downstream cache key, not just hyperparameters. Pattern: `cache_key = sha256(step_name, params, w2v_model_hash)`.
- **Encode model identity in the content-addressed cache.** v1 already uses `sha256(step_name, params)`. Extend to `sha256(step_name, params, embedding_provenance)` where `embedding_provenance` includes the model file hash and the corpus manifest hash (sorted list of book IDs + their text hashes).
- **Force full pipeline rebuild on corpus change.** When `corpus/books.yaml` changes, run `scripts/01 → 02 → 03 → 04 → 05 → 06` end-to-end. Never partial-rebuild. Add a `make rebuild-all` target.
- **If you ever need to compare v1 vs v2 features in the same coordinate system** (e.g., for explainability "show neighbors from v1"), apply Orthogonal Procrustes alignment on shared vocabulary using gensim-compatible code (e.g., the zhicongchen gist). This is *only* for comparison, never for serving — production should always use the latest model end-to-end.
- **Pin the SVM training data lineage.** Save alongside the SVM: model hash, corpus manifest hash, feature-track normalization stats, α. Refuse to load an SVM whose lineage doesn't match the currently-loaded W2V model.

**Warning signs:**
- Accuracy drops sharply (>10pp) after retrain with "no other changes."
- 3D scatter looks reflected/rotated compared to v1 screenshots.
- Cached persistence images render but the SVM predicts random-looking labels.
- The pre-computed cache directory has files older than the W2V model file.

**Phase to address:** Phase 8 (Corpus Expansion). This must be the *first* engineering task of Phase 8 — before any new books are added, the rebuild pipeline must hash the model into cache keys, and there must be a smoke test that detects stale cache after retrain.

---

### Pitfall 2: H₂ Computation Hangs the Worker (No O(n³) → O(n⁴) Cliff Handling)

**What goes wrong:**
Enabling H₂ in the ripser call (`maxdim=2`) on a 500-word point cloud takes the per-book homology step from ~5 seconds to many minutes — or runs out of memory. The arq worker holds the job, the SSE channel stays open, the UI shows a spinner forever, and the user assumes the app is broken. Worse: if multiple users trigger H₂ simultaneously, the worker pool saturates and *all* requests stall, including those that didn't ask for H₂.

**Why it happens:**
Vietoris-Rips at dimension `d` enumerates all `(d+1)`-cliques. Going from H₁ to H₂ moves from "all triangles" (O(n³) worst case) to "all tetrahedra" (O(n⁴) worst case). Ripser is highly optimized and exploits sparsity — for 500 points with reasonable ε_max it often *does* finish in tens of seconds — but the variance is enormous and depends heavily on local geometry. v1 PITFALLS.md already noted "H_2 likely infeasible above ~2k points"; v2's mistake would be assuming "we're at 500 points so we're safe." The cliff is local-geometry-dependent, not point-count-dependent.

**How to avoid:**
- **Bench H₂ on every bundled book before shipping.** Add `scripts/bench_h2.py` that times H₂ for each book at the current word_count cap and records P50/P95/max. Fail CI if any book exceeds 30 seconds.
- **Hard timeout in the worker.** Wrap the H₂ call in `concurrent.futures` with `timeout=60s`. On timeout, return an `H2Unavailable` result (not an exception). The frontend renders a friendly "H₂ skipped: too sparse/dense for tractable computation" instead of a spinner.
- **Tighten `thresh` (ε_max) specifically for H₂.** Pass `thresh = np.percentile(pairwise_distances, 75)` (not 95th as for H₀/H₁). H₂ features near the diameter of the cloud are almost always noise; cutting them saves the worst-case runtime explosion.
- **Pre-compute H₂ for the bundled corpus at deploy time, never live.** User uploads should compute H₀+H₁ only unless an "include H₂" toggle is explicitly flipped (and even then, behind the timeout).
- **Separate the worker queue:** route H₂-enabled jobs to a dedicated queue with `max_concurrent=1` so a slow H₂ job can never starve the H₀/H₁ pipeline serving other users.

**Warning signs:**
- Worker memory crosses 1.5GB during a single homology call.
- A single H₂ run takes >20s on the bench script.
- Railway dashboard shows worker CPU pinned at 100% on a single job for minutes.
- SSE `progress` events stop arriving (`computing_homology` is the last event for a long time).

**Phase to address:** Phase 6 (v1 Bug-Fix Sweep). H₂ is the headline carry-over and needs hard guards before it ships to users. The bench + timeout + queue separation must land together — none on its own is enough.

---

### Pitfall 3: H₂ Empty Diagrams Are the Common Case, Not the Error Case

**What goes wrong:**
The team enables H₂, runs it on a book, gets back an empty persistence diagram, and assumes the implementation is broken. They start debugging ripser parameters. In fact: H₂ being empty is **expected** for most ~500-point clouds in 100D embedding space — there simply aren't enough points to form persistent voids. The UI then either crashes (assumes ≥1 point), renders a blank chart with no explanation (user thinks the app is broken), or worse, renders a misleading "no H₂ features detected ✓" message that hides the limitation.

**Why it happens:**
v1 PITFALLS.md flagged this directly: "in high dimensions, distances concentrate around their mean. A sparse point cloud (500 words in 100D) fills essentially none of the space." H₂ measures voids — closed 2D surfaces that bound an empty 3D region. In a sparse high-D cloud, voids either don't form or form only at filtration values so large that everything is one big simplex.

**How to avoid:**
- **Distinguish "empty diagram" from "computation failed."** ripser returns `np.empty((0, 2))` for H₂ when there are no features; this is a valid result, not an error. Make sure the persistence-image step handles empty arrays and produces an all-zeros image (not a NaN or crash).
- **UI copy must be honest.** For empty H₂: "No 2-dimensional voids detected — typical for sparse high-dimensional point clouds at this vocabulary size." Not "✓ All clean."
- **Don't feed empty H₂ persistence images into the SVM feature vector.** If H₂ images are always zeros across the corpus, they add 400 zero-dimensions of noise to an already underpowered feature vector. Either (a) gate H₂ inclusion in feature concatenation on "≥30% of training books had non-empty H₂," or (b) make H₂ display-only — never a classification input — in v2.
- **Add a "diagram is empty" test fixture.** Unit-test the H₂ pipeline with a deliberately-too-small point cloud (e.g., 50 random points in 100D) and assert the system handles it gracefully.

**Warning signs:**
- Every book's H₂ diagram is empty.
- H₂ persistence image features show zero variance across the corpus.
- Adding H₂ to the SVM feature vector decreases LOOCV accuracy.
- UI throws on `Math.max(...[])` or `dot.scale = 0/0` when the diagram is empty.

**Phase to address:** Phase 6 (v1 Bug-Fix Sweep). Empty-diagram handling is the first thing to test once H₂ is wired in.

---

### Pitfall 4: Comparing v2 Accuracy to v1 Without a Held-Out Test Set

**What goes wrong:**
The team adds 30 new books in Phase 8, retrains, and runs LOOCV on the expanded corpus. LOOCV reports 89% vs v1's 83%. Everyone celebrates "+6pp accuracy." But the v1 baseline was LOOCV on 15 books, the v2 measurement is LOOCV on 45 books, the books are different books with different lengths and different OOV rates, and there is no held-out test set. The comparison is meaningless — the numbers can't be subtracted.

**Why it happens:**
"Measurable accuracy improvement vs v1 baseline" sounds well-defined but isn't. LOOCV is a property of (data, model) jointly — changing the data changes the cross-validation distribution. v1 PITFALLS.md noted LOOCV variance is ±5pp on small corpora; v2 risks comparing two noisy estimates from different distributions and treating the difference as signal.

**How to avoid:**
- **Lock down a v1-frozen test set BEFORE expanding the corpus.** Reserve the v1 15-book corpus (or a held-out fraction of it) as the comparison baseline. After Phase 8 retrain, evaluate the v2 SVM on this exact same set. That's an apples-to-apples comparison.
- **Report three numbers, not one:** (1) v2 LOOCV on full new corpus, (2) v2 evaluated on v1-frozen test, (3) v1 LOOCV on v1 corpus. Improvement claims must reference (2) vs (3).
- **Permutation test, every time.** For each accuracy number reported, also report the permutation null (100 label-shuffle runs). Confidence interval = real accuracy minus 95th percentile of null. v1 already does this in `scripts/06_validate.py` — extend it, don't bypass it.
- **Report per-genre F1, not just overall accuracy.** Class imbalance from naive corpus expansion (see Pitfall 5) inflates accuracy while specific genres regress.
- **Pin α and k_clusters before measurement.** v1's α and K were chosen empirically; if Phase 8 also sweeps these, you're optimizing two things at once and you can't attribute improvement to the corpus. Do the corpus expansion first with v1 α/K, *then* a separate Phase 8b retunes hyperparameters with a documented validation protocol.

**Warning signs:**
- The phrase "v2 is X% better than v1" appears anywhere without specifying *which* test set.
- LOOCV accuracy on the full new corpus is the only number being tracked.
- α or k_clusters changed between v1 and v2 measurements.
- Per-genre confusion matrix is missing from the validation report.

**Phase to address:** Phase 7 (Corpus Sourcing Research Spike) defines the protocol; Phase 8 (Corpus Expansion) executes it. Phase 7 should produce a written `VALIDATION_PROTOCOL.md` that Phase 8 follows verbatim.

---

### Pitfall 5: Train/Test Leakage via Author Overlap When Adding Project Gutenberg Books

**What goes wrong:**
The team grows the corpus by adding more books from authors already in v1 (e.g., adding 4 more H.G. Wells books to sci-fi, 3 more Poe to horror, 5 more Austen to romance). LOOCV accuracy jumps to 95%+. They ship. On real user uploads from unseen authors, accuracy is 60%. The SVM learned **author style**, not **genre**.

**Why it happens:**
Project Gutenberg's "easy" books are concentrated in a small number of prolific public-domain authors. Naive corpus expansion picks the same authors repeatedly. The persistence images of two Wells novels are very similar to each other (same vocabulary distribution, same TF-IDF profile) but not because they're sci-fi — because they're Wells. LOOCV treats each book as independent and so this leakage is invisible to standard CV; the held-out fold is "another Wells novel" which the model recognizes from "other Wells features."

**How to avoid:**
- **GroupKFold by author**, not LOOCV by book, once the corpus has multi-book authors. scikit-learn's `GroupKFold(groups=author)` ensures all books by one author land in the same fold.
- **Cap books-per-author at 1 in the bundled corpus** unless you have >5 authors per genre. If you want N books per genre, use N distinct authors before adding a second book by any single author.
- **Track author in `corpus/books.yaml`.** Add an `author` field. The metadata endpoint (BookSlider — see Pitfall 12) should surface it. Phase 7 research must include "what's the distribution of authors per genre in our planned corpus."
- **Anti-author smoke test:** train SVM holding out all books by one specific author, then predict that author's books. Repeat for each multi-book author. If held-out-author accuracy drops >15pp vs LOOCV, you have author leakage.
- **Document the limitation in PROJECT.md.** If author-controlled CV is infeasible (e.g., not enough distinct authors per genre), explicitly say so. Don't hide it.

**Warning signs:**
- The same author appears 3+ times in one genre.
- Per-author held-out accuracy is dramatically lower than LOOCV accuracy.
- The team is debating "but if we drop these Wells books we lose all our sci-fi training data."
- User-uploaded books (unseen authors) get much lower confidence than bundled corpus books.

**Phase to address:** Phase 7 (research must surface this) and Phase 8 (must implement GroupKFold + author-balance constraints).

---

### Pitfall 6: Class Imbalance Sneaks In via "Add Whatever's Available"

**What goes wrong:**
Phase 8 expansion ends up with 12 horror, 8 sci-fi, 5 romance — because horror has more public-domain books available and the team didn't enforce balance. The SVM achieves 80% LOOCV accuracy mainly by predicting "horror" more often. Romance F1 drops from 0.83 (v1, balanced 5/5/5) to 0.55 (v2, imbalanced 5/8/12).

**Why it happens:**
Corpus sourcing is opportunistic; some genres have more available books than others. Without an explicit cap, the corpus drifts toward whatever's easy to scrape.

**How to avoid:**
- **Pre-declare per-genre book counts in Phase 7 output.** Phase 7's recommendation doc must specify "target N books per genre" as a hard constraint, not a guideline.
- **Enforce balance at corpus-load time.** `corpus/books.yaml` validation: refuse to load if `max(per_genre_count) > min(per_genre_count) + 2`. Make this a startup check, not a runtime check.
- **Use `class_weight='balanced'` in the SVC** as a defense-in-depth measure. This already may be set in v1; verify.
- **Report macro-F1 as the primary metric**, not accuracy. Macro-F1 makes imbalance immediately visible. Phase 7's validation protocol should mandate macro-F1.

**Warning signs:**
- Per-genre confusion matrix shows one row much larger than others.
- Accuracy is high but macro-F1 is much lower than accuracy.
- The bundled-corpus loader doesn't validate per-genre counts.

**Phase to address:** Phase 7 (protocol) + Phase 8 (enforcement at load time).

---

### Pitfall 7: Treating `decision_function` Output as a Confidence Score

**What goes wrong:**
For top-N predictions, the team calls `svm.decision_function(x)`, sorts the resulting scores, takes the top 3, and labels them "Sci-Fi (0.87), Horror (0.42), Romance (-0.15)". The numbers look like confidences. They aren't. They're signed margins (distances to hyperplanes in OvR), unbounded, not comparable across binary sub-classifiers, and they don't sum to 1. A user sees "0.87 sci-fi" and assumes 87% probability. The app is now lying to users.

**Why it happens:**
`decision_function` is the natural API on `SVC` and returns nice-looking floats. `predict_proba` requires `probability=True` and triggers libsvm's built-in Platt scaling, which the team may have left off in v1 because it was slower and they didn't need probabilities. Now they need probabilities but reach for the wrong method.

**How to avoid:**
- **Enable `probability=True` on the SVC** and use `predict_proba` for top-N display. This triggers libsvm's built-in 5-fold internal CV Platt scaling. The output sums to 1 across classes and is calibrated (approximately).
- **Re-train with `probability=True`** — it changes the fit slightly because of the internal CV. Don't take a v1 SVM and bolt `probability=True` onto it; retrain end-to-end.
- **For small datasets, also consider `CalibratedClassifierCV(base, method='sigmoid', cv=...)`** — but be aware that with <30 samples per fold, sigmoid calibration is itself noisy. Test both ("libsvm built-in" vs "CalibratedClassifierCV around SVC") and pick the one with better Brier score on the v1-frozen test set.
- **Display intervals, not just point estimates.** Bootstrap the test-time calibration to get an uncertainty band on the top-N probabilities. "Sci-fi: 70-85% likely" is more honest than "Sci-fi: 0.78".
- **Sanity check:** if `predict_proba` ever disagrees with `predict` (the most-probable class isn't the predicted class), libsvm warned this can happen — log and surface as a "low-confidence prediction" warning to the user.

**Warning signs:**
- Top-N values don't sum to 1.
- Top-N values are sometimes negative.
- The top-N display says "0.87 confidence" but `predict()` returns a different class.
- The team is debating "should we just softmax the decision_function output?" (Answer: no, this is not calibration.)

**Phase to address:** Phase 9 (Classification Depth).

**Source confidence:** HIGH. See [scikit-learn SVM probability calibration docs](https://scikit-learn.org/stable/modules/svm.html#scores-and-probabilities) and [CalibratedClassifierCV docs](https://scikit-learn.org/stable/modules/generated/sklearn.calibration.CalibratedClassifierCV.html).

---

### Pitfall 8: SHAP/LIME on the Full Pipeline Times Out the Worker

**What goes wrong:**
"Why this genre" feature attempts to use SHAP `KernelExplainer` on the trained SVM-with-RBF-kernel. The explainer is model-agnostic and treats the SVM as a black box, making it O(n_background * n_features) per prediction. With 30 background samples × 450 features, a single explanation takes 30-120 seconds. Users click the "why?" button and wait forever; multiple concurrent clicks pile up; arq workers stall.

**Why it happens:**
Kernel SHAP is famously slow on SVM-RBF — there's an [open bug on the SHAP repo](https://github.com/shap/shap/issues/3747) noting "KernelExplainer really slow on sklearn SVM with RBF Kernel." It's not a misconfiguration; it's a known limitation. Teams add SHAP because it's the obvious choice for explainability and discover the cost too late.

**How to avoid:**
- **Don't use Kernel SHAP for live explanations.** Use cheaper alternatives:
  - **Nearest training neighbors:** for "why sci-fi", show the 3 closest training books in feature space (cosine distance on the concatenated normalized feature vector). This is O(N_train) and immediate. Pair with the books' titles + thumbnails.
  - **Per-feature-track contribution:** decompose the prediction into "topology contribution vs cluster contribution" by re-predicting with one track zeroed out. Two extra SVM calls, both fast.
  - **Per-word evidence:** identify the top-10 highest-TF-IDF words in the uploaded book that have nearest-neighbor word-vectors clustered in the predicted-genre region. Cheap to compute, intuitive for users.
- **If Kernel SHAP is required**, precompute background distribution at train time (k-means cluster 20-50 representative training examples instead of all 45+ books). This makes per-prediction SHAP closer to 5-10 seconds.
- **Run SHAP off the request path.** Treat "why this genre" as a separate background job, enqueued via arq, polled by SSE. Same pattern as the homology computation. Never compute SHAP synchronously inside an HTTP handler.
- **Cache SHAP results per (book_hash, model_hash).** Same content-addressed cache pattern. Once explained, the explanation never needs to be recomputed unless the model changes.

**Warning signs:**
- "Why this genre" requests take >10 seconds on the bundled corpus.
- SHAP runs blocking the FastAPI event loop.
- Worker memory usage spikes during explanation.
- Caching strategy is "recompute on every click."

**Phase to address:** Phase 9 (Classification Depth).

**Source confidence:** HIGH. SHAP repo issue confirms known slowness; nearest-neighbor + per-track decomposition is standard practice.

---

### Pitfall 9: Persistence-Image Feature Importance Is Meaningless Without Normalization Awareness

**What goes wrong:**
The team computes feature importance on the 450-dimensional concatenated feature vector to surface "the persistence image pixels that mattered most." They display a heatmap of importance over the persistence image grid. But: (a) persistence-image pixels are correlated (a single long-persistence point contributes to many neighboring pixels via the Gaussian smoothing), so "pixel (12, 7) was important" is not interpretable; (b) the feature vector was L2-normalized and α-weighted before SVM training, so raw importance scores reflect the post-normalization geometry, not the topological feature; (c) the team forgets cluster-distribution dimensions are also in the same feature vector and conflates the two tracks in the explanation.

**Why it happens:**
"Feature importance" sounds objective. In an engineered, normalized, concatenated feature space, individual feature dimensions don't correspond to interpretable units. v1 PITFALLS.md noted "persistence images encode noise topology"; v2's version is "persistence-image feature importance reifies that noise into a chart that looks meaningful."

**How to avoid:**
- **Don't expose per-pixel persistence-image importance.** It is not interpretable. Aggregate to interpretable units:
  - **By homology dimension:** "H₀ contributed X%, H₁ contributed Y%, H₂ contributed Z%."
  - **By feature track:** "Topology track: X% / Cluster track: Y%."
  - **By persistence point:** trace each pixel of importance back to the persistence diagram point(s) whose Gaussian covers that pixel; show the underlying (birth, death) point on the diagram, not the smoothed pixel. This is faithful to the actual topological feature.
- **Document the normalization explicitly** in the explanation UI: "Importance is computed after L2-normalization of each feature track and α-weighted concatenation. Raw word-level importance requires interpreting back through the pipeline."
- **For nearest-neighbor explanations specifically:** distance in *feature space* ≠ distance in *word2vec space*. Two books can be feature-space neighbors (similar persistence images, similar cluster distributions) while having no vocabulary overlap. Be careful when claiming "this book is similar because they share these words." Use feature-space nearest-neighbor for the *prediction explanation*, but compute word-level overlap separately if you want to surface shared vocabulary.

**Warning signs:**
- The "why this genre" panel shows a heatmap of persistence image pixels with no further interpretation.
- The team can't articulate why a specific pixel was important without hand-waving.
- Nearest-neighbor in feature space surfaces books with zero shared vocabulary.

**Phase to address:** Phase 9 (Classification Depth).

---

### Pitfall 10: Persistence-Diagram Dot Scaling Fix Breaks H₀ "Infinite Persistence" Rendering

**What goes wrong:**
The persistence-diagram dot scaling fix changes from "size = constant" to "size = f(persistence)" to make long-persistence features prominent. The naive implementation `size = k * (death - birth)` blows up for H₀ where one component has `death = infinity` (it never dies — it's the connected component containing all data). The dot disappears off-screen, the rest of the chart auto-rescales around it, or the rendering library throws.

**Why it happens:**
Persistence diagrams conventionally render the infinitely-persistent H₀ component on a horizontal line at the top of the chart, not inside the (birth, death) scatter. Teams fixing dot scaling often touch only the inner scatter logic and forget the infinity-line case. Or they keep ripser's `np.inf` sentinel in death values and let it propagate into a `size` formula.

**How to avoid:**
- **Separate the infinite-persistence rendering path.** ripser returns `np.inf` for the unbounded H₀ component. Filter `np.isinf(deaths)` out before the dot-scaling computation and render those points on a dedicated "infinite persistence" line/marker with a fixed size + tooltip.
- **Use log-scale size or sqrt-scale size, not linear.** Long-persistence outliers dominate linear scaling and crush the rest. `size = base + scale * sqrt(persistence / max_finite_persistence)` is more readable.
- **Cap dot size.** `size = min(size, max_size)` so one outlier doesn't blow up the chart.
- **Test fixture: a single book with a known long-persistence H₁ feature.** Snapshot test the rendered SVG/canvas before/after the fix.

**Warning signs:**
- Dots in the diagram are invisible (size = 0) or off-screen (size = ∞).
- The chart auto-scales around a single dot, hiding everything else.
- `np.inf` appears in browser-side error logs.
- The fix works for H₁ but H₀ tab shows nothing.

**Phase to address:** Phase 6 (v1 Bug-Fix Sweep).

---

## Moderate Pitfalls

### Pitfall 11: LOOCV Cost Explodes Quadratically with Corpus Size

**What goes wrong:**
v1: 15 books × LOOCV = 15 full pipeline runs at validation time. Phase 8 doubles the corpus to 30 books = 30 runs at >2x per-run cost (because TF-IDF and SVM are larger). Total validation cost is ~4-6x. CI starts timing out. The team disables LOOCV in CI to make the build green, losing the safety net.

**Why it happens:**
LOOCV is the right tool for small corpora but its cost is N × per-fold-cost, and per-fold cost itself grows with N. For homology specifically, each leave-one-out fold requires re-running TF-IDF and persistent homology on (N-1) books.

**How to avoid:**
- **Cache aggressively.** Per-book persistence diagrams don't change when *another* book is held out — TF-IDF does, point clouds do, but homology output for fixed weighted point clouds is cacheable per `(book_id, corpus_manifest_hash)`. Add this caching layer in Phase 8.
- **Switch from LOOCV to repeated stratified K-fold** (K=5, repeat 10x) once N ≥ 25. Same statistical power, much cheaper.
- **Parallelize the folds.** `joblib.Parallel(n_jobs=-1)` over folds. Each fold is independent. Move LOOCV from a serial script to a fan-out job.
- **Don't run LOOCV on every CI commit.** Run on demand or nightly. CI should only verify the pipeline starts and produces non-zero outputs, not full statistical validation.

**Warning signs:**
- `scripts/06_validate.py` takes >10 minutes.
- CI was disabled because validation was too slow.
- Manual validation is now an ad-hoc thing the team does "when it feels ready."

**Phase to address:** Phase 8 (Corpus Expansion).

---

### Pitfall 12: BookSlider Metadata Endpoint Becomes a JSON Dump

**What goes wrong:**
The corpus metadata endpoint to wire BookSlider returns the entire book object including the full preprocessed token list ("for completeness"). Payload is 5-50MB per genre. BookSlider triggers a network round-trip on every navigation event, the React Query cache fills the browser's memory, and the slider stutters.

**Why it happens:**
"Metadata" is under-specified. The endpoint is built once, lazily includes everything, and the team forgets that the same data flows through TF-IDF, the point-cloud step, etc. The metadata endpoint becomes a convenience dumping ground.

**How to avoid:**
- **Define metadata precisely.** For BookSlider it should be: `{id, title, author, genre, word_count, top_10_tfidf_words, thumbnail_url?, gutenberg_id?}`. Nothing else. <2KB per book. The full corpus's metadata fits in <100KB.
- **One endpoint, one purpose.** `GET /api/corpus/books` returns the flat list, no pagination needed for <100 books. `GET /api/corpus/books/{id}/point_cloud` is a separate endpoint for the heavyweight data.
- **Cache with React Query at `staleTime: Infinity`** since corpus metadata only changes on retrain. The v1 STATE.md notes this pattern is already established.
- **Generate book thumbnails at build time** from a deterministic embedding-based hash (e.g., a 64x64 PCA-projected scatter rendered to PNG). Don't try to dynamically render thumbnails per-request.

**Warning signs:**
- Metadata endpoint response is >100KB total.
- BookSlider feels laggy.
- The metadata endpoint is being hit on every render.

**Phase to address:** Phase 6 (v1 Bug-Fix Sweep).

---

### Pitfall 13: Three.js Scene Background Doesn't Follow Theme Switches

**What goes wrong:**
Dark mode toggle changes `<html class="dark">` and Tailwind dark-variant styles take effect immediately for the page. But the R3F `<Canvas>` background was set via `<color attach="background" args={['#ffffff']} />` (a Three.js scene property), not via CSS. The 3D scene stays bright white inside a dark page, blinding the user. Or: scatter points were dark-colored to contrast with a light background and are now invisible.

**Why it happens:**
The Three.js scene is a WebGL surface, not a DOM node. CSS doesn't reach it. The R3F default behavior is actually transparent (page bleeds through), but if anyone added an explicit `<color attach="background">` to fix a different bug, it overrides this.

**How to avoid:**
- **Either** remove all explicit `<color attach="background">` and rely on the canvas being transparent over a CSS-themed page background, **or** thread the current theme into the R3F scene via Zustand and update `scene.background` on theme change. The first is simpler; the second is necessary if you want a different scene color than the page background.
- **Re-validate point colors against both themes.** Compute contrast ratios. Genre colors that work on white may be invisible on `#0a0a0a`. Define theme-specific palettes — not just CSS variables but explicit `colors.light.horror = '#7a0000'` / `colors.dark.horror = '#ff5252'`.
- **Test the genre-brightness toggle in both themes.** v1 uses TF-IDF brightness — at low brightness on dark background, points should fade to background, not become invisible black dots that look like nothing rendered.
- **Don't re-create the canvas on theme switch.** R3F mounts a WebGL context which is expensive to recreate. Theme change should update materials/colors imperatively, not unmount the canvas. Verify by checking for canvas DOM churn in DevTools when toggling theme.
- **User-supplied colors (genre palette overrides) need theme-aware fallbacks.** A user picks pure black for romance; that's invisible on dark mode. Either warn at picker time, auto-invert at theme switch, or clamp the saturation/luminance.

**Warning signs:**
- Toggling theme shows a white flash inside the 3D viewport.
- Genre dots are invisible in one theme.
- DevTools shows the canvas element being unmounted/remounted on theme change.
- WebGL context loss errors after multiple theme toggles.

**Phase to address:** Phase 10 (Visual Polish).

**Source confidence:** HIGH. See [Dark Mode for r3f threejs walkthrough](https://mike.gold/notes/x-bookmarks/web-3d/dark-mode-for-r3f-threejs-a-step-by-step-review) and [R3F background-color example](https://onion2k.github.io/r3f-by-example/examples/basic/background-color/).

---

### Pitfall 14: Onboarding Tour Breaks When DOM Structure Changes

**What goes wrong:**
The tour anchors on CSS selectors / `data-tour="step-3"` attributes. A later Phase 10 polish refactor renames a component, or moves the settings drawer behind a tab. The tour silently fails: the target element doesn't exist, the highlight overlay covers blank space, the tooltip points at nothing, the "Next" button is unreachable. New users get a broken first-run experience and the team doesn't notice because they always skip the tour.

**Why it happens:**
Tour libraries (Joyride, driver.js, intro.js) are decoupled from the components they target. There's no compile-time check that `data-tour="settings-drawer"` exists. When the DOM changes, the tour silently misaligns.

**How to avoid:**
- **Centralize tour anchors.** A single `src/tour/anchors.ts` exports symbolic constants. Components import them: `<button data-tour={TOUR.STEP_OPEN_SETTINGS}>`. The tour config references the same constants. Refactor a component → grep the constant → fix the anchor.
- **Tour smoke test in CI.** A Playwright test that walks the tour end-to-end and asserts each step's target element exists and is visible.
- **Graceful fallback for missing anchors.** Tour library config `missingElement: 'skip'` instead of `'error'`. Better to skip a step than to dead-end the user.
- **Detect first-load robustly.** localStorage isn't always available — Safari Private mode, incognito with strict privacy, embedded webviews. Wrap localStorage in try/catch; default to "first-time" if read fails. Don't crash the app, just show the tour again next time.
- **ESC and click-outside.** Existing modal stack (settings drawer, upload dialog, pipeline-explanation dialog from v1) needs explicit z-index coordination. Test: open the tour, then click "Open settings" — does the settings drawer pop over the tour, or under it? Either is acceptable but must be intentional.
- **Provide a re-trigger.** "Help → Take the tour again" menu item. Users will close it accidentally and ask "how do I see that again."

**Warning signs:**
- Tour overlay appears with no tooltip visible.
- Tour highlights cover blank screen areas.
- The team has to manually walk the tour to verify it works.
- localStorage exceptions in error monitoring.

**Phase to address:** Phase 10 (Visual Polish). Specifically: tour smoke test must land before the first PR that adds new components, so subsequent refactors get caught.

**Source confidence:** MEDIUM-HIGH. Common knowledge in onboarding-library practice; see [driver.js practice writeup](https://dev.to/newbe36524/elegantly-implementing-new-user-onboarding-in-react-hagicodes-driverjs-practice-12de).

---

### Pitfall 15: ROADMAP/STATE Files Get Wiped Again (Root Cause Unaddressed)

**What goes wrong:**
v1 closed with ROADMAP.md and STATE.md at 0 bytes on disk. The v2 rebuild restores them. Two milestones later, they're wiped again. The team has no record of what happened and rebuilds from git history again.

**Why it happens (most likely root causes, in order of likelihood):**
1. **GSD command bug:** a `/gsd-complete-milestone` or similar wrote an empty file due to a template-rendering error (template variable not substituted, write before render completed).
2. **Editor truncation:** opened in a tool that saves as empty when content fails to load.
3. **Merge conflict resolution:** "ours/theirs" pick resolved to an empty side.
4. **Local script:** an `archive` / `clear` workflow ran against the wrong target.
5. **Git LFS misconfiguration:** ROADMAP.md or STATE.md accidentally got tracked by LFS and the pointer was followed instead of fetched.

**How to avoid:**
- **Pre-commit hook: refuse to commit 0-byte planning docs.** Pattern:
  ```bash
  for f in .planning/ROADMAP.md .planning/STATE.md .planning/PROJECT.md; do
    if [ -e "$f" ] && [ ! -s "$f" ]; then
      echo "ERROR: $f is empty. Refusing commit."
      exit 1
    fi
  done
  ```
- **CI check: same gate, as a backstop** in case the hook is bypassed.
- **Git attribute: never LFS these files.** Add to `.gitattributes`:
  ```
  .planning/**/*.md -lfs -filter -diff -merge
  ```
- **Audit how the files got wiped before:** check `git log -p -- .planning/ROADMAP.md` for the commit that emptied them, identify the command/PR that did it, and patch that workflow.
- **Backup snapshot in `.planning/.snapshots/`:** a git hook that copies the current ROADMAP/STATE on every commit so even if they get wiped, the previous version is one directory away.

**Warning signs:**
- A planning file's size suddenly drops to 0 in `git status`.
- A diff shows the entire file deleted with no replacement.
- A PR is +0/-200 on a planning file with no rationale.

**Phase to address:** Phase 6 (v1 Bug-Fix Sweep), as one of the carry-overs explicitly listed. Add the pre-commit hook in the same PR that restores the files.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|---|---|---|---|
| Skip Procrustes alignment between v1 and v2 embeddings | Don't have to write alignment code | v1 vs v2 comparisons require always-running both pipelines; can't show "this v1 prediction would now be different" | Always — we're not exposing v1 in v2; clean break is fine |
| Use `decision_function` for top-N display | Don't have to retrain SVM with `probability=True` | App lies to users; numbers aren't probabilities | Never. If top-N ships, calibration must ship. |
| Disable LOOCV in CI to make build green | CI is fast | No safety net catches accuracy regressions | Acceptable if replaced by a nightly run on a dedicated runner, not deleted |
| Cache H₂ results without versioning by model hash | Quick "looks fast" demo | Stale H₂ served against new W2V model = garbage | Never. Model-hash key is mandatory once Phase 8 retrains. |
| Use SHAP without precomputed background | Easy first implementation | 30-120s per "why this genre" click | Acceptable only during development; remove before users see it |
| Skip GroupKFold by author | Easier code; nicer LOOCV numbers | App learns author style, not genre; real-world accuracy collapses | Never once any author has >1 book |
| Bundle full token lists in BookSlider metadata | One endpoint to maintain | Megabyte payloads, slow UI | Never. Define metadata schema strictly. |
| Re-create R3F canvas on theme switch | Easier than threading theme into scene state | WebGL context churn; visible flash | Never. Update colors imperatively. |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|---|---|---|
| arq worker + H₂ | Submit H₂ to default queue | Dedicated `homology_h2` queue with `max_concurrent=1` and 60s timeout wrapper |
| Redis cache + model retrain | Hash only by `(step_name, params)` | Hash by `(step_name, params, w2v_model_sha256, corpus_manifest_sha256)` |
| SSE + slow background jobs | Hold the SSE channel open indefinitely | Heartbeat every 5s; if no progress event for 30s, send a `stalled` event so the UI can show "still working…" |
| SVC + probability calibration | Retrofit `probability=True` on existing model | Full retrain. The internal Platt CV changes the fit slightly. |
| ripser output → persistence image | Pass `np.inf` death values into the image computation | Filter or clamp infinite persistence; handle empty diagrams as zero-image not error |
| React Query + corpus metadata | `staleTime: 0` (default) → refetch on every mount | `staleTime: Infinity` since corpus only changes on retrain; manual invalidation on admin retrain trigger |
| Tailwind dark variants + R3F | Assume CSS reaches the canvas | Thread theme via Zustand; update Three.js materials/scene.background imperatively |
| `corpus/books.yaml` + model loading | Load books and W2V independently | Validate at startup: corpus manifest hash in W2V metadata must match loaded `books.yaml` |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|---|---|---|---|
| H₂ on user uploads | Worker pinned at 100%, SSE silent for minutes | Disable H₂ for uploads; precompute for bundled only; hard timeout | Any single book whose local geometry triggers cliques cascade |
| SHAP Kernel Explainer in-request | "Why this genre" takes 30-120s | Move to background job; use nearest-neighbor as primary explanation | First user click on "why?" |
| Persistence-image grid at 50×50 with 30-45 books | LOOCV slow; SVM trains on 2500 noise features | Cap grid at 20×20 in production; expose 50×50 only behind an "experimental" flag | Once Phase 8 doubles corpus, SVM training is 4× slower |
| LOOCV on 50+ books | CI timeouts | Switch to repeated stratified 5-fold; parallelize folds; cache per-book homology | At ~30 books on a typical CI runner |
| BookSlider re-fetching on every render | Slider stutters | React Query `staleTime: Infinity`; flat metadata <100KB total | Immediately if `staleTime` left at default |
| R3F canvas unmount/remount on theme switch | Visible flash; WebGL context warnings | Imperative material/scene updates; canvas stays mounted | First theme toggle |
| Tour smoke test missing | Tour silently misaligns after refactor | Playwright walk-through in CI | First Phase 10 component rename |

---

## Mathematical Invariant Pitfalls

Specifically called out per quality-gate requirement.

| Invariant (from PROJECT.md) | v2 Risk | Prevention |
|---|---|---|
| **(1) Single shared Word2Vec space** | Corpus expansion in Phase 8 retrains W2V → new coordinate system → all cached artifacts become coordinate-mismatched. See Pitfall 1. | Hash model identity into every cache key; force full rebuild on corpus change; treat retrain as a hard cache bust |
| **(2) Persistent homology in full N-D, not reduced** | H₂ tooltip / dot-scaling fix work might be tempted to "just use the 3D points we already have for visualization" to make the diagram match what the user sees. This would silently swap N-D homology for 3D homology. | Mathematical computations strictly use N-D vectors; visualization layer never produces inputs to homology |
| **(3) TF-IDF computed without genre labels** | Class-imbalance fixes (Pitfall 6) might tempt the team to "fit IDF within each genre" to balance scores. This injects genre labels into the unsupervised step. | Keep IDF corpus-wide; balance the corpus instead; if balance can't be achieved, accept the asymmetry rather than label-leak |
| **(4) Both feature tracks L2-normalized before α-concat** | Adding new features (H₂ track, additional cluster features) might be concatenated *before* normalization "for simplicity." This silently shifts the α balance and breaks the comparability of the trained SVM with v1. | Every track is L2-normalized independently before concatenation, including the new H₂ track. Add a unit test asserting `np.allclose(np.linalg.norm(track), 1.0)` per track. |

---

## "Looks Done But Isn't" Checklist

Phase 6 (Bug-Fix Sweep):
- [ ] **H₂ computed:** Often missing per-book bench results — verify `bench_h2.py` runs on every bundled book with P95 < 30s
- [ ] **H₂ tooltip working:** Often missing the empty-diagram case — verify rendering with a deliberately-too-small fixture (no crashes, honest copy)
- [ ] **Persistence-diagram dot scaling:** Often missing the H₀ infinite-persistence path — verify infinity dots render separately, finite dots scale by sqrt
- [ ] **BookSlider wired:** Often missing payload-size discipline — verify `/api/corpus/books` is <100KB total
- [ ] **ROADMAP/STATE restored:** Often missing the prevention layer — verify pre-commit hook rejects 0-byte planning files

Phase 7 (Corpus Sourcing Research):
- [ ] **Recommendation doc:** Often missing the per-genre count constraint — verify it specifies hard numbers, not "aim for"
- [ ] **Validation protocol:** Often missing the v1-frozen test set definition — verify the exact 15 books and the held-out fraction are pinned
- [ ] **Author distribution audit:** Often missing — verify the proposed corpus has GroupKFold-feasible author distribution

Phase 8 (Corpus Expansion):
- [ ] **Cache invalidation:** Often missing model-hash inclusion — verify cache keys include `w2v_model_sha256`
- [ ] **GroupKFold by author:** Often missing in v1 carry-over LOOCV scripts — verify `scripts/06_validate.py` uses author groups
- [ ] **Permutation test:** Often missing on the new corpus — verify it runs and the null distribution is reported
- [ ] **v1-frozen test eval:** Often missing — verify the v2 SVM is evaluated on the held-out v1 set, not just LOOCV on full new corpus
- [ ] **Per-genre F1 reported:** Often missing — verify macro-F1 is the headline metric

Phase 9 (Classification Depth):
- [ ] **Calibrated top-N:** Often missing — verify SVC was retrained with `probability=True` and `predict_proba` is used
- [ ] **Top-N sums to 1:** Often missing — verify with a unit test
- [ ] **Explainability not Kernel SHAP synchronous:** Often missing — verify "why?" is a background job, not in the request handler
- [ ] **Nearest-training-books explanation:** Often missing the feature-space vs word2vec-space distinction in the UI copy

Phase 10 (Visual Polish):
- [ ] **Dark mode covers R3F canvas:** Often missing — verify scene background updates on theme switch with no canvas remount
- [ ] **Genre color contrast in both themes:** Often missing — verify with axe / contrast-ratio tooling
- [ ] **Tour smoke test:** Often missing in CI — verify Playwright run walks every step
- [ ] **Tour anchors centralized:** Often missing — verify `src/tour/anchors.ts` is the only source of truth
- [ ] **Tour re-trigger:** Often missing — verify "Help → Take the tour again" exists and works
- [ ] **Empty-state copy:** Often missing for the "no books uploaded" / "no H₂ features" / "low confidence prediction" cases

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---|---|---|
| Stale cache after retrain (Pitfall 1) | LOW | `redis-cli FLUSHDB` for the cache DB; restart workers; first requests pay the recompute cost. Always recoverable if no in-flight commits depend on it. |
| H₂ hanging worker (Pitfall 2) | LOW | arq worker timeout + restart; user gets `H2Unavailable`. No data loss. |
| Author leakage discovered post-deploy (Pitfall 5) | MEDIUM | Re-run validation with GroupKFold; if accuracy collapses, retract the accuracy claim publicly; either restructure corpus (drop duplicates per author) or document the limitation. No code rollback needed but trust is dented. |
| Class imbalance shipped (Pitfall 6) | LOW-MEDIUM | Either expand the under-represented genre (Phase 8 rerun) or document and add `class_weight='balanced'` and accept the asymmetry |
| `decision_function` mislabeled as probability (Pitfall 7) | MEDIUM | Retrain SVM with `probability=True`; redeploy model; the bug was in the UI label not the math, so no historical data is corrupted. |
| SHAP synchronous, users waited 60s (Pitfall 8) | LOW | Move to arq job; add SSE channel; clear in-flight requests with a `please retry` message |
| Persistence-image importance heatmap shipped (Pitfall 9) | LOW (UI-only) | Replace with per-track / per-dimension aggregation; ship hotfix. No backend changes. |
| ROADMAP/STATE wiped again (Pitfall 15) | LOW (if snapshots exist) / HIGH (if not) | Restore from `.planning/.snapshots/`; if no snapshots, reconstruct from git log + memory — the second time around is slower. Then add the prevention. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---|---|---|
| 1: W2V retrain rotates space | Phase 8 | Cache key tests include model hash; smoke test "old cache + new model = cache miss" |
| 2: H₂ performance cliff | Phase 6 | `bench_h2.py` P95 <30s on bundled corpus; worker timeout test |
| 3: Empty H₂ diagrams | Phase 6 | Fixture test with too-small cloud; UI snapshot for empty state |
| 4: v2 vs v1 accuracy comparison without held-out test | Phase 7 (define) + Phase 8 (execute) | Validation report contains both LOOCV and v1-frozen-test numbers |
| 5: Author leakage | Phase 7 (surface) + Phase 8 (enforce) | GroupKFold used; per-author held-out test reported |
| 6: Class imbalance from corpus expansion | Phase 7 (constrain) + Phase 8 (validate at load time) | Startup check on per-genre counts; macro-F1 reported |
| 7: `decision_function` as probability | Phase 9 | Unit test: top-N values sum to 1; integration test on calibrated outputs |
| 8: SHAP synchronous | Phase 9 | "Why?" endpoint is async/queued; explanation completes <5s on bundled corpus |
| 9: Persistence-image feature importance misleading | Phase 9 | UI shows aggregated importance, not per-pixel; copy mentions normalization |
| 10: Persistence-diagram dot scaling breaks H₀ | Phase 6 | Snapshot test of diagram with infinite-persistence point |
| 11: LOOCV cost explosion | Phase 8 | Validation runtime measured; switch to K-fold if >5 min |
| 12: BookSlider metadata payload bloat | Phase 6 | Metadata endpoint <100KB total; React Query `staleTime: Infinity` |
| 13: R3F canvas doesn't follow theme | Phase 10 | Visual regression test in both themes; no canvas remount on toggle |
| 14: Tour breaks on DOM change | Phase 10 | Playwright smoke test of tour in CI; centralized anchors |
| 15: ROADMAP/STATE wiped | Phase 6 | Pre-commit hook rejects 0-byte planning files; CI gate; backup snapshots |

---

## Sources

- v1 PITFALLS document: `.planning/research/v1/PITFALLS.md` (referenced extensively; not repeated)
- [scikit-learn — Probability calibration (1.16)](https://scikit-learn.org/stable/modules/calibration.html)
- [scikit-learn — Support Vector Machines — Scores and probabilities](https://scikit-learn.org/stable/modules/svm.html#scores-and-probabilities)
- [scikit-learn — CalibratedClassifierCV](https://scikit-learn.org/stable/modules/generated/sklearn.calibration.CalibratedClassifierCV.html)
- [SHAP issue #3747 — KernelExplainer slow on sklearn SVM with RBF Kernel](https://github.com/shap/shap/issues/3747)
- [Domino — SHAP and LIME: pros and cons](https://domino.ai/blog/shap-lime-python-libraries-part-1-great-explainers-pros-cons)
- [Procrustes alignment for gensim Word2Vec models (gist by zhicongchen)](https://gist.github.com/zhicongchen/9e23d5c3f1e5b1293b16133485cd17d8)
- [When Embedding Models Meet: Procrustes Bounds and Applications (arXiv 2510.13406)](https://arxiv.org/pdf/2510.13406)
- [Dark Mode for r3f threejs walkthrough (Michael Gold)](https://mike.gold/notes/x-bookmarks/web-3d/dark-mode-for-r3f-threejs-a-step-by-step-review)
- [R3F by example — background-color](https://onion2k.github.io/r3f-by-example/examples/basic/background-color/)
- [Elegantly Implementing New User Onboarding in React (driver.js)](https://dev.to/newbe36524/elegantly-implementing-new-user-onboarding-in-react-hagicodes-driverjs-practice-12de)
- [Benchmarking R packages for Persistent Homology (R Journal 2021)](https://journal.r-project.org/articles/RJ-2021-033/RJ-2021-033.pdf)
- [Faster computation of degree-1 persistent homology using the reduced Vietoris-Rips filtration (arXiv 2307.16333)](https://arxiv.org/pdf/2307.16333)
- [FastAPI cache invalidation strategies](https://oneuptime.com/blog/post/2026-02-02-fastapi-cache-invalidation/view)

---

*Pitfalls research for: Literary Genre Topology v2.0 (Phases 6-10)*
*Researched: 2026-05-22*
