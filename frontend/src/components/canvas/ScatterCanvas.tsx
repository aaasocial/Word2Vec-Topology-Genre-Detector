import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { PointCloud } from './PointCloud'

interface ScatterCanvasProps {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  opacities: Float32Array
  selectedIndex: number | null
  hoveredIndex: number | null
  onHover: (idx: number | null) => void
  onClick: (idx: number) => void
}

export function ScatterCanvas(props: ScatterCanvasProps) {
  return (
    <div
      role="img"
      aria-label="3D scatter plot of word embeddings colored by literary genre"
      style={{ width: '100%', height: '100%' }}
    >
      <Canvas
        gl={{ antialias: true, alpha: false }}
        camera={{ fov: 60, near: 0.1, far: 1000, position: [0, 0, 5] }}
        raycaster={{ params: { Points: { threshold: 0.05 } } }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color('#0A0A0F')
        }}
      >
        <OrbitControls enableDamping dampingFactor={0.1} />
        {props.positions.length > 0 && <PointCloud {...props} />}
      </Canvas>
    </div>
  )
}
