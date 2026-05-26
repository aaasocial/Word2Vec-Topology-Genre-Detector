"""Wave-0 test scaffold for Phase 9 explain math.

This file defines the canonical multiclass_brier_score + normalized_entropy
helpers inline for Wave 1 (calibration spike). Wave 2 will move them into
backend/pipeline/explain.py; this file will then switch its imports.
"""
import numpy as np
import pytest


def multiclass_brier_score(y_true, y_proba, n_classes):
    """Mean per-row sum-of-squared-errors between predict_proba and one-hot true.

    Range: [0, 2]. Lower is better. sklearn 1.6 brier_score_loss is binary-only.
    Reference: Niculescu-Mizil & Caruana (2005).
    """
    y_true = np.asarray(y_true, dtype=int)
    y_proba = np.asarray(y_proba, dtype=np.float64)
    assert y_proba.shape == (len(y_true), n_classes), f"shape mismatch: {y_proba.shape}"
    y_onehot = np.eye(n_classes)[y_true]
    return float(np.mean(np.sum((y_proba - y_onehot) ** 2, axis=1)))


def normalized_entropy(probabilities):
    """Normalized Shannon entropy in [0, 1]. 0 = certain, 1 = uniform.

    For n classes: raw entropy = -sum(p * log2(p)) capped at log2(n);
    normalized = raw / log2(n).
    """
    p = np.asarray(probabilities, dtype=np.float64) + 1e-12  # avoid log(0)
    raw = -np.sum(p * np.log2(p))
    return float(raw / np.log2(len(p)))


def test_brier_perfect_one_hot_equals_zero():
    y_true = [0, 1, 2]
    y_proba = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    assert multiclass_brier_score(y_true, y_proba, 3) == pytest.approx(0.0, abs=1e-12)


def test_brier_uniform_8_classes():
    # Uniform [1/8]*8 vs true class 0 -> (1-1/8)^2 + 7*(1/8)^2 = 49/64 + 7/64 = 56/64 = 0.875
    y_true = [0]
    y_proba = [[0.125] * 8]
    assert multiclass_brier_score(y_true, y_proba, 8) == pytest.approx(0.875, abs=1e-9)


def test_brier_range_bounded():
    rng = np.random.default_rng(42)
    y_true = rng.integers(0, 8, size=20)
    raw = rng.random((20, 8))
    y_proba = raw / raw.sum(axis=1, keepdims=True)
    val = multiclass_brier_score(y_true, y_proba, 8)
    assert 0.0 <= val <= 2.0


def test_entropy_uniform_equals_one():
    assert normalized_entropy([0.125] * 8) == pytest.approx(1.0, abs=1e-6)


def test_entropy_certain_equals_zero():
    p = [1.0] + [0.0] * 7
    assert normalized_entropy(p) == pytest.approx(0.0, abs=1e-6)


def test_entropy_range_bounded():
    rng = np.random.default_rng(42)
    for _ in range(20):
        raw = rng.random(8)
        p = raw / raw.sum()
        h = normalized_entropy(p)
        assert 0.0 <= h <= 1.0
