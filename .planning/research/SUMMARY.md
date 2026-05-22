# Project Research Summary — v2.0

**Project:** Literary Genre Topology
**Milestone:** v2.0 — Accuracy, Depth, and Polish (additive to v1.0 shipped 2026-04-13)
**Domain:** Computational literary analysis (TDA + NLP) on a deployed FastAPI + arq/Redis + React/R3F stack
**Researched:** 2026-05-22
**Confidence:** HIGH (integration paths, stack additions, top-N, dark mode) / MEDIUM (kernel-SVM explainability, H₂ interpretive value, corpus sourcing)

## Executive Summary

v2.0 is **additive polish on a shipped app**, not a green-field build. The four research files agree on a tight scope: (1) close the v1 carry-over loop (H₂, persistence-diagram readability, BookSlider stub, restored ROADMAP/STATE), (2) raise corpus quality through a research-gated expansion, (3) turn the single-genre prediction into a top-N + "why this genre" experience, and (4) finish the visual layer (dark mode, onboarding, empty states). Every recommendation maps to a specific file in the existing v1 codebase — see `ARCHITECTURE.md §2-3` for the file-level matrix.

The recommended approach is **conservative on stack** (one Python dep `shap==0.51.0`, one frontend dep `react-joyride@^3.1.0`, plus already-installed sklearn helpers — `STACK.md §"Core Additions"`) and **disciplined on validation** (lock a v1-frozen test set before retraining, GroupKFold by author, macro-F1 as the headline metric — `PITFALLS.md §4-6`). The headline risk is correctness, not engineering: a Word2Vec retrain rotates the embedding space and silently invalidates every cached artifact (`PITFALLS.md §1`), and author overlap in Project Gutenberg expansion can produce 95% LOOCV that collapses to 60% on real uploads (`PITFALLS.md §5`). Both are mitigated by Phase 7 (validation protocol) + Phase 8 (cache-key hashing, GroupKFold).

The most opinionated cross-file finding is **"H₂ is visualisation-only in v2, not a feature-vector input"** (`ARCHITECTURE.md §5a` + `PITFALLS.md §3`) — engineering cost (cache invalidation, runtime cliff) plus empirical risk (empty diagrams add 400 noise dimensions) outweigh any accuracy gain at this corpus size. Pair this with **"kernel-SVM explainability uses nearest-neighbour + per-track decomposition, not Kernel SHAP synchronously"** (`ARCHITECTURE.md §5b` + `PITFALLS.md §8`) and **"dark mode lands last because it's a horizontal concern touching ~30 components"** (`ARCHITECTURE.md §6` + `FEATURES.md §4a`) and you have the spine of the build order.

## Key Findings

### Recommended Stack Additions

See `STACK.md §"Core Additions"` and `§"Supporting Libraries"` for the full list. Only two new installs across backend and frontend.

**Must add (pin in lockfiles):**
- **`shap==0.51.0`** (Python, Mar 2026) — `KernelExplainer` for "why this genre" local explanations, gated behind background-job pattern. MEDIUM confidence (known slow on RBF SVM).
- **`react-joyride@^3.1.0`** (npm, May 2026, MIT) — onboarding tour with Floating UI; confirmed React 18 + Vite 6 compatible. *Alternative:* hand-rolled overlay (`ARCHITECTURE.md §5d` argues this is cheaper for 5–8 steps) — **Phase 10 plan author picks one**.

**Already-installed sklearn helpers (newly used, no install):**
- `CalibratedClassifierCV(method='sigmoid', cv=LeaveOneOut())` — wrap `SVC(probability=True)` if Phase 9 reliability diagrams show saturated probabilities
- `permutation_importance` per-track, not per-dim (`PITFALLS.md §9`)
- `NearestNeighbors(metric='cosine')` — primary local explanation

**Parameter changes (no new deps):**
- `ripser(maxdim=2)` — 1-line change in `backend/pipeline/homology.py` behind a feature flag with `epsilon_max` at P75 of pairwise distances, **not P95** (`PITFALLS.md §2`)
- Tailwind v4 `@custom-variant dark` in `frontend/src/index.css` — class-strategy dark mode without `next-themes`

**Conditional adds (Phase 7 decides):**
- `datasets>=3.0` — only if Phase 7 picks an HF-hosted corpus (`TheBritishLibrary/blbooksgenre` cross-join with Gutenberg)
- `internetarchive>=3.5` — documented escape hatch only

