# Requirements: Literary Genre Topology

**Defined:** 2026-04-11
**Core Value:** A user uploads any book and sees where it lives in semantic space — and why the algorithm predicts the genre it does.

---

## v1.0 Requirements (Shipped 2026-04-13 · Archived 2026-05-24)

All 63 v1.0 requirements (VALID-01..03, PIPE-01..05, HOM-01..08, VIZ-01..11, TOPO-01..07, COMP-01/02, CLASS-01..05, PARAM-01..06, EXPLAIN-01, UX-01..05, CORPUS-01..04, INFRA-01..06) were delivered in phases 1-5. Detailed text + per-requirement status moved to [`milestones/v1.0-REQUIREMENTS.md`](milestones/v1.0-REQUIREMENTS.md). Traceability table below still indexes them.

**CORPUS-01 wording correction (2026-05-26, Phase 8 / D-34):** Earlier drafts of CORPUS-01 referenced the Phase-1 validation-spike subset rather than the shipped v1 corpus. v1 actually shipped with **10 genres × 10 books = 100 books** (commit `db7b1f8`, 2026-04-13). v2 expanded this to a target of **8 genres × 30 books = 240 books** per Proposal A; Phase 8.1's drop strategy filtered out unverifiable entries and the v2 corpus shipped to the `v2.0-data` Release is **154 verified-clean books (15–25 per genre)** — see [`phases/08.1-corpus-integrity-rebuild-fix-141-240-wrong-gid-bindings-in-c/08.1-01-SUMMARY.md`](phases/08.1-corpus-integrity-rebuild-fix-141-240-wrong-gid-bindings-in-c/08.1-01-SUMMARY.md).

### Validation Spike (archived)

- [x] **VALID-01**: CLI prototype trains Word2Vec, computes persistence images, runs permutation test confirming topology signal — see archive
- [x] **VALID-02**: CLI prototype validates weighted Vietoris-Rips filtration produces stable persistence diagrams — see archive
- [x] **VALID-03**: CLI prototype benchmarks Vietoris-Rips computation time vs. word count, establishes safe `max_words` cap — see archive

### Other v1.0 sections (archived)

Shared Pipeline (PIPE-01..05) · Classification Pipeline (HOM-01..08) · Visualization 3D Brightness Map (VIZ-01..11) · Visualization Topology Views (TOPO-01..07) · Genre Comparison (COMP-01..02) · Genre Classification (CLASS-01..05) · Parameter Controls (PARAM-01..06; PARAM-03..06 patched in v1.0.1) · Pipeline Explanation (EXPLAIN-01) · UX & Polish (UX-01..05) · Corpus & Data (CORPUS-01..04) · Infrastructure (INFRA-01..06)

See [`milestones/v1.0-REQUIREMENTS.md`](milestones/v1.0-REQUIREMENTS.md) for full requirement text and per-requirement archive notes. Traceability table at the bottom of this file still references all v1.0 IDs.

---

## v2.0 Requirements

**Milestone goal:** Improve classification accuracy via a better-sourced corpus, add explainability and top-N predictions, sweep v1 bugs, and round out the visual experience with theming and onboarding. See `.planning/research/SUMMARY.md` for the research that grounds these requirements.

### Bug-Fix Sweep (Phase 6)

- [x] **BUG-01**: System removes the H₂ UI tab, the H₂ settings toggle, and all backend `homology_dims=2` plumbing. Bonus cleanup: H₀ tab also removed (degenerate in weighted Vietoris-Rips — all components born at filtration time 0). UI ships H₁-only. H₂ deferred to v3; rationale recorded in PROJECT.md Key Decisions and CONTEXT.md `<domain>` block for Phase 6.
- [x] **BUG-02**: Persistence-diagram dots scale by sqrt(persistence) for finite points; H₀ infinite-persistence points use a dedicated marker so all classes are readable at any zoom level (`PITFALLS.md §10`).
- [x] **BUG-03**: BookSlider fetches book metadata from a new `GET /api/corpus/genres/{genre}/books` endpoint and lets the user slide through every book within the selected genre, with title + author + word count surfaced.
- [x] **BUG-04**: ROADMAP.md and STATE.md are restored as living planning documents; a pre-commit hook rejects 0-byte commits to `.planning/**/*.md` to prevent recurrence (`PITFALLS.md §15`).
- [x] **BUG-05**: Content-addressed `cache_key` includes `corpus_hash` and `w2v_model_sha256` so a corpus change or Word2Vec retrain forces a cache miss across all precomputed artifacts (latent v1 bug, must land before Phase 8 — `PITFALLS.md §1`).

