---
phase: 07-corpus-sourcing-research-spike
plan: 04
subsystem: research
tags: [research, validation, evaluation, svm, baseline, holdout]

# Dependency graph
requires:
  - phase: 06-v1-bug-fix-sweep
    provides: svm_pipeline.joblib + lineage sidecar (BUG-05 cache_key lineage); the v1 SVM and its lineage.json are the read-only inputs this plan evaluates against.
provides:
  - scripts/phase7_v1_baseline.py — deterministic, read-only v1 SVM evaluator (loads svm_pipeline.joblib + raw features, applies alpha=0.7, selects 20-book D-12 hold-out, emits macro-F1 / per-genre F1 / accuracy / confusion matrix / per-book predictions)
  - .planning/research/v2/v1_baseline_results.json — pinned v1 baseline numbers (macro_f1=0.3235, accuracy=0.3500, holdout_size=20); deterministic re-runs produce byte-identical output
  - .planning/research/v2/_drafts/06_v1_baseline_excerpt.md — human-readable Plan-05-ready excerpt for VALIDATION_PROTOCOL.md §"v1 baseline (computed Phase 7)"
affects: [07-05 (Plan 05 embeds the excerpt into VALIDATION_PROTOCOL.md), 08-corpus-expansion (Phase 8 must beat macro_f1=0.3235 on the same 20-book hold-out)]

# Tech tracking
tech-stack:
  added: []  # no new dependencies; uses joblib, numpy, scikit-learn, PyYAML already on disk
  patterns: ["Phase-7 evaluation utility pattern: REPO-rooted Path resolution + lineage-sidecar precheck + deterministic stratified hold-out + JSON-first emission with markdown excerpt as derived artifact (lets Plan 05 embed verbatim numbers without re-running the script)"]

key-files:
  created:
    - scripts/phase7_v1_baseline.py
    - .planning/research/v2/v1_baseline_results.json
    - .planning/research/v2/_drafts/06_v1_baseline_excerpt.md
  modified: []

key-decisions:
  - "Filled the gothic genre's second hold-out slot with the next-best-by-author-count gothic book when only 1 D-12-eligible candidate existed. Documented in the excerpt as a Phase 8 corpus-restructure flag."
  - "Wrote v1_lineage.corpus_hash and v1_lineage.w2v_model_sha256 into the JSON output (copying from lineage.json) so the JSON is self-contained for v1-vs-v2 reproducibility audits without requiring readers to cross-reference the joblib sidecar."
  - "Discovered v1 collapse onto 'western' (13/20 hold-out predictions = 'western'); documented as a Zane-Grey-driven class imbalance and a primary motivator for Phase 8's GroupKFold(groups=author) validation."

patterns-established:
  - "REPO-relative script Path resolution: Path(__file__).resolve().parent.parent — supports running from any CWD; aligns with scripts/06_validate.py."
  - "Deterministic stratified hold-out: sort by (-other_count, gutenberg_id) then take first HOLDOUT_PER_GENRE; same input -> same output, no randomness."
  - "Lineage-sidecar precheck: refuse to run if data/models/*.joblib.lineage.json's alpha/k/window disagree with the script's expected values (prevents silent drift if hyperparameters change in config/params.yaml but the SVM isn't retrained)."

requirements-completed: [RES-02]

# Metrics
duration: 4min
completed: 2026-05-24
---

# Phase 7 Plan 04: v1 Baseline Evaluator Summary

**Pinned the v1 SVM's hold-out macro-F1 at 0.3235 on a 20-book D-12 author-overlap subset so Phase 8 has a single fixed number to beat.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-24T15:34:20Z
- **Completed:** 2026-05-24T15:38:50Z
- **Tasks:** 2
- **Files modified:** 0 (3 created)

## Accomplishments

