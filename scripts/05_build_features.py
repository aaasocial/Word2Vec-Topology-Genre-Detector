#!/usr/bin/env python3
"""Build feature vectors: persistence images + cluster distribution."""

import sys
import json
import time
import argparse
from pathlib import Path

import numpy as np
from sklearn.cluster import KMeans
from persim import PersistenceImager

sys.path.insert(0, str(Path(__file__).parent))
from utils import load_params


def giotto_to_persim(diagrams, dim):
    """Convert giotto-tda diagram to persim format for given homology dimension."""
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


def main():
    parser = argparse.ArgumentParser(description="Build feature vectors from persistence diagrams")
    parser.add_argument('--grid-resolution', type=int)
    parser.add_argument('--sigma', type=float)
    parser.add_argument('--k-clusters', type=int)
    parser.add_argument('--alpha', type=float)
    args = parser.parse_args()

    overrides = {}
    if args.grid_resolution is not None:
        overrides['features.grid_resolution'] = args.grid_resolution
    if args.sigma is not None:
        overrides['features.sigma'] = args.sigma
    if args.k_clusters is not None:
        overrides['features.k_clusters'] = args.k_clusters
    if args.alpha is not None:
        overrides['features.alpha'] = args.alpha

    params = load_params(overrides)
    grid_resolution = params['features']['grid_resolution']
    sigma = params['features']['sigma']
    k_clusters = params['features']['k_clusters']
    alpha = params['features']['alpha']

    features_dir = Path(__file__).parent.parent / 'data' / 'features'
    models_dir = Path(__file__).parent.parent / 'data' / 'models'

    # Load book order from diagram files
    diagram_files = sorted(features_dir.glob('diagrams_*.npy'))
    if not diagram_files:
        print("ERROR: No diagram files found. Run 04_compute_homology.py first.")
        sys.exit(1)

    gids = [df.stem.replace('diagrams_', '') for df in diagram_files]

    # Load corpus metadata for labels
    corpus_path = Path(__file__).parent.parent / 'corpus' / 'books.yaml'
    import yaml
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

    # Step 1: Load all diagrams and convert to persim format
    t_start = time.time()
    all_h0_diagrams = []
    all_h1_diagrams = []
    for gid in gids:
        diagrams = np.load(str(features_dir / f'diagrams_{gid}.npy'))
        all_h0_diagrams.append(giotto_to_persim(diagrams, 0))
        all_h1_diagrams.append(giotto_to_persim(diagrams, 1))
    print(f"Loaded {len(gids)} persistence diagrams... done ({time.time()-t_start:.1f}s)")

    # Step 2: Fit persistence imager on all diagrams together
    t_start = time.time()
    print(f"Fitting PersistenceImager (grid_resolution={grid_resolution}, sigma={sigma})...",
          end=' ', flush=True)

    def fit_imager(all_diagrams, grid_resolution, sigma):
        valid = [d for d in all_diagrams if len(d) > 0]
        if not valid:
            return None
        pimgr = PersistenceImager(
            weight='persistence',
            kernel='gaussian',
            kernel_params={'sigma': sigma},
        )
        pimgr.fit(valid, skew=True)
        # Adjust pixel_size for target grid_resolution
        birth_span = pimgr.birth_range[1] - pimgr.birth_range[0]
        pers_span = pimgr.pers_range[1] - pimgr.pers_range[0]
        span = max(birth_span, pers_span, 1e-10)
        pimgr.pixel_size = span / grid_resolution
        return pimgr

    h0_imager = fit_imager(all_h0_diagrams, grid_resolution, sigma)
    h1_imager = fit_imager(all_h1_diagrams, grid_resolution, sigma)
    print(f"done ({time.time()-t_start:.1f}s)")

    def transform_diagram(pimgr, diag, grid_resolution):
        if pimgr is None or len(diag) == 0:
            return np.zeros(grid_resolution * grid_resolution)
        imgs = pimgr.transform([diag], skew=True)
        return imgs[0].flatten()

    # Determine image vector size
    sample_h0 = transform_diagram(h0_imager, all_h0_diagrams[0], grid_resolution)
    sample_h1 = transform_diagram(h1_imager, all_h1_diagrams[0], grid_resolution)
    img_size = len(sample_h0)
    print(f"Persistence images: H0 ({img_size}D), H1 ({img_size}D)")

    # Step 3: K-means clustering on all word vectors
    t_start = time.time()
    print(f"K-means clustering: {k_clusters} clusters...", end=' ', flush=True)
    from gensim.models import Word2Vec
    model = Word2Vec.load(str(models_dir / 'word2vec.model'))
    all_vectors = model.wv.vectors  # shape (vocab_size, vector_size)
    all_words = list(model.wv.key_to_index.keys())
    kmeans = KMeans(n_clusters=k_clusters, random_state=42, n_init=10)
    kmeans.fit(all_vectors)
    word_to_cluster = {word: int(kmeans.labels_[i]) for i, word in enumerate(all_words)}
    print(f"done ({time.time()-t_start:.1f}s, {len(all_vectors):,} words clustered)")

    # Step 4 & 5: Build feature vectors per book
    feature_matrix = []
    labels = []
    book_order = []
    total = len(gids)

    for i, gid in enumerate(gids, 1):
        t_start = time.time()
        print(f"[{i}/{total}] Book {gid}: building feature vector...", end=' ', flush=True)

        # Persistence images
        h0_img = transform_diagram(h0_imager, all_h0_diagrams[i-1], grid_resolution)
        h1_img = transform_diagram(h1_imager, all_h1_diagrams[i-1], grid_resolution)

        # L2-normalize
        h0_norm = h0_img / (np.linalg.norm(h0_img) + 1e-10)
        h1_norm = h1_img / (np.linalg.norm(h1_img) + 1e-10)

        # Cluster distribution
        words_file = features_dir / f'words_{gid}.json'
        with open(words_file) as f:
            words_data = json.load(f)
        book_words = words_data['words']
        tfidf_weights = np.load(str(features_dir / f'tfidf_{gid}.npy'))

        cluster_dist = np.zeros(k_clusters)
        for j, word in enumerate(book_words[:len(tfidf_weights)]):
            if word in word_to_cluster:
                cluster_dist[word_to_cluster[word]] += tfidf_weights[j]
        cluster_norm = cluster_dist / (np.linalg.norm(cluster_dist) + 1e-10)

        # Concatenate with alpha weighting
        structure_vec = np.concatenate([h0_norm, h1_norm])
        feature = np.concatenate([alpha * structure_vec, (1 - alpha) * cluster_norm])

        # Save individual feature
        np.save(str(features_dir / f'features_{gid}.npy'), feature)

        # Track genre label
        genre = id_to_genre.get(str(gid), 'unknown')
        label = genre_to_label.get(genre, -1)

        feature_matrix.append(feature)
        labels.append(label)
        book_order.append({'gutenberg_id': gid, 'genre': genre, 'label': label})

        elapsed = time.time() - t_start
        print(f"done ({len(feature)}D) ({elapsed:.1f}s)")

    # Step 6: Save combined feature matrix
    X = np.array(feature_matrix)
    y = np.array(labels)
    np.save(str(features_dir / 'feature_matrix.npy'), X)
    np.save(str(features_dir / 'labels.npy'), y)
    with open(features_dir / 'book_order.json', 'w') as f:
        json.dump(book_order, f, indent=2)

    print(f"\nFeature matrix: {X.shape} saved to data/features/feature_matrix.npy")
    print(f"Labels: {y.shape} — {dict(zip(*np.unique(y, return_counts=True)))}")


if __name__ == '__main__':
    main()
