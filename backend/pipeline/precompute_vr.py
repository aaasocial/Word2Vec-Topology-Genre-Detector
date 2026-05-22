"""Build-time VR edge precomputation with feature_type labeling.

Computes all Vietoris-Rips edges up to epsilon_max for each genre,
labels edges by topological significance (H1 boundary membership),
and caches as compact JSON for browser-side filtration.

v2 (Plan 06-04): H1-only labelling. H0 boundary tracking dropped (edges that
form connected components are the generic case -- ft=0); H2 dropped (deferred
to v3 -- PROJECT.md Key Decisions; PITFALLS.md sections 2 and 3).

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
from backend.cache.lineage import corpus_hash as _corpus_hash, w2v_model_sha256 as _w2v_model_sha256
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

    v2 (Plan 06-04): H1 only. H0 boundary tracking dropped (an edge that forms
    a connected component is the generic case, labelled ft=0); H2 dropped
    (deferred to v3). The ``homology_dims`` parameter is retained for v3
    forward-compat and is asserted equal to ``[1]`` at runtime so any caller
    passing ``[0]``/``[0,1]``/``[2]`` against the v2 build fails loudly.

    Args:
        words: Word list for index mapping.
        vectors: (n, dim) word vectors.
        tfidf_weights: (n,) TF-IDF weights.
        epsilon_max: Maximum filtration radius.
        projection_coords: (n, 3) 3D coordinates from current projection.
        homology_dims: must be ``[1]`` (default). Other values raise AssertionError.

    Returns:
        {words, edges, epsilon_max, positions} where edges are
        [idx_a, idx_b, eps_birth, feature_type] sorted by eps_birth.
        feature_type: 0=non-boundary (generic / connected-component edge),
        1=H1 boundary.
    """
    if homology_dims is None:
        homology_dims = [1]
    assert homology_dims == [1], (
        f"v2 only supports homology_dims=[1]; got {homology_dims}. "
        "H0 degenerate, H2 deferred -- see PROJECT.md Key Decisions."
    )

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

    # Run ripser to get persistence diagrams (H1 only).
    from ripser import ripser
    result = ripser(dist_matrix, maxdim=1, thresh=epsilon_max, distance_matrix=True)

    # Identify H1 boundary birth edges. For each persistence pair, the birth
    # value corresponds to the distance of the edge that created the loop.
    boundary_births: dict[int, set] = {1: set()}
    if 1 < len(result['dgms']):
        for birth, death in result['dgms'][1]:
            if np.isinf(death) or np.isinf(birth):
                continue
            # Find the edge (i, j) whose distance matches this birth value
            _label_birth_edge(dist_matrix, birth, 1, boundary_births)

    # Extract upper triangle edges within epsilon_max
    edges = []
    for i in range(n):
        for j in range(i + 1, n):
            d = dist_matrix[i, j]
            if d <= epsilon_max:
                # Determine feature_type: 1 if this edge births an H1 loop,
                # otherwise 0 (generic / connected-component edge).
                ft = 1 if (i, j) in boundary_births[1] else 0
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
    key = cache_key(
        'vr_edges',
        {'genre': genre, 'projection': projection, 'window': window},
        corpus_hash=_corpus_hash(),
        w2v_model_sha256=_w2v_model_sha256(window),
    )
    return cache_get(key)


ALL_PROJECTIONS = ['pca', 'kpca', 'umap', 'tsne']