### Corpus Sourcing Research Spike (Phase 7) — research-only, no implementation

- [x] **RES-01**: Produce `.planning/research/v2/CORPUS_SOURCING.md` selecting source(s) (Gutenberg / Open Library / HuggingFace datasets / Internet Archive), target book count per genre, target genre count, and per-genre author distribution constraints.
- [x] **RES-02**: Produce `.planning/research/v2/VALIDATION_PROTOCOL.md` defining a v1-frozen test set, `GroupKFold(groups=author)` cross-validation, macro-F1 as the headline metric, and permutation null hypothesis test (`PITFALLS.md §4–6`).
- [x] **RES-03**: Decide whether v2 adopts multi-label classification (recommendation: defer to v3); document decision and rationale in the sourcing doc.

### Corpus Expansion (Phase 8)

- [x] **CEXP-01**: `corpus/books.yaml` extended with `author` and `word_count` fields per book; new books added per Phase 7's `CORPUS_SOURCING.md` recommendation. **Validated (post-drop, 154-book corpus)** via Phase 8.1 — see `.planning/phases/08.1-corpus-integrity-rebuild-fix-141-240-wrong-gid-bindings-in-c/08.1-01-SUMMARY.md`. Note: v2.1 follow-up should investigate restoring the 86 dropped entries via authoritative author bibliographies + gutendex re-source.
- [x] **CEXP-02**: System retrains Word2Vec and SVM end-to-end on the expanded corpus; new model assets pushed to a versioned GitHub Release (`v2.0-data`).
- [x] **CEXP-03**: System evaluates the v2 model on the v1-frozen test set defined in `VALIDATION_PROTOCOL.md` and reports macro-F1, per-genre F1, and permutation p-value; v2 macro-F1 must exceed v1 baseline. **Validated (with anti-leakage disclaimer)** — v2 macro-F1 = 0.7367 (> v1 0.3235), permutation p = 0.0010; per-author smoke test failed (mean-gap 36.96pp >> 10pp threshold) triggering D-31 disclaimer path. See `results/v2_validation_report.md`.
- [ ] **CEXP-04**: System validates the expanded corpus with `GroupKFold(groups=author)` cross-validation; per-author held-out test confirms ≤15pp gap vs. LOOCV (`PITFALLS.md §5`). **Blocked** — GroupKFold mean macro-F1 = 0.2865 vs hold-out 0.7367 = 45.03pp gap >> 15pp threshold. See `results/v2_validation_report.md`. Wave 4 Release publish is conditionally gated per D-33.
- [x] **CEXP-05** *(P2)*: Reproducible `scripts/build_corpus.py` regenerates the corpus from source manifests for audit and reuse.

### Classification Depth (Phase 9)

