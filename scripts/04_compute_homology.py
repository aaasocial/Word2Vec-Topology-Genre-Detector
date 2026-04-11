#!/usr/bin/env python3
"""Compute weighted Vietoris-Rips persistent homology per book."""

import sys
import time
import argparse
import multiprocessing
from pathlib import Path

import numpy as np
from scipy.spatial.distance import pdist, squareform

sys.path.insert(0, str(Path(__file__).parent))
from utils import load_params


def compute_weighted_distance_matrix(vectors, tfidf_weights):
    """Custom weighted distance matrix d(i,j) / (w_i + w_j)."""
    raw_dist = squareform(pdist(vectors, metric='euclidean'))
    weight_sums = tfidf_weights[:, None] + tfidf_weights[None, :]
    weight_sums = np.maximum(weight_sums, 1e-10)
    weighted_dist = raw_dist / weight_sums
    np.fill_diagonal(weighted_dist, 0.0)
    return weighted_dist


def _compute_vr_worker(dist_matrix, homology_dims, epsilon_max, result_queue):
    """Run in a subprocess for timeout support."""
    try:
        from gtda.homology import VietorisRipsPersistence
        vr = VietorisRipsPersistence(
            metric='precomputed',
            homology_dimensions=homology_dims,
            max_edge_length=epsilon_max,
            n_jobs=1,
        )
        diagrams = vr.fit_transform(dist_matrix[np.newaxis, :, :])
        result_queue.put(('ok', diagrams))
    except Exception as e:
        result_queue.put(('error', str(e)))


def compute_homology_with_timeout(dist_matrix, homology_dims, epsilon_max, timeout):
    """Compute VR homology with subprocess timeout (Windows-compatible)."""
    result_queue = multiprocessing.Queue()
    p = multiprocessing.Process(
        target=_compute_vr_worker,
        args=(dist_matrix, homology_dims, epsilon_max, result_queue)
    )
    p.start()
    p.join(timeout=timeout)
    if p.is_alive():
        p.terminate()
        p.join()
        return None  # timed out
    if not result_queue.empty():
        status, result = result_queue.get()
        if status == 'ok':
            return result
    return None  # error


def main():
    parser = argparse.ArgumentParser(description="Compute persistent homology per book")
    parser.add_argument('--max-words', type=int, help='Max words per book')
    parser.add_argument('--timeout', type=float, help='Timeout per book in seconds')
    parser.add_argument('--epsilon-max', type=float, help='Max filtration radius')
    args = parser.parse_args()

    overrides = {}
    if args.max_words is not None:
        overrides['homology.max_words'] = args.max_words
    if args.timeout is not None:
        overrides['homology.timeout'] = args.timeout
    if args.epsilon_max is not None:
        overrides['homology.epsilon_max'] = args.epsilon_max

    params = load_params(overrides)
    max_words = params['homology']['max_words']
    timeout = params['homology']['timeout']
    retry_step = params['homology']['retry_step']
    min_words = params['homology']['min_words']
    homology_dims = params['homology']['homology_dimensions']
    epsilon_max = params['homology']['epsilon_max']

    features_dir = Path(__file__).parent.parent / 'data' / 'features'
    vector_files = sorted(features_dir.glob('vectors_*.npy'))

    if not vector_files:
        print("ERROR: No vector files found. Run 03_train_embeddings.py first.")
        sys.exit(1)

    total = len(vector_files)
    skipped = []

    for i, vf in enumerate(vector_files, 1):
        gid = vf.stem.replace('vectors_', '')
        tfidf_file = features_dir / f'tfidf_{gid}.npy'

        vectors = np.load(str(vf))
        tfidf_weights = np.load(str(tfidf_file))

        current_max = min(max_words, len(vectors))
        success = False

        while current_max >= min_words:
            vecs = vectors[:current_max]
            weights = tfidf_weights[:current_max]

            dist_matrix = compute_weighted_distance_matrix(vecs, weights)

            t_start = time.time()
            print(f"[{i}/{total}] Book {gid}: {current_max} words, computing homology...",
                  end=' ', flush=True)

            diagrams = compute_homology_with_timeout(
                dist_matrix, homology_dims, epsilon_max, timeout
            )

            elapsed = time.time() - t_start

            if diagrams is not None:
                print(f"done ({elapsed:.1f}s)")
                np.save(str(features_dir / f'diagrams_{gid}.npy'), diagrams)
                success = True
                break
            else:
                print(f"timed out ({elapsed:.1f}s)")
                next_max = current_max - retry_step
                if next_max < min_words:
                    print(f"  WARNING: Book {gid} failed at {min_words} words — skipping")
                    break
                print(f"  Retrying at {next_max} words...")
                current_max = next_max

        if not success:
            skipped.append(gid)

    print(f"\nDone: {total - len(skipped)}/{total} books processed")
    if skipped:
        print(f"Skipped (timeout): {skipped}")


if __name__ == '__main__':
    multiprocessing.freeze_support()
    main()
