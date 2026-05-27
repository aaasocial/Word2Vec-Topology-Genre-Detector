import { useRef, useEffect, useState } from 'react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { usePersistenceDiagram } from '@/hooks/usePersistenceDiagram'

/**
 * Resolve a CSS HSL variable to an rgb() string the Canvas 2D context can consume.
 * Returns a sensible dark-mode fallback if the variable is unset.
 */
function resolveCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const hsl = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!hsl) return fallback
  const el = document.createElement('div')
  el.style.color = `hsl(${hsl})`
  document.body.appendChild(el)
  const rgb = getComputedStyle(el).color
  document.body.removeChild(el)
  return rgb
}

const SIZE = 320

// Dot-scaling constants (Plan 06-02, decision D-06).
// size = clamp(BASE_RADIUS + RADIUS_SCALE * sqrt(persistence/maxFinitePersistence), .., MAX_RADIUS)
const BASE_RADIUS = 1.5
const RADIUS_SCALE = 5.0
const MAX_RADIUS = 6.5

// Infinity-strip layout (decision D-07).
const INF_STRIP_CENTER_Y = 8 // y-coordinate of triangle centers (canvas px from top)
const INF_STRIP_TRIANGLE_HALF = 4 // half-side of the triangle
const INF_STRIP_BOTTOM_Y = 16 // separator line just below the strip
const INF_STRIP_HIT_RADIUS = 6 // mouseover hit radius (px)
const INF_TOOLTIP_TEXT =
  'loop survives beyond ε_max — feature persists past the filtration window'

interface InfinityHit {
  x: number
  birth: number
}

/**
 * PersistenceDiagram: Canvas 2D scatter plot of raw (birth, death) pairs.
 *
 * X-axis = birth (filtration radius at which feature appears).
 * Y-axis = death (filtration radius at which feature disappears).
 * Diagonal y=x marks zero-persistence (noise threshold).
 * Distance above diagonal = persistence (lifetime) of the feature.
 *
 * Plan 06-02 changes:
 * - Finite dots scale by `sqrt(persistence / max_finite_persistence)` (decision D-06).
 * - Infinity-death dots (loops that never close within `epsilon_max`) render on a
 *   dedicated top-line strip with triangle markers in a distinct color (decision D-07).
 * - Axis bounds computed from finite values only — `Infinity` never enters Math.max.
 * - Mouseover tooltip on infinity markers explains the math.
 */
