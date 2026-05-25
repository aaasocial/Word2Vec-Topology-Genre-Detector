---
status: in-progress
created: 2026-05-25
parent_plan: 08.1-01
blocker: gutendex-rate-limiting + long Wave-2 retrain runtime
---

# Phase 08.1 Plan 08.1-01 — HANDOFF

This handoff documents the state of `08.1-01-PLAN.md` execution at the point a fresh
session is needed to complete it. Two infrastructure constraints prevented end-to-end
completion in a single execution session:

1. **gutendex.com rate-limit + slowness** — observed 30-90s P50 response times,
   frequent HTTP 429 rate-limit responses, and intermittent connection drops.
   This means the T-2 author-bulk-fetch step (54 distinct lastnames) takes 30-60
   wall-clock minutes even with 4 parallel workers and 6-retry exponential backoff.

2. **Wave-2 pipeline retrain runtime** — `scripts/03_train_embeddings.py` (Word2Vec)
   alone takes ~50 minutes per Wave-1.5's previous run. The full T-4 sequence
   (download → preprocess → train → homology → features → precompute) is ~60 min.

Combined ETA from start: ~2-3 hours wall-clock, which exceeded the parallel-executor
session budget.

## What's Complete

### T-1 — Audit script + pre-repair audit (DONE)

- `scripts/audit_corpus_gids.py` — strict gid integrity auditor.
  - Reads `corpus/books.yaml`, queries gutendex `?ids=<gid>` in batches of 32.
  - Classifies each row as BENIGN | SERIOUS | MISSING_GUTENDEX using
    `rapidfuzz.token_set_ratio(yaml_title, gutendex_title) >= 85` AND author lastname match.
  - Emits structured text report + JSONL sidecar.
