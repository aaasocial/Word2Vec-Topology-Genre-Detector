# Phase 1: Pipeline Validation Spike - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a CLI Python pipeline that proves persistent homology on TF-IDF-weighted word embeddings produces statistically significant genre separation. This is a go/no-go gate: if the permutation test passes (p < 0.05), the project proceeds to web infrastructure. If not, the project pivots before any web investment.

Delivers: downloadable mini-corpus, trained Word2Vec model, per-book persistence images, genre feature vectors, kernel SVM classifier with LOOCV, permutation test, runtime benchmarks, and a validation report. No web UI, no API, no frontend.

</domain>

<decisions>
## Implementation Decisions

### Corpus Curation
- **D-01:** Initial mini-corpus covers 3 high-contrast genres: Horror, Sci-Fi, Romance. Maximally different vocabularies — best for proving the signal exists. Genres expand in subsequent phases.
- **D-02:** 5 books per genre (15 books total). Leave-one-out CV on 5 books/genre gives enough folds for a meaningful permutation test while keeping compute fast.
- **D-03:** Select popular, well-known books of approximately 200k words each from Project Gutenberg. "Popular within the genre" means widely recognized classics (e.g., Dracula, Frankenstein, The War of the Worlds). Use full book text — do not truncate. The 200k-word target naturally bounds compute; the max_words cap handles the Vietoris-Rips step.
- **D-04:** All books must be public domain (Project Gutenberg). Genre labels are manually assigned by the developer at corpus curation time.

### CLI Structure
- **D-05:** Separate scripts per stage, not a single end-to-end script. Each stage reads its inputs from the previous stage's output files, so expensive stages (e.g., homology) can be rerun without repeating Word2Vec training.
  - `scripts/01_download_corpus.py` — fetch books from Project Gutenberg
  - `scripts/02_preprocess.py` — tokenize, remove stopwords, normalize
  - `scripts/03_train_embeddings.py` — train Word2Vec, compute TF-IDF
  - `scripts/04_compute_homology.py` — Vietoris-Rips per book → persistence diagrams
  - `scripts/05_build_features.py` — persistence images + cluster distribution → feature vectors
  - `scripts/06_validate.py` — SVM + LOOCV + permutation test → validation report
  - `scripts/benchmark.py` — standalone benchmark of homology computation vs. word count

### Output and Verbosity
- **D-06:** Verbose step-by-step logging throughout. Each script prints its progress at each sub-step with timing: `"Training Word2Vec... done (12.3s)"`, `"Book 3/15 (Dracula): computing homology... done (4.7s)"`. Makes debugging easy and shows exactly where time is spent.
- **D-07:** `scripts/06_validate.py` prints a full summary table at the end plus a clear GO/NO-GO verdict line:
  ```
  ── Validation Results ──────────────────────────────
  Genre         Accuracy   N
  Horror        80.0%      5
  Sci-Fi        80.0%      5
  Romance       60.0%      5
  Overall       73.3%      15
  
  Permutation test (1000 shuffles): p = 0.018
  
  ✓ GO — Topology distinguishes genres (p < 0.05)
  ──────────────────────────────────────────────────
  ```
  Or, if it fails:
  ```
  ✗ NO-GO — Topology signal not detected (p = 0.214). Pivot before building web UI.
  ```
- **D-08:** Validation results are saved to `results/validation_report.txt` automatically after each run (overwritten). Per-run logs are appended to `results/run_history.log` with timestamps so parameter experiments can be compared.

### Parameter Configuration
- **D-09:** Parameters controlled via `config/params.yaml` (defaults) with CLI flag overrides for any individual parameter. Example: `python scripts/04_compute_homology.py --max-words 400` overrides just that one value while using all other defaults from params.yaml.
- **D-10:** `params.yaml` contains all adjustable parameters with defaults:
  - `max_words: 500` — words per book for Vietoris-Rips
  - `word2vec_dim: 100`
  - `word2vec_window: 5`
  - `grid_resolution: 20` — persistence image M×M grid
  - `sigma: 0.5` — Gaussian kernel bandwidth
  - `k_clusters: 50`
  - `alpha: 0.5` — feature weighting
  - `svm_gamma: "scale"`
  - `svm_C: 1.0`
  - `epsilon_max: 1.0`
  - `permutation_n: 1000`
  - Corpus: list of books per genre with Gutenberg IDs

