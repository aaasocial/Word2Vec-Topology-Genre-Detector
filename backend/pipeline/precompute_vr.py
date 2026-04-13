"""Build-time VR edge precomputation with feature_type labeling.

Computes all Vietoris-Rips edges up to epsilon_max for each genre,
labels edges by topological significance (H0/H1/H2 boundary membership),
and caches as compact JSON for browser-side filtration.

Run standalone:
  python -m backend.pipeline.precompute_vr

Or called from precompute_viz.py main flow.
"""
import json
import logging
import sys
from pathlib import Path
from typing import Optional

import numpy as np
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))

from backend.cache.store import cache_key, cache_put, cache_get, cache_exists
from backend.pipeline.homology import build_weighted_distance_matrix

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')
log = logging.getLogger(__name__)

MAX_WORDS_PER_GENRE = 500  # Cap per CORPUS-03


def precompute_vr_edges(
    words: list[str],
    vectors: np.ndarray,
    tfidf_weights: np.ndarray,
    epsilon_max: float,
    projection_coords: list[list[float]],
    homology_dims: Optional[list[int]] = None,
) -> dict:
    """Compute VR edges with feature_type labeling.

    Args:
        words: Word list for index mapping.
        vectors: (n, dim) word vectors.
        tfidf_weights: (n,) TF-IDF weights.
        epsilon_max: Maximum filtration radius.
        projection_coords: (n, 3) 3D coordinates from current projection.
        homology_dims: Homology dimensions to compute (default [0, 1]).

    Returns:
        {words, edges, epsilon_max, positions} where edges are
        [idx_a, idx_b, eps_birth, feature_type] sorted by eps_birth.
        feature_type: 0=H0, 1=H1 boundary, 2=H2 boundary.
    """
    if homology_dims is None:
        homology_dims = [0, 1]

    n = len(words)

    if epsilon_max <= 0 or n < 2:
        return {
            'words': words,
            'edges': [],
            'epsilon_max': float(epsilon_max),
            'positions': projection_coords,
        }

    # Build weighted distance matrix
    dist_matrix = build_weighted_distance_matrix(vectors, tfidf_weights)

    # Run ripser to get persistence diagrams
    from ripser import ripser
    max_dim = max(homology_dims)
    result = ripser(dist_matrix, maxdim=max_dim, thresh=epsilon_max, distance_matrix=True)

    # Identify H1/H2 boundary birth edges
    # For each persistence pair, the birth value corresponds to the distance
    # of the edge that created the topological feature.
    boundary_births: dict[int, set] = {}  # {feature_type: set of (i,j) edge tuples}
    for dim in homology_dims:
        if dim == 0:
            continue  # H0 edges are generic connected component edges
        boundary_births[dim] = set()
        if dim < len(result['dgms']):
            for birth, death in result['dgms'][dim]:
                if np.isinf(death) or np.isinf(birth):
                    continue
                # Find the edge (i, j) whose distance matches this birth value
                _label_birth_edge(dist_matrix, birth, dim, boundary_births)

    # Extract upper triangle edges within epsilon_max
    edges = []
    for i in range(n):
        for j in range(i + 1, n):
            d = dist_matrix[i, j]
            if d <= epsilon_max:
                # Determine feature_type
                ft = 0  # default H0
                for dim in sorted(boundary_births.keys(), reverse=True):
                    if (i, j) in boundary_births[dim]:
                        ft = dim
                        break
                edges.append([i, j, round(float(d), 5), ft])

    # Sort by eps_birth ascending (critical for drawRange optimization)
    edges.sort(key=lambda e: e[2])

    return {
        'words': words,
        'edges': edges,
        'epsilon_max': float(epsilon_max),
        'positions': projection_coords,
    }


def _label_birth_edge(
    dist_matrix: np.ndarray,
    birth_value: float,
    dim: int,
    boundary_births: dict[int, set],
    tol: float = 1e-5,
) -> None:
    """Find the edge (i, j) in the distance matrix matching the birth value."""
    n = dist_matrix.shape[0]
    best_diff = float('inf')
    best_edge = None
    for i in range(n):
        for j in range(i + 1, n):
            diff = abs(dist_matrix[i, j] - birth_value)
            if diff < best_diff:
                best_diff = diff
                best_edge = (i, j)
    if best_edge is not None and best_diff < tol:
        boundary_births[dim].add(best_edge)


