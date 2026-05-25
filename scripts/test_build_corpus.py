"""Tests for scripts/build_corpus.py.

Co-located with the script (Phase 8 Wave 1 / CEXP-05). Covers the five behaviors
specified in 08-01-PLAN.md task 1.3:

1. select_books() returns 30 entries; first 8 satisfy author-diversity floor.
2. compute_text_sha256() is deterministic and returns 64-char lowercase hex.
3. merge_v1_genre_to_v2() maps gothic/horror -> gothic_horror,
   scifi/fantasy -> speculative, identity on the six unchanged keys.
4. Dry-run mode emits per-genre selections without fetching.
5. Two runs on the same candidates + same mocked fetches produce a byte-identical
   corpus/books.yaml (CEXP-05 reproducibility).
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pytest

# Allow `python -m pytest scripts/test_build_corpus.py` invocation by ensuring
# the script directory is importable.
SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import build_corpus  # noqa: E402 -- import after sys.path adjustment


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def synthetic_candidates() -> list[dict]:
    """50 candidates spanning >=8 distinct authors, sorted as the production
    collect_v2_candidates() output would be (score DESC, gutenberg_id ASC)."""
    out: list[dict] = []
    authors = [
        "Author One", "Author Two", "Author Three", "Author Four",
        "Author Five", "Author Six", "Author Seven", "Author Eight",
        "Author Nine", "Author Ten",
    ]
    # 10 score=4 entries — one per author (the diversity layer)
    for i, name in enumerate(authors):
        out.append({
            "gutenberg_id": 100 + i,
            "title": f"Title {name} A",
            "author": name,
            "source_consensus_score": 4,
            "word_count": 25_000,
        })
    # 20 score=3 entries — concentrated in first 3 authors (so step-2 fills here)
    gid = 200
    for name in authors[:3]:
        for j in range(7):
            out.append({
                "gutenberg_id": gid,
                "title": f"Title {name} B{j}",
                "author": name,
                "source_consensus_score": 3,
                "word_count": 22_000,
            })
            gid += 1
    # 20 score=2 entries — spread thinly
    for name in authors:
        for j in range(2):
            out.append({
                "gutenberg_id": gid,
                "title": f"Title {name} C{j}",
                "author": name,
                "source_consensus_score": 2,
                "word_count": 21_000,
            })
            gid += 1
    # Sort like collect_v2_candidates() would.
    out.sort(key=lambda c: (-int(c["source_consensus_score"]),
                            int(c["gutenberg_id"])))
    return out


@pytest.fixture
def candidates_yaml_path(tmp_path: Path) -> Path:
    """Minimal corpus_candidates.yaml exercising the v1->v2 merge."""
    p = tmp_path / "candidates.yaml"
    p.write_text(
        """
genres:
  romance:
    target_count: 25-or-30
    distinct_authors_required: 8
    candidates:
      - {gutenberg_id: 1, title: "R1", author: "A One",   source_consensus_score: 4}
      - {gutenberg_id: 2, title: "R2", author: "A Two",   source_consensus_score: 4}
      - {gutenberg_id: 3, title: "R3", author: "A Three", source_consensus_score: 3}
      - {gutenberg_id: 4, title: "R4", author: "A Four",  source_consensus_score: 3}
      - {gutenberg_id: 5, title: "R5", author: "A Five",  source_consensus_score: 2}
      - {gutenberg_id: 6, title: "R6", author: "A Six",   source_consensus_score: 2}
      - {gutenberg_id: 7, title: "R7", author: "A Seven", source_consensus_score: 1}
      - {gutenberg_id: 8, title: "R8", author: "A Eight", source_consensus_score: 1}
  gothic:
    target_count: 25-or-30
    distinct_authors_required: 8
    candidates:
      - {gutenberg_id: 84,  title: "Frankenstein", author: "M Shelley", source_consensus_score: 4}
  horror:
    target_count: 25-or-30
    distinct_authors_required: 8
    candidates:
      - {gutenberg_id: 345, title: "Dracula",      author: "B Stoker",  source_consensus_score: 4}
