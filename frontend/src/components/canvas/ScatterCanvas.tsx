import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { CameraController } from './CameraController'
import { PointCloud } from './PointCloud'
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

export function ScatterCanvas(props: ScatterCanvasProps) {
  return (
    <div
      role="img"
      aria-label="3D scatter plot of word embeddings colored by literary genre"
      style={{ width: '100%', height: '100%' }}
    >
      <Canvas
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        camera={{ fov: 60, near: 0.1, far: 1000, position: [0, 0, 5] }}
        raycaster={{ params: { Points: { threshold: 0.05 } } as any }}
        onCreated={({ scene, gl }) => {
          scene.background = new THREE.Color('#0A0A0F')
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
