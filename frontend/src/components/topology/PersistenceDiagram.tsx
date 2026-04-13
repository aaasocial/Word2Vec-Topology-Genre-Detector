import { useRef, useEffect } from 'react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { usePersistenceDiagram } from '@/hooks/usePersistenceDiagram'

const SIZE = 240

/**
 * PersistenceDiagram: Canvas 2D scatter plot of raw (birth, death) pairs.
 *
 * X-axis = birth (filtration radius at which feature appears)
 * Y-axis = death (filtration radius at which feature disappears)
 * Diagonal y=x marks zero-persistence (noise threshold).
 * Distance above diagonal = persistence (lifetime) of the feature.
 */
export function PersistenceDiagram() {
  const selectedGenre = useVisualizationStore((s) => s.selectedGenre)
  const selectedBookId = useVisualizationStore((s) => s.selectedBookId)
  const selectedHomologyDim = useVisualizationStore((s) => s.selectedHomologyDim)

  const isBook = !!selectedBookId
  const queryId = selectedBookId ?? selectedGenre

  const { data, isLoading } = usePersistenceDiagram(queryId, selectedHomologyDim, isBook)
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

    ctx.clearRect(0, 0, SIZE, SIZE)
    ctx.fillStyle = '#1A1A25'
    ctx.fillRect(0, 0, SIZE, SIZE)

    if (!data || data.points.length === 0) return

    const pad = 20
    const plotW = SIZE - pad * 2
    const plotH = SIZE - pad * 2
    const eps = data.epsilon_max

    // Coordinate transform: data -> canvas
    const tx = (v: number) => pad + (v / eps) * plotW
    const ty = (v: number) => SIZE - pad - (v / eps) * plotH

    // Grid lines
    ctx.strokeStyle = '#2A2A3A'
    ctx.lineWidth = 0.5
    const gridSteps = 5
    for (let i = 0; i <= gridSteps; i++) {
      const frac = i / gridSteps
      const x = pad + frac * plotW
      const y = SIZE - pad - frac * plotH
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, SIZE - pad); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(SIZE - pad, y); ctx.stroke()
    }

    // Diagonal y = x (zero-persistence line)
    ctx.strokeStyle = '#4A4A5A'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(tx(0), ty(0))
    ctx.lineTo(tx(eps), ty(eps))
    ctx.stroke()
    ctx.setLineDash([])

    // Plot points
    const pts = data.points
    const radius = pts.length > 500 ? 1.5 : pts.length > 100 ? 2 : 3
    ctx.fillStyle = '#FACC15'
    ctx.globalAlpha = pts.length > 200 ? 0.6 : 0.85
    for (const [birth, death] of pts) {
      if (death > birth && death <= eps * 1.05) {
        const cx = tx(birth)
        const cy = ty(death)
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1

    // Axis ticks + labels
    ctx.fillStyle = '#6B6B80'
    ctx.font = '9px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    for (let i = 0; i <= gridSteps; i++) {
      const v = (eps * i) / gridSteps
      const label = v.toFixed(v < 1 ? 2 : 1)
      ctx.fillText(label, tx(v), SIZE - pad + 12)
    }
    ctx.textAlign = 'right'
    for (let i = 0; i <= gridSteps; i++) {
      const v = (eps * i) / gridSteps
      const label = v.toFixed(v < 1 ? 2 : 1)
      ctx.fillText(label, pad - 4, ty(v) + 3)
    }
  }, [data])

  const hasSelection = !!queryId

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F5F5FF', margin: 0 }}>
          Persistence Diagram
        </h3>
        <span style={{ fontSize: 11, color: '#6B6B80' }}>
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
            color: '#6B6B80',
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
              background: '#1A1A25',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
            }}
          >
            <span style={{ color: '#6B6B80', fontSize: 12, textAlign: 'center', padding: 16 }}>
              Select a genre or book
            </span>
          </div>
        )}

        {hasSelection && isLoading && (
          <div
            style={{
              width: SIZE,
              height: SIZE,
              background: '#1A1A25',
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
              background: '#1A1A25',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
            }}
          >
            <span style={{ color: '#6B6B80', fontSize: 12, textAlign: 'center', padding: 16 }}>
              No H{selectedHomologyDim} diagram data
            </span>
          </div>
        )}

        {hasSelection && data && (
          <canvas
            ref={canvasRef}
            style={{ display: 'block', borderRadius: 4 }}
          />
        )}
      </div>

      {/* X-axis label */}
      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <span style={{ fontSize: 11, color: '#6B6B80' }}>Birth</span>
      </div>
    </div>
  )
}
