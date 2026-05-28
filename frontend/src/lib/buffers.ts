import * as THREE from 'three'
import type { ScatterPoint } from '@/types/scatter'
import {
  GENRE_COLORS,
  UPLOADED_BOOK_COLOR,
  FALLBACK_GENRE_COLOR,
  type Theme,
} from '@/constants/genres'

/**
 * Phase 10 D-62 — buildBuffers takes the resolved theme so it can pick the
 * correct light/dark hex from the dual-token genre palette. Caller passes
 * either the GENRE_COLORS[theme] subrecord directly (legacy path) or a theme
 * string and we resolve from the canonical map.
 */
export function buildBuffers(
  points: ScatterPoint[],
  themeOrPalette: Theme | Record<string, string>,
): { positions: Float32Array; colors: Float32Array; sizes: Float32Array; opacities: Float32Array; normalizedWeights: Float32Array } {
  const palette: Record<string, string> =
    typeof themeOrPalette === 'string' ? GENRE_COLORS[themeOrPalette] : themeOrPalette

  const n = points.length
  const positions = new Float32Array(n * 3)
  const colors = new Float32Array(n * 3)
  const sizes = new Float32Array(n)
  const opacities = new Float32Array(n)
  const normalizedWeights = new Float32Array(n)

  // Normalize tfidf_weight to [0,1] — raw scores can be 0–20+
  const maxWeight = Math.max(...points.map(p => p.tfidf_weight), 1)

  for (let i = 0; i < n; i++) {
    const p = points[i]
    positions[i * 3] = p.x
    positions[i * 3 + 1] = p.y
    positions[i * 3 + 2] = p.z
    const hex = palette[p.genre] ?? FALLBACK_GENRE_COLOR
    const color = new THREE.Color(hex)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
    const w = p.tfidf_weight / maxWeight  // normalized [0, 1]
    normalizedWeights[i] = w
    sizes[i] = 1.0 + w * 2.0             // range [1, 3] — small base for 57k points
    opacities[i] = Math.max(0.3, w)      // floor raised from 0.15 so the faint majority reads more solid
  }
  return { positions, colors, sizes, opacities, normalizedWeights }
}

export function buildUploadedBuffers(
  uploadedPoints: ScatterPoint[],
  theme: Theme = 'dark',
): {
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
  const color = new THREE.Color(UPLOADED_BOOK_COLOR[theme])
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
