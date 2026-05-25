#!/usr/bin/env python3
"""Repair corpus_candidates.yaml against Gutenberg's authoritative metadata.

Phase 08.1 Plan 08.1-01 / T-2.

Strategy (author-bulk-fetch — efficient under gutendex slowness):
  1. Read SERIOUS rows from `08.1-gid-audit-pre.log.jsonl`.
  2. Group SERIOUS rows by author-lastname. For each distinct lastname, fetch
     all gutendex hits via `?search=<lastname>&languages=en` (paginated). This
     turns ~145 individual queries into ~30-40 author-level queries.
  3. For each SERIOUS row, locally match against the lastname-cache:
       - fuzzy title >= 70 + author lastname match + not audiobook-only
       - pick highest download_count → corrected gid
  4. Rewrite the matching line in corpus_candidates.yaml in place.
  5. NEEDS_SUBSTITUTION rows are escalated to the repair log (will be handled
     by build_corpus.py's automatic next-pool-candidate promotion if any
     remain after this pass — most won't because gutendex usually has the
     canonical book).

Failure modes:
  - gutendex.com 429/500/timeout: short retry then fallback to direct
    https://www.gutenberg.org/ebooks/<gid> HTML scrape (Title/Author meta tags)
    on a per-gid basis.

Usage:
    python scripts/repair_corpus.py \\
        --pre-audit-jsonl .planning/phases/08.1-.../08.1-gid-audit-pre.log.jsonl \\
        --candidates .planning/research/v2/corpus_candidates.yaml \\
        --out-log .planning/phases/08.1-.../08.1-repair-decisions.log
"""
from __future__ import annotations

import argparse
import json
import logging
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests
import yaml

# Import shared helpers from the auditor module.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from audit_corpus_gids import (  # noqa: E402
    GUTENDEX_BASE, normalise_author_lastname,
    author_lastname_matches, title_fuzz_score,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
log = logging.getLogger("repair_corpus")

SEARCH_TIMEOUT = 90  # gutendex.com is slow; 30-40s P50, 60s P95 observed
SEARCH_MAX_RETRIES = 6  # for 429 rate-limit recovery
PAGE_SLEEP = 1.0
TITLE_FUZZ_FLOOR = 70  # looser than audit's 85 (we need to catch subtitled editions)
INITIAL_BACKOFF = 4.0  # gutendex's rate-limit window appears to be ~few seconds


# ---------------------------------------------------------------------------
# Gutendex bulk-by-author fetcher
# ---------------------------------------------------------------------------

def gutendex_get(url: str, params: dict | None,
                 session: requests.Session) -> dict | None:
    """GET with retry. Returns parsed JSON or None on terminal failure."""
    backoff = INITIAL_BACKOFF
    for attempt in range(SEARCH_MAX_RETRIES):
        try:
            r = session.get(url, params=params, timeout=SEARCH_TIMEOUT)
            if r.status_code == 200:
                return r.json()
            if r.status_code in (429, 500, 502, 503, 504):
                log.warning("gutendex %s (attempt %d) — sleep %.1fs",
                            r.status_code, attempt + 1, backoff)
                time.sleep(backoff)
                backoff *= 2
                continue
            log.warning("gutendex status %d for %r", r.status_code, params)
            return None
        except (requests.RequestException, ValueError) as exc:
            log.warning("gutendex error %s (attempt %d) — sleep %.1fs",
                        exc, attempt + 1, backoff)
            time.sleep(backoff)
            backoff *= 2
    return None


def fetch_author_corpus(lastname: str,
                       session: requests.Session,
                       max_pages: int = 5) -> list[dict]:
    """Fetch up to max_pages*32 gutendex hits for ?search=<lastname>&languages=en.
    Returns flat list of book dicts (or [] on failure)."""
    if not lastname:
        return []
    books: list[dict] = []
    url: str | None = GUTENDEX_BASE
    params = {"search": lastname, "languages": "en"}
    page = 0
    while url and page < max_pages:
        page += 1
        data = gutendex_get(url, params, session)
        if data is None:
            log.warning("  author '%s' page %d failed; partial results (%d)",
                        lastname, page, len(books))
            break
        results = data.get("results", []) or []
        books.extend(results)
        next_url = data.get("next")
        if not next_url:
            break
        url = next_url
        params = None  # next URL already contains the params
        time.sleep(PAGE_SLEEP)
    log.info("  author '%s': %d hits across %d page(s)",
             lastname, len(books), page)
    return books


