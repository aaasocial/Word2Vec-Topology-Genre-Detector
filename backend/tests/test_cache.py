"""Tests for content-addressed disk cache -- covers INFRA-03 + BUG-05 (Plan 06-05).

Plan 06-05 (BUG-05): cache_key now REQUIRES corpus_hash and w2v_model_sha256
as keyword-only arguments. A corpus change or Word2Vec retrain must invalidate
every downstream artifact (PITFALLS.md §1). Existing tests are updated to pass
fixed dummy hex strings; new tests verify the lineage participates in the key.
"""
import pytest
import numpy as np
from pathlib import Path
from backend.cache.store import cache_key, cache_get, cache_put, cache_exists, CACHE_DIR


# Fixed dummy lineage hex digests for tests that don't care about real hashes.
# (Real hashes are tested in backend/tests/test_lineage.py.)
DUMMY_CORPUS = 'c' * 64
DUMMY_W2V = 'w' * 64


@pytest.fixture(autouse=True)
def clean_test_cache(tmp_path, monkeypatch):
    """Use a temp directory for cache during tests."""
    import backend.cache.store as store_mod
    monkeypatch.setattr(store_mod, 'CACHE_DIR', tmp_path / 'cache')
    yield


def test_cache_key_order_invariant():
    k1 = cache_key('step_x', {'a': 1, 'b': 2}, corpus_hash=DUMMY_CORPUS, w2v_model_sha256=DUMMY_W2V)
    k2 = cache_key('step_x', {'b': 2, 'a': 1}, corpus_hash=DUMMY_CORPUS, w2v_model_sha256=DUMMY_W2V)
    assert k1 == k2


def test_cache_key_step_name_matters():
    k1 = cache_key('step_x', {'a': 1}, corpus_hash=DUMMY_CORPUS, w2v_model_sha256=DUMMY_W2V)
    k2 = cache_key('step_y', {'a': 1}, corpus_hash=DUMMY_CORPUS, w2v_model_sha256=DUMMY_W2V)
    assert k1 != k2


def test_cache_roundtrip_numpy():
    key = cache_key('test_np', {'size': 10}, corpus_hash=DUMMY_CORPUS, w2v_model_sha256=DUMMY_W2V)
    arr = np.array([1.0, 2.0, 3.0], dtype=np.float32)
    cache_put(key, arr)
    result = cache_get(key)
    np.testing.assert_array_equal(result, arr)


def test_cache_roundtrip_dict():
    key = cache_key('test_dict', {'x': 'y'}, corpus_hash=DUMMY_CORPUS, w2v_model_sha256=DUMMY_W2V)
    data = {'genre': 'horror', 'confidence': 0.92}
    cache_put(key, data)
    result = cache_get(key)
    assert result == data


def test_cache_get_missing_returns_none():
    assert cache_get('nonexistent_key_abc123') is None


def test_cache_exists_true_after_put():
    key = cache_key('exists_test', {'v': 1}, corpus_hash=DUMMY_CORPUS, w2v_model_sha256=DUMMY_W2V)
    assert not cache_exists(key)
    cache_put(key, {'data': True})
    assert cache_exists(key)


# --- Plan 06-05 / BUG-05: lineage participation in cache_key ---


def test_cache_key_includes_corpus_hash():
    """Different corpus_hash MUST produce different keys (PITFALLS.md §1)."""
    k1 = cache_key('step', {'a': 1}, corpus_hash='a' * 64, w2v_model_sha256=DUMMY_W2V)
    k2 = cache_key('step', {'a': 1}, corpus_hash='b' * 64, w2v_model_sha256=DUMMY_W2V)
    assert k1 != k2, (
        "Cache keys collided across different corpora -- BUG-05 invalidation broken. "
        "A corpus change MUST force a cache miss on every downstream artifact."
    )


def test_cache_key_includes_w2v_model_sha256():
    """Different w2v_model_sha256 MUST produce different keys (PITFALLS.md §1)."""
    k1 = cache_key('step', {'a': 1}, corpus_hash=DUMMY_CORPUS, w2v_model_sha256='1' * 64)
    k2 = cache_key('step', {'a': 1}, corpus_hash=DUMMY_CORPUS, w2v_model_sha256='2' * 64)
    assert k1 != k2, (
        "Cache keys collided across different Word2Vec models -- BUG-05 invalidation broken. "
        "Word2Vec is rotationally invariant; a retrain rotates the embedding space."
    )


def test_cache_key_corpus_hash_required():
    """Omitting corpus_hash MUST raise TypeError -- no silent backward-compat path."""
    with pytest.raises(TypeError):
        cache_key('step', {'a': 1}, w2v_model_sha256=DUMMY_W2V)  # type: ignore[call-arg]


def test_cache_key_w2v_model_sha256_required():
    """Omitting w2v_model_sha256 MUST raise TypeError -- no silent backward-compat path."""
    with pytest.raises(TypeError):
        cache_key('step', {'a': 1}, corpus_hash=DUMMY_CORPUS)  # type: ignore[call-arg]


def test_cache_key_order_invariant_still_holds_with_lineage():
    """Param ordering should still not affect the key when lineage is fixed."""
    k1 = cache_key(
        'step',
        {'z': 9, 'a': 1, 'm': 5},
        corpus_hash=DUMMY_CORPUS,
        w2v_model_sha256=DUMMY_W2V,
    )
    k2 = cache_key(
        'step',
        {'a': 1, 'm': 5, 'z': 9},
        corpus_hash=DUMMY_CORPUS,
        w2v_model_sha256=DUMMY_W2V,
    )
    assert k1 == k2
