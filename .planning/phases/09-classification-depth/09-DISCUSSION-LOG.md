# Phase 9: Classification Depth — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 09-classification-depth
**Mode:** Interactive — user selected Calibration & Top-N + Explainability composition for discussion. The other four areas (Explain endpoint infrastructure, Disclaimer UX, Tests, Frontend styling) were not discussed; CONTEXT.md `<research_inherited>` cites the v2 research artifacts as the lock-source for those.
**Areas discussed:** A. Calibration & Top-N · B. Explainability composition

---

## A. Calibration & Top-N

### Q1 — How should the v2 SVM produce calibrated probabilities for top-N display?

| Option | Description | Selected |
|--------|-------------|----------|
| Empirical pick via reliability diagram | Train BOTH `SVC(probability=True)` Platt AND `CalibratedClassifierCV(method='sigmoid', cv=LeaveOneOut())`. Score Brier on 20-book hold-out. Ship lower-Brier winner. | ✓ |
| Default to libsvm built-in Platt | `SVC(probability=True)` only — simpler. Risk: 5-fold CV noisy on 154-book corpus. | |
| Default to `CalibratedClassifierCV` LOOCV sigmoid | LOOCV more sample-efficient than 5-fold per PITFALLS §11. Risk: noisy with <30 samples per fold. | |

**User's choice:** Empirical pick via reliability diagram.
**Notes:** Aligns with SUMMARY.md "Gaps to Address" #3 + ARCHITECTURE.md §11; loser's diagram lives in `results/v2_calibration_report.md`. Decision: **D-37**.

---

### Q2 — How many predictions and what rendering style for top-N?

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcode N=3, horizontal bars | DEPTH-01 default. 5 hidden genres accessible via Why panel. Simplest UX. | |
| Configurable N (3/5/8) via settings drawer | Settings toggle. Risk: marginal value vs UX surface cost. | |
| Always show all 8 genres | Maximum transparency. Risk: 8 bars is noise; conflicts with N=3 default. | |
| **Top-3 bars + collapsible "see all 8"** | Top-3 visible; "+5 more" expander reveals remaining 5. Honest without noise. | ✓ |

**User's choice:** Top-3 bars + collapsible "see all 8".
**Notes:** Progressive disclosure honors DEPTH-02 "no hidden low-confidence predictions" — nothing is permanently hidden; all 8 reachable in one click. Decision: **D-41** (deviates from the auto-mode draft's hardcoded N=3).

---

### Q3 — How should the chosen calibration method be recorded for runtime safety + future audit?

| Option | Description | Selected |
|--------|-------------|----------|
| Lineage + report artifact | `svm_pipeline.joblib.lineage.json` gains `calibration_method`/`calibration_brier_score`/`calibration_report`. Companion `results/v2_calibration_report.md`. | ✓ |
| Report artifact only, no lineage field | Markdown report only; runtime can't verify SVM matches calibration claim. | |
| Lineage field only, no separate report | JSON record only; "why was X picked?" requires git archaeology. | |
| Neither — hardcode in classify.py | Source-code only; opaque to operators. | |

**User's choice:** Lineage + report artifact.
**Notes:** Matches Phase 8 precedent (lineage + validation_report siblings). Lineage guard catches mismatch at load time. Decisions: **D-38, D-39, D-40**.

---

## B. Explainability composition

### Q4 — How should the "topology vs vocabulary" track contribution be computed?

| Option | Description | Selected |
|--------|-------------|----------|
| Local per-upload zero-ablation | Re-predict with each slab zeroed; contribution = base − zeroed. Two extra SVM calls (~10ms). Per-upload, honest. | ✓ |
| Global `permutation_importance` per track | Same numbers every prediction. Risk: doesn't explain THIS book. | |
| Local + global (settings drawer cross-check) | Ship local + surface global as researcher diagnostic. | |

**User's choice:** Local per-upload zero-ablation.
**Notes:** Matches ARCHITECTURE.md §4 verbatim. PITFALLS §9 mandates per-track aggregation. Decision: **D-44**.

---

### Q5 — P2 scope: DEPTH-06 (driving words) + DEPTH-07 (entropy badge) — what ships in Phase 9?

| Option | Description | Selected |
|--------|-------------|----------|
| Ship both P2 items in Phase 9 | Driving-words pills + entropy badge. Both research-backed honest designs. | ✓ |
| Ship MUST track only; defer both P2 to v3 | Smaller scope. Risk: explainability story half-finished. | |
| Ship DEPTH-07 entropy only | Free once `predict_proba` exists. Defer driving-words to v3. | |
| Ship DEPTH-06 driving-words only | Highest-signal user-facing. Defer entropy. | |

**User's choice:** Ship both P2 items in Phase 9.
**Notes:** Both have honest research-backed designs (FEATURES.md §3a + §3b); v2 milestone goal #3 demands "honest 'why this genre?' explanation users can interrogate". Plan them as separable atomic plans so they CAN be deferred under late scope pressure. Decision: **D-43**.

---

### Q6 — Nearest training books — how many and which distance metric?

| Option | Description | Selected |
|--------|-------------|----------|
| 5 books, Euclidean on L2-normalized features | DEPTH-04 wording verbatim. v2 corpus density supports 5. | ✓ |
| 3 books, Euclidean on L2-normalized features | Matches ARCHITECTURE.md §4. Risk: misses 4th/5th meaningful hit. | |
| 5 books, cosine distance | STACK.md mentions cosine. Risk: DEPTH-04 says "Euclidean" verbatim. | |
| Variable (3–5) based on cluster tightness | Threshold-based. Risk: hard to explain in UI. | |

**User's choice:** 5 books, Euclidean on L2-normalized features.
**Notes:** Euclidean on L2-normalized vectors is mathematically equivalent to cosine distance up to a monotone transform; sticking to Euclidean avoids reader confusion. Decision: **D-45**.

---

## Areas not discussed this session

The user explicitly skipped these areas; CONTEXT.md `<research_inherited>` cites the v2 research artifacts as the lock-source (D-46..D-55). Surfaced here for visibility:

- **Explain endpoint infrastructure** — ARCHITECTURE.md §4 + §5b + §8 lock the endpoint shape, feature_vec Redis 5-min TTL, explain cache `explain:{hash}:{model_hash}` 1-h TTL, 410 Gone on expiry, precompute_explain.py artifact loaded at startup.
- **Disclaimer UX** — D-31 inheritance + PROJECT.md Key Decisions row lock the walkthrough + Why-panel-footnote pattern; entropy badge tooltip cites the caveat; no retraction of v2 claims.
- **Tests + frontend styling** — PITFALLS §7 + Phase 8 precedent lock the math unit tests + integration test + inline-hex styling (deferred CSS-var sweep to Phase 10).

## Deferred Ideas

Tracked in CONTEXT.md `<deferred>` for future phase consideration: counterfactual explanations, per-pipeline-stage nearest books, multi-label, settings-drawer calibration plot UI, top-N runtime setting, per-author retraining, single-source-of-truth for genre colors, Kernel SHAP dev tooling, global permutation_importance diagnostic, "Why this genre?" sharable URL, HTTP/SSE streaming of explain payload.
