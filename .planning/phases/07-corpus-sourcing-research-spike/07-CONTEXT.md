# Phase 7: Corpus Sourcing Research Spike — Context

**Gathered:** 2026-05-24
**Status:** Ready for planning
**Mode:** Interactive `/gsd-discuss-phase 7` — all decisions are user-authored (see DISCUSSION-LOG.md for alternatives considered)

<domain>
## Phase Boundary

Produce two written, defensible research artifacts so Phase 8 can retrain + re-evaluate **without making any further sourcing or methodology decisions**:

1. `.planning/research/v2/CORPUS_SOURCING.md` — comparable-project benchmarking, source-by-source evaluation, restructured corpus shape (constraints + per-genre candidate shortlists), genre-set recommendation for user review, multi-label feasibility analysis.
2. `.planning/research/v2/VALIDATION_PROTOCOL.md` — v1-frozen test set (specific gutenberg_ids), v1 baseline number computed during this phase, `GroupKFold(groups=author)` CV, macro-F1 headline + full metrics panel, permutation null parameters, per-author held-out smoke test with tight pass criterion.

**Phase 7 is research + writing + one deterministic evaluation step.** It writes docs, runs the existing `svm_pipeline.joblib` against the chosen hold-out subset (no retrain), and pins the resulting v1 baseline macro-F1. No code edits to the production pipeline, no corpus mutation, no model retrain — all of that is Phase 8.

**Reality check that reshapes the phase:** REQUIREMENTS.md / PROJECT.md describe v1 as "3 genres × 5 books." That text is stale. `corpus/books.yaml` actually holds **10 genres × 10 books = 100 entries** today (expanded in commit `db7b1f8`, Apr 13 2026, the same day v1 shipped). Current validation (`results/validation_report.txt`, window=15, k=200, α=0.7, C=10): overall accuracy 54.6%, p=0.001, per-genre breakdown ranging from western 88.9% down to horror 22.2%. Severe author concentration: 6 Austen / 10 in romance, 6 Zane Grey / 10 in western, 5 Verne / 10 in scifi, 4 Lovecraft / 10 in horror, 4 Morris / 10 in fantasy. So Phase 7 is "audit + restructure + significantly expand the existing 100-book corpus, then design the protocol to measure improvement honestly" — not "expand from 15."

**In scope (Phase 7):** RES-01 (CORPUS_SOURCING.md), RES-02 (VALIDATION_PROTOCOL.md), RES-03 (multi-label decision — evaluated during research, not pre-committed). Comparable-project research, source-list evaluation, candidate-title sourcing pipeline design, genre-set recommendation, v1 baseline computation against the new hold-out set.

**NOT in scope:** Touching `corpus/books.yaml`, downloading any new text, retraining anything (all Phase 8). Implementing `scripts/build_corpus.py` (CEXP-05, Phase 8 P2). Choosing α / K / window hyperparameters (held fixed at v1 defaults — co-tuning corpus + hyperparameters confounds the v1-vs-v2 comparison per PITFALLS §4).

**Documentation correctness obligation:** Both research docs must explicitly state the "v1 = 100 books, not 15" reality so Phase 8 doesn't inherit the stale framing. PROJECT.md / REQUIREMENTS.md / ROADMAP.md cleanups are a separate doc-update commit owned by `/gsd-docs-update` after Phase 7 completes.

</domain>

<decisions>
## Implementation Decisions

### A. Source strategy (Q1–Q4)

