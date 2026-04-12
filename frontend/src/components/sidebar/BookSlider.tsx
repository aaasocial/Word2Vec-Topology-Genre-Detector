import { useState, useEffect } from 'react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { useDebounce } from '@/hooks/useDebounce'

// Minimal book metadata type for the slider label
interface BookMeta {
  id: string
  title: string
}

interface BookSliderProps {
  books?: BookMeta[]
}

export function BookSlider({ books = [] }: BookSliderProps) {
  const selectedGenre = useVisualizationStore(s => s.selectedGenre)
  const setSelectedBook = useVisualizationStore(s => s.setSelectedBook)

  const [localIdx, setLocalIdx] = useState(0)
  const debouncedIdx = useDebounce(localIdx, 200)

  useEffect(() => {
    if (books.length > 0 && books[debouncedIdx]) {
      setSelectedBook(books[debouncedIdx].id)
    } else {
      setSelectedBook(null)
    }
  }, [debouncedIdx, books, setSelectedBook])

  // Reset when genre changes
  useEffect(() => {
    setLocalIdx(0)
  }, [selectedGenre])

  if (!selectedGenre || books.length === 0) return null

  const currentBook = books[localIdx]

  return (
    <div>
      <div style={{ fontSize: 12, color: '#6B6B80', fontWeight: 600, marginBottom: 8 }}>
        Book
      </div>
      <input
        type="range"
        min={0}
        max={books.length - 1}
        value={localIdx}
        onChange={e => setLocalIdx(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#6366F1' }}
      />
      {currentBook && (
        <div
          style={{
            fontSize: 12,
            color: '#9090A0',
            marginTop: 4,
            maxWidth: 200,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {currentBook.title}
        </div>
      )}
    </div>
  )
}
