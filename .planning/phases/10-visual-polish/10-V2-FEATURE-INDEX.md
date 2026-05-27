# Phase 10 — v2 Feature Index (companion to 10-CLAUDE-DESIGN-BRIEF.md)

**Created:** 2026-05-28
**Purpose:** Comprehensive list of everything the v2 app already does (Phases 6, 8, 9 shipped — pre-Phase-10) plus what Phase 10 will add on top. Paste alongside the Claude Design brief so the designer knows the full surface area, not just the Phase 10 deltas.

---

## 1. Elevator pitch

> A book's vocabulary in word2vec space forms a weighted point cloud whose shape (persistent homology) and location (word-cluster distribution) jointly encode its genre. Literary Genre Topology makes that hidden geometric structure visible and useful. Users explore the shared semantic space of 154 public-domain books across 8 literary genres in a 3D scatter, slide through individual books to see brightness patterns shift, compare two genres side-by-side, watch the Vietoris-Rips filtration animate, and — the core action — upload any text file to see (a) where it lives in semantic space, (b) the top-3 calibrated genre predictions, and (c) a "why this genre?" panel with the nearest training books, per-track contributions, and driving words.

## 2. The big map — what's on screen

```
┌──────────────────────────────────────────────────────────────────────┐
│  HEADER  (logo · projection toggle · 2D/3D · search · settings)      │
├──────────────────────────────┬───────────────────────────────────────┤
│                              │                                       │
│                              │  RIGHT SIDEBAR (tabbed/stacked)       │
│                              │  ┌────────────────────────────────┐   │
│                              │  │ Genre selector + brightness    │   │
│   MAIN CANVAS                │  │ Book slider (within genre)     │   │
│   (3D scatter R3F scene)     │  │ Hover/click word details       │   │
│                              │  │ Search results                 │   │
│   Tabs at top of canvas:     │  │ ─────                          │   │
│   • Scatter (default)        │  │ UPLOAD ZONE                    │   │
│   • Topology                 │  │ ↓ after classify ↓             │   │
│   • Compare                  │  │ ClassificationResult           │   │
│   • Vietoris-Rips animation  │  │  – top-3 + "+5 more"           │   │
│                              │  │  – UncertaintyBadge            │   │
│                              │  │  – "Why this genre?" button    │   │
│                              │  │     ↓ opens panel ↓            │   │
│                              │  │     NearestBooksList           │   │
│                              │  │     TrackContributionBars      │   │
│                              │  │     DrivingWordsPills          │   │
│                              │  │  – View in Scatter             │   │
│                              │  └────────────────────────────────┘   │
│                              │                                       │
├──────────────────────────────┴───────────────────────────────────────┤
│  BOTTOM TAB ROW — Parameters drawer (4 tiers) · Export PNG/CSV       │
│  Modal: "How It Works" pipeline walkthrough (Steps 1–7)              │
└──────────────────────────────────────────────────────────────────────┘
```

## 3. What users DO

### 3.1 Explore the embedding space (3D Scatter — main view)

- Rotate, pan, zoom a 3D point cloud of ~50k word embeddings at 60fps (R3F / Three.js)
- Switch projection: **PCA · Kernel PCA · UMAP · t-SNE** (keyboard 1/2/3/4)
- Toggle **2D ↔ 3D** rendering of the same projection
- **Hover** any word → tooltip showing word + TF-IDF weight + genre + top-5 nearest neighbors
- **Click** any word → persistent selection, detailed side panel with full nearest-neighbor list
- Press **R** to reset camera; **Esc** to deselect
- **Search** any word — matches highlight in scatter + appear in side panel
- Select a **genre** → that genre's distinctive vocabulary illuminates; genre-neutral words dim
- Slide through **individual books** within the selected genre — brightness pattern shifts book-by-book
- Adjust **point size, opacity, color scheme, TF-IDF threshold, brightness sensitivity** via the parameters drawer
- Trigger heavier recomputes (k-means K, α weight, PCA dims) via an explicit "Recompute" button (4-tier parameter system avoids redundant work)
- Cancel any in-flight computation (jobs >2s show a cancel button)
- Persistent disclaimer: "topology is computed in the original N-dimensional space; the 3D view is a lossy projection"

### 3.2 Inspect topology (Topology tab)

- 2D heatmap of the **H₁ persistence image** for the selected genre or book (axes: scale × persistence, post-45° rotation)
- Adjust grid resolution **M×M**, Gaussian smoothing **σ**, max persistence threshold
- Note: H₀ and H₂ tabs were removed in Phase 6 — H₀ degenerate under weighted VR, H₂ deferred to v3

### 3.3 Watch the Vietoris-Rips filtration (VR tab)

