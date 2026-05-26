"""Phase 9 /explain endpoint (D-46 / D-47 / D-48 / D-49).

POST /api/classify/{job_id}/explain -- synchronous ~200 ms.

Flow:
  1. Validate job_id format (UUID4) -- non-UUID -> 404 (avoid path traversal /
     enumeration weirdness; mitigates T-9-12).
  2. Calibration gate -- app.state.calibration_available False -> 503 with
     explicit retrain instruction (D-40 / Q8 graceful fallback).
  3. NN-index + explain_artifacts gate -- either None -> 503 (Pitfall 3).
  4. Redis gate -- app.state.redis None -> 503.
  5. Read feature_vec from Redis (D-47); missing/expired -> 410 with canonical
     D-49 phrasing for useExplain.ts::onError to render a re-upload prompt.
  6. Cache lookup (D-48): GET explain:{feature_hash}:{model_hash}; on hit,
     return JSON verbatim. Cache key embeds the SVM lineage's w2v hash so a
     D-38 retrain auto-rotates the namespace (mitigates T-9-17).
  7. Compute payload: track contributions (batched zero-ablation per Pitfall 2),
     nearest training books, driving words (sourced from the upload's vocab
     slab via the artifact's cluster_to_representative_words), uncertainty.
  8. Pydantic validation (extra='forbid' + length constraints) -> serialize.
  9. SET explain cache (1-h TTL per D-48).

Threat model anchors:
  T-9-12 Tampering -- UUID() validation; 404 on non-UUID.
  T-9-16 Tampering -- shape-validate the deserialized feature_vec.
  T-9-17 Integrity -- model_hash in cache key rotates on D-38 retrain.
"""
from __future__ import annotations

import json
import logging
from uuid import UUID

import numpy as np
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from backend.api.models import ExplainResponse
from backend.pipeline.explain import (
    compute_driving_words,
    compute_track_contributions,
    compute_uncertainty_metrics,
    explain_cache_key,
    find_nearest_training_books,
)

router = APIRouter()
log = logging.getLogger(__name__)

EXPECTED_FEATURE_DIM = 600  # 400 topo (20^2 grid) + 200 vocab (k_clusters)
EXPLAIN_CACHE_TTL_SECONDS = 3600  # 1 h per D-48


