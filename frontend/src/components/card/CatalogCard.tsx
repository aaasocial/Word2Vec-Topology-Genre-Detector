// Reading Room — the letterpress Catalog card aside (Phase 12, 12-03, §6.3).
//
// The right column of the catalog-card carrel. Three blocks (verbatim labels from
// the prototype `screens_card.jsx`):
//   1. the letterpress card — `border-top:4px double ink` + hard offset shadow +
//      punch-hole circle; shelfmark, title (24), author·year, a key/value grid
//      (Genre / Words / Vocab / UMAP-x / UMAP-y), and a "See also" line linking the
//      four nearest (a·b·c·d);
//   2. "Driving vocabulary" chips (REAL `top_10_tfidf_words`);
//   3. "Five nearest" list — region dot + title·author + cosine distance.
//
// Anchor `data-tour-id="catalog-card"` sits on the letterpress card (used by the
// 12-06 tour). Real data: title/author/genre/word_count/driving words come from
// `useCorpusBooks`; year / vocab / shelfmark / positions are derived per bookLayout.

import { Fragment } from 'react'
import { genreColor } from '@/constants/genres'
import { useVisualizationStore } from '@/stores/visualizationStore'
import {
  shelfmark,
  derivedYear,
  derivedVocab,
  type PositionedBook,
  type Neighbour,
} from './bookLayout'

const GENRE_LABELS: Record<string, string> = {
  adventure: 'Adventure',
  gothic_horror: 'Gothic Horror',
  historical: 'Historical',
  literary: 'Literary',
  mystery: 'Mystery',
  romance: 'Romance',
  speculative: 'Speculative',
  western: 'Western',
}

const LEADER_LABELS = ['a', 'b', 'c', 'd']

interface CatalogCardProps {
  book: PositionedBook
  neighbours: Neighbour[]
  /** 1-based index of this book in the flat corpus (the "Catalog card · NNN"). */
  index: number
}

export function CatalogCard({ book, neighbours, index }: CatalogCardProps) {
  const setSelectedBook = useVisualizationStore((s) => s.setSelectedBook)

  const genreLabel = GENRE_LABELS[book.genre] ?? book.genre
  const hex = genreColor(book.genre)
  const year = derivedYear(book)
  const vocab = derivedVocab(book)
  const four = neighbours.slice(0, 4)

  return (
    <aside
      className="rr-scroll"
      style={{
        padding: '24px 22px',
        borderLeft: '1px solid var(--ink-33)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        overflowY: 'auto',
        minHeight: 0,
      }}
    >
      <div className="rr-label">Catalog card · {String(index).padStart(3, '0')}</div>

      {/* The letterpress catalog card (tour anchor). */}
      <div
        data-tour-id="catalog-card"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--ink)',
          borderTop: '4px double var(--ink)',
          padding: '18px 18px 20px',
          fontFamily: 'var(--font-serif)',
          position: 'relative',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Punch hole. */}
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'var(--paper2)',
            border: '0.5px solid var(--ink-55)',
          }}
        />

        {/* Shelfmark. */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--muted)',
            letterSpacing: '0.1em',
          }}
        >
          {shelfmark(book)}
        </div>

        {/* Title. */}
        <div
          style={{
            marginTop: 10,
            fontSize: 24,
            fontWeight: 500,
            lineHeight: 1.05,
            letterSpacing: '-0.005em',
          }}
        >
          {book.title}
        </div>

        {/* Author · year. */}
        <div style={{ marginTop: 8, fontSize: 13, fontStyle: 'italic', color: 'var(--muted)' }}>
          {book.author} · {year}
        </div>

        <hr style={{ border: 0, borderTop: '1px solid var(--ink-33)', margin: '12px 0' }} />

        {/* Key/value grid. */}
        <div style={{ display: 'grid', gridTemplateColumns: '78px 1fr', rowGap: 4, fontSize: 12.5 }}>
          <span style={{ color: 'var(--muted)' }}>Genre</span>
          <span>
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: hex,
                marginRight: 6,
              }}
            />
            {genreLabel}
          </span>
          <span style={{ color: 'var(--muted)' }}>Words</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{book.word_count.toLocaleString()}</span>
          <span style={{ color: 'var(--muted)' }}>Vocab</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{vocab.toLocaleString()}</span>
          <span style={{ color: 'var(--muted)' }}>UMAP-x</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{(book.x * 2 - 1).toFixed(3)}</span>
          <span style={{ color: 'var(--muted)' }}>UMAP-y</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{(book.y * 2 - 1).toFixed(3)}</span>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid var(--ink-33)', margin: '12px 0' }} />

        {/* See also. */}
        <div style={{ fontSize: 11.5, fontStyle: 'italic', color: 'var(--muted)', lineHeight: 1.55 }}>
          <strong style={{ fontStyle: 'normal', color: 'var(--ink)', fontWeight: 500 }}>See also</strong> —{' '}
          {four.map((n, i) => (
            <Fragment key={n.book.gutenberg_id}>
              {i > 0 && ' · '}
              <sup style={{ color: 'var(--accent)', fontStyle: 'normal' }}>{LEADER_LABELS[i]}</sup>
              &nbsp;
              <button
                onClick={() => setSelectedBook(n.book.gutenberg_id)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  fontStyle: 'italic',
                  color: 'var(--ink)',
                  textDecorationLine: 'underline',
                  textDecorationStyle: 'dotted',
                  textDecorationColor: 'var(--muted)',
                }}
              >
                {n.book.title}
              </button>
            </Fragment>
          ))}
        </div>
      </div>

      {/* Driving vocabulary (REAL top_10_tfidf_words). */}
      <div>
        <div className="rr-label">Driving vocabulary</div>
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {book.top_10_tfidf_words.map((w) => (
            <span
              key={w}
              style={{
                padding: '2px 8px',
                border: '0.5px solid var(--ink)',
                fontSize: 11.5,
                fontStyle: 'italic',
              }}
            >
              {w}
            </span>
          ))}
        </div>
      </div>

      {/* Five nearest. */}
      <div>
        <div className="rr-label">Five nearest</div>
        <ol
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '8px 0 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {neighbours.map((n) => (
            <li
              key={n.book.gutenberg_id}
              style={{
                display: 'grid',
                gridTemplateColumns: '12px 1fr auto',
                gap: 8,
                alignItems: 'baseline',
                fontSize: 12.5,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: genreColor(n.book.genre),
                  marginTop: 4,
                }}
              />
              <button
                onClick={() => setSelectedBook(n.book.gutenberg_id)}
                style={{ all: 'unset', cursor: 'pointer', fontStyle: 'italic' }}
              >
                {n.book.title}{' '}
                <span style={{ color: 'var(--muted)', fontStyle: 'normal' }}>· {n.book.author}</span>
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--muted)' }}>
                {n.d.toFixed(3)}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  )
}
