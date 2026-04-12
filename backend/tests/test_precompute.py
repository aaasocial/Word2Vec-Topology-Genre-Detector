"""Tests for precompute script internals -- covers CORPUS-02."""
import pytest
import numpy as np
from backend.pipeline.features import diagram_to_birth_persistence, build_persistence_imager
from backend.pipeline.homology import build_weighted_distance_matrix


def test_build_weighted_distance_matrix_shape():
    vectors = np.random.randn(10, 50).astype(np.float32)
    weights = np.random.rand(10).astype(np.float32)
    dm = build_weighted_distance_matrix(vectors, weights)
    assert dm.shape == (10, 10)
    np.testing.assert_array_almost_equal(np.diag(dm), 0.0)


def test_build_weighted_distance_matrix_symmetric():
    vectors = np.random.randn(10, 50).astype(np.float32)
    weights = np.random.rand(10).astype(np.float32)
    dm = build_weighted_distance_matrix(vectors, weights)
    np.testing.assert_array_almost_equal(dm, dm.T)


def test_precompute_module_is_importable():
    """precompute.py can be imported without side effects."""
    import backend.pipeline.precompute as pc
    assert hasattr(pc, 'precompute_all')
    assert callable(pc.precompute_all)


@pytest.mark.integration
def test_precompute_runs_on_corpus(tmp_path, monkeypatch):
    """Integration test: requires Phase 1 models and corpus to be built."""
    pytest.skip('Run manually after Phase 1 pipeline: python -m backend.pipeline.precompute')
