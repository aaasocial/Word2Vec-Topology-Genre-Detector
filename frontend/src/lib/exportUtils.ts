/**
 * Export utilities for scatter PNG, heatmap PNG, and persistence CSV (UX-03).
 */

function triggerDownload(href: string, filename: string): void {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
}

function timestamp(): number {
  return Date.now()
}

/**
 * Export the scatter canvas as a PNG image.
 * Requires preserveDrawingBuffer: true on the WebGL renderer.
 */
export function exportScatterPNG(
  canvas: HTMLCanvasElement,
  genre: string,
  projection: string,
): void {
  const dataUrl = canvas.toDataURL('image/png')
  const filename = `lgt-scatter-${genre}-${projection}-${timestamp()}.png`
  triggerDownload(dataUrl, filename)
}

/**
 * Export the heatmap canvas as a PNG image.
 */
export function exportHeatmapPNG(
  canvas: HTMLCanvasElement,
  genre: string,
  dim: number,
): void {
  const dataUrl = canvas.toDataURL('image/png')
  const filename = `lgt-persistence-${genre}-H${dim}-${timestamp()}.png`
  triggerDownload(dataUrl, filename)
}

/**
 * Export persistence diagram data as CSV.
 * Adds computed persistence column (death - birth).
 */
export function exportPersistenceCSV(
  diagrams: { birth: number; death: number; dimension: number }[],
  genre: string,
  dim: number,
): void {
  const header = 'birth,death,dimension,persistence\n'
  const rows = diagrams
    .map((d) => {
      const persistence = parseFloat((d.death - d.birth).toFixed(10))
      return `${d.birth},${d.death},${d.dimension},${persistence}`
    })
    .join('\n')
  const csv = header + rows
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const filename = `lgt-persistence-${genre}-H${dim}-${timestamp()}.csv`
  triggerDownload(url, filename)
  URL.revokeObjectURL(url)
}
