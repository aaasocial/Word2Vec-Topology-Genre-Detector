// Reading Room — Catalog card screen (Phase 12, 12-03, §6.3).
//
// Shown when a book is selected (rail/marginalia/See-also click sets
// `selectedBookId` + routes here). Layout (matching `03-catalog-card.png`):
//   breadcrumb (The Collection › Genre › Title)
//   3-col carrel: region-siblings rail (260) · plate detail (1fr) · catalog card (340)
// Under `study` density the siblings rail drops → 2-col (plate · card).
//
// Data: `useAllCorpusBooks` (the catalogued books). The selected book resolves from
// `visualizationStore.selectedBookId`; positions/nearest are derived in bookLayout.
// The siblings rail lists same-region books → clicking swaps `selectedBookId`. The
// breadcrumb genre link sets the region filter + returns to the Collection.

import { useMemo } from 'react'
import { useAllCorpusBooks } from '@/hooks/useAllCorpusBooks'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { useReadingRoomStore } from '@/stores/readingRoomStore'
import { genreColor } from '@/constants/genres'
import { Footnote } from '@/components/shell/FootnoteHost'
import { CatalogCard } from '@/components/card/CatalogCard'
import { PlateDetail } from '@/components/card/PlateDetail'
import { positionBooks, nearestNeighbours, type PositionedBook } from '@/components/card/bookLayout'

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

const GENRE_DESC: Record<string, string> = {
  adventure: 'Open sea and far country. Motion as plot.',
  gothic_horror: 'Houses with weather. Dread as inheritance.',
  historical: 'The past, furnished and dated.',
  literary: 'Interiors and the long sentence.',
  mystery: 'A question, withheld and answered.',
  romance: 'Two figures and the distance between them.',
  speculative: 'The world, altered by one premise.',
  western: 'Dry country and a code.',
}

export function Card() {
  const selectedBookId = useVisualizationStore((s) => s.selectedBookId)
  const setSelectedBook = useVisualizationStore((s) => s.setSelectedBook)
  const setHoveredBook = useVisualizationStore((s) => s.setHoveredBook)
  const setSelectedGenre = useVisualizationStore((s) => s.setSelectedGenre)
  const goTo = useReadingRoomStore((s) => s.goTo)
  const density = useReadingRoomStore((s) => s.tweaks.density)
  const studyMode = density === 'study'

  const corpus = useAllCorpusBooks()

  // Position the whole corpus once, then resolve the selected book + its
  // neighbourhood. Falls back to the first catalogued book if nothing is selected.
  const positioned = useMemo<PositionedBook[]>(
    () => positionBooks(corpus.all),
    [corpus.all],
  )

  const book =
    positioned.find((b) => b.gutenberg_id === selectedBookId) ?? positioned[0]

  const neighbours = useMemo(
    () => (book ? nearestNeighbours(book, positioned, 5) : []),
    [book, positioned],
  )

  if (!book) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          color: 'var(--muted)',
        }}
      >
        {corpus.isError ? 'The catalog could not be read.' : 'Opening the catalog…'}
      </div>
    )
  }

  const genreLabel = GENRE_LABELS[book.genre] ?? book.genre
  const siblings = positioned.filter((b) => b.genre === book.genre)
  const cardIndex = positioned.findIndex((b) => b.gutenberg_id === book.gutenberg_id) + 1

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Breadcrumb. */}
      <div
        style={{
          padding: '10px 32px',
          borderBottom: '1px solid var(--ink-33)',
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 13,
          color: 'var(--muted)',
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
        }}
      >
        <button
          onClick={() => goTo('collection')}
          style={{ all: 'unset', cursor: 'pointer' }}
        >
          The Collection
        </button>
        <span>›</span>
        <button
          onClick={() => {
            setSelectedGenre(book.genre)
            goTo('collection')
          }}
          style={{ all: 'unset', cursor: 'pointer' }}
        >
          {genreLabel}
        </button>
        <span>›</span>
        <span style={{ color: 'var(--ink)', fontStyle: 'normal' }}>{book.title}</span>
      </div>

      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: studyMode ? '1fr 340px' : '260px 1fr 340px',
          minHeight: 0,
        }}
      >
        {/* Region-siblings rail (hidden under study density). */}
        {!studyMode && (
          <aside
            className="rr-scroll"
            style={{
              padding: '22px 18px',
              borderRight: '1px solid var(--ink-33)',
              background: 'var(--paper2)',
              overflowY: 'auto',
              minHeight: 0,
            }}
          >
            <div className="rr-label">You are reading</div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: genreColor(book.genre),
                }}
              />
              <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 14 }}>
                {genreLabel}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--muted)',
                  marginLeft: 'auto',
                }}
              >
                {siblings.length} books
              </span>
            </div>
            <div
              style={{
                marginTop: 4,
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: 12.5,
                color: 'var(--muted)',
              }}
            >
              {GENRE_DESC[book.genre] ?? ''}
            </div>
            <ul
              style={{
                listStyle: 'none',
                padding: '14px 0 0',
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {siblings.map((b) => {
                const isSel = b.gutenberg_id === book.gutenberg_id
                return (
                  <li key={b.gutenberg_id}>
                    <button
                      onClick={() => setSelectedBook(b.gutenberg_id)}
                      onMouseEnter={() => setHoveredBook(b.gutenberg_id)}
                      onMouseLeave={() => setHoveredBook(null)}
                      style={{
                        all: 'unset',
                        cursor: 'pointer',
                        display: 'block',
                        width: '100%',
                        padding: '6px 10px',
                        marginLeft: -10,
                        background: isSel ? 'var(--card)' : 'transparent',
                        borderLeft: isSel
                          ? '2px solid var(--accent)'
                          : '2px solid transparent',
                        fontFamily: 'var(--font-serif)',
                        fontSize: 13,
                        fontStyle: isSel ? 'normal' : 'italic',
                        color: isSel ? 'var(--ink)' : 'var(--muted)',
                        fontWeight: isSel ? 500 : 400,
                      }}
                    >
                      {b.title}
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>
        )}

        {/* Center: plate detail. */}
        <main
          style={{
            padding: '24px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minHeight: 0,
          }}
        >
          <div className="rr-label">Catalog entry · Plate I · detail</div>

          <PlateDetail book={book} corpus={positioned} neighbours={neighbours} />

          <figcaption
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 12.5,
              color: 'var(--muted)',
              lineHeight: 1.55,
            }}
          >
            fig. 2 — <em>{book.title}</em> and its immediate neighbourhood in the embedding.
            <Footnote n={2} />
          </figcaption>
        </main>

        {/* Right: the letterpress catalog card. */}
        <CatalogCard book={book} neighbours={neighbours} index={cardIndex} />
      </div>
    </div>
  )
}
