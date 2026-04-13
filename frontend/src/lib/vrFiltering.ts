/**
 * Browser-side edge filtering by epsilon threshold with feature_type-aware coloring.
 * Runs in the render loop at 60fps -- no server calls.
 *
 * Edges are pre-sorted by eps_birth ascending, enabling binary search for cutoff.
 *
 * feature_type: 0=H0 (generic), 1=H1 boundary, 2=H2 boundary
 */

// Color constants
const SUBDUED_R = 0.29  // #4A = 74/255
const SUBDUED_G = 0.29
const SUBDUED_B = 0.35  // #5A = 90/255 -> 0.353

const HIGHLIGHT_R = 0.98  // #FA = 250/255
const HIGHLIGHT_G = 0.80  // #CC = 204/255 -> 0.8
const HIGHLIGHT_B = 0.08  // #15 = 21/255 -> 0.082

export interface FilterResult {
  linePositions: Float32Array
  lineColors: Float32Array
  count: number
}

/**
 * Binary search for the number of edges with eps_birth <= epsilon.
 * Edges must be sorted by eps_birth (index 2) ascending.
 */
export function getVisibleEdgeCount(
  edges: [number, number, number, number][],
  epsilon: number,
): number {
  let lo = 0
  let hi = edges.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (edges[mid][2] <= epsilon) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }
  return lo
}

/**
 * Filter edges by epsilon threshold and produce position/color buffers
 * for THREE.LineSegments rendering.
 *
 * @param edges - [idx_a, idx_b, eps_birth, feature_type][] sorted by eps_birth
 * @param epsilon - current filtration radius
 * @param positions - [x, y, z][] word positions
 * @param birthWindow - epsilon distance within which an edge is considered "at birth"
 */
export function filterEdgesByEpsilon(
  edges: [number, number, number, number][],
  epsilon: number,
  positions: [number, number, number][],
  birthWindow: number = 0.005,
): FilterResult {
  const count = getVisibleEdgeCount(edges, epsilon)

  // Pre-allocate buffers: 2 vertices per line segment, 3 coords/colors per vertex
  const linePositions = new Float32Array(count * 6)
  const lineColors = new Float32Array(count * 6)

  for (let i = 0; i < count; i++) {
    const edge = edges[i]
    const idxA = edge[0]
    const idxB = edge[1]
    const epsBirth = edge[2]

    // Positions: vertex A then vertex B
    const offset = i * 6
    const posA = positions[idxA]
    const posB = positions[idxB]
    linePositions[offset] = posA[0]
    linePositions[offset + 1] = posA[1]
    linePositions[offset + 2] = posA[2]
    linePositions[offset + 3] = posB[0]
    linePositions[offset + 4] = posB[1]
    linePositions[offset + 5] = posB[2]

    // Coloring: highlight if edge is near birth threshold
    const nearBirth = Math.abs(epsBirth - epsilon) < birthWindow
    let r: number, g: number, b: number

    if (nearBirth) {
      // Birth highlight for all feature types at birth threshold
      r = HIGHLIGHT_R
      g = HIGHLIGHT_G
      b = HIGHLIGHT_B
    } else {
      // Subdued color for all non-birth edges
      r = SUBDUED_R
      g = SUBDUED_G
      b = SUBDUED_B
    }

    // Set color for both vertices of the line segment
    lineColors[offset] = r
    lineColors[offset + 1] = g
    lineColors[offset + 2] = b
    lineColors[offset + 3] = r
    lineColors[offset + 4] = g
    lineColors[offset + 5] = b
  }

  return { linePositions, lineColors, count }
}
