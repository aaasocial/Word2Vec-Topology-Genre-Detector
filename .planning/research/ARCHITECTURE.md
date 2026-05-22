# Architecture Research — v2.0 Integration

**Domain:** Subsequent-milestone integration on a deployed FastAPI + arq/Redis + React/R3F + Zustand stack
**Researched:** 2026-05-22
**Confidence:** HIGH — every recommendation cites an existing file/symbol in the live v1 codebase

## 1. Existing-Layer Recap (do not re-research)

| Layer | v1 location | Touchpoints for v2 |
|---|---|---|
| FastAPI routes | `backend/api/routes/{corpus,viz,classify}.py` (mounted under `/api`) | corpus → BookSlider; classify → top-N + explainability |
| Pipeline functions | `backend/pipeline/{embed,homology,features,classify,precompute,precompute_viz,precompute_vr}.py` | homology → H₂; classify → top-N; features → per-feature contributions |
| arq worker | `backend/worker/jobs.py` (`classify_book`) — emits SSE-bound progress on `job:{id}:progress` | extend with explainability publish step |
| Disk cache | `backend/cache/store.py` — `cache_key(step, params)` content-addressed | invalidates on `window`, `k`, `alpha`, **new:** `homology_dimensions` and **corpus_hash** |
| Zustand store | `frontend/src/stores/visualizationStore.ts` already has `h2Enabled`, `selectedHomologyDim` | add `topNCount`, `explainOpen`, separate `preferencesStore` for theme |
| R3F scene | `frontend/src/components/canvas/` (ScatterCanvas etc.) | theme-aware background only |
| Sidebar | `frontend/src/components/sidebar/{Sidebar,BookSlider,ClassificationResult}.tsx` | BookSlider already wired to `points` (derives books from scatter); needs richer metadata from new endpoint |

**Critical observation re BookSlider:** `Sidebar.tsx` lines 46-57 already derives `books` from `points` (the scatter payload) — `setSelectedBook(p.bookId)` works *as long as* `ScatterPoint` carries `bookId`/`bookTitle`. The v1 carry-over is really about **adding richer metadata that scatter points don't carry** (author, word_count, pagination order).

## 2. v2 Feature → Integration Matrix

| # | Feature | Backend changes | Frontend changes | New endpoints |
|---|---|---|---|---|
| 1 | H₂ homology | Modify `homology.py`, `features.py`, `precompute.py`, `precompute_viz.py`, `worker/jobs.py` | Modify `HomologyTabs.tsx` (drop disabled gate when h2Enabled), `PersistenceHeatmap`, `PersistenceDiagram` (already accept dim=2); store `h2Enabled` already exists | none (existing `/api/viz/persistence/{genre}?dim=2` already routes — just needs data) |
| 2 | Corpus metadata endpoint (BookSlider) | New route in `corpus.py` | Modify `Sidebar.tsx` to fetch from endpoint instead of deriving from points; modify `BookSlider.tsx` to show richer label (author, word count) | `GET /api/corpus/genres/{genre}/books` |
| 3 | Expanded corpus | No code changes — purely a data + precompute regeneration; `genre_names.json` and palette expansion | Modify `constants/genres.ts` (extend palette beyond 10) | none |
| 4 | Top-N predictions | Modify `classify.py` (return ranked list); modify `worker/jobs.py` to publish ranked result; modify `api/models.py` `ClassifyResponse` | Modify `ClassificationResult.tsx` to render top-N list; new `TopNList.tsx` | none (extends existing SSE result payload) |
| 5 | Explainability | New endpoint, new pipeline module `backend/pipeline/explain.py` | New component `ClassificationExplain.tsx`; modify `ClassificationResult.tsx` to host an "Why this genre?" expander | `POST /api/classify/{job_id}/explain` (synchronous, ~200ms) |
| 6 | Dark mode | None | New `preferencesStore.ts` (separate from viz store — different lifetime/persistence); modify `index.css` to actually consume the HSL custom properties already defined; modify every component that hard-codes hex colours (~30 files); modify R3F scene background colour | none |
| 7 | Onboarding tour | None | New `components/onboarding/Tour.tsx` + `constants/tourSteps.ts`; `preferencesStore` tracks `hasSeenTour` (localStorage) | none |