**Anti-recommendations (`STACK.md §"What NOT to Use"`):** `next-themes`, any new state-management library, any new chart library, `tslearn`/`tda-tools`, migrating off Railway/SSE, `lime` alongside `shap`, `pandas` for v2.

### Features — Categorised

Full categorisation: `FEATURES.md §"v2.0 MVP Definition"` and `§"Prioritisation Matrix"`. Distilled:

**Table Stakes (P1 — must ship):**
- H₂ homology computed + exposed (UI advertises a broken tab)
- Persistence-diagram dot scaling fix (currently illegible)
- BookSlider wired to corpus metadata endpoint (v1 differentiator currently dead)
- Restored ROADMAP.md + STATE.md (GSD workflow dependency)
- Expanded corpus with documented sourcing + v1 baseline preserved
- Top-N ranked predictions with **calibrated** probability bars (sum to 1, honestly labelled)
- Nearest-neighbour explainability panel ("closest training books")
- Dark mode (system + manual + persisted, R3F scene follows theme)
- 3–5 step onboarding tour, skippable + re-triggerable, anchors centralised
- Empty-state polish (upload, comparison, failed classification, no-explanation)

**Differentiators (P2 — ship if time):**
- Reproducible `scripts/build_corpus.py` (defensibility)
- TF-IDF-driven driving-words highlight with honest "proxy, not strict SHAP" disclosure
- Feature-track decomposition ("topology X% / vocabulary Y%") — unique to this app
- "Show me an example" button on upload empty state
- Entropy/uncertainty badge alongside top-N

**Anti-features (do NOT build):**
- Adding H₃/H₄ — intractable + uninterpretable, hard-cap at maxdim=2
- Putting H₂ into the SVM feature vector in v2 — 400 noise dimensions
- Recomputing v1 caches just to fix dot scaling — pure frontend
- Shipping BookCorpus or scraping Goodreads — licensing + ethical
- LLM auto-labelling the corpus — circular benchmark
- Pie chart of predictions / hiding low-confidence predictions
- Claiming probabilities from raw `decision_function` — correctness bug
- Black-box LIME/SHAP on tokens — SVM consumes engineered features
- Pure-black background + inverted light palette
- 7+ step tour / forced tour / tour explaining math instead of UI
- AI-generated empty-state placeholder content
- Multi-label classification, non-English corpora, counterfactual explanations — defer to v3

### Architecture Approach

v2 is **additive integration** on the v1 layer cake — no new layers, no replaced layers. `ARCHITECTURE.md §1` catalogues existing touchpoints; `§2` is the feature-to-file matrix; `§10` is the per-phase file checklist.

**Backend extensions:**
1. `backend/pipeline/homology.py` — `homology_dims` includes 2 behind config flag with timeout + tightened `thresh`
2. `backend/pipeline/classify.py` — return calibrated `predict_proba` ranking
3. **NEW** `backend/pipeline/explain.py` — per-track permutation importance + `NearestNeighbors` + cluster-contribution decomposition (recommendation: option (c) from `ARCHITECTURE.md §11`)
4. **NEW** `GET /api/corpus/genres/{genre}/books` — richer per-book metadata backing BookSlider
5. **NEW** `POST /api/classify/{job_id}/explain` — synchronous (~100–300ms), Redis-cached at `explain:{feature_vec_hash}` TTL 1h
6. **Cache-key correction** — `corpus_hash` (sha256 of `books.yaml`) and `w2v_model_sha256` enter every disk cache_key site

**Frontend extensions:**
1. **NEW** `preferencesStore.ts` with Zustand `persist` — separate from session-scoped `visualizationStore`
2. **NEW** `ClassificationExplain.tsx` + `TopNList.tsx` mounted in existing `ClassificationResult.tsx`; React Query hook `useExplain.ts`
3. **NEW** `Tour.tsx` + `tourSteps.ts` + centralised `data-tour-id` anchors in `src/tour/anchors.ts` + Playwright smoke test
4. **MODIFY ~30 components** to swap inline hex for `var(--background)` / `var(--card)` — v1 `index.css` already defines HSL variables (lines 4–25)
5. **R3F scene background** threaded via Zustand → imperative material/scene update (never canvas remount)

