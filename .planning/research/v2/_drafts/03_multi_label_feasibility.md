# Multi-label feasibility (Phase 7 draft fragment — to be assembled into CORPUS_SOURCING.md)

> Sources for CORPUS_SOURCING.md §"Multi-label classification — feasibility and recommendation". Decision IDs implemented: D-18. Requirement: RES-03.

## Multi-label classification

v1 forces a single genre label per book. Books like *Frankenstein* (gothic + scifi), *Treasure Island* (adventure + historical), and *Heart of Darkness* (literary + adventure) get assigned one label by editorial choice and the other is invisible. v2 asks: do we keep single-label, or move to multi-label?

Per D-18, this is **evaluated during Phase 7 research**, not pre-committed. The default expectation per `FEATURES.md §2 "Multi-genre / soft labels (research target)"` and `SUMMARY.md §"Gaps to Address"` is defer-to-v3, but research may find an opening. We examine four dimensions below and converge on a recommendation.

#### Cost

sklearn library support is excellent and cheap. `sklearn.multiclass.OneVsRestClassifier(SVC(kernel='rbf', probability=True, ...))` is the canonical multi-label SVM pattern: it fits one binary SVM per genre on the same feature matrix, calling each genre's classifier independently at inference. Training cost is linear in `n_classes` — at 8-10 genres we train 8-10 binary SVMs instead of 1 multiclass SVC, but each binary SVM is faster than the equivalent multiclass-Platt training (fewer pairwise comparisons). Total training time on our 200-300 book v2 corpus stays under ~5 minutes (vs ~2 minutes for the v1 multiclass SVM). Inference cost is similar: 8-10 `predict_proba` calls per upload, returning a `[genre, prob]` pair per genre. Per-class threshold (rather than top-1 argmax) decides which genres are "positive" for a given book.

Explainability infrastructure generalises cleanly. The nearest-neighbours approach (DEPTH-04 / `ARCHITECTURE.md §5b` option (c)) is class-agnostic — it returns the K closest training books in feature space regardless of how labels are organised. Per-track contribution analysis (DEPTH-05) decomposes the SVM decision into topology-vs-vocabulary contribution per binary classifier; the UI shows one decomposition per positive-prediction genre. Calibration (PITFALLS §7) requires per-class Platt scaling on each binary classifier rather than the single multiclass Wu-Lin-Weng extension — slightly more LOOCV folds but the same `CalibratedClassifierCV(method='sigmoid', cv=LeaveOneOut())` pattern; no new library, no architectural change. **Verdict on cost:** acceptable; this is not the blocker. Engineering effort to move v1 → multi-label is approximately 1 plan-week (binary SVM wrap + per-class calibration + UI top-N threshold + explainability extension).

#### Ground truth

This is the actual blocker. Clean multi-label ground truth requires one of three paths, each with significant friction:

