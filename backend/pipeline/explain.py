"""Phase 9 explain math: zero-ablation, nearest-neighbours, driving words, entropy.

Locked decisions:
  D-43  -- entropy + top1-top2 badge thresholds. Operative values are sourced
           verbatim from results/v2_calibration_report.md's `## Entropy threshold
           decision` YAML block (Plan 09-01 D-39). Default constants below are
           the SINGLE source of truth -- callers (worker SSE result, /explain
           endpoint) MUST import them from this module, not re-declare them.
  D-44  -- local zero-ablation for per-track contributions
  D-45  -- 5 nearest training books, Euclidean on L2-normalized features
  D-46  -- per-genre w2v centroid for driving-words nearest-genre tagging
  D-48  -- explain cache key = sha256(feature_vec) : model_hash_prefix
  D-52  -- entropy badge uses the same caveat copy as the walkthrough disclaimer
"""
from __future__ import annotations

import hashlib
from typing import Any

import numpy as np

# Slice layout matches backend/pipeline/features.py::build_feature_vector:
#   topo (grid_resolution^2 = 400) || vocab (k_clusters = 200).
TOPO_SLICE = slice(0, 400)
VOCAB_SLICE = slice(400, 600)

# --- D-43 operative entropy/badge thresholds (Plan 09-01 Q4 decision: `tighten`) ---
# Sourced from results/v2_calibration_report.md's `## Entropy threshold decision`
# YAML block. Defaults fire on 9/17 (53%) hold-out which is too noisy for v2;
# tightened to 25th-percentile gap and 75th-percentile normalized entropy.
# This module is the SINGLE source of truth -- do NOT duplicate these literals
# in worker/jobs.py, app.py, routes/explain.py, or anywhere else.
ENTROPY_BADGE_DEFAULT_TOP1_TOP2_GAP = 0.2801
ENTROPY_BADGE_DEFAULT_NORMALIZED_ENTROPY = 0.7738


# ---------------------------------------------------------------------------
# Math helpers
# ---------------------------------------------------------------------------


def multiclass_brier_score(
    y_true: np.ndarray, y_proba: np.ndarray, n_classes: int
) -> float:
    """Multiclass Brier (mean per-row squared error). Range [0, 2]. Lower better.

    sklearn 1.6 brier_score_loss is binary-only -- this fills the gap.
    Reference: Niculescu-Mizil & Caruana (2005).
    """
    y_true = np.asarray(y_true, dtype=int)
    y_proba = np.asarray(y_proba, dtype=np.float64)
    assert y_proba.shape == (len(y_true), n_classes), (
        f"shape mismatch: {y_proba.shape}"
    )
    y_onehot = np.eye(n_classes)[y_true]
    return float(np.mean(np.sum((y_proba - y_onehot) ** 2, axis=1)))


def normalized_entropy(probabilities: np.ndarray) -> float:
    """Normalized Shannon entropy in [0, 1]. 0 = certain, 1 = uniform.

    For n classes: raw entropy = -sum(p * log2(p)) capped at log2(n);
    normalized = raw / log2(n).
    """
    p = np.asarray(probabilities, dtype=np.float64) + 1e-12  # avoid log(0)
    raw = -np.sum(p * np.log2(p))
    return float(raw / np.log2(len(p)))


def compute_uncertainty_metrics(
    proba: np.ndarray,
    *,
    gap_threshold: float = ENTROPY_BADGE_DEFAULT_TOP1_TOP2_GAP,
    entropy_threshold: float = ENTROPY_BADGE_DEFAULT_NORMALIZED_ENTROPY,
) -> dict:
    """Return {'entropy', 'top1_top2_gap', 'badge_fires'} per D-43 / D-52.

    Badge fires when EITHER:
      * top1 - top2 probability gap < ``gap_threshold`` (operative 0.2801), OR
      * normalized Shannon entropy > ``entropy_threshold`` (operative 0.7738).

    Defaults are the operative thresholds per Plan 09-01's Q4 decision; callers
    that want the un-tightened research defaults must pass them explicitly.
    """
    p = np.asarray(proba, dtype=np.float64).ravel()
    sorted_p = np.sort(p)[::-1]
    top1, top2 = float(sorted_p[0]), float(sorted_p[1])
    gap = top1 - top2
    ent = normalized_entropy(p)
    fires = (gap < gap_threshold) or (ent > entropy_threshold)
    return {
        'entropy': ent,
        'top1_top2_gap': gap,
        'badge_fires': bool(fires),
    }