- **D-01:** **CORPUS_SOURCING.md cites 3–5 comparable projects** (e.g., Gutenberg Genre Identification corpus, BL Labs blbooksgenre, academic small-corpus TDA-on-text papers, Reagan et al. "Six Story Arcs", relevant 2020-2026 NLP genre-classification studies) — how each sourced + labelled their corpus — and **explicitly justifies our deviations**. Defensible against "why this corpus?" challenges without ballooning into a 5-page survey.
- **D-02:** **Phase 7 evaluates the full source list and reaches an accept/reject decision per source, each with rationale documented:**
  - Project Gutenberg via `gutenbergpy>=0.3.5` (primary text source)
  - Open Library bulk JSON dumps (no new dep — `requests` + `ijson`)
  - Library of Congress (LCC subject headings + catalog references)
  - HuggingFace `TheBritishLibrary/blbooksgenre` (revisit prior rejection)
  - HuggingFace `agentlans/literary-genre-examples` (revisit prior rejection)
  - Goodreads public dump (UCSD academic mirror — `mengtingwan.github.io/data/goodreads.html`)
  - Internet Archive `internetarchive` SDK
  - Any additional public-domain sources surfaced by the comparable-project research (HathiTrust, Standard Ebooks, etc.)
  - **Anti-features confirmed:** BookCorpus (licensing), Goodreads scraping at scale (ToS), LLM auto-labelling (circular benchmark).
- **D-03:** **Goodreads + LoC are book-selection / curation sources, NOT labelling or text-fetch sources.** This is the most opinionated finding and reframes the existing v2 research bundle. The sourcing pipeline is:
  1. Use curated references — Goodreads shelves ("Best Mystery Novels", "Top Sci-Fi"), LoC catalog (LCC headings, curated collections), comparable-project corpora, scholarly canon lists — to build a **per-genre candidate-title shortlist** (50+ titles per genre).
  2. Apply constraints (author distribution, public-domain availability, word-count minimum).
  3. Look up each candidate in Gutenberg (or another public-domain text source). Only titles available as clean public-domain text make the final cut.
  4. Record source provenance for every text fetch.
- **D-04:** **Library of Congress integration follows the same curation-source pattern as Goodreads.** LCC subject headings via Gutenberg metadata + LoC catalog references for canonical-title identification. No LoC text-fetch pipeline in v2.
- **D-05:** **No installs in Phase 7.** Markdown-only research. If Phase 7 recommends a source that requires `datasets` or `internetarchive`, the install lands in Phase 8 alongside the actual use.

### B. Corpus shape + author rule (Q5–Q8)

- **D-06:** **Target: 25–30 books per genre.** Academic-grade size; exact count pinned by Phase 7 research after the genre-set decision lands (D-08). Lower bound 25 if 10 genres survive; upper bound 30 if the merge proposal reduces to 8 genres. Phase 7's docs commit to a single number, not a range.
- **D-07:** **No per-author cap within a genre.** A prolific genre author (Austen for romance, Wells for scifi, Zane Grey for western) may contribute as many books as Phase 7's candidate-shortlist research justifies. **Trade-off accepted:** this removes one of the two PITFALLS §5 anti-leakage guardrails. The validation protocol's per-author held-out smoke test (D-17) becomes the only remaining defense and must be strict.
- **D-08:** **≥8 distinct authors per genre (hard constraint).** Author diversity at the floor; free ceiling. Enables 5-fold `GroupKFold(groups=author)` with headroom. Current corpus violates this in several genres (romance has 4 authors, mystery has 6, western has 4) so restructuring is mandatory.
- **D-09:** **Genre-set decision is an OPEN question that Phase 7's research agent resolves.** Three concrete proposals are on the table:
  - **Proposal A — Merge to 8 genres:** `gothic + horror → gothic-horror`, `scifi + fantasy → speculative`. Keep: adventure, historical, literary, mystery, romance, western. Argument: subject-tag overlap is heavy; weak performers (horror 22%, scifi 40%) likely collapse into their stronger neighbours in feature space already.
  - **Proposal B — Drop the chronically weak performers (8 genres):** drop horror + historical entirely. Keep: adventure, fantasy, gothic, literary, mystery, romance, scifi, western. Argument: weak performance may indicate the feature space cannot separate them; rather than fix sourcing, accept the genres are too noisy.
  - **Proposal C — Keep all 10 v1 genres:** bet that 25–30 books × ≥8 authors per genre is enough to surface real per-genre topology that the current 100-book corpus is too sparse and too author-overfitted to show.
  - **Research agent investigates:** LCC subject overlap analysis (Open Library / LCC headings), comparable-project genre choices, per-genre public-domain author availability. Presents a recommendation with evidence in `CORPUS_SOURCING.md §"Genre set recommendation"`.
  - **User reviews and approves the recommendation during normal doc review** — no separate `/gsd-discuss-phase` re-prompt checkpoint.
