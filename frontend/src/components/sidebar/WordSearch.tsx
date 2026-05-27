import { useState, useEffect, forwardRef } from 'react'
import { Search, X } from 'lucide-react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { useDebounce } from '@/hooks/useDebounce'
import { genreColor as resolveGenreColor } from '@/constants/genres'
import { useEffectiveTheme } from '@/stores/preferencesStore'
import type { ScatterPoint } from '@/types/scatter'

interface WordSearchProps {
  points?: ScatterPoint[]
}

export const WordSearch = forwardRef<HTMLInputElement, WordSearchProps>(
  function WordSearch({ points = [] }, ref) {
    const setSearchQuery = useVisualizationStore(s => s.setSearchQuery)
    const setSelectedPoint = useVisualizationStore(s => s.setSelectedPoint)
    const theme = useEffectiveTheme()

    const [localQuery, setLocalQuery] = useState('')
    const debouncedQuery = useDebounce(localQuery, 200)

    // Sync debounced query to store — must be in an effect, not render body
    useEffect(() => {
      setSearchQuery(debouncedQuery)
    }, [debouncedQuery, setSearchQuery])

    // Client-side filter on cached point list — top 10
    const results: Array<{ point: ScatterPoint; index: number }> = []
    if (localQuery.trim().length > 0) {
      const q = localQuery.toLowerCase()
      for (let i = 0; i < points.length && results.length < 10; i++) {
        if (points[i].word.toLowerCase().includes(q)) {
          results.push({ point: points[i], index: i })
        }
      }
    }

    const handleClear = () => {
      setLocalQuery('')
      setSearchQuery('')
    }

    return (
      <div>
        <div style={{ fontSize: 12, color: '#6B6B80', fontWeight: 600, marginBottom: 8 }}>
          Search Words
        </div>

        {/* Input */}
        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6B6B80',
              pointerEvents: 'none',
            }}
          />
          <input
            ref={ref}
            type="text"
            role="searchbox"
            aria-label="Search for words in the embedding space"
            placeholder="Search words..."
            value={localQuery}
            onChange={e => setLocalQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: '#1E1E2A',
              border: '1px solid #2E2E3A',
              borderRadius: 6,
              color: '#F5F5FF',
              padding: '8px 32px 8px 30px',
              fontSize: 13,
              outline: 'none',
            }}
          />
          {localQuery && (
            <button
              onClick={handleClear}
              aria-label="Clear search"
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6B6B80',
                padding: 2,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Results */}
        {localQuery.trim().length > 0 && (
          <div
            style={{
              marginTop: 8,
              borderRadius: 6,
              border: '1px solid #1E1E2A',
              overflow: 'hidden',
              maxHeight: 240,
              overflowY: 'auto',
            }}
          >
            {results.length === 0 ? (
              <div
                style={{
                  padding: '10px 12px',
                  fontSize: 13,
                  color: '#6B6B80',
                  textAlign: 'center',
                }}
              >
                No matching words
              </div>
            ) : (
              results.map(({ point, index }) => (
                <button
                  key={index}
                  onClick={() => setSelectedPoint(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #1E1E2A',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#F5F5FF',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1E1E2A' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: resolveGenreColor(point.genre, theme),
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontFamily: 'JetBrains Mono, monospace',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {point.word}
                  </span>
                  <span style={{ fontSize: 11, color: '#6B6B80', fontFamily: 'monospace' }}>
                    {point.tfidf_weight.toFixed(3)}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    )
  }
)