export function PersistenceDiagram() {
  const selectedGenre = useVisualizationStore((s) => s.selectedGenre)
  const selectedBookId = useVisualizationStore((s) => s.selectedBookId)
  const selectedHomologyDim = useVisualizationStore((s) => s.selectedHomologyDim)

  const isBook = !!selectedBookId
  const queryId = selectedBookId ?? selectedGenre

  // Track active theme so the canvas re-paints when the user toggles light/dark.
  const theme = usePreferencesStore((s) => s.theme)

  const { data, isLoading } = usePersistenceDiagram(queryId, selectedHomologyDim, isBook)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Hit-test cache: x-coordinates of infinity-strip triangles, populated by the
  // last draw. Read by the onMouseMove handler to detect hover.
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
    ctx.scale(dpr, dpr)

    // Resolve themed colors fresh on each paint — re-runs when `theme` changes.
    const bgColor = resolveCssVar('--muted', 'rgb(34, 35, 46)')
    const gridColor = resolveCssVar('--border', 'rgb(39, 40, 50)')
    const diagonalColor = resolveCssVar('--muted-foreground', 'rgb(110, 110, 131)')
    const finiteColor = '#FACC15' // amber — finite-persistence dots stay theme-neutral signal
    const infinityColor = '#F87171' // red — infinity-strip triangles stay theme-neutral signal
    const axisColor = resolveCssVar('--muted-foreground', 'rgb(110, 110, 131)')

    ctx.clearRect(0, 0, SIZE, SIZE)
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, SIZE, SIZE)

    // ─── Step A: split finite from infinity BEFORE axis math ──────────────
    // Infinity-death values arrive as JS `Infinity` from the backend's custom
    // JSON encoder (PITFALLS §10). NaN / null also fail Number.isFinite, which
    // is defensive coverage in case backend ever changes encoding.
    const rawPts = (data?.points ?? []) as Array<[number, number]>
    const finitePts = rawPts.filter(
      ([b, d]) => Number.isFinite(b) && Number.isFinite(d) && d > b,
    )
    const infinityPts = rawPts.filter(
      ([b, d]) => Number.isFinite(b) && !Number.isFinite(d),
    )

    const pad = 28
    const plotW = SIZE - pad * 2
    const plotH = SIZE - pad * 2

    // ─── Step B: axis bounds from finite values only ─────────────────────
    // Putting Infinity through Math.max produced the v1 auto-rescale bug.
    const epsilonMax = data?.epsilon_max ?? 1.0
    const finiteVals = finitePts.flatMap(([b, d]) => [b, d])
    const dataMax = finiteVals.length > 0 ? Math.max(...finiteVals) : epsilonMax
    const axisMax = Math.min(dataMax * 1.1, epsilonMax)

    // Coordinate transform: data → canvas
    const tx = (v: number) => pad + (v / axisMax) * plotW
    const ty = (v: number) => SIZE - pad - (v / axisMax) * plotH

    // Grid lines
    ctx.strokeStyle = gridColor
    ctx.lineWidth = 0.5
    const gridSteps = 5
    for (let i = 0; i <= gridSteps; i++) {
      const frac = i / gridSteps
      const x = pad + frac * plotW
      const y = SIZE - pad - frac * plotH
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, SIZE - pad); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(SIZE - pad, y); ctx.stroke()
    }

    // Diagonal y = x (zero-persistence reference line)
    ctx.strokeStyle = diagonalColor
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(tx(0), ty(0))
    ctx.lineTo(tx(axisMax), ty(axisMax))
    ctx.stroke()
    ctx.setLineDash([])

    // ─── Step C: sqrt-scaled finite dots ─────────────────────────────────
    const finitePersistences = finitePts.map(([b, d]) => d - b)
    const maxFinitePersistence =
      finitePersistences.length > 0 ? Math.max(...finitePersistences) : 1.0

    ctx.fillStyle = finiteColor
    ctx.globalAlpha = finitePts.length > 200 ? 0.7 : 0.9
    for (const [birth, death] of finitePts) {
      const persistence = death - birth
      const normalized = persistence / maxFinitePersistence // in [0, 1]
      const radius = Math.min(
        MAX_RADIUS,
        BASE_RADIUS + RADIUS_SCALE * Math.sqrt(normalized),
      )
      const cx = tx(birth)
      const cy = ty(death)
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // ─── Step D: infinity-strip top band ─────────────────────────────────
    // Triangle markers (color #F87171, distinct from finite #FACC15).
    const newHits: InfinityHit[] = []
    if (infinityPts.length > 0) {
      ctx.fillStyle = infinityColor
      for (const [birth] of infinityPts) {
        // Map birth to plot x. If birth > axisMax (rare; can happen if a near-eps
        // loop never died), clamp into the strip — drawing it off-canvas would
        // hide the marker.
        const cx = Math.min(SIZE - pad, Math.max(pad, tx(birth)))
        const y = INF_STRIP_CENTER_Y
        ctx.beginPath()
        ctx.moveTo(cx, y - INF_STRIP_TRIANGLE_HALF)
        ctx.lineTo(cx - INF_STRIP_TRIANGLE_HALF, y + INF_STRIP_TRIANGLE_HALF)
        ctx.lineTo(cx + INF_STRIP_TRIANGLE_HALF, y + INF_STRIP_TRIANGLE_HALF)
        ctx.closePath()
        ctx.fill()
        newHits.push({ x: cx, birth })
      }

      // Separator line just below the strip.
      ctx.strokeStyle = diagonalColor
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(pad, INF_STRIP_BOTTOM_Y)
      ctx.lineTo(SIZE - pad, INF_STRIP_BOTTOM_Y)
      ctx.stroke()

      // Label "∞" at left edge of strip.
      ctx.fillStyle = infinityColor
      ctx.font = '10px JetBrains Mono, monospace'
      ctx.textAlign = 'left'
      ctx.fillText('∞', 4, 12)
    }
    infinityHitsRef.current = newHits

    // ─── Step F: axis ticks + labels ─────────────────────────────────────
    ctx.fillStyle = axisColor
    ctx.font = '9px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    for (let i = 0; i <= gridSteps; i++) {
      const v = (axisMax * i) / gridSteps
      const label = v.toFixed(v < 1 ? 2 : 1)
      ctx.fillText(label, tx(v), SIZE - pad + 14)
    }
    ctx.textAlign = 'right'
    for (let i = 0; i <= gridSteps; i++) {
      const v = (axisMax * i) / gridSteps
      const label = v.toFixed(v < 1 ? 2 : 1)
      ctx.fillText(label, pad - 4, ty(v) + 3)
    }
  }, [data, theme])

  // ─── Step E: mouseover tooltip on infinity strip ───────────────────────
  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    // Only test inside the strip band.
    if (y < 0 || y > INF_STRIP_BOTTOM_Y) {
      if (tooltip) setTooltip(null)
      return
    }
    const hits = infinityHitsRef.current
    const hit = hits.find((h) => Math.abs(h.x - x) <= INF_STRIP_HIT_RADIUS)
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
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))', margin: 0 }}>
          Persistence Diagram
        </h3>
        <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
          {data ? `${data.points.length} features` : ''}
        </span>
      </div>

      {/* Canvas area */}
      <div style={{ position: 'relative' }}>
        {/* Y-axis label */}
        <span
          style={{
            position: 'absolute',
            left: -18,
            top: SIZE / 2,
            fontSize: 11,
            color: 'hsl(var(--muted-foreground))',
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg) translateY(50%)',
            pointerEvents: 'none',
          }}
        >
          Death
        </span>

        {!hasSelection && (
          <div
            style={{
              width: SIZE,
              height: SIZE,
              background: 'hsl(var(--muted))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
            }}
          >
            <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12, textAlign: 'center', padding: 16 }}>
              Select a genre or book
            </span>
          </div>
        )}

        {hasSelection && isLoading && (
          <div
            style={{
              width: SIZE,
              height: SIZE,
              background: 'hsl(var(--muted))',
              borderRadius: 4,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        )}

        {hasSelection && !isLoading && !data && (
          <div
            style={{
              width: SIZE,
              height: SIZE,
              background: 'hsl(var(--muted))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
            }}
          >
            <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12, textAlign: 'center', padding: 16 }}>
              No H{selectedHomologyDim} diagram data
            </span>
          </div>
        )}

        {hasSelection && data && (
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ display: 'block', borderRadius: 4 }}
          />
        )}

        {/* Tooltip — infinity strip explainer. Text comes from INF_TOOLTIP_TEXT;
            the literal phrasing is asserted by Plan 06-02 acceptance criteria. */}
        {tooltip && (
          <div
            style={{
              position: 'absolute',
              left: Math.max(0, Math.min(SIZE - 220, tooltip.x - 110)),
              top: tooltip.y,
              maxWidth: 220,
              padding: '6px 8px',
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 4,
              color: 'hsl(var(--popover-foreground))',
              fontSize: 11,
              lineHeight: 1.35,
              pointerEvents: 'none',
              zIndex: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ color: '#F87171', fontWeight: 600, marginBottom: 2 }}>
              birth = {tooltip.birth.toFixed(3)}
            </div>
            <div>
              {INF_TOOLTIP_TEXT}
            </div>
          </div>
        )}
      </div>

      {/* X-axis label */}
      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>Birth</span>
      </div>
    </div>
  )
}
