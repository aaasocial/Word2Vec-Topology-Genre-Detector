#!/usr/bin/env python3
"""Train Word2Vec and compute TF-IDF weights; build per-book weighted point clouds.

Supports multi-window training: pass --window W to train a single window,
or omit to train all windows listed in params.word2vec.windows.

Output filenames are window-suffixed:
  data/models/word2vec_w{W}.model
  data/features/vectors_{gid}_w{W}.npy
  data/features/tfidf_{gid}_w{W}.npy
  data/features/words_{gid}_w{W}.json
"""

import sys
import json
import time
import argparse
from pathlib import Path

import numpy as np
import joblib
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent))
from utils import load_params


def train_window(window, params, all_books_tokens, book_metadata,
                 corpus_sentences, models_dir, features_dir):
    """Train one Word2Vec model and save per-book artifacts for a given window size."""
    from gensim.models import Word2Vec
    from sklearn.feature_extraction.text import TfidfVectorizer

    vector_size = params['word2vec']['vector_size']
    max_words = params['homology'].get('max_words', 100000)

    # --- Word2Vec ---
    t0 = time.time()
    tqdm.write(f"  [w={window}] Training Word2Vec "
               f"(vector_size={vector_size}, window={window}, "
               f"min_count={params['word2vec']['min_count']})...")
    model = Word2Vec(
        sentences=corpus_sentences,
        vector_size=vector_size,
        window=window,
        min_count=params['word2vec']['min_count'],
        sg=params['word2vec']['sg'],
        epochs=params['word2vec']['epochs'],
        workers=params['word2vec']['workers'],
        seed=params['word2vec']['seed'],
        negative=5,
    )
    vocab_size = len(model.wv)
    tqdm.write(f"  [w={window}] Word2Vec done ({time.time()-t0:.1f}s, "
               f"{vocab_size:,} words, {vector_size}D)")

    model_path = models_dir / f'word2vec_w{window}.model'
    model.save(str(model_path))
    tqdm.write(f"  [w={window}] Saved: {model_path.name}")

    # --- TF-IDF ---
    t0 = time.time()
    book_texts = [' '.join(tokens) for tokens in all_books_tokens]
    w2v_vocab = list(model.wv.key_to_index.keys())
    vectorizer = TfidfVectorizer(
        sublinear_tf=True,
        smooth_idf=True,
        norm=None,
        use_idf=True,
        lowercase=False,
        token_pattern=r'(?u)\b\w+\b',
        vocabulary=w2v_vocab,
    )
    tfidf_matrix = vectorizer.fit_transform(book_texts)
    feature_names = vectorizer.get_feature_names_out()
    tqdm.write(f"  [w={window}] TF-IDF done ({time.time()-t0:.1f}s, "
               f"{len(feature_names):,} features)")

    joblib.dump(vectorizer, str(models_dir / f'tfidf_vectorizer_w{window}.joblib'))

    # --- Per-book point clouds ---
    book_bar = tqdm(zip(book_metadata, all_books_tokens),
                    total=len(book_metadata),
                    desc=f"  Point clouds w={window}",
                    unit="book", leave=False, dynamic_ncols=True)
    for i, (meta, tokens) in enumerate(book_bar):
        gid = meta['gutenberg_id']
        book_bar.set_postfix(id=gid)

        tfidf_row = tfidf_matrix[i].toarray().flatten()
        word_weights = {}
        for word_idx, weight in enumerate(tfidf_row):
            if weight > 0:
                word = feature_names[word_idx]
                if word in model.wv:
                    word_weights[word] = weight

        sorted_words = sorted(word_weights.items(), key=lambda x: x[1], reverse=True)[:max_words]
        if not sorted_words:
            tqdm.write(f"  [w={window}] WARNING: no words for book {gid}")
            continue

        selected_words = [w for w, _ in sorted_words]
        selected_weights = np.array([wt for _, wt in sorted_words], dtype=np.float32)
        selected_vectors = np.array(
            [model.wv.get_vector(w, norm=True) for w in selected_words],
            dtype=np.float32
        )

        np.save(str(features_dir / f'vectors_{gid}_w{window}.npy'), selected_vectors)
        np.save(str(features_dir / f'tfidf_{gid}_w{window}.npy'), selected_weights)
        with open(features_dir / f'words_{gid}_w{window}.json', 'w') as f:
            json.dump({'gutenberg_id': gid, 'title': meta['title'],
                       'words': selected_words}, f)

    tqdm.write(f"  [w={window}] Point clouds saved for {len(book_metadata)} books.")


def main():
    parser = argparse.ArgumentParser(description="Train Word2Vec and compute TF-IDF")
    parser.add_argument('--window', type=int,
                        help='Single window size to train. Omit to train all windows in params.')
    parser.add_argument('--vector-size', type=int)
    parser.add_argument('--min-count', type=int)
    args = parser.parse_args()

    overrides = {}
    if args.vector_size is not None:
        overrides['word2vec.vector_size'] = args.vector_size
    if args.min_count is not None:
        overrides['word2vec.min_count'] = args.min_count

    params = load_params(overrides)

    processed_dir = Path(__file__).parent.parent / 'data' / 'processed'
    models_dir = Path(__file__).parent.parent / 'data' / 'models'
    features_dir = Path(__file__).parent.parent / 'data' / 'features'
    models_dir.mkdir(parents=True, exist_ok=True)
    features_dir.mkdir(parents=True, exist_ok=True)

    # Load preprocessed corpus
    processed_files = sorted(processed_dir.glob('*.json'))
    if not processed_files:
        print("ERROR: No processed files found. Run 02_preprocess.py first.")
        sys.exit(1)

    all_books_tokens = []
    book_metadata = []
    for pf in processed_files:
        with open(pf) as f:
            data = json.load(f)
        all_books_tokens.append(data['tokens'])
        book_metadata.append({
            'gutenberg_id': data['gutenberg_id'],
            'title': data['title'],
            'author': data['author'],
            'genre': data['genre'],
        })

    total_tokens = sum(len(t) for t in all_books_tokens)
    print(f"Loaded {len(all_books_tokens)} books, {total_tokens:,} total tokens")

    # Build sentence chunks for Word2Vec
    corpus_sentences = []
    chunk_size = 1000
    for tokens in all_books_tokens:
        for i in range(0, len(tokens), chunk_size):
            chunk = tokens[i:i + chunk_size]
            if chunk:
                corpus_sentences.append(chunk)

    # Determine which windows to train
    if args.window is not None:
        windows = [args.window]
    else:
        windows = params['word2vec']['windows']

    print(f"Training windows: {windows}")
    window_bar = tqdm(windows, desc="Windows", unit="window", dynamic_ncols=True)
    for window in window_bar:
        window_bar.set_postfix(window=window)
        train_window(window, params, all_books_tokens, book_metadata,
                     corpus_sentences, models_dir, features_dir)

    print(f"\nDone. Models and point clouds saved for windows: {windows}")


if __name__ == '__main__':
    main()
