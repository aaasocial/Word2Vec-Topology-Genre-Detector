"""Tests for persistence image API endpoints."""
import pytest
from unittest.mock import patch

pytestmark = pytest.mark.asyncio


async def test_persistence_genre_returns_data_when_cached(client):
    """GET /viz/persistence/{genre} returns cached data."""
    mock_data = {
        'data': [0.1, 0.2, 0.3, 0.4],
        'M': 2,
        'dim': 0,
        'vmin': 0.1,
        'vmax': 0.4,
    }
    with patch('backend.api.routes.viz.get_cached_persistence_image', return_value=mock_data):
        with patch('backend.api.routes.viz._KNOWN_GENRES', ['romance', 'mystery']):
            resp = await client.get('/viz/persistence/romance?dim=0')
    assert resp.status_code == 200
    body = resp.json()
    assert body['M'] == 2
    assert body['dim'] == 0
    assert isinstance(body['data'], list)
    assert 'vmin' in body
    assert 'vmax' in body


async def test_persistence_genre_dim1(client):
    """GET /viz/persistence/{genre}?dim=1 returns H1 data."""
    mock_data = {
        'data': [0.5, 0.6, 0.7, 0.8],
        'M': 2,
        'dim': 1,
        'vmin': 0.5,
        'vmax': 0.8,
    }
    with patch('backend.api.routes.viz.get_cached_persistence_image', return_value=mock_data):
        with patch('backend.api.routes.viz._KNOWN_GENRES', ['romance']):
            resp = await client.get('/viz/persistence/romance?dim=1')
    assert resp.status_code == 200
    assert resp.json()['dim'] == 1


async def test_persistence_invalid_genre_returns_404(client):
    """GET /viz/persistence/{invalid_genre} returns 404."""
    with patch('backend.api.routes.viz._KNOWN_GENRES', ['romance', 'mystery']):
        resp = await client.get('/viz/persistence/invalid_genre?dim=0')
    assert resp.status_code == 404


async def test_persistence_invalid_dim_returns_400(client):
    """GET /viz/persistence/{genre}?dim=5 returns 400."""
    with patch('backend.api.routes.viz._KNOWN_GENRES', ['romance']):
        resp = await client.get('/viz/persistence/romance?dim=5')
    assert resp.status_code == 400


async def test_persistence_book_returns_data_when_cached(client):
    """GET /viz/persistence/book/{id} returns cached data."""
    mock_data = {
        'data': [0.1, 0.2, 0.3, 0.4],
        'M': 2,
        'dim': 0,
        'vmin': 0.1,
        'vmax': 0.4,
    }
    with patch('backend.api.routes.viz.get_cached_persistence_image', return_value=mock_data):
        resp = await client.get('/viz/persistence/book/12345?dim=0')
    assert resp.status_code == 200
    body = resp.json()
    assert body['M'] == 2


async def test_persistence_book_invalid_id_returns_400(client):
    """GET /viz/persistence/book/{invalid} returns 400."""
    resp = await client.get('/viz/persistence/book/abc?dim=0')
    assert resp.status_code == 400


async def test_persistence_book_not_cached_returns_404(client):
    """GET /viz/persistence/book/{id} returns 404 when not cached."""
    with patch('backend.api.routes.viz.get_cached_persistence_image', return_value=None):
        resp = await client.get('/viz/persistence/book/99999?dim=0')
    assert resp.status_code == 404
