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
  /**
   * Phase 11 D-87 — epoch ms of the last auto-intro fire (How-It-Works→tour
   * chain). `null` = never seen → intro fires on first visit. Old persisted
   * payloads lack this field; Zustand reads missing as `undefined`, which
   * `isIntroStale` treats as null (intro fires once for them too).
   */
  introSeenAt: number | null
  setTheme: (theme: Theme) => void
  setTourCompleted: (done: boolean) => void
  setIntroSeenAt: (ts: number | null) => void
}

/** Persistence key — bump suffix if shape changes in a future phase. */
export const PREFS_STORAGE_KEY = 'lgt-prefs-v1'

/** Phase 11 D-87 — auto-intro re-trigger window: 30 days in ms (2,592,000,000). */
export const INTRO_TTL_MS = 30 * 24 * 60 * 60 * 1000

/**
 * True when the first-visit intro should fire: never seen (`null`/`undefined`)
 * OR the last fire is at least INTRO_TTL_MS (30 days) old.
 */
export function isIntroStale(introSeenAt: number | null): boolean {
  return introSeenAt == null || Date.now() - introSeenAt >= INTRO_TTL_MS
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      // Defaults (Phase 11 D-86): 'light' is the default for new users — reverses
      // the Phase 3 / D-58 dark-default lock. Persisted users keep their stored
      // choice; 'system' and 'dark' remain selectable from the Help dropdown.
      theme: 'light',
      tourCompleted: false,
      // Phase 11 D-87: null until the auto-intro fires; consumed-on-fire in App.
      introSeenAt: null,
      setTheme: (theme) => {
        // Toggle <html>.light SYNCHRONOUSLY before React re-renders. React runs
        // child effects before parent effects, so canvas components that read
        // --scene-bg via getComputedStyle in a useEffect([theme]) would otherwise
        // see the stale class (App's applyTheme effect runs after theirs). Applying
        // here guarantees the DOM class is correct the moment any effect reads CSS.
        applyTheme(theme)
        set({ theme })
      },
      setTourCompleted: (done) => set({ tourCompleted: done }),
      setIntroSeenAt: (ts) => set({ introSeenAt: ts }),
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
 * Phase 11 D-86: light is the default first paint — the inline pre-hydration
 * script in index.html adds `.light` for new users before the bundle loads.
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
