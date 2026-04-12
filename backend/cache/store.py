"""Content-addressed disk cache for pre-computed corpus results.

Per CONTEXT.md: disk cache for build-time corpus results; Redis for in-flight job state only.
"""
import hashlib
import json
from pathlib import Path
from typing import Any, Optional, Union

import numpy as np

CACHE_DIR = Path(__file__).resolve().parents[2] / 'data' / 'cache'


def cache_key(step_name: str, params: dict) -> str:
    """Generate deterministic cache key from step name and params.

    Keys are order-invariant: {'a': 1, 'b': 2} == {'b': 2, 'a': 1}.
    """
    canonical = json.dumps({step_name: params}, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


def _npy_path(key: str) -> Path:
    return CACHE_DIR / f'{key}.npy'


def _json_path(key: str) -> Path:
    return CACHE_DIR / f'{key}.json'


def cache_exists(key: str) -> bool:
    """Check if a cached result exists for the given key."""
    return _npy_path(key).exists() or _json_path(key).exists()


def cache_get(key: str) -> Optional[Union[np.ndarray, dict]]:
    """Retrieve cached result by key. Returns None if not found."""
    npy = _npy_path(key)
    if npy.exists():
        return np.load(str(npy), allow_pickle=False)

    jp = _json_path(key)
    if jp.exists():
        with open(jp) as f:
            return json.load(f)

    return None


def cache_put(key: str, value: Union[np.ndarray, dict, list]) -> Path:
    """Store a value in the cache. Returns path to the cached file.

    numpy arrays are stored as .npy; dicts/lists as .json.
    """
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    if isinstance(value, np.ndarray):
        path = _npy_path(key)
        np.save(str(path), value)
    else:
        path = _json_path(key)
        with open(path, 'w') as f:
            json.dump(value, f)

    return path
