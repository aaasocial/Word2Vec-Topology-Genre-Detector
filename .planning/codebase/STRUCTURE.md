# Codebase Structure

**Analysis Date:** 2026-04-11

## Current State

The repository is empty. Only the `.planning/` directory exists. No source files, configuration files, or data files have been committed. The structure below documents what exists now and the recommended layout to create.

## Current Directory Layout

```
Word2Vec Genre Analyser/
└── .planning/
    └── codebase/       # GSD planning documents
```

## Recommended Directory Layout

Based on the project domain (Word2Vec NLP pipeline for genre analysis), the following structure is recommended:

```
Word2Vec Genre Analyser/
├── data/
│   ├── raw/            # Original unmodified datasets (lyrics, descriptions, etc.)
│   └── processed/      # Cleaned, tokenised data ready for training
├── models/             # Saved Word2Vec model files (.model, .bin)
├── notebooks/          # Jupyter notebooks for exploration and visualisation
├── src/
│   ├── data_loader.py  # Load and validate raw data sources
│   ├── preprocessing.py # Tokenise, clean, normalise text
│   ├── train.py        # Train Word2Vec model using gensim
│   ├── analysis.py     # Genre similarity, clustering, query logic
│   └── visualise.py    # Plot embeddings, similarity heatmaps
├── .tmp/               # Temporary intermediate files (disposable)
├── .planning/
│   └── codebase/       # GSD architecture documents
├── main.py             # CLI entry point orchestrating the pipeline
├── requirements.txt    # Python dependencies
├── .env                # API keys / config (gitignored)
└── .gitignore
```

## Directory Purposes

**.planning/codebase/:**
- Purpose: GSD planning documents (architecture, stack, conventions, concerns)
- Contains: ARCHITECTURE.md, STRUCTURE.md, and other GSD analysis files
- Key files: `ARCHITECTURE.md`, `STRUCTURE.md`

**data/raw/ (to be created):**
- Purpose: Immutable source data — never modified after download
- Contains: CSV, JSON, or text files of genre-labelled text corpora

**data/processed/ (to be created):**
- Purpose: Preprocessed token sequences ready for Word2Vec input
- Contains: Serialised token lists (pickle, JSON, or plain text)

**models/ (to be created):**
- Purpose: Persisted trained Word2Vec models
- Contains: `.model` files (gensim format), vocabulary files
- Generated: Yes (output of `src/train.py`)
- Committed: No — large binary files; add to `.gitignore`

**notebooks/ (to be created):**
- Purpose: Exploratory analysis and interactive visualisation
- Contains: `.ipynb` Jupyter notebooks

**src/ (to be created):**
- Purpose: Core pipeline source code
- Contains: Python modules for each pipeline stage
- Key files: `data_loader.py`, `preprocessing.py`, `train.py`, `analysis.py`, `visualise.py`

**.tmp/ (to be created):**
- Purpose: Disposable intermediate files generated during processing runs
- Contains: Temporary exports, partial results
- Generated: Yes
- Committed: No — add to `.gitignore`

## Key File Locations

**Entry Points:**
- `main.py`: Top-level CLI entry point (to be created)
- `notebooks/explore.ipynb`: Interactive exploration notebook (to be created)

**Configuration:**
- `requirements.txt`: Python package dependencies (to be created)
- `.env`: Environment variables and API keys (to be created, gitignored)

**Core Logic:**
- `src/preprocessing.py`: Text cleaning and tokenisation
- `src/train.py`: Word2Vec model training via gensim
- `src/analysis.py`: Genre similarity and clustering
- `src/visualise.py`: Embedding visualisation

**Testing:**
- `tests/` (to be created if tests are added)

## Naming Conventions

No files exist yet. Recommended conventions:

**Files:**
- Snake case for Python modules: `data_loader.py`, `preprocessing.py`
- Descriptive noun or verb-noun: `train.py`, `analysis.py`, `visualise.py`

**Directories:**
- Lowercase, plural for collections: `data/`, `models/`, `notebooks/`
- Lowercase, singular for source code: `src/`

**Functions:**
- Snake case: `load_corpus()`, `train_model()`, `get_genre_vector()`

**Variables:**
- Snake case: `genre_vector`, `word2vec_model`, `token_sequences`

**Classes:**
- PascalCase if used: `GenreAnalyser`, `CorpusLoader`

## Where to Add New Code

**New pipeline stage:**
- Primary code: `src/[stage_name].py`
- Called from: `main.py`

**New analysis method:**
- Implementation: `src/analysis.py`

**New visualisation:**
- Implementation: `src/visualise.py`

**New notebook:**
- Implementation: `notebooks/[descriptive_name].ipynb`

**Utilities (shared helpers):**
- Shared helpers: `src/utils.py` (create when reuse is needed across modules)

## Special Directories

**.planning/:**
- Purpose: GSD framework planning and architecture documents
- Generated: No (manually maintained)
- Committed: Yes

**.tmp/:**
- Purpose: Temporary processing artifacts
- Generated: Yes (runtime output)
- Committed: No

**models/:**
- Purpose: Trained model binaries
- Generated: Yes (training output)
- Committed: No (too large; use versioned storage if needed)

---

*Structure analysis: 2026-04-11 — repository is pre-implementation; structure documents current empty state and recommended layout.*
