"""Tests for the GET /api/corpus/genres/{genre}/books endpoint (Plan 06-03 BUG-03).

Schema and payload-size discipline per CONTEXT.md decision D-09 and
PITFALLS.md §12:
    - exactly 7 fields per book (no leakage)
    - <2 KB per book
    - <100 KB per genre
    - 404 for unknown genres
    - extra query params do not leak into the response
"""
import json

import pytest

pytestmark = pytest.mark.asyncio


# This genre is present both in data/models/genre_names.json and in
# corpus/books.yaml -- safe pick for round-trip assertions.
KNOWN_GENRE = 'horror'

REQUIRED_KEYS = {
    'gutenberg_id',
    'title',
    'author',
    'genre',
    'word_count',
    'color',
    'top_10_tfidf_words',
}


async def test_returns_array_of_correct_schema(client):
    """GET /corpus/genres/{genre}/books returns a list of CorpusBookFull dicts."""
    resp = await client.get(f'/api/corpus/genres/{KNOWN_GENRE}/books')
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0, f'No books returned for known genre {KNOWN_GENRE!r}'
    for book in data:
        extra = set(book.keys()) - REQUIRED_KEYS
        missing = REQUIRED_KEYS - set(book.keys())
        assert not extra, f'Schema drift -- extra keys: {extra}'
        assert not missing, f'Schema drift -- missing keys: {missing}'
        assert book['genre'] == KNOWN_GENRE
        assert isinstance(book['word_count'], int)
        assert book['word_count'] >= 0
        assert book['color'].startswith('#') and len(book['color']) == 7
        assert isinstance(book['top_10_tfidf_words'], list)


async def test_unknown_genre_returns_404(client):
    resp = await client.get('/api/corpus/genres/not_a_genre/books')
    assert resp.status_code == 404
    assert 'not_a_genre' in resp.json()['detail']


async def test_payload_under_100kb_total(client):
    resp = await client.get(f'/api/corpus/genres/{KNOWN_GENRE}/books')
    assert resp.status_code == 200
    # PITFALLS §12 hard ceiling
    assert len(resp.content) < 100_000, (
        f'Payload {len(resp.content):,} bytes exceeds the 100 KB ceiling.'
    )


async def test_per_book_under_2kb(client):
    resp = await client.get(f'/api/corpus/genres/{KNOWN_GENRE}/books')
    for book in resp.json():
        size = len(json.dumps(book))
        assert size < 2_000, (
            f"Book {book['gutenberg_id']} is {size} bytes (>2 KB ceiling, CONTEXT D-09)"
        )


async def test_extra_query_param_does_not_leak_schema(client):
    resp = await client.get(f'/api/corpus/genres/{KNOWN_GENRE}/books?include=tokens')
    assert resp.status_code == 200
    for book in resp.json():
        assert 'tokens' not in book
        # Re-assert the strict 7-field set defensively.
        assert set(book.keys()) == REQUIRED_KEYS


async def test_path_traversal_blocked(client):
    # The url-decoded ``..`` is not in _KNOWN_GENRES, so the allowlist returns 404.
    resp = await client.get('/api/corpus/genres/..%2Fadmin/books')
    assert resp.status_code in (400, 404)


async def test_existing_corpus_books_endpoint_untouched(client):
    """D-14: GET /api/corpus/books continues to return its 3-field schema."""
    resp = await client.get('/api/corpus/books')
    assert resp.status_code == 200
    books = resp.json()
    assert isinstance(books, list)
    if books:
        # Ensure the additive endpoint did not start leaking extra fields here.
        assert set(books[0].keys()) == {'gutenberg_id', 'title', 'genre'}
