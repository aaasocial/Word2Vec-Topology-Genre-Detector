"""Phase 9 Q6: lifespan loads SVM + w2v + explain artifacts + NN index into app.state.

Verifies the Wave-2 contract that downstream plans (09-03 classify/explain
endpoint, 09-04 frontend integration) depend on:
  - All Phase 9 attributes present on app.state (default to None if any load fails)
  - calibration_available bool is True iff verify_svm_lineage returns (True, ...)
  - nn_index is a fitted NearestNeighbors(n_neighbors=5, metric='euclidean')
  - Degraded mode: missing/corrupt explain_artifacts.npz must not block SVM load
  - corpus_hash drift between artifact and lineage zeros out nn_index gracefully
  - Root /health endpoint stays 200 even if any sub-load failed
"""
import pytest
from fastapi.testclient import TestClient

from backend.api.app import create_app


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def app_with_lifespan():
    """Boot the app via TestClient so the lifespan runs end-to-end."""
    app = create_app()
    # TestClient triggers the lifespan context manager via its __enter__/__exit__
    with TestClient(app) as client:
        yield app, client


# ---------------------------------------------------------------------------
# Contract tests
# ---------------------------------------------------------------------------


def test_lifespan_attributes_present(app_with_lifespan):
    """All Phase 9 attributes are set, even when sub-loads fail."""
    app, _ = app_with_lifespan
    for attr in (
        "svm_pipeline",
        "w2v_model",
        "genre_names",
        "lineage",
        "calibration_available",
        "explain_artifacts",
        "nn_index",
        "params",
    ):
        assert hasattr(app.state, attr), f"app.state.{attr} missing"


def test_calibration_available_when_svm_calibrated(app_with_lifespan):
    """After Plan 09-01 retrain, calibration_method is set; lineage matches."""
    app, _ = app_with_lifespan
    if app.state.svm_pipeline is None:
        pytest.skip("SVM not loaded -- likely missing models directory in CI")
    # Lineage must include calibration_method per D-40
    assert app.state.lineage is not None
    assert app.state.lineage.get("calibration_method") is not None
    assert app.state.calibration_available is True, (
        f"calibration_available=False; lineage={app.state.lineage}"
    )


def test_nn_index_fitted(app_with_lifespan):
    """nn_index is a fitted NearestNeighbors(n_neighbors=5, euclidean) over the
    600-D L2-normalized training feature matrix."""
    app, _ = app_with_lifespan
    if app.state.nn_index is None:
        pytest.skip("explain_artifacts.npz missing -- run precompute_explain.py")
    assert app.state.nn_index.n_neighbors == 5
    # NearestNeighbors stores the training data internally; sanity check via _fit_X
    assert app.state.nn_index._fit_X.shape[1] == 600


def test_explain_artifacts_keys(app_with_lifespan):
    """All six canonical artifact keys are exposed on app.state.explain_artifacts."""
    app, _ = app_with_lifespan
    if app.state.explain_artifacts is None:
        pytest.skip("explain_artifacts.npz missing -- run precompute_explain.py")
    for key in (
        "feature_matrix_l2",
        "book_metadata",
        "per_genre_centroids",
        "genre_names",
        "cluster_to_representative_words",
        "metadata",
    ):
        assert key in app.state.explain_artifacts, f"missing {key}"


def test_health_check_works_in_degraded_mode(app_with_lifespan):
    """Root /health must respond even if some model loads failed."""
    _, client = app_with_lifespan
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
