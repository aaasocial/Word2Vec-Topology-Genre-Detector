# Roadmap

> Living document. v1.0 (Phases 1–5) shipped 2026-04-13. v2.0 (Phases 6–10) defined 2026-05-22. Phase numbering continues across milestones — no resets.

---

## v1.0 — Shipped (2026-04-13) · Archived

**Phases 1-5** delivered the hosted web app: 3D scatter (PCA/KPCA/UMAP/t-SNE), animated Vietoris-Rips filtration, persistence-image heatmaps, kernel-SVM classification, live parameter controls. Deployed at https://word2vec-topology-genre-detector-production.up.railway.app. v1.0.1 patch (2026-05-24) closed the PARAM-03..06 wiring gap surfaced by retrospective audit.

**Archive:** [`.planning/milestones/v1.0-ROADMAP.md`](milestones/v1.0-ROADMAP.md) · [`milestones/v1.0-REQUIREMENTS.md`](milestones/v1.0-REQUIREMENTS.md) · [`v1.0-MILESTONE-AUDIT.md`](v1.0-MILESTONE-AUDIT.md)

---

# v2.0 — Accuracy, Depth, and Polish

**Milestone goal:** Improve classification accuracy via a better-sourced corpus, add explainability and top-N predictions, sweep v1 carry-over bugs, and round out the visual experience with theming and onboarding. Additive polish on a shipped app — no new layers, no replaced layers.

**Target features:**
- Sweep v1 carry-over bugs: H₂ homology + tooltip, persistence-diagram dot scaling, BookSlider stub (corpus metadata endpoint), restored ROADMAP/STATE with prevention.
- Corpus-sourcing research spike — recommendation doc on how comparable projects build training corpora, plus a validation protocol.
- Corpus expansion driven by research findings; measurable accuracy improvement vs the v1 baseline on a frozen test set.
- Classification depth: top-N predictions with calibrated confidence + "why this genre" explainability (nearest training books, per-track contribution, driving words).
- Visual polish: dark mode / theming refinement, onboarding tour, empty-state polish.

**Milestone success criteria** (TRUE when v2.0 ships):
1. User no longer sees a misleading disabled H₂ tab; the H₀ tab is also removed (mathematically degenerate in weighted Vietoris-Rips — all births collapse to filtration time 0); the persistence-image view ships H₁-only honestly. H₂ deferred to v3 (sparse high-D point clouds rarely contain voids and the O(n⁴) runtime cliff is not worth the engineering for empirical-zero gain — see PROJECT.md Key Decisions; PITFALLS.md §2-3).
2. User can slide BookSlider through every book in a selected genre and see title, author, and word count for each.
3. User uploads a book and receives a top-3 ranked prediction with calibrated probabilities summing to 1, plus a "why this genre?" explanation showing the 3–5 nearest training books and per-track contribution percentages.
4. User can toggle light / dark / system theme and the choice persists across reloads; the R3F scene background follows the theme without canvas remount.
5. A first-time visitor sees a 3–5 step skippable tour anchored on the scatter, genre selection, upload, and topology views; the tour can be re-triggered from a Help menu.
6. v2 classifier macro-F1 on the v1-frozen test set exceeds the v1 baseline (`VALIDATION_PROTOCOL.md` defines the exact comparison).
7. ROADMAP.md and STATE.md are non-empty in `git status` and a pre-commit hook prevents 0-byte commits to `.planning/**/*.md`.

**Granularity:** standard (5 phases). **Coverage:** 25/25 v2 requirements mapped, each in exactly one phase.

## Phases

