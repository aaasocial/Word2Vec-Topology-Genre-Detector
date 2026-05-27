---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: — Shipped
status: completed
last_updated: "2026-05-27T10:01:05.925Z"
last_activity: 2026-05-27
progress:
  total_phases: 10
  completed_phases: 9
  total_plans: 37
  completed_plans: 37
  percent: 100
---

# STATE

## Current Position

Phase: 09 (classification-depth) — **COMPLETE 2026-05-27**

- **Milestone:** v2.0 — Accuracy, Depth, and Polish
- **Phase:** 09 — Complete (6/6 plans)
- **Status:** Phase 9 closed; 7 UAT items pending live walkthrough (see `.planning/phases/09-classification-depth/09-HUMAN-UAT.md`)
- **Next phase:** 10 (Visual Polish) — depends on Phases 6–9 (all upstream complete)
- **Last activity:** 2026-05-27

### Phase 9 Complete (2026-05-27)

6/6 plans landed end-to-end via `/gsd-execute-phase 9`. Calibration empirical pick (`libsvm_platt`, Brier 0.0481) retrained `svm_pipeline.joblib` and extended the lineage sidecar; build-time `explain_artifacts.npz` + FastAPI lifespan loader provides per-genre w2v centroids, 5-NN index, calibrated training-set probabilities, and frozen vocabulary; the explainability spine (zero-ablation track contributions, NN search, centroid-attribution driving words, entropy/gap badge) is wired through `classify.predict_top_n` → SSE → `POST /api/classify/{job_id}/explain` with Redis hand-off (5-min `feature_vec`) and 1-hour result cache (410 Gone on expiry). Frontend mounts TopNList + UncertaintyBadge inline and a Why button opening ClassificationExplain (NearestBooksList + TrackContributionBars + DrivingWordsPills); Step7ValidationLimitations walkthrough closes the loop with D-53 "upper bound" framing. Measured `/explain` p50 = 15ms cache-miss / 1ms cache-hit (200ms target). Verifier confirmed 5/5 ROADMAP success criteria + 7/7 DEPTH requirements directly from code; 91 Phase 9 tests green; code review 0 critical / 5 warnings advisory.

### Phase 8 Complete (2026-05-26)

Phase 8 paused on 2026-05-25 after Wave 1.5 because a full gid integrity audit found 141/240 books had wrong `gid` bindings. Resumed and closed via Phase 8.1 sub-phase (drop strategy):

### Phase 8 Complete (2026-05-26)

Phase 8 paused on 2026-05-25 after Wave 1.5 because a full gid integrity audit found 141/240 books had wrong `gid` bindings. Resumed and closed via Phase 8.1 sub-phase (drop strategy):

**Phase 8.1 — Corpus Integrity Rebuild (drop strategy):**

- Repair attempt via gutendex bulk lookup reduced 145 SERIOUS → 86 SERIOUS (40.7%) but hit diminishing returns
- User-authorized drop: removed the 86 unresolvable rows from `corpus/books.yaml` and `corpus_candidates.yaml`
- Final v2 corpus: **154 verified-clean books** across 8 genres (15–25 per genre); 0 SERIOUS in final audit
- Wave-2 pipeline re-run end-to-end on clean corpus; lineage rotated `f6cf71fa → 3f4fe940`; all 7 frozen hyperparameters preserved

**Phase 8 Wave 3 — Validation Report:**

- Hold-out macro-F1: **v2 = 0.7367 vs v1 = 0.3235** (+41pp, permutation p=0.0010) → **CEXP-03 PARTIAL-VALIDATED**
- GroupKFold-by-author mean macro-F1: 0.2865 (gap 45pp vs hold-out, >> 15pp threshold) → **CEXP-04 BLOCKED**
- Per-author smoke test failed → D-31 disclaimer path triggered
- 4 §10 validation routines added to `scripts/06_validate.py` with unit-test coverage in `scripts/test_06_validate.py`

**Phase 8 Wave 4 — Publish + Doc Alignment:**

