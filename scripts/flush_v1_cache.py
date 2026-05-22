"""Eagerly flush data/cache/ ahead of a Word2Vec retrain or corpus change.

Plan 06-05 / BUG-05 (CONTEXT.md decision D-23) -- Eager cache migration.

The v1 content-addressed cache used ``sha256(step_name, params)`` and did NOT
include the corpus manifest hash or the Word2Vec model file hash. Plan 06-05
fixes the cache_key signature; this script removes every stale v1 artifact so
the first request after deploy triggers a full recompute against the new key
format. Aligns with the Phase 8 retrain workflow.

Usage:
    python scripts/flush_v1_cache.py            # interactive confirm
    python scripts/flush_v1_cache.py --yes      # non-interactive (CI / Docker)
    python scripts/flush_v1_cache.py --dry-run  # report what would be deleted

Next steps after flushing:
    1. python -m backend.pipeline.precompute        (~10 min)
    2. python -m backend.pipeline.precompute_viz    (~10 min)
    3. python -m backend.pipeline.precompute_vr     (~30 s)

Idempotent: re-running on an already-empty cache prints "nothing to flush".
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = REPO_ROOT / 'data' / 'cache'


def _human_size(n: int) -> str:
    for unit in ('B', 'KB', 'MB', 'GB'):
        if n < 1024.0:
            return f'{n:.1f} {unit}'
        n /= 1024.0
    return f'{n:.1f} TB'


def summarise_cache() -> tuple[int, int]:
    """Return (file_count, total_bytes) for data/cache/."""
    if not CACHE_DIR.exists():
        return 0, 0
    files = list(CACHE_DIR.rglob('*'))
    files = [f for f in files if f.is_file()]
    total = sum(f.stat().st_size for f in files)
    return len(files), total


def flush_cache() -> None:
    """Remove data/cache/ recursively. Re-creates the directory empty."""
    if CACHE_DIR.exists():
        shutil.rmtree(CACHE_DIR)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Eagerly flush data/cache/ (Plan 06-05 / BUG-05).'
    )
    parser.add_argument(
        '--yes', '-y',
        action='store_true',
        help='Skip the confirmation prompt (CI / Docker).',
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Report what would be deleted; do not touch the filesystem.',
    )
    args = parser.parse_args()

    count, total = summarise_cache()
    if count == 0:
        print(f'data/cache/ is already empty -- nothing to flush.')
        return 0

    print(f'Found {count} cached file(s) totalling {_human_size(total)} in {CACHE_DIR}')
    if args.dry_run:
        print('--dry-run set; not deleting. Re-run without --dry-run to flush.')
        return 0

    if not args.yes:
        answer = input('Delete all of these? [y/N]: ').strip().lower()
        if answer not in ('y', 'yes'):
            print('Aborted.')
            return 1

    flush_cache()
    print(f'Flushed {count} file(s). Recreate caches:')
    print('  1. python -m backend.pipeline.precompute')
    print('  2. python -m backend.pipeline.precompute_viz')
    print('  3. python -m backend.pipeline.precompute_vr')
    return 0


if __name__ == '__main__':
    sys.exit(main())
