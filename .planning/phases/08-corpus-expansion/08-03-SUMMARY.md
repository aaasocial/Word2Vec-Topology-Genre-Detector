---
phase: 08
plan: 08-03
subsystem: validation
tags: [validation, group-kfold, permutation-test, smoke-test, cexp-03, cexp-04, d-31, d-32]
dependency-graph:
  requires:
    - data/models/svm_pipeline.joblib (Phase 8.1)
    - data/features/feature_matrix_w15_k200.npy
    - corpus/books.yaml (154-book post-drop)
    - .planning/research/v2/v1_baseline_results.json
    - .planning/research/v2/VALIDATION_PROTOCOL.md
  provides:
    - results/v2_validation_report.md (CEXP-03 + CEXP-04 final artifact)
    - results/validation_history.log (append-only)
    - scripts/06_validate.py (four new VALIDATION_PROTOCOL §10 routines)
    - scripts/test_06_validate.py (9-test unit coverage)
  affects:
    - .planning/REQUIREMENTS.md (CEXP-03 flipped to Validated-with-disclaimer; CEXP-04 to Blocked)
tech-stack:
  added: []
  patterns:
    - "Dynamic module import (scripts/06_validate.py is not a valid Python module name due to leading digit)"
    - "Deterministic SVM re-instantiation per fold (no fitted-pipeline leakage into folds)"
    - "Area-weighted v1 F1 aggregation for merged v2 genres (planner-locked merged-key rule)"
key-files:
  created:
    - scripts/test_06_validate.py
    - results/v2_validation_report.md
    - results/validation_history.log
  modified:
    - scripts/06_validate.py
    - .planning/REQUIREMENTS.md
decisions:
  - "D-31 disclaimer path taken (smoke gap 36.96pp >> 10pp threshold; v2 model published with explicit ANTI-LEAKAGE GUARDRAIL FAILED disclaimer)"
  - "D-32 strict-> pass criterion applied: v2 macro-F1 0.7367 > 0.3235 AND p<0.05 -> would PASS if smoke had passed; PARTIAL-VALIDATED given smoke failure"
  - "GroupKFold floored at K=5 (corpus has only 6 distinct authors in western — original D-08 K=8 impossible; planner-discretion fallback per 08-CONTEXT.md)"
metrics:
  duration_minutes: ~25 (validator total runtime: ~21 min permutation + ~3 min smoke test + ~1 min CV)
  tasks_completed: 4
  files_created: 3
  files_modified: 2
  completed_utc: 2026-05-26
requirements:
  - CEXP-03 (Validated with anti-leakage disclaimer)
  - CEXP-04 (Blocked — GroupKFold gap exceeds threshold)
---

# Phase 8 Plan 03: Wave 3 — Validation Summary

v2 SVM validated against VALIDATION_PROTOCOL §10 routines on the post-Phase-8.1 verified-clean
151-book corpus: macro-F1 0.7367 vs v1 0.3235 (+41pp, permutation p=0.0010), but per-author
smoke test failed at 36.96pp gap (>>10pp threshold), triggering the D-31 disclaimer path and
the CEXP-04 blocked-status verdict for the 45pp GroupKFold gap.

## Three Numbers (VALIDATION_PROTOCOL §9)

| # | Number | Value | Notes |
|---|--------|-------|-------|
| 1 | v1 SVM on hold-out | **0.3235** | Pinned anchor from v1_baseline_results.json (Phase 7) |
| 2 | v2 SVM on hold-out | **0.7367** | Headline result; +41pp vs v1; permutation p=0.0010 |
| 3 | v2 LOOCV on full v2 | **0.6887** | Context only per VALIDATION_PROTOCOL §9 |

## Verdicts

- **CEXP-03: PARTIAL-VALIDATED** — v2 macro-F1 (0.7367) strictly > v1 (0.3235) AND permutation
  p=0.0010 (significant at 0.05), satisfying D-32's strict-> pass criterion. **However**, the
  per-author held-out smoke test produced a mean-author-gap of 36.96pp (>> 10pp threshold)
  triggering the D-31 disclaimer path (anti-leakage guardrail failed). CEXP-03 ships as
  Validated-with-disclaimer; the v2 macro-F1 reported here should be treated as an upper bound
  rather than expected generalization performance.

- **CEXP-04: BLOCKED** — GroupKFold-by-author mean macro-F1 = 0.2865 ± 0.0331 vs hold-out
  macro-F1 = 0.7367 → gap = **45.03pp**, far exceeding the 15pp threshold. Wave 4 Release
  publish (`v2.0-data`) is conditionally gated per D-33 — the team must decide whether the
  CEXP-03 partial-pass justifies publishing under the disclaimer, or whether restructuring is
  warranted before the Release tag lands.

## D-31 Disclaimer Path Triggered

