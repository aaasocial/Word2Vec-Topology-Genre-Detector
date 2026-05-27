import { useRef, useEffect, useState, useCallback } from 'react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { usePersistenceImage } from '@/hooks/usePersistenceImage'
import { renderHeatmap } from '@/lib/heatmap'
import { PLASMA_256 } from '@/lib/plasma'
import { exportHeatmapPNG, exportPersistenceCSV } from '@/lib/exportUtils'
import { HomologyTabs } from './HomologyTabs'

const HEATMAP_SIZE = 300 // default canvas size, constrained to min 200 max 400

export function PersistenceHeatmap() {
  const selectedGenre = useVisualizationStore((s) => s.selectedGenre)
  const selectedBookId = useVisualizationStore((s) => s.selectedBookId)
  const selectedHomologyDim = useVisualizationStore((s) => s.selectedHomologyDim)

  // Prefer book if selected, otherwise genre
  const isBook = !!selectedBookId
  const queryId = selectedBookId ?? selectedGenre

  const { data, isLoading } = usePersistenceImage(queryId, selectedHomologyDim, isBook)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const colorBarRef = useRef<HTMLCanvasElement>(null)

  // Render heatmap when data changes
  useEffect(() => {
    if (!data || !canvasRef.current) return
    const canvas = canvasRef.current
    canvas.width = HEATMAP_SIZE
    canvas.height = HEATMAP_SIZE
    renderHeatmap(canvas, data.data, data.M, data.vmin, data.vmax)
  }, [data])

  // Render color bar
  useEffect(() => {
    if (!data || !colorBarRef.current) return
    const canvas = colorBarRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = 12
    canvas.height = HEATMAP_SIZE
    const stepH = HEATMAP_SIZE / 256
    for (let i = 0; i < 256; i++) {
      // Top = high values (255), bottom = low values (0)
      const idx = 255 - i
      const [r, g, b] = PLASMA_256[idx]
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(0, i * stepH, 12, stepH + 1)
    }
  }, [data])

  const hasSelection = !!queryId

  // Export feedback state
  const [pngExported, setPngExported] = useState(false)
  const [csvExported, setCsvExported] = useState(false)

  const handleExportPNG = useCallback(() => {
    if (!canvasRef.current || !queryId) return
    exportHeatmapPNG(canvasRef.current, queryId, selectedHomologyDim)
    setPngExported(true)
    setTimeout(() => setPngExported(false), 2000)
  }, [queryId, selectedHomologyDim])

  const handleExportCSV = useCallback(() => {
    if (!data || !queryId) return
    // Convert flat persistence image data to diagram entries for CSV
    const M = data.M
    const diagrams: { birth: number; death: number; dimension: number }[] = []
    for (let row = 0; row < M; row++) {
      for (let col = 0; col < M; col++) {
        const val = data.data[row * M + col]
        if (val > 0) {
          diagrams.push({
            birth: col / M,
            death: row / M,
            dimension: selectedHomologyDim,
          })
        }
      }
    }
    exportPersistenceCSV(diagrams, queryId, selectedHomologyDim)
    setCsvExported(true)
    setTimeout(() => setCsvExported(false), 2000)
  }, [data, queryId, selectedHomologyDim])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'hsl(var(--foreground))', margin: 0 }}>
            Persistence Image
          </h2>
          <HomologyTabs />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleExportPNG}
            disabled={!data}
            style={{
              background: 'transparent',
              border: '1px solid hsl(var(--border))',
              color: data ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground) / 0.6)',
              fontSize: 12,
              padding: '4px 8px',
              borderRadius: 4,
              cursor: data ? 'pointer' : 'not-allowed',
            }}
          >
            {pngExported ? '\u2713' : 'PNG'}
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!data}
            style={{
              background: 'transparent',
              border: '1px solid hsl(var(--border))',
              color: data ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground) / 0.6)',
              fontSize: 12,
              padding: '4px 8px',
              borderRadius: 4,
              cursor: data ? 'pointer' : 'not-allowed',
            }}
          >
            {csvExported ? '\u2713' : 'CSV'}
          </button>
        </div>
      </div>

      {/* Content area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {!hasSelection && (
          <div
            style={{
              width: HEATMAP_SIZE,
              height: HEATMAP_SIZE,
              background: 'hsl(var(--muted))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
            }}
          >
            <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 14, textAlign: 'center', padding: 24 }}>
              Select a genre or book to view persistence image
            </span>
          </div>
        )}

        {hasSelection && isLoading && (
          <div
            style={{
              width: HEATMAP_SIZE,
              height: HEATMAP_SIZE,
              background: 'hsl(var(--muted))',
              borderRadius: 4,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        )}

        {hasSelection && data && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Y-axis label */}
            <span
              style={{
                fontSize: 12,
                color: 'hsl(var(--muted-foreground))',
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                letterSpacing: 1,
              }}
            >
              Persistence
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <canvas
                ref={canvasRef}
                width={HEATMAP_SIZE}
                height={HEATMAP_SIZE}
                style={{
                  width: HEATMAP_SIZE,
                  height: HEATMAP_SIZE,
                  imageRendering: 'pixelated',
                }}
              />
              {/* X-axis label */}
              <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 8 }}>
                Birth scale
              </span>
            </div>

            {/* Color bar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: 'hsl(var(--foreground))' }}>
                {data.vmax.toFixed(2)}
              </span>
              <canvas
                ref={colorBarRef}
                width={12}
                height={HEATMAP_SIZE}
                style={{ width: 12, height: HEATMAP_SIZE }}
              />
              <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: 'hsl(var(--foreground))' }}>
                {data.vmin.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Skeleton pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
