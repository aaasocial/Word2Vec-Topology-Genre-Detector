# Phase 7: Corpus Sourcing Research Spike — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 07-corpus-sourcing-research-spike
**Mode:** Interactive `/gsd-discuss-phase 7` (note: an earlier `--auto` attempt was reverted before commit at user request; this log reflects the interactive session)
**Areas discussed:** Source strategy, Corpus shape + author rule, Test set + validation protocol, Multi-label + doc detail

---

## A. Source Strategy

### Q1 — How much comparable-project research should CORPUS_SOURCING.md include?

| Option | Description | Selected |
|--------|-------------|----------|
| Cite 3–5 comparable projects + justify our deviations | Brief review of how others sourced + labelled; explicit rationale for our choices. | ✓ |
| Short justification only | One paragraph naming sources we picked. | |
| Deep landscape survey (~5 pages, 10+ approaches) | Most thorough; significant Phase 7 effort. | |

**Notes:** User wants defensibility without bloat. Research agent picks the specific 3–5 projects.

### Q2 — Which sources should Phase 7 evaluate and reach an accept/reject decision on?

| Option | Description | Selected |
|--------|-------------|----------|
| Gutenberg + Open Library + LoC headings (baseline) | Public domain text + subject cross-ref + LCC headings. Zero new installs. | ✓ |
| Add HuggingFace datasets (`blbooksgenre`, `literary-genre-examples`) | Revisit prior rejections. Needs `datasets` install. | ✓ |
| Add Goodreads reference dump | UCSD academic mirror. | ✓ |
| Add Internet Archive / wider net (HathiTrust, Standard Ebooks, etc.) | Most ambitious; revisits all prior rejections. | ✓ |

**Notes:** User selected all four — Phase 7 evaluates the full set and reaches an accept/reject decision per source with documented rationale. Comparable-project research may surface additional sources (HathiTrust, Standard Ebooks) which also get evaluated.

### Q3 — What role should Goodreads play?

| Option | Description | Selected |
|--------|-------------|----------|
| Reference taxonomy only (genre shelves as label cross-check) | Matches existing v2 research recommendation. | |
| Reference + label scraping at scale | ToS risk. | |
| Skip Goodreads entirely | Cleanest legal stance. | |
| **User's response (free text):** | **Goodreads (and LoC) is for deciding which books to use — book selection / curation reference. Not for labels.** | ✓ |

**Notes:** Critical user clarification that reframes the existing v2 research bundle. Goodreads / LoC / canon lists tell us *which titles should be in the corpus*; the actual text still gets fetched from Gutenberg (or another public-domain text source). The existing STACK.md / FEATURES.md framing of Goodreads/OL/LoC as alternative labelling sources is wrong for this project.

### Q4 — How should Library of Congress feed Phase 7's sourcing?

| Option | Description | Selected |
|--------|-------------|----------|
| LCC subject headings only (already in Gutenberg metadata) | Lowest effort, label cross-validation. | |
| LCC headings + LoC digitised text | Adds a second fetch pipeline. | |
| Skip LoC entirely | Simplest scope. | |
| **User's response (free text):** | **Same as Goodreads — LoC plays a book-selection / curation role, not a labelling role.** | ✓ |

**Notes:** LoC is a curation source (LCC headings + catalog references for canonical-title identification). No LoC text-fetch pipeline in v2.

---

## B. Corpus Shape + Author Rule

### Q5 — What's the v2 genre set?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep the current 10 (Proposal C) | Adventure, fantasy, gothic, historical, horror, literary, mystery, romance, scifi, western. | |
| Drop or merge weak performers | Proposal A (merge) or B (drop). | (User leans here) |
| Add 1–2 new genres | Broadens coverage; no v1 baseline for new labels. | |

**Notes:** User leans toward dropping or merging weak performers but wants research-backed ideas before committing. Three concrete proposals presented in conversation:

- **Proposal A — Merge to 8 genres:** `gothic + horror → gothic-horror`, `scifi + fantasy → speculative`. Keep: adventure, historical, literary, mystery, romance, western.
- **Proposal B — Drop weak performers (8 genres):** drop horror + historical; keep the other 8.
- **Proposal C — Keep all 10:** bet that 25–30 books × ≥8 authors per genre fixes weak performers.

### Q5b — Genre-set direction (after presenting proposals)

