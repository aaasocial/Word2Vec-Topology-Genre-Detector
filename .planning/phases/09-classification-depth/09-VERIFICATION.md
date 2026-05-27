---
phase: 09-classification-depth
verified: 2026-05-27T18:53:00Z
status: human_needed
score: 5/5 must-haves verified (automated); 7 UAT items require human walkthrough
overrides_applied: 0
human_verification:
  - test: UAT-01 — Top-N expander interaction
    expected: 3 horizontal bars visible by default sorted descending; "+5 more" reveals all 8; percent labels XX.X%; no permanent hiding
    why_human: requires live upload + click interaction in browser; automated tests cover render contract but not visual UAT
  - test: UAT-02 — 410 expired path
    expected: After 5+ min, Why-button renders the canonical "Upload expired — re-upload to see the explanation." prompt pointing at the existing UploadZone; no silent retry
    why_human: requires waiting past 5-min Redis TTL OR manual Redis eviction; not automated in unit suite
  - test: UAT-03 — Happy-path explain panel
    expected: NearestBooksList 5 rows with title/author/genre/distance; TrackContributionBars topology + vocabulary with direction glyphs and pcts summing to 100; DrivingWordsPills with D-46 disclosure; uncertainty + footnote visible
    why_human: requires live upload + click "Why this genre?" with running backend + Redis to exercise the full payload
  - test: UAT-04 — 503 uncalibrated path
    expected: With a pre-Phase-9 SVM lineage missing calibration_method, /explain returns 503 routed to onUncalibrated; panel renders the calibration-required message; /classify still serves single-genre
    why_human: requires either a pre-Phase-9 SVM artifact OR mutating lineage.json to omit calibration_method; not automated
  - test: UAT-05 — Walkthrough Step 7 navigation
    expected: Step indicator shows "Step 7 / 7" with 7 dots; copy contains "upper bound" 3x; no retraction terms; validation report link opens on GitHub in new tab
    why_human: requires manual click-through of pipeline walkthrough dialog and visual inspection of step indicator
  - test: UAT-06 — Reliability diagram visual sanity
    expected: results/figures/v2_calibration_reliability.png has 8 subplots, both methods plotted with 5-bin binning; libsvm_platt curves closer to the diagonal at high probability; numbers match the Brier table
    why_human: visual inspection of a PNG against the markdown table
  - test: UAT-07 — Entropy badge fires appropriately on real uploads
    expected: A clearly-classifiable upload (Pride and Prejudice) does NOT render the badge; a borderline upload fires the badge with D-52 canonical tooltip text
    why_human: requires uploading specific books and observing badge behaviour live
---

# Phase 9: Classification Depth Verification Report

**Phase Goal:** Classification results show ranked, calibrated alternatives and an honest "why this genre?" explanation that users can interrogate. Built on the final SVM from Phase 8.

