#!/usr/bin/env python3
"""Download books from Project Gutenberg and save raw text to data/raw/."""

import sys
import time
import argparse
from pathlib import Path

import yaml
import requests
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent))
from utils import load_params


def validate_gutenberg_id(gid):
    if not isinstance(gid, int) or gid <= 0:
        raise ValueError(f"Invalid Gutenberg ID: {gid!r}")
    return gid


def download_book(gutenberg_id):
    """Download and strip Gutenberg headers. No timeout — no size cap."""
    from gutenbergpy.textget import strip_headers
    urls = [
        f"https://www.gutenberg.org/cache/epub/{gutenberg_id}/pg{gutenberg_id}.txt",
        f"https://www.gutenberg.org/files/{gutenberg_id}/{gutenberg_id}-0.txt",
        f"https://www.gutenberg.org/files/{gutenberg_id}/{gutenberg_id}.txt",
    ]
    last_err = None
    for url in urls:
        try:
            r = requests.get(url, timeout=None)
            if r.status_code == 200 and len(r.content) > 1000:
                return strip_headers(r.content).decode('utf-8', errors='replace')
        except Exception as e:
            last_err = e
            continue
    raise RuntimeError(f"All URLs failed for ID {gutenberg_id}: {last_err}")


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

    all_books = []
    for genre, books in books_data['genres'].items():
        for book in books:
            all_books.append({**book, 'genre': genre})

    total = len(all_books)
    failures = []

    bar = tqdm(all_books, desc="Downloading", unit="book", dynamic_ncols=True)
    for book in bar:
        gid = book['gutenberg_id']
        title = book['title']
        genre = book['genre']
        bar.set_postfix(id=gid, genre=genre)

        try:
            validate_gutenberg_id(gid)
        except ValueError as e:
            tqdm.write(f"  SKIP {title}: {e}")
            failures.append(title)
            continue

        outfile = raw_dir / f"{gid}.txt"
        if outfile.exists() and outfile.stat().st_size > 1000:
            tqdm.write(f"  [{gid}] {title}: already downloaded, skipping")
            continue

        t_start = time.time()
        try:
            text = download_book(gid)
            if len(text) < 1000:
                tqdm.write(f"  [{gid}] {title}: WARN text too short ({len(text)} chars), skipping")
                failures.append(title)
                continue
            outfile.write_text(text, encoding='utf-8')
            elapsed = time.time() - t_start
            tqdm.write(f"  [{gid}] {title}: done ({elapsed:.1f}s, {len(text):,} chars)")
        except Exception as e:
            elapsed = time.time() - t_start
            tqdm.write(f"  [{gid}] {title}: FAILED ({elapsed:.1f}s): {e}")
            failures.append(title)

        time.sleep(sleep_time)

    print(f"\nDownloaded: {total - len(failures)}/{total} books ({len(failures)} failures)")
    if failures:
        print("Failed:")
        for t in failures:
            print(f"  - {t}")


if __name__ == '__main__':
    main()