## 3. New vs Modified — File-Level

### NEW files

**Backend:**
- `backend/pipeline/explain.py` — feature-importance + nearest-neighbour computation
- `backend/api/routes/explain.py` (or extend `classify.py`) — explainability HTTP route
- `backend/api/models.py` additions: `TopNPrediction`, `ExplainResponse`, `FeatureContribution`, `NearestBook`, `DrivingWord` Pydantic models
- `backend/cache/explain_cache.py` *(optional)* — separate cache keyspace for per-upload explanations (TTL'd)

**Frontend:**
- `frontend/src/stores/preferencesStore.ts` — `theme: 'dark' | 'light' | 'system'` + `hasSeenTour` + `tourStep`, persisted to `localStorage` via Zustand `persist` middleware
- `frontend/src/hooks/useCorpusBooks.ts` — React Query hook for new `GET /api/corpus/genres/{genre}/books`
- `frontend/src/hooks/useExplain.ts` — `POST /api/classify/{job_id}/explain` mutation
- `frontend/src/components/sidebar/ClassificationExplain.tsx` — driving-words pill list + nearest-books list + feature-contribution mini-chart
- `frontend/src/components/sidebar/TopNList.tsx` — ranked predictions with confidence bars
- `frontend/src/components/onboarding/Tour.tsx` — overlay-based step tour
- `frontend/src/components/onboarding/TourTooltip.tsx`
- `frontend/src/constants/tourSteps.ts` — step definitions
- `frontend/src/lib/theme.ts` — light/dark token maps (HSL pairs)

### MODIFIED files

**Backend (modified):**
- `backend/pipeline/homology.py` — change `homology_dims` default to include `2`
- `backend/pipeline/features.py` — `diagram_to_birth_persistence` accepts `dim=2`; `build_feature_vector` extended only if H₂ goes into the feature vector (see §6a — recommendation: viz-only in v2)
- `backend/pipeline/classify.py` — return `list[tuple[str, float]]`; use `decision_function` already present
- `backend/pipeline/precompute.py` — compute and cache H₂ diagrams + persistence images; persist `book_index` for nearest-book explainability
- `backend/pipeline/precompute_viz.py` — emit `persistence_images_{genre}_dim2.json` and persistence diagrams for dim=2
- `backend/api/routes/classify.py` — wire top-N into `ClassifyResponse`; SSE payload `result` dict gains `top_n: [{genre, confidence, color}]`
- `backend/api/routes/corpus.py` — add `GET /genres/{genre}/books`
- `backend/api/models.py` — extend `ClassifyResponse.result`, add new models for top-N + explain
- `backend/worker/jobs.py` — `_publish_progress` `result` field carries top-N list
- `config/params.yaml` — `homology.homology_dimensions: [0, 1, 2]`; add `classify.top_n: 3`, `classify.explain.k_neighbors: 5`

**Frontend (modified):**
- `frontend/src/components/sidebar/Sidebar.tsx` — replace the points-derived `books` `useMemo` (lines 46-57) with `useCorpusBooks(selectedGenre)`
- `frontend/src/components/sidebar/BookSlider.tsx` — accept richer `BookMeta = { id, title, author?, word_count? }`
- `frontend/src/components/sidebar/ClassificationResult.tsx` — render `result.top_n` (use new `<TopNList>`); add `<button>Why?</button>` to open `<ClassificationExplain>`
- `frontend/src/components/topology/HomologyTabs.tsx` — once H₂ is precomputed, set `h2Enabled` to `true` by default
- `frontend/src/components/topology/PersistenceDiagram.tsx` — fix dot-scaling carry-over: line 83, replace `radius = pts.length > 500 ? 2 : ...` step function with continuous `Math.max(1.5, Math.min(5, 60 / Math.sqrt(pts.length)))`
- `frontend/src/constants/genres.ts` — extend `GENRE_LIST`/`GENRE_COLORS` if corpus expansion adds genres
- `frontend/src/index.css` — add `[data-theme="light"]` override block (variables already defined, unused)
- ~30 component files with inline `'#111118'`, `'#1E1E2A'`, etc. → replace with `var(--background)`, `var(--card)`, etc.
- `frontend/src/components/canvas/ScatterCanvas.tsx` — read theme from preferences store; set scene `background` accordingly

## 4. Endpoint Shapes (proposed)

### `GET /api/corpus/genres/{genre}/books`

```json
[
  { "gutenberg_id": "84",
    "title": "Frankenstein",
    "author": "Mary Shelley",
    "word_count": 75500,
    "color": "#FF6B6B" }
]
```

- Backed by `corpus/books.yaml` — extend YAML to include `author` and `word_count` per book
- 404 if genre unknown (reuse `_KNOWN_GENRES` pattern from `viz.py`)
- Cache: in-memory at module import
- Backwards-compatible: existing `GET /api/corpus/books` (flat list) stays unchanged

### `POST /api/classify/{job_id}/explain`

```json
{
  "feature_contributions": {
    "topology": 0.42,
    "location": 0.58,
    "top_clusters": [
      { "cluster_id": 7, "weight": 0.18, "representative_words": ["castle","dread","spectre"] },
      { "cluster_id": 13, "weight": 0.12, "representative_words": ["moor","wind","shadow"] }
    ]
  },
  "nearest_training_books": [
    { "gutenberg_id": "84", "title": "Frankenstein", "genre": "horror", "distance": 0.31 }
  ],
  "driving_words": [
    { "word": "haunted", "tfidf_weight": 0.087, "cluster_id": 7 }
  ]
}
```

- Backend: small `backend/pipeline/explain.py` using cached `feature_vec` from upload's job_id (store in Redis at end of `classify_book` with 5-min TTL), cached training `feature_vectors`, cached k-means centroids
- Distance = Euclidean in L2-normalised feature space (same as SVM operates in)
- "Feature importance" via **per-track permutation importance** (topology slab vs location slab) — per-dim is noisy for RBF SVM
- Cost: ~100-300 ms; no job queue needed; handle inline
- Cache: keyed by `sha256(feature_vec.tobytes())` in Redis with 1-hour TTL

### Top-N enrichment of existing SSE result

```python
result = {
    'predicted_genre': top_n[0]['genre'],   # backwards-compatible
    'confidence': top_n[0]['confidence'],   # backwards-compatible
    'top_n': top_n,                          # new
    'oov_word_count': oov_count,
    'total_words': total_words,
    'processing_time_s': round(processing_time, 2),
}
```

## 5. Architectural Trade-offs and Decisions

### 5a. H₂ in the feature vector, or visualisation-only?

**Recommendation: visualisation-only in v2.** Extending the feature vector by another `grid_resolution²` dims (with H₂ typically sparse) is unlikely to improve accuracy *and* it invalidates every cached feature vector and SVM. Treat H₂ as a **diagnostic view** in v2; revisit in v3 after corpus expansion baseline.

### 5b. Where does the explainability cache live?

**Separate Redis keyspace `explain:{feature_vec_hash}` with 1-hour TTL** — not the disk content-addressed cache. Disk cache is for build-time corpus artefacts; explainability is per-upload and ephemeral.

### 5c. Theme store: merge or separate from `visualizationStore`?

**Separate `preferencesStore` with `persist` middleware.** `visualizationStore` is intentionally session-scoped; theme + tour-completion must survive reloads. Different lifetimes → different stores.

### 5d. Onboarding tour — library or hand-rolled?

The codebase has no positioning library and uses inline styles. ~5-8 steps doesn't justify pulling in joyride/shepherd. **Hand-roll a `<Tour>` overlay** with stable `data-tour-id` attributes.

### 5e. Corpus expansion — does data layout change?

**No code changes**, but **two cache invalidations**:
1. **Latent v1 bug**: `cache_key('book_result', {gutenberg_id, window, k, alpha})` in `corpus.py` line 46-51 does NOT include the corpus hash. Change the corpus and stale cached results are returned. Phase 8 must fix this in `precompute.py` and `routes/corpus.py` together.
2. Palette must grow if new genres appear; consider switching to `d3-scale-chromatic` `schemeCategory10` or HSL stepping.

## 6. Suggested Build Order (with dependencies)

| Order | Phase | Why this position | Hard dependencies |
|---|---|---|---|
| 6.1 | Restore ROADMAP.md / STATE.md (already done) | unblocks GSD workflow | none |
| 6.2 | Persistence-diagram dot-scaling fix | trivial; also unblocks H₂ visual review | none |
| 6.3 | Corpus metadata endpoint + BookSlider wiring | foundational integration test of "new endpoint" pattern | none |
| 6.4 | H₂ homology backend + frontend enable | needs cache-key change (add `corpus_hash` / `homology_dimensions`) | 6.3 |
| 7 | Corpus-sourcing research spike | informs phase 8 — pure research | none |
| 8 | Corpus expansion | invalidates all precomputed caches; lands before classification-depth | 7; 6.4 (cache-key invalidation) |
| 9 | Classification depth: top-N + explainability | needs final corpus + final SVM | 8 |
| 10 | Visual polish: dark mode + onboarding | touches ~30 files; must be last | 6-9 |

### Why BookSlider before H₂

BookSlider is the smallest end-to-end new-endpoint integration (one route, one hook, one store change, one component edit). Proves the v2 endpoint-addition pattern works before larger H₂ migration.

### Why corpus expansion before classification depth

Top-N and explainability are user-facing features users will trust. If SVM is retrained on a larger corpus in a later phase, cached explanations and top-N go stale.

### Why dark mode last

Theming is a horizontal concern touching every component touched in phases 6-9. Last means each new v2 component is built with CSS variables from the outset.

## 7. Backwards-Compatibility Audit

| Existing v1 endpoint | v2 status | Notes |
|---|---|---|
| `GET /api/corpus/books` | unchanged | new `/genres/{g}/books` is additive |
| `GET /api/corpus/books/{id}/results` | cache key changes (corpus_hash) — will 404 until precompute reruns | acceptable: corpus expansion is trigger |
| `GET /api/viz/scatter/{projection}` | unchanged response shape | regenerated by precompute_viz |
| `GET /api/viz/tfidf/*` | unchanged | regenerated |
| `GET /api/viz/persistence/{genre}?dim=*` | response shape unchanged; dim=2 now returns data | route already validates `dim in (0,1,2)` |
| `POST /api/classify` | unchanged | new fields in eventual `result` payload |
| `GET /api/classify/{job_id}/progress` (SSE) | result event payload gains `top_n` | non-breaking |
| `POST /api/viz/recompute` | unchanged | `homology.homology_dimensions` not in `PARAM_DEPENDENCY_MAP` — H₂ is build-time, not request-time |

## 8. Cache Invalidation Plan

| v2 change | Caches invalidated | Mechanism |
|---|---|---|
| Add H₂ to `homology_dimensions` | All diagrams, persistence images | Bump cache key: add `dims_hash = sha256(json(homology_dimensions))` |
| Corpus expansion | All feature vectors, book results, scatter, tfidf, VR, persistence | Add `corpus_hash = sha256(books.yaml)` to every `cache_key` site |
| Top-N from `decision_function` | SVM doesn't change; only postprocessing in `predict_genre` | n/a |
| Explainability | New cache namespace `explain:*` in Redis, TTL 1h | additive |

## 9. Anti-Patterns to Avoid in v2

| Anti-pattern | Why tempting | Do instead |
|---|---|---|
| Putting theme state in `visualizationStore` | One store feels simpler | Separate `preferencesStore` with `persist` |
| Inlining H₂ persistence image into feature vector | "More features = more accuracy" | Keep H₂ viz-only in v2; measure first |
| Explainability via SSE | Reuse classify pipeline | Synchronous POST (200ms) is correct |
| Computing explainability eagerly at end of `classify_book` | Pre-warm cache | Most users don't click "Why?"; pay cost on demand |
| Hand-rolling colour-token swaps in JS | Avoid CSS refactor | CSS variables already defined in `index.css` (lines 4-25) |
| Adding `homology_dimensions` to `PARAM_DEPENDENCY_MAP` for live re-toggle | Symmetry with other params | H₂ enablement is build-time, not request-time |

## 10. Key Integration Points — Phase Summary

| Phase | Files it must touch | Endpoints |
|---|---|---|
| **6 (Bug-Fix Sweep)** | `homology.py`, `features.py`, `precompute_viz.py`, `precompute.py` (cache_key + corpus_hash), `PersistenceDiagram.tsx`, `Sidebar.tsx` + new `useCorpusBooks.ts` + new corpus genres route, `params.yaml` | NEW `GET /api/corpus/genres/{genre}/books` |
| **8 (Corpus Expansion)** | `corpus/books.yaml` (add author, word_count, new entries), `data/raw/*`, full precompute rerun, `genres.ts` palette | none — purely data |
| **9 (Classification Depth)** | `classify.py` (top-N), `worker/jobs.py`, `api/models.py`, NEW `pipeline/explain.py`, NEW `api/routes/explain.py`, NEW `ClassificationExplain.tsx`, NEW `TopNList.tsx`, modified `ClassificationResult.tsx`, NEW `useExplain.ts` | NEW `POST /api/classify/{job_id}/explain` |
| **10 (Visual Polish)** | `index.css` (light theme block), every component with inline hex (~30 files), NEW `preferencesStore.ts`, NEW `Tour.tsx` + `tourSteps.ts`, NEW `ThemeToggle.tsx`, `ScatterCanvas.tsx` | none |

## 11. Open Questions for Phase Planning

1. **Author + word_count source** — hand-edited or script-generated from Gutenberg metadata? Phase 7 should answer.
2. **Explainability technique** — Phase 9 commits to one of: (a) per-track permutation importance, (b) LIME on linearised decision function, (c) "nearest training books" + "top contributing clusters" heuristic. **Recommendation: (c)** — fastest, most intuitive, matches "why this genre" without overclaiming.
3. **Tour library decision** — Phase 10 decides; recommendation is hand-rolled.
4. **System dark mode detection** — `prefers-color-scheme: dark` for `'system'` default.
5. **Top-N configurable from UI?** — Recommendation: hardcode N=3 in v2; expose as settings toggle only if user demand surfaces.

## 12. Confidence Assessment

| Area | Confidence | Reason |
|---|---|---|
| Backend integration points | HIGH | Read every file cited; existing patterns (cache_key, SSE, ctx-loaded models) |
| Frontend integration points | HIGH | Read Sidebar, BookSlider, ClassificationResult, HomologyTabs, PersistenceDiagram, visualizationStore, index.css |
| Top-N implementation | HIGH | `predict_genre` already calls `decision_function` — postprocessing only |
| Explainability technique | MEDIUM | NN + cluster-contribution is sound; per-dim importance for RBF SVM is contested in literature |
| Cache invalidation plan | HIGH | Surfaced latent corpus_hash bug; ripser supports arbitrary `maxdim` |
| Dark-mode scope estimate | HIGH | Grepped for inline hex; index.css variables already defined — mechanical replacement |
| Tour implementation | MEDIUM | No codebase preference; hand-rolled on dependency-frugality grounds |
| Build order | HIGH | Dictated by cache-invalidation cascades + theming as horizontal concern |
