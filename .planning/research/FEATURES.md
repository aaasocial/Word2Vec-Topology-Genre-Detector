# Feature Research — v2.0 (Accuracy, Depth, and Polish)

**Domain:** Computational literary analysis (TDA + NLP) — adding accuracy, explainability, and polish to a shipped v1 web app
**Researched:** 2026-05-22
**Confidence:** MEDIUM-HIGH (corpus + explainability HIGH; H₂ interpretation MEDIUM; theming/onboarding HIGH)

## Scope Note

This document is **strictly scoped to v2.0 additions**. The v1 feature landscape (3D scatter, VR animation, persistence heatmap, comparison view, settings drawer, walkthrough, PNG/CSV export, bundled corpus) is settled and lives in `.planning/research/v1/FEATURES.md`. This document covers only what's new in v2: the bug-fix sweep, corpus quality, classification depth, and visual polish.

Each feature below is categorised as **Table Stakes** (must have for v2 to feel coherent), **Differentiator** (high value, optional), or **Anti-Feature** (do NOT build — explain why), with complexity and v1 dependencies called out.

---

## 1. Bug-Fix Sweep (Category: v1 Carry-overs)

These are not "new features" but unfinished v1 work blocking v2 coherence. All are **Table Stakes** — v2.0 cannot ship without them because v1 UI already advertises them.

### Table Stakes

| Feature | Why Table Stakes | Complexity | v1 Dependency |
|---|---|---|---|
| **H₂ persistent homology computed + exposed** | The H₂ tab already exists in the UI from v1 Phase 4. The tab currently 404s or returns empty data. Users see a broken tab. | **MEDIUM** — Ripser supports `maxdim=2` out of the box; pipeline already wired for H₀/H₁; cost is computational (H₂ is the most expensive dimension to compute) and visualisation (third heatmap panel). | Persistence-image pipeline in `backend/pipeline/`, heatmap renderer in frontend, content-addressed cache (cache key must include `maxdim`). |
| **H₂ tab tooltip fires correctly** | v1 Phase 4 added tooltips for H₀/H₁; the H₂ tooltip stub is broken. UI inconsistency. | **LOW** — pure frontend fix; same tooltip component, missing wire-up. | Existing tooltip component, hover-state Zustand store. |
| **Persistence-diagram dot scaling improved** | v1 ships persistence diagrams where dots are illegible — too small at default zoom, no birth=death reference line emphasis, dimension-0 cluster at origin overlaps catastrophically. Standard PD critique: "visual confirmation complicated by overlap of dimension 0 features." | **LOW-MEDIUM** — scale marker size by persistence (death − birth), jitter or hex-bin H₀ cluster at origin, ensure diagonal is clearly drawn, add log-scale toggle for very-short-lived features. | PD renderer (frontend, likely d3/visx layer). |
| **BookSlider wired to corpus metadata endpoint** | The v1 UI has a "scrub through books in a genre" slider that receives `books={[]}` and is therefore hidden. A documented differentiator from v1 Phase 4 is dead. | **LOW-MEDIUM** — backend endpoint `/api/corpus/books?genre=X` returning `[{book_id, title, author, n_words, ...}]`; frontend hook + slider re-enable. | Existing corpus metadata in `corpus/books.yaml`, backend FastAPI app, frontend BookSlider component. |
| **ROADMAP.md and STATE.md restored as living documents** | These were 0 bytes at v2.0 start (process bug — v1 closeout did not preserve them). Not user-visible, but GSD workflow depends on them. | **LOW** — already partially done (STATE.md rebuilt 2026-05-22). | Phase tracking lives outside the app. |

### Anti-Features (Bug Sweep)

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| **Recomputing all v1 caches to fix dot scaling** | Persistence-diagram dots are a frontend rendering decision over already-computed (birth, death) pairs. Recomputing homology is pure waste. | Fix in renderer only. Models and persistence data on disk are correct. |
| **Adding H₃, H₄ "while we're in there"** | Vietoris-Rips at H₂ already pushes compute time. H₃+ on text-sized point clouds (hundreds to thousands of words) is intractable and uninterpretable. | Hard-cap at `maxdim=2`. Document the cap in the settings drawer. |

---

## 2. Corpus Quality (Category: Accuracy)

This is the foundation of the v2.0 accuracy story. **Phase 7 is a research spike** producing a recommendation doc; **Phase 8 acts on it**. Features below frame what that spike must answer and what the resulting corpus capability looks like to the user.

### Table Stakes