- Animated 3D scatter showing edges appear and disappear as the filtration parameter **ε** slides 0 → ε_max
- Same word positions as the chosen scatter projection but with its own camera
- ε-slider with play/pause
- Per-genre VR edges precomputed

### 3.4 Compare two genres (Compare tab)

- Pick any two genres from a dropdown pair
- Side-by-side brightness maps + persistence images for both
- Consistent color scale so brightness intensities are directly comparable

### 3.5 Classify a book (the core upload flow — sidebar)

- Drag-and-drop or pick a `.txt` file; client validates extension, size (≤5MB), encoding
- Staged progress indicator showing each pipeline step: **tokenize → tfidf → pointcloud → homology → features → classify** (SSE-streamed, runs as an arq worker job)
- Returns:
  - **Top-3 calibrated genre predictions** as horizontal probability bars with 1-decimal labels (sum to 1, sorted descending)
  - **"+5 more" expander** revealing all 8 genres
  - **UncertaintyBadge** when the top-1/top-2 gap is small or normalized entropy is high (operative thresholds gap<0.2801 OR norm_entropy>0.7738)
  - The uploaded book appears in the **3D scatter** with its own TF-IDF brightness active
- Actionable error messages for: wrong format, too large, <500 words, encoding issues, language detection failure
- Click **"Why this genre?"** → opens explainability panel (Phase 9):
  - **NearestBooksList** — 5 nearest training books on L2-normalized features with title + author + genre + Euclidean distance
  - **TrackContributionBars** — topology vs vocabulary contributions as % bars summing to 100 (zero-ablation: extra SVM calls with topology=0 then vocabulary=0)
  - **DrivingWordsPills** — TF-IDF-ranked words attributed by per-genre w2v centroid alignment, with disclosure copy "proxies, not literal classifier inputs"
  - 410 Gone after 5-min Redis `feature_vec` TTL — re-upload to recompute
  - 503 + graceful fallback if SVM lineage is missing `calibration_method` (top-1 still serves)

### 3.6 Learn the math (How It Works walkthrough — modal)

- 7-step pipeline walkthrough explaining the mathematics: tokenization & TF-IDF → word2vec → point clouds → Vietoris-Rips → persistence images → k-means location features → SVM
- **Step 7 (new in Phase 9)** — Validation & Limitations disclaimer using "upper bound" framing: the v2 macro-F1 (0.7367) is an upper bound on author-out-of-sample performance, not a typical-case estimate; per-author smoke-test gap of 36.96pp is acknowledged
- Links to GitHub-hosted `v2_validation_report.md`

### 3.7 Export

- Current visualization as **PNG or SVG**
- Persistence diagram data as **CSV**

## 4. What users SEE (panels Claude Design needs to theme — the "30 components")

### 4.1 Main canvas
- R3F scatter scene with theme-driven `scene.background`, lighting, point glow
- HoverTooltip (word details overlay)
- 2D/3D toggle handles
- Persistent N-D disclaimer ribbon
- Cancel-job overlay during recomputes

### 4.2 Right sidebar (always visible)
- Genre dropdown + brightness slider
- BookSlider (slides within selected genre)
- Selected-word detail card with nearest-neighbors
- Search results list
- UploadZone (empty + dragging-over + uploading + success + error states)
- ClassificationResult card:
  - TopNList (top-3 + collapsible expander)
  - UncertaintyBadge (conditional render)
  - "Why this genre?" button
  - View in Scatter button
- ClassificationExplain panel (when expanded):
  - NearestBooksList
  - TrackContributionBars
  - DrivingWordsPills
  - Disclaimer footnote (Phase 9 D-51)

### 4.3 Topology tab
- 2D persistence image heatmap with color legend
- Persistence diagram (birth/death scatter)
- Per-book / per-genre toggle

### 4.4 Compare tab
- Two-panel layout (left/right genres)
- Genre-pair dropdown
- Synchronized color scale

### 4.5 VR tab
- 3D edges animation
- ε slider with play/pause
- Genre filter

### 4.6 Bottom drawer — Parameters
- 4 tier groups: Instant / Fast (debounced 200ms) / Slow ("click Recompute") / Very Slow (confirm step)
- "Parameters changed" badge
- "Updating..." overlay during recompute (visualization stays interactive)

### 4.7 Modals / overlays
- How It Works walkthrough (7 steps, Prev/Next/Skip)
- Settings drawer (theme toggle — NEW in Phase 10)
- Help menu (Replay tour entry — NEW in Phase 10)

## 5. What changed v1 → v2 (so Claude Design knows the evolution)