def get_cached_vr_edges(genre: str, projection: str, window: int) -> Optional[dict]:
    """Retrieve cached VR edge data for a genre."""
    key = cache_key('vr_edges', {'genre': genre, 'projection': projection, 'window': window})
    return cache_get(key)


def precompute_all_vr(window: int = None, projection: str = 'pca', force: bool = False) -> None:
    """Entry point: precompute VR edges for all genres.

    Args:
        window: Word2Vec window size. If None, reads from params.yaml.
        projection: Projection method for 3D coordinates.
        force: Recompute even if cached.
    """
    from utils import load_params
    params = load_params()
    if window is None:
        window = params['word2vec']['window']

    project_root = Path(__file__).resolve().parents[2]
    models_dir = project_root / 'data' / 'models'
    features_dir = project_root / 'data' / 'features'
    corpus_path = project_root / 'corpus' / 'books.yaml'

    # Load Word2Vec model
    from gensim.models import Word2Vec
    model_path = models_dir / f'word2vec_w{window}.model'
    if not model_path.exists():
        log.error(f'Word2Vec model not found at {model_path}')
        return

    log.info(f'Loading Word2Vec (window={window})...')
    w2v_model = Word2Vec.load(str(model_path))

    with open(corpus_path) as f:
        books_data = yaml.safe_load(f)

    # Load scatter data for projection coordinates
    from backend.pipeline.precompute_viz import get_cached_scatter
    scatter_data = get_cached_scatter(projection, window)
    if scatter_data is None:
        log.error('Scatter data not cached. Run precompute_viz first.')
        return

    # Build word -> index + coords mapping from scatter data
    word_to_scatter_idx = {}
    scatter_points = scatter_data['points']
    for idx, pt in enumerate(scatter_points):
        word_to_scatter_idx[pt['word']] = idx

    epsilon_max = params.get('homology', {}).get('epsilon_max', 1.0)

    for genre, book_list in books_data['genres'].items():
        ck = cache_key('vr_edges', {'genre': genre, 'projection': projection, 'window': window})
        if not force and cache_exists(ck):
            log.info(f'  VR edges for {genre}: already cached')
            continue

        # Collect top-N TF-IDF words for this genre
        genre_tfidf_key = cache_key('tfidf_genre', {'genre': genre, 'window': window})
        genre_tfidf = cache_get(genre_tfidf_key)
        if genre_tfidf is None:
            log.warning(f'  No TF-IDF data for {genre}, skipping')
            continue

        # Filter to words in the W2V vocab and scatter data
        candidates = []
        for w, weight in genre_tfidf.items():
            if w in w2v_model.wv and w in word_to_scatter_idx:
                candidates.append((w, weight))

        # Sort by TF-IDF descending, take top MAX_WORDS_PER_GENRE
        candidates.sort(key=lambda x: -x[1])
        selected = candidates[:MAX_WORDS_PER_GENRE]

        if len(selected) < 2:
            log.warning(f'  Too few words for {genre} ({len(selected)}), skipping VR')
            continue

        words = [w for w, _ in selected]
        vectors = np.array([w2v_model.wv[w] for w in words], dtype=np.float32)
        tfidf_w = np.array([wt for _, wt in selected], dtype=np.float32)
        positions = []
        for w in words:
            si = word_to_scatter_idx[w]
            pt = scatter_points[si]
            positions.append([pt['x'], pt['y'], pt['z']])

        log.info(f'  Computing VR edges for {genre} ({len(words)} words)...')
        result = precompute_vr_edges(
            words=words, vectors=vectors, tfidf_weights=tfidf_w,
            epsilon_max=epsilon_max, projection_coords=positions,
        )
        cache_put(ck, result)
        log.info(f'  Cached VR edges for {genre}: {len(result["edges"])} edges')

    log.info('precompute_all_vr complete.')


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Pre-compute VR edges for all genres')
    parser.add_argument('--window', type=int, default=None)
    parser.add_argument('--projection', type=str, default='pca')
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    precompute_all_vr(window=args.window, projection=args.projection, force=args.force)
