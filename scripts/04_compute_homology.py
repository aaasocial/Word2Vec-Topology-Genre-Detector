#!/usr/bin/env python3
"""Compute weighted Vietoris-Rips persistent homology per book.

Loads per-window vectors and TF-IDF weights, runs in-process VR (no subprocess
overhead), saves per-window diagrams.

Usage:
  python scripts/04_compute_homology.py --window 5
  python scripts/04_compute_homology.py --window 10
"""

import sys
import time
import argparse
from pathlib import Path

import numpy as np
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent))
from utils import load_params


def build_dist_matrix(vectors, tfidf_weights):
    """Weighted distance matrix: D_ij = ||v_i-v_j|| / (w_i+w_j), w in [0,1]."""
    from scipy.spatial.distance import pdist, squareform
    w = tfidf_weights / tfidf_weights.max()
    raw_dist = squareform(pdist(vectors, metric='euclidean'))
    weight_sums = np.maximum(w[:, None] + w[None, :], 1e-10)
    dist_matrix = raw_dist / weight_sums
    np.fill_diagonal(dist_matrix, 0.0)
    return dist_matrix


def adaptive_epsilon(dist_matrix, percentile=95):
    """Per-book epsilon: p-th percentile of off-diagonal distances."""
    upper = dist_matrix[np.triu_indices_from(dist_matrix, k=1)]
    upper = upper[upper > 0]
    if len(upper) == 0:
        return 1.0
    return float(np.percentile(upper, percentile))


def compute_homology(vectors, tfidf_weights, homology_dims, epsilon_max):
    """Compute VR persistent homology using ripser (no sklearn dependency).

    Returns array of shape (1, n_points, 3) with [birth, death, dimension].
    """
    from ripser import ripser
    dist_matrix = build_dist_matrix(vectors, tfidf_weights)
    max_dim = max(homology_dims)
    result = ripser(dist_matrix, maxdim=max_dim, thresh=epsilon_max,
                    distance_matrix=True)
    rows = []
    for dim in homology_dims:
        for birth, death in result['dgms'][dim]:
            rows.append([birth, death, float(dim)])
    arr = np.array(rows, dtype=np.float32) if rows else np.zeros((0, 3), dtype=np.float32)
    return arr[np.newaxis, :, :]           # shape (1, n_points, 3)


def main():
    parser = argparse.ArgumentParser(description="Compute persistent homology per book")
    parser.add_argument('--window', type=int, required=True,
                        help='Word2Vec window size (must match a trained model)')
    parser.add_argument('--epsilon-max', type=float)
    parser.add_argument('--max-words', type=int, default=500,
                        help='Cap word count to top-N by TF-IDF weight (default: 500). '
                             'Matches VR precompute cap for tractable computation.')
    parser.add_argument('--adaptive', action='store_true',
                        help='Use per-book adaptive epsilon (95th percentile of distances). '
                             'Saves diagrams_{gid}_w{W}_adap.npy')
    args = parser.parse_args()

    overrides = {}
    if args.epsilon_max is not None:
        overrides['homology.epsilon_max'] = args.epsilon_max

    params = load_params(overrides)
    homology_dims = params['homology']['homology_dimensions']
    global_epsilon = params['homology']['epsilon_max']
    window = args.window
    max_words = args.max_words
    suffix = '_adap' if args.adaptive else ''
    mode_str = 'adaptive-epsilon' if args.adaptive else f'epsilon_max={global_epsilon}'

    features_dir = Path(__file__).parent.parent / 'data' / 'features'
    vector_files = sorted(features_dir.glob(f'vectors_*_w{window}.npy'))

    if not vector_files:
        print(f"ERROR: No vector files found for window={window}. "
              f"Run 03_train_embeddings.py --window {window} first.")
        sys.exit(1)

    print(f"Mode: {mode_str}, max_words={max_words}")
    total = len(vector_files)
    failed = []

    bar = tqdm(vector_files, desc=f"Homology w={window}{suffix}", unit="book", dynamic_ncols=True)
    for vf in bar:
        stem = vf.stem
        gid = stem.replace('vectors_', '').replace(f'_w{window}', '')
        tfidf_file = features_dir / f'tfidf_{gid}_w{window}.npy'

        vectors = np.load(str(vf))
        tfidf_weights = np.load(str(tfidf_file))

        # Cap to top-N words by TF-IDF weight (matching VR precompute behaviour)
        if max_words and len(vectors) > max_words:
            top_idx = np.argsort(tfidf_weights)[::-1][:max_words]
            vectors = vectors[top_idx]
            tfidf_weights = tfidf_weights[top_idx]

        n = len(vectors)

        t_start = time.time()
        bar.set_postfix(gid=gid, words=n, status="computing")

        try:
            if args.adaptive:
                dm = build_dist_matrix(vectors, tfidf_weights)
                eps = adaptive_epsilon(dm)
                from ripser import ripser
                result = ripser(dm, maxdim=max(homology_dims), thresh=eps,
                                distance_matrix=True)
                rows = []
                for dim in homology_dims:
                    for birth, death in result['dgms'][dim]:
                        rows.append([birth, death, float(dim)])
                arr = np.array(rows, dtype=np.float32) if rows else np.zeros((0, 3), dtype=np.float32)
                diagrams = arr[np.newaxis, :, :]
            else:
                diagrams = compute_homology(vectors, tfidf_weights, homology_dims, global_epsilon)

            elapsed = time.time() - t_start
            bar.set_postfix(gid=gid, words=n, status=f"done {elapsed:.0f}s")
            tqdm.write(f"  [{gid}] {n} words -> done ({elapsed:.1f}s)"
                       + (f" eps={eps:.4f}" if args.adaptive else ""))
            np.save(str(features_dir / f'diagrams_{gid}_w{window}{suffix}.npy'), diagrams)
        except Exception as e:
            elapsed = time.time() - t_start
            tqdm.write(f"  [{gid}] {n} words -> ERROR ({elapsed:.0f}s): {e}")
            failed.append(gid)

    print(f"\nDone: {total - len(failed)}/{total} books processed (window={window}, {mode_str})")
    if failed:
        print(f"Failed: {failed}")


if __name__ == '__main__':
    main()
