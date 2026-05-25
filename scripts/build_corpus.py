#!/usr/bin/env python3
"""Build canonical v2 corpus/books.yaml from .planning/research/v2/corpus_candidates.yaml.

Phase 8 Wave 1 / CEXP-05 (P1, upgraded from P2 per D-24).

Reads corpus_candidates.yaml, applies the deterministic selection rule from
CORPUS_SOURCING.md §5, fetches text from Project Gutenberg (re-uses
01_download_corpus.py::download_book pattern), computes canonical-bytes
sha256, and emits corpus/books.yaml + corpus_build.log.

Usage:
    python scripts/build_corpus.py                  # full rebuild, all 8 genres
    python scripts/build_corpus.py --dry-run        # log selections only; no fetch
    python scripts/build_corpus.py --genre romance  # rebuild one genre only
    python scripts/build_corpus.py --download-sleep 3.0  # rate-limit override

D-26: atomic swap target is corpus/books.yaml. Do NOT hand-edit after this script lands.
D-28: all 240 v2 books re-fetched cleanly for uniform provenance; existing data/raw/ NOT trusted.
D-30: failed fetches auto-skip and promote next-by-score candidate; logged to corpus_build.log.
"""
from __future__ import annotations

import argparse
import hashlib
import logging
import sys
import time
from datetime import date, datetime, timezone
from pathlib import Path

import requests
import yaml
from tqdm import tqdm

REPO_ROOT = Path(__file__).resolve().parents[1]
CANDIDATES_PATH = REPO_ROOT / ".planning" / "research" / "v2" / "corpus_candidates.yaml"
BOOKS_YAML_PATH = REPO_ROOT / "corpus" / "books.yaml"
RAW_DIR = REPO_ROOT / "data" / "raw"
BUILD_LOG_PATH = REPO_ROOT / ".planning" / "research" / "v2" / "corpus_build.log"
PARAMS_PATH = REPO_ROOT / "config" / "params.yaml"

# Per D-29: v1→v2 genre remap (used when consuming candidates that still carry v1 keys)
V1_TO_V2_GENRE_MAP = {
    "gothic": "gothic_horror",
    "horror": "gothic_horror",
    "scifi": "speculative",
    "fantasy": "speculative",
    # 6 unchanged: adventure, historical, literary, mystery, romance, western
}

# Per CORPUS_SOURCING.md §8 step 3 — the 8 v2 genres (Proposal A)
V2_GENRES = [
    "adventure",
    "gothic_horror",
    "historical",
    "literary",
    "mystery",
    "romance",
    "speculative",
    "western",
]

WORD_COUNT_MIN = 20_000  # Per Claude's-discretion call recorded in 08-CONTEXT.md
TARGET_BOOKS_PER_GENRE = 30  # Per D-06 + §4 Proposal A
AUTHOR_DIVERSITY_FLOOR = 8  # Per D-08
DEFAULT_DOWNLOAD_SLEEP = 2.0
GENRE_FETCH_FAILURE_THRESHOLD = 0.10  # D-30: >10% halt threshold

log = logging.getLogger("build_corpus")


# ---------------------------------------------------------------------------
# Pure helpers (unit-tested)
# ---------------------------------------------------------------------------

def merge_v1_genre_to_v2(v1_genre: str) -> str:
    """Map v1 candidate-list genre key to v2 key. Per D-29."""
    return V1_TO_V2_GENRE_MAP.get(v1_genre, v1_genre)


def compute_text_sha256(raw_bytes: bytes) -> str:
    """Return hex sha256 of *raw_bytes*. Deterministic; 64-char lowercase hex."""
    return hashlib.sha256(raw_bytes).hexdigest()


