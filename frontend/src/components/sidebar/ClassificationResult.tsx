import { GENRE_COLORS } from '@/constants/genres'
import { useVisualizationStore } from '@/stores/visualizationStore'
import type { ClassificationResult as ClassificationResultType } from '@/stores/uploadStore'

interface ClassificationResultProps {
  result: ClassificationResultType
}

// XSS: never use dangerouslySetInnerHTML (T-3-01)
export function ClassificationResult({ result }: ClassificationResultProps) {
  const genreColor = GENRE_COLORS[result.genre] ?? '#888888'
  const triggerCameraFocusUpload = useVisualizationStore((s) => s.triggerCameraFocusUpload)

  return (
    <div style={{ background: '#16161F', borderRadius: 8, padding: 16, marginTop: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#F5F5FF', marginBottom: 12 }}>
        Classification Result
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
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
        <span style={{ fontSize: 14, color: '#E0E0EC' }}>{result.genre}</span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 13,
            fontFamily: 'JetBrains Mono, monospace',
            color: '#F5F5FF',
          }}
        >
          {(result.confidence * 100).toFixed(1)}%
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#6B6B80', marginBottom: 12 }}>
        OOV words: {result.oov_count} / {result.total_words}
      </div>
      <button
        onClick={triggerCameraFocusUpload}
        style={{
          background: '#6366F1',
          color: '#fff',
          width: '100%',
          border: 'none',
          borderRadius: 6,
          padding: '8px 16px',
          fontSize: 14,
          cursor: 'pointer',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        View in Scatter
      </button>
    </div>
  )
}
