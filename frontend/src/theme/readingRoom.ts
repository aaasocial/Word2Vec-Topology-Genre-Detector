// Reading Room — theme system of record (Phase 12, L-01/L-02, tokens.md).
//
// The 4 paper palettes + 4 accents from tokens.md, typed, plus
// `applyReadingRoomTheme(palette, accent)` which writes the surface/accent CSS
// custom properties onto <html>. The Tweaks panel + the reading-room store call
// this; index.css carries the cream/oxblood defaults so first paint is correct
// before the store's apply-on-init runs.
//
// This REPLACES the Phase 10 indigo HSL theme (D-U2). No `.light` class, no
// prefers-color-scheme — one paper palette + one accent per session.

/** A paper palette: five editorial surfaces (tokens.md §Paper palettes). */
export interface ReadingRoomPalette {
  paper: string   // page
  paper2: string  // recessed rails
  card: string    // raised
  ink: string     // text / rules
  muted: string   // secondary text
}

export type PaperId = 'cream' | 'bone' | 'ivory' | 'newsprint'
export type AccentId = 'oxblood' | 'libgreen' | 'ink' | 'prussian'
export type DensityId = 'carrel' | 'study'

/** 4 paper palettes — default `cream` (tokens.md §Paper palettes). */
export const RR_PALETTES: Record<PaperId, ReadingRoomPalette> = {
  cream:     { paper: '#F2EDE0', paper2: '#E9E3D2', card: '#FAF6EC', ink: '#26211B', muted: '#736B5E' },
  bone:      { paper: '#F5F1E6', paper2: '#EBE6D7', card: '#FCF8EE', ink: '#1E1A14', muted: '#6E665A' },
  ivory:     { paper: '#F8F4E9', paper2: '#EFEADC', card: '#FFFBF1', ink: '#1A1814', muted: '#7A7165' },
  newsprint: { paper: '#EDE9DC', paper2: '#E2DCCB', card: '#F6F1E2', ink: '#231F18', muted: '#6F6857' },
}

/** 4 accents — default `oxblood` (tokens.md §Accents). */
export const RR_ACCENTS: Record<AccentId, string> = {
  oxblood:  '#8B3B2B',
  libgreen: '#3F6B4D',
  ink:      '#26211B',
  prussian: '#274060',
}

/** Genre palette — fixed 8 hexes, theme-independent (L-05 / tokens.md §Genre). */
export const RR_GENRE_HEX = {
  adventure:   '#C45533',
  gothic:      '#6E4A8E',
  historical:  '#B68D3F',
  literary:    '#3E7F75',
  mystery:     '#3A6CA8',
  romance:     '#B65385',
  speculative: '#5E5EA6',
  western:     '#A85C2D',
} as const

/** Letterbox / stage matte (tokens.md) — used only by the prototype artboard. */
export const RR_MATTE = '#D8D4C8'

export const RR_PAPER_IDS: PaperId[] = ['cream', 'bone', 'ivory', 'newsprint']
export const RR_ACCENT_IDS: AccentId[] = ['oxblood', 'libgreen', 'ink', 'prussian']
export const RR_DENSITY_IDS: DensityId[] = ['carrel', 'study']

export const DEFAULT_PAPER: PaperId = 'cream'
export const DEFAULT_ACCENT: AccentId = 'oxblood'
export const DEFAULT_DENSITY: DensityId = 'carrel'

/** Resolve a PaperId to its palette, defaulting to cream for unknown ids. */
export function resolvePalette(paper: PaperId | string): ReadingRoomPalette {
  return RR_PALETTES[paper as PaperId] ?? RR_PALETTES.cream
}

/** Resolve an AccentId to its hex, defaulting to oxblood for unknown ids. */
export function resolveAccent(accent: AccentId | string): string {
  return RR_ACCENTS[accent as AccentId] ?? RR_ACCENTS.oxblood
}

/**
 * Expand a 6-hex `#RRGGBB` to an `rgba(r,g,b,a)` string. Used to mint the
 * translucent ink derivations (ink22/33/55) the rules/shadows need, so a palette
 * swap keeps the shadow tint in lockstep with the active ink color.
 */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Write the active palette + accent onto <html> as CSS custom properties.
 * No-op outside the browser (SSR / non-jsdom test environments).
 *
 * Keeps the alpha-suffixed ink derivations + the composite rule/shadow tokens in
 * sync with the chosen ink color so a palette swap reskins the whole surface.
 */
export function applyReadingRoomTheme(
  paper: PaperId | string,
  accent: AccentId | string,
): void {
  if (typeof document === 'undefined') return
  const palette = resolvePalette(paper)
  const accentHex = resolveAccent(accent)
  const root = document.documentElement
  const s = root.style

  s.setProperty('--paper', palette.paper)
  s.setProperty('--paper2', palette.paper2)
  s.setProperty('--card', palette.card)
  s.setProperty('--ink', palette.ink)
  s.setProperty('--muted', palette.muted)
  s.setProperty('--accent', accentHex)

  const ink22 = hexToRgba(palette.ink, 0.13) // ≈ {ink}22
  const ink33 = hexToRgba(palette.ink, 0.2)  // ≈ {ink}33
  const ink55 = hexToRgba(palette.ink, 0.33) // ≈ {ink}55
  s.setProperty('--ink-22', ink22)
  s.setProperty('--ink-33', ink33)
  s.setProperty('--ink-55', ink55)

  s.setProperty('--rule-hairline', `1px solid ${palette.ink}`)
  s.setProperty('--rule-soft', `1px solid ${ink33}`)
  s.setProperty('--rule-masthead', `2px solid ${palette.ink}`)
  s.setProperty('--shadow-card', `4px 4px 0 ${ink22}`)
  s.setProperty('--shadow-block', `6px 6px 0 ${ink33}`)
}
