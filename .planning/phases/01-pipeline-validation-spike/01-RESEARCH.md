# Phase 1: Pipeline Validation Spike - Research

**Researched:** 2026-04-11
**Domain:** NLP + TDA pipeline (Word2Vec, TF-IDF, persistent homology, SVM classification)
**Confidence:** HIGH

## Summary

Phase 1 is a CLI-only go/no-go gate: 6 scripts that download a 15-book corpus, preprocess, train Word2Vec, compute persistent homology with TF-IDF-weighted filtration, build feature vectors, and validate with SVM + permutation test. The technical stack is mature and well-supported on Python 3.12. The two hardest problems are (1) implementing the weighted Vietoris-Rips filtration via a custom distance matrix (NOT a library feature), and (2) bridging the output format of giotto-tda persistence diagrams into persim's PersistenceImager input format.

All key libraries are verified available: giotto-tda 0.6.2, gensim 4.4.0, persim 0.3.8, scikit-learn 1.8.0, gutenbergpy 0.3.5, NLTK 3.9.4. Python 3.12.0 is installed. The weighted distance matrix `d(i,j)/(w_i+w_j)` does NOT satisfy the triangle inequality in general, but this is acceptable -- giotto-tda's Ripser backend accepts arbitrary precomputed distance matrices and produces valid persistence diagrams regardless. Stability guarantees are weaker, but for a validation spike this is fine.

**Primary recommendation:** Use giotto-tda `VietorisRipsPersistence(metric='precomputed')` with a manually constructed weighted distance matrix. Do NOT use `WeightedRipsPersistence` -- its DTM weighting is mathematically different from the TF-IDF ball-growth model specified in the project.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 3 genres: Horror, Sci-Fi, Romance (high-contrast vocabularies)
- **D-02:** 5 books per genre (15 total), LOOCV
- **D-03:** Popular, well-known classics ~200k words from Project Gutenberg, full text
- **D-04:** All public domain, genre labels manually assigned
- **D-05:** 6 separate scripts: 01_download_corpus.py through 06_validate.py + benchmark.py
- **D-06:** Verbose step-by-step logging with timing
- **D-07:** Full summary table + GO/NO-GO verdict
- **D-08:** Results saved to results/validation_report.txt, history to results/run_history.log
- **D-09:** Parameters in config/params.yaml with CLI flag overrides
- **D-10:** params.yaml defaults: max_words=500, word2vec_dim=100, window=5, grid_resolution=20, sigma=0.5, k_clusters=50, alpha=0.5, svm_gamma=scale, svm_C=1.0, epsilon_max=1.0, permutation_n=1000
- **D-11:** Auto-reduce max_words on timeout (10s cap), retry in steps of 100
- **D-12:** Warn and continue if fewer books available
- **D-13:** Minimum 10,000 unique words per book after stopword removal

### Claude's Discretion
- Exact Project Gutenberg download method
- Intermediate file formats
- Exact stopword list
- PCA dimensionality target (20-50D)
- H0 only vs H0+H1 in Phase 1
- Permutation test implementation

### Deferred Ideas (OUT OF SCOPE)
- Web UI, API, React frontend
- Animated Vietoris-Rips visualization
- User book upload
- Full 50-100 book corpus across 5-8 genres
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VALID-01 | CLI trains Word2Vec on 15-book corpus, computes persistence images, runs permutation test | Q3 (gensim API), Q5 (persim API), Q6 (permutation test) |
| VALID-02 | Weighted Vietoris-Rips produces stable diagrams and meaningful genre separation | Q1 (weighted filtration implementation) |
| VALID-03 | Benchmarks Rips computation time vs word count, establishes max_words cap | Q1 (precomputed distance matrix), benchmark script |
| PIPE-01 | Ingests raw .txt files labeled by genre | Q2 (Gutenberg download) |
| PIPE-02 | Tokenizes, normalizes, removes stopwords | Q4 (TfidfVectorizer tokenization alignment) |
| PIPE-03 | Trains single shared skip-gram Word2Vec on entire corpus | Q3 (gensim Word2Vec pipeline) |
| PIPE-04 | Computes TF-IDF weights per book with corpus-level IDF | Q4 (sklearn TF-IDF) |
| PIPE-05 | Constructs per-book weighted point cloud | Q1 (weight application to distance matrix) |
| HOM-01 | Per-book Vietoris-Rips persistent homology with TF-IDF-weighted filtration | Q1 (weighted filtration) |
| HOM-02 | H0 and H1 always; H2 on-demand | Q1 (homology_dimensions parameter) |
| HOM-03 | Persistence diagrams to fixed-length persistence image vectors | Q5 (persim API) |
| HOM-04 | K-means clustering of word vectors into K semantic regions | Standard sklearn KMeans |
| HOM-05 | Per-book K-dimensional word-cluster distribution vector | TF-IDF weighted cluster membership |
| HOM-06 | Concatenates normalized persistence image + cluster distribution with alpha weighting | Feature engineering |
| HOM-07 | Kernel SVM with RBF, LOOCV, per-class accuracy | Q6 (permutation test), Q7 (PCA+SVM pipeline) |
| HOM-08 | PCA dimensionality reduction before SVM | Q7 (PCA in LOOCV) |
| CORPUS-01 | Ships with bundled corpus (15 books for Phase 1 subset) | Q2 (Gutenberg download) |
| CORPUS-03 | Configurable max_words cap (default 500, max 1000) | Q1 (controls point cloud size) |
| CORPUS-04 | All public domain (Project Gutenberg) | Q2 (Gutenberg IDs) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- WAT framework: workflows in `workflows/`, tools in `tools/`, temp files in `.tmp/`
- Check `tools/` before building anything new
- Deliverables go to cloud services; `.tmp/` is disposable
- API keys in `.env` only
- Document failures in workflows

