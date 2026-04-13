"""Build-time viz precompute: PCA, Kernel PCA, UMAP, t-SNE on word embeddings.

Run after backend.pipeline.precompute has completed (requires trained Word2Vec model):
  python -m backend.pipeline.precompute_viz

Produces cached entries in data/cache/:
  scatter:{projection} -> list of ScatterPoint dicts

MUST be run before the API server is started for the first time.
"""
import json
import logging
import sys
from pathlib import Path
from typing import Literal

import joblib
import numpy as np
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
from utils import load_params

from backend.cache.store import cache_key, cache_put, cache_get, cache_exists

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')
log = logging.getLogger(__name__)

PROJECTIONS = ['pca', 'kpca', 'umap', 'tsne']
N_NEIGHBORS = 10  # top-N nearest neighbors per word


def _load_word_vectors(w2v_model, min_count: int = 2) -> tuple[list[str], np.ndarray]:
    """Extract all word strings and their vectors from a trained W2V model."""
    vocab = list(w2v_model.wv.key_to_index.keys())
    vectors = np.array([w2v_model.wv[word] for word in vocab], dtype=np.float32)
    log.info(f'Loaded {len(vocab)} word vectors, shape={vectors.shape}')
    return vocab, vectors


def _compute_neighbors(vectors: np.ndarray, words: list[str], n: int = N_NEIGHBORS) -> list[list[dict]]:
    """Compute top-N nearest neighbors per word using cosine similarity.

    Returns list of length len(words), each element is a list of {word, similarity} dicts.
    Uses batched dot product for efficiency.
    """
    from sklearn.preprocessing import normalize
    normed = normalize(vectors, axis=1)  # L2-normalize for cosine similarity
    # Batch dot product: (V, D) @ (D, V) = (V, V) similarity matrix
    # For large vocabs this is too large for full matrix.
    # Use chunked approach: process 1k words at a time, keep top-N per chunk.
    chunk_size = 1000
    n_words = len(words)
    all_neighbors = [[] for _ in range(n_words)]
    actual_n = min(n, n_words - 1)  # cannot have more neighbors than vocab size - 1

    for start in range(0, n_words, chunk_size):
        end = min(start + chunk_size, n_words)
        chunk_sims = normed[start:end] @ normed.T  # (chunk, V)
        # Set self-similarity to -inf to exclude self from neighbors
        for local_i, global_i in enumerate(range(start, end)):
            chunk_sims[local_i, global_i] = -np.inf
        # Get top-N indices per row
        top_indices = np.argsort(chunk_sims, axis=1)[:, -actual_n:][:, ::-1]
        top_sims = np.take_along_axis(chunk_sims, top_indices, axis=1)
        for local_i, global_i in enumerate(range(start, end)):
            all_neighbors[global_i] = [
                {'word': words[top_indices[local_i, j]], 'similarity': float(top_sims[local_i, j])}
                for j in range(actual_n)
            ]
        if start % 10000 == 0:
            log.info(f'  Neighbors: {start}/{n_words}')

    return all_neighbors


def _project(vectors: np.ndarray, method: str, n_components: int = 3) -> np.ndarray:
    """Apply dimensionality reduction to produce 3D coordinates.

    Args:
        vectors: (N, D) array of word vectors
        method: one of 'pca', 'kpca', 'umap', 'tsne'
        n_components: output dimensions (always 3 for visualization)

    Returns:
        (N, 3) float32 array of projected coordinates
    """
    if method == 'pca':
        from sklearn.decomposition import PCA
        proj = PCA(n_components=n_components, random_state=42)
        coords = proj.fit_transform(vectors)

    elif method == 'kpca':
        from sklearn.decomposition import KernelPCA
        proj = KernelPCA(n_components=n_components, kernel='rbf', gamma=None, random_state=42)
        coords = proj.fit_transform(vectors)

    elif method == 'umap':
        from umap import UMAP
        # CRITICAL: random_state=42 and n_jobs=1 for determinism (RESEARCH.md pitfall 4)
        proj = UMAP(n_components=n_components, random_state=42, n_jobs=1,
                    n_neighbors=15, min_dist=0.1)
        coords = proj.fit_transform(vectors)

    elif method == 'tsne':
        from sklearn.manifold import TSNE
        # t-SNE on large point sets is slow; use PCA init and perplexity=30
        proj = TSNE(n_components=n_components, random_state=42, init='pca',
                    perplexity=30, n_iter=1000, learning_rate='auto')
        coords = proj.fit_transform(vectors)

    else:
        raise ValueError(f'Unknown projection: {method}')

    return coords.astype(np.float32)


