#!/usr/bin/env python3
"""Tokenize, normalize, filter stopwords, enforce min unique words."""

import sys
import re
import json
import time
import argparse
from pathlib import Path
from collections import defaultdict

import yaml
import nltk

sys.path.insert(0, str(Path(__file__).parent))
from utils import load_params


def tokenize(text):
    return re.findall(r"[a-z]+", text.lower())


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

    # Build id -> metadata map
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

    for i, raw_file in enumerate(raw_files, 1):
        gid = int(raw_file.stem)
        meta = id_to_meta.get(gid, {})
        title = meta.get('title', f'Book {gid}')
        genre = meta.get('genre', 'unknown')

        t_start = time.time()
        print(f"[{i}/{total}] {title} ({gid}): preprocessing...", end=' ', flush=True)

        text = raw_file.read_text(encoding='utf-8', errors='replace')
        tokens = tokenize(text)
        tokens = [t for t in tokens if t not in sw]

        unique_count = len(set(tokens))
        if unique_count < min_unique:
            elapsed = time.time() - t_start
            print(f"SKIPPED: only {unique_count:,} unique words (minimum {min_unique:,}) ({elapsed:.1f}s)")
            print(f"  WARNING: Skipping {title}: only {unique_count:,} unique words after filtering (minimum {min_unique:,})")
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
        print(f"{unique_count:,} unique words, {len(tokens):,} total tokens... done ({elapsed:.1f}s)")

    print(f"\nProcessed: {total - len(skipped)}/{total} books ({len(skipped)} skipped)")
    print(f"Per-genre: {dict(genre_counts)}")
    if skipped:
        print(f"Skipped: {skipped}")

    # D-12: warn if any genre has fewer than expected books
    expected_per_genre = 5
    for genre, count in genre_counts.items():
        if count < expected_per_genre:
            print(f"WARNING: Genre {genre}: only {count} books available (expected {expected_per_genre}) -- results may be less reliable")


if __name__ == '__main__':
    main()
