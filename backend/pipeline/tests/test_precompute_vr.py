"""Tests for VR edge precomputation with feature_type labeling."""
import numpy as np
import pytest

from backend.pipeline.precompute_vr import precompute_vr_edges


@pytest.fixture
def random_data():
    """10 random 50D vectors with TF-IDF weights."""
    rng = np.random.RandomState(42)
    vectors = rng.randn(10, 50).astype(np.float32)
    tfidf_weights = rng.rand(10).astype(np.float32) + 0.01  # avoid zero
    words = [f'word_{i}' for i in range(10)]
    # simple 3D positions
    positions = rng.randn(10, 3).astype(np.float32).tolist()
    return words, vectors, tfidf_weights, positions


def test_edges_sorted_by_eps_birth(random_data):
    words, vectors, tfidf_weights, positions = random_data
    result = precompute_vr_edges(
        words=words, vectors=vectors, tfidf_weights=tfidf_weights,
        epsilon_max=10.0, projection_coords=positions,
    )
    edges = result['edges']
    assert len(edges) > 0
    births = [e[2] for e in edges]
    assert births == sorted(births), 'Edges must be sorted by eps_birth ascending'


def test_edges_within_epsilon_max(random_data):
    words, vectors, tfidf_weights, positions = random_data
    eps_max = 2.0
    result = precompute_vr_edges(
        words=words, vectors=vectors, tfidf_weights=tfidf_weights,
        epsilon_max=eps_max, projection_coords=positions,
    )
    for edge in result['edges']:
        assert edge[2] <= eps_max, f'Edge birth {edge[2]} exceeds epsilon_max {eps_max}'


def test_epsilon_max_zero_returns_empty(random_data):
    words, vectors, tfidf_weights, positions = random_data
    result = precompute_vr_edges(
        words=words, vectors=vectors, tfidf_weights=tfidf_weights,
        epsilon_max=0.0, projection_coords=positions,
    )
    assert result['edges'] == []


def test_edge_tuple_structure(random_data):
    words, vectors, tfidf_weights, positions = random_data
    result = precompute_vr_edges(
        words=words, vectors=vectors, tfidf_weights=tfidf_weights,
        epsilon_max=10.0, projection_coords=positions,
    )
    for edge in result['edges']:
        assert len(edge) == 4, f'Edge must have 4 elements, got {len(edge)}'
        idx_a, idx_b, eps_birth, feature_type = edge
        assert isinstance(idx_a, int)
        assert isinstance(idx_b, int)
        assert isinstance(eps_birth, float)
        assert isinstance(feature_type, int)
        assert 0 <= idx_a < len(words)
        assert 0 <= idx_b < len(words)
        assert idx_a < idx_b


def test_feature_type_values(random_data):
    words, vectors, tfidf_weights, positions = random_data
    result = precompute_vr_edges(
        words=words, vectors=vectors, tfidf_weights=tfidf_weights,
        epsilon_max=10.0, projection_coords=positions,
    )
    for edge in result['edges']:
        assert edge[3] in {0, 1, 2}, f'feature_type must be 0, 1, or 2, got {edge[3]}'


def test_result_keys(random_data):
    words, vectors, tfidf_weights, positions = random_data
    result = precompute_vr_edges(
        words=words, vectors=vectors, tfidf_weights=tfidf_weights,
        epsilon_max=10.0, projection_coords=positions,
    )
    assert set(result.keys()) == {'words', 'edges', 'epsilon_max', 'positions'}
    assert result['words'] == words
    assert result['epsilon_max'] == 10.0
    assert result['positions'] == positions


def test_h1_loop_detection():
    """Points forming a square should produce at least one H1 boundary edge."""
    # 4 points at corners of a unit square in 2D (embedded in 50D)
    rng = np.random.RandomState(123)
    base = np.zeros((4, 50), dtype=np.float32)
    base[0, :2] = [0, 0]
    base[1, :2] = [1, 0]
    base[2, :2] = [1, 1]
    base[3, :2] = [0, 1]
    # Add tiny noise so ripser doesn't degenerate
    base += rng.randn(4, 50).astype(np.float32) * 0.001

    tfidf_weights = np.ones(4, dtype=np.float32)
    words = ['a', 'b', 'c', 'd']
    positions = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]]

    result = precompute_vr_edges(
        words=words, vectors=base, tfidf_weights=tfidf_weights,
        epsilon_max=10.0, projection_coords=positions,
        homology_dims=[0, 1],
    )
    feature_types = [e[3] for e in result['edges']]
    assert 1 in feature_types, 'Expected at least one H1 boundary edge for a square configuration'