- **Goodreads-UCSD shelf cleaning.** The UCSD academic mirror gives us ~876M user-book interactions, with each book carrying multiple shelf tags. We could in principle accept "every shelf tag with ≥X% of shelvings (after filtering to the controlled 30-genre vocabulary)" as a positive label. Risk: shelf tags are extremely noisy — "to-read", "favourites", "5-star", "audiobook", and book-club shelves pollute the signal heavily. The cleaning pipeline must filter to a controlled vocabulary, threshold by shelving count, and apply a calibration step to map raw shelving percentages to a usable per-genre threshold. Cleaning effort: estimated 3-5 days of curation engineering plus a manual review pass on the final 200-300 books to catch label collapse (e.g., a book getting 12 positive labels because it's popular across many shelves). Per `02_source_evaluation.md`'s curation-only verdict for Goodreads, the shelves help *rank* candidates — extending them to also *label* candidates is a meaningful expansion of trust we place in user shelves and partially contradicts the D-03 reframing.

- **LoC subject headings.** LCC subject headings are typically 1-3 per book and are author/work-clustered rather than genre-clustered (e.g., PR6005 covers all of Conrad's work under one bucket). Not naturally multi-label at our 8-10 genre granularity. Adequate as a sanity check, not a primary multi-label source.

- **Expert re-labelling.** 25-30 books × 8-10 genres × multi-label (1-3 positive labels per book) ≈ 250-900 binary book-genre judgements. Tractable for one or two domain-expert annotators in a focused week; the methodology from `01_comparable_projects.md §Project 3 BL Labs` (Cohen's κ ≥ 0.85 inter-annotator agreement target) applies directly. This is the cleanest path but the most expensive in human time.

- **LLM-assisted with human review.** Generative-model proposed labels with human final-cut. Circular-benchmark concern per `FEATURES.md §2 Anti-Features` and `02_source_evaluation.md §Confirmed anti-features` — acceptable only with human-final-cut and explicit disclosure that some labels were LLM-proposed.

**Verdict on ground truth:** clean multi-label ground truth requires either (a) Goodreads shelf cleaning at moderate cost with noise risk, (b) expert re-labelling at moderate human cost with the cleanest signal, or (c) both. This IS a Phase 8 budget blocker, not a trivial-to-source quantity. The expert re-labelling path is the strongest standalone option but competes for the same Phase 8 review time that single-label curation already consumes.

#### UI implications

Top-N display (DEPTH-01, DEPTH-02) shifts shape. Single-label v2 with calibrated probabilities renders as "top-3 genres ranked by probability, with the winner highlighted". Multi-label v2 renders as "all genres above a configurable threshold (default 0.5), with no single winner". The threshold itself becomes a settings-drawer control alongside α and K. The "winner" framing in copy and visuals — currently `Predicted: Mystery (0.78)` — becomes `Predicted: Mystery (0.78), Adventure (0.62), Historical (0.55)` or similar. This is a meaningfully different product story: the app no longer answers "what genre is this book?" but "which genres apply to this book?"

"Why this genre?" explainability (DEPTH-03..06) becomes "why these genres?". Multiple positive-prediction genres need parallel explanations — per-class nearest neighbours, per-class driving words, per-class topology-vs-vocabulary decomposition. The explainability panel grows from one fixed section to N (where N = number of positive labels for this upload). UI complexity scales with N; PITFALLS §13 (information overload) becomes a real risk when a book triggers 5+ positive labels.

Calibration (PITFALLS §7) and reliability diagrams need a per-class reliability diagram rather than a single one — N diagrams in the "Advanced diagnostics" pane (`FEATURES.md §3a "Calibration plot in settings drawer"`). Onboarding tour (POLISH-02, `FEATURES.md §4b`) must explain "this book is gothic AND scifi, here's why both" rather than "this book is gothic, here's why" — a more conceptually demanding tour step.

User expectation: most upload workflows (in 2026's commercial ML landscape) assume a single answer. Multi-label is a meaningfully different mental model and downstream-blocking for Phase 9 (DEPTH-01..07) and Phase 10 (POLISH-02 tour copy).

#### Comparable-project precedent

Referencing `01_comparable_projects.md`: none of the 4 surveyed projects use multi-label. Worsham/Kalita (Project 1) and Gutenberg-Genre-ID (Project 2) both use single-label 10-way classification. BL Labs `blbooksgenre` (Project 3) is binary fiction/nonfiction — not multi-label in our sense. Reagan et al. (Project 4) is unsupervised — no labels at all. Across the four projects, single-label classification is the dominant pattern.

Broader 2020-2026 NLP genre-classification literature is mixed: academic benchmarks lean single-label (because labels come from institutional/expert sources that publish one canonical genre per work); commercial systems (Goodreads, Storygraph) lean multi-label (because they rely on crowd-sourced shelves). Our project sits closer to the academic-benchmark side (per the FEATURES.md framing as "exploration and learning tool" rather than commercial recommendation), so the comparable-project precedent supports single-label as the safer default.

**Verdict on precedent:** weak precedent for multi-label in this exact space; comparable-project corpus design favours single-label. The few multi-label genre-classification systems that exist in 2026 (Storygraph, refined Goodreads-shelf systems) are commercial, opaque, and don't ship reproducible methodology — not a model we want to imitate.

## Recommendation

**Recommendation:** Defer to v3.

**Rationale:** Three reinforcing reasons converge on deferral: (a) clean multi-label ground truth requires non-trivial sourcing effort (Goodreads shelf cleaning at noise risk, or expert re-labelling at human-time cost) that directly competes with the Phase-8 single-label curation budget — neither path is free; (b) comparable-project precedent is weak — all 4 surveyed projects use single-label or unsupervised, and the few multi-label systems in production are crowd-sourced commercial systems that don't ship reproducible methodology; (c) UI changes are downstream-blocking for Phase 9 (DEPTH-01..07 must all generalise from "winner" framing to "positive set" framing) and Phase 10 (tour copy + onboarding), expanding scope significantly without a corresponding accuracy win on the v1 baseline.

**If deferred to v3, what changes for v2:** Nothing. Single-label classification continues; the v1 calibrated `predict_proba` top-N display (`FEATURES.md §3a`) ships as planned. Documentation in `PROJECT.md` "Future Work" / "Out of Scope" should record multi-label as a v3 candidate with this Phase 7 rationale as the source. The Phase-8 curation pipeline records the *secondary* genre suggestion observed during expert curation as a free-form `notes` field in `corpus/books.yaml` (zero schema impact, useful evidence for the v3 multi-label re-labelling pass when it happens).

---

*Phase 7 draft fragment (RES-03 deliverable). Plan 05 will assemble this into `.planning/research/v2/CORPUS_SOURCING.md` §"Multi-label classification — feasibility and recommendation".*
