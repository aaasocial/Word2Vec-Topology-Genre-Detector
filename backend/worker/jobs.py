"""arq job functions for the classification pipeline.

This module is a thin orchestrator. All pipeline math lives in
backend/pipeline/ modules. Each step is called via run_in_executor
(CPU-bound) and receives a cancel_event for cooperative cancellation.

Blocker 2 fix: No inline pipeline logic -- imports from backend.pipeline.
Blocker 4 fix: All pipeline functions receive cancel_event parameter.
"""
import json
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor

import numpy as np

from backend.pipeline.embed import project_into_space
from backend.pipeline.homology import compute_book_homology
from backend.pipeline.features import build_feature_vector
from backend.pipeline.classify import predict_genre
from backend.pipeline.tokenize import validate_and_tokenize

_executor = ThreadPoolExecutor(max_workers=1)

STEP_MESSAGES = {
    'tokenize': 'Tokenizing text...',
    'tfidf': 'Computing TF-IDF weights...',
    'pointcloud': 'Building point cloud...',
    'homology': 'Computing persistent homology (step 4/6)...',
    'features': 'Building feature vector (step 5/6)...',
    'classify': 'Classifying genre...',
}

STEPS = ['tokenize', 'tfidf', 'pointcloud', 'homology', 'features', 'classify']


async def _publish_progress(redis, job_id: str, step: str, index: int,
                             status: str = 'running', result: dict = None):
    msg = {
        'step': step,
        'index': index,
        'total': 6,
        'message': STEP_MESSAGES.get(step, step),
        'status': status,
    }
    if result is not None:
        msg['result'] = result
    await redis.publish(f'job:{job_id}:progress', json.dumps(msg))


async def classify_book(ctx, file_content: bytes, job_id: str):
    """Classify an uploaded book through the full pipeline.

    Imports and calls pipeline functions from backend/pipeline/ (Blocker 2 fix).
    Creates cancel_event and passes to each function (Blocker 4 fix).

    Args:
        ctx: arq context with preloaded models (w2v_model, tfidf_vectorizer, etc.)
        file_content: Raw bytes of the uploaded .txt file
        job_id: UUID for progress channel routing

    Returns:
        dict with predicted_genre, confidence, oov_word_count, total_words, processing_time_s
    """
    redis = ctx['redis']
    w2v_model = ctx['w2v_model']
    tfidf_vectorizer = ctx['tfidf_vectorizer']
    kmeans = ctx['kmeans']
    svm_pipeline = ctx['svm_pipeline']
    persistence_imager = ctx['persistence_imager']
    params = ctx['params']
    genre_names = ctx['genre_names']

    loop = asyncio.get_event_loop()
    t_start = time.time()

    # Create a single cancel_event shared across all pipeline steps (Blocker 4)
    cancel_event = asyncio.Event()

    # Helper to check cancellation between steps
    async def _check_cancel():
        if cancel_event.is_set():
            raise asyncio.CancelledError('Job cancelled by client')

    try:
        # --- Step 1: Tokenize ---
        await _publish_progress(redis, job_id, 'tokenize', 1)
        text, tokens = await loop.run_in_executor(
            _executor,
            lambda: validate_and_tokenize(file_content, 'upload.txt')
        )
        total_words = len(tokens)

        await _check_cancel()

        # --- Step 2+3: TF-IDF + Point cloud (project_into_space handles both) ---
        await _publish_progress(redis, job_id, 'tfidf', 2)
        max_words = params['homology'].get('max_words', 100000)
        words, vectors, tfidf_weights, oov_count = await loop.run_in_executor(
            _executor,
            lambda: project_into_space(
                tokens, w2v_model, tfidf_vectorizer,
                max_words=max_words, cancel_event=cancel_event
            )
        )

        await _check_cancel()
        await _publish_progress(redis, job_id, 'pointcloud', 3)

        await _check_cancel()

        # --- Step 4: Homology ---
        await _publish_progress(redis, job_id, 'homology', 4)
        homology_dims = params['homology']['homology_dimensions']
        epsilon_max = params['homology']['epsilon_max']
        diagrams = await loop.run_in_executor(
            _executor,
            lambda: compute_book_homology(
                vectors, tfidf_weights,
                homology_dims=homology_dims, epsilon_max=epsilon_max,
                cancel_event=cancel_event
            )
        )

        await _check_cancel()

        # --- Step 5: Features ---
        await _publish_progress(redis, job_id, 'features', 5)
        k_clusters = params['features']['k_clusters']
        alpha = params['features']['alpha']
        feature_vec = await loop.run_in_executor(
            _executor,
            lambda: build_feature_vector(
                diagrams, words, tfidf_weights,
                w2v_model, kmeans, persistence_imager,
                k_clusters=k_clusters, alpha=alpha,
                cancel_event=cancel_event
            )
        )

        await _check_cancel()

        # --- Step 6: Classify ---
        await _publish_progress(redis, job_id, 'classify', 6)
        if svm_pipeline is None:
            raise ValueError('SVM pipeline not available. Run precompute.py first.')

        predicted_genre, confidence = await loop.run_in_executor(
            _executor,
            lambda: predict_genre(
                feature_vec, svm_pipeline, genre_names,
                cancel_event=cancel_event
            )
        )

        processing_time = time.time() - t_start
        result = {
            'predicted_genre': predicted_genre,
            'confidence': round(confidence, 4),
            'oov_word_count': oov_count,
            'total_words': total_words,
            'processing_time_s': round(processing_time, 2),
        }

        await _publish_progress(redis, job_id, 'classify', 6, status='done', result=result)
        return result

    except asyncio.CancelledError:
        await redis.publish(
            f'job:{job_id}:progress',
            json.dumps({'status': 'cancelled', 'step': 'cancelled', 'message': 'Job cancelled by client'})
        )
        raise
    except Exception as exc:
        await redis.publish(
            f'job:{job_id}:progress',
            json.dumps({'status': 'error', 'step': 'error', 'message': str(exc)})
        )
        raise
