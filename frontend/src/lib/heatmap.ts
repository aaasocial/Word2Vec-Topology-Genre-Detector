import { PLASMA_256 } from './plasma'

/** Parse a `#RRGGBB`/`#RGB` hex to an [r,g,b] tuple (0..255). */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return [r, g, b].map((v) => (Number.isNaN(v) ? 0 : v)) as [number, number, number]
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Two-stop ramp `paper2 → genreHex → ink` (reading-room topology heatmap, L-11).
 * `t` in [0,1]; low = paper2 (empty), mid = the region's genre hex, high = ink.
 */
export function readingRoomRamp(
  t: number,
  paper2: string,
  genreHex: string,
  ink: string,
): [number, number, number] {
  const A = hexToRgb(paper2)
  const B = hexToRgb(genreHex)
  const C = hexToRgb(ink)
  const clamped = Math.max(0, Math.min(1, t))
  if (clamped < 0.5) {
    const u = clamped / 0.5
    return [lerp(A[0], B[0], u), lerp(A[1], B[1], u), lerp(A[2], B[2], u)]
  }
  const u = (clamped - 0.5) / 0.5
  return [lerp(B[0], C[0], u), lerp(B[1], C[1], u), lerp(B[2], C[2], u)]
}

/**
 * Render a persistence-image heatmap with the reading-room ramp
 * (`paper2 → genreHex → ink`). A slight gamma (^0.85) lifts low-density cells so
 * the region color reads, matching the prototype.
 */
export function renderReadingRoomHeatmap(
  canvas: HTMLCanvasElement,
  data: number[],
  M: number,
  vmin: number,
  vmax: number,
  paper2: string,
  genreHex: string,
  ink: string,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const cellW = canvas.width / M
  const cellH = canvas.height / M
  const range = vmax - vmin || 1
  for (let row = 0; row < M; row++) {
    for (let col = 0; col < M; col++) {
      const val = data[row * M + col]
      const t = Math.max(0, Math.min(1, (val - vmin) / range))
      const [r, g, b] = readingRoomRamp(Math.pow(t, 0.85), paper2, genreHex, ink)
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`
      ctx.fillRect(col * cellW, row * cellH, Math.ceil(cellW), Math.ceil(cellH))
    }
  }
}

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
