# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-11)

**Core value:** A user uploads any book and sees where it lives in semantic space — and why the algorithm predicts the genre it does.
**Current focus:** Phase 1 — Pipeline Validation Spike

## Current Position

Phase: 1 of 5 (Pipeline Validation Spike)
Plan: 1 of 3 in current phase (01-01 complete)
Status: In progress
Last activity: 2026-04-12 — Plan 01-01 complete

Progress: [██░░░░░░░░] 7% (1/15 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 15 min
- Total execution time: 0.25 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 1 | 1/3 | 15 min | 15 min |

**Recent Trend:**
- Last 5 plans: 01-01 (15 min)
- Trend: Baseline established

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Use `re.findall(r"[a-z]+")` for tokenization (single-pass: lowercase + punctuation removal + split)
- Validate Gutenberg IDs as positive integers before constructing file paths
- 10,000 unique word minimum enforced post-stopword-removal; skip rather than abort
- Download script is resumable: checks file existence and size before re-downloading

### Pending Todos

- Run `python scripts/01_download_corpus.py` to fetch corpus (~30-40s, requires network)
- Run `python scripts/02_preprocess.py` to generate processed JSON files
- Proceed to Plan 01-02: Word2Vec model training

### Blockers/Concerns

- Phase 1 is a go/no-go gate: if permutation test fails (p >= 0.05), the topological approach is invalid and the project must pivot
- Weighted Vietoris-Rips requires custom distance matrix modification (d/(w_i+w_j)), NOT a built-in library feature — must validate metric properties
- PCA reduction to 20-50D before SVM is mandatory to prevent overfitting (450D features / ~50-100 samples)

## Session Continuity

Last session: 2026-04-12
Stopped at: Completed 01-01-PLAN.md (corpus download and preprocessing pipeline)
Resume file: None
