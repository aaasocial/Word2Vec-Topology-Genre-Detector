import { useState, useEffect } from 'react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { useDebounce } from '@/hooks/useDebounce'

// Per CONTEXT.md D-13: BookSlider now takes the richer schema served by
// GET /api/corpus/genres/{genre}/books. Only the fields the slider renders
// are required; consumers may pass the full CorpusBookFull -- extra fields
// are tolerated (TypeScript structural typing).
export interface BookMeta {
  /** Stable identifier (gutenberg_id when sourced from useCorpusBooks). */
  id?: string
  gutenberg_id?: string
  title: string
  author?: string
  word_count?: number
}

interface BookSliderProps {
  books?: BookMeta[]
}

function bookId(b: BookMeta): string {
  return b.gutenberg_id ?? b.id ?? b.title
}

export function BookSlider({ books = [] }: BookSliderProps) {
  const selectedGenre = useVisualizationStore(s => s.selectedGenre)
  const setSelectedBook = useVisualizationStore(s => s.setSelectedBook)

  const [localIdx, setLocalIdx] = useState(0)
  const debouncedIdx = useDebounce(localIdx, 200)

  useEffect(() => {
    if (books.length > 0 && books[debouncedIdx]) {
      setSelectedBook(bookId(books[debouncedIdx]))
    } else {
      setSelectedBook(null)
    }
  }, [debouncedIdx, books, setSelectedBook])

  // Reset when genre changes
  useEffect(() => {
    setLocalIdx(0)
  }, [selectedGenre])

  if (!selectedGenre || books.length === 0) return null

  // Guard against the slider index outrunning a shorter ``books`` array
  // (can happen briefly when switching genres while the previous query is
  // still being read).
  const safeIdx = Math.min(localIdx, books.length - 1)
  const currentBook = books[safeIdx]

  return (
    <div>
      <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', fontWeight: 600, marginBottom: 8 }}>
        Book
      </div>
      <input
        type="range"
        min={0}
        max={books.length - 1}
        value={safeIdx}
        onChange={e => setLocalIdx(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'hsl(var(--primary))' }}
      />
      {currentBook && (
        <div style={{ marginTop: 6, maxWidth: 240 }}>
          <div
            style={{
              fontSize: 12,
              color: 'hsl(var(--foreground))',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={currentBook.title}
          >
            {currentBook.title}
          </div>
          {currentBook.author && (
            <div
              style={{
                fontSize: 11,
                color: 'hsl(var(--muted-foreground))',
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={currentBook.author}
            >
              by {currentBook.author}
            </div>
          )}
          {typeof currentBook.word_count === 'number' && currentBook.word_count > 0 && (
            <div
              style={{
                fontSize: 11,
                color: 'hsl(var(--muted-foreground))',
                marginTop: 2,
              }}
            >
              {currentBook.word_count.toLocaleString()} words
            </div>
          )}
        </div>
      )}
    </div>
  )
}
