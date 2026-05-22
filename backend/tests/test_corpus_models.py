"""Tests for the CorpusBookFull Pydantic model (Plan 06-03 BUG-03).

Schema strictly per CONTEXT.md decision D-09:
    {gutenberg_id, title, author, genre, word_count, color, top_10_tfidf_words}

Payload discipline (PITFALLS.md §12):
    <2 KB per book, <100 KB per genre.
"""
import pytest
from pydantic import ValidationError

from backend.api.models import CorpusBookFull


VALID_PAYLOAD = {
    'gutenberg_id': '84',
    'title': 'Frankenstein',
    'author': 'Mary Shelley',
    'genre': 'horror',
    'word_count': 75500,
    'color': '#F87171',
    'top_10_tfidf_words': ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
}


def test_valid_payload_passes():
    book = CorpusBookFull(**VALID_PAYLOAD)
    assert book.gutenberg_id == '84'
    assert book.title == 'Frankenstein'
    assert book.author == 'Mary Shelley'
    assert book.genre == 'horror'
    assert book.word_count == 75500
    assert book.color == '#F87171'
    assert len(book.top_10_tfidf_words) == 10


def test_extra_field_forbidden():
    payload = {**VALID_PAYLOAD, 'extra_field': 'x'}
    with pytest.raises(ValidationError):
        CorpusBookFull(**payload)


def test_shorter_tfidf_list_allowed():
    """No fixed length on top_10_tfidf_words -- it's a maximum (max_length=10)."""
    payload = {**VALID_PAYLOAD, 'top_10_tfidf_words': ['only', 'five', 'words', 'here', 'x']}
    book = CorpusBookFull(**payload)
    assert len(book.top_10_tfidf_words) == 5


def test_too_many_tfidf_words_rejected():
    """More than 10 top words rejected by max_length constraint."""
    payload = {**VALID_PAYLOAD, 'top_10_tfidf_words': ['w'] * 11}
    with pytest.raises(ValidationError):
        CorpusBookFull(**payload)


def test_negative_word_count_rejected():
    payload = {**VALID_PAYLOAD, 'word_count': -1}
    with pytest.raises(ValidationError):
        CorpusBookFull(**payload)


def test_malformed_color_rejected():
    payload = {**VALID_PAYLOAD, 'color': 'red'}
    with pytest.raises(ValidationError):
        CorpusBookFull(**payload)


def test_serialized_size_under_2kb():
    """A typical book payload must stay well under 2 KB (CONTEXT D-09)."""
    book = CorpusBookFull(**VALID_PAYLOAD)
    blob = book.model_dump_json()
    assert len(blob.encode('utf-8')) < 2_000
