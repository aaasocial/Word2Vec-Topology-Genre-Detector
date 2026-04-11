<!-- GSD:project-start source:PROJECT.md -->
## Project

**Literary Genre Topology**

A hosted web application that makes the hidden geometric structure of literary genres visible and usable. Books are embedded in a shared word2vec space weighted by TF-IDF, forming genre-specific shapes that can be explored through interactive 3D visualizations and used to classify new books via kernel SVM. Ships with a bundled labeled corpus so it works immediately; users can also upload their own text files for classification and visualization.

**Core Value:** A user uploads any book and sees where it lives in semantic space — and why the algorithm predicts the genre it does.

### Constraints

- **Performance**: Vietoris-Rips complex construction is O(n²) to O(n³) in point count — TF-IDF filtering and configurable ε_max/word count limits are essential safety valves
- **Computation**: Word2Vec training and persistent homology run server-side; the browser handles visualization only
- **Dataset size**: SVM cross-validation on small corpora → leave-one-out CV is appropriate; results degrade with fewer than ~5 books per genre
- **Hosting**: Must be deployed and publicly accessible — architecture decisions must account for stateless serving vs. compute-intensive background jobs
- **Mathematical invariants**: Must preserve: (1) single shared embedding space, (2) persistent homology in full N-D not reduced space, (3) TF-IDF computed without genre labels, (4) both feature tracks normalized before concatenation
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- Not yet determined - project directory contains no source files
- Not applicable
## Runtime
- Not yet configured
- Not yet configured
- Lockfile: Not present
## Frameworks
- Not yet determined
- Not yet determined
- Not yet determined
## Key Dependencies
- None detected - no `requirements.txt`, `package.json`, `pyproject.toml`, `Cargo.toml`, or `go.mod` present
- None detected
## Configuration
- No `.env` file detected
- No config files detected
- No build config files detected
## Platform Requirements
- Not yet defined
- Not yet defined
## Notes
- **Python** as primary language (Word2Vec tooling is predominantly Python-based)
- **gensim** for Word2Vec model training/inference
- **scikit-learn** for ML utilities and clustering
- **numpy/pandas** for data manipulation
- **matplotlib/seaborn** for visualisation
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Status
## Naming Patterns
- Not yet established — recommend `snake_case.py` for Python scripts (e.g., `train_model.py`, `genre_analyser.py`)
- Not yet established — recommend `snake_case` per PEP 8 (e.g., `train_word2vec`, `get_genre_embedding`)
- Not yet established — recommend `snake_case` for locals, `UPPER_SNAKE_CASE` for module-level constants
- Not yet established — recommend `PascalCase` for classes (e.g., `GenreAnalyser`, `Word2VecTrainer`)
## Code Style
- Not yet established — recommend `black` with default line length 88
- Not yet established — recommend `flake8` or `ruff` for PEP 8 enforcement
## Import Organization
- Not applicable (Python project)
## Error Handling
- Not yet established — no source to analyze
## Logging
- Not yet established
## Comments
- Not yet established
- Not yet established — recommend Google-style or NumPy-style docstrings for public functions
## Function Design
## Module Design
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Repository created, no source code present
- Project name ("Word2Vec Genre Analyser") indicates a machine learning / NLP pipeline
- Intended domain: text vectorisation using Word2Vec embeddings to classify or cluster media genres
- No framework, entry point, or layer boundaries exist yet
## Layers
- Purpose: Load raw text corpora or metadata (song lyrics, book descriptions, film synopses, etc.)
- Location: `data/` or `src/data/` (not yet created)
- Contains: Loader scripts, dataset files
- Depends on: External data sources or local files
- Used by: Preprocessing layer
- Purpose: Clean and tokenise raw text for Word2Vec training
- Location: `src/preprocessing/` (not yet created)
- Contains: Tokenisers, stopword removal, normalisation utilities
- Depends on: Data ingestion layer
- Used by: Model training layer
- Purpose: Train or load Word2Vec model; produce genre embeddings
- Location: `src/model/` (not yet created)
- Contains: Word2Vec training config, embedding logic (likely using `gensim`)
- Depends on: Preprocessed token sequences
- Used by: Analysis / inference layer
- Purpose: Compare genre vectors, run similarity queries, cluster genres
- Location: `src/analysis/` (not yet created)
- Contains: Cosine similarity, clustering, genre comparison routines
- Depends on: Trained Word2Vec model
- Used by: Visualisation layer or CLI entry point
- Purpose: Plot embeddings (t-SNE, PCA), display similarity results
- Location: `src/visualisation/` (not yet created)
- Contains: Plotting scripts (likely `matplotlib`, `plotly`, or `seaborn`)
- Depends on: Analysis layer outputs
- Used by: End user / report outputs
## Data Flow
- No state management implemented yet
- Expected: trained model persisted to disk (`.model` file), intermediate processed data cached in `.tmp/` or `data/processed/`
## Key Abstractions
- Purpose: Represents a genre as a point in Word2Vec embedding space
- Examples: Not yet implemented
- Pattern: Aggregate word vectors for genre-associated text; centroid or mean pooling
- Purpose: Abstracts source of training text (file, API, database)
- Examples: Not yet implemented
- Pattern: Returns iterable of token sequences
- Purpose: Given a genre, find closest genres in embedding space
- Examples: Not yet implemented
- Pattern: Cosine similarity over model's vocabulary or genre centroids
## Entry Points
- Location: `main.py` or `src/main.py` (not yet created)
- Triggers: Direct Python execution (`python main.py`)
- Responsibilities: Parse arguments, orchestrate pipeline stages
- Location: `notebooks/` (not yet created)
- Triggers: Jupyter kernel execution
- Responsibilities: Exploratory analysis, visualisation
## Error Handling
- Not yet implemented
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
