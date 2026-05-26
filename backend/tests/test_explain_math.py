"""Phase 9 explain math tests.

Wave-0 (Plan 09-01) seeded the multiclass_brier_score + normalized_entropy
helpers inline; Wave-2 (this plan, 09-03) moves them to
backend.pipeline.explain and adds coverage for the rest of the explain spine:
zero-ablation contributions, nearest-neighbour math, driving-words, the
uncertainty/badge metric, top-N sum-to-1, and the explain cache key shape.
"""
import json
from pathlib import Path

import joblib
import numpy as np
import pytest

from backend.pipeline.explain import (
    TOPO_SLICE,
    VOCAB_SLICE,
    compute_driving_words,
    compute_track_contributions,
    compute_uncertainty_metrics,
    explain_cache_key,
    find_nearest_training_books,
    multiclass_brier_score,
    normalized_entropy,
)


REPO_ROOT = Path(__file__).resolve().parents[2]
FEATURE_VEC_FIXTURE = REPO_ROOT / "backend" / "tests" / "fixtures" / "feature_vec_sample.npy"
SVM_PATH = REPO_ROOT / "data" / "models" / "svm_pipeline.joblib"
ARTIFACTS_PATH = REPO_ROOT / "data" / "models" / "explain_artifacts.npz"
GENRE_NAMES_PATH = REPO_ROOT / "data" / "models" / "genre_names.json"
W2V_PATH = REPO_ROOT / "data" / "models" / "word2vec_w15.model"


# ---------------------------------------------------------------------------
# Pure-math tests (no LFS dependencies -- always run)
# ---------------------------------------------------------------------------


def test_brier_perfect_one_hot_equals_zero():
    y_true = [0, 1, 2]
    y_proba = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    assert multiclass_brier_score(y_true, y_proba, 3) == pytest.approx(0.0, abs=1e-12)


def test_brier_uniform_8_classes():
    # Uniform [1/8]*8 vs true class 0 -> (1-1/8)^2 + 7*(1/8)^2 = 49/64 + 7/64 = 0.875
    y_true = [0]
    y_proba = [[0.125] * 8]
    assert multiclass_brier_score(y_true, y_proba, 8) == pytest.approx(0.875, abs=1e-9)


def test_brier_range_bounded():
    rng = np.random.default_rng(42)
    y_true = rng.integers(0, 8, size=20)
    raw = rng.random((20, 8))
    y_proba = raw / raw.sum(axis=1, keepdims=True)
    val = multiclass_brier_score(y_true, y_proba, 8)
    assert 0.0 <= val <= 2.0


def test_entropy_uniform_equals_one():
    assert normalized_entropy([0.125] * 8) == pytest.approx(1.0, abs=1e-6)


def test_entropy_certain_equals_zero():
    p = [1.0] + [0.0] * 7
    assert normalized_entropy(p) == pytest.approx(0.0, abs=1e-6)


def test_entropy_range_bounded():
    rng = np.random.default_rng(42)
    for _ in range(20):
        raw = rng.random(8)
        p = raw / raw.sum()
        h = normalized_entropy(p)
        assert 0.0 <= h <= 1.0


# ---------------------------------------------------------------------------
# Uncertainty / badge tests (pure math; deterministic over crafted probabilities)
# ---------------------------------------------------------------------------


def test_uncertainty_metrics_keys_and_ranges():
    proba = np.array([0.4, 0.3, 0.15, 0.05, 0.04, 0.03, 0.02, 0.01])
    m = compute_uncertainty_metrics(proba)
    assert set(m.keys()) == {'entropy', 'top1_top2_gap', 'badge_fires'}
    assert 0.0 <= m['entropy'] <= 1.0
    assert -1.0 <= m['top1_top2_gap'] <= 1.0
    assert isinstance(m['badge_fires'], bool)


def test_uncertainty_badge_fires_on_low_gap():
    # gap = 0.05 < operative 0.2801 -> fires
    proba = np.array([0.20, 0.15, 0.13, 0.12, 0.11, 0.10, 0.10, 0.09])
    m = compute_uncertainty_metrics(proba)
    assert m['top1_top2_gap'] == pytest.approx(0.05, abs=1e-9)
    assert m['badge_fires'] is True


