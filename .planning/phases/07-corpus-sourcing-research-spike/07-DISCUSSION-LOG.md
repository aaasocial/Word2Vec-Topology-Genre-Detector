# Phase 7: Corpus Sourcing Research Spike — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 07-corpus-sourcing-research-spike
**Mode:** `/gsd-discuss-phase 7` — Auto Mode (no interactive questioning; recommended defaults selected automatically per workflow contract)
**Areas considered:** Source strategy, Target corpus shape, v1-frozen test set, Validation protocol, Multi-label decision, Document format

---

## A. Source Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Project Gutenberg via `gutenbergpy` | Already installed; public-domain bulk fetch with cached metadata; the safe default. | ✓ |
| Project Gutenberg + Open Library bulk dumps (subject-tag cross-reference) | Use OL bulk JSON for genre-label validation only; no extra Python dep (requests + ijson). | ✓ |
| Hugging Face `blbooksgenre` / `agentlans/literary-genre-examples` | Title-only or paragraph-only — doesn't fit full-book features. Needs new `datasets` dep. | |
| Internet Archive `internetarchive` SDK | Rarer-fiction escape hatch; rate-limit risk; new dep. | |
| BookCorpus / Goodreads scraping / LLM auto-labelling | All anti-features per FEATURES.md §2 (licensing, ethics, circular benchmark). | |

**Auto-selected:** Gutenberg (primary) + Open Library bulk dumps (subject cross-reference only).
**Rationale:** Recommended defaults per STACK.md §"Corpus Sourcing"; zero new installs; matches v1 invariant CORPUS-04 (all public domain).

---

## B. Target Corpus Shape

