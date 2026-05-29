// Reading Room — Comparative Study folio (Phase 12, 12-03, §6.5).
//
// The body of the Study screen (matching `05-comparative-study.png`):
//   centered title with two genre pickers flanking "&" (data-tour-id="study-pickers")
//   3-col folio: region A (dot/label/count · mini-plate · "Only in {A}" chips)
//                · center "what they share" (two-circle Venn motif · shared chips · "ε ∈ [0, 0.6]")
//                · region B (mirror)
//   Editor's note + footnote³
//
// Mini-plates are SVG (D-U1 nuance). Region membership/counts come from the real
// `useAllCorpusBooks`; the shared/distinctive vocabulary + essay are the curated
// `wordTables` (verbatim copy, generic fallback for un-studied pairs). studyA/studyB
// are wired through `readingRoomStore` (`setStudy`).

import { useMemo, useState } from 'react'
import { useAllCorpusBooks } from '@/hooks/useAllCorpusBooks'
import { useReadingRoomStore } from '@/stores/readingRoomStore'
import { GENRE_LIST, genreColor, type Genre } from '@/constants/genres'
import { Footnote } from '@/components/shell/FootnoteHost'
import { MiniPlate } from '@/components/study/MiniPlate'
import { resolveWordTable } from '@/components/study/wordTables'
import { positionBooks, type PositionedBook } from '@/components/card/bookLayout'

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

function label(g: string): string {
  return GENRE_LABELS[g] ?? g
}

