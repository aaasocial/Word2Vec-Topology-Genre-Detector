import { useRef, useEffect, useState } from 'react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { useReadingRoomStore } from '@/stores/readingRoomStore'
import { usePersistenceDiagram } from '@/hooks/usePersistenceDiagram'

/**
 * Resolve a `#RRGGBB` reading-room CSS custom property to an `rgb()` string the
 * Canvas 2D context can consume. The reading-room tokens hold literal hexes on
 * <html>, so a single getComputedStyle read suffices. Falls back to the arg.
 */
function resolveCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

/** Mix a `#RRGGBB` hex with alpha → rgba() string (for translucent fills). */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return `rgba(139, 59, 43, ${alpha})`
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const SIZE = 188

// Dot-scaling: radius ∝ √persistence (decision D-06), clamped.
const BASE_RADIUS = 1.6
const RADIUS_SCALE = 4.4
const MAX_RADIUS = 6.5

// Infinity-strip layout — triangle markers pinned to the top edge.
const INF_STRIP_CENTER_Y = 8
const INF_STRIP_TRIANGLE_HALF = 4
const INF_STRIP_BOTTOM_Y = 16
const INF_STRIP_HIT_RADIUS = 6
const INF_TOOLTIP_TEXT =
  'loop survives beyond ε_max — feature persists past the filtration window'

interface InfinityHit {
  x: number
  birth: number
}

/**
 * PersistenceDiagram: Canvas 2D scatter of raw (birth, death) pairs (H₁).
 *
 * X-axis = birth, Y-axis = death; the dashed diagonal y=x is the noise floor.
 *
 * Phase 12 (12-05) reading-room skin:
 * - Recolored to the reading-room (accent dots + ink outline + paper/card ground).
 * - Accent sweep lines at the current ε (vertical at birth=ε, horizontal at
 *   death=ε) + a shaded "alive corner" (birth ≤ ε ≤ death) so the diagram tracks
 *   the VR ε slider live.
 * - Loops alive at ε are opaque with an ink outline; the rest are dimmed.
 * - Finite dots scale by √persistence; ∞-death loops sit on a top strip.
 * - `Infinity` is filtered from the finite set BEFORE the axis bounds are
 *   computed (the v1 auto-rescale trap).
 */
