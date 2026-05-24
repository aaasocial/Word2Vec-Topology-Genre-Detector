---
phase: 07-corpus-sourcing-research-spike
plan: 01
subsystem: research
tags: [research, corpus, nlp, sourcing, multi-label, validation]

# Dependency graph
requires:
  - phase: 06-v1-bug-fix-sweep
    provides: BUG-05 cache-key lineage (corpus_hash + w2v_model_sha256) — enables defensible Phase 8 retrain after Phase 7 ships its sourcing plan
provides:
  - 3 draft research fragments under .planning/research/v2/_drafts/ ready for Plan 05 assembly
  - Per-source Accept/Reject verdicts for all 9 D-02 sources with documented rationale
  - Goodreads + LoC reframed as curation-only (D-03, D-04)
  - Multi-label feasibility analysis with Defer-to-v3 recommendation (RES-03, D-18)
  - 4 comparable-project case studies with explicit our-deviation rationale per project (D-01)
affects: [07-02, 07-03, 07-04, 07-05, 08-corpus-expansion]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-role source taxonomy: text-fetch / curation / labelling (D-03 reframing)"
    - "Draft-fragment-then-assemble pattern: per-decision drafts in _drafts/, Plan 05 stitches the final doc"
    - "Per-project deviation line as the operative output of comparable-project surveys"

key-files:
  created:
    - .planning/research/v2/_drafts/01_comparable_projects.md
    - .planning/research/v2/_drafts/02_source_evaluation.md
    - .planning/research/v2/_drafts/03_multi_label_feasibility.md
  modified: []

key-decisions:
  - "Goodreads and LoC are curation-only sources, not labelling, not text-fetch (D-03 / D-04 confirmed)"
  - "Defer multi-label classification to v3 (D-18, RES-03) — three reinforcing reasons: ground-truth cost, weak precedent, UI downstream impact"
  - "Standard Ebooks preferred over Gutenberg for titles in both catalogs (text-quality argument)"
  - "BL Labs blbooksgenre rejected for labelling on granularity grounds (binary fiction/nonfiction vs our 8-10 sub-genres), not on quality grounds"
  - "HathiTrust rejected for v2 text-fetch (credential overhead); conditional Accept for cheap metadata enrichment"
  - "Open Library Accept as curation-and-enrichment source — the second opinion on Gutenberg's coarse LCC labels"

patterns-established:
  - "Three-role source taxonomy (text-fetch / curation / labelling): every external source must declare its role explicitly, not be assumed multi-purpose"
  - "Draft fragments per decision ID: each Phase 7 plan produces fragments tagged with D-IDs; Plan 05 assembles them into the final docs"
  - "Per-project 'Our deviation' line: every comparable project surveyed must produce a one-sentence statement of why our v2 differs — this is the operative output of the survey, not the project facts themselves"

requirements-completed: [RES-01, RES-03]

# Metrics
duration: 7min
completed: 2026-05-24
---

# Phase 7 Plan 01: Comparable Projects, Source Evaluation, and Multi-Label Feasibility Summary

**Three draft research fragments produced under `.planning/research/v2/_drafts/` covering 4 comparable projects with per-project deviations (D-01), 9 source verdicts with curation-only reframing for Goodreads + LoC (D-02/D-03/D-04), and a Defer-to-v3 multi-label recommendation grounded in cost, ground-truth, UI, and precedent analysis (D-18 / RES-03).**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-24T15:31:30Z
- **Completed:** 2026-05-24T15:38:42Z
- **Tasks:** 3
- **Files modified:** 3 (all created, none modified)
- **Total lines written:** 221 (60 + 102 + 59)

## Accomplishments

- Surveyed and documented 4 comparable book-genre-classification projects (Worsham/Kalita 2018, Gutenberg-Genre-ID, BL Labs blbooksgenre, Reagan et al. 2016) with explicit "Our deviation" rationale per project — the operative output of the survey.
- Produced Accept/Reject verdicts with one-paragraph rationale for every one of the 9 D-02 sources: Project Gutenberg (Accept primary text-fetch), Open Library (Accept curation+enrichment), Library of Congress (Accept curation-only), blbooksgenre (Reject — granularity mismatch), literary-genre-examples (Reject — granularity + provenance), Goodreads UCSD (Accept curation-only), Internet Archive (Accept fallback only), HathiTrust (Reject text-fetch / conditional metadata Accept), Standard Ebooks (Accept preferred over Gutenberg).
- Confirmed three anti-features (BookCorpus licensing, Goodreads scraping at scale, LLM auto-labelling) aligning with existing FEATURES.md framing.
- Evaluated multi-label feasibility across 4 dimensions (Cost, Ground truth, UI implications, Comparable-project precedent) and converged on Defer-to-v3 with documented rationale.
- Established the curation/text-fetch/labelling three-role source taxonomy that Plan 05 will lift into the final CORPUS_SOURCING.md.

## Task Commits

Each task was committed atomically:

