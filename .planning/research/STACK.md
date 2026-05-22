# Stack Research — v2.0 Additions

**Domain:** Literary genre topology web app (v2.0 milestone)
**Researched:** 2026-05-22
**Confidence:** HIGH (most additions) / MEDIUM (corpus sources, SHAP for kernel SVM)

> This document covers **only** stack additions/changes for v2.0 features. The v1.0 stack (FastAPI, arq+Redis, gensim, scikit-learn, ripser, persim, React 18, R3F 8, Three.js, Zustand, React Query, Tailwind v4, Vite, Railway) is unchanged unless explicitly noted. See `.planning/research/v1/STACK.md` for v1 rationale.

---

## Recommended Stack — v2 Additions

### Core Additions (must add)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **shap** | `0.51.0` (Mar 2026) | "Why this genre" explainability via `KernelExplainer` over the engineered feature vector (persistence images + cluster distributions) | Model-agnostic, works with `SVC(probability=True).predict_proba`, has an established example for RBF SVC, and is the de-facto standard for ML explainability. Permutation-importance fallback covered by existing scikit-learn (no extra dep). |
| **react-joyride** | `^3.1.0` (May 2026) | Onboarding tour / first-load guided walkthrough | V3 is a complete rewrite for modern React with native React 18 + TypeScript, `useJoyride` hook, Floating UI under the hood, portal rendering (works inside R3F canvas overlays), and works in Vite. Permissive MIT license. |

### Supporting Libraries (must add)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **scikit-learn `CalibratedClassifierCV`** | already on `sklearn>=1.3` | Wrap the existing `SVC` for stable multiclass probability estimates used by top-N ranking | Use instead of `SVC(probability=True)` if Platt-scaling within LibSVM produces low-confidence saturated probabilities on the small corpus. Sigmoid method + `cv=LeaveOneOut()` for the smallest-sample regime. |
| **scikit-learn `permutation_importance`** | already on `sklearn>=1.3` | Cheap, model-agnostic feature-importance baseline | Use as the primary explainability signal; SHAP only when per-prediction local explanations are needed. Already shipped — no install. |
| **scikit-learn `NearestNeighbors`** | already on `sklearn>=1.3` | "Nearest training books" retrieval in the engineered feature space | One-line `kneighbors(query_feat, n_neighbors=N)` over fitted feature matrix used for SVM. Surfaces 3 closest training books per upload for the "why" panel. Already shipped — no install. |

### Frontend Theming (no new dep needed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind v4 `@custom-variant dark` | already on `tailwindcss@4.2.2` | Class-strategy dark mode | v4 removed the `darkMode` config key; configure with `@custom-variant dark (&:where(.dark, .dark *))` in `index.css`. Toggle by adding `.dark` to `<html>`. No new library required. |
| `localStorage` + Zustand slice | already on `zustand@5.0.12` | Persist theme preference | Theme lives in the existing Zustand store (`useUiStore`) with a hydration hook reading `localStorage.theme`. Avoids the SSR FOUC problem since this app is a Vite SPA. **Do not add `next-themes`** (Next.js-specific and unnecessary). |

### Persistent Homology — H₂ Computation

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **ripser** (already installed) | `0.6.14` | Compute H₂ by raising `maxdim` from 1 → 2 in `backend/pipeline/homology.py` | The existing `ripser(maxdim=...)` API already supports H₂. No new library; this is a 1-line parameter change behind a feature flag with conservative `epsilon_max` and TF-IDF top-k filtering. |
| **giotto-tda** (already installed, unused at runtime) | `0.6.2` | Fallback only if `ripser` H₂ is too slow on the deployed corpus | `WeightedRipsPersistence` with `homology_dimensions=[0,1,2]` uses the parallel `giotto-ph` backend. Keep in `requirements.txt` as the escape hatch documented in v1 Key Decision; do not switch unless ripser H₂ exceeds the 60s budget for typical books. |

### Corpus Sourcing (research spike — Phase 7)

