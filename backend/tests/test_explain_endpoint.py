"""Integration tests for POST /api/classify/{job_id}/explain (D-46 / DEPTH-03).

Covers:
  - Happy path: returns ExplainResponse-shaped JSON with the 5 required keys
    and 5 nearest training books; track_contributions sum to 100.
  - 410 Gone: missing feature_vec key in Redis (canonical D-49 phrasing).
  - 503: calibration_available False, nn_index None, redis None.
  - 404: malformed job_id (T-9-12).
  - Cache hit: a second call with the same feature_vec hits the
    explain:{hash}:{model_hash} key and returns the cached payload.

LFS dependency: tests skip gracefully if the deployed v2 SVM / explain_artifacts
are not on disk. CI without LFS-pull will skip rather than fail.
"""
from __future__ import annotations

import json
import uuid
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.api.app import create_app


REPO_ROOT = Path(__file__).resolve().parents[2]
FEATURE_VEC_FIXTURE = REPO_ROOT / "backend" / "tests" / "fixtures" / "feature_vec_sample.npy"
SVM_PATH = REPO_ROOT / "data" / "models" / "svm_pipeline.joblib"
ARTIFACTS_PATH = REPO_ROOT / "data" / "models" / "explain_artifacts.npz"


@pytest.fixture(scope="module")
def client_with_loaded_state():
    """Spin up the app via TestClient (triggers lifespan).

    Snapshots app.state.redis before yielding so individual tests can swap in
    a MagicMock without leaving one behind for the lifespan-exit close() call
    (which would TypeError on `await MagicMock().close()`).
    """
    if not (
        FEATURE_VEC_FIXTURE.exists()
        and SVM_PATH.exists()
        and ARTIFACTS_PATH.exists()
    ):
        pytest.skip("Required artifacts missing -- run Plan 09-01 + 09-02")
    app = create_app()
    with TestClient(app) as client:
        original_redis = getattr(app.state, "redis", None)
        try:
            yield app, client
        finally:
            # Restore the original Redis client (or None) so lifespan-exit
            # cleanup doesn't try to await close() on a MagicMock.
            app.state.redis = original_redis


def _make_redis_mock(feature_vec_bytes: bytes | None):
    """AsyncMock Redis whose GET returns the supplied bytes (or None)."""
    redis = MagicMock()
    redis.get = AsyncMock(return_value=feature_vec_bytes)
    redis.set = AsyncMock(return_value=True)
    return redis


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


def test_explain_happy_path(client_with_loaded_state):
    app, client = client_with_loaded_state
    if not getattr(app.state, "calibration_available", False):
        pytest.skip("SVM not calibrated -- run Plan 09-01 retrain")
    if getattr(app.state, "nn_index", None) is None:
        pytest.skip("nn_index missing -- run Plan 09-02 precompute_explain")

    feat = np.load(FEATURE_VEC_FIXTURE)
    job_id = str(uuid.uuid4())
    app.state.redis = _make_redis_mock(feat.astype(np.float64).tobytes())

    r = client.post(f"/api/classify/{job_id}/explain")
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body.keys()) >= {
        "nearest_training_books",
        "track_contributions",
        "driving_words",
        "uncertainty",
        "predicted_genre",
    }
    assert len(body["nearest_training_books"]) == 5
    tc = body["track_contributions"]
    assert abs(tc["topology"]["pct"] + tc["vocabulary"]["pct"] - 100.0) < 1e-3
    assert tc["topology"]["direction"] in ("+", "-", "0")
    assert tc["vocabulary"]["direction"] in ("+", "-", "0")
    # Uncertainty metrics shape
    unc = body["uncertainty"]
    assert 0.0 <= unc["entropy"] <= 1.0
    assert isinstance(unc["badge_fires"], bool)
    # Predicted genre is one of the 8 v2 genres
    assert body["predicted_genre"] in list(app.state.genre_names)


# ---------------------------------------------------------------------------
# Error / fallback paths
# ---------------------------------------------------------------------------


def test_explain_410_when_feature_vec_missing(client_with_loaded_state):
    app, client = client_with_loaded_state
    if not getattr(app.state, "calibration_available", False):
        pytest.skip("SVM not calibrated")
    if getattr(app.state, "nn_index", None) is None:
        pytest.skip("nn_index missing")

    job_id = str(uuid.uuid4())
    app.state.redis = _make_redis_mock(None)  # Redis GET returns None

    r = client.post(f"/api/classify/{job_id}/explain")
    assert r.status_code == 410, r.text
    # Canonical D-49 phrasing -- frontend useExplain.ts greps on this.
    assert "Upload expired" in r.json()["detail"]


def test_explain_503_when_calibration_unavailable(client_with_loaded_state):
    app, client = client_with_loaded_state
    feat = np.load(FEATURE_VEC_FIXTURE)
    job_id = str(uuid.uuid4())
    app.state.redis = _make_redis_mock(feat.astype(np.float64).tobytes())
    original = app.state.calibration_available
    app.state.calibration_available = False
    try:
        r = client.post(f"/api/classify/{job_id}/explain")
        assert r.status_code == 503, r.text
        assert "SVM is not calibrated" in r.json()["detail"]
    finally:
        app.state.calibration_available = original


