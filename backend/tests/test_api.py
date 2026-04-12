import pytest

pytestmark = pytest.mark.asyncio


async def test_health_returns_ok(client):
    resp = await client.get('/health')
    assert resp.status_code == 200
    assert resp.json() == {'status': 'ok'}


async def test_corpus_books_returns_list(client):
    resp = await client.get('/corpus/books')
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_app_has_correct_title(app):
    assert app.title == 'Literary Genre Topology'
