# Testing Patterns

**Analysis Date:** 2026-04-11

## Status

No source files detected in the project root at time of analysis. The repository contains only the `.planning/` directory. Testing patterns below are recommendations to establish when development begins.

## Test Framework

**Runner:**
- Not yet established — recommend `pytest` (standard for Python ML/NLP projects)
- Config: `pytest.ini` or `pyproject.toml [tool.pytest]` (not yet present)

**Assertion Library:**
- Not yet established — recommend `pytest` built-in assertions with `numpy.testing` for array comparisons

**Run Commands:**
```bash
pytest                        # Run all tests
pytest --watch                # Watch mode (via pytest-watch)
pytest --cov=src --cov-report=html   # Coverage report
```

## Test File Organization

**Location:**
- Not yet established — recommend a top-level `tests/` directory separate from source

**Naming:**
- Not yet established — recommend `test_<module_name>.py` (e.g., `test_train_model.py`, `test_genre_analyser.py`)

**Structure:**
```
tests/
├── unit/           # Fast, isolated tests per module
├── integration/    # Tests combining multiple components
└── conftest.py     # Shared fixtures
```

## Test Structure

**Suite Organization:**
```python
# Recommended pattern — not yet present in codebase
import pytest

class TestGenreAnalyser:
    def test_embedding_shape(self, model_fixture):
        result = model_fixture.get_embedding("rock")
        assert result.shape == (100,)

    def test_similar_genres_returns_list(self, model_fixture):
        result = model_fixture.similar_genres("jazz")
        assert isinstance(result, list)
        assert len(result) > 0
```

**Patterns:**
- Setup pattern: Not yet established — recommend `pytest` fixtures via `conftest.py`
- Teardown pattern: Not yet established — recommend `yield` fixtures for cleanup
- Assertion pattern: Not yet established — recommend plain `assert` with `numpy.testing.assert_array_almost_equal` for vectors

## Mocking

**Framework:** Not yet established — recommend `unittest.mock` (stdlib) or `pytest-mock`

**Patterns:**
```python
# Recommended pattern — not yet present in codebase
from unittest.mock import patch, MagicMock

def test_loads_corpus(tmp_path):
    with patch("module.load_corpus") as mock_load:
        mock_load.return_value = [["word1", "word2"]]
        result = train_model(corpus_path=tmp_path)
        mock_load.assert_called_once()
```

**What to Mock:**
- File I/O (corpus loading, model saving)
- External API calls if any
- Heavy model training (replace with pre-trained fixture)

**What NOT to Mock:**
- Core vector math logic
- Genre similarity computation
- Tokenization/preprocessing pipeline (test with real small inputs)

## Fixtures and Factories

**Test Data:**
```python
# Recommended pattern — not yet present in codebase
@pytest.fixture(scope="session")
def small_corpus():
    return [
        ["rock", "guitar", "drums", "electric"],
        ["jazz", "saxophone", "improvisation", "swing"],
    ]

@pytest.fixture(scope="session")
def trained_model(small_corpus):
    from gensim.models import Word2Vec
    return Word2Vec(small_corpus, vector_size=10, min_count=1, epochs=5)
```

**Location:**
- Not yet established — recommend `tests/conftest.py` for shared fixtures, `tests/fixtures/` for static data files

## Coverage

**Requirements:** Not yet established — recommend 80% minimum for core logic modules

**View Coverage:**
```bash
pytest --cov=src --cov-report=term-missing
```

## Test Types

**Unit Tests:**
- Not yet established — should cover individual functions (tokenizer, embedding lookup, similarity score)

**Integration Tests:**
- Not yet established — should cover full pipeline: corpus load → train → query genre

**E2E Tests:**
- Not yet established — may not be applicable depending on final interface (CLI vs. API vs. notebook)

## Common Patterns

**Async Testing:**
```python
# Not applicable unless async IO is used
```

**Error Testing:**
```python
# Recommended pattern — not yet present in codebase
def test_unknown_genre_raises():
    analyser = GenreAnalyser(model)
    with pytest.raises(KeyError, match="unknown_genre"):
        analyser.get_embedding("unknown_genre")
```

---

*Testing analysis: 2026-04-11 — No source files present at analysis time*