### Failure Handling
- **D-11:** If Vietoris-Rips computation for a book exceeds the time cap (default: 10 seconds), auto-reduce `max_words` in steps of 100 and retry. Log the reduction: `"Book 5 timed out at 500 words — retrying at 400 words"`. Continue until the book succeeds or `max_words` reaches 100 (then skip and warn). This keeps the pipeline running without requiring manual intervention.
- **D-12:** If a genre has fewer books than expected (download fails, text too short), warn and continue: `"Genre Horror: only 3 books available (expected 5) — results may be less reliable"`. Do not abort the run. A note about reduced confidence is included in the validation report.
- **D-13:** Minimum word count per book for inclusion: 10,000 unique words after stopword removal. Books below this threshold are skipped with a warning: `"Skipping [title]: only 3,200 unique words after filtering (minimum 10,000)"`.

### Claude's Discretion
- Exact Project Gutenberg download method (gutenberg Python library vs. direct HTTP)
- Intermediate file formats (pickle, numpy .npy, or JSON for cached pipeline outputs)
- Exact stopword list (NLTK English stopwords is standard)
- PCA dimensionality reduction target before SVM (20-50D — determine empirically in validation)
- Whether to include H₁ only or also H₀ in Phase 1 (H₀ is fastest; confirm H₁ adds signal)
- Exact permutation test implementation (sklearn permutation_test_score or manual)

</decisions>

<specifics>
## Specific Ideas

- Books should be well-known classics within each genre — e.g., for Horror: Dracula (Stoker), The Picture of Dorian Gray (Wilde), Frankenstein (Shelley); for Sci-Fi: The War of the Worlds (Wells), Twenty Thousand Leagues (Verne), The Time Machine (Wells); for Romance: Pride and Prejudice (Austen), Jane Eyre (Brontë), Sense and Sensibility (Austen). These are all ~200k words and on Gutenberg.
- The 6-script pipeline design makes it easy to add the remaining corpus books and genres later (Phase 2+) without changing the architecture — just rerun from stage 01 with more books.
- `results/run_history.log` acts as a parameter experiment log, capturing what was tried and what accuracy resulted.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project requirements and constraints
- `.planning/REQUIREMENTS.md` — Phase 1 requirements: VALID-01 to VALID-03, PIPE-01 to PIPE-05, HOM-01 to HOM-08, CORPUS-01, CORPUS-03, CORPUS-04
- `.planning/PROJECT.md` — Core mathematical invariants (single shared embedding space, homology in full N-D, TF-IDF without genre labels)
- `.planning/research/SUMMARY.md` — Critical warnings: weighted filtration custom implementation, overfitting risk, word count cap

### Technical research
- `.planning/research/STACK.md` — Stack recommendations with versions: giotto-tda 0.6.2, gensim 4.4.0, persim 0.3.8, scikit-learn 1.8.x
- `.planning/research/PITFALLS.md` — Weighted Vietoris-Rips is NOT a library feature (must use custom distance matrix `d(i,j)/(w_i+w_j)`); PCA to 20-50D before SVM is mandatory; permutation testing required

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet — greenfield project

### Established Patterns
- None yet — this is Phase 1

### Integration Points
- The intermediate outputs of each script (Word2Vec model, TF-IDF weights, persistence diagrams, feature vectors) become the inputs to Phase 2's API layer. File formats chosen here must be re-readable by the FastAPI backend without re-running the full pipeline.

</code_context>

<deferred>
## Deferred Ideas

- Web UI, API endpoints, React frontend — Phase 3+
- Animated Vietoris-Rips visualization — Phase 4
- User book upload — Phase 2-3
- Full 50-100 book corpus across 5-8 genres — phases after validation confirms the signal

</deferred>

---

*Phase: 01-pipeline-validation-spike*
*Context gathered: 2026-04-11*