**Verified:** 2026-05-27T18:53:00Z
**Status:** human_needed (all automated must-haves PASS; 7 UAT items still need a human run-through per 09-VALIDATION.md)
**Re-verification:** No — initial verification.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | Top-3 calibrated predictions summing to 1, rendered as probability bars; no pie chart; no hidden low-confidence | ✓ VERIFIED | `python -c "...svm.predict_proba(np.zeros((1,600)))..."` returned shape `(1, 8)`, sum `1.0`, classes `[0..7]`. `TopNList.tsx:23` slices `topN.slice(0, DEFAULT_VISIBLE=3)`; `:89-106` renders "+N more" expander for hiddenCount; `:67,84` formats to 1 decimal via `(p.probability * 100).toFixed(1)`. Grep for `pie|Pie|PieChart` across `frontend/src` returned zero matches. |
| SC-2 | "Why this genre?" returns 5 nearest training books in L2-normalized feature space with Euclidean distance + title + author + genre; Redis-cached for instant re-click | ✓ VERIFIED | `backend/api/routes/explain.py:54-216` implements POST `/api/classify/{job_id}/explain` with 410/503/404; cache key `explain:{sha256(feature_vec)}:{w2v_model_sha256[:16]}` via `explain.py:218-230`; TTL `EXPLAIN_CACHE_TTL_SECONDS = 3600` (`routes/explain.py:51`). `find_nearest_training_books` (`explain.py:141-166`) returns `{gutenberg_id, title, author, genre, distance}`; `nn_index` fitted with `metric='euclidean', n_neighbors=5` in `app.py:113`. Backend p50 = 15 ms cache-miss / 1 ms cache-hit per 09-03 SUMMARY measurement (well under the ~200 ms target). NearestBooksList.tsx:30-87 renders 5 rows with all four required fields. |
| SC-3 | Topology-vs-vocabulary track contributions as percentages summing to 100 via per-track permutation_importance equivalent | ✓ VERIFIED | `compute_track_contributions` (`explain.py:98-138`) implements batched 3-row zero-ablation (one `predict_proba` call on `(3, n_features)`); pcts derived as `100 * abs(contrib) / total` which guarantees sum-to-100 by construction; sign separated as `direction` field per Q3. ROADMAP wording says "per-track permutation_importance"; D-44 documents zero-ablation as the mathematically-equivalent operational choice (rejected synchronous SHAP per PITFALLS §8). `TrackContributionBars.tsx:31-100` renders both bars with direction glyph (↑/↓/·) and `pct.toFixed(1)%`. Math test `test_track_contributions_sums_to_100` verifies the invariant. |
| SC-4 (P2) | TF-IDF-driven "driving words" pills with "proxy, not literal" disclosure | ✓ VERIFIED | `compute_driving_words` (`explain.py:169-215`) produces `{word, tfidf, nearest_genre}` tuples via per-genre w2v centroid cosine attribution. `DrivingWordsPills.tsx:31-43` renders the canonical D-46 disclosure copy verbatim: "High-TF-IDF words from your upload, tagged with the nearest training genre by word-vector similarity. These are **proxies** for the cluster-distribution signal — not literal classifier inputs." The phrase "proxies" appears 2x and "not literal classifier inputs" 2x in the file (per 09-05 self-check). Backend route uses surrogate-via-vocab-slab path (`routes/explain.py:158-189`) since worker doesn't publish per-upload (word, tfidf) — honest-by-construction. |
| SC-5 (P2) | Top-N display includes entropy/uncertainty badge for ambiguous predictions | ✓ VERIFIED | `compute_uncertainty_metrics` (`explain.py:70-95`) computes `{entropy, top1_top2_gap, badge_fires}` with operative thresholds `ENTROPY_BADGE_DEFAULT_TOP1_TOP2_GAP = 0.2801` and `ENTROPY_BADGE_DEFAULT_NORMALIZED_ENTROPY = 0.7738` (`explain.py:33-34`). Worker (`jobs.py:194,207`) and routes (`explain.py:193`) both import `compute_uncertainty_metrics` — single source of truth, no literal duplication confirmed via grep. `UncertaintyBadge.tsx:18-39` renders only when `result.badge_fires === true` with D-52 canonical tooltip. ROADMAP wording mentions "top-2 within 10pp" but D-43 + 09-01 Q4 `tighten` decision documents the empirical 25/75 percentile thresholds (0.2801 / 0.7738) as the operative implementation, derived from the 53% hold-out fire rate. |

**Score:** 5/5 truths verified (3 P0 + 2 P2).