def collect_v2_candidates(candidates_data: dict) -> dict[str, list[dict]]:
    """Read corpus_candidates.yaml → merge per D-29 → return {v2_genre: [candidate, ...]}.

    Candidates within a v2 genre are sorted by source_consensus_score DESC,
    gutenberg_id ASC. Merged buckets (gothic_horror, speculative) re-sort their
    union by the same key.
    """
    buckets: dict[str, list[dict]] = {g: [] for g in V2_GENRES}
    for v1_genre, payload in candidates_data.get("genres", {}).items():
        v2_genre = merge_v1_genre_to_v2(v1_genre)
        if v2_genre not in buckets:
            # Defensive: unknown v1 key. Skip with warning rather than crash.
            log.warning("unknown v1 genre key %r; skipping", v1_genre)
            continue
        for cand in payload.get("candidates", []):
            buckets[v2_genre].append({**cand, "_source_v1_genre": v1_genre})
    # Sort each bucket deterministically.
    for v2_genre in buckets:
        buckets[v2_genre].sort(
            key=lambda c: (-int(c.get("source_consensus_score", 0)),
                           int(c["gutenberg_id"])),
        )
    return buckets


def select_books(
    candidates: list[dict],
    target_count: int = TARGET_BOOKS_PER_GENRE,
    author_floor: int = AUTHOR_DIVERSITY_FLOOR,
) -> list[dict]:
    """Implement CORPUS_SOURCING.md §5 'Phase 8 selection rule' steps 1-2.

    Step 1: top-scored title from each of the first ``author_floor`` distinct
    authors (walks sorted candidates, accumulates one title per distinct
    author until the floor is hit).

    Step 2: fill remaining ``target_count - author_floor`` slots by walking
    the sorted candidate list and adding any title not yet selected (ties
    already broken by the input sort: source_consensus_score DESC,
    gutenberg_id ASC).

    Caller is responsible for de-duplication via gutenberg_id if necessary;
    the candidate list itself is the canonical input. Does NOT fetch text.
    """
    # Track selection by gutenberg_id to handle accidental candidate duplicates.
    selected: list[dict] = []
    selected_ids: set[int] = set()

    # Step 1: author-diversity floor.
    seen_authors: set[str] = set()
    for cand in candidates:
        author = str(cand.get("author", "")).strip().lower()
        gid = int(cand["gutenberg_id"])
        if author in seen_authors:
            continue
        if gid in selected_ids:
            continue
        selected.append(cand)
        selected_ids.add(gid)
        seen_authors.add(author)
        if len(seen_authors) >= author_floor:
            break

    # Step 2: fill remaining slots by walking sorted candidates.
    for cand in candidates:
        if len(selected) >= target_count:
            break
        gid = int(cand["gutenberg_id"])
        if gid in selected_ids:
            continue
        selected.append(cand)
        selected_ids.add(gid)

    return selected


# ---------------------------------------------------------------------------
# Network / I/O helpers
# ---------------------------------------------------------------------------

def _gutenberg_urls(gutenberg_id: int) -> list[str]:
    """Mirror scripts/01_download_corpus.py URL cascade."""
    return [
        f"https://www.gutenberg.org/cache/epub/{gutenberg_id}/pg{gutenberg_id}.txt",
        f"https://www.gutenberg.org/files/{gutenberg_id}/{gutenberg_id}-0.txt",
        f"https://www.gutenberg.org/files/{gutenberg_id}/{gutenberg_id}.txt",
    ]


