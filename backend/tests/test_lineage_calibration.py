"""Wave-0 lineage extension tests (D-40)."""
import json
from pathlib import Path

import joblib
import pytest

from backend.cache.lineage import verify_svm_lineage, write_svm_lineage


@pytest.fixture
def fake_svm_path(tmp_path: Path) -> Path:
    """Return a path to a dummy joblib file so write_svm_lineage can attach a sidecar."""
    svm_path = tmp_path / "svm_pipeline.joblib"
    joblib.dump({"dummy": True}, svm_path)
    return svm_path


def _patch_hashes(monkeypatch):
    """Stub out corpus_hash + w2v_model_sha256 so tests don't depend on real files."""
    from backend.cache import lineage as L
    monkeypatch.setattr(L, "corpus_hash", lambda: "deadbeef" * 8)
    monkeypatch.setattr(L, "w2v_model_sha256", lambda window: "cafef00d" * 8)


def test_lineage_refuses_when_calibration_method_missing(fake_svm_path, monkeypatch):
    # Write a sidecar that intentionally omits calibration_method
    sidecar = fake_svm_path.with_suffix(fake_svm_path.suffix + ".lineage.json")
    _patch_hashes(monkeypatch)
    payload = {
        "svm_file": fake_svm_path.name,
        "w2v_model_sha256": "cafef00d" * 8,
        "corpus_hash": "deadbeef" * 8,
        "window": 15, "k_clusters": 200, "alpha": 0.7,
        "feature_normalization": {"structure": "l2", "location": "l2"},
        "created_utc": "2026-05-27T00:00:00Z", "created_by": "test",
        # NO calibration_method
    }
    sidecar.write_text(json.dumps(payload))
    ok, reason = verify_svm_lineage(fake_svm_path, window=15)
    assert ok is False
    assert "calibration_method" in reason


def test_lineage_refuses_unknown_calibration_method(fake_svm_path, monkeypatch):
    sidecar = fake_svm_path.with_suffix(fake_svm_path.suffix + ".lineage.json")
    _patch_hashes(monkeypatch)
    payload = {
        "svm_file": fake_svm_path.name,
        "w2v_model_sha256": "cafef00d" * 8,
        "corpus_hash": "deadbeef" * 8,
        "window": 15, "k_clusters": 200, "alpha": 0.7,
        "feature_normalization": {"structure": "l2", "location": "l2"},
        "created_utc": "2026-05-27T00:00:00Z", "created_by": "test",
        "calibration_method": "softmax_decision_function",  # not allowed
    }
    sidecar.write_text(json.dumps(payload))
    ok, reason = verify_svm_lineage(fake_svm_path, window=15)
    assert ok is False
    assert "unknown" in reason or "calibration_method" in reason


def test_lineage_accepts_libsvm_platt(fake_svm_path, monkeypatch):
    sidecar = fake_svm_path.with_suffix(fake_svm_path.suffix + ".lineage.json")
    _patch_hashes(monkeypatch)
    payload = {
        "svm_file": fake_svm_path.name,
        "w2v_model_sha256": "cafef00d" * 8,
        "corpus_hash": "deadbeef" * 8,
        "window": 15, "k_clusters": 200, "alpha": 0.7,
        "feature_normalization": {"structure": "l2", "location": "l2"},
        "created_utc": "2026-05-27T00:00:00Z", "created_by": "test",
        "calibration_method": "libsvm_platt",
        "calibration_brier_score": 0.42,
        "calibration_report": "results/v2_calibration_report.md",
    }
    sidecar.write_text(json.dumps(payload))
    ok, reason = verify_svm_lineage(fake_svm_path, window=15)
    assert ok is True
    assert reason == "lineage matches"


def test_lineage_accepts_calibrated_cv_sigmoid(fake_svm_path, monkeypatch):
    sidecar = fake_svm_path.with_suffix(fake_svm_path.suffix + ".lineage.json")
    _patch_hashes(monkeypatch)
    payload = {
        "svm_file": fake_svm_path.name,
        "w2v_model_sha256": "cafef00d" * 8,
        "corpus_hash": "deadbeef" * 8,
        "window": 15, "k_clusters": 200, "alpha": 0.7,
        "feature_normalization": {"structure": "l2", "location": "l2"},
        "created_utc": "2026-05-27T00:00:00Z", "created_by": "test",
        "calibration_method": "calibrated_cv_sigmoid",
        "calibration_brier_score": 0.41,
        "calibration_report": "results/v2_calibration_report.md",
    }
    sidecar.write_text(json.dumps(payload))
    ok, reason = verify_svm_lineage(fake_svm_path, window=15)
    assert ok is True
