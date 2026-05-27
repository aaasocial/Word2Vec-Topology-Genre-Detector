---
phase: 9
slug: classification-depth
status: signed-off
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-27
filled: 2026-05-27
---

# Phase 9 — Validation Strategy (signed off)

Per-phase validation contract for feedback sampling during execution. Filled per RESEARCH.md Validation Architecture section.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| Backend framework | pytest 7+ (existing convention) |
| Frontend framework | Vitest + @testing-library/react (existing convention) |
| Backend config | pytest discovers from project root; no separate pytest.ini change needed |
| Frontend config | vitest.config.ts (existing) |
| Quick run (backend) | `pytest backend/tests/test_explain_math.py -x -q` (~2s) |
| Quick run (frontend) | `cd frontend && npm test -- TopNList UncertaintyBadge --run` (~5s) |
| Full suite (backend) | `pytest backend/ scripts/` |
| Full suite (frontend) | `cd frontend && npm test --run` |
| Estimated runtime (full) | ~45s backend + ~30s frontend |

---

## Sampling Rate

- After every task commit: quick run combined (<10s)
- After every plan wave: full backend + full frontend suites
- Before `/gsd-verify-work`: full suite must be green
- Max feedback latency: <60s per full suite

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-01-T1 | 09-01 | 1 | DEPTH-01 | T-9-01, T-9-02 | Test scaffolds + multiclass Brier + entropy formulas | unit | `pytest backend/tests/test_explain_math.py -x -q` | ✅ Wave 1 | ⬜ |
| 09-01-T2 | 09-01 | 1 | DEPTH-01 | T-9-01, T-9-31 | Calibration spike picks lower-Brier method; SVM retrained with extended lineage; HOLDOUT_GUTENBERG_IDS deduplicated via scripts/constants.py; entropy threshold decision committed | smoke | `python scripts/calibrate.py --window 15` | ✅ Wave 1 | ⬜ |
| 09-01-T3 | 09-01 | 1 | DEPTH-01 | T-9-01, T-9-02 | verify_svm_lineage refuses pre-Phase-9 SVMs | unit | `pytest backend/tests/test_lineage_calibration.py -x -q` | ✅ Wave 1 | ⬜ |
| 09-02-T1 | 09-02 | 2 | DEPTH-04, DEPTH-06 | T-9-06, T-9-07, T-9-10 | precompute_explain emits 6-key .npz with corpus_hash drift mitigation; LFS-tracked | unit | `python -m backend.pipeline.precompute_explain --window 15 && pytest backend/tests/test_explain_artifacts.py -x -q` | ✅ Wave 2 | ⬜ |
| 09-02-T2 | 09-02 | 2 | DEPTH-03, DEPTH-04 | T-9-06, T-9-07, T-9-09 | Lifespan loads svm + w2v + artifacts + NN index; degraded-mode fallback | integration | `pytest backend/tests/test_app_lifespan.py -x -q` | ✅ Wave 2 | ⬜ |
| 09-03-T1 | 09-03 | 2 | DEPTH-01, DEPTH-05, DEPTH-07 | T-9-18 | predict_top_n sums to 1; track contributions sum to 100; entropy in [0,1]; Pydantic constraints; entropy thresholds loaded from v2_calibration_report.md `## Entropy threshold decision` section | unit | `pytest backend/tests/test_explain_math.py -x -q` | ✅ Wave 2 | ⬜ |
| 09-03-T2 | 09-03 | 2 | DEPTH-01, DEPTH-03 | T-9-16 | Worker writes feature_vec to Redis (D-47); SSE result gains top_n + entropy + top1_top2_gap | smoke | `python -c "from backend.worker.jobs import classify_book; import inspect; src=inspect.getsource(classify_book); assert 'feature_vec:' in src and 'predict_top_n' in src and 'ex=300' in src"` | ✅ Wave 2 | ⬜ |
| 09-03-T3 | 09-03 | 2 | DEPTH-03, DEPTH-04, DEPTH-05, DEPTH-06 | T-9-11, T-9-12, T-9-14, T-9-15, T-9-17 | /explain returns ExplainResponse (200) / 410 / 503 / 404; cache 1-h TTL | integration | `pytest backend/tests/test_explain_endpoint.py -x -q` | ✅ Wave 2 | ⬜ |
| 09-04-T1 | 09-04 | 3 | DEPTH-02, DEPTH-07 | T-9-19 | TS types mirror backend Pydantic; uploadStore + useClassify parse new SSE fields | type-check | `cd frontend && npx tsc --noEmit` | ✅ Wave 3 | ⬜ |
| 09-04-T2 | 09-04 | 3 | DEPTH-02, DEPTH-07 | T-9-20, T-9-21, T-9-22 | TopNList renders top-3 + expander + 1-decimal labels; UncertaintyBadge tooltip canonical | unit | `cd frontend && npm test -- TopNList UncertaintyBadge --run` | ✅ Wave 3 | ⬜ |
| 09-04-T3 | 09-04 | 3 | DEPTH-02 | T-9-19 | ClassificationResult mounts TopNList + UncertaintyBadge; backward-compat fallback | type-check + manual | `cd frontend && npx tsc --noEmit` + UAT-01 | ✅ Wave 3 | ⬜ |
| 09-05-T1 | 09-05 | 3 | DEPTH-03 | T-9-23, T-9-26 | apiFetch throws ApiError with .status; useExplain routes 410/503 | type-check + manual | `cd frontend && npx tsc --noEmit` + UAT-02 | ✅ Wave 3 | ⬜ |
| 09-05-T2 | 09-05 | 3 | DEPTH-04, DEPTH-05, DEPTH-06 | T-9-24, T-9-28 | NearestBooksList + TrackContributionBars + DrivingWordsPills render data correctly with D-46 disclosure | type-check + manual | `cd frontend && npx tsc --noEmit` + UAT-03 | ✅ Wave 3 | ⬜ |
| 09-05-T3 | 09-05 | 3 | DEPTH-03 | T-9-25, T-9-27 | ClassificationExplain orchestrates loading/410/503/error/success branches + D-51 footnote | type-check + manual | `cd frontend && npx tsc --noEmit` + UAT-04 | ✅ Wave 3 | ⬜ |
| 09-06-T1 | 09-06 | 4 | DEPTH-01..07 | (none new) | Step7ValidationLimitations renders D-51 canonical copy + link + D-53-compliant voice (no retraction language) | type-check + manual | `cd frontend && npx tsc --noEmit` + UAT-05 | ✅ Wave 4 | ⬜ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements (test scaffolds created before downstream waves)

