# Handoff: Phase 10 — Visual Polish

**Project:** Literary Genre Topology — v2.0 visual polish layer
**Audience:** Developer implementing Phase 10 in the existing React + Vite + Zustand frontend
**Date:** 2026-05-28
**Status:** Design locked from review (one open question on the wordmark — see §11)

---

## 1. Overview

Phase 10 is the final v2.0 phase. It adds **theming** (light / dark / system), an **onboarding tour**, polished **empty states**, and a **v2 genre relabel sweep** on top of the existing Phase 9 app. There are no new features — every change is a polish move on a surface that already exists.

Five POLISH requirements drive the work:

| Req | What |
|---|---|
| **POLISH-01** | Theme toggle, persisted via a new `preferencesStore` (Zustand persist), separate from session-scoped `visualizationStore`. |
| **POLISH-02** | R3F scatter scene background + HoverTooltip + persistence diagrams + all sidebar/topology/compare components honor the selected theme. **Scene background updates imperatively via `scene.background` — no canvas remount.** |
| **POLISH-03** | First-load detection → 3–5 step onboarding tour anchored on stable `data-tour-id` selectors centralized in `src/tour/anchors.ts`; skippable; replayable from a Help menu. |
| **POLISH-04** | Tour covers: scatter exploration, genre selection + brightness, upload + classification flow, topology tab. Tour explains the **UI**, not the math (math stays in How It Works). |
| **POLISH-05** | Empty states polished for exactly **4 surfaces**: pre-upload UploadZone, Compare with no genres selected, classification failure, ClassificationExplain pre-upload. |

---

## 2. About the Design Files

> ⚠️ **The HTML files in `design_files/` are design references, not production code.**
>
> They're prototypes showing intended look and behaviour. Your job is to **recreate these designs inside the existing frontend** (`frontend/src/` — React 18 + TypeScript + Vite + Zustand + Tailwind 4 via `@import "tailwindcss"`) using the established patterns. Don't copy the HTML/CSS verbatim — translate it into the codebase's conventions:
>
> - HSL CSS variables in `:root` and `:root.light` (Phase 9 D-55 lock — **not** Tailwind `dark:` prefix, **not** design-token JSON)
> - Components live in `frontend/src/components/<area>/`
> - State via Zustand stores (`preferencesStore` new; `visualizationStore`, `uploadStore`, `uiStore` existing)
> - `data-tour-id` attributes on real DOM nodes, sourced from `src/tour/anchors.ts`

The prototype's React+Babel setup is a wireframe scaffold, not a target architecture.

---

## 3. Fidelity

**High-fidelity** with finalized colors, typography, spacing, and interactions:
- Every color is final hex; map to HSL variables (see §5).
- v2 genre palette is final (see §6).
- Tour copy is locked (see §9.2 — already jargon-reduced).
- Empty-state copy is locked (see §9.4).

The interaction patterns in the prototype (tour overlay behaviour, upload flow simulation, help-dropdown chrome) are **definitive**.

---

## 4. Locked decisions (from review)

| Decision | Pick |
|---|---|
| **Light theme direction** | **A · Paper** — warm cream canvas (`#FBF9F2`), white cards float on it |
| **Help menu placement** | **A · Header dropdown** — "?" icon between "How It Works" and the gear |
| **Tour library** | **Hand-rolled overlay** — ~150 LoC, no external dep |
| **Tour length** | **4 steps** — dropped the original Step 4 "Why this genre?" |
| **Genre palette** | **Dual-token** — each genre has a light hex and a dark hex |
| **`anchors.ts` shape** | Ship as drawn (4-step `TOUR_STEPS` variant) |
| **Empty states** | All 4 surfaces approved as drawn |
| **`ClassificationResult` before/after** | Approved as the canonical sweep pattern (inline-hex → HSL var) |
| **Theme toggle UI** | 3-state segmented control — Light / System / Dark, inside the help dropdown |

---

## 5. Design tokens

### Light · Paper — under `:root.light`

