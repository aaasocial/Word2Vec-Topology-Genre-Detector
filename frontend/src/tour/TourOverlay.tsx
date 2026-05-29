// Reading Room — guided-tour spotlight overlay (Phase 12, 12-06, §6.10 / L-10).
//
// Replaces the Phase 10 single box-shadow glow ring with the reading-room
// spotlight: FOUR dim panels (rgba(38,33,27,0.46)) frame the live anchor, leaving
// it lit; a 1.5px accent frame with corner ticks rings the anchor; a margin card
// (STOP n/6 · title · body · End tour · ← Back · Next →) pins to the viewport
// quadrant OPPOSITE the anchor so it never covers what it describes.
//
// The overlay is full-viewport `position: fixed` (production is the fluid
// editorial layout — L-14 — not the prototype's fixed 1240×780 stage). It tracks
// the anchor via getBoundingClientRect on a 200ms poll + resize/scroll. Per-stop
// route navigation + the Topology Mystery pre-select live in TourProvider; this
// component only frames whatever `[data-tour-id]` the current step names.
//
// PITFALLS §14: a missing anchor (e.g. the new screen is still mounting) waits
// ~700ms then advances — never throws.

import { useEffect, useRef, useState } from 'react'
import { findAnchor, TOUR_STEPS, type TourStep } from './anchors'

interface TourOverlayProps {
  step: number
  onPrev: () => void
  onNext: () => void
  /** Reached the end / End-tour button / Esc. */
  onEnd: () => void
}

interface AnchorRect {
  top: number
  left: number
  width: number
  height: number
}

/** Lit-frame padding around the anchor (prototype: 10). */
const PAD = 10
/** Missing-anchor grace before silently advancing (prototype: 700ms). */
const MISSING_ANCHOR_GRACE_MS = 700
/** Catch transition-driven layout shifts (prototype: 200ms). */
const ANCHOR_POLL_INTERVAL_MS = 200
/** Dim panel fill (L-10). */
const DIM = 'rgba(38,33,27,0.46)'