def download_and_hash(
    gutenberg_id: int,
    download_sleep: float,
    *,
    fetch_fn=None,
) -> tuple[str, str, int] | None:
    """Fetch text via gutenbergpy + strip_headers; compute text_sha256 + word_count.

    Returns (canonical_text, text_sha256_hex, word_count) on success.
    Returns None on fetch failure (404, body too short, exception) — caller
    promotes next candidate per D-30.

    Re-uses scripts/01_download_corpus.py::download_book URL-cascade pattern.
    Honors config/params.yaml::corpus.download_sleep between requests.

    The optional ``fetch_fn`` arg lets unit tests inject a mock that returns
    the canonical text directly without hitting the network.
    """
    if fetch_fn is not None:
        try:
            canonical_text = fetch_fn(gutenberg_id)
        except Exception as exc:  # pragma: no cover (mock side-effect)
            log.warning("[%s] fetch_fn raised %r", gutenberg_id, exc)
            return None
        if not canonical_text or len(canonical_text) < 1000:
            return None
        text_hash = compute_text_sha256(canonical_text.encode("utf-8"))
        word_count = len(canonical_text.split())
        return canonical_text, text_hash, word_count

    # Production path: defer importing gutenbergpy until needed.
    try:
        from gutenbergpy.textget import strip_headers
    except ImportError as exc:  # pragma: no cover (env issue surfacing at runtime)
        log.error("gutenbergpy not installed: %s", exc)
        return None

    last_err: Exception | None = None
    for url in _gutenberg_urls(gutenberg_id):
        try:
            r = requests.get(url, timeout=60)
            if r.status_code == 200 and len(r.content) > 1000:
                stripped = strip_headers(r.content).decode("utf-8", errors="replace")
                if len(stripped) < 1000:
                    last_err = RuntimeError(
                        f"stripped text too short ({len(stripped)} chars)"
                    )
                    continue
                text_hash = compute_text_sha256(stripped.encode("utf-8"))
                word_count = len(stripped.split())
                time.sleep(download_sleep)
                return stripped, text_hash, word_count
            last_err = RuntimeError(
                f"status={r.status_code} bytes={len(r.content)}"
            )
        except Exception as exc:  # noqa: BLE001 - log + try next URL
            last_err = exc
            continue
    log.warning("[%s] all URLs failed: %s", gutenberg_id, last_err)
    return None


def write_raw_file(gutenberg_id: int, canonical_text: str, raw_dir: Path = RAW_DIR) -> Path:
    """Persist to data/raw/{gutenberg_id}.txt with utf-8 encoding."""
    raw_dir.mkdir(parents=True, exist_ok=True)
    path = raw_dir / f"{gutenberg_id}.txt"
    path.write_text(canonical_text, encoding="utf-8")
    return path


# ---------------------------------------------------------------------------
# Build pipeline
# ---------------------------------------------------------------------------