def _precompute_vr_for_projection(
    projection: str,
    window: int,
    w2v_model,
    books_data: dict,
    epsilon_max: float,
    force: bool,
) -> None:
    """Precompute VR edges for all genres under one projection."""
    from backend.pipeline.precompute_viz import get_cached_scatter
    scatter_data = get_cached_scatter(projection, window)
    if scatter_data is None:
        log.error(f'Scatter data for projection={projection} not cached. Run precompute_viz first.')
        return

    word_to_scatter_idx: dict[str, int] = {}
    scatter_points = scatter_data['points']
    for idx, pt in enumerate(scatter_points):
        word_to_scatter_idx[pt['word']] = idx

    # Plan 06-05 / BUG-05: lineage for cache_key invalidation.
    lineage_ch = _corpus_hash()
    lineage_wh = _w2v_model_sha256(window)

    for genre, book_list in books_data['genres'].items():
        ck = cache_key(
            'vr_edges',
            {'genre': genre, 'projection': projection, 'window': window},
            corpus_hash=lineage_ch,
            w2v_model_sha256=lineage_wh,
        )
        if not force and cache_exists(ck):
            log.info(f'  [{projection}] VR edges for {genre}: already cached')
            continue

        genre_tfidf_key = cache_key(
            'tfidf_genre',
            {'genre': genre, 'window': window},
            corpus_hash=lineage_ch,
            w2v_model_sha256=lineage_wh,
        )
        genre_tfidf = cache_get(genre_tfidf_key)
        if genre_tfidf is None:
            log.warning(f'  [{projection}] No TF-IDF data for {genre}, skipping')
            continue

        candidates = [
            (w, weight) for w, weight in genre_tfidf.items()
            if w in w2v_model.wv and w in word_to_scatter_idx
        ]
        candidates.sort(key=lambda x: -x[1])
        selected = candidates[:MAX_WORDS_PER_GENRE]

        if len(selected) < 2:
            log.warning(f'  [{projection}] Too few words for {genre} ({len(selected)}), skipping VR')
            continue

        words = [w for w, _ in selected]
        vectors = np.array([w2v_model.wv[w] for w in words], dtype=np.float32)
        tfidf_w = np.array([wt for _, wt in selected], dtype=np.float32)
        positions = [
            [scatter_points[word_to_scatter_idx[w]]['x'],
             scatter_points[word_to_scatter_idx[w]]['y'],
             scatter_points[word_to_scatter_idx[w]]['z']]
            for w in words
        ]

        log.info(f'  [{projection}] Computing VR edges for {genre} ({len(words)} words)...')
        result = precompute_vr_edges(
            words=words, vectors=vectors, tfidf_weights=tfidf_w,
            epsilon_max=epsilon_max, projection_coords=positions,
        )
        cache_put(ck, result)
        log.info(f'  [{projection}] Cached VR edges for {genre}: {len(result["edges"])} edges')


def precompute_all_vr(
    window: int = None,
    projections: list[str] | None = None,
    force: bool = False,
) -> None:
    """Entry point: precompute VR edges for all genres and projections.

    Args:
        window: Word2Vec window size. If None, reads from params.yaml.
        projections: List of projection methods. Defaults to all 4 (pca/kpca/umap/tsne).
        force: Recompute even if cached.
    """
    from utils import load_params
    params = load_params()
    if window is None:
        window = params['word2vec']['window']
    if projections is None:
        projections = ALL_PROJECTIONS

    project_root = Path(__file__).resolve().parents[2]
    models_dir = project_root / 'data' / 'models'
    corpus_path = project_root / 'corpus' / 'books.yaml'

    from gensim.models import Word2Vec
    model_path = models_dir / f'word2vec_w{window}.model'
    if not model_path.exists():
        log.error(f'Word2Vec model not found at {model_path}')
        return

    log.info(f'Loading Word2Vec (window={window})...')
    w2v_model = Word2Vec.load(str(model_path))

    with open(corpus_path) as f:
        books_data = yaml.safe_load(f)

    epsilon_max = params.get('homology', {}).get('epsilon_max', 1.0)
    log.info(f'epsilon_max={epsilon_max}, projections={projections}')

    for projection in projections:
        log.info(f'--- Projection: {projection} ---')
        _precompute_vr_for_projection(
            projection=projection,
            window=window,
            w2v_model=w2v_model,
            books_data=books_data,
            epsilon_max=epsilon_max,
            force=force,
        )

    log.info('precompute_all_vr complete.')


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Pre-compute VR edges for all genres')
    parser.add_argument('--window', type=int, default=None)
    parser.add_argument('--projections', type=str, default='all',
                        help='Comma-separated list of projections, or "all" (default)')
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    proj_list = ALL_PROJECTIONS if args.projections == 'all' else args.projections.split(',')
    precompute_all_vr(window=args.window, projections=proj_list, force=args.force)
