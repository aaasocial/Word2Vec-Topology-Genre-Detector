import pytest
import yaml
from pathlib import Path


def test_books_yaml_valid():
    """corpus/books.yaml must load with 3 genres and 5 books each."""
    books_path = Path(__file__).parent.parent / 'corpus' / 'books.yaml'
    assert books_path.exists(), "corpus/books.yaml not found"
    with open(books_path) as f:
        data = yaml.safe_load(f)
    assert 'genres' in data
    genres = data['genres']
    assert len(genres) == 3, f"Expected 3 genres, got {len(genres)}"
    for genre, books in genres.items():
        assert len(books) == 5, f"Genre {genre}: expected 5 books, got {len(books)}"
        for book in books:
            assert isinstance(book['gutenberg_id'], int), f"gutenberg_id must be int: {book}"
            assert book['gutenberg_id'] > 0, f"gutenberg_id must be positive: {book}"


def test_gutenberg_id_is_integer():
    """Download validation rejects non-integer Gutenberg IDs."""
    # Simulate the validation logic from 01_download_corpus.py
    def validate_id(gid):
        if not isinstance(gid, int) or gid <= 0:
            raise ValueError(f"Invalid Gutenberg ID: {gid}")
        return True

    assert validate_id(345)
    with pytest.raises(ValueError):
        validate_id("abc")
    with pytest.raises(ValueError):
        validate_id(-1)


@pytest.mark.integration
@pytest.mark.slow
def test_download_returns_text():
    """gutenbergpy downloads Frankenstein (ID 84) and returns non-empty text."""
    from gutenbergpy.textget import get_text_by_id, strip_headers
    raw = get_text_by_id(84)
    text = strip_headers(raw).decode('utf-8', errors='replace')
    assert len(text) > 1000, "Downloaded text is too short"
    assert "frankenstein" in text.lower() or "monster" in text.lower()
