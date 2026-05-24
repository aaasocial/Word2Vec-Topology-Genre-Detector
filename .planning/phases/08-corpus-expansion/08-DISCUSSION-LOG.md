# Phase 8: Corpus Expansion — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `08-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 08-corpus-expansion
**Areas discussed:** Plan structure & wave sequencing; v1 → v2 corpus migration mechanics; Failure-handling & release-publish policy; Doc-drift cleanup scope

**Skipped areas:** CEXP-05 build_corpus.py timing (user did not select; resolved as side-effect of D-24 under Plan-structure area), Frontend genre-relabel scope (user did not select; defaulted to Phase 10 ownership in Claude's Discretion), Validation-only fast path (user did not select; defaulted to Wave-1-inline gate in Claude's Discretion).

---

## Preliminary fix: STATE.md milestone drift

Before the workflow could resolve Phase 8, `gsd-tools init phase-op 8` reported `phase_found: false` because `.planning/STATE.md` frontmatter still pointed at `milestone: v1.0` (shipped/archived). The tool filters ROADMAP.md to the milestone declared in STATE.md, so v2.0's Phase 8 was invisible.

| Option | Description | Selected |
|--------|-------------|----------|
| Fix STATE.md, then continue | Update frontmatter to milestone: v2.0; status: in_progress; refresh timestamps and progress numbers; commit will be folded into update_state. | ✓ |
| Fix in memory only | Read Phase 8 from ROADMAP.md directly without touching STATE.md. | |
| Abort and run /gsd-health | Defer to a separate health-check pass. | |

**User's choice:** Fix STATE.md, then continue.
**Notes:** STATE.md body already reflected v2.0 work (Phase 6 complete, Phase 7 context gathered); only the frontmatter milestone field was stale. Fix was milestone: v1.0 → v2.0, milestone_name + status + timestamps + progress updated.

---

## Gray-area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Plan structure & wave sequencing | Wave shape, compute location, build_corpus.py priority, cache-test timing. | ✓ |
| v1 → v2 corpus migration mechanics | books.yaml diff approach, drop audit, source backfill, genre relabel. | ✓ |
| CEXP-05 build_corpus.py timing | Standalone P1/P2/skip decision. | (folded into Plan structure as Q1.3) |
| Frontend genre-relabel scope | When v2 genre keys reach genres.ts / GENRE_COLORS. | (defaulted to Phase 10) |
| Failure-handling & release-publish policy | Fetch failures, smoke-test failure, CEXP-03 margin, Release gating. | ✓ |
| Doc-drift cleanup scope | Where PROJECT/REQUIREMENTS cleanup lands. | ✓ |
| Validation-only fast path | Standalone Plan-01 gate vs Wave-1-inline gate. | (defaulted to Wave-1-inline) |

---

## Area 1: Plan structure & wave sequencing

### Q1.1 — How should we wave Phase 8?

| Option | Description | Selected |
|--------|-------------|----------|
| Linear 4-wave | Build → Retrain → Validate → Release; clean gate between each wave. | ✓ |
| Combined retrain+validate (3-wave) | Build / Retrain+Validate / Release. Fewer commits; harder to bisect a bad retrain. | |
| Per-CEXP plans | Plan-01..05 mapping 1:1 to CEXP-01..05; CEXP-02 becomes one giant plan. | |
| Mega-plan | One PLAN.md, all CEXPs in a single sweep. | |

**User's choice:** Linear 4-wave (Recommended).
**Notes:** Each wave is a clean gate; halting at any wave leaves a coherent state. Logged as **D-22**.

### Q1.2 — Where does the retrain pipeline execute?

| Option | Description | Selected |
|--------|-------------|----------|
| Local dev machine | Pipeline runs locally; models committed via git LFS; Railway pulls via Release. Matches v1 ops; ties up the dev machine for hours. | ✓ |
| Railway worker | Push corpus, run inside Railway. Worker memory/CPU may bottleneck; blurs prod env with training env. | |
| Cloud VM | Provision beefy VM, tear down after. Fastest wall-clock; cloud-bill exposure. | |

**User's choice:** Local dev machine (Recommended).
**Notes:** Matches the CLAUDE.md fresh-machine pattern. Logged as **D-23**.

### Q1.3 — CEXP-05 build_corpus.py timing