# --- Direct Gutenberg HTML fallback (per-gid lookup) -----------------------

GUTENBERG_EBOOK_URL = "https://www.gutenberg.org/ebooks/{gid}"
HTML_TITLE_RE = re.compile(r'<meta name="title" content="([^"]+)"', re.IGNORECASE)
HTML_AUTHOR_RE = re.compile(r'<meta name="author" content="([^"]+)"', re.IGNORECASE)


def gutenberg_html_probe_title_author(gid: int,
                                      session: requests.Session) -> tuple[str, str] | None:
    """Fetch https://www.gutenberg.org/ebooks/<gid> and extract Title/Author meta tags.
    Used only as a fallback when gutendex search fails for an author."""
    try:
        r = session.get(GUTENBERG_EBOOK_URL.format(gid=gid),
                        timeout=SEARCH_TIMEOUT)
        if r.status_code != 200:
            return None
        html = r.text
        t = HTML_TITLE_RE.search(html)
        a = HTML_AUTHOR_RE.search(html)
        if not (t and a):
            return None
        return (t.group(1).strip(), a.group(1).strip())
    except (requests.RequestException, ValueError) as exc:
        log.warning("html probe gid=%d error %s", gid, exc)
        return None


# ---------------------------------------------------------------------------
# Local matching against an author-cache
# ---------------------------------------------------------------------------

def is_audiobook_record(book: dict) -> bool:
    """Reject records that have NO downloadable text in build_corpus.py's
    URL cascade.

    Some Gutenberg records ARE audiobooks (only mp3) but gutendex returns a
    sentinel `<gid>-readme.txt` under `text/plain`. build_corpus.py's
    `_gutenberg_urls()` cascade (pg<gid>.txt, <gid>-0.txt, <gid>.txt) returns
    404 for those, tripping the D-30 fetch-failure halt.

    Heuristic: a record is treated as 'audiobook-only' (unusable) when EVERY
    `text/plain` URL ends in `-readme.txt`. If there is at least one non-readme
    text/plain URL — including `/ebooks/<gid>.txt.utf-8` or `/files/<gid>/<gid>-0.txt` —
    the record passes (the cascade will find it via `pg{gid}.txt` cache).
    """
    formats = book.get("formats", {}) or {}
    if not formats:
        return False
    text_urls = [str(v) for k, v in formats.items() if "text/plain" in k.lower()]
    if not text_urls:
        # No text/plain at all -> definitely not fetchable as text
        return True
    # If ALL text_urls are readme sentinels -> audiobook-only
    non_readme = [u for u in text_urls if not u.endswith("-readme.txt")]
    return not non_readme


def find_best_match_in_cache(title: str, author: str,
                             cache: list[dict],
                             excluded_gids: set[int] | None = None) -> dict | None:
    """Match (title, author) against an author-cache. Return the best book.

    Sort priority: title score DESC, then download_count DESC. Title score is
    primary so that an exact title match wins over a popular-but-different work
    by the same author (e.g., "Return of Tarzan" should NOT map to "Tarzan of
    the Apes" just because the latter has higher download_count).

    `excluded_gids`: optional set of gids already chosen by other repair rows in
    this batch; if a candidate gid is in this set, it's skipped. This prevents
    two SERIOUS rows for distinct titles by the same author from both landing
    on the same most-popular gid.
    """
    excluded = excluded_gids or set()
    candidates = []
    for book in cache:
        langs = [str(l).lower() for l in (book.get("languages") or [])]
        if "en" not in langs:
            continue
        if is_audiobook_record(book):
            continue
        if not author_lastname_matches(author, book.get("authors", []) or []):
            continue
        bid = int(book.get("id", -1) or -1)
        if bid in excluded:
            continue
        score = title_fuzz_score(title, str(book.get("title", "") or ""))
        if score < TITLE_FUZZ_FLOOR:
            continue
        candidates.append((score, int(book.get("download_count", 0) or 0), book))
    if not candidates:
        return None
    # Sort: title score DESC (primary — we want the right title, not the most
    # popular work by this author), then download_count DESC as tiebreaker.
    candidates.sort(key=lambda t: (-t[0], -t[1]))
    return candidates[0][2]


