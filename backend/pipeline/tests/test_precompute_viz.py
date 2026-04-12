"""Tests for precompute_viz.py using a tiny mock Word2Vec model."""
import json
import numpy as np
import pytest
from pathlib import Path


def make_mock_w2v(n_words: int = 20, dim: int = 10):
    """Create a minimal mock object with .wv.key_to_index and .wv[] access."""
    class MockWV:
        def __init__(self):
            words = [f'word{i}' for i in range(n_words)]
            self.key_to_index = {w: i for i, w in enumerate(words)}
            self._vectors = np.random.RandomState(42).randn(n_words, dim).astype(np.float32)
            self._words = words

        def __getitem__(self, word):
            return self._vectors[self.key_to_index[word]]

    class MockModel:
        def __init__(self):
            self.wv = MockWV()

    return MockModel()


def test_load_word_vectors():
    from backend.pipeline.precompute_viz import _load_word_vectors
    model = make_mock_w2v(20, 10)
    words, vectors = _load_word_vectors(model)
    assert len(words) == 20
    assert vectors.shape == (20, 10)
    assert vectors.dtype == np.float32


def test_project_pca_shape():
    from backend.pipeline.precompute_viz import _project
    vectors = np.random.RandomState(0).randn(50, 10).astype(np.float32)
    coords = _project(vectors, 'pca')
    assert coords.shape == (50, 3)
    assert coords.dtype == np.float32


def test_project_umap_determinism():
    """UMAP must produce identical output on two runs with random_state=42."""
    from backend.pipeline.precompute_viz import _project
    vectors = np.random.RandomState(0).randn(30, 10).astype(np.float32)
    coords1 = _project(vectors, 'umap')
    coords2 = _project(vectors, 'umap')
    np.testing.assert_array_almost_equal(coords1, coords2, decimal=5,
        err_msg='UMAP output must be deterministic (random_state=42, n_jobs=1)')


def test_project_unknown_raises():
    from backend.pipeline.precompute_viz import _project
    vectors = np.random.RandomState(0).randn(10, 5).astype(np.float32)
    with pytest.raises(ValueError, match='Unknown projection'):
        _project(vectors, 'invalid_method')


def test_normalize_coords():
    from backend.pipeline.precompute_viz import _normalize_coords
    coords = np.array([[10.0, 20.0, 30.0], [-10.0, -20.0, -30.0]], dtype=np.float32)
    normalized = _normalize_coords(coords)
    assert np.abs(normalized).max() <= 1.0 + 1e-5


def test_compute_neighbors_count():
    from backend.pipeline.precompute_viz import _compute_neighbors
    vectors = np.random.RandomState(7).randn(15, 8).astype(np.float32)
    words = [f'w{i}' for i in range(15)]
    neighbors = _compute_neighbors(vectors, words, n=10)
    assert len(neighbors) == 15
    # Each word should have min(10, 14) = 10 neighbors
    for nb_list in neighbors:
        assert len(nb_list) == 10
        for nb in nb_list:
            assert 'word' in nb and 'similarity' in nb
