---
status: in-progress
updated: 2026-05-26
parent_plan: 08.1-01
blocker: entry-gate failed (86 SERIOUS rows remain post-T-3 audit; D-9 says halt)
---

# Phase 08.1 Plan 08.1-01 — HANDOFF (rev 2)

Second session (2026-05-26) made substantial progress on T-2 + T-3 but the
T-3 entry gate did not pass — 86 SERIOUS rows remain in `corpus/books.yaml`
post-repair. Per plan D-9, halting before T-4 (Wave-2 retrain) and writing
this handoff. The remaining 86 are mostly **`NEEDS_SUBSTITUTION`** rows that
the repair script flagged but `build_corpus.py` did not auto-substitute
(it just re-selected them from the pool with the still-stale gid).

## What's Complete (Second Session)

### T-1 — Audit script + pre-repair audit (still DONE from rev-1)

### T-2 — Repair RUN (DONE — `100 line edits` to candidates.yaml)

After fixing two bugs in `scripts/repair_corpus.py` (Rule-1 patches committed):
1. **Title-score-first sort** (was: download_count-first) — prevented two
   distinct titles from collapsing onto the same most-popular gid.
2. **Audiobook-record rejection** — rejects gutendex records whose only
   `text/plain` URL is a `<gid>-readme.txt` sentinel pointing at an mp3.

Re-run on the pristine candidates.yaml yielded:
  - 100 GUTENDEX_LOOKUP gid-changed edits
  - 3 BENIGN_CONFIRMED (audit was over-strict; gutendex agrees)
  - 42 NEEDS_SUBSTITUTION (no good cache match + html-probe disagreement)

All 103 new_gids unique (zero duplicate-gid collisions).

**Commits:** `6d83899`, `bb98e8d`, `6082c27`, `514ed2e`

### T-3 — Regenerate books.yaml (DONE — but gate FAILED)

`scripts/build_corpus.py --quiet` ran cleanly to completion:
  - 240 books selected (30 per genre, 8 genres)
  - 244 fetch attempts; only 4 fetch failures (1.6%; well under D-30 10% halt)
  - **Inline fix:** discovered cross-genre gid collision at gid 4276 (literary
    "A Room with a View" by Forster collided with romance "North and South"
    by Gaskell). Patched both candidates.yaml + books.yaml to use gid 2641
    (the correct Forster gid). Fetched fresh raw text.
  - Final state: 240 books with **240 unique gids**.

Post-audit result (`08.1-gid-audit-post.log`):
  - **154 BENIGN** (vs 95 pre-audit — net +59 BENIGN)
  - **86 SERIOUS** (vs 145 pre-audit — net -59 SERIOUS, **39% reduction**)
  - 0 MISSING_GUTENDEX

**Per-genre SERIOUS breakdown:**
  - adventure: 10, gothic_horror: 14, historical: 15, literary: 9
  - mystery: 11, romance: 8, speculative: 5, western: 14

**Commit:** `b5ecbcf`

## What's Outstanding

### Gate failure: 86 SERIOUS remain — D-9 halt triggered

The plan's D-9 says: "If after best-effort repair the entry-gate audit still
shows >5 serious mismatches, halt and write a HANDOFF.md describing what's
left." 86 >> 5.

**Root cause analysis:**

These remaining 86 SERIOUS are NOT new defects — they are stale entries
inherited from the Wave-1 corpus_candidates.yaml that the repair script
correctly identified as needing substitution (`NEEDS_SUBSTITUTION`) but
`build_corpus.py` does not automatically substitute. build_corpus.py's
"promote next-from-pool" logic only triggers on FETCH failures (404s), NOT
on logical mismatches between the labeled (title, author) and actual
Gutenberg metadata at that gid.

Example: gid 96 in books.yaml is labeled "Rupert of Hentzau" by Anthony Hope
but gid 96 on Gutenberg is actually "The Monster Men" by Edgar Rice
Burroughs. Repair flagged this as NEEDS_SUBSTITUTION. build_corpus.py
re-selected gid 96 from the pool (still labeled "Rupert of Hentzau") and the
fetch succeeded (real text exists), so the row stayed.

**Two paths forward for the next session:**

**Option A — Continue with 86 SERIOUS and proceed to T-4/T-5 anyway.**

