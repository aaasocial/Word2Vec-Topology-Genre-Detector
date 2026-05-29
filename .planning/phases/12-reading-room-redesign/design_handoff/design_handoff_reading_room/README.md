# Handoff: The Reading Room — hi-fi front end (full redesign)

> **README is the contract.** When this document and the prototype/screenshots
> disagree, **this document wins.** The prototype is the runnable behavioural
> reference; the screenshots are visual ground truth per screen/state.

---

## 1. Overview

A complete hi-fi redesign of the Literary Genre Topology front end into an **editorial
"reading room"** idiom: a warm-paper, letterpress, library-catalog visual language
(Spectral + JetBrains Mono, square rules, hard offset shadows, marginalia) wrapping
the same word2vec / topology product. It is a wholesale replacement of the prior
Phase 10 indigo theme.

The app is a small client-side router over **one fixed artboard** with these screens:

| Route | Screen | Purpose |
|---|---|---|
| `landing` | The Reading Room (cover) | What this is; enter / submit. |
| `collection` | The Collection | The plate (scatter), catalog rail, marginalia. Browse + filter by region. |
| `card` | Catalog card | One book: shelfmark, driving vocabulary, 5 nearest, plate detail with leader lines. |
| `topology` | Topology | One region's H₁ shape, three linked ways (VR filtration + ε slider · persistence diagram · persistence image). |
| `study` | A Comparative Study | Two regions side-by-side: shared vs distinctive vocabulary + an Editor's note. |
| `upload` | Submit a Text | Paste/upload a manuscript → request a reading. |
| `verdict` | The Reading | The essay result: verdict, confidence, probability bars, catalog card for the text, 5 nearest, where it landed. |
| `about` | About | Method + genres, prose. |

Plus three cross-cutting systems:
- **The Guide** — a right side-sheet, 3 tabs: *Welcome*, *How to wander*, *How it works* (the last has 5 live mini-figures of the method).
- **The guided tour** — a 6-stop spotlight that navigates the real screens and dims everything but one live element.
- **Tweaks** — in-design controls (paper warmth, accent, density), persisted.

## 2. About the design files

`design_files/prototype/` is the **runnable reference**, React 18 + Babel via CDN, no
build step. Open `index.html` on any static server and interact (route via the
masthead; open the Guide; run the tour; toggle Tweaks from the toolbar).

**Recreate in the target stack** (React 18 + TS + Vite + Zustand + Tailwind v4) using
its existing data layer and patterns — **do not ship the prototype HTML**. The
prototype fabricates corpus/scatter/classification data locally (`data.js`,
`shared.jsx`) and draws the 3D topology viewer in **SVG**; production wires the real
endpoints/hooks and the existing R3F viewer (see §8, §9).

## 3. Fidelity

**High-fidelity.** Colors, type, spacing, copy, and layout are final. See
`design_files/tokens.md` for the exact token values. Recreate pixel-faithfully.

---

## 4. Locked decisions

