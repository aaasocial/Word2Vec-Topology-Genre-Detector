# Plan 06-05 — Operator Migration Notes

**Audience:** Operators deploying the Plan 06-05 (BUG-05) changes to dev,
staging, or production.

**What changed:** `backend.cache.store.cache_key()` now requires two new
keyword-only arguments: `corpus_hash` (sha256 of `corpus/books.yaml`) and
`w2v_model_sha256` (sha256 of `data/models/word2vec_w{window}.model`). Every
on-disk cache key derived from the old signature is therefore unreachable.

**Why:** v1 cached artifacts were keyed without the model or corpus hash, so
a Word2Vec retrain silently served stale features (PITFALLS.md §1). Phase 8's
corpus expansion would have hit this bug at the worst possible moment.

## Deploy procedure

1. **Pull the latest code.**
   ```bash
   git pull
   git lfs pull
   ```

2. **Flush v1 cache (one-shot).** Aligns with the Phase 8 retrain workflow
   per CONTEXT.md D-23 (eager flush over lazy/orphan strategy).
   ```bash
   python scripts/flush_v1_cache.py             # interactive confirm
   # or, in Docker / CI:
   python scripts/flush_v1_cache.py --yes
   ```
   Idempotent: re-running on an already-empty cache prints "nothing to flush".

3. **Repopulate caches.** ~20 min on a warm machine.
   ```bash
   python -m backend.pipeline.precompute        # ~10 min  (incl. SVM training + lineage sidecar)
   python -m backend.pipeline.precompute_viz    # ~10 min  (scatter, tfidf, persistence images, diagrams)
   python -m backend.pipeline.precompute_vr     # ~30 s    (VR edges per projection)
   ```

4. **Verify SVM lineage.** The first run writes `data/models/svm_pipeline.joblib.lineage.json`.
   ```bash
   ls data/models/svm_pipeline.joblib.lineage.json
   python -c "from pathlib import Path; from backend.cache.lineage import verify_svm_lineage; \
              ok, why = verify_svm_lineage(Path('data/models/svm_pipeline.joblib'), window=15); \
              print('lineage:', ok, why)"
   ```
   Expected: `lineage: True lineage matches`.

5. **Smoke test.** Confirm the in-process tests still pass.
   ```bash
   pytest backend/tests/test_cache.py backend/tests/test_lineage.py \
          backend/tests/test_lineage_smoke.py backend/pipeline/tests/test_precompute_vr.py -v
   ```

## Rollback procedure

If the deploy fails for any reason (corrupt model, partial precompute, etc.):

1. Revert the deploy commit:
   ```bash
   git revert <commit-hash>
   ```
2. Pre-Plan-06-05 `cache_key()` signature does NOT accept `corpus_hash` or
   `w2v_model_sha256`, so reverting alone is sufficient -- no manual cache
   surgery needed. The v1 caches were already flushed in step 2 above; the
   next request after the revert will repopulate them under the v1 key
   scheme (which is what was running before).

## Cache directory geometry (FYI)

- `data/cache/{hash}.npy`  -- numpy artifacts (feature vectors, etc.)
- `data/cache/{hash}.json` -- json artifacts (book results, scatter, etc.)
- `data/cache/`            -- listed in `.gitignore`; never tracked.
- Hashes are 64-char sha256 hex digests built from
  `sha256(json({step: params, __corpus_hash__: ..., __w2v_model_sha256__: ...}))`.

## Defense-in-depth (D-25)

Alongside the SVM file there is now a sibling lineage file:

- `data/models/svm_pipeline.joblib`              (the trained pipeline)
- `data/models/svm_pipeline.joblib.lineage.json` (the lineage manifest)

If the manifest doesn't match the currently-loaded W2V model (e.g. someone
shipped a new model but didn't rerun `precompute.py`), `verify_svm_lineage`
returns `(False, "<reason>")` and the caller SHOULD refuse to load the SVM.
A future plan (likely Phase 8) will wire that refusal into the FastAPI
startup hook -- for v2.0 the verification helper is available but not yet
gating server boot.

## What this plan did NOT do

- It did **not** introduce a migration script that re-derives the new cache
  keys for the v1 artifacts. The eager flush + recompute path (D-23) was
  preferred over the migration-script path because it eliminates the entire
  "did the migrator handle corner case X correctly?" risk class.
- It did **not** rebase the pre-existing `/api/` prefix bug in
  `backend/tests/test_classify.py`. That issue is logged in
  `deferred-items.md` under the Plan 06-05 entry; the fix belongs with the
  next test-suite rebase.
- It did **not** wire `verify_svm_lineage` into the FastAPI startup hook.
  Phase 8 will own that gate.

---

*Plan 06-05 / BUG-05 -- documented 2026-05-22 under
`.planning/phases/06-v1-bug-fix-sweep/06-05-PLAN.md`.*
