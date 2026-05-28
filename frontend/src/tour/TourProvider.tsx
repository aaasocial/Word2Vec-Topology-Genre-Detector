// Phase 10 D-73 / Phase 11 D-89 — Tour provider + useTour() hook.
//
// State split:
//   - `tourActive` + `tourStep` are transient (live in this provider's useState
//     so reload doesn't pin the user mid-tour).
//   - `tourCompleted` persists in preferencesStore as the tour's own replay flag.
//
// Phase 11 D-89: the tour NO LONGER auto-starts on first load. The old
// `tourCompleted`-driven mount effect was removed (reverses D-73). The tour now
// starts ONLY via (a) the How-It-Works→tour chain in App's auto-intro, or
// (b) the manual "Replay tour" Help-dropdown item — both call `start()`.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { TourOverlay } from './TourOverlay'
import { TOUR_STEPS } from './anchors'

interface TourContextValue {
  active: boolean
  step: number
  /** Replay or kick off the tour — resets to step 0 + clears completion flag. */
  start: () => void
  next: () => void
  prev: () => void
  /** User clicked Skip / Esc / dim-layer / dialog close. Marks completed. */
  skip: () => void
  /** User reached the end. Marks completed. */
  done: () => void
}

const TourContext = createContext<TourContextValue | null>(null)

interface TourProviderProps {
  children: ReactNode
}

export function TourProvider({ children }: TourProviderProps) {
  const setTourCompleted = usePreferencesStore((s) => s.setTourCompleted)

  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)

  // Phase 11 D-89: no first-load auto-start effect. The tour fires only via
  // start() — from App's How-It-Works→tour chain or the manual Replay item.

  const start = useCallback(() => {
    setTourCompleted(false)
    setStep(0)
    setActive(true)
  }, [setTourCompleted])

  const next = useCallback(() => {
    setStep((s) => Math.min(s + 1, TOUR_STEPS.length - 1))
  }, [])

  const prev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1))
  }, [])

  const skip = useCallback(() => {
    setActive(false)
    setTourCompleted(true)
  }, [setTourCompleted])

  const done = useCallback(() => {
    setActive(false)
    setTourCompleted(true)
  }, [setTourCompleted])

  const value = useMemo<TourContextValue>(
    () => ({ active, step, start, next, prev, skip, done }),
    [active, step, start, next, prev, skip, done],
  )

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && (
        <TourOverlay
          step={step}
          onPrev={prev}
          onNext={next}
          onSkip={skip}
          onClose={done}
        />
      )}
    </TourContext.Provider>
  )
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext)
  if (!ctx) {
    // Permissive fallback so consumers (e.g. HelpDropdown's Replay item)
    // outside the provider don't throw — they get an inert tour.
    return {
      active: false,
      step: 0,
      start: () => {},
      next: () => {},
      prev: () => {},
      skip: () => {},
      done: () => {},
    }
  }
  return ctx
}