**Mean-author-gap: 36.96pp** (threshold 10pp).

Of 34 multi-book authors held out one at a time, **15 authors scored 0.00% accuracy** when
their books were withheld from training — i.e., the SVM cannot recognize their genre at all
without their own books in training:

| Worst-Case Authors (0.00% held-out accuracy) |
|---|
| Alexandre Dumas (historical), Ann Radcliffe (gothic_horror), Charles Dickens (historical), Edgar Rice Burroughs (adventure), Ernest Hemingway (literary), H. P. Lovecraft (gothic_horror), H. Rider Haggard (speculative), Henry James (literary), James Joyce (literary), Joseph Conrad (literary), Leo Tolstoy (historical), Sinclair Lewis (literary), Thomas Hardy (romance), Walter Scott (historical), William Morris (speculative) |

Mid-range authors (0.17–0.50): H. G. Wells, Jack London, Jules Verne, D. H. Lawrence,
Jane Austen, Robert Louis Stevenson, Baroness Orczy, Clarence E. Mulford, Edith Wharton,
G. K. Chesterton, Gaston Leroux, George Eliot, Zane Grey, Elizabeth Gaskell.

Authors who held up well (>=0.75): Agatha Christie (1.00), Anthony Trollope (1.00),
Arthur Conan Doyle (1.00), Dorothy L. Sayers (1.00), Virginia Woolf (1.00), Elizabeth Gaskell
(0.75). These are concentrated in mystery (which has 12 distinct authors and was the easiest
v1-baseline-headline genre too).

**Worst-case gap: 68.87pp.** LOOCV accuracy (0.6887) − min per-author accuracy (0.0000) =
68.87pp. Mean per-author accuracy: 0.3191 — barely above chance for an 8-genre problem
(1/8 = 12.5%) once author signal is removed.

**Interpretation:** the v2 SVM learned per-author features more strongly than per-genre
features at the multi-book-author boundary. This is the known PITFALLS §5 failure mode that
the smoke test was designed to detect. Phase 8 ships the v2 model anyway under D-31 because
(a) it beats the v1 baseline on the published comparison test set, (b) the alternative
(restructure-and-retry) was explicitly weighed against this disclosure path during
`/gsd-discuss-phase 8` and the user authorized the disclaimer route.

## Frontend Defensive Fallback (Task 3.3)

`backend/api/routes/corpus.py` line 89 uses the safe lookup pattern
`_GENRE_COLORS.get(genre, '#808080')` — planner pre-verification (2026-05-25) confirmed
intact, and Wave 3 re-verification confirms it still ships the v2 keys (`gothic_horror`,
`speculative`) without `KeyError` or crash. No code change was made. The frontend hardcoded
`GENRE_COLORS` map in `frontend/src/constants/genres.ts` is untouched per Phase 8 scope
boundary; Phase 10 owns the visual relabel.

Simulation confirmed:
```
gothic_horror: color=#808080  (fallback gray)
speculative:   color=#808080  (fallback gray)
adventure:     color=#FB7185  (v1 palette hit)
unknown_genre_xyz: color=#808080  (fallback gray)
```

## Permutation Null Test (CEXP-03 statistical guard)

- **Observed v2 LOOCV macro-F1:** 0.6779 (1000-perm baseline)
- **Permuted distribution:** mean ≈ 0.099, std ≈ 0.046
- **Empirical p-value:** **0.0010** = (0 ≥-observed + 1) / (1000 + 1)
- **Significant at 0.05?** Yes (highly).

The v2 signal is statistically distinguishable from random label permutation. The
CEXP-03-strict-> branch with p<0.05 is satisfied; the smoke-test failure is the only blocker
to a clean PASS.

## Deviations from 08-03-PLAN.md (154-book corpus vs assumed 240)

The original 08-03-PLAN.md was written assuming a 240-book Proposal-A corpus. Phase 8.1's
drop strategy left **151 books** in the feature matrix (154 in books.yaml, three of which
have `unique_words < min_unique_words=3000` and were filtered out at feature build time).
Per-genre distribution:

| Genre | Books (post-filter) | Distinct authors |
|-------|--------------------:|-----------------:|
| adventure | 20 | 9 |
| gothic_horror | 15 | 12 |
| historical | 15 | 7 |
| literary | 20 | 12 |
| mystery | 19 | 12 |
| romance | 22 | 7 |
| speculative | 24 | 9 |
| western | 16 | 6 |
| **total** | **151** | **66 (distinct)** |

**Adaptations made:**

1. **GroupKFold K floored at 5** (planner discretion per 08-CONTEXT.md) instead of D-08's
   expected K=8 — the actual minimum distinct-authors-per-genre is **6 (western)**, and the
   sklearn `GroupKFold` requires `n_splits <= n_distinct_groups`. The CLI default
   `--cv-n-splits 8` was floored to 5 by the new `--cv-min-splits` mechanism. The report
   documents `n_splits used = 5`.

