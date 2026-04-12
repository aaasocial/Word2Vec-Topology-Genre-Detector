"""Tests for backend/pipeline/ modules -- covers CLASS-02, Blocker 4."""
import pytest
import asyncio
import numpy as np
from backend.pipeline.homology import build_weighted_distance_matrix
from backend.pipeline.features import (
    diagram_to_birth_persistence,
    build_persistence_imager,
)
from backend.pipeline.classify import predict_genre

# --- Blocker 4 tests: cancel_event parameter ---


def test_embed_accepts_cancel_event():
    """project_into_space accepts cancel_event parameter (Blocker 4)."""
    import inspect
    from backend.pipeline.embed import project_into_space
    sig = inspect.signature(project_into_space)
    assert 'cancel_event' in sig.parameters
    param = sig.parameters['cancel_event']
    assert param.default is None


def test_homology_accepts_cancel_event():
    """compute_book_homology accepts cancel_event parameter (Blocker 4)."""
    import inspect
    from backend.pipeline.homology import compute_book_homology
    sig = inspect.signature(compute_book_homology)
    assert 'cancel_event' in sig.parameters
    param = sig.parameters['cancel_event']
    assert param.default is None


def test_features_accepts_cancel_event():
    """build_feature_vector accepts cancel_event parameter (Blocker 4)."""
    import inspect
    from backend.pipeline.features import build_feature_vector
    sig = inspect.signature(build_feature_vector)
    assert 'cancel_event' in sig.parameters
    param = sig.parameters['cancel_event']
    assert param.default is None


def test_classify_accepts_cancel_event():
    """predict_genre accepts cancel_event parameter (Blocker 4)."""
    import inspect
    from backend.pipeline.classify import predict_genre
    sig = inspect.signature(predict_genre)
    assert 'cancel_event' in sig.parameters
    param = sig.parameters['cancel_event']
    assert param.default is None


def test_cancel_event_raises_when_set():
    """Pipeline function raises CancelledError when cancel_event is set (Blocker 4)."""
    event = asyncio.Event()
    event.set()
    with pytest.raises(asyncio.CancelledError):
        predict_genre(
            np.zeros(10), None, ['genre_a'],
            cancel_event=event
        )

# --- Homology tests ---


def test_build_weighted_distance_matrix_shape():
    vectors = np.random.randn(10, 50).astype(np.float32)
    weights = np.random.rand(10).astype(np.float32)
    dm = build_weighted_distance_matrix(vectors, weights)
    assert dm.shape == (10, 10)
    np.testing.assert_array_almost_equal(np.diag(dm), 0.0)


def test_build_weighted_distance_matrix_symmetric():
    vectors = np.random.randn(10, 50).astype(np.float32)
    weights = np.random.rand(10).astype(np.float32)
    dm = build_weighted_distance_matrix(vectors, weights)
    np.testing.assert_array_almost_equal(dm, dm.T)


@pytest.mark.integration
def test_compute_book_homology_produces_diagram():
    """Integration test: requires ripser."""
    from backend.pipeline.homology import compute_book_homology
    vectors = np.random.randn(20, 50).astype(np.float32)
    weights = np.random.rand(20).astype(np.float32)
    diagrams = compute_book_homology(vectors, weights, homology_dims=[1], epsilon_max=2.0)
    assert diagrams.ndim == 3
    assert diagrams.shape[0] == 1
    assert diagrams.shape[2] == 3

# --- Features tests ---


def test_diagram_to_birth_persistence_empty():
    empty_diag = np.zeros((0, 3), dtype=np.float32)[np.newaxis, :, :]
    result = diagram_to_birth_persistence(empty_diag, dim=1)
    assert result.shape == (0, 2)


def test_diagram_to_birth_persistence_extracts_h1():
    # Create diagram with H0 and H1 entries
    data = np.array([
        [0.0, 0.5, 0.0],  # H0
        [0.1, 0.8, 1.0],  # H1
        [0.2, 0.6, 1.0],  # H1
        [0.3, 0.9, 0.0],  # H0
    ], dtype=np.float32)[np.newaxis, :, :]
    result = diagram_to_birth_persistence(data, dim=1)
    assert result.shape == (2, 2)
    # persistence = death - birth
    np.testing.assert_almost_equal(result[0, 1], 0.7)  # 0.8 - 0.1
    np.testing.assert_almost_equal(result[1, 1], 0.4)  # 0.6 - 0.2


def test_persistence_imager_output_shape():
    diag1 = np.array([[0.1, 0.5], [0.2, 0.3]])
    diag2 = np.array([[0.0, 0.4], [0.3, 0.6]])
    imager = build_persistence_imager([diag1, diag2], grid_resolution=20, sigma=0.05)
    result = imager(diag1)
    assert result.shape == (400,)


def test_persistence_imager_empty_diagram():
    diag1 = np.array([[0.1, 0.5]])
    imager = build_persistence_imager([diag1], grid_resolution=20, sigma=0.05)
    empty = np.zeros((0, 2))
    result = imager(empty)
    assert result.shape == (400,)
    np.testing.assert_array_equal(result, np.zeros(400))

# --- Classify tests ---


def test_predict_genre_returns_tuple():
    """predict_genre returns (genre_name, confidence) tuple."""
    from unittest.mock import MagicMock
    mock_svm = MagicMock()
    mock_svm.predict.return_value = np.array([1])
    mock_svm.decision_function.return_value = np.array([[0.5, 1.2, 0.3]])
    genre, confidence = predict_genre(
        np.zeros(10), mock_svm, ['horror', 'romance', 'scifi']
    )
    assert genre == 'romance'
    assert confidence == 1.2
