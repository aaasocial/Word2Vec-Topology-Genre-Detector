#!/usr/bin/env python3
"""Tokenize, normalize, filter stopwords, enforce min unique words.

Also writes ``word_count`` (post-stopword-removal token count) back to
``corpus/books.yaml`` for every successfully-processed book, so that the
``GET /api/corpus/genres/{genre}/books`` endpoint (Plan 06-03 BUG-03) has
deterministic, repeatable counts without recomputing at request time.
"""

import sys
import re
import json
import time
import argparse
from pathlib import Path
from collections import defaultdict

import yaml
import nltk
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent))
from utils import load_params


def tokenize(text):
    return re.findall(r"[a-z]+", text.lower())


_WORD_COUNT_RE = re.compile(
    r"(?P<head>-\s*\{[^}]*?gutenberg_id:\s*(?P<gid>\d+)[^}]*?)"
    r"(?:,\s*word_count:\s*\d+)?"        # strip any existing word_count
    r"(?P<tail>\s*\})"
)


def write_word_counts_to_yaml(yaml_path: Path, word_counts: dict[int, int]) -> int:
    """Rewrite ``corpus/books.yaml`` inserting/updating ``word_count`` per book.

    Operates on raw text (line-level) to preserve the flow-style formatting of
    the existing file. Idempotent: re-running overwrites the prior value.

    Args:
        yaml_path: Path to ``corpus/books.yaml``.
        word_counts: Map of ``gutenberg_id`` (int) -> ``word_count`` (int).

    Returns:
        Number of book entries updated.
    """
    text = yaml_path.read_text(encoding='utf-8')
    updated = 0

    def _replace(match: re.Match) -> str:
        nonlocal updated
        gid = int(match.group('gid'))
        head = match.group('head').rstrip(', ').rstrip()
        tail = match.group('tail')
        if gid not in word_counts:
            # No new count -- preserve the line as-is, including any prior word_count
            return match.group(0)
        updated += 1
        return f"{head}, word_count: {word_counts[gid]}{tail}"

    new_text = _WORD_COUNT_RE.sub(_replace, text)
    if new_text != text:
        yaml_path.write_text(new_text, encoding='utf-8')
    return updated


def main():
    parser = argparse.ArgumentParser(description="Preprocess corpus text")
    parser.add_argument('--min-unique-words', type=int, help='Minimum unique words per book')
    args = parser.parse_args()

    overrides = {}
    if args.min_unique_words is not None:
        overrides['corpus.min_unique_words'] = args.min_unique_words

    params = load_params(overrides)
    min_unique = params['corpus']['min_unique_words']

    nltk.download('stopwords', quiet=True)
    from nltk.corpus import stopwords as nltk_sw
    sw = set(nltk_sw.words('english'))

    books_path = Path(__file__).parent.parent / 'corpus' / 'books.yaml'
    with open(books_path) as f:
        books_data = yaml.safe_load(f)

    id_to_meta = {}
    for genre, books in books_data['genres'].items():
        for book in books:
            id_to_meta[book['gutenberg_id']] = {**book, 'genre': genre}

    raw_dir = Path(__file__).parent.parent / 'data' / 'raw'
    processed_dir = Path(__file__).parent.parent / 'data' / 'processed'
    processed_dir.mkdir(parents=True, exist_ok=True)

    raw_files = sorted(raw_dir.glob('*.txt'))
    total = len(raw_files)
    skipped = []
    genre_counts = defaultdict(int)
    word_counts: dict[int, int] = {}

    bar = tqdm(raw_files, desc="Preprocessing", unit="book", dynamic_ncols=True)
    for raw_file in bar:
        gid = int(raw_file.stem)
        meta = id_to_meta.get(gid, {})
        title = meta.get('title', f'Book {gid}')
        genre = meta.get('genre', 'unknown')
        bar.set_postfix(id=gid, genre=genre)

        t_start = time.time()
        text = raw_file.read_text(encoding='utf-8', errors='replace')
        tokens = tokenize(text)
        tokens = [t for t in tokens if t not in sw]

        # Capture the post-stopword token count for the books.yaml write-back
        # BEFORE the min_unique gate, so the BookSlider can still display "N words"
        # for short books that are excluded from training (Plan 06-03 BUG-03).
        word_counts[gid] = len(tokens)

        unique_count = len(set(tokens))
        if unique_count < min_unique:
            elapsed = time.time() - t_start
            tqdm.write(f"  [{gid}] {title}: SKIPPED only {unique_count:,} unique words "
                       f"(min {min_unique:,}) ({elapsed:.1f}s)")
            skipped.append(title)
            continue

        outfile = processed_dir / f"{gid}.json"
        output = {
            'gutenberg_id': gid,
            'title': title,
            'author': meta.get('author', ''),
            'genre': genre,
            'tokens': tokens,
            'unique_word_count': unique_count,
            'total_token_count': len(tokens),
        }
        outfile.write_text(json.dumps(output), encoding='utf-8')
        genre_counts[genre] += 1

        elapsed = time.time() - t_start
        tqdm.write(f"  [{gid}] {title}: {unique_count:,} unique, {len(tokens):,} tokens "
                   f"({elapsed:.1f}s)")

    print(f"\nProcessed: {total - len(skipped)}/{total} books ({len(skipped)} skipped)")
    print(f"Per-genre: {dict(genre_counts)}")
    if skipped:
        print(f"Skipped: {skipped}")

    # Write word_counts back to corpus/books.yaml so the GET /api/corpus/genres/{genre}/books
    # endpoint can serve them without recomputing at request time (Plan 06-03 BUG-03).
    if word_counts:
        n_updated = write_word_counts_to_yaml(books_path, word_counts)
        print(f"Wrote word_count for {n_updated}/{len(word_counts)} books to {books_path.name}")

    expected_per_genre = 10
    for genre, count in genre_counts.items():
        if count < expected_per_genre:
            print(f"WARNING: {genre}: only {count} books (expected {expected_per_genre})")


if __name__ == '__main__':
    main()