def test_uncertainty_badge_does_not_fire_when_certain():
    # gap = 0.85 >> 0.2801; entropy very low -> does NOT fire
    proba = np.array([0.90, 0.05, 0.01, 0.01, 0.01, 0.01, 0.005, 0.005])
    m = compute_uncertainty_metrics(proba)
    assert m['badge_fires'] is False


def test_uncertainty_badge_fires_on_high_entropy_with_wide_gap():
    # Construct a case where gap > 0.2801 but normalized entropy > 0.7738.
    # Top class 0.36 then 0.07*8 = 0.56 -> sum 0.92, plus 0.08 small = 1.0.
    proba = np.array([0.40, 0.10, 0.10, 0.10, 0.08, 0.08, 0.08, 0.06])
    m = compute_uncertainty_metrics(proba)
    assert m['top1_top2_gap'] == pytest.approx(0.30, abs=1e-9)
    assert m['entropy'] > 0.7738
    assert m['badge_fires'] is True


def test_uncertainty_thresholds_overridable():
    # Caller passes default research thresholds -> different fire decision.
    proba = np.array([0.40, 0.30, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05])
    # gap = 0.10. Operative threshold is 0.2801 -> fires.
    # Default research threshold 0.10 -> does NOT fire (strict <).
    m_op = compute_uncertainty_metrics(proba)
    m_lo = compute_uncertainty_metrics(
        proba,
        gap_threshold=0.10,
        entropy_threshold=0.99,
    )
    assert m_op['badge_fires'] is True
    assert m_lo['badge_fires'] is False


# ---------------------------------------------------------------------------
# Explain cache key tests
# ---------------------------------------------------------------------------


def test_explain_cache_key_format():
    feat = np.zeros(600, dtype=np.float64)
    lineage = {'w2v_model_sha256': 'cd81f9e69cb2d127' + 'aa' * 24}
    key = explain_cache_key(feat, lineage)
    assert key.startswith('explain:')
    parts = key.split(':')
    assert len(parts) == 3
    assert len(parts[1]) == 64  # sha256 hex
    assert len(parts[2]) == 16  # model_hash prefix


def test_explain_cache_key_changes_with_feature_vec():
    lineage = {'w2v_model_sha256': 'a' * 64}
    feat_a = np.zeros(600, dtype=np.float64)
    feat_b = feat_a.copy()
    feat_b[0] = 1.0
    assert explain_cache_key(feat_a, lineage) != explain_cache_key(feat_b, lineage)


def test_explain_cache_key_rotates_on_model_hash_change():
    feat = np.zeros(600, dtype=np.float64)
    lineage_a = {'w2v_model_sha256': 'a' * 64}
    lineage_b = {'w2v_model_sha256': 'b' * 64}
    assert explain_cache_key(feat, lineage_a) != explain_cache_key(feat, lineage_b)


# ---------------------------------------------------------------------------
# Track-contribution tests (mock-based; no LFS dependency)
# ---------------------------------------------------------------------------


class _FakeSvm:
    """Tiny SVM stand-in for zero-ablation batching: returns a deterministic
    proba that depends on the topology vs vocab slab energy."""

    def predict_proba(self, X):  # noqa: N802 (sklearn API casing)
        n_rows = X.shape[0]
        out = np.zeros((n_rows, 8))
        for i in range(n_rows):
            topo_energy = float(np.linalg.norm(X[i, TOPO_SLICE]))
            vocab_energy = float(np.linalg.norm(X[i, VOCAB_SLICE]))
            # Predicted class 0 weight grows with both slabs; uniform spread on the rest.
            weight_0 = 0.10 + 0.5 * topo_energy + 0.3 * vocab_energy
            rest = (1.0 - weight_0) / 7
            row = np.full(8, rest)
            row[0] = weight_0
            out[i] = np.clip(row, 1e-6, 1.0)
            out[i] /= out[i].sum()
        return out


