---
phase: 09-classification-depth
plan: 01
subsystem: ml-classification
tags: [calibration, brier-score, platt-scaling, sklearn, svm, lineage, entropy]

# Dependency graph
requires:
  - phase: 06-v1-bug-fix-sweep
    provides: BUG-05 cache_key lineage (corpus_hash + w2v_model_sha256) + write_svm_lineage/verify_svm_lineage scaffolding
  - phase: 08-corpus-expansion
    provides: 154-book v2 corpus + word2vec_w15.model + tfidf_vectorizer_w15.joblib + svm_pipeline.joblib (pre-calibration)
provides:
  - Single source of truth for HOLDOUT_GUTENBERG_IDS (scripts/constants.py)
  - D-37 empirical calibration winner (libsvm_platt; Brier 0.3459 vs 0.6041 for CalibratedClassifierCV-StratifiedKFold)
  - D-38 retrained calibrated SVM (svm_pipeline.joblib) with predict_proba summing to 1.0 ± 1e-6
  - D-39 calibration evidence artifact (results/v2_calibration_report.md + reliability PNG)
  - D-40 extended SVM lineage schema (calibration_method, calibration_brier_score, calibration_report)
  - Q4 confirm-or-adjust entropy threshold decision (`tighten`; operative gap<0.2801 OR norm_entropy>0.7738)
  - Wave-0 test scaffolds (test_explain_math.py, test_lineage_calibration.py, fixtures/feature_vec_sample.npy)
affects:
  - 09-02 (precompute_explain + nearest-books)
  - 09-03 (DEPTH-07 entropy badge -- reads operative_gap_threshold + operative_entropy_threshold from this report)
  - 09-04..06 (frontend top-N + explain panel -- consume calibrated predict_proba)
  - 10 (visual polish builds on calibrated probabilities)

# Tech tracking
tech-stack:
  added:
    - sklearn.calibration.CalibratedClassifierCV (probability calibration wrapper)
    - sklearn.calibration.CalibrationDisplay (reliability diagram helper)
    - sklearn.model_selection.StratifiedKFold (LOOCV-equivalent for multiclass calibration)
    - sklearn.metrics.log_loss (supplementary multiclass scoring)
    - matplotlib.use('Agg') headless backend in scripts/calibrate.py
  patterns:
    - "Single source of truth for cross-script constants (scripts/constants.py imported by both scripts/calibrate.py and scripts/06_validate.py + asserted against v1_baseline JSON record)"
    - "Calibration choice driven by config/params.yaml::classify.calibration_method, validated by D-40 lineage allow-list at SVM load time"
    - "Manual multiclass Brier score (sklearn 1.6 brier_score_loss is binary-only)"
    - "Q4 confirm-or-adjust threshold-tuning rule producing an explicit Markdown decision section that downstream plans grep for"

key-files:
  created:
    - scripts/constants.py
    - scripts/calibrate.py
    - scripts/rebuild_per_book_artifacts.py
    - backend/tests/test_explain_math.py
    - backend/tests/test_lineage_calibration.py
    - backend/tests/fixtures/feature_vec_sample.npy
    - backend/tests/fixtures/__init__.py
    - results/v2_calibration_report.md
    - results/figures/v2_calibration_reliability.png
  modified:
    - backend/cache/lineage.py
    - backend/pipeline/precompute.py
    - backend/tests/test_lineage_smoke.py
    - config/params.yaml
    - data/models/svm_pipeline.joblib
    - data/models/svm_pipeline.joblib.lineage.json
    - scripts/06_validate.py

key-decisions:
  - "D-37 winner: libsvm_platt (Brier=0.3459 << 0.6041 for CalibratedClassifierCV-StratifiedKFold-5); empirical delta=0.2583 >> 1e-3 tie-break threshold so tie-break rule did not fire"
  - "Q4 entropy threshold decision: `tighten`; operative gap<0.2801 (25th percentile) and normalized entropy>0.7738 (75th percentile). Defaults fired on 9/17 (53%) hold-out -- within the 50-80% 'tighten' band per the Q4 rule"
  - "Plan-prescribed cv=LeaveOneOut() for CalibratedClassifierCV is rejected by sklearn 1.6.1 for multiclass (each fold's test split contains only one class). Substituted StratifiedKFold(n_splits=5, shuffle=True, random_state=42) -- closest sklearn-supported analogue. Lineage label `calibrated_cv_sigmoid` preserved for D-40 allow-list compatibility"