### B.1 Genre count

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current 10 genres (adventure, fantasy, gothic, historical, horror, literary, mystery, romance, scifi, western) | Preserves continuity; defers genre-set decisions to v3. | ✓ |
| Add 1-2 genres (children's, dystopian, etc.) | Broadens topology but risks pulling in new sourcing complexity. | |
| Drop weak-performing genres (horror 22%, historical 30%, adventure 40%, scifi 40%) | Premature — author concentration likely explains weak accuracy. | |

**Auto-selected:** Keep 10 genres.

### B.2 Books per genre

| Option | Description | Selected |
|--------|-------------|----------|
| 10/genre (current — no change) | No expansion; protocol-only improvement. | |
| 12/genre (modest growth, hard constraint) | +2/genre forces 2 new authors per genre on average; GroupKFold-feasible. | ✓ |
| 15/genre | Bigger jump; risks pulling in more same-author books. | |
| 20+/genre | Research-grade; out of scope for v2 timeline. | |

**Auto-selected:** 12 books × 10 genres = 120 total.

### B.3 Author distribution constraint

| Option | Description | Selected |
|--------|-------------|----------|
| No constraint (current state: 6 Austen, 6 Zane Grey, 5 Verne…) | Reproduces v1 leakage. | |
| ≥5 distinct authors/genre, ≤3 per author | Looser; still allows author dominance. | |
| ≥6 distinct authors/genre, ≤2 per author | Stricter; GroupKFold-feasible with ≥5 folds. | ✓ |
| ≤1 book per author (strict deduplication) | Maximally safe but harder to source; loses connectivity within an author's oeuvre. | |

**Auto-selected:** ≥6 distinct authors/genre, max 2 books/author/genre (forces restructuring of current corpus).

---

## C. v1-Frozen Test Set

### C.1 Size

| Option | Description | Selected |
|--------|-------------|----------|
| 10 books (1/genre) | Smallest; per-genre evaluation has n=1 — unreliable per-genre F1. | |
| 20 books (2/genre, 20% of corpus) | Academic standard; per-genre F1 has n=2 each. | ✓ |
| 30 books (3/genre, 30%) | Maximises test reliability; shrinks training to 7/genre after BL=hold-out. | |

**Auto-selected:** 20 books (2/genre).

### C.2 Selection rule

| Option | Description | Selected |
|--------|-------------|----------|
| Stratified random sample | Easy; no constraint on author overlap with training. | |
| Each test book by an author with other books in training; 2 test books per genre by different authors | Realistic upload scenario; author-diverse within each genre's test set. | ✓ |
| Hold out a specific author entirely | Pure unseen-author test (more about generalisation than v1 comparison); better suited to the smoke test. | |

**Auto-selected:** Author-overlap-with-training + within-genre author diversity. (Pure unseen-author handled separately by per-author smoke test.)

### C.3 Where v1 baseline number comes from

| Option | Description | Selected |
|--------|-------------|----------|
| Use existing `results/validation_report.txt` overall accuracy (54.6%) verbatim | Wrong — that's LOOCV on all 100 books, not on the 20-book hold-out. | |
| Re-run v1 SVM evaluation on the 20-book test set during Phase 7 (no retrain) | Deterministic, reproducible, gives apples-to-apples comparison. | ✓ |
| Defer to Phase 8 | Breaks the "Phase 8 makes zero methodology decisions" criterion. | |

**Auto-selected:** Phase 7 evaluates existing SVM on 20-book test set; records the number in VALIDATION_PROTOCOL.md.

---

## D. Validation Protocol

### D.1 Headline metric

| Option | Description | Selected |
|--------|-------------|----------|
| Overall accuracy | Hidden by class imbalance; misleading on uneven per-genre performance. | |
| Macro-F1 (unweighted mean of per-genre F1) | Treats every genre equally; PITFALLS §6 recommendation. | ✓ |
| Micro-F1 / weighted F1 | Class-frequency-weighted; effectively the same as accuracy at balanced counts. | |

**Auto-selected:** Macro-F1.

### D.2 Cross-validation strategy

| Option | Description | Selected |
|--------|-------------|----------|
| LOOCV (current v1 behaviour) | Inflates accuracy via author leakage. | |
| Stratified K-fold | Doesn't address author leakage. | |
| GroupKFold(groups=author), K = min authors per genre | PITFALLS §5 mitigation; mandatory once author concentration exists. | ✓ |
| Repeated stratified K-fold | Doesn't address author leakage. | |

**Auto-selected:** GroupKFold(groups=author).

### D.3 Permutation null parameters

| Option | Description | Selected |
|--------|-------------|----------|
| n_permutations = 100, p < 0.10 | Faster but less power. | |
| n_permutations = 1000, p < 0.05 (v1 default) | Established threshold; sufficient power for n≤120. | ✓ |
| n_permutations = 10000, p < 0.01 | Overkill at this corpus size; cost scales linearly. | |

**Auto-selected:** 1000 permutations, p < 0.05.

### D.4 Per-author held-out smoke test

| Option | Description | Selected |
|--------|-------------|----------|
| Skip — covered by GroupKFold | GroupKFold averages over folds; smoke test surfaces the worst-case author. | |
| Per-author: hold out one author, predict their books, report gap vs LOOCV; ≤15pp tolerance | PITFALLS §5 mitigation; surfaces residual author leakage that GroupKFold averaging masks. | ✓ |

**Auto-selected:** Per-author smoke test with ≤15pp gap criterion.

### D.5 Reporting structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single overall number | Hides all the failure modes Phase 7 set out to surface. | |
| Three numbers (v1-on-frozen, v2-on-frozen, v2-LOOCV) + per-genre F1 + permutation p + per-author gap | The full panel; lets Phase 8 reporting say something honest. | ✓ |

**Auto-selected:** Full reporting panel + markdown template in VALIDATION_PROTOCOL.md.

---

## E. Multi-Label Classification (RES-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Adopt multi-label in v2 | Rebuilds SVM, top-N, "why this genre" semantics — massive scope expansion. | |
| Defer to v3 with documented rationale | Preserves v2 single-label comparison integrity; matches PITFALLS / SUMMARY recommendation. | ✓ |
| Keep open as Phase 8 decision | Breaks "Phase 8 makes zero methodology decisions." | |

**Auto-selected:** Defer to v3; closed decision (not Phase 8 open question).

---

## F. Document Format and Phase-8-Executable Detail

### F.1 Detail level

| Option | Description | Selected |
|--------|-------------|----------|
| High-level recommendations only | Forces Phase 8 to re-decide sourcing details — breaks success criterion #4. | |
| Phase-8-executable specs with explicit book IDs, exact CLI invocations, exact reporting templates | Makes success criterion #4 ("Phase 8 makes zero further decisions") verifiable. | ✓ |
| Full code in the doc | Belongs in `scripts/`, not a research doc; planner can include snippets where ambiguity reduction warrants. | |

**Auto-selected:** Phase-8-executable detail with explicit IDs/commands/templates; code snippets at planner discretion.

### F.2 Document split

| Option | Description | Selected |
|--------|-------------|----------|
| Two docs (CORPUS_SOURCING.md, VALIDATION_PROTOCOL.md) — matches success criteria #1/#2 verbatim | The phase artefacts literally named in success criteria. | ✓ |
| Single combined doc | Couples sourcing + validation concerns; harder for Phase 8 to read one without the other. | |
| Three docs (sourcing + protocol + entry-recipe) | Planner discretion; viable if entry checklists run long. | |

**Auto-selected:** Two docs (with planner discretion to extract entry checklist into a third doc if length warrants).

---

## Claude's Discretion (deferred to planner)

- Whether to inline gutenberg_id long-lists in CORPUS_SOURCING.md or extract to `corpus_candidates.yaml`.
- Exact wording of the multi-label-deferred rationale paragraph.
- Whether per-author smoke test gets a code snippet or just algorithmic description.
- Per-genre author distribution audit table format (genre-pivoted vs author-pivoted).
- Whether to document Open Library cross-reference as pseudocode.
- Whether the Phase 8 entry checklist lives at the bottom of each doc or in a separate PHASE_8_EXECUTION_RECIPE.md.

## Deferred Ideas (noted for future phases)

- PROJECT.md / REQUIREMENTS.md / ROADMAP.md stale "3 genres × 5 books" text — follow-up `/gsd-docs-update` after Phase 7.
- HF `blbooksgenre` cross-reference — v3 if text-level dataset releases.
- `internetarchive` SDK — v3 escape hatch for rarer fiction.
- Hyperparameter co-tuning (α/K/window sweep alongside corpus expansion) — explicitly rejected for v2; defer to hypothetical Phase 8b.
- LLM-assisted candidate-book identification — circular-benchmark concern; candidate-suggestion role only if used.
- Genre-set refactoring (drop weak performers, merge similar) — Phase 8 results decide v3 cleanup.
