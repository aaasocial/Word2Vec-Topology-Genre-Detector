"""Tests for actionable error messages -- covers UX-02."""
import pytest
from backend.pipeline.tokenize import validate_and_tokenize


def test_extension_error_is_actionable():
    with pytest.raises(ValueError, match='Only .txt files are accepted'):
        validate_and_tokenize(b'content', 'book.doc')


def test_size_error_includes_limit():
    big = b'x' * (6 * 1024 * 1024)
    with pytest.raises(ValueError, match='5MB limit'):
        validate_and_tokenize(big, 'book.txt')


def test_encoding_error_suggests_fix():
    with pytest.raises(ValueError, match='Save the file as UTF-8'):
        validate_and_tokenize('text'.encode('utf-16'), 'book.txt')


def test_word_count_error_shows_actual_count():
    content = b'hello world test'
    with pytest.raises(ValueError, match=r'only \d+ words.*minimum 500'):
        validate_and_tokenize(content, 'book.txt')
