"""Tests for VR edge API endpoint."""
import json
import pytest
from unittest.mock import patch

pytestmark = pytest.mark.asyncio

_MOCK_VR_DATA = {
    'words': ['love', 'heart', 'passion'],
    'edges': [[0, 1, 0.25, 0], [0, 2, 0.5, 1], [1, 2, 0.75, 0]],
    'epsilon_max': 1.0,
    'positions': [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6], [0.7, 0.8, 0.9]],
}


async def test_vr_genre_returns_data_when_cached(client):
    """GET /viz/vr/{genre} returns cached VR edge data."""
    with patch('backend.api.routes.viz.get_cached_vr_edges', return_value=_MOCK_VR_DATA):
        with patch('backend.api.routes.viz._KNOWN_GENRES', ['romance', 'mystery']):
            resp = await client.get('/viz/vr/romance?projection=pca')
    assert resp.status_code == 200
    body = json.loads(resp.content)
    assert 'words' in body
    assert 'edges' in body
    assert 'epsilon_max' in body
    assert 'positions' in body
    assert len(body['edges']) == 3
    # Each edge is [int, int, float, int]
    for edge in body['edges']:
        assert len(edge) == 4
        assert isinstance(edge[0], int)
        assert isinstance(edge[1], int)
        assert isinstance(edge[3], int)
        assert 0 <= edge[0] < len(body['words'])
        assert 0 <= edge[1] < len(body['words'])


async def test_vr_invalid_genre_returns_404(client):
    """GET /viz/vr/{invalid_genre} returns 404."""
    with patch('backend.api.routes.viz._KNOWN_GENRES', ['romance', 'mystery']):
        resp = await client.get('/viz/vr/invalid_genre?projection=pca')
    assert resp.status_code == 404


async def test_vr_invalid_projection_returns_422(client):
    """GET /viz/vr/{genre}?projection=invalid returns 422 (FastAPI validation)."""
    with patch('backend.api.routes.viz._KNOWN_GENRES', ['romance']):
        resp = await client.get('/viz/vr/romance?projection=invalid')
    assert resp.status_code == 422


async def test_vr_not_cached_returns_503(client):
    """GET /viz/vr/{genre} returns 503 when VR data not precomputed."""
    with patch('backend.api.routes.viz.get_cached_vr_edges', return_value=None):
        with patch('backend.api.routes.viz._KNOWN_GENRES', ['romance']):
            resp = await client.get('/viz/vr/romance?projection=pca')
    assert resp.status_code == 503


async def test_vr_default_projection_is_pca(client):
    """GET /viz/vr/{genre} without projection param defaults to pca."""
    with patch('backend.api.routes.viz.get_cached_vr_edges', return_value=_MOCK_VR_DATA) as mock_get:
        with patch('backend.api.routes.viz._KNOWN_GENRES', ['romance']):
            resp = await client.get('/viz/vr/romance')
    assert resp.status_code == 200
    mock_get.assert_called_once()
    call_args = mock_get.call_args
    assert call_args[0][1] == 'pca'  # projection arg
