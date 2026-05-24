# Phase 8: Corpus Expansion — Context

**Gathered:** 2026-05-25
**Status:** Ready for planning
**Mode:** Interactive `/gsd-discuss-phase 8` — all decisions are user-authored (see DISCUSSION-LOG.md for alternatives considered).

<domain>
## Phase Boundary

Retrain Word2Vec + SVM end-to-end on a restructured **8-genre × 30-book = 240-book corpus**, beat the v1 macro-F1 baseline of **0.3235** on the 20 pinned hold-out gutenberg_ids, and publish the new models to a `v2.0-data` GitHub Release. Phase 7 locked the methodology verbatim — Phase 8 makes **zero further sourcing or validation decisions** and executes the entry checklists in `CORPUS_SOURCING.md §8` and `VALIDATION_PROTOCOL.md §10`.

**In scope (Phase 8):**
- **CEXP-01:** rewrite `corpus/books.yaml` with the new v2 schema (`source: {provider, fetched_at, text_sha256}`) and the 8-genre × 30-book layout per Proposal A.
- **CEXP-02:** rerun the full pipeline (`scripts/01 → 02 → 03 → 04 → 05 → 06`) on the new corpus; publish artifacts to the `v2.0-data` GitHub Release.
- **CEXP-03:** evaluate the v2 SVM on Phase 7's 20-ID hold-out; report macro-F1, per-genre F1, permutation p; pass requires **v2 macro-F1 strictly > 0.3235** AND p<0.05.
- **CEXP-04:** `GroupKFold(groups=author, n_splits=K=8)` cross-validation; per-author held-out smoke test with ≤10pp gap; report all three numbers per VALIDATION_PROTOCOL §9.
- **CEXP-05 (now P1, upgraded from P2 by D-24):** `scripts/build_corpus.py` is written FIRST and emits the canonical v2 `books.yaml` from `corpus_candidates.yaml` + the deterministic selection rule. Free byte-identical reproducibility.
- **Doc alignment (folded in per D-34/35):** targeted PROJECT.md / REQUIREMENTS.md / ROADMAP.md edits to remove the stale "3 genres × 5 books" framing, plus per-CEXP status flips to `Validated` as each wave closes.

**NOT in scope (deferred / owned elsewhere):**
- Frontend genre relabel (`frontend/src/constants/genres.ts`, `data/models/genre_names.json`, `backend/api/routes/corpus.py::_GENRE_COLORS`) — Phase 10 owns UI changes; Phase 8 leaves frontend wired to v1 keys until Phase 10's dark-mode sweep touches the same files. Backend continues to load whatever keys are in `corpus/books.yaml`; v2 keys (`gothic_horror`, `speculative`) start appearing in payloads after Wave 1 lands, but the frontend's hardcoded color map and tour copy won't be updated yet. **Phase 8 must verify the frontend still renders without crashing** (unknown genres should render with a fallback color, not throw) — if not, that's a regression to fix inside Phase 8.
- Hyperparameter sweep — α, K, window stay frozen at v1 values per PITFALLS §4 (no co-tuning with corpus expansion in the same retrain).
- Multi-label classification — Phase 7 explicitly deferred to v3 per RES-03 / D-18.
- Phase 9 / Phase 10 work (top-N, explainability, dark mode, tour) — all bind to the v2 SVM landed here.

**Phase 7's "approved Proposal A" assumption:** PROJECT.md Key Decisions already records Proposal A as the committed outcome ("8 genres × 30 books = 240"). Phase 8 proceeds without a separate user-approval checkpoint. If the user pushes back on Proposal A during planning, Wave 1 stalls until corpus_candidates.yaml is re-read against Proposal B/C.

**The four waves** (per D-22):

```
Wave 1 — Corpus build (CEXP-01 + CEXP-05)
  • Write scripts/build_corpus.py (P1)
  • Re-run scripts/phase7_v1_baseline.py — verify byte-identical output (entry gate)
  • Pre-retrain BUG-05 cache smoke test (sanity check Phase 6 invariant)
  • Generate v2 books.yaml from candidates + selection rule
  • Re-fetch surviving v1 books cleanly; record provenance
  • Write .planning/research/v2/v1_to_v2_migration.md audit
  • Commit; flip CEXP-01 + CEXP-05 to Validated
        ↓ gate (clean books.yaml + reproducer script land)
Wave 2 — Pipeline retrain (CEXP-02)
  • Run scripts/01 → 02 → 03 → 04 → 05 end-to-end on new corpus
  • Generate new SVM lineage sidecar (corpus_hash + w2v_model_sha256)
  • Post-retrain BUG-05 cache smoke test (verify old cache miss)
  • Commit models via git LFS
        ↓ gate (new models exist + cache invariant verified)
Wave 3 — Validation (CEXP-03 + CEXP-04)
  • Modify scripts/06_validate.py per VALIDATION_PROTOCOL §6/§8/§10
  • Compute three numbers per §9 (v1-on-holdout / v2-on-holdout / v2-LOOCV)
  • Run GroupKFold(groups=author, n_splits=8) + per-author smoke test
  • Write results/v2_validation_report.md
  • CEXP-03/04 pass criteria evaluated
  • Commit; flip CEXP-02 + CEXP-03 + CEXP-04 to Validated
        ↓ gate (validation passes OR smoke-test disclaimer landed)
Wave 4 — Release + doc alignment
  • Publish v2.0-data GitHub Release (gated on CEXP-03/04 pass)
  • Targeted doc edits: PROJECT.md, REQUIREMENTS.md, ROADMAP.md
  • Final commit; phase complete
```

