"""Tests for file upload validation -- covers CLASS-01, CLASS-05, UX-02."""
import pytest

pytestmark = pytest.mark.asyncio


async def test_reject_non_txt_extension(client):
    resp = await client.post('/classify', files={'file': ('book.pdf', b'content', 'application/pdf')})
    assert resp.status_code == 400
    assert 'Only .txt files are accepted' in resp.json()['detail']


async def test_reject_oversized_file(client):
    big_content = b'word ' * (1024 * 1024 + 1)  # >5MB
    resp = await client.post('/classify', files={'file': ('book.txt', big_content, 'text/plain')})
    assert resp.status_code == 400
    assert '5MB limit' in resp.json()['detail']


async def test_reject_non_utf8_encoding(client):
    # Latin-1 encoded content with non-UTF-8 bytes
    content = 'Hello world'.encode('utf-16')
    resp = await client.post('/classify', files={'file': ('book.txt', content, 'text/plain')})
    assert resp.status_code == 400
    assert 'UTF-8' in resp.json()['detail']


async def test_reject_too_few_words(client):
    # Valid UTF-8 but too few words
    content = ('hello world test book. ' * 20).encode('utf-8')
    resp = await client.post('/classify', files={'file': ('book.txt', content, 'text/plain')})
    assert resp.status_code == 400
    assert 'minimum 500 required' in resp.json()['detail']


async def test_accept_valid_txt_file(client):
    # Generate enough words: 600 unique-ish words
    words = [f'word{i} sentence paragraph chapter novel literary' for i in range(150)]
    content = ' '.join(words).encode('utf-8')
    resp = await client.post('/classify', files={'file': ('book.txt', content, 'text/plain')})
    assert resp.status_code == 200
    data = resp.json()
    assert 'job_id' in data
    assert len(data['job_id']) == 36  # UUID format


async def test_error_response_has_detail_field(client):
    resp = await client.post('/classify', files={'file': ('book.pdf', b'x', 'application/pdf')})
    assert resp.status_code == 400
    body = resp.json()
    assert 'detail' in body
    assert isinstance(body['detail'], str)
    assert len(body['detail']) > 10  # Actionable, not empty
