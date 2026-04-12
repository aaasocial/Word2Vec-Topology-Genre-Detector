import { useMemo, useRef } from 'react'
import { ScatterCanvas } from '@/components/canvas/ScatterCanvas'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { GenreLegend } from '@/components/sidebar/GenreLegend'
import { KeyboardHint } from '@/components/sidebar/KeyboardHint'
import { useScatterData } from '@/hooks/useScatterData'
import { useGenreTfidf, useBookTfidf } from '@/hooks/useTfidfData'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { useUploadStore } from '@/stores/uploadStore'
import { useUIStore } from '@/stores/uiStore'
import { buildBuffers, buildUploadedBuffers } from '@/lib/buffers'
import { GENRE_COLORS } from '@/constants/genres'

export default function App() {
  const projection = useVisualizationStore((s) => s.projection)
  const selectedGenre = useVisualizationStore((s) => s.selectedGenre)
  const selectedBookId = useVisualizationStore((s) => s.selectedBookId)
  const selectedPointIndex = useVisualizationStore((s) => s.selectedPointIndex)
  const hoveredPointIndex = useVisualizationStore((s) => s.hoveredPointIndex)
  const setSelectedPoint = useVisualizationStore((s) => s.setSelectedPoint)
  const setHoveredPoint = useVisualizationStore((s) => s.setHoveredPoint)

  const sidebarOpen = useUIStore(s => s.sidebarOpen)
  const toggleSidebar = useUIStore(s => s.toggleSidebar)

  const { uploadedPoints } = useUploadStore()

  // Search input ref — passed to both WordSearch and useKeyboardShortcuts
  const searchInputRef = useRef<HTMLInputElement>(null)
  useKeyboardShortcuts(searchInputRef)

  const { data, isLoading } = useScatterData(projection)

  // TF-IDF data for genre/book brightness encoding
  const { data: genreTfidf } = useGenreTfidf(selectedGenre)
  const { data: bookTfidf } = useBookTfidf(selectedBookId)
  const activeTfidf = bookTfidf ?? genreTfidf ?? null

  const corpusBuffers = useMemo(() => {
    if (!data?.points) return null
    return buildBuffers(data.points, GENRE_COLORS)
  }, [data])

  // Build tfidfWeights Float32Array aligned to corpus points, normalized to [0,1]
  const tfidfWeights = useMemo<Float32Array | null>(() => {
    if (!activeTfidf || !data?.points) return null
    const weights = new Float32Array(data.points.length)
    let maxW = 1
    for (let i = 0; i < data.points.length; i++) {
      weights[i] = activeTfidf[data.points[i].word] ?? 0
      if (weights[i] > maxW) maxW = weights[i]
    }
    for (let i = 0; i < weights.length; i++) weights[i] /= maxW
    return weights
  }, [activeTfidf, data])

  const uploadedBuffers = useMemo(() => {
    return buildUploadedBuffers(uploadedPoints)
  }, [uploadedPoints])

  // Merge corpus + uploaded points into single buffer
  const mergedBuffers = useMemo(() => {
    if (!corpusBuffers) return null
    if (uploadedBuffers.positions.length === 0) return corpusBuffers

    const cn = corpusBuffers.positions.length / 3
    const un = uploadedBuffers.positions.length / 3
    const n = cn + un

    const positions = new Float32Array(n * 3)
    const colors = new Float32Array(n * 3)
    const sizes = new Float32Array(n)
    const opacities = new Float32Array(n)

    positions.set(corpusBuffers.positions)
    positions.set(uploadedBuffers.positions, cn * 3)
    colors.set(corpusBuffers.colors)
    colors.set(uploadedBuffers.colors, cn * 3)
    sizes.set(corpusBuffers.sizes)
    sizes.set(uploadedBuffers.sizes, cn)
    opacities.set(corpusBuffers.opacities)
    opacities.set(uploadedBuffers.opacities, cn)

    return { positions, colors, sizes, opacities }
  }, [corpusBuffers, uploadedBuffers])

  const allPoints = useMemo(() => {
    if (!data?.points) return []
    return [...data.points, ...uploadedPoints]
  }, [data, uploadedPoints])

  return (
    <>
      {/* Unsupported screen overlay — pure CSS, no React state */}
      <style>{`
        @media (max-width: 767px) {
          .unsupported { display: flex !important; }
          .app-root { display: none !important; }
        }
      `}</style>

      <div
        className="unsupported"
        style={{
          display: 'none',
          position: 'fixed',
          inset: 0,
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A0A0F',
          color: '#9090A0',
          fontSize: 16,
          textAlign: 'center',
          padding: 24,
          zIndex: 9999,
        }}
      >
        Literary Genre Topology requires a screen wider than 768px.
      </div>

      <div
        className="app-root"
        style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}
      >
        {/* 3D Canvas area */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          {isLoading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6B6B80',
                fontSize: 14,
                zIndex: 10,
              }}
            >
              Loading scatter data...
            </div>
          )}
          {mergedBuffers && (
            <ScatterCanvas
              positions={mergedBuffers.positions}
              colors={mergedBuffers.colors}
              sizes={mergedBuffers.sizes}
              opacities={mergedBuffers.opacities}
              points={allPoints}
              tfidfWeights={tfidfWeights}
              selectedIndex={selectedPointIndex}
              hoveredIndex={hoveredPointIndex}
              onHover={setHoveredPoint}
              onClick={setSelectedPoint}
            />
          )}

          {/* Canvas overlays */}
          <GenreLegend />
          <KeyboardHint />
        </div>

        {/* Sidebar */}
        <Sidebar
          points={allPoints}
          open={sidebarOpen}
          onToggle={toggleSidebar}
          searchInputRef={searchInputRef}
        />
      </div>
    </>
  )
}