</domain>

<decisions>
## Implementation Decisions

Numbering continues from Phase 7 (which ended at D-21). Phase 8 owns D-22..D-36.

### A. Plan structure & wave sequencing (Q1–Q4)

- **D-22:** **Linear 4-wave structure.** Wave 1 = corpus build (CEXP-01 + CEXP-05). Wave 2 = pipeline retrain (CEXP-02 model artifacts). Wave 3 = validation (CEXP-03 + CEXP-04). Wave 4 = GitHub Release publish + targeted doc alignment. Each wave is a clean gate; halting at any wave leaves a coherent state. Rationale: maps CEXP requirements to commits cleanly, makes the failure-mode response well-defined (e.g., a Wave-3 fail does not affect Wave-1's committed corpus).
- **D-23:** **Compute runs on the local dev machine.** Per the CLAUDE.md fresh-machine pattern — pipeline runs locally; new models committed to `data/models/` via git LFS; Railway pulls models via the GitHub Release asset on next deploy. Matches v1 ops. No Railway worker, no cloud VM provisioning, no new infrastructure. The dev machine is occupied for the duration of Wave 2 (estimated multiple hours).
- **D-24:** **`scripts/build_corpus.py` is now P1, upgraded from Phase 7's P2 designation.** It is written FIRST (early Wave 1) and used to emit the canonical v2 `books.yaml`. CEXP-05 ships in Wave 1, not as a Wave-4 afterthought. Trade-off: small upfront cost (~1 day to write the script), in exchange for free byte-identical reproducibility (CEXP-05 success criterion #5 satisfied as a by-product). Build_corpus.py reads `.planning/research/v2/corpus_candidates.yaml`, applies the §5 selection rule verbatim, fetches text + computes `text_sha256`, and writes `corpus/books.yaml` deterministically.
- **D-25:** **BUG-05 cache-flush smoke test runs both pre- and post-retrain.** Pre-retrain run (Wave 1, before any corpus write) = sanity check that Phase 6's BUG-05 invariant still holds. Post-retrain run (Wave 2, after pipeline rerun) = verifies the new `corpus_hash` + `w2v_model_sha256` rotated all cache keys and old precomputed artifacts are unreachable. Two tiny checkpoints; catches the single worst footgun (stale-cache-against-new-model, PITFALLS §1) cheaply.

### B. v1 → v2 corpus migration mechanics (Q5–Q8)

- **D-26:** **Atomic swap from `build_corpus.py` output.** `corpus/books.yaml` is replaced wholesale in a single Wave-1 commit. The script reads `corpus_candidates.yaml` + selection rule (§5) → emits the canonical v2 file. Surviving v1 entries naturally reappear because they're in the candidate list. Git diff captures every add/drop/relabel for audit. Single source of truth; no merge layer; no in-place edit drift.
- **D-27:** **Drop audit lives in `.planning/research/v2/v1_to_v2_migration.md`** — a separate markdown audit file listing every v1 entry with one of three verdicts: kept (with v2 genre key if relabeled), dropped (with reason: author concentration / not in candidate top-30 / Gutenberg-unavailable), or relabeled-only. Linked from CORPUS_SOURCING.md after creation. YAML stays clean of comments; audit is reviewable as a single doc.
- **D-28:** **Re-fetch surviving v1 books cleanly via `build_corpus.py`.** All 240 v2 books — whether new or v1-inherited — go through the same fetch path: Gutenberg URL (or Standard Ebooks fallback per CORPUS_SOURCING §2), header strip, canonical-bytes hash, `fetched_at: <today>`. Uniform provenance. Cost: ~80 extra Gutenberg fetches for v1 books that survive (sleep-rate-limited per `config/params.yaml::corpus.download_sleep`). Existing `data/raw/` files are NOT trusted (D-28 prefers integrity over speed).
- **D-29:** **Relabel inline at migration.** `corpus/books.yaml` directly uses the 8 v2 genre keys (`adventure`, `gothic_horror`, `historical`, `literary`, `mystery`, `romance`, `speculative`, `western`). Frankenstein (v1 gothic) is written as a `gothic_horror` entry. *The Time Machine* (v1 scifi) is written as a `speculative` entry. No `v2_genre` parallel field; no merge-at-load mapping layer; backend reads v2 keys directly. The v1 sub-classification ("originally gothic") is preserved in `v1_to_v2_migration.md`, not in the YAML.

### C. Failure-handling & release-publish policy (Q9–Q12)

- **D-30:** **Auto-skip + log on Gutenberg fetch failure; promote next-by-score candidate.** Per CORPUS_SOURCING §5 step 5, `build_corpus.py` skips any failed candidate (404 / corrupted text / unstripped header/footer) and walks the candidate list to the next title. Every skip + promotion is recorded in `.planning/research/v2/corpus_build.log` (sibling artifact, audit only). Phase 8 reviews the log before the Wave-1 commit but does NOT halt mid-fetch. Failure threshold for human halt: if >10% of fetches fail for a single genre, halt and investigate (suggests the candidate list is stale or Gutenberg URLs changed). Deterministic-with-failures: re-running the script on the same day produces the same `books.yaml` because the Gutenberg failures are reproducible at fetch time.
- **D-31:** **Per-author smoke test failure (>10pp gap) → ship with explicit disclaimer.** Per VALIDATION_PROTOCOL.md §8 second option ("Document the leakage publicly and treat the v2 number as upper-bound rather than expected"). On failure, `results/v2_validation_report.md` opens with an explicit "ANTI-LEAKAGE GUARDRAIL FAILED" section reporting the actual gap, per-author breakdown, and the upper-bound interpretation. **This is a softening of `VALIDATION_PROTOCOL.md §8`'s "MUST NOT ship" framing, but it's the second option offered in that same section — Phase 8 takes the documented path.** Restructure-and-retry is the alternative; the user authorized the ship-with-disclaimer path explicitly during Phase 8 discuss.
- **D-32:** **CEXP-03 pass criterion is strict `>` per VALIDATION_PROTOCOL.md verbatim.** v2 macro-F1 > v1 macro-F1 (0.3235) AND permutation p<0.05. Any margin above 0.3235 passes; any below fails. No effect-size floor; no seed-variation re-run for hairline wins. The permutation test is the statistical-significance backstop — a 0.0001-margin win that passes permutation p<0.05 ships. If the win is unsignificant (p≥0.05), CEXP-03 fails regardless of margin.
- **D-33:** **GitHub Release publishes in Wave 4 after CEXP-03/04 pass.** Models exist after Wave 2 (committed to `data/models/` via git LFS); validation runs in Wave 3; Release publishes only on CEXP-03 + CEXP-04 success in Wave 4. Failure at Wave 3 means no Release — v1's existing Release asset stays authoritative until either restructure-and-retry succeeds or the ship-with-disclaimer path lands in Wave 4. Tag: `v2.0-data` (matches ROADMAP success criterion #2). Assets: `svm_pipeline.joblib`, `svm_pipeline.joblib.lineage.json`, the matching `kmeans_w15_k200.pkl`, `w2v_w15.model`, `persistence_imager.joblib`, `corpus_metadata.json` (regenerated from BUG-03 sidecar).

### D. Doc-drift cleanup scope (Q13–Q15)

- **D-34:** **Doc cleanup folds into Wave 4 as the final plan, not a separate `/gsd-docs-update` invocation.** When the GitHub Release lands, a coherent v2 ship is one commit boundary away — PROJECT.md, REQUIREMENTS.md, and ROADMAP.md align with the actual corpus state in the same boundary. The `/gsd-docs-update` command remains a fallback for anything missed. Avoids the risk of doc drift never being fixed.
- **D-35:** **Targeted edits to known stale text, not a full audit.** Specifically:
  - **REQUIREMENTS.md CORPUS-01** — flip from "3 genres × 5 books" (stale) to the actual v1 reality (10 genres × 10 books) AND record the v2 state (8 genres × 30 books) once Phase 8 ships.
  - **PROJECT.md "Validated" list** — fix the corresponding "3 genres × 5 books" line to match v1 reality; add CEXP-01..05 to the v2.0 Validated section as each closes.
  - **ROADMAP.md "v1 outcomes"** — implicit references to the stale framing get aligned to the actual v1 shipped state.
  - **PROJECT.md Key Decisions table** — already has the Proposal A row (added 2026-05-25); add a refresh row at Phase 8 close recording the actual macro-F1 number + GroupKFold gap.
- **D-36:** **Per-CEXP status updates happen in the wave that closes them, not as an end-of-phase sweep.** Wave 1 closes CEXP-01 + CEXP-05 → flip both to Validated in the Wave-1 commit. Wave 2 closes CEXP-02 → flip in the Wave-2 commit. Wave 3 closes CEXP-03 + CEXP-04 → flip in the Wave-3 commit. REQUIREMENTS.md traceability table reflects reality continuously; no terminal sweep where five rows flip at once.

### Claude's Discretion

- **Frontend genre relabel timing** — defer to Phase 10 per the Phase 7 pattern of "no frontend work in research/data phases". Phase 8 must verify the frontend doesn't crash on unknown genre keys (`gothic_horror`, `speculative`) before Wave 4 closes — if `GENRE_COLORS[g] || fallback` is missing anywhere, Phase 8 fixes the fallback (defensive), but does NOT update the color map / tour copy / display labels (Phase 10's job).
- **Wave-1 commit granularity** — multiple commits inside Wave 1 are acceptable (e.g., separate commits for build_corpus.py, books.yaml, migration audit). Planner picks atomic boundaries that aid bisection without ballooning commit count.
- **`fetched_at` timestamp format** — ISO 8601 date (`YYYY-MM-DD`) per Phase 7 D-10; planner decides whether to include time-of-day (`YYYY-MM-DDTHH:MM:SSZ`) if intra-day re-fetches matter for reproducibility (probably not — `corpus_hash` is the load-bearing reproducibility input, `fetched_at` is human-readable provenance).
- **Word-count threshold** — Phase 7 §5 selection rule step 3 mentions "tentatively ≥20,000 words per book". Planner picks the exact threshold and documents it in `build_corpus.py`. Short-story-collection candidates may have individual entries below 20k but full collections clear the bar — planner decides whether to treat collection-aggregates as one entry (current v1 pattern) or filter at fetch time.
- **GroupKFold K-selection edge cases** — VALIDATION_PROTOCOL.md §6 says `K = min(distinct_authors_per_genre)` with expected K=8. If post-selection the actual minimum drops below 8 (e.g., a fetch failure forces a fall-through that lands a smaller-than-expected author count for one genre), planner decides whether to floor K at 5 or halt Phase 8 (restructure corpus to restore the floor).
- **`build_corpus.py` CLI design** — flag names, dry-run mode, partial-genre rebuild support, etc. Planner picks consistent with v1's `scripts/01_download_corpus.py` patterns.
- **Validation-only fast path** — the entry-checklist step 2 (re-run `phase7_v1_baseline.py`, verify byte-identical output) is a Wave-1 gate, NOT a standalone Plan-01. If the re-run fails, Wave 1 halts immediately; no separate rollback boundary is created. Reason: the gate is cheap enough that a separate plan inflates Phase 8 plan count without buying real isolation.
- **`results/v2_validation_report.md` structure** — VALIDATION_PROTOCOL.md §7 specifies the full reporting panel; planner picks section ordering, exact markdown structure, and whether to embed the v1 baseline JSON inline or reference by path.
- **`corpus_metadata.json` regeneration** — Phase 6 BUG-03 introduced this sidecar (per-book `top_10_tfidf_words`). Phase 8's CEXP-02 pipeline rerun regenerates it; planner decides whether to run `scripts/build_corpus_metadata.py` inline with the pipeline or as a Wave-2 post-step.