- **D-10:** **`corpus/books.yaml` schema additions (specified in Phase 7, applied in Phase 8):** add `source: {provider: "gutenberg", fetched_at: ISO_DATE, text_sha256: HEX}` per book for reproducibility. Single source of truth (no separate `corpus/sources.yaml`). Schema example:
  ```yaml
  - {gutenberg_id: 84, title: "Frankenstein", author: "Mary Shelley",
     word_count: 75500, source: {provider: "gutenberg", fetched_at: "2026-06-XX", text_sha256: "abc..."}}
  ```

### C. Test set + validation protocol (Q9–Q12)

- **D-11:** **20% hold-out test set.** Sized to the final v2 corpus — 5 books / genre if Proposal C wins (10 genres × 25 = 250 corpus → 50 test), 7 / genre if Proposal A wins (8 × 30 = 240 corpus → 48 test), etc. Per-genre n=5+ gives reliable per-genre F1.
- **D-12:** **Hold-out selection rule: author-overlap with training.** Each test book's author has *other books by the same author in the training set* (e.g., a held-out Austen has other Austens in training). Models the realistic upload scenario the app serves: users upload books by authors the model has seen examples of. Pure unseen-author testing handled by the per-author smoke test (D-17), not the hold-out test set.
- **D-13:** **v1 baseline computed during Phase 7, not Phase 8.** Deterministic: load existing `data/models/svm_pipeline.joblib`, evaluate on the new 20% hold-out subset, record macro-F1 + per-genre F1 + accuracy in `VALIDATION_PROTOCOL.md`. Phase 8 then has a single fixed number to beat. **Caveat:** the hold-out must come from books the existing v1 SVM was trained on — Phase 7 picks the hold-out from the *current 100-book corpus*, pins those gutenberg_ids in the doc, evaluates v1 on them, then carries those IDs forward to v2's restructured corpus. (Books that survive into v2's final set become the apples-to-apples comparison; books dropped during restructure are noted as "out of comparison" with rationale.)
- **D-14:** **Headline metric: macro-F1.** Unweighted mean of per-genre F1. Single "did v2 beat v1?" number; treats every genre equally regardless of count.
- **D-15:** **Full reporting panel, every Phase-8 retrain report:**
  - Macro-F1 (headline)
  - Per-genre F1
  - Overall accuracy (v1 continuity)
  - Confusion matrix
  - Permutation null hypothesis test: n_permutations=1000, p<0.05 threshold (v1 defaults preserved)
  - `GroupKFold(groups=author)` cross-validation: mean ± std
  - Per-author held-out gap (see D-17)
  - **Three-numbers pattern:** (1) v1 SVM evaluated on hold-out → headline v1 baseline; (2) v2 SVM evaluated on hold-out → headline v2 result; (3) v2 LOOCV on full v2 training set → context only, never the headline.
- **D-16:** **`GroupKFold(groups=author)` replaces unrestricted LOOCV** for the primary cross-validation number. `K = min(distinct_authors_per_genre)`, expected to be 8 per D-08. Implementation: `sklearn.model_selection.GroupKFold(n_splits=K)`.
- **D-17:** **Per-author held-out smoke test — tight ≤10pp gap criterion.** For each author with ≥2 books in the corpus: train SVM with that author's books fully held out, predict that author's books, report per-author accuracy. Pass criterion: **per-author held-out accuracy must be within 10pp of LOOCV-on-corpus accuracy**. Anything wider flags author-style memorisation as the dominant signal. **This is the only remaining anti-leakage guardrail given no per-author cap (D-07) — the threshold is deliberately tight.** Aggregated worst-case gap surfaced in every report.

