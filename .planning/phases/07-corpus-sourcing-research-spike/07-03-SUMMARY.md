---
phase: 07-corpus-sourcing-research-spike
plan: 03
subsystem: research
tags: [research, corpus, gutenberg, author-distribution, schema]

# Dependency graph
requires:
  - phase: 07-corpus-sourcing-research-spike
    provides: "Phase 7 context (07-CONTEXT.md) — D-06, D-07, D-08, D-10, D-19 commitments"
provides:
  - "Per-genre candidate-title shortlist YAML (`.planning/research/v2/corpus_candidates.yaml`) — 10 v1 genres, 50+ Gutenberg candidate IDs each, sorted by source_consensus_score"
  - "Author distribution audit fragment (`.planning/research/v2/_drafts/05_author_distribution_audit.md`) — v1 vs v2 author-diversity numbers, D-06/07/08 commitments, D-10 schema spec, Phase 8 selection rule"
affects: [Plan 04 VALIDATION_PROTOCOL.md (D-17 smoke-test author list), Plan 05 CORPUS_SOURCING.md assembly (audit + YAML are inputs), Phase 8 CEXP-01 (books.yaml schema additions) and CEXP-05 (build_corpus.py reads candidate YAML)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sibling YAML data file referenced from markdown research doc (D-19 candidate shortlist pattern)"
    - "Phase 8 selection rule expressed as deterministic algorithm so build_corpus.py is reproducible from candidate YAML alone"

key-files:
  created:
    - ".planning/research/v2/corpus_candidates.yaml"
    - ".planning/research/v2/_drafts/05_author_distribution_audit.md"
  modified: []

key-decisions:
  - "D-06: commit to 25 books/genre (single number); candidate YAML's >=50 entries per genre supports 30/genre too if Plan 02 picks Proposal A/B"
  - "D-07 (no per-author cap) honored in YAML — Zane Grey 17 candidates, Verne 14, Dunsany 11, Lovecraft 8 retained explicitly"
  - "D-08 (>=8 distinct authors per genre) — every genre clears this; min 11 (fantasy), max 28 (gothic)"
  - "Plan 02 not yet executed (Wave 1 sibling) — candidate YAML covers all 10 v1 genres so any genre-set outcome (merge/drop/keep) is consumable downstream"

patterns-established:
  - "Candidate ordering: source_consensus_score desc, gutenberg_id asc (deterministic, reproducible)"
  - "Author-floor-first selection rule (1 title per distinct author, then fill by consensus score) — guarantees D-08 floor without artificially capping prolific authors per D-07"
  - "books.yaml `source` field is additive — backward compatible with existing _load_books_metadata() consumers"

requirements-completed: [RES-01]

# Metrics
duration: ~25min
completed: 2026-05-25
---

# Phase 07 Plan 03: Per-Genre Candidate Shortlist + Author Distribution Audit Summary

**Per-genre Gutenberg candidate shortlist (50+/genre, >=8 authors/genre) and author-distribution audit committing D-06=25, D-07=no-cap, D-08>=8, D-10 schema — Phase 8 has a vetted pool to draw from.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-24T15:15:00Z
- **Completed:** 2026-05-24T15:41:00Z
- **Tasks:** 2/2 completed
- **Files modified:** 0 (only created)
- **Files created:** 2

## Accomplishments

- **Candidate-title shortlist YAML** (`.planning/research/v2/corpus_candidates.yaml`, 677 lines) with **per-genre author headcount: romance 20, mystery 22, western 12, fantasy 11, scifi 14, horror 14, historical 21, literary 15, adventure 14, gothic 28** — every genre clears D-08's >=8 floor with significant headroom (D-08 hard constraint satisfied).
- **Candidate counts per genre: romance 54, mystery 51, western 52, fantasy 50, scifi 50, horror 50, historical 52, literary 50, adventure 50, gothic 51** — every genre clears D-19's >=50 floor; Phase 8 can pick either 25 or 30 final books.
- **No per-author cap (D-07) preserved** — prolific PD authors who define their genre retained: Zane Grey 17 (western), Jules Verne 14 (scifi), Lord Dunsany 11 (fantasy), Arthur Conan Doyle 8 (mystery), H. P. Lovecraft 8 (horror), Jane Austen 7 (romance), Walter Scott 7 (historical), Mark Twain 7 (adventure), Henry James 6 (literary), Charles Brockden Brown 4 (gothic).
- **Author-distribution audit** (`.planning/research/v2/_drafts/05_author_distribution_audit.md`, 138 lines) with the v1 baseline computed exactly (8/10 genres violated D-08; only adventure 8 and gothic 10 cleared), the v2 candidate-list numbers verified, the D-17 per-author smoke test priority list extracted from the most-prolific authors, and a deterministic Phase 8 selection rule.
- **books.yaml schema additions (D-10) committed** — `source: {provider, fetched_at, text_sha256}` field with full semantics (enum, ISO-8601, 64-char hex sha256 of canonical bytes) ready for Phase 8 CEXP-01 to apply.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build per-genre candidate shortlists (corpus_candidates.yaml)** — `d075090` (feat)
2. **Task 2: Draft author distribution audit + books.yaml schema fragment** — `c705cb3` (feat)

## Files Created/Modified

- `.planning/research/v2/corpus_candidates.yaml` (created, 677 lines) — Per-genre candidate-title shortlist. 10 v1 genres, 50+ Gutenberg candidates per genre, each entry has `gutenberg_id` (int), `title` (str), `author` (str), `source_consensus_score` (int 1-4). Sorted score-desc, id-asc. Includes `curation_sources_used` header block (Goodreads-UCSD, LoC, scholarly canon, comparable-project corpora) and per-genre `notes:` documenting author concentration where present.
- `.planning/research/v2/_drafts/05_author_distribution_audit.md` (created, 138 lines) — v1 baseline table (8/10 genres violate D-08), v2 candidate-list table (all 10 clear), per-author held-out smoke test (D-17) priority list, corpus shape decisions (D-06=25, D-07=NONE, D-08>=8), Phase 8 deterministic selection rule (5 steps), books.yaml schema additions (D-10), Phase 7 self-check tickboxes.

## Decisions Made

- **D-06 committed to 25 books/genre** (not 30). The candidate YAML's >=50 entries per genre lets Phase 8 select 30 instead if Plan 02 recommends Proposal A (merge to 8 genres) or B (drop horror+historical) — but the audit fragment commits to a single number per D-06's wording. 25 was chosen because it is the lower bound that works under Proposal C (10 genres × 25 = 250 books → 50 hold-out at 20%); larger numbers can still be selected from the same candidate pool downstream.
- **All 10 v1 genres in candidate YAML regardless of Plan 02 outcome.** Plan 02 is a Wave 1 sibling (no dependency arrow), so its proposal outcome is unknowable here. The audit + YAML cover all 10 genres so Phase 8 can consume the user-approved Plan 02 recommendation (merge / drop / keep) without re-running Plan 03.
- **Most-prolific-author concentration documented honestly per PITFALLS §5.** The audit lists Zane Grey 17 (33% of western candidates), Verne 14 (28% of scifi), Dunsany 11 (22% of fantasy), Lovecraft 8 (16% of horror) as the highest-risk authors and flags them as D-17 priority targets.
- **Phase 8 selection rule expressed deterministically** (author-floor → consensus-score-desc → word-count gate → fetch gate → drop/replace log) so `scripts/build_corpus.py` (CEXP-05) is reproducible from the candidate YAML + thresholds alone, consistent with the Phase 6 BUG-05 cache-key invariant.

## Deviations from Plan

None — plan executed exactly as written. All 2 tasks completed without auto-fixes, blockers, architectural changes, or authentication gates.

The only minor judgement call (within the plan's explicit "Claude's Discretion" allowance per 07-CONTEXT.md): D-06 single-number choice of 25 vs 30. Plan 02 hasn't run yet so we don't know its proposal recommendation; 25 is the safer commit (works under all three Plan 02 proposals; the candidate YAML accommodates 30 too if needed).

## Verification

**Task 1 acceptance criteria** (verified via Python):
- ☑ File `.planning/research/v2/corpus_candidates.yaml` exists
- ☑ Valid YAML (parses with `yaml.safe_load`)
- ☑ All 10 v1 genres present: romance, mystery, western, fantasy, scifi, horror, historical, literary, adventure, gothic
- ☑ Every genre's `candidates:` list has >=50 entries (50-54)
- ☑ Every genre's candidates contain >=8 distinct authors (11-28)
- ☑ Every candidate has required keys: gutenberg_id (int), title (str), author (str), source_consensus_score (int 1-4)
- ☑ File line count 677 (>=550)
- ☑ gutenberg_id values are positive integers

**Task 2 acceptance criteria** (verified via PowerShell `Select-String`):
- ☑ All required headings present (Author distribution audit, v1 baseline, v2 candidate-list audit, Per-author held-out smoke test prerequisite, Corpus shape decisions, books.yaml schema additions)
- ☑ D-06 line contains 25
- ☑ D-07 line contains NONE
- ☑ D-08 literal `≥8 distinct authors` present
- ☑ D-10 schema fields `source.provider`, `source.fetched_at`, `source.text_sha256` all present
- ☑ Line count 138 (>=80)
- ☑ No remaining `<N>` placeholders

## Self-Check: PASSED

- ☑ FOUND: `.planning/research/v2/corpus_candidates.yaml`
- ☑ FOUND: `.planning/research/v2/_drafts/05_author_distribution_audit.md`
- ☑ FOUND commit: `d075090` (Task 1)
- ☑ FOUND commit: `c705cb3` (Task 2)

## Threat Flags

None. No new attack surface introduced. STRIDE register in the plan's `<threat_model>` identifies:
- T-07-06 (info disclosure on web reads of public Gutenberg/canon pages) — accepted, all public.
- T-07-07 (tampering with candidate YAML schema) — mitigated by documented schema + Plan 05 / Phase 8 validators.
- T-07-08 (info disclosure on author lists) — accepted, all public-domain authors.

No additional threat surface emerged during execution.
