"""Tests for content-addressed disk cache -- covers INFRA-03."""
import pytest
import numpy as np
from pathlib import Path
from backend.cache.store import cache_key, cache_get, cache_put, cache_exists, CACHE_DIR


@pytest.fixture(autouse=True)
def clean_test_cache(tmp_path, monkeypatch):
    """Use a temp directory for cache during tests."""
    import backend.cache.store as store_mod
    monkeypatch.setattr(store_mod, 'CACHE_DIR', tmp_path / 'cache')
    yield


def test_cache_key_order_invariant():
    k1 = cache_key('step_x', {'a': 1, 'b': 2})
    k2 = cache_key('step_x', {'b': 2, 'a': 1})
    assert k1 == k2


def test_cache_key_step_name_matters():
    k1 = cache_key('step_x', {'a': 1})
    k2 = cache_key('step_y', {'a': 1})
    assert k1 != k2


def test_cache_roundtrip_numpy():
    key = cache_key('test_np', {'size': 10})
    arr = np.array([1.0, 2.0, 3.0], dtype=np.float32)
    cache_put(key, arr)
    result = cache_get(key)
    np.testing.assert_array_equal(result, arr)


def test_cache_roundtrip_dict():
    key = cache_key('test_dict', {'x': 'y'})
    data = {'genre': 'horror', 'confidence': 0.92}
    cache_put(key, data)
    result = cache_get(key)
    assert result == data


def test_cache_get_missing_returns_none():
    assert cache_get('nonexistent_key_abc123') is None


def test_cache_exists_true_after_put():
    key = cache_key('exists_test', {'v': 1})
    assert not cache_exists(key)
    cache_put(key, {'data': True})
    assert cache_exists(key)
