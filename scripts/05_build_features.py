#!/usr/bin/env python3
"""Build feature vectors: custom 400D persistence image + K-means cluster distribution.

Persistence image uses independent 20-bin resolution per axis (birth and persistence
axes each divided into 20 equal parts over their global range), always producing
exactly 400D output regardless of axis length mismatch.

Feature matrix is saved WITHOUT alpha applied so that script 06 can sweep alpha
without re-running this script:
  feature_matrix_w{W}_k{K}.npy  shape (n_books, 400 + K)
  Column layout: [topo_norm (400D) | loc_norm (K-D)]
  Script 06 applies: alpha * topo_norm + (1-alpha) * loc_norm at load time.

Usage:
  python scripts/05_build_features.py --window 5 --k-clusters 50
"""

import sys
import json
import time
import argparse
from pathlib import Path

import numpy as np
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent))
from utils import load_params


# ---------------------------------------------------------------------------
# Custom 400D persistence image
# ---------------------------------------------------------------------------

def giotto_to_birth_pers(diagrams, dim):
    """Convert giotto-tda diagram to (birth, persistence) pairs for given dim."""
    diag = diagrams[0]
    mask = diag[:, 2] == dim
    bd = diag[mask, :2]
    valid = (bd[:, 0] < bd[:, 1]) & np.isfinite(bd[:, 1])
    bd = bd[valid]
    if len(bd) == 0:
        return np.zeros((0, 2))
    return np.stack([bd[:, 0], bd[:, 1] - bd[:, 0]], axis=1)  # (birth, persistence)


