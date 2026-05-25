#!/usr/bin/env python3
"""Strict gid integrity auditor for `corpus/books.yaml`.

Phase 08.1 Plan 08.1-01 / T-1.

For each (gid, expected_title, expected_author) in books.yaml, fetch the
canonical Gutenberg metadata from gutendex.com (https://gutendex.com/books/),
fuzz-match the title with rapidfuzz.token_set_ratio (threshold 85), and match
the author's last name. Emit a structured log so SERIOUS rows can be repaired
by `scripts/repair_corpus.py` (T-2).

Classification:
  - BENIGN            — fuzzy title match (>=85) AND author lastname match
  - SERIOUS           — either fuzzy title or author lastname mismatch
  - MISSING_GUTENDEX  — gid not in gutendex response (Gutenberg may have withdrawn)

Output format (per row, deterministic ordering by genre then gid):
  CLASSIFICATION  gid     genre           reason
                  Expected: "<title>" by <author>
                  Actual:   "<title>" by <author>  (title_score=<n>, lastname_match=<bool>)

Usage:
    python scripts/audit_corpus_gids.py [--books PATH] [--out PATH]
    python scripts/audit_corpus_gids.py --out .planning/phases/08.1-.../08.1-gid-audit-pre.log
"""
from __future__ import annotations

import argparse
import json
import logging
import re
import sys
import time
from pathlib import Path
from typing import Iterable

import requests
import yaml
from rapidfuzz import fuzz

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BOOKS = REPO_ROOT / "corpus" / "books.yaml"
GUTENDEX_BASE = "https://gutendex.com/books/"
BATCH_SIZE = 32
SLEEP_BETWEEN_CALLS = 0.5
TIMEOUT = 30
TITLE_THRESHOLD = 85

log = logging.getLogger("audit_corpus_gids")


# --- Helpers ---------------------------------------------------------------

def normalise_author_lastname(author: str) -> str:
    """Strip "by ", trailing periods, punctuation; take last whitespace-separated
    token; lowercase. Handles e.g. "Charles Brockden Brown" → "brown",
    "by Jane Austen." → "austen"."""
    a = author or ""
    # drop a leading "by " if present
    a = re.sub(r"^\s*by\s+", "", a, flags=re.IGNORECASE)
    # drop trailing punctuation
    a = a.strip().rstrip(".").strip()
    # drop comma-suffix style ("Bronte, Charlotte" → keep first half)
    if "," in a:
        a = a.split(",", 1)[0].strip()
    if not a:
        return ""
    tokens = re.split(r"\s+", a)
    last = tokens[-1].lower()
    last = re.sub(r"[^\w]", "", last)
    return last


def gutendex_authors_lastnames(authors_field: Iterable[dict]) -> list[str]:
    """Gutendex returns [{name: 'Lastname, Firstname', ...}, ...]. Return lowercase lastnames."""
    out: list[str] = []
    for a in authors_field or []:
        name = (a or {}).get("name", "")
        out.append(normalise_author_lastname(name))
    return [x for x in out if x]


def author_lastname_matches(expected_author: str, gutendex_authors: list[dict]) -> bool:
    expected_last = normalise_author_lastname(expected_author)
    if not expected_last:
        return False
    for ln in gutendex_authors_lastnames(gutendex_authors):
        if ln == expected_last:
            return True
    return False


def title_fuzz_score(expected: str, actual: str) -> int:
    if not expected or not actual:
        return 0
    return int(fuzz.token_set_ratio(expected, actual))