| # | Decision | Value |
|---|---|---|
| L-01 | Visual system | Editorial reading-room (Spectral + JetBrains Mono, paper palettes, square rules, hard `Npx Npx 0` shadows). Replaces Phase 10 indigo entirely. |
| L-02 | Theming model | One **paper palette** + one **accent** per session (Tweaks). 4 palettes, 4 accents — see tokens.md. Default cream / oxblood. |
| L-03 | Density | Tweak `carrel` (3-col w/ marginalia) vs `study` (2-col, marginalia hidden). Default carrel. |
| L-04 | Navigation | Top **masthead**: wordmark + items (The Collection · Topology · A Comparative Study · Submit a Text · About) + a "Guide" button. Active item: accent underline, ink color, roman (others italic, muted). |
| L-05 | Genre palette | Fixed 8 hexes (tokens.md), theme-independent. |
| L-06 | Footnotes | Inline accent superscripts open a centered modal note (`FootnoteHost`). 6 notes, copy locked (see prototype `app.jsx FOOTNOTES`). |
| L-07 | Guide | Right side-sheet, 3 tabs. Auto-opens once on first visit (localStorage `rr.guide.seen.v1`); reopenable from masthead. |
| L-08 | "How it works" | 5 numbered method steps, **each with a live mini-figure** (embedding · centroid · persistent-homology ε-sweep · projection · verdict bars). Figures must render at rest (not hidden behind entrance animations). |
| L-09 | Guided tour | 6 stops, spotlight + margin card; **navigates the real screens** (does not live in its own window). Order = masthead reading order. Pre-selects a region when it reaches Topology. |
| L-10 | Tour spotlight | Four dim panels frame the live anchor (not a giant box-shadow), `rgba(38,33,27,0.46)`, + a `1.5px accent` frame with corner ticks. Card pins to the quadrant opposite the anchor. |
| L-11 | Topology tab | Hero VR filtration viewer + ε slider (left); persistence diagram + persistence image (right). H₁ only. ε links all three. Projection changes only the 3D view. (See §Topology + the separate topology bundle for the full spec.) |
| L-12 | Plate (scatter) | SVG points; hover → margin note + tooltip; click → catalog card. Region filter dims non-selected to ~0.15. 2D/3D toggle (3D = CSS tilt) + projection chips. |
| L-13 | Verdict voice | Confidence < 0.80 is reported as **"marginal"**, never "wrong". Two-track framing (centroid 0.76 / topology 0.24 contributions). |
| L-14 | Stage | Fixed 1240×780 artboard, scaled to fit, letterboxed `#D8D4C8`. (Prototype convenience — see §10.) |

---

## 5. Design tokens

See **`design_files/tokens.md`** — fonts, type scale, 4 paper palettes, 4 accents,
8 genre hexes, rules/shadows, stage. No reuse of the Phase 10 palette; this is the
new system of record.

---

## 6. Screens — layout & components

> Copy throughout is **final**; the authoritative text lives in the prototype files.
> Treat every label/caption/essay line as paste-exact. Key locked copy is called out below.

### 6.1 Landing (`screens_landing.jsx` → `Landing`)
- Two-column: left editorial intro (label, 64px display H1 "A library of *122 novels,* arranged by what they *say.*", two lede paragraphs, two CTAs "Enter the reading room →" / "Submit a text", and a 4-up stat row 122 / 8 / 12,808 / UMAP); right a framed **plate preview** (scatter + region labels + fig. caption).
- CTAs: filled = `ink` bg / `paper` text; outline = `1px ink`.

### 6.2 Collection (`screens_collection.jsx` → `Collection`, `CorpusScatter`)
- 3-column (carrel): **catalog rail** (260) · **plate** (1fr) · **marginalia** (300). Study density drops marginalia → 2-col.
- **Catalog rail:** "Card catalog", "All regions {n}", then 8 genres each with index numeral, color dot, count; click filters (accent left-border); expands to list that genre's titles → click opens card. A "Find" search field.
- **Plate:** title + projection chips (`PCA KPCA UMAP t-SNE`) + `2D/3D` toggle; framed figure with the SVG scatter; corner rulings ("Plate I", "{proj} · {dim} · ε 0.42"); 3D adds a CSS tilt + an axis compass. Hover shows a floating tooltip (title/author/year). Caption "fig. 1 — …" with footnote¹.
- **Marginalia:** hovered book's note (title, author·year, region dot, driving-word chips, "open catalog card →"), else a prompt; plus a standing note about UMAP distortion.
- Anchors for the tour: `data-tour-id="catalog-rail"`, `"plate"`.

### 6.3 Catalog card (`screens_card.jsx` → `Card`)
- Breadcrumb (Collection › Genre › Title). 3-col (carrel): region siblings rail · plate **detail** (selected book highlighted, 4 nearest drawn with dashed accent leader lines + labels) · **catalog card** aside.
- **Catalog card** (the `border-top:4px double` letterpress card, anchor `data-tour-id="catalog-card"`): shelfmark, title (24), author·year, a key/value grid (Genre, Words, Vocab, UMAP-x/y), "See also" links, then "Driving vocabulary" chips and "Five nearest" list (color dot, title·author, cosine distance).