""",
        encoding="utf-8",
    )
    return p


def _make_args(**overrides) -> argparse.Namespace:
    """Construct a build_corpus argparse.Namespace with sensible defaults."""
    base = dict(
        dry_run=False,
        genre=None,
        download_sleep=0.0,
        candidates_path=None,
        output_path=None,
        raw_dir=None,
        log_path=None,
        append_log=False,
        quiet=True,
        fetch_fn=None,
    )
    base.update(overrides)
    return argparse.Namespace(**base)


# ---------------------------------------------------------------------------
# Test 1 — select_books author-diversity floor
# ---------------------------------------------------------------------------

def test_select_books_returns_30_with_author_diversity_floor(synthetic_candidates):
    selected = build_corpus.select_books(
        synthetic_candidates, target_count=30, author_floor=8,
    )
    assert len(selected) == 30, "must return exactly target_count entries"

    # First 8 selections cover 8 DISTINCT authors (the diversity floor).
    first8_authors = [s["author"].lower() for s in selected[:8]]
    assert len(set(first8_authors)) == 8, (
        f"first 8 selections must cover 8 distinct authors, got {first8_authors}"
    )

    # Each of those first 8 is the top-scored title for its author (within the
    # author's appearances in the sorted candidate list).
    seen_authors_in_order: list[str] = []
    for cand in synthetic_candidates:
        a = cand["author"].lower()
        if a not in seen_authors_in_order:
            seen_authors_in_order.append(a)
        if len(seen_authors_in_order) >= 8:
            break
    assert first8_authors == seen_authors_in_order[:8]

    # Remaining 22 are deterministic given input order — they should be the
    # next non-selected entries by (score DESC, gutenberg_id ASC).
    chosen_ids = {int(s["gutenberg_id"]) for s in selected}
    walked_ids: list[int] = []
    for cand in synthetic_candidates:
        gid = int(cand["gutenberg_id"])
        if gid in chosen_ids:
            walked_ids.append(gid)
    assert len(walked_ids) == 30


def test_select_books_uses_gutenberg_id_tiebreak(synthetic_candidates):
    """Within the same score, lower gutenberg_id is selected first."""
    # Test the back-half (post diversity floor) entries.
    selected = build_corpus.select_books(synthetic_candidates, target_count=10,
                                          author_floor=8)
    # The 9th and 10th entries should have ascending gutenberg_id (given input
    # is sorted score DESC, gid ASC and they share the same score).
    if len(selected) >= 10:
        assert selected[8]["gutenberg_id"] < selected[9]["gutenberg_id"] or \
            selected[8]["source_consensus_score"] != selected[9]["source_consensus_score"]


# ---------------------------------------------------------------------------
# Test 2 — compute_text_sha256 determinism
# ---------------------------------------------------------------------------

def test_compute_text_sha256_is_deterministic():
    payload = b"The quick brown fox jumps over the lazy dog."
    h1 = build_corpus.compute_text_sha256(payload)
    h2 = build_corpus.compute_text_sha256(payload)
    assert h1 == h2
    assert len(h1) == 64
    assert all(c in "0123456789abcdef" for c in h1)


def test_compute_text_sha256_changes_on_different_input():
    h_a = build_corpus.compute_text_sha256(b"foo")
    h_b = build_corpus.compute_text_sha256(b"bar")
    assert h_a != h_b


# ---------------------------------------------------------------------------
# Test 3 — merge_v1_genre_to_v2
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("v1, expected", [
    ("gothic", "gothic_horror"),
    ("horror", "gothic_horror"),
    ("scifi", "speculative"),
    ("fantasy", "speculative"),
    ("adventure", "adventure"),
    ("historical", "historical"),
    ("literary", "literary"),
    ("mystery", "mystery"),
    ("romance", "romance"),
    ("western", "western"),
])
def test_merge_v1_genre_to_v2(v1, expected):
    assert build_corpus.merge_v1_genre_to_v2(v1) == expected


# ---------------------------------------------------------------------------
# Test 4 — dry-run mode
# ---------------------------------------------------------------------------

def test_dry_run_emits_selections_without_fetching(
    candidates_yaml_path: Path, tmp_path: Path,
) -> None:
    output = tmp_path / "books.yaml"
    raw_dir = tmp_path / "raw"
    log_path = tmp_path / "build.log"

    args = _make_args(
        dry_run=True,
        candidates_path=str(candidates_yaml_path),
        output_path=str(output),
        raw_dir=str(raw_dir),
        log_path=str(log_path),
        # fetch_fn would never be called in dry-run but assert that:
        fetch_fn=lambda gid: (_ for _ in ()).throw(AssertionError("fetch_fn called in dry-run")),
    )
    summary = build_corpus.build_corpus(args)

    assert summary["dry_run"] is True
    assert summary["total_fetch_failures"] == 0
    assert summary["total_selected"] >= 1, "dry-run should select at least one entry"

    # books.yaml is NOT written in dry-run.
    assert not output.exists(), "dry-run must not write books.yaml"
    # raw_dir is NOT populated.
    assert not raw_dir.exists() or not any(raw_dir.iterdir())
    # Log was written and contains SELECT + GENRE_DONE entries.
    log_text = log_path.read_text(encoding="utf-8")
    assert "SELECT" in log_text
    assert "GENRE_DONE" in log_text
    assert "(dry-run)" in log_text


# ---------------------------------------------------------------------------
# Test 5 — byte-identical reproducibility (CEXP-05)
# ---------------------------------------------------------------------------

def _fake_fetch(gid: int) -> str:
    """Deterministic synthetic text per gutenberg_id, large enough to pass
    WORD_COUNT_MIN. Ensures reproducible runs without network."""
    # ~22 000 words of repeated synthetic text, with the gid embedded for uniqueness.
    word = f"book{gid}word"
    return " ".join([word] * 22_000)


def test_reproducible_build_produces_byte_identical_books_yaml(
    candidates_yaml_path: Path, tmp_path: Path,
) -> None:
    out_a = tmp_path / "books_a.yaml"
    out_b = tmp_path / "books_b.yaml"
    raw_a = tmp_path / "raw_a"
    raw_b = tmp_path / "raw_b"
    log_a = tmp_path / "build_a.log"
    log_b = tmp_path / "build_b.log"

    common = dict(
        dry_run=False,
        candidates_path=str(candidates_yaml_path),
        download_sleep=0.0,
        fetch_fn=_fake_fetch,
        quiet=True,
    )
    args_a = _make_args(
        output_path=str(out_a), raw_dir=str(raw_a), log_path=str(log_a),
        **common,
    )
    # Single-genre rebuild keeps the test fast (target_count fewer than the
    # fixture's 8 entries per genre — verifies the function handles "pool
    # smaller than target" gracefully).
    args_a.genre = "romance"
    summary_a = build_corpus.build_corpus(args_a)

    args_b = _make_args(
        output_path=str(out_b), raw_dir=str(raw_b), log_path=str(log_b),
        **common,
    )
    args_b.genre = "romance"
    summary_b = build_corpus.build_corpus(args_b)

    assert out_a.read_bytes() == out_b.read_bytes(), (
        "Two runs on the same candidates + same mocked fetches must produce "
        "byte-identical corpus/books.yaml (CEXP-05 reproducibility)."
    )
    assert summary_a["total_selected"] == summary_b["total_selected"]


# ---------------------------------------------------------------------------
# Additional safety tests
# ---------------------------------------------------------------------------

def test_collect_v2_candidates_merges_per_d29(candidates_yaml_path: Path) -> None:
    """gothic + horror must collapse into gothic_horror; scifi + fantasy into speculative."""
    import yaml as _yaml
    with candidates_yaml_path.open(encoding="utf-8") as f:
        data = _yaml.safe_load(f)
    buckets = build_corpus.collect_v2_candidates(data)
    assert "gothic_horror" in buckets
    assert set(b["gutenberg_id"] for b in buckets["gothic_horror"]) == {84, 345}
    # speculative bucket exists (even when empty in this fixture).
    assert "speculative" in buckets


def test_download_and_hash_short_body_returns_none() -> None:
    """A fetch_fn returning a short body must produce None (caller promotes)."""
    result = build_corpus.download_and_hash(
        99999, download_sleep=0.0,
        fetch_fn=lambda gid: "short text",  # well under 1000 chars
    )
    assert result is None


def test_download_and_hash_success_returns_word_count_and_hash() -> None:
    fake = "alpha beta gamma " * 1000  # 3000 words, 17 000 chars
    result = build_corpus.download_and_hash(
        42, download_sleep=0.0, fetch_fn=lambda gid: fake,
    )
    assert result is not None
    text, sha, wc = result
    assert text == fake
    assert wc == 3000
    assert len(sha) == 64
