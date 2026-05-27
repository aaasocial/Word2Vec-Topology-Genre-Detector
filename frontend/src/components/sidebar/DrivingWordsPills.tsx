// frontend/src/components/sidebar/DrivingWordsPills.tsx
// Phase 9 DEPTH-06 -- top-15 TF-IDF words tagged with nearest training genre.
// D-46 canonical disclosure copy ("proxies -- not literal classifier inputs") sits ABOVE
// the pills. The phrasing is a disclosure contract; do NOT translate or paraphrase.
// Backend computes the (word, tfidf, nearest_genre) tuple; this component renders.
// D-55: inline-hex styling only (no CSS variables; Phase 10 owns the sweep).
import { GENRE_COLORS } from '@/constants/genres'
import type { DrivingWord } from '@/types/explain'

const FALLBACK_COLOR = '#888888'

interface DrivingWordsPillsProps {
  words: DrivingWord[]
}

export function DrivingWordsPills({ words }: DrivingWordsPillsProps) {
  if (!words || words.length === 0) return null
  return (
    <div data-testid="driving-words-pills" style={{ marginTop: 16 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#F5F5FF',
          marginBottom: 8,
        }}
      >
        Driving words
      </div>
      <div
        data-testid="driving-words-disclosure"
        style={{
          fontSize: 11,
          color: '#6B6B80',
          marginBottom: 8,
          lineHeight: 1.4,
        }}
      >
        High-TF-IDF words from your upload, tagged with the nearest training genre by
        word-vector similarity. These are{' '}
        <strong style={{ color: '#9090A0' }}>proxies</strong> for the cluster-distribution
        signal — not literal classifier inputs.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {words.map((w, idx) => {
          const color = GENRE_COLORS[w.nearest_genre] ?? FALLBACK_COLOR
          return (
            <span
              key={`${w.word}-${idx}`}
              data-testid="driving-word-pill"
              title={`tfidf=${w.tfidf.toFixed(3)} · nearest=${w.nearest_genre}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                background: '#1E1E2A',
                color: '#E0E0EC',
                borderRadius: 12,
                fontSize: 11,
                border: `1px solid ${color}`,
              }}
            >
              <span
                data-testid="driving-word-pill-dot"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: color,
                  display: 'inline-block',
                }}
              />
              {w.word}
            </span>
          )
        })}
      </div>
    </div>
  )
}
