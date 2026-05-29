import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useVisualizationStore } from '@/stores/visualizationStore'
import type { ScatterPoint } from '@/types/scatter'

const VERTEX_SHADER = `
attribute float aSize;
attribute float aOpacity;
attribute vec3 aColor;
attribute float aIndex;
varying float vOpacity;
varying vec3 vColor;
varying float vIndex;
uniform float uSizeMultiplier;

void main() {
  vOpacity = aOpacity;
  vColor = aColor;
  vIndex = aIndex;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  // 12.5 (was 25.0): slider value 1.0 now renders at the old 0.5 visual size.
  gl_PointSize = aSize * uSizeMultiplier * (12.5 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`

const FRAGMENT_SHADER = `
varying float vOpacity;
varying vec3 vColor;
varying float vIndex;
uniform float uHighlightIndex;
uniform float uBrightness;

void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;

  // Selection ring: draw an ink-toned annulus around the highlighted point.
  // Phase 12 D-U1 — the plate sits on warm paper, so the ring reads as dark ink
  // (#26211B) rather than the old dark-theme white halo.
  if (uHighlightIndex >= 0.0 && vIndex == uHighlightIndex) {
    float ringDist = abs(dist - 0.42);
    if (ringDist < 0.06) {
      gl_FragColor = vec4(0.149, 0.129, 0.106, 1.0);
      return;
    }
  }

  // uBrightness is the global Brightness slider — scales every point's alpha so
  // the control works in all views (genre-selected AND All Genres). Clamped so
  // values >1 push faint points toward full opacity rather than overflowing.
  float alpha = clamp(smoothstep(0.5, 0.35, dist) * vOpacity * uBrightness, 0.0, 1.0);
  gl_FragColor = vec4(vColor, alpha);
}
`

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

interface PointCloudProps {
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
}