# ---------------------------------------------------------------------------
# Candidates YAML line editor
# ---------------------------------------------------------------------------

CAND_RE = re.compile(
    r"^(\s*-\s*\{gutenberg_id:\s*)"
    r"(?P<gid>\d+)"
    r"(\s*,\s*title:\s*\")(?P<title>[^\"]*)\""
    r"(\s*,\s*author:\s*\")(?P<author>[^\"]*)\""
    r"(.*)$"
)


def parse_candidate_line(line: str) -> dict | None:
    m = CAND_RE.match(line)
    if not m:
        return None
    return {
        "gid": int(m.group("gid")),
        "title": m.group("title"),
        "author": m.group("author"),
        "line": line,
    }


def rewrite_gid_in_line(line: str, new_gid: int) -> str:
    m = CAND_RE.match(line)
    if not m:
        return line
    old_str = m.group("gid")
    new_str = str(new_gid)
    if len(new_str) < len(old_str):
        new_str = new_str + " " * (len(old_str) - len(new_str))
    pre = m.group(1)
    post = line[m.start("gid") + len(old_str):]
    return pre + new_str + post


def edit_candidates_file(path: Path,
                         repairs: list[dict]) -> tuple[int, list[dict]]:
    """Rewrite candidate lines in place. Match by (title, author, old_gid)."""
    if not repairs:
        return 0, []
    repair_lookup: dict[tuple[str, str, int], dict] = {
        (r["title"], r["author"], int(r["old_gid"])): r for r in repairs
    }
    lines = path.read_text(encoding="utf-8").splitlines()
    new_lines = []
    applied: list[dict] = []
    for line in lines:
        cand = parse_candidate_line(line)
        if cand:
            key = (cand["title"], cand["author"], cand["gid"])
            repair = repair_lookup.get(key)
            if repair:
                new_lines.append(rewrite_gid_in_line(line, repair["new_gid"]))
                applied.append({
                    **repair,
                    "edited_line_before": line,
                    "edited_line_after": new_lines[-1],
                })
                continue
        new_lines.append(line)
    text = "\n".join(new_lines)
    if path.read_text(encoding="utf-8").endswith("\n"):
        text = text + "\n"
    path.write_text(text, encoding="utf-8")
    return len(applied), applied


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

def load_serious_rows(jsonl_path: Path) -> list[dict]:
    rows = []
    with jsonl_path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            if r.get("classification") == "SERIOUS":
                rows.append(r)
    return rows


