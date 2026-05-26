"""Genre prediction using the calibrated SVM pipeline (Phase 9).

D-37 / D-38: ``predict_top_n`` returns the full ranked list of (genre,
probability) tuples from ``predict_proba`` (calibrated, sums to 1).
``TopNList.tsx`` slices to top-3 + expander on the frontend.

Legacy ``predict_genre`` is a thin wrapper around ``predict_top_n`` for
back-compat callers -- returns the top-1 (genre, probability) tuple.

Accepts ``cancel_event`` for cooperative cancellation (Blocker 4).
"""
import asyncio

import numpy as np


def predict_top_n(
    feature_vector: np.ndarray,
    svm_pipeline,
    genre_names: list[str],
    cancel_event: asyncio.Event = None,
) -> list[tuple[str, float]]:
    """Return ranked list of (genre, probability), length = len(genre_names).

    Sorted descending by probability. Sum of probabilities is 1.0 within
    float epsilon (sklearn's calibrated ``predict_proba`` contract).

    Args:
        feature_vector: Combined topology + location feature vector.
        svm_pipeline: Pre-trained sklearn Pipeline whose final estimator exposes
            ``predict_proba``. Phase 9 D-38 retrain guarantees this.
        genre_names: List of genre names, indexed by SVM integer label.
        cancel_event: If set, raises ``asyncio.CancelledError`` before compute.

    Returns:
        ``list[tuple[str, float]]`` of length ``len(genre_names)`` (8 for v2),
        sorted descending by probability.
    """
    if cancel_event and cancel_event.is_set():
        raise asyncio.CancelledError('Cancelled before classify step')

    X = np.asarray(feature_vector, dtype=np.float64).reshape(1, -1)
    probas = svm_pipeline.predict_proba(X)[0]  # shape: (n_classes,)
    classes = svm_pipeline.classes_  # integer label array, len == n_classes
    ranked_idx = np.argsort(probas)[::-1]
    return [
        (
            genre_names[int(classes[i])]
            if int(classes[i]) < len(genre_names)
            else f'unknown({int(classes[i])})',
            float(probas[i]),
        )
        for i in ranked_idx
    ]


def predict_genre(
    feature_vector: np.ndarray,
    svm_pipeline,
    genre_names: list[str],
    cancel_event: asyncio.Event = None,
) -> tuple[str, float]:
    """Legacy single-prediction wrapper. Returns top-1 (genre, probability).

    DO NOT use for new code -- call ``predict_top_n`` directly for the full
    ranked list. Retained so pre-Phase-9 call sites (SSE result derivation,
    tests) keep working without churn.
    """
    top_n = predict_top_n(
        feature_vector, svm_pipeline, genre_names, cancel_event=cancel_event
    )
    return top_n[0]