def test_track_contributions_sum_to_100_mock():
    feat = np.zeros(600, dtype=np.float64)
    feat[TOPO_SLICE] = 0.4
    feat[VOCAB_SLICE] = 0.6
    c = compute_track_contributions(feat, _FakeSvm(), predicted_label_idx=0)
    total = c['topology']['pct'] + c['vocabulary']['pct']
    assert abs(total - 100.0) < 1e-6


def test_track_contributions_directions_are_valid_strings():
    feat = np.zeros(600, dtype=np.float64)
    feat[TOPO_SLICE] = 0.5
    feat[VOCAB_SLICE] = 0.5
    c = compute_track_contributions(feat, _FakeSvm(), predicted_label_idx=0)
    for slab in ('topology', 'vocabulary'):
        assert c[slab]['direction'] in ('+', '-', '0')


def test_track_contributions_uses_batched_predict_proba():
    """Verifies Pitfall 2: one batched (3, n_features) call, NOT three calls."""
    feat = np.zeros(600, dtype=np.float64)
    feat[TOPO_SLICE] = 0.3
    feat[VOCAB_SLICE] = 0.7

    call_log: list[tuple] = []

    class _RecordingSvm(_FakeSvm):
        def predict_proba(self, X):  # noqa: N802
            call_log.append(X.shape)
            return super().predict_proba(X)

    compute_track_contributions(feat, _RecordingSvm(), predicted_label_idx=0)
    assert len(call_log) == 1, f'expected 1 batched call, got {len(call_log)}'
    assert call_log[0] == (3, 600)


def test_track_contributions_zero_total_falls_back_50_50():
    """When zeroing neither slab changes the proba, return 50/50 zero direction."""

    class _ConstSvm:
        def predict_proba(self, X):  # noqa: N802
            return np.full((X.shape[0], 8), 1.0 / 8)

    feat = np.full(600, 0.3, dtype=np.float64)
    c = compute_track_contributions(feat, _ConstSvm(), predicted_label_idx=0)
    assert c['topology']['pct'] == pytest.approx(50.0)
    assert c['vocabulary']['pct'] == pytest.approx(50.0)
    assert c['topology']['direction'] == '0'
    assert c['vocabulary']['direction'] == '0'


# ---------------------------------------------------------------------------
# Nearest-neighbour math tests (mock-based; no LFS dependency)
# ---------------------------------------------------------------------------


def test_find_nearest_training_books_count_and_order():
    """Tests the consumer of NearestNeighbors output -- verifies the dict shape,
    that 5 entries come back, and that distance is ascending."""
    from sklearn.neighbors import NearestNeighbors

    rng = np.random.default_rng(0)
    fm = rng.standard_normal((20, 600)).astype(np.float32)
    # L2-normalize so it matches the runtime contract
    norms = np.linalg.norm(fm, axis=1, keepdims=True)
    fm = fm / (norms + 1e-10)
    nn = NearestNeighbors(n_neighbors=5, metric='euclidean').fit(fm)

    book_metadata = np.empty(20, dtype=object)
    for i in range(20):
        book_metadata[i] = {
            'gutenberg_id': str(i),
            'title': f'book{i}',
            'author': f'author{i}',
            'genre': 'romance',
        }

    feat = rng.standard_normal(600).astype(np.float32)
    feat = feat / (np.linalg.norm(feat) + 1e-10)

    out = find_nearest_training_books(feat, nn, book_metadata)
    assert len(out) == 5
    distances = [e['distance'] for e in out]
    assert distances == sorted(distances), f'distances not ascending: {distances}'
    for entry in out:
        assert entry['distance'] >= 0.0
        assert np.isfinite(entry['distance'])
        for key in ('gutenberg_id', 'title', 'author', 'genre', 'distance'):
            assert key in entry


# ---------------------------------------------------------------------------
# Driving-words math tests (mock-based; no LFS dependency)
# ---------------------------------------------------------------------------


