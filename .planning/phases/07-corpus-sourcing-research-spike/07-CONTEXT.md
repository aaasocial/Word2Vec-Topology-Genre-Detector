# Phase 7: Corpus Sourcing Research Spike — Context

**Gathered:** 2026-05-24
**Status:** Ready for planning
**Mode:** Auto (recommended defaults applied — see DISCUSSION-LOG.md for what was considered)

<domain>
## Phase Boundary

Produce two written, defensible research artifacts that let Phase 8 retrain and re-evaluate the v2 corpus **without making any further sourcing or methodology decisions**:

1. `.planning/research/v2/CORPUS_SOURCING.md` — sources, per-genre book count (hard constraint), per-genre author distribution audit + restructuring plan, multi-label decision.
2. `.planning/research/v2/VALIDATION_PROTOCOL.md` — v1-frozen test set (specific gutenberg_ids), `GroupKFold(groups=author)` CV, macro-F1 headline metric, permutation null parameters, per-author held-out smoke test definition.

**Pure research, no implementation.** No code touched. No corpus mutation. No model retrain.

**Reality check that reframes the phase:** The repo's `corpus/books.yaml` already holds **10 genres × 10 books = 100 entries** (expanded during v1 Phase 4 commit `db7b1f8`, 2026-04-13, the same day v1 shipped). REQUIREMENTS.md / PROJECT.md still describe v1 as "3 genres × 5 books" — that text is stale. **The "v1 baseline" Phase 7 must pin against is therefore the current 100-book corpus, not the never-actually-shipped 15-book corpus.** Validation already exists for this baseline:

```
results/validation_report.txt (window=15 k=200 alpha=0.7 C=10):
  adventure 40.0%  fantasy 66.7%  gothic 60.0%  historical 30.0%
  horror    22.2%  literary 60.0% mystery 70.0% romance 70.0%
  scifi     40.0%  western  88.9%
  Overall 54.6% (n=97), permutation p=0.001
```

The corpus also has **severe author concentration**: 6 Jane Austen / 10 in romance, 6 Zane Grey / 10 in western, 5 Verne / 10 in scifi, 4 Lovecraft / 10 in horror, 4 Morris / 10 in fantasy. PITFALLS.md §5 predicts this is masking real generalisation behind author-style memorisation. Phase 7's sourcing recommendation must address this directly, not just "add more books."

**In scope (Phase 7):** RES-01 (CORPUS_SOURCING.md), RES-02 (VALIDATION_PROTOCOL.md), RES-03 (multi-label decision documented).

