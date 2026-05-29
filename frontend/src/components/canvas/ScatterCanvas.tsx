import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { CameraController } from './CameraController'
import { PointCloud } from './PointCloud'
import { useReadingRoomStore } from '@/stores/readingRoomStore'
import { TOUR_ANCHORS } from '@/tour/anchors'
import type { ScatterPoint } from '@/types/scatter'

interface ScatterCanvasProps {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  opacities: Float32Array
  points?: ScatterPoint[]
  tfidfWeights?: Float32Array | null
  compareTfidfWeights?: Float32Array | null
  selectedIndex: number | null
  hoveredIndex: number | null
  onHover: (idx: number | null) => void
  onClick: (idx: number) => void
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
}

/**
 * Read the resolved reading-room paper color from the `--paper` CSS custom
 * property (Phase 12 D-U1 — the scene background is the page's paper, not the
 * Phase 10 near-black `--scene-bg`). The reading-room tokens hold a literal hex
 * (`#F2EDE0` etc.), so a single getComputedStyle read is enough; we still mint a
 * THREE.Color from it. Cheap (~1ms) and idempotent. Falls back to cream paper.
 */
function readSceneBgFromCss(): THREE.Color {
  const CREAM_PAPER = '#F2EDE0'
  if (typeof document === 'undefined') return new THREE.Color(CREAM_PAPER)
  const paper = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim()
  if (!paper) return new THREE.Color(CREAM_PAPER)
  try {
    return new THREE.Color(paper)
  } catch {
    return new THREE.Color(CREAM_PAPER)
  }
}

export function ScatterCanvas(props: ScatterCanvasProps) {
  // PITFALLS §13: hold the THREE.Scene ref so we can update background
  // imperatively. NEVER pass the palette into <Canvas> or key it on it — that
  // would remount the WebGL context and lose camera pose.
  const sceneRef = useRef<THREE.Scene | null>(null)
  // Re-paint the scene background whenever the active reading-room paper changes
  // (the Tweaks panel writes `--paper` onto <html> via applyReadingRoomTheme).
  const paper = useReadingRoomStore((s) => s.tweaks.paper)

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    scene.background = readSceneBgFromCss()
  }, [paper])

  return (
    <div
      role="img"
      aria-label="3D scatter plot of word embeddings colored by literary genre"
      data-tour-id={TOUR_ANCHORS.scatterCanvas}
      style={{ width: '100%', height: '100%' }}
    >
      <Canvas
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        camera={{ fov: 60, near: 0.1, far: 1000, position: [0, 0, 5] }}
        raycaster={{ params: { Points: { threshold: 0.05 } } as any }}
        onCreated={({ scene, gl }) => {
          sceneRef.current = scene
          scene.background = readSceneBgFromCss()
          if (props.onCanvasReady) props.onCanvasReady(gl.domElement)
        }}
      >
        <CameraController />
        {props.positions.length > 0 && (
          <PointCloud
            positions={props.positions}
            colors={props.colors}
            sizes={props.sizes}
            opacities={props.opacities}
            points={props.points}
            tfidfWeights={props.tfidfWeights}
            compareTfidfWeights={props.compareTfidfWeights}
            selectedIndex={props.selectedIndex}
            hoveredIndex={props.hoveredIndex}
            onHover={props.onHover}
            onClick={props.onClick}
          />
        )}
      </Canvas>
    </div>
  )
}