- [ ] **Phase 6: v1 Bug-Fix Sweep** — Close H₂, BookSlider, dot-scaling, restored planning docs, and the latent cache-key bug before any retrain happens.
- [ ] **Phase 7: Corpus Sourcing Research Spike** — Decide sources, per-genre counts, author-distribution constraints, and the validation protocol. Pure research, no code.
- [ ] **Phase 8: Corpus Expansion** — Retrain on the Phase-7 corpus; evaluate against the v1-frozen test set with GroupKFold-by-author; ship new models.
- [ ] **Phase 9: Classification Depth** — Top-N calibrated predictions and "why this genre" explainability built on the Phase-8 SVM.
- [ ] **Phase 10: Visual Polish** — Dark mode, onboarding tour, empty-state polish — horizontal sweep across components touched by Phases 6–9.

| # | Phase | Goal (outcome, not task) | Requirements | Success criteria |
|---|---|---|---|---|
| 6 | v1 Bug-Fix Sweep | The four visible v1 carry-overs are closed and the latent cache-key bug is fixed before any retrain happens | BUG-01, BUG-02, BUG-03, BUG-04, BUG-05 | 5 |
| 7 | Corpus Sourcing Research Spike | A written, defensible plan exists for what books to add, where to source them, and how to measure that v2 is actually better than v1 | RES-01, RES-02, RES-03 | 4 |
| 8 | Corpus Expansion | The bundled corpus is larger, balanced, and author-diverse; the retrained model beats the v1 baseline on a frozen test set | CEXP-01, CEXP-02, CEXP-03, CEXP-04, CEXP-05 | 5 |
| 9 | Classification Depth | Classification results show ranked, calibrated alternatives and an honest "why this genre?" explanation that users can interrogate | DEPTH-01, DEPTH-02, DEPTH-03, DEPTH-04, DEPTH-05, DEPTH-06, DEPTH-07 | 5 |
| 10 | Visual Polish | The app feels finished: theming respects user preference, first-time visitors are oriented, and every empty state has intentional copy | POLISH-01, POLISH-02, POLISH-03, POLISH-04, POLISH-05 | 4 |

### Phase Dependencies (hard gates)

```
Phase 6 ──────────────► Phase 8 ──► Phase 9 ──► Phase 10
                          ▲                         ▲
Phase 7 ──────────────────┘                         │
   (research spike;       (retrain bound to         │
    blocks Phase 8)        Phase 7 protocol)        │
                                                    │
Phases 6, 7, 8, 9 ──────────────────────────────────┘
                       (dark-mode sweep follows all
                        component changes upstream)
```

- **Phase 8 depends on Phase 7** (hard gate — user-mandated research spike; `VALIDATION_PROTOCOL.md` must exist before retrain — `PITFALLS.md §4–6`).
- **Phase 8 depends on Phase 6** (hard gate — BUG-05 cache-key correction must land before Phase 8 retrains, otherwise stale cache is served against the new W2V model — `PITFALLS.md §1`).
- **Phase 9 depends on Phase 8** (top-N calibration and nearest-neighbour explanations bind to the final SVM + feature matrix).
- **Phase 10 depends on Phases 6–9** (dark-mode sweep touches ~30 components modified by every prior v2 phase; doing it last means one sweep, not five).
- **Within Phase 6:** BookSlider (BUG-03) recommended before H₂ (BUG-01) — BookSlider is the smaller end-to-end "new endpoint" integration that proves the pattern (`ARCHITECTURE.md §6`).

---

## Phase Details

### Phase 6: v1 Bug-Fix Sweep

**Goal:** The four visible v1 carry-overs are closed and the latent cache-key bug is fixed before any retrain happens.

**Depends on:** Nothing (entry point for v2.0).

**Requirements:** BUG-01, BUG-02, BUG-03, BUG-04, BUG-05