| Option | Description | Selected |
|--------|-------------|----------|
| Lock Proposal A (merge to 8) | | |
| Lock Proposal C (keep 10, expand) | | |
| **Open question — research decides** | Research agent investigates (LCC subject overlap, comparable-project genre choices, author availability), presents recommendation in CORPUS_SOURCING.md. User approves at doc review. | ✓ |
| Lock Proposal B (drop 2) | | |

**Notes:** Phase 7's research agent has authority + responsibility to recommend a genre-set direction with evidence. User reviews `CORPUS_SOURCING.md §"Genre set recommendation"` during normal doc review (no separate checkpoint).

### Q6 — Books-per-genre target (hard constraint)?

| Option | Description | Selected |
|--------|-------------|----------|
| 12 (modest growth) | | |
| 15 (meaningful growth) | | |
| 20 (academic small-corpus floor) | | |
| **Other size — user specified 25–30 / genre** | Academic-grade. Exact N pinned by Phase 7 after genre-set decision. | ✓ |

**Notes:** Significantly bigger than my initial recommendation. Phase 8 commitment is 150–300 new book fetches and full pipeline rerun.

### Q7 — Per-author cap within a single genre?

| Option | Description | Selected |
|--------|-------------|----------|
| Max 2 books per author per genre | (My recommendation — anti-leakage guardrail) | |
| Max 3 books per author per genre | | |
| Max 1 book per author per genre | | |
| **No per-author cap (user override)** | Prolific authors may contribute as many books as research justifies. | ✓ |

**Notes:** User deliberately overrode PITFALLS §5 recommendation. Reasoning (implicit): prolific authors *define* genre boundaries; removing them hurts more than the leakage risk. Trade-off: removes one of two anti-leakage guardrails; per-author held-out smoke test (D-17) becomes the only remaining defense and must be strict.

### Q7b — No-per-author-cap trade-off: per-author smoke test pass criterion?

| Option | Description | Selected |
|--------|-------------|----------|
| **Tight — ≤10pp gap** | Strictest; surfaces leakage early. | ✓ |
| Standard — ≤15pp gap | PITFALLS §5 default. | |
| Loose — ≤20pp gap | Maximally permissive. | |
| Report only, no threshold | | |

**Notes:** Tight threshold compensates for the no-cap choice. Some authors may flag as "leaking" and we'll have to document/accept those cases.

### Q8 — Minimum distinct authors per genre?

| Option | Description | Selected |
|--------|-------------|----------|
| ≥6 distinct authors / genre | | |
| **≥8 distinct authors / genre** | Stricter floor; enables 5-fold GroupKFold with headroom. | ✓ |
| ≥10 distinct authors / genre | Strictest; hardest to source. | |

**Notes:** Author diversity at the floor, free ceiling. Combined with no per-author cap (Q7), this means: every genre has ≥8 authors AND any single author may contribute heavily.

---

## C. Test Set + Validation Protocol

### Q9 — Hold-out test set size (as % of final v2 corpus)?

| Option | Description | Selected |
|--------|-------------|----------|
| **20% of corpus** | Standard academic split; per-genre n=5+ at 25/genre. | ✓ |
| 15% of corpus | | |
| 25% of corpus | | |
| Fixed 30 books | | |

### Q10 — Hold-out selection rule?

| Option | Description | Selected |
|--------|-------------|----------|
| **Author overlap with training** | Each test book's author has other books in training. Models the realistic upload scenario. | ✓ |
| Author-disjoint | | |
| Random stratified per genre | | |
| Mixed (overlap + disjoint split) | | |

**Notes:** Pure unseen-author testing handled by the per-author smoke test (D-17), not the hold-out.

### Q11 — When is the v1 baseline number computed?

| Option | Description | Selected |
|--------|-------------|----------|
| **Phase 7 — evaluate existing v1 SVM on the hold-out** | Deterministic; phase becomes "research + writing + one eval step". | ✓ |
| Phase 8 — first task of the retrain | | |
| Both (Phase 7 provisional + Phase 8 sanity check) | | |

**Notes:** Phase 7 isn't purely documentation — it runs `svm_pipeline.joblib` against the hold-out subset and pins macro-F1. Phase 8 then has a single number to beat.

### Q12 — Headline metric + reporting depth?