### Folded Todos

*None — `gsd-tools todo match-phase 8` returned 0 pending todos.*

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (gsd-phase-researcher, gsd-planner, gsd-executor) MUST read these before planning or implementing.**

### Phase 7 deliverables — locked inputs for Phase 8

- [`.planning/research/v2/CORPUS_SOURCING.md`](../../../research/v2/CORPUS_SOURCING.md) §"Pipeline implication" (D-03 / D-04 sourcing pipeline); §4 "Genre set recommendation" (Proposal A locked); §5 "Phase 8 selection rule" (deterministic algorithm `build_corpus.py` implements); §5 "books.yaml schema additions" (D-10 schema); §8 "Phase 8 entry checklist" (executed top-to-bottom).
- [`.planning/research/v2/VALIDATION_PROTOCOL.md`](../../../research/v2/VALIDATION_PROTOCOL.md) §2 "Hyperparameters held fixed" (no co-tuning); §3 "Test set" (20 pinned gutenberg_ids); §5 "v1 baseline" (macro-F1 = 0.3235 anchor + per-genre F1 + confusion matrix); §6 "GroupKFold by author" (K=8 implementation); §8 "Per-author smoke test" (≤10pp gap + the failure branches D-31 picks between); §9 "Three-numbers reporting"; §10 "Phase 8 entry checklist".
- [`.planning/research/v2/corpus_candidates.yaml`](../../../research/v2/corpus_candidates.yaml) — canonical source of candidate gutenberg_ids per genre. `build_corpus.py` reads this verbatim; no inline lookup, no hand-extension.
- [`.planning/research/v2/v1_baseline_results.json`](../../../research/v2/v1_baseline_results.json) — pinned v1 baseline numbers; Phase 8 Wave-1 gate verifies byte-identical re-run via `scripts/phase7_v1_baseline.py`.
- [`.planning/phases/07-corpus-sourcing-research-spike/07-CONTEXT.md`](../07-corpus-sourcing-research-spike/07-CONTEXT.md) — Phase 7 decision set D-01..D-21 that Phase 8 inherits without re-discussion.