**Phase 1 deviation from WAT:** Phase 1 scripts live in `scripts/` per D-05, not `tools/`. This is correct -- these are pipeline stages, not reusable WAT tools. The WAT structure applies to the web application phases.

---

## Q1: Weighted Vietoris-Rips Implementation

**Confidence: HIGH** [VERIFIED: giotto-tda docs]

### The Problem

The spec calls for TF-IDF weights to control ball growth rate: heavy-TF-IDF words grow balls faster, meaning they connect to neighbors at lower filtration values. This is modeled by `d_weighted(i,j) = d(i,j) / (w_i + w_j)` where `w_i` is the TF-IDF weight of word `i`.

### Does This Satisfy the Triangle Inequality?

**No.** The modified distance `d_w(i,j) = d(i,j) / (w_i + w_j)` does NOT generally satisfy the triangle inequality. [VERIFIED: mathematical proof]

Counterexample: Let w_i=w_k=1, w_j=100. Let d(i,j)=d(j,k)=10, d(i,k)=19 (valid triangle). Then:
- d_w(i,k) = 19/2 = 9.5
- d_w(i,j) + d_w(j,k) = 10/101 + 10/101 = 0.198
- 9.5 > 0.198 -- triangle inequality violated.

### Does This Matter?

**No, for this use case.** giotto-tda's `VietorisRipsPersistence` with `metric='precomputed'` accepts arbitrary distance matrices. The Ripser backend computes persistent homology on the resulting filtration regardless of whether the input is a metric. The persistence diagrams are well-defined as algebraic invariants of the filtration. What you lose is the **stability theorem** guarantee (small perturbations in input cause small perturbations in output), but for a validation spike this is acceptable. [ASSUMED]

### Do NOT Use WeightedRipsPersistence

giotto-tda's `WeightedRipsPersistence` uses DTM (Distance-to-Measure) weighting, which assigns weights based on local density (outlier suppression). This is mathematically different from TF-IDF importance weighting. The DTM formula is: `w(x) = (1/(n+1) * sum_k dist(x, x_k)^r)^(1/r)`. [VERIFIED: giotto-tda WeightedRipsPersistence docs]

### Correct Implementation

```python
import numpy as np
from scipy.spatial.distance import pdist, squareform
from gtda.homology import VietorisRipsPersistence

def compute_weighted_distance_matrix(vectors, tfidf_weights):
    """
    Compute modified distance matrix where d_w(i,j) = d(i,j) / (w_i + w_j).
    
    Parameters:
        vectors: np.ndarray of shape (n_words, embedding_dim) -- L2-normalized word vectors
        tfidf_weights: np.ndarray of shape (n_words,) -- TF-IDF weights, all > 0
    
    Returns:
        dist_matrix: np.ndarray of shape (n_words, n_words) -- weighted distance matrix
    """
    # Euclidean distances (on L2-normed vectors, this is proportional to cosine distance)
    raw_dist = squareform(pdist(vectors, metric='euclidean'))
    
    # Weight denominator: w_i + w_j for all pairs
    weight_sums = tfidf_weights[:, None] + tfidf_weights[None, :]
    
    # Avoid division by zero (shouldn't happen if TF-IDF > 0)
    weight_sums = np.maximum(weight_sums, 1e-10)
    
    # Modified distance: higher weights = smaller effective distance = earlier connection
    weighted_dist = raw_dist / weight_sums
    
    return weighted_dist

# Usage with giotto-tda
VR = VietorisRipsPersistence(
    metric='precomputed',
    homology_dimensions=(0, 1),  # H0 and H1
    max_edge_length=np.inf,      # or epsilon_max from params
    n_jobs=-1
)

# Input must be 3D: (n_samples, n_points, n_points)
# For a single book: reshape to (1, n_words, n_words)
diagrams = VR.fit_transform(weighted_dist[np.newaxis, :, :])
# Output shape: (1, n_features, 3) where each feature is [birth, death, dimension]
```

### Vertex Weights on Diagonal

When using `metric='precomputed'`, diagonal entries are interpreted as vertex weights (filtration values at which vertices appear). For our use case, set diagonal to 0 (all words appear at filtration time 0) or to `1/w_i` (high-TF-IDF words appear earlier). Setting diagonal to 0 is simpler and keeps the weighting entirely in the edge distances. [ASSUMED]

### Gotchas
- L2-normalize all word vectors before computing distances (makes Euclidean proportional to cosine). [VERIFIED: standard practice]
- TF-IDF weights must be strictly positive. Words with TF-IDF=0 should be excluded from the point cloud.
- The `max_edge_length` parameter controls epsilon_max in the filtration. Set it based on the distribution of weighted distances, not raw distances.
- For the timeout/retry logic (D-11), wrap the `fit_transform` call in a signal-based timeout (or multiprocessing with timeout on Windows).

---

## Q2: Project Gutenberg Download

**Confidence: HIGH** [VERIFIED: PyPI, gutenbergpy docs]

### Recommendation: gutenbergpy 0.3.5

Use `gutenbergpy` for downloading. It is the most maintained Gutenberg library, requires no mirror setup, and provides clean header/footer stripping. [VERIFIED: PyPI gutenbergpy 0.3.5]

```python
from gutenbergpy.textget import get_text_by_id, strip_headers

def download_book(gutenberg_id: int) -> str:
    """Download and clean a Project Gutenberg book."""
    raw = get_text_by_id(gutenberg_id)
    clean = strip_headers(raw)
    return clean.decode('utf-8', errors='replace')
```

### Book IDs for the Mini-Corpus

These are the Gutenberg IDs for the books mentioned in CONTEXT.md specifics:

**Horror:**
| Book | Author | Gutenberg ID |
|------|--------|-------------|
| Dracula | Bram Stoker | 345 |
| Frankenstein | Mary Shelley | 84 |
| The Picture of Dorian Gray | Oscar Wilde | 174 |
| The Strange Case of Dr Jekyll and Mr Hyde | R.L. Stevenson | 43 |
| The Turn of the Screw | Henry James | 209 |

**Sci-Fi:**
| Book | Author | Gutenberg ID |
|------|--------|-------------|
| The War of the Worlds | H.G. Wells | 36 |
| Twenty Thousand Leagues Under the Seas | Jules Verne | 164 |
| The Time Machine | H.G. Wells | 35 |
| A Journey to the Centre of the Earth | Jules Verne | 18857 |
| The Island of Doctor Moreau | H.G. Wells | 159 |

**Romance:**
| Book | Author | Gutenberg ID |
|------|--------|-------------|
| Pride and Prejudice | Jane Austen | 1342 |
| Jane Eyre | Charlotte Bronte | 1260 |
| Sense and Sensibility | Jane Austen | 161 |
| Wuthering Heights | Emily Bronte | 768 |
| Emma | Jane Austen | 158 |

[ASSUMED -- Gutenberg IDs based on training knowledge. Script should verify each ID downloads correctly.]

### Gotchas
- `get_text_by_id` returns **bytes**, not str. Decode with `utf-8` and handle errors.
- `strip_headers` removes Project Gutenberg boilerplate (header/footer), but some books have inconsistent formatting. Check that the cleaned text starts with actual content.
- Rate limiting: Gutenberg's robots.txt asks for 2-second delays between requests. Add `time.sleep(2)` between downloads.
- Some older books use Latin-1 encoding. `errors='replace'` handles this.
- Cache downloaded texts to `.tmp/corpus/` so re-runs don't re-download.
- Minimum word count check (D-13: 10,000 unique words after stopwords) should happen in script 02, not script 01.

### Alternative: Direct HTTP

For robustness, consider falling back to direct HTTP if gutenbergpy fails:
```python
import urllib.request
url = f"https://www.gutenberg.org/cache/epub/{book_id}/pg{book_id}.txt"
```
This is simpler but doesn't strip headers automatically.

---

## Q3: Gensim Word2Vec Pipeline

**Confidence: HIGH** [VERIFIED: gensim 4.4.0 docs, PyPI]

### Correct API for Skip-Gram on Multi-Document Corpus

```python
from gensim.models import Word2Vec

# Corpus: list of lists of tokens (each inner list = one sentence or paragraph)
# For books: split each book into sentences/paragraphs, each tokenized to word list
corpus_sentences = []
for book_tokens in all_books_tokens:
    # Split into chunks of ~1000 words to create "sentences" for Word2Vec
    chunk_size = 1000
    for i in range(0, len(book_tokens), chunk_size):
        corpus_sentences.append(book_tokens[i:i+chunk_size])

model = Word2Vec(
    sentences=corpus_sentences,
    vector_size=100,       # D-10 default
    window=5,              # D-10 default (consider 10-15 for genre signal)
    min_count=5,           # exclude very rare words
    sg=1,                  # skip-gram
    negative=5,            # negative sampling
    epochs=10,             # training iterations (gensim 4 renamed iter -> epochs)
    workers=1,             # deterministic training
    seed=42,               # reproducibility
)

# Save model for reuse
model.save('.tmp/models/word2vec.model')

# Access vectors
vector = model.wv['dracula']       # get vector for a word
vocab = list(model.wv.key_to_index.keys())  # all words in vocabulary
```

### Key API Changes in Gensim 4.x
- `model.wv.vocab` is gone. Use `model.wv.key_to_index` (dict: word -> index). [VERIFIED: gensim 4 migration]
- `iter` parameter renamed to `epochs`. [VERIFIED: gensim docs]
- `model.wv[word]` returns the vector. `model.wv.vectors` is the full matrix.
- Use `model.wv.get_vector(word, norm=True)` for L2-normalized vectors.

### Handling OOV Words
Words in TF-IDF vocabulary but not in Word2Vec (filtered by min_count) must be excluded from the point cloud. Log the count:
```python
oov_words = [w for w in tfidf_vocab if w not in model.wv]
print(f"OOV words excluded: {len(oov_words)}/{len(tfidf_vocab)}")
```

### Minimum Corpus Size
With 15 books averaging ~50k words each after preprocessing, total corpus is ~750k tokens. This is on the low side for stable 100D embeddings. Mitigations: [VERIFIED: pitfalls research]
- Use `min_count=5` (not lower) to exclude unstable rare words
- Use `vector_size=100` (not 300) -- fewer parameters need fewer observations
- Consider `window=10` for topical/semantic (genre) signal rather than syntactic

### Saving/Loading
```python
# Full model (allows continued training)
model.save('.tmp/models/word2vec.model')
model = Word2Vec.load('.tmp/models/word2vec.model')

# KeyedVectors only (smaller, read-only)
model.wv.save('.tmp/models/word2vec.kv')
from gensim.models import KeyedVectors
kv = KeyedVectors.load('.tmp/models/word2vec.kv')
```

---

## Q4: Scikit-Learn TF-IDF on Raw Text

**Confidence: HIGH** [VERIFIED: scikit-learn 1.8.0 docs]

### Correct Approach

`TfidfVectorizer` naturally computes per-document TF and corpus-wide IDF when each "document" is one book. This is exactly what PIPE-04 requires.