- [x] **DEPTH-01**: System returns top-N (default N=3) ranked genre predictions with calibrated probabilities summing to 1 (via `SVC(probability=True)` Platt-scaled, or `CalibratedClassifierCV` if reliability diagram requires) (`PITFALLS.md §7`). **Validated (Phase 9 plan 09-01, 2026-05-27)** — `SVC(probability=True)` libsvm Platt wins Brier comparison (0.3459 vs 0.6041 for CalibratedCV); `svm_pipeline.joblib::predict_proba` returns (n, 8) sum-to-1 matrices; lineage extended with `calibration_method`, `calibration_brier_score`, `calibration_report`. See `results/v2_calibration_report.md` and `.planning/phases/09-classification-depth/09-01-SUMMARY.md`.
- [x] **DEPTH-02**: `ClassificationResult` renders top-N as honestly-labeled probability bars — no pie charts, no hidden low-confidence predictions.
- [x] **DEPTH-03**: "Why this genre?" expander on `ClassificationResult` calls `POST /api/classify/{job_id}/explain` (synchronous ~200ms, Redis-cached `explain:{feature_vec_hash}` TTL 1h) and renders the explainability payload.
- [x] **DEPTH-04**: Explainability response includes the 3–5 nearest training books with Euclidean distance in the L2-normalized feature space.
- [x] **DEPTH-05**: Explainability response includes per-track contribution (topology vs vocabulary) as percentages summing to 100, computed via `permutation_importance` per slab (`PITFALLS.md §9`).
- [x] **DEPTH-06** *(P2)*: Explainability response includes a TF-IDF-driven "driving words" list with explicit "proxy, not literal classifier inputs" disclosure.
- [x] **DEPTH-07** *(P2)*: Top-N display includes an entropy / uncertainty badge for ambiguous predictions.

### Visual Polish (Phase 10)

- [x] **POLISH-01**: User can toggle between light / dark / system themes; choice persists across sessions via a new `preferencesStore` with Zustand `persist` middleware (separate from session-scoped `visualizationStore`).
- [x] **POLISH-02**: R3F scatter scene background, HoverTooltip, persistence diagrams, and all sidebar/topology/compare components honor the selected theme. Scene background updates imperatively via `scene.background` (no canvas remount — `PITFALLS.md §13`).
- [x] **POLISH-03**: First-load detection presents a 3–5 step onboarding tour anchored on stable `data-tour-id` selectors (centralised in `src/tour/anchors.ts`); skippable and replayable from a Help menu (`PITFALLS.md §14`).
- [x] **POLISH-04**: Tour steps cover scatter exploration, genre selection + brightness, upload + classification flow, and the topology tab — NOT the underlying mathematics (that remains in "How It Works").
- [x] **POLISH-05**: Empty states polished for the upload zone (pre-upload), comparison mode (no genres selected), classification failure, and the explanation panel (no upload yet).

### Onboarding & Theme Defaults (Phase 11)

- [x] **ONBOARD-01**: Default theme is **light** for new users (first paint light, no dark flash); reverses the Phase 3 / D-58 dark-default lock. Persisted users keep their stored choice; `system` and `dark` remain selectable.
- [x] **ONBOARD-02**: On first visit — or the first visit in ≥30 days — the "How It Works" walkthrough auto-opens, then on its close the 4-step onboarding tour starts automatically. Re-trigger is gated by a persisted `introSeenAt` timestamp (localStorage via `preferencesStore` persist). The tour no longer auto-starts independently (reverses D-73); it fires via this chain or the manual "Replay tour" Help item.
- [x] **ONBOARD-03**: Dismissing "How It Works" early (X / Esc / outside-click) still chains into the tour during the auto-intro; manually opening "How It Works" from the nav does NOT chain into the tour.

### The Reading Room — full front-end redesign (Phase 12)

> Wholesale editorial reskin + restructure. **Reuses the existing data layer/hooks unchanged** (`useScatterData`, `useCorpusBooks`, `useClassify`, `useExplain`, `useVRData`, `usePersistenceDiagram`, `usePersistenceImage`). **Supersedes** the Phase 10 indigo theme (POLISH-01/02) and the Phase 11 onboarding chain (ONBOARD-01..03): light/dark/system → paper/accent/density Tweaks; How-It-Works→tour chain → the Guide side-sheet + 6-stop guided tour. Phase 10/11 stay historically "met"; their UI is replaced. Spec: `.planning/phases/12-reading-room-redesign/design_handoff/.../README.md` (authoritative).

