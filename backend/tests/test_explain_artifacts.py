"""Phase 9 D-50: smoke tests for the precompute_explain artifact.

Tests both the on-disk schema of data/models/explain_artifacts.npz and the
FastAPI lifespan loading contract (Q6 -- app.state.explain_artifacts + nn_index).

These tests SKIP gracefully if the artifact is missing (CI without LFS-pulled
models) so they're safe to run anywhere.
"""
from pathlib import Path

import numpy as np
import pytest


ARTIFACT_PATH = (
    Path(__file__).resolve().parents[2] / "data" / "models" / "explain_artifacts.npz"
)


# ---------------------------------------------------------------------------
# Artifact schema tests
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def artifact():
    if not ARTIFACT_PATH.exists():
        pytest.skip(
            f"{ARTIFACT_PATH} not built -- "
            f"run `python -m backend.pipeline.precompute_explain`"
        )
    return np.load(ARTIFACT_PATH, allow_pickle=True)


def test_artifact_has_expected_keys(artifact):
    expected = {
        "feature_matrix_l2",
        "book_metadata",
        "per_genre_centroids",
        "genre_names",
        "cluster_to_representative_words",
        "metadata",
    }
    assert set(artifact.files) == expected, (
        f"keys mismatch: {set(artifact.files)} vs {expected}"
    )


def test_feature_matrix_shape_and_l2_normalized(artifact):
    fm = artifact["feature_matrix_l2"]
    assert fm.ndim == 2 and fm.shape[1] == 600, fm.shape
    norms = np.linalg.norm(fm, axis=1)
    # Each row must be L2-normalized (or exactly zero if a degenerate book existed)
    nonzero_mask = norms > 1e-6
    assert np.allclose(norms[nonzero_mask], 1.0, atol=1e-5), (
        f"non-unit norms: {norms[nonzero_mask][:5]}"
    )


def test_per_genre_centroids_shape_and_l2(artifact):
    cents = artifact["per_genre_centroids"]
    assert cents.shape == (8, 150), cents.shape
    norms = np.linalg.norm(cents, axis=1)
    nonzero_mask = norms > 1e-6
    assert np.allclose(norms[nonzero_mask], 1.0, atol=1e-5)


def test_genre_names_aligned(artifact):
    names = artifact["genre_names"]
    assert names.shape == (8,)
    cents = artifact["per_genre_centroids"]
    assert names.shape[0] == cents.shape[0]


def test_book_metadata_shape_matches_feature_matrix(artifact):
    meta = artifact["book_metadata"]
    fm = artifact["feature_matrix_l2"]
    assert meta.shape == (fm.shape[0],)
    sample = meta[0]
    for k in ("gutenberg_id", "title", "author", "genre"):
        assert k in sample, f"missing key {k} in book_metadata[0]"


def test_cluster_representative_words_length(artifact):
    cw = artifact["cluster_to_representative_words"]
    # k_clusters = 200 per config/params.yaml
    assert cw.shape == (200,), cw.shape
    assert isinstance(cw[0], list) and len(cw[0]) >= 1
    assert all(isinstance(w, str) for w in cw[0])


def test_metadata_carries_lineage_hashes(artifact):
    md_raw = artifact["metadata"]
    md = md_raw.item() if md_raw.dtype == object else dict(md_raw)
    for k in (
        "corpus_hash",
        "w2v_model_sha256",
        "window",
        "k_clusters",
        "alpha",
        "created_utc",
    ):
        assert k in md, f"missing metadata key {k}"