**Success Criteria** (what must be TRUE):
  1. H₂ tab fully removed (no longer shows a misleading disabled tab); the H₀ tab is also removed (degenerate in weighted Vietoris-Rips — all births at filtration time 0); H₁ ships honestly. REQUIREMENTS.md BUG-01 and TOPO-02 are updated to reflect the removal. PROJECT.md Key Decisions records the H₀ degeneracy rationale and the H₂ v3 deferral.
  2. User views persistence diagrams where finite dots scale by sqrt(persistence) and H₀ infinite-persistence points are rendered on a dedicated marker — both visible at any zoom level.
  3. User selects a genre and slides BookSlider through every book in that genre, seeing title, author, and word count for each book; the `GET /api/corpus/genres/{genre}/books` payload is under 100KB total.
  4. ROADMAP.md and STATE.md are non-empty in `git status`; a pre-commit hook rejects any future 0-byte commit to `.planning/**/*.md`; `.gitattributes` excludes planning files from LFS.
  5. The content-addressed cache key includes `corpus_hash` (sha256 of `books.yaml`) and `w2v_model_sha256` everywhere on disk; a smoke test confirms "old cache + new model = cache miss" before Phase 8 even starts.

**Plans:** 5 plans
  - [x] 06-01-PLAN.md — BUG-04: planning-file 0-byte protection (pre-commit hook + installer + .gitattributes + CI backstop + snapshot recovery + audit)
  - [x] 06-02-PLAN.md — BUG-02: H₁ persistence-diagram sqrt dot scaling + infinity top-strip + Vitest fixtures
  - [x] 06-03-PLAN.md — BUG-03: BookSlider metadata endpoint (GET /api/corpus/genres/{genre}/books) + corpus.yaml author/word_count + top_10_tfidf_words sidecar + Sidebar rewire
  - [x] 06-04-PLAN.md — BUG-01: H₂ + H₀ removal sweep (frontend + backend + EXPLAIN-01 copy + ROADMAP/REQUIREMENTS/PROJECT.md doc updates)
  - [x] 06-05-PLAN.md — BUG-05: cache_key + corpus_hash + w2v_model_sha256 + eager cache flush + SVM lineage guard + D-24 smoke test

**UI hint:** yes

**Key pitfalls owned by this phase** (`PITFALLS.md`):
- §10 — Persistence-diagram dot scaling breaks H₁ infinite-persistence — `np.isinf(deaths)` filtered to a dedicated infinity-strip marker; sqrt scale for finite dots; snapshot test.
- §12 — BookSlider metadata becomes a JSON dump — schema strictly `{id, title, author, genre, word_count, top_10_tfidf_words}`; <2KB per book; React Query `staleTime: Infinity`.
- §15 — ROADMAP/STATE wiped again — pre-commit hook + `.gitattributes` + `.planning/.snapshots/` backup.
- §1 — Latent cache-key bug — BUG-05 lands here, not in Phase 8, so the retrain phase doesn't have to engineer a cache migration mid-flight.

> §2 / §3 are moot after BUG-01 was recast from "ship H₂" to "remove H₂ entirely" — see CONTEXT.md `<domain>` block and PROJECT.md Key Decisions. The bench gate, dedicated queue, and empty-H₂ fixture test are no longer load-bearing.

---

### Phase 7: Corpus Sourcing Research Spike

**Goal:** A written, defensible plan exists for what books to add, where to source them, and how to measure that v2 is actually better than v1. Pure research, no implementation.

**Depends on:** Nothing (research-only; can run in parallel with Phase 6).

**Requirements:** RES-01, RES-02, RES-03

**Success Criteria** (what must be TRUE):
  1. `.planning/research/v2/CORPUS_SOURCING.md` exists and names the chosen source(s) (Gutenberg / Open Library / HuggingFace `blbooksgenre` / Internet Archive), the target book count per genre (hard constraint, not a range), the target genre count, and the per-genre author-distribution audit (every genre has GroupKFold-feasible author distribution).
  2. `.planning/research/v2/VALIDATION_PROTOCOL.md` exists and pins: (a) the exact v1-frozen test set (specific book IDs), (b) `GroupKFold(groups=author)` cross-validation, (c) macro-F1 as the headline metric, (d) permutation null hypothesis test parameters, (e) the per-author held-out anti-leakage smoke test definition.
  3. Multi-label classification decision is documented with rationale; recommendation **defer to v3** is recorded in `CORPUS_SOURCING.md`.
  4. Phase 7 outputs are sufficient for Phase 8 to execute verbatim — Phase 8 makes zero further sourcing or methodology decisions.