### Required Artifacts (Three-Level Verification)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `data/models/svm_pipeline.joblib` | Calibrated SVM `predict_proba` returning (1, 8) sum-to-1 | ✓ VERIFIED | `python -c "svm.predict_proba(np.zeros((1,600)))"` returned shape (1,8), sum 1.0. Wired by `app.py:62` lifespan and `worker/jobs.py:172` (`predict_top_n` call). |
| `data/models/svm_pipeline.joblib.lineage.json` | calibration_method=libsvm_platt, calibration_brier_score≈0.0481, calibration_report present | ✓ VERIFIED | Lineage JSON contains `calibration_method: "libsvm_platt"`, `calibration_brier_score: 0.04812763753149701`, `calibration_report: "results/v2_calibration_report.md"`. Read by `verify_svm_lineage` at lifespan boundary (`app.py:66-69`). |
| `data/models/explain_artifacts.npz` | Six keys: feature_matrix_l2 (151,600), book_metadata (151,) of dicts, per_genre_centroids (8,150), genre_names (8,), cluster_to_representative_words (200,) of lists, metadata dict with corpus_hash + w2v_model_sha256 | ✓ VERIFIED | `np.load` confirmed all 6 keys with expected shapes/dtypes; corpus_hash + w2v_model_sha256 match the SVM lineage byte-for-byte (`3f4fe9400b023f08` / `cd81f9e69cb2d127`). Wired by `app.py:96-114` lifespan and `routes/explain.py:130,153,162,163`. |
| `backend/pipeline/explain.py` | 7 helpers + 2 operative-threshold constants; single source of truth | ✓ VERIFIED | File contains `multiclass_brier_score`, `normalized_entropy`, `compute_uncertainty_metrics`, `compute_track_contributions`, `find_nearest_training_books`, `compute_driving_words`, `explain_cache_key`. Thresholds 0.2801 / 0.7738 declared exactly once at module level (`:33-34`); imported by `worker/jobs.py:194` and `routes/explain.py:193` (no duplicate literals). |
| `backend/api/routes/explain.py` | POST /api/classify/{job_id}/explain with 410/503/404/cache | ✓ VERIFIED | Endpoint at `:54-216` implements the 9-step flow documented in module docstring. UUID4 validation → calibration → artifacts → Redis → feature_vec → cache → compute → Pydantic validation → SET cache. Wired into `app.py:171` via `api_router.include_router(explain_router)`. 8 integration tests pass. |
| `backend/api/models.py` | 8 Phase 9 Pydantic models with extra='forbid' + length constraints | ✓ VERIFIED | `TopNPrediction`, `NearestTrainingBook`, `TrackContribution`, `TrackContributions`, `DrivingWord`, `UncertaintyMetrics`, `ExplainResponse`, `ExtendedClassifyResult` all present (`:66-172`). `nearest_training_books` constrained to `min_length=5, max_length=5`; `driving_words` to `max_length=15`. All have `model_config = {'extra': 'forbid'}`. |
| `backend/worker/jobs.py` | feature_vec Redis write (5-min TTL) + SSE result extension (top_n / entropy / top1_top2_gap / badge_fires) | ✓ VERIFIED | `:154-165` writes `feature_vec:{job_id}` as `float64.tobytes()` with `ex=300`; `:172-178` calls `predict_top_n`; `:197-208` emits the 4 new keys plus legacy keys. Single source of truth: top-1 derived from `top_n[0]` (Pitfall 1 honored). |
| `backend/api/app.py` | Lifespan loads svm + w2v + genre_names + lineage + explain_artifacts + nn_index | ✓ VERIFIED | `_load_phase9_state` at `:15-120` defaults all attrs to None first, then isolated try/except per sub-load. NearestNeighbors fitted with `n_neighbors=5, metric='euclidean'` (`:113`). Pitfall 5 drift check at `:103-111` compares artifact corpus_hash vs lineage corpus_hash. |
| `frontend/src/components/sidebar/ClassificationResult.tsx` | Mounts TopNList + UncertaintyBadge + Why-button + ClassificationExplain | ✓ VERIFIED | `:38` renders `<TopNList topN={topN} />`; `:34` renders `<UncertaintyBadge result={result} />`; `:45-62` renders the Why-button toggle; `:81` conditionally mounts `<ClassificationExplain />`. Backward-compat fallback at `:19` synthesizes single-row top-N when pre-Phase-9 SVM. |
| `frontend/src/components/sidebar/TopNList.tsx` | Top-3 visible + collapsible +5 more; 1-decimal labels; sorted descending (preserves backend order) | ✓ VERIFIED | `:23` `topN.slice(0, DEFAULT_VISIBLE=3)`; `:89-106` "+N more" button; `:67,84` `toFixed(1)`. Does NOT re-sort (test `preserves input order` enforces). |
| `frontend/src/components/sidebar/UncertaintyBadge.tsx` | Conditional render gated on badge_fires; D-52 canonical tooltip | ✓ VERIFIED | `:18-20` returns null when `badge_fires !== true`; `:12-15` declares the canonical tooltip text "Low confidence — top predictions are close..."; rendered via auto-escaped `title` attribute (`:24`). |
| `frontend/src/components/sidebar/NearestBooksList.tsx` | 5 books with title/author/genre/distance | ✓ VERIFIED | `:30-87` maps each book to row with color dot, title (ellipsis-truncated), `${author} · ${genre}`, and `distance.toFixed(3)`. Component does not pad — relies on backend `min_length=5, max_length=5` constraint. |
| `frontend/src/components/sidebar/TrackContributionBars.tsx` | Topology + vocabulary bars with direction glyph; pcts summing to 100 | ✓ VERIFIED | `:27-30` builds the two rows; `:13-23` direction glyph helper (↑/↓/·) and color (`#34D399` / `#F87171` / `#6B6B80`); does not recompute pcts — renders backend's truth (which is normalized to sum-to-100). |
| `frontend/src/components/sidebar/DrivingWordsPills.tsx` | Pills with D-46 disclosure copy | ✓ VERIFIED | `:30-43` renders the canonical D-46 disclosure copy verbatim with `<strong>proxies</strong>` emphasis. `:45-77` renders inline-flex pills with color dot + word + title attribute showing `tfidf=X.XXX · nearest=genre`. |
| `frontend/src/components/sidebar/ClassificationExplain.tsx` | Orchestrator panel: 410/503/loading/error/success branches + D-51 footnote | ✓ VERIFIED | `:27-171` composes the four sub-components inside the success branch; 5-branch fall-through (`expired → uncalibrated → isPending → error → data`); D-51 footnote at `:146-168` with canonical "upper bound" copy + GitHub link to `v2_validation_report.md`. |
| `frontend/src/components/explanation/steps/Step7ValidationLimitations.tsx` | D-51 canonical walkthrough disclaimer; "upper bound" framing; no retraction terms; validation report link | ✓ VERIFIED | File renders 3-paragraph copy with "upper bound" 1x in JSX (the comment block also references it). Grep for forbidden terms (wrong / broken / invalid / incorrect / flawed) returned zero matches. Link target `https://github.com/aaasocial/Word2Vec-Topology-Genre-Detector/blob/master/results/v2_validation_report.md` with `target="_blank" rel="noopener noreferrer"`. Wired into `PipelineExplanation.tsx:10,19` STEPS array; `TOTAL_STEPS` auto-derives to 7. |