def _normalize_coords(coords: np.ndarray) -> np.ndarray:
    """Normalize coordinates to roughly [-1, 1] range for stable 3D rendering."""
    center = coords.mean(axis=0)
    coords = coords - center
    scale = np.abs(coords).max()
    if scale > 0:
        coords = coords / scale
    return coords.astype(np.float32)


def _load_tfidf_by_genre(books_data: dict, features_dir: Path, window: int
                          ) -> dict[str, dict[str, float]]:
    """Aggregate TF-IDF weights per genre across all books in that genre.

    Returns: {genre: {word: avg_tfidf_weight}}
    Also caches individual book TF-IDF maps.
    """
    genre_word_weights: dict[str, dict[str, list]] = {}

    for genre, book_list in books_data['genres'].items():
        genre_word_weights[genre] = {}
        for book in book_list:
            gid = str(book['gutenberg_id'])
            words_path = features_dir / f'words_{gid}_w{window}.json'
            weights_path = features_dir / f'tfidf_{gid}_w{window}.npy'
            if not (words_path.exists() and weights_path.exists()):
                log.warning(f'  Missing features for {gid}, skipping TF-IDF entry')
                continue
            with open(words_path) as f:
                words_data = json.load(f)
            words = words_data['words'] if isinstance(words_data, dict) else words_data
            weights = np.load(str(weights_path), allow_pickle=False)
            book_tfidf = {w: float(v) for w, v in zip(words, weights)}
            # Cache per-book TF-IDF
            bk = cache_key('tfidf_book', {'gutenberg_id': gid, 'window': window})
            if not cache_exists(bk):
                cache_put(bk, book_tfidf)
            # Accumulate for genre aggregate
            for w, v in book_tfidf.items():
                genre_word_weights[genre].setdefault(w, []).append(v)

    # Average per genre
    genre_tfidf: dict[str, dict[str, float]] = {}
    for genre, word_lists in genre_word_weights.items():
        genre_tfidf[genre] = {w: float(np.mean(vals)) for w, vals in word_lists.items()}
        gk = cache_key('tfidf_genre', {'genre': genre, 'window': window})
        if not cache_exists(gk):
            cache_put(gk, genre_tfidf[genre])
        log.info(f'  Cached TF-IDF for genre: {genre} ({len(genre_tfidf[genre])} words)')

    return genre_tfidf


