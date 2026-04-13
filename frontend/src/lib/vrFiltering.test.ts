import { describe, it, expect } from 'vitest'
import { filterEdgesByEpsilon, getVisibleEdgeCount } from './vrFiltering'

// Test edges: [idx_a, idx_b, eps_birth, feature_type]
// Sorted by eps_birth ascending
const TEST_EDGES: [number, number, number, number][] = [
  [0, 1, 0.2, 0],  // H0 edge
  [1, 2, 0.5, 1],  // H1 boundary edge
  [0, 2, 0.8, 0],  // H0 edge
  [2, 3, 1.5, 2],  // H2 boundary edge
]

// 4 points at simple positions
const TEST_POSITIONS: [number, number, number][] = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]

// Color constants for assertions
const SUBDUED_R = 0.29
const SUBDUED_G = 0.29
const SUBDUED_B = 0.35
const HIGHLIGHT_R = 0.98
const HIGHLIGHT_G = 0.80
const HIGHLIGHT_B = 0.08

describe('filterEdgesByEpsilon', () => {
  it('returns count=0 when epsilon=0', () => {
    const result = filterEdgesByEpsilon(TEST_EDGES, 0, TEST_POSITIONS)
    expect(result.count).toBe(0)
  })

  it('returns count=3 when epsilon=1.0', () => {
    const result = filterEdgesByEpsilon(TEST_EDGES, 1.0, TEST_POSITIONS)
    expect(result.count).toBe(3)
  })

  it('returns all edges when epsilon >= max eps_birth', () => {
    const result = filterEdgesByEpsilon(TEST_EDGES, 2.0, TEST_POSITIONS)
    expect(result.count).toBe(4)
  })

  it('marks H0 edge at birth threshold with highlight color', () => {
    // Edge at eps_birth=0.2 (H0), epsilon=0.2, birthWindow=0.005
    const result = filterEdgesByEpsilon(TEST_EDGES, 0.2, TEST_POSITIONS, 0.005)
    expect(result.count).toBe(1)
    // First edge, first vertex color (indices 0,1,2)
    expect(result.lineColors[0]).toBeCloseTo(HIGHLIGHT_R, 1)
    expect(result.lineColors[1]).toBeCloseTo(HIGHLIGHT_G, 1)
    expect(result.lineColors[2]).toBeCloseTo(HIGHLIGHT_B, 1)
  })

  it('marks H1 boundary edge at birth threshold with highlight color', () => {
    // Edge at eps_birth=0.5 (H1 boundary), epsilon=0.5, birthWindow=0.005
    const result = filterEdgesByEpsilon(TEST_EDGES, 0.5, TEST_POSITIONS, 0.005)
    expect(result.count).toBe(2)
    // Second edge (index 1), first vertex color at offset 6 (edge1 * 6)
    expect(result.lineColors[6]).toBeCloseTo(HIGHLIGHT_R, 1)
    expect(result.lineColors[7]).toBeCloseTo(HIGHLIGHT_G, 1)
    expect(result.lineColors[8]).toBeCloseTo(HIGHLIGHT_B, 1)
  })

  it('H0 edge far from birth threshold gets subdued color', () => {
    // Edge at eps_birth=0.2 (H0), epsilon=1.0, birthWindow=0.005
    const result = filterEdgesByEpsilon(TEST_EDGES, 1.0, TEST_POSITIONS, 0.005)
    // First edge, first vertex color
    expect(result.lineColors[0]).toBeCloseTo(SUBDUED_R, 1)
    expect(result.lineColors[1]).toBeCloseTo(SUBDUED_G, 1)
    expect(result.lineColors[2]).toBeCloseTo(SUBDUED_B, 1)
  })

  it('returns Float32Array for linePositions and lineColors', () => {
    const result = filterEdgesByEpsilon(TEST_EDGES, 1.0, TEST_POSITIONS)
    expect(result.linePositions).toBeInstanceOf(Float32Array)
    expect(result.lineColors).toBeInstanceOf(Float32Array)
  })
})

describe('getVisibleEdgeCount', () => {
  it('returns 0 for epsilon=0', () => {
    expect(getVisibleEdgeCount(TEST_EDGES, 0)).toBe(0)
  })

  it('returns 3 for epsilon=1.0', () => {
    expect(getVisibleEdgeCount(TEST_EDGES, 1.0)).toBe(3)
  })

  it('returns 4 for epsilon=2.0', () => {
    expect(getVisibleEdgeCount(TEST_EDGES, 2.0)).toBe(4)
  })

  it('returns 1 for epsilon=0.3', () => {
    expect(getVisibleEdgeCount(TEST_EDGES, 0.3)).toBe(1)
  })
})
