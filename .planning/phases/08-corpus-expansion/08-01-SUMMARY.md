---
phase: 08
plan: 08-01
wave: 1
subsystem: corpus
tags: [corpus, build, gutenberg, provenance, reproducibility]
requirements_validated: [CEXP-01, CEXP-05]
dependency-graph:
  requires:
    - "scripts/phase7_v1_baseline.py"
    - "scripts/flush_v1_cache.py"
    - ".planning/research/v2/corpus_candidates.yaml"
    - ".planning/research/v2/v1_baseline_results.json"
    - ".planning/research/v2/CORPUS_SOURCING.md §5 + §8"
    - "scripts/01_download_corpus.py (URL-cascade pattern)"
  provides:
    - "scripts/build_corpus.py"
    - "corpus/books.yaml (v2 — 240 books, 8 v2 genres, source provenance)"
    - "data/raw/<gid>.txt (240 files, gitignored — sha256 anchors in books.yaml)"
    - ".planning/research/v2/corpus_build.log"
    - ".planning/research/v2/v1_to_v2_migration.md"
  affects:
    - "backend/api/routes/corpus.py::_load_corpus_books_by_genre (additive schema, still loads cleanly)"
    - "Wave 2 retrain — corpus_hash now rotates, cache_key invalidates v1 artifacts on first retrain"
tech-stack:
  added: []
  patterns:
    - "deterministic YAML emit via yaml.safe_dump(sort_keys=False, allow_unicode=True, default_flow_style=False)"
    - "URL-cascade Gutenberg fetch with strip_headers + post-strip sha256"
    - "promote-on-failure selection (D-30) — primary slots + 2x pool for safety"
    - "binary-mode raw file persistence to avoid LF↔CRLF integrity drift on Windows"
key-files:
  created:
    - "scripts/build_corpus.py (588 lines)"
    - "scripts/test_build_corpus.py (19 tests, all pass)"
    - "corpus/books.yaml (1,929 lines — replaced wholesale from v1 100-book version)"
    - ".planning/research/v2/corpus_build.log (491 lines)"
    - ".planning/research/v2/v1_to_v2_migration.md (154 lines, 100 audit rows)"
  modified:
    - ".planning/research/v2/CORPUS_SOURCING.md (+1 line — Migration audit pointer)"
    - ".planning/REQUIREMENTS.md (4 lines — CEXP-01/05 checkboxes + traceability rows)"
decisions:
  - "D-25 first half (Wave-1 BUG-05 smoke test) → cache_key invariant verified intact"
  - "WORD_COUNT_MIN lowered from 20,000 to 5,000 — Rule 1 deviation. The plan's tentative 20k threshold excludes 6/10 v1 horror entries (Lovecraft/M.R. James canon short fiction). 5k preserves canon while still filtering excerpt stubs."
  - "write_raw_file() switched to write_bytes() — Rule 1 fix. write_text on Windows applies LF→CRLF translation which corrupts the text_sha256 integrity invariant computed over canonical post-strip UTF-8 bytes."
metrics:
  duration_minutes: 45
  fetch_runtime_minutes: 12
  total_attempts: 242
  total_failures: 3
  max_per_genre_failure_pct: 3.2
  commits: 3
  tasks_completed: 6
  completed_date: "2026-05-25"
---

# Phase 8 Plan 08-01: Wave 1 — v2 Corpus Build Summary

Canonical v2 corpus generator (`scripts/build_corpus.py`) emits 240 books across 8 genres deterministically from `corpus_candidates.yaml`; v1 baseline byte-identical re-run held the Wave-1 entry gate.

## What Shipped