| Surface | v1 (shipped 2026-04-13) | v2 (current state — pre-Phase-10) |
|---|---|---|
| Corpus | 10 genres × 10 books | 8 genres × ~20 books = 154 verified-clean books |
| Genre keys | `scifi`, `fantasy`, `gothic`, `horror` (separate) | `speculative` (scifi+fantasy merged), `gothic_horror` (gothic+horror merged) — **palette needs update** |
| Classifier | RBF SVM, macro-F1 0.3235 | Calibrated RBF SVM (libsvm Platt), macro-F1 0.7367, Brier 0.0481 |
| Prediction display | Single predicted genre + confidence score | Top-3 calibrated probability bars + "+5 more" expander + UncertaintyBadge |
| Explainability | None | "Why this genre?" panel with 5 nearest training books + zero-ablation track contributions + driving words |
| Homology tabs | H₀, H₁, H₂ | H₁ only (H₀ degenerate, H₂ deferred to v3) |
| BookSlider | Stub with `books={[]}` | Real per-book slide-through (Phase 6 BUG-03) |
| Persistence diagram | Unreadable dot scaling | Readable scaling (Phase 6 BUG-02) |
| Cache lineage | Bare step+params | Includes `corpus_hash` + `w2v_model_sha256` (Phase 6 BUG-05) |
| Walkthrough | 6 steps (math only) | 7 steps — Step 7 adds validation/limitations with "upper bound" framing |
| Theme | Dark only, inline hex | **(Phase 10)** — light/dark/system, HSL CSS variables |
| Onboarding | None | **(Phase 10)** — 3-5 step tour anchored on `data-tour-id`, replayable from Help menu |
| Empty states | Generic placeholders | **(Phase 10)** — intentional copy on 4 surfaces |

## 6. What Phase 10 adds on top — the actual design surface

1. **Theme system** — light + dark + system; persistent via new `preferencesStore`; HSL CSS variables in `:root` (light values need defining; dark values exist as shadcn-convention placeholders but most components still use inline hex from Phase 9). Genre palette needs 8 v2-key colors that read on BOTH themes.
2. **3D scene under theme** — `scene.background` updates imperatively (no canvas remount); HoverTooltip + persistence diagrams + all sidebar/topology/compare panels honor theme tokens.
3. **Onboarding tour** — 3-5 steps; explains the UI not the math (math stays in How-It-Works walkthrough); anchored on stable `data-tour-id` constants centralised in `src/tour/anchors.ts`; skippable; replayable from a Help menu; first-load detection; Playwright smoke test in CI asserts anchors exist.
4. **Empty states polish** — exactly 4 surfaces: (a) pre-upload UploadZone, (b) Compare tab with no genres selected, (c) classification failure card, (d) ClassificationExplain panel before any upload exists. Intentional copy + optional illustration/icon, not generic "no data" placeholders.
5. **Genre relabel sweep** — `gothic_horror` and `speculative` need real palette entries (currently rendering with fallback color); tour copy and onboarding flow refer to the correct v2 genre names.

## 7. Out of scope (do NOT design)

- **New capabilities** — counterfactual explanations, mobile-native app, multi-language, user accounts, sharing/collaboration → these are v3 or later
- **Backend API changes** — Phase 10 is frontend-only
- **Math content** — wording inside the "How It Works" walkthrough Steps 1-6 stays put; only Step 7 (Phase 9 D-51) is recent
- **Replacing Three.js or the 3D scatter** — only its background, lighting, and point colors change under theme
- **Logo or brand identity** — current "Literary Genre Topology" name and visual identity are locked
- **The current dark palette's structure** — the shadcn HSL `:root` variable names stay (`--background`, `--card`, `--primary`, etc.) — Phase 10 adds the `.light` scope, doesn't rename tokens

## 8. Constraints from prior phases (already locked — do NOT redesign)

- Theme store **separate** from session-scoped `visualizationStore` (different lifetimes — persisted vs session) — Phase 6 CONTEXT
- Dark theme stays default for first paint — Phase 3 CONTEXT
- **HSL CSS variables** (not Tailwind `dark:` prefix, not design-token JSON) — Phase 9 D-55
- R3F scene background updates **imperatively** via `scene.background` — no canvas remount, no WebGL context loss — POLISH-02, PITFALLS §13
- Tour anchors **centralised** in `src/tour/anchors.ts`; missing-anchor fallback is `'skip'` not `'error'` — POLISH-03, PITFALLS §14
- Tour library choice (`react-joyride@^3.1.0` vs hand-rolled) is **open** — Claude Design may recommend; plan author picks

---

*Pair with `10-CLAUDE-DESIGN-BRIEF.md` for the full hand-off. This index is canonical until Claude Design output lands and decisions are folded into `10-CONTEXT.md`.*