```python
from sklearn.feature_extraction.text import TfidfVectorizer

# Each book as a single string (after preprocessing)
book_texts = [' '.join(book_tokens) for book_tokens in all_books_tokens]

vectorizer = TfidfVectorizer(
    sublinear_tf=True,          # 1 + log(tf) -- recommended for long documents
    smooth_idf=True,            # log(1 + N/(1 + df)) -- dampens small-corpus instability
    norm=None,                  # do NOT L2-normalize -- we need raw TF-IDF per word
    use_idf=True,
    lowercase=False,            # already lowercased in preprocessing
    token_pattern=r'(?u)\b\w+\b',  # match single-char words too
    vocabulary=list(model.wv.key_to_index.keys()),  # restrict to Word2Vec vocab
)

tfidf_matrix = vectorizer.fit_transform(book_texts)
# Shape: (15, vocab_size) -- sparse matrix

# Extract per-book TF-IDF weights for each word
feature_names = vectorizer.get_feature_names_out()
```

### Aligning TF-IDF with Word2Vec Vocabulary

Critical: The TF-IDF vocabulary MUST be restricted to words in the Word2Vec model. Set `vocabulary=` parameter to the Word2Vec vocabulary. This ensures every word with a TF-IDF weight also has an embedding vector.

### Extracting Per-Word Weights for a Book

```python
def get_book_word_weights(tfidf_matrix, book_idx, feature_names, top_k=500):
    """Get top-k words by TF-IDF for a specific book."""
    row = tfidf_matrix[book_idx].toarray().flatten()
    # Get indices of top-k words
    top_indices = np.argsort(row)[-top_k:][::-1]
    # Filter out zero-weight words
    top_indices = top_indices[row[top_indices] > 0]
    
    words = [feature_names[i] for i in top_indices]
    weights = row[top_indices]
    return words, weights
```

### Gotchas
- Set `norm=None` to get raw TF-IDF values, not L2-normalized per-document vectors. The normalization happens later in the feature pipeline.
- `sublinear_tf=True` is important for book-length documents where raw TF can be very high.
- The `vocabulary` parameter must be a dict or iterable. Using `list(model.wv.key_to_index.keys())` works.

---

## Q5: Persim PersistenceImager API

**Confidence: HIGH** [VERIFIED: persim 0.3.8 docs, GitHub notebook]

### Format Bridge: giotto-tda to persim

giotto-tda outputs persistence diagrams as arrays of shape `(n_samples, n_features, 3)` where each feature is `[birth, death, dimension]`. persim expects a list of `(n, 2)` numpy arrays in `(birth, death)` format, one per homology dimension.

```python
from persim import PersistenceImager

def giotto_to_persim(diagrams, dim=1):
    """
    Convert giotto-tda diagram output to persim format.
    
    Parameters:
        diagrams: np.ndarray of shape (1, n_features, 3) from giotto-tda
        dim: homology dimension to extract (0 or 1)
    
    Returns:
        np.ndarray of shape (n, 2) in (birth, death) format
    """
    diag = diagrams[0]  # single sample
    mask = diag[:, 2] == dim  # filter by dimension
    bd_pairs = diag[mask, :2]  # (birth, death) pairs
    
    # Remove padding (birth == death entries)
    valid = bd_pairs[:, 0] < bd_pairs[:, 1]
    bd_pairs = bd_pairs[valid]
    
    # Remove infinite death values
    finite = np.isfinite(bd_pairs[:, 1])
    bd_pairs = bd_pairs[finite]
    
    return bd_pairs
```

### Using PersistenceImager

```python
pimgr = PersistenceImager(
    pixel_size=0.05,    # controls resolution (smaller = finer grid)
    birth_range=None,   # auto-determined by fit()
    pers_range=None,    # auto-determined by fit()
    weight='persistence',  # standard linear ramp weighting
    kernel='gaussian',
    kernel_params={'sigma': 0.5},  # D-10 default sigma
)

# Collect all persistence diagrams across all books
all_diagrams_h0 = [giotto_to_persim(d, dim=0) for d in all_book_diagrams]
all_diagrams_h1 = [giotto_to_persim(d, dim=1) for d in all_book_diagrams]

# Fit on all diagrams to determine consistent ranges
pimgr.fit(all_diagrams_h1, skew=True)

# Transform each diagram to a persistence image
images_h1 = pimgr.transform(all_diagrams_h1, skew=True)
# images_h1 is a list of 2D arrays (one per book)

# Flatten to feature vectors
feature_vectors = [img.flatten() for img in images_h1]
```

### The `skew=True` Parameter

When `skew=True`, persim internally converts from `(birth, death)` to `(birth, persistence)` coordinates where `persistence = death - birth`. This is the coordinate rotation required by HOM-03. Always pass `skew=True` when giving `(birth, death)` pairs.

### Grid Resolution Control

The `pixel_size` parameter indirectly controls grid resolution. To get a 20x20 grid (D-10 default):
```python
# After fitting, check the ranges:
birth_range = pimgr.birth_range
pers_range = pimgr.pers_range

# pixel_size should be approximately:
# pixel_size = (range_max - range_min) / grid_resolution
# This requires fitting first, then adjusting pixel_size
```

Alternatively, fit first, then manually set pixel_size:
```python
pimgr.fit(all_diagrams, skew=True)
birth_span = pimgr.birth_range[1] - pimgr.birth_range[0]
pers_span = pimgr.pers_range[1] - pimgr.pers_range[0]
pimgr.pixel_size = max(birth_span, pers_span) / 20  # 20x20 grid
```

### Gotchas
- `fit()` must be called on ALL books' diagrams together to get consistent ranges. Otherwise each book's image occupies a different coordinate space and they are not comparable.
- Empty persistence diagrams (no features in that homology dimension) must be handled. Pass an empty `np.array([]).reshape(0, 2)`.
- H0 diagrams often have one infinite-death component (the final connected component). Filter infinite values before passing to persim.