| Source | Access | Purpose | When to Use |
|--------|--------|---------|-------------|
| **Project Gutenberg via `gutenbergpy`** | already installed (`gutenbergpy>=0.3.5`) | Continue using for public-domain bulk fetch with cached metadata | Default source; predictable, licence-clean, programmatic. Genre metadata is weak (LCC subject headings) — must be augmented. |
| **Hugging Face `datasets` library** | `datasets>=3.0` (new) | Programmatic access to curated literary genre datasets | Recommended adds for Phase 7 evaluation: `agentlans/literary-genre-examples` (86 fiction/nonfiction genres, paragraph-level — too short for full-book features but useful as auxiliary labels) and `TheBritishLibrary/blbooksgenre` (~49k 18th–19th century titles, fiction/nonfiction only — title-level metadata to enrich Gutenberg matches). |
| **Open Library bulk dumps** | HTTP download | Subject-tagged metadata at scale | Use **bulk JSON dumps** (monthly), not the API (rate-limited and discouraged for bulk). Cross-reference with Gutenberg IDs to inject subject tags. No Python library required — `requests` + `ijson` for streaming parse. |
| **Internet Archive `internetarchive` CLI/SDK** | `internetarchive>=3.5` (new, optional) | Public-domain full-text beyond Gutenberg | Only if Phase 7 concludes the corpus needs older/rarer fiction. Optional install, not a default dep. |

> **Phase 7 deliverable, not Phase 8 commitment:** Add `datasets` to requirements only if Phase 7 chooses an HF-hosted corpus. Keep `internetarchive` as a documented option, not an install.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `pytest-benchmark` (optional dev) | Measure H₂ vs H₁ runtime regression | Add only if Phase 6 needs reproducible perf numbers for the H₂ feature flag decision. Skip if visual eyeballing suffices. |

---

## Installation (incremental — apply on top of v1)

```bash
# Backend (Python) — must add
pip install shap==0.51.0

# Backend — conditional (Phase 7 decides)
pip install "datasets>=3.0"          # iff HF corpus chosen
pip install "internetarchive>=3.5"   # iff IA corpus chosen

# Frontend (npm) — must add
cd frontend
npm install react-joyride@^3.1.0
```

Pin in `requirements.txt`:
```
shap==0.51.0
```

Pin in `frontend/package.json` dependencies:
```json
"react-joyride": "^3.1.0"
```

---

## Integration Points with Existing Code

### Backend

| New code | Lives in | Integrates with |
|----------|----------|-----------------|
| H₂ computation | `backend/pipeline/homology.py` — change `homology_dims` default from `[1]` to `[0,1,2]` behind config flag | Existing `ripser(maxdim=max_dim, thresh=epsilon_max)` call; content-addressed cache key already hashes params so cache invalidates automatically. |
| Top-N + calibrated probabilities | `backend/pipeline/classify.py` — wrap `SVC` in `CalibratedClassifierCV(method='sigmoid', cv=LeaveOneOut())` | Existing classify endpoint returns one prediction; extend to return top-N sorted by `predict_proba`. SSE progress unchanged. |
| Permutation importance | new `backend/pipeline/explain.py` | Fits on the existing feature matrix from `features.py`; called by a new `/api/explain/{book_id}` route. |
| SHAP per-prediction | same `backend/pipeline/explain.py` | Uses `shap.KernelExplainer(model.predict_proba, shap.kmeans(X_train, k=10))` — k=10 background keeps it tractable on the small corpus. Cached per upload via existing sha256 cache. |
| Nearest training books | same `backend/pipeline/explain.py` | `NearestNeighbors(metric='cosine')` fit on training feature matrix; `kneighbors` on uploaded book's feature vector. |
| Corpus metadata endpoint | `backend/api/app.py` — new `/api/corpus` route | Reads `corpus/books.yaml`; unblocks BookSlider stub. No new lib. |

### Frontend