- D-33 publish-with-disclaimer decision applied (CEXP-03 PARTIAL-VALIDATED → publish; CEXP-04 BLOCKED non-gating)
- v2.0-data GitHub Release published to https://github.com/aaasocial/Word2Vec-Topology-Genre-Detector/releases/tag/v2.0-data with 10 assets (~194 MB) including v2 validation report
- Doc alignment landed: REQUIREMENTS.md CORPUS-01, PROJECT.md Validated list + Key Decisions, ROADMAP.md Phase 8 closure + Phase 9 unblock
- Code review: 0 critical / 7 warnings / 11 info — advisory only, not blocking

**Repo migration (2026-05-26):** Phase 6-8 work was originally committed to a misconfigured parent repo (`aaasocial/F1Dashboard`) because the project working tree sat inside a home-directory-rooted git repo. On 2026-05-26 the W2V subdirectory history was extracted via `git filter-repo` and fast-forwarded onto `aaasocial/Word2Vec-Topology-Genre-Detector` master (`af43deb → fb504a7`, 121 new commits + 18 LFS objects, 272 MB upload). The v2.0-data Release was republished to the correct repo; the home-directory git repo was deinitialized. Full migration sidebar in `08-04-SUMMARY.md`.

### Phase 9 plan 09-01 complete (2026-05-27)

Plan 09-01 landed the SVM calibration spike + retrain + D-40 lineage extension + Wave-0 test scaffolds (DEPTH-01):

- **D-37 winner: libsvm_platt** (Brier 0.3459 << 0.6041 for CalibratedClassifierCV-StratifiedKFold-5; delta 0.2583 >> 1e-3 tie-break threshold).
- **D-38 retrain:** `data/models/svm_pipeline.joblib` rotated; `predict_proba` now returns (n, 8) rows summing to 1.0 ± 1e-6. Deployed-model Brier on in-comparison hold-out: 0.0481.
- **D-39 evidence:** `results/v2_calibration_report.md` + `results/figures/v2_calibration_reliability.png` written. Contains Brier table, reliability PNG, entropy distribution, and the load-bearing `## Entropy threshold decision` YAML block.
- **D-40 lineage:** schema extended with `calibration_method` / `calibration_brier_score` / `calibration_report`. `verify_svm_lineage` refuses pre-Phase-9 SVMs (missing `calibration_method`) and any value outside the `{libsvm_platt, calibrated_cv_sigmoid}` allow-list.
- **Q4 entropy decision: `tighten`.** Defaults fired on 9/17 (53%) hold-out (within 50-80% band). Operative thresholds: gap < 0.2801 (p25) OR normalized entropy > 0.7738 (p75). These values land in `backend/pipeline/explain.py` via plan 09-03.
- **Wave-0 scaffolds:** 6 explain math tests + 4 lineage calibration tests + deterministic 600-D feature_vec_sample.npy fixture.
- **Single source of truth:** `scripts/constants.py::HOLDOUT_GUTENBERG_IDS` is now the sole place the 20 pinned hold-out ids live (T-9-31 mitigation: 06_validate asserts the constant matches v1_baseline JSON at runtime).

Plan-research deviations auto-applied:

- Rule 1 bug: plan-prescribed `cv=LeaveOneOut()` for CalibratedClassifierCV is rejected by sklearn 1.6.1 for multiclass. Substituted `StratifiedKFold(n_splits=5)`.
- Rule 3 blocker: `data/features/` missing on fresh machine; created `scripts/rebuild_per_book_artifacts.py` to regenerate per-book outputs from the existing W2V model without rotating `w2v_model_sha256`.
- Rule 1 bug: two `test_lineage_smoke.py` tests asserted the pre-D-40 contract; updated to pass `calibration_method` through and assert the new D-40 fields + rotated `created_by` provenance.

### Phase 9 plan 09-02 complete (2026-05-27)

Plan 09-02 landed the build-time explain artifact (D-50) + run-time FastAPI lifespan extension (Q6) (DEPTH-04 + DEPTH-06):