- **scripts/phase7_v1_baseline.py** — deterministic, read-only v1 SVM evaluator. Loads svm_pipeline.joblib + raw 600-D feature matrix + labels + book_order + books.yaml; applies the alpha=0.7 topo|loc weighting from scripts/06_validate.py lines 114-117; selects a 20-book hold-out stratified 2-per-genre using D-12's author-overlap rule with deterministic tie-breaking (ties broken by ascending gutenberg_id); evaluates the trained SVM on the hold-out and emits a JSON results document.
- **.planning/research/v2/v1_baseline_results.json** — the pinned numbers: macro_f1=0.3235, accuracy=0.3500, holdout_size=20, full per-genre F1 breakdown, confusion matrix, per-book true-vs-predicted with `correct` flags, hold-out gutenberg_id list, and lineage audit trail (alpha, k_clusters, window, seed, corpus_hash, w2v_model_sha256). Byte-identical on consecutive re-runs (verified via `diff`).
- **.planning/research/v2/_drafts/06_v1_baseline_excerpt.md** — Plan-05-ready human-readable fragment with all placeholders filled verbatim from the JSON. Includes headline metric, hold-out IDs, per-genre F1 table, full confusion matrix as a markdown table, per-book predictions table, lineage audit trail, and the D-13 caveat about training-data evaluation bias.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write phase7_v1_baseline.py — deterministic v1 evaluator** — `7ce3ad5` (feat)
2. **Task 2: Draft v1 baseline excerpt markdown fragment** — `7478587` (docs)

## Files Created/Modified

- `scripts/phase7_v1_baseline.py` — 333-line one-shot v1 baseline evaluator (Phase 7 supporting artifact; not a production pipeline addition).
- `.planning/research/v2/v1_baseline_results.json` — pinned v1 baseline metrics for VALIDATION_PROTOCOL.md.
- `.planning/research/v2/_drafts/06_v1_baseline_excerpt.md` — human-readable fragment for Plan 05 to embed.

## Decisions Made