| New code | Lives in | Integrates with |
|----------|----------|-----------------|
| Theme toggle | `frontend/src/stores/uiStore.ts` (extend), `frontend/src/components/nav/ThemeToggle.tsx` (new) | Adds `theme: 'light' \| 'dark'` to existing Zustand store; toggles `.dark` on `<html>`. |
| Tailwind v4 dark variant | `frontend/src/index.css` | Add `@custom-variant dark (&:where(.dark, .dark *));` at top. Existing utility classes (`bg-slate-50` etc.) gain `dark:` variants in components. |
| Onboarding tour | `frontend/src/components/onboarding/Tour.tsx` (new) | Wraps `<Joyride>` with steps targeting existing element refs in `App.tsx`, sidebar nav, and 3D canvas. Stores "tour seen" in `localStorage` via existing Zustand persist pattern. |
| Top-N display | `frontend/src/components/sidebar/Prediction.tsx` (extend) | Renders the new `top_n: [{genre, probability}]` field from `/api/classify`. |
| "Why this genre" panel | `frontend/src/components/sidebar/Explain.tsx` (new) | Calls `/api/explain/{book_id}` via React Query; renders feature-importance bar chart (existing Tailwind primitives — no new chart lib needed), nearest-book chips, and top contributing words from SHAP local explanation. |
| H₂ heatmap tab | `frontend/src/components/topology/PersistenceHeatmap.tsx` (extend) | Existing H₀/H₁ tab pattern; same persistence-image rendering, just an extra `dim=2` tab. Fixes the broken tooltip while in this file. |
| Persistence-diagram dot scaling | `frontend/src/components/topology/PersistenceDiagram.tsx` | Use `Math.log1p(count)`-based radius or persistence-magnitude scaling. No new dep. |

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `shap.KernelExplainer` | `LIME` (`lime` PyPI) | If SHAP's k-means background sampling produces unstable values on the small corpus, LIME's per-instance local surrogate model is more robust at the cost of explanation consistency. Both have known limitations on RBF SVMs — they share the same underlying problem. |
| `shap` | `eli5` | If only feature-name + weight is needed (no Shapley decomposition). eli5 is lighter but mostly unmaintained since 2022 — not recommended for new work. |
| `react-joyride` | `driver.js` | If bundle size matters more than React-native ergonomics. driver.js is smaller and framework-agnostic but loses the React component integration that lets tour steps reference R3F canvas overlay refs cleanly. |
| `react-joyride` | `shepherd.js` | If a non-React maintenance path is desired. **But:** shepherd.js is AGPL — would force this repo to AGPL or require a commercial licence. Reject. |
| `CalibratedClassifierCV` wrap | Built-in `SVC(probability=True)` only | If LibSVM's internal Platt scaling produces well-calibrated outputs on this dataset, the wrap is redundant. Decide empirically in Phase 9 by inspecting reliability diagrams. |
| `ripser maxdim=2` | `giotto-tda WeightedRipsPersistence` with `[0,1,2]` | If ripser H₂ runtime exceeds ~60s per book at typical TF-IDF top-k counts. giotto-ph parallel backend is faster on multicore — but adds binary-wheel risk on Railway Docker base. |
| Hugging Face `datasets` for corpus | Stay with `gutenbergpy` + manual genre tagging | If Phase 7 finds Gutenberg's LCC subject headings, augmented by Open Library subject tags, give clean enough genre labels. Saves a dependency. |

---

## What NOT to Use (anti-recommendations — v1 already covers these)

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `next-themes` | Next.js-specific patterns and SSR-aware hydration; this is a Vite SPA with no SSR. Adding it pulls Next.js context expectations. | Plain Zustand slice + `localStorage.theme` + class toggle on `<html>`. |
| Any new state-management library (Redux Toolkit, Jotai, Recoil) | Zustand 5 + React Query already handle global and server state for v1. v2 features don't introduce categorically new state shapes. | Extend existing `useUiStore` and `useGenreStore`. |
| Any new chart library (Recharts, Plotly, Chart.js, Victory) for the explainability panel | Bar charts for feature importance are trivially rendered with existing Tailwind utility classes (`<div style={{width: '${pct}%'}}>`). Adding a chart lib for one panel pulls 100–400 KB. | Tailwind utility-class bars. |
| `tw-colors`, `daisyUI`, theme-token plugins | Tailwind v4 has CSS-first themes via `@theme {}` blocks — design tokens go straight into `index.css`. Plugin ecosystem fragmentation is the v3 problem v4 solved. | `@theme { --color-primary: ...; }` and `dark:` variants. |
| `react-tour` (the original, archived 2023) | Unmaintained, last release 2023, React 18 issues. | `react-joyride` v3. |
| `intro.js`, `shepherd.js` | AGPL licence — copyleft incompatible with current repo licensing assumptions. | `react-joyride` (MIT) or `driver.js` (MIT). |
| `tslearn`, `tda-tools`, other TDA wrappers | v1 already pairs `ripser` for VR + `persim` for persistence images, and falls back to `giotto-tda`. Three TDA stacks is two too many. | Use what's installed. |
| Migrating from Railway to Fly.io | v1 deploy is stable on Railway with the GitHub Release model-asset pattern. v2 introduces no infra requirement that Railway can't meet. | Stay on Railway. |
| Migrating from SSE back to WebSocket | The v1 SSE migration solved a Railway edge issue. v2 has no WebSocket-only need. | Stay on SSE. |
| `lime` alongside `shap` | One model-agnostic local explainer is enough; both share the same instability issue on RBF SVMs. | Pick `shap` only. |
| Adding `pandas` for new features | v1 uses `numpy` + `scipy` + `sklearn` directly. No tabular operations in v2 require pandas. | numpy arrays + plain dicts. |

