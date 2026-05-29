// Reading Room — shell store (Phase 12, §7). Route + Guide + Tweaks + tour state.
//
// Store-split decision (CONTEXT "Claude's Discretion"): the prototype models the
// whole app as one useReducer. In production we keep the existing DATA-side stores
// untouched — `visualizationStore` (projection, selectedGenre/Book, hovered/
// selected point, compare, vrEpsilon, …) and `uploadStore` — and add this small
// SHELL store for the genuinely-new reading-room concerns: which screen is showing
// (`route`), the Guide side-sheet (`guideOpen` + once-per-browser `guideSeen`),
// the persisted Tweaks (paper/accent/density), and the 6-stop tour cursor. This
// keeps session-scoped view state and persisted shell prefs cleanly separated and
// avoids overloading `visualizationStore` with router/UI lifetime concerns.
//
// `route` lives here (not in visualizationStore) because it is the new shell's
// concern; later plans read `selectedBookId` / `selectedGenre` / `studyA|B` from
// `visualizationStore` and drive navigation by also setting `route` here.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  applyReadingRoomTheme,
  DEFAULT_PAPER,
  DEFAULT_ACCENT,
  DEFAULT_DENSITY,
  type PaperId,
  type AccentId,
  type DensityId,
} from '@/theme/readingRoom'

/** The 8 masthead-routed screens (README §1). */
export type RRRoute =
  | 'landing'
  | 'collection'
  | 'card'
  | 'topology'
  | 'study'
  | 'upload'
  | 'verdict'
  | 'about'

export interface RRTweaks {
  paper: PaperId
  accent: AccentId
  density: DensityId
}

/** Persisted Tweaks key (paper/accent/density), separate from the guide-seen flag. */
export const RR_TWEAKS_STORAGE_KEY = 'rr.tweaks.v1'
/** Persisted "Guide auto-opened once" flag (L-07). Read on first visit. */
export const GUIDE_SEEN_KEY = 'rr.guide.seen.v1'

export const DEFAULT_TWEAKS: RRTweaks = {
  paper: DEFAULT_PAPER,
  accent: DEFAULT_ACCENT,
  density: DEFAULT_DENSITY,
}

interface ReadingRoomState {
  route: RRRoute
  guideOpen: boolean
  /** True once the Guide has auto-opened for this browser (persisted, L-07). */
  guideSeen: boolean
  tweaks: RRTweaks
  /** Whether the floating Tweaks panel is visible (session-only). */
  tweaksOpen: boolean
  tourActive: boolean
  tourStep: number

  goTo: (route: RRRoute) => void
  openGuide: () => void
  closeGuide: () => void
  markGuideSeen: () => void
  setTweak: <K extends keyof RRTweaks>(key: K, value: RRTweaks[K]) => void
  setTweaksOpen: (v: boolean) => void
  toggleTweaks: () => void
  startTour: () => void
  setTourStep: (step: number) => void
  endTour: () => void
}

export const useReadingRoomStore = create<ReadingRoomState>()(
  persist(
    (set, get) => ({
      route: 'landing',
      guideOpen: false,
      guideSeen: false,
      tweaks: { ...DEFAULT_TWEAKS },
      tweaksOpen: false,
      tourActive: false,
      tourStep: 0,

      goTo: (route) => set({ route }),
      openGuide: () => set({ guideOpen: true }),
      closeGuide: () => set({ guideOpen: false }),
      markGuideSeen: () => set({ guideSeen: true }),
      setTweak: (key, value) => {
        const next = { ...get().tweaks, [key]: value }
        set({ tweaks: next })
        // Reapply CSS vars for paper/accent the moment they change (density is a
        // layout token read by screens, not a CSS-var, so no re-apply needed).
        applyReadingRoomTheme(next.paper, next.accent)
      },
      setTweaksOpen: (v) => set({ tweaksOpen: v }),
      toggleTweaks: () => set((s) => ({ tweaksOpen: !s.tweaksOpen })),
      startTour: () => set({ guideOpen: false, tourActive: true, tourStep: 0 }),
      setTourStep: (step) => set({ tourStep: step }),
      endTour: () => set({ tourActive: false }),
    }),
    {
      name: RR_TWEAKS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only the durable shell prefs persist; route/guideOpen/tour cursor are
      // session-scoped (every visit opens on Landing). `guideSeen` rides this
      // payload — its semantic key is GUIDE_SEEN_KEY (documented above) but it
      // persists alongside tweaks so there is a single rehydrate point.
      partialize: (s) => ({ tweaks: s.tweaks, guideSeen: s.guideSeen }),
      // Apply the rehydrated paper/accent to <html> as soon as the persisted
      // tweaks load, so a returning reader sees their chosen palette without a
      // flash of the cream/oxblood defaults baked into index.css.
      onRehydrateStorage: () => (state) => {
        if (state?.tweaks) {
          applyReadingRoomTheme(state.tweaks.paper, state.tweaks.accent)
        }
      },
    },
  ),
)

/**
 * Apply the current store tweaks to <html>. Call once at app start to cover the
 * case where the store was created with defaults (no persisted payload) — the
 * defaults match index.css so this is a cheap idempotent confirm.
 */
export function initReadingRoomTheme(): void {
  const { tweaks } = useReadingRoomStore.getState()
  applyReadingRoomTheme(tweaks.paper, tweaks.accent)
}