def precompute_viz(window: int = None, force: bool = False) -> None:
    """Main entry point: compute all viz data and cache to disk.

    Args:
        window: Word2Vec window size override. If None, reads from params.yaml.
        force: If True, recompute even if cached results exist.
    """
    params = load_params()
    if window is None:
        window = params['word2vec']['window']

    project_root = Path(__file__).resolve().parents[2]
    models_dir = project_root / 'data' / 'models'
    features_dir = project_root / 'data' / 'features'

    # Load Word2Vec model
    from gensim.models import Word2Vec
    model_path = models_dir / f'word2vec_w{window}.model'
    if not model_path.exists():
        log.error(f'Word2Vec model not found at {model_path}')
        log.error('Run python -m backend.pipeline.precompute first.')
        return

    log.info(f'Loading Word2Vec (window={window})...')
    w2v_model = Word2Vec.load(str(model_path))
    words, vectors = _load_word_vectors(w2v_model)

    # Load corpus metadata
    corpus_path = project_root / 'corpus' / 'books.yaml'
    with open(corpus_path) as f:
        books_data = yaml.safe_load(f)

    # Build word->genre mapping from corpus (dominant genre for each word)
    log.info('Building word->genre map...')
    genre_names = list(books_data['genres'].keys())
    # Simple approach: assign each word to the genre with highest avg TF-IDF
    genre_tfidf = _load_tfidf_by_genre(books_data, features_dir, window)
    word_to_genre: dict[str, str] = {}
    for word in words:
        best_genre = 'literary'  # fallback
        best_weight = -1.0
        for genre, tfidf_map in genre_tfidf.items():
            w = tfidf_map.get(word, 0.0)
            if w > best_weight:
                best_weight = w
                best_genre = genre
        word_to_genre[word] = best_genre

    # Compute global TF-IDF weight per word (max across all genres)
    global_tfidf: dict[str, float] = {}
    for word in words:
        max_w = max((g.get(word, 0.0) for g in genre_tfidf.values()), default=0.0)
        global_tfidf[word] = max_w

    # Pre-compute nearest neighbors (done once, shared across projections)
    neighbors_key = cache_key('viz_neighbors', {'window': window})
    if not force and cache_exists(neighbors_key):
        log.info('Loading cached neighbors...')
        neighbors_data = cache_get(neighbors_key)
    else:
        log.info(f'Computing top-{N_NEIGHBORS} neighbors for {len(words)} words...')
        neighbors_list = _compute_neighbors(vectors, words, n=N_NEIGHBORS)
        neighbors_data = neighbors_list  # list of lists of dicts
        cache_put(neighbors_key, neighbors_data)
        log.info('Neighbors cached.')

    # Compute and cache each projection
    for method in PROJECTIONS:
        proj_key = cache_key('scatter', {'projection': method, 'window': window})
        if not force and cache_exists(proj_key):
            log.info(f'  Projection {method}: already cached, skipping')
            continue

        log.info(f'  Computing {method} projection on {len(words)} words...')
        coords = _project(vectors, method)
        coords = _normalize_coords(coords)
        log.info(f'  {method} done, shape={coords.shape}')

        # Build scatter point list
        scatter_points = []
        for i, word in enumerate(words):
            scatter_points.append({
                'word': word,
                'genre': word_to_genre[word],
                'x': float(coords[i, 0]),
                'y': float(coords[i, 1]),
                'z': float(coords[i, 2]),
                'tfidf_weight': float(global_tfidf.get(word, 0.0)),
                'neighbors': neighbors_data[i] if isinstance(neighbors_data, list) else [],
            })

        cache_put(proj_key, {'projection': method, 'points': scatter_points})
        log.info(f'  Cached {method}: {len(scatter_points)} points')

    log.info('precompute_viz scatter complete.')

    # Pre-compute persistence images (after scatter precompute)
    precompute_persistence_images(window=window, force=force)

    log.info('precompute_viz complete.')


def get_cached_scatter(projection: str, window: int) -> dict | None:
    """Retrieve pre-computed scatter data for a projection. Returns None if not cached."""
    key = cache_key('scatter', {'projection': projection, 'window': window})
    return cache_get(key)


def get_cached_tfidf_genre(genre: str, window: int) -> dict | None:
    key = cache_key('tfidf_genre', {'genre': genre, 'window': window})
    return cache_get(key)


def get_cached_tfidf_book(gutenberg_id: str, window: int) -> dict | None:
    key = cache_key('tfidf_book', {'gutenberg_id': gutenberg_id, 'window': window})
    return cache_get(key)


