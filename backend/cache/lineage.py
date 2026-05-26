"""Lineage helpers for the content-addressed cache (Plan 06-05 / BUG-05).

Every `cache_key()` call site must feed in the corpus manifest hash and the
Word2Vec model file hash so that a corpus change OR a W2V retrain forces a
cache miss on every downstream artifact.

See:
- ``.planning/research/PITFALLS.md`` §1 — Word2Vec rotates the embedding space.
- ``.planning/phases/06-v1-bug-fix-sweep/06-CONTEXT.md`` D-22..D-25.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from typing import Any

# Repository root: backend/cache/lineage.py -> parents[2] is the project root.
_REPO_ROOT: Path = Path(__file__).resolve().parents[2]


# Memoization for request-time lineage lookups: hashing a 70 MB Word2Vec model
# costs ~250 ms on a warm SSD, which is more than we want on a hot endpoint
# like ``GET /api/corpus/books/{id}/results``. The cache is keyed on
# (path, mtime, size) so any operator-visible change to a file invalidates it
# without us having to subscribe to a filesystem watcher.
_HASH_CACHE: dict[tuple[str, float, int], str] = {}


# ---------------------------------------------------------------------------
# Hashing primitives
# ---------------------------------------------------------------------------

def file_sha256(path: Path) -> str:
    """Stream-hash a file in 64 KB chunks. Returns the hex digest.

    Streaming is required because Word2Vec model files routinely cross 60 MB.
    Loading them whole would balloon RSS during request-time lineage checks.

    Memoized on (path, mtime_ns, size) so hot endpoints don't pay the streaming
    cost on every request. Any operator-visible change to the file (rebuild,
    `touch`, content edit) invalidates the cache entry naturally.
    """
    path = Path(path)
    stat = path.stat()
    cache_key = (str(path.resolve()), stat.st_mtime_ns, stat.st_size)
    cached = _HASH_CACHE.get(cache_key)
    if cached is not None:
        return cached

    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    digest = h.hexdigest()
    _HASH_CACHE[cache_key] = digest
    return digest


# ---------------------------------------------------------------------------
# Canonical lineage digests
# ---------------------------------------------------------------------------

def corpus_hash() -> str:
    """sha256 of corpus/books.yaml -- the canonical corpus manifest.

    The whole YAML is hashed (not a normalised parse) because any byte-level
    change is the operator's signal that the corpus has changed -- including
    reordering, comment tweaks, and trailing-whitespace edits. Better to over-
    invalidate than to silently serve stale artifacts (PITFALLS.md §1).
    """
    return file_sha256(_REPO_ROOT / 'corpus' / 'books.yaml')


def w2v_model_sha256(window: int) -> str:
    """sha256 of the Word2Vec model file for the given window size.

    Files live at ``data/models/word2vec_w{window}.model``. A retrain
    rotates the embedding space (PITFALLS.md §1), so this digest is the
    single source of truth for "is the cache still valid?"
    """
    return file_sha256(_REPO_ROOT / 'data' / 'models' / f'word2vec_w{window}.model')


# ---------------------------------------------------------------------------
# SVM lineage sidecar (D-25 -- defense in depth)
# ---------------------------------------------------------------------------

def write_svm_lineage(
    svm_path: Path,
    *,
    window: int,
    k_clusters: int,
    alpha: float,
    feature_normalization: dict[str, str] | None = None,
    corpus_digest: str | None = None,
    w2v_digest: str | None = None,
    calibration_method: str | None = None,           # D-40 (Phase 9)
    calibration_brier_score: float | None = None,    # D-40 (Phase 9)
    calibration_report: str | None = None,           # D-40 (Phase 9)
) -> Path:
    """Write the lineage sidecar next to an SVM .joblib file.

    The sidecar (``<svm_path>.lineage.json``) pins the W2V model hash, the
    corpus manifest hash, the feature-track normalization scheme, and the
    α weight used to train this SVM. ``verify_svm_lineage`` later refuses
    to load an SVM whose lineage doesn't match the currently-loaded W2V model.

    D-40 (Phase 9): adds ``calibration_method`` / ``calibration_brier_score``
    / ``calibration_report``. Sidecars written without ``calibration_method``
    will fail ``verify_svm_lineage`` by design -- pre-Phase-9 SVMs must be
    retrained before top-N classification works.
    """
    svm_path = Path(svm_path)
    sidecar = svm_path.with_suffix(svm_path.suffix + '.lineage.json')

    payload = {
        'svm_file': svm_path.name,
        'w2v_model_sha256': w2v_digest if w2v_digest is not None else w2v_model_sha256(window),
        'corpus_hash': corpus_digest if corpus_digest is not None else corpus_hash(),
        'window': window,
        'k_clusters': k_clusters,
        'alpha': alpha,
        'feature_normalization': feature_normalization or {
            'structure': 'l2',
            'location': 'l2',
        },
        'created_utc': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'created_by': 'Plan 09-01 (DEPTH-01 D-40)',
        # --- D-40 calibration fields (Phase 9) ---
        'calibration_method': calibration_method,
        'calibration_brier_score': calibration_brier_score,
        'calibration_report': calibration_report,
    }

    with open(sidecar, 'w', encoding='utf-8') as f:
        json.dump(payload, f, indent=2, sort_keys=True)

    return sidecar


# D-40 allow-list for calibration_method. Unknown values are rejected by
# verify_svm_lineage so a typo'd config can't slip through (T-9-02 threat).
_ALLOWED_CALIBRATION_METHODS = ('libsvm_platt', 'calibrated_cv_sigmoid')


def verify_svm_lineage(svm_path: Path, *, window: int) -> tuple[bool, str]:
    """Return (ok, reason) by comparing sidecar to current corpus + model digests.

    ``ok=False`` means: the SVM was trained against a different corpus or W2V
    model. The caller SHOULD refuse to use the SVM until ``precompute.py`` is
    rerun. Missing sidecar => not-ok (we never trust an un-pinned SVM in v2).

    Phase 9 (D-40): also enforces calibration_method in {'libsvm_platt',
    'calibrated_cv_sigmoid'}. Missing calibration_method => refuse (pre-
    Phase-9 SVM must be retrained for top-N). Unknown value => refuse
    (typo or accidental rollback).
    """
    svm_path = Path(svm_path)
    sidecar = svm_path.with_suffix(svm_path.suffix + '.lineage.json')

    if not sidecar.exists():
        return False, f'lineage sidecar missing: {sidecar.name}'

    with open(sidecar, encoding='utf-8') as f:
        payload = json.load(f)

    current_corpus = corpus_hash()
    current_w2v = w2v_model_sha256(window)

    if payload.get('corpus_hash') != current_corpus:
        return (
            False,
            f'corpus_hash mismatch: sidecar={payload.get("corpus_hash", "<missing>")[:12]}'
            f'... current={current_corpus[:12]}...',
        )
    if payload.get('w2v_model_sha256') != current_w2v:
        return (
            False,
            f'w2v_model_sha256 mismatch: sidecar={payload.get("w2v_model_sha256", "<missing>")[:12]}'
            f'... current={current_w2v[:12]}...',
        )

    # D-40 calibration check (Phase 9)
    cal = payload.get('calibration_method')
    if cal is None:
        return False, 'calibration_method missing — pre-Phase-9 SVM, must be retrained for top-N'
    if cal not in _ALLOWED_CALIBRATION_METHODS:
        return False, f'calibration_method unknown: {cal!r}'

    return True, 'lineage matches'


# Re-export the helper names so the call sites can do
# ``from backend.cache.lineage import corpus_hash, w2v_model_sha256``.
__all__ = [
    'file_sha256',
    'corpus_hash',
    'w2v_model_sha256',
    'write_svm_lineage',
    'verify_svm_lineage',
]
