# Phase 10: Visual Polish - Context

**Gathered:** 2026-05-28
**Status:** Ready for execution (design handoff received and folded in)

<domain>
## Phase Boundary

Phase 10 is the final v2.0 phase. It adds **theming** (light / dark / system), an **onboarding tour**, polished **empty states**, and a **v2 genre relabel sweep** on top of the existing Phase 9 app. **No new features** — every change is a polish move on a surface that already exists.

The 5 POLISH requirements (POLISH-01..05) are the scope anchor:
1. POLISH-01 — Theme toggle with persistent `preferencesStore`
2. POLISH-02 — Scatter scene background + every sidebar/topology/compare component honor theme; scene background updates imperatively
3. POLISH-03 — First-load onboarding tour anchored on `data-tour-id`, replayable from Help menu
4. POLISH-04 — Tour covers scatter / genre / upload / topology; explains UI not math
5. POLISH-05 — Empty states polished for exactly 4 surfaces

</domain>

<decisions>
## Implementation Decisions (locked from Claude Design review — 2026-05-28)

All decisions trace to `.planning/phases/10-visual-polish/design_handoff/design_handoff_phase10_visual_polish/README.md`.

### Theme Direction

- **D-56:** Light theme = **Paper** — warm cream canvas (`#FBF9F2` / HSL `40 30% 97%`), white cards (`#FFFFFF`) float on it. Rejected alternatives were "Pearl" (cool blue-gray) and "Linen" (yellower). [README §4, §5]
- **D-57:** Dark theme baseline stays from Phase 9 inline-hex (`#0A0A0F` body, `#16161F` cards, `#6366F1` primary) — only restructured into HSL CSS variables under `:root`. No visual change. [README §5]
- **D-58:** Dark stays default for first paint (Phase 3 CONTEXT lock confirmed). `<html>` ships without `.light` class; `applyTheme()` adds it when user picks light. [README §9.3]
- **D-59:** HSL CSS variables in `:root` and `:root.light` — **NOT** Tailwind `dark:` prefix, **NOT** design-token JSON (Phase 9 D-55 lock). [README §2, §13]

### v2 Genre Palette (replaces v1 GENRE_COLORS)

- **D-60:** Dual-token palette — each of the 8 v2 keys (`adventure`, `gothic_horror`, `historical`, `literary`, `mystery`, `romance`, `speculative`, `western`) carries a light hex and a dark hex. `GENRE_COLORS: Record<Theme, Record<Genre, string>>`. [README §6]
- **D-61:** `HISTORICAL_DIM_COLOR` and `UPLOADED_BOOK_COLOR` become `{ light, dark }` records. `UPLOADED_BOOK_COLOR.light = #1D4ED8` (deep blue — saffron melts into cream); `.dark = #FBBF24` unchanged. [README §5 scene-adjacent table]
- **D-62:** `buildBuffers` takes the resolved theme as an argument (or reads from `preferencesStore` directly) to pick the right color set when building the scatter's `colors` Float32Array. [README §6 implementation note]

### Theme Application

- **D-63:** `applyTheme(theme: 'light' | 'system' | 'dark')` — toggle `<html>` class `.light` based on resolved effective theme. System mode reads `window.matchMedia('(prefers-color-scheme: light)')` and subscribes to changes so System tracks OS preference live. [README §9.3]
- **D-64:** Scene background reads `--scene-bg` CSS variable, parses via temporary DOM element, applies imperatively via `scene.background = new THREE.Color(rgb)` inside `useEffect([theme])`. **NEVER** key the `<Canvas>` on theme — that remounts WebGL and loses camera pose (PITFALLS §13). [README §8 scene-bg section + §13]

### State Management

- **D-65:** NEW `preferencesStore` (Zustand `persist` middleware, key `lgt-prefs-v1`). Carries:
  - `theme: 'light' | 'system' | 'dark'` (default `'system'`)
  - `tourCompleted: boolean` (default `false`)
  - `setTheme()` + `setTourCompleted()` actions
  Separate from `visualizationStore` (session-scoped) and `uiStore` (sidebar) per Phase 6 CONTEXT lock. [README §10]
- **D-66:** Active tour state (`tourActive`, `tourStep`) lives transiently in `<TourProvider>` component state — only `tourCompleted` persists. [README §10 tour state]

