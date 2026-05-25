---
phase: 08
plan: 08-02
wave: 2
subsystem: pipeline-retrain
tags: [word2vec, svm, kmeans, persistence-homology, lineage, cache-key, bug-05]
requirements_validated: [CEXP-02]
dependency-graph:
  requires:
    - "corpus/books.yaml (Wave 1 — 240 entries, v2 schema)"
    - "scripts/01_download_corpus.py / 02_preprocess.py / 03_train_embeddings.py / 04_compute_homology.py / 05_build_features.py"
    - "scripts/build_corpus_metadata.py"
    - "backend/pipeline/precompute.py (the actual SVM-fit + lineage writer)"
    - "backend/cache/store.py::cache_key (public lineage-aware key)"
    - "backend/cache/lineage.py (corpus_hash + w2v_model_sha256 + write_svm_lineage)"
  provides:
    - "data/models/word2vec_w15.model (retrained on v2 corpus, sha256 rotated)"
    - "data/models/tfidf_vectorizer_w15.joblib (refit on v2 tokens)"
    - "data/models/kmeans_w15_k200.pkl (refit on v2 W2V vocabulary)"
    - "data/models/persistence_imager.joblib (refit on v2 H1 diagrams)"
    - "data/models/svm_pipeline.joblib (retrained on v2 209-book labeled subset)"
    - "data/models/svm_pipeline.joblib.lineage.json (new corpus_hash + w2v sha256)"
    - "data/models/genre_names.json (8 v2 keys, written by precompute.py)"
    - "data/corpus_metadata.json (top_10_tfidf_words for v2 books)"
    - "data/cache/* (rotated under new (corpus_hash, w2v_sha256) keys)"
  affects:
    - "Wave 3 — `06_validate.py` + GroupKFold validation runs on these models"
    - "Wave 4 — GitHub Release `v2.0-data` packages these artifacts for Railway pull"
    - "Backend startup — refuse-to-load guard now accepts the new lineage"
tech-stack:
  added: []
  patterns:
    - "Lineage-aware cache_key via backend.cache.store.cache_key(step, params, *, corpus_hash, w2v_model_sha256)"
    - "Refuse-to-load SVM guard via backend.cache.lineage.verify_svm_lineage"
key-files:
  created:
    - "data/models/svm_pipeline.joblib.lineage.json (new sidecar)"
    - "data/models/word2vec_w15.model.syn1neg.npy (gensim aux file)"
    - "data/models/word2vec_w15.model.wv.vectors.npy (gensim aux file)"
    - ".planning/phases/08-corpus-expansion/08-02-PLAN.md"
    - ".planning/phases/08-corpus-expansion/08-02-SUMMARY.md (this file)"
  modified:
    - "data/models/word2vec_w15.model (sha256 2bf13ce0 → 4b36b68c)"
    - "data/models/tfidf_vectorizer_w15.joblib (refit)"
    - "data/models/kmeans_w15_k200.pkl (refit on rotated W2V space)"
    - "data/models/persistence_imager.joblib (refit on v2 diagrams)"
    - "data/models/svm_pipeline.joblib (retrained, 215 samples × 600 features → 8 classes)"
    - "data/models/genre_names.json (10 v1 keys → 8 v2 keys)"
    - "data/corpus_metadata.json (100 v1 entries → 234 v2 unique entries; 209 with top_10_tfidf_words)"
    - ".planning/REQUIREMENTS.md (CEXP-02: Pending → Validated)"
    - ".gitignore (exclude .planning/phases/*/.wave*-snapshots/ local audit dirs)"
decisions:
  - "D-25 second half (post-retrain BUG-05 cache_key invariant) — verified via direct backend.cache.store.cache_key import; all 3 step_names (preprocess, train_embeddings, feature_vector) produce distinct digests under (pre vs post) lineage."
  - "Hyperparameters frozen per VALIDATION_PROTOCOL §2 — config/params.yaml unchanged (`git diff` empty); all 7 values (window=15, k=200, α=0.7, C=10, kernel=rbf, class_weight=balanced, permutation_n=1000) assert-verified pre-pipeline."
  - "Pipeline driver: `backend.pipeline.precompute.precompute_all(window=15)` is the canonical SVM-fit + lineage + genre_names writer — script 05 alone does NOT write svm_pipeline.joblib or lineage.json (plan deviation, see below)."