def fetch_gutendex_batch(gids: list[int], session: requests.Session,
                        max_retries: int = 4) -> dict[int, dict]:
    """GET gutendex.com/books/?ids=gid,gid,... Returns {gid: book_obj}.
    Empty dict on terminal failure. Retries with exponential backoff."""
    if not gids:
        return {}
    params = {"ids": ",".join(str(g) for g in gids)}
    backoff = 1.0
    for attempt in range(max_retries):
        try:
            r = session.get(GUTENDEX_BASE, params=params, timeout=TIMEOUT)
            if r.status_code == 200:
                data = r.json()
                results = {}
                for book in data.get("results", []):
                    bid = int(book.get("id", -1))
                    if bid in gids or bid > 0:
                        results[bid] = book
                return results
            if r.status_code in (429, 500, 502, 503, 504):
                log.warning("gutendex %s (attempt %d) — sleeping %.1fs",
                            r.status_code, attempt + 1, backoff)
                time.sleep(backoff)
                backoff *= 2
                continue
            log.warning("gutendex unexpected status %d for %s",
                        r.status_code, params)
            return {}
        except (requests.RequestException, ValueError) as exc:
            log.warning("gutendex error %s (attempt %d) — sleeping %.1fs",
                        exc, attempt + 1, backoff)
            time.sleep(backoff)
            backoff *= 2
    log.error("gutendex batch %s failed after %d attempts", params, max_retries)
    return {}