### Help Menu

- **D-67:** Placement = **Header dropdown**. New `?` icon button in top nav between "How It Works" and the gear. Button uses JetBrains Mono, weight 600. Open state: `--primary` border + outer ring. Toggles dropdown on click. Carries `data-tour-id="help-menu"`. [README §4, §8 top-nav]
- **D-68:** Dropdown is 280px wide, positioned absolutely below `?` button, `--popover` background with arrow tip pointing up. Closes on outside-click or Esc. Contents in order:
  1. `↻ Replay tour` — `4 steps · ~90 seconds`
  2. `📖 How It Works` — `7-step math walkthrough`
  3. `⌨ Keyboard shortcuts` — `R · Esc · 1–4`
  4. Divider
  5. **THEME** label + 3-state segmented control: `[☀ Light][⟳ System][☾ Dark]` (wraps `data-tour-id="theme-toggle"`)
  6. Divider
  7. `⊞ View on GitHub` (external link)
  [README §8]

### Onboarding Tour

- **D-69:** Tour library = **hand-rolled overlay** (~150 LoC, no external dep). Rejected `react-joyride@^3.1.0` for size + R3F z-index conflicts + Phase 9 sidebar tooltip overlap. [README §4]
- **D-70:** Tour length = **4 steps** (dropped the original Step 4 "Why this genre?"). Final step order:
  1. `scatter-canvas` — "Each dot is a word."
  2. `genre-select` — "Light up a genre."
  3. `upload-zone` — "Drop a book."
  4. `topology-tab` — "Two more views worth a look."
  Full body copy locked in README §9.2. [README §4, §9.2]
- **D-71:** Anchors centralised in `src/tour/anchors.ts` as a `TOUR_ANCHORS` constant. Every `data-tour-id` value comes from this constant — no string literals in JSX (PITFALLS §14). `TOUR_STEPS` exported alongside; `findAnchor()` helper provided. [README §9.2]
- **D-72:** Missing-anchor fallback is `'skip'`, **never** `'error'`. If `findAnchor()` returns null, wait 600ms (anchor may be on a sibling tab and need a mount), check again, then silently advance. [README §9.2]
- **D-73:** First-load detection — on first render, if `preferencesStore.tourCompleted === false`, set `tourActive = true` after a 600ms delay (lets layout settle before measuring anchor). On Done or Skip → `tourActive = false; tourCompleted = true`. Replay = clicking dropdown item resets `tourCompleted = false; tourActive = true; tourStep = 0`. [README §9.2 behaviour]
- **D-74:** Tour overlay visual — full-viewport dim layer at `hsl(var(--background) / 0.55)` (click → skip); glow ring positioned via `getBoundingClientRect()` with 8px padding, `box-shadow: 0 0 0 4px hsl(var(--primary) / 0.55), 0 0 22px hsl(var(--primary) / 0.55)`, transitions `top/left/width/height` over 280ms when step changes; tour card pinned `bottom: 28px; right: 28px;` — **card never moves between steps**, only the glow tracks the anchor. [README §9.2]
- **D-75:** Keyboard nav — `Esc` skip, `ArrowRight` next, `ArrowLeft` back. [README §9.2 keyboard]
- **D-76:** CI smoke test — Playwright iterates `TOUR_STEPS`, asserts each `findAnchor()` is non-null on a freshly mounted app. [README §9.2 CI smoke test + §15 step 10]

### Empty States (4 surfaces only — POLISH-05 scopes exactly four)

- **D-77:** **A · Pre-upload UploadZone** (`data-tour-id="upload-zone"`) — 2px dashed `--border` drop zone (solid `--primary` on hover/drag); constraints shown BEFORE upload (`.txt · ≤5MB · ≥500 words`); ghost-scatter helper 70×44px SVG with ~7 dim genre dots and one dashed-circle ghost marker in `UPLOADED_BOOK_COLOR.light` showing where the upload will land. Helper copy: "Your book will appear in the cloud — the marker shows where it'll land. / Usually under 12 seconds." [README §9.4A]
- **D-78:** **B · Compare tab, no genres selected** (`data-tour-id="compare-tab"`) — headline "Pick two genres to compare"; subhead "Shared color scale · same projection · synchronised camera. Compare reveals where two genres' vocabularies overlap and where they diverge."; two ghost panels (1.5px dashed `--border`, 14px radius) tinted with `<genre color> / 0.04` background, each with inline `+ Pick genre` button. Sidebar hint mentions `gothic_horror` and `speculative` as natural compare candidates (teaches the new v2 keys). [README §9.4B]
- **D-79:** **C · Classification failure** (`data-tour-id="classification-result"`) — headline pattern `"We couldn't [verb] this file"` (NEVER "Error occurred"). Two color levels:
  - **Red wash** (`--destructive` / `--error-*` tokens) for fixable: encoding, too short, wrong format
  - **Amber wash** (`--warn` family) for handled: 410 Gone, 503 calibration
  Exactly one next action per variant. For 503: top-1 prediction **stays rendered** next to the warning. Specific copy locked in README §9.4C table. [README §9.4C]