---

## Q6: Permutation Test

**Confidence: HIGH** [VERIFIED: scikit-learn 1.8.0 docs]

### Recommendation: Use `sklearn.model_selection.permutation_test_score`

This is the cleanest approach and directly supports LOOCV.

```python
from sklearn.model_selection import permutation_test_score, LeaveOneOut
from sklearn.svm import SVC
from sklearn.pipeline import Pipeline
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

pipe = Pipeline([
    ('scaler', StandardScaler()),
    ('pca', PCA(n_components=20)),
    ('svm', SVC(kernel='rbf', C=1.0, gamma='scale'))
])

score, perm_scores, p_value = permutation_test_score(
    pipe,
    X_features,       # (15, n_features) -- concatenated feature vectors
    y_labels,          # (15,) -- genre labels
    cv=LeaveOneOut(),
    n_permutations=1000,  # D-10 default
    scoring='accuracy',
    n_jobs=-1,
    random_state=42,
)

# score: float -- true LOOCV accuracy
# perm_scores: array of shape (1000,) -- null distribution
# p_value: float -- (C+1)/(n_permutations+1)
```

### Computational Cost

With LOOCV on 15 samples and 1000 permutations: `(1000 + 1) * 15 = 15,015` model fits. Each fit is a tiny SVM on 14 samples with ~20-50 features. This should complete in seconds to low minutes. [ASSUMED]

### n_permutations = 1000

With 1000 permutations, the minimum achievable p-value is `1/1001 = 0.001`. For the go/no-go gate (p < 0.05), 1000 permutations provides sufficient resolution. The p-value is computed as `(C + 1) / (n_permutations + 1)` where C is the count of permutation scores >= true score.

### Gotchas
- The `Pipeline` wrapping PCA + SVM ensures PCA is fit on training folds only, never on the test fold. This is critical for honest evaluation (see Q7).
- `n_jobs=-1` parallelizes the permutations across CPU cores.
- For the GO/NO-GO verdict: `p_value < 0.05` means GO.

---

## Q7: PCA Before SVM in LOOCV

**Confidence: HIGH** [VERIFIED: scikit-learn Pipeline docs]

### Use sklearn Pipeline

The `Pipeline` object ensures that PCA and StandardScaler are fit ONLY on training data within each CV fold. This prevents data leakage.

```python
from sklearn.pipeline import Pipeline
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

pipe = Pipeline([
    ('scaler', StandardScaler()),        # normalize features
    ('pca', PCA(n_components=20)),       # reduce to 20D
    ('svm', SVC(kernel='rbf', C=1.0, gamma='scale'))
])
```

When `permutation_test_score` or `cross_val_score` uses this pipeline with `LeaveOneOut()`:
1. For each fold, 14 samples are used to fit the scaler, fit PCA, and train SVM
2. The held-out sample is transformed through the fitted scaler and PCA, then predicted
3. No information from the test sample leaks into the PCA components

### PCA Component Selection

With 15 samples and ~450D features (400 persistence image + 50 cluster distribution), PCA should reduce to 20D or fewer. Rule of thumb: `n_components < n_samples / 3` to avoid overfitting. With 15 samples, target 5-20 components. [ASSUMED]

Empirical approach: try `n_components` in [5, 10, 15, 20] and report all results in the validation report. The params.yaml doesn't specify a PCA target, so add `pca_components: 20` as a default.

### Feature Normalization Before Concatenation

Per HOM-06, the persistence image vector and cluster distribution vector must be independently normalized before concatenation with alpha weighting:

```python
from sklearn.preprocessing import normalize

# Normalize each feature track independently (L2)
pi_normalized = normalize(persistence_images, norm='l2')
cd_normalized = normalize(cluster_distributions, norm='l2')

# Alpha-weighted concatenation
alpha = 0.5  # D-10 default
X_features = np.hstack([
    alpha * pi_normalized,
    (1 - alpha) * cd_normalized
])
```

The `StandardScaler` in the pipeline then re-scales the concatenated features within each CV fold.

---

## Q8: Intermediate File Formats

**Confidence: HIGH** [ASSUMED -- standard Python practices]

### Recommendation

| Script | Output | Format | Rationale |
|--------|--------|--------|-----------|
| 01_download_corpus | Raw book texts | `.txt` files in `.tmp/corpus/{genre}/{title}.txt` | Human-readable, easy to inspect |
| 02_preprocess | Tokenized books | `.json` per book: `{"tokens": [...], "metadata": {...}}` | Preserves metadata, human-readable |
| 03_train_embeddings | Word2Vec model | `.model` via `model.save()` | Gensim native format, supports reload |
| 03_train_embeddings | TF-IDF matrix + vocab | `.npz` (sparse matrix) + `.json` (vocab) | Scipy sparse format, memory-efficient |
| 04_compute_homology | Persistence diagrams | `.npy` per book per dimension | Numpy native, fast load |
| 05_build_features | Feature vectors + labels | `.npz`: `X` (features), `y` (labels), `book_names` | Single file for SVM input |
| 06_validate | Validation report | `.txt` (human) + `.json` (machine) | Both Phase 2 API and human consumption |

### Directory Structure

```
.tmp/
  corpus/
    horror/dracula.txt
    scifi/war_of_the_worlds.txt
    romance/pride_and_prejudice.txt
  preprocessed/
    horror/dracula.json
    ...
  models/
    word2vec.model
    word2vec.model.wv.vectors.npy  (auto-created by gensim)
    tfidf_matrix.npz
    tfidf_vocab.json
  homology/
    horror/dracula_diagrams.npy
    ...
  features/
    feature_matrix.npz
results/
  validation_report.txt
  run_history.log
config/
  params.yaml
```

### Why Not Pickle

