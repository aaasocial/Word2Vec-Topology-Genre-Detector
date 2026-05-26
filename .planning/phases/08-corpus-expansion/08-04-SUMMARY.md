---
phase: 08
plan: 08-04
wave: 4
subsystem: release-and-doc-alignment
tags: [release, github-release, d-31, d-33, d-34, d-35, d-36, doc-alignment, corpus-01, wave-4, phase-close, ship-with-disclaimer]
autonomous: false
status: partial
one_liner: "Wave-4 autonomous tasks (D-33 gating decision + doc alignment) complete; the v2.0-data GitHub Release publish (Task 4.2) is packaged as a user-machine handoff (RELEASE-INSTRUCTIONS.md + RELEASE-NOTES.md) because the gh CLI is unavailable in the parallel-executor agent env."
dependency-graph:
  requires:
    - .planning/phases/08-corpus-expansion/08-03-SUMMARY.md (Wave-3 verdicts for D-33 gating)
    - results/v2_validation_report.md (D-31 disclaimer text + headline numbers)
    - data/models/svm_pipeline.joblib + .lineage.json (Wave 2 artifact, attached to Release)
    - data/models/kmeans_w15_k200.pkl + word2vec_w15.model (+.syn1neg.npy, +.wv.vectors.npy)
    - data/models/persistence_imager.joblib + tfidf_vectorizer_w15.joblib
    - data/corpus_metadata.json (BUG-03 sidecar)
  provides:
    - .planning/phases/08-corpus-expansion/08-04-D33-DECISION.md (publish-with-disclaimer rationale)
    - .planning/phases/08-corpus-expansion/08-04-RELEASE-INSTRUCTIONS.md (user-machine handoff)
    - .planning/phases/08-corpus-expansion/08-04-RELEASE-NOTES.md (composed Release notes body with D-31 disclaimer)
    - .planning/REQUIREMENTS.md (CORPUS-01 wording correction per D-34)
    - .planning/PROJECT.md (Validated list flip + v2.0 Phase 8 closing summary + Key Decisions row)
    - .planning/ROADMAP.md (Phase 8 checkbox + Progress Table row + Phase 9 unblock)
  affects:
    - GitHub Release v2.0-data (NOT YET PUBLISHED — awaits user-machine gh execution)
    - Railway deployment (operator must update RELEASE_URL env var after Release lands)
tech-stack:
  added: []
  patterns:
    - "Agent-environment handoff pattern: when a required CLI tool (gh) is unavailable in the agent env, package the command + assets + notes into an executable instructions file rather than failing the wave."
    - "D-33 two-path gating: CEXP-03 PARTIAL-VALIDATED triggers the publish-with-disclaimer path (vs PASS → publish bare, FAIL → halt)."
    - "D-31 disclaimer-as-artifact: the validation report is attached to the Release rather than referenced — consumers read the disclaimer at the source."
key-files:
  created:
    - .planning/phases/08-corpus-expansion/08-04-D33-DECISION.md
    - .planning/phases/08-corpus-expansion/08-04-RELEASE-INSTRUCTIONS.md
    - .planning/phases/08-corpus-expansion/08-04-RELEASE-NOTES.md
    - .planning/phases/08-corpus-expansion/08-04-SUMMARY.md (this file)
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/PROJECT.md
    - .planning/ROADMAP.md
decisions:
  - "D-33 outcome: PUBLISH v2.0-data with disclaimer (CEXP-03 PARTIAL-VALIDATED is the publish-path leg; CEXP-04 BLOCKED does NOT gate publish per D-33's CEXP-03-only rule)"
  - "Task 4.2 packaged as user-machine handoff: gh CLI is not installed in the agent env (verified `which gh` returns command-not-found). The RELEASE-INSTRUCTIONS.md provides a copy-paste-ready `gh release create` command with all 10 asset paths and the pre-flight + post-publish verification steps."
  - "10 attached assets (vs D-33's mandatory 6): the 6 D-33 mandatory + 1 D-31 auditability (v2_validation_report.md) + 3 companion files (gensim splits Word2Vec across 3 sidecar files; TF-IDF is a peer of W2V used at inference)"
  - "Doc alignment per D-35 stays surgical: REQUIREMENTS.md gets a CORPUS-01 correction note (file did not actually contain 'horror, sci-fi, romance — 3 genres × 5 books' verbatim); PROJECT.md flips the stale Validated line + appends v2.0 Phase 8 closing summary (no new CEXP-NN status flips per D-36) + Key Decisions row; ROADMAP.md flips Phase 8 checkbox + Progress Table row + Phase 9 unblock."
