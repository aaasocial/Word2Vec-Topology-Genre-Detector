# Coding Conventions

**Analysis Date:** 2026-04-11

## Status

No source files detected in the project root at time of analysis. The repository contains only the `.planning/` directory. Conventions below are recommendations to establish when development begins.

## Naming Patterns

**Files:**
- Not yet established — recommend `snake_case.py` for Python scripts (e.g., `train_model.py`, `genre_analyser.py`)

**Functions:**
- Not yet established — recommend `snake_case` per PEP 8 (e.g., `train_word2vec`, `get_genre_embedding`)

**Variables:**
- Not yet established — recommend `snake_case` for locals, `UPPER_SNAKE_CASE` for module-level constants

**Types/Classes:**
- Not yet established — recommend `PascalCase` for classes (e.g., `GenreAnalyser`, `Word2VecTrainer`)

## Code Style

**Formatting:**
- Not yet established — recommend `black` with default line length 88

**Linting:**
- Not yet established — recommend `flake8` or `ruff` for PEP 8 enforcement

## Import Organization

**Recommended order (PEP 8 / isort):**
1. Standard library (`os`, `sys`, `pathlib`, `logging`)
2. Third-party packages (`gensim`, `numpy`, `sklearn`, `nltk`)
3. Local modules

**Path Aliases:**
- Not applicable (Python project)

## Error Handling

**Patterns:**
- Not yet established — no source to analyze

## Logging

**Framework:** Not yet established — recommend standard `logging` module

**Patterns:**
- Not yet established

## Comments

**When to Comment:**
- Not yet established

**Docstrings:**
- Not yet established — recommend Google-style or NumPy-style docstrings for public functions

## Function Design

**Size:** Not yet established
**Parameters:** Not yet established
**Return Values:** Not yet established

## Module Design

**Exports:** Not yet established
**`__init__.py`:** Not yet established

---

*Convention analysis: 2026-04-11 — No source files present at analysis time*
