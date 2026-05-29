# Literary Genre Topology — Technical Reference

*Companion to [OVERVIEW.md](OVERVIEW.md). Last updated 2026-05-30 (v2.0).*
*Values below are taken from `config/params.yaml`, the shipped model lineage (`data/models/svm_pipeline.joblib.lineage.json`), and `results/v2_validation_report.md`.*

---

## 1. The core idea

A book's vocabulary, embedded in a shared Word2Vec space and weighted by TF-IDF, forms a **weighted point cloud**. Genre is encoded by two complementary properties of that cloud:

- **Shape** — captured by **persistent homology** (the loops/holes that survive across scales). Location-invariant: it describes structure regardless of where the cloud sits.
- **Location** — captured by a **k-means word-cluster distribution** (where the book's weight falls across the shared vocabulary).

Each is turned into a fixed-length vector, the two are individually L2-normalized, concatenated with a weight α, and classified by a kernel SVM.

> `feature = (α · structure_vec) ⊕ ((1 − α) · location_vec)`, each half L2-normalized first.

---

## 2. Mathematical background, stage by stage

### 2.1 Word embedding (Word2Vec, skip-gram)
A single skip-gram Word2Vec model is trained on the **entire corpus** (all genres combined) → one **150-dimensional** vector per unique word in a shared space. Training is single-threaded with a fixed seed for determinism. The space has no privileged coordinate system — all semantic information is in *relative* geometry (cosine/angles/distances), which is why 3-D projections are display-only.

### 2.2 TF-IDF weighting
Per-book TF-IDF weights are computed with **corpus-level IDF** (`log(total_books / books_containing_word)`), **without genre labels** (no circular dependency). Heavy weight = book-distinctive word; light = corpus-generic.

### 2.3 Weighted point cloud
For each book, take its words' shared embedding positions `v_i` and TF-IDF weights `w_i ∈ [0,1]` → a weighted point cloud. A per-book **max-words cap (500, hard max 1000)** bounds the combinatorial cost of the next step.

### 2.4 Persistent homology (weighted Vietoris–Rips)
The filtration uses a **TF-IDF-weighted distance**:

> `D(i,j) = ‖v_i − v_j‖ / (w_i + w_j)`

so heavily-weighted (genre-distinctive) words effectively sit "closer" and dominate the topology. As the filtration radius **ε** grows from 0 → `epsilon_max = 10`, edges appear (`ε ≥ D(i,j)`), loops are born, and loops die when filled by triangles. The result is the **H₁ persistence diagram** — a set of (birth, death) pairs, one per loop.

- **H₁ only.** H₀ is dropped (degenerate under weighted VR — every component is born at filtration time 0); H₂ is deferred to v3 (sparse high-D clouds rarely contain voids; O(n⁴) cost isn't justified).
- A loop **far above** the diagonal (long-lived) is real structure; a loop **hugging** the diagonal is noise.

### 2.5 Persistence image (the "structure" / topology vector)
The diagram is vectorized into a fixed-length **persistence image**:
1. Rotate (birth, death) → **(birth, persistence)** where persistence = death − birth (the 45° rotation).
2. Place a **Gaussian kernel** (bandwidth **σ = 0.5**, in filtration-radius units) at each point, weighted by persistence.
3. Discretize onto a **20 × 20 grid → 400-D** vector (independent resolution per axis).

### 2.6 K-means cluster distribution (the "location" / vocabulary vector)
All word vectors in the shared space are clustered **once** into **K = 200** semantic regions via k-means. For each book, sum the TF-IDF weight of its words falling into each cluster → a **200-D** distribution vector. (This is the "vocabulary/where-it-sits" track.)

### 2.7 Blend + normalize
Each track is **L2-normalized independently**, then concatenated with the topology weight **α = 0.7**:

> `feature = [ 0.7 · (400-D persistence image) | 0.3 · (200-D cluster distribution) ]` → **600-D**

### 2.8 Classifier (kernel SVM + calibration)
The shipped pipeline:

```
StandardScaler → VarianceThreshold(1e-4) → SVC(kernel='rbf', C=10, gamma='scale', class_weight='balanced')
                                          → Platt calibration (predict_proba)
```

- RBF kernel; relies on support vectors near the boundary (robust on small data).
- `class_weight='balanced'` compensates for 15–25 books/genre.
- **Calibration:** `libsvm_platt` (SVC(probability=True) internal Platt 5-fold), chosen empirically over `CalibratedClassifierCV(sigmoid, LOOCV)` by lower Brier score → `predict_proba` sums to 1 and is meaningful.

### 2.9 Evaluation methodology
- **Leave-One-Out CV** (LOOCV) for the small corpus.
- **GroupKFold(groups=author)** to detect author leakage (held-out-author generalization).
- **Permutation test** (1000 shuffles) for a significance p-value.
- Headline metric: **macro-F1** on a **frozen 20-book hold-out** (pinned from v1 for cross-version comparability).

---

## 3. Processes / pipeline

### 3.1 Build-time pipeline (offline, scripts)
| Step | Script | Output |
|---|---|---|
| 1 | `01_download_corpus.py` | raw `.txt` from Project Gutenberg per `corpus/books.yaml` |
| 2 | `02_preprocess.py` | tokenized, lowercased, stopword-filtered token streams |
| 3 | `03_train_embeddings.py` | `word2vec_w15.model` (+ TF-IDF vectorizer) |
| 4 | `04_compute_homology.py` | per-book H₁ persistence diagrams (weighted VR) |
| 5 | `05_build_features.py` | persistence images + k-means cluster dist → `feature_matrix_w15_k200.npy` (600-D) |
| 6 | `06_validate.py` | LOOCV / GroupKFold / permutation metrics, `svm_pipeline.joblib` |
| (sweep) | `07_sweep.py` | hyperparameter grid → `sweep_results.csv` |

### 3.2 Backend precompute (cached artifacts the API serves)
- `precompute.py` — features + SVM (~10 min)
- `precompute_viz.py` — PCA/KPCA/UMAP/t-SNE scatter + per-genre persistence images & diagrams (~10 min; t-SNE dominates)
- `precompute_vr.py` — VR edges per projection per genre (~30 s)
- `precompute_explain.py` — `explain_artifacts.npz` (per-genre w2v centroids, training feature matrix, 5-NN index, calibrated training probabilities, frozen vocabulary)

### 3.3 Runtime — classify a book
Upload `.txt` → arq/Redis background job runs the full pipeline (tokenize → TF-IDF → point cloud → homology → features → classify) streamed over **SSE** → returns top-N calibrated probabilities + the book's position in the scatter. The feature vector is cached to Redis (`feature_vec:{job_id}`, 5-min TTL) for the explain step.

### 3.4 Runtime — "why this genre?" (explainability)
`POST /api/classify/{job_id}/explain` (≈15 ms p50, Redis-cached 1 h):
- **Nearest training books** — 5 nearest on L2-normalized features, Euclidean distance.
- **Per-track contribution** — zero-ablation: re-predict with the topology track zeroed, then the vocabulary track zeroed → topology% vs vocabulary% (per-prediction, distinct from the global α).
- **Driving words** — TF-IDF terms attributed via per-genre w2v centroid alignment ("proxies, not literal classifier inputs").
- **Uncertainty badge** — fires when top-1/top-2 gap < 0.2801 OR normalized entropy > 0.7738.

---

## 4. Parameter / variable reference (shipped values)

### Word2Vec
| Param | Value | Note |
|---|---|---|
| `vector_size` | **150** | embedding dimension |
| `window` | **15** | context window (sweep: 5/10/15/20) |
| `min_count` | **2** | min word frequency |
| `sg` | **1** | skip-gram |
| `epochs` | **10** | |
| `workers` / `seed` | **1 / 42** | deterministic |

### Corpus
| Param | Value |
|---|---|
| `min_unique_words` | **3000** per book |
| shipped corpus | **154 verified-clean books, 8 genres** (151 labeled rows used in training; 15–25 books/genre) |
| genres | adventure · gothic_horror · historical · literary · mystery · romance · speculative · western |
| max words / book (VR cap) | **500** (hard max 1000) |

### Homology
| Param | Value |
|---|---|
| `epsilon_max` | **10.0** |
| `homology_dimensions` | **[1]** (H₁ only) |
| distance metric | `‖v_i − v_j‖ / (w_i + w_j)` |

### Features
| Param | Value |
|---|---|
| persistence-image grid | **20 × 20 = 400-D** |
| `sigma` | **0.5** |
| `k_clusters` | **200** → 200-D location vector (sweep: 20…100) |
| `alpha` | **0.7** (70% topology / 30% vocabulary; sweep: 0.1…0.9) |
| normalization | **L2 per track** before concat |
| **feature vector** | **600-D = 400 (structure) + 200 (location)** |

### Classifier
| Param | Value |
|---|---|
| `svm_kernel` | **rbf** |
| `svm_C` | **10** (sweep: 1/10/100) |
| `svm_gamma` | **scale** |
| `svm_class_weight` | **balanced** |
| `calibration_method` | **libsvm_platt** (Brier 0.0481) |
| `permutation_n` | **1000** |

---

## 5. Results & metrics

### Shipped v2 classifier (frozen 20-book hold-out)
| Metric | v1 baseline | v2 | Verdict |
|---|---|---|---|
| Macro-F1 (hold-out) | 0.3235 | **0.7367** | +41 pp, permutation p = 0.0010 → **validated (with disclaimer)** |
| GroupKFold-by-author mean macro-F1 | — | **0.2865** | 45 pp gap vs hold-out → **author leakage (BLOCKED, v2.1 follow-up)** |
| Calibration Brier | — | **0.0481** | libsvm Platt |
| Explain latency | — | **~15 ms p50** (1 ms cache hit) | < 200 ms target |

### α-weighting analysis (internal finding, 2026-05-30)
LOOCV over the full 151-book corpus, all else fixed (window=15, k=200, C=10):

| α | blend | LOOCV accuracy | macro-F1 |
|---|---|---|---|
| 0.0 | vocabulary-only | **0.7682** | 0.7653 |
| 0.7 | 70/30 (shipped) | 0.6887 | 0.6870 |
| 1.0 | topology-only | 0.2053 | 0.1292 |

**Interpretation:** on the v2 corpus the **vocabulary/cluster track carries almost all the genre signal**; the **topology track alone is near the 1/8 chance floor**; and the shipped α=0.7 actually *underperforms* pure vocabulary by ~8 pp (heavy topology weight dilutes the strong vocabulary signal). The α=0.7 default was tuned in Phase 1 on the *old* v1 corpus and is **miscalibrated for v2** — a much lower α would score better by this measure.
*Caveat:* this is LOOCV accuracy on the full corpus, a different evaluation from the headline 20-book hold-out macro-F1 (0.7367); the relative α comparison is apples-to-apples, the absolute numbers are not comparable to 0.7367. A proper α re-sweep on the hold-out macro-F1 protocol is the rigorous way to retune.

---

## 6. Architecture

- **Frontend:** React 18 + TypeScript + Vite; 3-D via react-three-fiber (Three.js); state via Zustand; server cache via React Query (`staleTime: Infinity` on precomputed data). Current UI = **"The Reading Room"** editorial redesign (Phase 12). Stateless; visualizes precomputed data and streams classify progress over SSE.
- **Backend:** FastAPI; **arq + Redis** background worker for the heavy pipeline; content-addressed cache: `sha256(step_name, params, corpus_hash, w2v_model_sha256)` → result. SSE (not WebSocket — Railway edge dropped WS frames).
- **Deploy:** Dockerized, Railway, public/no-login; model assets shipped via a versioned GitHub Release; `data/models/` via git-LFS.

---

## 7. Mathematical invariants (non-negotiable)
1. **Single shared Word2Vec space** — identical word coordinates across all books (comparability).
2. **Persistent homology in full N-D**, never on the 3-D projection (the 3-D view is a lossy display).
3. **TF-IDF without genre labels** — corpus-level IDF, no circular dependency.
4. **Both tracks L2-normalized before the α-weighted concatenation** — neither dominates by scale.

---

## 8. Known limitations / open questions
- **Author leakage (CEXP-04, BLOCKED):** the model generalizes poorly to unseen authors (per-author held-out gap ≈ 45 pp). The hold-out macro-F1 is an *upper bound*, not expected author-out-of-sample performance — disclosed in-app. v2.1 candidates: per-author caps in corpus design, or per-author fine-tuning.
- **Topology track weak / α miscalibrated (§5):** topology alone is near chance and α=0.7 underperforms vocabulary-only on v2; α needs a v2-specific re-sweep.
- **Per-book persistence not fully cached:** per-genre persistence is precomputed for all 8 regions; per-book persistence isn't cached for every corpus book (the Topology tab is intentionally region-keyed as a result).
- **Corpus size:** 154 books across 8 genres; quality degrades below ~5 books/genre. 86 books were dropped during Phase 8.1 integrity rebuild (re-sourcing is a candidate for corpus growth).

---

## 9. Provenance (shipped model lineage)
```
window               = 15
k_clusters           = 200
alpha                = 0.7
feature_normalization= { structure: L2, location: L2 }
calibration_method   = libsvm_platt
calibration_brier    = 0.04812763753149701
corpus_hash          = 3f4fe9400b023f0847bc6975da4f3793fdd3b4db4dfc44979d43cc9b75a869d9
w2v_model_sha256     = cd81f9e69cb2d12799c62b5d06a03870e511ff35b044d5301d78f6f75cde5b1a
created_by           = Plan 09-01 (DEPTH-01 D-40), 2026-05-26
```
The corpus hash + W2V SHA gate every cached artifact, so a corpus change or model retrain forces a clean cache miss (no stale-cache footgun).
