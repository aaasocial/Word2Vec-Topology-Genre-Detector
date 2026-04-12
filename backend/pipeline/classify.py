"""Genre prediction using pre-trained SVM pipeline.

Accepts cancel_event for cooperative cancellation (per CONTEXT.md).
"""
import asyncio

import numpy as np


def predict_genre(
    feature_vector: np.ndarray,
    svm_pipeline,
    genre_names: list[str],
    cancel_event: asyncio.Event = None,
) -> tuple[str, float]:
    """Predict genre from feature vector.

    Args:
        feature_vector: Combined topology + location feature vector
        svm_pipeline: Pre-trained sklearn Pipeline (StandardScaler -> VarianceThreshold -> SVC)
        genre_names: List of genre names for label-to-genre mapping
        cancel_event: If set, raises asyncio.CancelledError before computation

    Returns (genre_name, confidence).
    """
    if cancel_event and cancel_event.is_set():
        raise asyncio.CancelledError('Cancelled before classify step')

    X = feature_vector.reshape(1, -1)
    label = int(svm_pipeline.predict(X)[0])

    if hasattr(svm_pipeline, 'decision_function'):
        decision = svm_pipeline.decision_function(X)
        if decision.ndim > 1:
            confidence = float(np.max(decision))
        else:
            confidence = float(abs(decision[0]))
    else:
        confidence = 0.0

    genre = genre_names[label] if label < len(genre_names) else f'unknown({label})'
    return genre, confidence
