#!/usr/bin/env python3
"""Benchmark Vietoris-Rips computation time vs word count."""

import sys
import json
import time
import argparse
from pathlib import Path

import numpy as np
from scipy.spatial.distance import pdist, squareform

sys.path.insert(0, str(Path(__file__).parent))
from utils import load_params


def compute_weighted_distance_matrix(vectors, tfidf_weights):
    raw_dist = squareform(pdist(vectors, metric='euclidean'))
    weight_sums = tfidf_weights[:, None] + tfidf_weights[None, :]
    weight_sums = np.maximum(weight_sums, 1e-10)
    weighted_dist = raw_dist / weight_sums
    np.fill_diagonal(weighted_dist, 0.0)
    return weighted_dist


def run_benchmark(vectors, tfidf_weights, word_counts, homology_dims, epsilon_max, timeout):
    from gtda.homology import VietorisRipsPersistence
    results = []
    for wc in word_counts:
        n = min(wc, len(vectors))
        vecs = vectors[:n]
        weights = tfidf_weights[:n]
        dist_matrix = compute_weighted_distance_matrix(vecs, weights)

        t_start = time.time()
        try:
            vr = VietorisRipsPersistence(
                metric='precomputed',
                homology_dimensions=homology_dims,
                max_edge_length=epsilon_max,
                n_jobs=1,
            )
            diagrams = vr.fit_transform(dist_matrix[np.newaxis, :, :])
            elapsed = time.time() - t_start
            diag = diagrams[0]
            n_h0 = int(np.sum(diag[:, 2] == 0))
            n_h1 = int(np.sum(diag[:, 2] == 1))
            timed_out = False
        except Exception as e:
            elapsed = time.time() - t_start
            n_h0 = n_h1 = 0
            timed_out = True

        result = {
            'word_count': n,
            'time_seconds': elapsed,
            'n_features_h0': n_h0,
            'n_features_h1': n_h1,
            'timed_out': timed_out,
        }
        results.append(result)
        status = "TIMEOUT" if timed_out else f"{elapsed:.2f}s"
        print(f"  word_count={n}: {status} ({n_h0} H0 features, {n_h1} H1 features)")
    return results


def main():
    parser = argparse.ArgumentParser(description="Benchmark Vietoris-Rips timing")
    parser.add_argument('--word-counts', type=str, default='100,200,300,400,500',
                        help='Comma-separated word counts to benchmark')
    parser.add_argument('--timeout', type=float, default=30.0,
                        help='Timeout per benchmark point in seconds')
    args = parser.parse_args()

    params = load_params()
    word_counts = [int(x) for x in args.word_counts.split(',')]
    homology_dims = params['homology']['homology_dimensions']
    epsilon_max = params['homology']['epsilon_max']

    features_dir = Path(__file__).parent.parent / 'data' / 'features'
    vector_files = sorted(features_dir.glob('vectors_*.npy'))
    if not vector_files:
        print("ERROR: No vector files found. Run 03_train_embeddings.py first.")
        sys.exit(1)

    # Use the largest book for worst-case testing
    largest_file = max(vector_files, key=lambda f: np.load(str(f)).shape[0])
    gid = largest_file.stem.replace('vectors_', '')
    vectors = np.load(str(largest_file))
    tfidf_weights = np.load(str(features_dir / f'tfidf_{gid}.npy'))

    print(f"Benchmarking on book {gid} ({len(vectors)} words available)")
    print(f"Word counts: {word_counts}")
    print()

    results = run_benchmark(vectors, tfidf_weights, word_counts, homology_dims, epsilon_max, args.timeout)

    print()
    print("── Benchmark: Vietoris-Rips vs Word Count ────────")
    print(f"{'Words':<8} {'Time (s)':>10}  {'H0 feats':>9}  {'H1 feats':>9}")
    for r in results:
        status = "TIMEOUT" if r['timed_out'] else f"{r['time_seconds']:.2f}"
        print(f"{r['word_count']:<8} {status:>10}  {r['n_features_h0']:>9}  {r['n_features_h1']:>9}")
    print("──────────────────────────────────────────────────")

    under_cap = [r for r in results if not r['timed_out'] and r['time_seconds'] < 10.0]
    if under_cap:
        safe_cap = max(r['word_count'] for r in under_cap)
        print(f"\nSafe max_words cap: {safe_cap} (under 10s target)")
    else:
        print("\nWARNING: No word counts completed under the 10s cap")

    results_dir = Path(__file__).parent.parent / 'results'
    results_dir.mkdir(parents=True, exist_ok=True)
    with open(results_dir / 'benchmark.json', 'w') as f:
        json.dump(results, f, indent=2)
    print(f"Results saved to results/benchmark.json")


if __name__ == '__main__':
    main()