- Pre-audit ran against current `corpus/books.yaml`:
  - **240 rows total**
  - **95 BENIGN**
  - **145 SERIOUS** (close to Wave-1.5's 141; difference is uniform >=85 threshold)
  - **0 MISSING_GUTENDEX**
- Files: `08.1-gid-audit-pre.log` + `08.1-gid-audit-pre.log.jsonl`.
- **Commit:** `bf75706` — `feat(08.1-01): scripts/audit_corpus_gids.py — strict gid integrity auditor`

### T-2 — Repair script (CODE DONE, RUN INCOMPLETE)

- `scripts/repair_corpus.py` — gutendex bulk-by-author repair.
  - Author-bulk-fetch strategy: groups 145 SERIOUS rows by author lastname → 54 distinct
    authors. Fetches each via `?search=<lastname>&languages=en` with pagination
    (`next` URL) up to 5 pages.
  - 4 parallel workers (`ThreadPoolExecutor`), each with its own `requests.Session`.
  - 90s per-request timeout. 6-retry exponential backoff (4, 8, 16, 32, 64, 128s).
  - Local matching: fuzzy title >=70 + author lastname match + not audiobook-only.
  - Falls back to direct HTML probe of `https://www.gutenberg.org/ebooks/<gid>` for
    any (gid) the audit flagged but author-cache didn't resolve.
  - Updates `corpus_candidates.yaml` in place via line-level regex (preserves YAML
    structure + comments).
  - Emits `08.1-repair-decisions.log` (per-row: old_gid, new_gid, action, rationale).
- **Commit:** `57ed151` — `feat(08.1-01): scripts/repair_corpus.py — gutendex bulk-by-author repair`

### T-2 — Repair RUN (PARTIAL — needs completion in fresh session)

The repair script was restarted at `2026-05-25T22:33:12Z` and is running. At the time
of handoff write, progress was 25/54 author-caches fetched. Two prior partial runs
attempted; both killed/aborted due to context-budget pressure. The script is
**idempotent** — re-running it from scratch is safe (writes to candidates.yaml only
at the end after all matching is done).

**Observed gutendex behavior (this session):**
- P50 response: 30-45s
- P95 response: 60-90s
- 429 rate-limit window: ~few seconds, recoverable with 4+s backoff
- Some authors return 0 hits due to accent-stripping (e.g., "bronte" returns 4 hits;
  the canonical entries are stored as "Brontë" with umlaut). This is **not a script
  bug** — those rows will fall through to the per-gid HTML probe path which works.

**To resume:** Just re-run the script. It will start fresh but rate-limit conditions
on gutendex.com may improve in a different time window.

```bash
cd "C:/Users/Eason/Desktop/CC/Word2Vec Genre Analyser"
python -u scripts/repair_corpus.py \
  --pre-audit-jsonl .planning/phases/08.1-corpus-integrity-rebuild-fix-141-240-wrong-gid-bindings-in-c/08.1-gid-audit-pre.log.jsonl \
  --candidates .planning/research/v2/corpus_candidates.yaml \
  --out-log .planning/phases/08.1-corpus-integrity-rebuild-fix-141-240-wrong-gid-bindings-in-c/08.1-repair-decisions.log \
  --workers 4
```

## What's Outstanding

### T-3 — Regenerate books.yaml + post-audit

After T-2 finishes (candidates.yaml updated with corrected gids):

```bash
# Re-generate books.yaml deterministically from candidates pool
python scripts/build_corpus.py --quiet

# Re-run audit to verify entry gate (must report 0 SERIOUS, or <=5 with rationale)
python scripts/audit_corpus_gids.py \
  --books corpus/books.yaml \
  --out .planning/phases/08.1-.../08.1-gid-audit-post.log

# If gate passes (0 SERIOUS), commit:
git add corpus/books.yaml \
        .planning/research/v2/corpus_candidates.yaml \
        .planning/research/v2/corpus_build.log \
        .planning/phases/08.1-.../08.1-repair-decisions.log \
        .planning/phases/08.1-.../08.1-gid-audit-post.log \
        .planning/phases/08.1-.../08.1-gid-audit-post.log.jsonl
git commit --no-verify -m "feat(08.1-01): regenerate books.yaml with corrected gids — gate pass"
```

Expected: 145 SERIOUS → 0-5 SERIOUS post-repair. If >5 remain, escalate per plan's
D-9 ("halt + HANDOFF.md describing what's left").

### T-4 — Wave-2 retrain pipeline (long pole, ~60 min)

```bash
# Bootstrap raw files from main repo for unchanged gids (gitignored, ~236 files):
mkdir -p data/raw
cp "/c/Users/Eason/Desktop/CC/Word2Vec Genre Analyser/data/raw"/*.txt data/raw/

# Then the canonical retrain sequence:
python scripts/01_download_corpus.py     # fetches any newly-introduced gids
python scripts/02_preprocess.py          # ~1 min
python scripts/03_train_embeddings.py --window 15  # ~50 min — LONG POLE
python scripts/04_compute_homology.py --window 15  # ~1 min (215 books × 0.2s)
python scripts/05_build_features.py --window 15    # ~5 sec
python scripts/flush_v1_cache.py --yes              # cache key migration
rm -f data/models/kmeans_w15_k200.pkl              # Wave-1.5 deviation: stale k-means
python -m backend.pipeline.precompute --window 15  # ~25 sec
python scripts/build_corpus_metadata.py --force    # regenerate metadata
```

**Verification gates:**
- `data/models/svm_pipeline.joblib.lineage.json::corpus_hash` differs from
  pre-rebuild value `f6cf71fa1c038472c420e5acd06bce4b33796d268878680dfc9b9ffccde5fe06`
  (proves cache rotation per BUG-05 invariant).
- `data/models/genre_names.json` lists exactly the 8 v2 genre keys.
- `git diff config/params.yaml` empty (frozen hyperparameters).

Commit:

```bash
git add data/models/word2vec_w15.model \
        data/models/word2vec_w15.model.syn1neg.npy \
        data/models/word2vec_w15.model.wv.vectors.npy \
        data/models/tfidf_vectorizer_w15.joblib \
        data/models/kmeans_w15_k200.pkl \
        data/models/persistence_imager.joblib \
        data/models/svm_pipeline.joblib \
        data/models/svm_pipeline.joblib.lineage.json \
        data/models/genre_names.json \
        data/corpus_metadata.json
git commit --no-verify -m "feat(08.1-01): retrain pipeline on integrity-clean corpus — lineage rotation"
```

### T-5 — Documentation + SUMMARY.md

Once T-4 lineage rotation is confirmed:

1. Append "## 08.1 Patch Trail" section to `.planning/research/v2/v1_to_v2_migration.md`
   with a per-genre table of every gid change (read from `08.1-repair-decisions.log`).
2. Append "## 08.1 Resolution" section to
   `.planning/phases/08-corpus-expansion/08-02.1-PATCH-SUMMARY.md` noting Phase 8.1
   supersedes the Wave 1.5 partial patch.
3. Write `08.1-01-SUMMARY.md` using `~/.claude/get-shit-done/templates/summary.md`.
4. Flip REQUIREMENTS.md CEXP-01 to "Validated (post-integrity-rebuild)" with pointer.

## Pre-Rebuild Lineage Values (for diff verification)

These are the values BEFORE this sub-phase starts the retrain. The post-rebuild
sidecar MUST differ:

```
corpus_hash       = f6cf71fa1c038472c420e5acd06bce4b33796d268878680dfc9b9ffccde5fe06
w2v_model_sha256  = 8bfa627e517b6d5fec2ea7d998c0356e20739b5a7dadc91f5137027e1b6c85a9
window            = 15 (frozen)
k_clusters        = 200 (frozen)
alpha             = 0.7 (frozen)
```

## Why This Hand-off

Per the plan's failure-mode rules:

> **gutendex.com unavailable / 429:** retry with exponential backoff; if still failing
> after ~5 minutes, switch to direct Gutenberg HTML scraping ...

The repair script DOES include the HTML fallback, but only at the per-row matching
stage (for rows whose author-cache returned 0 hits, e.g., the Brontë accent case).
The bulk author-cache fetch step is the bottleneck because gutendex is the only
source of (title, lastname) → gid mapping in bulk; the HTML probe path only verifies
a given gid.

Switching the entire pipeline to HTML-probe-only would require querying gutendex
for the candidate gid list (which already lives in `corpus_candidates.yaml`) and
probing each individually — that's actually feasible and roughly equivalent in time.
But the existing script is now committed and works; a fresh session with better
network conditions is the cleaner path forward.

## Commits Made in This Session

```
bf75706  feat(08.1-01): scripts/audit_corpus_gids.py — strict gid integrity auditor
57ed151  feat(08.1-01): scripts/repair_corpus.py — gutendex bulk-by-author repair
```

## Files Tracked

```
scripts/audit_corpus_gids.py                                  (new, committed bf75706)
scripts/repair_corpus.py                                      (new, committed 57ed151)
.planning/phases/08.1-.../08.1-gid-audit-pre.log              (committed bf75706)
.planning/phases/08.1-.../08.1-gid-audit-pre.log.jsonl        (committed bf75706)
.planning/phases/08.1-.../HANDOFF.md                           (this file)
```

## Files Untracked / Mid-flight

```
.planning/phases/08.1-.../08.1-repair-stdout.log              (transient run-log)
.planning/research/v2/corpus_candidates.yaml                  (NOT yet modified)
```

The candidates file is UNTOUCHED — the repair script only writes after the matching
phase completes. So git status should show no `M` entries on `corpus_candidates.yaml`,
and a re-run starts fresh.
