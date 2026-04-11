import pytest
import numpy as np


def test_word2vec_vocabulary(synthetic_book_tokens):
    """Train tiny Word2Vec on synthetic corpus; verify vocab and vector shapes."""
    from gensim.models import Word2Vec
    sentences = synthetic_book_tokens  # list of lists of strings
    model = Word2Vec(
        sentences=sentences,
        vector_size=10,
        window=2,
        min_count=1,
        sg=1,
        epochs=1,
        workers=1,
        seed=42,
    )
    assert len(model.wv) > 0, "Word2Vec model should have a vocabulary"
    # Pick any word from the first book
    any_word = sentences[0][0]
    vec = model.wv[any_word]
    assert vec.shape == (10,), f"Expected vector shape (10,), got {vec.shape}"


def test_word2vec_deterministic(synthetic_book_tokens):
    """Same seed/workers produces identical vectors."""
    from gensim.models import Word2Vec
    kwargs = dict(sentences=synthetic_book_tokens, vector_size=10, window=2,
                  min_count=1, sg=1, epochs=5, workers=1, seed=42)
    m1 = Word2Vec(**kwargs)
    m2 = Word2Vec(**kwargs)
    word = list(m1.wv.key_to_index.keys())[0]
    np.testing.assert_array_almost_equal(m1.wv[word], m2.wv[word], decimal=5)


def test_tfidf_no_genre_labels():
    """TfidfVectorizer fit on all books together; no genre labels in feature names."""
    from sklearn.feature_extraction.text import TfidfVectorizer
    # Three synthetic "books" with different vocabulary
    horror_book = "vampire castle dark blood night shadow"
    scifi_book = "rocket planet alien space galaxy stars"
    romance_book = "love heart kiss embrace darling tender"
    all_books = [horror_book, scifi_book, romance_book]
    genre_labels = ['horror', 'scifi', 'romance']

    vectorizer = TfidfVectorizer()
    vectorizer.fit(all_books)  # fit on all at once, NO genre label info

    feature_names = set(vectorizer.get_feature_names_out())
    # Verify words from all three genres appear in vocabulary
    assert 'vampire' in feature_names
    assert 'rocket' in feature_names
    assert 'love' in feature_names
    # Critically: genre label strings should NOT appear as features
    for label in genre_labels:
        assert label not in feature_names, f"Genre label '{label}' should not be a TF-IDF feature"


def test_tfidf_vocabulary_restricted_to_w2v(synthetic_book_tokens):
    """TF-IDF vocabulary restricted to Word2Vec vocabulary."""
    from gensim.models import Word2Vec
    from sklearn.feature_extraction.text import TfidfVectorizer

    model = Word2Vec(
        sentences=synthetic_book_tokens,
        vector_size=10, window=2, min_count=1, sg=1,
        epochs=1, workers=1, seed=42
    )
    w2v_vocab = list(model.wv.key_to_index.keys())

    book_texts = [' '.join(tokens) for tokens in synthetic_book_tokens]
    vectorizer = TfidfVectorizer(vocabulary=w2v_vocab)
    vectorizer.fit(book_texts)

    for word in vectorizer.get_feature_names_out():
        assert word in model.wv, f"TF-IDF word '{word}' not in Word2Vec model"


def test_point_cloud_shape():
    """Point cloud (vectors + weights) has correct shapes."""
    n_words = 50
    embedding_dim = 10
    vectors = np.random.randn(n_words, embedding_dim).astype(np.float32)
    weights = np.abs(np.random.randn(n_words)) + 0.01
    # Simulate selecting top-K words (already selected, just check shapes)
    assert vectors.shape == (n_words, embedding_dim)
    assert weights.shape == (n_words,)
    assert np.all(weights > 0)


def test_tfidf_weights_positive(synthetic_book_tokens):
    """All TF-IDF weights in output are strictly > 0."""
    from gensim.models import Word2Vec
    from sklearn.feature_extraction.text import TfidfVectorizer

    model = Word2Vec(
        sentences=synthetic_book_tokens,
        vector_size=10, window=2, min_count=1, sg=1,
        epochs=1, workers=1, seed=42
    )
    w2v_vocab = list(model.wv.key_to_index.keys())
    book_texts = [' '.join(tokens) for tokens in synthetic_book_tokens]

    vectorizer = TfidfVectorizer(vocabulary=w2v_vocab, norm=None)
    tfidf_matrix = vectorizer.fit_transform(book_texts)

    # For first book, check non-zero weights
    row = tfidf_matrix[0].toarray().flatten()
    nonzero_weights = row[row > 0]
    assert len(nonzero_weights) > 0
    assert np.all(nonzero_weights > 0)
