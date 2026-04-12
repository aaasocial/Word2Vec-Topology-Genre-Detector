"""Tests for GET /viz/scatter/{projection}, GET /viz/tfidf/{genre}, GET /viz/tfidf/book/{id}."""
import json
import pytest
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient

from backend.api.app import create_app


@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)


MOCK_SCATTER_DATA = {
    'projection': 'pca',
    'points': [
        {'word': 'love', 'genre': 'romance', 'x': 0.1, 'y': 0.2, 'z': 0.3,
         'tfidf_weight': 0.05, 'neighbors': [{'word': 'passion', 'similarity': 0.9}]},
    ],
}
MOCK_TFIDF_DATA = {'love': 0.05, 'passion': 0.03}


def test_scatter_valid_projection(client):
    with patch('backend.api.routes.viz.get_cached_scatter', return_value=MOCK_SCATTER_DATA):
        resp = client.get('/viz/scatter/pca')
    assert resp.status_code == 200
    data = resp.json()
    assert data['projection'] == 'pca'
    assert len(data['points']) == 1
    assert data['points'][0]['word'] == 'love'


def test_scatter_invalid_projection(client):
    """FastAPI Literal enum validation returns 422 for unknown projection names (T-3-02)."""
    resp = client.get('/viz/scatter/invalid')
    assert resp.status_code == 422


def test_scatter_invalid_projection_path_traversal(client):
    """Path traversal attempt returns 422 (handled by FastAPI Literal enum)."""
    resp = client.get('/viz/scatter/../../../etc/passwd')
    assert resp.status_code in (404, 422)


def test_scatter_cache_miss(client):
    with patch('backend.api.routes.viz.get_cached_scatter', return_value=None):
        resp = client.get('/viz/scatter/pca')
    assert resp.status_code == 503
    assert 'precompute_viz' in resp.json()['detail']


def test_tfidf_genre(client):
    with patch('backend.api.routes.viz.get_cached_tfidf_genre', return_value=MOCK_TFIDF_DATA):
        with patch('backend.api.routes.viz._KNOWN_GENRES', ['romance']):
            resp = client.get('/viz/tfidf/romance')
    assert resp.status_code == 200
    data = resp.json()
    assert 'love' in data
    assert isinstance(data['love'], float)


def test_tfidf_genre_unknown(client):
    resp = client.get('/viz/tfidf/unknown_genre_that_does_not_exist')
    assert resp.status_code == 404


def test_tfidf_book(client):
    with patch('backend.api.routes.viz.get_cached_tfidf_book', return_value=MOCK_TFIDF_DATA):
        resp = client.get('/viz/tfidf/book/1342')
    assert resp.status_code == 200
    data = resp.json()
    assert 'love' in data


def test_tfidf_book_invalid_id_non_numeric(client):
    """Non-numeric gutenberg_id returns 400 or 404 (path traversal guard, T-3-02).

    URL normalization in the test client may resolve '../../etc/passwd' before
    it reaches the route, producing 404. Either way, the endpoint is not reached
    with traversal input — the resource is protected.
    """
    resp = client.get('/viz/tfidf/book/../../etc/passwd')
    assert resp.status_code in (400, 404)


def test_tfidf_book_invalid_id_string(client):
    """String gutenberg_id returns 400."""
    resp = client.get('/viz/tfidf/book/not_an_id')
    assert resp.status_code == 400


def test_tfidf_book_cache_miss(client):
    with patch('backend.api.routes.viz.get_cached_tfidf_book', return_value=None):
        resp = client.get('/viz/tfidf/book/1342')
    assert resp.status_code == 404
