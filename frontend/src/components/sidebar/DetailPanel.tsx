import { X } from 'lucide-react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { genreColor as resolveGenreColor } from '@/constants/genres'
import type { ScatterPoint } from '@/types/scatter'

interface DetailPanelProps {
  point: ScatterPoint | null
}

export function DetailPanel({ point }: DetailPanelProps) {
  const setSelectedPoint = useVisualizationStore(s => s.setSelectedPoint)

  if (!point) return null

  const genreColor = resolveGenreColor(point.genre, 'dark')

  return (
    <div
      style={{
        background: '#16161F',
        border: '1px solid #1E1E2A',
        borderRadius: 8,
        padding: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div
          style={{
            fontSize: 18,
            fontFamily: 'JetBrains Mono, monospace',
            color: '#F5F5FF',
            wordBreak: 'break-all',
            flex: 1,
          }}
        >
          {point.word}
        </div>
        <button
          onClick={() => setSelectedPoint(null)}
          aria-label="Close detail panel"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6B6B80',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Genre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: genreColor,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 13, color: genreColor }}>{point.genre}</span>
      </div>

      {/* TF-IDF */}
      <div style={{ fontSize: 13, color: '#6B6B80', marginBottom: 8 }}>
        TF-IDF:{' '}
        <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F5F5FF' }}>
          {point.tfidf_weight.toFixed(4)}
        </span>
      </div>

      {/* Coordinates */}
      <div style={{ fontSize: 12, color: '#6B6B80', marginBottom: 12, fontFamily: 'monospace' }}>
        x: {point.x.toFixed(4)} &nbsp; y: {point.y.toFixed(4)} &nbsp; z: {point.z.toFixed(4)}
      </div>

      {/* Neighbors */}
      <div style={{ fontSize: 12, color: '#6B6B80', marginBottom: 6 }}>Nearest neighbors</div>
      <div
        style={{
          maxHeight: 200,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {point.neighbors.slice(0, 20).map((n, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
              fontFamily: 'JetBrains Mono, monospace',
              color: '#E0E0EC',
              padding: '2px 0',
            }}
          >
            <span>{i + 1}. {n.word}</span>
            <span style={{ color: '#6B6B80' }}>{n.similarity.toFixed(3)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