def fetch_all_gutendex(gids: list[int], session: requests.Session) -> dict[int, dict]:
    """Batch over BATCH_SIZE ids per call. Returns {gid: book_obj}."""
    out: dict[int, dict] = {}
    n = len(gids)
    for i in range(0, n, BATCH_SIZE):
        chunk = gids[i:i + BATCH_SIZE]
        log.info("  fetching gutendex batch %d/%d (%d ids)",
                 i // BATCH_SIZE + 1, (n + BATCH_SIZE - 1) // BATCH_SIZE, len(chunk))
        results = fetch_gutendex_batch(chunk, session)
        out.update(results)
        time.sleep(SLEEP_BETWEEN_CALLS)
    return out


# --- Classification --------------------------------------------------------

def classify_row(row: dict, gutendex: dict[int, dict]) -> dict:
    """Return {classification, gid, genre, expected_title, expected_author,
    gutendex_title, gutendex_author, title_score, lastname_match, reason}."""
    gid = int(row["gid"])
    expected_title = str(row["expected_title"] or "")
    expected_author = str(row["expected_author"] or "")
    book = gutendex.get(gid)
    if not book:
        return {
            "classification": "MISSING_GUTENDEX",
            "gid": gid,
            "genre": row["genre"],
            "expected_title": expected_title,
            "expected_author": expected_author,
            "gutendex_title": "",
            "gutendex_author": "",
            "title_score": 0,
            "lastname_match": False,
            "reason": "gid not found in gutendex",
        }
    actual_title = str(book.get("title", "") or "")
    actual_authors = book.get("authors", []) or []
    actual_author_str = "; ".join(
        str((a or {}).get("name", "")) for a in actual_authors
    )
    title_score = title_fuzz_score(expected_title, actual_title)
    lastname_match = author_lastname_matches(expected_author, actual_authors)
    title_ok = title_score >= TITLE_THRESHOLD
    if title_ok and lastname_match:
        cls = "BENIGN"
        reason = f"title_score={title_score}>={TITLE_THRESHOLD}, author lastname matches"
    else:
        cls = "SERIOUS"
        parts = []
        if not title_ok:
            parts.append(f"title_score={title_score}<{TITLE_THRESHOLD}")
        if not lastname_match:
            parts.append("author lastname mismatch")
        reason = "; ".join(parts)
    return {
        "classification": cls,
        "gid": gid,
        "genre": row["genre"],
        "expected_title": expected_title,
        "expected_author": expected_author,
        "gutendex_title": actual_title,
        "gutendex_author": actual_author_str,
        "title_score": title_score,
        "lastname_match": lastname_match,
        "reason": reason,
    }


# --- Books YAML loader -----------------------------------------------------

def load_books_yaml(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    rows: list[dict] = []
    for genre, entries in (data.get("genres") or {}).items():
        for e in entries or []:
            rows.append({
                "gid": int(e["gutenberg_id"]),
                "genre": str(genre),
                "expected_title": str(e.get("title", "") or ""),
                "expected_author": str(e.get("author", "") or ""),
            })
    return rows


# --- Output writer ---------------------------------------------------------

def write_report(path: Path, rows: list[dict], counts: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    lines: list[str] = []
    lines.append(f"=== Corpus gid Integrity Audit ===")
    lines.append(f"Total rows: {sum(counts.values())}")
    lines.append(f"  BENIGN:           {counts.get('BENIGN', 0)}")
    lines.append(f"  SERIOUS:          {counts.get('SERIOUS', 0)}")
    lines.append(f"  MISSING_GUTENDEX: {counts.get('MISSING_GUTENDEX', 0)}")
    lines.append(f"Threshold: title_score >= {TITLE_THRESHOLD} AND author_lastname matches")
    lines.append("")

    def emit_section(label: str, kept_rows: list[dict]):
        lines.append(f"--- {label} ({len(kept_rows)}) ---")
        for r in kept_rows:
            lines.append(
                f"{r['classification']:<17} gid {r['gid']:>6} ({r['genre']:<14})"
                f"  [score={r['title_score']}, lastname_match={r['lastname_match']}]"
            )
            lines.append(f"  Expected: \"{r['expected_title']}\" by {r['expected_author']}")
            lines.append(f"  Actual:   \"{r['gutendex_title']}\" by {r['gutendex_author']}")
            lines.append(f"  Reason:   {r['reason']}")
        lines.append("")

    by_cls = {"SERIOUS": [], "MISSING_GUTENDEX": [], "BENIGN": []}
    for r in rows:
        by_cls.setdefault(r["classification"], []).append(r)
    for cls in by_cls:
        # Sort each section by genre, gid
        by_cls[cls].sort(key=lambda r: (r["genre"], r["gid"]))

    emit_section("SERIOUS", by_cls["SERIOUS"])
    emit_section("MISSING_GUTENDEX", by_cls["MISSING_GUTENDEX"])
    emit_section("BENIGN", by_cls["BENIGN"])

    path.write_text("\n".join(lines), encoding="utf-8")
    log.info("report written to %s", path)


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for r in sorted(rows, key=lambda r: (r["genre"], r["gid"])):
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    log.info("jsonl rows written to %s", path)


# --- CLI ------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s %(message)s")
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--books", default=str(DEFAULT_BOOKS),
                   help=f"Path to books.yaml (default: {DEFAULT_BOOKS})")
    p.add_argument("--out", required=True,
                   help="Output text report path.")
    p.add_argument("--out-jsonl", default=None,
                   help="Also write per-row JSONL classifications (default: <out>.jsonl).")
    args = p.parse_args(argv)

    books_path = Path(args.books).resolve()
    out_path = Path(args.out).resolve()
    jsonl_path = (Path(args.out_jsonl).resolve()
                  if args.out_jsonl else out_path.with_suffix(out_path.suffix + ".jsonl"))

    rows_in = load_books_yaml(books_path)
    gids = sorted({r["gid"] for r in rows_in})
    log.info("loaded %d rows from %s (%d unique gids)",
             len(rows_in), books_path, len(gids))

    session = requests.Session()
    session.headers.update({"User-Agent": "phase-08.1-audit-corpus-gids/1.0"})
    gutendex = fetch_all_gutendex(gids, session)
    log.info("gutendex resolved %d / %d gids", len(gutendex), len(gids))

    classified = [classify_row(r, gutendex) for r in rows_in]

    counts: dict[str, int] = {}
    for r in classified:
        counts[r["classification"]] = counts.get(r["classification"], 0) + 1

    write_report(out_path, classified, counts)
    write_jsonl(jsonl_path, classified)

    print(f"\n=== Audit summary ===")
    print(f"books.yaml:        {books_path}")
    print(f"total rows:        {sum(counts.values())}")
    print(f"BENIGN:            {counts.get('BENIGN', 0)}")
    print(f"SERIOUS:           {counts.get('SERIOUS', 0)}")
    print(f"MISSING_GUTENDEX:  {counts.get('MISSING_GUTENDEX', 0)}")
    print(f"report:            {out_path}")
    print(f"jsonl:             {jsonl_path}")
    # Exit 0 even if SERIOUS > 0 — orchestrator interprets the report.
    return 0


if __name__ == "__main__":
    sys.exit(main())