### D. Multi-label classification (Q13, RES-03)

- **D-18:** **Multi-label is EVALUATED during Phase 7 research, not pre-committed deferred.** Research agent investigates:
  - Multi-label SVM cost and library support (sklearn `OneVsRestClassifier` wrapping `SVC(probability=True)`)
  - Labelling strategy: where would multi-label ground truth come from? (Goodreads shelf cross-reference? Expert re-labelling? LLM-assisted with human review?)
  - UI implications (top-N display semantics, "why this genre" cardinality, classification result shape)
  - Comparable-project precedent
  - Recommendation lives in `CORPUS_SOURCING.md §"Multi-label classification — feasibility and recommendation"`
  - Default expectation: defer to v3 with documented rationale, but research may find an opening (e.g., Goodreads shelves give us clean multi-label ground truth at low cost) that flips the recommendation.

### E. Document format and Phase-8-executable detail (Q14–Q16)

- **D-19:** **CORPUS_SOURCING.md ships with constraints + a long candidate list per genre** — 50+ gutenberg_ids per genre, ranked by curation-source consensus (multi-list appearance score), so Phase 8 can pick the final 25–30 from a curated set that already passed the author-distribution + word-count + public-domain checks. Phase 8 still makes the final selection but from a Phase-7-vetted pool, not from raw Gutenberg.
- **D-20:** **Two docs, matching the success-criteria filenames:** `CORPUS_SOURCING.md` and `VALIDATION_PROTOCOL.md`. Each ends with a **"Phase 8 entry checklist"** — a numbered list Phase 8 executes top-to-bottom. Makes success criterion #4 ("Phase 8 makes zero further sourcing or methodology decisions") verifiable.
- **D-21:** **Genre-set recommendation surfaces in `CORPUS_SOURCING.md §"Genre set recommendation"`** for user review during normal doc review. No separate `/gsd-discuss-phase` re-prompt. User reads the doc, approves inline, or pushes back with edits / a follow-up `/gsd-fast` to revise the recommendation.

### Claude's Discretion

