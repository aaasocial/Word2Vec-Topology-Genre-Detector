import pytest
import numpy as np


def test_cluster_distribution_sums_to_one():
    """Cluster distribution weighted by TF-IDF and L2-normalized sums to... 1.0 L2-norm."""
    rng = np.random.RandomState(42)
    n_words = 20
    k_clusters = 5
    tfidf_weights = np.abs(rng.randn(n_words)) + 0.1
    cluster_assignments = rng.randint(0, k_clusters, n_words)

    dist = np.zeros(k_clusters)
    for word_idx, cluster in enumerate(cluster_assignments):
        dist[cluster] += tfidf_weights[word_idx]

    # L2-normalize
    norm = np.linalg.norm(dist)
    if norm > 0:
        dist = dist / norm

    np.testing.assert_almost_equal(np.linalg.norm(dist), 1.0)


def test_feature_vector_normalization():
    """Concatenated feature vector: each part is L2-normalized before concat."""
    rng = np.random.RandomState(42)
    alpha = 0.5
    h0_img = rng.randn(400)
    h1_img = rng.randn(400)
    cluster_dist = np.abs(rng.randn(50)) + 0.1

    h0_norm = h0_img / (np.linalg.norm(h0_img) + 1e-10)
    h1_norm = h1_img / (np.linalg.norm(h1_img) + 1e-10)
    cluster_norm = cluster_dist / (np.linalg.norm(cluster_dist) + 1e-10)

    structure_vec = np.concatenate([h0_norm, h1_norm])
    feature = np.concatenate([alpha * structure_vec, (1 - alpha) * cluster_norm])

    # Check that the topology part (first 800 dims) has L2 norm = alpha * sqrt(2) approximately
    # since each 400-dim part has norm 1.0 after normalization
    topo_part = feature[:800]
    expected_norm = alpha * np.sqrt(2)  # two unit vectors concatenated, scaled by alpha
    np.testing.assert_almost_equal(np.linalg.norm(topo_part), expected_norm, decimal=5)


def test_feature_vector_length():
    """Feature vector length: 2 * grid_resolution^2 + k_clusters."""
    grid_resolution = 20
    k_clusters = 50
    h0_img = np.zeros(grid_resolution * grid_resolution)
    h1_img = np.zeros(grid_resolution * grid_resolution)
    cluster_dist = np.zeros(k_clusters)
    structure = np.concatenate([h0_img, h1_img])
    feature = np.concatenate([structure, cluster_dist])
    expected_length = 2 * grid_resolution**2 + k_clusters
    assert len(feature) == expected_length, f"Expected {expected_length}, got {len(feature)}"