export function TourOverlay({ step, onPrev, onNext, onEnd }: TourOverlayProps) {
  const current: TourStep | undefined = TOUR_STEPS[step]
  const isLast = step === TOUR_STEPS.length - 1
  const isFirst = step === 0

  const [rect, setRect] = useState<AnchorRect | null>(null)
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset the highlight whenever the step changes — the new screen may still be
  // mounting, so we re-acquire from scratch.
  useEffect(() => {
    setRect(null)
  }, [step])

  // Track the live anchor in viewport space; advance silently if it never mounts.
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
            skipTimerRef.current = null
            if (!findAnchor(current.anchor)) {
              if (isLast) onEnd()
              else onNext()
            }
          }, MISSING_ANCHOR_GRACE_MS)
        }
        return
      }
      // Anchor is back — kill the pending skip timer + frame it.
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
  }, [current, isLast, onEnd, onNext])

  // Keyboard nav (L-09): Esc ends, ArrowRight next/end, ArrowLeft back.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onEnd()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (isLast) onEnd()
        else onNext()
      } else if (e.key === 'ArrowLeft' && !isFirst) {
        e.preventDefault()
        onPrev()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onPrev, onNext, onEnd, isFirst, isLast])

  if (!current) return null

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800

  // The lit hole (anchor + padding), clamped to the viewport.
  const hole = rect
    ? {
        t: Math.max(0, rect.top - PAD),
        l: Math.max(0, rect.left - PAD),
        w: rect.width + PAD * 2,
        h: rect.height + PAD * 2,
      }
    : null

  // Margin card pins to the quadrant OPPOSITE the anchor centre (L-10).
  const cx = rect ? rect.left + rect.width / 2 : vw / 2
  const cy = rect ? rect.top + rect.height / 2 : vh * 0.7
  const M = 28
  const cardPos: React.CSSProperties = { position: 'fixed', width: 340, zIndex: 1003 }
  if (cx > vw / 2) cardPos.left = M
  else cardPos.right = M
  if (cy > vh / 2) cardPos.top = M
  else cardPos.bottom = M

  const transition =
    'top 300ms cubic-bezier(0.4,0,0.2,1), left 300ms cubic-bezier(0.4,0,0.2,1), width 300ms cubic-bezier(0.4,0,0.2,1), height 300ms cubic-bezier(0.4,0,0.2,1)'

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, fontFamily: 'var(--font-serif)' }}
    >
      {/* Click-catcher: blocks interaction with the room beneath; no accidental
          dismiss (the tour is dismissed only via End tour / Esc). */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 1000, cursor: 'default' }}
        aria-hidden="true"
      />

      {/* Spotlight — four dim panels frame the lit anchor + accent frame + ticks. */}
      {hole && (
        <>
          {/* top */}
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              background: DIM,
              zIndex: 1001,
              pointerEvents: 'none',
              top: 0,
              left: 0,
              width: vw,
              height: Math.max(0, hole.t),
            }}
          />
          {/* bottom */}
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              background: DIM,
              zIndex: 1001,
              pointerEvents: 'none',
              top: hole.t + hole.h,
              left: 0,
              width: vw,
              height: Math.max(0, vh - (hole.t + hole.h)),
            }}
          />
          {/* left */}
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              background: DIM,
              zIndex: 1001,
              pointerEvents: 'none',
              top: hole.t,
              left: 0,
              width: Math.max(0, hole.l),
              height: hole.h,
            }}
          />
          {/* right */}
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              background: DIM,
              zIndex: 1001,
              pointerEvents: 'none',
              top: hole.t,
              left: hole.l + hole.w,
              width: Math.max(0, vw - (hole.l + hole.w)),
              height: hole.h,
            }}
          />

          {/* The lit frame + corner ticks. */}
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              top: hole.t,
              left: hole.l,
              width: hole.w,
              height: hole.h,
              border: '1.5px solid var(--accent)',
              zIndex: 1002,
              pointerEvents: 'none',
              transition,
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  top: i < 2 ? -1 : 'auto',
                  bottom: i >= 2 ? -1 : 'auto',
                  left: i % 2 === 0 ? -1 : 'auto',
                  right: i % 2 === 1 ? -1 : 'auto',
                  width: 9,
                  height: 9,
                  borderTop: i < 2 ? '2px solid var(--accent)' : 'none',
                  borderBottom: i >= 2 ? '2px solid var(--accent)' : 'none',
                  borderLeft: i % 2 === 0 ? '2px solid var(--accent)' : 'none',
                  borderRight: i % 2 === 1 ? '2px solid var(--accent)' : 'none',
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Margin card — opposite quadrant. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rr-tour-title"
        style={{
          ...cardPos,
          background: 'var(--card)',
          border: '1px solid var(--ink)',
          boxShadow: '6px 6px 0 var(--ink-33)',
          padding: '18px 20px 16px',
          color: 'var(--ink)',
          animation: 'rr-tour-card-in 240ms ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              letterSpacing: '0.16em',
              color: 'var(--muted)',
              whiteSpace: 'nowrap',
            }}
          >
            STOP {step + 1} / {TOUR_STEPS.length}
          </span>
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                style={{
                  height: 3,
                  flex: 1,
                  background: i <= step ? 'var(--accent)' : 'var(--ink-22)',
                  transition: 'background 220ms ease',
                }}
              />
            ))}
          </div>
        </div>

        <h3
          id="rr-tour-title"
          style={{
            margin: '0 0 8px',
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 21,
            lineHeight: 1.15,
          }}
        >
          {current.title}
        </h3>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink)' }}>
          {current.body}
        </p>

        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onEnd}
            type="button"
            style={{
              all: 'unset',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            End tour
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={onPrev}
            disabled={isFirst}
            type="button"
            style={{
              all: 'unset',
              cursor: isFirst ? 'not-allowed' : 'pointer',
              padding: '6px 14px',
              border: '1px solid var(--ink-55)',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 13,
              color: 'var(--ink)',
              opacity: isFirst ? 0.35 : 1,
            }}
          >
            ← Back
          </button>
          <button
            onClick={isLast ? onEnd : onNext}
            type="button"
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '6px 16px',
              background: 'var(--ink)',
              color: 'var(--paper)',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 13,
            }}
          >
            {isLast ? 'Done' : 'Next →'}
          </button>
        </div>
      </div>

      <style>{`@keyframes rr-tour-card-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}
