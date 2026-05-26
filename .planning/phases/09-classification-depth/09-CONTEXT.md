# Phase 9: Classification Depth — Context

**Gathered:** 2026-05-27
**Status:** Ready for planning
**Mode:** Interactive — user selected `Calibration & Top-N` and `Explainability composition` for discussion (D-37..D-45 are user-authored). The other four areas (Explain endpoint infrastructure, Disclaimer UX, Tests, Frontend styling) were not discussed; for them, CONTEXT.md cites the v2 research artifacts verbatim as the lock-source — see `<research_inherited>`.

<domain>
## Phase Boundary

Turn the v1 single-genre prediction into a **top-3 calibrated ranked list (with a "+5 more" expander revealing all 8 genres)** plus an **on-demand "Why this genre?" explainability panel**, both built on the Phase 8 v2 SVM (lineage `corpus_hash=3f4fe940… / w2v_model_sha256=cd81f9e6…`). Phase 9 closes DEPTH-01..07 verbatim and lands the explainability spine that v2 milestone goal #3 requires.

**In scope (Phase 9):**

- **DEPTH-01**: top-3 ranked predictions with calibrated probabilities summing to 1, plus a collapsible 5-genre tail (so all 8 are reachable — no permanently-hidden predictions). End-to-end SVM retrain with the calibration method that wins the Brier comparison (D-37).
- **DEPTH-02**: horizontal probability bars in a new `TopNList.tsx`, percent-labeled to 1 decimal, sorted descending — no pies, no slicing.
- **DEPTH-03**: new `POST /api/classify/{job_id}/explain` synchronous endpoint (~200 ms target), Redis-cached at `explain:{feature_vec_hash}` TTL 1 h per ARCHITECTURE.md §4 + §5b.
- **DEPTH-04**: explain payload includes **5** nearest training books with **Euclidean** distance in the L2-normalized feature space.
- **DEPTH-05**: explain payload includes per-track contribution (topology vs vocabulary) as percentages summing to 100, computed via **local per-upload track-zeroing ablation** — two extra SVM calls.
- **DEPTH-06 (P2)**: driving-words pill list with `proxy, not literal classifier inputs` disclosure — research-default design from FEATURES.md §3b (top-15 highest-TF-IDF words, each tagged with nearest-genre-by-w2v-centroid).
- **DEPTH-07 (P2)**: uncertainty/entropy badge — research-default thresholds (`top1 − top2 < 0.10` OR normalized Shannon entropy `> 0.7`).
- **Phase-9 precompute step** emitting `data/models/explain_artifacts.npz` (training feature matrix L2-normalized, per-book metadata, k-means cluster → representative words, per-genre w2v-centroids), loaded at FastAPI startup with `NearestNeighbors` fit at load time.
- **Calibration evidence artifact** `results/v2_calibration_report.md` (reliability diagram + Brier scores for both methods + decision rationale).
- **Static author-leakage disclaimer** in the pipeline walkthrough dialog AND footnote in the new "Why this genre?" panel; per-upload honesty via the DEPTH-07 entropy badge.

**NOT in scope (deferred or owned elsewhere):**

- Frontend dark-mode / theming sweep — Phase 10.
- Counterfactual explanations — v3.
- "Closest training book at each pipeline stage" — v3.
- Multi-label classification — v3 per RES-03.
- Settings-drawer calibration plot UI surfacing — v3 (Phase 9 produces the report file).
- Top-N configurable from UI as a runtime toggle — collapsible expander (D-41) is the agreed UX; configurable N as a settings knob is v3.
- Per-author retraining / per-author cap to close the CEXP-04 GroupKFold gap — v2.1.
- Kernel SHAP production code — research/STACK.md mentions `shap==0.51.0` but PITFALLS §8 rejects synchronous use; SHAP stays as a dev-only debug option, not Phase 9 production code.

**Phase 8 inheritance assumed:**

- v2 SVM at `data/models/svm_pipeline.joblib` with lineage sidecar — Phase 9 retrains it once (D-38) to add calibration; lineage rotates, BUG-05 cache invalidates the prior v2-without-calibration artifacts automatically.
- `data/models/genre_names.json` lists 8 v2 keys; frontend still wired to v1 genre keys for `GENRE_COLORS` — Phase 10 owns the relabel. Phase 9 reuses the same `GENRE_COLORS[g] ?? '#888888'` fallback pattern.
- v2 macro-F1 = 0.7367 on the 20-book hold-out; GroupKFold-by-author gap = 45.03 pp (CEXP-04 BLOCKED) — Phase 9 inherits the D-31 ship-with-disclaimer commitment; does not relitigate.

