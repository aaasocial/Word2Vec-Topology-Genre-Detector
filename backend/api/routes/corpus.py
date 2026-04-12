from fastapi import APIRouter, HTTPException
from backend.api.models import CorpusBookSummary
import yaml
import sys
from pathlib import Path

# Add scripts/ to path for utils.load_params
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'scripts'))

router = APIRouter(prefix='/corpus')


@router.get('/books', response_model=list[CorpusBookSummary])
async def list_books():
    corpus_path = Path(__file__).resolve().parents[3] / 'corpus' / 'books.yaml'
    if not corpus_path.exists():
        return []
    with open(corpus_path) as f:
        data = yaml.safe_load(f)
    books = []
    for genre, book_list in data.get('genres', {}).items():
        for book in book_list:
            books.append(CorpusBookSummary(
                gutenberg_id=str(book['gutenberg_id']),
                title=book['title'],
                genre=genre,
            ))
    return books


@router.get('/books/{gutenberg_id}/results')
async def get_book_results(gutenberg_id: str):
    """Return pre-computed results for a bundled corpus book.

    Results are served instantly from disk cache (no recomputation).
    Returns 404 if precompute.py has not been run yet.
    """
    from backend.cache.store import cache_key, cache_get
    from utils import load_params

    params = load_params()
    window = params['word2vec']['window']
    k = params['features']['k_clusters']
    alpha = params['features']['alpha']

    ck = cache_key('book_result', {
        'gutenberg_id': gutenberg_id,
        'window': window,
        'k': k,
        'alpha': alpha,
    })
    result = cache_get(ck)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f'No pre-computed results for book {gutenberg_id}. '
                   f'Run python -m backend.pipeline.precompute first.'
        )

    return result