---

## Stack Patterns by Variant

**If ripser H₂ runs within the per-book SSE-progress budget (~60s) on the deployed corpus:**
- Use `ripser(maxdim=2)` directly
- Because no new dependency, same code path, same cache key shape
- Decision check: Phase 6 perf measurement on the 15-book v1 corpus

**If ripser H₂ exceeds budget or OOMs on Railway's 1GB worker:**
- Switch `backend/pipeline/homology.py` to `gtda.homology.WeightedRipsPersistence`
- Because `giotto-ph` parallel backend halves typical wall-clock at the cost of binary-wheel install complexity
- Apply more aggressive TF-IDF top-k filtering (e.g. 200 → 150) before considering H₂ opt-out per book

**If Phase 9 reliability diagram shows well-calibrated `SVC(probability=True)`:**
- Skip `CalibratedClassifierCV` wrap
- Because the LibSVM-internal Platt scaling is sufficient and one less moving part

**If Phase 9 shows saturated / poorly-calibrated probabilities:**
- Wrap with `CalibratedClassifierCV(SVC(...), method='sigmoid', cv=LeaveOneOut())`
- Because LOOCV maximises training-data usage for the small corpus and sigmoid handles the typical SVM score distribution

**If SHAP runtime per upload exceeds 10s with k=10 background:**
- Reduce to `shap.kmeans(X_train, k=5)`
- Or fall back to `permutation_importance` global + nearest-neighbour local "why" only
- Because UI responsiveness on the classify flow trumps Shapley fidelity for a portfolio demo

**If Phase 7 corpus research concludes Gutenberg LCC tags are insufficient:**
- Add `datasets>=3.0`
- Pull `TheBritishLibrary/blbooksgenre` for title-level fiction labels; cross-join with Gutenberg author/title for subject enrichment
- Avoid pulling full-text from HF datasets — keep full text from Gutenberg for licence clarity

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `shap==0.51.0` | `scikit-learn>=1.3,<2.0`, `numpy>=1.24`, Python `3.11`–`3.14` | v0.51 supports current sklearn line. Matches our v1 stack. |
| `react-joyride@^3.1.0` | `react@^18` and `react@^19`, TypeScript 5+, Vite 5/6 | Confirmed working with `react@18.3.1` + `vite@6.3.5` (our stack). v3 uses Floating UI internally — no peer-dep conflicts with `@floating-ui/react` if added later. |
| `ripser@0.6.14` `maxdim=2` | unchanged from v1 | Wheels for Python 3.12 (our runtime) ship. No code change beyond parameter. |
| `tailwindcss@4.2.2` `@custom-variant` | unchanged from v1 | v4-native syntax; no plugin, no config key. |
| `CalibratedClassifierCV` + `LeaveOneOut` cv | `scikit-learn>=1.3` | API stable since 1.0; uses `ensemble=True` by default which fits a calibrator per CV fold and averages — fine for small corpora. |
| `datasets>=3.0` (if added) | `numpy<3`, `pyarrow>=15`, Python 3.9+ | Pyarrow dependency adds ~80 MB to the wheel set — only add if Phase 7 commits. |

---

## Confidence Calibration

| Recommendation | Confidence | Rationale |
|----------------|------------|-----------|
| `ripser maxdim=2` for H₂ | HIGH | Trivial parameter change; documented behaviour; only risk is runtime, which is empirically measurable in Phase 6. |
| `react-joyride@^3.1.0` | HIGH | Recent stable release (May 2026); confirmed React 18 + Vite compatibility; permissive licence; mature ecosystem. |
| `CalibratedClassifierCV` for top-N | HIGH | Official sklearn pattern explicitly recommended for SVC; multiclass Platt extension (Wu-Lin-Weng) is built in. |
| `shap.KernelExplainer` for SVC RBF | MEDIUM | SHAP docs include the exact pattern, but published research warns SHAP/LIME are sensitive to model choice and feature collinearity on small datasets. Treat outputs as suggestive, not definitive. Phase 9 must include a sanity-check pass. |
| Tailwind v4 `@custom-variant dark` | HIGH | Tailwind official docs; widely-used pattern since v4 launch. |
| Hugging Face `datasets` for corpus | MEDIUM | Confirmed datasets exist (`blbooksgenre`, `literary-genre-examples`) but their fit to "5–15 books per genre full-text" use case is unverified. Phase 7 must evaluate before committing. |
| Open Library bulk dumps | MEDIUM | Documented bulk-download channel; rate-limit policy is explicit. Schema and parse cost unverified for our use case. |
| `internetarchive` SDK as optional fallback | LOW | Listed as an option, not investigated for current API stability or rate limits in 2026. Phase 7 only if needed. |

