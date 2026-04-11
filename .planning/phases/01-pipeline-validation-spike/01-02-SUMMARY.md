---
phase: 01
plan: 02
subsystem: embeddings
tags: [word2vec, tfidf, point-cloud, gensim, scikit-learn]
requires: [01-01]
provides: [word2vec-model, tfidf-vectorizer, per-book-point-clouds]
affects: [01-03]
tech-stack:
  added: [gensim==4.4.0, scikit-learn, joblib]
  patterns: [skip-gram-word2vec, tfidf-vocabulary-restriction, top-k-weighted-point-cloud]
key-files:
  created:
    - tests/test_embeddings.py
    - scripts/03_train_embeddings.py
  modified:
    - .planning/phases/01-pipeline-validation-spike/01-02-PLAN.md
    - .planning/STATE.md
decisions:
  - TfidfVectorizer vocabulary restricted to Word2Vec vocab via vocabulary= parameter to prevent OOV misalignment
  - Books chunked into 1000-token sentences for Word2Vec context window training
  - L2-normalized vectors via model.wv.get_vector(word, norm=True) for consistent cosine geometry
  - joblib used to persist fitted TfidfVectorizer for potential reuse in downstream scripts
metrics:
  duration: 10 min
  completed: 2026-04-12
  tasks: 2
  files: 2
---

# Phase 1 Plan 02: Word2Vec Training and TF-IDF Computation Summary

**One-liner:** Skip-gram Word2Vec (100D, workers=1, seed=42) trained on chunked corpus sentences; TF-IDF fitted corpus-wide with vocabulary locked to W2V vocab; top-500 words per book saved as L2-normalized point clouds.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 01-02-00 | Test stubs for embeddings | e9228b4 | tests/test_embeddings.py |
| 01-02-01 | Train Word2Vec and compute TF-IDF | e9228b4 | scripts/03_train_embeddings.py |

## What Was Built

**`tests/test_embeddings.py`** — 6 unit tests verifying:
- Word2Vec trains with correct vocab and vector shape
- Word2Vec is deterministic with workers=1 and seed=42
- TfidfVectorizer fits on all books without genre label leakage
- TF-IDF vocabulary is restricted to Word2Vec vocabulary
- Point cloud arrays have correct shapes
- All TF-IDF weights are strictly positive

**`scripts/03_train_embeddings.py`** — Full pipeline script:
- Loads all preprocessed JSON from `data/processed/`
- Chunks book tokens into 1000-word sentences for Word2Vec training
- Trains skip-gram Word2Vec with configurable params (CLI overrides supported)
- Saves model to `data/models/word2vec.model`
- Fits TfidfVectorizer on all books at once (no genre labels) with vocab restricted to W2V vocab
- Saves fitted vectorizer to `data/models/tfidf_vectorizer.joblib`
- Builds per-book point clouds: top-max_words words by TF-IDF, L2-normalized vectors
- Saves `data/features/vectors_{gid}.npy`, `data/features/tfidf_{gid}.npy`, `data/features/words_{gid}.json`

## Decisions Made

- **Vocabulary restriction**: `TfidfVectorizer(vocabulary=list(model.wv.key_to_index.keys()))` ensures every TF-IDF feature has a corresponding W2V vector — no silent OOV gaps downstream.
- **Sentence chunking**: Books split into 1000-token chunks rather than fed as single sequences, giving Word2Vec meaningful local context windows across long texts.
- **L2 normalization at retrieval**: `model.wv.get_vector(word, norm=True)` normalizes at lookup time, ensuring all point cloud vectors lie on the unit hypersphere for consistent cosine-based distances in subsequent homology computation.
- **norm=None in TF-IDF**: Vectorizer uses raw (unnormalized) TF-IDF scores so weights reflect true term salience; normalization happens at the vector level, not the weight level.

## Deviations from Plan

None — plan executed exactly as written. Gensim and scikit-learn were installed (not present in environment) as a Rule 3 auto-fix to unblock test execution.

## Verification Results

```
pytest tests/test_embeddings.py -x -q
......
6 passed in 1.50s
```

All 6 tests pass. No regressions in existing test suite.

## Known Stubs

None. Script is fully wired; it requires real data from `data/processed/` (produced by `02_preprocess.py`) to produce output artifacts. No placeholder values or hardcoded empty returns.

## Threat Flags

None. No new network endpoints, auth paths, or trust boundaries introduced. All file I/O stays within the `data/` directory hierarchy.

## Self-Check: PASSED

- tests/test_embeddings.py: FOUND
- scripts/03_train_embeddings.py: FOUND
- Commit e9228b4: FOUND (`git log --oneline` confirms)
