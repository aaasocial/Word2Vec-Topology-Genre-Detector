import json
import sys
from pathlib import Path

import yaml
from fastapi import APIRouter, HTTPException

from backend.api.models import CorpusBookFull, CorpusBookSummary

# Add scripts/ to path for utils.load_params
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'scripts'))

router = APIRouter(prefix='/corpus')


# ---------------------------------------------------------------------------
# In-process caches (D-12): corpus only changes on retrain, so we load once at
# module import and serve every request out of memory.
# ---------------------------------------------------------------------------

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_GENRE_NAMES_PATH = _PROJECT_ROOT / 'data' / 'models' / 'genre_names.json'
_CORPUS_PATH = _PROJECT_ROOT / 'corpus' / 'books.yaml'
_METADATA_PATH = _PROJECT_ROOT / 'data' / 'corpus_metadata.json'


# Genre color palette -- MUST match frontend/src/constants/genres.ts.
# TODO(v3): promote to a single source of truth (data/models/genre_colors.json).
_GENRE_COLORS: dict[str, str] = {
    'romance':    '#F472B6',
    'mystery':    '#60A5FA',
    'western':    '#FB923C',
    'fantasy':    '#A78BFA',
    'scifi':      '#34D399',
    'horror':     '#F87171',
    'historical': '#FBBF24',
    'literary':   '#2DD4BF',
    'adventure':  '#FB7185',
    'gothic':     '#C084FC',
}


def _load_known_genres() -> list[str]:
    """Mirror the loader pattern from viz.py for symmetry."""
    try:
        with open(_GENRE_NAMES_PATH) as f:
            return json.load(f)
    except Exception:
        return list(_GENRE_COLORS.keys())


_KNOWN_GENRES: list[str] = _load_known_genres()


def _load_corpus_books_by_genre() -> dict[str, list[CorpusBookFull]]:
    """Build and validate every CorpusBookFull at module import.

    Returns ``{genre: [CorpusBookFull, ...]}``. Pydantic validates every record
    here so a malformed corpus crashes loudly at startup rather than serving
    bad payloads at request time.
    """
    if not _CORPUS_PATH.exists():
        return {}
    with open(_CORPUS_PATH) as f:
        corpus = yaml.safe_load(f) or {}

    metadata: dict[str, dict] = {}
    if _METADATA_PATH.exists():
        try:
            with open(_METADATA_PATH) as f:
                metadata = json.load(f)
        except (OSError, json.JSONDecodeError):
            metadata = {}

    result: dict[str, list[CorpusBookFull]] = {}
    for genre, book_list in (corpus.get('genres') or {}).items():
        result[genre] = []
        for b in (book_list or []):
            gid = str(b['gutenberg_id'])
            tfidf_words = metadata.get(gid, {}).get('top_10_tfidf_words', [])
            # Defensive cap: the schema's max_length=10 will reject overflow.
            tfidf_words = list(tfidf_words)[:10]
            result[genre].append(CorpusBookFull(
                gutenberg_id=gid,
                title=str(b['title']),
                author=str(b.get('author', 'Unknown')),
                genre=genre,
                word_count=int(b.get('word_count', 0)),
                color=_GENRE_COLORS.get(genre, '#808080'),
                top_10_tfidf_words=tfidf_words,
            ))
    return result


_BOOKS_BY_GENRE: dict[str, list[CorpusBookFull]] = _load_corpus_books_by_genre()


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


@router.get('/genres/{genre}/books', response_model=list[CorpusBookFull])
async def list_books_by_genre(genre: str):
    """Return every book in ``genre`` with full metadata for the BookSlider.

    Plan 06-03 BUG-03 (CONTEXT.md decision D-09). Schema strictly:
        {gutenberg_id, title, author, genre, word_count, color, top_10_tfidf_words}

    * <2 KB per book / <100 KB per genre (PITFALLS §12 hard ceiling).
    * 404 if ``genre`` is not in the canonical ``_KNOWN_GENRES`` allowlist
      (defends against path-traversal via the path parameter, T-06-03-01).
    * In-process cache (D-12): loaded once at module import.

    Returns 200 with an empty list if a known genre happens to have zero
    bundled books (theoretical post-expansion edge case).
    """
    if genre not in _KNOWN_GENRES:
        raise HTTPException(
            status_code=404,
            detail=(
                f'Unknown genre: {genre!r}. '
                f'Known: {_KNOWN_GENRES}'
            ),
        )
    return _BOOKS_BY_GENRE.get(genre, [])