def precompute_persistence_images(window: int = None, force: bool = False) -> None:
    """Pre-compute persistence images for all genres and books.

    For each genre and homology dimension (0, 1, optionally 2), produces an M*M
    flat persistence image vector with vmin/vmax metadata. Stores results in cache.
    """
    params = load_params()
    if window is None:
        window = params['word2vec']['window']

    project_root = Path(__file__).resolve().parents[2]
    models_dir = project_root / 'data' / 'models'
    features_dir = project_root / 'data' / 'features'

    # Load persistence imager
    imager_path = models_dir / 'persistence_imager.joblib'
    if not imager_path.exists():
        log.warning(f'persistence_imager.joblib not found at {imager_path}, skipping persistence image precompute')
        return

    persistence_imager = joblib.load(str(imager_path))

    # Load corpus metadata
    corpus_path = project_root / 'corpus' / 'books.yaml'
    if not corpus_path.exists():
        log.warning(f'books.yaml not found at {corpus_path}, skipping persistence image precompute')
        return

    with open(corpus_path) as f:
        books_data = yaml.safe_load(f)

    grid_resolution = params.get('features', {}).get('grid_resolution', 20)

    from backend.pipeline.features import diagram_to_birth_persistence

    homology_dims = [0, 1]
    # Check if any H2 data exists
    sample_book = None
    for genre, book_list in books_data['genres'].items():
        if book_list:
            sample_book = book_list[0]
            break
    if sample_book:
        gid = str(sample_book['gutenberg_id'])
        diag_path = features_dir / f'diagrams_{gid}_w{window}.npy'
        if diag_path.exists():
            diag = np.load(str(diag_path), allow_pickle=True)
            if diag.shape[0] > 0 and np.any(diag[0][:, 2] == 2):
                homology_dims.append(2)
                log.info('H2 data detected, including dimension 2')

    # Per-genre persistence images
    for genre, book_list in books_data['genres'].items():
        for dim in homology_dims:
            ck = cache_key('persistence_image', {'genre': genre, 'dim': dim, 'window': window})
            if not force and cache_exists(ck):
                log.info(f'  Persistence image {genre} dim={dim}: already cached')
                continue

            # Aggregate all books' diagrams for this genre
            all_bp = []
            for book in book_list:
                gid = str(book['gutenberg_id'])
                diag_path = features_dir / f'diagrams_{gid}_w{window}.npy'
                if not diag_path.exists():
                    continue
                diagrams = np.load(str(diag_path), allow_pickle=True)
                bp = diagram_to_birth_persistence(diagrams, dim=dim)
                if len(bp) > 0:
                    all_bp.append(bp)

            if not all_bp:
                log.warning(f'  No diagram data for {genre} dim={dim}')
                continue

            merged_bp = np.concatenate(all_bp, axis=0)
            pi_vector = persistence_imager(merged_bp)
            M = grid_resolution
            pi_data = pi_vector.tolist()
            vmin = float(np.min(pi_vector))
            vmax = float(np.max(pi_vector))

            cache_put(ck, {
                'data': pi_data,
                'M': M,
                'dim': dim,
                'vmin': vmin,
                'vmax': vmax,
            })
            log.info(f'  Cached persistence image: {genre} dim={dim} M={M} range=[{vmin:.4f}, {vmax:.4f}]')

    # Per-book persistence images
    for genre, book_list in books_data['genres'].items():
        for book in book_list:
            gid = str(book['gutenberg_id'])
            for dim in homology_dims:
                bk = cache_key('persistence_image_book', {'gutenberg_id': gid, 'dim': dim, 'window': window})
                if not force and cache_exists(bk):
                    continue

                diag_path = features_dir / f'diagrams_{gid}_w{window}.npy'
                if not diag_path.exists():
                    continue
                diagrams = np.load(str(diag_path), allow_pickle=True)
                bp = diagram_to_birth_persistence(diagrams, dim=dim)
                if len(bp) == 0:
                    continue

                pi_vector = persistence_imager(bp)
                M = grid_resolution
                cache_put(bk, {
                    'data': pi_vector.tolist(),
                    'M': M,
                    'dim': dim,
                    'vmin': float(np.min(pi_vector)),
                    'vmax': float(np.max(pi_vector)),
                })

    log.info('Persistence image precompute complete.')


def get_cached_persistence_image(genre_or_book: str, dim: int, window: int, is_book: bool = False) -> dict | None:
    """Retrieve cached persistence image for a genre or book."""
    if is_book:
        key = cache_key('persistence_image_book', {'gutenberg_id': genre_or_book, 'dim': dim, 'window': window})
    else:
        key = cache_key('persistence_image', {'genre': genre_or_book, 'dim': dim, 'window': window})
    return cache_get(key)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Pre-compute viz projections')
    parser.add_argument('--window', type=int, default=None)
    parser.add_argument('--force', action='store_true', help='Recompute even if cached')
    args = parser.parse_args()
    precompute_viz(window=args.window, force=args.force)
