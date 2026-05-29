// Reading Room — "Where it landed" mini-plate (Phase 12, 12-04, §6.7, D-U1).
//
// A lightweight DECORATIVE SVG scatter (NOT a second WebGL canvas — D-U1 nuance:
// only the Collection / Card primary plate is R3F) showing where the submitted
// text landed among the corpus, marked with the prototype's dashed accent pin.
//
// The corpus haze is the REAL positioned catalogued books (id-seeded layout from
// bookLayout, the same proxy the Catalog card uses — `CorpusBookFull` carries no
// embedding coords and `/viz/scatter` is WORD-keyed). The text's own pin position
// is derived deterministically from the job id + verdict genre so it sits near the
// predicted region and is stable per reading — flagged as a Known Stub (the live
// per-text embedding coordinate would need a book-scoped scatter endpoint the
// backend does not serve).

import { useMemo } from 'react'
import { genreColor } from '@/constants/genres'
import type { PositionedBook } from '@/components/card/bookLayout'

interface WhereItLandedProps {
  /** Positioned corpus (real books, id-seeded coords). */
  corpus: PositionedBook[]
  /** The predicted genre slug — the pin sits near this region's cluster. */
  genre: string
  /** A stable per-reading seed (the classify job id). */
  seed: string
}

const VB = 360

function hashStr(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function unit(seed: number): number {
  let t = (seed + 0x6d2b79f5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function WhereItLanded({ corpus, genre, seed }: WhereItLandedProps) {
  const accentHex = genreColor(genre)

  // The pin: anchor near the predicted region's centroid, jittered by the job id
  // so the same reading always lands in the same place (Known Stub — derived, not
  // a real embedding coord).
  const pin = useMemo(() => {
    const regionBooks = corpus.filter((b) => b.genre === genre)
    let cx: number
    let cy: number
    if (regionBooks.length) {
      cx = regionBooks.reduce((s, b) => s + b.x, 0) / regionBooks.length
      cy = regionBooks.reduce((s, b) => s + b.y, 0) / regionBooks.length
    } else {
      cx = 0.5
      cy = 0.5
    }
    const h = hashStr(seed || genre)
    const jx = (unit(h) - 0.5) * 0.18
    const jy = (unit(h ^ 0x9e3779b9) - 0.5) * 0.18
    return {
      x: Math.min(0.9, Math.max(0.1, cx + jx)),
      y: Math.min(0.9, Math.max(0.1, cy + jy)),
    }
  }, [corpus, genre, seed])

  const px = pin.x * VB
  const py = pin.y * VB

  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--card)',
        border: '1px solid var(--ink)',
        height: 180,
      }}
    >
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {/* Faint corpus, predicted region a touch stronger. */}
        {corpus.map((b) => {
          const inRegion = b.genre === genre
          return (
            <circle
              key={b.gutenberg_id}
              cx={b.x * VB}
              cy={b.y * VB}
              r={inRegion ? 2.6 : 2}
              fill={inRegion ? accentHex : 'var(--ink)'}
              fillOpacity={inRegion ? 0.5 : 0.12}
            />
          )
        })}

        {/* The submitted text's dashed accent pin. */}
        <g transform={`translate(${px} ${py})`}>
          <circle
            cx={0}
            cy={0}
            r={14}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={0.6}
            strokeDasharray="2 3"
          />
          <circle cx={0} cy={0} r={8} fill="none" stroke="var(--accent)" strokeWidth={1.2} />
          <circle cx={0} cy={0} r={3} fill="var(--accent)" />
        </g>
      </svg>

      <div
        style={{
          position: 'absolute',
          left: `${pin.x * 100}%`,
          top: `calc(${pin.y * 100}% - 30px)`,
          transform: 'translateX(6px)',
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 11.5,
          color: 'var(--ink)',
          pointerEvents: 'none',
        }}
      >
        your text
      </div>
    </div>
  )
}