def run_repair(args) -> dict:
    jsonl = Path(args.pre_audit_jsonl).resolve()
    candidates_path = Path(args.candidates).resolve()
    out_log = Path(args.out_log).resolve()

    serious = load_serious_rows(jsonl)
    log.info("loaded %d SERIOUS rows from %s", len(serious), jsonl)

    # Step 1 — bulk-fetch author corpora for every distinct lastname (parallel).
    lastnames: list[str] = []
    seen = set()
    for r in serious:
        ln = normalise_author_lastname(r["expected_author"])
        if ln and ln not in seen:
            seen.add(ln)
            lastnames.append(ln)
    log.info("distinct lastnames to fetch: %d", len(lastnames))

    def _fetch_one(ln: str) -> tuple[str, list[dict]]:
        # Each worker gets its own session (requests.Session is not thread-safe
        # for in-flight ops, although adapter-level pooling is — separate
        # sessions remove the contention surface entirely).
        s = requests.Session()
        s.headers.update({"User-Agent": "phase-08.1-repair-corpus/1.0"})
        try:
            books = fetch_author_corpus(ln, s)
        finally:
            s.close()
        return ln, books

    author_caches: dict[str, list[dict]] = {}
    workers = min(args.workers, len(lastnames)) if lastnames else 1
    log.info("fetching authors with %d parallel workers", workers)
    completed = 0
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(_fetch_one, ln): ln for ln in lastnames}
        for fut in as_completed(futures):
            ln_done, books = fut.result()
            author_caches[ln_done] = books
            completed += 1
            log.info("  [%d/%d] author '%s' -> %d hits",
                     completed, len(lastnames), ln_done, len(books))

    # Shared session for any per-gid fallback HTML probes (sequential, low-volume).
    session = requests.Session()
    session.headers.update({"User-Agent": "phase-08.1-repair-corpus/1.0"})

    # Step 2 — match each SERIOUS row against its author-cache.
    # Track gids already taken to prevent two distinct titles from collapsing
    # onto the same new_gid (e.g., Return-of-Tarzan + Beasts-of-Tarzan both
    # picking the top-download Tarzan-of-the-Apes gid).
    # Seed with the BENIGN gids from the audit + every other SERIOUS row's
    # current gid (so we don't pick a gid that's already in use by some other
    # row in books.yaml).
    # `serious` above was only the SERIOUS rows; re-scan the full audit jsonl
    # for the full 240-row gid set (incl. BENIGN whose gids must not be reused).
    all_in_use: set[int] = set()
    with jsonl.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            all_in_use.add(int(r["gid"]))
    log.info("seeded exclusion set with %d gids currently in books.yaml", len(all_in_use))

    repairs: list[dict] = []
    needs_substitution: list[dict] = []
    chosen_gids: set[int] = set()  # accumulates per-repair new_gids

    for i, row in enumerate(serious, 1):
        title = row["expected_title"]
        author = row["expected_author"]
        lastname = normalise_author_lastname(author)
        cache = author_caches.get(lastname, [])
        # Exclude: gids already chosen this run + all gids currently in
        # books.yaml MINUS this row's own current gid (we may rediscover ours
        # is correct via BENIGN_CONFIRMED).
        excluded = (chosen_gids | all_in_use) - {int(row["gid"])}
        chosen = find_best_match_in_cache(title, author, cache,
                                          excluded_gids=excluded)
        if chosen is None:
            # Fall back: HTML probe the EXPECTED gid; if its meta tags match
            # the expected (title, author), the audit was over-strict and we
            # confirm the gid as benign.
            html = gutenberg_html_probe_title_author(row["gid"], session)
            if html:
                actual_title, actual_author = html
                t_score = title_fuzz_score(title, actual_title)
                last_ok = (lastname in actual_author.lower()) if lastname else False
                if t_score >= 80 and last_ok:
                    repairs.append({
                        "old_gid": row["gid"],
                        "new_gid": row["gid"],
                        "title": title,
                        "author": author,
                        "genre": row["genre"],
                        "action": "BENIGN_CONFIRMED",
                        "rationale": (f"html-probe agrees: title='{actual_title}' "
                                      f"author='{actual_author}' score={t_score}"),
                        "gutendex_title": actual_title,
                    })
                    log.info("  [%d/%d] BENIGN_CONFIRMED via HTML probe gid=%d",
                             i, len(serious), row["gid"])
                    time.sleep(PAGE_SLEEP)
                    continue
            needs_substitution.append({
                **row,
                "action": "NEEDS_SUBSTITUTION",
                "rationale": "no author-cache match + html-probe disagrees",
            })
            log.warning("  [%d/%d] NEEDS_SUBSTITUTION gid=%d title=%r",
                        i, len(serious), row["gid"], title)
            continue

        new_gid = int(chosen.get("id", -1))
        if new_gid <= 0:
            needs_substitution.append({
                **row, "action": "NEEDS_SUBSTITUTION",
                "rationale": "match had no valid id",
            })
            continue

        if new_gid == row["gid"]:
            repairs.append({
                "old_gid": row["gid"],
                "new_gid": row["gid"],
                "title": title,
                "author": author,
                "genre": row["genre"],
                "action": "BENIGN_CONFIRMED",
                "rationale": f"audit-strict, gutendex agrees (download_count={chosen.get('download_count', 0)})",
                "gutendex_title": str(chosen.get("title", "")),
            })
            chosen_gids.add(new_gid)
            log.info("  [%d/%d] BENIGN_CONFIRMED gid=%d (audit-strict)",
                     i, len(serious), row["gid"])
            continue

        repairs.append({
            "old_gid": row["gid"],
            "new_gid": new_gid,
            "title": title,
            "author": author,
            "genre": row["genre"],
            "action": "GUTENDEX_LOOKUP",
            "rationale": (f"author-cache match: title='{chosen.get('title', '')}' "
                          f"download_count={chosen.get('download_count', 0)}"),
            "gutendex_title": str(chosen.get("title", "")),
        })
        chosen_gids.add(new_gid)
        log.info("  [%d/%d] REPAIR %d -> %d  ('%s')",
                 i, len(serious), row["gid"], new_gid, chosen.get("title", ""))

    # Step 3 — apply repairs to candidates.yaml.
    edits = [r for r in repairs
             if r["action"] == "GUTENDEX_LOOKUP"
             and r["new_gid"] != r["old_gid"]]
    n_changed, applied = edit_candidates_file(candidates_path, edits)
    log.info("applied %d line edits to %s", n_changed, candidates_path)

    # Step 4 — write repair decisions log.
    out_log.parent.mkdir(parents=True, exist_ok=True)
    lines: list[str] = []
    lines.append("=== Corpus Repair Decisions ===")
    lines.append(f"SERIOUS rows processed:        {len(serious)}")
    lines.append(f"GUTENDEX_LOOKUP gid-changed:   {len(edits)}")
    n_benign = sum(1 for r in repairs if r["action"] == "BENIGN_CONFIRMED")
    lines.append(f"BENIGN_CONFIRMED (audit-strict): {n_benign}")
    lines.append(f"NEEDS_SUBSTITUTION:            {len(needs_substitution)}")
    lines.append(f"candidates.yaml lines edited:  {n_changed}")
    lines.append("")
    lines.append("--- Repairs (sorted by genre, old_gid) ---")
    for r in sorted(repairs, key=lambda r: (r["genre"], r["old_gid"])):
        lines.append(
            f"{r['action']:<18} old_gid={r['old_gid']:>6} -> new_gid={r['new_gid']:>6} "
            f"({r['genre']})"
        )
        lines.append(f"  title:     \"{r['title']}\" by {r['author']}")
        if r.get("gutendex_title"):
            lines.append(f"  gutendex:  \"{r['gutendex_title']}\"")
        lines.append(f"  rationale: {r['rationale']}")
    if needs_substitution:
        lines.append("")
        lines.append("--- NEEDS_SUBSTITUTION (build_corpus.py pool will promote next candidate) ---")
        for r in needs_substitution:
            lines.append(
                f"NEEDS_SUBSTITUTION  gid={r['gid']:>6}  ({r['genre']})"
            )
            lines.append(f"  title:  \"{r['expected_title']}\" by {r['expected_author']}")
            lines.append(f"  reason: {r['rationale']}")
    lines.append("")
    lines.append("--- Applied line edits (line-level diff) ---")
    for r in applied:
        lines.append(f"  - genre={r['genre']} title={r['title']!r}")
        lines.append(f"    before: {r['edited_line_before'].rstrip()}")
        lines.append(f"    after:  {r['edited_line_after'].rstrip()}")
    out_log.write_text("\n".join(lines), encoding="utf-8")
    log.info("repair decisions written to %s", out_log)

    return {
        "serious_input": len(serious),
        "repairs_total": len(repairs),
        "gid_changes": len(edits),
        "benign_confirmed": n_benign,
        "needs_substitution": len(needs_substitution),
        "lines_edited": n_changed,
    }


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s %(message)s")
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--pre-audit-jsonl", required=True,
                   help="Path to 08.1-gid-audit-pre.log.jsonl")
    p.add_argument("--candidates", required=True,
                   help="Path to corpus_candidates.yaml (edited in place).")
    p.add_argument("--out-log", required=True,
                   help="Path to 08.1-repair-decisions.log")
    p.add_argument("--workers", type=int, default=8,
                   help="Parallel author-fetch workers (default: 8).")
    args = p.parse_args(argv)
    summary = run_repair(args)
    print()
    print("=== repair_corpus.py summary ===")
    for k, v in summary.items():
        print(f"  {k}: {v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
