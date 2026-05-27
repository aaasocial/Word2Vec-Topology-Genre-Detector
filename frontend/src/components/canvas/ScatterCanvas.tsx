import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { CameraController } from './CameraController'
import { PointCloud } from './PointCloud'
import { usePreferencesStore } from '@/stores/preferencesStore'
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
 * Read the resolved CSS hsl value from --scene-bg via a temporary DOM element.
 * Three.js needs an rgb() string; CSS variables hold "H S% L%" raw, so we
 * round-trip through the browser's color resolver. Cheap (~1ms) and idempotent.
 */
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

export function ScatterCanvas(props: ScatterCanvasProps) {
  // PITFALLS §13: hold the THREE.Scene ref so we can update background
  // imperatively. NEVER pass theme into <Canvas> or key it on theme — that
  // would remount the WebGL context and lose camera pose.
  const sceneRef = useRef<THREE.Scene | null>(null)
  const theme = usePreferencesStore((s) => s.theme)

  // Whenever the resolved theme flips, push --scene-bg into scene.background.
  // Listen for OS pref changes too so System mode keeps the scene in sync.
  useEffect(() => {
    function apply() {
      const scene = sceneRef.current
      if (!scene) return
      scene.background = readSceneBgFromCss()
    }
    apply()
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(prefers-color-scheme: light)')
    // For System mode the CSS variable changes only after applyTheme() flips
    // the .light class; the effect already re-runs when `theme` changes, but
    // the matchMedia subscription guarantees OS-pref flips also re-paint the
    // scene even if the React effect didn't fire.
    const handler = () => apply()
    if (mql.addEventListener) mql.addEventListener('change', handler)
    else mql.addListener(handler)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handler)
      else mql.removeListener(handler)
    }
  }, [theme])

  return (
    <div
      role="img"
      aria-label="3D scatter plot of word embeddings colored by literary genre"
      data-tour-id="scatter-canvas"
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
