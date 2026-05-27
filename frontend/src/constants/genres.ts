// Phase 10 D-60 — v2 dual-token genre palette.
// Each genre carries a light hex and a dark hex; consumers pick based on the
// resolved effective theme (read from preferencesStore).
// Contrast ratios computed against #FAFAF7 (light · Paper) and #0A0A0F (dark);
// every genre clears AA for incidental UI (3:1) and 7/8 clear AA body text (4.5:1).

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
}

export const GENRE_LIST: Genre[] = Object.keys(GENRE_COLORS.dark) as Genre[]

// Scene-adjacent constants — need explicit light/dark hexes; not derived from HSL vars.
// Amber dims darker on each canvas so historical stays distinct while uploads are active.
// Saffron melts into cream on light → deep blue replaces it; dark keeps saffron.
export const HISTORICAL_DIM_COLOR: Record<Theme, string> = {
  light: '#B45309',
  dark:  '#D97706',
}

export const UPLOADED_BOOK_COLOR: Record<Theme, string> = {
  light: '#1D4ED8',
  dark:  '#FBBF24',
}

// Generic fallback for unknown genre keys (rare; legacy or off-corpus uploads).
export const FALLBACK_GENRE_COLOR = '#888888'

/**
 * Resolve a genre's color under the given effective theme.
 * Use this from any consumer that may receive a genre string from the API.
 * Falls back to FALLBACK_GENRE_COLOR for unknown keys (does not throw).
 */
export function genreColor(genre: string | null | undefined, theme: Theme): string {
  if (!genre) return FALLBACK_GENRE_COLOR
  const palette = GENRE_COLORS[theme]
  return (palette as Record<string, string>)[genre] ?? FALLBACK_GENRE_COLOR
}
