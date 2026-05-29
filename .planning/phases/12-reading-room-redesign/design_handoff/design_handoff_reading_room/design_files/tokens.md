# Reading Room — design tokens

This is a **new, self-contained visual system** (an editorial "reading room" idiom),
not an extension of the prior Phase 10 indigo theme. It replaces that look wholesale,
so the values below are the authoritative source — implement from these exact numbers.

In the prototype these live as JS objects (`window.RR_PALETTES`, `window.RR_ACCENTS`
in `shell.jsx`; `GENRES` in `shared.jsx`) so they can be swapped live via the Tweaks
panel. In the target stack, express them as CSS custom properties / a theme object.

---

## Typography

| Role | Family | Notes |
|---|---|---|
| Display, headings, body, UI text | **Spectral** (serif) | weights 300–700 + italics. Italic is used heavily for an editorial voice (section labels, captions, "voice" words). |
| Labels, meta, numerals, axes, shelfmarks | **JetBrains Mono** | small caps-feel via `letter-spacing` + `text-transform: uppercase`. |

Google Fonts import (as in the prototype):
`Spectral:ital,wght@0,300..700;1,400;1,500` + `JetBrains+Mono:wght@400;500;600`.

### Type scale (px / line-height / tracking) — final
| Token | Size | Weight | LH | Tracking | Used for |
|---|---|---|---|---|---|
| display | 64 | 500 | 1.02 | −0.018em | landing H1 |
| h1 | 38–40 | 500 | 1.08 | −0.01em | screen titles (upload, verdict) |
| h2 | 26–28 | 500 | 1.1 | −0.005em | section / plate titles |
| h3 | 18–22 | 500 (italic) | 1.2 | — | card titles, guide headings |
| body-lg | 16 | 400 | 1.7 | — | landing lede |
| body | 14–15 | 400 | 1.7 | — | paragraphs, essay |
| body-sm | 12.5–13.5 | 400 | 1.6 | — | captions, margin notes |
| label (mono) | 9.5–10.5 | 500 | — | 0.14–0.2em, UPPERCASE | section labels, footers, axes |
| numeral (mono) | 10–13 | 400 | — | — | coordinates, distances, ε |

---

## Paper palettes (Tweak: "Warmth" — 4 options; default `cream`)

Each palette is 5 surfaces: `paper` (page), `paper2` (recessed rails), `card`
(raised), `ink` (text/rules), `muted` (secondary text).

| Palette | paper | paper2 | card | ink | muted |
|---|---|---|---|---|---|
| **cream** (default) | `#F2EDE0` | `#E9E3D2` | `#FAF6EC` | `#26211B` | `#736B5E` |
| bone | `#F5F1E6` | `#EBE6D7` | `#FCF8EE` | `#1E1A14` | `#6E665A` |
| ivory | `#F8F4E9` | `#EFEADC` | `#FFFBF1` | `#1A1814` | `#7A7165` |
| newsprint | `#EDE9DC` | `#E2DCCB` | `#F6F1E2` | `#231F18` | `#6F6857` |

Letterbox / stage matte (outside the artboard): `#D8D4C8`.

## Accents (Tweak: "Mark" — 4 options; default `oxblood`)

Single accent per session — used for active nav underline, footnote superscripts,
focus rings, the tour spotlight frame, links, CTAs' outlines.

| Accent | Hex |
|---|---|
| **oxblood** (default) | `#8B3B2B` |
| libgreen | `#3F6B4D` |
| ink | `#26211B` |
| prussian | `#274060` |

Focus ring (`:focus-visible`): `2px solid #8B3B2B`, `outline-offset: 2px`.

## Genre palette (8 regions — fixed, theme-independent)

Used for plate points, region dots, study Venn, topology ring nodes, verdict bars.

| Genre | Label | Hex |
|---|---|---|
| adventure | Adventure | `#C45533` |
| gothic | Gothic Horror | `#6E4A8E` |
| historical | Historical | `#B68D3F` |
| literary | Literary | `#3E7F75` |
| mystery | Mystery | `#3A6CA8` |
| romance | Romance | `#B65385` |
| speculative | Speculative | `#5E5EA6` |
| western | Western | `#A85C2D` |

Topology signal literals (theme-neutral): amber `#FACC15` is **not** used here — the
reading-room topology tab uses the **accent** for the ε slider/sweep and the
selected **genre hex** for the heatmap ramp (`paper2 → genreHex → ink`). See README §Topology.

---

## Rules, borders, shadows, rhythm

- **Hairline:** `1px solid {ink}` for framed plates/cards; `1px solid {ink}33` (≈20% ) for soft dividers; `0.5px dotted {ink}33` for list separators.
- **Masthead rule:** `2px solid {ink}` under the masthead.
- **Card "catalog" treatment:** `border:1px solid {ink}`, `border-top:4px double {ink}`, drop `boxShadow: 4px 4px 0 {ink}22` (hard offset, no blur — letterpress feel). A small "punch hole" circle bottom-center.
- **Block shadow (modals/footnotes):** `6px 6px 0 {ink}33`.
- **Radius:** **0** almost everywhere (square, printed feel). Dots/points are circles; chips are square.
- **Spacing:** screen padding 24–80px depending on screen; section gaps 12–24px; the artboard is a fixed canvas (below).

## Stage / canvas

- Fixed artboard **1240 × 780** (≈16:10), centered and `transform: scale()`-fit to the viewport, letterboxed on `#D8D4C8` with `boxShadow: 0 24px 70px rgba(0,0,0,0.22)`.
- In a real responsive app this fixed-canvas device is a prototype convenience — see README §"Responsive" for how to treat it (the page is genuinely a fluid 12-ish-column editorial layout; the artboard just pins the demo).

## Tweakable parameters (in-design controls)

`paper` (cream·bone·ivory·newsprint), `accent` (oxblood·libgreen·ink·prussian),
`density` (carrel = 3-column with marginalia · study = 2-column, marginalia hidden).
Persisted to localStorage by the Tweaks host. Defaults: cream / oxblood / carrel.
