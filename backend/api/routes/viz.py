"""Viz API routes: pre-computed scatter data and TF-IDF weights.

All endpoints serve from disk cache (data/cache/).
Run `python -m backend.pipeline.precompute_viz` before starting the server.
"""
import json
import re
from pathlib import Path
from typing import Literal

import yaml
from fastapi import APIRouter, HTTPException

from backend.cache.store import cache_key, cache_get
from backend.pipeline.precompute_viz import (
    get_cached_scatter, get_cached_tfidf_genre, get_cached_tfidf_book,
    get_cached_persistence_image,
)

router = APIRouter()

# Load word2vec window from params.yaml once at module import
def _get_default_window() -> int:
    params_path = Path(__file__).resolve().parents[3] / 'config' / 'params.yaml'
    try:
        with open(params_path) as f:
            params = yaml.safe_load(f)
        return params.get('word2vec', {}).get('window', 15)
    except Exception:
        return 15

_DEFAULT_WINDOW = _get_default_window()

# Load known genres once at startup
def _load_genre_names() -> list[str]:
    try:
        genre_names_path = Path(__file__).resolve().parents[3] / 'data' / 'models' / 'genre_names.json'
        with open(genre_names_path) as f:
            return json.load(f)
    except Exception:
        # Fallback to hardcoded list matching UI-SPEC palette
        return ['romance', 'mystery', 'western', 'fantasy', 'scifi',
                'horror', 'historical', 'literary', 'adventure', 'gothic']

_KNOWN_GENRES = _load_genre_names()

# Regex for valid Gutenberg IDs (positive integer only -- prevents path traversal)
_GUTENBERG_ID_RE = re.compile(r'^\d+$')


@router.get('/scatter/{projection}')
async def get_scatter(
    projection: Literal['pca', 'kpca', 'umap', 'tsne'],  # FastAPI validates this (T-3-02)
) -> dict:
    """Return pre-computed 3D scatter data for the given projection.

    Response schema:
    {
      "projection": "pca",
      "points": [
        {
          "word": "love",
          "genre": "romance",
          "x": 0.12, "y": -0.34, "z": 0.56,
          "tfidf_weight": 0.042,
          "neighbors": [{"word": "passion", "similarity": 0.91}, ...]
        },
        ...
      ]
    }
    """
    data = get_cached_scatter(projection, _DEFAULT_WINDOW)
    if data is None:
        raise HTTPException(
            status_code=503,
            detail='Visualization data not found. Run python -m backend.pipeline.precompute_viz first.',
        )
    return data


@router.get('/tfidf/{genre}')
async def get_tfidf_genre(genre: str) -> dict:
    """Return per-word TF-IDF weight map for the given genre.

    Validates genre against known genre list (T-3-02).
    Response: {"love": 0.042, "passion": 0.038, ...}
    """
    if genre not in _KNOWN_GENRES:
        raise HTTPException(status_code=404, detail=f'Genre not found: {genre}')
    data = get_cached_tfidf_genre(genre, _DEFAULT_WINDOW)
    if data is None:
        raise HTTPException(
            status_code=503,
            detail='TF-IDF data not found. Run python -m backend.pipeline.precompute_viz first.',
        )
    return data


@router.get('/tfidf/book/{gutenberg_id}')
async def get_tfidf_book(gutenberg_id: str) -> dict:
    """Return per-word TF-IDF weight map for a specific book.

    Validates gutenberg_id is a positive integer (prevents path traversal, T-3-02).
    Response: {"love": 0.038, ...}
    """
    if not _GUTENBERG_ID_RE.match(gutenberg_id):
        raise HTTPException(
            status_code=400,
            detail=f'Invalid gutenberg_id: must be a positive integer, got {gutenberg_id!r}',
        )
    data = get_cached_tfidf_book(gutenberg_id, _DEFAULT_WINDOW)
    if data is None:
        raise HTTPException(
            status_code=404,
            detail=f'No cached TF-IDF data for book {gutenberg_id}.',
        )
    return data


@router.get('/persistence/{genre}')
async def get_persistence_image(genre: str, dim: int = 0) -> dict:
    """Return pre-computed persistence image for a genre.

    Validates genre against known genre list (T-4-01).
    Validates dim in {0, 1, 2} (T-4-01).
    Response: {data: number[], M: number, dim: number, vmin: number, vmax: number}
    """
    if genre not in _KNOWN_GENRES:
        raise HTTPException(status_code=404, detail=f'Genre not found: {genre}')
    if dim not in (0, 1, 2):
        raise HTTPException(status_code=400, detail=f'Invalid homology dimension: {dim}. Must be 0, 1, or 2.')
    data = get_cached_persistence_image(genre, dim, _DEFAULT_WINDOW, is_book=False)
    if data is None:
        raise HTTPException(
            status_code=404,
            detail=f'No cached persistence image for genre {genre} dim={dim}.',
        )
    return data


@router.get('/persistence/book/{gutenberg_id}')
async def get_persistence_image_book(gutenberg_id: str, dim: int = 0) -> dict:
    """Return pre-computed persistence image for a specific book.

    Validates gutenberg_id is a positive integer (T-4-02).
    Validates dim in {0, 1, 2}.
    Response: {data: number[], M: number, dim: number, vmin: number, vmax: number}
    """
    if not _GUTENBERG_ID_RE.match(gutenberg_id):
        raise HTTPException(
            status_code=400,
            detail=f'Invalid gutenberg_id: must be a positive integer, got {gutenberg_id!r}',
        )
    if dim not in (0, 1, 2):
        raise HTTPException(status_code=400, detail=f'Invalid homology dimension: {dim}. Must be 0, 1, or 2.')
    data = get_cached_persistence_image(gutenberg_id, dim, _DEFAULT_WINDOW, is_book=True)
    if data is None:
        raise HTTPException(
            status_code=404,
            detail=f'No cached persistence image for book {gutenberg_id} dim={dim}.',
        )
    return data