### 6.4 Topology (`screens_topology.jsx` → `Topology`) — see L-11
- Header: title "The topology of *{Region}*" + **Region** chip row + **3D projection** chips.
- Hero left (`1.5fr`): "i · Vietoris–Rips filtration" framed viewer (drag-orbit; ring nodes = genre hex; edges appear as ε grows; freshly-born edges flash accent) + readout "{n} edges · {k} loops alive" + the ε slider (accent-filled track) + caption.
- Side right (`300px`): "ii · Persistence diagram (H₁)" (birth×death canvas; diagonal; finite dots ∝ √persistence; ∞ marker; **accent sweep lines + shaded alive corner at ε**) and "iii · Persistence image (20×20 → 400-vector)" (heatmap with `paper2 → genreHex → ink` ramp + density legend).
- Empty state until a region is selected: dashed-ring ghost + "Pick a region to see its topology." Disclaimer footer (N-D vs 3D).
- **A field-level spec + its own runnable prototype targeting the *production* indigo theme + components (`VRViewer`, `EpsilonSlider`, `PersistenceDiagram`, `PersistenceHeatmap`) was delivered separately as `topology_tab_handoff`.** Use that bundle for the topology tab's production wiring; this screen is its reading-room-skinned counterpart.

### 6.5 Comparative Study (`screens_study.jsx` → `Study`)
- Centered title with **two genre pickers** flanking an "&" (anchor `data-tour-id="study-pickers"`).
- 3-column folio: left region (dot, label, count, mini-plate highlighting that region, "Only in {A}" chips) · center "what they share" (two-circle Venn motif, shared-term count, shared chips, "ε ∈ [0, 0.6]") · right region (mirror of left). Editor's note paragraph + footnote³ below. Curated word tables for a few pairs; generic fallback otherwise.

### 6.6 Submit a Text (`screens_reading.jsx` → `Upload`)
- 2-col: left the **reading desk** (anchor `data-tour-id="reading-desk"`) — "foolscap" framed textarea with word count, "Generate a reading →" / "or upload a .txt", and 3 sample-passage buttons; right an empty-state panel ("The reading appears here") + a privacy note. Submitting simulates work then routes to `verdict`.

### 6.7 The Reading / verdict (`screens_reading.jsx` → `Verdict`)
- Breadcrumb + share / print actions. 2-col: left the **essay** (label, 38px title, 3 indented paragraphs with footnotes⁴⁵⁶, a "Probability fix" bar chart, and a Notes block) · right a **catalog card for the text** (provisional shelfmark, Verdict + Confidence "0.71 · marginal", UMAP-x/y), a "Where it landed" mini-plate with a dashed pin, and "Nearest five works".
- Voice rule L-13.

### 6.8 About (`screens_landing.jsx` → `About`)
- 2-col prose: "On the method" / "On the genres".

### 6.9 The Guide (`guide.jsx`, `guide_figures.jsx`)
- Right side-sheet (480 wide), header "Reader's aid / The Guide", 3 tabs:
  - **01 Welcome** — what this is + a "you can do three things" card.
  - **02 How to wander** — a prominent "Begin the guided tour" button (6 stops · ~2 minutes · skippable) + the itinerary list. Launching the tour closes the sheet.
  - **03 How it works** — 5 method steps, each with a **live figure** (`guide_figures.jsx`): `FigWordEmbed` (words clustering), `FigCentroid` (weighted mean → a marked position, pulsing), `FigTopology` (auto-sweeping ε VR complex with a loop that's born then fills; also drag-scrub), `FigProjection` (a tilted cloud flattening to the plane, CSS loop), `FigVerdict` (probability bars filling on a cycle). Figures **must be visible at rest** (don't gate visibility on entrance animations / the document timeline).
- Footer with progress + "Continue / Enter the room →". Backdrop click closes.