class _FakeWv:
    """Tiny gensim-compatible word-vector index for driving-words math."""

    def __init__(self, table: dict[str, np.ndarray]):
        self._t = table
        self.key_to_index = {k: i for i, k in enumerate(table)}

    def __contains__(self, key):
        return key in self._t

    def get_vector(self, key):
        return self._t[key]


class _FakeW2v:
    def __init__(self, table):
        self.wv = _FakeWv(table)


def test_driving_words_sorted_tfidf_desc_alpha_tiebreak():
    rng = np.random.default_rng(7)
    table = {f'w{i}': rng.standard_normal(8).astype(np.float32) for i in range(10)}
    # Make 'apple' and 'banana' tied on tfidf -> alpha tiebreak puts 'apple' first
    table['apple'] = rng.standard_normal(8).astype(np.float32)
    table['banana'] = rng.standard_normal(8).astype(np.float32)
    words = ['banana', 'apple', 'w0', 'w1', 'w2']
    weights = np.array([0.5, 0.5, 0.9, 0.3, 0.1])

    centroids = rng.standard_normal((8, 8)).astype(np.float32)
    centroids = centroids / np.linalg.norm(centroids, axis=1, keepdims=True)
    genre_names = ['adventure', 'gothic_horror', 'historical', 'literary',
                   'mystery', 'romance', 'speculative', 'western']

    out = compute_driving_words(
        words, weights, _FakeW2v(table), centroids, genre_names, max_n=15,
    )
    # All 5 inputs are in vocab and max_n=15, so length == 5
    assert len(out) == 5
    # First should be 'w0' (highest tfidf 0.9), then alpha tie-break apple < banana
    assert out[0]['word'] == 'w0'
    assert out[1]['word'] == 'apple'
    assert out[2]['word'] == 'banana'
    # All nearest_genre values are members of the genre list
    for entry in out:
        assert entry['nearest_genre'] in genre_names


def test_driving_words_max_n_cap():
    rng = np.random.default_rng(11)
    table = {f'word{i}': rng.standard_normal(8).astype(np.float32) for i in range(40)}
    words = list(table.keys())
    weights = np.linspace(1.0, 40.0, 40)[::-1]
    centroids = rng.standard_normal((8, 8)).astype(np.float32)
    centroids = centroids / np.linalg.norm(centroids, axis=1, keepdims=True)
    out = compute_driving_words(
        words, weights, _FakeW2v(table),
        centroids, ['g'] * 8, max_n=15,
    )
    assert len(out) == 15
    tfidfs = [e['tfidf'] for e in out]
    assert tfidfs == sorted(tfidfs, reverse=True)


def test_driving_words_skips_oov():
    """Words missing from w2v.wv must be silently dropped (not error)."""
    rng = np.random.default_rng(13)
    table = {'in_vocab': rng.standard_normal(8).astype(np.float32)}
    centroids = rng.standard_normal((8, 8)).astype(np.float32)
    centroids = centroids / np.linalg.norm(centroids, axis=1, keepdims=True)
    out = compute_driving_words(
        ['in_vocab', 'missing_word'], np.array([0.5, 0.9]),
        _FakeW2v(table), centroids, ['g'] * 8, max_n=15,
    )
    assert len(out) == 1
    assert out[0]['word'] == 'in_vocab'


# ---------------------------------------------------------------------------
# Integration tests against the deployed v2 SVM (skip if LFS not pulled)
# ---------------------------------------------------------------------------


@pytest.fixture(scope='module')
def feature_vec():
    if not FEATURE_VEC_FIXTURE.exists():
        pytest.skip('feature_vec fixture missing -- run Plan 09-01 retrain')
    return np.load(FEATURE_VEC_FIXTURE)


@pytest.fixture(scope='module')
def svm():
    if not SVM_PATH.exists():
        pytest.skip('svm_pipeline.joblib missing -- run Plan 09-01 retrain')
    return joblib.load(SVM_PATH)


@pytest.fixture(scope='module')
def artifacts():
    if not ARTIFACTS_PATH.exists():
        pytest.skip('explain_artifacts.npz missing -- run Plan 09-02 precompute')
    return np.load(ARTIFACTS_PATH, allow_pickle=True)


