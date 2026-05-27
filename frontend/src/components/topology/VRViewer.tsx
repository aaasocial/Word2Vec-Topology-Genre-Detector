import { useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { useVRData } from '@/hooks/useVRData'
import { VREdges } from './VREdges'

/** Resolve `--scene-bg` to an rgb string (same trick as ScatterCanvas). */
function readSceneBgFromCss(): THREE.Color {
  if (typeof document === 'undefined') return new THREE.Color('#0A0A0F')
  const hsl = getComputedStyle(document.documentElement).getPropertyValue('--scene-bg').trim()
  if (!hsl) return new THREE.Color('#0A0A0F')
  const el = document.createElement('div')
  el.style.color = `hsl(${hsl})`
  document.body.appendChild(el)
  const rgb = getComputedStyle(el).color
  document.body.removeChild(el)
  return new THREE.Color(rgb)
}

/**
 * Simplified point rendering for VR viewer.
 * All points at 40% opacity, selected genre at 80%.
 */
function VRPoints({ positions }: { positions: [number, number, number][] }) {
  const theme = usePreferencesStore((s) => s.theme)
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    const posArr = new Float32Array(positions.length * 3)
    for (let i = 0; i < positions.length; i++) {
      posArr[i * 3] = positions[i][0]
      posArr[i * 3 + 1] = positions[i][1]
      posArr[i * 3 + 2] = positions[i][2]
    }
    geom.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
    return geom
  }, [positions])

  // Point color flips with theme so cream-on-cream stays legible. Reading
  // --foreground each render is cheap (the resolveCssVar path skirts re-renders).
  const pointColor = theme === 'system'
    ? (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches ? '#181A2D' : '#F5F5FF')
    : (theme === 'light' ? '#181A2D' : '#F5F5FF')

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.02}
        sizeAttenuation
        color={pointColor}
        transparent
        opacity={0.6}
        depthWrite={false}
      />
    </points>
  )
}

/**
 * Empty state overlay when epsilon is 0.
 */
function EmptyOverlay() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 48,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: 'hsl(var(--muted-foreground))',
        fontSize: 13,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      Drag the epsilon slider to explore filtration
    </div>
  )
}

/**
 * Loading state for VR viewer.
 */
function LoadingState() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        color: 'hsl(var(--muted-foreground))',
        fontSize: 14,
      }}
    >
      Loading VR data...
    </div>
  )
}

/**
 * No genre selected state.
 */
function NoGenreState() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        color: 'hsl(var(--muted-foreground))',
        fontSize: 14,
        textAlign: 'center',
        padding: 24,
      }}
    >
      Select a genre to view its Vietoris-Rips filtration
    </div>
  )
}

/**
 * VRViewer: R3F Canvas wrapper for the Vietoris-Rips filtration viewer.
 * Renders in the right panel of the Topology tab.
 * Separate Canvas instance from scatter (per CONTEXT.md).
 */
export function VRViewer() {
  const selectedGenre = useVisualizationStore((s) => s.selectedGenre)
  const projection = useVisualizationStore((s) => s.projection)
  const vrEpsilon = useVisualizationStore((s) => s.vrEpsilon)
  const { data, isLoading } = useVRData(selectedGenre, projection)

  // PITFALLS §13 mirror: same imperative scene.background pattern as
  // ScatterCanvas so the topology Canvas doesn't remount on theme flip.
  const sceneRef = useRef<THREE.Scene | null>(null)
  const theme = usePreferencesStore((s) => s.theme)
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.background = readSceneBgFromCss()
  }, [theme])

  if (!selectedGenre) return <NoGenreState />
  if (isLoading) return <LoadingState />
  if (!data) return <NoGenreState />

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        camera={{ fov: 60, near: 0.01, far: 100, position: [0, 0, 3] }}
        onCreated={({ scene }) => {
          sceneRef.current = scene
          scene.background = readSceneBgFromCss()
        }}
      >
        <ambientLight intensity={0.5} />
        <VRPoints positions={data.positions} />
        <VREdges edges={data.edges} positions={data.positions} />
        <OrbitControls enableDamping dampingFactor={0.1} />
      </Canvas>
      {vrEpsilon === 0 && <EmptyOverlay />}
    </div>
  )
}
