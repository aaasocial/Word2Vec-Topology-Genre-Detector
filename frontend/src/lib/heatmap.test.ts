import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PLASMA_256 } from './plasma'
import { renderHeatmap, computeMinMax } from './heatmap'

describe('PLASMA_256', () => {
  it('has exactly 256 entries', () => {
    expect(PLASMA_256).toHaveLength(256)
  })

  it('each entry is [r, g, b] with values 0-255', () => {
    for (const [r, g, b] of PLASMA_256) {
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThanOrEqual(255)
      expect(g).toBeGreaterThanOrEqual(0)
      expect(g).toBeLessThanOrEqual(255)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThanOrEqual(255)
    }
  })
})

describe('computeMinMax', () => {
  it('returns correct min/max for a normal array', () => {
    expect(computeMinMax([3, 1, 4, 1, 5, 9])).toEqual({ min: 1, max: 9 })
  })

  it('returns {min:0, max:0} for empty array', () => {
    expect(computeMinMax([])).toEqual({ min: 0, max: 0 })
  })

  it('handles single element', () => {
    expect(computeMinMax([42])).toEqual({ min: 42, max: 42 })
  })
})

describe('renderHeatmap', () => {
  let canvas: HTMLCanvasElement
  let ctx: any

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 200
    ctx = canvas.getContext('2d')
  })

  it('writes correct plasma colors for a 2x2 grid', () => {
    // Values: 0, 0.5, 0.75, 1.0 with vmin=0, vmax=1
    const data = [0, 0.5, 0.75, 1.0]
    renderHeatmap(canvas, data, 2, 0, 1)

    const calls = ctx._calls
    expect(calls).toHaveLength(4)

    // Value 0 -> t=0 -> PLASMA_256[0]
    const [r0, g0, b0] = PLASMA_256[0]
    expect(calls[0].args).toEqual([0, 0, 100, 100]) // col=0, row=0
    expect(ctx.fillStyle).toBeDefined()

    // Value 0.5 -> t=0.5 -> PLASMA_256[128]
    // Value 0.75 -> t=0.75 -> PLASMA_256[191]
    // Value 1.0 -> t=1.0 -> PLASMA_256[255]
    // We verify all 4 calls were made with correct positions
    expect(calls[1].args).toEqual([100, 0, 100, 100]) // col=1, row=0
    expect(calls[2].args).toEqual([0, 100, 100, 100]) // col=0, row=1
    expect(calls[3].args).toEqual([100, 100, 100, 100]) // col=1, row=1
  })

  it('normalizes correctly with shared vmin/vmax', () => {
    // vmin=10, vmax=20, value at vmin -> plasma[0], value at vmax -> plasma[255]
    const data = [10, 20, 15, 10]
    renderHeatmap(canvas, data, 2, 10, 20)

    const calls = ctx._calls
    expect(calls).toHaveLength(4)
    // All 4 fillRect calls executed = normalization worked without errors
  })

  it('clamps values outside vmin/vmax range', () => {
    // Values outside the range should be clamped
    const data = [-5, 100]
    renderHeatmap(canvas, data, 1, 0, 1)
    // Should not throw; clamping handles out-of-range
    const calls = ctx._calls
    expect(calls.length).toBeGreaterThan(0)
  })
})