- **D-50 artifact:** `data/models/explain_artifacts.npz` (269.7 KB LFS-tracked) emitted with six canonical keys -- `feature_matrix_l2` (151, 600) float32 alpha-weighted + L2-normed (matches runtime feature_vec layout), `book_metadata` (151,) object array of dicts, `per_genre_centroids` (8, 150) float32 L2-normed, `genre_names` (8,) object array, `cluster_to_representative_words` (200,) object array of 10-word-lists, `metadata` dict with `corpus_hash=3f4fe940...` + `w2v_model_sha256=cd81f9e6...` + window + k_clusters + alpha + created_utc.
- **Q6 lifespan extension:** `backend/api/app.py` now loads `svm_pipeline` + `w2v_model` + `genre_names` + `lineage` + `explain_artifacts` + `nn_index` (fitted `NearestNeighbors(5, euclidean)`) + `params` onto `app.state`. Defaults-first + isolated try/except per sub-load (Pitfall 3). `verify_svm_lineage` gates `app.state.calibration_available`.
- **Pitfall 5 drift check:** lifespan cross-checks artifact metadata.corpus_hash vs lineage.corpus_hash; mismatch sets `nn_index = None` and logs (NOT raises) so `/health` stays green and `/explain` can 503 cleanly (T-9-06 mitigation).
- **Q7 LFS gap closed:** `.gitattributes` now LFS-tracks `data/models/*.npz` -- verified via `git check-attr filter` returning `filter: lfs` (T-9-10 mitigation).
- **CLAUDE.md Fresh Machine Setup updated** with the new `python -m backend.pipeline.precompute_explain --window 15` step.
- **12 tests green:** 7 schema tests (`backend/tests/test_explain_artifacts.py`) + 5 lifespan contract tests (`backend/tests/test_app_lifespan.py`).
- **Lifespan memory footprint observed:** ~78 MB total (5 MB SVM + 70 MB w2v + 3 MB explain_artifacts + 0.4 MB nn_index) -- well within Railway 1 GB worker budget (T-9-09 acceptable per CONTEXT.md).

Plan-research deviations auto-applied:

- Rule 1 bug: plan code referenced `book["id"]` but `corpus/books.yaml` uses `gutenberg_id`; added fallback for both keys in `compute_per_genre_centroids` + `book_meta_lookup` builder.
- Rule 1 bug: `np.savez_compressed` auto-appends `.npz` to non-`.npz` filenames -- plan's `tmp_path = out_path.with_suffix(".npz.tmp")` produced `explain_artifacts.npz.tmp.npz` on disk while `os.replace` looked for `explain_artifacts.npz.tmp`. Renamed temp file to `explain_artifacts.tmp.npz` so the auto-append no-ops.
- Rule 1 bug: `np.array(list_of_equal_length_lists, dtype=object)` collapses to a 2-D array (200, 10). Switched to pre-allocated 1-D object array with explicit element assignment so `cluster_to_representative_words[i]` is a Python list as the contract requires.

### Phase 9 plan 09-03 complete (2026-05-27)

Plan 09-03 landed the backend explainability spine (DEPTH-03 + DEPTH-04 + DEPTH-05 + DEPTH-07):

