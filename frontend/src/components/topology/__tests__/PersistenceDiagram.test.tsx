/**
 * PersistenceDiagram tests (BUG-02 / Plan 06-02).
 *
 * Covers four behavioral fixtures from PLAN.md Task 1 <behavior>:
 *   1. finite-only       — verify sqrt scaling (largest persistence -> max radius)
 *   2. finite + infinity — verify infinity strip rendering + axis bounds from finite only
 *   3. all-infinity      — no finite arcs, only triangles
 *   4. empty             — graceful render, no crash
 *
 * The test installs a Proxy-based ctx mock that captures every method call. This
 * intentionally OVERRIDES the default 2D mock in `src/test/setup.ts` (which lacks
 * `arc`, `beginPath`, `moveTo`, etc.) so the assertions can hit-test what the
 * canvas renderer actually drew.
 *
 * Hook source check (Task 1 <read_first>): `usePersistenceDiagram.ts` returns the
 * raw JSON shape `{ points: [number, number][], dim, epsilon_max }`. The backend
 * serializer is documented in PITFALLS §10 — `np.inf` arrives as JS `Infinity` via
 * a custom JSON encoder; no coercion happens in the hook. If that ever changes,
 * the renderer's `Number.isFinite` checks remain correct (NaN / null also fail).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { PersistenceDiagram } from '../PersistenceDiagram'
import { useVisualizationStore } from '@/stores/visualizationStore'

// Mock the data hook so we control the fixtures injected into the renderer.
vi.mock('@/hooks/usePersistenceDiagram', () => ({
  usePersistenceDiagram: vi.fn(),
}))
import { usePersistenceDiagram } from '@/hooks/usePersistenceDiagram'

/**
 * Install a Proxy-based canvas 2D context spy. Every method call is captured in
 * `calls` as `{ method, args }`. Property assignments (fillStyle, font, etc.)
 * pass through to a plain backing object so the component reads back stable
 * values. Cached per-canvas-instance so repeated getContext() calls return the
 * same stub (mirroring real browser semantics).
 */
function spyCanvas() {
  const calls: Array<{ method: string; args: any[] }> = []
  const cache = new WeakMap<HTMLCanvasElement, any>()
  ;(HTMLCanvasElement.prototype as any).getContext = function (
    contextId: string,
  ) {
    if (contextId !== '2d') return null
    const cached = cache.get(this)
    if (cached) return cached
    const backing: any = {
      fillStyle: '',
      strokeStyle: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      lineWidth: 0,
      globalAlpha: 1,
    }
    const stub: any = new Proxy(backing, {
      get(t, k) {
        if (k in t) return (t as any)[k]
        return (...args: any[]) => {
          calls.push({ method: String(k), args })
          // measureText must return a real-shaped object so renderer logic does
          // not throw on `.width`. All other methods can return undefined.
          if (k === 'measureText') return { width: 0 }
          return undefined
        }
      },
      set(t, k, v) {
        ;(t as any)[k] = v
        return true
      },
    })
    cache.set(this, stub)
    return stub
  } as any
  return calls
}

beforeEach(() => {
  vi.clearAllMocks()
  // Reset the zustand store to a known state with a selection so the canvas
  // actually mounts (the renderer short-circuits without a selectedGenre).
  useVisualizationStore.setState({
    selectedGenre: 'horror',
    selectedBookId: null,
    selectedHomologyDim: 1,
  })
})

describe('PersistenceDiagram', () => {
  it('renders sqrt-scaled finite-only fixture without NaN', () => {
    ;(usePersistenceDiagram as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        points: [
          [0.1, 0.3], // persistence = 0.2
          [0.1, 0.9], // persistence = 0.8  (max)
          [0.2, 0.5], // persistence = 0.3
        ],
        epsilon_max: 1.0,
        dim: 1,
      },
      isLoading: false,
    })
    const calls = spyCanvas()
    render(<PersistenceDiagram />)

    // Three finite dots -> at least three arc() calls.
    const arcs = calls.filter((c) => c.method === 'arc')
    expect(arcs.length).toBeGreaterThanOrEqual(3)

    // None of the arc args may be NaN or Infinity.
    for (const a of arcs) {
      for (const v of a.args) {
        expect(Number.isFinite(v as any) || typeof v !== 'number').toBe(true)
      }
    }

    // The largest-persistence dot ([0.1, 0.9], normalized=1.0) should render
    // at MAX_RADIUS (clamped). BASE_RADIUS=1.5 + RADIUS_SCALE*sqrt(1.0) = 6.5,
    // which exactly hits the MAX_RADIUS cap.
    const maxArcRadius = Math.max(...arcs.map((a) => a.args[2] as number))
    expect(maxArcRadius).toBeGreaterThanOrEqual(6.0)
    expect(maxArcRadius).toBeLessThanOrEqual(6.5)

    // The smallest-persistence dot ([0.1, 0.3], normalized=0.25) should have
    // radius ≈ 1.5 + 5.0*sqrt(0.25) = 4.0 — strictly less than max.
    const minArcRadius = Math.min(...arcs.map((a) => a.args[2] as number))
    expect(minArcRadius).toBeLessThan(maxArcRadius)
  })

  it('renders infinity dots on top strip and finite dots in plot', () => {
    ;(usePersistenceDiagram as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        points: [
          [0.1, 0.5],
          [0.2, Infinity],
        ],
        epsilon_max: 1.0,
        dim: 1,
      },
      isLoading: false,
    })
    const calls = spyCanvas()
    render(<PersistenceDiagram />)

    // The triangle for the infinity point is drawn as moveTo(x, y-4) where
    // y=8 (center of strip), so the apex moveTo has y === 4.
    const moveTos = calls.filter((c) => c.method === 'moveTo')
    const apexAtTop = moveTos.some((c) => c.args[1] === 4)
    expect(apexAtTop).toBe(true)

    // The single finite dot ([0.1, 0.5]) should produce at least one arc.
    const arcs = calls.filter((c) => c.method === 'arc')
    expect(arcs.length).toBeGreaterThanOrEqual(1)

    // No Infinity / NaN should appear in any draw argument that is numeric.
    for (const c of calls) {
      for (const v of c.args) {
        if (typeof v === 'number') {
          expect(Number.isFinite(v)).toBe(true)
        }
      }
    }
  })

  it('all-infinity fixture renders only triangles, no finite arcs', () => {
    ;(usePersistenceDiagram as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        points: [
          [0.1, Infinity],
          [0.3, Infinity],
        ],
        epsilon_max: 1.0,
        dim: 1,
      },
      isLoading: false,
    })
    const calls = spyCanvas()
    render(<PersistenceDiagram />)

    // arc() is used for finite dots only — there should be none.
    const arcs = calls.filter((c) => c.method === 'arc')
    expect(arcs.length).toBe(0)

    // Triangles for both infinity points: two moveTo(x, 4) apex calls.
    const apexMoves = calls.filter(
      (c) => c.method === 'moveTo' && c.args[1] === 4,
    )
    expect(apexMoves.length).toBe(2)
  })

  it('empty fixture renders without crash and draws no data', () => {
    ;(usePersistenceDiagram as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { points: [], epsilon_max: 1.0, dim: 1 },
      isLoading: false,
    })
    const calls = spyCanvas()
    expect(() => render(<PersistenceDiagram />)).not.toThrow()

    // No data dots rendered — neither arcs nor infinity-strip triangles.
    expect(calls.filter((c) => c.method === 'arc').length).toBe(0)
    const apexMoves = calls.filter(
      (c) => c.method === 'moveTo' && c.args[1] === 4,
    )
    expect(apexMoves.length).toBe(0)
  })
})
