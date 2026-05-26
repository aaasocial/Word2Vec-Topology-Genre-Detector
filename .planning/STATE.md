---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: — Shipped
status: executing
last_updated: "2026-05-27T03:14:00Z"
last_activity: 2026-05-27
progress:
  total_phases: 10
  completed_phases: 8
  total_plans: 37
  completed_plans: 33
  percent: 89
---

# STATE

## Current Position

Phase: 09 (classification-depth) — EXECUTING
Plan: 3 of 6 (plans 09-01 and 09-02 complete; next is 09-03)

- **Milestone:** v2.0 — Accuracy, Depth, and Polish
- **Phase:** 09
- **Plans complete:** 2/6
- **Status:** Executing Phase 09 (plan 09-02 landed precompute_explain artifact + FastAPI lifespan extension; DEPTH-04 + DEPTH-06 closed)
- **Last activity:** 2026-05-27

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

### Known limitations (deferred to v2.1 / future phase)

- **CEXP-04 author-leakage BLOCKED** — v2 SVM generalizes poorly to unseen authors (15 of 34 multi-book authors score 0% when held out). Honest mitigation candidates for v2.1: max-N-per-author cap in corpus design, or per-author held-out fine-tuning routine.
- **86 dropped corpus rows** — listed in `.planning/research/v2/v1_to_v2_migration.md` "08.1 Final Resolution". Re-sourcing them via authoritative author bibliographies is a candidate for Phase 8.2 if corpus growth back toward 240 books is desired.
- **7 advisory code-review warnings** — see `08-REVIEW.md`. Can be addressed via `/gsd-code-review-fix 08` when convenient.

### Next step

Phase 9 (Classification Depth) — plan 09-02 complete 2026-05-27. Run `/gsd-execute-phase 9` to land plan 09-03 (DEPTH-07 entropy badge + Wave-2 explain endpoint logic).

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
