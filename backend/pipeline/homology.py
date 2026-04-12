"""Weighted Vietoris-Rips persistent homology computation.

Wraps the core math from scripts/04_compute_homology.py into
an importable function. All functions accept cancel_event for
cooperative cancellation (per CONTEXT.md).
"""
import asyncio

import numpy as np
from scipy.spatial.distance import pdist, squareform


def build_weighted_distance_matrix(vectors: np.ndarray, tfidf_weights: np.ndarray) -> np.ndarray:
    """Weighted distance: D_ij = ||v_i - v_j|| / (w_i + w_j), w normalized to [0,1]."""
    w = tfidf_weights / tfidf_weights.max()
    raw_dist = squareform(pdist(vectors, metric='euclidean'))
    weight_sums = np.maximum(w[:, None] + w[None, :], 1e-10)
    dist_matrix = raw_dist / weight_sums
    np.fill_diagonal(dist_matrix, 0.0)
    return dist_matrix


def compute_book_homology(
    vectors: np.ndarray,
    tfidf_weights: np.ndarray,
    homology_dims: list[int] = None,
    epsilon_max: float = 1.0,
    cancel_event: asyncio.Event = None,
) -> np.ndarray:
    """Compute VR persistent homology for one book.

    Args:
        vectors: (n, dim) word vectors
        tfidf_weights: (n,) TF-IDF weights
        homology_dims: list of homology dimensions to compute (default [1])
        epsilon_max: maximum filtration radius
        cancel_event: If set, raises asyncio.CancelledError before computation

    Returns:
        diagrams array of shape (1, n_points, 3) with [birth, death, dimension]
    """
    if cancel_event and cancel_event.is_set():
        raise asyncio.CancelledError('Cancelled before homology step')

    if homology_dims is None:
        homology_dims = [1]

    from ripser import ripser
    dist_matrix = build_weighted_distance_matrix(vectors, tfidf_weights)
    max_dim = max(homology_dims)
    result = ripser(dist_matrix, maxdim=max_dim, thresh=epsilon_max, distance_matrix=True)

    rows = []
    for dim in homology_dims:
        for birth, death in result['dgms'][dim]:
            rows.append([birth, death, float(dim)])

    arr = np.array(rows, dtype=np.float32) if rows else np.zeros((0, 3), dtype=np.float32)
    return arr[np.newaxis, :, :]