| Variable | HSL | Hex | Notes |
|---|---|---|---|
| `--background` | `40 30% 97%` | `#FBF9F2` | warm off-white canvas |
| `--foreground` | `235 25% 13%` | `#181A2D` | body text |
| `--card` | `40 60% 100%` | `#FFFFFF` | cards float on cream |
| `--card-foreground` | `235 28% 14%` | `#191B2E` | — |
| `--popover` | `40 60% 100%` | `#FFFFFF` | matches card |
| `--popover-foreground` | `235 28% 14%` | `#191B2E` | — |
| `--secondary` | `40 25% 92%` | `#F0EDE2` | track / dim surface |
| `--secondary-foreground` | `235 28% 14%` | `#191B2E` | — |
| `--muted` | `40 25% 92%` | `#F0EDE2` | matches secondary |
| `--muted-foreground` | `240 10% 41%` | `#5E6075` | meta / helper text |
| `--accent` | `239 84% 58%` | `#4F46E5` | matches primary |
| `--accent-foreground` | `0 0% 100%` | `#FFFFFF` | — |
| `--destructive` | `0 73% 51%` | `#DC2626` | error red, AA on cream |
| `--destructive-foreground` | `0 0% 100%` | `#FFFFFF` | — |
| `--border` | `40 18% 86%` | `#E5E2D6` | — |
| `--input` | `40 18% 86%` | `#E5E2D6` | matches border |
| `--primary` | `239 84% 58%` | `#4F46E5` | deepened from dark (was `67%`) for AA on cream |
| `--primary-foreground` | `0 0% 100%` | `#FFFFFF` | — |
| `--ring` | `239 84% 58%` | `#4F46E5` | matches primary |
| `--scene-bg` | `40 30% 97%` | `#FBF9F2` | **NEW** · matches `--background`; R3F reads imperatively |

### Dark — unchanged baseline under `:root`

| Variable | HSL | Hex | Notes |
|---|---|---|---|
| `--background` | `0 0% 4%` | `#0A0A0F` | default first paint |
| `--foreground` | `240 20% 93%` | `#E8E8F2` | — |
| `--card` | `240 13% 10%` | `#16161F` | — |
| `--secondary` / `--muted` | `240 10% 14%` | `#22232E` | — |
| `--border` / `--input` | `240 13% 16%` | `#272832` | — |
| `--muted-foreground` | `240 5% 46%` | `#6E6E83` | — |
| `--primary` / `--accent` / `--ring` | `239 84% 67%` | `#6366F1` | — |
| `--destructive` | `0 84% 60%` | `#EF4444` | — |
| `--scene-bg` | `0 0% 4%` | `#0A0A0F` | **NEW** · matches `--background` |

### Scene-adjacent constants

These two render in the canvas and need explicit light/dark hexes (not derived from HSL vars):

| Constant | Light | Dark | Rationale |
|---|---|---|---|
| `HISTORICAL_DIM_COLOR` | `#B45309` | `#D97706` | amber dims darker on each canvas so it stays distinct from the bright historical fill while uploads are active |
| `UPLOADED_BOOK_COLOR` | `#1D4ED8` | `#FBBF24` | saffron melts into cream → deep blue on light; saffron stays on dark |

### Other added tokens

- `--sidebar-bg`, `--sidebar-border` — distinct from `--card` so the sidebar can have its own surface treatment if needed (currently white in light, near-black in dark).
- `--warn`, `--warn-soft`, `--warn-strong` — uncertainty badge + 410/503 amber error variants.
- `--good`, `--good-soft` — completed pipeline steps.
- `--error-bg`, `--error-border`, `--error-fg`, `--error-mid` — the destructive failure card wash.

The prototype's `prototype/index.html` `<style>` block lists every token verbatim. Use it as the source of truth for translation into `frontend/src/index.css`.

---

## 6. v2 genre palette — dual-token

Eight v2 genre keys (Phase 8 deferred this). Each genre carries a **light hex** and a **dark hex**; the canvas picks whichever applies to the active theme.

| Genre key | Light hex | Dark hex | Contrast (light/dark) |
|---|---|---|---|
| `adventure` | `#DC2626` | `#F87171` | 5.6 / 5.1 |
| `gothic_horror` | `#7C3AED` | `#B47AE6` | 5.8 / 6.2 |
| `historical` | `#B45309` | `#FBBF24` | 4.8 / 11.4 |
| `literary` | `#0F766E` | `#5EEAD4` | 5.3 / 10.8 |
| `mystery` | `#1D4ED8` | `#60A5FA` | 7.4 / 6.4 |
| `romance` | `#BE185D` | `#F472B6` | 5.9 / 6.0 |
| `speculative` | `#4338CA` | `#818CF8` | 9.1 / 5.4 |
| `western` | `#9A3412` | `#F97316` | 8.0 / 5.5 |