- Whether the per-genre 50+ candidate shortlist lives inline in `CORPUS_SOURCING.md` or in a sibling `corpus_candidates.yaml` referenced from the doc — planner decides based on the resulting doc length.
- Exact wording of the multi-label-evaluation rationale paragraph (decision shape is fixed: evaluate-and-recommend; phrasing is Claude's).
- Whether per-author smoke test gets a code snippet in `VALIDATION_PROTOCOL.md` or just algorithmic description.
- Per-genre author distribution audit table format (genre-pivoted with author columns, vs author-pivoted with genre columns) — pick whichever reads more clearly.
- Whether to include pseudocode for the Goodreads / LoC candidate-list cross-reference (planner decides if seeing pseudocode reduces Phase 8 ambiguity).
- Exact list of 3–5 comparable projects to cite (the research agent finds them; the count is fixed at 3–5).
- Whether the LCC subject overlap analysis lives in `CORPUS_SOURCING.md` body or an appendix.
- The exact name of the merged-genre labels if Proposal A wins (e.g., "gothic-horror" vs "gothic_horror" vs "gothic & horror") — planner picks consistent with v1's snake-case `scifi`.

### Folded Todos

*None — no pending todos matched Phase 7 scope.*

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (gsd-phase-researcher, gsd-planner, gsd-executor) MUST read these before planning or implementing.**

### Phase 7 research inputs (v2)

- `.planning/research/SUMMARY.md` §"Phase 7: Corpus Sourcing Research Spike" + §"Gaps to Address" — pre-states what this phase must close.
- `.planning/research/FEATURES.md` §2 "Corpus Quality" — feature framing for sourcing decisions; anti-features list (BookCorpus, Goodreads scraping, LLM labelling) confirmed by Phase 7.
- `.planning/research/STACK.md` §"Corpus Sourcing (research spike — Phase 7)" — source-by-source notes; Phase 7 revisits and either upholds or overturns each one with explicit rationale.
- `.planning/research/PITFALLS.md` §4 (held-out test set), §5 (author overlap leakage), §6 (class imbalance), §11 (LOOCV cost) — every guard in `VALIDATION_PROTOCOL.md` must trace to a pitfall here.
- `.planning/research/ARCHITECTURE.md` §5e "Corpus expansion — does data layout change?" — confirms no code-layout change; cache-key fix shipped in Phase 6 BUG-05.

### v1 codebase (existing artifacts the docs reference)

- [corpus/books.yaml](corpus/books.yaml) — current 100-book manifest (10 genres × 10 books, with `gutenberg_id`, `title`, `author`, `word_count`). The "v1 corpus" Phase 7 freezes a hold-out from.
- [scripts/06_validate.py](scripts/06_validate.py) — current LOOCV + permutation script. `VALIDATION_PROTOCOL.md` specifies exactly what this script must gain in Phase 8 (`GroupKFold`, macro-F1, per-author smoke test, hold-out evaluation function).
- [config/params.yaml](config/params.yaml) — v1 hyperparameters (window=15, k=200, α=0.7, C=10) which Phase 8 must hold fixed for the v2-vs-v1 comparison.
- [results/validation_report.txt](results/validation_report.txt) — current v1 validation output (54.6% overall, p=0.001). The "v1 baseline" Phase 7 pins in `VALIDATION_PROTOCOL.md` is a NEW number — v1 SVM evaluated against the 20% hold-out subset, not this whole-corpus LOOCV number.
- [data/models/svm_pipeline.joblib](data/models/svm_pipeline.joblib) + [data/models/svm_pipeline.joblib.lineage.json](data/models/svm_pipeline.joblib.lineage.json) — Phase 7's deterministic eval step loads these; the lineage sidecar from Phase 6 BUG-05 must match for the load to succeed.
- [.planning/PROJECT.md](.planning/PROJECT.md) §Constraints — invariants (1)–(4) which Phase 7's sourcing rules and Phase 8's retrain protocol must not violate.
- [.planning/REQUIREMENTS.md](.planning/REQUIREMENTS.md) RES-01..03, CORPUS-01..04 — RES-01..03 verbatim wording; CORPUS-01 ("3 genres × 5 books") wording is stale and needs a separate doc-update commit (see Deferred Ideas).

### v1 historical research (do not re-litigate)

- `.planning/research/v1/FEATURES.md` — original corpus framing.
- `.planning/research/v1/PITFALLS.md` — small-corpus W2V instability, LOOCV variance — informs why per-genre F1 + permutation null are mandatory.

### External research the Phase 7 research agent must investigate

- **Comparable-project sourcing approaches** (3–5 projects, picked by agent):
  - [Gutenberg Genre Identification corpus (~1000 books, 10 genres)](https://github.com/gjoseph16/Genre-Identification-on-a-sub-set-of-Gutenberg-Corpus)
  - BL Labs `blbooksgenre` original paper
  - Academic small-corpus TDA-on-text or genre-classification studies (Reagan et al. "Six Story Arcs" — DOI/arxiv refs in [.planning/research/SUMMARY.md](.planning/research/SUMMARY.md#sources))
  - 2024-2026 NLP genre-classification studies the research agent surfaces
- **Curation sources for candidate-title lists** (per D-03):
  - Goodreads shelves via UCSD public dump (`mengtingwan.github.io/data/goodreads.html`)
  - Library of Congress catalog + LCC subject headings (`loc.gov/collections/`, LCC class P "Language and Literature")
  - Scholarly canon lists (per-genre — e.g., Modern Library "100 Best Novels", Hugo/Nebula winners for scifi, MWA Edgar Awards for mystery, Bram Stoker Awards for horror, Western Writers of America "Hall of Fame")
- **Public-domain text databases for candidate-title lookup:**
  - Project Gutenberg via `gutenbergpy>=0.3.5` (already installed)
  - Standard Ebooks (`standardebooks.org`) — curated public-domain editions
  - HathiTrust public-domain subset (via API)
  - Internet Archive `archive.org/details/texts` (documented escape hatch)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`scripts/06_validate.py`** — existing LOOCV + permutation skeleton. Phase 7 specifies the diff Phase 8 must apply (`GroupKFold(groups=author)`, macro-F1, per-author smoke test, hold-out evaluation function). No greenfield validation script.
- **`gutenbergpy>=0.3.5`** — already installed (per STACK.md). Phase 8 uses it; Phase 7 documents *how* (URL schema, header/footer stripping regex pinned in CORPUS_SOURCING.md).
- **`config/params.yaml`** — hyperparameter file. Phase 7 specifies that Phase 8 must hold these fixed (no co-tuning corpus + hyperparameters in the same retrain).
- **`scripts/01_download_corpus.py` + `scripts/02_preprocess.py`** — existing fetch + tokenise pipeline. Phase 7's docs reference them by file:line so Phase 8 knows exactly which scripts to re-run on the expanded corpus.
- **Phase 6 BUG-05 cache-key invariant** — `corpus_hash` + `w2v_model_sha256` already in every cache key; SVM lineage sidecar at `data/models/svm_pipeline.joblib.lineage.json`. Phase 7's v1-baseline evaluation step (D-13) trusts this. Phase 8 retrain trusts this.
- **`data/corpus_metadata.json`** (from Phase 6 BUG-03) — `top_10_tfidf_words` sidecar. Phase 7 docs don't touch this; Phase 8 regenerates it after retrain.

### Established Patterns

- **Single source of truth for corpus state:** `corpus/books.yaml`. New `source` field is additive; doesn't break existing `_load_books_metadata()` consumers.
- **Append-only validation history:** `results/validation_history.log` already accumulates timestamped entries. Phase 8's new metrics (macro-F1, per-author gap) join this log; existing schema is free-form text with config dict — Phase 7 doesn't pin a structured format.
- **No new install for research output:** Phase 7 is markdown + one Python evaluation step on already-installed deps. No `requirements.txt` change. No `package.json` change.

### Integration Points

- **CORPUS_SOURCING.md → Phase 8 CEXP-01** (`books.yaml` extension): the doc's drop-list + add-list + 50+ gutenberg_id candidate shortlists map directly to the YAML edits Phase 8 makes.
- **VALIDATION_PROTOCOL.md → Phase 8 CEXP-03/04** (evaluation): the doc's reporting template maps directly to the markdown Phase 8 writes into `results/v2_validation_report.md`. The v1 baseline number pinned in Phase 7 is the comparison anchor.
- **VALIDATION_PROTOCOL.md → `scripts/06_validate.py`** (Phase 8 edit): the doc specifies the function-level diff (add `evaluate_on_holdout()`, `cross_validate_grouped(groups=author)`, `per_author_smoke_test()`).
- **No frontend integration in Phase 7.** Phase 9/10 own all v2 frontend work; Phase 7 outputs do not surface in the UI.

</code_context>

<specifics>
## Specific Ideas

- **"v1 baseline = 100-book corpus, not 15-book."** Both research docs lead with this correction. Anyone reading PROJECT.md / REQUIREMENTS.md will see "3 genres × 5 books" and assume that's what Phase 8 is expanding from; the docs must explicitly state the actual starting state.
- **Severe author concentration is the real v1 footgun, but no per-author cap is the user's call.** 6 Austen romance, 6 Zane Grey western, 5 Verne scifi, 4 Lovecraft horror, 4 Morris fantasy. v2 keeps the freedom to include prolific authors because their bodies of work *define* genre boundaries (e.g., 19th-century romance without significant Austen representation isn't 19th-century romance). The leakage risk is acknowledged and absorbed by the tight ≤10pp per-author smoke test threshold.
- **Curation sources tell us what books to look for; text databases tell us where to fetch them.** This is the most opinionated finding and reframes the existing v2 research bundle. Goodreads, LoC, scholarly canon lists, comparable-project corpora → candidate shortlists. Gutenberg, Standard Ebooks, HathiTrust → text fetch. They are not interchangeable; the existing research (`STACK.md`, `FEATURES.md`) framing them as alternative *labelling* sources is wrong for this project.
- **The genre-set decision is the highest-leverage one in Phase 7 and is open.** Research agent picks between Proposal A (merge), B (drop), C (keep all) using LCC subject overlap, comparable-project precedent, and per-genre public-domain author availability. User reviews recommendation in `CORPUS_SOURCING.md §"Genre set recommendation"` during normal doc review. Phase 8 commits to whichever the user approves.
- **Multi-label stays open during research (not pre-committed to deferral).** The existing PITFALLS / SUMMARY recommendation is "defer to v3"; Phase 7 may find a feasibility opening (e.g., Goodreads shelves give clean multi-label ground truth) that flips it. Default expectation is still "defer to v3" — but the rationale lands as a Phase 7 research conclusion, not a pre-committed assumption.
- **v1 baseline is computed in Phase 7.** A subtle but important consequence of D-13: Phase 7 isn't purely documentation — it runs `svm_pipeline.joblib` against the chosen hold-out subset and pins the resulting macro-F1 as the comparison anchor. Phase 8 then has a single fixed number to beat, eliminating "but what was v1's macro-F1 again?" methodological drift.
- **25–30 books / genre is academic-grade scope.** This is a significant Phase 8 commitment (150–300 new book fetches, full pipeline rerun, days of compute for hyperparameter sweeps if those ever happen). Phase 7's docs need to acknowledge the scope clearly so Phase 8 planning doesn't try to ship in a single short sprint.

</specifics>

<deferred>
## Deferred Ideas

- **Documentation cleanup commit:** REQUIREMENTS.md CORPUS-01 still says "3 genres × 5 books"; PROJECT.md "Validated" list says "3 genres × 5 books"; ROADMAP.md "v1 outcomes" implicitly references the same. None of these are Phase 7's job to fix (Phase 7 outputs are docs in `.planning/research/v2/`, not edits to milestone-level planning files), but the stale text will confuse Phase 8. **Recommend a follow-up `/gsd-docs-update PROJECT REQUIREMENTS ROADMAP` after Phase 7 completes** to align them with the actual 100-book v1 state and the v2 plan.
- **`scripts/build_corpus.py` reproducibility script (CEXP-05)** — explicitly owned by Phase 8 P2. Phase 7 just specifies the `source` field schema that the script reads.
- **Hyperparameter co-tuning** (sweep α, K, window simultaneously with corpus expansion) — explicitly rejected per PITFALLS §4. Defer to a hypothetical Phase 8b after corpus-only retrain results land.
- **LLM-assisted candidate-book identification** (use Claude / similar to suggest gutenberg_ids that match each genre + author-diversity constraint) — could speed Phase 7's research agent's sourcing work, but circular-benchmark concern. If used at all, treat as candidate suggestions for human/agent review, never auto-accept.
- **Per-genre F1 deep-dives** (why is horror so bad? what's the confusion matrix look like?) — Phase 7 documents what Phase 8 must report; Phase 8 generates the numbers; v3 acts on them.
- **Library of Congress digitised text integration** — explicitly deferred per D-04. LoC plays curation-source role only in v2. American Memory / Chronicling America text-fetch pipeline is a v3 candidate if Gutenberg coverage gaps appear.
- **LCC subject-overlap visualisation** in CORPUS_SOURCING.md (e.g., a Sankey / heatmap of which LCC headings appear under which v2 genres) — nice-to-have for the genre-set recommendation; planner decides if worth the effort.

### Reviewed Todos (not folded)

*None — `gsd-tools list-todos` returned 0 pending todos.*

</deferred>

---

*Phase: 07-corpus-sourcing-research-spike*
*Context gathered: 2026-05-24 via interactive `/gsd-discuss-phase 7`*