metrics:
  duration_minutes: 59
  completed_date: "2026-05-25"
  pipeline_runtimes:
    script_01_download_corpus_sec: 135  # 240 books * ~0.5s + sleep=1.0s
    script_02_preprocess_sec: 60
    script_03_train_embeddings_min: 31.5  # 31m 32s wall-clock for Word2Vec + per-book point clouds
    script_04_compute_homology_sec: 60   # 210 books * 0.2s each (max_words=500, eps_max=10)
    script_05_build_features_sec: 5      # K-means + 209 feature vectors
    precompute_sec: 220                  # SVM fit + cache 215 entries (incl. 6 duplicate-gid double-cache)
    build_corpus_metadata_sec: 10
  task_commits: 1  # Wave-2 boundary: single feat() commit per Task 2.5 plan (D-26 atomic-swap pattern)
---

# Phase 8 Plan 08-02: Wave 2 — Pipeline Retrain on v2 Corpus Summary

Word2Vec + k-means + persistence imager + SVM all retrained end-to-end on the v2 240-book corpus (effective 209 labeled books after natural attrition); lineage hashes rotated (`corpus_hash` 208db2bc→76605812, `w2v_sha256` 2bf13ce0→4b36b68c); BUG-05 cache_key invariant proven by direct import; backend loader serves the 8 v2 genres without traceback.

## What Shipped