def build_persistence_imager(all_diagrams, grid_resolution, sigma):
    """Fit a global grid over all (birth, persistence) points.

    Returns a transform function that maps one diagram -> 400D vector.
    Grid axes are independent: each gets grid_resolution equal bins over
    its own global range, so output is always exactly grid_resolution^2 D.
    """
    all_pts = np.concatenate([d for d in all_diagrams if len(d) > 0], axis=0)
    if len(all_pts) == 0:
        def zero_transform(diag):
            return np.zeros(grid_resolution ** 2)
        return zero_transform

    b_min, b_max = all_pts[:, 0].min(), all_pts[:, 0].max()
    p_min, p_max = all_pts[:, 1].min(), all_pts[:, 1].max()

    # Avoid degenerate single-point axes
    if b_max == b_min:
        b_min, b_max = b_min - 0.5, b_max + 0.5
    if p_max == p_min:
        p_min, p_max = p_min - 0.5, p_max + 0.5

    # 20 bin centres per axis, independent resolution
    b_centres = np.linspace(b_min, b_max, grid_resolution)
    p_centres = np.linspace(p_min, p_max, grid_resolution)
    B, P = np.meshgrid(b_centres, p_centres, indexing='ij')  # (R, R)
    grid = np.stack([B.ravel(), P.ravel()], axis=1)          # (R^2, 2)

    two_sigma_sq = 2.0 * sigma ** 2

    def transform(diagram):
        """diagram: (n, 2) array of (birth, persistence) pairs -> R^2-D vector."""
        if len(diagram) == 0:
            return np.zeros(grid_resolution ** 2)
        births = diagram[:, 0]
        perss = diagram[:, 1]
        weights = perss  # weight by persistence value
        # diff: (R^2, n, 2)
        diff = grid[:, np.newaxis, :] - np.stack([births, perss], axis=1)[np.newaxis, :, :]
        sq_dist = np.sum(diff ** 2, axis=2)          # (R^2, n)
        gaussians = np.exp(-sq_dist / two_sigma_sq)  # (R^2, n)
        return gaussians @ weights                    # (R^2,)

    return transform


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Build feature vectors")
    parser.add_argument('--window', type=int, required=True,
                        help='Word2Vec window size (must match trained model and diagrams)')
    parser.add_argument('--k-clusters', type=int)
    parser.add_argument('--grid-resolution', type=int)
    parser.add_argument('--sigma', type=float)
    parser.add_argument('--adaptive', action='store_true',
                        help='Use adaptive-epsilon diagrams (_adap suffix)')
    args = parser.parse_args()

    overrides = {}
    if args.k_clusters is not None:
        overrides['features.k_clusters'] = args.k_clusters
    if args.grid_resolution is not None:
        overrides['features.grid_resolution'] = args.grid_resolution
    if args.sigma is not None:
        overrides['features.sigma'] = args.sigma

    params = load_params(overrides)
    window = args.window
    grid_resolution = params['features']['grid_resolution']
    sigma = params['features']['sigma']
    k_clusters = params['features']['k_clusters']
    adap = args.adaptive
    diag_suffix = '_adap' if adap else ''
    mat_suffix  = '_adap' if adap else ''

    features_dir = Path(__file__).parent.parent / 'data' / 'features'
    models_dir = Path(__file__).parent.parent / 'data' / 'models'

    # --- Load all diagrams ---
    if adap:
        diagram_files = sorted(features_dir.glob(f'diagrams_*_w{window}_adap.npy'))
    else:
        # fixed: exclude _adap files
        diagram_files = [f for f in sorted(features_dir.glob(f'diagrams_*_w{window}.npy'))
                         if '_adap' not in f.stem]
    if not diagram_files:
        flag = '--adaptive' if adap else ''
        print(f"ERROR: No {'adaptive ' if adap else ''}diagram files for window={window}. "
              f"Run 04_compute_homology.py --window {window} {flag} first.")
        sys.exit(1)

    gids = []
    for df in diagram_files:
        stem = df.stem  # diagrams_{gid}_w{window}[_adap]
        gid = stem.replace('diagrams_', '').replace(f'_w{window}{diag_suffix}', '')
        gids.append(gid)

    # Load corpus metadata for labels
    import yaml
    corpus_path = Path(__file__).parent.parent / 'corpus' / 'books.yaml'
    with open(corpus_path) as f:
        books_data = yaml.safe_load(f)
    id_to_genre = {}
    genre_to_label = {}
    label_counter = 0
    for genre, books in books_data['genres'].items():
        if genre not in genre_to_label:
            genre_to_label[genre] = label_counter
            label_counter += 1
        for book in books:
            id_to_genre[str(book['gutenberg_id'])] = genre

    # --- Step 1: Load H1 diagrams and convert to (birth, persistence) ---
    t0 = time.time()
    all_h1 = []
    for gid in gids:
        raw = np.load(str(features_dir / f'diagrams_{gid}_w{window}{diag_suffix}.npy'))
        all_h1.append(giotto_to_birth_pers(raw, dim=1))
    print(f"Loaded {len(gids)} diagrams (window={window})... done ({time.time()-t0:.1f}s)")

    # --- Step 2: Fit global persistence imager ---
    t0 = time.time()
    print(f"Fitting persistence imager (grid={grid_resolution}x{grid_resolution}={grid_resolution**2}D, "
          f"sigma={sigma})...", end=' ', flush=True)
    transform_h1 = build_persistence_imager(all_h1, grid_resolution, sigma)
    print(f"done ({time.time()-t0:.1f}s)")
    print(f"Persistence image: H1 {grid_resolution}x{grid_resolution} = {grid_resolution**2}D "
          f"(H0 dropped: degenerate birth axis)")

    # --- Step 3: K-means on word vectors ---
    t0 = time.time()
    print(f"K-means clustering: {k_clusters} clusters (window={window})...", end=' ', flush=True)

    kmeans_path = models_dir / f'kmeans_w{window}_k{k_clusters}.pkl'
    import joblib
    if kmeans_path.exists():
        kmeans = joblib.load(str(kmeans_path))
        tqdm.write(f"  loaded cached K-means from {kmeans_path.name}")
    else:
        from gensim.models import Word2Vec
        from sklearn.cluster import KMeans
        model = Word2Vec.load(str(models_dir / f'word2vec_w{window}.model'))
        all_vectors = model.wv.vectors
        kmeans = KMeans(n_clusters=k_clusters, random_state=42, n_init=10)
        kmeans.fit(all_vectors)
        joblib.dump(kmeans, str(kmeans_path))

    # Build word -> cluster mapping
    from gensim.models import Word2Vec
    w2v_model = Word2Vec.load(str(models_dir / f'word2vec_w{window}.model'))
    all_words = list(w2v_model.wv.key_to_index.keys())
    word_to_cluster = {word: int(kmeans.labels_[i]) for i, word in enumerate(all_words)}
    print(f"done ({time.time()-t0:.1f}s, {len(all_words):,} words)")

    # --- Step 4+5: Build per-book feature vectors ---
    feature_matrix = []
    labels = []
    book_order = []
    total = len(gids)

    bar = tqdm(enumerate(gids), total=total, desc=f"Features w={window} k={k_clusters}",
               unit="book", dynamic_ncols=True)
    for i, gid in bar:
        bar.set_postfix(gid=gid)

        # Topology track: 400D persistence image, L2-normalised
        h1_img = transform_h1(all_h1[i])
        topo_norm = h1_img / (np.linalg.norm(h1_img) + 1e-10)

        # Location track: K-D cluster histogram, L2-normalised
        words_file = features_dir / f'words_{gid}_w{window}.json'
        with open(words_file) as f:
            words_data = json.load(f)
        book_words = words_data['words']
        tfidf_weights = np.load(str(features_dir / f'tfidf_{gid}_w{window}.npy'))

        cluster_dist = np.zeros(k_clusters)
        for j, word in enumerate(book_words[:len(tfidf_weights)]):
            if word in word_to_cluster:
                cluster_dist[word_to_cluster[word]] += tfidf_weights[j]
        loc_norm = cluster_dist / (np.linalg.norm(cluster_dist) + 1e-10)

        # Save raw concatenation WITHOUT alpha — script 06 applies alpha during sweep
        feature = np.concatenate([topo_norm, loc_norm])  # (400 + K,)
        feature_matrix.append(feature)

        genre = id_to_genre.get(str(gid), 'unknown')
        label = genre_to_label.get(genre, -1)
        labels.append(label)
        book_order.append({'gutenberg_id': gid, 'genre': genre, 'label': label})

    # --- Step 6: Save ---
    X = np.array(feature_matrix)
    y = np.array(labels)

    matrix_path = features_dir / f'feature_matrix_w{window}_k{k_clusters}{mat_suffix}.npy'
    np.save(str(matrix_path), X)
    np.save(str(features_dir / 'labels.npy'), y)
    with open(features_dir / 'book_order.json', 'w') as f:
        json.dump(book_order, f, indent=2)

    print(f"\nFeature matrix: {X.shape} -> {matrix_path.name}")
    print(f"Layout: topo(:{grid_resolution**2}) | loc({grid_resolution**2}:{grid_resolution**2+k_clusters})")
    print(f"Labels: {y.shape} -- {dict(zip(*np.unique(y, return_counts=True)))}")


if __name__ == '__main__':
    main()
