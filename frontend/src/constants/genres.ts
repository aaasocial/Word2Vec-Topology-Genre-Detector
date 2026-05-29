// Phase 12 L-05 — reading-room genre palette (replaces the Phase 10 dual-token
// indigo palette). The 8 genre hexes are now FIXED and theme-independent
// (tokens.md §Genre palette): plate points, region dots, study Venn, topology
// ring nodes, and verdict bars all read these same values under every paper
// palette / accent.
//
// Source of truth: `theme/readingRoom.ts::RR_GENRE_HEX`. We keep the
// `Record<Theme, Record<Genre, string>>` shape (and the `genreColor(genre,
// theme)` / `GENRE_LIST` / `UPLOADED_BOOK_COLOR[theme]` / `HISTORICAL_DIM_COLOR`
// API) so the ~14 existing consumers keep compiling unchanged — the `light` and
// `dark` subrecords are simply identical now (the palette no longer varies by
// theme). The `Genre` key `gothic_horror` maps to the reading-room "gothic" hex.

import { RR_GENRE_HEX } from '@/theme/readingRoom'

export type Theme = 'light' | 'dark'
export type Genre =
  | 'adventure'
  | 'gothic_horror'
  | 'historical'
  | 'literary'
  | 'mystery'
  | 'romance'
  | 'speculative'
  | 'western'

/** The fixed reading-room genre map under the app's `Genre` keys (L-05). */
const RR_GENRE_COLORS: Record<Genre, string> = {
  adventure:     RR_GENRE_HEX.adventure,   // #C45533
  gothic_horror: RR_GENRE_HEX.gothic,      // #6E4A8E
  historical:    RR_GENRE_HEX.historical,  // #B68D3F
  literary:      RR_GENRE_HEX.literary,    // #3E7F75
  mystery:       RR_GENRE_HEX.mystery,     // #3A6CA8
  romance:       RR_GENRE_HEX.romance,     // #B65385
  speculative:   RR_GENRE_HEX.speculative, // #5E5EA6
  western:       RR_GENRE_HEX.western,     // #A85C2D
}

// Theme-independent (L-05): both subrecords are the same reading-room palette.
export const GENRE_COLORS: Record<Theme, Record<Genre, string>> = {
  light: RR_GENRE_COLORS,
  dark: RR_GENRE_COLORS,
}

export const GENRE_LIST: Genre[] = Object.keys(RR_GENRE_COLORS) as Genre[]

// Scene-adjacent constants. Historical's dim variant + the uploaded-book marker
// are now theme-independent too (the reading room runs one palette per session).
// Uploaded books use the accent oxblood so they read as "the text under reading"
// against any paper; historical keeps its own hex when dimmed.
export const HISTORICAL_DIM_COLOR: Record<Theme, string> = {
  light: RR_GENRE_HEX.historical,
  dark:  RR_GENRE_HEX.historical,
}

export const UPLOADED_BOOK_COLOR: Record<Theme, string> = {
  light: '#8B3B2B',
  dark:  '#8B3B2B',
}

// Generic fallback for unknown genre keys (rare; legacy or off-corpus uploads).
export const FALLBACK_GENRE_COLOR = '#888888'

/**
 * Resolve a genre's color. The reading-room palette is theme-independent (L-05),
 * so the `theme` argument is retained only for back-compat with existing callers
 * and no longer changes the result. Falls back to FALLBACK_GENRE_COLOR for
 * unknown keys (does not throw).
 */
export function genreColor(genre: string | null | undefined, theme: Theme = 'light'): string {
  if (!genre) return FALLBACK_GENRE_COLOR
  const palette = GENRE_COLORS[theme]
  return (palette as Record<string, string>)[genre] ?? FALLBACK_GENRE_COLOR
}