---

## Sources

**Persistent homology / H₂**
- [ripser PyPI](https://pypi.org/project/ripser/) — current version 0.6.14, `maxdim` parameter documented
- [ripser.py Rips class docs](https://ripser.scikit-tda.org/en/latest/reference/stubs/ripser.Rips.html) — maxdim semantics
- [giotto-ph paper (arXiv 2107.05412)](https://arxiv.org/abs/2107.05412) — H₂ scaling and edge-collapse mitigation
- [Divide-and-conquer persistent homology (arXiv 2410.01839)](https://arxiv.org/abs/2410.01839) — mitigation pattern if subsampling becomes necessary

**Classification depth (top-N + calibration)**
- [scikit-learn 1.8 SVC docs](https://scikit-learn.org/stable/modules/generated/sklearn.svm.SVC.html) — `decision_function`, `predict_proba`, multiclass Platt extension
- [scikit-learn 1.8 CalibratedClassifierCV docs](https://scikit-learn.org/stable/modules/generated/sklearn.calibration.CalibratedClassifierCV.html) — ensemble + per-fold calibration
- [scikit-learn 1.16 probability calibration guide](https://scikit-learn.org/stable/modules/calibration.html) — small-dataset guidance
- ["Better Classifier Calibration for Small Data Sets" (arXiv 2002.10199)](https://arxiv.org/pdf/2002.10199) — LOOCV calibration rationale

**Explainability**
- [SHAP PyPI](https://pypi.org/project/shap/) — v0.51.0 released March 2026; Python 3.11+ support
- [SHAP Iris+sklearn example (official docs)](https://shap.readthedocs.io/en/latest/example_notebooks/tabular_examples/model_agnostic/Iris%20classification%20with%20scikit-learn.html) — exact KernelExplainer + RBF SVC pattern
- ["A Perspective on Explainable AI: SHAP and LIME" (arXiv 2305.02012)](https://arxiv.org/pdf/2305.02012) — known limitations on small datasets
- [scikit-learn permutation_importance docs](https://scikit-learn.org/stable/modules/permutation_importance.html) — fallback pattern

**Frontend (theming + onboarding)**
- [Tailwind v4 dark mode docs](https://tailwindcss.com/docs/dark-mode) — `@custom-variant` pattern
- [Tailwind v4 custom variant directive (DeepWiki)](https://deepwiki.com/tlq5l/tailwindcss-v4-skill/2.4-the-@variant-and-@custom-variant-directives) — selector forms
- [react-joyride npm](https://www.npmjs.com/package/react-joyride) — v3.1.0 (May 2026), MIT
- [react-joyride v3 announcement](https://github.com/gilbarbara/react-joyride/discussions/1196) — useJoyride hook, Floating UI
- [Inline Manual: tour-library comparison](https://inlinemanual.com/blog/driverjs-vs-introjs-vs-shepherdjs-vs-reactour/) — licence + maturity comparison

**Corpus sourcing (Phase 7 seed)**
- [Hugging Face datasets — text classification](https://huggingface.co/datasets?task_categories=task_categories:text-classification)
- [agentlans/literary-genre-examples](https://huggingface.co/datasets/agentlans/literary-genre-examples) — 86 genres, paragraph-level
- [TheBritishLibrary/blbooksgenre](https://huggingface.co/datasets/blbooksgenre) — 49k titles, fiction/nonfiction
- [Open Library APIs + data dumps](https://openlibrary.org/developers/api) — bulk-download channel
- [Open Library Data Dumps](https://openlibrary.org/developers/dumps) — monthly JSON
- [Standardised Project Gutenberg Corpus (pgcorpus/gutenberg)](https://github.com/pgcorpus/gutenberg) — preprocessing pipeline reference

---

*Stack research for: Literary Genre Topology v2.0 (Accuracy, Depth, Polish)*
*Researched: 2026-05-22*
*Building on v1 stack — only deltas documented here.*