- **Task 1 -- math + Pydantic spine** (`3bee4b7`): `backend/pipeline/explain.py` exports 7 helpers (multiclass_brier_score, normalized_entropy, compute_uncertainty_metrics, compute_track_contributions with batched (3,n_features) predict_proba per Pitfall 2, find_nearest_training_books, compute_driving_words with tfidf-desc + alpha-tiebreak sort + OOV skip, explain_cache_key). The operative entropy thresholds (`ENTROPY_BADGE_DEFAULT_TOP1_TOP2_GAP = 0.2801`, `ENTROPY_BADGE_DEFAULT_NORMALIZED_ENTROPY = 0.7738` from `results/v2_calibration_report.md`) are the SINGLE source of truth -- callers import them, never re-declare. `backend/pipeline/classify.py::predict_top_n` returns the full ranked list using calibrated `predict_proba` + `classes_`; legacy `predict_genre` is a thin top-1 wrapper for back-compat. `backend/api/models.py` gains 8 new Pydantic models with `extra='forbid'` (TopNPrediction, NearestTrainingBook, TrackContribution/s, DrivingWord, UncertaintyMetrics, ExplainResponse, ExtendedClassifyResult).
- **Task 2 -- worker hand-off** (`4795ad5`): `backend/worker/jobs.py::classify_book` now writes `feature_vec:{job_id}` as `np.float64.tobytes()` to Redis with `ex=300` (5-min TTL per D-47) between step 5 and step 6. Step 6 calls `predict_top_n`; the SSE result payload gains `top_n` (length 8, sorted desc, sums to 1.0), `entropy`, `top1_top2_gap`, `badge_fires` (precomputed using the operative thresholds). Legacy keys (`predicted_genre`, `confidence`, `oov_word_count`, `total_words`, `processing_time_s`) preserved verbatim.
- **Task 3 -- /explain endpoint** (`b859ab0`): `backend/api/routes/explain.py` implements POST `/api/classify/{job_id}/explain` with a 9-step defense-in-depth flow: UUID4 validation (T-9-12) -> calibration gate -> NN/artifacts gate (Pitfall 3) -> Redis gate -> feature_vec read (D-47, shape-validated against T-9-16) -> cache lookup (D-48: `explain:{sha256(feature_vec)}:{w2v_model_sha256[:16]}`) -> compute payload -> Pydantic validation -> cache SET with `ex=3600`. Canonical 410 phrasing "Upload expired — re-upload to see the explanation." preserved verbatim per D-49. Driving-words surrogate sourced from the upload's vocab slab + `cluster_to_representative_words` (no new Redis hand-off needed). `backend/api/app.py` mounts the new router additively without modifying the lifespan function 09-02 wrote.
- **Latency measured:** cache-miss p50 = **15 ms** / cache-hit p50 = **1 ms** on the deployed v2 SVM (TestClient + MagicMock Redis). Well under the 200 ms ARCHITECTURE.md §5b target. The batched (3, n_features) predict_proba delivered a **2.79× speedup** over three separate calls (1.48 ms → 0.53 ms), beating Pitfall 2's 1.5× estimate.
- **38 new tests:** 24 explain-math (uncertainty range + badge fire/no-fire at operative thresholds + threshold override + cache key shape + rotation + batched-call assertion + 50/50 fallback on zero total + NN order + driving-words sort + OOV skip + max_n cap + top-N sum-to-1 + real-SVM integration), 8 endpoint integration (happy + 410 + 3×503 + 404 + cache-hit short-circuit + cache-miss writes ex=3600). Suite total under the Phase 9 surface: **90 tests passing, 26.71 s**.

Plan-research deviations auto-applied:

- Rule 1 bug: plan `<action>` hardcoded research-default thresholds (0.10 / 0.7) while the same plan's `<success_criteria>` mandated operative thresholds (0.2801 / 0.7738). Honored the success criteria + 09-01 SUMMARY's explicit "plan 09-03 reads these values verbatim" callout. Tests verify callers CAN pass the un-tightened defaults if needed.
- Rule 1 bug: legacy `test_predict_genre_returns_tuple` mocked the v1 SVM API (`predict` + `decision_function`); updated to the new `predict_proba` + `classes_` contract.
- Rule 1 bug: `test_jobs_imports_pipeline_functions` asserted the old single-name import line; updated to match the new `predict_genre, predict_top_n` + `compute_uncertainty_metrics` imports. Added two new tests for the D-47 Redis write + SSE result Phase 9 additions.
- Rule 1 bug: module-scoped TestClient fixture leaked MagicMock instances into lifespan-exit `await app.state.redis.close()` (TypeError). Fix: snapshot original redis at fixture entry, restore in try/finally.

### Phase 9 plan 09-04 complete (2026-05-27)

Plan 09-04 landed the frontend SSE field wiring + top-N + uncertainty badge (DEPTH-02 + DEPTH-07):

