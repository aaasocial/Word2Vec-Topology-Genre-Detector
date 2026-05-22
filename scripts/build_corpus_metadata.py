#!/usr/bin/env python3
"""Precompute ``top_10_tfidf_words`` per bundled book -> ``data/corpus_metadata.json``.

Build-time companion to the ``GET /api/corpus/genres/{genre}/books`` endpoint
(Plan 06-03 BUG-03 -- decision D-11).

Why a build-time precompute (rather than lazy/request-time):
    * Avoids re-running ``TfidfVectorizer.transform`` on every cold start.
    * Keeps the runtime endpoint O(1) dict lookup against an in-memory cache.
    * Sidecar JSON stays diff-friendly and human-inspectable.

Inputs (read-only):
    * ``data/models/tfidf_vectorizer_w{window}.joblib`` -- fitted vectorizer
      (provides the W2V vocab + IDF values used at training time).
    * ``data/processed/{gid}.json`` -- per-book tokenized text from
      ``scripts/02_preprocess.py``.
    * ``corpus/books.yaml`` -- the canonical list of bundled books.

Output:
    * ``data/corpus_metadata.json`` -- ``{gutenberg_id: {top_10_tfidf_words: [...]}, ...}``

Determinism: the same vectorizer + the same processed tokens MUST produce the
same JSON. Reruns are idempotent.
"""

import argparse
import json
import sys
from pathlib import Path

import joblib
import yaml
from tqdm import tqdm


def _project_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _load_books_yaml() -> list[dict]:
    """Return a flat list of book dicts, each annotated with its genre."""
    path = _project_root() / 'corpus' / 'books.yaml'
    with open(path) as f:
        data = yaml.safe_load(f)
    flat: list[dict] = []
    for genre, books in data.get('genres', {}).items():
        for b in books:
            flat.append({**b, 'genre': genre})
    return flat


def _load_processed_tokens(gid: int) -> list[str] | None:
    """Return the tokenized text for ``gid`` or ``None`` if not preprocessed yet."""
    path = _project_root() / 'data' / 'processed' / f'{gid}.json'
    if not path.exists():
        return None
    with open(path) as f:
        return json.load(f)['tokens']


def top_tfidf_words_for_book(
    vectorizer,
    tokens: list[str],
    top_n: int = 10,
) -> list[str]:
    """Compute the top-N TF-IDF words for a single book against the fitted vocab.

    The vectorizer's tokenizer takes a string -- so we re-join the tokens
    (they were lower-cased / stopword-filtered at preprocess time).
    """
    text = ' '.join(tokens)
    row = vectorizer.transform([text]).toarray().flatten()
    if not row.any():
        return []
    feature_names = vectorizer.get_feature_names_out()
    # argsort descending, take the top_n with strictly positive weight
    order = row.argsort()[::-1]
    out: list[str] = []
    for idx in order:
        if row[idx] <= 0:
            break
        out.append(str(feature_names[idx]))
        if len(out) >= top_n:
            break
    return out


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Precompute top-10 TF-IDF words per book for the BookSlider endpoint.',
    )
    parser.add_argument(
        '--window', type=int, default=15,
        help='Word2Vec context window matching the vectorizer to load (default: 15).',
    )
    parser.add_argument(
        '--force', action='store_true',
        help='Overwrite data/corpus_metadata.json if it already exists.',
    )
    parser.add_argument(
        '--top-n', type=int, default=10,
        help='Number of top TF-IDF words to keep per book (default: 10).',
    )
    args = parser.parse_args()

    root = _project_root()
    vectorizer_path = root / 'data' / 'models' / f'tfidf_vectorizer_w{args.window}.joblib'
    output_path = root / 'data' / 'corpus_metadata.json'

    if output_path.exists() and not args.force:
        print(f'Output exists: {output_path}. Pass --force to overwrite.')
        return 0

    if not vectorizer_path.exists():
        print(f'ERROR: vectorizer not found at {vectorizer_path}.')
        print('Run scripts/03_train_embeddings.py --window {} first.'.format(args.window))
        return 1

    print(f'Loading vectorizer from {vectorizer_path.name} ...')
    vectorizer = joblib.load(vectorizer_path)

    books = _load_books_yaml()
    metadata: dict[str, dict] = {}
    missing: list[int] = []

    for book in tqdm(books, desc='Books', unit='book'):
        gid = int(book['gutenberg_id'])
        tokens = _load_processed_tokens(gid)
        if tokens is None:
            missing.append(gid)
            # Record an empty list so downstream code can rely on the key being present.
            metadata[str(gid)] = {'top_10_tfidf_words': []}
            continue
        top_words = top_tfidf_words_for_book(vectorizer, tokens, top_n=args.top_n)
        metadata[str(gid)] = {'top_10_tfidf_words': top_words}

    # Write sorted by gutenberg_id for stable diffs.
    output_path.parent.mkdir(parents=True, exist_ok=True)
    ordered = {k: metadata[k] for k in sorted(metadata, key=lambda x: int(x))}
    output_path.write_text(json.dumps(ordered, indent=2) + '\n', encoding='utf-8')

    size = output_path.stat().st_size
    n_with_words = sum(1 for v in metadata.values() if v['top_10_tfidf_words'])
    print(
        f'Wrote {len(metadata)} books ({n_with_words} with top-{args.top_n} words) '
        f'-> {output_path.relative_to(root)} (size: {size:,} bytes)'
    )
    if missing:
        print(
            f'WARNING: {len(missing)} books had no processed tokens '
            f'(run scripts/02_preprocess.py first): {missing[:5]}{"..." if len(missing) > 5 else ""}'
        )

    return 0


if __name__ == '__main__':
    sys.exit(main())