</domain>

<decisions>
## Implementation Decisions (user-authored this session)

Numbering continues from Phase 8 (ended at D-36).

### A. SVM calibration & lineage

- **D-37: Empirical pick between `SVC(probability=True)` libsvm Platt and `CalibratedClassifierCV(method='sigmoid', cv=LeaveOneOut())` via reliability diagram on Phase 8's 20-book hold-out.** Train both, score Brier loss, plot reliability diagrams, ship the lower-Brier method. The loser's diagram is recorded in `results/v2_calibration_report.md` as informational record.
  - **Why:** ARCHITECTURE.md §11 + SUMMARY.md "Gaps to Address" #3 both call for empirical decision via reliability diagram; small-corpus calibration is noisy and neither method is theoretically dominant. The cost of picking wrong is silent miscalibration that downstream UX surfaces dishonestly.
  - **How to apply:** Wave-1 task; both calibrations train on Phase 8's feature matrix; the comparison is fast (a few minutes); the winner determines D-38's retrain.

- **D-38: End-to-end SVM retrain with the calibration method that wins D-37.** Replaces `svm_pipeline.joblib` + lineage.json. PITFALLS §7 mandates retrain-don't-retrofit. Cache rotates naturally via the lineage-aware cache_key (Phase 6 BUG-05).
  - **Why:** internal Platt CV (5-fold for libsvm built-in, LOOCV for `CalibratedClassifierCV`) changes the SVM fit slightly. Retrofitting calibration onto a non-probabilistic SVM is the v1 footgun PITFALLS §7 explicitly flags.
  - **How to apply:** the retrain runs after D-37 picks the winner; D-25-style pre-/post-retrain BUG-05 smoke test verifies cache invalidated.

- **D-39: `results/v2_calibration_report.md` committed before the retrained SVM artifact lands.** Contents: reliability diagrams for both methods, Brier scores, decision rationale, link from `svm_pipeline.joblib.lineage.json::calibration_report`.
  - **Why:** the calibration choice is a claim; the report is the evidence. Matches Phase 8's `results/v2_validation_report.md` precedent.
  - **How to apply:** report file committed in the same wave as the SVM retrain. Linked from PROJECT.md Key Decisions at phase close.

- **D-40: Lineage schema extension.** `svm_pipeline.joblib.lineage.json` gains `calibration_method` (`"libsvm_platt"` | `"calibrated_cv_sigmoid"`), `calibration_brier_score: float`, `calibration_report: "results/v2_calibration_report.md"`. The Phase 6 lineage guard treats a missing `calibration_method` as `"none"` and refuses to serve top-N (forces explicit retrain).
  - **Why:** lineage is the single source of truth for "what model + how was it trained". Extending it for calibration matches the corpus_hash + w2v_model_sha256 pattern.
  - **How to apply:** schema additions land in the same write that updates the SVM file. Backwards-compat path: classify endpoint refuses top-N display when calibration_method missing — falls back to existing single-genre + confidence behavior or a 503 (planner picks the graceful path).

### B. Top-N display

- **D-41: Top-3 probability bars visible by default with a collapsible "+5 more" expander revealing all 8 genres.** Progressive disclosure rather than hardcoded N=3 with permanent hiding. DEPTH-02 "no hidden low-confidence predictions" is satisfied because nothing is permanently hidden — all 8 are accessible via one click.
  - **Why:** the 8 v2 genres × top-3 default cleanly matches DEPTH-01 ("default N=3") while the expander honors the spirit of DEPTH-02's no-hiding contract. Honest without being noisy.
  - **How to apply:** new `TopNList.tsx` renders the top-3 inline; a "+5 more" affordance (text button or chevron) expands to show all 8 below. State stays local to the component (no Zustand needed).

