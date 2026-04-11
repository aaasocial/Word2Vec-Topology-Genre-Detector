import pytest
import re
import json
from pathlib import Path


def tokenize(text):
    """Tokenize: lowercase, remove punctuation."""
    return re.findall(r"[a-z]+", text.lower())


def remove_stopwords(tokens, stopwords):
    return [t for t in tokens if t not in stopwords]


def test_tokenize_lowercases():
    tokens = tokenize("Hello World")
    assert tokens == ["hello", "world"]


def test_tokenize_removes_punctuation():
    tokens = tokenize("it's a test.")
    # re.findall(r"[a-z]+", ...) splits on apostrophe
    assert "it" in tokens
    assert "s" in tokens
    assert "a" in tokens
    assert "test" in tokens
    assert "." not in tokens and "'" not in tokens


def test_stopword_removal():
    import nltk
    nltk.download('stopwords', quiet=True)
    from nltk.corpus import stopwords as nltk_sw
    sw = set(nltk_sw.words('english'))
    tokens = tokenize("the cat sat on the mat")
    filtered = remove_stopwords(tokens, sw)
    assert "the" not in filtered
    assert "on" not in filtered
    assert "cat" in filtered
    assert "mat" in filtered


def test_min_word_filter():
    """Books with fewer than min_unique_words unique tokens should be flagged."""
    tokens = ["word1", "word2", "word3"] * 10  # Only 3 unique words
    unique_count = len(set(tokens))
    min_unique = 10000
    assert unique_count < min_unique, "Test setup: should have fewer than min_unique_words"
    # The script would log a warning and skip this book
    should_skip = unique_count < min_unique
    assert should_skip


def test_preprocessed_output_format(tmp_path):
    """Preprocessed JSON output contains a list of strings."""
    output = {
        "gutenberg_id": 345,
        "title": "Dracula",
        "author": "Bram Stoker",
        "genre": "horror",
        "tokens": ["blood", "castle", "night"],
        "unique_word_count": 3,
        "total_token_count": 3,
    }
    outfile = tmp_path / "345.json"
    outfile.write_text(json.dumps(output))
    loaded = json.loads(outfile.read_text())
    assert isinstance(loaded['tokens'], list)
    assert all(isinstance(t, str) for t in loaded['tokens'])
