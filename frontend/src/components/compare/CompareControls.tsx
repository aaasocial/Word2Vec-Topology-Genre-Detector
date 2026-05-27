import { Columns2 } from 'lucide-react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { GENRE_LIST, genreColor as resolveGenreColor } from '@/constants/genres'
import { useEffectiveTheme } from '@/stores/preferencesStore'

export function CompareControls() {
  const compareMode = useVisualizationStore((s) => s.compareMode)
  const setCompareMode = useVisualizationStore((s) => s.setCompareMode)
  const compareGenre = useVisualizationStore((s) => s.compareGenre)
  const setCompareGenre = useVisualizationStore((s) => s.setCompareGenre)
  const selectedGenre = useVisualizationStore((s) => s.selectedGenre)
  const theme = useEffectiveTheme()

  const handleToggle = () => {
    if (compareMode) {
      setCompareMode(false)
      setCompareGenre(null)
    } else {
      setCompareMode(true)
    }
  }

  const handleCompareGenreChange = (value: string) => {
    setCompareGenre(value === '' ? null : value)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        onClick={handleToggle}
        aria-label="Compare Genres"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: compareMode ? 'hsl(var(--primary))' : 'transparent',
          color: compareMode ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
          border: compareMode ? '1px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
          borderRadius: 6,
          padding: '6px 10px',
          fontSize: 12,
          cursor: 'pointer',
          transition: 'all 150ms',
        }}
      >
        <Columns2 size={16} />
        Compare Genres
      </button>

      {compareMode && (
        <div>
          <label
            htmlFor="compare-genre-select"
            style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: 4 }}
          >
            Compare with
          </label>
          <select
            id="compare-genre-select"
            aria-label="Compare with"
            value={compareGenre ?? ''}
            onChange={(e) => handleCompareGenreChange(e.target.value)}
            style={{
              width: '100%',
              background: 'hsl(var(--secondary))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 6,
              color: 'hsl(var(--foreground))',
              padding: '8px 10px',
              fontSize: 13,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">Select genre...</option>
            {GENRE_LIST.filter((g) => g !== selectedGenre).map((genre) => (
              <option key={genre} value={genre}>
                {genre.charAt(0).toUpperCase() + genre.slice(1)}
              </option>
            ))}
          </select>
          {compareGenre && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: resolveGenreColor(compareGenre, theme),
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: 12, color: resolveGenreColor(compareGenre, theme) }}>
                {compareGenre}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
