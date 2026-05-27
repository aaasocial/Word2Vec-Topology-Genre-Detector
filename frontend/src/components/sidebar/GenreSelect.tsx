import { useVisualizationStore } from '@/stores/visualizationStore'
import { GENRE_LIST, genreColor as resolveGenreColor } from '@/constants/genres'
import { useEffectiveTheme } from '@/stores/preferencesStore'
import { useDebounce } from '@/hooks/useDebounce'
import { useState, useEffect } from 'react'

export function GenreSelect() {
  const selectedGenre = useVisualizationStore(s => s.selectedGenre)
  const setSelectedGenre = useVisualizationStore(s => s.setSelectedGenre)
  const theme = useEffectiveTheme()

  const [localValue, setLocalValue] = useState<string>(selectedGenre ?? '')
  const debouncedValue = useDebounce(localValue, 200)

  useEffect(() => {
    setSelectedGenre(debouncedValue === '' ? null : debouncedValue)
  }, [debouncedValue, setSelectedGenre])

  // Resync local display when selectedGenre is changed externally (e.g. clicking GenreLegend)
  useEffect(() => {
    setLocalValue(selectedGenre ?? '')
  }, [selectedGenre])

  return (
    <div>
      <div style={{ fontSize: 12, color: '#6B6B80', fontWeight: 600, marginBottom: 8 }}>
        Genre
      </div>
      <select
        value={localValue}
        onChange={e => setLocalValue(e.target.value)}
        style={{
          width: '100%',
          background: '#1E1E2A',
          border: '1px solid #2E2E3A',
          borderRadius: 6,
          color: '#F5F5FF',
          padding: '8px 10px',
          fontSize: 13,
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        <option value="">All Genres</option>
        {GENRE_LIST.map(genre => (
          <option key={genre} value={genre}>
            {genre.charAt(0).toUpperCase() + genre.slice(1)}
          </option>
        ))}
      </select>
      {selectedGenre && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: resolveGenreColor(selectedGenre, theme),
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: 12, color: resolveGenreColor(selectedGenre, theme) }}>
            {selectedGenre}
          </span>
        </div>
      )}
    </div>
  )
}