export function PointCloud({
  positions,
  colors,
  sizes,
  opacities,
  points,
  tfidfWeights,
  compareTfidfWeights,
  selectedIndex,
  onHover,
  onClick,
}: PointCloudProps) {
  const selectedGenre = useVisualizationStore(s => s.selectedGenre)
  const globalOpacity = useVisualizationStore(s => s.opacity)
  const tfidfThreshold = useVisualizationStore(s => s.tfidfThreshold)
  // Brightness is applied live in the fragment shader via the uBrightness uniform
  // (see useFrame), so it needs no subscription/rebuild here.
  const compareMode = useVisualizationStore(s => s.compareMode)
  const compareGenre = useVisualizationStore(s => s.compareGenre)
  // Guard: positions.length is n*3, so n = positions.length/3 — cap at 100k points (300k floats)
  if (positions.length > 300_000) {
    throw new Error('PointCloud: positions array exceeds 100k points (300k floats)')
  }

  const n = positions.length / 3
  const pointsRef = useRef<THREE.Points>(null)

  // Lerp animation refs
  const prevPositions = useRef<Float32Array>(new Float32Array(positions.length))
  const targetPositions = useRef<Float32Array>(positions)
  const lerpProgress = useRef(1.0)
  const prevProjection = useRef(useVisualizationStore.getState().projection)

  // 2D toggle refs
  const originalZ = useRef<Float32Array>(new Float32Array(n))
  const is2DProgress = useRef(1.0)
  const prevIs2D = useRef(useVisualizationStore.getState().is2D)

  // Store original Z values on first mount
  useEffect(() => {
    for (let i = 0; i < n; i++) {
      originalZ.current[i] = positions[i * 3 + 2]
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const posClone = new Float32Array(positions)
    geo.setAttribute('position', new THREE.BufferAttribute(posClone, 3))
    geo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(colors), 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(sizes), 1))
    geo.setAttribute('aOpacity', new THREE.BufferAttribute(new Float32Array(opacities), 1))

    // Index attribute for selection ring
    const indices = new Float32Array(n)
    for (let i = 0; i < n; i++) indices[i] = i
    geo.setAttribute('aIndex', new THREE.BufferAttribute(indices, 1))

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uSizeMultiplier: { value: 1.0 },
        uHighlightIndex: { value: -1.0 },
        uBrightness: { value: 1.0 },
      },
    })

    // Initialise lerp refs when geometry changes
    prevPositions.current = new Float32Array(posClone)
    targetPositions.current = posClone
    lerpProgress.current = 1.0

    return { geometry: geo, material: mat }
  }, [positions, colors, sizes, opacities, n])

  // When projection changes, start lerp from current displayed positions to new target
  useEffect(() => {
    const store = useVisualizationStore.getState()
    if (store.projection !== prevProjection.current) {
      prevProjection.current = store.projection
      // Capture current displayed positions as start
      const posArr = geometry.attributes.position.array as Float32Array
      prevPositions.current = new Float32Array(posArr)
      targetPositions.current = positions
      lerpProgress.current = 0.0
    }
  }, [positions, geometry])

  // When any visual state changes, update opacity/size GPU buffers
  useEffect(() => {
    // Size is driven entirely by the uSizeMultiplier uniform (see useFrame) and
    // brightness by uBrightness — neither is baked into the buffers anymore, so
    // dragging those sliders never triggers a buffer rewrite or genre-change
    // double-application.
    const sizesAttr = geometry.attributes.aSize.array as Float32Array
    const opacitiesAttr = geometry.attributes.aOpacity.array as Float32Array

    for (let i = 0; i < n; i++) {
      const pointGenre = points?.[i]?.genre
      const inSelectedGenre = selectedGenre === null || pointGenre === selectedGenre
      const inCompareGenre = compareMode && compareGenre && pointGenre === compareGenre
      const w = Math.min(1.0, tfidfWeights?.[i] ?? 0)

      // Compare mode: dual brightness for both genres
      if (compareMode && compareGenre && selectedGenre) {
        if (pointGenre === selectedGenre) {
          // Genre A: full color, TF-IDF weight drives base opacity
          const brightness = tfidfWeights ? w : 0.8
          opacitiesAttr[i] = Math.max(0.2, brightness) * globalOpacity
          sizesAttr[i] = 1.0 + (tfidfWeights ? w : 0.5) * 2.0
        } else if (inCompareGenre) {
          // Genre B: full color, TF-IDF weight from compare weights
          const cw = Math.min(1.0, compareTfidfWeights?.[i] ?? 0)
          const brightness = compareTfidfWeights ? cw : 0.8
          opacitiesAttr[i] = Math.max(0.2, brightness) * globalOpacity
          sizesAttr[i] = 1.0 + (compareTfidfWeights ? cw : 0.5) * 2.0
        } else {
          // All other points: dim to 4%
          opacitiesAttr[i] = 0.04 * globalOpacity
          sizesAttr[i] = 0.8
        }
        continue
      }

      // Hide points below tfidf threshold (only when a genre is selected and weights exist)
      if (selectedGenre !== null && tfidfWeights && inSelectedGenre && w < tfidfThreshold) {
        opacitiesAttr[i] = 0.0
        sizesAttr[i] = 0.0
        continue
      }

      if (selectedGenre !== null) {
        if (!inSelectedGenre) {
          // Reading-room region filter (Phase 12 §7 / L-12): non-selected region
          // dims to ~0.15 (was 0.04) so the un-highlighted corpus stays a legible
          // ghost behind the active region rather than near-invisible.
          opacitiesAttr[i] = 0.15 * globalOpacity
          sizesAttr[i] = 0.8
        } else if (tfidfWeights) {
          // Genre point with TF-IDF: weight drives base opacity (Brightness slider
          // scales it globally in-shader)
          opacitiesAttr[i] = Math.max(0.2, w) * globalOpacity
          sizesAttr[i] = 1.0 + w * 2.0
        } else {
          // Genre point, no TF-IDF data yet
          opacitiesAttr[i] = opacities[i] * globalOpacity
          sizesAttr[i] = sizes[i]
        }
      } else {
        // No genre selected — base opacities/sizes scaled by global opacity
        opacitiesAttr[i] = opacities[i] * globalOpacity
        sizesAttr[i] = sizes[i]
      }
    }

    geometry.attributes.aOpacity.needsUpdate = true
    geometry.attributes.aSize.needsUpdate = true
  }, [tfidfWeights, compareTfidfWeights, geometry, n, points, opacities, sizes, selectedGenre, globalOpacity, tfidfThreshold, compareMode, compareGenre])

  useFrame((_, delta) => {
    if (!geometry || !material) return

    const store = useVisualizationStore.getState()

    // Update size + brightness uniforms (instant, no subscription/rebuild)
    material.uniforms.uSizeMultiplier.value = store.pointSizeMultiplier
    material.uniforms.uBrightness.value = store.brightnessSensitivity

    // Update selection ring uniform
    material.uniforms.uHighlightIndex.value = selectedIndex ?? -1

    // Detect projection change inside useFrame (belt-and-suspenders)
    if (store.projection !== prevProjection.current) {
      prevProjection.current = store.projection
      const posArr = geometry.attributes.position.array as Float32Array
      prevPositions.current = new Float32Array(posArr)
      targetPositions.current = positions
      lerpProgress.current = 0.0
    }

    // Projection lerp animation
    if (lerpProgress.current < 1.0) {
      lerpProgress.current = Math.min(lerpProgress.current + delta / 0.6, 1.0)
      const t = easeOut(lerpProgress.current)
      const posArr = geometry.attributes.position.array as Float32Array
      for (let i = 0; i < n * 3; i++) {
        posArr[i] = THREE.MathUtils.lerp(prevPositions.current[i], targetPositions.current[i], t)
      }
      geometry.attributes.position.needsUpdate = true
    }

    // 2D toggle: lerp Z coordinates
    const currentIs2D = store.is2D
    if (currentIs2D !== prevIs2D.current) {
      prevIs2D.current = currentIs2D
      is2DProgress.current = 0.0
    }

    if (is2DProgress.current < 1.0) {
      is2DProgress.current = Math.min(is2DProgress.current + delta / 0.6, 1.0)
      const t = easeOut(is2DProgress.current)
      const posArr = geometry.attributes.position.array as Float32Array
      for (let i = 0; i < n; i++) {
        const origZ = originalZ.current[i]
        const targetZ = currentIs2D ? 0 : origZ
        posArr[i * 3 + 2] = THREE.MathUtils.lerp(posArr[i * 3 + 2], targetZ, t)
      }
      geometry.attributes.position.needsUpdate = true
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
