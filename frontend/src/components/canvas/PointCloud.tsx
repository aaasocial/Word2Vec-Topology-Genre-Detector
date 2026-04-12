import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useVisualizationStore } from '@/stores/visualizationStore'

const VERTEX_SHADER = `
attribute float aSize;
attribute float aOpacity;
attribute vec3 aColor;
varying float vOpacity;
varying vec3 vColor;
uniform float uSizeMultiplier;

void main() {
  vOpacity = aOpacity;
  vColor = aColor;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uSizeMultiplier * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`

const FRAGMENT_SHADER = `
varying float vOpacity;
varying vec3 vColor;
void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  float alpha = smoothstep(0.5, 0.35, dist) * vOpacity;
  gl_FragColor = vec4(vColor, alpha);
}
`

interface PointCloudProps {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  opacities: Float32Array
  selectedIndex: number | null
  hoveredIndex: number | null
  onHover: (idx: number | null) => void
  onClick: (idx: number) => void
}

export function PointCloud({
  positions,
  colors,
  sizes,
  opacities,
  onHover,
  onClick,
}: PointCloudProps) {
  // Guard: positions.length is n*3, so n = positions.length/3 — cap at 100k points (300k floats)
  if (positions.length > 300_000) {
    throw new Error('PointCloud: positions array exceeds 100k points (300k floats)')
  }

  const pointsRef = useRef<THREE.Points>(null)

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1))

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uSizeMultiplier: { value: 1.0 },
      },
    })

    return { geometry: geo, material: mat }
  }, [positions, colors, sizes, opacities])

  useFrame(() => {
    if (material) {
      material.uniforms.uSizeMultiplier.value =
        useVisualizationStore.getState().pointSizeMultiplier
    }
  })

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      onPointerMove={(e) => {
        e.stopPropagation()
        onHover(e.index ?? null)
      }}
      onPointerLeave={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation()
        if (e.index != null) onClick(e.index)
      }}
    />
  )
}