### v2 research backbone

- [`.planning/research/PITFALLS.md`](../../../research/PITFALLS.md) §1 (W2V retraining rotates space — cache_key fix from BUG-05 is load-bearing for Phase 8); §4 (held-out test set — operationalized in VALIDATION_PROTOCOL); §5 (author overlap leakage — operationalized in GroupKFold + smoke test); §6 (class imbalance — operationalized by macro-F1 headline + per-genre F1 panel); §11 (LOOCV cost — Phase 8 uses GroupKFold as the primary CV, LOOCV demoted to context-only per VALIDATION_PROTOCOL §9).
- [`.planning/research/SUMMARY.md`](../../../research/SUMMARY.md) §"Phase 8: Corpus Expansion" — v2 spine; pre-states what this phase must close.
- [`.planning/research/ARCHITECTURE.md`](../../../research/ARCHITECTURE.md) §5e "Corpus expansion — does data layout change?" — confirms additive schema; cache-key fix shipped in Phase 6 BUG-05.
- [`.planning/research/STACK.md`](../../../research/STACK.md) §"Corpus Sourcing" — `gutenbergpy>=0.3.5` already installed; Standard Ebooks / Internet Archive notes.
- [`.planning/research/FEATURES.md`](../../../research/FEATURES.md) §2 "Corpus Quality" — feature framing; anti-features list (BookCorpus, Goodreads scraping at scale, LLM auto-labelling) confirmed by Phase 7.