patterns-established:
  - "Pre-Phase-9 SVMs refuse to load via verify_svm_lineage (D-40 mandate): missing calibration_method → 'pre-Phase-9 SVM, must be retrained for top-N'"
  - "Build-time helper scripts/rebuild_per_book_artifacts.py separates 'per-book pipeline outputs' from 'W2V retrain' -- lets future operators refresh features without rotating w2v_model_sha256"
  - "Calibration report's `## Entropy threshold decision` YAML block is the contract between this plan and 09-03 -- 09-03 reads operative_gap_threshold + operative_entropy_threshold verbatim"

requirements-completed:
  - DEPTH-01

# Metrics
duration: 26min
completed: 2026-05-27
---

# Phase 9 Plan 01: SVM Calibration Spike, Retrain, Lineage Extension & Test Scaffolds Summary

**Empirical calibration winner picked (libsvm Platt, Brier 0.3459 << 0.6041 for CalibratedClassifierCV-StratifiedKFold-5), SVM retrained with predict_proba summing to 1.0, D-40 lineage extended with three new fields and refuse-to-load guard, Wave-0 test scaffolds + feature_vec fixture landed, entropy threshold decision (`tighten`; gap<0.2801, norm_entropy>0.7738) committed for plan 09-03 to consume.**

## Performance

- **Duration:** 26 min (excluding pipeline rebuild time which ran in background)
- **Started:** 2026-05-27T02:33:39+09:00
- **Completed:** 2026-05-27T02:59:20+09:00
- **Tasks:** 3 atomic + 1 metadata follow-up
- **Files modified:** 17 (7 modified + 10 created)

## Accomplishments