**NOT in scope:** Touching `corpus/books.yaml`, downloading any new text, running any model, retraining anything (all Phase 8). Implementing `scripts/build_corpus.py` (CEXP-05, Phase 8 P2). Choosing α / K / window hyperparameters (separate Phase-8b if ever needed — Phase 8 explicitly pins v1's α=0.7, k=200, window=15 per `PITFALLS.md §4`).

**Documentation correctness obligation:** Both research docs must explicitly state the "v1 = 100 books, not 15" reality so Phase 8 doesn't inherit the stale framing. PROJECT.md and REQUIREMENTS.md cleanups are a separate doc-update commit (recorded in Deferred Ideas for /gsd-docs-update).

</domain>

<decisions>
## Implementation Decisions

### A. Source strategy

- **D-01:** **Project Gutenberg via the already-installed `gutenbergpy>=0.3.5`** is the primary source for any added books. Public domain, programmatic, predictable URL schema, header/footer stripping is well-understood (regex on `*** START OF`/`*** END OF`). Aligns with the v1 invariant "all corpus is public domain" (CORPUS-04).
- **D-02:** **Open Library bulk JSON dumps** (monthly, HTTP download) are the secondary source — **for subject-tag cross-reference only**, not for text. Use to validate genre labelling on candidate Gutenberg IDs ("does Open Library subject-tag Frankenstein as `gothic`, `horror`, or `science fiction`?"). No `internetarchive` dep, no Hugging Face `datasets` dep — keep the install surface flat.
- **D-03:** **Skip Hugging Face `blbooksgenre` and `agentlans/literary-genre-examples` for v2.** Rationale: `blbooksgenre` is title-level (no text), only resolves into Gutenberg-overlap rows, and the metadata it adds (fiction-vs-nonfiction at scale) doesn't help our 10-genre fiction classifier. `literary-genre-examples` is paragraph-level and incompatible with full-book features. Documented as rejected with rationale; revisit at v3.
- **D-04:** **Skip Internet Archive.** Documented in CORPUS_SOURCING.md as an escape hatch, not a default. Not installed.
- **D-05:** **No BookCorpus, no Goodreads scraping, no LLM auto-labelling** — anti-features per `FEATURES.md §2` "Anti-Features". CORPUS_SOURCING.md repeats the rationale so Phase 8 doesn't re-evaluate.

### B. Target corpus shape

- **D-06:** **10 genres preserved** (adventure, fantasy, gothic, historical, horror, literary, mystery, romance, scifi, western). No additions, no drops. Weak per-genre accuracy (horror 22.2%, historical 30%, adventure 40%, scifi 40%) is hypothesised to be author concentration, not genre choice — Phase 8 results decide whether v3 should drop or merge any genre.
- **D-07:** **12 books per genre (hard constraint, not a range) — 120 books total.** Modest, deliberate growth from the current 100. Rationale: jumping straight to 20 books/genre risks pulling in the same prolific authors (every additional Wells/Verne/Austen makes leakage worse); 12 books with the author cap below forces 2 more distinct authors per genre on average and gives GroupKFold-by-author enough groups (≥6 groups for a 5-fold). Phase 8 success criterion CEXP-01 must enforce this count.
- **D-08:** **Per-genre author distribution constraint:** **≥6 distinct authors per genre AND no single author with >2 books in any genre.** Stricter than today (romance has 4 authors, 6 Austens; mystery has 6 authors, 3 Christies). Restructuring path is mandatory:
  - Drop excess single-author books from current corpus to honour the ≤2 cap (e.g., 6 Austen romance → keep 2 Austen, redistribute 4 slots to 4 different authors).
  - Add new diverse-author books from Gutenberg until each genre hits 12.
- **D-09:** **`corpus/books.yaml` schema extended with `source` field per book** for Phase 8 reproducibility (CEXP-05 manifest). Single source of truth (no separate `corpus/sources.yaml`). Field shape:
  ```yaml
  - {gutenberg_id: 84, title: "Frankenstein", author: "Mary Shelley",
     word_count: 75500, source: {provider: "gutenberg",
     fetched_at: "2026-06-XX", text_sha256: "abc..."}}
  ```
  Phase 8 P2 work (`scripts/build_corpus.py`) reads this manifest to regenerate `data/raw/`.

### C. v1-frozen test set (the comparison baseline)

- **D-10:** **20-book held-out test set: 2 books × 10 genres**, pinned to **specific gutenberg_ids** in `VALIDATION_PROTOCOL.md`. Pin happens during Phase 7 doc-writing using the **current** 100-book corpus as the universe (the only universe v1 ever actually trained on).
- **D-11:** **Selection rule:** for each genre, pick 2 books such that:
  - Each test book's author has **other** books in the genre's training set (so the test is "predict a known author's other novel" — the realistic upload scenario), AND
  - The 2 test books are by **different authors** (so each genre's test set is itself author-diverse).
  - **Reason:** the test set is anti-leakage on the *test side* (book never seen in training) but consistent with the v1 distribution (authors represented in training). Pure unseen-author testing happens via the per-author smoke test below, not the v1-frozen test set.
- **D-12:** **The v1-frozen 20 books are removed from the training set for every measurement that references them.** v1's existing `results/validation_report.txt` (54.6% overall, LOOCV on all 100) is **not** the comparison number. Phase 7 must re-run v1 LOOCV with the 20 frozen books held out and record THAT number as the canonical v1 baseline in `VALIDATION_PROTOCOL.md`. *(This is a Phase 7 doc-writing step — running the existing v1 model on a withheld subset, not retraining; it's deterministic, reproducible, and tractable.)*
- **D-13:** **Three numbers, every report:**
  1. v1 SVM evaluated on v1-frozen-20 → headline v1 baseline
  2. v2 SVM evaluated on v1-frozen-20 → headline v2 result (apples-to-apples vs (1))
  3. v2 LOOCV on v2 full 120-book corpus → context only, never the headline
  *Improvement claims reference (2) vs (1).* (`PITFALLS.md §4`.)

### D. Validation protocol

- **D-14:** **Macro-F1 is the headline metric.** Overall accuracy is masked by class imbalance even at "balanced" 12/genre because per-genre evaluation has 12 samples each. Macro-F1 (unweighted mean of per-genre F1) treats every genre equally. Per-genre F1 also reported. Plain accuracy still reported for continuity with v1's `06_validate.py` output but **not** the success/failure metric.
- **D-15:** **`GroupKFold(groups=author)` replaces unrestricted LOOCV** for the primary cross-validation number. Folds = number of distinct authors (likely 8-10 per genre after restructuring). Implementation: `sklearn.model_selection.GroupKFold(n_splits=K)` where `K = min(authors_per_genre)`. Per-genre author distribution audit table in CORPUS_SOURCING.md determines K.
- **D-16:** **Permutation null hypothesis test parameters pinned:**
  - `n_permutations = 1000` (already v1 default)
  - Permutation done at the **label level**, not the feature level (existing v1 pattern; preserved)
  - Threshold for "topology signal detected": p < 0.05
  - Report null distribution mean + 95th percentile alongside the real number
- **D-17:** **Per-author held-out smoke test** (PITFALLS.md §5 mitigation, RES-02 requirement (e)):
  - For each author with ≥2 books in the corpus: train SVM with that author's books fully held out, predict that author's books, report per-author accuracy.
  - **Gap criterion:** per-author held-out accuracy ≥ (LOOCV accuracy − 15pp). Anything wider flags author-style leakage as the dominant signal.
  - Aggregated across all authors → single "leakage gap" number in the validation report.
- **D-18:** **All four numbers must appear in every Phase-8 retrain report:** macro-F1 (headline), per-genre F1, GroupKFold-by-author mean ± std, permutation p-value, per-author held-out gap. `VALIDATION_PROTOCOL.md` provides the reporting template (markdown skeleton with placeholders) so Phase 8 fills in numbers, not structure.

### E. Multi-label classification

- **D-19:** **Defer to v3.** Documented in CORPUS_SOURCING.md §"Multi-label decision" with explicit rationale:
  1. The current SVM is one-vs-rest already; converting to multi-label means rebuilding the prediction UI (top-N display, confidence calibration, "why this genre" all change semantics).
  2. No multi-label ground truth exists in `corpus/books.yaml`; collecting it would itself be a multi-week sub-spike (Open Library tags are noisy; expert re-labelling is needed).
  3. v2's accuracy story is "rigorously measured single-label improvement" — adding multi-label mid-milestone confounds the comparison.
  4. The 4 ambiguous-genre books that motivated multi-label (Frankenstein gothic/horror/scifi, Wuthering Heights gothic/romance, etc.) are minority cases and acceptable as single-label disagreement points for v2.
- **D-20:** **Multi-label is NOT a Phase 8 open question.** The doc writes "deferred to v3" as a closed decision, not "Phase 8 may revisit."

### F. Document format and Phase-8-executable detail

- **D-21:** **CORPUS_SOURCING.md must include:** the full restructured `books.yaml` skeleton (gutenberg_ids only — author/title/word_count populated by Phase 8 download step), per-genre author count column, drop-list (which existing books to remove from each genre), add-list (which new gutenberg_ids to add). Phase 8 reads this and executes verbatim.
- **D-22:** **VALIDATION_PROTOCOL.md must include:** the exact 20 gutenberg_ids of the v1-frozen test set, the exact `GroupKFold` invocation, the exact metrics-reporting markdown template, the exact permutation-test parameters, the exact pass/fail criteria for the per-author held-out gap.
- **D-23:** **Both docs include "Phase 8 entry checklist"** — a numbered list at the bottom of each doc that Phase 8 executes top-to-bottom (download → preprocess → train W2V → cluster → features → SVM → evaluate → emit reports). This makes "Phase 8 makes zero further sourcing or methodology decisions" (success criterion #4) verifiable.

### Claude's Discretion

- Whether to include candidate gutenberg_id long-lists per genre directly in CORPUS_SOURCING.md, or extract them to a separate `corpus_candidates.yaml` referenced from the doc — planner picks based on doc length.
- Exact wording of the multi-label decision rationale paragraph in CORPUS_SOURCING.md (decision is fixed; phrasing is Claude's).
- Whether Phase 7's "Phase 8 entry checklist" lives at the bottom of each individual doc or in a third short doc `PHASE_8_EXECUTION_RECIPE.md` — planner decides if the entry-checklist length warrants extraction.
- Whether per-author held-out smoke test gets a code snippet in VALIDATION_PROTOCOL.md or just an algorithmic description — planner picks based on perceived ambiguity.
- Format of the per-genre author distribution audit table (compact-by-genre with author column, vs author-pivoted with genre column) — pick whichever reads more clearly.
- Whether to also document an "Open Library subject cross-reference" candidate-validation script as suggested pseudocode (Phase 8 implementation is free to take or leave).

### Folded Todos

*None — no pending todos matched Phase 7 scope.*

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (gsd-phase-researcher, gsd-planner, gsd-executor) MUST read these before planning or implementing.**

### Phase 7 research inputs (v2)

- `.planning/research/SUMMARY.md` §"Phase 7: Corpus Sourcing Research Spike" + §"Gaps to Address" — already pre-states what this phase must close.
- `.planning/research/FEATURES.md` §2 "Corpus Quality" (Table Stakes + Differentiators + Anti-Features) — feature framing for sourcing decisions.
- `.planning/research/STACK.md` §"Corpus Sourcing (research spike — Phase 7)" — source-by-source evaluation (Gutenberg / HF / Open Library / Internet Archive); rejected-stack section pins what NOT to install.
- `.planning/research/PITFALLS.md` §4 (held-out test set), §5 (author overlap leakage), §6 (class imbalance) — every guard in VALIDATION_PROTOCOL.md must trace to a pitfall here.
- `.planning/research/PITFALLS.md` §11 (LOOCV cost) — informs GroupKFold-vs-LOOCV note in protocol doc.
- `.planning/research/ARCHITECTURE.md` §5e "Corpus expansion — does data layout change?" — confirms no code-layout change; cache-key fix already lived in Phase 6 BUG-05.

### v1 codebase (existing artifacts the docs reference)

- [corpus/books.yaml](corpus/books.yaml) — current 100-book manifest (10 genres × 10 books, with `gutenberg_id`, `title`, `author`, `word_count`). The "v1 corpus" Phase 7 freezes.
- [scripts/06_validate.py](scripts/06_validate.py) — current LOOCV + permutation script. VALIDATION_PROTOCOL.md must specify exactly what this script needs to gain (GroupKFold, macro-F1, per-author smoke test) for Phase 8 to be done editing it. **Phase 7 documents the spec; Phase 8 implements.**
- [config/params.yaml](config/params.yaml) — v1 hyperparameters (window=15, k=200, α=0.7, C=10) which Phase 8 must hold fixed for the v2-vs-v1 comparison.
- [results/validation_report.txt](results/validation_report.txt) — current v1 validation output (54.6% overall, p=0.001). Reference point but **not** the v1 baseline that ships in VALIDATION_PROTOCOL.md — that's a re-run with the 20-book test set held out.
- [data/models/svm_pipeline.joblib.lineage.json](data/models/svm_pipeline.joblib.lineage.json) — the v1 SVM's existing lineage record from Phase 6 BUG-05 (proves D-25 of Phase 6 is in place, which is required so Phase 8 can refuse to load a stale-lineage SVM).
- [.planning/PROJECT.md](.planning/PROJECT.md) §Constraints — invariants (1)–(4) which Phase 7's sourcing rules and Phase 8's retrain protocol must not violate.
- [.planning/REQUIREMENTS.md](.planning/REQUIREMENTS.md) RES-01..03, CORPUS-01..04 — RES-01..03 verbatim wording; CORPUS-01 ("3 genres × 5 books") wording is stale and needs a separate doc-update commit (see Deferred).

### v1 historical research (do not re-litigate)

- `.planning/research/v1/FEATURES.md` — original corpus framing (1000 books across 10 genres referenced as the comparable academic-corpus target). Phase 7 is much smaller (120 books); deliberately so.
- `.planning/research/v1/PITFALLS.md` — small-corpus W2V instability, LOOCV variance — informs why per-genre F1 + permutation null are mandatory.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`scripts/06_validate.py`** — existing LOOCV + permutation skeleton. Phase 7 specifies the diff Phase 8 must apply (add GroupKFold, add macro-F1, add per-author smoke test). No greenfield validation script.
- **`gutenbergpy>=0.3.5`** — already installed (per STACK.md). Phase 8 uses it; Phase 7 documents *how* (URL schema, header/footer stripping regex pinned in CORPUS_SOURCING.md).
- **`config/params.yaml`** — hyperparameter file. Phase 7 specifies that Phase 8 must hold these fixed (no co-tuning corpus + hyperparameters in the same retrain).
- **`scripts/01_download_corpus.py` + `scripts/02_preprocess.py`** — existing fetch + tokenise pipeline. Phase 7's docs reference them by file:line so Phase 8 knows exactly which scripts to re-run on the expanded corpus.
- **Phase 6 BUG-05 cache-key invariant** — `corpus_hash` + `w2v_model_sha256` already in every cache key. Phase 7 just reminds Phase 8 to trust this; no re-engineering.

### Established Patterns

- **Single source of truth for corpus state:** `corpus/books.yaml`. New `source` field is additive; doesn't break existing `_load_books_metadata()` consumers.
- **Append-only validation history:** `results/validation_history.log` already accumulates timestamped entries. Phase 8's new metrics (macro-F1, per-author gap) join this log; the schema is "free-form text with config dict" — Phase 7 doesn't need to pin a structured format.
- **No new install for research output:** Phase 7 is markdown-only. No `requirements.txt` change. No `package.json` change. Anyone reading the docs needs nothing installed.

### Integration Points

- **CORPUS_SOURCING.md → Phase 8 CEXP-01** (`books.yaml` extension): the doc's drop-list + add-list maps directly to the YAML edits Phase 8 makes.
- **VALIDATION_PROTOCOL.md → Phase 8 CEXP-03/04** (evaluation): the doc's reporting template maps directly to the markdown Phase 8 writes into `results/v2_validation_report.md`.
- **VALIDATION_PROTOCOL.md → `scripts/06_validate.py`** (Phase 8 edit): the doc specifies the function-level diff (add `evaluate_on_v1_frozen()`, `cross_validate_grouped(groups=author)`, `per_author_smoke_test()`).
- **No frontend integration in Phase 7.** Phase 9/10 own all v2 frontend work; Phase 7 outputs do not surface in the UI.

</code_context>

<specifics>
## Specific Ideas

- **"v1 baseline = 100-book corpus, not 15-book."** Both research docs lead with this correction. Anyone reading PROJECT.md/REQUIREMENTS.md will see "3 genres × 5 books" and assume that's what Phase 8 is expanding from; the docs must explicitly state the actual starting state.
- **Severe author concentration is the real v1 footgun.** 6 Austen romance, 6 Zane Grey western, 5 Verne scifi, 4 Lovecraft horror, 4 Morris fantasy. The 54.6% overall accuracy is partly genre signal and partly author-style memorisation. Phase 7 says: **fix the author distribution first**, then evaluate whether genre-level improvement is real. This is the single most opinionated finding.
- **The 12-books-per-genre count is deliberately conservative** vs the SUMMARY.md "comparable corpora use ~1000 books across 10 genres" framing. Reason: at 12 with ≥6 distinct authors, GroupKFold-by-author has enough groups for 5-fold; at higher counts without author discipline, we just reproduce the v1 leakage at scale.
- **The v1-frozen test set is constructed during Phase 7, not Phase 8.** Phase 7 picks the 20 gutenberg_ids and runs v1 LOOCV with them held out (deterministic, no retrain — just evaluate the existing `svm_pipeline.joblib` on a withheld subset). The resulting v1-baseline-on-frozen number lives in VALIDATION_PROTOCOL.md verbatim. Phase 8 then has a single number to beat.
- **Multi-label decision is closed, not "Phase 8 may revisit."** PITFALLS, FEATURES, and the v2 milestone success criteria all point at single-label; making it a Phase 8 open question would force Phase 8 to re-decide and break "Phase 8 makes zero further sourcing or methodology decisions."
- **Phase 8 entry checklist at the bottom of each doc** is the verifiability device for success criterion #4. If the planner can read the checklist top-to-bottom and execute without asking a question, Phase 7 is done.

</specifics>

<deferred>
## Deferred Ideas

- **Documentation cleanup commit:** REQUIREMENTS.md CORPUS-01 still says "3 genres × 5 books"; PROJECT.md "Validated" list says "3 genres × 5 books"; ROADMAP.md "v1 outcomes" implicitly references the same. None of these are Phase 7's job to fix (Phase 7 outputs are docs in `.planning/research/v2/`, not edits to milestone-level planning files), but the stale text will confuse Phase 8. **Recommend a follow-up `/gsd-docs-update PROJECT REQUIREMENTS ROADMAP` after Phase 7 completes to align them with the actual 100-book v1 state.**
- **Hugging Face `blbooksgenre` cross-reference evaluation** — could augment Gutenberg subject tags. Rejected for v2 because it's title-only metadata and the Open Library bulk dump covers the same need without a new `datasets` install. Revisit at v3 if `blbooksgenre` releases a text-level dataset.
- **Internet Archive `internetarchive` SDK** for rarer fiction — documented in CORPUS_SOURCING.md as an escape hatch only. v3 candidate if Gutenberg coverage gaps appear in specific genres (e.g., harder-to-source 20th-century-public-domain literary fiction).
- **`scripts/build_corpus.py` reproducibility script (CEXP-05)** — explicitly owned by Phase 8 P2; Phase 7 just specifies the `source` field schema that the script reads from.
- **Hyperparameter co-tuning** (sweep α, K, window simultaneously with corpus expansion) — explicitly rejected per PITFALLS §4. Defer to a hypothetical Phase 8b after corpus-only retrain results land.
- **LLM-assisted candidate-book identification** (use Claude to suggest gutenberg_ids that match each genre + author-diversity constraint) — could speed Phase 7 sourcing work, but circular-benchmark concern. If used at all, treat as candidate suggestions for human review, never auto-accept.
- **Genre-set refactoring** (drop horror+adventure due to weak per-genre accuracy, or merge scifi+adventure into "speculative") — explicitly rejected. Phase 7 hypothesises author concentration is the cause; Phase 8 results decide v3 genre cleanup.

### Reviewed Todos (not folded)

*None — `gsd-tools list-todos` returned 0 pending todos.*

</deferred>

---

*Phase: 07-corpus-sourcing-research-spike*
*Context gathered: 2026-05-24 via /gsd-discuss-phase --auto*