| Feature | Why Table Stakes | Complexity | v1 Dependency |
|---|---|---|---|
| **Expanded labelled corpus (>5 books/genre)** | LOOCV degrades below ~5 books/genre (already a v1 constraint). To claim "measurable accuracy improvement vs v1 baseline" we need both more books per genre AND ideally more genres. Comparable Project Gutenberg genre-classification corpora use **~1000 books across ~10 genres**; small-corpus academic work uses **20–50 books/genre**. We are nowhere near that. | **MEDIUM** — sourcing is the hard part (covered by Phase 7 spike); ingestion path already works in v1 (txt files + `corpus/books.yaml`). | v1 ingestion pipeline (`scripts/01..06`), Word2Vec retraining (run-once), full precompute regeneration. |
| **Documented sourcing methodology** | If we just throw books in, accuracy improvement is unreproducible and indistinguishable from overfitting. The spike must produce a recommendation document (source, labels, preprocessing, baseline). | **LOW** — research output, not code. | None. |
| **v1 baseline accuracy preserved as comparison point** | Without holding v1's exact LOOCV number, "measurable improvement" is hand-wavy. Pin the v1 baseline (LOOCV accuracy + permutation-test p-value at current α, window, dim) before retraining. | **LOW** — record the existing `06_validate.py` output as the v2 baseline. | v1 `06_validate.py` output, existing models in GitHub Release. |
| **Preprocessing parity check** | If preprocessing changes between v1 and v2 (different stopwords, different tokenisation, different min-word filter), accuracy improvement is confounded. Either hold preprocessing constant OR test it separately. | **LOW** — code already exists, just freeze it for the comparison. | `backend/pipeline/preprocess.py`. |

### Differentiators