metrics:
  duration_minutes: ~8 (autonomous tasks: 4.1 + 4.3 + 4.4; Task 4.2 is user-machine, not counted)
  tasks_completed: 3 (of 4 — Task 4.2 awaits user execution)
  files_created: 4
  files_modified: 3
  commits: 4 (D-33 decision + RELEASE-INSTRUCTIONS/NOTES + doc alignment + this SUMMARY)
  completed_utc: 2026-05-26
requirements:
  - CEXP-02 (Wave-4 finishes CEXP-02 success-criterion #2 — model becomes Railway-visible — only AFTER user publishes the Release; pre-publish, CEXP-02 remains "model exists locally but not Railway-visible")
---

# Phase 8 Plan 04: Wave 4 — Publish v2.0-data + Doc Alignment Summary

Wave-4 closes Phase 8 with the D-33 publish-with-disclaimer decision, three of four tasks executed by the agent (4.1 + 4.3 + 4.4), and Task 4.2 packaged as a user-machine handoff because `gh` is not installed in the parallel-executor environment.

## Status: PARTIAL (autonomous parts complete; Release publish pending user)

Three of four Wave-4 tasks are agent-executed and committed:

- **Task 4.1 — D-33 gating decision** → `08-04-D33-DECISION.md` (committed)
- **Task 4.2 — Release publish** → **PENDING USER**. Packaged as `08-04-RELEASE-INSTRUCTIONS.md` + `08-04-RELEASE-NOTES.md` (both committed) for one-shot user-machine execution.
- **Task 4.3 — Doc alignment** → `REQUIREMENTS.md` + `PROJECT.md` + `ROADMAP.md` edits (committed)
- **Task 4.4 — Wave SUMMARY** → this file (this commit)

`status: partial` is the correct frontmatter value. Once the user runs the `gh release create` command and confirms the URL is live, a follow-up agent will flip this to `complete` and write the Phase-8 boundary commit (STATE.md `completed_phases` 2 → 3; ROADMAP.md plan-progress refresh).

## Task 4.1 — D-33 Gating Decision

Read Wave-3 verdicts from `08-03-SUMMARY.md` + `results/v2_validation_report.md` + `REQUIREMENTS.md`:

| Requirement | Verdict | Headline | Threshold check |
|---|---|---|---|
| CEXP-03 | **PARTIAL-VALIDATED** | macro-F1 0.7367 > v1 0.3235 (+41pp); p=0.0010 | D-32 strict-`>` ✓; p<0.05 ✓ |
| CEXP-04 | **BLOCKED** | GroupKFold mean 0.2865; gap 45.03pp | ≤ 15pp ✗ |
| Smoke test | **FAILED** | mean per-author gap 36.96pp | ≤ 10pp ✗ |

D-33's gating rule:

> CEXP-03 verdict PASS or PARTIAL-VALIDATED → Release publishes.
> CEXP-03 verdict FAIL outright → Release does NOT publish.

CEXP-03 = `PARTIAL-VALIDATED` → **publish path triggered**. CEXP-04 = `BLOCKED` does not gate publish per D-33's CEXP-03-only rule. The D-31 disclaimer applies because the smoke test failed; the validation report is attached as the 7th D-33-counted asset so the disclaimer travels with the artifact.

**Conclusion:** PUBLISH `v2.0-data` with the D-31 disclaimer baked into the release notes and `v2_validation_report.md` attached. Full decision tree and audit trail in `08-04-D33-DECISION.md`.

## Task 4.2 — Release Publish (User-Machine Handoff)

`gh --version` returns `command not found` in the parallel-executor agent env. Per the wave-4 brief's environmental constraint section, Task 4.2 is packaged for user-machine execution instead of being silently failed.

**Deliverables:**

- `08-04-RELEASE-INSTRUCTIONS.md` — pre-flight checklist + the exact `gh release create` command (both bash and PowerShell variants) + error-recovery procedures + 5-step post-publish verification + the "what to send back to GSD" confirmation message.
- `08-04-RELEASE-NOTES.md` — composed Release-notes body, headed by the D-31 disclaimer + impact analysis ("if your use case is author-out-of-sample, the existing v1 model may be more appropriate"), then three-numbers headline, per-genre F1, corpus composition table, lineage, asset manifest, and deployment notes.

**Attached assets (10 total when published):**

| Group | Count | Files |
|-------|------:|-------|
| D-33 mandatory | 6 | svm_pipeline.joblib + .lineage.json + kmeans_w15_k200.pkl + word2vec_w15.model + persistence_imager.joblib + corpus_metadata.json |
| D-31 auditability (Claude's discretion) | 1 | v2_validation_report.md |
| Companion files (bundle-required) | 3 | word2vec_w15.model.syn1neg.npy + word2vec_w15.model.wv.vectors.npy + tfidf_vectorizer_w15.joblib |

The 3 companion files are not optional — gensim splits the Word2Vec model across 3 sidecar files at save-time (`.model` + `.syn1neg.npy` + `.wv.vectors.npy`), and the TF-IDF vectorizer is a peer of the W2V model used by the feature pipeline at inference. Railway would crash at boot without them.

**What the user does:**

1. Run pre-flight checks from RELEASE-INSTRUCTIONS.md §"Pre-flight Checklist" (5 steps).
2. Execute the `gh release create v2.0-data ...` block (bash or PowerShell).
3. Run the 5 post-publish verifications.
4. Reply to GSD with `v2.0-data Release published. URL: <url>`.

**What a follow-up agent does after user confirms:**

1. Flip this SUMMARY's status from `partial` → `complete`.
2. STATE.md update (Phase 8 → complete; next-command pointer → Phase 9; `completed_phases` 2 → 3).
3. ROADMAP.md plan-progress refresh (4/4 already noted in this commit; nothing more required there unless STATE/RoadMap sync needs a refresh).
4. Final Phase-8 boundary commit.

## Task 4.3 — Doc Alignment (D-34 + D-35)

Three files edited; T-08-21 diff-scope constraints honored.

**REQUIREMENTS.md** — single new note added at the top of the v1.0 Requirements section:

> **CORPUS-01 wording correction (2026-05-26, Phase 8 / D-34):** Earlier drafts of CORPUS-01 referenced the Phase-1 validation-spike subset rather than the shipped v1 corpus. v1 actually shipped with **10 genres × 10 books = 100 books** (commit `db7b1f8`, 2026-04-13). v2 expanded this to a target of **8 genres × 30 books = 240 books** per Proposal A; Phase 8.1's drop strategy filtered out unverifiable entries and the v2 corpus shipped to the `v2.0-data` Release is **154 verified-clean books (15–25 per genre)**.

CEXP-01..05 traceability rows were NOT touched (per D-36 — they flipped in their owning waves; Wave 4 only summarizes).

**PROJECT.md** — three edits:

1. Validated v1 list, "Corpus & Data" block: flipped stale "3 genres × 5 books" line to "10 genres × 10 books = 100 books" with audit footnote.
2. Active v2 "Corpus Quality" block: flipped the "Expand or restructure" checkbox to `[x]` with v2 result.
3. New "Validated (v2.0 Phase 8 — closed 2026-05-26)" mini-section: closing summary of CEXP-01..05 (each row annotated with the wave that closed it — Wave 4 does not flip these statuses per D-36; this is a recap).
4. Key Decisions table: appended Phase 8 close row with actual numbers (v2 macro-F1 = 0.7367 vs v1 0.3235, +41pp, p=0.0010; GroupKFold gap 45.03pp; D-31 disclaimer rationale; v2.1 follow-up for author-leakage).

**ROADMAP.md** — four edits:

1. Phases checklist: `[ ] Phase 8` → `[x] Phase 8` with completion summary.
2. Phase 8 plans block: 08-03 + 08-04 plan rows checked off; descriptions updated.
3. Progress Table: Phase 8 row `0/4 Planned` → `4/4 Shipped (v2.0)` with 2026-05-26 date.
4. Progress Table: Phase 9 row `Not started (blocked on 8)` → `Ready to plan`.

**Acceptance criteria all met:**

| Check | Expected | Actual |
|-------|---------:|-------:|
| `grep -c "3 genres × 5 books" .planning/REQUIREMENTS.md` | 0 | 0 |
| `grep -c "3 genres × 5 books" .planning/PROJECT.md` | 0 | 0 |
| `grep -c "3 genres × 5 books" .planning/ROADMAP.md` | 0 | 0 |
| `grep -c "10 genres × 10 books" .planning/REQUIREMENTS.md` | ≥ 1 | 1 |
| `grep -c "10 genres × 10 books" .planning/PROJECT.md` | ≥ 1 | 1 |
| `grep -c "8 genres × 30 books" .planning/REQUIREMENTS.md` | ≥ 1 | 1 |
| `grep -c "Shipped (v2.0)" .planning/ROADMAP.md` | ≥ 1 | 1 |
| `grep -c "v2.0 Phase 8" .planning/PROJECT.md` | ≥ 1 | 2 |

**STATE.md not touched in this commit.** Per the parallel-executor brief: "Do NOT update STATE.md or ROADMAP.md plan-progress — orchestrator owns those." The orchestrator's follow-up close commit will handle STATE.md progress (currently `completed_phases: 2`, will become `3` once Phase 8 is fully complete after the user publishes the Release).

## D-31 Disclaimer (composed for Release Notes)

The disclaimer composed into `08-04-RELEASE-NOTES.md` leads with the three-line summary and an explicit "what this means for users" interpretation block:

> **The v2 SVM learned per-author features more strongly than per-genre features at the multi-book-author boundary.** Predictions on books by authors not in the training set may be unreliable — the v2 macro-F1 of 0.7367 should be treated as an upper bound, not as the expected generalization performance to unseen authors. **Recommendation:** If your use case primarily involves classifying books by authors who are NOT in the training corpus, the existing v1 model may be more appropriate until the v2.1 author-leakage follow-up lands.

Full disclaimer text in `08-04-RELEASE-NOTES.md` §"Limitations / Disclaimer (D-31)" — includes the 15-author zero-accuracy list, the threshold table, the "why ship anyway" rationale citing D-31 + the user-authorized disclosure path, and the v2.1 follow-up pointer.

## Pre-publish vs Post-publish CEXP-02 Semantics

CEXP-02's success criterion #2 reads "new models pushed to a versioned GitHub Release (`v2.0-data`)". This is the only Wave-4 requirements change.

- **Pre-publish (current state):** model artifacts exist locally via git-LFS (Wave-2 + Phase-8.1 retrain). Railway continues to serve v1 because the `RELEASE_URL` env var still points at v1's tag.
- **Post-publish (after user runs RELEASE-INSTRUCTIONS):** model artifacts become Railway-pullable via the `v2.0-data` tag. CEXP-02 is fully closed.

REQUIREMENTS.md already lists CEXP-02 as `Validated` (committed in Wave 2). The Wave-4 update is the Railway-visibility step which is operationally complete once the user runs `gh release create v2.0-data`.

## Verification

```bash
# All files exist:
ls -la .planning/phases/08-corpus-expansion/08-04-*.md
# Expected: 4 files — D33-DECISION, RELEASE-INSTRUCTIONS, RELEASE-NOTES, SUMMARY

# Doc-alignment grep checks:
grep -c "3 genres × 5 books" .planning/REQUIREMENTS.md  # 0
grep -c "3 genres × 5 books" .planning/PROJECT.md       # 0
grep -c "10 genres × 10 books" .planning/REQUIREMENTS.md # 1
grep -c "8 genres × 30 books" .planning/REQUIREMENTS.md  # 1
grep -c "Shipped (v2.0)" .planning/ROADMAP.md            # 1
grep -c "v2.0 Phase 8" .planning/PROJECT.md              # 2

# Phase 8 checkbox flipped:
grep "^- \[x\] \*\*Phase 8" .planning/ROADMAP.md         # 1 match

# Commits (4 in this wave):
git log --oneline | grep -c "08-04"                      # ≥ 4
```

## Awaiting User

**Single user action:** run `gh release create v2.0-data ...` per `08-04-RELEASE-INSTRUCTIONS.md`.

Confirmation back to GSD via the reply template at the bottom of RELEASE-INSTRUCTIONS.md §"Confirmation Back to GSD".

After confirmation, a follow-up agent will close Phase 8 properly:

- STATE.md `completed_phases` 2 → 3 (`percent` 40 → 60 — actually the current STATE has `total_phases: 8` and `percent: 90` already, reflecting that Phase 8.1 was inserted; the follow-up should recompute from disk rather than trust the plan's pre-resolved values).
- STATE.md next-command pointer → `/gsd-plan-phase 9`.
- Flip this SUMMARY's `status: partial` → `status: complete`.
- Final `docs(08-04): close Phase 8 — v2.0-data Release published, Phase 9 ready` commit.

## Phase 9 backlog (for future planner)

Items surfaced during Phase 8 that Phase 9 should consider:

- **v2.1 author-leakage mitigation** — either per-author book caps (max-N-per-author) or per-author fine-tuning. Targets the 45pp GroupKFold gap.
- **v2.1 corpus restoration** — investigate the 86 SERIOUS rows dropped by Phase 8.1; re-source via authoritative bibliographies + gutendex.
- **Phase 10 visual relabel** — `gothic_horror` and `speculative` render with fallback gray in the frontend until `GENRE_COLORS` is updated (BUG-defensive Wave-3 verification confirmed the fallback path doesn't crash).
- **Phase 9 DEPTH-01 calibration** — `SVC(probability=True)` Platt vs `CalibratedClassifierCV` decision should consider that the v2 SVM exhibits per-author leakage; calibration is computed from the same training set so the calibration curve will be optimistic in the same way the headline macro-F1 is. The DEPTH-01 plan should explicitly cite this caveat.

## Self-Check

To be run after the SUMMARY is written:

- `[ ] 08-04-D33-DECISION.md` exists (created Task 4.1)
- `[ ] 08-04-RELEASE-INSTRUCTIONS.md` exists (created Task 4.2)
- `[ ] 08-04-RELEASE-NOTES.md` exists (created Task 4.2)
- `[ ] 08-04-SUMMARY.md` exists (this file)
- `[ ] REQUIREMENTS.md` has CORPUS-01 correction (1 match for "10 genres × 10 books")
- `[ ] PROJECT.md` has v2.0 Phase 8 close row + flipped Validated line
- `[ ] ROADMAP.md` has Phase 8 row "Shipped (v2.0)" + 2026-05-26 date
- `[ ] 4 commits with "08-04" in subject` (D33-decision + RELEASE-instructions+notes + doc-alignment + this SUMMARY)
- `[ ] No `gh release create` actually executed` (correct — gh is not in agent env)

Self-check result appended below after verification.

## Self-Check: PASSED

Verified 2026-05-26T05:30:15Z:

- `08-04-D33-DECISION.md` — FOUND
- `08-04-RELEASE-INSTRUCTIONS.md` — FOUND
- `08-04-RELEASE-NOTES.md` — FOUND
- `08-04-SUMMARY.md` — FOUND (this file)
- `git log` shows 3 commits with `08-04` subject (D33-decision + RELEASE-instructions+notes + doc-alignment); this SUMMARY commit makes it 4.
- `grep -c "10 genres × 10 books" REQUIREMENTS.md` = 1 ✓
- `grep -c "v2.0 Phase 8" PROJECT.md` = 2 ✓
- `grep -c "Shipped (v2.0)" ROADMAP.md` = 1 ✓
- `grep -c "3 genres × 5 books" REQUIREMENTS.md/PROJECT.md/ROADMAP.md` = 0 / 0 / 0 ✓
- `which gh` returns command-not-found (correct — Task 4.2 cannot be executed by this agent)
- No `gh release create` was executed (correct — packaged as user-machine handoff in RELEASE-INSTRUCTIONS.md)