- **`scripts/build_corpus.py`** — 588-line deterministic v2 corpus generator. Reads `.planning/research/v2/corpus_candidates.yaml`, applies the D-29 v1→v2 genre merge (gothic/horror → `gothic_horror`, scifi/fantasy → `speculative`), runs the §5 selection rule (8-author diversity floor, then top-by-score), fetches text via the 01_download_corpus.py URL cascade, computes text_sha256 over canonical UTF-8 bytes, and emits books.yaml + corpus_build.log + data/raw/*.txt. Single P1 deliverable upgraded from P2 per D-24.
- **`scripts/test_build_corpus.py`** — 19 pytest tests covering all five plan-mandated behaviours plus three safety extensions (merge per D-29, short-body returns None, fetch_fn happy-path). All green.
- **`corpus/books.yaml`** — 240 entries across the 8 v2 genres with full D-10 source provenance (`provider`, `fetched_at`, `text_sha256`) on every row. Replaced the v1 100-book corpus wholesale via the D-26 atomic swap.
- **`.planning/research/v2/corpus_build.log`** — 491-line audit trail of every SELECT/FETCH_OK/FETCH_SHORT/GENRE_DONE event.
- **`.planning/research/v2/v1_to_v2_migration.md`** — 100-row D-27 per-entry verdict table.
- **`REQUIREMENTS.md`** — CEXP-01 + CEXP-05 flipped to Validated; CEXP-02/03/04 remain Pending (Waves 2 + 3).

## Wave-1 Gates

| Gate | Result |
|------|--------|
| v1 baseline byte-identical re-run (D-25 second half / VALIDATION_PROTOCOL §10) | **PASS** — `diff -q` silent vs `v1_baseline_results.json` (macro_f1=0.3235 anchor) |
| Pre-retrain BUG-05 cache invariant (D-25 first half) | **PASS** — `corpus_hash` + `w2v_model_sha256` both feed `cache_key()` in `backend/pipeline/precompute.py:179-196` |
| Lineage hash match (corpus/books.yaml + w2v_w15.model vs `svm_pipeline.joblib.lineage.json`) | **PASS** — `208db2bc...` + `2bf13ce0...` match the recorded sidecar values |
| 240/240 entries with full source provenance | **PASS** |
| Per-entry text_sha256 ↔ data/raw/<gid>.txt integrity | **PASS** — all 240 sha256 values verified |
| Per-genre fetch failures ≤10% (D-30) | **PASS** — max 3.2% (1/31 attempts) for gothic_horror, mystery, western |
| Backend loader still returns 240 books across 8 genres | **PASS** — `_load_corpus_books_by_genre()` works (additive schema) |
| `_GENRE_COLORS.get(genre, '#808080')` safe-fallback intact at corpus.py:89 | **PASS** — `backend/api/routes/corpus.py` not modified in Wave 1 (Wave 3 / D-35) |
| 19 build_corpus unit tests pass | **PASS** |

## Build Run Stats

- Runtime: ~12 minutes wall-clock at `--download-sleep 1.0`
- Total fetch attempts: 242 (240 successful + 3 promote-on-failure absorbed)
- Per-genre breakdown:

| genre | selected | fetch_attempts | fetch_failures | failure_pct |
|-------|---------:|---------------:|---------------:|------------:|
| adventure     | 30 | 30 | 0 | 0.0% |
| gothic_horror | 30 | 31 | 1 | 3.2% |
| historical    | 30 | 30 | 0 | 0.0% |
| literary      | 30 | 30 | 0 | 0.0% |
| mystery       | 30 | 31 | 1 | 3.2% |
| romance       | 30 | 30 | 0 | 0.0% |
| speculative   | 30 | 30 | 0 | 0.0% |
| western       | 30 | 31 | 1 | 3.2% |

- The three FETCH_SHORT promotions:
  - gid 375 — "The House of the Vampire" (3,745 words) → promoted next-by-score within gothic_horror
  - gid 3302 — "Trent's Last Case" candidate ID (3,851 words; the candidate list's gid for this title may itself be a placeholder, since the real Trent's Last Case is gid 2856) → promoted next-by-score within mystery
  - gid 19572 — "Wunpost" (615 words) → promoted next-by-score within western. Notably, gid 19572 was also the *single dropped v1 entry* in the migration audit (it was anomalous in v1 too)

## v1 → v2 Migration Audit

`.planning/research/v2/v1_to_v2_migration.md` records the per-entry verdict for all 100 v1 books:

- **Kept (same genre key):** 59 — adventure, historical, literary, mystery, romance, western survivors plus a handful of authors who appear in the score-4 v1 baseline AND are already top-of-list candidates.
- **Kept-with-relabel (D-29 merged key):** 40 — every v1 gothic + horror + scifi + fantasy entry that survived selection now lives under `gothic_horror` or `speculative`.
- **Dropped:** 1 — `gutenberg_id=19572` ("Wunpost" by Dane Coolidge), v1 word_count=408, below the new 5,000-word floor. This was already an anomaly in v1 (v1's next-shortest western was 10,877 words for "The Log of a Cowboy").

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] write_raw_file LF→CRLF translation corrupted text_sha256 integrity**
- **Found during:** Task 1.4 (first full run)
- **Issue:** `path.write_text(canonical_text, encoding="utf-8")` on Windows applies newline translation, so the file written to `data/raw/<gid>.txt` contained CRLF where the sha256 was computed over the LF-only canonical bytes. The first full build produced 240 sha256 mismatches between books.yaml and the on-disk files.
- **Fix:** Switched to `path.write_bytes(canonical_text.encode("utf-8"))`. Re-ran the entire fetch; all 240 sha256 values then verified clean.
- **Files modified:** `scripts/build_corpus.py` (write_raw_file body)
- **Commit:** `f0b42f8`

**2. [Rule 1 — Bug] WORD_COUNT_MIN excluded canonical short fiction**
- **Found during:** Task 1.4 (first full run, fetched 240 BUT halted gothic_horror at 16.7% failures)
- **Issue:** The plan's tentative 20,000-word floor caused FETCH_SHORT halts for the score-4 v1 baseline horror entries (gid 10897 "The Wendigo" 9,459 words; gid 50133 "Dunwich Horror" 9,399 words; gid 68283 "Call of Cthulhu" 6,397 words; gid 73181 "Shadow over Innsmouth" 9,127 words). Combined with score-3 entries gid 375 (3,745) + 377 (6,900), gothic_horror tripped the D-30 10% halt threshold (6/36 = 16.7%). The 20k floor was demonstrably wrong vs. v1 reality — 6 of 10 v1 horror entries are below it.
- **Fix:** Lowered `WORD_COUNT_MIN` from 20,000 to 5,000. This preserves Lovecraft/M.R. James/Blackwood canon short fiction (the actual reason the v1 horror entries exist) while still filtering excerpt-stub artifacts. Inline comment block documents the rationale.
- **Files modified:** `scripts/build_corpus.py` (WORD_COUNT_MIN constant + comment block)
- **Commit:** `f0b42f8`

**3. [Rule 1 — Doc drift] Plan referenced `data/models/w2v_w15.model`; actual filename is `word2vec_w15.model`**
- **Found during:** Task 1.2 (BUG-05 smoke test)
- **Issue:** Plan §1.2 step 3 and acceptance criteria refer to `data/models/w2v_w15.model`, but the file on disk is `data/models/word2vec_w15.model`. The recorded `svm_pipeline.joblib.lineage.json::w2v_model_sha256` matches the longer filename.
- **Fix:** Used the actual filename when computing the sha256. The plan's hash-equality check still passed (matched `2bf13ce0...`). Recommend the orchestrator update the plan text in Wave 2 / 3 / 4 references, since the file is not being renamed.
- **Files modified:** none (verification-only task)
- **Commit:** n/a

### Authentication Gates

None. Project Gutenberg is unauthenticated.

## Known Stubs

None. The corpus and tooling are fully wired; no placeholder values or empty data sources.

## Threat Flags

None. The Wave-1 changes preserve the trust-boundary surface specified in the plan's `<threat_model>`:
- T-08-01 (Tampering on Gutenberg fetch) mitigated — HTTPS URL cascade, status≠200/body<1000 rejected, sha256 over post-strip bytes.
- T-08-02 (Integrity mismatch) mitigated — Wave-1 verification re-hashed all 240 raw files; all matched. The byte-mode-write fix (Deviation #1) was an active mitigation of the integrity-drift risk this threat flagged.
- T-08-03 (Provenance forgery) mitigated — Schema enforces all three subfields; manual edits forbidden post-Wave-1 (D-26).
- T-08-04 (Cache poisoning) — D-25 smoke test verified `corpus_hash + w2v_model_sha256` are part of cache_key digest (`backend/pipeline/precompute.py:179-196`); cache will rotate on Wave 2 retrain automatically.
- T-08-05 (Code injection via text) — accept disposition unchanged. Downstream pipeline treats text as opaque bytes.
- T-08-06 (DoS via fetch rate-limit) mitigated — `--download-sleep 1.0` honored; no 429s observed in the build log.

No new threat surface beyond what the plan enumerated.

## Pointer Forward

Wave 2 (`.planning/phases/08-corpus-expansion/08-02-PLAN.md`) is the next executor. It consumes:

1. `corpus/books.yaml` — the v2 manifest committed in `f0b42f8`.
2. `data/raw/*.txt` — the 240 freshly fetched canonical texts (gitignored; reproducible from gid + sha256).
3. `scripts/build_corpus.py` — re-runnable if Wave 2 needs a partial-genre rebuild.
4. Wave 2 will perform the retrain (`02_preprocess`, `03_train_embeddings`, `04_compute_homology`, `05_build_features`, `06_validate`) which rotates `corpus_hash` and `w2v_model_sha256`; the cache will auto-invalidate on first request via the Phase 6 BUG-05 cache_key (verified intact in Task 1.2).

## Commit Hashes

| Commit | Subject |
|--------|---------|
| `1c1341f` | feat(08-01): scripts/build_corpus.py — canonical v2 generator (CEXP-05) |
| `f0b42f8` | feat(08-01): v2 corpus — 240 books, 8 genres, source provenance (CEXP-01) |
| `21ac015` | docs(08-01): v1→v2 migration audit + flip CEXP-01/05 to Validated |

## Self-Check: PASSED

All six Wave-1 deliverable files exist on disk and all three commit hashes are reachable via `git log --all`:

- FOUND: scripts/build_corpus.py
- FOUND: scripts/test_build_corpus.py
- FOUND: corpus/books.yaml
- FOUND: .planning/research/v2/corpus_build.log
- FOUND: .planning/research/v2/v1_to_v2_migration.md
- FOUND: .planning/phases/08-corpus-expansion/08-01-SUMMARY.md
- FOUND commit: 1c1341f
- FOUND commit: f0b42f8
- FOUND commit: 21ac015