- **Gothic fallback:** the gothic genre had only 1 D-12-eligible book in the v1 100-book corpus (most gothic books are single-author entries). Filled the second slot with the next-best-by-author-count gothic book (per the plan's fallback clause). Flagged in the excerpt as a Phase 8 corpus-restructure issue — gothic needs ≥2 multi-book authors after restructure.
- **Self-contained JSON:** copied `corpus_hash` and `w2v_model_sha256` from the lineage sidecar into the JSON's `v1_lineage` block so the results JSON is self-auditable without requiring readers to look up the sidecar.
- **`zero_division=0`** added to the `f1_score(..., average=None, ...)` call so absent labels don't print warnings. Default would also be 0 but explicit silences a sklearn deprecation message in 1.5+.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restored missing read-only inputs into the worktree**
- **Found during:** Pre-Task-1 environment check.
- **Issue:** The worktree was created from a base commit (`515efa7`) BEFORE the worktree branch had run the Phase 6 BUG-05 fresh-machine-setup. The plan assumes `data/features/feature_matrix_w15_k200.npy`, `data/features/labels.npy`, `data/features/book_order.json`, and `data/models/svm_pipeline.joblib.lineage.json` already exist on disk — but `data/features/` is `.gitignore`d (per the project's policy of regenerating features locally) and `lineage.json` is an untracked Phase-6 byproduct. None of these were present in the agent worktree.
- **Fix:** Copied the four read-only input files from the master worktree at `C:/Users/Eason/Desktop/CC/Word2Vec Genre Analyser/data/features/` and `data/models/svm_pipeline.joblib.lineage.json` into the agent worktree at the same paths. These files are inputs, not outputs — the plan's "no retrain, no production-artifact mutation" rule is preserved because the joblib + lineage.json are read-only consumers and the features/labels/book_order were generated by an earlier `05_build_features.py` run on the master corpus.
- **Files modified:** none committed (the copied files land under `data/features/` which is gitignored, and `data/models/svm_pipeline.joblib.lineage.json` is left untracked to match the master worktree's state — the agent didn't commit a new lineage sidecar to avoid asserting authorship of a Phase-6 BUG-05 artifact).
- **Verification:** `python scripts/phase7_v1_baseline.py` ran exit-0 and the `verify_lineage()` precheck confirmed `alpha=0.7, k_clusters=200, window=15`.
- **Committed in:** N/A — input restoration, not a code change.

**2. [Rule 3 - Blocking] Reset worktree branch base from `06426e2` to `515efa7`**
- **Found during:** Initial worktree-branch-check.
- **Issue:** Per the spawn-prompt's `<worktree_branch_check>` block, the expected base for this agent was `515efa7` (the commit that introduced phase-7 plans), but `git merge-base HEAD 515efa7` returned `06426e2` — i.e., the worktree was created from an older ancestor on master that did NOT include the Phase 7 plan files. Without the reset, `.planning/phases/07-corpus-sourcing-research-spike/07-04-PLAN.md` would not exist.
- **Fix:** Followed the documented `git reset --soft 515efa7` recovery, then `git checkout -- .` to bring the working tree forward (per the worktree-branch-check protocol).
- **Files modified:** none — purely a branch-base reset.
- **Verification:** Post-reset, `ls .planning/phases/` shows `07-corpus-sourcing-research-spike/` and the PLAN file is readable.
- **Committed in:** N/A — no new commits introduced by the reset itself.

**3. [Rule 1 - Bug] Removed unreachable `random.default_rng(SEED)` consumer code**
- **Found during:** Task 1 review of the plan's reference snippet.
- **Issue:** The plan's `select_holdout` code constructs `rng = np.random.default_rng(SEED)` but never uses it — the function is fully deterministic via sorting. Leaving an unused `rng` would be a misleading "this looks random" signal in code review.
- **Fix:** Replaced `rng = np.random.default_rng(SEED)` with `_ = np.random.default_rng(SEED)` and a comment noting the seed is retained as an audit-trail / future-extension hook. SEED is still part of the JSON's `v1_lineage` block.
- **Files modified:** scripts/phase7_v1_baseline.py.
- **Verification:** Function still passes acceptance (`holdout_size=20`, deterministic re-run produces byte-identical JSON).
- **Committed in:** 7ce3ad5 (Task 1 commit).

---

**Total deviations:** 3 auto-fixed (2 Rule-3 blocking, 1 Rule-1 cosmetic-bug)
**Impact on plan:** All three deviations are environment-restoration / cosmetic; none changes the plan's semantics. The plan's acceptance criteria all pass with the JSON output the agent committed.

## Issues Encountered

- **Author-density imbalance in v1 corpus:** the hold-out collapses 13 of 20 predictions onto `western` (the SVM has learned a strong Zane-Grey-shaped western cluster). This is a real signal about the v1 corpus quality and is documented in the excerpt as motivating Phase 8's `GroupKFold(groups=author)` validation. Not a script bug; a Phase 8 input.
- **Gothic single-eligible-book warning:** as noted in Decisions Made, gothic has only 1 D-12-eligible book in the v1 corpus. The script handled the fallback per the plan's documented behaviour. Phase 8 corpus restructure should ensure each genre has ≥2 multi-book authors.

## User Setup Required

None — no external service configuration required. The script and its outputs are reproducible from already-installed dependencies (joblib, numpy, scikit-learn, PyYAML).

## Next Phase Readiness

- **Plan 05 (next in this wave):** can embed `.planning/research/v2/_drafts/06_v1_baseline_excerpt.md` verbatim into VALIDATION_PROTOCOL.md §"v1 baseline (computed Phase 7)" without recomputing anything.
- **Phase 8 (CEXP-03):** has a single fixed bar to beat — `macro_f1 > 0.3235` on the same 20 gutenberg_ids (where they survive the v2 corpus restructure). The hold-out IDs are pinned in `.planning/research/v2/v1_baseline_results.json::holdout_gutenberg_ids`.
- **CEXP-04 (Phase 8 reproducibility check):** before training the v2 SVM, Phase 8 can re-run `python scripts/phase7_v1_baseline.py --out /tmp/v1_rerun.json` and `diff` against the committed JSON — byte-identical confirms the v1 artifacts haven't drifted.

## Self-Check: PASSED

- File `scripts/phase7_v1_baseline.py` exists: FOUND (333 lines, includes `svm_pipeline.joblib` and `D-12` literal strings).
- File `.planning/research/v2/v1_baseline_results.json` exists: FOUND (macro_f1=0.3235, accuracy=0.3500, holdout_size=20, 10 per_genre_f1 entries, confusion_matrix present, v1_lineage block complete).
- File `.planning/research/v2/_drafts/06_v1_baseline_excerpt.md` exists: FOUND (119 lines, all 10 genres in per-genre F1 table, no `<MACRO_F1>` / `<ACCURACY>` / `<HOLDOUT_SIZE>` placeholders remain, contains literal `## v1 baseline (computed Phase 7)`, `D-12`, `D-13`, `alpha`, `0.7`, `phase7_v1_baseline.py`).
- Commit `7ce3ad5` exists: FOUND (feat(07-04): phase 7 v1 baseline evaluator + pinned results JSON).
- Commit `7478587` exists: FOUND (docs(07-04): draft v1 baseline excerpt for VALIDATION_PROTOCOL.md).
- Determinism: `python scripts/phase7_v1_baseline.py` invoked twice produces byte-identical JSON (verified via `diff`, exit 0).
- No v1 production artifacts modified: `git status` shows zero modifications to `data/models/svm_pipeline.joblib` or any kmeans/word2vec/tfidf model file.

---
*Phase: 07-corpus-sourcing-research-spike*
*Completed: 2026-05-24*
