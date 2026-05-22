"""Tests for persistence image API endpoints.

v2 (Plan 06-04): the persistence-image and persistence-diagram endpoints serve
H1 only -- the ``dim`` query parameter is narrowed to ``Literal[1]`` and any
other value triggers a 422 from FastAPI before the route body runs. H0 is
degenerate in weighted VR, H2 is deferred to v3 (PROJECT.md Key Decisions;
PITFALLS.md sections 2 and 3). The v1 tests that exercised ``dim=0`` /
``dim=5`` were deleted (D-03) and replaced with H1-only equivalents plus an
explicit dim=0/dim=2 rejection guard.
"""
import pytest
from unittest.mock import patch

pytestmark = pytest.mark.asyncio


async def test_persistence_genre_returns_data_when_cached(client):
    """GET /viz/persistence/{genre} returns cached H1 data."""
    mock_data = {
        'data': [0.1, 0.2, 0.3, 0.4],
        'M': 2,
        'dim': 1,
        'vmin': 0.1,
        'vmax': 0.4,
    }
    with patch('backend.api.routes.viz.get_cached_persistence_image', return_value=mock_data):
        with patch('backend.api.routes.viz._KNOWN_GENRES', ['romance', 'mystery']):
            resp = await client.get('/api/viz/persistence/romance?dim=1')
    assert resp.status_code == 200
    body = resp.json()
    assert body['M'] == 2
    assert body['dim'] == 1
    assert isinstance(body['data'], list)
    assert 'vmin' in body
    assert 'vmax' in body


async def test_persistence_genre_default_dim_is_h1(client):
    """Default dim is 1 when query parameter is omitted."""
    mock_data = {
        'data': [0.5, 0.6, 0.7, 0.8],
        'M': 2,
        'dim': 1,
        'vmin': 0.5,
        'vmax': 0.8,
    }
    with patch('backend.api.routes.viz.get_cached_persistence_image', return_value=mock_data):
        with patch('backend.api.routes.viz._KNOWN_GENRES', ['romance']):
            resp = await client.get('/api/viz/persistence/romance')
    assert resp.status_code == 200
    assert resp.json()['dim'] == 1


async def test_persistence_invalid_genre_returns_404(client):
    """GET /viz/persistence/{invalid_genre} returns 404."""
    with patch('backend.api.routes.viz._KNOWN_GENRES', ['romance', 'mystery']):
        resp = await client.get('/api/viz/persistence/invalid_genre?dim=1')
    assert resp.status_code == 404


async def test_persistence_rejects_h0_with_422(client):
    """dim=0 hits the Literal[1] guard with a 422 before any route logic runs."""
    with patch('backend.api.routes.viz._KNOWN_GENRES', ['romance']):
        resp = await client.get('/api/viz/persistence/romance?dim=0')
    assert resp.status_code == 422


async def test_persistence_rejects_h2_with_422(client):
    """dim=2 hits the Literal[1] guard with a 422 (H2 deferred to v3)."""
    with patch('backend.api.routes.viz._KNOWN_GENRES', ['romance']):
        resp = await client.get('/api/viz/persistence/romance?dim=2')
    assert resp.status_code == 422


async def test_persistence_invalid_dim_returns_422(client):
    """GET /viz/persistence/{genre}?dim=5 returns 422 (Literal[1] enforcement)."""
    with patch('backend.api.routes.viz._KNOWN_GENRES', ['romance']):
        resp = await client.get('/api/viz/persistence/romance?dim=5')
    assert resp.status_code == 422


async def test_persistence_book_returns_data_when_cached(client):
    """GET /viz/persistence/book/{id} returns cached H1 data."""
    mock_data = {
        'data': [0.1, 0.2, 0.3, 0.4],
        'M': 2,
        'dim': 1,
        'vmin': 0.1,
        'vmax': 0.4,
    }
    with patch('backend.api.routes.viz.get_cached_persistence_image', return_value=mock_data):
        resp = await client.get('/api/viz/persistence/book/12345?dim=1')
    assert resp.status_code == 200
    body = resp.json()
    assert body['M'] == 2


async def test_persistence_book_invalid_id_returns_400(client):
    """GET /viz/persistence/book/{invalid} returns 400 on bad gutenberg_id."""
    resp = await client.get('/api/viz/persistence/book/abc?dim=1')
    assert resp.status_code == 400


async def test_persistence_book_not_cached_returns_404(client):
    """GET /viz/persistence/book/{id} returns 404 when not cached."""
    with patch('backend.api.routes.viz.get_cached_persistence_image', return_value=None):
        resp = await client.get('/api/viz/persistence/book/99999?dim=1')
    assert resp.status_code == 404