1. **Task 1: Draft comparable-projects research fragment** — `bf96eb6` (docs)
2. **Task 2: Draft source-by-source evaluation fragment** — `c7b7404` (docs)
3. **Task 3: Draft multi-label feasibility fragment** — `37fee8c` (docs)

## Files Created/Modified

- `.planning/research/v2/_drafts/01_comparable_projects.md` (60 lines) — 4 comparable projects surveyed with per-project corpus size, sourcing, labelling, validation, headline result, and "Our deviation" line. Cross-cutting findings: common Gutenberg sourcing, common author-leakage validation gap, common small-academic size band, common labelling-weakness pattern.
- `.planning/research/v2/_drafts/02_source_evaluation.md` (102 lines) — Per-source role assignment, coverage, access path, risks, and Accept/Reject verdict for all 9 D-02 sources. Pipeline implication section maps verdicts to the Phase-8 candidate-shortlist + lookup pipeline. Confirmed anti-features section lists BookCorpus, Goodreads scraping at scale, LLM auto-labelling.
- `.planning/research/v2/_drafts/03_multi_label_feasibility.md` (59 lines) — 4-sub-question analysis (Cost / Ground truth / UI implications / Comparable-project precedent) ending with Defer-to-v3 recommendation and explicit "what changes for v2: nothing" closure.

## Decisions Made

- **Goodreads + LoC are curation-only (D-03 / D-04 sharpened):** Both sources contribute candidate-title shortlists ranked by external community/institutional consensus, not labels or text bytes. Reframes the STACK.md ambiguity into an explicit role assignment that Phase 8 follows.
- **Standard Ebooks preferred over Gutenberg when both have a title:** Cleaner OCR reduces vocabulary noise in Word2Vec training. Fall back to Gutenberg when Standard Ebooks lacks the work. Adds a Phase-8 preference rule that STACK.md left implicit.
- **HathiTrust rejected for v2 text-fetch:** Credential overhead does not justify the marginal coverage at our 200-300 book scale. Conditional Accept for cheap metadata enrichment via the open Bibliographic API only.
- **BL Labs blbooksgenre rejected on granularity, not quality:** Fiction/nonfiction binary cannot inform our 8-10 sub-genre task. The dataset's methodology (Cohen's κ on held-out re-labels) is reusable as inspiration without using its labels.
- **Multi-label: Defer to v3:** Ground truth requires either Goodreads shelf cleaning at noise cost or expert re-labelling at human-time cost; comparable-project precedent is weak; UI changes are downstream-blocking for Phase 9 + Phase 10. Default expectation per D-18 holds.

## Deviations from Plan

None — plan executed exactly as written. Three tasks, three commits, three fragments, every acceptance criterion met.

## Issues Encountered

- **Worktree branch-base mismatch on start.** The worktree branch HEAD pointed at an unrelated F1 Dashboard phase-4/5 commit rather than the Phase 7 base commit `515efa7`. Resolved per the `<worktree_branch_check>` protocol by `git reset --soft 515efa7e0e5c7a703ca564f225670caf9b20df94` followed by `git checkout --` on the planning directory to restore the Phase-7 working tree. Pre-execution overhead only; did not affect plan-task execution.

## Next Phase Readiness

- **Plan 05 (assembly) inputs ready:** Three fragments with stable anchor headings (`## Comparable projects`, `## Source evaluation`, `## Multi-label classification`) under `.planning/research/v2/_drafts/`. Plan 05 reads these and stitches them into the final `CORPUS_SOURCING.md` along with the genre-set recommendation and candidate-shortlist outputs from Plans 02-04.
- **Decision lineage preserved:** Every verdict and recommendation traces back to a specific D-ID from `07-CONTEXT.md`. No new decisions surfaced; no architectural questions left open.
- **Zero installs performed per D-05:** No `pip install`, `uv add`, or `npm install` ran in this plan. The verdicts that imply Phase 8 installs (e.g., `datasets>=3.0` for the Reject-path blbooksgenre work that won't happen, `internetarchive>=3.5` for the conditional fallback) are documented for Phase 8 to actuate or skip.

## Self-Check

Verified file existence:
- FOUND: .planning/research/v2/_drafts/01_comparable_projects.md (60 lines, 4 ### Project headings, 4 "Our deviation:" lines, ## Cross-cutting findings heading)
- FOUND: .planning/research/v2/_drafts/02_source_evaluation.md (102 lines, 9 ### Source: headings, 9 **Verdict:** lines, 4 "curation-only" mentions, ## Confirmed anti-features heading)
- FOUND: .planning/research/v2/_drafts/03_multi_label_feasibility.md (59 lines, ## Multi-label classification heading, 4 #### subsections, **Recommendation:** Defer to v3, **Rationale:** present, RES-03 referenced)

Verified commit existence:
- FOUND: bf96eb6 (docs(07-01): draft comparable-projects research fragment)
- FOUND: c7b7404 (docs(07-01): draft source-by-source evaluation fragment)
- FOUND: 37fee8c (docs(07-01): draft multi-label feasibility fragment)

## Self-Check: PASSED

---
*Phase: 07-corpus-sourcing-research-spike*
*Plan: 01*
*Completed: 2026-05-24*
