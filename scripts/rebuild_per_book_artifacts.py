#!/usr/bin/env python3
"""Rebuild per-book vectors/tfidf/words artifacts from EXISTING W2V + TF-IDF models.

Phase 9 helper for the calibration spike (plan 09-01 Task 2): the fresh-machine
fast path skips ``scripts/03_train_embeddings.py`` (which would retrain the
W2V model and rotate the lineage hash). This script reads the *already-trained*
``word2vec_w{W}.model`` + ``tfidf_vectorizer_w{W}.joblib`` and emits the
per-book ``vectors_*.npy`` / ``tfidf_*.npy`` / ``words_*.json`` artifacts that
``scripts/04_compute_homology.py`` and ``scripts/05_build_features.py`` consume.

The W2V model on disk is treated as the source of truth -- its vocabulary +
embedding coordinates are NOT regenerated. This preserves ``w2v_model_sha256``
in the SVM lineage, which is what makes the D-40 calibration retrain non-
breaking against the existing corpus_hash + w2v hashes.

Usage:
    python scripts/rebuild_per_book_artifacts.py --window 15
"""
from __future__ import annotations
import argparse
import json
import sys
import time
from pathlib import Path

import joblib
import numpy as np
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent))
from utils import load_params  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--window", type=int, required=True)
    args = parser.parse_args()
    window = args.window

    params = load_params()
    max_words = params["homology"].get("max_words", 100000)

    project_root = Path(__file__).resolve().parents[1]
    processed_dir = project_root / "data" / "processed"
    models_dir = project_root / "data" / "models"
    features_dir = project_root / "data" / "features"
    features_dir.mkdir(parents=True, exist_ok=True)

    from gensim.models import Word2Vec

    print(f"Loading W2V model: word2vec_w{window}.model")
    model = Word2Vec.load(str(models_dir / f"word2vec_w{window}.model"))
    print(f"  vocab_size={len(model.wv):,}")

    print(f"Loading TF-IDF vectorizer: tfidf_vectorizer_w{window}.joblib")
    vectorizer = joblib.load(str(models_dir / f"tfidf_vectorizer_w{window}.joblib"))
    feature_names = vectorizer.get_feature_names_out()

    # Load preprocessed corpus
    processed_files = sorted(processed_dir.glob("*.json"))
    if not processed_files:
        print("ERROR: No processed files. Run scripts/02_preprocess.py first.")
        sys.exit(1)

    all_books_tokens = []
    book_metadata = []
    for pf in processed_files:
        with open(pf) as f:
            data = json.load(f)
        all_books_tokens.append(data["tokens"])
        book_metadata.append({
            "gutenberg_id": data["gutenberg_id"],
            "title": data["title"],
            "author": data["author"],
            "genre": data["genre"],
        })

    print(f"Processed corpus: {len(all_books_tokens)} books")

    # Recompute TF-IDF on the EXISTING vectorizer
    book_texts = [" ".join(tokens) for tokens in all_books_tokens]
    t0 = time.time()
    tfidf_matrix = vectorizer.transform(book_texts)
    print(f"TF-IDF transform done ({time.time()-t0:.1f}s)")

    # Per-book artifacts
    for i, (meta, tokens) in enumerate(tqdm(zip(book_metadata, all_books_tokens),
                                             total=len(book_metadata),
                                             desc="Per-book artifacts",
                                             unit="book")):
        gid = meta["gutenberg_id"]
        tfidf_row = tfidf_matrix[i].toarray().flatten()
        word_weights = {}
        for word_idx, weight in enumerate(tfidf_row):
            if weight > 0:
                word = feature_names[word_idx]
                if word in model.wv:
                    word_weights[word] = weight
        sorted_words = sorted(word_weights.items(), key=lambda x: x[1], reverse=True)[:max_words]
        if not sorted_words:
            tqdm.write(f"  WARNING: no words for book {gid}")
            continue

        selected_words = [w for w, _ in sorted_words]
        selected_weights = np.array([wt for _, wt in sorted_words], dtype=np.float32)
        selected_vectors = np.array(
            [model.wv.get_vector(w, norm=True) for w in selected_words],
            dtype=np.float32,
        )

        np.save(str(features_dir / f"vectors_{gid}_w{window}.npy"), selected_vectors)
        np.save(str(features_dir / f"tfidf_{gid}_w{window}.npy"), selected_weights)
        with open(features_dir / f"words_{gid}_w{window}.json", "w") as f:
            json.dump({"gutenberg_id": gid, "title": meta["title"], "words": selected_words}, f)

    print(f"Saved per-book artifacts for {len(book_metadata)} books to {features_dir}")


if __name__ == "__main__":
    main()