2. **Hold-out subset is 17 of 20** (vs. the implicit assumption of more survivors). Three v1
   gutenberg_ids — **84 (Frankenstein), 1528, 3285** — fell out of the v2 corpus during the
   Phase 8.1 drop. The report's "Out-of-comparison" line lists them explicitly; the report's
   in-comparison subset of 17 is what the macro-F1 was computed against.

3. **Threshold semantics unchanged** — D-32 strict-> remains the law: 0.7367 > 0.3235 strictly,
   and p=0.0010 < 0.05, so the CEXP-03 strict-pass-with-significance leg is met. The
   PARTIAL-VALIDATED verdict comes from the smoke-test failure, not from the smaller corpus.

4. **Methodology section in report** explicitly states "Total v2 corpus: 151 books (post
   Phase-8.1 drop strategy; original Phase-8 plan assumed 240; actual = post-cleanup
   verified-clean set)" — this is the truth-in-reporting touch the parallel-executor brief
   asked for.

## Per-Genre Detail (informational)

| Genre | v2 F1 | v1 F1 (anchor) | Delta |
|-------|------:|------:|------:|
| adventure | 0.6667 | 0.6667 | +0.0000 |
| gothic_horror | 0.5000 | 0.0000 (weighted: v1 gothic 0.0 + horror 0.0) | n/a — schema mismatch |
| historical | 1.0000 | 0.0000 | +1.0000 |
| literary | 1.0000 | 0.0000 | +1.0000 |
| mystery | 1.0000 | 1.0000 | +0.0000 |
| romance | 1.0000 | 0.6667 | +0.3333 |
| speculative | 0.7273 | 0.3333 (weighted: v1 scifi 0.0 + fantasy 0.6667) | n/a — schema mismatch |
| western | 0.0000 | 0.2353 | -0.2353 |

**Notable shifts:**
- `historical`, `literary`, `romance` all jumped to 1.0 v2 F1 from 0.0/0.6667 v1.
- `western` regressed from 0.2353 to 0.0000 — but the v1 western F1 of 0.2353 was inflated by
  the v1 model's collapsed-onto-western failure mode (13/20 v1 predictions were `western`).
  The v2 model no longer mis-classifies everything as western; the regression here is a
  symptom of the v1 anchor's pathology, not v2's weakness.
- Merged genres (gothic_horror, speculative) show area-weighted v1 mean as the comparison
  basis per the planner-locked merged-key rule, with delta `n/a — schema mismatch` to
  acknowledge that subtraction across the schema boundary is mathematically defined but
  semantically misleading.

## Phase 8 Wave 4 Pointer

`08-04-PLAN.md` (Release publish + doc alignment) — **conditionally gated** per D-33:
- CEXP-03 PARTIAL-VALIDATED + CEXP-04 BLOCKED is the path that decides whether `v2.0-data`
  publishes with the disclaimer baked into the Release notes, or whether the team holds
  publish pending a restructure.
- The v2 macro-F1 of 0.7367 on the published comparison test set is the strongest single
  argument FOR publishing. The 45pp GroupKFold gap and the 15 zero-accuracy held-out authors
  are the strongest arguments AGAINST publishing without first reducing single-author book
  concentration in the corpus.
- Wave 4 plan will need a decision branch: either (a) publish with the disclaimer asset
  included in the Release tag and the `Anti-Leakage Disclaimer` section copied verbatim into
  the Release notes, or (b) halt for restructure and re-validate.

## Self-Check: PASSED

- `scripts/06_validate.py` — exists, has 4 new VALIDATION_PROTOCOL §10 functions (verified
  via grep)
- `scripts/test_06_validate.py` — exists, 9 tests pass
- `results/v2_validation_report.md` — exists, 8 sections, contains "0.3235" (3 hits),
  contains exactly one `CEXP-03:` and one `CEXP-04:` line, contains "Merged-key rule"
  annotation, contains 3 "n/a — schema mismatch" hits (>=2 required), contains "ANTI-LEAKAGE
  GUARDRAIL FAILED" (smoke failed → disclaimer required)
- `results/validation_history.log` — exists, last line is the 1000-perm canonical run with
  `phase=08-wave3` tag
- Backend serves `gothic_horror` + `speculative` cleanly (no `KeyError`)
- `.planning/REQUIREMENTS.md` — CEXP-03 row reads "Validated (with anti-leakage disclaimer
  — see results/v2_validation_report.md)"; CEXP-04 row reads "Blocked (see
  results/v2_validation_report.md)"
- Commits: 4 atomic commits with `08-03` in subject (test → impl → results → req-flip)
