"""Feature vector construction: persistence images + cluster distribution.

Wraps the core math from scripts/05_build_features.py.
All functions accept cancel_event for cooperative cancellation (per CONTEXT.md).
"""
import asyncio

import numpy as np


def diagram_to_birth_persistence(diagrams: np.ndarray, dim: int = 1) -> np.ndarray:
    """Convert diagram array to (birth, persistence) pairs for given dimension."""
    diag = diagrams[0]
    mask = diag[:, 2] == dim
    bd = diag[mask, :2]
    valid = (bd[:, 0] < bd[:, 1]) & np.isfinite(bd[:, 1])
    bd = bd[valid]
    if len(bd) == 0:
        return np.zeros((0, 2))
    return np.stack([bd[:, 0], bd[:, 1] - bd[:, 0]], axis=1)


class PersistenceImager:
    """Picklable persistence image transformer fitted on a corpus of diagrams."""

    def __init__(self, grid: np.ndarray, two_sigma_sq: float, grid_resolution: int):
        self.grid = grid
        self.two_sigma_sq = two_sigma_sq
        self.grid_resolution = grid_resolution

    def __call__(self, diagram: np.ndarray) -> np.ndarray:
        if len(diagram) == 0:
            return np.zeros(self.grid_resolution ** 2)
        births = diagram[:, 0]
        perss = diagram[:, 1]
        weights = perss
        diff = self.grid[:, np.newaxis, :] - np.stack([births, perss], axis=1)[np.newaxis, :, :]
        sq_dist = np.sum(diff ** 2, axis=2)
        gaussians = np.exp(-sq_dist / self.two_sigma_sq)
        return gaussians @ weights


def build_persistence_imager(all_diagrams: list[np.ndarray], grid_resolution: int, sigma: float) -> 'PersistenceImager':
    """Fit a global persistence image grid and return a PersistenceImager.

    Returns PersistenceImager callable: (birth, persistence) diagram -> grid_resolution^2 vector.
    """
    all_pts = np.concatenate([d for d in all_diagrams if len(d) > 0], axis=0)
    if len(all_pts) == 0:
        return PersistenceImager(
            grid=np.zeros((grid_resolution ** 2, 2)),
            two_sigma_sq=2.0 * sigma ** 2,
            grid_resolution=grid_resolution,
        )

    b_min, b_max = all_pts[:, 0].min(), all_pts[:, 0].max()
    p_min, p_max = all_pts[:, 1].min(), all_pts[:, 1].max()
    if b_max == b_min:
        b_min, b_max = b_min - 0.5, b_max + 0.5
    if p_max == p_min:
        p_min, p_max = p_min - 0.5, p_max + 0.5

    b_centres = np.linspace(b_min, b_max, grid_resolution)
    p_centres = np.linspace(p_min, p_max, grid_resolution)
    B, P = np.meshgrid(b_centres, p_centres, indexing='ij')
    grid = np.stack([B.ravel(), P.ravel()], axis=1)

    return PersistenceImager(
        grid=grid,
        two_sigma_sq=2.0 * sigma ** 2,
        grid_resolution=grid_resolution,
    )


def build_feature_vector(
    diagrams: np.ndarray,
    words: list[str],
    tfidf_weights: np.ndarray,
    w2v_model,
    kmeans,
    persistence_imager: 'PersistenceImager',
    k_clusters: int,
    alpha: float,
    cancel_event: asyncio.Event = None,
) -> np.ndarray:
    """Build combined topology + location feature vector for one book.

    Args:
        diagrams: (1, n_points, 3) persistence diagram array
        words: selected words from embed step
        tfidf_weights: (n,) TF-IDF weights for selected words
        w2v_model: Pre-trained gensim Word2Vec model
        kmeans: Pre-fitted K-means model
        persistence_imager: Callable from build_persistence_imager
        k_clusters: number of K-means clusters
        alpha: weighting between topology and location features
        cancel_event: If set, raises asyncio.CancelledError before computation

    Returns (grid_resolution^2 + k_clusters,) feature vector with alpha weighting applied.
    """
    if cancel_event and cancel_event.is_set():
        raise asyncio.CancelledError('Cancelled before features step')

    h1_bp = diagram_to_birth_persistence(diagrams, dim=1)
    h1_img = persistence_imager(h1_bp)
    topo_norm = h1_img / (np.linalg.norm(h1_img) + 1e-10)

    cluster_dist = np.zeros(k_clusters)
    for j, word in enumerate(words[:len(tfidf_weights)]):
        if word in w2v_model.wv:
            vec = w2v_model.wv.get_vector(word).reshape(1, -1)
            cluster_id = kmeans.predict(vec)[0]
            cluster_dist[cluster_id] += tfidf_weights[j]
    loc_norm = cluster_dist / (np.linalg.norm(cluster_dist) + 1e-10)

    return np.concatenate([alpha * topo_norm, (1 - alpha) * loc_norm])
