// Reading Room — Catalog-card plate detail (Phase 12, 12-03, §6.3).
//
// A focused SVG plate: the whole corpus drawn faint, the selected book's region
// highlighted, the selected book marked, and dashed accent leader lines + lettered
// labels (a·b·c·d) drawn to its four nearest neighbours — matching
// `03-catalog-card.png`.
//
// Engine choice (D-U1 nuance): this is a DETAIL plate, not the primary interactive
// scatter, so it's lightweight SVG — NOT a second R3F/WebGL context. The Collection
// screen owns the one R3F plate; the README's catalog-card "plate detail" is a
// small annotated figure whose value is the leader-line annotation (book identity +
// labels), which the WORD-keyed R3F scatter cannot express (it has no book points).
// SVG renders the screenshot faithfully and keeps a single WebGL context per app.

import { genreColor } from '@/constants/genres'
import type { PositionedBook, Neighbour } from './bookLayout'

interface PlateDetailProps {
  /** The selected (positioned) book — highlighted + labelled. */
  book: PositionedBook
  /** The whole positioned corpus (drawn faint, region-highlighted). */
  corpus: PositionedBook[]
  /** Its nearest neighbours; the first four get leader lines + a·b·c·d labels. */
  neighbours: Neighbour[]
}

const LEADER_LABELS = ['a', 'b', 'c', 'd']
const VB_W = 620
const VB_H = 520

export function PlateDetail({ book, corpus, neighbours }: PlateDetailProps) {
  const four = neighbours.slice(0, 4)
  const bx = book.x * VB_W
  const by = book.y * VB_H

  return (
    <figure
      style={{
        flex: 1,
        margin: 0,
        background: 'var(--card)',
        border: '1px solid var(--ink)',
        position: 'relative',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {/* The corpus, drawn faint; the selected region a touch stronger. */}
        {corpus.map((b) => {
          const inRegion = b.genre === book.genre
          const isSelected = b.gutenberg_id === book.gutenberg_id
          if (isSelected) return null
          return (
            <circle
              key={b.gutenberg_id}
              cx={b.x * VB_W}
              cy={b.y * VB_H}
              r={inRegion ? 3 : 2.2}
              fill={genreColor(b.genre)}
              fillOpacity={inRegion ? 0.55 : 0.16}
            />
          )
        })}

        {/* Dashed accent leader lines from the selected book to its 4 nearest. */}
        {four.map((n) => (
          <line
            key={`leader-${n.book.gutenberg_id}`}
            x1={bx}
            y1={by}
            x2={n.book.x * VB_W}
            y2={n.book.y * VB_H}
            stroke="var(--accent)"
            strokeWidth={0.9}
            strokeOpacity={0.6}
            strokeDasharray="2 3"
          />
        ))}

        {/* The four neighbours marked. */}
        {four.map((n) => (
          <circle
            key={`dot-${n.book.gutenberg_id}`}
            cx={n.book.x * VB_W}
            cy={n.book.y * VB_H}
            r={3.4}
            fill={genreColor(n.book.genre)}
          />
        ))}

        {/* The selected book — an ink ring marker. */}
        <circle cx={bx} cy={by} r={5.5} fill={genreColor(book.genre)} />
        <circle
          cx={bx}
          cy={by}
          r={9}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={1}
        />
      </svg>

      {/* Lettered leader labels for the four nearest (HTML overlay for crisp type). */}
      {four.map((n, i) => (
        <div
          key={`label-${n.book.gutenberg_id}`}
          style={{
            position: 'absolute',
            left: `calc(${n.book.x * 100}% + 10px)`,
            top: `calc(${n.book.y * 100}% - 9px)`,
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 11.5,
            color: 'var(--ink)',
            // Transparent label so it never masks nearby points; a faint paper
            // halo keeps the type legible over the plate without a hard box.
            background: 'transparent',
            textShadow:
              '0 0 3px var(--card), 0 0 3px var(--card), 0 0 4px var(--card)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <sup style={{ color: 'var(--accent)', fontStyle: 'normal' }}>{LEADER_LABELS[i]}</sup>
          &nbsp;{n.book.title}
        </div>
      ))}

      {/* The selected book's own label. */}
      <div
        style={{
          position: 'absolute',
          left: `calc(${book.x * 100}% + 12px)`,
          top: `calc(${book.y * 100}% + 8px)`,
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 13.5,
          color: 'var(--ink)',
          textShadow:
            '0 0 3px var(--card), 0 0 3px var(--card), 0 0 4px var(--card)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {book.title}
      </div>
    </figure>
  )
}