- **Task 1** (`d16db8c`): `frontend/src/types/explain.ts` exports 7 TS interfaces mirroring backend Pydantic verbatim; `uploadStore.ClassificationResult` gains 4 optional Phase 9 fields (`top_n?`, `entropy?`, `top1_top2_gap?`, `badge_fires?`); `useClassify.ts` SSE `done` handler forwards the new fields into `setResult`.
- **Task 2** (`9a7c2a1`): `TopNList.tsx` (top-3 horizontal probability bars + collapsible "+5 more" expander revealing all 8 genres; D-41/D-42) + `UncertaintyBadge.tsx` (conditional "Low confidence" badge with D-52 canonical tooltip; renders null when `badge_fires !== true`). 14 vitest tests covering sort order, default-3-visible / 8-after-expand, percent formatting, bar-fill width, color fallback, empty input, badge conditional render, D-52 tooltip phrasing.
- **Task 3** (`ddbbe94`): `ClassificationResult.tsx` rewired to mount `<TopNList>` + `<UncertaintyBadge>` with backward-compat fallback (synthesizes single-row top-N when `result.top_n` is absent). Mount points scoped so 09-05 can land Why-button + ClassificationExplain between OOV line and View in Scatter button without conflict.
- **Pre-existing test failures logged** to `.planning/phases/09-classification-depth/deferred-items.md`: `useClassify.test.ts` (5 failures, EventSource vs WebSocket mock mismatch from SSE migration) + `SlowTierParams.test.tsx` (1 failure, `setH2Enabled is not a function`). Confirmed pre-existing via `git stash` re-run; out of scope for this plan.

### Phase 9 plan 09-05 complete (2026-05-27)

Plan 09-05 landed the Why-this-genre explain frontend (DEPTH-03 + DEPTH-04 + DEPTH-05 + DEPTH-06):

- **Task 1** (`5444102`): `frontend/src/lib/api.ts` extended with `ApiError extends Error` carrying `.status` and `.body` (backwards-compat: `instanceof Error` still matches; new `instanceof ApiError` callers access `.status`); `frontend/src/hooks/useExplain.ts` wraps `useMutation<ExplainResponse, ApiError>` calling POST `/classify/{job_id}/explain`. Routes 410 -> `opts.onExpired`, 503 -> `opts.onUncalibrated`; retry skips terminal 410/503 and any 4xx, otherwise up to 2 retries.
- **Task 2** (`118233d`): three minimum-viable sub-components in `frontend/src/components/sidebar/`: `NearestBooksList.tsx` (5-row list with color dot + title + author/genre + 3-decimal Euclidean distance), `TrackContributionBars.tsx` (topology + vocabulary bars with direction glyph ↑ green / ↓ red / · muted), `DrivingWordsPills.tsx` (pills with D-46 canonical "proxies -- not literal classifier inputs" disclosure copy). 18 vitest tests (6 per component) covering render, content, order preservation, fallback, empty input.
- **Task 3** (`f752e08`): `ClassificationExplain.tsx` orchestrates the three sub-components with a 5-branch state machine (expired -> uncalibrated -> isPending -> error -> success) + D-51 footnote linking to `results/v2_validation_report.md`; auto-fires useExplain on mount via useEffect keyed on jobId. `ClassificationResult.tsx` adds Why-button (`Why this genre?` / `Hide explanation`) between OOV line and View in Scatter button per 09-04's pre-planned mount point; conditional `{explainOpen && <ClassificationExplain />}` mounts below the View in Scatter button. 5 useExplain vitest tests (happy + 410 + 503 + no auto-fire + null jobId rejects).
- **All 37 Phase 9 frontend tests pass** (14 from 09-04 + 23 from 09-05); tsc --noEmit clean.
- **D-46 disclosure copy enforced as a contract:** the strings "proxies" and "not literal classifier inputs" both appear verbatim in `DrivingWordsPills.tsx` and are asserted via vitest. Phase 06 walkthrough's Step7ValidationLimitations component should mirror the D-51 footnote phrasing for cross-surface consistency.

Plan-research deviations auto-applied:

- Rule 1 bug: useExplain test `null jobId` originally polled `result.current.isError` via waitFor and flaked under fake timers. Switched to `await expect(mutateAsync()).rejects.toBeInstanceOf(ApiError)` which awaits the actual Promise rejection directly (canonical React Query test pattern for synchronous-throw mutationFn).
- Rule 3 blocker: `.git/refs/heads/master` was empty at plan start (`git log` reported "branch appears to be broken"). Restored from `.git/logs/refs/heads/master` reflog (last good commit `0684445`). No code/test impact; all task commits land normally.