export function PersistenceDiagram() {
  const selectedGenre = useVisualizationStore((s) => s.selectedGenre)
  const selectedBookId = useVisualizationStore((s) => s.selectedBookId)
  const selectedHomologyDim = useVisualizationStore((s) => s.selectedHomologyDim)
  const vrEpsilon = useVisualizationStore((s) => s.vrEpsilon)

  const isBook = !!selectedBookId
  const queryId = selectedBookId ?? selectedGenre

  // Re-paint when the active reading-room palette / accent changes.
  const paper = useReadingRoomStore((s) => s.tweaks.paper)
  const accentTweak = useReadingRoomStore((s) => s.tweaks.accent)

  const { data, isLoading } = usePersistenceDiagram(queryId, selectedHomologyDim, isBook)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const infinityHitsRef = useRef<InfinityHit[]>([])
  const [tooltip, setTooltip] = useState<{ x: number; y: number; birth: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = SIZE * dpr
    canvas.height = SIZE * dpr
    canvas.style.width = `${SIZE}px`
    canvas.style.height = `${SIZE}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Reading-room colors resolved fresh on each paint (re-runs on palette swap).
    const cardColor = resolveCssVar('--card', '#FAF6EC')
    const inkColor = resolveCssVar('--ink', '#26211B')
    const mutedColor = resolveCssVar('--muted', '#736B5E')
    const accent = resolveCssVar('--accent', '#8B3B2B')

    ctx.clearRect(0, 0, SIZE, SIZE)
    ctx.fillStyle = cardColor
    ctx.fillRect(0, 0, SIZE, SIZE)

    // ─── Step A: split finite from infinity BEFORE axis math ──────────────
    const rawPts = (data?.points ?? []) as Array<[number, number]>
    const finitePts = rawPts.filter(
      ([b, d]) => Number.isFinite(b) && Number.isFinite(d) && d > b,
    )
    const infinityPts = rawPts.filter(
      ([b, d]) => Number.isFinite(b) && !Number.isFinite(d),
    )

    const pad = 30
    const plotW = SIZE - pad * 2
    const plotH = SIZE - pad * 2

    // ─── Step B: axis bounds from finite values only ─────────────────────
    const epsilonMax = data?.epsilon_max ?? 1.0
    const finiteVals = finitePts.flatMap(([b, d]) => [b, d])
    const dataMax = finiteVals.length > 0 ? Math.max(...finiteVals) : epsilonMax
    const axisMax = Math.min(dataMax * 1.1, epsilonMax) || 1.0

    const tx = (v: number) => pad + (Math.min(v, axisMax) / axisMax) * plotW
    const ty = (v: number) => SIZE - pad - (Math.min(v, axisMax) / axisMax) * plotH

    // ─── Step C: ε sweep — shaded alive corner + sweep lines ─────────────
    // Loops alive at ε satisfy birth ≤ ε ≤ death → upper-left of (ε, ε).
    const epsX = tx(vrEpsilon)
    const epsY = ty(vrEpsilon)
    if (vrEpsilon > 0) {
      ctx.fillStyle = hexToRgba(accent, 0.07)
      const cw = Math.max(0, epsX - pad)
      const ch = Math.max(0, epsY - pad)
      ctx.fillRect(pad, pad, cw, ch)
    }

    // Axis frame (left + bottom)
    ctx.strokeStyle = hexToRgba(inkColor, 0.4)
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, SIZE - pad); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(pad, SIZE - pad); ctx.lineTo(SIZE - pad, SIZE - pad); ctx.stroke()

    // Diagonal y = x (zero-persistence noise floor)
    ctx.strokeStyle = hexToRgba(inkColor, 0.3)
    ctx.lineWidth = 1
    ctx.setLineDash([2, 3])
    ctx.beginPath()
    ctx.moveTo(tx(0), ty(0))
    ctx.lineTo(tx(axisMax), ty(axisMax))
    ctx.stroke()
    ctx.setLineDash([])

    // Sweep lines at ε (accent)
    if (vrEpsilon > 0) {
      ctx.strokeStyle = hexToRgba(accent, 0.5)
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(epsX, pad); ctx.lineTo(epsX, SIZE - pad); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(pad, epsY); ctx.lineTo(SIZE - pad, epsY); ctx.stroke()
      ctx.fillStyle = accent
      ctx.font = '8px JetBrains Mono, monospace'
      ctx.textAlign = 'left'
      ctx.fillText('ε', epsX + 3, pad + 9)
    }

    // ─── Step D: √-scaled finite dots, alive-aware ───────────────────────
    const finitePersistences = finitePts.map(([b, d]) => d - b)
    const maxFinitePersistence =
      finitePersistences.length > 0 ? Math.max(...finitePersistences) : 1.0

    for (const [birth, death] of finitePts) {
      const persistence = death - birth
      const normalized = persistence / maxFinitePersistence
      const radius = Math.min(MAX_RADIUS, BASE_RADIUS + RADIUS_SCALE * Math.sqrt(normalized))
      const alive = vrEpsilon > 0 && birth <= vrEpsilon && death >= vrEpsilon

      ctx.beginPath()
      ctx.arc(tx(birth), ty(death), radius, 0, Math.PI * 2)
      ctx.fillStyle = alive ? accent : hexToRgba(accent, 0.28)
      ctx.fill()
      if (alive) {
        ctx.lineWidth = 0.8
        ctx.strokeStyle = inkColor
        ctx.stroke()
      }
    }

    // ─── Step E: infinity-strip top band (▲, ink fill + accent outline) ──
    const newHits: InfinityHit[] = []
    if (infinityPts.length > 0) {
      for (const [birth] of infinityPts) {
        const cx = Math.min(SIZE - pad, Math.max(pad, tx(birth)))
        const y = INF_STRIP_CENTER_Y
        ctx.beginPath()
        ctx.moveTo(cx, y - INF_STRIP_TRIANGLE_HALF)
        ctx.lineTo(cx - INF_STRIP_TRIANGLE_HALF, y + INF_STRIP_TRIANGLE_HALF)
        ctx.lineTo(cx + INF_STRIP_TRIANGLE_HALF, y + INF_STRIP_TRIANGLE_HALF)
        ctx.closePath()
        ctx.fillStyle = inkColor
        ctx.fill()
        ctx.lineWidth = 1
        ctx.strokeStyle = accent
        ctx.stroke()
        newHits.push({ x: cx, birth })
      }

      ctx.strokeStyle = hexToRgba(inkColor, 0.3)
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(pad, INF_STRIP_BOTTOM_Y)
      ctx.lineTo(SIZE - pad, INF_STRIP_BOTTOM_Y)
      ctx.stroke()

      ctx.fillStyle = inkColor
      ctx.font = '10px JetBrains Mono, monospace'
      ctx.textAlign = 'left'
      ctx.fillText('∞', 4, 12)
    }
    infinityHitsRef.current = newHits

    // ─── Step F: axis ticks + labels ─────────────────────────────────────
    ctx.fillStyle = mutedColor
    ctx.font = '8px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    const gridSteps = 4
    for (let i = 0; i <= gridSteps; i++) {
      const v = (axisMax * i) / gridSteps
      const label = v.toFixed(v < 1 ? 2 : 1)
      ctx.fillText(label, tx(v), SIZE - pad + 12)
    }
    ctx.textAlign = 'right'
    ctx.fillText('death →', pad - 6, pad + 2)
    ctx.textAlign = 'right'
    ctx.fillText('birth →', SIZE - pad, SIZE - pad + 22)
  }, [data, vrEpsilon, paper, accentTweak])

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (y < 0 || y > INF_STRIP_BOTTOM_Y) {
      if (tooltip) setTooltip(null)
      return
    }
    const hit = infinityHitsRef.current.find((h) => Math.abs(h.x - x) <= INF_STRIP_HIT_RADIUS)
    if (hit) {
      setTooltip({ x: hit.x, y: INF_STRIP_BOTTOM_Y + 4, birth: hit.birth })
    } else if (tooltip) {
      setTooltip(null)
    }
  }

  function handleMouseLeave() {
    if (tooltip) setTooltip(null)
  }

  const hasSelection = !!queryId

  return (
    <div style={{ position: 'relative' }}>
      {!hasSelection && (
        <div
          style={{
            width: SIZE,
            height: SIZE,
            background: 'var(--card)',
            border: '1px solid var(--ink-33)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              color: 'var(--muted)',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 12,
              textAlign: 'center',
              padding: 16,
            }}
          >
            Pick a region.
          </span>
        </div>
      )}

      {hasSelection && isLoading && (
        <div
          style={{
            width: SIZE,
            height: SIZE,
            background: 'var(--paper2)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      )}

      {hasSelection && !isLoading && !data && (
        <div
          style={{
            width: SIZE,
            height: SIZE,
            background: 'var(--card)',
            border: '1px solid var(--ink-33)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              color: 'var(--muted)',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 12,
              textAlign: 'center',
              padding: 16,
            }}
          >
            No H₁ diagram data.
          </span>
        </div>
      )}

      {hasSelection && data && (
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ display: 'block' }}
        />
      )}

      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: Math.max(0, Math.min(SIZE - 200, tooltip.x - 100)),
            top: tooltip.y,
            maxWidth: 200,
            padding: '6px 9px',
            background: 'var(--card)',
            border: '1px solid var(--ink)',
            color: 'var(--ink)',
            fontFamily: 'var(--font-serif)',
            fontSize: 11,
            lineHeight: 1.4,
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent)',
              fontWeight: 600,
              marginBottom: 2,
            }}
          >
            birth = {tooltip.birth.toFixed(3)}
          </div>
          <div>{INF_TOOLTIP_TEXT}</div>
        </div>
      )}
    </div>
  )
}
