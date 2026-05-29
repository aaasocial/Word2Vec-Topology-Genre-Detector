// Reading Room — Comparative Study mini-plate (Phase 12, 12-03, §6.5).
//
// A small DECORATIVE SVG scatter that highlights one region against a faint corpus
// (D-U1 nuance: Study folio mini-plates are lightweight SVG, NOT extra WebGL
// canvases — only the Collection / Card primary plate is R3F). It echoes the
// prototype's `ScatterPlaceholder` look: a seeded cloud, the highlighted genre in
// its hex, everything else dimmed.

import { useMemo } from 'react'
import { genreColor } from '@/constants/genres'
import type { PositionedBook } from '@/components/card/bookLayout'

interface MiniPlateProps {
  /** The genre slug to highlight. */
  genre: string
  /** The positioned corpus (real books); highlighted region drawn full, rest faint. */
  corpus: PositionedBook[]
}

const VB = 360

/** A seeded [0,1) PRNG (mulberry32) for the decorative scatter haze. */
function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function MiniPlate({ genre, corpus }: MiniPlateProps) {
  const hex = genreColor(genre)

  // A faint background haze (decorative, seeded per genre so it's stable).
  const haze = useMemo(() => {
    const seedBase = genre.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const r = rng(seedBase * 2654435761)
    return Array.from({ length: 90 }, () => ({
      x: r() * VB,
      y: r() * VB,
      s: 1 + r() * 1.6,
    }))
  }, [genre])

  const regionBooks = corpus.filter((b) => b.genre === genre)

  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      {/* Faint corpus haze. */}
      {haze.map((p, i) => (
        <circle
          key={`haze-${i}`}
          cx={p.x}
          cy={p.y}
          r={p.s}
          fill="var(--ink)"
          fillOpacity={0.07}
        />
      ))}

      {/* The highlighted region's real books, in the genre hex. */}
      {regionBooks.map((b) => (
        <circle
          key={b.gutenberg_id}
          cx={b.x * VB}
          cy={b.y * VB}
          r={3}
          fill={hex}
          fillOpacity={0.85}
        />
      ))}
    </svg>
  )
}
