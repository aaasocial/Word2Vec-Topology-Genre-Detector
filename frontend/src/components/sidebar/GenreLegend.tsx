import { useVisualizationStore } from '@/stores/visualizationStore'
import { GENRE_LIST, genreColor as resolveGenreColor } from '@/constants/genres'
import { useEffectiveTheme } from '@/stores/preferencesStore'

export function GenreLegend() {
  const selectedGenre = useVisualizationStore(s => s.selectedGenre)
  const setSelectedGenre = useVisualizationStore(s => s.setSelectedGenre)
  const theme = useEffectiveTheme()

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        background: 'rgba(17, 17, 24, 0.85)',
        borderRadius: 8,
        padding: '10px 14px',
        backdropFilter: 'blur(4px)',
      }}
    >
      <ul
        role="list"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px 16px',
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}
      >
        {GENRE_LIST.map(genre => {
          const isActive = selectedGenre === genre
          return (
            <li key={genre} role="listitem">
              <button
                onClick={() => setSelectedGenre(isActive ? null : genre)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: 4,
                  opacity: selectedGenre !== null && !isActive ? 0.4 : 1,
                  transition: 'opacity 200ms ease',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: resolveGenreColor(genre, theme),
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 12, color: '#E0E0EC' }}>
                  {genre.charAt(0).toUpperCase() + genre.slice(1)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