- [x] **RR-01**: Editorial design system + app shell — Spectral + JetBrains Mono type scale, 4 paper palettes + 4 accents + 8 genre hexes (tokens.md) as CSS custom properties, masthead nav (5 items + Guide), footer, footnote host, and a Tweaks panel (paper/accent/density) persisted to localStorage. Replaces the Phase 10 `index.css` indigo system wholesale.
- [x] **RR-02**: Collection screen — 3-column carrel (catalog rail / plate / marginalia, collapsing to 2-col study density), region filter, "Find" search, hover→marginalia + tooltip, click→catalog card. Plate uses the **reskinned existing R3F scatter** (deviation from handoff L-12 SVG, per user decision) with reading-room framing + corner rulings + projection chips + 2D/3D.
- [x] **RR-03**: Catalog card screen — breadcrumb, region-siblings rail, plate detail with dashed leader lines to the 4 nearest, and the letterpress catalog card aside (shelfmark, key/value grid, driving vocabulary chips, five-nearest list). On `useCorpusBooks` + `useExplain`.
- [x] **RR-04**: Comparative Study folio — two genre pickers, 3-column folio (region A / shared Venn motif / region B), shared vs distinctive vocabulary, Editor's note.
- [x] **RR-05**: Submit a Text → The Reading — reading-desk textarea + sample passages on `useClassify`/`useExplain`; verdict essay (verdict, confidence with "marginal" voice rule, probability bars, catalog card for the text, where-it-landed mini-plate, nearest five).
- [x] **RR-06**: Topology screen, reading-room skin — hero VR filtration viewer (existing R3F `VRViewer`) + ε slider, persistence diagram + persistence image side column; H₁ only; ε links all three; accent (not amber) for the ε signal, genre-hex heatmap ramp. Built on the existing topology components + hooks.
- [x] **RR-07**: About + the Guide — About prose; Guide right side-sheet (Welcome / How to wander / How it works) auto-opening once per browser (localStorage `rr.guide.seen.v1`), with the 5 live "How it works" method figures rendered at rest (background-tab safe).
- [x] **RR-08**: The guided tour — 6 stops navigating the real screens (plate, catalog rail, catalog card, topology plate [pre-selects a region], study pickers, reading desk) with reading-room spotlight (four dim panels + accent frame) and a margin card; ←/→/Esc; missing-anchor → wait then advance. Extends `tour/anchors.ts`.
- [x] **RR-09**: Responsive + animation-robustness pass — fluid editorial grids collapsing at ~1100px (drop marginalia/rail) and ~768px (single column), Guide full-width on narrow, tour card clamped; every "alive" figure degrades to a valid static frame when the timeline is paused.

---

## v2.1 Carry-over (deferred at v2.0 close, 2026-05-30)

Items that travelled out of v2.0 as documented caveats, not phase gaps — the v2.0 phases shipped their deliverables. Re-evaluate at the start of v2.1.

- [ ] **V21-01 — Author-leakage gap (from CEXP-04, BLOCKED):** GroupKFold-by-author mean macro-F1 = 0.2865 vs hold-out 0.7367 (45pp gap >> 15pp threshold). Shipped with the D-31 public disclaimer. Candidates: max-N-per-author corpus cap, or per-author held-out fine-tuning. See `results/v2_validation_report.md`.
- [ ] **V21-02 — α weight miscalibrated for the v2 corpus:** LOOCV (2026-05-30) on the 151-book corpus shows location-only (α=0) = 0.7682 acc, shipped 70/30 (α=0.7) = 0.6887, topology-only (α=1) = 0.2053. The topology track is near chance and α=0.7 underperforms location-only by ~8pp. The 0.7 default was tuned on the v1 corpus. Action: re-sweep α on the v2 hold-out macro-F1 protocol (cached features, fast) and re-fit; likely a much lower α. See `TECHNICAL.md §5`.
- [ ] **V21-03 — Phase 9 human UAT outstanding:** 7 items in `.planning/phases/09-classification-depth/09-HUMAN-UAT.md` remain `partial` (live browser walkthrough never done; automated verification passed). Run `/gsd-verify-work 9`.
- [ ] **V21-04 — Per-book persistence not fully cached:** per-genre persistence is precomputed for all 8 regions; per-book persistence is missing for ~6/25 sampled books. The Topology tab is region-keyed as a result. Precompute per-book persistence if a per-book topology view is ever wanted.

---

## Future Work (Parking Lot)