### Known limitations (deferred to v2.1 / future phase)

- **CEXP-04 author-leakage BLOCKED** — v2 SVM generalizes poorly to unseen authors (15 of 34 multi-book authors score 0% when held out). Honest mitigation candidates for v2.1: max-N-per-author cap in corpus design, or per-author held-out fine-tuning routine.
- **86 dropped corpus rows** — listed in `.planning/research/v2/v1_to_v2_migration.md` "08.1 Final Resolution". Re-sourcing them via authoritative author bibliographies is a candidate for Phase 8.2 if corpus growth back toward 240 books is desired.
- **7 advisory code-review warnings** — see `08-REVIEW.md`. Can be addressed via `/gsd-code-review-fix 08` when convenient.
- **Frontend test-hygiene gaps** (logged to `.planning/phases/09-classification-depth/deferred-items.md`): `useClassify.test.ts` 5 failures (EventSource/WebSocket mock mismatch); `SlowTierParams.test.tsx` 1 failure (`setH2Enabled` missing). Both pre-existing; recommend follow-up quick fix.

### Next step

Phase 9 (Classification Depth) — plans 09-01..09-05 complete 2026-05-27. Backend explainability spine + frontend explain panel both landed; only plan 09-06 remains (walkthrough Step7ValidationLimitations + 09-VALIDATION.md sign-off + end-to-end test gate covering classify -> Why -> sub-components render -> 410 expiry path). Run `/gsd-execute-phase 9` to land 09-06 and close Phase 9.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260524-w2l | v1.0.1 patch: wire useRecompute into SlowTierParams + VerySlowTierParams | 2026-05-24 | b2d5ee7 | [260524-w2l-v1-0-1-patch-wire-userecompute-into-slow](./quick/260524-w2l-v1-0-1-patch-wire-userecompute-into-slow/) |

## Milestone v2.0 — Phases

| # | Phase | Status |
|---|---|---|
| 6 | v1 Bug-Fix Sweep | Complete (2026-05-23; commits 5a37a28, e57ea67) |
| 7 | Corpus Sourcing Research Spike | Complete (2026-05-25; CORPUS_SOURCING.md + VALIDATION_PROTOCOL.md + corpus_candidates.yaml + v1_baseline_results.json delivered) |
| 8 | Corpus Expansion | Complete (2026-05-26; v2.0-data Release published with D-31 disclaimer; v2 macro-F1 = 0.7367 vs v1 0.3235) |
| 9 | Classification Depth | Context gathered (2026-05-27); ready to plan (D-37..D-45 user-authored: calibration empirical pick · top-3 + expander · lineage extension · local zero-ablation · 5 NN · both P2 items ship) |
| 10 | Visual Polish | Pending (blocked on Phase 9) |

## Accumulated Context

### v1.0 — Shipped 2026-04-13

Live at https://word2vec-topology-genre-detector-production.up.railway.app

| # | Phase | Outcome |
|---|---|---|
| 1 | Pipeline Validation Spike | 6-script CLI pipeline; 27 tests green; weighted VR homology proven via permutation test |
| 2 | API Layer and Job Queue | FastAPI + arq/Redis backend; pipeline refactored into `backend/pipeline/`; content-addressed cache; 34 tests green |
| 3 | Frontend Core and 3D Visualization | React + R3F scatter (PCA/KPCA/UMAP/t-SNE); brightness/hover/search/upload flow; 4/5 success criteria verified |
| 4 | Advanced Viz and Parameter Controls | Topology/Compare tabs; VR ε-slider; persistence heatmap (H₀/H₁); settings drawer; PNG/CSV export; 13/15 UAT pass |
| 5 | Deployment and Public Access | Dockerized; Railway deploy; models via GitHub Release asset; SSE replaces WS post-deploy |

### v1 Carry-overs (addressed in v2.0 Phase 6)

- H₂ homology not computed; H₂ tab tooltip not firing → BUG-01
- Persistence-diagram dot scaling unreadable → BUG-02
- BookSlider receives `books={[]}` — per-book slide-through hidden (needs corpus metadata endpoint) → BUG-03
- ROADMAP.md and STATE.md were 0 bytes on disk at v2.0 start (this rebuild restores them) → BUG-04
- Latent: `cache_key` does not include `corpus_hash` / `w2v_model_sha256` (must land before Phase 8 retrain) → BUG-05