- [x] `backend/tests/test_explain_math.py` (09-01 Task 1) — multiclass Brier + entropy + zero-ablation tests
- [x] `backend/tests/test_lineage_calibration.py` (09-01 Task 1) — D-40 lineage extension tests
- [x] `backend/tests/fixtures/feature_vec_sample.npy` (09-01 Task 2 dump) — deterministic test fixture
- [x] `scripts/constants.py` (09-01 Task 2 Step 0) — single source of truth for HOLDOUT_GUTENBERG_IDS
- [x] `backend/tests/test_explain_artifacts.py` (09-02 Task 1) — npz schema tests
- [x] `backend/tests/test_app_lifespan.py` (09-02 Task 2) — Q6 lifespan smoke
- [x] `backend/tests/test_explain_endpoint.py` (09-03 Task 3) — integration tests for /explain
- [x] `frontend/src/components/sidebar/__tests__/TopNList.test.tsx` (09-04 Task 2)
- [x] `frontend/src/components/sidebar/__tests__/UncertaintyBadge.test.tsx` (09-04 Task 2)
- [x] No Playwright (D-54 defers to Phase 10 tour smoke test work)

All Wave 0 scaffolds are owned by Wave 1 or Wave 2 plans; downstream waves consume them as red→green targets.

---

## Manual-Only Verifications (UAT)

