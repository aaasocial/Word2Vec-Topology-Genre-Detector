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

    v2 (Plan 06-04): H1 only. H0 is degenerate in the weighted VR construction
    (all components born at filtration time 0). H2 deferred to v3 -- sparse
    high-D point clouds rarely contain voids and the O(n^4) runtime cliff is
    not worth the engineering for empirical-zero gain (see PROJECT.md Key
    Decisions; PITFALLS.md sections 2 and 3). The ``homology_dims`` parameter
    is retained on the signature for v3 forward-compat, but is asserted equal
    to ``[1]`` at runtime -- callers that try ``[0]``/``[2]``/``[0,1,2]`` will
    fail loudly rather than silently degrade.

    Args:
        vectors: (n, dim) word vectors
        tfidf_weights: (n,) TF-IDF weights
        homology_dims: must be ``[1]`` (default). Other values raise AssertionError.
        epsilon_max: maximum filtration radius
        cancel_event: If set, raises asyncio.CancelledError before computation

    Returns:
        diagrams array of shape (1, n_points, 3) with [birth, death, dimension]
    """
    if cancel_event and cancel_event.is_set():
        raise asyncio.CancelledError('Cancelled before homology step')

    if homology_dims is None:
        homology_dims = [1]
    assert homology_dims == [1], (
        f"v2 only supports homology_dims=[1]; got {homology_dims}. "
        "H0 degenerate, H2 deferred -- see PROJECT.md Key Decisions."
    )

    from ripser import ripser
    dist_matrix = build_weighted_distance_matrix(vectors, tfidf_weights)
    result = ripser(dist_matrix, maxdim=1, thresh=epsilon_max, distance_matrix=True)

    rows = []
    for birth, death in result['dgms'][1]:
        rows.append([birth, death, 1.0])

    arr = np.array(rows, dtype=np.float32) if rows else np.zeros((0, 3), dtype=np.float32)
    return arr[np.newaxis, :, :]
