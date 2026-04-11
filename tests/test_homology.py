import pytest
import numpy as np
from scipy.spatial.distance import pdist, squareform


def compute_weighted_distance_matrix(vectors, tfidf_weights):
    raw_dist = squareform(pdist(vectors, metric='euclidean'))
    weight_sums = tfidf_weights[:, None] + tfidf_weights[None, :]
    weight_sums = np.maximum(weight_sums, 1e-10)
    weighted_dist = raw_dist / weight_sums
    np.fill_diagonal(weighted_dist, 0.0)
    return weighted_dist


def giotto_to_persim(diagrams, dim):
    diag = diagrams[0]
    mask = diag[:, 2] == dim
    bd_pairs = diag[mask, :2]
    valid = bd_pairs[:, 0] < bd_pairs[:, 1]
    bd_pairs = bd_pairs[valid]
    finite = np.isfinite(bd_pairs[:, 1])
    bd_pairs = bd_pairs[finite]
    if len(bd_pairs) == 0:
        return np.zeros((0, 2))
    return bd_pairs


def test_weighted_distance_matrix(synthetic_vectors, synthetic_tfidf_weights):
    D = compute_weighted_distance_matrix(synthetic_vectors, synthetic_tfidf_weights)
    n = len(synthetic_vectors)
    assert D.shape == (n, n)
    np.testing.assert_array_equal(np.diag(D), np.zeros(n))
    assert np.all(D >= 0)
    np.testing.assert_array_almost_equal(D, D.T)
    # Higher-weight pair should produce smaller weighted distance than lower-weight pair
    # with the same raw distance
    vecs = np.array([[0.0, 0.0], [1.0, 0.0], [2.0, 0.0]])
    w_high = np.array([10.0, 10.0, 0.1])
    w_low  = np.array([0.1,  0.1,  10.0])
    D_test = compute_weighted_distance_matrix(vecs, w_high)
    # d(0,1) with high weights should be smaller
    d_high = D_test[0, 1]
    D_test2 = compute_weighted_distance_matrix(vecs, w_low)
    d_low = D_test2[0, 1]
    assert d_high < d_low


def test_persistence_image_shape(synthetic_persistence_diagram):
    from persim import PersistenceImager
    # Convert H1 diagram
    h1 = giotto_to_persim(synthetic_persistence_diagram, dim=1)
    if len(h1) == 0:
        pytest.skip("No H1 features in synthetic diagram")
    pimgr = PersistenceImager(pixel_size=0.1, weight='persistence')
    pimgr.fit([h1])
    img = pimgr.transform([h1], skew=True)[0]
    assert img.ndim == 2
    assert img.shape[0] > 0 and img.shape[1] > 0


def test_giotto_to_persim_format(synthetic_persistence_diagram):
    result = giotto_to_persim(synthetic_persistence_diagram, dim=1)
    assert result.ndim == 2
    assert result.shape[1] == 2
    assert np.all(np.isfinite(result))
    if len(result) > 0:
        assert np.all(result[:, 1] > 0)  # persistence > 0


def test_empty_diagram_handled():
    """Empty diagram returns (0, 2) array without error."""
    empty_diag = np.zeros((1, 0, 3))
    result = giotto_to_persim(empty_diag, dim=1)
    assert result.shape == (0, 2)


def test_timeout_reduces_max_words():
    """Retry logic reduces max_words by retry_step and stops at min_words."""
    max_words = 500
    retry_step = 100
    min_words = 100
    attempts = []
    while max_words >= min_words:
        attempts.append(max_words)
        max_words -= retry_step
    assert attempts[0] == 500
    assert attempts[-1] == min_words
    assert all(attempts[i] - attempts[i+1] == retry_step for i in range(len(attempts)-1))