def _ts() -> str:
    """UTC ISO 8601 second-precision timestamp suitable for log lines."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _log_event(log_path: Path, line: str) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as f:
        f.write(line.rstrip("\n") + "\n")


def _load_download_sleep(override: float | None) -> float:
    """Read corpus.download_sleep from params.yaml; CLI override takes precedence."""
    if override is not None:
        return float(override)
    try:
        with PARAMS_PATH.open(encoding="utf-8") as f:
            params = yaml.safe_load(f)
        return float(params.get("corpus", {}).get("download_sleep",
                                                  DEFAULT_DOWNLOAD_SLEEP))
    except Exception:  # noqa: BLE001
        return DEFAULT_DOWNLOAD_SLEEP


def build_corpus(args) -> dict:
    """Main pipeline. Reads candidates, selects, fetches with promote-on-failure,
    emits books.yaml + corpus_build.log + data/raw/*.txt.

    Per-genre fetch-failure guard: if >10% of attempted fetches fail for a
    single genre, HALT and surface the log for human review (D-30 escalation
    threshold).

    Returns a build summary dict for printing / test assertions.
    """
    candidates_path = Path(args.candidates_path) if args.candidates_path else CANDIDATES_PATH
    output_path = Path(args.output_path) if args.output_path else BOOKS_YAML_PATH
    raw_dir = Path(args.raw_dir) if getattr(args, "raw_dir", None) else RAW_DIR
    log_path = Path(args.log_path) if getattr(args, "log_path", None) else BUILD_LOG_PATH
    download_sleep = _load_download_sleep(args.download_sleep)

    with candidates_path.open(encoding="utf-8") as f:
        candidates_data = yaml.safe_load(f)
    buckets = collect_v2_candidates(candidates_data)

    genres_to_build = V2_GENRES if not args.genre else [args.genre]
    today = date.today().isoformat()

    # Truncate log at the start of a full run (mirrors the atomic D-26 contract).
    if not args.append_log:
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text("", encoding="utf-8")

    # Preserve pre-existing per-genre entries from the on-disk books.yaml when
    # rebuilding only a subset of genres (so --genre <name> keeps the others).
    existing_yaml: dict = {"genres": {}}
    if output_path.exists() and args.genre:
        try:
            with output_path.open(encoding="utf-8") as f:
                existing_yaml = yaml.safe_load(f) or {"genres": {}}
            if "genres" not in existing_yaml:
                existing_yaml["genres"] = {}
        except Exception:  # noqa: BLE001
            existing_yaml = {"genres": {}}

    results: dict[str, list[dict]] = {}
    summary = {
        "genres": {},
        "total_selected": 0,
        "total_fetch_failures": 0,
        "dry_run": bool(args.dry_run),
    }

    for v2_genre in genres_to_build:
        cands = buckets.get(v2_genre, [])
        if not cands:
            log.warning("no candidates for genre %s", v2_genre)
            continue

        # Select more than target so we have promote-on-failure headroom.
        selection_pool = select_books(
            cands, target_count=min(len(cands), TARGET_BOOKS_PER_GENRE * 2)
        )
        # The first TARGET_BOOKS_PER_GENRE are the "primary" selections;
        # everything after acts as the promotion pool (D-30).
        primary = selection_pool[:TARGET_BOOKS_PER_GENRE]
        promotion_pool = selection_pool[TARGET_BOOKS_PER_GENRE:]

        # Log selections.
        for cand in primary:
            _log_event(
                log_path,
                f"{_ts()} SELECT {v2_genre} gutenberg_id={cand['gutenberg_id']} "
                f"author=\"{cand['author']}\" score={cand.get('source_consensus_score', 0)}",
            )

        if args.dry_run:
            results[v2_genre] = [
                {
                    "gutenberg_id": int(c["gutenberg_id"]),
                    "title": c["title"],
                    "author": c["author"],
                    "word_count": int(c.get("word_count", 0)) or None,
                    "source": {
                        "provider": "gutenberg",
                        "fetched_at": today,
                        "text_sha256": "DRYRUN",
                    },
                }
                for c in primary
            ]
            _log_event(
                log_path,
                f"{_ts()} GENRE_DONE {v2_genre} selected={len(primary)} "
                f"fetch_failures=0 (dry-run)",
            )
            summary["genres"][v2_genre] = {
                "selected": len(primary),
                "fetch_failures": 0,
                "fetch_attempts": 0,
            }
            summary["total_selected"] += len(primary)
            continue

        # Real fetch path with promote-on-failure.
        final_entries: list[dict] = []
        promotion_iter = iter(promotion_pool)
        fetch_failures = 0
        fetch_attempts = 0
        bar = tqdm(
            total=TARGET_BOOKS_PER_GENRE,
            desc=v2_genre,
            unit="book",
            dynamic_ncols=True,
            disable=args.quiet,
        )
        try:
            for cand in primary + list(promotion_iter):  # iterate primary then pool
                if len(final_entries) >= TARGET_BOOKS_PER_GENRE:
                    break
                gid = int(cand["gutenberg_id"])
                fetch_attempts += 1
                result = download_and_hash(gid, download_sleep,
                                           fetch_fn=getattr(args, "fetch_fn", None))
                if result is None:
                    fetch_failures += 1
                    _log_event(
                        log_path,
                        f"{_ts()} FETCH_FAIL gutenberg_id={gid} "
                        f"reason=\"all URLs failed\"",
                    )
                    continue
                canonical_text, text_hash, word_count = result
                if word_count < WORD_COUNT_MIN:
                    fetch_failures += 1
                    _log_event(
                        log_path,
                        f"{_ts()} FETCH_SHORT gutenberg_id={gid} "
                        f"word_count={word_count} (<{WORD_COUNT_MIN})",
                    )
                    continue
                write_raw_file(gid, canonical_text, raw_dir=raw_dir)
                _log_event(
                    log_path,
                    f"{_ts()} FETCH_OK gutenberg_id={gid} "
                    f"word_count={word_count} text_sha256={text_hash}",
                )
                final_entries.append({
                    "gutenberg_id": gid,
                    "title": str(cand["title"]),
                    "author": str(cand["author"]),
                    "word_count": int(word_count),
                    "source": {
                        "provider": "gutenberg",
                        "fetched_at": today,
                        "text_sha256": text_hash,
                    },
                })
                bar.update(1)
        finally:
            bar.close()

        # If we ran out of pool before hitting target, log + halt this genre.
        if len(final_entries) < TARGET_BOOKS_PER_GENRE:
            log.warning(
                "genre %s: only %d entries (target %d, pool exhausted)",
                v2_genre, len(final_entries), TARGET_BOOKS_PER_GENRE,
            )

        failure_pct = fetch_failures / max(fetch_attempts, 1)
        _log_event(
            log_path,
            f"{_ts()} GENRE_DONE {v2_genre} selected={len(final_entries)} "
            f"fetch_failures={fetch_failures} ({failure_pct * 100:.1f}%)",
        )
        results[v2_genre] = final_entries
        summary["genres"][v2_genre] = {
            "selected": len(final_entries),
            "fetch_failures": fetch_failures,
            "fetch_attempts": fetch_attempts,
        }
        summary["total_selected"] += len(final_entries)
        summary["total_fetch_failures"] += fetch_failures

        # D-30 escalation: halt if fetch failures exceed threshold for THIS genre.
        if failure_pct > GENRE_FETCH_FAILURE_THRESHOLD:
            log.error(
                "genre %s fetch failures %.1f%% exceed threshold %.1f%% (D-30 halt)",
                v2_genre, failure_pct * 100,
                GENRE_FETCH_FAILURE_THRESHOLD * 100,
            )
            raise SystemExit(
                f"Halt: genre {v2_genre} fetch_failure_pct={failure_pct:.1%} "
                f"> {GENRE_FETCH_FAILURE_THRESHOLD:.0%}"
            )

    # Build merged YAML output (preserve other genres when --genre is used).
    out_data = {"genres": {}}
    if args.genre:
        for g in V2_GENRES:
            if g == args.genre and g in results:
                out_data["genres"][g] = results[g]
            elif g in existing_yaml.get("genres", {}):
                out_data["genres"][g] = existing_yaml["genres"][g]
    else:
        for g in V2_GENRES:
            if g in results:
                out_data["genres"][g] = results[g]

    if not args.dry_run:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            yaml.safe_dump(
                out_data,
                sort_keys=False,
                allow_unicode=True,
                default_flow_style=False,
            ),
            encoding="utf-8",
        )

    return summary


# ---------------------------------------------------------------------------
# CLI entry
# ---------------------------------------------------------------------------

def _build_argparser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Log selections without fetching text or writing books.yaml.",
    )
    p.add_argument(
        "--genre",
        type=str,
        choices=V2_GENRES,
        help="Rebuild a single v2 genre only (other genres preserved from current books.yaml).",
    )
    p.add_argument(
        "--download-sleep",
        type=float,
        default=None,
        help="Override config/params.yaml::corpus.download_sleep (seconds).",
    )
    p.add_argument(
        "--candidates-path",
        type=str,
        default=None,
        help=f"Override candidates YAML path (default: {CANDIDATES_PATH}).",
    )
    p.add_argument(
        "--output-path",
        type=str,
        default=None,
        help=f"Override books.yaml output path (default: {BOOKS_YAML_PATH}).",
    )
    p.add_argument(
        "--raw-dir",
        type=str,
        default=None,
        help=f"Override raw text output directory (default: {RAW_DIR}).",
    )
    p.add_argument(
        "--log-path",
        type=str,
        default=None,
        help=f"Override build log path (default: {BUILD_LOG_PATH}).",
    )
    p.add_argument(
        "--append-log",
        action="store_true",
        help="Append to build log instead of truncating (use for re-runs).",
    )
    p.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress tqdm progress bars (CI / non-interactive).",
    )
    return p


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    parser = _build_argparser()
    args = parser.parse_args(argv)
    summary = build_corpus(args)
    # Surface a brief stdout summary for human + CI consumption.
    print()
    print("=== build_corpus.py summary ===")
    print(f"dry_run:               {summary['dry_run']}")
    print(f"total selected:        {summary['total_selected']}")
    print(f"total fetch failures:  {summary['total_fetch_failures']}")
    for g, s in summary["genres"].items():
        print(f"  {g:<14} selected={s['selected']} "
              f"fetch_failures={s['fetch_failures']} "
              f"attempts={s['fetch_attempts']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
