// Phase 10 D-73 — Tour provider + useTour() hook.
//
// State split:
//   - `tourActive` + `tourStep` are transient (live in this provider's useState
//     so reload doesn't pin the user mid-tour).
//   - `tourCompleted` persists in preferencesStore so first-load detection
//     fires once per browser localStorage.
//
// First-load detection (D-73): on mount, if tourCompleted === false, set
// tourActive = true after a 600ms delay (lets the layout settle before
// measuring anchor rects).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

/** First-load grace period before auto-opening the tour (D-73). */
const FIRST_LOAD_DELAY_MS = 600

interface TourProviderProps {
  children: ReactNode
}

export function TourProvider({ children }: TourProviderProps) {
  const tourCompleted = usePreferencesStore((s) => s.tourCompleted)
  const setTourCompleted = usePreferencesStore((s) => s.setTourCompleted)

  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  // Track whether the first-load auto-open has already fired in this session.
  // Without this, a `setTourCompleted(false)` from "Replay tour" would re-trigger
  // the 600ms timer (harmless, but the explicit start() path already handles it).
  const firstLoadFiredRef = useRef(false)

  // First-load detection (D-73). Fires once on mount when tourCompleted === false.
  useEffect(() => {
    if (firstLoadFiredRef.current) return
    if (tourCompleted) {
      firstLoadFiredRef.current = true
      return
    }
    firstLoadFiredRef.current = true
    const t = setTimeout(() => {
      setActive(true)
      setStep(0)
    }, FIRST_LOAD_DELAY_MS)
    return () => clearTimeout(t)
  }, [tourCompleted])

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