All 16 artifacts: exists ✓, substantive ✓, wired ✓.

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| Worker `jobs.py` | Redis `feature_vec:{job_id}` | `redis.set` with ex=300 | ✓ WIRED | `jobs.py:154-165` writes between Step 5 (features) and Step 6 (classify) per D-47. |
| Worker `jobs.py` | SSE `result` payload | `top_n`, `entropy`, `top1_top2_gap`, `badge_fires` keys | ✓ WIRED | `jobs.py:197-208` emits all four new keys plus legacy fields. |
| `useClassify.ts` | `uploadStore.result` | reads `msg.result.top_n / .entropy / .top1_top2_gap / .badge_fires` | ✓ WIRED | Per 09-04 SUMMARY self-check grep: `grep -n "top_n: msg.result.top_n\|entropy: msg.result.entropy" frontend/src/hooks/useClassify.ts` → 2 matches. |
| `/explain` endpoint | Redis cache namespace | `explain:{sha256(feature_vec)}:{w2v_model_sha256[:16]}` | ✓ WIRED | `routes/explain.py:116` derives key via `explain_cache_key(feature_vec, state.lineage)`; cache GET at `:117`; SET at `:208-212` with ex=3600. |
| `/explain` endpoint | App state SVM + NN index + artifacts | `request.app.state.{svm_pipeline, nn_index, explain_artifacts, w2v_model, genre_names, lineage, calibration_available}` | ✓ WIRED | Read at `:62, 65, 76-77, 129-131`. |
| Frontend Why-button | `ClassificationExplain` component | `{explainOpen && <ClassificationExplain />}` | ✓ WIRED | `ClassificationResult.tsx:81`; toggle state via `setExplainOpen` on button click. |
| `ClassificationExplain` | `/explain` endpoint | `useExplain` → `apiFetch('/classify/${jobId}/explain', POST)` | ✓ WIRED | `useExplain.ts:23-50`; mutate fires from `ClassificationExplain.tsx:41` useEffect on jobId. |
| `useExplain` onError | 410 / 503 callbacks | `err.status === 410 → onExpired`; `err.status === 503 → onUncalibrated` | ✓ WIRED | `useExplain.ts:33-39`; `ClassificationExplain.tsx:32-35` registers both callbacks → sets local state flags. |
| `Step7ValidationLimitations` | `PipelineExplanation` STEPS | imported + added to STEPS array | ✓ WIRED | `PipelineExplanation.tsx:10` imports; `:19` adds to STEPS; `:22` `TOTAL_STEPS = STEPS.length` auto-derives to 7. |
| `verify_svm_lineage` | `calibration_method` allow-list | gate at lifespan boundary | ✓ WIRED | `app.py:66-69` calls `verify_svm_lineage`; sets `app.state.calibration_available` accordingly. `/explain` reads this bool at `routes/explain.py:65` to 503. |

