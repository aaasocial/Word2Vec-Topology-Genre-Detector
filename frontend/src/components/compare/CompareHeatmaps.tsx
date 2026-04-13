import { useRef, useEffect, useMemo } from 'react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { usePersistenceImage } from '@/hooks/usePersistenceImage'
import { renderHeatmap, computeMinMax } from '@/lib/heatmap'
import { GENRE_COLORS } from '@/constants/genres'

const HEATMAP_SIZE = 260

export function CompareHeatmaps() {
  const selectedGenre = useVisualizationStore((s) => s.selectedGenre)
  const compareGenre = useVisualizationStore((s) => s.compareGenre)
  const selectedHomologyDim = useVisualizationStore((s) => s.selectedHomologyDim)

  const { data: dataA } = usePersistenceImage(selectedGenre, selectedHomologyDim, false)
  const { data: dataB } = usePersistenceImage(compareGenre, selectedHomologyDim, false)

  const canvasARef = useRef<HTMLCanvasElement>(null)
  const canvasBRef = useRef<HTMLCanvasElement>(null)

  // Compute shared vmin/vmax from both datasets (COMP-02)
  const sharedRange = useMemo(() => {
    if (!dataA || !dataB) return null
    return computeMinMax([...dataA.data, ...dataB.data])
  }, [dataA, dataB])

  // Render heatmap A
  useEffect(() => {
    if (!dataA || !sharedRange || !canvasARef.current) return
    const canvas = canvasARef.current
    canvas.width = HEATMAP_SIZE
    canvas.height = HEATMAP_SIZE
    renderHeatmap(canvas, dataA.data, dataA.M, sharedRange.min, sharedRange.max)
  }, [dataA, sharedRange])

  // Render heatmap B
  useEffect(() => {
    if (!dataB || !sharedRange || !canvasBRef.current) return
    const canvas = canvasBRef.current
    canvas.width = HEATMAP_SIZE
    canvas.height = HEATMAP_SIZE
    renderHeatmap(canvas, dataB.data, dataB.M, sharedRange.min, sharedRange.max)
  }, [dataB, sharedRange])

  if (!selectedGenre || !compareGenre || !dataA || !dataB) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Genre A heatmap */}
      <div>
        <div
          style={{
            fontSize: 12,
            color: GENRE_COLORS[selectedGenre] ?? '#888',
            marginBottom: 4,
          }}
        >
          {selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1)}
        </div>
        <canvas
          ref={canvasARef}
          width={HEATMAP_SIZE}
          height={HEATMAP_SIZE}
          style={{
            width: HEATMAP_SIZE,
            height: HEATMAP_SIZE,
            imageRendering: 'pixelated',
          }}
        />
      </div>

      {/* Genre B heatmap */}
      <div>
        <div
          style={{
            fontSize: 12,
            color: GENRE_COLORS[compareGenre] ?? '#888',
            marginBottom: 4,
          }}
        >
          {compareGenre.charAt(0).toUpperCase() + compareGenre.slice(1)}
        </div>
        <canvas
          ref={canvasBRef}
          width={HEATMAP_SIZE}
          height={HEATMAP_SIZE}
          style={{
            width: HEATMAP_SIZE,
            height: HEATMAP_SIZE,
            imageRendering: 'pixelated',
          }}
        />
      </div>

      {/* Axis labels */}
      <div style={{ fontSize: 11, color: '#6B6B80', textAlign: 'center' }}>
        Birth scale
      </div>
    </div>
  )
}
