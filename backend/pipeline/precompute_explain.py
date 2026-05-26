"""Phase 9 D-50 precompute: emits data/models/explain_artifacts.npz.

Run AFTER:
  1. scripts/05_build_features.py        (produces feature_matrix.npy + book_order.json + words_*.json + tfidf_*.npy)
  2. backend.pipeline.precompute         (D-38 calibrated SVM + lineage.json)

Run BEFORE:
  - First start of the FastAPI app server (lifespan loads the .npz).

Produces:
  - data/models/explain_artifacts.npz   (keys per 09-RESEARCH.md Q2 storage format)

Usage:
  python -m backend.pipeline.precompute_explain --window 15
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import yaml
from gensim.models import Word2Vec

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from utils import load_params  # noqa: E402

from backend.cache.lineage import corpus_hash, w2v_model_sha256

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Core helpers (Q2 formula -- per-genre TF-IDF-weighted L2-normalized w2v centroid)
# ---------------------------------------------------------------------------

def compute_per_genre_centroids(
    books_by_genre: dict[str, list[dict]],
    features_dir: Path,
    window: int,
    w2v_model: Word2Vec,
) -> tuple[np.ndarray, list[str]]:
    """Per-genre TF-IDF-weighted L2-normalized w2v centroid (09-RESEARCH.md Q2).

    Math invariant check (PROJECT.md):
      (1) Single shared w2v space  -- uses w2v_model.wv only; no per-genre retrain.
      (2) Homology in full N-D     -- N/A (downstream-of-classification aid).
      (3) TF-IDF without genre labels -- per-book TF-IDF is fit corpus-wide;
          genre grouping happens AFTER SVM training, for explanation only.
      (4) L2 normalization         -- result normalized for cosine math at lookup time.

    Returns: (centroids (n_genres, w2v_dim) float32 L2-normed, genre_names list).
    """
    genre_names = list(books_by_genre.keys())
    vec_size = w2v_model.vector_size
    centroids = np.zeros((len(genre_names), vec_size), dtype=np.float64)

    for gi, genre in enumerate(genre_names):
        numerator = np.zeros(vec_size, dtype=np.float64)
        denominator = 0.0
        for book in books_by_genre[genre]:
            # corpus/books.yaml uses 'gutenberg_id' as the canonical id key
            # (NOT 'id' -- the plan-prescribed key was inaccurate).
            gid = book.get("gutenberg_id") or book.get("id")
            if gid is None:
                log.warning(f"Skipping book in {genre}: no gutenberg_id/id key")
                continue
            words_path = features_dir / f"words_{gid}_w{window}.json"
            tfidf_path = features_dir / f"tfidf_{gid}_w{window}.npy"
            if not (words_path.exists() and tfidf_path.exists()):
                log.warning(f"Skipping {gid}: per-book TF-IDF files missing")
                continue
            with open(words_path) as f:
                words_data = json.load(f)
            # words JSON is a dict with a 'words' key (matches precompute.py contract).
            words = words_data["words"] if isinstance(words_data, dict) else words_data
            weights = np.load(tfidf_path)
            for word, weight in zip(words[: len(weights)], weights):
                if word in w2v_model.wv:
                    numerator += weight * w2v_model.wv.get_vector(word)
                    denominator += float(weight)
        if denominator > 0:
            centroid = numerator / denominator
            norm = np.linalg.norm(centroid)
            if norm > 0:
                centroids[gi] = centroid / norm
    return centroids.astype(np.float32), genre_names


def compute_cluster_representative_words(
    w2v_model: Word2Vec,
    kmeans,
    top_n: int = 10,
) -> list[list[str]]:
    """For each k-means cluster, return top_n words closest to the cluster centroid
    by w2v cosine. Output aligned to kmeans.cluster_centers_ row order."""
    all_words = list(w2v_model.wv.key_to_index.keys())
    vecs = np.array([w2v_model.wv.get_vector(w) for w in all_words])
    vecs_l2 = vecs / (np.linalg.norm(vecs, axis=1, keepdims=True) + 1e-10)
    centers_l2 = kmeans.cluster_centers_ / (
        np.linalg.norm(kmeans.cluster_centers_, axis=1, keepdims=True) + 1e-10
    )
    cosine = vecs_l2 @ centers_l2.T  # (n_words, n_clusters)
    cluster_words: list[list[str]] = []
    for c in range(centers_l2.shape[0]):
        top_idx = np.argsort(-cosine[:, c])[:top_n]
        cluster_words.append([all_words[i] for i in top_idx])
    return cluster_words


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

def precompute_explain_all(window: int | None = None) -> Path:
    """Emit data/models/explain_artifacts.npz for the runtime /explain endpoint.

    Returns the path of the emitted artifact.
    """
    params = load_params()
    if window is None:
        window = params["word2vec"]["window"]
    k_clusters = params["features"]["k_clusters"]
    alpha = params["features"]["alpha"]

    project_root = Path(__file__).resolve().parents[2]
    models_dir = project_root / "data" / "models"
    features_dir = project_root / "data" / "features"
    corpus_path = project_root / "corpus" / "books.yaml"

    log.info("Loading models...")
    w2v_model = Word2Vec.load(str(models_dir / f"word2vec_w{window}.model"))
    kmeans = joblib.load(str(models_dir / f"kmeans_w{window}_k{k_clusters}.pkl"))

    log.info("Loading raw feature matrix + book order...")
    X_raw = np.load(features_dir / f"feature_matrix_w{window}_k{k_clusters}.npy")
    with open(features_dir / "book_order.json") as f:
        book_order = json.load(f)
    assert X_raw.shape[0] == len(book_order), f"{X_raw.shape} vs {len(book_order)}"

    log.info("Loading corpus metadata...")
    with open(corpus_path) as f:
        books_data = yaml.safe_load(f)
    # Build (gid -> {title, author, genre}) lookup. corpus/books.yaml uses
    # 'gutenberg_id' as the canonical id key (plan-prescribed 'id' was wrong).
    book_meta_lookup: dict[str, dict] = {}
    books_by_genre: dict[str, list[dict]] = {}
    for genre, book_list in books_data["genres"].items():
        books_by_genre[genre] = book_list
        for b in book_list:
            gid = b.get("gutenberg_id") or b.get("id")
            if gid is None:
                continue
            book_meta_lookup[str(gid)] = {
                "gutenberg_id": str(gid),
                "title": b.get("title", ""),
                "author": b.get("author", ""),
                "genre": genre,
            }

    # --- 1. Apply alpha weighting + L2-normalize per row ---
    # The raw matrix from scripts/05_build_features.py is [topo_norm | loc_norm]
    # with NO alpha applied (script 06 applies at load time during sweeps).
    # The runtime feature_vec produced by backend.pipeline.features.build_feature_vector
    # IS alpha-weighted, so we MUST match that here for the NN-index lookups to
    # work against runtime inputs.
    log.info("Applying alpha weighting and L2-normalizing feature matrix...")
    topo = X_raw[:, :400]
    loc = X_raw[:, 400:]
    X_weighted = np.concatenate([alpha * topo, (1 - alpha) * loc], axis=1)
    row_norms = np.linalg.norm(X_weighted, axis=1, keepdims=True) + 1e-10
    feature_matrix_l2 = (X_weighted / row_norms).astype(np.float32)

    # --- 2. Build book metadata array aligned to feature matrix rows ---
    book_metadata = np.array(
        [
            book_meta_lookup.get(
                str(b["gutenberg_id"]),
                {
                    "gutenberg_id": str(b["gutenberg_id"]),
                    "title": "",
                    "author": "",
                    "genre": b.get("genre", ""),
                },
            )
            for b in book_order
        ],
        dtype=object,
    )

    # --- 3. Per-genre w2v centroids (Q2) ---
    log.info("Computing per-genre w2v centroids...")
    per_genre_centroids, genre_names_list = compute_per_genre_centroids(
        books_by_genre, features_dir, window, w2v_model
    )

    # --- 4. K-means cluster -> representative words ---
    log.info("Computing cluster representative words...")
    cluster_words = compute_cluster_representative_words(w2v_model, kmeans, top_n=10)
    # np.array(list_of_equal_length_lists, dtype=object) collapses to a 2-D
    # array. Pre-allocate a 1-D object array and assign so each element stays
    # a Python list (required by the test contract).
    cluster_to_representative_words = np.empty(len(cluster_words), dtype=object)
    for i, words in enumerate(cluster_words):
        cluster_to_representative_words[i] = words

    # --- 5. Metadata for runtime drift check (Pitfall 5) ---
    metadata = {
        "corpus_hash": corpus_hash(),
        "w2v_model_sha256": w2v_model_sha256(window),
        "window": window,
        "k_clusters": k_clusters,
        "alpha": alpha,
        "created_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "created_by": "Plan 09-02 (D-50)",
    }
    metadata_arr = np.array(metadata, dtype=object)

    # --- 6. Atomic write (Pitfall 3: avoid half-written .npz) ---
    # np.savez_compressed auto-appends '.npz' if the filename does not already
    # end in '.npz'. We pass a temp filename ending in '.npz.tmp.npz' so the
    # written file matches what os.replace() expects.
    out_path = models_dir / "explain_artifacts.npz"
    tmp_path = models_dir / "explain_artifacts.tmp.npz"
    np.savez_compressed(
        tmp_path,
        feature_matrix_l2=feature_matrix_l2,
        book_metadata=book_metadata,
        per_genre_centroids=per_genre_centroids,
        genre_names=np.array(genre_names_list, dtype=object),
        cluster_to_representative_words=cluster_to_representative_words,
        metadata=metadata_arr,
    )
    os.replace(tmp_path, out_path)
    log.info(f"Wrote {out_path} ({out_path.stat().st_size / 1024:.1f} KB)")
    return out_path


def main():
    parser = argparse.ArgumentParser(
        description="Phase 9 D-50 precompute: emit explain_artifacts.npz"
    )
    parser.add_argument(
        "--window",
        type=int,
        default=None,
        help="Word2Vec window size (default: from config/params.yaml)",
    )
    args = parser.parse_args()
    precompute_explain_all(window=args.window)


if __name__ == "__main__":
    main()
