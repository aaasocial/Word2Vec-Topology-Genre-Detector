#!/usr/bin/env python3
"""Download 15 books from Project Gutenberg and save raw text to data/raw/."""

import sys
import time
import argparse
from pathlib import Path

import yaml

# Ensure scripts/ is importable
sys.path.insert(0, str(Path(__file__).parent))
from utils import load_params


def validate_gutenberg_id(gid):
    if not isinstance(gid, int) or gid <= 0:
        raise ValueError(f"Invalid Gutenberg ID: {gid!r}")
    return gid


def download_book(gutenberg_id, title):
    from gutenbergpy.textget import get_text_by_id, strip_headers
    raw = get_text_by_id(gutenberg_id)
    clean = strip_headers(raw)
    return clean.decode('utf-8', errors='replace')


def main():
    parser = argparse.ArgumentParser(description="Download corpus from Project Gutenberg")
    parser.add_argument('--download-sleep', type=float, help='Seconds between downloads')
    args = parser.parse_args()

    overrides = {}
    if args.download_sleep is not None:
        overrides['corpus.download_sleep'] = args.download_sleep

    params = load_params(overrides)
    sleep_time = params['corpus']['download_sleep']

    books_path = Path(__file__).parent.parent / 'corpus' / 'books.yaml'
    with open(books_path) as f:
        books_data = yaml.safe_load(f)

    raw_dir = Path(__file__).parent.parent / 'data' / 'raw'
    raw_dir.mkdir(parents=True, exist_ok=True)

    # Flatten book list with genre labels
    all_books = []
    for genre, books in books_data['genres'].items():
        for book in books:
            all_books.append({**book, 'genre': genre})

    total = len(all_books)
    failures = []

    for i, book in enumerate(all_books, 1):
        gid = book['gutenberg_id']
        title = book['title']
        genre = book['genre']

        try:
            validate_gutenberg_id(gid)
        except ValueError as e:
            print(f"[{i}/{total}] SKIPPING {title}: {e}")
            failures.append(title)
            continue

        outfile = raw_dir / f"{gid}.txt"
        if outfile.exists() and outfile.stat().st_size > 1000:
            print(f"[{i}/{total}] {title} ({gid}): already downloaded, skipping")
            continue

        t_start = time.time()
        print(f"[{i}/{total}] {title} ({gid}): downloading...", end=' ', flush=True)
        try:
            text = download_book(gid, title)
            if len(text) < 1000:
                print(f"WARN: text too short ({len(text)} chars), skipping")
                failures.append(title)
                continue
            outfile.write_text(text, encoding='utf-8')
            elapsed = time.time() - t_start
            print(f"done ({elapsed:.1f}s, {len(text):,} chars)")
        except Exception as e:
            elapsed = time.time() - t_start
            print(f"FAILED ({elapsed:.1f}s): {e}")
            failures.append(title)

        if i < total:
            time.sleep(sleep_time)

    print(f"\nDownloaded: {total - len(failures)}/{total} books ({len(failures)} failures)")
    if failures:
        print("Failed books:")
        for title in failures:
            print(f"  - {title}")


if __name__ == '__main__':
    main()