| Option | Description | Selected |
|--------|-------------|----------|
| Build it FIRST and use it to generate v2 | Script lands in Wave 1; emits canonical v2 books.yaml from candidates + selection rule. Free byte-identical reproducibility. | ✓ |
| Keep P2 — retroactive wrapper | Hand-curate books.yaml first; write build_corpus.py as a post-hoc reproducer. | |
| Skip CEXP-05 entirely in v2 | Defer to v3; corpus_candidates.yaml + selection rule become de-facto reproduction reference. | |

**User's choice:** Build it FIRST (Recommended).
**Notes:** Upgrades CEXP-05 from P2 to P1; Phase 7's P2 framing is now wrong. Logged as **D-24**.

### Q1.4 — BUG-05 cache-flush smoke test timing

| Option | Description | Selected |
|--------|-------------|----------|
| Both before and after retrain | Pre-retrain = sanity check Phase 6 invariant; post-retrain = verify cache rotation. Two tiny checkpoints. | ✓ |
| Once, after retrain | Trust Phase 6 sanity; only verify post-retrain rotation. | |
| Don't run — trust Phase 6 | Phase 6 already shipped with its own smoke test; don't re-run. | |

**User's choice:** Both before and after retrain (Recommended).
**Notes:** Catches the single worst footgun (stale cache against new model, PITFALLS §1) cheaply. Logged as **D-25**.

---

## Area 2: v1 → v2 corpus migration mechanics

### Q2.1 — How does corpus/books.yaml go from v1 (100 books) to v2 (240 books)?

| Option | Description | Selected |
|--------|-------------|----------|
| Atomic swap from build_corpus.py output | Script emits canonical v2; old file replaced wholesale; git diff captures audit. Single source-of-truth. | ✓ |
| Incremental in-place edit | Start from v1, manually add new books, comment drops, relabel surviving entries. Cautious; drifts from deterministic output. | |
| Two-file split (v2.yaml side-by-side) | Keep v1 frozen; write corpus/books_v2.yaml. Cleaner historical record; doubles load paths; complicates corpus_hash. | |

**User's choice:** Atomic swap (Recommended).
**Notes:** Logged as **D-26**.

### Q2.2 — How are v1 entries that don't survive recorded for audit?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate audit file in .planning/research/v2/ | v1_to_v2_migration.md lists every v1 entry with verdict (kept / dropped + reason / relabeled). Single doc; easy to review; YAML stays clean. | ✓ |
| Inline YAML comments above each dropped entry | Comment-out dropped entries in place; audit lives with the data. YAML grows noisy; build_corpus.py would need to preserve comments. | |
| Git history only | Trust git log -p as the audit. Minimal overhead; harder to scan. | |
| Audit table inside CORPUS_SOURCING.md | Appendix C with v1 → v2 audit. Co-located with sourcing rationale; mutates a Phase 7 deliverable post-hoc. | |

**User's choice:** Separate audit file (Recommended).
**Notes:** Logged as **D-27**.

### Q2.3 — How does the source field get populated for surviving v1 books?

| Option | Description | Selected |
|--------|-------------|----------|
| Re-fetch surviving v1 books cleanly | Same code path as new v2 books: fetch from Gutenberg, strip headers, hash canonical bytes, fetched_at = today. Uniform provenance; ~80 extra fetches. | ✓ |
| Hash existing data/raw/<gid>.txt files | Compute text_sha256 against existing v1 files; fetched_at = 2026-04-13 (v1 ship date). No network round-trip; provenance honest. | |
| Sentinel value (provider: gutenberg_v1_inherited) | Special-case the schema enum for v1-inherited books. Clearest history; creates a schema special case. | |

**User's choice:** Re-fetch cleanly (Recommended).
**Notes:** Integrity over speed; ~3 minutes of extra fetch time at v1 default sleep is acceptable. Logged as **D-28**.

### Q2.4 — Genre label transition under Proposal A merge

| Option | Description | Selected |
|--------|-------------|----------|
| Relabel inline at migration | books.yaml uses 8 v2 genre keys directly. Frankenstein → gothic_horror. Single source-of-truth; no mapping layer. v1 sub-genre preserved in migration audit. | ✓ |
| Keep v1 labels + add v2_genre field | Preserve genre: gothic; add v2_genre: gothic_horror. Schema bloat; ambiguity about canonical key. | |
| Keep v1 sub-genre in a `notes` field | v2 labels in books.yaml; record v1 sub-genre in notes: "v1 sub-genre: gothic". Reuses Phase 7's planned notes field; minimal schema impact. | |