**Contrast ratios** computed against `#FAFAF7` (light · Paper canvas) and `#0A0A0F` (dark canvas). Every genre clears AA for incidental UI (3:1). Seven clear AA for body text (4.5:1) on both; adventure-on-dark sits at 5.1 — kept because the alternative (#FCA5A5) merges visually with romance pink.

**Implementation:**

```ts
// src/constants/genres.ts (replaces v1 GENRE_COLORS)
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

The scatter's `buildBuffers` will need to take the resolved theme as an argument (or read it from `preferencesStore` directly) to pick the right color set when building the `colors` `Float32Array`.

---

## 7. Typography

- **Sans:** Inter — 400, 500, 600, 700. Already used; no change.
- **Mono:** JetBrains Mono — for labels (`sb-label`), step indicators, code, slider values. Recommended; if absent, `ui-monospace, SFMono-Regular, monospace` is acceptable.
- **No** Caveat / Kalam / handwritten faces in production. Those were used in wireframe/sketch artifacts only.

Sizes used in the prototype:

| Surface | Size | Weight |
|---|---|---|
| App title (nav wordmark) | 14px | 600 |
| Tab labels | 12.5px | 400 |
| Sidebar section labels (mono, uppercase) | 10.5px | 500, letter-spacing 0.1em |
| Sidebar body / slider labels | 12.5px | 400 |
| Slider readouts (mono) | 11px | 400 |
| Tour card title | 16px | 600 |
| Tour card body | 13px | 400 |
| Classification result title | 15px | 600 |
| Top-N probability rows | 12.5px | 500 / mono for value |
| Empty-state headline | 20–22px | 600 |
| Empty-state body | 13–13.5px | 400 |

---

## 8. App shell

See `screenshots/02-prototype-light-scatter.png` (light) and `screenshots/01-prototype-dark-default.png` (dark).

### Layout (unchanged from Phase 9)

```
┌─────────────────────────────────────────────────────────────┐
│ TopNav (48px)                                                │
│  Literary Genre Topology   Scatter | Topology | Compare      │
│                       🎓 How It Works  [?]  ⚙                │
├─────────────────────────────────────────────────────────────┤
│ Disclaimer ribbon (28px)                                     │
│  ⓘ Topology is computed in the original N-dimensional space  │
├─────────────────────────────────────────────┬───────────────┤
│ Canvas area (flex)                          │ Sidebar 320px │
│  ┌─ 3D scatter scene ──────────────────┐    │  - title       │
│  │                                      │    │  - projection  │
│  │  (legend bottom-left,                │    │  - genre       │
│  │   kbd hint bottom-right)             │    │  - compare     │
│  └──────────────────────────────────────┘    │  - sliders     │
│                                              │  - 2D/3D + ↻  │
│                                              │  - search      │
│                                              │  - upload      │
└─────────────────────────────────────────────┴───────────────┘
```

### Top nav changes for Phase 10

1. **New "?" button** — added between "How It Works" and the settings gear. Font is JetBrains Mono, weight 600. Default: muted-foreground color, no border. **Open** state: `--primary` color + 1.5px `--primary` border + `0 0 0 3px hsl(--primary / 0.15)` outer ring. Clicking toggles the help dropdown. Carries `data-tour-id="help-menu"`.

2. **Help dropdown** (when open) — absolutely positioned below the "?" button, 280px wide. Background `--popover`, 1px `--border`, 10px radius, `0 14px 40px rgba(0,0,0,0.18)` shadow, ::before triangle tip pointing up at the "?" button. Content:

```
↻ Replay tour         4 steps · ~90 seconds
📖 How It Works       7-step math walkthrough
⌨ Keyboard shortcuts  R · Esc · 1–4
─────────────────────────────
THEME
[ ☀ Light ][ ⟳ System ][ ☾ Dark ]   ← 3-state segmented control
─────────────────────────────
⊞ View on GitHub                          ↗
```

Theme segmented control wraps `data-tour-id="theme-toggle"` so it can be referenced later.

Closes on outside-click or Esc.

### Disclaimer ribbon

Unchanged copy: *"Topology is computed in the original N-dimensional space. The 3D view is a lossy projection."* — locked by NOT-list. Just lift from inline hex to `--muted` / `--muted-foreground`.

### Scene background (POLISH-02, PITFALLS §13)

**Read `--scene-bg` from CSS, push into `scene.background` imperatively via `useEffect` on theme change. Do not pass via prop and trigger a Canvas remount.**

```tsx
useEffect(() => {
  const scene = sceneRef.current;
  if (!scene) return;
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--scene-bg').trim();
  // bg is "H S% L%" — Three.js needs a Color, parse via temporary div
  const el = document.createElement('div');
  el.style.color = `hsl(${bg})`;
  document.body.appendChild(el);
  const rgb = getComputedStyle(el).color;  // "rgb(R, G, B)"
  document.body.removeChild(el);
  scene.background = new THREE.Color(rgb);
}, [theme]);
```

The `scene.background` write does **not** trigger a canvas remount. If you wrap `<Canvas>` with a key that changes on theme, you'll lose the WebGL context and the user's camera pose.

---

## 9. Screens

### 9.1 — Sidebar (composed)

Same structure as Phase 9. The polish is replacing every inline hex with `hsl(var(--*))` plus a small number of v2 genre lookups.

**Canonical before/after for the sweep — `frontend/src/components/sidebar/ClassificationResult.tsx`** (see `design_files/Phase 10 Final Spec.html` for the rendered before/after). The pattern:

| Inline hex (Phase 9) | Token (Phase 10) |
|---|---|
| `background: '#16161F'` | `background: 'hsl(var(--card))'` |
| `color: '#F5F5FF'` | `color: 'hsl(var(--card-foreground))'` |
| `background: '#22232E'` (track) | `background: 'hsl(var(--muted))'` |
| `color: '#6B6B80'` (meta) | `color: 'hsl(var(--muted-foreground))'` |
| `color: '#6366F1'` (action) | `color: 'hsl(var(--primary))'` |
| `border: '1px solid #6366F1'` | `border: '1px solid hsl(var(--primary))'` |
| `background: '#6366F1'` (filled button) | `background: 'hsl(var(--primary))'` |

Plus add `data-tour-id="classification-result"` to the outer `<div>`.

The same pattern applies to the other ~30 sidebar/topology/compare components on the sweep list.

### 9.2 — Onboarding tour

**Four steps.** Hand-rolled overlay. Anchors centralized in `src/tour/anchors.ts`. Missing-anchor fallback is **skip**, not error (PITFALLS §14). See `screenshots/08-wireframes-tour-overlay.png` for the visual treatment.

```ts
// src/tour/anchors.ts
export const TOUR_ANCHORS = {
  scatterCanvas: 'scatter-canvas',     // Step 1
  genreSelect:   'genre-select',       // Step 2
  uploadZone:    'upload-zone',        // Step 3
  topologyTab:   'topology-tab',       // Step 4

  // Other anchors for empty-state contextual hints + future re-add of Why
  whyButton:            'why-button',
  classificationResult: 'classification-result',
  explainPanel:         'explain-panel',
  compareTab:           'compare-tab',
  helpMenu:             'help-menu',
  themeToggle:          'theme-toggle',
} as const;

export type TourAnchorId = typeof TOUR_ANCHORS[keyof typeof TOUR_ANCHORS];

export const TOUR_STEPS = [
  {
    anchor: TOUR_ANCHORS.scatterCanvas,
    title:  'Each dot is a word.',
    body:   "Words from 154 books, arranged so similar-meaning words sit close together. Drag to rotate, scroll to zoom, press R to reset. You're seeing a 3D version of something that lives in higher dimensions — close enough to explore.",
  },
  {
    anchor: TOUR_ANCHORS.genreSelect,
    title:  'Light up a genre.',
    body:   "Pick one — its signature words brighten, the common ones fade. Brightness shows how strongly a word belongs to that genre vs the others. Slide through individual books in that genre and watch the pattern shift, book by book.",
  },
  {
    anchor: TOUR_ANCHORS.uploadZone,
    title:  'Drop a book.',
    body:   "Drag in any .txt file. We compare its shape to each genre's shape and predict what it is — you'll get the three most likely genres with confidence scores, and the book itself shows up in the cloud with its own bright words highlighted.",
  },
  {
    anchor: TOUR_ANCHORS.topologyTab,
    title:  'Two more views worth a look.',
    body:   "Topology shows each genre as a shape, and tracks the holes that survive as you zoom out — a fingerprint the classifier actually uses. Compare puts two genres side-by-side. Both work from the full geometry, not the 3D view you've been rotating.",
  },
] as const;

export function findAnchor(id: TourAnchorId): HTMLElement | null {
  return document.querySelector(`[data-tour-id="${id}"]`);
}
```

**Tour overlay visual:**

- **Dim layer:** full-viewport, `position: fixed; inset: 0; background: hsl(var(--background) / 0.55);` — covers everything, including sidebar. Click → skip.
- **Glow ring:** `position: fixed` div sized to the live anchor's `getBoundingClientRect()` with 8px padding. `box-shadow: 0 0 0 4px hsl(var(--primary) / 0.55), 0 0 22px hsl(var(--primary) / 0.55)`. Transitions `top/left/width/height` over 280ms when step changes. **The anchor element itself stays at z-index 41 (above the dim) so it remains visually crisp.**
- **Tour card:** `position: fixed; bottom: 28px; right: 28px; z-index: 50;` — 340px wide, `--card` background, 1px `--border`, 12px radius, `0 24px 64px rgba(0,0,0,0.32)` shadow. The card **never moves** between steps — only the glow tracks the anchor. This avoids jitter and tooltip-overlap problems Phase 9's HoverTooltip introduced.
- **Step indicator:** `STEP N / 4` in mono + 4 horizontal progress bars at the top.
- **Buttons:** `Skip tour` (text-only, muted-foreground) / `← Back` (ghost) / `Next →` (filled primary). Last step's primary becomes `Done`.

**Keyboard:** `Esc` → skip. `ArrowRight` → next. `ArrowLeft` → back. Implementation in `prototype/tour.jsx`.

**Behaviour:**

- First-load detection: on first render, if `preferencesStore.tourCompleted === false`, set `tourActive = true` after a 600ms delay (lets the layout settle before measuring the anchor).
- Replay: clicking "↻ Replay tour" in the help dropdown sets `tourActive = true; tourStep = 0; tourCompleted = false`.
- On `Done` or `Skip` → `tourActive = false; tourCompleted = true` (persisted).
- **Missing-anchor fallback (PITFALLS §14):** if `findAnchor()` returns null for the current step, wait 600ms (anchor may be on a sibling tab and need a mount), check again, then silently advance to the next step. Never error.
- **CI smoke test:** Playwright iterates `TOUR_STEPS`, asserts each `findAnchor()` is non-null on a freshly mounted app. Catches refactor drift.

### 9.3 — Theme toggle

3-state segmented control inside the help dropdown. State is one of `'light' | 'system' | 'dark'`.

**Apply:**

```ts
function applyTheme(theme: 'light' | 'system' | 'dark') {
  let effective = theme;
  if (theme === 'system') {
    effective = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  document.documentElement.classList.toggle('light', effective === 'light');
}
```

Subscribe to `matchMedia('(prefers-color-scheme: light)')` changes so System keeps tracking OS preference live.

**Default:** dark (Phase 3 lock — even before the user has chosen, first paint is dark). The toggle starts on `'system'` only after the user has chosen `'system'` explicitly.

**Persistence:** `preferencesStore.theme`. See §10.

### 9.4 — Empty states (4 surfaces)

See `screenshots/04-prototype-compare-empty.png` and `screenshots/05-prototype-topology-empty.png`, plus the wireframes 05–08 in `Phase 10 Wireframe Mockups.html`.

#### A · Pre-upload UploadZone (`data-tour-id="upload-zone"`)

```
┌─────────────────────────────────────┐
│            ↑                         │
│  Drop a book to classify             │
│  .txt · ≤5MB · ≥500 words            │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ [tiny ghost scatter]   Your book     │
│ • • • • •              will appear   │
│ • [⊙ blue marker]      in the cloud  │
│   • •                  — the marker  │
│                        shows where   │
│                        it'll land.   │
└─────────────────────────────────────┘
Usually under 12 seconds.
```

- Drop zone: 2px dashed `--border`, 8px radius. Hover/dragging: solid 2px `--primary` border, `hsl(--primary / 0.08)` background, text/icon recolor to primary.
- Constraints (`.txt · ≤5MB · ≥500 words`) shown **before** upload — reduces downstream error states.
- Ghost-scatter helper: 70×44px SVG with ~7 dim genre dots and a single dashed-circle ghost marker in `UPLOADED_BOOK_COLOR.light` (deep blue) showing where the upload will land. Helper text to the right.

#### B · Compare tab, no genres selected (`data-tour-id="compare-tab"`)

```
              Pick two genres to compare
   Shared color scale · same projection · synchronised camera.
   Compare reveals where two genres' vocabularies overlap and where they diverge.

┌── GENRE A           [+ Pick genre] ┐  ┌── GENRE B           [+ Pick genre] ┐
│                                    │  │                                    │
│        • • • • •                   │  │        • • • • •                   │
│      • • • • •                     │  │      • • • • •                     │
│        • • • •                     │  │        • • • •                     │
│  (~10 dim mystery-blue dots)       │  │  (~10 dim romance-pink dots)       │
│                                    │  │                                    │
│  brightness map will appear here   │  │  brightness map will appear here   │
└────────────────────────────────────┘  └────────────────────────────────────┘
```

- Two ghost panels, 1.5px dashed `--border`, 14px radius, each tinted with `<genre color> / 0.04` background.
- Inline `+ Pick genre` button in each panel as an alternative to sidebar dropdowns. Border = the genre's color; text = the genre's color; background = `--card`.
- Sidebar shows a hint mentioning **gothic_horror** and **speculative** as natural compare candidates (teaches the new merged keys).

#### C · Classification failure (`data-tour-id="classification-result"`)

```
┌─⚠─────────────────────────────────┐
│   We couldn't read this file       │
│   Looks like the encoding wasn't   │
│   UTF-8. Try saving the file as    │
│   plain UTF-8 text and dropping    │
│   it again.                        │
│   [Try another file]               │
└────────────────────────────────────┘
```

- **Headline pattern:** `"We couldn't [verb] this file"`. **Never** "Error occurred" or "Something went wrong."
- **Two color levels:**
  - **Red wash** (`--destructive` family / `--error-*` tokens) for "you need to fix this" — encoding, too short, wrong format.
  - **Amber wash** (`--warn` family) for "we'll handle this" — 410 Gone (TTL expired), 503 (calibration missing).
- **Exactly one next action** per variant.

Specific copy by failure type:

| Variant | Headline | Body | Severity |
|---|---|---|---|
| Encoding | We couldn't read this file | Looks like the encoding wasn't UTF-8. Try saving the file as plain UTF-8 text and dropping it again. | Red |
| < 500 words | Too short to classify. | Try a longer book — at least 500 words. | Red |
| Wrong format | Only .txt files for now. | PDF and EPUB support is on the v3 roadmap. | Red |
| 410 Gone | This result expired. | Upload the file again to recompute. (5-min Redis TTL on `feature_vec`.) | Amber |
| 503 calibration | Top genre still shown. | Probability bars degraded. The classifier is fine; only the calibration step missed. | Amber |

For the 503 variant: the **top-1 prediction stays rendered** next to the warning. Don't hide partial results.

#### D · ClassificationExplain, pre-upload (`data-tour-id="explain-panel"`)

```
Why this genre? — EMPTY

┌──────────────────────────┐
│ 5 NEAREST TRAINING BOOKS │
│ ▬▬▬▬▬▬▬▬                 │
│ ▬▬▬▬▬▬                   │
│ ▬▬▬▬▬▬▬                  │
│ ▬▬▬▬▬                    │
│ ▬▬▬▬▬▬                   │
└──────────────────────────┘
┌──────────────────────────┐
│ TRACK CONTRIBUTION       │
│ topology  ████████░░  —% │
│ vocabulary ██████░░░░  —%│
└──────────────────────────┘
┌──────────────────────────┐
│ DRIVING WORDS            │
│ (word)(word)(word)(word) │
└──────────────────────────┘

Upload a book first.
This panel will show the five nearest
training books, how topology and
vocabulary contributed to the verdict,
and the words that drove the prediction
— once there's a verdict to explain.
```

- **Headline:** "Upload a book first." Honest, not coy.
- **Three ghost rows** mirror the three real sub-panels (`NearestBooksList`, `TrackContributionBars`, `DrivingWordsPills`). Each row uses `--muted` background, 1.5px dashed `--border`, mono uppercase label.
- The **D-51 footnote** ("upper bound" macro-F1 caveat) does **NOT** appear in the empty state. It only renders once there's a verdict to qualify.

### 9.5 — `ClassificationResult` populated

Already implemented in Phase 9. Phase 10 just lifts inline hex → tokens AND swaps `GENRE_COLORS` → theme-aware lookup. See §9.1 for the diff pattern.

One small visual note: the **UncertaintyBadge stays amber-on-amber-tint in both themes** (NOT-list). Signals shouldn't theme away.

### 9.6 — Empty Topology tab

```
   ┌────────────────────────┐
   │                        │
   │   [ghost heatmap]      │
   │                        │
   └────────────────────────┘
   Pick a genre to see its topology.
   Topology shows the H₁ persistence image —
   the holes that survive as you zoom out.
   Pick a genre or book from the sidebar to compute it.
```

- 320×240px ghost heatmap (1.5px dashed `--border`, linear-gradient `--muted` → `--secondary` at 50% opacity).
- Carries `data-tour-id="topology-tab"`.

---

## 10. State management

Two stores, **separate by Phase 6 ruling** (different lifetimes: persisted vs session).

### `preferencesStore` (NEW · Zustand `persist` middleware)

```ts
interface PreferencesStore {
  theme: 'light' | 'system' | 'dark';
  tourCompleted: boolean;

  setTheme: (theme: 'light' | 'system' | 'dark') => void;
  setTourCompleted: (done: boolean) => void;
}

// Defaults: theme = 'system', tourCompleted = false
// Persist key: 'lgt-prefs-v1' or similar
```

### `visualizationStore` (existing, **don't merge**)

Keep `selectedGenre`, `projection`, `selectedPointIndex`, etc. session-scoped. Don't move any of these into preferences — different lifetime contract (Phase 6 CONTEXT lock).

### Tour state (lives where?)

Recommend: `preferencesStore` for `tourCompleted` only. Active tour step is transient — can be a `useState` inside a `<TourProvider>` or a small dedicated store. The prototype keeps `tourActive` + `tourStep` in component state and only persists `tourCompleted`; that pattern is the recommendation.

---

## 11. Open item

The one undecided item from review:

**The logo / "Literary Genre Topology" wordmark.** Brief locked it as out-of-scope, but the reviewer left it ambiguous. Three reads:

1. **Confirm out of scope** — wordmark renders exactly as the live app does today; no Phase 10 change. *(Default if no answer.)*
2. **Theme it lightly** — wordmark color follows `--foreground` (so it inverts on theme switch). No shape changes. One-line update.
3. **Pull into scope** — design a small revised wordmark. Bigger ask; would need its own design cycle.

Ask the reviewer before shipping. Default to (1) if no answer.

---

## 12. Out of scope (NOT-list)

Confirmed during review — do **not** touch any of these:

1. **The shadcn token names.** Phase 9 D-55 locked HSL variables in `:root`. Light theme adds a `.light` class scope; it does **not** rename `--card`, `--primary`, etc.
2. **The 7-step How-It-Works walkthrough.** Math copy unchanged. Steps 1–6 verbatim; Step 7 (Phase 9 D-51 "upper bound") verbatim.
3. **Three.js or the 3D scatter itself.** Only background + point colors theme. PointCloud geometry, camera, lighting setup untouched.
4. **The 30-component sweep target list.** Phase 9 nailed layout; Phase 10 lifts inline-hex to tokens.
5. **UncertaintyBadge visual identity.** Stays amber-on-amber-tint across themes. Signals shouldn't theme away.
6. **Empty states beyond the four listed.** POLISH-05 scopes exactly four.
7. **Parameter-drawer tier UI.** Themes the 4-tier grouping; doesn't restructure.
8. **Disclaimer banner copy + position.** Stays exactly as is.
9. **The H₁-only homology tab structure.** Phase 6 decision; not a polish gap.
10. **Default theme.** Dark stays default for first paint — Phase 3 CONTEXT lock.
11. **Store unification.** `preferencesStore` and `visualizationStore` stay separate.
12. **Logo / wordmark** — see §11.

---

## 13. Implementation notes (pitfalls)

### PITFALLS §13 — scene background must not remount the canvas

Wrong: `<Canvas key={theme} backgroundColor={sceneBg}>` — kills WebGL context.
Right: imperative `scene.background = new THREE.Color(...)` inside `useEffect([theme])`.

### PITFALLS §14 — tour anchors are brittle if not centralized

- Every `data-tour-id` value comes from `TOUR_ANCHORS` constant in `src/tour/anchors.ts`. No string literals in JSX.
- Missing-anchor fallback is `'skip'`, not `'error'`.
- Add a Playwright smoke test that iterates `TOUR_STEPS` on a fresh app mount.

### Phase 6 / 9 inheritance

- Theme store separate from session store (Phase 6).
- Dark default first paint (Phase 3).
- HSL CSS variables, not Tailwind `dark:`, not design-token JSON (Phase 9 D-55).

---

## 14. Files in this package

```
design_handoff_phase10_visual_polish/
├── README.md                                  (this file)
├── design_files/
│   ├── Phase 10 Final Spec.html               specifications doc
│   ├── Phase 10 Wireframe Mockups.html        8 wireframe artboards
│   └── prototype/                             interactive React prototype
│       ├── index.html
│       ├── data.js
│       ├── components.jsx
│       ├── tour.jsx
│       └── app.jsx
└── screenshots/
    ├── 01-prototype-dark-default.png          dark mode first paint
    ├── 02-prototype-light-scatter.png         light theme applied
    ├── 03-prototype-light-literary.png        light + literary genre lit up
    ├── 04-prototype-compare-empty.png         compare tab empty state
    ├── 05-prototype-topology-empty.png        topology tab empty state
    ├── 06-wireframes-app-shell.png            wireframe artboard 01
    ├── 07-wireframes-help-dropdown.png        wireframe artboard 03
    ├── 08-wireframes-tour-overlay.png         wireframe artboard 04
    ├── 09-wireframes-empty-compare.png        wireframe artboard 06
    ├── 10-spec-decisions.png                  spec doc — locked decisions table
    └── 11-spec-tour-storyboard.png            spec doc — 4-step tour copy
```

### Running the prototype locally

```sh
cd design_files/prototype
python3 -m http.server 8000
# open http://localhost:8000
```

Or any other static server — the prototype uses CDN-pinned React + Babel. No build step.

To exercise:
- Click the "?" in the header → switch theme.
- Use the genre dropdown in the sidebar → see one genre light up.
- Click the upload zone → simulated pipeline runs ~3s, then a `ClassificationResult` card appears (12% of runs fail to exercise the failure card).
- Click "Why this genre?" → expanded panel with nearest books / track contribution / driving words.
- Click the "?" again → "↻ Replay tour" to re-watch the 4-step tour.
- Visit Compare and Topology tabs to see their empty states.

---

## 15. Recommended implementation order

1. **Tokens first.** Add `:root.light` block to `frontend/src/index.css`. Verify dark unchanged.
2. **Component sweep.** Lift inline-hex to `hsl(var(--*))` across the 30-component target list, starting with `ClassificationResult` (canonical pattern). One PR per file or small group.
3. **v2 genre palette.** Replace `GENRE_COLORS` with the dual-token map. Pass theme into `buildBuffers`.
4. **Scene background.** Add `--scene-bg` token + imperative `scene.background` effect.
5. **`preferencesStore`.** New store with Zustand `persist`. Wire theme toggle.
6. **Help dropdown.** Add `<HelpDropdown>` + "?" button to `TopNavTabs`. Includes theme segmented control + GitHub link.
7. **`src/tour/anchors.ts`.** Constants + `TOUR_STEPS` + `findAnchor`.
8. **Tour overlay.** `<TourCard>`, `<TourSpotlight>` (glow ring), `<TourProvider>` with first-load detection.
9. **Empty states.** All four surfaces. Drop-zone helper, compare ghost panels, failure variants, explain-empty ghost rows.
10. **Playwright smoke test.** Iterates `TOUR_STEPS` against fresh app mount.

Estimate: 1 sprint for a single developer familiar with the codebase.
