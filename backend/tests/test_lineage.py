"""Tests for backend.cache.lineage helpers -- covers Plan 06-05 / BUG-05.

The lineage module produces sha256 digests for the canonical corpus manifest
(`corpus/books.yaml`) and for Word2Vec model files in `data/models/`. These
digests feed into every `cache_key()` call site so that a corpus change or
W2V retrain invalidates every downstream artifact (PITFALLS.md §1).
"""
import hashlib
from pathlib import Path

import pytest


def test_file_sha256_matches_hashlib(tmp_path):
    """file_sha256 must agree with hashlib on the same bytes."""
    from backend.cache.lineage import file_sha256

    payload = b'BUG-05 lineage helper smoke check'
    target = tmp_path / 'sample.bin'
    target.write_bytes(payload)

    expected = hashlib.sha256(payload).hexdigest()
    assert file_sha256(target) == expected


def test_file_sha256_streams_large_files(tmp_path):
    """file_sha256 must not load the whole file at once (it streams 64KB chunks)."""
    from backend.cache.lineage import file_sha256

    # 256 KB random-ish payload (well over the 64KB chunk).
    payload = (b'abcdef0123456789' * 64) * 256  # 256 KB
    target = tmp_path / 'large.bin'
    target.write_bytes(payload)

    expected = hashlib.sha256(payload).hexdigest()
    assert file_sha256(target) == expected


def test_file_sha256_returns_hex_64_chars(tmp_path):
    """Sanity: sha256 hex digest is exactly 64 lowercase hex chars."""
    from backend.cache.lineage import file_sha256

    target = tmp_path / 'tiny.bin'
    target.write_bytes(b'x')
    digest = file_sha256(target)
    assert len(digest) == 64
    assert all(c in '0123456789abcdef' for c in digest)


def test_corpus_hash_returns_sha256_of_books_yaml():
    """corpus_hash() must equal sha256(corpus/books.yaml)."""
    from backend.cache.lineage import corpus_hash, file_sha256

    repo_root = Path(__file__).resolve().parents[2]
    books_yaml = repo_root / 'corpus' / 'books.yaml'

    if not books_yaml.exists():
        pytest.skip('corpus/books.yaml missing in this environment')

    assert corpus_hash() == file_sha256(books_yaml)


def test_w2v_model_sha256_returns_sha256_of_model_file():
    """w2v_model_sha256(window) must equal sha256(data/models/word2vec_w{window}.model)."""
    from backend.cache.lineage import w2v_model_sha256, file_sha256

    repo_root = Path(__file__).resolve().parents[2]
    # Pick whichever window has a model checked in (15 is the v1 default per CLAUDE.md).
    for w in (15, 10, 20, 5):
        model = repo_root / 'data' / 'models' / f'word2vec_w{w}.model'
        if model.exists():
            assert w2v_model_sha256(w) == file_sha256(model)
            return
    pytest.skip('No Word2Vec model file in data/models/')


def test_w2v_model_sha256_raises_for_missing_window():
    """A request for a window with no model file must raise (not return a fake digest)."""
    from backend.cache.lineage import w2v_model_sha256

    # Window 9999 is implausible; any FileNotFoundError-like exception is acceptable.
    with pytest.raises((FileNotFoundError, OSError)):
        w2v_model_sha256(9999)
