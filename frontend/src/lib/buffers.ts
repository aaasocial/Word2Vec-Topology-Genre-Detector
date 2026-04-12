import * as THREE from 'three'
import type { ScatterPoint } from '@/types/scatter'
import { UPLOADED_BOOK_COLOR } from '@/constants/genres'

export function buildBuffers(
  points: ScatterPoint[],
  genreColors: Record<string, string>,
): { positions: Float32Array; colors: Float32Array; sizes: Float32Array; opacities: Float32Array } {
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

export function buildUploadedBuffers(uploadedPoints: ScatterPoint[]): {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  opacities: Float32Array
} {
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
