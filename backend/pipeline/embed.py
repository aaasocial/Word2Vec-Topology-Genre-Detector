"""Project uploaded text into existing Word2Vec space (no retraining).

Per CONTEXT.md: OOV words excluded; count returned in response.
The shared embedding space is immutable.
"""
import asyncio

import numpy as np


def project_into_space(
    tokens: list[str],
    w2v_model,
    tfidf_vectorizer,
    max_words: int = 100000,
    cancel_event: asyncio.Event = None,
) -> tuple[list[str], np.ndarray, np.ndarray, int]:
    """Project book tokens into existing Word2Vec + TF-IDF space.

    Args:
        tokens: Cleaned tokens from the uploaded book
        w2v_model: Pre-trained gensim Word2Vec model
        tfidf_vectorizer: Pre-fitted sklearn TfidfVectorizer
        max_words: Maximum words to include (TF-IDF ranked)
        cancel_event: If set, raises asyncio.CancelledError before computation

    Returns:
        (selected_words, vectors, tfidf_weights, oov_count)
        - selected_words: list of top-max_words words by TF-IDF
        - vectors: (n, dim) normalized word vectors
        - tfidf_weights: (n,) TF-IDF weights
        - oov_count: number of tokens not in Word2Vec vocabulary
    """
    if cancel_event and cancel_event.is_set():
        raise asyncio.CancelledError('Cancelled before embed step')

    book_text = ' '.join(tokens)
    tfidf_row = tfidf_vectorizer.transform([book_text]).toarray().flatten()
    feature_names = tfidf_vectorizer.get_feature_names_out()

    word_weights = {}
    all_unique = set(tokens)
    oov_count = 0

    for word in all_unique:
        if word in w2v_model.wv:
            idx = np.where(feature_names == word)[0]
            if len(idx) > 0 and tfidf_row[idx[0]] > 0:
                word_weights[word] = tfidf_row[idx[0]]
        else:
            oov_count += 1

    sorted_words = sorted(word_weights.items(), key=lambda x: x[1], reverse=True)[:max_words]
    if not sorted_words:
        raise ValueError('No words from the uploaded book exist in the trained vocabulary')

    selected_words = [w for w, _ in sorted_words]
    selected_weights = np.array([wt for _, wt in sorted_words], dtype=np.float32)
    selected_vectors = np.array(
        [w2v_model.wv.get_vector(w, norm=True) for w in selected_words],
        dtype=np.float32
    )

    return selected_words, selected_vectors, selected_weights, oov_count