/** A masthead-toned genre dropdown for one side of the comparison. */
function GenrePicker({
  value,
  onChange,
  side,
}: {
  value: string
  onChange: (g: string) => void
  side: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const hex = genreColor(value)
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 10px',
          border: '1px solid var(--ink-33)',
          background: 'var(--card)',
          fontFamily: 'var(--font-serif)',
          fontSize: 22,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: hex }} />
        <span>{label(value)}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', marginLeft: 4 }}>
          ▾
        </span>
      </button>
      {open && (
        <ul
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            [side === 'right' ? 'right' : 'left']: 0,
            zIndex: 10,
            listStyle: 'none',
            padding: 6,
            margin: 0,
            background: 'var(--card)',
            border: '1px solid var(--ink)',
            boxShadow: 'var(--shadow-card)',
            minWidth: 190,
          }}
        >
          {GENRE_LIST.map((g: Genre) => (
            <li key={g}>
              <button
                onClick={() => {
                  onChange(g)
                  setOpen(false)
                }}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  width: '100%',
                  background: g === value ? 'var(--paper2)' : 'transparent',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: genreColor(g) }} />
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 13 }}>{label(g)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** One region column (left or right). Mirror layout via the `border` side. */
function RegionFolio({
  genre,
  corpus,
  count,
  onlyWords,
  side,
}: {
  genre: string
  corpus: PositionedBook[]
  count: number
  onlyWords: string[]
  side: 'left' | 'right'
}) {
  const hex = genreColor(genre)
  return (
    <section
      style={{
        borderRight: side === 'left' ? '1px solid var(--ink-33)' : undefined,
        borderLeft: side === 'right' ? '1px solid var(--ink-33)' : undefined,
        paddingRight: side === 'left' ? 22 : 0,
        paddingLeft: side === 'right' ? 22 : 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: hex }} />
        <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 16 }}>{label(genre)}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', marginLeft: 'auto' }}>
          {count} books
        </span>
      </div>
      <div
        style={{
          flex: 1,
          position: 'relative',
          background: 'var(--card)',
          border: '1px solid var(--ink)',
          minHeight: 0,
        }}
      >
        <MiniPlate genre={genre} corpus={corpus} />
      </div>
      <div>
        <div className="rr-label">Only in {label(genre)}</div>
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {onlyWords.map((w, i) => (
            <span
              key={`${w}-${i}`}
              style={{
                padding: '2px 7px',
                border: `0.5px solid ${hex}`,
                color: hex,
                fontStyle: 'italic',
                fontSize: 11.5,
              }}
            >
              {w}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

export function StudyFolio() {
  const studyA = useReadingRoomStore((s) => s.studyA)
  const studyB = useReadingRoomStore((s) => s.studyB)
  const setStudy = useReadingRoomStore((s) => s.setStudy)

  const corpus = useAllCorpusBooks()
  const positioned = useMemo<PositionedBook[]>(() => positionBooks(corpus.all), [corpus.all])

  const countA = corpus.byGenre[studyA]?.length ?? 0
  const countB = corpus.byGenre[studyB]?.length ?? 0

  const tbl = resolveWordTable(studyA, studyB)
  const hexA = genreColor(studyA)
  const hexB = genreColor(studyB)

  return (
    <div
      style={{
        flex: 1,
        padding: '24px 36px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 0,
      }}
    >
      {/* Title with the two pickers. */}
      <div style={{ textAlign: 'center' }}>
        <div className="rr-label">A comparative study</div>
        <h2
          data-tour-id="study-pickers"
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 500,
            fontSize: 28,
            letterSpacing: '-0.005em',
            margin: '8px 0 4px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <GenrePicker value={studyA} side="left" onChange={(g) => setStudy('A', g)} />
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--muted)' }}>
            &amp;
          </span>
          <GenrePicker value={studyB} side="right" onChange={(g) => setStudy('B', g)} />
        </h2>
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 13,
            color: 'var(--muted)',
            marginTop: 2,
          }}
        >
          On what these regions share, and where they part company.
        </div>
      </div>

      {/* Three-column folio. */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 260px 1fr',
          gap: 0,
          minHeight: 0,
        }}
      >
        <RegionFolio genre={studyA} corpus={positioned} count={countA} onlyWords={tbl.onlyA} side="left" />

        {/* Center: shared binding. */}
        <section
          style={{
            padding: '0 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            minHeight: 0,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div className="rr-label">what they share</div>
          </div>
          <div
            style={{
              flex: 1,
              position: 'relative',
              background: 'var(--card)',
              border: '1px solid var(--ink)',
              minHeight: 0,
              padding: 14,
            }}
          >
            {/* Two-circle Venn motif. */}
            <svg viewBox="0 0 220 220" style={{ width: '100%', height: 'auto', maxHeight: 200 }}>
              <circle cx="86" cy="110" r="68" fill={hexA} fillOpacity="0.18" stroke={hexA} strokeWidth="1" />
              <circle cx="134" cy="110" r="68" fill={hexB} fillOpacity="0.18" stroke={hexB} strokeWidth="1" />
              <text x="50" y="60" fontSize="9" fontFamily="JetBrains Mono, monospace" letterSpacing="0.12em" textAnchor="middle" fill={hexA}>
                {label(studyA).toUpperCase()}
              </text>
              <text x="170" y="60" fontSize="9" fontFamily="JetBrains Mono, monospace" letterSpacing="0.12em" textAnchor="middle" fill={hexB}>
                {label(studyB).toUpperCase()}
              </text>
              <text x="110" y="115" fontSize="11" fontFamily="Spectral, serif" fontStyle="italic" textAnchor="middle" fill="var(--ink)">
                shared
              </text>
              <text x="110" y="130" fontSize="9" fontFamily="JetBrains Mono, monospace" textAnchor="middle" fill="var(--muted)">
                {tbl.shared.length} terms
              </text>
            </svg>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
              {tbl.shared.map((w) => (
                <span
                  key={w}
                  style={{
                    padding: '2px 7px',
                    border: '0.5px solid var(--ink-55)',
                    fontStyle: 'italic',
                    fontSize: 11.5,
                    color: 'var(--ink)',
                    background: 'var(--paper)',
                  }}
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              textAlign: 'center',
            }}
          >
            ε ∈ [0, 0.6]
          </div>
        </section>

        <RegionFolio genre={studyB} corpus={positioned} count={countB} onlyWords={tbl.onlyB} side="right" />
      </div>

      {/* Editor's note. */}
      <div
        style={{
          paddingTop: 12,
          borderTop: '1px solid var(--ink-33)',
          display: 'grid',
          gridTemplateColumns: '120px 1fr',
          gap: 18,
          alignItems: 'baseline',
        }}
      >
        <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15 }}>Editor’s note</div>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 13.5, lineHeight: 1.7, margin: 0, maxWidth: 880 }}>
          {tbl.essay} <Footnote n={3} />
        </p>
      </div>
    </div>
  )
}
