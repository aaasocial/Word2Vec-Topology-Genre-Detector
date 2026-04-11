#!/usr/bin/env python3
"""Train Word2Vec and compute TF-IDF weights; build per-book weighted point clouds."""

import sys
import json
import time
import argparse
from pathlib import Path

import numpy as np
import joblib

sys.path.insert(0, str(Path(__file__).parent))
from utils import load_params


def main():
    parser = argparse.ArgumentParser(description="Train Word2Vec and compute TF-IDF")
    parser.add_argument('--vector-size', type=int, help='Word2Vec embedding dimension')
    parser.add_argument('--window', type=int, help='Word2Vec context window size')
    parser.add_argument('--min-count', type=int, help='Word2Vec minimum word count')
    parser.add_argument('--max-words', type=int, help='Max words per book for point cloud')
    args = parser.parse_args()

    overrides = {}
    if args.vector_size is not None:
        overrides['word2vec.vector_size'] = args.vector_size
    if args.window is not None:
        overrides['word2vec.window'] = args.window
    if args.min_count is not None:
        overrides['word2vec.min_count'] = args.min_count
    if args.max_words is not None:
        overrides['homology.max_words'] = args.max_words

    params = load_params(overrides)

    processed_dir = Path(__file__).parent.parent / 'data' / 'processed'
    models_dir = Path(__file__).parent.parent / 'data' / 'models'
    features_dir = Path(__file__).parent.parent / 'data' / 'features'
    models_dir.mkdir(parents=True, exist_ok=True)
    features_dir.mkdir(parents=True, exist_ok=True)

    # Step 1: Load preprocessed corpus
    processed_files = sorted(processed_dir.glob('*.json'))
    if not processed_files:
        print("ERROR: No processed files found in data/processed/. Run 02_preprocess.py first.")
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

    # Step 2: Train Word2Vec
    from gensim.models import Word2Vec

    # Create sentence chunks of ~1000 words for context windows
    corpus_sentences = []
    for tokens in all_books_tokens:
        chunk_size = 1000
        for i in range(0, len(tokens), chunk_size):
            chunk = tokens[i:i + chunk_size]
            if chunk:
                corpus_sentences.append(chunk)

    t_start = time.time()
    print(f"Training Word2Vec (vector_size={params['word2vec']['vector_size']}, "
          f"window={params['word2vec']['window']}, sg={params['word2vec']['sg']})...",
          end=' ', flush=True)

    model = Word2Vec(
        sentences=corpus_sentences,
        vector_size=params['word2vec']['vector_size'],
        window=params['word2vec']['window'],
        min_count=params['word2vec']['min_count'],
        sg=params['word2vec']['sg'],
        epochs=params['word2vec']['epochs'],
        workers=params['word2vec']['workers'],
        seed=params['word2vec']['seed'],
        negative=5,
    )
    elapsed = time.time() - t_start
    vocab_size = len(model.wv)
    print(f"done ({elapsed:.1f}s, {vocab_size:,} words, {params['word2vec']['vector_size']}D)")

    model.save(str(models_dir / 'word2vec.model'))
    print(f"Saved: data/models/word2vec.model")

    # Step 3: Compute TF-IDF
    from sklearn.feature_extraction.text import TfidfVectorizer

    book_texts = [' '.join(tokens) for tokens in all_books_tokens]
    w2v_vocab = list(model.wv.key_to_index.keys())

    t_start = time.time()
    print(f"Computing TF-IDF ({len(w2v_vocab):,} vocab, {len(book_texts)} books)...",
          end=' ', flush=True)

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
    elapsed = time.time() - t_start
    print(f"done ({elapsed:.1f}s, {len(feature_names):,} features, {len(book_texts)} books)")

    # Log OOV words (in preprocessed vocab but filtered by Word2Vec min_count)
    preprocessed_vocab = set()
    for tokens in all_books_tokens:
        preprocessed_vocab.update(tokens)
    oov_count = len(preprocessed_vocab - set(w2v_vocab))
    print(f"OOV words (filtered by min_count={params['word2vec']['min_count']}): {oov_count:,}")

    # Save TF-IDF vectorizer
    joblib.dump(vectorizer, str(models_dir / 'tfidf_vectorizer.joblib'))
    print(f"Saved: data/models/tfidf_vectorizer.joblib")

    # Step 4: Construct per-book weighted point clouds
    max_words = params['homology']['max_words']
    total_books = len(book_metadata)

    for i, (meta, tokens) in enumerate(zip(book_metadata, all_books_tokens), 1):
        gid = meta['gutenberg_id']
        title = meta['title']

        t_start = time.time()
        print(f"[{i}/{total_books}] {title} ({gid}): building point cloud...",
              end=' ', flush=True)

        # Get TF-IDF row for this book
        book_idx = i - 1
        tfidf_row = tfidf_matrix[book_idx].toarray().flatten()

        # Map feature indices to words
        word_weights = {}
        for word_idx, weight in enumerate(tfidf_row):
            if weight > 0:
                word = feature_names[word_idx]
                if word in model.wv:
                    word_weights[word] = weight

        # Select top max_words by TF-IDF weight
        sorted_words = sorted(word_weights.items(), key=lambda x: x[1], reverse=True)[:max_words]

        if not sorted_words:
            print(f"WARNING: No words with positive TF-IDF for {title}")
            continue

        selected_words = [w for w, _ in sorted_words]
        selected_weights = np.array([wt for _, wt in sorted_words], dtype=np.float32)

        # Get L2-normalized vectors
        selected_vectors = np.array(
            [model.wv.get_vector(w, norm=True) for w in selected_words],
            dtype=np.float32
        )

        # Save artifacts
        np.save(str(features_dir / f'vectors_{gid}.npy'), selected_vectors)
        np.save(str(features_dir / f'tfidf_{gid}.npy'), selected_weights)
        with open(features_dir / f'words_{gid}.json', 'w') as f:
            json.dump({'gutenberg_id': gid, 'title': title, 'words': selected_words}, f)

        elapsed = time.time() - t_start
        print(f"top {len(selected_words)} words selected, vectors saved... done ({elapsed:.1f}s)")

    print(f"\nDone. Point clouds saved for {total_books} books.")
    print(f"Artifacts: data/features/vectors_*.npy, data/features/tfidf_*.npy, data/features/words_*.json")


if __name__ == '__main__':
    main()