def test_explain_503_when_nn_index_missing(client_with_loaded_state):
    app, client = client_with_loaded_state
    if not getattr(app.state, "calibration_available", False):
        pytest.skip("SVM not calibrated")
    feat = np.load(FEATURE_VEC_FIXTURE)
    job_id = str(uuid.uuid4())
    app.state.redis = _make_redis_mock(feat.astype(np.float64).tobytes())
    original_nn = app.state.nn_index
    app.state.nn_index = None
    try:
        r = client.post(f"/api/classify/{job_id}/explain")
        assert r.status_code == 503, r.text
        assert "explain artifacts" in r.json()["detail"]
    finally:
        app.state.nn_index = original_nn


def test_explain_503_when_redis_unavailable(client_with_loaded_state):
    app, client = client_with_loaded_state
    if not getattr(app.state, "calibration_available", False):
        pytest.skip("SVM not calibrated")
    if getattr(app.state, "nn_index", None) is None:
        pytest.skip("nn_index missing")

    job_id = str(uuid.uuid4())
    original_redis = app.state.redis
    app.state.redis = None
    try:
        r = client.post(f"/api/classify/{job_id}/explain")
        assert r.status_code == 503, r.text
        assert "Explanation cache unavailable" in r.json()["detail"]
    finally:
        app.state.redis = original_redis


def test_explain_404_on_invalid_job_id_format(client_with_loaded_state):
    """T-9-12 mitigation: non-UUID path component must NOT slip into Redis lookup."""
    _app, client = client_with_loaded_state
    r = client.post("/api/classify/not-a-uuid/explain")
    assert r.status_code == 404, r.text
    assert "Job not found" in r.json()["detail"]


# ---------------------------------------------------------------------------
# Cache hit
# ---------------------------------------------------------------------------


def test_explain_cache_hit_returns_cached_payload(client_with_loaded_state):
    """Repeat call with the same feature_vec returns the cached JSON
    without invoking the SVM / artifact pipeline."""
    app, client = client_with_loaded_state
    if not getattr(app.state, "calibration_available", False):
        pytest.skip("SVM not calibrated")
    if getattr(app.state, "nn_index", None) is None:
        pytest.skip("nn_index missing")

    feat = np.load(FEATURE_VEC_FIXTURE)
    job_id = str(uuid.uuid4())

    cached_payload = {
        "nearest_training_books": [
            {
                "gutenberg_id": "1",
                "title": "cached",
                "author": "x",
                "genre": "romance",
                "distance": 0.0,
            }
        ] * 5,
        "track_contributions": {
            "topology": {"pct": 50.0, "direction": "+"},
            "vocabulary": {"pct": 50.0, "direction": "+"},
        },
        "driving_words": [],
        "uncertainty": {
            "entropy": 0.0,
            "top1_top2_gap": 1.0,
            "badge_fires": False,
        },
        "predicted_genre": "romance",
    }

    redis = MagicMock()

    async def get_side_effect(key):
        if key.startswith("feature_vec:"):
            return feat.astype(np.float64).tobytes()
        # Cache key lookup -- return JSON bytes
        return json.dumps(cached_payload).encode("utf-8")

    redis.get = AsyncMock(side_effect=get_side_effect)
    redis.set = AsyncMock(return_value=True)
    app.state.redis = redis

    r = client.post(f"/api/classify/{job_id}/explain")
    assert r.status_code == 200, r.text
    body = r.json()
    # Verify the cached payload short-circuited the compute path (verbatim
    # title 'cached' came from the mock, not the real SVM).
    assert body["nearest_training_books"][0]["title"] == "cached"
    # And the worker side-effect path was not invoked (no SET to the cache
    # because we returned a hit before reaching step 9).
    redis.set.assert_not_called()


def test_explain_cache_miss_writes_with_1h_ttl(client_with_loaded_state):
    """Cache miss path: confirms ex=3600 on the SET call (D-48)."""
    app, client = client_with_loaded_state
    if not getattr(app.state, "calibration_available", False):
        pytest.skip("SVM not calibrated")
    if getattr(app.state, "nn_index", None) is None:
        pytest.skip("nn_index missing")

    feat = np.load(FEATURE_VEC_FIXTURE)
    job_id = str(uuid.uuid4())

    redis = MagicMock()
    get_keys: list[str] = []

    async def get_side_effect(key):
        get_keys.append(key)
        if key.startswith("feature_vec:"):
            return feat.astype(np.float64).tobytes()
        return None  # explain cache miss

    redis.get = AsyncMock(side_effect=get_side_effect)
    redis.set = AsyncMock(return_value=True)
    app.state.redis = redis

    r = client.post(f"/api/classify/{job_id}/explain")
    assert r.status_code == 200, r.text
    # The endpoint should have GET'd both feature_vec:{id} and explain:{...}
    assert any(k.startswith("feature_vec:") for k in get_keys)
    assert any(k.startswith("explain:") for k in get_keys)
    # And it should have SET the explain cache with a 1-h TTL.
    assert redis.set.call_count >= 1
    set_kwargs = redis.set.call_args.kwargs
    assert set_kwargs.get("ex") == 3600