### v1 codebase — files Phase 8 reads, modifies, or extends

- [corpus/books.yaml](../../../../corpus/books.yaml) — current 100-book v1 manifest; **atomic-swap target** (D-26). build_corpus.py overwrites in Wave 1.
- [scripts/build_corpus.py](../../../../scripts/build_corpus.py) — **does NOT exist yet**; Phase 8 Wave 1 creates it (D-24, CEXP-05 P1).
- [scripts/01_download_corpus.py](../../../../scripts/01_download_corpus.py) — existing Gutenberg fetcher; build_corpus.py imports `download_book()` from it (or replicates the pattern with refinements for the `source` schema).
- [scripts/02_preprocess.py](../../../../scripts/02_preprocess.py) — tokenize / normalize; reused unchanged in Wave 2.
- [scripts/03_train_embeddings.py](../../../../scripts/03_train_embeddings.py) — W2V training; reused unchanged in Wave 2 (window=15 frozen per VALIDATION_PROTOCOL §2).
- [scripts/04_compute_homology.py](../../../../scripts/04_compute_homology.py) — Vietoris-Rips per-book; reused unchanged.
- [scripts/05_build_features.py](../../../../scripts/05_build_features.py) — feature concatenation; reused unchanged.
- [scripts/06_validate.py](../../../../scripts/06_validate.py) — **MODIFIED in Wave 3** per VALIDATION_PROTOCOL §10: add `evaluate_on_holdout()`, `cross_validate_grouped()`, `per_author_held_out_smoke_test()`, permutation null hypothesis test.
- [scripts/phase7_v1_baseline.py](../../../../scripts/phase7_v1_baseline.py) — Wave-1 gate; re-run before any v2 work and verify byte-identical output against `v1_baseline_results.json`.
- [scripts/flush_v1_cache.py](../../../../scripts/flush_v1_cache.py) — BUG-05 cache-flush utility from Phase 6; used by the pre- and post-retrain smoke tests (D-25).
- [scripts/build_corpus_metadata.py](../../../../scripts/build_corpus_metadata.py) — BUG-03 sidecar generator (`top_10_tfidf_words`); Phase 8 reruns after Wave 2 to regenerate `data/corpus_metadata.json` against v2 corpus.
- [config/params.yaml](../../../../config/params.yaml) — v1 hyperparameters (window=15, k=200, α=0.7, C=10, kernel=rbf, permutation_n=1000). **Phase 8 MUST hold these fixed** per VALIDATION_PROTOCOL §2.
- [backend/api/routes/corpus.py](../../../../backend/api/routes/corpus.py) `_GENRE_COLORS` — hardcoded 10 v1 genre colors at module scope; Phase 8 verifies unknown-genre fallback path exists (defensive) but does NOT update the map (Phase 10 owns).
- [backend/pipeline/precompute.py](../../../../backend/pipeline/precompute.py) — cache-key construction post-BUG-05 includes corpus_hash + w2v_model_sha256; Phase 8 trusts this invariant.
- [data/models/svm_pipeline.joblib](../../../../data/models/svm_pipeline.joblib) + [data/models/svm_pipeline.joblib.lineage.json](../../../../data/models/svm_pipeline.joblib.lineage.json) — v1 model + lineage sidecar; **replaced wholesale in Wave 2**.
- [data/models/genre_names.json](../../../../data/models/genre_names.json) — currently lists 10 v1 genres; Wave 2 retrain regenerates it with the 8 v2 keys (this IS a Phase 8 update — it's data, not frontend code; frontend reads this file dynamically via `_KNOWN_GENRES`).
- [frontend/src/constants/genres.ts](../../../../frontend/src/constants/genres.ts) `GENRE_COLORS` — hardcoded 10 v1 keys; **Phase 8 leaves untouched** (Phase 10 owns).
- [results/validation_report.txt](../../../../results/validation_report.txt) — v1 LOOCV output (54.6%, p=0.001); replaced in Wave 3 by `results/v2_validation_report.md` (per VALIDATION_PROTOCOL §7).
- [results/validation_history.log](../../../../results/validation_history.log) — append-only log; v2 metrics join this file in Wave 3.

### Planning anchors

- [.planning/PROJECT.md](../../../PROJECT.md) §Constraints — mathematical invariants (1)–(4) Phase 8's retrain must preserve. §"Key Decisions" — Proposal A is already recorded.
- [.planning/REQUIREMENTS.md](../../../REQUIREMENTS.md) §"Corpus Expansion (Phase 8)" CEXP-01..05 verbatim wording. §"Future Work" — multi-label remains deferred per Phase 7 RES-03.
- [.planning/ROADMAP.md](../../../ROADMAP.md) §"Phase 8: Corpus Expansion" — entry conditions ("BUG-05 must have landed"; Phase 7 deliverables exist) + success criteria + dependency on Phase 6 + Phase 7.

### Phase 6 dependencies (already shipped)

- BUG-05 cache_key invariant — every `cache_key` includes `corpus_hash` (sha256 of `books.yaml`) + `w2v_model_sha256` (sha256 of the W2V model file). Phase 8 trusts this; D-25 smoke test verifies it twice.
- SVM lineage guard — `svm_pipeline.joblib.lineage.json` schema; refuse-to-load on mismatch. Phase 8 generates a new lineage file in Wave 2.
- Pre-commit hook + `.gitattributes` + `.planning/.snapshots/` — protects ROADMAP/STATE from 0-byte commits. Phase 8 inherits the protection.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`gutenbergpy>=0.3.5`** — already installed (per STACK.md and the v1 `scripts/01_download_corpus.py`). Phase 8's `build_corpus.py` reuses the existing fetch + header-strip pattern; adds canonical-bytes hashing + `source` field emission.
- **`scripts/01_download_corpus.py::download_book()`** — proven Gutenberg URL-cascade fetcher with retry. Phase 8 imports or replicates with the addition of post-fetch `text_sha256` computation against the canonical (header-stripped) bytes.
- **`scripts/06_validate.py`** — existing LOOCV + permutation skeleton; Phase 7 specified the exact function additions in VALIDATION_PROTOCOL §10 (`evaluate_on_holdout`, `cross_validate_grouped`, `per_author_held_out_smoke_test`). No greenfield validation work.
- **`scripts/phase7_v1_baseline.py`** — Phase 7 evaluator; Wave-1 gate re-run produces the byte-identical-check.
- **`scripts/flush_v1_cache.py`** — BUG-05 cache-flush utility; D-25's pre- and post-retrain smoke tests reuse it.
- **`backend/pipeline/precompute.py`** — post-BUG-05 cache-key construction is the load-bearing reproducibility primitive; Phase 8 only needs to retrain and let the cache invalidate naturally.
- **`config/params.yaml::corpus.download_sleep`** — rate-limit knob for the Gutenberg fetcher; Phase 8 tunes if Wave-1 fetch failures suggest Gutenberg rate-limiting (default value preserved unless evidence shows otherwise).
- **`data/models/svm_pipeline.joblib.lineage.json`** — BUG-05 lineage sidecar; Phase 8 Wave 2 regenerates the sidecar against the new model. Schema (corpus_hash + w2v_model_sha256 + hyperparameters) does not change.

### Established Patterns

- **Single source of truth for corpus state:** `corpus/books.yaml`. D-26 keeps this — atomic swap, no parallel v2 file. The `source` field is additive; existing `_load_books_metadata()` consumers ignore unknown keys (per Phase 7 CORPUS_SOURCING §5 backward-compat note).
- **Content-addressed cache invariant (BUG-05):** all precomputed artifacts cache-keyed on `(step_name, params, corpus_hash, w2v_model_sha256)`. Retrain rotates `corpus_hash` AND `w2v_model_sha256` → every cache key changes → old cache is unreachable. Phase 8 trusts this; D-25 verifies it.
- **Pipeline scripts are CLI-only, sequential, file-based.** Each `scripts/0N_*.py` reads upstream artifacts and writes downstream ones to predictable paths. Phase 8 follows the same pattern for `build_corpus.py` (reads candidates YAML, writes books.yaml + corpus_build.log).
- **Append-only validation history.** `results/validation_history.log` accumulates timestamped entries; Phase 8 appends, never rewrites.
- **Git LFS for binary model files.** `data/models/*.joblib` + `.pkl` + `.model` + `.bin` are tracked via LFS per CLAUDE.md fresh-machine setup. Phase 8 commits new model files via the same path. The `data/models/genre_names.json` is NOT a model file → committed via regular git, not LFS.
- **Frontend reads dynamic genre lists from backend.** `frontend/src/hooks/useCorpusBooks.ts` consumes `/api/corpus/genres` which the backend builds from `corpus/books.yaml`. New v2 genre keys will propagate automatically after Wave 1; the only hardcoded frontend list is `GENRE_COLORS` (Phase 10's update).

### Integration Points

- **`build_corpus.py` → `corpus/books.yaml`** (Wave 1, D-26 atomic swap): single emission point; no incremental edits.
- **Wave 2 pipeline rerun → `data/models/*`** (CEXP-02): existing scripts 01–05 unchanged, run sequentially against new books.yaml. Wave 2 writes new W2V model, k-means clusters at k=200, persistence_imager, feature matrix, SVM pipeline + lineage sidecar.
- **`scripts/06_validate.py` modifications → `results/v2_validation_report.md`** (Wave 3, CEXP-03/04): function additions per VALIDATION_PROTOCOL §10; output markdown structure per §7 reporting panel.
- **GitHub Release `v2.0-data` → Railway** (Wave 4, D-33): assets pulled at container start via the existing `RELEASE_URL` mechanism (Phase 5 deployment pattern). No infra change in Phase 8 — just a new Release tag.
- **`data/models/genre_names.json` → `_KNOWN_GENRES` (corpus.py) → frontend payloads**: Wave 2 regenerates this file; backend reads it dynamically; frontend `useCorpusBooks` consumes the API. New v2 keys (`gothic_horror`, `speculative`) flow to the UI automatically — they just render with the fallback color until Phase 10 updates `GENRE_COLORS`. Phase 8 verifies the fallback path doesn't crash.
- **`data/corpus_metadata.json` → BookSlider** (post-Wave 2 regenerate): BUG-03 sidecar; Phase 8 reruns `scripts/build_corpus_metadata.py` after the pipeline finishes so BookSlider's per-genre TF-IDF words match the v2 corpus.
- **`.planning/research/v2/v1_to_v2_migration.md` → CORPUS_SOURCING.md** (Wave 1, D-27): one-line link added to CORPUS_SOURCING.md document-provenance section; the audit doc itself lives in `.planning/research/v2/`.

### Anti-patterns to avoid

- **Don't co-tune hyperparameters with the corpus expansion.** PITFALLS §4. window / k / α / C are frozen at v1 values per VALIDATION_PROTOCOL §2. Any hyperparameter sweep is a separate, post-Phase-8 retrain.
- **Don't partial-rebuild the pipeline.** PITFALLS §1. When `corpus/books.yaml` changes, run `01 → 02 → 03 → 04 → 05 → 06` end-to-end. Never skip steps "because TF-IDF is already cached" — BUG-05 ensures the cache misses, but the pattern is to run all five scripts in sequence anyway.
- **Don't try to `git mv` the v1 model file.** Wave 2 produces fresh model files at the same paths; the old v1 versions are overwritten via LFS. Git LFS handles the version diff. No manual file moves; no manual hash bookkeeping.
- **Don't add new dependencies.** Phase 7 D-05 deferred any new installs. If Phase 8 finds a need (e.g., a Standard Ebooks downloader library), the install lands alongside actual use — but planner should first verify the v1 `requests`-based pattern suffices.
- **Don't touch `frontend/src/constants/genres.ts`.** Phase 10 owns. Phase 8 verifies the fallback color path doesn't crash; that's the entire frontend obligation.
- **Don't manually edit `corpus/books.yaml`** after `build_corpus.py` lands. D-24 + D-26: the script is the canonical source; any hand-edit breaks CEXP-05 reproducibility. If a v2 book turns out to be the wrong choice post-Wave-1, the fix is to edit `corpus_candidates.yaml` (or the selection rule) and re-run `build_corpus.py`, not to nudge books.yaml directly.

</code_context>

<specifics>
## Specific Ideas

- **Proposal A is already approved** in PROJECT.md Key Decisions. Phase 8 proceeds on that assumption without a separate D-21 review step. If user changes mind during planning, Wave 1 stalls until corpus_candidates.yaml is re-read against the new proposal.
- **The "no per-author cap" trade (D-07 inherited from Phase 7) puts everything on the smoke test.** D-31's ship-with-disclaimer fallback is the user's explicit choice to accept upper-bound results when the smoke test fails. Downstream agents must NOT silently soften the smoke test threshold (still ≤10pp); the disclaimer is the only legitimate response to a >10pp gap.
- **`scripts/build_corpus.py` being P1 (D-24) reshapes Wave 1.** Phase 7's "P2 retroactive reproducer" framing is now wrong — Phase 8 writes the script first and uses it to generate v2. CEXP-05 ships when CEXP-01 ships, in the same Wave.
- **Uniform provenance from re-fetch (D-28) means ~80 extra Gutenberg fetches** for the v1 books that survive. At `corpus.download_sleep=2.0` (v1 default), that's ~3 minutes of fetch time. Acceptable; do not optimize away by trusting `data/raw/`.
- **The frontend will render unknown genres with a fallback color until Phase 10.** This is intentional. Anyone testing the app between Wave 4 and Phase 10 will see `gothic_horror` and `speculative` with a default color (not the per-genre palette). Phase 8 ensures this doesn't crash; it does NOT polish.
- **The Wave-3 smoke-test pass/fail decision blocks the Wave-4 Release publish.** If the smoke test fails and the team picks the ship-with-disclaimer path, the Release still publishes in Wave 4 with the disclaimer in the validation report. The disclaimer is part of the published artifact, not a backchannel.
- **The v1 baseline reproducibility gate (Wave 1) is non-negotiable.** Per VALIDATION_PROTOCOL §10 step 2: re-run `phase7_v1_baseline.py` and verify byte-identical output. Any deviation halts Wave 1 immediately; downstream agents must investigate before any v2 work — likely a Phase 6 BUG-05 regression, a Python/sklearn version drift, or a corrupted v1 model file. Do not proceed past Wave 1 on a non-byte-identical re-run.
- **Failed candidates cascade deterministically.** Per D-30 + Phase 7 §5: if candidate #1 fails, promote #2; if #2 fails, promote #3; etc. The selection rule is robust to Gutenberg outages because the candidate YAML lists ≥50 per genre and the selection only needs 30 (with author-floor first). The `corpus_build.log` is the audit; it should be small (~5-20 lines of skip+promote, not pages).

</specifics>

<deferred>
## Deferred Ideas

- **Frontend genre relabel** — Phase 10 owns. Updates needed: `frontend/src/constants/genres.ts` (`GENRE_COLORS`), `backend/api/routes/corpus.py::_GENRE_COLORS` (mirror), tour copy (`POLISH-03` / `POLISH-04`), and the onboarding flow's genre-explanation step. Phase 8 verifies the unknown-genre fallback works; Phase 10 polishes the palette.
- **Hyperparameter sweep (window, k, α, C)** — explicitly held fixed per VALIDATION_PROTOCOL §2 + PITFALLS §4 (no co-tuning with corpus). If the v2 retrain falls short on macro-F1, a hypothetical "Phase 8b" can run after the corpus-only comparison lands. Not Phase 8.
- **HathiTrust metadata enrichment** — Phase 7 §2 verdict "conditional Accept for cheap metadata enrichment". Phase 8 can elect to skip this entirely; Open Library + LoC already cover the cross-reference need. If integration cost > 1 day, drop per CORPUS_SOURCING §2 verdict.
- **Standard Ebooks preference rule** — Phase 7 §2 says "use SE when both have a title; fall back to Gutenberg otherwise". `build_corpus.py` can implement this in Wave 1, OR defer to Phase 8b — depends on whether SE catalog lookup adds meaningful complexity. Planner picks.
- **Multi-label classification** — Phase 7 RES-03 / D-18 deferred to v3 explicitly. v2 single-label classification continues. Phase 9 builds top-N (DEPTH-01) on the v2 single-label SVM.
- **Per-genre F1 deep-dives** — Phase 7 deferred to v3. Phase 8 produces the numbers (per VALIDATION_PROTOCOL §7); v3 acts on them.
- **`results/v2_validation_report.md` as a versioned artifact in `v2.0-data` Release** — could attach the validation report as a Release asset for auditability. Wave 4 planner picks; not load-bearing.
- **Automation of the `/gsd-docs-update` invocation** — D-34 folds doc cleanup into Wave 4, but a planner could choose to spawn `/gsd-docs-update` as a sub-step. Not specified; planner's call.

### Reviewed Todos (not folded)

*None — `gsd-tools todo match-phase 8` returned 0 pending todos.*

</deferred>

---

*Phase: 08-corpus-expansion*
*Context gathered: 2026-05-25 via interactive `/gsd-discuss-phase 8`*
