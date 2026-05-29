// Reading Room — "Probability fix" bars (Phase 12, 12-04, §6.7).
//
// Horizontal probability bars for the verdict essay, driven by the REAL classify
// top-N (`uploadStore.ClassificationResult.top_n` → forwarded from the SSE `done`
// payload). Genre dot + label in the L-05 hex, a paper2 track with an ink fill,
// and a 1-decimal mono percent — the reading-room skin of the Phase 9 TopNList.
//
// Behaviour: the top rows are shown verbatim (the backend sorts top_n desc and
// sums to 1.0). Anything beyond `maxRows` is folded into an "Other" row so the
// essay's fix reads like the screenshot (a handful of named regions + a remainder)
// without re-sorting or recomputing the backend's truth.

import { genreColor } from '@/constants/genres'
import type { TopNPrediction } from '@/types/explain'

const GENRE_LABELS: Record<string, string> = {
  adventure: 'Adventure',
  gothic_horror: 'Gothic',
  historical: 'Historical',
  literary: 'Literary',
  mystery: 'Mystery',
  romance: 'Romance',
  speculative: 'Speculative',
  western: 'Western',
}

interface ProbabilityBarsProps {
  /** The real classify top-N (already sorted desc by the backend). */
  topN: TopNPrediction[]
  /** How many named regions to show before folding the rest into "Other". */
  maxRows?: number
}

interface Row {
  label: string
  pct: number
  color: string
}

export function ProbabilityBars({ topN, maxRows = 4 }: ProbabilityBarsProps) {
  if (!topN || topN.length === 0) return null

  const named = topN.slice(0, maxRows)
  const rest = topN.slice(maxRows)
  const restPct = rest.reduce((sum, p) => sum + p.probability * 100, 0)

  const rows: Row[] = named.map((p) => ({
    label: GENRE_LABELS[p.genre] ?? p.genre,
    pct: p.probability * 100,
    color: genreColor(p.genre),
  }))
  if (restPct > 0.05) {
    rows.push({ label: 'Other', pct: restPct, color: 'var(--muted)' })
  }

  return (
    <div
      data-testid="probability-bars"
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      {rows.map((row) => (
        <div
          key={row.label}
          data-testid="probability-row"
          style={{
            display: 'grid',
            gridTemplateColumns: '12px 92px 1fr 52px',
            gap: 8,
            alignItems: 'center',
            fontSize: 12.5,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: row.color,
            }}
          />
          <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)' }}>
            {row.label}
          </span>
          <div
            style={{
              height: 8,
              background: 'var(--paper2)',
              border: '0.5px solid var(--ink-22)',
              overflow: 'hidden',
            }}
          >
            <div
              data-testid="probability-fill"
              style={{
                width: `${Math.max(0, Math.min(100, row.pct)).toFixed(1)}%`,
                height: '100%',
                background: 'var(--ink)',
              }}
            />
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--muted)',
              textAlign: 'right',
            }}
          >
            {row.pct.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}