**User's choice:** Relabel inline (Recommended).
**Notes:** Backend reads v2 keys directly; no merge-at-load layer. Logged as **D-29**.

---

## Area 3: Failure-handling & release-publish policy

### Q3.1 — Gutenberg fetch failure policy

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-skip + log, promote next candidate | Per Phase 7 §5 step 5: skip failed candidate, walk to next-by-score. corpus_build.log records every skip + promotion. Reviewed pre-commit, not mid-fetch. | ✓ |
| Halt + manual review at first failure | Stop on first failure; await human verdict. Breaks deterministic reproducibility. | |
| Batch all failures, review at end | Run all candidates; show summary; user revises before commit. Middle ground. | |

**User's choice:** Auto-skip + log (Recommended).
**Notes:** Halt threshold added in CONTEXT.md: if >10% of fetches fail for a single genre, halt. Logged as **D-30**.

### Q3.2 — Per-author smoke test failure (>10pp gap) response

| Option | Description | Selected |
|--------|-------------|----------|
| Abort Phase 8; restructure and retry | Per VALIDATION_PROTOCOL §8 first option. Wave-3 halt; loop back to Wave-1; drop dominant author's surplus; regenerate and retest. Strict. | |
| Ship with explicit disclaimer in validation report | Per VALIDATION_PROTOCOL §8 second option. Document the leakage publicly; treat v2 number as upper-bound. v2 still ships. | ✓ |
| Tolerance band — ship if gap ≤12pp; abort if >12pp | Relax the threshold for ship/abort. Mid-zone where shipping with caveat acceptable. | |

**User's choice:** Ship with explicit disclaimer.
**Notes:** This is a deliberate softening of VALIDATION_PROTOCOL §8's "MUST NOT ship" framing — though it IS the second option offered in that same section, so not a contradiction. Downstream agents must NOT silently soften the ≤10pp threshold itself; the disclaimer is the only legitimate response to a gap >10pp. Logged as **D-31**.

### Q3.3 — CEXP-03 margin interpretation

| Option | Description | Selected |
|--------|-------------|----------|
| Strict > per VALIDATION_PROTOCOL.md verbatim | Any margin above 0.3235 passes if permutation p<0.05; any below fails. No tolerance band. | ✓ |
| Strict > AND effect-size floor (|Δ| ≥ 0.01) | Pass requires ≥1pp improvement on top of strict > and p<0.05. Filters hairline statistical wins. | |
| Re-run with seed variation; majority pass | Hairline wins/misses (|Δ|<0.01) trigger re-run with different SVM random_state. Acknowledges noise floor; more compute. | |

**User's choice:** Strict > per protocol verbatim (Recommended).
**Notes:** Permutation p<0.05 is the statistical-significance backstop. Logged as **D-32**.

### Q3.4 — GitHub Release publish gating

| Option | Description | Selected |
|--------|-------------|----------|
| Wave 4 — after CEXP-03/04 pass | Release publishes only on validation success. Failure means no Release; v1 stays authoritative. Clean rollback. | ✓ |
| Pre-release immediately after Wave 2 | Publish v2.0-data-prerelease as soon as models exist; flip to v2.0-data after Wave 3 passes. Lets team inspect mid-flight. | |
| Publish in Wave 2 alongside retrain | Treat Release publish as part of retrain commit. Failures require manual Release deletion. | |

**User's choice:** Wave 4 after CEXP-03/04 pass (Recommended).
**Notes:** If smoke test fails and the user picks ship-with-disclaimer (D-31), Release still publishes in Wave 4 with the disclaimer in the validation report — the disclaimer is part of the published artifact, not a backchannel. Logged as **D-33**.

---

## Area 4: Doc-drift cleanup scope

### Q4.1 — Where does the cleanup land?

| Option | Description | Selected |
|--------|-------------|----------|
| Fold into Wave 4 as a final plan | Doc-alignment plan inside Wave 4. v2 ship + docs land in the same commit boundary. /gsd-docs-update remains a fallback. | ✓ |
| Run /gsd-docs-update separately after Phase 8 | Phase 8 ships strict CEXP-01..05; cleanup is a follow-up command. Cleaner Phase 8 scope; risk of never happening. | |
| Inline as part of each wave that touches docs | Wave 1 fixes CORPUS-01; Wave 3 updates PROJECT.md macro-F1 line. Doc drift fixed where caused; scatters edits. | |

