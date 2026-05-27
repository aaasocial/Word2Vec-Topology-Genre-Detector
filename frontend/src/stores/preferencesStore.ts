// Phase 10 D-65 — preferencesStore: persistent user prefs (theme + tour-completed).
// Separate from visualizationStore by Phase 6 CONTEXT lock (lifetimes: persisted
// vs session). Uses Zustand `persist` middleware with localStorage key `lgt-prefs-v1`.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'system' | 'dark'
export type EffectiveTheme = 'light' | 'dark'

interface PreferencesState {
  theme: Theme
  tourCompleted: boolean
  setTheme: (theme: Theme) => void
  setTourCompleted: (done: boolean) => void
}

/** Persistence key — bump suffix if shape changes in a future phase. */
export const PREFS_STORAGE_KEY = 'lgt-prefs-v1'

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      // Defaults: 'system' theme follows OS preference; tour shown on first visit.
      theme: 'system',
      tourCompleted: false,
      setTheme: (theme) => set({ theme }),
      setTourCompleted: (done) => set({ tourCompleted: done }),
    }),
    { name: PREFS_STORAGE_KEY },
  ),
)

/** Resolve a Theme to the effective light/dark value Three.js + components consume. */
export function resolveEffectiveTheme(theme: Theme): EffectiveTheme {
  if (theme === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    }
    // SSR or test environment without matchMedia — default to dark per Phase 3 lock.
    return 'dark'
  }
  return theme
}

/**
 * Apply the resolved theme to <html>. Toggles the `.light` class on/off.
 * Dark is the default first paint (Phase 3 lock) — <html> ships without `.light`.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  const effective = resolveEffectiveTheme(theme)
  document.documentElement.classList.toggle('light', effective === 'light')
}

/**
 * Subscribe to OS-level prefers-color-scheme changes when theme === 'system'.
 * Returns an unsubscribe callback. Caller is responsible for calling on cleanup
 * AND when the theme leaves 'system'.
 */
export function subscribeToSystemTheme(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mql = window.matchMedia('(prefers-color-scheme: light)')
  const handler = () => onChange()
  // addEventListener is preferred; addListener is the legacy fallback for older Safari.
  if (mql.addEventListener) {
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }
  mql.addListener(handler)
  return () => mql.removeListener(handler)
}

/** Convenience selector — returns the resolved EffectiveTheme from the store. */
export function useEffectiveTheme(): EffectiveTheme {
  const theme = usePreferencesStore((s) => s.theme)
  return resolveEffectiveTheme(theme)
}
