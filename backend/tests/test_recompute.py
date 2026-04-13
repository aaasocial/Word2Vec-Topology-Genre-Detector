"""Tests for POST /viz/recompute endpoint (PARAM-06)."""
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from backend.api.app import app
from backend.api.routes.viz import PARAM_DEPENDENCY_MAP, PARAM_RANGES

client = TestClient(app)


class TestRecomputeEndpoint:
    """Test suite for POST /viz/recompute."""

    def test_valid_slow_tier_params_returns_job_id_and_affected_steps(self):
        """POST with valid slow-tier params returns job_id and correct affected_steps."""
        with patch('backend.api.routes.viz._recompute_in_progress', False):
            resp = client.post('/viz/recompute', json={
                'changed_params': {'sigma': 0.5, 'svm_C': 10.0}
            })
        assert resp.status_code == 200
        data = resp.json()
        assert 'job_id' in data
        assert 'affected_steps' in data
        # sigma affects persistence_images, features, svm
        assert 'persistence_images' in data['affected_steps']
        assert 'svm' in data['affected_steps']

    def test_unknown_param_returns_422(self):
        """POST with unknown param name returns 422."""
        resp = client.post('/viz/recompute', json={
            'changed_params': {'unknown_param': 1.0}
        })
        assert resp.status_code == 422

    def test_out_of_range_value_returns_422(self):
        """POST with out-of-range value returns 422."""
        resp = client.post('/viz/recompute', json={
            'changed_params': {'sigma': 999.0}  # max is 2.0
        })
        assert resp.status_code == 422

    def test_concurrent_job_returns_429(self):
        """POST while another job is running returns 429."""
        with patch('backend.api.routes.viz._recompute_in_progress', True):
            resp = client.post('/viz/recompute', json={
                'changed_params': {'sigma': 0.5}
            })
        assert resp.status_code == 429

    def test_param_dependency_map_epsilon_max(self):
        """PARAM_DEPENDENCY_MAP correctly maps epsilon_max."""
        expected = ['homology', 'persistence_images', 'vr_edges', 'features', 'svm']
        assert PARAM_DEPENDENCY_MAP['epsilon_max'] == expected

    def test_empty_changed_params_returns_422(self):
        """POST with empty changed_params returns 422."""
        resp = client.post('/viz/recompute', json={
            'changed_params': {}
        })
        assert resp.status_code == 422