- **D-42: Horizontal probability bars, percent-labeled to 1 decimal, sorted descending by probability.** Each row: `<color-dot><genre-name><progress-bar><percent-label>`. Bar width = probability (no min-width hack, no log-scaling). Canonical NLP confidence display per FEATURES.md §3a + ARCHITECTURE.md §10.
  - **Why:** PITFALLS §"Anti-features" rejects pies; FEATURES.md §3a explicitly recommends probability bars; sort-descending matches "ranked predictions" language in DEPTH-01.
  - **How to apply:** `TopNList.tsx` mounted inside `ClassificationResult.tsx`, replacing the existing single-genre line at lines 19–41. The "View in Scatter" button + OOV summary stay below.

### C. Explainability composition

- **D-43: Ship BOTH P2 items in Phase 9 — DEPTH-06 (driving words) and DEPTH-07 (entropy badge).** Both have honest research-backed designs (FEATURES.md §3a + §3b). v2 milestone goal #3 demands "honest 'why this genre?' explanation that users can interrogate" — deferring half the explainability story breaks that.
  - **Why:** entropy is essentially free once `predict_proba` returns calibrated probabilities (D-37/D-38 make this true); driving-words has the per-genre w2v-centroid precompute already in scope (D-46 in `<research_inherited>`). Combined effort fits the phase budget; deferring forces a v3 phase to revisit the same files.
  - **How to apply:** plan them as separable atomic plans inside Phase 9 so they CAN be deferred individually under late scope pressure without rotating the SVM artifact.

- **D-44: Per-track contribution via LOCAL per-upload zero-ablation.** Two extra SVM calls per explain: predict with topology slab zeroed, predict with vocabulary slab zeroed. Contribution = `base_proba − zeroed_proba`. Normalize the two contributions to sum to 100. Returns `{"topology": pct, "vocabulary": pct}`.
  - **Why:** ARCHITECTURE.md §4 explicit recommendation; PITFALLS §9 mandates aggregation to interpretable units (per-track, not per-pixel); local-to-upload is more honest than a global statistic that doesn't explain THIS prediction. Two SVM calls × ~5 ms each = ~10 ms, well within the ~200 ms explain budget.
  - **How to apply:** new `backend/pipeline/explain.py::compute_track_contributions(feature_vec, svm_pipeline, alpha)`. Sums-to-100 enforced by unit test. Global `permutation_importance` deferred — could land in settings drawer as a v3 diagnostic.

- **D-45: 5 nearest training books, Euclidean distance on L2-normalized feature vectors.** DEPTH-04 specifies "3–5"; v2 corpus density (154 books, 8 genres, 15–25 per genre) supports 5. Euclidean on L2-normalized vectors is mathematically equivalent to cosine distance up to a monotone transform; sticking to Euclidean matches the DEPTH-04 wording verbatim.
  - **Why:** DEPTH-04 says "Euclidean" — picking it avoids "wait, what distance is this?" reader confusion. 5 over 3 because the v2 corpus is dense enough that the 4th/5th hit usually carries signal.
  - **How to apply:** `precompute_explain.py` writes L2-normalized training matrix to `explain_artifacts.npz`; FastAPI startup loads and fits `sklearn.neighbors.NearestNeighbors(n_neighbors=5, metric='euclidean')` on `app.state.nn_index`. Explain endpoint calls `kneighbors(feat_l2_norm, n_neighbors=5)`.

</decisions>

<research_inherited>
## Research-Inherited Decisions (areas not discussed this session — v2 research artifacts are the lock-source)

The user did not select these areas for discussion. Decisions below cite the v2 research verbatim. If a downstream agent finds these inadequate, surface to the user before deviating — do NOT relitigate silently.

### D. Explain endpoint infrastructure (locked by ARCHITECTURE.md §4 + §5b + §8)

- **D-46:** `POST /api/classify/{job_id}/explain` synchronous (~200 ms target). Path-param routing via job_id. (ARCHITECTURE.md §4 verbatim.)
- **D-47:** `feature_vec:{job_id}` written to Redis at end of `classify_book` (numpy bytes), 5-min TTL. Explain endpoint reads from Redis; NO recompute path. (ARCHITECTURE.md §4: "store in Redis at end of classify_book with 5-min TTL".)
- **D-48:** Explain cache `explain:{feature_vec_hash}:{model_hash}` TTL 1 h. `feature_vec_hash = sha256(feature_vec.tobytes())`; `model_hash` from lineage so the D-38 retrain invalidates the namespace automatically. (ARCHITECTURE.md §5b + BUG-05 pattern.)
- **D-49:** 410 Gone on TTL expiry, body `{"detail": "Upload expired — re-upload to see the explanation."}`. No async re-run path; 5-min TTL is the budget. Frontend `useExplain.ts::onError` catches the 410 and surfaces a re-upload prompt.
- **D-50:** Phase-9 precompute step emits `data/models/explain_artifacts.npz` with the training feature matrix (L2-normalized), per-book metadata, per-genre w2v-centroids, and k-means cluster → representative words map. Loaded once at FastAPI startup via `app.state`. (ARCHITECTURE.md §10 file checklist + precompute family pattern from Phase 8.)