**Plans:** 5 plans

Plans:
- [ ] 07-01-PLAN.md — Comparable projects + per-source verdicts + multi-label feasibility (RES-01, RES-03; D-01, D-02, D-03, D-04, D-05, D-18)
- [ ] 07-02-PLAN.md — Genre set recommendation (Proposal A/B/C) + LCC subject overlap analysis (RES-01; D-09, D-21)
- [ ] 07-03-PLAN.md — Per-genre candidate shortlist (≥50 gutenberg_ids each) + author distribution audit + books.yaml schema (RES-01; D-06, D-07, D-08, D-10, D-19)
- [ ] 07-04-PLAN.md — v1 baseline computation: deterministic eval of svm_pipeline.joblib on the 20% author-overlap hold-out (RES-02; D-11, D-12, D-13)
- [ ] 07-05-PLAN.md — Assembly: CORPUS_SOURCING.md + VALIDATION_PROTOCOL.md with Phase 8 entry checklists (RES-01, RES-02, RES-03; D-10, D-14, D-15, D-16, D-17, D-20, D-21)

**Key pitfalls owned by this phase** (`PITFALLS.md`):
- §4 — Comparing v2 accuracy to v1 without a held-out test set — `VALIDATION_PROTOCOL.md` mandates the v1-frozen 20% hold-out subset (~20 gutenberg_ids pinned in Phase 7) and the three-numbers reporting pattern: (1) v1 SVM on hold-out, (2) v2 SVM on hold-out, (3) v2 LOOCV on full v2 corpus (context only).
- §5 — Author overlap leakage — `CORPUS_SOURCING.md` audits author distribution; protocol mandates GroupKFold-by-author.
- §6 — Class imbalance from "add whatever's available" — sourcing doc pre-declares per-genre book counts as a hard constraint.

---

### Phase 8: Corpus Expansion

**Goal:** The bundled corpus is larger, balanced, and author-diverse; the retrained model beats the v1 baseline on the frozen test set defined in Phase 7.

**Depends on:**
- **Phase 7** (hard) — `CORPUS_SOURCING.md` and `VALIDATION_PROTOCOL.md` must exist and be followed verbatim.
- **Phase 6** (hard) — BUG-05 (cache-key correction) must have landed; otherwise stale precomputed artifacts will be served against the newly-trained model.

**Requirements:** CEXP-01, CEXP-02, CEXP-03, CEXP-04, CEXP-05

**Success Criteria** (what must be TRUE):
  1. `corpus/books.yaml` is extended with `author` and `word_count` fields per book; new entries match Phase 7's `CORPUS_SOURCING.md` recommendation (per-genre count, per-author distribution, source provenance).
  2. The full pipeline (`scripts/01 → 02 → 03 → 04 → 05 → 06`) reruns end-to-end on the expanded corpus and produces new Word2Vec, k-means, SVM, and feature artifacts; all are pushed to the versioned `v2.0-data` GitHub Release.
  3. The v2 model evaluated on Phase 7's v1-frozen test set reports macro-F1 strictly greater than the v1 baseline macro-F1 (number recorded in `VALIDATION_PROTOCOL.md`), plus per-genre F1 and a permutation p-value < 0.05.
  4. `GroupKFold(groups=author)` cross-validation runs and reports a per-author held-out gap ≤15pp vs. the LOOCV number; both numbers are surfaced in the validation report.
  5. *(P2)* `scripts/build_corpus.py` reproducibly regenerates the corpus from source manifests; running it on the recorded inputs produces a byte-identical `books.yaml` and `data/raw/` tree.

**Plans:** TBD

