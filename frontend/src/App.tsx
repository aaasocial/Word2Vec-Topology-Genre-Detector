import { useMemo } from 'react'
import * as THREE from 'three'
import { ScatterCanvas } from '@/components/canvas/ScatterCanvas'
import { UploadZone } from '@/components/sidebar/UploadZone'
import { UploadProgress } from '@/components/sidebar/UploadProgress'
import { ClassificationResult } from '@/components/sidebar/ClassificationResult'
import { useScatterData } from '@/hooks/useScatterData'
import { useClassify } from '@/hooks/useClassify'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { useUploadStore } from '@/stores/uploadStore'
import { GENRE_COLORS, UPLOADED_BOOK_COLOR } from '@/constants/genres'
import type { ScatterPoint } from '@/types/scatter'

function buildBuffers(points: ScatterPoint[], genreColors: Record<string, string>) {
  const n = points.length
  const positions = new Float32Array(n * 3)
  const colors = new Float32Array(n * 3)
  const sizes = new Float32Array(n)
  const opacities = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const p = points[i]
    positions[i * 3] = p.x
    positions[i * 3 + 1] = p.y
    positions[i * 3 + 2] = p.z
    const hex = genreColors[p.genre] ?? '#888888'
    const color = new THREE.Color(hex)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
    sizes[i] = 2.0 + p.tfidf_weight * 8.0
    opacities[i] = Math.max(0.08, p.tfidf_weight)
  }
  return { positions, colors, sizes, opacities }
}

function buildUploadedBuffers(uploadedPoints: ScatterPoint[]) {
  const n = uploadedPoints.length
  if (n === 0) {
    return {
      positions: new Float32Array(0),
      colors: new Float32Array(0),
      sizes: new Float32Array(0),
      opacities: new Float32Array(0),
    }
  }
  const positions = new Float32Array(n * 3)
  const colors = new Float32Array(n * 3)
  const sizes = new Float32Array(n)
  const opacities = new Float32Array(n)
  const color = new THREE.Color(UPLOADED_BOOK_COLOR)
  for (let i = 0; i < n; i++) {
    const p = uploadedPoints[i]
    positions[i * 3] = p.x
    positions[i * 3 + 1] = p.y
    positions[i * 3 + 2] = p.z
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
    sizes[i] = 3.0 + p.tfidf_weight * 10.0
    opacities[i] = Math.max(0.3, p.tfidf_weight)
  }
  return { positions, colors, sizes, opacities }
}

export default function App() {
  const projection = useVisualizationStore((s) => s.projection)
  const selectedPointIndex = useVisualizationStore((s) => s.selectedPointIndex)
  const hoveredPointIndex = useVisualizationStore((s) => s.hoveredPointIndex)
  const setSelectedPoint = useVisualizationStore((s) => s.setSelectedPoint)
  const setHoveredPoint = useVisualizationStore((s) => s.setHoveredPoint)

  const { jobId, steps, result, uploadedPoints, retryMessage } = useUploadStore()
  const { classify } = useClassify()

  const { data, isLoading } = useScatterData(projection)

  const corpusBuffers = useMemo(() => {
    if (!data?.points) return null
    return buildBuffers(data.points, GENRE_COLORS)
  }, [data])

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

  const showProgress = jobId !== null && result === null
  const showResult = result !== null

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 3D Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
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
            selectedIndex={selectedPointIndex}
            hoveredIndex={hoveredPointIndex}
            onHover={setHoveredPoint}
            onClick={setSelectedPoint}
          />
        )}
      </div>

      {/* Right sidebar */}
      <aside
        className="sidebar-scroll"
        style={{
          width: 320,
          background: '#111118',
          borderLeft: '1px solid #1E1E2A',
          padding: 24,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600, color: '#F5F5FF' }}>
          Literary Genre Topology
        </div>

        {/* Upload section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 14, color: '#6B6B80', fontWeight: 600 }}>Upload & Classify</div>
          {!showProgress && !showResult && (
            <UploadZone onClassify={classify} />
          )}
          {showProgress && (
            <UploadProgress steps={steps} retryMessage={retryMessage} />
          )}
          {showResult && (
            <>
              <UploadZone onClassify={classify} />
              <ClassificationResult result={result} />
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
