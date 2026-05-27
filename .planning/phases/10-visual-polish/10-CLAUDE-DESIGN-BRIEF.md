# Phase 10 — Claude Design Input Brief

**Purpose:** Self-contained brief to paste into Claude Design (a separate Claude conversation focused on UI design output) so it has the full product, codebase, and decision context needed to produce Phase 10 mockups and palette tokens. The output that comes back from Claude Design becomes the source material for the eventual `10-CONTEXT.md` and `10-PLAN.md`.

**Created:** 2026-05-28 during interactive `/gsd-discuss-phase 10`. Discussion was intentionally paused at the "select gray areas" step so the user could iterate visually in Claude Design before locking palette/tour-copy/library decisions into a CONTEXT.md.

**Workflow:**
1. User pastes this brief (and the referenced files) into Claude Design.
2. Claude Design produces design tokens, mockups, tour storyboard, library recommendation, and an explicit NOT-list.
3. User returns and re-runs `/gsd-discuss-phase 10` — the workflow detects the existing brief, lets the user paste Claude Design's output, and folds the new locked decisions into `10-CONTEXT.md`.
4. Planner reads CONTEXT.md (which references this brief and Claude Design's output) and writes the implementation plans.

---

## 1. One-pager (paste verbatim — gives Claude Design the product context)

> **Literary Genre Topology** — a hosted web app that makes the hidden geometric structure of literary genres visible. Books embed in a shared word2vec space (TF-IDF weighted); genre-specific shapes emerge as 3D point clouds you can rotate, classify against, and inspect. Users upload any book and see (a) where it lives in semantic space, (b) the top-3 calibrated genre predictions, and (c) a "why this genre?" panel with nearest-neighbour training books, per-track contributions, and driving words.
>
> **v1 shipped 2026-04-13.** Currently has a single dark theme with inline-hex colors. Phase 10 ("Visual Polish") is the final v2.0 phase — adds light/dark/system theming, a 3–5 step onboarding tour for first-time visitors, polished empty states, and a v2 genre-key relabel sweep that prior phases deferred.
>
> **Live URL (dark-only build):** https://word2vec-topology-genre-detector-production.up.railway.app

## 2. Visual snapshot of current state

```css
/* Current frontend/src/index.css — shadcn-convention HSL vars exist but most
   components still use inline hex. Phase 10 wires components to these tokens
   AND defines the light-mode equivalents (currently missing). */
:root {
  --background: 0 0% 4%;          /* dark only */
  --foreground: 240 20% 93%;
  --card: 240 13% 10%;
  --card-foreground: 240 20% 97%;
  --popover: 240 13% 10%;
  --popover-foreground: 240 20% 97%;
  --primary: 239 84% 67%;
  --primary-foreground: 0 0% 100%;
  --secondary: 240 10% 14%;
  --secondary-foreground: 240 20% 93%;
  --muted: 240 10% 14%;
  --muted-foreground: 240 5% 46%;
  --accent: 239 84% 67%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 240 13% 16%;
  --input: 240 13% 16%;
  --ring: 239 84% 67%;
  --radius: 0.5rem;
}

/* Phase 9 components currently hard-code: */
/* card surface  #16161F   ≈ HSL(240 13% 10%) — matches --card */
/* headline      #F5F5FF   ≈ HSL(240 100% 98%) */
/* body          #E0E0EC   ≈ HSL(240 20% 90%) */
/* muted         #6B6B80   ≈ HSL(240 9% 46%) */
/* action        #6366F1   ≈ HSL(239 84% 67%) — matches --primary */
/* body bg       #0A0A0F   ≈ HSL(240 22% 5%)  — matches --background */
```

**Genre swatches** (`frontend/src/constants/genres.ts` — v1 KEYS, need v2 update):

```
romance #F472B6   mystery #60A5FA   western #FB923C   fantasy #A78BFA
scifi #34D399     horror #F87171    historical #FBBF24 literary #2DD4BF
adventure #FB7185 gothic #C084FC
HISTORICAL_DIM_COLOR #D97706   UPLOADED_BOOK_COLOR #FBBF24
```

**v2 corpus genre keys** (these need new palette entries — relabel work Phase 8 deferred):

`adventure`, `gothic_horror`, `historical`, `literary`, `mystery`, `romance`, `speculative`, `western`

(8 genres × ~20 books = 154 books. `gothic` + `horror` merged into `gothic_horror`; `scifi` + `fantasy` merged into `speculative`.)

## 3. Phase 10 scope (the design surface to cover)

**Five POLISH requirements (verbatim from REQUIREMENTS.md):**

1. **POLISH-01** — Theme toggle (light / dark / system); choice persists via a NEW `preferencesStore` (Zustand `persist`), **separate** from session-scoped `visualizationStore`.
2. **POLISH-02** — R3F scatter scene background + HoverTooltip + persistence diagrams + all sidebar/topology/compare components honor the selected theme. Scene background updates imperatively via `scene.background` (no canvas remount).
3. **POLISH-03** — First-load detection → 3–5 step onboarding tour anchored on stable `data-tour-id` selectors (centralised in `src/tour/anchors.ts`); skippable; replayable from a Help menu.
4. **POLISH-04** — Tour covers: scatter exploration, genre selection + brightness, upload + classification flow, topology tab. **Explains the UI, not the math** — math stays in the existing "How It Works" walkthrough.
5. **POLISH-05** — Empty states polished for exactly 4 surfaces: pre-upload upload zone, comparison mode with no genres selected, classification failure, explanation panel before any upload exists.

## 4. Locked decisions (Claude Design should NOT redesign these)

| Constraint | Source |
|---|---|
| Theme store separate from visualization store (different lifetimes: persisted vs session) | Phase 6 CONTEXT |
| Dark stays default for first-paint | Phase 3 CONTEXT |
| HSL CSS variables (not Tailwind `dark:` prefix, not design-token JSON) | Phase 9 D-55 |
| R3F scene background updates imperatively — no canvas remount, no WebGL context loss on toggle | POLISH-02, PITFALLS §13 |
| Tour anchors centralised in `src/tour/anchors.ts`; missing-anchor fallback is `'skip'` not `'error'` | POLISH-03, PITFALLS §14 |
| Tour explains UI not math — math stays in existing How-It-Works walkthrough | POLISH-04 |
| Empty states only for the 4 listed surfaces — not a horizontal sweep across every component | POLISH-05 scope |
| Tour library choice (`react-joyride@^3.1.0` vs hand-rolled overlay) is open — Claude Design can recommend, plan author decides | ROADMAP Phase 10 open decision |

## 5. Open questions Claude Design should answer

1. **Light theme palette** — Light-mode HSL values for every `:root` variable above. Match the brand of the dark theme (deep purple primary, subtle accents) but on a light canvas. Maintain WCAG AA contrast for body + headline.
2. **R3F scene background under light theme** — Pure white feels harsh on a 3D point cloud. Off-white? Faint cool grey? Should the dim/uploaded-book color rules need light-mode variants?
3. **v2 genre palette** — 8 colors for `adventure / gothic_horror / historical / literary / mystery / romance / speculative / western`. Each must read well on BOTH light and dark backgrounds. (Current v1 palette assumes dark background.)
4. **Tour copy + tone** — 3–5 steps × ~40-60 words each. Match the voice of `Step7ValidationLimitations.tsx` (D-53 "upper bound" framing, breezy not academic) but for UI orientation instead of validation caveats. Sample anchors: `scatter-canvas`, `genre-toggle-row`, `upload-zone`, `topology-tab`, `why-button`.
5. **Empty-state copy + visuals** — 4 surfaces × intentional copy + optional icon/illustration. No generic "No data" placeholders.
6. **Help menu placement** — Where does "Replay tour" live? Header dropdown? Sidebar item? Floating help button?

## 6. Reference materials (paste these files into Claude Design)

**Frontend layout / current components** — attach screenshots from the live URL, plus these source files:

```
# Core layout + theming surface
frontend/src/index.css                           — current :root HSL vars
frontend/src/App.tsx                             — top-level layout
frontend/src/stores/uiStore.ts                   — pattern for the new preferencesStore
frontend/src/stores/visualizationStore.ts        — session store (do NOT collapse into prefs)
frontend/src/constants/genres.ts                 — v1 genre palette (needs v2 update)

# Phase 9 components that hard-code hex (the "30 components" sweep target)
frontend/src/components/sidebar/ClassificationResult.tsx
frontend/src/components/sidebar/TopNList.tsx
frontend/src/components/sidebar/UncertaintyBadge.tsx
frontend/src/components/sidebar/ClassificationExplain.tsx
frontend/src/components/sidebar/NearestBooksList.tsx
frontend/src/components/sidebar/TrackContributionBars.tsx
frontend/src/components/sidebar/DrivingWordsPills.tsx

# Existing walkthrough — match its voice, do NOT replace it
frontend/src/components/explanation/PipelineExplanation.tsx
frontend/src/components/explanation/steps/*.tsx

# 3D scatter scene (the canvas that the theme must reach imperatively)
frontend/src/components/canvas/*.tsx

# Comparison + topology tabs (theming + empty states)
frontend/src/components/compare/*.tsx
frontend/src/components/topology/*.tsx
```

**Pitfall + architecture docs Claude Design should respect:**

```
.planning/research/PITFALLS.md §13   — scene background must not cause canvas remount
.planning/research/PITFALLS.md §14   — tour anchors are brittle if not centralized
.planning/research/ARCHITECTURE.md §5c — theme store lifetime separation rationale
.planning/research/ARCHITECTURE.md §5d — tour-library tradeoffs (joyride vs hand-rolled)
.planning/research/ARCHITECTURE.md §6  — why dark mode is last (horizontal sweep)
.planning/REQUIREMENTS.md POLISH-01..05 — full requirement text
.planning/ROADMAP.md "Phase 10: Visual Polish" — success criteria
```

## 7. Output format to request from Claude Design

Ask Claude Design to produce, in this order:

1. **Design tokens** — full HSL light-mode palette (every variable in `:root`); v2 genre palette with light + dark contrast notes; any new tokens introduced (e.g., `--scene-bg`).
2. **Component mockups** — visual mockups of the four empty states with copy, and one before/after of `ClassificationResult.tsx` migrated from inline-hex to HSL vars.
3. **Tour storyboard** — 3–5 frames, each with: anchor `data-tour-id`, headline (≤8 words), body (40–60 words), prev/next/skip buttons. Match Step7 voice.
4. **Recommended `src/tour/anchors.ts` shape** — the constant object the planner can drop in.
5. **Help-menu sketch** — placement + interaction model.
6. **Library recommendation** — `react-joyride` vs hand-rolled, with one paragraph rationale tied to this specific app's constraints (R3F z-index, Phase 9 sidebar tooltip overlap).
7. **A specific NOT list** — what they consciously chose NOT to redesign (so the Phase 10 planner doesn't second-guess gaps).

## 8. Things to explicitly tell Claude Design NOT to design

- New features (counterfactual explanations, mobile-native app, multi-language, accounts) — out of scope for v2
- Backend API changes — frontend-only sweep
- The math/explainability content itself — wording in How-It-Works walkthrough stays put
- Replacing Three.js or the 3D scatter — only its background + lighting under theme
- Logo or brand identity work — current "Literary Genre Topology" name + visual identity are locked

---

## What happens when Claude Design output comes back

Re-run `/gsd-discuss-phase 10`. The workflow will detect this brief and ask whether to fold Claude Design's output into the canonical CONTEXT.md. At that point we lock in:

- The chosen light-theme HSL values → `<decisions>` D-01 in 10-CONTEXT.md
- The v2 genre palette → D-02
- Tour library winner → D-03 (closes the ROADMAP open decision)
- Tour copy + anchor names → D-04
- Empty-state copy → D-05
- Help-menu placement → D-06

Then `/gsd-plan-phase 10` reads CONTEXT.md + this brief + Claude Design's output and breaks the implementation into plans.

---

*Pending Claude Design output. Brief is the canonical source of constraints; downstream agents should treat this file as read-only context once locked decisions land in 10-CONTEXT.md.*