| Feature | Value Proposition | Complexity | v1 Dependency |
|---|---|---|---|
| **Reproducible "rebuild the corpus" script** | A `scripts/build_corpus.py` that fetches Project Gutenberg book IDs from a manifest (e.g. `corpus/sources.yaml`), downloads, strips Gutenberg headers/footers, and writes canonical `.txt` files. Means anyone can reproduce the labelled set without us shipping copyrighted text. | **MEDIUM** — Project Gutenberg has a stable URL schema and an explicit "small-scale download" policy; header/footer stripping is well-understood (regex on `*** START OF` and `*** END OF` markers). | Existing `corpus/books.yaml` shape. |
| **Per-book provenance metadata** | Each book record records its source (Gutenberg ID, scrape URL, hash, license note). This lets us defend against "is the corpus biased?" and supports future re-labelling. | **LOW** — schema additions to `corpus/books.yaml`. | Existing yaml schema. |
| **Multi-genre / soft labels (research target)** | A book like *Frankenstein* is both gothic horror AND early sci-fi. v1 forces single labels. Recent literature uses multi-label or hierarchical (fiction → genre → subgenre). The Phase 7 spike should evaluate whether v2 should adopt multi-label given the kernel-SVM constraint. | **MEDIUM-HIGH** — multi-label SVM is a known but heavier change (one-vs-rest per genre); UI changes ripple (top-N display, "why this genre" must explain co-labels). | SVM training, prediction endpoint, top-N UI. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| **Ship BookCorpus directly** | BookCorpus (~7000 self-published books) has documented licensing issues — many books were scraped from Smashwords without explicit redistribution rights, and several papers note ethical concerns. Including it risks DMCA on Railway and undermines academic credibility. | Use Project Gutenberg (public domain) plus hand-curated metadata. If more data is needed, link to BookCorpus rather than redistribute. |
| **Scrape Goodreads at scale** | Goodreads ToS prohibits scraping; user-generated shelves are noisy (640 genres → 499 are user-invented rare labels in one study); ethically grey. Academic studies that have used Goodreads typically use the [UCSD Goodreads public dump](https://mengtingwan.github.io/data/goodreads.html) which is itself contentious. | Use Goodreads-derived labels only as *reference taxonomy* (what counts as "thriller" vs "mystery"), not as training labels. Apply expert/manual labels to Gutenberg-sourced texts. |
| **Auto-labelling via an LLM** | Tempting ("ask Claude to label each book"), but creates a circular benchmark: if we label with an LLM, we're benchmarking our SVM against that LLM, not against literary reality. Also bakes in LLM biases (e.g. genre conflation). | Manual expert labelling for the small canonical corpus. If automation is needed later, use it for *candidate* labels reviewed by a human. |
| **"Just add more horror/sci-fi/romance"** | Repeating v1's three genres with more books per genre improves intra-class density but doesn't test the model on the harder problem (4+ genres, subgenres). It is the easy win that masks the real accuracy question. | The spike should explicitly recommend genre count + balance, not assume v1's three. |
| **Languages other than English in v2** | Out of Scope per PROJECT.md, and the Word2Vec model + stopword list are English-centric. Adding French/German books mid-milestone derails the accuracy benchmark. | Defer multilingual to v3. The spike notes it as future work only. |

---

## 3. Classification Depth (Category: Top-N + Explainability)

The v1 prediction returns a single genre with a single confidence score. v2 adds **top-N ranked predictions** and **"why this genre" explainability**. These are the most user-visible upgrade in v2.

### 3a. Top-N Predictions with Confidence

#### Table Stakes

| Feature | Why Table Stakes | Complexity | v1 Dependency |
|---|---|---|---|
| **Top-N ranked list with calibrated probabilities** | A single winner + confidence is the bare minimum (v1 ships it). The natural next step every classifier UX shows is the ranked list. Users intuit "the model also considered X and Y." | **MEDIUM** — sklearn's `SVC(probability=True)` already does Platt scaling under the hood (extra internal CV). With small corpora this is noisy; calibration may need to be re-fit on LOOCV folds. Alternative: expose raw `decision_function` margins and present as "scores" without claiming probability. | v1 SVM in `backend/pipeline/`, prediction endpoint, frontend prediction card. |
| **Configurable N (default 3)** | "Top-3" is the dominant default in NLP classifier UX. For 3 genres, top-N = all genres = a probability bar chart; for 5+ genres, top-3 is the right "show me alternatives" view. The control should be a settings-drawer toggle, not hidden. | **LOW** — N is a UI/query parameter; backend always returns all scores. | Settings drawer pattern from v1. |
| **Probability-bar visualization** | Horizontal bars per genre with width = probability, labelled with the % value, are the canonical NLP confidence display ([HuggingFace Spaces](https://huggingface.co/spaces), TFHub demos all use this). Better than pie charts; better than raw decision values. | **LOW** — pure frontend; use existing genre palette so colour is consistent with scatter view. | v1 genre colour palette, prediction endpoint must return all class scores not just top-1. |
| **Honest confidence labeling** | Confidence score range matters. Platt-calibrated probabilities sum to 1. Raw SVM decision-function margins do not and can be negative. Pick one and label it correctly. Mis-labelling decision values as "probabilities" is a common bug. | **LOW** — naming discipline. | Backend must clearly distinguish what it returns. |

#### Differentiators

| Feature | Value Proposition | Complexity | v1 Dependency |
|---|---|---|---|
| **Entropy / uncertainty indicator** | A single number capturing "the model is very sure" vs "the model is torn." Entropy of the prediction distribution is the standard. Display as a small "uncertainty" badge alongside the bars. ([Useful Confidence Measures: Beyond the Max Score](https://arxiv.org/pdf/2210.14070) covers why margin/entropy beat max-score alone.) | **LOW** — derived from existing probabilities, no extra model work. | Probability output. |
| **Calibration plot in settings drawer** | A reliability diagram (predicted vs actual probability on LOOCV folds) tells a researcher whether to trust the probabilities. Hidden behind an "Advanced diagnostics" section, but immensely credibility-building for the target audience (researchers, students). | **MEDIUM** — needs LOOCV evaluation pipeline to record per-fold probabilities; plotting is straightforward. | LOOCV pipeline (already exists for validation). |

#### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| **Pie chart of predictions** | Pies are notoriously bad for comparing close-to-equal probabilities — a 0.40/0.35/0.25 distribution is unreadable as a pie but obvious as bars. | Probability bars only. |
| **Hiding low-confidence predictions** | If the model says 0.4/0.35/0.25, hiding the 0.25 (or worse: hiding everything when top score < 0.6) deprives the user of the most interesting case — when the model is uncertain, that's the signal. | Always show all genres. Add a visual "low confidence" cue rather than hiding. |
| **Claiming probabilities from raw decision function** | The `decision_function` of an RBF SVM returns margin distance from the hyperplane; these are NOT probabilities. Labelling them as "Probability: 1.43" is wrong and embarrassing. | If using raw scores, label as "score" or "margin" and explain in tooltip. Otherwise turn on Platt calibration explicitly. |

### 3b. "Why This Genre" Explainability

This is the most subtle area in v2. The v1 SVM is a kernel SVM on a concatenated, normalised feature vector of **persistence-image features + k-means cluster distributions** — there are no raw tokens at the classifier level. Standard NLP explainability (LIME/SHAP on tokens) does not apply directly.

#### Table Stakes

| Feature | Why Table Stakes | Complexity | v1 Dependency |
|---|---|---|---|
| **Nearest-neighbour retrieval ("your book is closest to these training books")** | The single most credible, easiest-to-implement, and easiest-to-trust explanation for a kernel classifier. Compute cosine (or kernel) distance from the uploaded book's feature vector to every training book's feature vector, return top 3–5. Literature [Task-Specific Embeddings for Ante-Hoc Explainable Text Classification](https://arxiv.org/pdf/2212.00086) explicitly recommends kNN-style retrieval over kernel SVM as the "ante-hoc" explanation. | **LOW** — feature vectors already exist; nearest-neighbour is `np.argsort`. UI: a small "Nearest training books" panel under the prediction card. | v1 feature pipeline, training-set feature vectors cached. |
| **Driving-words highlight (caveated)** | Users will expect highlighted words in the uploaded text saying "these words pushed it to horror." For this app, the feature vector does NOT directly come from individual words — it comes from TF-IDF-weighted point-cloud geometry. So the honest version is: highlight high-TF-IDF words in the upload AND show the words colour-coded by which genre's centroid they are nearest. This is a *feature-attribution proxy*, not strict LIME/SHAP. | **MEDIUM** — TF-IDF weights are precomputed; nearest-genre-centroid per word is a vectorised cosine computation; UI is inline span highlighting in a side panel that shows a sample of the uploaded text. | TF-IDF vectorizer, Word2Vec model, genre centroids (computed once from training set). |
| **Honest "limits of explanation" disclosure** | The walkthrough dialog from v1 already explains the pipeline. The explainability panel should link to it and explicitly state: "The classifier sees topological features, not individual words. These highlights show *plausible* drivers, not the literal classifier inputs." This is the difference between a credible academic tool and a black-box demo. | **LOW** — tooltip + a paragraph in the walkthrough. | v1 walkthrough dialog. |

#### Differentiators

| Feature | Value Proposition | Complexity | v1 Dependency |
|---|---|---|---|
| **Feature-track decomposition: "topology vs vocabulary"** | The v1 SVM input is `α · topology_features ⊕ (1−α) · location_features`. Show the user, for the uploaded book, how each track contributed: "Topology pushed strongly toward sci-fi; vocabulary location pushed weakly toward horror; α=0.6 means topology dominated." This is a unique-to-this-app explanation grounded in the actual pipeline. | **MEDIUM** — for each genre, decompose the kernel-distance contribution by feature-vector slice. Visualise as two stacked bars (topology contribution + location contribution) per genre. | Concatenated feature vector with known slice boundaries, kernel computation. |
| **"Closest training book at each pipeline stage"** | At the point-cloud stage, persistence-image stage, AND final-feature stage, show which training book is closest. Sometimes a book is "geometrically horror but vocabularly sci-fi" — this surfaces it. | **MEDIUM-HIGH** — needs caching of intermediate per-stage feature vectors for training books; UI is a small "stage-by-stage proximity" strip in the explanation panel. | Cached intermediates from v1 precompute. |
| **Counterfactual: "remove these words and the prediction shifts"** | LIME-style: drop the top-K driving words from the uploaded text, re-predict, show the new top-N. Reveals fragility/robustness of the prediction. | **HIGH** — requires a second full pipeline pass (preprocess → TF-IDF → embed → persistence → predict). Cost: ~tens of seconds per counterfactual. Mitigation: only run on user click, not auto. | Full pipeline, async job queue from v1 Phase 2. |

#### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| **Black-box LIME/SHAP on tokens** | LIME/SHAP applied as if the SVM consumes tokens is misleading — the SVM consumes engineered topological features. Showing "the word 'space' contributed +0.12 to the sci-fi prediction" implies a causal link that doesn't exist in this pipeline. ([More Than Words: Towards Better Quality Interpretations of Text Classifiers](https://arxiv.org/pdf/2112.12444) documents how token-level attributions on text pipelines mislead.) | Use the TF-IDF-weighted nearest-centroid proxy and label it honestly. |
| **Full SHAP plot in main UI** | A SHAP summary plot is dense and intimidating; non-experts will be confused. The target user is a curious reader or student, not an ML researcher. | Keep SHAP-style breakdowns in an "Advanced diagnostics" expandable section if at all. The main explanation should be nearest-neighbours + driving words. |
| **"Explainable AI" buzzword overclaim** | Marketing the feature as "Explainable AI" creates trust the app cannot fully back. The pipeline is partially explainable (topology pipeline is well-understood; the SVM kernel itself is opaque on that feature space). | Call it "Why this prediction" or "Explanation." Honest scope. |

---

## 4. Visual Polish (Category: Dark Mode + Onboarding + Empty States)

### 4a. Dark Mode / Theming

#### Table Stakes

| Feature | Why Table Stakes | Complexity | v1 Dependency |
|---|---|---|---|
| **System-preference detection + manual override + persistence** | This is the 2026 default. Users expect `prefers-color-scheme: dark` to be honoured AND a toggle to override AND that override to stick across sessions. Missing any of the three feels broken. | **LOW** — `useMediaQuery('(prefers-color-scheme: dark)')`, Zustand store with `persist` middleware, toggle in header. | Existing Zustand store from v1. |
| **Three.js scene background + materials updated on theme change** | The dark-mode anti-pattern is "page is dark but the 3D canvas is still white." The R3F scene needs `<color attach="background" args={[bg]} />` driven by the theme. Materials with hardcoded colors (axis labels, edges, grid) must respond too. ([Mike Gold: Dark Mode for r3f threejs](https://mike.gold/notes/x-bookmarks/web-3d/dark-mode-for-r3f-threejs-a-step-by-step-review).) | **MEDIUM** — touches every R3F component that hardcodes a colour. Genre colour palette must have light-mode and dark-mode variants — naively inverting RGB does NOT work for categorical palettes. | All R3F components from v1 Phase 3/4. |
| **Heatmap colormap variants for dark mode** | Persistence heatmaps (H₀/H₁/H₂) and persistence diagrams use sequential colormaps. The light-mode default (viridis, magma) reads fine on dark; the diverging palette and axis colours do not. Need an explicit dark-mode palette pass. | **LOW-MEDIUM** — colormap is config-only if using d3-scale-chromatic; axis/grid colours need theming tokens. | Existing heatmap components. |
| **Accessible contrast in both modes** | WCAG AA contrast in both themes is the floor. Genre colours and text on dark backgrounds must hit at least 4.5:1. | **LOW** — pick palettes that meet contrast; automate check in tests if possible. | Genre palette definition. |

#### Differentiators

| Feature | Value Proposition | Complexity | v1 Dependency |
|---|---|---|---|
| **Custom theme tokens in settings drawer** | A "Theme" section in the existing settings drawer letting users tweak point opacity, background tint, brightness encoding. Plays well with v1's "all parameters live-adjustable" ethos. | **MEDIUM** — generalise theme from binary toggle to a small token set. | v1 settings drawer. |
| **Export theme parity** | PNG/CSV exports today render whatever the UI shows. If the user is in dark mode and exports a PNG for a paper, they need to choose light-mode rendering for the export (papers are printed). | **LOW** — temporary theme override during export rendering. | Existing PNG export. |

#### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| **Pure black background (#000)** | Documented dark-mode anti-pattern: pure-black is harsh, kills depth perception on 3D scenes, and looks amateurish. ([Dark Mode Done Right: Best Practices for 2026](https://medium.com/@social_7132/dark-mode-done-right-best-practices-for-2026-c223a4b92417).) | Use a slight off-black (e.g. `#0E1014` or `#15171C`) and reserve true black for emphasis. |
| **Inverting the light palette wholesale** | Inverting hex values produces ugly, low-contrast genre colors and breaks any TF-IDF brightness encoding (because brightness was tuned against a light background). | Hand-pick a dark palette with the same hue families but adjusted saturation/lightness. |
| **Theme toggle without persistence** | Toggle that resets on reload trains users that the app doesn't remember them. | Persist via `localStorage` (Zustand `persist` middleware). |

### 4b. Onboarding / First-Load Tour

#### Table Stakes

| Feature | Why Table Stakes | Complexity | v1 Dependency |
|---|---|---|---|
| **First-load tour (3–5 steps)** | Industry data: 3-step tours hit ~72% completion; 7-step tours crater to 16%. The app's most confusing aspects for a first-time user are (1) what am I looking at? (2) what does brightness mean? (3) what can I do? (4) where do I upload? Those are exactly four steps. | **LOW-MEDIUM** — Driver.js (5KB, MIT, framework-agnostic) is the cleanest fit. Reactour is a permissive alternative. Shepherd.js and Joyride are AGPL and have React 19 compatibility issues per the 2026 roundup. | None — purely additive. |
| **Skip / dismiss / never-show-again** | Users who already understand the app will rage-quit a tour they can't skip. "Skip tour" must be one click; "Never show again" must persist. | **LOW** — persist a `tourCompleted: true` flag. | LocalStorage / Zustand persist. |
| **Triggerable from help menu** | Users who dismissed it should be able to re-trigger from a Help or "?" button. | **LOW** — wire button to tour-start. | Add help button to header. |
| **Tour anchors stay valid as UI evolves** | "Onboarding rot" is documented as the #1 reason tours stop working 3 months after launch. Anchor steps to stable `data-tour-id="..."` attributes, not to CSS selectors that change. | **LOW** — discipline, not code complexity. Add a tour-anchor lint check. | Component IDs. |

#### Differentiators

| Feature | Value Proposition | Complexity | v1 Dependency |
|---|---|---|---|
| **"Show me an example" button on the upload empty state** | One click loads a known training book (e.g. *Dracula*) as if the user had uploaded it, so they see the full classification + viz flow without needing their own text. Hugely lowers the activation barrier. | **LOW-MEDIUM** — backend endpoint to "classify a sample book" reusing existing pipeline; frontend wires it. | Upload + classification flow from v1 Phase 2. |
| **Interactive tour step that uses the user's actual data** | Once the user has uploaded a book, a contextual tooltip pops up explaining "this dot is your book" with the actual prediction. Tour built on user data is dramatically more memorable. ([Product tour best practices 2026](https://www.guideflow.com/blog/product-tour-best-practices) discusses contextual vs. one-time tours.) | **MEDIUM** — needs tour to be re-triggerable on first-upload event. | Upload flow event hook. |
| **Pipeline walkthrough integrated with tour** | The v1 walkthrough dialog already explains the math. Step 5 of the tour can be "Want to know how the algorithm works? Open the pipeline walkthrough" with the button highlighted. Cross-promotes the explainer. | **LOW** — link existing walkthrough into tour step. | v1 walkthrough dialog. |

#### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| **7+ step tour** | Completion craters to 16% at 7 steps. The temptation to "explain everything" is the death of onboarding. | Cap at 5 steps. Defer secondary explanations to the in-context walkthrough dialog. |
| **Forced tour (no skip)** | Modal-blocking, no-skip tours produce hatred. | Always skippable, dismissable, re-triggerable. |
| **Tour explaining math instead of UI** | A tour that explains TDA, persistent homology, and TF-IDF in 5 steps will be incomprehensible and the user will skip. | Tour explains *what to click and where*. The walkthrough dialog explains the math. Different jobs. |
| **Auto-play VR animation as the "wow moment"** | Already an anti-feature from v1. The tour should not trigger the animation. | Tour step *points* at the animation control; user starts it. |

### 4c. Empty States

#### Table Stakes

| Feature | Why Table Stakes | Complexity | v1 Dependency |
|---|---|---|---|
| **Upload area empty state with clear CTA + example button** | Currently the upload box says "Drop a .txt file." A good empty state explains *why* and *what next* — "Drop a .txt file (max 5MB) to see where your book lives in semantic space. Or [try an example] first." | **LOW** — text + example-button wiring. | Upload component, example-book endpoint. |
| **Comparison view: 0-1 genre selected** | The comparison view only makes sense with 2 genres. With 0 or 1 selected, it currently looks broken. A friendly empty state ("Pick two genres to compare their topology") prevents confusion. | **LOW** — conditional render. | Comparison component. |
| **Failed-classification empty state** | If upload succeeds but classification fails (rare but possible — e.g. too few unique words), the user gets a generic error. A specific empty state ("Your text has only 150 unique words; the classifier needs ~500 for meaningful results. Try a longer excerpt.") preserves trust. | **LOW** — error mapping. | Existing error handling. |
| **No-explanation empty state in the explainability panel** | Before the user has uploaded a book, the new explainability panel should show a placeholder ("Upload a book to see why the classifier predicts its genre"), not an empty card. | **LOW** — conditional render. | Explainability panel. |

#### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| **"No data"-style placeholders** | Generic, useless. Tells the user nothing about what to do. | Always include a specific reason + specific CTA. ([Carbon Design System: Empty states](https://carbondesignsystem.com/patterns/empty-states-pattern/) is the canonical reference.) |
| **AI-generated starter content** | Some 2026 SaaS empty states use LLM to generate placeholder data. For this app, generating fake books is misleading and the bundled corpus already serves the "starter content" purpose. | Point at the bundled corpus as the starter content. |

---

## Feature Dependencies

```
Phase 6 (Bug Sweep)
  ├──>  H₂ heatmap (depends on H₂ being computed and cached)
  ├──>  BookSlider revival (depends on /api/corpus/books endpoint)
  └──>  Persistence-diagram dot rescaling (independent, frontend-only)

Phase 7 (Corpus Spike — RESEARCH OUTPUT)
  └──>  Phase 8 (Corpus Expansion)
            ├──>  v1 baseline measurement (must precede retraining)
            ├──>  Reproducible build_corpus.py (depends on spike's source recommendation)
            └──>  Full pipeline rerun → new models in GitHub Release

Phase 8 (Corpus Expansion)
  └──>  Phase 9 (Classification Depth) — explainability nearest-neighbour
        retrieval is more compelling with more training books

Phase 9 (Classification Depth)
  ├──>  Top-N predictions
  │       ├──>  Calibrated probabilities (Platt scaling, sklearn flag)
  │       └──>  Probability-bar UI (depends on backend returning all class scores)
  └──>  "Why this genre"
          ├──>  Nearest-neighbour retrieval (depends on cached training-set features)
          ├──>  Driving-words highlight (depends on TF-IDF + genre centroids)
          └──>  Feature-track decomposition (depends on knowing α and slice boundaries)

Phase 10 (Visual Polish)
  ├──>  Dark mode (independent of all other v2 work, but TOUCHES every component)
  ├──>  Onboarding tour (depends on stable component data-tour-id anchors)
  └──>  Empty states (light dependencies on Phases 8 and 9 for context-aware copy)
```

### Critical Dependency Notes

- **Phase 7 → 8 hard dependency**: Phase 8 cannot start without the spike's recommendation. The user explicitly chose to gate corpus expansion on research because v1 made arbitrary choices. Respect that gate.
- **Phase 6 → 9 soft dependency**: The bug sweep should ideally land before Phase 9 because explainability touches the prediction UI and bug fixes (like dot scaling) are easier to QA when nothing else is moving in that area. But they are not blocking.
- **Phase 8 → 9 ordering**: Top-N and explainability are more credible with more training data. If Phase 8 expands the corpus to 8 books × 5 genres, the "nearest training books" panel becomes genuinely useful; with v1's 3×5 it's a curiosity.
- **Phase 10 independence**: Dark mode and onboarding don't depend on the classifier work, BUT dark mode touches every component. Doing it after Phase 9 means redoing colour decisions on the new explainability UI. Doing it before Phase 9 means Phase 9 must build dark-mode-aware from the start. Recommendation: do dark mode AFTER Phase 9 lands the new UI, in a single pass.
- **Anti-pattern conflict — auto-play animations vs onboarding**: The v1 anti-feature "no auto-play VR animation" must be respected by the tour. If the tour highlights the VR slider, do not auto-start the animation.

---

## v2.0 MVP Definition

### Must Ship (v2.0 cannot launch without these)

- [ ] H₂ homology computed and exposed (Phase 6) — UI already advertises it
- [ ] Persistence-diagram dot scaling fix (Phase 6) — current state is unreadable
- [ ] BookSlider wired (Phase 6) — v1 feature is dead
- [ ] Documented corpus sourcing methodology (Phase 7) — research output
- [ ] Expanded corpus with measurable accuracy improvement (Phase 8) — milestone goal
- [ ] Top-N predictions with probability bars (Phase 9) — most-visible classifier upgrade
- [ ] Nearest-neighbour explainability panel (Phase 9) — credible "why" minimum
- [ ] Dark mode (system + manual + persisted) (Phase 10) — 2026 default expectation
- [ ] 3–5 step onboarding tour (Phase 10) — first-load friction is real

### Should Ship (v2.0 is better with these)

- [ ] Reproducible `build_corpus.py` (Phase 8) — defensibility
- [ ] Driving-words highlight panel (Phase 9) — completes the "why" story
- [ ] Feature-track decomposition (Phase 9) — unique-to-this-app explanation
- [ ] "Show me an example" button on upload (Phase 10) — activation booster
- [ ] Empty-state polish across the app (Phase 10) — consistency

### Defer to v2.x or v3 (Differentiator, not blocking)

- [ ] Multi-label / hierarchical classification (architectural change)
- [ ] Counterfactual explanations ("remove these words")
- [ ] Calibration plot in advanced diagnostics
- [ ] Stage-by-stage proximity strip (closest training book at each stage)
- [ ] Custom theme tokens in settings drawer

---

## Prioritisation Matrix

| Feature | User Value | Implementation Cost | Priority |
|---|---|---|---|
| H₂ homology + tooltip | MEDIUM | MEDIUM | **P1** |
| Persistence-diagram dot scaling | HIGH (currently broken) | LOW | **P1** |
| BookSlider revival | MEDIUM | LOW-MEDIUM | **P1** |
| Corpus sourcing spike | HIGH (foundational) | LOW (research) | **P1** |
| Corpus expansion | HIGH (accuracy goal) | MEDIUM | **P1** |
| Top-N + probability bars | HIGH | MEDIUM | **P1** |
| Nearest-neighbour explainability | HIGH | LOW | **P1** |
| Dark mode | MEDIUM-HIGH (2026 default) | MEDIUM | **P1** |
| Onboarding tour | MEDIUM-HIGH (first-load friction) | LOW-MEDIUM | **P1** |
| Driving-words highlight | MEDIUM-HIGH | MEDIUM | **P2** |
| Feature-track decomposition | MEDIUM | MEDIUM | **P2** |
| Reproducible build_corpus.py | MEDIUM (defensibility) | MEDIUM | **P2** |
| "Show me an example" | HIGH (activation) | LOW-MEDIUM | **P2** |
| Empty-state polish | LOW-MEDIUM | LOW | **P2** |
| Entropy/uncertainty badge | LOW-MEDIUM | LOW | **P2** |
| Calibration plot | LOW (researcher niche) | MEDIUM | **P3** |
| Counterfactual explanations | MEDIUM | HIGH | **P3** |
| Custom theme tokens | LOW | MEDIUM | **P3** |
| Multi-label classification | HIGH but architectural | HIGH | **P3 (v3)** |

**Priority key:** P1 = must have for v2.0 launch • P2 = ship if time permits in v2.0 • P3 = defer to v2.x or v3

---

## Comparable Tools (for v2-relevant features only)

| Feature | Comparable App | What They Do | Our Approach |
|---|---|---|---|
| Top-N with probability bars | HuggingFace Spaces text-classification demos, TFHub demos | Horizontal bars per class, % labels, ordered by score | Same pattern, integrated with existing genre colour palette |
| Token-level "why" | LIME demos, BERTViz | Highlight tokens by attribution score | NOT directly applicable to topology pipeline — use TF-IDF + nearest-centroid proxy with honest disclosure |
| Nearest training examples | scikit-learn `kneighbors` demos, image-classification "similar images" UI | "Closest examples from training set" panel | Apply to feature-vector space; show top 3–5 training books |
| Dark mode 3D viz | Observable notebooks, Plotly theme="plotly_dark" | Adjust scene background + categorical palette for dark | R3F `<color attach="background">` driven by Zustand theme store; hand-picked dark palette |
| Onboarding tour | Userpilot, Appcues, Driver.js demos | 3-5 step spotlight with skip + persist | Driver.js (MIT, 5KB, framework-agnostic); 4 steps |
| Empty state with starter content | Linear, Notion, Figma | "Try an example" prefilled action | Sample-book classify endpoint reusing existing pipeline |

---

## Confidence Assessment

| Area | Level | Reason |
|---|---|---|
| Corpus sourcing landscape | **HIGH** | Multiple academic studies + active 2025-26 research surveyed; Gutenberg, BookCorpus, Goodreads tradeoffs well-documented |
| Top-N + Platt calibration | **HIGH** | scikit-learn docs are authoritative; Platt scaling and `decision_function` semantics are settled |
| SVM kernel explainability | **MEDIUM-HIGH** | Nearest-neighbour-style ante-hoc explanation is well-established; mapping LIME/SHAP to TDA pipelines is genuinely novel and under-researched — recommendation is therefore conservative (proxy + disclosure rather than pretending strict attribution works) |
| H₂ homology utility | **MEDIUM** | Computationally clear; *interpretive* value for text-genre data is empirical — H₂ voids in word-embedding clouds are not as well-studied as H₀/H₁. The spike + Phase 9 experiments will validate whether H₂ improves accuracy or just looks impressive |
| Dark mode 3D viz patterns | **HIGH** | R3F + Three.js theming is well-documented; categorical-palette pitfalls are well-known |
| Onboarding tour UX | **HIGH** | 2026 best-practice guides converge: 3-5 steps, skippable, anchor-stable, contextual; Driver.js / Reactour licensing analysis is current |
| Empty state patterns | **HIGH** | Carbon, SAP Fiori, and SaaS-pattern guides converge on "specific reason + specific CTA + starter content" |

---

## Sources

### Corpus sourcing
- [Gutenberg Genre Identification corpus (~1000 books, 10 genres)](https://github.com/gjoseph16/Genre-Identification-on-a-sub-set-of-Gutenberg-Corpus)
- [Survey of Methods in Computational Literary Studies — Corpus Building for Genre Analysis](https://methods.clsinfra.io/corpus-genre.html)
- [Innovatiana: Gutenberg dataset overview](https://www.innovatiana.com/en/datasets/gutenberg-dataset)
- [Adaptive Data-Resilient Multi-Modal Hierarchical Multi-Label Book Genre Identification (2025)](https://arxiv.org/pdf/2505.03839)
- [Book Riot: Goodreads and the curious case of the wrong genres](https://bookriot.com/goodreads-and-genre-labels/)
- [BookCorpus background](https://handwiki.org/wiki/BookCorpus)
- [Enhancing book genre classification with BERT (2025)](https://peerj.com/articles/cs-2934.pdf)
- [Integrated ensemble of BERT- and feature-based models (2025)](https://arxiv.org/html/2504.08527v1)

### TDA / H₂ / persistence diagrams
- [Unveiling Topological Structures from Language: A Comprehensive Survey of TDA Applications in NLP (2024)](https://arxiv.org/html/2411.10298v3)
- [Persistent Homology for High-dimensional Data Based on Spectral Methods (NeurIPS 2024)](https://proceedings.neurips.cc/paper_files/paper/2024/file/4a32a646254d2e37fc74a38d65796552-Paper-Conference.pdf)
- [A Novel Method of Extracting Topological Features from Word Embeddings](https://arxiv.org/pdf/2003.13074)
- [An Introduction to a New Text Classification and Visualization Using TDA (arXiv 1906.01726)](https://arxiv.org/pdf/1906.01726)
- [Estimating class separability of text embeddings with persistent homology](https://arxiv.org/pdf/2305.15016)
- [AwesomeTDA4NLP curated list](https://github.com/AdaUchendu/AwesomeTDA4NLP)
- [A flat persistence diagram for improved visualization of persistent homology](https://arxiv.org/pdf/1812.04567)

### Classification confidence + calibration
- [scikit-learn SVM documentation (Platt scaling, decision_function)](https://scikit-learn.org/stable/modules/svm.html)
- [Useful Confidence Measures: Beyond the Max Score (entropy, margin)](https://arxiv.org/pdf/2210.14070)
- [Platt scaling — Wikipedia](https://en.wikipedia.org/wiki/Platt_scaling)
- [How and When to Use a Calibrated Classification Model with scikit-learn](https://machinelearningmastery.com/calibrated-classification-model-in-scikit-learn/)

### Explainability
- [Task-Specific Embeddings for Ante-Hoc Explainable Text Classification (kNN over kernel SVM)](https://arxiv.org/pdf/2212.00086)
- [More Than Words: Towards Better Quality Interpretations of Text Classifiers](https://arxiv.org/pdf/2112.12444)
- [Many Faces of Feature Importance — Comparing Built-in and Post-hoc Methods](https://arxiv.org/pdf/1910.08534)
- [A Perspective on Explainable AI Methods: SHAP and LIME (Wiley 2025)](https://advanced.onlinelibrary.wiley.com/doi/10.1002/aisy.202400304)

### Dark mode / theming
- [Mike Gold: Dark Mode for r3f three.js — Step-by-Step Review](https://mike.gold/notes/x-bookmarks/web-3d/dark-mode-for-r3f-threejs-a-step-by-step-review)
- [Dark Mode Charts: Design Best Practices 2026](https://www.cleanchart.app/blog/dark-mode-charts)
- [Dark Mode Done Right: Best Practices for 2026](https://medium.com/@social_7132/dark-mode-done-right-best-practices-for-2026-c223a4b92417)
- [Implementing Dark Mode for Data Visualizations: Design Considerations](https://ananyadeka.medium.com/implementing-dark-mode-for-data-visualizations-design-considerations-66cd1ff2ab67)
- [react-three-fiber background-color examples](https://onion2k.github.io/r3f-by-example/examples/basic/background-color/)

### Onboarding
- [Best Open-Source Product Tour Libraries 2026 (Driver.js, Reactour, Shepherd, Intro)](https://userorbit.com/blog/best-open-source-product-tour-libraries)
- [Driver.js vs Intro.js vs Shepherd.js vs Reactour](https://inlinemanual.com/blog/driverjs-vs-introjs-vs-shepherdjs-vs-reactour/)
- [Product tour best practices 2026 (3-step 72%, 7-step 16% completion)](https://www.guideflow.com/blog/product-tour-best-practices)
- [Product tour UI/UX best onboarding patterns](https://www.appcues.com/blog/product-tours-ui-patterns)

### Empty states
- [Carbon Design System: Empty states pattern](https://carbondesignsystem.com/patterns/empty-states-pattern/)
- [SAP Fiori: Designing for Empty States](https://www.sap.com/design-system/fiori-design-web/v1-96/foundations/best-practices/global-patterns/designing-for-empty-states)
- [SaaS Empty State Design: 9 Patterns That Drive Activation](https://pixxen.com/saas-empty-state-design/)
- [Empty State UX Examples & Best Practices — Pencil & Paper](https://www.pencilandpaper.io/articles/empty-states)

---
*Feature research for: Literary Genre Topology v2.0 — Accuracy, Depth, and Polish*
*Researched: 2026-05-22*
