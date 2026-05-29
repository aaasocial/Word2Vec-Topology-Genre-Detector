// Reading Room — marginalia (Phase 12, 12-02, §6.2).
//
// The right column of the Collection carrel (hidden under `study` density). When a
// catalogued book is hovered (rail row or plate), it shows that book's margin note —
// title, author, region dot + label, driving-word chips, and an "open catalog card
// →" link. Otherwise a prompt. A standing note on UMAP distortion always sits at the
// foot.
//
// The hovered book resolves from `visualizationStore.hoveredBookId` against the
// corpus lookup; driving words are the book's `top_10_tfidf_words` (real data — no
// fabricated demo keywords).

import { useVisualizationStore } from '@/stores/visualizationStore'
import { useReadingRoomStore } from '@/stores/readingRoomStore'
import { genreColor } from '@/constants/genres'
import type { AllCorpusBooks } from '@/hooks/useAllCorpusBooks'

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

interface MarginaliaProps {
  corpus: AllCorpusBooks
}

export function Marginalia({ corpus }: MarginaliaProps) {
  const hoveredBookId = useVisualizationStore((s) => s.hoveredBookId)
  const setSelectedBook = useVisualizationStore((s) => s.setSelectedBook)
  const goTo = useReadingRoomStore((s) => s.goTo)

  const hovered = hoveredBookId ? corpus.byId[hoveredBookId] : undefined

  return (
    <aside
      className="rr-scroll rr-marginalia"
      style={{
        padding: '28px 22px 22px',
        borderLeft: '1px solid var(--ink-33)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        overflowY: 'auto',
        minHeight: 0,
      }}
    >
      <div className="rr-label">Marginalia</div>

      {hovered ? (
        <div
          style={{
            padding: 12,
            background: 'var(--card)',
            border: '1px solid var(--ink-33)',
            fontFamily: 'var(--font-serif)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--muted)',
              letterSpacing: '0.18em',
            }}
          >
            HOVERED
          </div>
          <div style={{ marginTop: 4, fontStyle: 'italic', fontSize: 16, lineHeight: 1.25 }}>
            {hovered.title}
          </div>
          <div style={{ marginTop: 2, fontSize: 12.5, color: 'var(--muted)' }}>{hovered.author}</div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: genreColor(hovered.genre),
                marginRight: 6,
              }}
            />
            {GENRE_LABELS[hovered.genre] ?? hovered.genre}
            <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
              {hovered.word_count.toLocaleString()} words
            </span>
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {hovered.top_10_tfidf_words.slice(0, 6).map((w) => (
              <span
                key={w}
                style={{
                  padding: '1px 6px',
                  border: '0.5px solid var(--ink-55)',
                  fontSize: 10.5,
                  fontStyle: 'italic',
                }}
              >
                {w}
              </span>
            ))}
          </div>
          <button
            onClick={() => {
              setSelectedBook(hovered.gutenberg_id)
              goTo('card')
            }}
            style={{
              all: 'unset',
              cursor: 'pointer',
              marginTop: 12,
              display: 'inline-block',
              padding: '4px 10px',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 12,
            }}
          >
            open catalog card →
          </button>
        </div>
      ) : (
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--muted)',
            lineHeight: 1.55,
          }}
        >
          Hover any title in the catalog to read its margin note. Click to open its catalog card.
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--ink-22)' }}>
        <div style={{ fontSize: 11.5, fontStyle: 'italic', color: 'var(--muted)', lineHeight: 1.55 }}>
          UMAP preserves local neighbourhoods well but distorts global distance. Persistent
          topology resists this distortion; both inform the verdicts under <em>Submit a Text</em>.
        </div>
      </div>
    </aside>
  )
}
