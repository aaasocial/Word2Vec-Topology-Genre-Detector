import { useRef, useEffect } from 'react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { useReadingRoomStore } from '@/stores/readingRoomStore'
import { usePersistenceImage } from '@/hooks/usePersistenceImage'
import { renderReadingRoomHeatmap, readingRoomRamp } from '@/lib/heatmap'
import { genreColor } from '@/constants/genres'

const HEATMAP_SIZE = 150

/** Resolve a `#RRGGBB` reading-room CSS custom property; falls back to the arg. */
function resolveCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

/**
 * PersistenceHeatmap (reading-room skin, 12-05): the persistence image (iii) for
 * the Topology side column.
 *
 * The 20×20 → 400-vector image rendered with the **`paper2 → genreHex → ink`**
 * ramp (genreHex = the selected region's reading-room hex; replaces PLASMA), a
 * framed figure, and a horizontal **density legend** (vmin · density · vmax). A
 * faint ε birth-axis guide ties the image to the VR ε slider (birth runs along
 * the image's X-axis, so the guide is a vertical line at birth = ε).
 */
export function PersistenceHeatmap() {
  const selectedGenre = useVisualizationStore((s) => s.selectedGenre)
  const selectedBookId = useVisualizationStore((s) => s.selectedBookId)
  const selectedHomologyDim = useVisualizationStore((s) => s.selectedHomologyDim)
  const vrEpsilon = useVisualizationStore((s) => s.vrEpsilon)

  const isBook = !!selectedBookId
  const queryId = selectedBookId ?? selectedGenre

  // Re-paint on palette / accent swap so the ramp tracks the active paper.
  const paper = useReadingRoomStore((s) => s.tweaks.paper)
  const accentTweak = useReadingRoomStore((s) => s.tweaks.accent)

  const { data, isLoading } = usePersistenceImage(queryId, selectedHomologyDim, isBook)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const legendRef = useRef<HTMLCanvasElement>(null)

  const genreHex = selectedGenre ? genreColor(selectedGenre) : '#736B5E'

  // Heatmap with the reading-room ramp.
  useEffect(() => {
    if (!data || !canvasRef.current) return
    const canvas = canvasRef.current
    canvas.width = HEATMAP_SIZE
    canvas.height = HEATMAP_SIZE
    const paper2 = resolveCssVar('--paper2', '#E9E3D2')
    const ink = resolveCssVar('--ink', '#26211B')
    renderReadingRoomHeatmap(canvas, data.data, data.M, data.vmin, data.vmax, paper2, genreHex, ink)
  }, [data, genreHex, paper, accentTweak])

  // Horizontal density legend (paper2 → genreHex → ink).
  useEffect(() => {
    if (!data || !legendRef.current) return
    const canvas = legendRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = HEATMAP_SIZE
    canvas.width = W
    canvas.height = 8
    const paper2 = resolveCssVar('--paper2', '#E9E3D2')
    const ink = resolveCssVar('--ink', '#26211B')
    // Stepped fillRect ramp (paper2 → genreHex → ink) rather than a canvas
    // linear gradient — keeps the legend renderable under the jsdom canvas mock
    // (no createLinearGradient) and identical to the heatmap's own ramp.
    for (let x = 0; x < W; x++) {
      const [r, g, b] = readingRoomRamp(x / (W - 1), paper2, genreHex, ink)
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`
      ctx.fillRect(x, 0, 1, 8)
    }
  }, [data, genreHex, paper, accentTweak])

  const hasSelection = !!queryId
  // ε guide along the birth axis (image X), clamped into the figure.
  const epsMax = data ? Math.max(data.vmax, 1) : 1
  const epsGuidePct = data && vrEpsilon > 0 ? Math.min(100, (vrEpsilon / epsMax) * 100) : null

  if (!hasSelection) {
    return (
      <div
        style={{
          width: HEATMAP_SIZE,
          height: HEATMAP_SIZE,
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
    )
  }

  if (isLoading) {
    return (
      <div
        style={{
          width: HEATMAP_SIZE,
          height: HEATMAP_SIZE,
          background: 'var(--paper2)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
    )
  }

  if (!data) {
    return (
      <div
        style={{
          width: HEATMAP_SIZE,
          height: HEATMAP_SIZE,
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
          No persistence image.
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Framed heatmap with the ε birth-axis guide. */}
      <div style={{ position: 'relative', width: HEATMAP_SIZE, height: HEATMAP_SIZE }}>
        <canvas
          ref={canvasRef}
          width={HEATMAP_SIZE}
          height={HEATMAP_SIZE}
          style={{ display: 'block', width: HEATMAP_SIZE, height: HEATMAP_SIZE, imageRendering: 'pixelated' }}
        />
        {epsGuidePct != null && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${epsGuidePct}%`,
              width: 1,
              background: 'var(--accent)',
              opacity: 0.55,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Density legend (paper2 → genreHex → ink). */}
      <div style={{ width: HEATMAP_SIZE }}>
        <canvas
          ref={legendRef}
          width={HEATMAP_SIZE}
          height={8}
          style={{
            display: 'block',
            width: HEATMAP_SIZE,
            height: 8,
            border: '0.5px solid var(--ink-33)',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)',
            fontSize: 8.5,
            color: 'var(--muted)',
            marginTop: 2,
          }}
        >
          <span>{data.vmin.toFixed(0)}</span>
          <span>density</span>
          <span>{data.vmax.toFixed(1)}</span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
