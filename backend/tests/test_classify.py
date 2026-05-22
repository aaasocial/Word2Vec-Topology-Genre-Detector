"""Tests for corpus results endpoint and classify flow -- covers CORPUS-02, CLASS-02."""
import pytest

pytestmark = pytest.mark.asyncio


async def test_corpus_book_results_not_found(client):
    """GET /corpus/books/{id}/results returns 404 when not pre-computed."""
    resp = await client.get('/corpus/books/99999/results')
    assert resp.status_code == 404
    detail = resp.json()['detail']
    assert 'pre-computed' in detail.lower() or 'precompute' in detail.lower()


async def test_classify_returns_job_id_for_valid_file(client):
    """POST /classify with valid text returns 200 with job_id."""
    words = [f'word{i} sentence paragraph chapter novel literary' for i in range(150)]
    content = ' '.join(words).encode('utf-8')
    resp = await client.post('/classify', files={'file': ('book.txt', content, 'text/plain')})
    assert resp.status_code == 200
    data = resp.json()
    assert 'job_id' in data
    assert len(data['job_id']) == 36  # UUID format


@pytest.mark.integration
async def test_corpus_book_results_found_after_cache(client, tmp_path, monkeypatch):
    """Integration: cache populated -> GET returns cached data.

    Plan 06-05 / BUG-05: cache_key now requires corpus_hash + w2v_model_sha256.
    The test must compute the SAME lineage values that the route under test
    will compute, so the cached entry is reachable.
    """
    import backend.cache.store as store_mod
    monkeypatch.setattr(store_mod, 'CACHE_DIR', tmp_path / 'cache')

    from backend.cache.store import cache_key, cache_put
    from backend.cache.lineage import corpus_hash, w2v_model_sha256
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
    from utils import load_params
    params = load_params()
    window = params['word2vec']['window']
    k = params['features']['k_clusters']
    alpha = params['features']['alpha']

    ck = cache_key(
        'book_result',
        {
            'gutenberg_id': '12345',
            'window': window,
            'k': k,
            'alpha': alpha,
        },
        corpus_hash=corpus_hash(),
        w2v_model_sha256=w2v_model_sha256(window),
    )
    test_data = {'gutenberg_id': '12345', 'genre': 'horror', 'title': 'Test Book'}
    cache_put(ck, test_data)

    resp = await client.get('/corpus/books/12345/results')
    assert resp.status_code == 200
    assert resp.json()['genre'] == 'horror'