| UAT ID | Behavior | Steps | Acceptance |
|--------|----------|-------|------------|
| UAT-01 | Top-N expander interaction | 1. Upload a book and wait for classification. 2. Inspect TopNList — verify 3 horizontal bars visible by default, sorted descending. 3. Click the "+5 more" affordance. 4. Verify all 8 genres are now visible in descending order. 5. Verify percent labels show one decimal place. | Top-3 visible default; +5 more reveals all 8; sort desc preserved; percents formatted "XX.X%"; no permanent hiding (D-42). |
| UAT-02 | 410 expired path | 1. Upload a book and wait for `classify` to complete. 2. Wait > 5 minutes (or manually evict `feature_vec:{job_id}` from Redis). 3. Open the "Why this genre?" panel. 4. Verify the explain mutation receives a 410 and the panel renders the canonical re-upload prompt. | Panel renders "Upload expired — re-upload to see the explanation." (D-49 verbatim) and points the user at the existing UploadZone affordance. No silent retries. |
| UAT-03 | Happy-path explain | 1. Upload a book. 2. Open Why-panel within 5 minutes of classify completion. 3. Verify NearestBooksList renders 5 rows with title/author/genre/Euclidean-distance, TrackContributionBars renders topology + vocabulary with direction glyphs, DrivingWordsPills renders TF-IDF-ranked pills with D-46 disclosure copy. | All four sub-components render with non-stub data; topology + vocabulary contributions sum to 100; nearest-books list has exactly 5 entries; driving-words pill list shows "proxies — not literal classifier inputs" disclosure verbatim. |
| UAT-04 | 503 uncalibrated | 1. With a pre-Phase-9 SVM (no `calibration_method` in lineage) on disk, start the API. 2. Upload a book and open Why-panel. 3. Verify the panel surfaces an "Explanation unavailable" message linking to the retrain instruction. | 503 response routed to `opts.onUncalibrated`; panel renders calibration-required message; classify endpoint still serves single-genre top-1 result (graceful degradation per Q8). |
| UAT-05 | Walkthrough Step 7 | 1. Open the pipeline walkthrough dialog. 2. Click Next 6 times to reach Step 7. 3. Verify "Validation & Limitations" headline, three paragraphs, "upper bound" framing, and the validation-report link. 4. Verify "Step 7 / 7" appears in the indicator and the 7th dot is highlighted. | Step-counter says "Step 7 / 7"; copy uses "upper bound" verbatim and no retraction terms; clicking the link opens `results/v2_validation_report.md` on GitHub (D-51 + D-53). |
| UAT-06 | Reliability diagram visual | 1. Open `results/figures/v2_calibration_reliability.png`. 2. Compare the libsvm_platt curves against the CalibratedClassifierCV curves. 3. Cross-check against the Brier table in `results/v2_calibration_report.md`. | Diagram has 8 subplots (one per genre); both methods plotted per subplot with 5-bin binning; winning method (libsvm_platt) visually closer to the diagonal at high probability; numbers match the report's Brier table. |
| UAT-07 | Entropy badge fires appropriately | 1. Upload a clearly-classifiable book (e.g., Pride and Prejudice → Romance). 2. Verify UncertaintyBadge does NOT render. 3. Upload a borderline book (e.g., a literary-Gothic hybrid). 4. Verify UncertaintyBadge fires with the canonical D-52 tooltip. | Badge gated by `badge_fires === true` from backend; tooltip text matches D-52 phrasing exactly; high-confidence uploads do NOT see the badge (avoids signal dilution per Q4). |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands (or Wave-0 scaffold dependencies)
- [x] Sampling continuity: no 3 consecutive tasks without an automated verify
- [x] Wave 0 covers all MISSING test-file references
- [x] No watch-mode flags (`--watch` excluded from all verify blocks)
- [x] Feedback latency <60s for the heaviest task (calibration spike: ~3min build-time only, NOT request-time)
- [x] `nyquist_compliant: true` in frontmatter

**Approval:** signed off by /gsd-plan-phase author on 2026-05-27.
