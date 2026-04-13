import { PLASMA_256 } from './plasma'

/**
 * Compute min and max of a numeric array.
 * Returns {min: 0, max: 0} for empty arrays.
 */
export function computeMinMax(data: number[]): { min: number; max: number } {
  if (data.length === 0) return { min: 0, max: 0 }
  let min = data[0]
  let max = data[0]
  for (let i = 1; i < data.length; i++) {
    if (data[i] < min) min = data[i]
    if (data[i] > max) max = data[i]
  }
  return { min, max }
}

/**
 * Render a persistence image heatmap onto a canvas using Canvas 2D fillRect.
 *
 * @param canvas - HTMLCanvasElement to render to
 * @param data - Flat array of M*M values (row-major)
 * @param M - Grid resolution (M x M)
 * @param vmin - Minimum value for color normalization
 * @param vmax - Maximum value for color normalization
 */
export function renderHeatmap(
  canvas: HTMLCanvasElement,
  data: number[],
  M: number,
  vmin: number,
  vmax: number,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const cellW = canvas.width / M
  const cellH = canvas.height / M
  const range = vmax - vmin || 1 // avoid division by zero

  for (let row = 0; row < M; row++) {
    for (let col = 0; col < M; col++) {
      const val = data[row * M + col]
      // Normalize to [0, 1] and clamp
      const t = Math.max(0, Math.min(1, (val - vmin) / range))
      const idx = Math.round(t * 255)
      const [r, g, b] = PLASMA_256[idx]
      ctx.fillStyle = `rgb(${r},${g},${b})`
      // Y-axis inverted: row 0 = top = high persistence
      ctx.fillRect(col * cellW, row * cellH, cellW, cellH)
    }
  }
}