### 6.10 The guided tour (`tour.jsx`) — see L-09/L-10
6 stops: ① plate (collection) ② catalog rail (collection) ③ catalog card (card) ④ topology plate (topology — pre-selects Mystery) ⑤ study pickers (study) ⑥ reading desk (upload). Each: navigate route → poll for `[data-tour-id]` → frame it with four dim panels + accent frame → pin the margin card (STOP n/6, title, body, End tour · ← Back · Next →). ←/→ and Esc work. Missing-anchor → wait ~700ms then advance.

### 6.11 Tweaks (`tweaks-panel.jsx`, wired in `app.jsx`)
Panel titled "Tweaks": Warmth (paper), Mark (accent swatches), Layout (carrel/study). Hidden unless the host toggles Tweaks on; persisted.

---

## 7. State & interactions

- **Router/state:** single `useReducer` in `app.jsx` — `route`, `genreFilter`, `hoveredBookId`, `selectedBookId`, `studyA/studyB`, `hasUploadedText`, `projection`, `dim`, `guideOpen`, `tourActive`, `tourStep`. In production, model this in Zustand (mirrors existing `visualizationStore` responsibilities + `uiStore` for guide/tour).
- **Hover/click on plate:** hover sets `hoveredBookId` (margin note + tooltip); click sets `selectedBookId` + routes to `card`.
- **Region filter:** clicking a rail genre toggles `genreFilter`; non-matching points drop to ~0.15 opacity; clicking again clears.
- **ε scrubbing (topology):** client-side only; edges appear at `ε ≥ birth`, fresh edges flash accent; diagram sweep + alive shading track ε; image gets an ε birth-axis guide. No server calls per frame.
- **Upload:** textarea → "Generate a reading" simulates the pipeline (~900ms) then `hasUploadedText=true` + route `verdict`.
- **Footnotes:** click superscript → modal; click backdrop/close to dismiss.
- **Tour:** see §6.10. **Guide auto-open:** once per browser (localStorage).
- **Animation robustness:** any "alive" figure/animation must degrade to a valid static frame if the timeline is paused (background tab). Don't hide content behind `opacity:0 → forwards` entrance animations.

---

## 8. Reused vs new

This is a **reskin + restructure**, not a backend change. Map to the existing app:

- **Reuse the data layer unchanged:** `useScatterData` / `useCorpusBooks` (plate + books), `useClassify` (upload → verdict), `useExplain` (why), `useVRData` / `usePersistenceDiagram` / `usePersistenceImage` (topology), `visualizationStore` / `uploadStore` / `uiStore`. Endpoints unchanged (§9).
- **Reuse component responsibilities, restyle the skin:** the existing `ScatterCanvas`/`PointCloud`, `GenreLegend`, `DetailPanel`, `ClassificationResult`, `NearestBooksList`, `TopologyPanel` + its children, `PipelineExplanation` (→ becomes Guide "How it works"), the tour overlay (`tour/TourOverlay` + `anchors.ts`).
- **New:**
  1. The whole **editorial visual system** (tokens.md) + the paper/accent/density Tweaks.
  2. **Screen compositions** as drawn (landing cover, collection 3-col with marginalia, catalog-card screen, comparative study folio, verdict essay) — these are new layouts over existing data.
  3. **Guide "How it works" live figures** (replaces the modal `PipelineExplanation` step visuals with the 5 reading-room figures).
  4. **6-stop tour** copy + reading-room spotlight styling (extends `anchors.ts`: add anchors `plate`, `catalog-rail`, `catalog-card`, `topology-plate`, `study-pickers`, `reading-desk`).
  5. **Reading-room topology skin** (the production-themed version ships in `topology_tab_handoff`).

## 9. Data contracts (unchanged from production)

Base `/api`. Topology (verbatim):
- `GET /viz/vr/{genre}?projection={pca|kpca|umap|tsne}` → `{ words:string[], positions:[x,y,z][], edges:[a,b,eps_birth,feature_type][], epsilon_max }`
- `GET /viz/persistence-diagram/{genre}?dim=1` (`/book/{id}`) → `{ points:[birth,death][], dim, epsilon_max }` (death may be `Infinity`)
- `GET /viz/persistence/{genre}?dim=1` (`/book/{id}`) → `{ data:number[], M, dim, vmin, vmax }`