- **D-80:** **D · ClassificationExplain pre-upload** (`data-tour-id="explain-panel"`) — headline "Upload a book first." (honest, not coy); three ghost rows mirroring the three real sub-panels (`NearestBooksList`, `TrackContributionBars`, `DrivingWordsPills`) with `--muted` background, 1.5px dashed `--border`, mono uppercase label; **D-51 footnote does NOT render in empty state** — only appears when there's a verdict to qualify. [README §9.4D]
- **D-81:** Empty Topology tab — 320×240px ghost heatmap (1.5px dashed `--border`, linear-gradient `--muted` → `--secondary` at 50% opacity); copy "Pick a genre to see its topology. Topology shows the H₁ persistence image — the holes that survive as you zoom out. Pick a genre or book from the sidebar to compute it." Carries `data-tour-id="topology-tab"`. [README §9.6]

### Component Sweep (~30 components)

- **D-82:** `ClassificationResult.tsx` is the **canonical sweep pattern**. The 7-row before/after table in README §9.1 (inline hex → `hsl(var(--*))`) applies verbatim to every other sidebar/topology/compare component. [README §9.1]
- **D-83:** Sweep adds `data-tour-id` attributes on the components named in `TOUR_ANCHORS`. [README §7 + §9.1]
- **D-84:** `UncertaintyBadge` stays amber-on-amber-tint in BOTH themes (NOT-list item). Signals shouldn't theme away. [README §9.5 + §12 #5]
- **D-85:** Disclaimer ribbon copy and position unchanged — only color lifts to `--muted` / `--muted-foreground`. [README §8 + §12 #8]

### Out of Scope (NOT-list — 12 items, do not touch)

[README §12 — 12 explicit NOT-list items including: shadcn token names, 7-step How-It-Works walkthrough (Steps 1-6 verbatim; Step 7 Phase 9 D-51 verbatim), Three.js scatter itself (only background + colors theme), 30-component sweep target list, UncertaintyBadge amber identity, empty states beyond the 4 listed, parameter-drawer tier UI, disclaimer banner copy + position, H₁-only homology tab structure, default theme dark, store unification, logo/wordmark (defaults to out-of-scope per §11).]

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Handoff (the master spec)

- `.planning/phases/10-visual-polish/design_handoff/design_handoff_phase10_visual_polish/README.md` — **the canonical spec** (682 lines covering tokens, mockups, tour, empty states, NOT-list, implementation order in §15)
- `.planning/phases/10-visual-polish/design_handoff/design_handoff_phase10_visual_polish/design_files/prototype/index.html` — source of truth for every CSS token + utility class
- `.planning/phases/10-visual-polish/design_handoff/design_handoff_phase10_visual_polish/design_files/prototype/components.jsx` — component patterns + composition
- `.planning/phases/10-visual-polish/design_handoff/design_handoff_phase10_visual_polish/design_files/prototype/tour.jsx` — hand-rolled tour overlay reference implementation
- `.planning/phases/10-visual-polish/design_handoff/design_handoff_phase10_visual_polish/design_files/prototype/app.jsx` — top-level app structure + theme application
- `.planning/phases/10-visual-polish/design_handoff/design_handoff_phase10_visual_polish/design_files/Phase 10 Final Spec.html` — locked decisions table
- `.planning/phases/10-visual-polish/design_handoff/design_handoff_phase10_visual_polish/design_files/Phase 10 Wireframe Mockups.html` — 8 wireframe artboards

### Brief Authoring Trail

- `.planning/phases/10-visual-polish/10-CLAUDE-DESIGN-BRIEF.md` — the brief the user pasted into Claude Design
- `.planning/phases/10-visual-polish/10-V2-FEATURE-INDEX.md` — companion feature index

### Pitfalls Phase 10 owns

- `.planning/research/PITFALLS.md` §13 — scene background must not remount canvas
- `.planning/research/PITFALLS.md` §14 — tour anchors brittle without centralization

### Architecture Inheritance

- `.planning/research/ARCHITECTURE.md` §5c — theme store lifetime separation
- `.planning/research/ARCHITECTURE.md` §5d — tour-library tradeoffs (decision locked: hand-rolled)
- `.planning/research/ARCHITECTURE.md` §6 — why dark mode is the last horizontal sweep

### Prior CONTEXT decisions inherited

- `.planning/phases/06-v1-bug-fix-sweep/06-CONTEXT.md` — theme store separation rationale
- `.planning/phases/09-classification-depth/09-CONTEXT.md` D-54 (no Playwright until Phase 10), D-55 (HSL variables; inline-hex sweep target)

### Requirements + Roadmap

- `.planning/REQUIREMENTS.md` POLISH-01..05 verbatim
- `.planning/ROADMAP.md` §"Phase 10: Visual Polish" — success criteria

### Current Frontend State (the migration target)

- `frontend/src/index.css` — existing `:root` HSL variables (already shadcn-style; need `:root.light` block added + new tokens `--scene-bg`, `--sidebar-bg`, etc.)
- `frontend/src/constants/genres.ts` — v1 palette (needs full replacement per D-60)
- `frontend/src/stores/uiStore.ts` — session-scoped pattern reference for new `preferencesStore`
- `frontend/src/stores/visualizationStore.ts` — do NOT merge into preferences
- `frontend/src/components/sidebar/ClassificationResult.tsx` — canonical sweep pattern (D-82)
- `frontend/src/components/sidebar/*.tsx` + `frontend/src/components/topology/*.tsx` + `frontend/src/components/compare/*.tsx` + `frontend/src/components/canvas/*.tsx` — 30-component sweep target

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `frontend/src/index.css` already declares shadcn-convention HSL `:root` variables (`--background`, `--card`, `--primary`, `--muted`, `--border`, `--ring`, etc.) — these stay, light theme adds the `.light` scope
- `frontend/src/stores/uiStore.ts` is the Zustand pattern to mirror (but uiStore is session-only — new `preferencesStore` adds `persist` middleware)
- Phase 9 components (`TopNList`, `UncertaintyBadge`, `ClassificationExplain`, `NearestBooksList`, `TrackContributionBars`, `DrivingWordsPills`, `Step7ValidationLimitations`) use inline hex `#16161F`, `#F5F5FF`, `#E0E0EC`, `#6B6B80`, `#6366F1`, `#0A0A0F` — these map 1:1 to the new tokens per D-82's before/after table

### Established Patterns

- Vite + React 18 + TypeScript + Zustand + Tailwind v4 (CSS-based config, no `tailwind.config.js`)
- Inline-hex styling in Phase 9 was the explicit "Phase 10's job to refactor" decision (Phase 9 D-55)
- No existing `frontend/src/tour/` directory — Phase 10 creates from scratch
- No existing `frontend/src/stores/preferencesStore.ts` — Phase 10 creates from scratch
- No existing `frontend/src/components/canvas/` theme integration — `<Canvas>` background needs imperative wiring (D-64)
- Tests: Vitest + React Testing Library exist in `__tests__/`; Playwright does NOT exist yet (Phase 10 introduces per D-76)

### Integration Points

- Top nav (existing `frontend/src/components/nav/`) gets new `?` button + dropdown
- Every sidebar component gets `data-tour-id` if listed in `TOUR_ANCHORS`
- `<Canvas>` element gets `data-tour-id="scatter-canvas"`
- Genre dropdown selector gets `data-tour-id="genre-select"`
- UploadZone gets `data-tour-id="upload-zone"`
- Topology tab trigger gets `data-tour-id="topology-tab"`
- `App.tsx` root mounts `<TourProvider>` and applies theme via `applyTheme()` on `preferencesStore` change

</code_context>

<specifics>
## Specific Ideas (locked copy)

### Tour Step Copy (verbatim — D-70)

**Step 1 — `scatter-canvas`:**
- Title: "Each dot is a word."
- Body: "Words from 154 books, arranged so similar-meaning words sit close together. Drag to rotate, scroll to zoom, press R to reset. You're seeing a 3D version of something that lives in higher dimensions — close enough to explore."

**Step 2 — `genre-select`:**
- Title: "Light up a genre."
- Body: "Pick one — its signature words brighten, the common ones fade. Brightness shows how strongly a word belongs to that genre vs the others. Slide through individual books in that genre and watch the pattern shift, book by book."

**Step 3 — `upload-zone`:**
- Title: "Drop a book."
- Body: "Drag in any .txt file. We compare its shape to each genre's shape and predict what it is — you'll get the three most likely genres with confidence scores, and the book itself shows up in the cloud with its own bright words highlighted."

**Step 4 — `topology-tab`:**
- Title: "Two more views worth a look."
- Body: "Topology shows each genre as a shape, and tracks the holes that survive as you zoom out — a fingerprint the classifier actually uses. Compare puts two genres side-by-side. Both work from the full geometry, not the 3D view you've been rotating."

### Failure Card Copy (verbatim — D-79)

| Variant | Headline | Body | Severity |
|---|---|---|---|
| Encoding | We couldn't read this file | Looks like the encoding wasn't UTF-8. Try saving the file as plain UTF-8 text and dropping it again. | Red |
| < 500 words | Too short to classify. | Try a longer book — at least 500 words. | Red |
| Wrong format | Only .txt files for now. | PDF and EPUB support is on the v3 roadmap. | Red |
| 410 Gone | This result expired. | Upload the file again to recompute. (5-min Redis TTL on `feature_vec`.) | Amber |
| 503 calibration | Top genre still shown. | Probability bars degraded. The classifier is fine; only the calibration step missed. | Amber |

### v2 Genre Palette (verbatim — D-60)

```ts
type Theme = 'light' | 'dark';
type Genre = 'adventure' | 'gothic_horror' | 'historical' | 'literary'
           | 'mystery' | 'romance' | 'speculative' | 'western';

export const GENRE_COLORS: Record<Theme, Record<Genre, string>> = {
  light: {
    adventure:     '#DC2626',
    gothic_horror: '#7C3AED',
    historical:    '#B45309',
    literary:      '#0F766E',
    mystery:       '#1D4ED8',
    romance:       '#BE185D',
    speculative:   '#4338CA',
    western:       '#9A3412',
  },
  dark: {
    adventure:     '#F87171',
    gothic_horror: '#B47AE6',
    historical:    '#FBBF24',
    literary:      '#5EEAD4',
    mystery:       '#60A5FA',
    romance:       '#F472B6',
    speculative:   '#818CF8',
    western:       '#F97316',
  },
};
export const GENRE_LIST: Genre[] = Object.keys(GENRE_COLORS.dark) as Genre[];
export const HISTORICAL_DIM_COLOR = { light: '#B45309', dark: '#D97706' };
export const UPLOADED_BOOK_COLOR  = { light: '#1D4ED8', dark: '#FBBF24' };
```

</specifics>

<deferred>
## Deferred Ideas

- **Logo/wordmark restyle (README §11 open item)** — defaults to **out of scope per §12 #12**; wordmark renders exactly as it does today. If revisited later, options were: (a) confirm out-of-scope, (b) color-only theme it (`--foreground`), (c) full wordmark redesign (separate phase).
- **Future tour Step 4 add-back ("Why this genre?")** — `TOUR_ANCHORS` includes `whyButton`, `classificationResult`, `explainPanel` so a future phase can extend `TOUR_STEPS` to 5 without re-wiring anchors.
- **Mobile-responsive view** — not in scope for v2 (POL-02 in deferred backlog).
- **Keyboard shortcut cheat sheet overlay** — listed in help dropdown but as a link only (no overlay implementation in Phase 10). Deferred to v2.1 polish.
- **CI/CD pre-commit hook auto-installer** — Phase 6 CONTEXT mentioned this as a "candidate Phase 10 polish item"; not scoped here (out of scope per §12 narrowing).

</deferred>

---

*Phase: 10-visual-polish*
*Context gathered: 2026-05-28*
*Design handoff folded in: 2026-05-28*
