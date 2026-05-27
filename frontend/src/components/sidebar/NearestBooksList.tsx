// frontend/src/components/sidebar/NearestBooksList.tsx
// Phase 9 DEPTH-04 -- 5 nearest training books with Euclidean distance on L2-normed features.
// Visual is minimum-viable per Phase 10 deferred dark-mode sweep (user clarification).
// D-55: inline-hex styling only (no CSS variables; Phase 10 owns the sweep).
import { genreColor as resolveGenreColor } from '@/constants/genres'
import { useEffectiveTheme } from '@/stores/preferencesStore'
import type { NearestTrainingBook } from '@/types/explain'

interface NearestBooksListProps {
  books: NearestTrainingBook[]   // expected length 5 from backend; component does not pad
}

export function NearestBooksList({ books }: NearestBooksListProps) {
  const theme = useEffectiveTheme()
  if (!books || books.length === 0) {
    return null
  }
  return (
    <div data-testid="nearest-books-list" style={{ marginTop: 16 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#F5F5FF',
          marginBottom: 8,
        }}
      >
        Nearest training books
      </div>
      {books.map((b, idx) => {
        const color = resolveGenreColor(b.genre, theme)
        return (
          <div
            key={`${b.gutenberg_id}-${idx}`}
            data-testid="nearest-book-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 0',
              borderBottom: '1px solid #1E1E2A',
              fontSize: 12,
            }}
          >
            <span
              data-testid="nearest-book-color-dot"
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: color,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                data-testid="nearest-book-title"
                title={b.title}
                style={{
                  color: '#E0E0EC',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {b.title}
              </div>
              <div
                data-testid="nearest-book-author-genre"
                style={{ color: '#6B6B80', fontSize: 11 }}
              >
                {b.author} · {b.genre}
              </div>
            </div>
            <span
              data-testid="nearest-book-distance"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                color: '#F5F5FF',
                fontSize: 11,
              }}
            >
              {b.distance.toFixed(3)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
