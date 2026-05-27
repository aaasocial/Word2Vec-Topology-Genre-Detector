// Phase 10 D-69 / D-74 / D-75 — hand-rolled tour overlay.
//
// Visual contract:
//   - Full-viewport dim layer (hsl(var(--background) / 0.55)). Click → skip.
//   - Glow ring tracks the live anchor via getBoundingClientRect; 280ms ease
//     transition on top/left/width/height when the step changes.
//   - Tour card pinned bottom-right at fixed 28/28; card NEVER moves between
//     steps so the only motion is the glow ring (D-74).
//
// PITFALLS §14: missing-anchor fallback waits 600ms (anchor may live on a
// sibling tab and need a mount) then silently advances. Never throws.

import { useEffect, useRef, useState } from 'react'
import {
  findAnchor,
  TOUR_STEPS,
  type TourStep,
} from './anchors'

interface TourOverlayProps {
  step: number
  onPrev: () => void
  onNext: () => void
  onSkip: () => void
  onClose: () => void
}

interface AnchorRect {
  top: number
  left: number
  width: number
  height: number
}

/** Glow ring padding around the anchor (D-74). */
const PAD = 8
/** Missing-anchor grace before silently skipping (D-72). */
const MISSING_ANCHOR_GRACE_MS = 600
/** Catch transition-driven layout shifts (matches prototype). */
const ANCHOR_POLL_INTERVAL_MS = 250

export function TourOverlay({ step, onPrev, onNext, onSkip, onClose }: TourOverlayProps) {
  const current: TourStep | undefined = TOUR_STEPS[step]
  const isLast = step === TOUR_STEPS.length - 1
  const isFirst = step === 0

  const [rect, setRect] = useState<AnchorRect | null>(null)
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track the anchor: position the glow ring, scroll into view if needed.
  // Missing-anchor → wait 600ms, recheck, then silently advance.
  useEffect(() => {
    if (!current) return

    function clearSkipTimer() {
      if (skipTimerRef.current !== null) {
        clearTimeout(skipTimerRef.current)
        skipTimerRef.current = null
      }
    }

    function update() {
      if (!current) return
      const el = findAnchor(current.anchor)
      if (!el) {
        if (skipTimerRef.current === null) {
          skipTimerRef.current = setTimeout(() => {
            if (!findAnchor(current.anchor)) {
              if (isLast) onClose()
              else onNext()
            }
            skipTimerRef.current = null
          }, MISSING_ANCHOR_GRACE_MS)
        }
        return
      }
      // Anchor is back — kill the pending skip timer.
      clearSkipTimer()
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth', inline: 'nearest' })
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }

    update()
    const onResize = () => update()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    const iv = setInterval(update, ANCHOR_POLL_INTERVAL_MS)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
      clearInterval(iv)
      clearSkipTimer()
    }
  }, [current, isLast, onClose, onNext])

  // Keyboard nav (D-75): Esc skip, ArrowRight next, ArrowLeft back.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onSkip()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (isLast) onClose()
        else onNext()
      } else if (e.key === 'ArrowLeft' && !isFirst) {
        e.preventDefault()
        onPrev()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onPrev, onNext, onSkip, onClose, isFirst, isLast])

  if (!current) return null

  return (
    <>
      {/* Dim layer — covers viewport. Click → skip (D-74). */}
      <div
        onClick={onSkip}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'hsl(var(--background) / 0.55)',
          pointerEvents: 'auto',
          zIndex: 40,
          animation: 'tour-dim-in 200ms ease',
        }}
      />

      {/* Glow ring — tracks anchor with 280ms ease (D-74). */}
      {rect && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: 8,
            boxShadow:
              '0 0 0 4px hsl(var(--primary) / 0.55), 0 0 22px hsl(var(--primary) / 0.55)',
            pointerEvents: 'none',
            transition: 'top 280ms cubic-bezier(0.25, 0.1, 0.25, 1), left 280ms cubic-bezier(0.25, 0.1, 0.25, 1), width 280ms cubic-bezier(0.25, 0.1, 0.25, 1), height 280ms cubic-bezier(0.25, 0.1, 0.25, 1)',
            zIndex: 41,
          }}
        />
      )}

      {/* Tour card — pinned bottom-right, never moves between steps. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          width: 340,
          padding: '18px 20px',
          background: 'hsl(var(--card))',
          color: 'hsl(var(--card-foreground))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 12,
          boxShadow: '0 24px 64px rgba(0,0,0,0.32)',
          zIndex: 50,
          animation: 'tour-card-in 240ms ease',
        }}
      >
        {/* Step indicator row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10.5,
              color: 'hsl(var(--muted-foreground))',
              letterSpacing: '0.1em',
            }}
          >
            STEP {step + 1} / {TOUR_STEPS.length}
          </span>
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                style={{
                  height: 4,
                  flex: 1,
                  borderRadius: 2,
                  background:
                    i <= step ? 'hsl(var(--primary))' : 'hsl(var(--secondary))',
                  transition: 'background 200ms ease',
                }}
              />
            ))}
          </div>
        </div>

        <h3
          id="tour-title"
          style={{
            margin: '0 0 6px',
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: '-0.005em',
            color: 'hsl(var(--card-foreground))',
          }}
        >
          {current.title}
        </h3>
        <div
          style={{
            fontSize: 13,
            color: 'hsl(var(--muted-foreground))',
            lineHeight: 1.55,
          }}
        >
          {current.body}
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={onSkip}
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 11.5,
              color: 'hsl(var(--muted-foreground))',
              padding: '6px 0',
              cursor: 'pointer',
            }}
          >
            Skip tour
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={onPrev}
            disabled={isFirst}
            type="button"
            style={{
              background: 'transparent',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--foreground))',
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 12,
              cursor: isFirst ? 'not-allowed' : 'pointer',
              opacity: isFirst ? 0.4 : 1,
            }}
          >
            ← Back
          </button>
          <button
            onClick={isLast ? onClose : onNext}
            type="button"
            style={{
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              border: 'none',
              padding: '6px 16px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {isLast ? 'Done' : 'Next →'}
          </button>
        </div>
      </div>

      {/* Local animations — not declared globally to keep them scoped. */}
      <style>{`
        @keyframes tour-dim-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes tour-card-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