**Key pitfalls owned by this phase** (`PITFALLS.md`):
- §1 — W2V retrain rotates the embedding space — already mitigated by Phase 6's BUG-05; Phase 8 verifies the smoke test still passes after retrain.
- §4, §5, §6 — Validation rigor — protocol from Phase 7 is followed verbatim; no methodology decisions made here.
- §11 — LOOCV cost explosion — cache per-book homology keyed by `(book_id, corpus_manifest_hash)`; switch to repeated stratified K-fold if N ≥ 25.

---

### Phase 9: Classification Depth

**Goal:** Classification results show ranked, calibrated alternatives and an honest "why this genre?" explanation that users can interrogate. Built on the final SVM from Phase 8.

**Depends on:** **Phase 8** (hard) — top-N calibration and nearest-neighbour explanations bind to the final SVM + feature matrix. Retraining downstream of Phase 9 would invalidate every cached explanation.

**Requirements:** DEPTH-01, DEPTH-02, DEPTH-03, DEPTH-04, DEPTH-05, DEPTH-06, DEPTH-07

**Success Criteria** (what must be TRUE):
  1. User uploads a book and the classification result shows top-3 ranked genre predictions with calibrated probabilities summing to 1 (within floating-point tolerance), rendered as honestly-labeled probability bars — no pie chart, no hidden low-confidence predictions.
  2. User clicks "Why this genre?" and within ~200ms sees the 3–5 nearest training books in L2-normalized feature space, each with its Euclidean distance, title, author, and genre — the Redis cache (`explain:{feature_vec_hash}`, TTL 1h) means a re-click is instant.
  3. The explainability payload shows topology-vs-vocabulary track contributions as percentages summing to 100, computed via per-track `permutation_importance` (not per-dim, not Kernel SHAP).
  4. *(P2)* The explainability payload includes a TF-IDF-driven "driving words" pill list with explicit "proxy, not literal classifier inputs" disclosure copy adjacent to it.
  5. *(P2)* The top-N display includes an entropy / uncertainty badge that flags predictions where the top-2 probabilities are within 10pp of each other.

**Plans:** TBD

**UI hint:** yes

**Key pitfalls owned by this phase** (`PITFALLS.md`):
- §7 — `decision_function` mislabeled as confidence — Phase 9 retrains end-to-end with `SVC(probability=True)`; unit test asserts top-N sums to 1 and is never negative.
- §8 — SHAP Kernel Explainer synchronous — Phase 9 commits to option (c) from `ARCHITECTURE.md §11` (nearest-neighbours + per-track contribution + cluster attribution); no synchronous SHAP.
- §9 — Persistence-image feature importance is meaningless without normalization awareness — explainability aggregates to interpretable units (per-track, per-cluster, per-driving-word), never per-pixel persistence-image heatmaps; UI copy documents the L2-normalization caveat.

**Phase-9 open decisions to resolve during planning** (from `SUMMARY.md §"Gaps to Address"`):
- Calibration choice: `SVC(probability=True)` Platt vs `CalibratedClassifierCV(method='sigmoid', cv=LeaveOneOut())` — reliability diagram on Phase 8's corpus decides.
- Explainability technique validation: confirm option (c) holds on Phase 8's actual feature matrix; decide SHAP yes/no based on reliability and runtime.
- Top-N configurable from UI: recommendation **hardcode N=3 in v2**; expose as setting only on demand.

---

### Phase 10: Visual Polish

**Goal:** The app feels finished. Theming respects user preference, first-time visitors are oriented, and every empty state has intentional copy. Horizontal sweep across ~30 components touched by Phases 6–9.

**Depends on:** **Phases 6, 7, 8, 9** (hard) — dark-mode sweep covers every component modified upstream; tour anchors target the final UI; empty-states cover features introduced in Phase 9.

**Requirements:** POLISH-01, POLISH-02, POLISH-03, POLISH-04, POLISH-05