Captured during v1 planning; deferred from v2.0 scope. Re-evaluate at v3 boundary.

### Advanced Sharing & Collaboration
- **SHARE-01**: Shareable URLs encode current view state (selected genre, projection method, parameter values) so users can share specific visualizations
- **SHARE-02**: Bookmarking of parameter configurations with user-defined labels

### Extended Topology
- **EXT-01**: H₃ and higher-dimensional homology (deferred — feasibility unclear at typical word counts; `FEATURES.md §1` argues hard-cap at maxdim=2)
- **EXT-02**: Mapper algorithm as alternative topological representation (complement to Rips filtration)

### Advanced Corpus Management
- **CORP-01**: User can define custom genre labels for their uploaded books and add them to the classification pool
- **CORP-02**: Batch upload of multiple books at once

### Additional Polish
- **POL-01**: Nearest neighbors panel (click a word → see N nearest words in embedding space ranked by cosine similarity) — partially absorbed by DEPTH-04 nearest-training-books explainability
- **POL-02**: Mobile-responsive read-only view (simplified, no 3D interaction; "best on desktop" prompt)
- **POL-03**: Keyboard shortcut cheat sheet (overlay triggered by ?)

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Per-book Word2Vec models | Breaks the shared embedding space mathematical invariant — all semantic comparisons require identical coordinate systems |
| PDF or EPUB parsing | Format extraction is a separate problem domain; dirty text corrupts tokenization invisibly. Accept .txt only. |
| User accounts / authentication | Adds infrastructure complexity with no value for a stateless exploration tool; kills casual adoption |
| Server-side session persistence | Fragile at scale; all UI state lives client-side, server is stateless compute |
| Custom user-uploaded Word2Vec models | Dimension/vocabulary mismatches cause silent failures; one shared model trained on bundled corpus |
| Non-English corpora | Stopword lists, tokenization, and Word2Vec training assumptions are English-centric |
| Mobile-native 3D interaction | Interactive 3D WebGL is a poor mobile experience; desktop-targeted with basic tablet read-only |
| Real-time recomputation on every slider pixel | Would make the app unusable; tiered computation model with debounce and explicit triggers |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VALID-01 | Phase 1 | Validated |
| VALID-02 | Phase 1 | Validated |
| VALID-03 | Phase 1 | Validated |
| PIPE-01 | Phase 1 | Validated |
| PIPE-02 | Phase 1 | Validated |
| PIPE-03 | Phase 1 | Validated |
| PIPE-04 | Phase 1 | Validated |
| PIPE-05 | Phase 1 | Validated |
| HOM-01 | Phase 1 | Validated |
| HOM-02 | Phase 1 | Validated |
| HOM-03 | Phase 1 | Validated |
| HOM-04 | Phase 1 | Validated |
| HOM-05 | Phase 1 | Validated |
| HOM-06 | Phase 1 | Validated |
| HOM-07 | Phase 1 | Validated |
| HOM-08 | Phase 1 | Validated |
| CORPUS-01 | Phase 1 | Validated |
| CORPUS-03 | Phase 1 | Validated |
| CORPUS-04 | Phase 1 | Validated |
| INFRA-01 | Phase 2 | Validated |
| INFRA-02 | Phase 2 | Validated |
| INFRA-03 | Phase 2 | Validated |
| CORPUS-02 | Phase 2 | Validated |
| CLASS-01 | Phase 2 | Validated |
| CLASS-02 | Phase 2 | Validated |
| CLASS-04 | Phase 2 | Validated |
| CLASS-05 | Phase 2 | Validated |
| UX-01 | Phase 2 | Validated |
| UX-02 | Phase 2 | Validated |
| INFRA-04 | Phase 3 | Validated |
| VIZ-01 | Phase 3 | Validated |
| VIZ-02 | Phase 3 | Validated |
| VIZ-03 | Phase 3 | Validated |
| VIZ-04 | Phase 3 | Validated |
| VIZ-05 | Phase 3 | Validated |
| VIZ-06 | Phase 3 | Validated |
| VIZ-07 | Phase 3 | Validated |
| VIZ-08 | Phase 3 | Validated |
| VIZ-09 | Phase 3 | Validated |
| VIZ-10 | Phase 3 | Validated |
| VIZ-11 | Phase 3 | Validated |
| CLASS-03 | Phase 3 | Validated |
| PARAM-01 | Phase 3 | Validated |
| PARAM-02 | Phase 3 | Validated |
| UX-04 | Phase 3 | Validated |
| TOPO-01 | Phase 4 | Validated |
| TOPO-02 | Phase 4 | Validated |
| TOPO-03 | Phase 4 | Validated |
| TOPO-04 | Phase 4 | Validated |
| TOPO-05 | Phase 4 | Validated |
| TOPO-06 | Phase 4 | Validated |
| TOPO-07 | Phase 4 | Validated |
| COMP-01 | Phase 4 | Validated |
| COMP-02 | Phase 4 | Validated |
| PARAM-03 | Phase 4 | Validated |
| PARAM-04 | Phase 4 | Validated |
| PARAM-05 | Phase 4 | Validated |
| PARAM-06 | Phase 4 | Validated |
| EXPLAIN-01 | Phase 4 | Validated |
| UX-03 | Phase 4 | Validated |
| UX-05 | Phase 4 | Validated |
| INFRA-05 | Phase 5 | Validated |
| INFRA-06 | Phase 5 | Validated |
| BUG-01 | Phase 6 | Pending |
| BUG-02 | Phase 6 | Pending |
| BUG-03 | Phase 6 | Pending |
| BUG-04 | Phase 6 | Pending |
| BUG-05 | Phase 6 | Pending |
| RES-01 | Phase 7 | Pending |
| RES-02 | Phase 7 | Pending |
| RES-03 | Phase 7 | Pending |
| CEXP-01 | Phase 8 | Validated (post-drop, 154-book corpus) |
| CEXP-02 | Phase 8 | Validated |
| CEXP-03 | Phase 8 | Validated (with anti-leakage disclaimer — see results/v2_validation_report.md) |
| CEXP-04 | Phase 8 | Blocked (see results/v2_validation_report.md) |
| CEXP-05 | Phase 8 | Validated |
| DEPTH-01 | Phase 9 | Validated (plan 09-01, 2026-05-27) |
| DEPTH-02 | Phase 9 | Complete |
| DEPTH-03 | Phase 9 | Complete |
| DEPTH-04 | Phase 9 | Complete |
| DEPTH-05 | Phase 9 | Complete |
| DEPTH-06 | Phase 9 | Complete |
| DEPTH-07 | Phase 9 | Complete |
| POLISH-01 | Phase 10 | Complete |
| POLISH-02 | Phase 10 | Complete |
| POLISH-03 | Phase 10 | Complete |
| POLISH-04 | Phase 10 | Complete |
| POLISH-05 | Phase 10 | Complete |
| ONBOARD-01 | Phase 11 | Complete |
| ONBOARD-02 | Phase 11 | Complete |
| ONBOARD-03 | Phase 11 | Complete |
| RR-01 | Phase 12 | Complete |
| RR-02 | Phase 12 | Complete |
| RR-03 | Phase 12 | Complete |
| RR-04 | Phase 12 | Complete |
| RR-05 | Phase 12 | Complete |
| RR-06 | Phase 12 | Complete |
| RR-07 | Phase 12 | Complete |
| RR-08 | Phase 12 | Complete |
| RR-09 | Phase 12 | Complete |

**Coverage:**
- v1.0 requirements: 63 total — all Validated (shipped 2026-04-13)
- v2.0 requirements: 28 total (23 must-ship + 5 P2) — all mapped to Phases 6–11, all Complete/Validated
- v2.0 reading-room redesign: 9 total (RR-01..RR-09) — all mapped to Phase 12, all Complete
- Unmapped: 0

---
*v1 requirements defined: 2026-04-11 — validated 2026-04-13*
*v2 requirements defined: 2026-05-22*
*Last updated: 2026-05-29 — Phase 12 (RR-01..RR-09) appended to traceability and marked Complete (RR-09 closes the phase)*
