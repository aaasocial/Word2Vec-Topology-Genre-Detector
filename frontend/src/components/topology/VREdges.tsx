import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { filterEdgesByEpsilon } from '@/lib/vrFiltering'
import { useVisualizationStore } from '@/stores/visualizationStore'

interface VREdgesProps {
  edges: [number, number, number, number][]
  positions: [number, number, number][]
}

/**
 * R3F component rendering VR filtration edges as THREE.LineSegments.
 * Uses useFrame hot-path to read vrEpsilon from store (no subscription overhead).
 * feature_type-aware coloring applied by vrFiltering.ts.
 */
export function VREdges({ edges, positions }: VREdgesProps) {
  const geomRef = useRef<THREE.BufferGeometry>(null)
  const lastEpsilonRef = useRef<number>(-1)
  const birthTimestamps = useRef<Map<number, number>>(new Map())

  // Pre-allocate max-size buffers
  const maxEdges = edges.length
  const buffers = useMemo(() => {
    const posAttr = new THREE.BufferAttribute(
      new Float32Array(maxEdges * 6),
      3,
    )
    posAttr.setUsage(THREE.DynamicDrawUsage)
    const colAttr = new THREE.BufferAttribute(
      new Float32Array(maxEdges * 6),
      3,
    )
    colAttr.setUsage(THREE.DynamicDrawUsage)
    return { posAttr, colAttr }
  }, [maxEdges])

  useFrame(({ clock }) => {
    if (!geomRef.current) return

    const epsilon = useVisualizationStore.getState().vrEpsilon
    const geom = geomRef.current

    // Only recompute if epsilon changed
    if (epsilon !== lastEpsilonRef.current) {
      const prevCount = lastEpsilonRef.current >= 0
        ? Math.max(0, edges.findIndex(e => e[2] > lastEpsilonRef.current))
        : 0
      lastEpsilonRef.current = epsilon

      const result = filterEdgesByEpsilon(edges, epsilon, positions)

      // Track birth timestamps for newly visible edges
      const now = clock.getElapsedTime() * 1000
      for (let i = prevCount; i < result.count; i++) {
        if (!birthTimestamps.current.has(i)) {
          birthTimestamps.current.set(i, now)
        }
      }

      // Update geometry buffers
      const posArr = buffers.posAttr.array as Float32Array
      const colArr = buffers.colAttr.array as Float32Array
      posArr.set(result.linePositions)
      colArr.set(result.lineColors)

      buffers.posAttr.needsUpdate = true
      buffers.colAttr.needsUpdate = true
      geom.setDrawRange(0, result.count * 2)
    }

    // Apply birth fade effect: edges within 500ms of birth stay highlight,
    // then fade to default over 300ms
    const now = clock.getElapsedTime() * 1000
    const colArr = buffers.colAttr.array as Float32Array
    let needsColorUpdate = false

    birthTimestamps.current.forEach((birthTime, edgeIdx) => {
      const age = now - birthTime
      if (age > 800) {
        // Fade complete, remove from tracking
        birthTimestamps.current.delete(edgeIdx)
        return
      }
      if (age > 500) {
        // Fade from highlight to subdued over 300ms
        const t = (age - 500) / 300
        const offset = edgeIdx * 6
        const r = 0.98 + (0.29 - 0.98) * t
        const g = 0.80 + (0.29 - 0.80) * t
        const b = 0.08 + (0.35 - 0.08) * t
        colArr[offset] = r
        colArr[offset + 1] = g
        colArr[offset + 2] = b
        colArr[offset + 3] = r
        colArr[offset + 4] = g
        colArr[offset + 5] = b
        needsColorUpdate = true
      }
    })

    if (needsColorUpdate) {
      buffers.colAttr.needsUpdate = true
    }
  })

  return (
    <lineSegments>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute attach="attributes-position" {...buffers.posAttr} />
        <bufferAttribute attach="attributes-color" {...buffers.colAttr} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.7} />
    </lineSegments>
  )
}
