// Reading Room — guided-tour mount + per-stop navigation (Phase 12, 12-06,
// §6.10 / L-09). Store-driven: the tour state lives in `readingRoomStore`
// (tourActive / tourStep + startTour / setTourStep / endTour). The Guide's
// "Begin the guided tour" button (and any future replay entry) calls
// `startTour()`, which flips tourActive on and resets to step 0.
//
// This component:
//   · navigates the masthead router to each step's `route` BEFORE framing its
//     anchor (the tour walks the REAL screens — L-09),
//   · pre-selects Mystery when it reaches the Topology stop so the VR hero
//     (data-tour-id="topology-plate") actually mounts (it's gated on a region),
//   · renders <TourOverlay> which frames the live anchor + handles ←/→/Esc and
//     the missing-anchor wait-then-advance.
//
// It replaces the Phase 10 preferencesStore/useState-backed provider; the legacy
// `useTour()` hook is kept (store-backed) so the now-dead HelpDropdown compiles.

import { useEffect } from 'react'
import { useReadingRoomStore } from '@/stores/readingRoomStore'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { TourOverlay } from './TourOverlay'
import { TOUR_STEPS } from './anchors'

/** The region the tour pre-selects when it reaches the Topology stop. */
const TOUR_TOPOLOGY_GENRE = 'mystery'

/**
 * Mounts the guided-tour overlay when `tourActive` and drives per-stop
 * navigation. Render once near the app root (App.tsx), after the screens so the
 * overlay paints above them.
 */
export function GuidedTour() {
  const tourActive = useReadingRoomStore((s) => s.tourActive)
  const tourStep = useReadingRoomStore((s) => s.tourStep)
  const goTo = useReadingRoomStore((s) => s.goTo)
  const setTourStep = useReadingRoomStore((s) => s.setTourStep)
  const endTour = useReadingRoomStore((s) => s.endTour)
  const setSelectedGenre = useVisualizationStore((s) => s.setSelectedGenre)

  // Navigate to the current step's screen (and pre-select Mystery on Topology).
  useEffect(() => {
    if (!tourActive) return
    const current = TOUR_STEPS[tourStep]
    if (!current) return
    // Pre-select the region BEFORE/at navigation so the Topology hero mounts.
    if (current.route === 'topology') {
      setSelectedGenre(TOUR_TOPOLOGY_GENRE)
    }
    if (useReadingRoomStore.getState().route !== current.route) {
      goTo(current.route)
    }
  }, [tourActive, tourStep, goTo, setSelectedGenre])

  if (!tourActive) return null

  return (
    <TourOverlay
      step={tourStep}
      onPrev={() => setTourStep(Math.max(0, tourStep - 1))}
      onNext={() => setTourStep(Math.min(tourStep + 1, TOUR_STEPS.length - 1))}
      onEnd={endTour}
    />
  )
}

// ── Legacy compatibility shim ───────────────────────────────────
// The Phase 10 HelpDropdown (now dead — not mounted in the reading-room shell)
// still imports `TourProvider` + `useTour`. Keep thin store-backed versions so
// it compiles; neither is used by the live App.

interface TourContextValue {
  active: boolean
  step: number
  start: () => void
  next: () => void
  prev: () => void
  skip: () => void
  done: () => void
}

/** No-op wrapper kept for back-compat; the live tour mounts <GuidedTour /> directly. */
export function TourProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <GuidedTour />
    </>
  )
}

/** Store-backed tour controls for legacy callers. */
export function useTour(): TourContextValue {
  const active = useReadingRoomStore((s) => s.tourActive)
  const step = useReadingRoomStore((s) => s.tourStep)
  const startTour = useReadingRoomStore((s) => s.startTour)
  const setTourStep = useReadingRoomStore((s) => s.setTourStep)
  const endTour = useReadingRoomStore((s) => s.endTour)
  return {
    active,
    step,
    start: startTour,
    next: () => setTourStep(Math.min(step + 1, TOUR_STEPS.length - 1)),
    prev: () => setTourStep(Math.max(0, step - 1)),
    skip: endTour,
    done: endTour,
  }
}
