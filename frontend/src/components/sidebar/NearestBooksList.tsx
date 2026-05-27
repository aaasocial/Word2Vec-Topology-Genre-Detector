// frontend/src/components/sidebar/NearestBooksList.tsx
// Phase 9 DEPTH-04 -- 5 nearest training books with Euclidean distance on L2-normed features.
// Visual is minimum-viable per Phase 10 deferred dark-mode sweep (user clarification).
// Phase 10 D-82 sweep: inline-hex lifted to hsl(var(--*)) tokens.
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
          color: 'hsl(var(--card-foreground))',
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
              borderBottom: '1px solid hsl(var(--border))',
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
                  color: 'hsl(var(--card-foreground))',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {b.title}
              </div>
              <div
                data-testid="nearest-book-author-genre"
                style={{ color: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              >
                {b.author} · {b.genre}
              </div>
            </div>
            <span
              data-testid="nearest-book-distance"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                color: 'hsl(var(--foreground))',
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