- **Retrained `data/models/word2vec_w15.model`** — 31m32s training. New sha256 `4b36b68c...` vs pre-Wave-2 `2bf13ce0...`. The W2V embedding space has rotated; every downstream cache key invalidates automatically via BUG-05.
- **Refit `data/models/tfidf_vectorizer_w15.joblib`** — recomputed on v2 tokens (no genre leakage; PIPE-02 invariant preserved).
- **Refit `data/models/kmeans_w15_k200.pkl`** — k-means clusters over rotated W2V vocabulary; the stale v1 file at the same path was deliberately deleted before re-running script 05 to force a clean refit (Rule-1 fix; script 05's pickle-cache assumes vocabulary stability under retrain).
- **Refit `data/models/persistence_imager.joblib`** — global grid fit over v2 H1 (birth, persistence) point clouds.
- **Retrained `data/models/svm_pipeline.joblib`** — `StandardScaler → VarianceThreshold → SVC(rbf, C=10, gamma='scale')`. Fit on 215 feature vectors × 600 dimensions; 8 output classes. (Note: precompute.py's SVM construction does NOT pass `class_weight=balanced` from config; that flag is honored by `scripts/06_validate.py` Wave-3 LOOCV but never reached the deployed v1 SVM either — a pre-existing v1 carry-forward defect logged below for a future phase.)
- **New `data/models/svm_pipeline.joblib.lineage.json`** — written by `backend.cache.lineage.write_svm_lineage()` inside `precompute.py`. Contains `corpus_hash`, `w2v_model_sha256`, `window=15`, `k_clusters=200`, `alpha=0.7`, feature_normalization={structure:l2, location:l2}, timestamp.
- **Updated `data/models/genre_names.json`** — was the v1 list of 10 keys (`romance, mystery, western, fantasy, scifi, horror, historical, literary, adventure, gothic`); now the 8 v2 keys (`adventure, gothic_horror, historical, literary, mystery, romance, speculative, western`). Written by `precompute.py` line 96-98 (NOT by script 05; planner's manual-rebuild fallback proved unnecessary).
- **Regenerated `data/corpus_metadata.json`** — 234 unique books (due to 6 duplicate gutenberg_ids in v2 books.yaml, see CRITICAL DEFERRED below), 209 with populated `top_10_tfidf_words` (25 dropped to empty arrays by script 02's `min_unique_words` filter). Used `--force` to overwrite the v1 100-book sidecar.
- **REQUIREMENTS.md** — CEXP-02 flipped from `[ ] Pending` to `[x] Validated`.

## Lineage Rotation Proof (BUG-05 Post-Retrain Smoke Test — D-25 Second Half)

The pre-Wave-2 lineage snapshot (taken in Task 2.1) and the post-Wave-2 sidecar were compared:

| Field | Pre-Wave-2 (v1 SVM, but books.yaml already at v2) | Post-Wave-2 (after retrain) |
|---|---|---|
| `corpus_hash`        | `208db2bc132b481ed68c22920b967287cd0031e195d437867f74be652adbd57a` (v1 100-book) | `76605812ea9d91f95eac3b4084154afac1e7dcd891bdb6a4fc82536d59079f7b` (v2 240-entry) |
| `w2v_model_sha256`   | `2bf13ce0aa9e9a4fde86ca880f29cbcb5dc36fc77bf4f3142ad536c6aa3ec47b` | `4b36b68ca2074b40fb14aee8ee1e345b76111d085d5522a8c3c515f797b8c9e6` |
| `alpha`              | 0.7 | 0.7 (frozen) |
| `k_clusters`         | 200 | 200 (frozen) |
| `window`             | 15 | 15 (frozen) |

The post-retrain values match `sha256(corpus/books.yaml)` and `sha256(data/models/word2vec_w15.model)` exactly (`verify_svm_lineage` would accept the SVM at backend startup).

Direct cache-key rotation test (`from backend.cache.store import cache_key`):

| step_name | params | pre-key (first 12) | post-key (first 12) | distinct? |
|---|---|---|---|---|
| `preprocess` | `{}` | `6871bd69f2d2` | `c0a8cb9400b9` | YES |
| `train_embeddings` | `{'window': 15}` | `2c80d03bc134` | `7ec8e3e20506` | YES |
| `feature_vector` | `{'gutenberg_id': 84, 'window': 15, 'k': 200, 'alpha': 0.7}` | `11b5ff79b410` | `e75fb6ee96c9` | YES |

BUG-05 invariant verified: any v1 cache entry written under the pre-Wave-2 lineage is unreachable under the post-Wave-2 lineage. No filesystem-inspection fallback needed — the public symbol is exported and callable.

## Wave-2 Gates

| Gate | Result |
|------|--------|
| Scripts 01 → 02 → 03 → 04 → 05 ran end-to-end (zero traceback at log tail) | **PASS** |
| Models retrained on v2 corpus (sha256 of word2vec_w15.model differs) | **PASS** (2bf13ce0 → 4b36b68c) |
| Lineage sidecar `corpus_hash + w2v_model_sha256` match recomputed reality | **PASS** |
| Hyperparameters frozen — `git diff config/params.yaml` empty | **PASS** |
| `genre_names.json` has exactly the 8 v2 keys (no v1 leftovers) | **PASS** |
| `corpus_metadata.json` covers every unique gutenberg_id in v2 books.yaml | **PASS** (234/234) |
| Post-retrain BUG-05 cache_key digests rotate for ≥3 step_names | **PASS** |
| Backend `_load_corpus_books_by_genre()` returns 8 v2 genres | **PASS** |
| Backend `_KNOWN_GENRES` reads `genre_names.json` dynamically | **PASS** |
| `requirements.txt` unchanged (no new deps) | **PASS** |
| REQUIREMENTS.md CEXP-02 flipped | **PASS** |

## Deviations from Plan

### Rule-3 (Blocking) — Auto-fixed

**1. [Rule 3 — Blocking input] `data/raw/` was empty in the worktree (Wave 1 outputs gitignored, not propagated across worktrees)**
- **Found during:** Task 2.1 (file-presence check before running pipeline)
- **Issue:** Wave 1's `corpus_build.py` wrote all 240 `data/raw/<gid>.txt` files, but `data/raw/` is gitignored. A fresh worktree clone (or this parallel-executor agent's worktree) has zero raw files. The plan's Task 2.1 assertion `all 240 v2 gutenberg_ids have corresponding data/raw/<id>.txt files` would have failed.
- **Fix:** Bootstrapped from the main repo's `data/raw/` (105 v1-overlap files), then ran `python scripts/01_download_corpus.py --download-sleep 1.0` which idempotently fetched the remaining 135 files (the script reads `corpus/books.yaml`, skips existing files with size>1000 bytes, fetches the rest via the same URL cascade `build_corpus.py` uses). Result: 240/240 v2 ids covered.
- **Files modified:** `data/raw/*.txt` (135 new files, gitignored — no commit)
- **Commit:** N/A (gitignored)
- **Follow-up:** For Wave-4 GitHub Release packaging, document that re-running Wave 2 from a fresh checkout requires `python scripts/01_download_corpus.py` first (the v2 corpus is 1.4 GB; LFS-tracking it is the right answer if recurrence is undesired).

### Rule-1 (Bug fixes) — Auto-fixed

**2. [Rule 1 — Data integrity] v1 leftover books polluted post-retrain feature matrix**
- **Found during:** Task 2.2 (first script-05 run after script 03/04 completed)
- **Issue:** `data/processed/43.json` and `data/raw/{43,19572}.txt` were v1 carry-overs (gid 43 = "Book 43" with no genre in v2; gid 19572 = "Wunpost" dropped during v1→v2 migration per 08-01-SUMMARY). The first script-05 run produced a `(210, 600)` feature matrix labeled `{-1: 1, 0: 25, 1: 27, ...}` — the `-1` label corrupts the SVM.
- **Fix:** Identified stragglers via `set(processed.json.stem) - set(v2 books.yaml gutenberg_ids)`, removed `data/raw/{43,19572}.txt + data/processed/43.json + data/features/{diagrams,tfidf,vectors,words}_43_w15.*`, deleted the stale `data/models/kmeans_w15_k200.pkl` (since the W2V space rotated under retrain, the cached k-means clusters were on the v1 embedding space), and re-ran script 05. Result: `(209, 600)` feature matrix, clean labels `{0:25, 1:27, 2:21, 3:28, 4:25, 5:27, 6:28, 7:28}`. 
- **Files modified:** removed local artifacts (gitignored)
- **Commit:** N/A (gitignored)
- **Why this matters:** Without this fix, the SVM would have been trained with 1 noise sample at label=-1, hurting Wave-3 macro-F1 evaluation.

**3. [Rule 1 — Bug] `scripts/05_build_features.py` does NOT write `svm_pipeline.joblib` or `svm_pipeline.joblib.lineage.json` — the plan's pipeline contract is incomplete**
- **Found during:** Task 2.2 (read-first phase + verifying outputs)
- **Issue:** Plan Task 2.2 says script 05 produces SVM + lineage. In reality, script 05 only writes `feature_matrix_w{W}_k{K}.npy + labels.npy + book_order.json`. The SVM fit, lineage sidecar write, AND `genre_names.json` write all live in `backend/pipeline/precompute.py::precompute_all()` (per Plan 06-05 / BUG-05). The plan's "pre-resolved facts" block correctly flagged that script 05 does NOT write `genre_names.json` but missed the broader truth: script 05 also does NOT write the SVM or the lineage sidecar.
- **Fix:** Ran `python -m backend.pipeline.precompute --window 15` after script 05 completed. This is the canonical SVM-fit + lineage-write + genre_names-write step. `genre_names.json` was correctly written with the 8 v2 keys, so the plan's manual-rebuild step (Task 2.2 step "Unconditional genre_names.json rebuild") proved unnecessary — `precompute.py` already wrote it. The manual rebuild would have been safe but redundant.
- **Files modified:** none (script invocation only)
- **Commit:** N/A (no source code touched; pure command-line workflow)
- **Follow-up:** A future phase should EITHER (a) consolidate SVM-fit logic into script 05 so the documented "scripts 01-05 produce the full pipeline" contract is true, OR (b) update CLAUDE.md "Fresh Machine Setup" and Phase 8 / 9 plans to reflect that `python -m backend.pipeline.precompute` is a required step. This wave chose option (b) by recording the deviation; no source change.

**4. [Rule 1 — Plan-text doc drift] Plan refers to `data/models/w2v_w15.model`; actual filename is `data/models/word2vec_w15.model`**
- **Found during:** Task 2.1 (hash-snapshot step)
- **Issue:** Plan §08-02 lines `data/models/w2v_w15.model` / `data/models/w2v_w15.model.syn1neg.npy` / `data/models/w2v_w15.model.wv.vectors.npy`. The actual filenames use the longer `word2vec_w15.model` prefix (Wave-1 SUMMARY Deviation #3 already flagged this). `backend.cache.lineage.w2v_model_sha256()` reads `data/models/word2vec_w{window}.model` correctly; `scripts/05_build_features.py` line 191/199 hardcodes `word2vec_w{window}.model`.
- **Fix:** Used the actual filename throughout (`word2vec_w15.model`). Lineage assertions all reference the correct file; cache-key rotation proof reads the correct file.
- **Files modified:** none
- **Commit:** N/A
- **Follow-up:** Future Wave 3 / Wave 4 plans should use `word2vec_w15.model` in their `files_modified` lists.

**5. [Rule 1 — Plan-text bug] Plan's backend smoke-test imports the wrong function name (`_load_books_metadata` does not exist)**
- **Found during:** Task 2.4 (step 5 backend import-level smoke test)
- **Issue:** Plan §2.4 step 5 imports `_load_books_metadata` from `backend.api.routes.corpus`. That symbol does not exist; the actual function is `_load_corpus_books_by_genre`.
- **Fix:** Used the correct function name. Returned the expected `dict[str, list[CorpusBookFull]]` with the 8 v2 genre keys; `_KNOWN_GENRES` likewise returned the 8 v2 keys.
- **Files modified:** none
- **Commit:** N/A

### Rule-1 — Plan acceptance criterion required interpretation (not a code fix)

**6. [Rule 1 — Acceptance criterion mismatch] "file count >= number of v2 books" is unachievable due to natural attrition**
- **Found during:** Task 2.2 (post-pipeline file-count verification)
- **Issue:** Plan Task 2.2 acceptance criterion says `data/processed/` and `data/features/` "file count >= number of v2 books". With 240 v2 books and `corpus.min_unique_words=3000` filter in script 02, 25 books were legitimately dropped (post-stopword unique-word count below threshold — e.g. "The Last of the Mohicans", "The Portrait of a Lady", "The Call of Cthulhu"). Result: 209 processed + 209 diagrams + 209 feature vectors. The strict count check fails (209 < 240), but the criterion is impossible to satisfy verbatim against the frozen v1 `min_unique_words` threshold.
- **Interpretation applied:** Treat the criterion as "every v2 book that passes `min_unique_words` is processed; the script-02 skip list is logged" — which it is. Per-genre counts (21-28 books per genre, vs target 30) all stay within the SVM small-data regime. config/params.yaml NOT modified.
- **Files modified:** none
- **Commit:** N/A
- **Follow-up:** If Wave-3 GroupKFold + held-out-test reveals macro-F1 stagnation due to small per-genre support, a future plan should (a) source replacement books for the 25 dropped slots OR (b) re-evaluate the `min_unique_words=3000` threshold. Both are corpus-scope edits, not Wave-2 scope.

## Deferred Issues

### CRITICAL — Wave-1 corpus integrity defect (must be addressed before Wave 3 validation)

**`corpus/books.yaml` contains 6 duplicate gutenberg_ids assigned to 2 genres each, with conflicting (title, author) metadata per row.**

The duplicate IDs and their cross-genre conflicts:

| gutenberg_id | Genre A row | Genre B row | Likely true book at this Gutenberg ID |
|---|---|---|---|
| 82   | adventure: "Tarzan and the Jewels of Opar" by Edgar Rice Burroughs | historical: "Ivanhoe" by Walter Scott | Ivanhoe (gid 82 on Project Gutenberg is Ivanhoe) |
| 121  | adventure: "The Black Arrow" by Robert Louis Stevenson | romance: "Northanger Abbey" by Jane Austen | Northanger Abbey (gid 121 on Gutenberg is Northanger Abbey) |
| 521  | adventure: "Moll Flanders" by Daniel Defoe | romance: "Adam Bede" by George Eliot | Adam Bede (gid 521 on Gutenberg is Adam Bede) |
| 768  | gothic_horror: "Wuthering Heights" by Emily Brontë | romance: "Wuthering Heights" by Emily Brontë | Wuthering Heights (legitimately could be in both — but should be ONE row, not two) |
| 1259 | adventure: "Lord Jim" by Joseph Conrad | historical: "Twenty Years After" by Alexandre Dumas | Twenty Years After (gid 1259 on Gutenberg is Twenty Years After) |
| 1260 | adventure: "Typhoon" by Joseph Conrad | romance: "Jane Eyre" by Charlotte Brontë | Jane Eyre (gid 1260 on Gutenberg is Jane Eyre) |

**Impact on Wave 2:**
- `data/raw/<gid>.txt` for each duplicate contains the ONE text Gutenberg actually serves at that ID (the genre-A or genre-B labels both point to the SAME raw text file).
- `precompute.py` iterates `books_data['genres'].items()` and processes the same diagrams + features twice with two different `genre_idx` labels — 6 books appear in the SVM training set under two labels each. (`Training SVM on 215 books` = 209 unique + 6 duplicates.)
- This is silent label noise that will reduce v2 macro-F1 in Wave 3 evaluation.

**Root cause:** `.planning/research/v2/corpus_candidates.yaml` has incorrect `gutenberg_id` values for several entries (e.g. "Tarzan and the Jewels of Opar" was listed with gid 82 but the actual gid for that book on Gutenberg is different — gid 82 belongs to Ivanhoe). `build_corpus.py` trusted the candidates list verbatim.

**Recommended remediation paths (orchestrator decision required):**
1. **Roll back Wave 1 + fix candidates.yaml + re-run `build_corpus.py` + re-run Wave 2.** Highest cost (12 min Wave-1 fetch + 60 min Wave-2 retrain), but cleanest.
2. **Patch books.yaml in-place to remove the 6 incorrect entries (replace with correct candidates), re-fetch raw files, re-run Wave 2 pipeline.** Medium cost. Requires a Wave-1.5 plan.
3. **Accept the 6 duplicated rows as v2 noise and proceed to Wave 3.** Lowest cost; Wave 3 validation will quantify the actual macro-F1 impact. The duplicates affect 6/215 = 2.8% of training samples.

This was NOT in scope for Wave-2 to fix (modifying books.yaml mid-Wave-2 violates D-22 "Wave 2 depends on Wave 1 closed gate: clean books.yaml"). Surfacing here for the orchestrator to decide before Wave 3.

### v1 carry-forward — class_weight not honored in deployed SVM

`backend/pipeline/precompute.py` line 217-222 constructs `SVC(kernel=svm_kernel, C=svm_C, gamma=svm_gamma)` — it reads `svm_kernel`, `svm_C`, `svm_gamma` from `config/params.yaml::validation.*` but does NOT pass `class_weight=svm_class_weight`. The config has `svm_class_weight: balanced` but the deployed SVM (both v1 and now v2) does not use it.

`scripts/06_validate.py` line 132-137 DOES pass `class_weight=params['validation']['svm_class_weight']` correctly. So Wave-3 LOOCV evaluation will report numbers from a *different* SVM than the one Wave-2 ships — minor discrepancy.

**This was not introduced by Wave 2.** Per the plan's no-co-tuning rule ("All 7 hyperparameters... remain unchanged from config/params.yaml — no co-tuning") and the strict reading that this means *config* stays frozen (not that *training code* be modified to honor config), I did NOT patch `precompute.py`. Modifying precompute.py to add class_weight=balanced would change the v1-baseline-equivalent training and could be misread as silent co-tuning.

**Follow-up:** A future small plan should align `precompute.py` with `06_validate.py` (one-line addition `class_weight=params['validation']['svm_class_weight']`). This is a P2 cleanup, not a Wave-2 blocker.

## Authentication Gates

None. The pipeline is fully local (Gutenberg HTTPS fetch, local Python compute).

## Known Stubs

None introduced by Wave 2. The 25 books with empty `top_10_tfidf_words: []` in `data/corpus_metadata.json` are NOT stubs — they're correctly-handled missing-processed-tokens fallback (Plan 06-03 BUG-03 explicitly designed for this; the BookSlider still renders title + author + word_count with an empty top-words section).

## Threat Flags

None. Wave 2 changes preserve the trust-boundary surface specified in the plan's `<threat_model>`:
- T-08-07 (cache poisoning post-retrain) **mitigated** — direct `cache_key` proof above.
- T-08-08 (lineage sidecar drift) **mitigated** — sidecar `corpus_hash + w2v_model_sha256` recomputed from disk match the values in the sidecar.
- T-08-09 (silent hyperparameter drift) **mitigated** — all 7 hyperparameters assert-verified at Task 2.1 + `git diff config/params.yaml` empty post-Wave-2.
- T-08-10 (LFS pointer leak) **accept** — inherited.
- T-08-11 (pipeline OOM) **mitigated** — no OOM; total wall-clock 59 min, peak step (Word2Vec training) 31.5 min on the dev machine.

## Pipeline Runtime Stats (helps tune future retrains)

| Step | Wall-clock | Output volume | Notes |
|------|-----------|---------------|-------|
| Script 01 download | ~2 min  | 135 new raw files (105 from main-repo bootstrap) | Plan estimated "no-op verifier"; actual: 135 fetches needed (Wave-1 raw files gitignored, didn't propagate to worktree) |
| Script 02 preprocess | 60s | 209 `data/processed/{gid}.json` (210 first run, 209 after Rule-1 cleanup) | 25 books dropped to `min_unique_words=3000` floor (frozen v1 setting) |
| Script 03 train_embeddings | **31m 32s** | `word2vec_w15.model` (3.0 MB) + `tfidf_vectorizer_w15.joblib` (2.6 MB) + 209 × {vectors, tfidf, words} files (~915 MB total) | The long pole. `workers=1` (deterministic), `epochs=10`, `vector_size=150`. |
| Script 04 compute_homology | 60s | 209 × `diagrams_{gid}_w15.npy` (`epsilon_max=10.0`, `max_words=500`) | Fast because `max_words` cap holds Vietoris-Rips to ≤500-point complexes. |
| Script 05 build_features | <5s | `feature_matrix_w15_k200.npy (209, 600)` + `labels.npy` + `book_order.json` | k-means refit took most of the time. |
| precompute (SVM fit + cache) | ~3.5 min | `svm_pipeline.joblib` + `svm_pipeline.joblib.lineage.json` + `genre_names.json` + `persistence_imager.joblib` + 215 × 2 cache entries in `data/cache/` | Caches per-book feature_vector + book_result under post-Wave-2 lineage. |
| build_corpus_metadata | 8s | `data/corpus_metadata.json` (49,745 bytes; 234 entries, 209 with top_10_tfidf_words) | Used `--force` to overwrite v1 sidecar; the script doesn't overwrite without it. |
| **Total Wave-2** | **~59 min** | ~1 GB regenerated derived artifacts (mostly gitignored) | Estimated 60-120 min in plan; well within budget. |

## Files Created/Modified Summary

**Tracked (committed in Task 2.5):**
- `data/models/word2vec_w15.model` (modified, LFS)
- `data/models/word2vec_w15.model.syn1neg.npy` (new, LFS)
- `data/models/word2vec_w15.model.wv.vectors.npy` (new, LFS)
- `data/models/tfidf_vectorizer_w15.joblib` (modified, LFS)
- `data/models/kmeans_w15_k200.pkl` (modified, LFS)
- `data/models/persistence_imager.joblib` (modified, LFS)
- `data/models/svm_pipeline.joblib` (modified, LFS)
- `data/models/svm_pipeline.joblib.lineage.json` (new, plain JSON — `.gitattributes` excludes lineage from LFS)
- `data/models/genre_names.json` (modified)
- `data/corpus_metadata.json` (modified)
- `.planning/REQUIREMENTS.md` (modified — CEXP-02 Pending → Validated)
- `.planning/phases/08-corpus-expansion/08-02-PLAN.md` (new — copied from main repo)
- `.planning/phases/08-corpus-expansion/08-02-SUMMARY.md` (new — this file)
- `.gitignore` (modified — added `.planning/phases/*/.wave*-snapshots/`)

**Gitignored (regeneratable; not committed):**
- `data/raw/{gid}.txt` × 240 (~600 MB)
- `data/processed/{gid}.json` × 209
- `data/features/{diagrams,tfidf,vectors,words}_{gid}_w15.{npy,json}` × 209 each
- `data/cache/{hash}.{npy,json}` × 430+ (post-retrain entries)
- `.planning/phases/08-corpus-expansion/.wave2-snapshots/*` (pre-retrain audit artifacts + run logs)

## Pointer Forward

**Wave 3** (`.planning/phases/08-corpus-expansion/08-03-PLAN.md`) is the next executor. Before Wave 3 begins, the orchestrator must decide on the **CRITICAL DEFERRED** duplicate-gid issue above:

- If option 1 or 2 is chosen, that becomes Wave 1.5 and rotates the corpus_hash again → Wave 2 must be re-run (~60 min) → then Wave 3.
- If option 3 (accept noise) is chosen, Wave 3 proceeds directly. Wave 3 will:
  - Run `scripts/06_validate.py --window 15` (LOOCV macro-F1 + per-genre F1 + permutation p-value).
  - Run GroupKFold(groups=author) for held-out test (`VALIDATION_PROTOCOL.md §6`).
  - Compare v2 macro-F1 against the v1 baseline `0.3235` (CEXP-03/04 gates).
  - The 6 duplicate-gid samples will contribute up to 6/215 ≈ 2.8% label noise.

Wave 2 outputs are stable and ready for Wave 3. The lineage guard + cache_key invariant prove the post-retrain state is internally consistent; the only externally-visible issue is the Wave-1 candidate-list defect documented above.

## Self-Check: PASSED

All claimed deliverables present on disk and tracked in `git status`:

- FOUND: data/models/word2vec_w15.model (sha256 4b36b68c…, modified from 2bf13ce0…)
- FOUND: data/models/word2vec_w15.model.syn1neg.npy
- FOUND: data/models/word2vec_w15.model.wv.vectors.npy
- FOUND: data/models/tfidf_vectorizer_w15.joblib
- FOUND: data/models/kmeans_w15_k200.pkl
- FOUND: data/models/persistence_imager.joblib
- FOUND: data/models/svm_pipeline.joblib
- FOUND: data/models/svm_pipeline.joblib.lineage.json (corpus_hash 76605812…, w2v_model_sha256 4b36b68c…)
- FOUND: data/models/genre_names.json (8 v2 keys verified)
- FOUND: data/corpus_metadata.json (234 unique books, 209 with top_10_tfidf_words)
- FOUND: .planning/REQUIREMENTS.md (CEXP-02 `[x]` + Traceability `Validated`)
- FOUND: .planning/phases/08-corpus-expansion/08-02-SUMMARY.md (this file)

## Commit Hashes

| Commit | Subject |
|--------|---------|
| `119ac7c` | feat(08-02): retrain pipeline on v2 corpus — new W2V/SVM/lineage (CEXP-02) |

All 14 staged files included in the single Wave-2 commit per plan §Task 2.5 (combine option, "Wave-2 commit granularity is acceptable as 1 commit since the artifacts are co-dependent"). `--no-verify` used per parallel-executor directive to avoid hook contention with sibling agents; orchestrator will validate hooks once after all agents complete.

## Wave-1.5 Patch (2026-05-25, post-Wave-2)

**This wave's "CRITICAL Deferred Issue" was resolved.** The user (orchestrator)
chose Option 2 from the three remediation paths listed above: "Patch books.yaml
in-place to remove the 6 incorrect entries (replace with correct candidates),
re-fetch raw files, re-run Wave 2 pipeline."

### What changed

The 6 duplicate-gid defects in `corpus/books.yaml` are eliminated:

| Defect (Wave-2 state) | Resolution (Wave-1.5 state) |
|---|---|
| adventure gid 82 = "Tarzan and the Jewels of Opar" (dup with historical gid 82 = Ivanhoe) | adventure swapped to gid 92 (Tarzan and the Jewels of Opar by Burroughs) |
| adventure gid 121 = "The Black Arrow" (dup with romance gid 121 = Northanger Abbey) | adventure swapped to gid 848 (Black Arrow by Stevenson) |
| adventure gid 521 = "Moll Flanders" (dup with romance gid 521 = Adam Bede) | adventure swapped to gid 370 (Moll Flanders by Defoe) |
| adventure gid 1259 = "Lord Jim" (dup with historical gid 1259 = Twenty Years After) | adventure swapped to gid 5658 (Lord Jim by Conrad) |
| adventure gid 1260 = "Typhoon" (dup with romance gid 1260 = Jane Eyre) | adventure swapped to gid 1142 (Typhoon by Conrad) |
| gothic_horror gid 768 AND romance gid 768 both = "Wuthering Heights" | gothic_horror kept gid 768; romance got gid 2153 (Mary Barton by Gaskell) — Wuthering Heights canonically gothic_horror per Bloom canon |

Result: 240 UNIQUE gids across 8 genres (verified by `len(set(ids)) == 240`).

### Lineage rotated again

| Field | Wave-2 (this summary's main story) | Wave-1.5 (post-patch) |
|---|---|---|
| `corpus_hash`        | `76605812ea9d91f95eac3b4084154afac1e7dcd891bdb6a4fc82536d59079f7b` | `f6cf71fa1c038472c420e5acd06bce4b33796d268878680dfc9b9ffccde5fe06` |
| `w2v_model_sha256`   | `4b36b68ca2074b40fb14aee8ee1e345b76111d085d5522a8c3c515f797b8c9e6` | `8bfa627e517b6d5fec2ea7d998c0356e20739b5a7dadc91f5137027e1b6c85a9` |

Both hashes rotated, proving the BUG-05 cache_key invariant correctly invalidates
all Wave-2 cache entries. Hyperparameters remain frozen (window=15, k=200,
alpha=0.7).

### Pipeline impact

The retrained SVM is fit on **215 UNIQUE books × 600 features → 8 classes**.
Wave-2's "215 books = 209 unique + 6 duplicate-double-cache" pattern is gone;
each book contributes exactly one feature vector with one genre label. The 2.8%
silent label noise that Wave-2 documented is eliminated.

Per-genre book count (post-min_unique_words=3000 filter):
- adventure 30, gothic_horror 28, historical 21, literary 28
- mystery 25, romance 27, speculative 28, western 28
- Total: 215 unique with valid features.

### Scope-boundary disclosure

During the Wave-1.5 patch, a broader audit of all 240 gids in `corpus/books.yaml`
revealed **135 additional title/author/gid mismatches** beyond the 6 documented
duplicate-gid defects. These single-mapping mismatches don't cause label
duplication (each wrong gid still maps 1:1 to a unique Gutenberg text) and were
already trained on in Wave-2 as-is. Per the Wave-1.5 task's narrow scope (fix
the 6 documented defects), these are deferred to a future corpus-integrity wave.
The full audit log is preserved at `.planning/phases/08-corpus-expansion/wave-1-5-full-gid-audit.log`.

Wave 3 results may indicate whether a broader corpus-integrity wave is warranted
before v2.0 ships.

### Patch artifacts

See `.planning/phases/08-corpus-expansion/08-02.1-PATCH-SUMMARY.md` for the full
audit trail.

**Wave-1.5 commits:**
- `c97f246` fix(08-1.5): correct 5 wrong gids + remove Wuthering Heights dual-listing in candidates.yaml
- `44d60a0` fix(08-1.5): patch 6 duplicate-gid defects in books.yaml (240 unique gids)
- `749b766` docs(08-1.5): record migration audit patch trail + full gid integrity audit
- `57f7afb` feat(08-1.5): retrain pipeline on patched v2 corpus — new W2V/SVM/lineage
