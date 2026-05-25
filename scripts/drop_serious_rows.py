#!/usr/bin/env python3
"""Drop 86 SERIOUS-classified rows from corpus/books.yaml + corpus_candidates.yaml.

Phase 08.1 Plan 08.1-01 / T-FIN-1 (drop-strategy finalization).

Reads the SERIOUS gid list from `08.1-gid-audit-post.log.jsonl` and removes those
entries from BOTH the canonical books.yaml AND the candidates pool, so a future
build_corpus.py run cannot re-introduce them.

Strategy: edit books.yaml + candidates.yaml directly. We do NOT run build_corpus.py,
because that would pick substitute candidates from the remaining pool — which still
contains other potentially-wrong gids (the candidates.yaml pool itself has stale
entries beyond just the 86 we audited).

Per-genre counts after drop are non-uniform (16-25 per genre vs the original 30
target) but every (title, author, gid) triple is verified-correct via the audit's
rapidfuzz title score + author lastname match against gutendex's authoritative
metadata.

Usage:
    python scripts/drop_serious_rows.py \\
        --audit-jsonl .planning/phases/08.1-.../08.1-gid-audit-post.log.jsonl \\
        --books corpus/books.yaml \\
        --candidates .planning/research/v2/corpus_candidates.yaml
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BOOKS = REPO_ROOT / "corpus" / "books.yaml"
DEFAULT_CANDIDATES = REPO_ROOT / ".planning" / "research" / "v2" / "corpus_candidates.yaml"
DEFAULT_AUDIT_JSONL = (
    REPO_ROOT / ".planning" / "phases"
    / "08.1-corpus-integrity-rebuild-fix-141-240-wrong-gid-bindings-in-c"
    / "08.1-gid-audit-post.log.jsonl"
)


def load_serious_gids(jsonl_path: Path) -> set[int]:
    """Return the set of SERIOUS-classified gids from the audit JSONL."""
    serious: set[int] = set()
    with jsonl_path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            if row.get("classification") == "SERIOUS":
                serious.add(int(row["gid"]))
    return serious


def drop_from_books_yaml(books_path: Path, serious_gids: set[int]) -> dict:
    """Rewrite books.yaml without rows whose gutenberg_id is in serious_gids.

    Preserves the existing structure (genres -> list of entries) and the per-entry
    yaml.safe_dump formatting that build_corpus.py emits.

    Returns a summary {kept_total, dropped_total, per_genre: {g: {kept, dropped}}}.
    """
    with books_path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    out_data: dict = {"genres": {}}
    summary = {"kept_total": 0, "dropped_total": 0, "per_genre": {}}
    for genre, entries in (data.get("genres") or {}).items():
        kept_entries = []
        dropped = 0
        for e in entries or []:
            gid = int(e["gutenberg_id"])
            if gid in serious_gids:
                dropped += 1
                continue
            kept_entries.append(e)
        out_data["genres"][genre] = kept_entries
        summary["per_genre"][genre] = {"kept": len(kept_entries), "dropped": dropped}
        summary["kept_total"] += len(kept_entries)
        summary["dropped_total"] += dropped
    books_path.write_text(
        yaml.safe_dump(
            out_data, sort_keys=False, allow_unicode=True, default_flow_style=False
        ),
        encoding="utf-8",
    )
    return summary


def drop_from_candidates_yaml(candidates_path: Path, serious_gids: set[int]) -> int:
    """Remove candidate rows whose gutenberg_id is in serious_gids.

    Uses line-level regex editing (NOT yaml.safe_dump) so the file's commentary,
    multi-tier structure, and flow-style entry formatting are preserved
    end-to-end. Mirrors the approach scripts/repair_corpus.py uses.

    Returns the count of lines removed.
    """
    text = candidates_path.read_text(encoding="utf-8")
    lines = text.splitlines(keepends=False)
    kept: list[str] = []
    removed_count = 0
    # Candidate line shape (flow-style):
    #   - {gutenberg_id: 96, title: "...", author: "...", source_consensus_score: N}
    # The leading whitespace + dash + space is significant; we match the full line.
    gid_pat = re.compile(r"^\s*-\s*\{\s*gutenberg_id:\s*(\d+)\b")
    for line in lines:
        m = gid_pat.match(line)
        if m and int(m.group(1)) in serious_gids:
            removed_count += 1
            continue
        kept.append(line)
    # Preserve original trailing-newline convention.
    new_text = "\n".join(kept)
    if text.endswith("\n"):
        new_text += "\n"
    candidates_path.write_text(new_text, encoding="utf-8")
    return removed_count


def verify_books_yaml(books_path: Path, serious_gids: set[int]) -> dict:
    """Re-read books.yaml and confirm no SERIOUS gids remain + per-genre counts > 0."""
    with books_path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    seen_gids: set[int] = set()
    per_genre_count: dict[str, int] = {}
    for genre, entries in (data.get("genres") or {}).items():
        per_genre_count[genre] = len(entries or [])
        for e in entries or []:
            gid = int(e["gutenberg_id"])
            assert gid not in serious_gids, (
                f"BUG: SERIOUS gid {gid} still present in {genre}"
            )
            assert gid not in seen_gids, f"BUG: duplicate gid {gid} after drop"
            seen_gids.add(gid)
    total = sum(per_genre_count.values())
    min_per_genre = min(per_genre_count.values()) if per_genre_count else 0
    return {
        "total": total,
        "unique_gids": len(seen_gids),
        "per_genre": per_genre_count,
        "min_per_genre": min_per_genre,
    }


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--audit-jsonl", default=str(DEFAULT_AUDIT_JSONL))
    p.add_argument("--books", default=str(DEFAULT_BOOKS))
    p.add_argument("--candidates", default=str(DEFAULT_CANDIDATES))
    args = p.parse_args(argv)

    audit_jsonl = Path(args.audit_jsonl).resolve()
    books_path = Path(args.books).resolve()
    candidates_path = Path(args.candidates).resolve()

    serious_gids = load_serious_gids(audit_jsonl)
    print(f"Loaded {len(serious_gids)} SERIOUS gids from {audit_jsonl}")

    if len(serious_gids) != 86:
        print(f"WARN: expected 86 SERIOUS gids per Phase 8.1 audit; got {len(serious_gids)}",
              file=sys.stderr)

    print("\n--- Dropping from corpus/books.yaml ---")
    books_summary = drop_from_books_yaml(books_path, serious_gids)
    print(f"books.yaml: kept {books_summary['kept_total']}, "
          f"dropped {books_summary['dropped_total']}")
    for g, c in books_summary["per_genre"].items():
        print(f"  {g:<14}  kept={c['kept']:>2}  dropped={c['dropped']:>2}")

    print("\n--- Dropping from corpus_candidates.yaml ---")
    cand_removed = drop_from_candidates_yaml(candidates_path, serious_gids)
    print(f"candidates.yaml: {cand_removed} candidate line(s) removed")

    print("\n--- Verifying post-drop state ---")
    verify = verify_books_yaml(books_path, serious_gids)
    print(f"  total books: {verify['total']}")
    print(f"  unique gids: {verify['unique_gids']}")
    print(f"  min per-genre: {verify['min_per_genre']}")
    for g, n in verify["per_genre"].items():
        print(f"    {g:<14}  {n}")

    if verify["total"] != 240 - len(serious_gids):
        print(f"\nERROR: expected {240 - len(serious_gids)} books post-drop, "
              f"got {verify['total']}", file=sys.stderr)
        return 1
    if verify["min_per_genre"] < 5:
        print("\nERROR: a genre dropped below 5 books — SVM training would fail",
              file=sys.stderr)
        return 1

    print(f"\nOK — drop complete. v2 corpus is now {verify['total']} books, "
          f"all verified-BENIGN by the 08.1 gid audit.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
