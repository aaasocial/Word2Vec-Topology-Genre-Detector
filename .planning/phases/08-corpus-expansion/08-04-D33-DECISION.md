---
phase: 08
plan: 08-04
wave: 4
task: 4.1
type: gating-decision
date: 2026-05-26
decision: PUBLISH-WITH-DISCLAIMER
gate: D-33 (with D-31 disclaimer path)
---

# Task 4.1 — D-33 Gating Decision: PUBLISH v2.0-data with Disclaimer

## Wave-3 Verdict Read

Source artifacts inspected:

- `.planning/phases/08-corpus-expansion/08-03-SUMMARY.md` (frontmatter `requirements:` block + Verdicts section)
- `results/v2_validation_report.md` (Status block lines 9–14)
- `.planning/REQUIREMENTS.md` traceability table (lines 187–188)

Confirmed verdicts:

| Requirement | Wave-3 verdict | Headline number | Threshold |
|-------------|----------------|-----------------|-----------|
| **CEXP-03** | **PARTIAL-VALIDATED** | v2 macro-F1 = **0.7367** vs v1 = 0.3235 (+41pp); permutation p = **0.0010** | strict > v1 AND p < 0.05 (both satisfied) |
| **CEXP-04** | **BLOCKED** | GroupKFold-by-author mean = 0.2865 ± 0.0331; gap vs hold-out = **45.03pp** | gap ≤ 15pp (not satisfied) |
| Smoke test | **ANTI-LEAKAGE GUARDRAIL FAILED** | Mean per-author gap = 36.96pp; 15 / 34 multi-book authors score 0% when held out | ≤ 10pp gap (not satisfied) |

CEXP-03 is `PARTIAL-VALIDATED`, **not** `FAIL outright`. The strict-`>` and `p<0.05` legs of D-32 are both satisfied; the smoke-test failure attaches the D-31 disclaimer but does not invalidate the CEXP-03 pass condition itself.

## D-33 Rule Applied

D-33's two-path gating rule (per `08-CONTEXT.md` §C):

> - Wave-3 verdict `PASS` or `PARTIAL-VALIDATED` → Release publishes.
> - Wave-3 verdict CEXP-03 `FAIL` outright → Release does NOT publish; v1's existing Release stays authoritative; this Wave halts and surfaces to user.

CEXP-03 = `PARTIAL-VALIDATED` → **publish path triggered**.

The D-31 disclaimer path applies because the smoke test failed (mean-gap 36.96pp >> 10pp threshold). D-31 was authorized by the user during `/gsd-discuss-phase 8` as the second of two options offered in `VALIDATION_PROTOCOL.md §8`:

1. Restructure corpus and re-enter Wave 1 (rejected by user).
2. **Ship with explicit disclaimer documenting the leakage publicly** (selected — D-31).

The published `v2.0-data` Release therefore ships with `results/v2_validation_report.md` attached as the 7th auditability asset (Claude's-discretion call per D-33 + VALIDATION_PROTOCOL §8). The report opens with the `ANTI-LEAKAGE GUARDRAIL FAILED` section so any consumer of the Release can read the disclaimer at the source.

CEXP-04 `BLOCKED` does **not** block Release publish per D-33 — D-33 explicitly gates only on CEXP-03's verdict, and Wave-3 already wrote CEXP-04's BLOCKED status into REQUIREMENTS.md per D-36. CEXP-04 is now a v2.1 follow-up item (see SUMMARY.md "Phase 9 backlog" / future v2.1).

## Conclusion

**PUBLISH `v2.0-data` Release with the D-31 disclaimer baked into the release notes and `v2_validation_report.md` attached as an asset.** Wave 4 proceeds to Task 4.2 (release publish) and Task 4.3 (doc alignment).

## Asset List (D-33 mandatory 6 + D-31 auditability 7th)

D-33-mandatory (per `08-CONTEXT.md` line 64):

1. `data/models/svm_pipeline.joblib`
2. `data/models/svm_pipeline.joblib.lineage.json`
3. `data/models/kmeans_w15_k200.pkl`
4. `data/models/word2vec_w15.model` (note: filename is `word2vec_w15.model`, not `w2v_w15.model` as written in the plan — verified by `ls data/models/`)
5. `data/models/persistence_imager.joblib`
6. `data/corpus_metadata.json`

Claude's-discretion auditability (D-31 + VALIDATION_PROTOCOL §8):

7. `results/v2_validation_report.md`

**Companion assets shipped with the Word2Vec model** (asset #4 is a 3-file gensim bundle — all 3 must be present together for the model to load):

- `data/models/word2vec_w15.model.syn1neg.npy`
- `data/models/word2vec_w15.model.wv.vectors.npy`

The TF-IDF vectorizer is a peer companion of the W2V model that Railway needs for feature extraction:

- `data/models/tfidf_vectorizer_w15.joblib`

These three companion files inflate the total attached asset count to 10. The "7 D-33-counted" framing remains correct — the W2V auxiliary `.npy` files and the TF-IDF vectorizer are companions of the existing D-33 entries (the `word2vec_w15.model` listing is the canonical "Word2Vec model" asset; gensim splits it across 3 sidecar files at save-time).

## Decision Tree (audit trace)

```
Wave-3 CEXP-03 verdict?
├── PASS → publish v2.0-data, no disclaimer.
├── PARTIAL-VALIDATED → publish v2.0-data WITH disclaimer (D-31 path).  ← TRIGGERED
└── FAIL outright → halt Wave 4; v1 Release stays authoritative.

Wave-3 smoke test passed?
├── yes (gap ≤ 10pp) → publish with bare release notes; v2_validation_report.md is supplementary.
└── no (gap > 10pp) → D-31 disclaimer required; v2_validation_report.md attached.  ← TRIGGERED

Wave-3 CEXP-04 verdict?
├── PASS (gap ≤ 15pp) → CEXP-04 closes cleanly.
└── BLOCKED (gap > 15pp) → CEXP-04 remains Blocked in REQUIREMENTS.md; v2.1 follow-up.  ← APPLIED
```

## Files Affected by Decision

- `.planning/phases/08-corpus-expansion/08-04-RELEASE-INSTRUCTIONS.md` — exact `gh release create` command for user-machine execution (Task 4.2 handoff)
- `.planning/phases/08-corpus-expansion/08-04-RELEASE-NOTES.md` — composed release notes body with the D-31 disclaimer
- `.planning/REQUIREMENTS.md` — CORPUS-01 wording correction (Task 4.3)
- `.planning/PROJECT.md` — Validated list + Key Decisions row (Task 4.3)
- `.planning/ROADMAP.md` — Phase 8 progress row + v1 outcomes (Task 4.3)

---
*Decision date: 2026-05-26*
*Decided per D-33 + D-31 + D-36 (08-CONTEXT.md §C)*