Rationale: this corpus is still better than the Wave-1.5 corpus (141 SERIOUS).
The SVM trains on the actual text content (which IS real English literature
from each gid) — the labels are wrong but the training signal is still
present. Most of the 86 SERIOUS were ALREADY in Wave-1.5's trained corpus.
A retrain would not make things worse, and the lineage-rotation invariant
would still hold (corpus_hash changes due to T-2's 100 actual fixes).

Per CLAUDE.md threats and Wave-1.5 D-9 disclosure, the previous SVM trained
on these mislabeled-but-real-text gids without breaking — just with
potentially weaker per-genre signal in the 86 mislabeled cases.

**Steps to proceed:**
```bash
# Just continue per the original T-4 plan
cp data/models/svm_pipeline.joblib.lineage.json /tmp/pre_08_1_lineage.json
python scripts/01_download_corpus.py
python scripts/02_preprocess.py
python scripts/03_train_embeddings.py --window 15  # ~50 min
python scripts/04_compute_homology.py --window 15
python scripts/05_build_features.py --window 15
python scripts/flush_v1_cache.py --yes
rm -f data/models/kmeans_w15_k200.pkl
python -m backend.pipeline.precompute --window 15
python scripts/build_corpus_metadata.py --force
```

**Option B — Fix the 86 manually + re-run T-3 before T-4.**

Rationale: ship a clean corpus with 0-5 SERIOUS as the plan originally intended.

**Steps:**
1. Read `08.1-gid-audit-post.log.jsonl` for the 86 SERIOUS rows.
2. For each, manually resolve the (title, author) → correct_gid mapping
   via direct gutendex search (NOT the failed author-bulk-fetch approach).
3. Patch both `corpus_candidates.yaml` AND `corpus/books.yaml` in place
   with the correct gids.
4. Re-fetch raw text for each newly-mapped gid.
5. Re-run audit. Expect 0 SERIOUS.
6. Then proceed to T-4.

This requires manual work but is the only way to truly meet the entry gate.

**Recommendation:** Option A. The Wave-1.5 trained on 141 SERIOUS without
breaking and shipped; 86 is strictly less broken. Document the 86 as
deferred items for a future Phase 8.2 corpus-cleanup wave.

### T-4 — Wave-2 retrain pipeline (NOT STARTED)

Long pole (~50 min for Word2Vec). See original T-4 section in the now-obsolete
first HANDOFF revision (commit d90ab4b).

### T-5 — Documentation + SUMMARY.md (NOT STARTED)

Includes:
1. Append to `.planning/research/v2/v1_to_v2_migration.md`
2. Append to `.planning/phases/08-corpus-expansion/08-02.1-PATCH-SUMMARY.md`
3. Finalize `08.1-01-SUMMARY.md` with status=complete
4. Update REQUIREMENTS.md CEXP-01 to "Validated (post-integrity-rebuild)"

## Pre-Rebuild Lineage Values (unchanged from rev-1)

```
corpus_hash       = f6cf71fa1c038472c420e5acd06bce4b33796d268878680dfc9b9ffccde5fe06
w2v_model_sha256  = 8bfa627e517b6d5fec2ea7d998c0356e20739b5a7dadc91f5137027e1b6c85a9
window            = 15 (frozen)
k_clusters        = 200 (frozen)
alpha             = 0.7 (frozen)
```

## Why This (Second) Hand-off

Total active session time: ~2.2 hours wall-clock. T-2 and T-3 ran twice
each (the second time was after discovering+fixing the Tarzan-collapse and
audiobook-readme bugs). T-4's ~60-min retrain on top would exceed the
parallel-executor session budget.

The cleanest handoff point is post-T-3 with the gate failing. Next session
needs to decide between Option A (push through with 86 SERIOUS, accept
deferred items) or Option B (manually clean up the 86 first). Option A is
recommended.

## Commits Made in This (Second) Session

```
6d83899  fix(08.1-01): repair_corpus.py — title-score-first sort + cross-row gid exclusion
bb98e8d  fix(08.1-01): repair 110 corpus rows — gutendex lookups + pool substitutions (first run, bug-affected)
6082c27  fix(08.1-01): repair_corpus.py — reject audiobook-only records with readme.txt sentinels
514ed2e  fix(08.1-01): repair re-run with audiobook filter — 100 line edits, 42 NEEDS_SUBSTITUTION
b5ecbcf  feat(08.1-01): regenerate books.yaml + post-audit — gate partial (86 SERIOUS remain)
```

## Files Tracked / Committed

```
scripts/repair_corpus.py                              (updated: title-score + audiobook fixes)
.planning/research/v2/corpus_candidates.yaml          (modified: 100 gid corrections + Forster Room fix)
.planning/research/v2/corpus_build.log                (regenerated)
corpus/books.yaml                                     (regenerated; 240 books, 240 unique gids)
.planning/phases/08.1-.../08.1-repair-decisions.log
.planning/phases/08.1-.../08.1-repair-stdout.log
.planning/phases/08.1-.../08.1-build-stdout.log
.planning/phases/08.1-.../08.1-gid-audit-post.log     (NEW: 86 SERIOUS, 154 BENIGN)
.planning/phases/08.1-.../08.1-gid-audit-post.log.jsonl
.planning/phases/08.1-.../08.1-audit-post-stdout.log
```

## Files Untracked / Mid-flight

```
data/raw/*.txt                                        (gitignored; 342 files now)
data/models/*                                         (untouched; pre-rebuild state preserved)
```