def compute_track_contributions(
    feature_vec: np.ndarray,
    svm_pipeline,
    predicted_label_idx: int,
    *,
    topo_slice: slice = TOPO_SLICE,
    vocab_slice: slice = VOCAB_SLICE,
) -> dict:
    """D-44 local zero-ablation. Returns {'topology': {pct, direction}, 'vocabulary': {...}}.

    Two pcts sum to 100.0. Direction is '+' / '-' / '0' per Q3 sign rule.
    Batched: one ``predict_proba`` call on (3, n_features) for ~1.5x speedup
    over three separate calls (Pitfall 2).
    """
    feat = np.asarray(feature_vec, dtype=np.float64)
    feat_topo_zero = feat.copy()
    feat_topo_zero[topo_slice] = 0.0
    feat_vocab_zero = feat.copy()
    feat_vocab_zero[vocab_slice] = 0.0
    batch = np.vstack([feat, feat_topo_zero, feat_vocab_zero])
    probas = svm_pipeline.predict_proba(batch)[:, predicted_label_idx]
    base, without_topo, without_vocab = (
        float(probas[0]),
        float(probas[1]),
        float(probas[2]),
    )
    topo_contrib = base - without_topo
    vocab_contrib = base - without_vocab
    abs_t, abs_v = abs(topo_contrib), abs(vocab_contrib)
    total = abs_t + abs_v
    if total < 1e-9:
        return {
            'topology':   {'pct': 50.0, 'direction': '0'},
            'vocabulary': {'pct': 50.0, 'direction': '0'},
        }
    return {
        'topology':   {'pct': 100.0 * abs_t / total,
                       'direction': '+' if topo_contrib >= 0 else '-'},
        'vocabulary': {'pct': 100.0 * abs_v / total,
                       'direction': '+' if vocab_contrib >= 0 else '-'},
    }


def find_nearest_training_books(
    feat_l2_norm: np.ndarray,
    nn_index,
    book_metadata: np.ndarray,
    n_neighbors: int = 5,
) -> list[dict]:
    """D-45 -- 5 nearest training books, Euclidean on L2-normalized features.

    Returns list of {gutenberg_id, title, author, genre, distance}, sorted
    ascending by distance.
    """
    query = np.asarray(feat_l2_norm, dtype=np.float32).reshape(1, -1)
    distances, indices = nn_index.kneighbors(query, n_neighbors=n_neighbors)
    out: list[dict] = []
    for dist, idx in zip(distances[0], indices[0]):
        meta = book_metadata[int(idx)]
        # Normalize whether meta is a dict or numpy-object proxy.
        get = meta.get if hasattr(meta, 'get') else (lambda k, default='': meta[k] if k in meta else default)
        out.append({
            'gutenberg_id': str(get('gutenberg_id', '')),
            'title': str(get('title', '')),
            'author': str(get('author', '')),
            'genre': str(get('genre', '')),
            'distance': float(dist),
        })
    return out


def compute_driving_words(
    words: list[str],
    tfidf_weights: np.ndarray,
    w2v_model,
    per_genre_centroids: np.ndarray,
    genre_names: list[str],
    max_n: int = 15,
) -> list[dict]:
    """D-46 -- top-N TF-IDF words tagged with nearest-genre by w2v cosine.

    Args:
        words: candidate words for this upload.
        tfidf_weights: aligned TF-IDF weights (positive floats).
        w2v_model: gensim Word2Vec model exposing ``.wv``.
        per_genre_centroids: (n_genres, w2v_dim), each row already L2-normalized.
        genre_names: length-n_genres list aligned with the centroid rows.
        max_n: cap the returned list length.

    Sort: tfidf descending, alphabetical tie-break (09-CONTEXT specifics).
    Returns: list of {word, tfidf, nearest_genre} dicts, length <= max_n.
    Only words present in ``w2v_model.wv`` are returned.
    """
    pairs = [
        (str(w), float(t))
        for w, t in zip(words, tfidf_weights)
        if str(w) in w2v_model.wv
    ]
    # Stable sort: alphabetical first (ascending), then tfidf descending --
    # Python's sort is stable so the alpha order is preserved on tfidf ties.
    pairs.sort(key=lambda x: x[0])
    pairs.sort(key=lambda x: -x[1])
    pairs = pairs[:max_n]

    centroids = np.asarray(per_genre_centroids, dtype=np.float32)
    out: list[dict] = []
    for word, tfidf in pairs:
        vec = w2v_model.wv.get_vector(word)
        vec_l2 = vec / (np.linalg.norm(vec) + 1e-10)
        # centroids already L2-normalized -> cosine distance = 1 - dot
        cos_dist = 1.0 - centroids @ vec_l2.astype(centroids.dtype)
        nearest_idx = int(np.argmin(cos_dist))
        out.append({
            'word': word,
            'tfidf': tfidf,
            'nearest_genre': str(genre_names[nearest_idx]),
        })
    return out


def explain_cache_key(feature_vec: np.ndarray, lineage: dict) -> str:
    """D-48 -- ``explain:{sha256(feature_vec)}:{model_hash_prefix}``.

    The model_hash_prefix is the first 16 hex chars of the SVM lineage's
    ``w2v_model_sha256`` so a D-38 retrain (which rotates w2v_model_sha256
    via the corpus_hash + w2v file changes) automatically rotates the cache
    namespace -- old keys never hit, no stale explanations ever served.
    """
    feature_hash = hashlib.sha256(
        np.asarray(feature_vec, dtype=np.float64).tobytes()
    ).hexdigest()
    model_hash = str(lineage['w2v_model_sha256'])[:16]
    return f'explain:{feature_hash}:{model_hash}'


__all__ = [
    'TOPO_SLICE',
    'VOCAB_SLICE',
    'ENTROPY_BADGE_DEFAULT_TOP1_TOP2_GAP',
    'ENTROPY_BADGE_DEFAULT_NORMALIZED_ENTROPY',
    'multiclass_brier_score',
    'normalized_entropy',
    'compute_uncertainty_metrics',
    'compute_track_contributions',
    'find_nearest_training_books',
    'compute_driving_words',
    'explain_cache_key',
]
