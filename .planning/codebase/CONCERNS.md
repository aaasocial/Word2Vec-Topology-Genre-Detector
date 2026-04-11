# Codebase Concerns

**Analysis Date:** 2026-04-11

## Project State

The project directory is empty. No source files, dependencies, configuration, or tooling have been
created yet. All concerns below are pre-implementation observations and setup risks rather than
findings from existing code.

---

## Tech Debt

**No project scaffolding present:**
- Issue: No `requirements.txt`, `pyproject.toml`, `setup.py`, or equivalent dependency manifest exists.
- Files: project root (none present)
- Impact: Reproducibility is impossible — any future contributor has no record of which packages
  or versions are required.
- Fix approach: Create `requirements.txt` or `pyproject.toml` with pinned versions before writing
  any source code. Consider `pip-tools` or `poetry` for dependency locking.

**No virtual environment / isolation:**
- Issue: No `venv/`, `.python-version`, or `conda` environment file detected.
- Files: project root (none present)
- Impact: Library version conflicts with system Python; installs bleed across projects.
- Fix approach: Initialise a virtual environment (`python -m venv .venv`) and commit
  `.python-version` (e.g. via `pyenv`) to lock the interpreter version.

**No source structure:**
- Issue: No `src/` or package directory exists.
- Files: project root (none present)
- Impact: All future scripts will likely land flat at root, making imports and testing messy at
  scale.
- Fix approach: Establish a package layout (`src/word2vec_genre/`) before writing any modules.

---

## Known Bugs

No source files exist, so no bugs have been identified yet.

---

## Security Considerations

**No `.gitignore` present:**
- Risk: Any `.env` files, API keys, model weights, or large binary datasets committed accidentally
  will be permanently in git history.
- Files: project root (none present)
- Current mitigation: None.
- Recommendations: Create a `.gitignore` immediately covering `.env`, `*.pkl`, `*.bin`, `*.model`,
  `__pycache__/`, `.venv/`, and any dataset directories before the first real commit.

**No `.env` pattern established:**
- Risk: If any external APIs (e.g. Spotify, Genius, MusicBrainz) are used to obtain genre/lyrics
  data, credentials may be hard-coded in scripts.
- Files: project root (none present)
- Current mitigation: None.
- Recommendations: Add `python-dotenv` to dependencies and enforce loading secrets from `.env`
  only, never from source files.

---

## Performance Bottlenecks

**Word2Vec training is memory- and CPU-intensive:**
- Problem: Training a Word2Vec model on large corpora (e.g. lyrics datasets, book descriptions)
  can require several GB of RAM and significant CPU time.
- Files: not yet created
- Cause: `gensim` Word2Vec loads the full corpus into memory during vocabulary building; large
  vector dimensionality multiplies memory usage.
- Improvement path: Use `gensim.models.word2vec.LineSentence` for streaming corpus ingestion;
  limit `vector_size` and `min_count` during prototyping; consider incremental training
  (`model.build_vocab` + `model.train` in chunks).

**No caching layer for trained models:**
- Problem: Re-training the model on every run is slow and wasteful.
- Files: not yet created
- Cause: Without save/load logic the model is discarded after each session.
- Improvement path: Use `model.save()` / `Word2Vec.load()` from `gensim` to persist trained
  weights; only retrain when the corpus changes.

---

## Fragile Areas

**Genre label quality is inherently noisy:**
- Files: not yet created
- Why fragile: Genre tags from user-generated sources (Last.fm, MusicBrainz, Spotify) are
  inconsistent, duplicated, and culturally biased. Downstream similarity results are only as good
  as the input labels.
- Safe modification: Introduce a label normalisation / deduplication step early in the pipeline
  and treat it as a stable interface so downstream code does not depend on raw tag strings.
- Test coverage: None yet — this normalisation step needs unit tests covering edge cases
  (empty tags, unicode, mixed case).

**Word2Vec similarity is not a ground truth:**
- Files: not yet created
- Why fragile: Cosine similarity between genre vectors can produce unintuitive results if the
  training corpus is small or unbalanced. Results are not deterministic across random seeds.
- Safe modification: Fix the `seed` parameter in `Word2Vec(seed=N, workers=1)` to make training
  reproducible; document the corpus size and composition.
- Test coverage: Need at least smoke tests asserting known-similar genres rank above known-dissimilar
  ones.

---

## Scaling Limits

**Single-machine training:**
- Current capacity: Not yet established.
- Limit: `gensim` Word2Vec is single-node; very large corpora (millions of documents) will
  exhaust RAM before training completes.
- Scaling path: For large corpora, consider `fastText` (memory-efficient, supports subword
  features) or a distributed option such as Spark MLlib Word2Vec.

---

## Dependencies at Risk

**gensim:**
- Risk: `gensim` has historically had breaking API changes between major versions (3.x → 4.x
  removed `most_similar` shortcuts, changed model serialisation format).
- Impact: Scripts written against gensim 3.x will not work with gensim 4.x without changes.
- Migration plan: Pin to a specific major version in `requirements.txt`; read the gensim 4.x
  migration guide before starting; prefer `model.wv.most_similar()` over deprecated top-level
  accessors.

**Python version compatibility:**
- Risk: No Python version is pinned; `gensim` 4.x requires Python 3.8+, and some numpy/scipy
  builds have narrow compatibility windows.
- Impact: Silent numerical differences or import failures on mismatched interpreters.
- Migration plan: Pin interpreter version via `.python-version` and specify `python_requires`
  in `pyproject.toml`.

---

## Missing Critical Features

**No data acquisition pipeline:**
- Problem: There is no script or workflow to fetch, clean, or prepare a genre-labelled text
  corpus for training.
- Blocks: Cannot train any model without corpus data.

**No evaluation harness:**
- Problem: No mechanism exists to measure whether the trained genre embeddings are actually useful
  (e.g. genre analogy tasks, cluster visualisation, downstream classifier accuracy).
- Blocks: Cannot determine whether changes to the model improve or degrade quality.

**No CLI or API interface:**
- Problem: No entry point exists for querying genre similarity.
- Blocks: Cannot use the analyser without reading source code.

---

## Test Coverage Gaps

**No tests exist:**
- What's not tested: Everything — data loading, preprocessing, model training, similarity queries,
  label normalisation.
- Files: project root (none present)
- Risk: Any code written without tests will be difficult to refactor safely.
- Priority: High — establish a `tests/` directory and at least one smoke test before writing
  production logic.

---

*Concerns audit: 2026-04-11*