### Key Architectural Anchors

- Single shared Word2Vec embedding space (mathematical invariant)
- Persistent homology runs in full N-D, never on projections
- TF-IDF fit corpus-wide without genre labels (no circular dependency)
- Both feature tracks L2-normalized before α-weighted concatenation
- `backend/pipeline/` functions accept `cancel_event` for cooperative cancellation
- Content-addressed cache: `sha256(step_name, params)` → result (will become `sha256(step_name, params, corpus_hash, w2v_model_sha256)` after BUG-05)
- Frontend state in Zustand; React Query for server cache with `staleTime: Infinity` on precomputed data

### v2.0 Phase Map (drafted 2026-05-22)

| # | Phase | Goal | Requirements |
|---|---|---|---|
| 6 | v1 Bug-Fix Sweep | Close H₂, BookSlider, dot-scaling, planning-doc, and latent cache-key bug before any retrain | BUG-01..05 |
| 7 | Corpus Sourcing Research Spike | Defensible written plan for sources, per-genre counts, author distribution, validation protocol — research only | RES-01..03 |
| 8 | Corpus Expansion | Larger, balanced, author-diverse corpus; retrained model beats v1 baseline on frozen test | CEXP-01..05 |
| 9 | Classification Depth | Top-N calibrated predictions + "why this genre?" with nearest-neighbours + per-track contribution | DEPTH-01..07 |
| 10 | Visual Polish | Light/dark/system theming, onboarding tour, empty-state polish — horizontal sweep last | POLISH-01..05 |

### Key Decisions Recorded in v2.0 Research

- **H₂ is visualisation-only in v2** — not a feature-vector input (`ARCHITECTURE.md §5a` + `PITFALLS.md §3`).
- **Explainability via nearest-neighbour + per-track contribution** — no synchronous Kernel SHAP (`ARCHITECTURE.md §5b` + `PITFALLS.md §8`); commits to option (c) from `ARCHITECTURE.md §11`.
- **Theme store separate from visualization store** — different lifetimes (persisted vs session) (`ARCHITECTURE.md §5c`).
- **Dark mode last** — horizontal concern touching ~30 components (`ARCHITECTURE.md §6`).
- **Cache-key correction (BUG-05) in Phase 6, not Phase 8** — prevents stale-cache footgun during retrain (`ARCHITECTURE.md §10`).
- **Within Phase 6: BookSlider before H₂** — smaller "new endpoint" pattern proves out first (`ARCHITECTURE.md §6`).

## Performance Metrics