- **D-37 empirical winner picked.** libsvm Platt vs CalibratedClassifierCV scored on the 17 in-comparison hold-out books. libsvm_platt won decisively (Brier 0.3459 vs 0.6041; delta 0.2583 well above the 1e-3 tie-break threshold).
- **D-38 retrain executed.** `data/models/svm_pipeline.joblib` rotated. `svm.predict_proba(X)` now returns a (1, 8) matrix whose rows sum to 1.0 within 1e-6. Deployed-model Brier on in-comparison hold-out: 0.0481 (training-set inclusion).
- **D-39 calibration evidence artifact landed.** `results/v2_calibration_report.md` contains: Brier table, reliability PNG link, entropy distribution percentiles, and the load-bearing `## Entropy threshold decision` YAML block that plan 09-03 will read. `results/figures/v2_calibration_reliability.png` is the 8-subplot reliability diagram (164 KB).
- **D-40 lineage schema extension landed.** `data/models/svm_pipeline.joblib.lineage.json` gained `calibration_method` / `calibration_brier_score` / `calibration_report`. `verify_svm_lineage` now refuses pre-Phase-9 SVMs (missing `calibration_method`) and any unknown calibration_method value -- the allow-list is `{libsvm_platt, calibrated_cv_sigmoid}`.
- **Wave-0 test scaffolds + fixtures landed.** 6 explain math tests (Brier perfect/uniform/range + normalized-entropy uniform/certain/range), 4 lineage calibration tests (missing/unknown/libsvm_platt/calibrated_cv_sigmoid), and the deterministic 600-D feature_vec_sample.npy fixture for Wave-2 explain math tests.
- **Single source of truth for HOLDOUT_GUTENBERG_IDS established.** `scripts/constants.py` is the only place the 20 pinned hold-out ids live. Both `scripts/calibrate.py` and `scripts/06_validate.py` import from it. T-9-31 mitigation: `main()` of 06_validate asserts the constant matches the v1_baseline JSON record before writing any report.
- **Q4 confirm-or-adjust entropy threshold decision committed.** Decision: `tighten`. Defaults fired on 9/17 (53%) hold-out -- within the 50-80% band per the Q4 rule. Operative thresholds (25th-percentile gap, 75th-percentile normalized entropy) are baked into the `## Entropy threshold decision` YAML block for 09-03 to consume.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave-0 test scaffolds + multiclass Brier helper + entropy formula + feature_vec fixture** — `b124413` (test)
2. **Task 3: Extend verify_svm_lineage + write_svm_lineage for D-40 calibration_method check** — `fb73f9b` (feat; executed before Task 2 because Task 2's precompute call relies on the extended lineage write)
3. **Task 2: Calibration spike + scripts/constants.py + retrained SVM + report + feature_vec fixture** — `2ffead0` (feat)

**Plan metadata:** _(this commit)_

## Files Created/Modified

**Created:**
- `scripts/constants.py` — Single source of truth for HOLDOUT_GUTENBERG_IDS (20 pinned ids).
- `scripts/calibrate.py` — D-37 calibration spike CLI; fits both methods, scores Brier + log-loss, plots reliability diagrams, writes the v2_calibration_report.md with the operative entropy thresholds.
- `scripts/rebuild_per_book_artifacts.py` — Fresh-machine helper to regenerate per-book vectors/tfidf/words from existing W2V model (skips W2V retrain that would rotate lineage).
- `backend/tests/test_explain_math.py` — 6 tests covering multiclass Brier + normalized entropy math.
- `backend/tests/test_lineage_calibration.py` — 4 tests covering D-40 lineage extension (refuse missing/unknown, accept libsvm_platt + calibrated_cv_sigmoid).
- `backend/tests/fixtures/__init__.py` — empty file so pytest discovers the fixtures directory.
- `backend/tests/fixtures/feature_vec_sample.npy` — first training book's 600-D feature vector (float64) for Wave-2 deterministic explain tests.
- `results/v2_calibration_report.md` — D-39 evidence artifact with `## Entropy threshold decision` YAML block.
- `results/figures/v2_calibration_reliability.png` — 8-subplot reliability diagram (164 KB).

**Modified:**
- `backend/cache/lineage.py` — `write_svm_lineage` accepts 3 new D-40 kwargs; `verify_svm_lineage` enforces calibration_method allow-list.
- `backend/pipeline/precompute.py` — Reads `classify.calibration_method` from params.yaml, builds the matching pipeline (libsvm_platt or calibrated_cv_sigmoid), computes Brier on in-comparison hold-out, writes D-40 lineage fields. Also dumps feature_vec_sample.npy fixture during training.
- `backend/tests/test_lineage_smoke.py` — Two existing Phase-6/D-25 tests updated to match the new D-40 contract (now pass calibration_method through write_svm_lineage and assert the rotated `created_by` provenance string).
- `config/params.yaml` — Added top-level `classify:` section with `calibration_method: libsvm_platt`.
- `data/models/svm_pipeline.joblib` — Rotated. Now ships with libsvm Platt calibration; `predict_proba` returns (n, 8) sum-to-1 matrices.
- `data/models/svm_pipeline.joblib.lineage.json` — Rotated with `calibration_method` / `calibration_brier_score` / `calibration_report` fields. corpus_hash + w2v_model_sha256 unchanged.
- `scripts/06_validate.py` — Imports HOLDOUT_GUTENBERG_IDS from scripts.constants at module level; main() asserts the constant matches v1_baseline JSON record (T-9-31 drift mitigation); report's per-book id list now derives from the constant.

## Decisions Made

- **D-37 winner: libsvm_platt.** Empirical Brier delta of 0.2583 is well above the 1e-3 tie-break threshold so the tie-break rule did not fire. CalibratedClassifierCV with sigmoid + 5-fold CV scored substantially worse (0.6041 Brier, 1.2652 log-loss). Rationale: small per-class hold-out support (~2 books per class × 8 classes) means the 5-fold inner CV in CalibratedClassifierCV is unstable, while libsvm's internal Platt scaling produces a single sigmoid per pairwise classifier that is more robust at this data scale.
- **Q4 entropy threshold decision: `tighten`.** Research defaults (`gap < 0.10` OR `normalized_entropy > 0.70`) fire on 9/17 (53%) hold-out books -- within the 50-80% "tighten" band per the Q4 rule table. Operative thresholds raised to 25th-percentile gap (0.2801) and 75th-percentile normalized entropy (0.7738). These values land in `backend/pipeline/explain.py` via plan 09-03.
- **Single source of truth for HOLDOUT_GUTENBERG_IDS.** Both calibrate.py AND 06_validate.py now import from scripts.constants. 06_validate asserts the constant matches v1_baseline_results.json before writing the validation report (T-9-31 mitigation). Drift between the two would now AssertionError at runtime rather than silently disagreeing.
- **Lineage `created_by` rotated** to `'Plan 09-01 (DEPTH-01 D-40)'` to reflect the new authorship; existing test_lineage_smoke tests updated to match.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CalibratedClassifierCV rejects cv=LeaveOneOut() for multiclass**
- **Found during:** Task 2 (calibrate.py first synthetic dry-run)
- **Issue:** Plan specified `CalibratedClassifierCV(method='sigmoid', cv=LeaveOneOut())` for the second candidate. sklearn 1.6.1 raises `ValueError: LeaveOneOut cross-validation does not allow all classes to be present in test splits` because LOOCV folds have a single class in the test split.
- **Fix:** Substituted `StratifiedKFold(n_splits=5, shuffle=True, random_state=42)`. This is the closest CV strategy sklearn accepts that mirrors LOOCV's small-fold character on a ~140-book corpus (~5-7 books per genre per fold given 8 classes). The calibration_method lineage label remains `calibrated_cv_sigmoid` so the D-40 allow-list is unchanged.
- **Files modified:** scripts/calibrate.py (`build_calibrated_cv_pipeline`), backend/pipeline/precompute.py (CalibratedClassifierCV branch).
- **Verification:** Calibration spike runs end-to-end on real corpus features; both pipelines fit; report writes; rejected method scores Brier 0.6041 vs libsvm_platt's 0.3459 (clear empirical winner regardless of CV choice).
- **Committed in:** `2ffead0` (Task 2 commit). Documented in method docstring and in `results/v2_calibration_report.md` Method column.

**2. [Rule 3 - Blocking] Missing data/features/ -- regenerated from existing models**
- **Found during:** Task 2 (preparing to run calibrate.py)
- **Issue:** Fresh machine had `data/models/*` from LFS pull but no `data/features/*` (diagrams, feature_matrix, labels, book_order). Per CLAUDE.md fresh-machine setup, step 5 says "rebuild per-book feature vectors from existing models" via 05_build_features.py -- but step 05 requires diagrams from step 04, which require per-book vectors from step 03. Step 03 retrains the W2V model and would rotate `w2v_model_sha256` (breaking the D-40 lineage match against the deployed lineage hash).
- **Fix:** Created `scripts/rebuild_per_book_artifacts.py` that produces per-book `vectors_*.npy` / `tfidf_*.npy` / `words_*.json` using the EXISTING `word2vec_w15.model` + `tfidf_vectorizer_w15.joblib` (no retrain). Pipeline order on fresh machine: 01 (download) → 02 (preprocess) → rebuild_per_book_artifacts → 04 (homology) → 05 (features) → calibrate → precompute. corpus_hash + w2v_model_sha256 preserved at `3f4fe940...` / `cd81f9e6...` exactly.
- **Files modified:** scripts/rebuild_per_book_artifacts.py (new).
- **Verification:** Post-pipeline `corpus_hash()` returns `3f4fe9400b023f0847bc6975da4f3793fdd3b4db4dfc44979d43cc9b75a869d9` (unchanged); `verify_svm_lineage` returns `(True, 'lineage matches')` against the new SVM.
- **Committed in:** `2ffead0` (Task 2 commit).

**3. [Rule 1 - Bug] Existing test_lineage_smoke tests broke under the D-40 contract**
- **Found during:** Task 3 (running pre-existing tests after extending verify_svm_lineage)
- **Issue:** `test_svm_lineage_verify_matches` called `write_svm_lineage` without `calibration_method` and expected `verify_svm_lineage` to return `(True, ...)`. Under D-40 this is EXPECTED to fail (no calibration_method → refuse). Also `test_svm_lineage_sidecar_contents` asserted the `created_by` provenance string of `'Plan 06-05 (BUG-05)'`, which I rotated to `'Plan 09-01 (DEPTH-01 D-40)'` to reflect the new authorship.
- **Fix:** Updated both tests to match the new D-40 contract -- pass calibration_method through write_svm_lineage in the verify test, and assert the rotated provenance string + new D-40 fields in the sidecar contents test.
- **Files modified:** backend/tests/test_lineage_smoke.py.
- **Verification:** All 12 lineage tests now green (8 existing + 4 new Task-1 lineage_calibration).
- **Committed in:** `fb73f9b` (Task 3 commit).

---

**Total deviations:** 3 auto-fixed (1 Rule-1 bug fix in plan-prescribed sklearn API usage, 1 Rule-3 environment blocker fixed by creating a helper script, 1 Rule-1 bug-fix in pre-existing tests that asserted the pre-Phase-9 contract).
**Impact on plan:** All three are correctness-required. Rule 1 #1 ensures sklearn accepts the calibration pipeline at all. Rule 3 #2 lets the fresh-machine pipeline run end-to-end without rotating the lineage. Rule 1 #3 keeps the existing test suite passing under the new contract. No scope creep.

## Issues Encountered

- **Original SVM was `SVC(C=10)` without `probability=True`** -- expected, that's exactly what D-37/D-38 mandate fixing. Confirmed via `joblib.load` inspection at the start of execution.
- **CLAUDE.md fresh-machine setup is incomplete** -- it says "step 5 rebuilds features from existing models" but step 05 needs diagrams that are themselves not LFS-tracked. The `scripts/rebuild_per_book_artifacts.py` helper closes this gap and should be referenced in a future CLAUDE.md update (deferred to phase 10 doc polish).
- **151 books processed (not 154)** -- 3 books fell below the `min_unique_words=3000` threshold during preprocessing: "Metamorphosis", "The Call of Cthulhu", "The Gods of Pegana". This matches the Phase 8 v2 corpus behavior (the v2 corpus_hash already reflects this filtering).

## User Setup Required

None -- no external service configuration required. The calibration spike + retrain runs entirely from build-time artifacts on the operator's machine.

## Next Phase Readiness

Plan 09-02 (precompute_explain + nearest-books):
- Calibrated `predict_proba` is available on `svm_pipeline.joblib` for the local zero-ablation calls in D-44.
- `backend/tests/fixtures/feature_vec_sample.npy` is the deterministic SVM-input fixture for the upcoming explain math tests.
- `verify_svm_lineage` will refuse to load any pre-Phase-9 SVM artifact, so the operator running 09-02's precompute_explain will get a clear error if the retrained SVM is not on disk.

Plan 09-03 (DEPTH-07 entropy badge):
- Operative thresholds are in `results/v2_calibration_report.md` under `## Entropy threshold decision` (`operative_gap_threshold: 0.2801`, `operative_entropy_threshold: 0.7738`).
- The Q4 decision reasoning is captured in the report's `rationale` paragraph and can be quoted verbatim in the 09-03 docstring for `ENTROPY_BADGE_DEFAULT_*` constants.

## Self-Check: PASSED

Verified deliverables on disk:
- `scripts/constants.py` -- FOUND
- `scripts/calibrate.py` -- FOUND (with import from scripts.constants, no inline list)
- `scripts/rebuild_per_book_artifacts.py` -- FOUND
- `backend/tests/test_explain_math.py` -- FOUND (6 tests passing)
- `backend/tests/test_lineage_calibration.py` -- FOUND (4 tests passing)
- `backend/tests/fixtures/feature_vec_sample.npy` -- FOUND (shape (600,) float64)
- `results/v2_calibration_report.md` -- FOUND (contains `## Entropy threshold decision`, `operative_gap_threshold`, `operative_entropy_threshold`, `Winner:`, `Reliability diagrams`, `Brier`)
- `results/figures/v2_calibration_reliability.png` -- FOUND (164 KB)
- `data/models/svm_pipeline.joblib` -- FOUND (predict_proba returns (1,8) sum-to-1 matrices)
- `data/models/svm_pipeline.joblib.lineage.json` -- FOUND (calibration_method=libsvm_platt, calibration_brier_score=0.0481, calibration_report=results/v2_calibration_report.md)
- `config/params.yaml` -- contains `classify.calibration_method: libsvm_platt`

Verified commits exist:
- `b124413` -- test(09-01): add Wave-0 explain-math + lineage-calibration test scaffolds — FOUND
- `fb73f9b` -- feat(09-01): extend SVM lineage with D-40 calibration_method guard — FOUND
- `2ffead0` -- feat(09-01): land D-37 calibration spike, D-38 retrain, D-39 report, D-40 lineage — FOUND

Verified test suite:
- 33 tests passing (6 explain_math + 4 lineage_calibration + 14 lineage_smoke/test_lineage + 9 test_06_validate)

---
*Phase: 09-classification-depth*
*Completed: 2026-05-27*