@pytest.fixture(scope='module')
def genre_names_list():
    if not GENRE_NAMES_PATH.exists():
        pytest.skip('genre_names.json missing')
    with open(GENRE_NAMES_PATH) as f:
        return json.load(f)


def test_top_n_sums_to_one(feature_vec, svm, genre_names_list):
    from backend.pipeline.classify import predict_top_n
    top_n = predict_top_n(feature_vec, svm, genre_names_list)
    assert len(top_n) == 8
    probs = [p for _, p in top_n]
    assert abs(sum(probs) - 1.0) < 1e-6, f'sum = {sum(probs)}'


def test_top_n_sorted_descending(feature_vec, svm, genre_names_list):
    from backend.pipeline.classify import predict_top_n
    top_n = predict_top_n(feature_vec, svm, genre_names_list)
    probs = [p for _, p in top_n]
    assert probs == sorted(probs, reverse=True), f'not sorted: {probs}'


def test_top_n_all_genres_present(feature_vec, svm, genre_names_list):
    from backend.pipeline.classify import predict_top_n
    top_n = predict_top_n(feature_vec, svm, genre_names_list)
    genres = {g for g, _ in top_n}
    assert genres == set(genre_names_list)


def test_predict_genre_matches_top1(feature_vec, svm, genre_names_list):
    """Legacy predict_genre returns the top-1 of predict_top_n -- consistency check."""
    from backend.pipeline.classify import predict_genre, predict_top_n
    legacy = predict_genre(feature_vec, svm, genre_names_list)
    top_n = predict_top_n(feature_vec, svm, genre_names_list)
    assert legacy == top_n[0]


def test_track_contributions_real_svm(feature_vec, svm):
    proba = svm.predict_proba(feature_vec.reshape(1, -1))[0]
    pred_idx = int(np.argmax(proba))
    c = compute_track_contributions(feature_vec, svm, pred_idx)
    total = c['topology']['pct'] + c['vocabulary']['pct']
    assert abs(total - 100.0) < 1e-6, f'sum = {total}'
    for slab in ('topology', 'vocabulary'):
        assert c[slab]['direction'] in ('+', '-', '0'), c[slab]['direction']


def test_nearest_neighbours_real_artifacts(feature_vec, artifacts):
    from sklearn.neighbors import NearestNeighbors
    fm = artifacts['feature_matrix_l2']
    nn = NearestNeighbors(n_neighbors=5, metric='euclidean').fit(fm)
    feat_l2 = feature_vec / (np.linalg.norm(feature_vec) + 1e-10)
    out = find_nearest_training_books(
        feat_l2.astype(np.float32), nn, artifacts['book_metadata'],
    )
    assert len(out) == 5
    distances = [e['distance'] for e in out]
    assert distances == sorted(distances)
    valid_genres = {str(g) for g in artifacts['genre_names']}
    for entry in out:
        assert entry['genre'] in valid_genres


def test_driving_words_real_w2v(artifacts):
    if not W2V_PATH.exists():
        pytest.skip('w2v model missing')
    import gensim.models
    w2v = gensim.models.Word2Vec.load(str(W2V_PATH))
    known = list(w2v.wv.key_to_index.keys())[:20]
    weights = np.linspace(1.0, 20.0, 20)[::-1]
    out = compute_driving_words(
        known, weights, w2v,
        artifacts['per_genre_centroids'],
        list(artifacts['genre_names']),
        max_n=15,
    )
    assert len(out) <= 15
    tfidfs = [e['tfidf'] for e in out]
    assert tfidfs == sorted(tfidfs, reverse=True)
    valid_genres = {str(g) for g in artifacts['genre_names']}
    for e in out:
        assert e['nearest_genre'] in valid_genres


def test_uncertainty_metrics_real_svm(feature_vec, svm):
    proba = svm.predict_proba(feature_vec.reshape(1, -1))[0]
    m = compute_uncertainty_metrics(proba)
    assert 0.0 <= m['entropy'] <= 1.0
    assert isinstance(m['badge_fires'], bool)
    assert 'top1_top2_gap' in m
