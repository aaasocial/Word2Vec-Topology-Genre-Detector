import pytest
import numpy as np
import tempfile
from pathlib import Path


@pytest.fixture
def synthetic_book_tokens():
    """3 synthetic books (one per genre) with 100 words each."""
    rng = np.random.RandomState(42)
    vocab = [f"word{i}" for i in range(500)]
    books = []
    for _ in range(3):
        tokens = [vocab[i] for i in rng.randint(0, 500, 100)]
        books.append(tokens)
    return books


@pytest.fixture
def sample_params():
    """Default params matching params.yaml."""
    return {
        'corpus': {'min_unique_words': 10000, 'download_sleep': 2},
        'word2vec': {'vector_size': 100, 'window': 5, 'min_count': 5, 'sg': 1, 'epochs': 10, 'workers': 1, 'seed': 42},
        'homology': {'max_words': 500, 'timeout': 10, 'retry_step': 100, 'min_words': 100, 'homology_dimensions': [0, 1], 'epsilon_max': 1.0},
        'features': {'grid_resolution': 20, 'sigma': 0.5, 'k_clusters': 50, 'alpha': 0.5},
        'validation': {'svm_kernel': 'rbf', 'svm_C': 1.0, 'svm_gamma': 'scale', 'pca_components': 20, 'permutation_n': 1000},
    }


@pytest.fixture
def tmp_data_dir(tmp_path):
    """Temp directory structure matching data/."""
    (tmp_path / 'raw').mkdir()
    (tmp_path / 'processed').mkdir()
    return tmp_path


@pytest.fixture
def synthetic_vectors():
    """20 random L2-normalized vectors in 10D."""
    rng = np.random.RandomState(42)
    vecs = rng.randn(20, 10)
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    return vecs / norms


@pytest.fixture
def synthetic_tfidf_weights():
    """20 random positive floats."""
    rng = np.random.RandomState(42)
    return np.abs(rng.randn(20)) + 0.1


@pytest.fixture
def synthetic_persistence_diagram():
    """Synthetic giotto-tda format diagram: shape (1, 10, 3)."""
    rng = np.random.RandomState(42)
    diag = np.zeros((1, 10, 3))
    # H0 features (dim=0): births at 0, deaths > 0
    for i in range(5):
        diag[0, i] = [0.0, rng.uniform(0.1, 1.0), 0]
    # H1 features (dim=1): 0 < birth < death
    for i in range(5, 10):
        b = rng.uniform(0.1, 0.5)
        diag[0, i] = [b, b + rng.uniform(0.1, 0.5), 1]
    return diag


@pytest.fixture
def synthetic_feature_matrix():
    """(15, 50) feature matrix: 3 genres x 5 books."""
    rng = np.random.RandomState(42)
    return rng.randn(15, 50)


@pytest.fixture
def synthetic_labels():
    """15 genre labels: 5 each of 0, 1, 2."""
    return np.array([0]*5 + [1]*5 + [2]*5)
