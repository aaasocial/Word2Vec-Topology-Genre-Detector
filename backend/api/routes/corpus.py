from fastapi import APIRouter
from backend.api.models import CorpusBookSummary
import yaml
from pathlib import Path

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