| Option | Description | Selected |
|--------|-------------|----------|
| **Macro-F1 headline + full panel** | Per-genre F1, accuracy, confusion matrix, permutation p, per-author gap, GroupKFold mean ± std. | ✓ |
| Macro-F1 headline + lean panel | | |
| Accuracy headline + macro-F1 inline (v1 continuity) | | |

**Notes:** User asked what macro-F1 / F1 mean — explained inline in conversation. Confirmed choice unchanged after explanation.

---

## D. Multi-Label Classification

### Q13 — Multi-label classification (RES-03). Confirm or revisit?

| Option | Description | Selected |
|--------|-------------|----------|
| Defer to v3 — closed decision (existing recommendation) | | |
| **Evaluate during Phase 7 research** | Research agent investigates feasibility; recommendation lands in CORPUS_SOURCING.md. | ✓ |
| Adopt multi-label in v2 | | |

**Notes:** Phase 7 doesn't pre-commit to deferral. Research agent investigates multi-label SVM cost, labelling-source feasibility (Goodreads shelves give clean multi-label ground truth at low cost?), UI implications, comparable-project precedent. Default expectation is still defer-to-v3 but research may flip it.

---

## E. Document Format and Phase-8-Executable Detail

### Q14 — How prescriptive should Phase 7's docs be about specific books?

| Option | Description | Selected |
|--------|-------------|----------|
| **Constraints + a long candidate list (50+ gutenberg_ids per genre)** | Phase 8 picks final 25–30 from a curated, pre-vetted pool. | ✓ |
| Constraints + exact final book list | Brittle if a fetch fails or a book has OOV issues. | |
| Constraints only | Breaks success criterion #4. | |

### Q15 — Document structure?

| Option | Description | Selected |
|--------|-------------|----------|
| **Two docs (CORPUS_SOURCING.md + VALIDATION_PROTOCOL.md), each with a Phase 8 entry checklist** | Matches success criteria filenames verbatim. | ✓ |
| Three docs (split execution recipe out) | | |
| One combined doc | | |

### Q16 — How should Phase 7 surface the genre-set recommendation?

| Option | Description | Selected |
|--------|-------------|----------|
| **CORPUS_SOURCING.md §"Genre set recommendation" — review during normal doc review** | No extra workflow step. | ✓ |
| Separate decision checkpoint (`/gsd-discuss-phase` re-prompt) | More audit-trail; adds friction. | |
| Just write the recommendation; iterate via PR | | |

---

## Claude's Discretion (deferred to planner / research agent)

- Per-genre 50+ candidate shortlist inline in CORPUS_SOURCING.md vs sibling `corpus_candidates.yaml`.
- Exact wording of multi-label-evaluation rationale paragraph.
- Per-author smoke test code snippet vs algorithmic description.
- Per-genre author distribution audit table format (genre-pivoted vs author-pivoted).
- Goodreads / LoC candidate-list cross-reference pseudocode.
- The specific 3–5 comparable projects to cite (research agent picks).
- LCC subject overlap analysis location (body vs appendix).
- Merged-genre label naming (e.g., `gothic-horror` vs `gothic_horror`) — consistent with v1's `scifi`.

## Deferred Ideas (noted for future phases)

- PROJECT.md / REQUIREMENTS.md / ROADMAP.md stale "3 genres × 5 books" text — follow-up `/gsd-docs-update` after Phase 7.
- `scripts/build_corpus.py` reproducibility (CEXP-05) — Phase 8 P2.
- Hyperparameter co-tuning — explicitly rejected for v2; defer to hypothetical Phase 8b.
- LLM-assisted candidate-book identification — circular-benchmark concern; candidate-suggestion role only if used.
- LoC digitised text integration — v3 candidate.
- Per-genre F1 deep-dives + confusion matrix analysis — Phase 8 generates; v3 acts.
- LCC subject-overlap visualisation in CORPUS_SOURCING.md — planner discretion.

---

## Process Note

This phase had an earlier `--auto` attempt (auto mode applied recommended defaults without asking the user). The user noticed the mode was wrong, interrupted the commit, and asked to restart in interactive mode. The auto-mode files (`07-CONTEXT.md`, `07-DISCUSSION-LOG.md`) were deleted before any commit, and the phase directory was removed. This log + CONTEXT.md are the result of the subsequent interactive session.

Lesson for future sessions: confirm interactivity mode before applying defaults, especially when prior context (like Phase 6 having been done interactively) suggests the user wants the same affordance for the next phase.