**Critical architecture-driven ordering:**
- `cache_key` must include `corpus_hash` BEFORE Phase 8 retrains — land in Phase 6 alongside BookSlider work
- H₂ goes into precompute only, never the live upload path
- Dark mode AFTER Phase 9 (horizontal concern)

### Critical Pitfalls — Top 8 with Phase Ownership

Full catalogue in `PITFALLS.md`. By phase:

| # | Pitfall | Owning Phase | Verification gate |
|---|---|---|---|
| 1 | **W2V retrain rotates the embedding space** — every cached artifact becomes coordinate-mismatched. Cache keys hash by params, not model identity. | **Phase 8** (engineering task #1 before any new books added) | Cache key tests include `w2v_model_sha256` + `corpus_hash`; smoke test "old cache + new model = cache miss" |
| 2 | **H₂ O(n⁴) runtime cliff** — `maxdim=2` local-geometry-dependent; single book can pin a worker for minutes. | **Phase 6** | `scripts/bench_h2.py` on every bundled book, P95 < 30s; 60s worker timeout returns `H2Unavailable`; dedicated queue `max_concurrent=1` |
| 3 | **Empty H₂ diagrams are the common case, not an error** — sparse high-D clouds rarely contain voids. | **Phase 6** | Fixture test with 50-point cloud → all-zero persistence image; UI copy honest, not "✓ All clean" |
| 4 | **Comparing v2 accuracy to v1 without held-out test set** — LOOCV on different corpora is not subtractable. | **Phase 7** (define) + **Phase 8** (execute) | `VALIDATION_PROTOCOL.md` mandates v1-frozen 15-book test set; macro-F1 headline; permutation null |
| 5 | **Author overlap leakage** — more H.G. Wells / Poe / Austen drives LOOCV to 95%, real uploads to 60%. | **Phase 7** + **Phase 8** | `GroupKFold(groups=author)` in `06_validate.py`; per-author held-out test ≤15pp gap |
| 6 | **`decision_function` mislabeled as confidence** — margins unbounded, can be negative, don't sum to 1. | **Phase 9** | Unit test: top-N sums to 1; SVM retrained end-to-end with `probability=True` |
| 7 | **SHAP Kernel Explainer synchronous on RBF SVM** — 30–120s per explanation. | **Phase 9** | "Why?" is async/queued or uses NN-only path; <5s; cached per `(feature_vec_hash, model_hash)` |
| 8 | **Persistence-diagram dot scaling breaks H₀ infinite persistence** — naive `size = k*(death-birth)` blows up on `np.inf`. | **Phase 6** | Snapshot test; `np.isinf(deaths)` filtered to dedicated marker; sqrt/log scale for finite dots |

Three additional moderate pitfalls:
- **ROADMAP/STATE wiped again (`PITFALLS.md §15`)** — Phase 6: pre-commit hook rejecting 0-byte planning files + `.gitattributes` for `.planning/**/*.md`
- **BookSlider metadata becoming a JSON dump (`PITFALLS.md §12`)** — Phase 6: schema `{id, title, author, genre, word_count, top_10_tfidf_words}` only; <2KB per book; `staleTime: Infinity`
- **Tour breaks on DOM change (`PITFALLS.md §14`)** — Phase 10: centralised anchors + Playwright smoke test

Mathematical-invariant pitfalls cross-check all four PROJECT.md invariants and find no architectural violations — but flag temptations (fitting IDF within each genre would label-leak; concatenating H₂ track pre-normalisation would shift α silently).

## Implications for Roadmap

Build order is dictated by **cache-invalidation cascades** (Phase 8 retrain bumps every key — fix cache_keys in Phase 6; ship explainability after final SVM in Phase 9) and **horizontal-concern timing** (Phase 10 last).

### Phase 6: v1 Bug-Fix Sweep

**Rationale:** H₂ tab, BookSlider, persistence-diagram dot scaling, empty ROADMAP/STATE are all currently visible as broken. Closing them is the cheapest signal-of-quality work in v2. **Also lands the cache-key correction** so Phase 8 doesn't have to engineer a cache migration mid-retrain.
**Delivers:** H₂ heatmap tab populated (precompute only, hard timeout, dedicated queue); persistence-diagram dots scaled by sqrt(persistence) with infinity dots on dedicated marker; BookSlider wired via `GET /api/corpus/genres/{genre}/books`; ROADMAP.md/STATE.md restored + pre-commit hook prevents future 0-byte commits; `cache_key` includes `corpus_hash` everywhere.
**Avoids:** `PITFALLS.md §2, §3, §10, §12, §15`.

### Phase 7: Corpus Sourcing Research Spike

**Rationale:** User explicitly gated corpus expansion on research. **Research-output phase**, not engineering.
**Delivers:** `.planning/research/v2/CORPUS_SOURCING.md` with chosen sources, per-genre target book count (hard constraint), per-genre author distribution audit, `VALIDATION_PROTOCOL.md` (v1-frozen test set + GroupKFold + macro-F1 + permutation test), multi-label decision (recommendation: defer to v3), preprocessing parity check.
**Avoids:** `PITFALLS.md §4, §5, §6`.

### Phase 8: Corpus Expansion

**Rationale:** Phase 7's recommendation drives this. **Before Phase 9** because retraining the SVM invalidates every cached explanation and top-N artifact.
**Delivers:** updated `corpus/books.yaml` (with `author` + `word_count`); raw text in `data/raw/`; full pipeline rerun; reproducible `scripts/build_corpus.py` (P2); GroupKFold-by-author LOOCV results; v1-frozen test-set evaluation; permutation null; per-genre F1; new models pushed to GitHub Release.
**Avoids:** `PITFALLS.md §1, §4, §5, §6, §11`.

### Phase 9: Classification Depth

**Rationale:** Top-N + explainability are the most-visible classifier upgrade. Built on the **final** SVM from Phase 8. Explainability technique recommendation: **option (c) from `ARCHITECTURE.md §11`** — nearest-training-books + per-track contribution + cluster-attribution. **No synchronous Kernel SHAP**.
**Delivers:** `SVC` retrained with `probability=True` end-to-end; `CalibratedClassifierCV(method='sigmoid', cv=LeaveOneOut())` if reliability diagram requires; `TopNList.tsx` (calibrated bars, sum to 1); `ClassificationExplain.tsx` (nearest-training-books + driving-words pills + topology-vs-vocabulary decomposition); `POST /api/classify/{job_id}/explain` (synchronous ~200ms, Redis-cached); honest disclosure copy.
**Avoids:** `PITFALLS.md §7, §8, §9`.

### Phase 10: Visual Polish

**Rationale:** Horizontal concern. Doing it after Phases 6–9 means one sweep instead of dark-mode-aware components in every phase.
**Delivers:** `preferencesStore.ts` (theme: light/dark/system + `hasSeenTour`); light-theme override block in `index.css`; ~30 component sweeps; R3F `ScatterCanvas.tsx` reads theme from store, sets `scene.background` imperatively (no canvas remount); 4-step onboarding tour anchored on `data-tour-id` constants in `src/tour/anchors.ts`; Playwright smoke test in CI; "Show me an example" button (P2); empty-state polish.
**Avoids:** `PITFALLS.md §13, §14`.

### Phase Ordering Rationale

- **Phase 6 before Phase 8** — `cache_key` correction lands in Phase 6 to prevent Phase 8 serving stale data
- **Phase 7 before Phase 8** (hard) — user-mandated research gate; `PITFALLS.md §4–6` require `VALIDATION_PROTOCOL.md` before retrain
- **Phase 8 before Phase 9** — top-N calibration and NN explanations bind to the SVM + feature matrix
- **Phase 10 last** — dark mode horizontal across ~30 components; tour anchors target final UI
- **Within Phase 6, BookSlider before H₂** — smallest end-to-end new-endpoint integration proves the pattern

### Research Flags

**Phases likely needing additional `/gsd-research-phase`:**
- **Phase 7** — the phase IS research. No additional spike needed.
- **Phase 9 (explainability technique)** — validate per-track permutation importance + cluster-contribution heuristic on the post-Phase-8 feature matrix; decide SHAP yes/no
- **Phase 9 (calibration choice)** — reliability diagram on Phase 8 corpus decides Platt vs `CalibratedClassifierCV` sigmoid LOOCV

**Phases with standard patterns (skip research):**
- **Phase 6** — every fix has file-level references in `ARCHITECTURE.md §10`
- **Phase 8** — corpus expansion mechanics canonical; methodology settled in Phase 7
- **Phase 10** — patterns exhaustively covered; only open call is `react-joyride` vs hand-rolled

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Two new installs; both with current docs verified. SHAP-on-RBF MEDIUM but mitigated via NN-first recommendation. |
| Features | **MEDIUM-HIGH** | Table Stakes / Anti-features confident; H₂ interpretive value MEDIUM and empirical — kept viz-only per `ARCHITECTURE.md §5a`. Corpus sourcing depends on Phase 7. |
| Architecture | **HIGH** | Every integration point cited to a real file. Critical latent bug (`cache_key` missing `corpus_hash`) surfaced. Build order dictated by hard dependencies. |
| Pitfalls | **HIGH** | Verified against sklearn calibration docs, SHAP repo issue #3747, ripser maxdim semantics, v1 PITFALLS, current 2026 best-practice writeups. |

**Overall confidence: HIGH** with one explicit MEDIUM area (kernel-SVM explainability) handled by deferring SHAP and recommending NN-first.

### Gaps to Address

1. **Phase 7 corpus sourcing decision** — Gutenberg + Open Library cross-reference vs HF `blbooksgenre`: research output drives this
2. **Phase 9 explainability technique commitment** — recommendation is option (c) from `ARCHITECTURE.md §11`; validate on Phase 8's actual feature matrix
3. **Phase 9 calibration empirical check** — `SVC(probability=True)` Platt vs `CalibratedClassifierCV` sigmoid LOOCV — reliability diagram decides
4. **Phase 10 tour library decision** — `react-joyride@^3.1.0` vs hand-rolled — bundle-size vs maintenance tradeoff
5. **Author + word_count source for BookSlider metadata** — hand-edited or script-generated from Gutenberg metadata
6. **Top-N configurable from UI?** — recommendation hardcode N=3; expose only on demand
7. **System dark-mode default** — `prefers-color-scheme: dark` for `'system'`

## Sources

### Primary (HIGH confidence)
- v1 codebase — every file path in `ARCHITECTURE.md` was read and confirmed; cache-key bug verified in `backend/api/routes/corpus.py` lines 46–51
- scikit-learn 1.8 official docs — `SVC`, `CalibratedClassifierCV`, `permutation_importance`, `NearestNeighbors`, calibration guide
- ripser PyPI + scikit-tda docs — `maxdim` semantics for H₂
- Tailwind v4 official docs — `@custom-variant dark` selector forms
- react-joyride npm + GitHub discussions — v3.1.0 release, React 18 + Vite 6 compatibility
- SHAP official docs — `KernelExplainer` Iris + RBF SVC example; v0.51.0 release notes
- SHAP repo issue #3747 — known slowness on RBF SVM kernel
- Carbon Design System + SAP Fiori — empty-state patterns
- Mike Gold R3F dark-mode walkthrough — `<color attach="background">` + theme threading
- Project Gutenberg + Open Library data-dumps documentation — bulk-access channels

### Secondary (MEDIUM confidence)
- Hugging Face `TheBritishLibrary/blbooksgenre` and `agentlans/literary-genre-examples` — fit-for-purpose not validated; Phase 7 must evaluate
- arXiv 2002.10199 — LOOCV calibration rationale
- arXiv 2305.02012 — SHAP/LIME limitations on small RBF-SVM datasets
- arXiv 2212.00086 — kNN-style retrieval over kernel SVM as ante-hoc explanation
- arXiv 2411.10298 — H₂ interpretive value context
- 2026 onboarding best-practice writeups — completion stats; tour-library licence comparison
- Procrustes alignment gist (gensim Word2Vec) — for v1-vs-v2 comparison only; NOT for production

### Tertiary (LOW confidence)
- `internetarchive>=3.5` SDK — current API stability and 2026 rate limits unverified
- Per-feature permutation-importance on RBF SVM — literature consensus is per-track/per-aggregate, not per-dim
- Exact magnitude of W2V rotation as a function of new-book count — analytic argument correct; magnitude unmeasured (handled by treating retrain as hard cache bust regardless)

### Detailed sources
See `STACK.md §"Sources"`, `FEATURES.md §"Sources"`, `ARCHITECTURE.md` (inline file refs), `PITFALLS.md §"Sources"`.