**Success Criteria** (what must be TRUE):
  1. User toggles between light / dark / system themes and the choice persists across reloads via the new `preferencesStore` (Zustand `persist` middleware, separate from session-scoped `visualizationStore`); `system` mode follows `prefers-color-scheme`.
  2. R3F scatter scene background, HoverTooltip, persistence diagrams, and all sidebar/topology/compare components honour the selected theme; scene background updates imperatively via `scene.background` with no canvas remount and no WebGL context loss on theme toggle.
  3. A first-time visitor sees a 3–5 step onboarding tour anchored on stable `data-tour-id` constants centralised in `src/tour/anchors.ts`; the tour is skippable, replayable from a Help menu, and a Playwright smoke test in CI asserts every step's anchor exists.
  4. Tour steps cover scatter exploration, genre selection + brightness, the upload + classification flow, and the topology tab — they explain the UI, not the underlying mathematics (mathematics remains in the v1 "How It Works" walkthrough).
  5. Empty states are polished for: pre-upload upload zone, comparison mode with no genres selected, classification failure, and the explanation panel before any upload exists — each with intentional copy, no generic placeholders.

**Plans:** TBD

**UI hint:** yes

**Key pitfalls owned by this phase** (`PITFALLS.md`):
- §13 — Three.js scene background doesn't follow theme — theme threaded via Zustand → R3F reads from store → `scene.background` updated imperatively; visual regression test in both themes; verified no canvas DOM churn on toggle.
- §14 — Onboarding tour breaks when DOM structure changes — anchors centralised in `src/tour/anchors.ts`; Playwright smoke test in CI walks the full tour; missing-anchor fallback is `'skip'`, never `'error'`; "Help → Take the tour again" re-trigger exists.

**Phase-10 open decision to resolve during planning** (from `SUMMARY.md §"Gaps to Address"`):
- Tour library decision: `react-joyride@^3.1.0` vs hand-rolled overlay. `ARCHITECTURE.md §5d` argues hand-rolled is cheaper for 5–8 steps; `STACK.md` lists `react-joyride` as a viable alternative. Phase 10 plan author picks one.

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Pipeline Validation Spike | 4/4 | Shipped (v1.0) | 2026-04 |
| 2. API Layer and Job Queue | 3/3 | Shipped (v1.0) | 2026-04 |
| 3. Frontend Core and 3D Visualization | 4/4 | Shipped (v1.0) | 2026-04 |
| 4. Advanced Viz and Parameter Controls | 3/3 | Shipped (v1.0) | 2026-04 |
| 5. Deployment and Public Access | 2/2 | Shipped (v1.0) | 2026-04-13 |
| 6. v1 Bug-Fix Sweep | 0/5 | Planned | — |
| 7. Corpus Sourcing Research Spike | 0/5 | Planned | — |
| 8. Corpus Expansion | 0/? | Not started (blocked on 6, 7) | — |
| 9. Classification Depth | 0/? | Not started (blocked on 8) | — |
| 10. Visual Polish | 0/? | Not started (blocked on 6–9) | — |

---

## Coverage Verification (v2.0)

**Requirements mapped:** 25 / 25 ✓
**Orphans:** 0 ✓
**Duplicates:** 0 ✓

| Requirement | Phase |
|---|---|
| BUG-01, BUG-02, BUG-03, BUG-04, BUG-05 | Phase 6 (5) |
| RES-01, RES-02, RES-03 | Phase 7 (3) |
| CEXP-01, CEXP-02, CEXP-03, CEXP-04, CEXP-05 | Phase 8 (5) |
| DEPTH-01, DEPTH-02, DEPTH-03, DEPTH-04, DEPTH-05, DEPTH-06, DEPTH-07 | Phase 9 (7) |
| POLISH-01, POLISH-02, POLISH-03, POLISH-04, POLISH-05 | Phase 10 (5) |

---

*v1.0 shipped: 2026-04-13*
*v2.0 roadmap drafted: 2026-05-22*
*Last updated: 2026-05-25 — Phase 7 planned (5 plans: 4 Wave 1 parallel + 1 Wave 2 assembly); Phase 6 shipped 2026-05-23*