Plate, classification, explain: use the **existing hooks as the source of truth**
(`useScatterData`, `useClassify`, `useExplain`, `useCorpusBooks`) — their response
shapes are unchanged; the prototype's `data.js`/`shared.jsx` mock only enough to
drive the layout (books with `id,t,a,y,g,x,y,kw,words,vocab,call`; a sample verdict
with top-N + nearest). Do not treat the mock book list as canonical data.

## 10. Responsive

The 1240×780 artboard is a **prototype framing device** (fixed canvas, scale-to-fit,
letterboxed). In production, implement the screens as a **fluid editorial layout**:
- Masthead is a normal sticky top bar.
- Collection/Card/Study/Verdict are CSS-grid columns (`260 / 1fr / 300` etc.) that
  collapse: at <~1100px drop the marginalia/sibling rail (the existing `study`
  density already describes the 2-col fallback); at <~768px stack to one column in
  source order. The plate/figures stay square and centered, min/max-clamped.
- The Guide side-sheet becomes full-width on narrow screens; the tour card clamps to
  the viewport with the same quadrant logic.

## 11. NOT-list

- Don't keep the Phase 10 indigo theme anywhere in these screens.
- Don't gate figure/animation visibility on the document timeline (background-tab safe).
- Don't change backend math/semantics; verdict copy stays "marginal", never "wrong".
- Topology stays **H₁-only**; the 3D view is a lossy projection — keep the N-D disclaimer.
- Don't ship the fixed artboard as the production layout (see §10).
- Don't invent corpus data — wire the real hooks.

## 12. Implementation order

1. **Tokens + shell:** install the type system, paper/accent/genre tokens, masthead, footer, footnote host, Tweaks (paper/accent/density).
2. **Collection** (plate + rail + marginalia) on `useScatterData`/`useCorpusBooks`.
3. **Catalog card** screen.
4. **Comparative Study** folio.
5. **Submit a Text → The Reading** on `useClassify` (+ `useExplain`).
6. **Topology** reskin (or land the `topology_tab_handoff` bundle, then apply this skin).
7. **About** + **Guide** (Welcome / How to wander / How it works figures).
8. **Guided tour** (anchors + 6 stops + spotlight).
9. **Responsive pass** (§10) + animation-robustness pass (§7).

## 13. Files in this bundle

```
reading_room_handoff/
├── README.md                         ← this file (authoritative)
├── design_files/
│   ├── prototype/                    ← runnable (React + Babel via CDN)
│   │   ├── index.html                ← loads fonts + all modules
│   │   ├── app.jsx                   ← reducer/router, footnotes, Stage, Tweaks wiring
│   │   ├── shell.jsx                 ← palettes/accents, masthead, footer, footnote host
│   │   ├── shared.jsx                ← GENRES, scatter generators, shared primitives
│   │   ├── data.js                   ← mock corpus (books, shelfmarks, keywords)
│   │   ├── screens_landing.jsx       ← Landing + About
│   │   ├── screens_collection.jsx    ← Collection + CorpusScatter
│   │   ├── screens_card.jsx          ← Catalog card
│   │   ├── screens_study.jsx         ← Comparative Study
│   │   ├── screens_topology.jsx      ← Topology (reading-room skin)
│   │   ├── screens_reading.jsx       ← Submit a Text + The Reading
│   │   ├── guide.jsx                 ← Guide side-sheet (3 tabs)
│   │   ├── guide_figures.jsx         ← 5 live "How it works" figures
│   │   ├── tour.jsx                  ← 6-stop spotlight tour
│   │   └── tweaks-panel.jsx          ← Tweaks host + controls
│   └── tokens.md                     ← full token system (no Phase 10 reuse)
└── screenshots/                      ← one PNG per screen / state
```

Open the prototype: `cd design_files/prototype && python3 -m http.server`, visit the
printed URL. Navigate via the masthead; the Guide auto-opens on first load; start the
tour from "How to wander"; toggle Tweaks from the toolbar.
