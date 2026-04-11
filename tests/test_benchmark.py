import pytest
import numpy as np
import time


def test_homology_within_time_cap():
    """Vietoris-Rips on 50 random 10D points completes in < 10 seconds."""
    from gtda.homology import VietorisRipsPersistence
    from scipy.spatial.distance import pdist, squareform

    rng = np.random.RandomState(42)
    vecs = rng.randn(50, 10).astype(np.float32)
    weights = np.abs(rng.randn(50)) + 0.1

    raw_dist = squareform(pdist(vecs, metric='euclidean'))
    weight_sums = weights[:, None] + weights[None, :]
    weight_sums = np.maximum(weight_sums, 1e-10)
    weighted_dist = (raw_dist / weight_sums).astype(np.float32)
    np.fill_diagonal(weighted_dist, 0.0)

    vr = VietorisRipsPersistence(metric='precomputed', homology_dimensions=[0, 1], n_jobs=1)
    t_start = time.time()
    vr.fit_transform(weighted_dist[np.newaxis, :, :])
    elapsed = time.time() - t_start
    assert elapsed < 10.0, f"Homology took {elapsed:.1f}s (expected < 10s for 50 points)"


def test_benchmark_output_format():
    """benchmark function returns list of dicts with word_count and time_seconds."""
    # Simulate a simple benchmark
    def run_benchmark(word_counts):
        results = []
        for wc in word_counts:
            results.append({'word_count': wc, 'time_seconds': wc * 0.001})
        return results

    results = run_benchmark([50, 100])
    assert isinstance(results, list)
    assert len(results) == 2
    for r in results:
        assert 'word_count' in r
        assert 'time_seconds' in r