**User's choice:** Fold into Wave 4 (Recommended).
**Notes:** Logged as **D-34**.

### Q4.2 — Scope of the cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Targeted edits to known stale text | Fix specific references already identified (CORPUS-01 "3 genres × 5 books", PROJECT.md Validated list, ROADMAP.md v1 outcomes). Surgical; no audit. | ✓ |
| Full audit + cleanup pass | Read all three docs end-to-end; reconcile every claim against codebase + v2 corpus state. Catches drift but expands Phase 8 scope. | |
| Targeted edits + add genre-set row to PROJECT Key Decisions | Targeted edits PLUS refresh PROJECT.md Key Decisions row at Phase 8 close with actual macro-F1 numbers. | |

**User's choice:** Targeted edits to known stale text (Recommended).
**Notes:** PROJECT.md already has a Proposal A row added 2026-05-25; D-35 adds a refresh row recording actual numbers at Phase 8 close. Logged as **D-35**.

### Q4.3 — Per-CEXP status flip timing

| Option | Description | Selected |
|--------|-------------|----------|
| Per-CEXP in the wave that closes it | Wave 1 closes CEXP-01 + CEXP-05 → flip both in that commit. Continuous; no end-of-phase sweep. | ✓ |
| All-at-once at Phase 8 close (Wave 4) | Flip all 5 CEXP rows together. Single docs commit; risk that intermediate states show CEXPs as Pending when actually shipped. | |

**User's choice:** Per-CEXP in the wave that closes it (Recommended).
**Notes:** Logged as **D-36**.

---

## Claude's Discretion (not asked, recorded for downstream agents)

- **Frontend genre relabel timing** — defer to Phase 10 per Phase 7's "no frontend in data phases" pattern. Phase 8 verifies the fallback color path exists (defensive); does not update `frontend/src/constants/genres.ts` or `backend/api/routes/corpus.py::_GENRE_COLORS`.
- **Validation-only fast path (phase7_v1_baseline.py byte-identical gate)** — fold into Wave 1, not a standalone Plan-01. The gate is cheap; separating it inflates plan count.
- **Wave-1 commit granularity** — multiple commits inside Wave 1 are acceptable (build_corpus.py, books.yaml, migration audit as separate commits). Planner picks atomic boundaries that aid bisection.
- **`fetched_at` format** — ISO 8601 date (YYYY-MM-DD) per Phase 7 D-10; planner decides whether to include time-of-day if intra-day re-fetches matter.
- **Word-count threshold** — Phase 7 mentions tentatively ≥20,000 words; planner picks the exact threshold and documents in `build_corpus.py`.
- **GroupKFold K edge cases** — VALIDATION_PROTOCOL §6 says K = min(distinct_authors_per_genre), expected 8. If post-selection K drops below 8, planner decides whether to floor at 5 or halt Phase 8.
- **`build_corpus.py` CLI design** — flag names, dry-run mode, etc.; planner picks consistent with v1 `scripts/01_download_corpus.py`.
- **`results/v2_validation_report.md` structure** — VALIDATION_PROTOCOL §7 specifies the full panel; planner picks section ordering, markdown structure, baseline embed vs reference-by-path.
- **`corpus_metadata.json` regeneration** — planner decides whether to run `scripts/build_corpus_metadata.py` inline with the Wave-2 pipeline or as a post-step.

---

## Deferred Ideas

(Captured in 08-CONTEXT.md `<deferred>` block — listed here for the audit:)

- Frontend genre relabel → Phase 10
- Hyperparameter sweep (Phase 8b candidate, not Phase 8)
- HathiTrust metadata enrichment (Phase 8 may skip per CORPUS_SOURCING §2)
- Standard Ebooks preference rule implementation (Wave 1 vs Phase 8b — planner picks)
- Multi-label classification (deferred to v3 per RES-03)
- Per-genre F1 deep-dives (v3 acts on Phase 8 numbers)
- v2_validation_report.md as a Release asset (Wave 4 planner picks)
- Automation of /gsd-docs-update invocation (not specified; planner's call)

---

*Phase: 08-corpus-expansion*
*Discussion completed: 2026-05-25*