All 10 key links: WIRED.

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `TopNList` | `topN` prop | `ClassificationResult` derives from `result.top_n ?? [{genre, probability}]` ← `useClassify` SSE `done` handler ← worker `predict_top_n` ← calibrated SVM | Yes — SVM verified to return real (1, 8) probas | ✓ FLOWING |
| `UncertaintyBadge` | `result.badge_fires` | worker `jobs.py:207` ← `compute_uncertainty_metrics(proba)` ← `predict_top_n` | Yes — computed from real proba | ✓ FLOWING |
| `NearestBooksList` | `books` prop | `ClassificationExplain` ← `useExplain` data ← `/explain` endpoint ← `find_nearest_training_books(feat_l2, app.state.nn_index, artifacts['book_metadata'])` | Yes — fitted on (151, 600) `feature_matrix_l2`; book_metadata is (151,) dicts | ✓ FLOWING |
| `TrackContributionBars` | `contributions` prop | `ClassificationExplain` ← `data.track_contributions` ← `compute_track_contributions(feature_vec, svm, predicted_idx)` (3-row batched `predict_proba`) | Yes — batched ablation on real SVM verified at 0.53 ms/call | ✓ FLOWING |
| `DrivingWordsPills` | `words` prop | `ClassificationExplain` ← `data.driving_words` ← surrogate path: vocab slab → top clusters → `cluster_to_representative_words[c][0]` → `compute_driving_words` with per_genre_centroids | Yes — but surrogate (worker doesn't publish per-upload words/tfidf); honest-by-construction per D-46 cluster semantics | ✓ FLOWING (surrogate, documented) |
| `Step7ValidationLimitations` | (none — static copy) | hardcoded JSX + module-level URL constant | N/A — static disclosure | ✓ FLOWING (static OK) |

All dynamic-data artifacts: data flows through real, live wiring. No hollow props or static fallbacks where dynamic data is required.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Calibrated SVM returns sum-to-1 (1, 8) | `python -c "import joblib; svm=joblib.load('data/models/svm_pipeline.joblib'); import numpy as np; p=svm.predict_proba(np.zeros((1,600))); print(p.shape, p.sum())"` | `shape: (1, 8) sum: 1.0 classes: [0 1 2 3 4 5 6 7]` | ✓ PASS |
| `explain_artifacts.npz` has 6 canonical keys with correct shapes/lineage hashes | `python -c "import numpy as np; d=np.load('data/models/explain_artifacts.npz', allow_pickle=True); print(list(d.files))..."` | 6 keys; (151,600)/(151,)/(8,150)/(8,)/(200,)/dict; corpus_hash `3f4fe9400b023f08` and w2v_model_sha256 `cd81f9e69cb2d127` matching lineage byte-for-byte | ✓ PASS |
| Batched zero-ablation per-call latency under 200 ms target | `python -c "...100 iters of compute_track_contributions equivalent..."` | 0.53 ms avg | ✓ PASS (377x under budget) |
| Phase 9 backend surface test suite | `pytest backend/tests/test_explain_math.py test_lineage_calibration.py test_explain_artifacts.py test_app_lifespan.py test_explain_endpoint.py -q --tb=line` | **54 passed in 25.42s** | ✓ PASS |
| Phase 9 frontend surface test suite | `cd frontend && npx vitest run TopNList UncertaintyBadge NearestBooksList TrackContributionBars DrivingWordsPills useExplain` | **37 passed in 6.54s** (6 test files) | ✓ PASS |
| Frontend type-check clean | `cd frontend && npx tsc --noEmit` | exit 0, no output | ✓ PASS |
| No pie chart references in frontend | `grep -r 'pie|Pie|PieChart' frontend/src` | 0 matches | ✓ PASS |
| Operative thresholds 0.2801 / 0.7738 single source of truth | `grep -n '0.2801\|0.7738' backend/` | Numbers declared once in `explain.py:33-34`; doc references only in `models.py:127` docstring and test assertions | ✓ PASS |
| D-53 voice audit on user-facing disclosure surfaces | `grep -i '\\b(wrong\|broken\|invalid\|incorrect\|flawed)\\b' Step7ValidationLimitations.tsx ClassificationExplain.tsx` | 0 matches in both files | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| DEPTH-01 | 09-01 / 09-03 / 09-04 | Top-N (default N=3) ranked predictions with calibrated probabilities summing to 1 | ✓ SATISFIED | DEPTH-01 verification command returned shape (1,8) sum 1.0; `predict_top_n` returns full ranked list; TopNList slices to top-3 + expander; 24 explain-math tests + 4 lineage tests green |
| DEPTH-02 | 09-04 | Probability bars, no pies, no hidden | ✓ SATISFIED | No pie chart imports in frontend (grep clean); TopNList renders horizontal bars with `(p.probability * 100).toFixed(1) + '%'` width; +N expander reveals all 8 (D-41 progressive disclosure); 10 TopNList tests green |
| DEPTH-03 | 09-02 / 09-03 / 09-05 | "Why this genre?" expander → POST /explain (synchronous ~200ms, Redis-cached) | ✓ SATISFIED | Endpoint mounted at `app.py:171`; cache key + 1-h TTL implemented; backend p50 = 15 ms (cache miss) / 1 ms (cache hit) per 09-03 measurement (well below 200 ms); Why-button toggles ClassificationExplain panel; useExplain routes 410/503; 8 integration tests + 5 useExplain tests green |
| DEPTH-04 | 09-02 / 09-03 / 09-05 | 3-5 nearest training books with Euclidean distance in L2-normalized feature space | ✓ SATISFIED | `find_nearest_training_books` with n_neighbors=5; `nn_index` fitted with `metric='euclidean'` on `feature_matrix_l2` (151, 600) float32 L2-normed; NearestBooksList renders 5 rows with all 4 required fields (title, author, genre, distance); 6 NearestBooksList tests + 7 explain_artifacts tests green |
| DEPTH-05 | 09-03 / 09-05 | Per-track contribution (topology vs vocabulary) percentages summing to 100 | ✓ SATISFIED | `compute_track_contributions` normalizes `100 * abs(c) / total` (sum-to-100 by construction); batched 3-row predict_proba (Pitfall 2 honored); test `test_track_contributions_sums_to_100` enforces; TrackContributionBars renders with `pct.toFixed(1)%`; 6 component tests green. Note: ROADMAP wording says permutation_importance, but D-44 documents zero-ablation as the operational choice (mathematically equivalent for the per-track-on-this-upload question; rejected synchronous SHAP per PITFALLS §8). |
| DEPTH-06 | 09-02 / 09-03 / 09-05 | TF-IDF-driven driving words with "proxy, not literal" disclosure | ✓ SATISFIED | `compute_driving_words` returns {word, tfidf, nearest_genre}; per-genre centroids (8, 150) L2-normed in artifacts; DrivingWordsPills renders D-46 canonical copy verbatim ("These are **proxies** for the cluster-distribution signal — not literal classifier inputs."); 6 DrivingWordsPills tests green; route uses surrogate-via-vocab-slab path (documented). |
| DEPTH-07 | 09-01 / 09-03 / 09-04 | Entropy / uncertainty badge for ambiguous predictions | ✓ SATISFIED | `compute_uncertainty_metrics` returns {entropy, top1_top2_gap, badge_fires}; operative thresholds 0.2801 / 0.7738 are single source of truth in `explain.py:33-34`; UncertaintyBadge gated on `result.badge_fires === true` with D-52 canonical tooltip; 4 UncertaintyBadge tests green. ROADMAP says "top-2 within 10pp" — D-43 + Q4 `tighten` decision document the empirical 25/75-percentile thresholds as the operative implementation derived from 53% hold-out fire rate. |

All 7 declared phase requirements: ✓ SATISFIED. No orphaned requirements: REQUIREMENTS.md lines 56-62 list only DEPTH-01..07 for Phase 9 and all map to plans 09-01..09-06.

### Anti-Patterns Found

09-REVIEW.md captured 5 warnings + 8 info items, none blocking. Re-scan of the same files in this verification surfaced the same items; no new issues introduced beyond the review.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/src/components/sidebar/ClassificationExplain.tsx` | 29-45 | `expired`/`uncalibrated` flags never cleared when jobId changes (WR-01) | ⚠️ Warning | Real UX bug if user uploads a second file while panel stays open after a 410/503; would mask the new (successful) mutation. Phase 9 contract is satisfied (single upload flow works); flag for Phase 10 fix. |
| `backend/api/routes/explain.py` | 135-141 | `predicted_genre` derived via `np.argmax(proba)` without `svm.classes_` mapping (WR-02) | ⚠️ Warning | Works in v2 because classes_ is `[0..7]`; would break if a future training run drops a class. Phase 9 still correct on the current SVM. |
| `backend/api/routes/explain.py` | 117-126 | Cache-hit path bypasses Pydantic validation (WR-03) | ⚠️ Warning | Defense-in-depth gap; current architecture has only the backend writing the cache so risk is low. |
| `config/params.yaml` | 42 | Comment says `cv=LeaveOneOut()` but code uses `StratifiedKFold(5)` (WR-04) | ⚠️ Warning | Stale doc comment; sklearn 1.6 rejects LOOCV for multiclass calibration (auto-fixed deviation in 09-01). |
| `backend/api/routes/explain.py` | 104-113 | `feature_vec` shape-validated but not finite-validated (WR-05) | ⚠️ Warning | NaN propagation would surface as Pydantic 500 rather than a clearer 4xx; defense-in-depth. |
| (8 info items per 09-REVIEW.md) | — | Magic numbers, brittle source-string tests, type-annotation hygiene, etc. | ℹ️ Info | Hygiene items; no Phase 9 contract impact. |

None of the warnings block Phase 9 goal achievement. WR-01 is the highest-impact item but only manifests in a multi-upload scenario that is out of scope for Phase 9's single-upload contract; recommend addressing as a Phase 10 polish task.

### Deferred Items (not Phase 9 regressions)

Verified pre-existing test failures from `deferred-items.md` do NOT intersect any Phase 9 contract surface:

- **`useClassify.test.ts` × 5** — tests mock `WebSocket` but production uses `EventSource` (SSE migration from a prior phase). Production `useClassify.ts` is wired correctly for Phase 9 (verified via 09-04 SUMMARY: `grep top_n: msg.result.top_n` returns matches). The Phase 9 SSE field consumption is covered by TopNList/UncertaintyBadge component tests (14/14 green). No intersection with Phase 9 contract.
- **`SlowTierParams.test.tsx` × 1** — test fixture missing `setH2Enabled` setter; component is unrelated to Phase 9 classification UI.
- **29 backend tests requiring live Redis** — `test_upload.py`, `test_classify.py`, `test_recompute.py`, `test_corpus_genres_books.py`, `test_websocket.py`, `test_vr_api.py`, `test_api.py`, `test_viz.py`. Pre-existing integration tests requiring a docker-compose Redis. Phase 9 surface tests (`test_explain_math`, `test_lineage_calibration`, `test_explain_artifacts`, `test_app_lifespan`, `test_explain_endpoint`) all mock Redis directly; 54/54 green without a live Redis.
- **`test_corpus.py::test_books_yaml_valid`** — stale Phase-1 era assertion (3 genres, 5 books each); v2 corpus has 8 genres × ~19 books. Not a Phase 9 contract surface.
- **`test_viz.py` × 6 path-prefix failures** — Phase 5 viz router URL mismatch documented in 06-VERIFICATION.md.

Zero new regressions introduced by Phase 9. All deferred items are documented and clearly outside the Phase 9 contract.

### Human Verification Required

Per 09-VALIDATION.md the phase ships with 7 UAT items requiring a human walkthrough. Automated checks pass cleanly; the UATs cover surfaces that cannot be exercised without a running browser + backend + Redis.

#### 1. UAT-01 — Top-N expander interaction
**Test:** Upload a book, wait for classification, inspect TopNList for 3 horizontal bars sorted descending, click "+5 more", verify all 8 visible.
**Expected:** Top-3 visible default; +5 more reveals all 8; sort descending preserved; percent labels show "XX.X%"; nothing permanently hidden.
**Why human:** Requires live upload + click interaction in a browser; automated tests cover render contract (default-3-visible / 8-after-expand) but not visual UAT.

#### 2. UAT-02 — 410 expired path
**Test:** Upload a book, wait > 5 minutes (or manually evict `feature_vec:{job_id}` from Redis), open "Why this genre?", verify 410 prompt.
**Expected:** Panel renders the canonical "Upload expired — re-upload to see the explanation." (D-49 verbatim); points the user at the existing UploadZone; no silent retries.
**Why human:** Requires waiting past the 5-min Redis TTL OR manual Redis eviction; not exercised in the unit suite (mocked).

#### 3. UAT-03 — Happy-path explain panel
**Test:** Upload a book, open Why-panel within 5 min of classify completion, verify all four sub-components render with real data.
**Expected:** NearestBooksList renders 5 rows with title/author/genre/Euclidean-distance; TrackContributionBars renders topology + vocabulary bars with direction glyphs and pcts summing to 100; DrivingWordsPills renders TF-IDF-ranked pills with D-46 canonical disclosure copy; uncertainty + D-51 footnote visible.
**Why human:** Requires live upload + click "Why this genre?" with running backend + Redis to exercise the full payload end-to-end.

#### 4. UAT-04 — 503 uncalibrated path
**Test:** Place a pre-Phase-9 SVM (no `calibration_method` in lineage) on disk, start the API, upload a book, open Why-panel.
**Expected:** 503 response routed to `opts.onUncalibrated`; panel renders calibration-required message; `/classify` still serves single-genre top-1 result (graceful degradation per Q8); classify result card still renders (with synthesized single-row top-N via the backward-compat fallback in ClassificationResult.tsx).
**Why human:** Requires mutating lineage.json (or shipping a pre-Phase-9 SVM artifact); not automated.

#### 5. UAT-05 — Walkthrough Step 7 navigation
**Test:** Open the pipeline walkthrough dialog, click Next 6 times to reach Step 7, verify "Validation & Limitations" headline, three paragraphs, "upper bound" framing, validation-report link, "Step 7 / 7" indicator with the 7th dot highlighted.
**Expected:** Step-counter says "Step 7 / 7"; copy uses "upper bound" verbatim; no retraction terms (programmatic grep already confirmed 0 matches); link opens GitHub in a new tab.
**Why human:** Requires manual click-through of the walkthrough dialog and visual inspection of the step indicator + dot pattern.

#### 6. UAT-06 — Reliability diagram visual sanity
**Test:** Open `results/figures/v2_calibration_reliability.png`, compare libsvm_platt curves vs CalibratedClassifierCV curves, cross-check against the Brier table in `results/v2_calibration_report.md`.
**Expected:** 8 subplots (one per genre); both methods plotted per subplot with 5-bin binning; winning method (libsvm_platt at Brier 0.3459 << 0.6041) visually closer to the diagonal at high probability; numbers match the report's Brier table.
**Why human:** Visual inspection of a PNG against the markdown table.

#### 7. UAT-07 — Entropy badge fires appropriately on real uploads
**Test:** Upload a clearly-classifiable book (e.g., Pride and Prejudice → Romance) and verify UncertaintyBadge does NOT render. Then upload a borderline book (e.g., a literary-Gothic hybrid) and verify the badge fires with the D-52 canonical tooltip.
**Expected:** Badge gated by `badge_fires === true` from backend; tooltip text matches D-52 phrasing exactly; high-confidence uploads do NOT see the badge (avoids signal dilution per Q4).
**Why human:** Requires uploading specific books to observe live behavior across confidence regimes.

### Gaps Summary

No automated gaps. All ROADMAP success criteria (5/5) are supported by real, wired, data-flowing artifacts. All 7 DEPTH requirements are satisfied with traceable evidence. The Phase 9 surface test gate is 54/54 backend + 37/37 frontend + tsc clean. The 7 UAT items are intentional human verification surfaces documented in 09-VALIDATION.md — they require a running browser + backend + Redis to exercise (visual interaction, TTL expiry, alternative-SVM substitution, real-corpus-book uploads).

Phase 9 closes the v2 milestone goal #3 ("honest 'why this genre?' explanation that users can interrogate") with the calibrated SVM + top-N + ClassificationExplain spine in place. The 09-REVIEW.md warnings (WR-01..WR-05) are advisory; the highest-impact item (stale state in ClassificationExplain on jobId change) does not break the single-upload contract Phase 9 commits to and is appropriate Phase 10 polish work.

---

## Final Verdict

**status: human_needed** — all automated must-haves PASS (5/5 success criteria, 7/7 DEPTH requirements, 16/16 artifacts, 10/10 key links, all behavioral spot-checks). The 7 UAT items in 09-VALIDATION.md require a human walkthrough before phase close can be considered fully complete.

_Verified: 2026-05-27T18:53:00Z_
_Verifier: Claude (gsd-verifier)_