### E. Disclaimer UX (locked by D-31 inheritance + PROJECT.md Key Decisions row)

- **D-51:** Author-leakage disclaimer surfaced in TWO places — pipeline walkthrough dialog (slow-read) AND footnote inside the new "Why this genre?" panel (in-context). NOT shown inline on every classification result. Per-upload honesty is delivered via the D-43 entropy badge.
- **D-52:** Entropy badge (D-43) tooltip cites the same one-sentence caveat as the D-51 footnote — consistent voice across honesty surfaces.
- **D-53:** NO retraction of v2 classification claims. Disclaimer copy frames the caveat as an "upper bound", never as "wrong". v2.1 follow-up closes the gap.

### F. Tests + frontend styling (locked by PITFALLS §7 + Phase 8 precedent)

- **D-54:** Math unit tests (Python) for top-N sum-to-1, per-track sum-to-100, nearest-neighbour count == 5, entropy in [0,1], driving-words length ≤ 15. Integration test (Python) for `/explain` endpoint shape against Phase 8 v2 SVM. Frontend Vitest tests for `TopNList.tsx` and `UncertaintyBadge.tsx`. NO Playwright in Phase 9 (defer to Phase 10's tour smoke test work).
- **D-55:** New components (`TopNList`, `ClassificationExplain`, `UncertaintyBadge`, `DrivingWordsPills`, `TrackContributionBars`, `NearestBooksList`) use inline-hex styling matching v1 `ClassificationResult.tsx` (`#16161F` card, `#F5F5FF` headlines, `#E0E0EC` body, `#6B6B80` muted, `#6366F1` action). Phase 10's dark-mode sweep refactors them all together via HSL CSS variables.

</research_inherited>

<canonical_refs>
## Canonical References

**Downstream agents (gsd-phase-researcher, gsd-planner, gsd-executor) MUST read these before planning or implementing.**

### Phase 9 contracts (research artifacts that ARE the locked design)

- [`.planning/research/ARCHITECTURE.md`](../../research/ARCHITECTURE.md) §4 (`/explain` endpoint shape — locked schema; D-46/D-47), §5b (explain cache live in Redis with TTL — D-48), §8 (cache invalidation plan including explain namespace), §10 (Phase 9 file-level checklist), §11 (open-questions: explainability technique + N value — both resolved by D-37..D-45).
- [`.planning/research/PITFALLS.md`](../../research/PITFALLS.md) §7 ("`decision_function` as probability" — D-37/D-38 compliance), §8 (SHAP synchronous on RBF SVM rejected — D-44 option-c implements), §9 (per-pixel persistence-image importance is meaningless — D-44 aggregates to per-track only).
- [`.planning/research/SUMMARY.md`](../../research/SUMMARY.md) §"Phase 9: Classification Depth" + §"Gaps to Address" #2/#3/#6 — all resolved by D-37..D-45.
- [`.planning/research/FEATURES.md`](../../research/FEATURES.md) §3a (top-N table stakes — D-41/D-42), §3b (explainability table stakes + differentiators — D-43/D-44/D-45 + DEPTH-06/07 P2 designs).
- [`.planning/research/STACK.md`](../../research/STACK.md) §"Supporting Libraries" (`CalibratedClassifierCV`, `permutation_importance`, `NearestNeighbors` already-installed sklearn helpers — no new install needed; SHAP stays in `requirements.txt` as documented dev-only escape hatch).

### Planning anchors

- [`.planning/PROJECT.md`](../../PROJECT.md) §"Constraints" mathematical invariants — D-44's track ablation preserves them (it never mutates the feature vector for SVM input; only for the local explanation re-prediction).
- [`.planning/REQUIREMENTS.md`](../../REQUIREMENTS.md) §"Classification Depth (Phase 9)" DEPTH-01..07 verbatim wording.
- [`.planning/ROADMAP.md`](../../ROADMAP.md) §"Phase 9: Classification Depth" success criteria + open-decisions list (calibration + explainability + top-N configurable — all resolved).

### Phase 8 inheritance — locked inputs

- [`.planning/phases/08-corpus-expansion/08-CONTEXT.md`](../08-corpus-expansion/08-CONTEXT.md) — D-22..D-36 including D-31 ship-with-disclaimer (D-51 surfaces it) and D-33 v2.0-data Release (Phase 9 retrains on top of that SVM).
- [`results/v2_validation_report.md`](../../../results/v2_validation_report.md) — v2 macro-F1, GroupKFold gap, per-author smoke test. D-51 disclaimer links here.
- [`data/models/svm_pipeline.joblib.lineage.json`](../../../data/models/svm_pipeline.joblib.lineage.json) — current v2 SVM lineage. D-38 retrain rotates the file + D-40 adds `calibration_method`.

### Phase 6 inheritance — load-bearing invariants

- BUG-05 lineage-aware `cache_key`. D-38 retrain rotates `model_hash` field in lineage → explain cache (D-48) keys rotate → no stale explanations served against the calibrated model.
- SVM lineage guard refuse-to-load on mismatch. D-40 extends the schema; the guard now catches calibration mismatches too.

### v1 codebase — files Phase 9 reads, modifies, or extends

- [backend/pipeline/classify.py](../../../backend/pipeline/classify.py) — current `(genre, confidence)` from `decision_function`; **MODIFIED** to return `list[tuple[str, float]]` of length 8 (full ranked list) from `predict_proba`, sorted descending. `TopNList.tsx` slices to top-3 + expander.
- [backend/pipeline/features.py](../../../backend/pipeline/features.py) — D-44 track-zeroing uses the `[alpha*topo_norm, (1-alpha)*loc_norm]` slice layout. Do NOT reorder.
- [backend/worker/jobs.py](../../../backend/worker/jobs.py) — `classify_book` SSE `result` dict gains `top_n`, `entropy`, `top1_top2_gap`. Also writes `feature_vec:{job_id}` to Redis (D-47) between Step 5 and Step 6.
- [backend/api/routes/classify.py](../../../backend/api/routes/classify.py) — **EXTENDED** with `POST /classify/{job_id}/explain` (or planner picks new `routes/explain.py`).
- [backend/api/models.py](../../../backend/api/models.py) — **EXTENDED** with `TopNPrediction`, `ExplainResponse`, `NearestTrainingBook`, `TrackContribution`, `DrivingWord`, `UncertaintyMetrics` (all with `extra='forbid'`).
- [backend/api/app.py](../../../backend/api/app.py) — startup loads `app.state.explain_artifacts` + fits `app.state.nn_index`.
- [config/params.yaml](../../../config/params.yaml) — ADDS `classify.calibration_method` field; does NOT touch existing values.
- [frontend/src/components/sidebar/ClassificationResult.tsx](../../../frontend/src/components/sidebar/ClassificationResult.tsx) — **MODIFIED** to host `<TopNList>` + `<UncertaintyBadge>` + `<button>Why?</button>` opening `<ClassificationExplain>`.
- [frontend/src/stores/uploadStore.ts](../../../frontend/src/stores/uploadStore.ts) — `ClassificationResult` interface gains `top_n`, `entropy`, `top1_top2_gap`.
- [frontend/src/hooks/useClassify.ts](../../../frontend/src/hooks/useClassify.ts) — parses new SSE fields into `uploadStore.result`.
- [frontend/src/constants/genres.ts](../../../frontend/src/constants/genres.ts) — `GENRE_COLORS` source for color dots. Phase 9 **READS**, never writes.
- [results/v2_validation_report.md](../../../results/v2_validation_report.md) — disclaimer surfaces D-51 link here.
- [scripts/06_validate.py](../../../scripts/06_validate.py) — Phase 9 extends with `calibration_decision()` OR adds new `scripts/calibrate.py` (planner picks).

### Phase 9 new files

- `backend/pipeline/explain.py` — orchestrator + three exported functions (`compute_track_contributions`, `find_nearest_training_books`, `compute_driving_words`).
- `backend/pipeline/precompute_explain.py` — emits `data/models/explain_artifacts.npz` after the D-38 retrain.
- `backend/api/routes/explain.py` — OR extends `classify.py` (planner picks).
- `frontend/src/components/sidebar/TopNList.tsx` — top-3 bars + "+5 more" expander (D-41).
- `frontend/src/components/sidebar/ClassificationExplain.tsx` — expander panel hosting the four sub-components.
- `frontend/src/components/sidebar/UncertaintyBadge.tsx` — entropy badge.
- `frontend/src/components/sidebar/DrivingWordsPills.tsx` — top-15 pill list with disclosure.
- `frontend/src/components/sidebar/TrackContributionBars.tsx` — two-bar topology/vocabulary split.
- `frontend/src/components/sidebar/NearestBooksList.tsx` — 5-book list.
- `frontend/src/hooks/useExplain.ts` — React Query `useMutation` calling `POST /classify/{job_id}/explain`.
- `results/v2_calibration_report.md` — calibration evidence (D-39).
- `data/models/explain_artifacts.npz` — precomputed artifact (LFS).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`backend/pipeline/features.py::build_feature_vector`** produces `[alpha*topo_norm, (1-alpha)*loc_norm]` with known slice boundaries — D-44 track-zeroing uses the slice indices directly.
- **`backend/pipeline/classify.py::predict_genre`** is a single-prediction wrapper; modifying it to return ranked top-N via `predict_proba` is a localized edit (~10 lines).
- **`backend/worker/jobs.py::classify_book`** has the `cancel_event` plumbing already; D-47 feature_vec Redis write fits between Step 5 (features) and Step 6 (classify) with no orchestration restructure.
- **`backend/cache/lineage.py`** provides memoized `corpus_hash()` and `w2v_model_sha256()`; D-48 explain cache key extends the pattern with `sha256(feature_vec.tobytes())` + lineage's `model_hash`.
- **`backend/api/app.py` lifespan startup** already loads `ctx['svm_pipeline']`, `ctx['kmeans']`, `ctx['w2v_model']`; D-50 explain_artifacts load matches this pattern.
- **`frontend/src/components/sidebar/ClassificationResult.tsx:1` already imports `GENRE_COLORS`** — D-42/D-45/D-46 reuse for color-dot consistency.
- **`frontend/src/hooks/useClassify.ts`** is the template for `useExplain.ts` (React Query mutation form for the synchronous POST).
- **`scripts/06_validate.py`** was extended in Phase 8 Wave 3 with `evaluate_on_holdout`, `cross_validate_grouped`, `per_author_held_out_smoke_test`; D-37 calibration spike extends with `calibration_decision()` scoring Brier on the same 20-book hold-out.

### Established Patterns

- **Content-addressed disk cache (BUG-05):** Phase 9 does NOT touch disk cache. Explain cache is a separate Redis namespace per ARCHITECTURE.md §5b — different lifetime (1 h TTL), different scope (per-upload ephemeral), different storage (Redis).
- **Lineage sidecar for model artifacts:** D-40 extends with `calibration_method`. The Phase 6 refuse-to-load-on-mismatch behavior extends naturally.
- **arq context loading at startup:** D-50 adds `ctx['explain_artifacts']` and `ctx['nn_index']`.
- **Redis pub/sub for job progress:** existing `job:{id}:progress` channel; the explain endpoint is regular HTTP, NOT pub/sub.
- **Pydantic models with `extra='forbid'`:** existing `CorpusBookFull` enforces this; new explain models follow.
- **Tests live alongside source:** `backend/tests/test_*.py` and `frontend/src/components/**/__tests__/*.test.tsx`. D-54 follows the layout.
- **Inline-hex styling in v1 frontend:** D-55 honors the pattern; CSS variables wait for Phase 10.

### Integration Points

- `backend/worker/jobs.py::classify_book` → Redis `feature_vec:{job_id}` (D-47); SSE result payload gains `top_n` / `entropy` / `top1_top2_gap`.
- `POST /api/classify/{job_id}/explain` → `backend/pipeline/explain.py::compute_explanation` → reads `feature_vec:{job_id}` from Redis → hits the `explain:{hash}:{model_hash}` cache first.
- `backend/api/app.py` startup → `app.state.explain_artifacts` + `app.state.nn_index` (D-50).
- `frontend/src/components/sidebar/ClassificationResult.tsx` → hosts `<TopNList>` + `<UncertaintyBadge>` + Why-button → `<ClassificationExplain>`.
- `frontend/src/hooks/useExplain.ts` → `POST /api/classify/{job_id}/explain` (React Query mutation); on 410, surfaces re-upload prompt.
- `scripts/06_validate.py` (or new `scripts/calibrate.py`) → `results/v2_calibration_report.md` + appends to `results/validation_history.log`.
- `backend/pipeline/precompute_explain.py` → `data/models/explain_artifacts.npz`; runs ONCE after the D-38 SVM retrain.

### Anti-patterns to avoid

- **Don't bolt `probability=True` onto the existing v2 SVM.** PITFALLS §7. D-38 mandates full retrain.
- **Don't use Kernel SHAP for live explanations.** PITFALLS §8.
- **Don't expose per-pixel persistence-image importance.** PITFALLS §9. D-44 aggregates to per-track only.
- **Don't softmax the raw `decision_function`.** PITFALLS §7. Use libsvm Platt or `CalibratedClassifierCV`.
- **Don't change the v1/v2 feature vector slice layout.** D-44 zero-ablation assumes the existing slice order.
- **Don't surface inline disclaimer on every classification result.** D-51 keeps the leakage caveat in two intentional places.
- **Don't touch `frontend/src/constants/genres.ts::GENRE_COLORS`** — Phase 10 owns.
- **Don't introduce CSS variables in Phase 9 components.** D-55.

</code_context>

<claude_discretion>
## Claude's Discretion (planner-level open items)

These are NOT gray areas the user must rule on — they're planner-level structural choices where multiple paths are equally defensible:

- **Plan structure & wave sequencing.** Reasonable shape (informational, not prescriptive): (1) calibration spike + SVM retrain + calibration report; (2) precompute_explain artifact + explain.py backend module + endpoint; (3) frontend TopNList + UncertaintyBadge + ClassificationResult rewire; (4) frontend ClassificationExplain + DrivingWordsPills + NearestBooksList + TrackContributionBars + useExplain hook; (5) walkthrough disclaimer + tests + commit. Plan P2 items (DEPTH-06, DEPTH-07) as separable atomic plans so they CAN be deferred under late scope pressure without rotating the SVM artifact.
- **Endpoint module location.** `backend/api/routes/classify.py` extension vs new `backend/api/routes/explain.py`. Latter is cleaner if the explain Pydantic models grow beyond one screen.
- **Pydantic model file organization.** Extend `backend/api/models.py` vs new `backend/api/explain_models.py`. Planner picks based on size.
- **React Query usage for `/explain`.** `useMutation` (matches synchronous POST + onError 410 handling) is recommended over `useQuery` with manual trigger.
- **Calibration script location.** Extend `scripts/06_validate.py` vs new `scripts/calibrate.py`. The latter keeps `06_validate.py` focused on validation; the former avoids a new file.
- **Reliability-diagram artifact format.** Markdown table vs embedded PNG. Markdown is review-friendly; PNG is exportable. Either or both.
- **Driving-words pill count.** D-43 commits to the design from FEATURES.md §3b (top-15 highest TF-IDF, nearest-genre tag, disclosure copy). Planner may show fewer if the upload has fewer distinct high-weight words.
- **Entropy threshold tuning.** Research default thresholds (`top1 − top2 < 0.10` OR normalized entropy `> 0.7`); planner may adjust based on observed distribution on the 20-book hold-out during the calibration spike (D-37) — the same Brier evaluation produces the proba distribution needed to set the threshold defensibly.
- **`precompute_explain.py` integration with the existing precompute family.** Separate `python -m backend.pipeline.precompute_explain` call (matches `precompute_viz` / `precompute_vr`) vs folding into `precompute.py`. Separate is cleaner.
- **Walkthrough disclaimer placement.** Planner verifies the v1 component name and picks "new Validation & Limitations section" vs "extend existing copy".
- **Backwards-compat behavior on missing `calibration_method` lineage field.** D-40 says "treat as 'none' and refuse top-N"; planner picks the graceful fallback path (existing single-genre behavior OR 503 with explicit retrain instruction).

### Folded Todos

*None — `gsd-tools todo match-phase 9` returned 0 pending todos.*

</claude_discretion>

<specifics>
## Specifics

- **The per-track ablation in D-44 uses the FULL feature vector with one slab zeroed in-place**, NOT the half-vector alone. Reference math:
  ```python
  base_proba = svm.predict_proba(feat.reshape(1, -1))[0, predicted_idx]
  feat_vocab_zeroed = feat.copy(); feat_vocab_zeroed[vocab_slice] = 0
  feat_topo_zeroed  = feat.copy(); feat_topo_zeroed[topo_slice]   = 0
  topo_contrib  = base_proba − svm.predict_proba(feat_topo_zeroed.reshape(1, -1))[0, predicted_idx]
  vocab_contrib = base_proba − svm.predict_proba(feat_vocab_zeroed.reshape(1, -1))[0, predicted_idx]
  # Normalize to sum to 100; surface signs (negative contribution means "this track pulled AWAY from predicted genre")
  ```
- **Brier score is the calibration tie-breaker (D-37).** If within 1e-3, default to `libsvm_platt` (simpler, no wrapper class). Planner records the tie-break in `v2_calibration_report.md`.
- **Test for prediction-vs-`predict_proba` disagreement.** sklearn warns this can happen with small datasets and Platt CV. If observed, log + surface as low-confidence via the D-43 entropy badge.
- **Driving-words pill order** (research default): by TF-IDF descending, ties broken alphabetically. Nearest-genre tag is informational; pills do NOT reorder by genre.
- **Entropy formula** (research default): `H_normalized = -sum(p * log2(p)) / log2(n_classes)` where `n_classes = 8` for v2. Max raw entropy = 3 bits; threshold 0.7 normalized ⇒ raw entropy > 2.1 bits.
- **Walkthrough disclaimer copy** (research default, planner refines): "v2's classifier was validated on a 20-book hold-out drawn from the same authors as the training corpus; the macro-F1 of 0.7367 is an upper bound. For books by authors not in the training set (most real uploads), expect a wider confidence-band — the 'Why this genre?' panel surfaces the per-prediction signal that lets you judge." Link to `results/v2_validation_report.md`.
- **The 410 Gone failure mode (D-49)** needs frontend handling — `useExplain.ts::onError` catches the 410, sets a state flag, `ClassificationExplain.tsx` renders a "Upload expired — please re-upload to see explanation" message with the existing UploadZone trigger. Graceful UX, not a hidden error.
- **Explain artifact size**: ~154 books × (20×20 grid² + 200 cluster) × 4 bytes (float32) ≈ 370 KB feature matrix. Plus metadata + centroids ≈ under 1 MB total. Comfortable LFS object.

</specifics>

<deferred>
## Deferred Ideas

- **Counterfactual explanations** ("remove these words and re-predict") — FEATURES.md §3b HIGH-complexity differentiator. v3.
- **"Closest training book at each pipeline stage"** (per point-cloud, per persistence-image, per final-feature) — FEATURES.md §3b MEDIUM-HIGH differentiator. v3.
- **Multi-label classification + "why this genre cluster?"** — Phase 7 RES-03 deferred to v3.
- **Settings-drawer calibration plot UI surfacing** — Phase 9 produces the file artifact (D-39); UI exposure is a separate v3 change unless Phase 10 picks it up.
- **Top-N N as a runtime setting toggle** — D-41 ships top-3 + expander; configurable N is v3 if user demand surfaces.
- **Per-author retraining / per-author cap to close CEXP-04** — v2.1 follow-up per STATE.md.
- **Promoting `_GENRE_COLORS` to single source of truth** — pre-existing v3 TODO in `corpus.py:28`.
- **Kernel SHAP dev-only debug explorer** — `shap==0.51.0` stays in `requirements.txt` per STACK.md, NOT imported by Phase 9 production code. v3 dev tooling at most.
- **Global per-track permutation_importance diagnostic** — D-44 uses LOCAL ablation; global track importance is a meaningful but different question. v3 settings drawer.
- **"Why this genre?" sharable URL** (SHARE-01 in Parking Lot) — v3.
- **HTTP/SSE streaming of explain payload** — DEPTH-03 contracts synchronous; streaming gains nothing at 200 ms latency. v3 if explain compute grows.

### Reviewed Todos (not folded)

*None — `gsd-tools todo match-phase 9` returned 0 pending todos.*

</deferred>

---

*Phase: 09-classification-depth*
*Context gathered: 2026-05-27 via interactive `/gsd-discuss-phase 9` — user selected Calibration & Top-N + Explainability composition for discussion; remaining four areas locked from v2 research artifacts.*