Pickle is fragile across Python versions and has security concerns. Use format-specific serialization:
- Numpy arrays: `.npy` / `.npz`
- Sparse matrices: `scipy.sparse.save_npz`
- Gensim models: `.model` (gensim's own format, uses numpy internally)
- Metadata/config: `.json`

---

## Standard Stack

### Core

| Library | Version | Purpose | Verified |
|---------|---------|---------|----------|
| giotto-tda | 0.6.2 | Persistent homology (VietorisRipsPersistence) | [VERIFIED: pip, PyPI] |
| persim | 0.3.8 | Persistence images (PersistenceImager) | [VERIFIED: pip, PyPI] |
| gensim | 4.4.0 | Word2Vec skip-gram training | [VERIFIED: pip, PyPI] |
| scikit-learn | 1.8.0 | TF-IDF, PCA, SVM, LOOCV, permutation test, KMeans | [VERIFIED: pip, PyPI] |
| gutenbergpy | 0.3.5 | Project Gutenberg book download | [VERIFIED: pip, PyPI] |
| nltk | 3.9.4 | English stopword list | [VERIFIED: pip, PyPI] |
| numpy | 1.26.2 | Array operations (already installed) | [VERIFIED: installed] |
| scipy | 1.11.4 | Distance computations (already installed) | [VERIFIED: installed] |
| pyyaml | 6.0.1 | params.yaml config parsing (already installed) | [VERIFIED: installed] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| joblib | (via sklearn) | Parallel processing, model caching | Auto-installed with sklearn |
| tqdm | latest | Progress bars for loops | Optional, nice for verbose logging |

**Installation:**
```bash
pip install giotto-tda==0.6.2 persim==0.3.8 gensim==4.4.0 scikit-learn==1.8.0 gutenbergpy==0.3.5 nltk==3.9.4 tqdm pyyaml
```

---

## Architecture Patterns

### Project Structure (Phase 1)

```
Word2Vec Genre Analyser/
  scripts/
    01_download_corpus.py
    02_preprocess.py
    03_train_embeddings.py
    04_compute_homology.py
    05_build_features.py
    06_validate.py
    benchmark.py
  config/
    params.yaml
  results/
    validation_report.txt
    run_history.log
  .tmp/
    corpus/         # downloaded books
    preprocessed/   # tokenized books
    models/         # Word2Vec, TF-IDF
    homology/       # persistence diagrams
    features/       # feature vectors
```

### Pattern: Config-Driven Pipeline with CLI Overrides

Each script:
1. Loads defaults from `config/params.yaml`
2. Overrides with CLI flags (argparse)
3. Reads inputs from previous stage's output directory
4. Writes outputs to its own output directory
5. Logs timing and progress to stdout

```python
import argparse
import yaml
import time

def load_config(cli_args):
    with open('config/params.yaml') as f:
        config = yaml.safe_load(f)
    # CLI args override config
    for key, value in vars(cli_args).items():
        if value is not None:
            config[key] = value
    return config

def timed_step(name):
    """Context manager for timing pipeline steps."""
    class Timer:
        def __enter__(self):
            self.start = time.time()
            print(f"{name}...", end=' ', flush=True)
            return self
        def __exit__(self, *args):
            elapsed = time.time() - self.start
            print(f"done ({elapsed:.1f}s)")
    return Timer()
```

### Anti-Patterns to Avoid
- **Single monolithic script:** Violates D-05. Each stage must be independently re-runnable.
- **Hardcoded parameters:** Everything must come from params.yaml with CLI overrides per D-09.
- **Silent failures:** Every script must log clearly what it does and what it skips per D-06.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Persistence computation | Custom simplex enumeration | giotto-tda VietorisRipsPersistence | Ripser is 40x faster than naive |
| Persistence images | Manual Gaussian KDE on diagram | persim PersistenceImager | Handles coordinate rotation, grid fitting |
| TF-IDF computation | Manual TF/IDF calculation | sklearn TfidfVectorizer | Handles smoothing, sublinear TF, vocab restriction |
| Permutation testing | Manual shuffle loop | sklearn permutation_test_score | Handles p-value computation, parallelization |
| CV-safe PCA+SVM | Manual fold splitting | sklearn Pipeline + LeaveOneOut | Prevents data leakage automatically |
| Word2Vec training | Custom skip-gram with PyTorch | gensim Word2Vec | Optimized C backend, years of testing |
| Header stripping | Regex on Gutenberg text | gutenbergpy strip_headers | Handles inconsistent Gutenberg formatting |

---

## Common Pitfalls

### Pitfall 1: Using WeightedRipsPersistence Instead of Custom Distance Matrix
**What goes wrong:** DTM weighting suppresses outliers by local density, not by TF-IDF importance. Results are mathematically different from the intended filtration.
**How to avoid:** Always use `VietorisRipsPersistence(metric='precomputed')` with manually constructed `d(i,j)/(w_i+w_j)` matrix.
**Warning signs:** Persistence diagrams look the same regardless of TF-IDF weights.

### Pitfall 2: Data Leakage in PCA + LOOCV
**What goes wrong:** Fitting PCA on all 15 samples before CV means the test sample's information leaks into the principal components. Accuracy is inflated.
**How to avoid:** Wrap PCA + SVM in `sklearn.pipeline.Pipeline`. The pipeline automatically refits PCA on each training fold.
**Warning signs:** Suspiciously high accuracy (>90%) on 15 books.

### Pitfall 3: Inconsistent Persistence Image Ranges Across Books
**What goes wrong:** If each book's persistence image uses different birth/persistence ranges, the resulting feature vectors are not comparable. SVM learns range artifacts, not topology.
**How to avoid:** Call `PersistenceImager.fit()` on ALL books' diagrams together before transforming.
**Warning signs:** Feature vectors have very different magnitude distributions across books.

### Pitfall 4: Forgetting to L2-Normalize Word Vectors Before Distance Computation
**What goes wrong:** Euclidean distance on unnormalized Word2Vec vectors conflates vector magnitude (frequency-related) with direction (semantic). Two semantically similar words with different frequencies appear far apart.
**How to avoid:** `vectors = model.wv.get_normed_vectors()` or manually L2-normalize.
**Warning signs:** Common words cluster by frequency rather than meaning.

### Pitfall 5: TF-IDF Vocabulary Mismatch with Word2Vec
**What goes wrong:** TfidfVectorizer builds its own vocabulary from the corpus text. If this doesn't match Word2Vec's vocabulary (different tokenization, different min_count), some words have TF-IDF weights but no embedding, or vice versa.
**How to avoid:** Pass `vocabulary=list(model.wv.key_to_index.keys())` to TfidfVectorizer.
**Warning signs:** KeyError when looking up word vectors for TF-IDF-weighted words.

### Pitfall 6: Timeout Handling on Windows
**What goes wrong:** Python's `signal.alarm()` doesn't work on Windows. The D-11 timeout/retry logic needs a different approach.
**How to avoid:** Use `multiprocessing` with a timeout, or `concurrent.futures.ProcessPoolExecutor` with `timeout` parameter.
**Warning signs:** Timeout logic silently fails to trigger on Windows.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest (standard Python) |
| Config file | None -- Wave 0 creates `pytest.ini` or `pyproject.toml [tool.pytest]` |
| Quick run command | `pytest tests/ -x -q` |
| Full suite command | `pytest tests/ -v` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VALID-01 | Full pipeline runs end-to-end and produces p-value | integration | `pytest tests/test_pipeline_e2e.py -x` | Wave 0 |
| VALID-02 | Weighted distance matrix produces valid persistence diagrams | unit | `pytest tests/test_homology.py::test_weighted_rips -x` | Wave 0 |
| VALID-03 | Benchmark script measures time vs word count | smoke | `python scripts/benchmark.py --max-words 100` | Wave 0 |
| PIPE-02 | Preprocessing produces expected tokens from known input | unit | `pytest tests/test_preprocess.py -x` | Wave 0 |
| PIPE-03 | Word2Vec trains on mini-corpus and produces stable vectors | unit | `pytest tests/test_embeddings.py -x` | Wave 0 |
| PIPE-04 | TF-IDF vocabulary matches Word2Vec vocabulary | unit | `pytest tests/test_tfidf.py -x` | Wave 0 |
| PIPE-05 | Weighted point cloud has correct shape and positive weights | unit | `pytest tests/test_point_cloud.py -x` | Wave 0 |
| HOM-01 | Persistence diagrams have expected shape from precomputed matrix | unit | `pytest tests/test_homology.py -x` | Wave 0 |
| HOM-03 | Persistence images have correct grid dimensions | unit | `pytest tests/test_features.py::test_persistence_images -x` | Wave 0 |
| HOM-06 | Feature concatenation preserves alpha weighting | unit | `pytest tests/test_features.py::test_concatenation -x` | Wave 0 |
| HOM-08 | PCA reduces dimensionality correctly within pipeline | unit | `pytest tests/test_features.py::test_pca -x` | Wave 0 |

### Sampling Rate
- **Per script:** Run relevant unit tests after each script is implemented
- **Per plan:** Full `pytest tests/ -v` after each plan completes
- **Phase gate:** Full suite green + manual review of validation_report.txt

### Wave 0 Gaps
- [ ] `tests/test_preprocess.py` -- covers PIPE-02
- [ ] `tests/test_embeddings.py` -- covers PIPE-03
- [ ] `tests/test_tfidf.py` -- covers PIPE-04
- [ ] `tests/test_homology.py` -- covers VALID-02, HOM-01
- [ ] `tests/test_features.py` -- covers HOM-03, HOM-06, HOM-08
- [ ] `tests/test_pipeline_e2e.py` -- covers VALID-01
- [ ] `pyproject.toml` or `pytest.ini` -- test config
- [ ] Framework install: `pip install pytest`

---

## Suggested Plan Structure

### Plan 01-01: Corpus Acquisition and Preprocessing
**Scripts:** `01_download_corpus.py`, `02_preprocess.py`
**Requirements:** PIPE-01, PIPE-02, CORPUS-01, CORPUS-04
**Deliverables:**
- `config/params.yaml` with corpus book list (Gutenberg IDs, genres)
- Script to download 15 books from Gutenberg, cache to `.tmp/corpus/`
- Script to tokenize, lowercase, remove stopwords, filter by min unique words (D-13)
- Output: `.tmp/preprocessed/` with tokenized books as JSON
- Tests: `test_preprocess.py`

### Plan 01-02: Word2Vec Training and TF-IDF Computation
**Scripts:** `03_train_embeddings.py`
**Requirements:** PIPE-03, PIPE-04, PIPE-05
**Deliverables:**
- Script to train skip-gram Word2Vec on all preprocessed books combined
- Compute TF-IDF with vocabulary restricted to Word2Vec vocab
- Construct per-book weighted point clouds (top-K words by TF-IDF + their vectors)
- Output: `.tmp/models/` (Word2Vec, TF-IDF), `.tmp/point_clouds/`
- Tests: `test_embeddings.py`, `test_tfidf.py`

### Plan 01-03: Homology, Classification, and Validation
**Scripts:** `04_compute_homology.py`, `05_build_features.py`, `06_validate.py`, `benchmark.py`
**Requirements:** HOM-01 through HOM-08, VALID-01 through VALID-03, CORPUS-03
**Deliverables:**
- Script to compute weighted Vietoris-Rips per book with timeout/retry (D-11)
- Script to convert diagrams to persistence images + cluster distributions, concatenate with alpha
- Script to run PCA + SVM + LOOCV + permutation test, output GO/NO-GO verdict
- Benchmark script: Rips time vs word count curve
- Output: `.tmp/homology/`, `.tmp/features/`, `results/`
- Tests: `test_homology.py`, `test_features.py`, `test_pipeline_e2e.py`

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python | All scripts | Yes | 3.12.0 | -- |
| pip | Package installation | Yes | 23.3.1 | -- |
| numpy | Array operations | Yes | 1.26.2 | -- |
| scipy | Distance computation | Yes | 1.11.4 | -- |
| pyyaml | Config parsing | Yes | 6.0.1 | -- |
| giotto-tda | Persistent homology | No (available via pip) | 0.6.2 | -- |
| gensim | Word2Vec | No (available via pip) | 4.4.0 | -- |
| scikit-learn | ML pipeline | No (available via pip) | 1.8.0 | -- |
| persim | Persistence images | No (available via pip) | 0.3.8 | -- |
| gutenbergpy | Book download | No (available via pip) | 0.3.5 | Direct HTTP |
| nltk | Stopwords | No (available via pip) | 3.9.4 | -- |
| Internet | Gutenberg download | Yes (assumed) | -- | Pre-downloaded corpus |

**Missing dependencies with no fallback:** None -- all installable via pip.
**Missing dependencies with fallback:** gutenbergpy (fallback: direct HTTP download).

---

## Security Domain

Security is minimal for Phase 1 (CLI-only, no network services, no user input beyond config).

| ASVS Category | Applies | Control |
|---------------|---------|---------|
| V2 Authentication | No | CLI tool, no auth |
| V3 Session Management | No | Stateless scripts |
| V4 Access Control | No | Local execution |
| V5 Input Validation | Yes (minimal) | Validate Gutenberg IDs, file paths, YAML params |
| V6 Cryptography | No | No secrets |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Ripser produces valid persistence diagrams from non-metric distance matrices | Q1 | Core approach fails; would need alternative weighting scheme |
| A2 | Setting diagonal entries to 0 in precomputed matrix is correct for "all words appear at time 0" | Q1 | Persistence diagrams may have unexpected vertex-weight effects |
| A3 | Gutenberg book IDs listed in Q2 are correct | Q2 | Wrong books downloaded; easy to verify and fix |
| A4 | 15,015 SVM fits (1000 permutations x 15 LOOCV folds) completes in minutes | Q6 | May need to reduce n_permutations or use simpler CV |
| A5 | PCA to 20 components is sufficient for 15 samples | Q7 | May need fewer components (5-10) |
| A6 | Pickle avoidance is the right call for intermediate formats | Q8 | Minor -- pickle would also work fine |

---

## Open Questions

1. **Window size 5 vs 10-15 for Word2Vec**
   - What we know: Small windows capture syntax, large windows capture topics/genre
   - What's unclear: Whether window=5 (D-10 default) captures enough genre signal
   - Recommendation: Start with default 5, but log and compare with 10 in run_history.log

2. **H0 vs H0+H1 for Phase 1**
   - What we know: H0 is fast and measures cluster structure; H1 measures loops and is slower
   - What's unclear: Whether H1 adds meaningful signal for genre classification
   - Recommendation: Include both H0 and H1 per HOM-02. If H1 slows computation unacceptably, drop it and note in the report.

3. **Exact PCA component count**
   - What we know: Must be < n_samples/3 = 5 for theoretical safety
   - What's unclear: Whether 5 components retains enough signal
   - Recommendation: Test [5, 10, 15, 20] and report. Use 20 as default in params.yaml.

---

## Sources

### Primary (HIGH confidence)
- [giotto-tda VietorisRipsPersistence docs](https://giotto-ai.github.io/gtda-docs/latest/modules/generated/homology/gtda.homology.VietorisRipsPersistence.html) -- precomputed distance matrix API, output format
- [giotto-tda WeightedRipsPersistence docs](https://giotto-ai.github.io/gtda-docs/latest/modules/generated/homology/gtda.homology.WeightedRipsPersistence.html) -- DTM weighting (NOT TF-IDF)
- [persim PersistenceImager docs](https://persim.scikit-tda.org/en/latest/reference/stubs/persim.PersistenceImager.html) -- fit/transform API, skew parameter
- [scikit-learn permutation_test_score](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.permutation_test_score.html) -- function signature, LOOCV compatibility
- [scikit-learn TfidfVectorizer](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html) -- per-doc TF, corpus-wide IDF
- [gensim Word2Vec docs](https://radimrehurek.com/gensim/models/word2vec.html) -- gensim 4.x API
- [gutenbergpy PyPI](https://pypi.org/project/gutenbergpy/) -- download API

### Secondary (MEDIUM confidence)
- [persim GitHub notebook](https://github.com/scikit-tda/persim/blob/master/docs/notebooks/Persistence%20images.ipynb) -- usage examples, skew parameter behavior
- [scikit-learn Pipeline docs](https://scikit-learn.org/stable/modules/generated/sklearn.pipeline.Pipeline.html) -- CV-safe PCA

### Tertiary (LOW confidence)
- Triangle inequality analysis: mathematical reasoning, not verified against published TDA literature

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified on PyPI with correct versions and Python 3.12 support
- Architecture: HIGH -- pattern is straightforward sequential pipeline with config-driven execution
- Pitfalls: HIGH -- drawn from verified docs and mathematical analysis
- Weighted filtration: MEDIUM -- approach is sound but non-metric distance matrix is non-standard

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable libraries, unlikely to change)