| Metric | Target | Current |
|---|---|---|
| v2 macro-F1 (v1-frozen test set) | > v1 baseline | **0.7367** (vs v1 0.3235; +41pp; p=0.0010) ✓ |
| Per-author held-out gap vs LOOCV | ≤ 15pp | **45.03pp** (BLOCKED — v2.1 follow-up needed) ✗ |
| H₂ P95 runtime per book | < 30s | — (deferred — H₂ removed from v2 per ROADMAP success criterion #1) |
| Explainability response time | < 5s (target ~200ms) | — (measured in Phase 9) |
| Corpus metadata endpoint payload | < 100KB total | ~35 KB ✓ |
| Phase 09 P02 | 25min | 2 tasks | 7 files |
| Phase 09 P03 | 35 | 3 tasks | 10 files |
| Phase 09 P04 | 7min | 3 tasks | 9 files |
| Phase 09 P05 | ~5min | 3 tasks | 11 files |
| Phase 09 P06 | 18min | 3 tasks | 4 files |

## Open Blockers

**B-08-01 — RESOLVED (2026-05-26).** Phase 8 corpus integrity blocker resolved via Phase 8.1 drop strategy. v2 corpus is 154 verified-clean books; 0 SERIOUS in final audit; v2.0-data Release published to `aaasocial/Word2Vec-Topology-Genre-Detector`. CEXP-04 author-leakage gap (45pp) is documented as v2.1 follow-up, not blocking Phase 9.

---

Phase 8 plans the **4-wave structure** (build → retrain → validate → release) per 08-CONTEXT.md D-22. Wave 1 includes `scripts/build_corpus.py` (D-24 upgraded CEXP-05 from P2 to P1) and the byte-identical re-run of `scripts/phase7_v1_baseline.py` as the entry gate.

Documentation drift to clean up (folded into Wave 4 per D-34, no longer a separate `/gsd-docs-update` pass):

- REQUIREMENTS.md CORPUS-01 still says "3 genres × 5 books"; PROJECT.md "Validated" list mirrors this. v1 actually shipped with 10 genres × 10 books per commit db7b1f8 (2026-04-13); v2 ships with 8 genres × 30 books = 240 books per Proposal A.
- ROADMAP.md "v1 outcomes" implicitly references the same stale framing.
- CEXP-01..05 traceability rows flip from Pending → Validated per-wave (D-36), not as a terminal sweep.

## Session Continuity

**Next command:** `/gsd-plan-phase 9`

**Reading order for the next session:**

1. `.planning/phases/09-classification-depth/09-CONTEXT.md` — Phase 9 locked decisions D-37..D-55 (read FIRST)
2. `.planning/phases/09-classification-depth/09-DISCUSSION-LOG.md` — alternatives considered for each Phase 9 user-authored decision
3. `.planning/phases/08-corpus-expansion/08-CONTEXT.md` — Phase 8 D-22..D-36 inherited (Phase 9 retrains the v2 SVM landed here; no relitigation)
4. `.planning/research/ARCHITECTURE.md` §4 + §5b + §8 + §10 + §11 — endpoint shape, explain cache, file checklist, open questions (resolved)
5. `.planning/research/PITFALLS.md` §7 (decision_function as probability), §8 (SHAP synchronous rejected), §9 (per-pixel persistence-image importance rejected)
6. `.planning/research/FEATURES.md` §3a + §3b — top-N + explainability table stakes / differentiators / anti-features
7. `.planning/research/STACK.md` §"Supporting Libraries" — sklearn helpers (no new install needed)
8. `.planning/ROADMAP.md` §"Phase 9: Classification Depth" — success criteria + dependency on Phase 8
9. `.planning/REQUIREMENTS.md` DEPTH-01..07 verbatim
10. `data/models/svm_pipeline.joblib.lineage.json` — current v2 SVM lineage (D-38 retrain rotates the file + D-40 adds calibration_method)
11. `results/v2_validation_report.md` — D-51 disclaimer links here

**Phase 9 decision summary (D-37..D-45 user-authored, D-46..D-55 research-inherited):**

- **Calibration**: empirical pick between libsvm Platt and `CalibratedClassifierCV` LOOCV sigmoid via reliability diagram on the 20-book hold-out; lower-Brier winner ships; loser archived in `results/v2_calibration_report.md`; lineage extended with `calibration_method`/`calibration_brier_score`/`calibration_report`.
- **Top-N**: top-3 horizontal probability bars + collapsible "+5 more" expander revealing all 8 genres; 1-decimal percent labels; sorted descending.
- **Explainability**: local per-upload zero-ablation for topology vs vocabulary (two extra SVM calls); 5 nearest training books on L2-normalized features with Euclidean distance; BOTH P2 items ship (DEPTH-06 driving words + DEPTH-07 entropy badge) as separable atomic plans.
- **Research-inherited (skipped areas)**: `POST /api/classify/{job_id}/explain` synchronous ~200ms; Redis `feature_vec:{job_id}` 5-min TTL + `explain:{hash}:{model_hash}` 1-h TTL; 410 Gone on expiry; new `precompute_explain.py` artifact; walkthrough + Why-panel-footnote disclaimer; math unit tests + integration test (no Playwright); inline-hex styling deferring CSS-var sweep to Phase 10.

---
*v1.0 shipped: 2026-04-13*
*v2.0 milestone started: 2026-05-22*
*Last updated: 2026-05-27 — Phase 8 complete (2026-05-26); Phase 9 context gathered via interactive `/gsd-discuss-phase 9` (9 user-authored decisions, 10 research-inherited)*
