"""Smoke tests for Plan 06-05 / BUG-05 (CONTEXT.md decision D-24).

These tests exercise the end-to-end cache-miss path that protects against
Word2Vec-retrain or corpus-change footguns (PITFALLS.md §1). They run
without a redis backend and without a real Word2Vec model; the lineage
hashes are synthesised so the test is fast and hermetic.

Required by D-24 before Phase 8 starts.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from backend.cache.store import cache_key, cache_put, cache_exists


# Synthetic but realistic 64-char hex digests.
H_CORPUS_V1 = 'aa' * 32
H_CORPUS_V2 = 'bb' * 32
H_W2V_V1 = '11' * 32
H_W2V_V2 = '22' * 32


@pytest.fixture(autouse=True)
def isolated_cache(tmp_path, monkeypatch):
    """Run each test against a clean temp cache dir."""
    import backend.cache.store as store_mod
    monkeypatch.setattr(store_mod, 'CACHE_DIR', tmp_path / 'cache')
    yield


# ---------------------------------------------------------------------------
# D-24 -- cache invalidation on retrain / corpus change
# ---------------------------------------------------------------------------

def test_cache_miss_when_w2v_model_hash_changes():
    """Same step + params + corpus, different W2V model -> cache miss."""
    k_old = cache_key(
        'feature_vector',
        {'gutenberg_id': '1342', 'window': 15, 'k': 100, 'alpha': 0.5},
        corpus_hash=H_CORPUS_V1,
        w2v_model_sha256=H_W2V_V1,
    )
    cache_put(k_old, {'genre': 'romance', 'note': 'trained against W2V v1'})
    assert cache_exists(k_old)

    # Retrain W2V (PITFALLS §1: rotates the embedding space).
    k_new = cache_key(
        'feature_vector',
        {'gutenberg_id': '1342', 'window': 15, 'k': 100, 'alpha': 0.5},
        corpus_hash=H_CORPUS_V1,
        w2v_model_sha256=H_W2V_V2,
    )
    assert k_new != k_old, 'BUG-05 invalidation broken (W2V retrain)'
    assert not cache_exists(k_new), (
        "v1 cached artifact leaked into v2 -- the SVM would predict against "
        "coordinates that no longer mean what they meant. PITFALLS.md §1."
    )


def test_cache_miss_when_corpus_hash_changes():
    """Same step + params + W2V model, different corpus -> cache miss."""
    k_old = cache_key(
        'persistence_image',
        {'genre': 'romance', 'dim': 1, 'window': 15},
        corpus_hash=H_CORPUS_V1,
        w2v_model_sha256=H_W2V_V1,
    )
    cache_put(k_old, {'M': 20, 'data': [0.0] * 400})
    assert cache_exists(k_old)

    # Add new books to the corpus.
    k_new = cache_key(
        'persistence_image',
        {'genre': 'romance', 'dim': 1, 'window': 15},
        corpus_hash=H_CORPUS_V2,
        w2v_model_sha256=H_W2V_V1,
    )
    assert k_new != k_old, 'BUG-05 invalidation broken (corpus change)'
    assert not cache_exists(k_new)


def test_cache_hit_when_lineage_unchanged():
    """Same lineage -> same key -> cache hit (positive control)."""
    payload = {'genre': 'horror', 'confidence': 0.91}
    k = cache_key(
        'book_result',
        {'gutenberg_id': '105', 'window': 15, 'k': 100, 'alpha': 0.5},
        corpus_hash=H_CORPUS_V1,
        w2v_model_sha256=H_W2V_V1,
    )
    cache_put(k, payload)

    # Recompute the same call -- must hit the cache.
    k_again = cache_key(
        'book_result',
        {'gutenberg_id': '105', 'window': 15, 'k': 100, 'alpha': 0.5},
        corpus_hash=H_CORPUS_V1,
        w2v_model_sha256=H_W2V_V1,
    )
    assert k_again == k
    assert cache_exists(k_again)


# ---------------------------------------------------------------------------
# D-25 -- SVM lineage sidecar verification
# ---------------------------------------------------------------------------

def test_svm_lineage_verify_matches(tmp_path, monkeypatch):
    """write_svm_lineage + verify_svm_lineage agree when nothing changed."""
    from backend.cache import lineage as lineage_mod

    # Stub corpus_hash + w2v_model_sha256 so we don't need real files.
    monkeypatch.setattr(lineage_mod, 'corpus_hash', lambda: H_CORPUS_V1)
    monkeypatch.setattr(lineage_mod, 'w2v_model_sha256', lambda window: H_W2V_V1)

    fake_svm = tmp_path / 'svm_pipeline.joblib'
    fake_svm.write_bytes(b'pretend this is a joblib pickle')

    sidecar = lineage_mod.write_svm_lineage(
        fake_svm,
        window=15,
        k_clusters=100,
        alpha=0.5,
    )
    assert sidecar.exists()

    ok, reason = lineage_mod.verify_svm_lineage(fake_svm, window=15)
    assert ok, reason


def test_svm_lineage_verify_mismatch_w2v(tmp_path, monkeypatch):
    """A W2V retrain (different sha256) must trip verify_svm_lineage."""
    from backend.cache import lineage as lineage_mod

    # Stage 1 -- write sidecar against W2V v1.
    monkeypatch.setattr(lineage_mod, 'corpus_hash', lambda: H_CORPUS_V1)
    monkeypatch.setattr(lineage_mod, 'w2v_model_sha256', lambda window: H_W2V_V1)

    fake_svm = tmp_path / 'svm_pipeline.joblib'
    fake_svm.write_bytes(b'')
    lineage_mod.write_svm_lineage(fake_svm, window=15, k_clusters=100, alpha=0.5)

    # Stage 2 -- pretend the W2V model was retrained.
    monkeypatch.setattr(lineage_mod, 'w2v_model_sha256', lambda window: H_W2V_V2)

    ok, reason = lineage_mod.verify_svm_lineage(fake_svm, window=15)
    assert not ok, 'SVM lineage check missed a W2V retrain (D-25 broken)'
    assert 'w2v_model_sha256' in reason


def test_svm_lineage_verify_mismatch_corpus(tmp_path, monkeypatch):
    """A corpus change must trip verify_svm_lineage."""
    from backend.cache import lineage as lineage_mod

    monkeypatch.setattr(lineage_mod, 'corpus_hash', lambda: H_CORPUS_V1)
    monkeypatch.setattr(lineage_mod, 'w2v_model_sha256', lambda window: H_W2V_V1)

    fake_svm = tmp_path / 'svm_pipeline.joblib'
    fake_svm.write_bytes(b'')
    lineage_mod.write_svm_lineage(fake_svm, window=15, k_clusters=100, alpha=0.5)

    # Now the corpus changed.
    monkeypatch.setattr(lineage_mod, 'corpus_hash', lambda: H_CORPUS_V2)

    ok, reason = lineage_mod.verify_svm_lineage(fake_svm, window=15)
    assert not ok, 'SVM lineage check missed a corpus change (D-25 broken)'
    assert 'corpus_hash' in reason


def test_svm_lineage_verify_missing_sidecar(tmp_path):
    """No sidecar -> verify returns False with a clear reason."""
    from backend.cache import lineage as lineage_mod

    fake_svm = tmp_path / 'svm_pipeline.joblib'
    fake_svm.write_bytes(b'')
    # No sidecar at all.

    ok, reason = lineage_mod.verify_svm_lineage(fake_svm, window=15)
    assert not ok
    assert 'sidecar missing' in reason


def test_svm_lineage_sidecar_contents(tmp_path, monkeypatch):
    """Sidecar must include the load-bearing lineage fields per D-25."""
    from backend.cache import lineage as lineage_mod

    monkeypatch.setattr(lineage_mod, 'corpus_hash', lambda: H_CORPUS_V1)
    monkeypatch.setattr(lineage_mod, 'w2v_model_sha256', lambda window: H_W2V_V1)

    fake_svm = tmp_path / 'svm_pipeline.joblib'
    fake_svm.write_bytes(b'')

    sidecar = lineage_mod.write_svm_lineage(
        fake_svm,
        window=15,
        k_clusters=100,
        alpha=0.42,
    )
    payload = json.loads(sidecar.read_text(encoding='utf-8'))

    # D-25 required fields:
    assert payload['w2v_model_sha256'] == H_W2V_V1
    assert payload['corpus_hash'] == H_CORPUS_V1
    assert payload['window'] == 15
    assert payload['k_clusters'] == 100
    assert payload['alpha'] == 0.42
    # Defense-in-depth: normalization stats logged.
    assert payload['feature_normalization']['structure'] == 'l2'
    assert payload['feature_normalization']['location'] == 'l2'
    # Provenance marker.
    assert payload['created_by'] == 'Plan 06-05 (BUG-05)'