@router.post('/classify/{job_id}/explain', response_model=ExplainResponse)
async def explain(job_id: str, request: Request):
    # --- 1. UUID format validation (T-9-12 mitigation) ---
    try:
        UUID(job_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail='Job not found.')

    state = request.app.state

    # --- 2. Calibration guard (D-40 / Q8) ---
    if not getattr(state, 'calibration_available', False):
        raise HTTPException(
            status_code=503,
            detail=(
                'Explanation unavailable: SVM is not calibrated. '
                'Re-run the precompute pipeline to enable.'
            ),
        )

    # --- 3. Explain artifacts + NN index guard (Pitfall 3) ---
    if (
        getattr(state, 'nn_index', None) is None
        or getattr(state, 'explain_artifacts', None) is None
    ):
        raise HTTPException(
            status_code=503,
            detail=(
                'Explanation unavailable: explain artifacts not loaded. '
                'Re-run precompute_explain.py.'
            ),
        )

    # --- 4. Redis guard ---
    redis = getattr(state, 'redis', None)
    if redis is None:
        raise HTTPException(
            status_code=503,
            detail='Explanation cache unavailable.',
        )

    # --- 5. Read feature_vec from Redis (D-47 hand-off) ---
    raw = await redis.get(f'feature_vec:{job_id}')
    if raw is None:
        # Canonical D-49 phrasing. useExplain.ts::onError parses on substring
        # 'Upload expired' to surface the re-upload prompt; do NOT rephrase.
        raise HTTPException(
            status_code=410,
            detail='Upload expired — re-upload to see the explanation.',
        )
    feature_vec = np.frombuffer(raw, dtype=np.float64)
    if feature_vec.shape != (EXPECTED_FEATURE_DIM,):
        # T-9-16: shape-validate the deserialized vector before it touches the SVM.
        raise HTTPException(
            status_code=500,
            detail=(
                f'feature_vec shape mismatch: got {feature_vec.shape}, '
                f'expected ({EXPECTED_FEATURE_DIM},)'
            ),
        )

    # --- 6. Cache lookup (D-48) ---
    cache_key = explain_cache_key(feature_vec, state.lineage)
    cached = await redis.get(cache_key)
    if cached is not None:
        try:
            if isinstance(cached, (bytes, bytearray)):
                cached = cached.decode('utf-8')
            payload = json.loads(cached)
            return JSONResponse(content=payload)
        except Exception as exc:
            # Fall through to recompute on corrupt cache; do not 500.
            log.warning(f'Corrupt explain cache for {cache_key}: {exc} -- recomputing')

    # --- 7. Compute explain payload ---
    svm = state.svm_pipeline
    artifacts = state.explain_artifacts
    nn_index = state.nn_index
    genre_names = list(state.genre_names)

    # 7a. Re-derive proba + predicted index (single source of truth -- Pitfall 1).
    proba = svm.predict_proba(feature_vec.reshape(1, -1))[0]
    predicted_idx = int(np.argmax(proba))
    predicted_genre = (
        genre_names[predicted_idx]
        if predicted_idx < len(genre_names)
        else f'unknown({predicted_idx})'
    )

    # 7b. Per-track contributions (D-44; batched (3, n_features) predict_proba).
    track_contributions = compute_track_contributions(
        feature_vec, svm, predicted_idx,
    )

    # 7c. Nearest training books (D-45).
    feat_l2 = feature_vec / (np.linalg.norm(feature_vec) + 1e-10)
    neighbours = find_nearest_training_books(
        feat_l2.astype(np.float32),
        nn_index,
        artifacts['book_metadata'],
        n_neighbors=5,
    )

    # 7d. Driving words (D-46): the worker did NOT write per-upload words/tfidf
    # to Redis, so derive surrogate driving words from the upload's vocab slab.
    # Pick top clusters by vocab-slab weight, surface each cluster's top
    # representative word, tag each via per-genre w2v centroid cosine.
    vocab_slab = feature_vec[400:]  # (200,)
    cluster_rep_words = artifacts['cluster_to_representative_words']
    per_genre_centroids = artifacts['per_genre_centroids']
    top_cluster_idx = np.argsort(-vocab_slab)[:15]
    w2v = state.w2v_model
    driving_word_inputs: list[str] = []
    driving_word_weights: list[float] = []
    for c in top_cluster_idx:
        c_int = int(c)
        words = (
            list(cluster_rep_words[c_int])
            if c_int < len(cluster_rep_words)
            else []
        )
        # Use the first representative word if it's in w2v vocab (skip OOV).
        if words and (w2v is None or words[0] in w2v.wv):
            driving_word_inputs.append(words[0])
            driving_word_weights.append(float(vocab_slab[c_int]))
    if w2v is None or not driving_word_inputs:
        driving_words: list[dict] = []
    else:
        driving_words = compute_driving_words(
            driving_word_inputs,
            np.array(driving_word_weights, dtype=np.float64),
            w2v,
            per_genre_centroids,
            genre_names,
            max_n=15,
        )

    # 7e. Uncertainty metrics (D-43 / D-52). Operative thresholds live in
    # backend.pipeline.explain so the worker SSE and /explain agree by default.
    uncertainty = compute_uncertainty_metrics(proba)

    # --- 8. Build + validate ExplainResponse ---
    payload = {
        'nearest_training_books': neighbours,
        'track_contributions': track_contributions,
        'driving_words': driving_words,
        'uncertainty': uncertainty,
        'predicted_genre': predicted_genre,
    }
    validated = ExplainResponse.model_validate(payload)
    response_json = validated.model_dump()

    # --- 9. Cache (1-h TTL per D-48) ---
    try:
        await redis.set(
            cache_key,
            json.dumps(response_json),
            ex=EXPLAIN_CACHE_TTL_SECONDS,
        )
    except Exception as exc:
        log.warning(f'Failed to set explain cache {cache_key}: {exc}')

    return response_json
