import { useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { useReadingRoomStore } from '@/stores/readingRoomStore'
import { useVRData } from '@/hooks/useVRData'
import { genreColor } from '@/constants/genres'
import { VREdges } from './VREdges'

/**
 * Read a `#RRGGBB` reading-room CSS custom property to a THREE.Color. The
 * reading-room tokens hold literal hexes on <html>, so one getComputedStyle read
 * suffices (same pattern as ScatterCanvas). Falls back to the cream/ink defaults.
 */
function readCssColor(varName: string, fallback: string): THREE.Color {
  if (typeof document === 'undefined') return new THREE.Color(fallback)
  const hex = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  if (!hex) return new THREE.Color(fallback)
  try {
    return new THREE.Color(hex)
  } catch {
    return new THREE.Color(fallback)
  }
}

/** Scene background = the page paper (D-U1 — no near-black scene). */
function readSceneBgFromCss(): THREE.Color {
  return readCssColor('--paper', '#F2EDE0')
}

/**
 * VR point cloud. Ring / structural nodes take the selected region's reading-room
 * genre hex (L-05); the scattered dust takes ink so it recedes against paper.
 * The genre hex is determined once at the cloud level (the backend payload does
 * not flag which points are "ring", so all points read the region color — which
 * matches the screenshot, where the region's loop is the whole cloud).
 */
function VRPoints({
  positions,
  genreHex,
}: {
  positions: [number, number, number][]
  genreHex: string
}) {
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

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.024}
        sizeAttenuation
        color={genreHex}
        transparent
        opacity={0.85}
        depthWrite={false}
      />
    </points>
  )
}

/**
 * Empty-state overlay when epsilon is 0 (the cloud is still dust).
 */
function EmptyOverlay() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 14,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: 'var(--muted)',
        fontFamily: 'var(--font-serif)',
        fontStyle: 'italic',
        fontSize: 12.5,
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      Drag the filtration radius to grow the complex
    </div>
  )
}

/** Centered status note inside the framed plate (loading / awaiting region). */
function PlateNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        color: 'var(--muted)',
        fontFamily: 'var(--font-serif)',
        fontStyle: 'italic',
        fontSize: 13,
        textAlign: 'center',
        padding: 24,
      }}
    >
      {children}
    </div>
  )
}

/**
 * VRViewer: R3F Canvas wrapper for the Vietoris–Rips filtration viewer (the hero).
 *
 * Phase 12 (12-05) reading-room skin:
 * - Scene background reads `--paper` imperatively (no canvas remount on a paper
 *   Tweak — the PITFALLS §13 pattern shared with ScatterCanvas).
 * - Ring/structural nodes take the region's reading-room genre hex.
 * - Freshly-born edges flash the active accent (read from `--accent`), fading to
 *   an ink-ish resting hairline (read from `--ink`).
 */
export function VRViewer() {
  const selectedGenre = useVisualizationStore((s) => s.selectedGenre)
  const projection = useVisualizationStore((s) => s.projection)
  const vrEpsilon = useVisualizationStore((s) => s.vrEpsilon)
  const { data, isLoading } = useVRData(selectedGenre, projection)

  // PITFALLS §13: hold the THREE.Scene ref so we can re-tint the background
  // imperatively when the reader changes the paper Tweak — never key <Canvas>
  // on the palette (that remounts the WebGL context + loses the camera pose).
  const sceneRef = useRef<THREE.Scene | null>(null)
  const paper = useReadingRoomStore((s) => s.tweaks.paper)
  const accent = useReadingRoomStore((s) => s.tweaks.accent)
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.background = readSceneBgFromCss()
  }, [paper])

  // Edge colors: accent flash (live --accent) + ink-ish resting hairline (--ink).
  // Recomputed when the accent/paper Tweak changes so a swap reskins the edges.
  const edgeColors = useMemo(
    () => ({
      accentColor: readCssColor('--accent', '#8B3B2B'),
      restColor: readCssColor('--ink', '#26211B'),
    }),
    [accent, paper],
  )

  const genreHex = selectedGenre ? genreColor(selectedGenre) : '#736B5E'

  if (!selectedGenre) return <PlateNote>Select a region to view its Vietoris–Rips filtration.</PlateNote>
  if (isLoading) return <PlateNote>Computing filtration…</PlateNote>
  if (!data) return <PlateNote>No filtration data for this region.</PlateNote>

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
        <ambientLight intensity={0.6} />
        <VRPoints positions={data.positions} genreHex={genreHex} />
        <VREdges
          edges={data.edges}
          positions={data.positions}
          accentColor={edgeColors.accentColor}
          restColor={edgeColors.restColor}
        />
        <OrbitControls enableDamping dampingFactor={0.1} />
      </Canvas>
      {vrEpsilon === 0 && <EmptyOverlay />}
    </div>
  )
}
