// Reading Room — catalog rail (Phase 12, 12-02, §6.2).
//
// The left rail of the Collection carrel: "Card catalog" header, an "All regions
// {n}" row, then the 8 genres (mono index numeral + color dot + count). Clicking a
// genre toggles the region filter (`selectedGenre` — dims non-matching plate points
// to ~0.15) AND expands the genre to list its titles; clicking a title opens that
// book's catalog card (`selectedBookId` + route 'card'). A "Find" search field
// filters the listed titles by title or driving word.
//
// Books come from `useAllCorpusBooks` (fan-out over `useCorpusBooks`); the plate's
// word points come from `useScatterData` — the rail is the book index, the plate is
// the word geography.

import { useState } from 'react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { useReadingRoomStore } from '@/stores/readingRoomStore'
import { GENRE_LIST, genreColor, type Genre } from '@/constants/genres'
import type { AllCorpusBooks } from '@/hooks/useAllCorpusBooks'
import type { CorpusBookFull } from '@/hooks/useCorpusBooks'

/** Display labels for the 8 genre slugs (tokens.md §Genre palette). */
const GENRE_LABELS: Record<Genre, string> = {
  adventure: 'Adventure',
  gothic_horror: 'Gothic Horror',
  historical: 'Historical',
  literary: 'Literary',
  mystery: 'Mystery',
  romance: 'Romance',
  speculative: 'Speculative',
  western: 'Western',
}

interface CatalogRailProps {
  corpus: AllCorpusBooks
}

export function CatalogRail({ corpus }: CatalogRailProps) {
  const selectedGenre = useVisualizationStore((s) => s.selectedGenre)
  const setSelectedGenre = useVisualizationStore((s) => s.setSelectedGenre)
  const setSelectedBook = useVisualizationStore((s) => s.setSelectedBook)
  const setHoveredBook = useVisualizationStore((s) => s.setHoveredBook)
  const goTo = useReadingRoomStore((s) => s.goTo)

  const [find, setFind] = useState('')
  const query = find.trim().toLowerCase()

  const total = corpus.all.length

  const openCard = (b: CorpusBookFull) => {
    setSelectedBook(b.gutenberg_id)
    goTo('card')
  }

  const matchesFind = (b: CorpusBookFull) =>
    query === '' ||
    b.title.toLowerCase().includes(query) ||
    b.author.toLowerCase().includes(query) ||
    b.top_10_tfidf_words.some((w) => w.toLowerCase().includes(query))

  return (
    <aside
      data-tour-id="catalog-rail"
      className="rr-scroll"
      style={{
        padding: '22px 18px',
        borderRight: '1px solid var(--ink-33)',
        background: 'var(--paper2)',
        overflowY: 'auto',
        minHeight: 0,
      }}
    >
      <div className="rr-label">Card catalog</div>
      <div
        style={{
          marginTop: 8,
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 13.5,
          color: 'var(--muted)',
        }}
      >
        Browse by genre.
      </div>

      {/* All regions */}
      <button
        onClick={() => setSelectedGenre(null)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'block',
          marginTop: 16,
          padding: '6px 0 6px 8px',
          borderLeft: !selectedGenre ? '2px solid var(--accent)' : '2px solid transparent',
          fontFamily: 'var(--font-serif)',
          fontSize: 13.5,
          color: !selectedGenre ? 'var(--ink)' : 'var(--muted)',
          fontStyle: !selectedGenre ? 'normal' : 'italic',
          width: '100%',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', marginRight: 8 }}>00</span>
        All regions{' '}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', marginLeft: 6 }}>
          {total}
        </span>
      </button>

      {/* Genre rows */}
      <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {GENRE_LIST.map((g, i) => {
          const isActive = selectedGenre === g
          const books = corpus.byGenre[g] ?? []
          const visible = books.filter(matchesFind)
          const hex = genreColor(g)
          return (
            <div key={g}>
              <button
                onClick={() => setSelectedGenre(isActive ? null : g)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '6px 0 6px 8px',
                  borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', width: 18 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: hex,
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'var(--ink)' : 'var(--muted)',
                    }}
                  >
                    {GENRE_LABELS[g]}
                  </span>
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>
                  {books.length}
                </span>
              </button>

              {isActive && (
                <ul
                  style={{
                    listStyle: 'none',
                    padding: '4px 0 6px 30px',
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  {visible.length === 0 ? (
                    <li
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontStyle: 'italic',
                        fontSize: 12,
                        color: 'var(--muted)',
                      }}
                    >
                      {books.length === 0 ? 'Loading…' : 'No titles match.'}
                    </li>
                  ) : (
                    visible.map((b) => (
                      <li key={b.gutenberg_id}>
                        <button
                          onClick={() => openCard(b)}
                          onMouseEnter={() => setHoveredBook(b.gutenberg_id)}
                          onMouseLeave={() => setHoveredBook(null)}
                          style={{
                            all: 'unset',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-serif)',
                            fontStyle: 'italic',
                            fontSize: 12.5,
                            color: 'var(--ink)',
                            display: 'block',
                          }}
                        >
                          {b.title}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      {/* Find */}
      <div style={{ marginTop: 22, paddingTop: 14, borderTop: '1px solid var(--ink-22)' }}>
        <div className="rr-label">Find</div>
        <input
          value={find}
          onChange={(e) => setFind(e.target.value)}
          placeholder="a word, a title…"
          style={{
            marginTop: 8,
            padding: '8px 10px',
            background: 'var(--card)',
            border: '1px solid var(--ink-33)',
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 13,
            color: 'var(--ink)',
            width: '100%',
            outline: 'none',
          }}
        />
        {query !== '' && (
          <div
            style={{
              marginTop: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            {corpus.all.filter(matchesFind).length} match{corpus.all.filter(matchesFind).length === 1 ? '' : 'es'} ·
            open a region to list them
          </div>
        )}
      </div>
    </aside>
  )
}
