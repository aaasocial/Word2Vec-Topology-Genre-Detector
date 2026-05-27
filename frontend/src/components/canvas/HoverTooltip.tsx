import { Html } from '@react-three/drei'
import { genreColor as resolveGenreColor } from '@/constants/genres'
import type { ScatterPoint } from '@/types/scatter'

// XSS: never use dangerouslySetInnerHTML here (T-3-01)
interface HoverTooltipProps {
  point: ScatterPoint
  position: [number, number, number]
}

// TooltipContent is a pure DOM component so it can be tested without R3F Canvas
export function TooltipContent({ point }: { point: ScatterPoint }) {
  // Phase 10 D-60: genreColor resolves under the active theme.
  // Task 5 swaps the literal 'dark' for preferencesStore.theme resolution.
  const genreColor = resolveGenreColor(point.genre, 'dark')
  return (
    <div
      style={{
        background: '#16161F',
        border: '1px solid #1E1E2A',
        borderRadius: 8,
        padding: 12,
        maxWidth: 240,
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
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
        {/* XSS: never use dangerouslySetInnerHTML here (T-3-01) */}
        <span style={{ fontSize: 12, color: genreColor }}>{point.genre}</span>
      </div>
      <div
        style={{
          fontSize: 14,
          fontFamily: 'JetBrains Mono, monospace',
          color: '#F5F5FF',
          marginBottom: 4,
        }}
      >
        {point.word}
      </div>
      <div style={{ fontSize: 12, color: '#6B6B80', marginBottom: 8 }}>
        TF-IDF:{' '}
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
          {point.tfidf_weight.toFixed(4)}
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#6B6B80' }}>Nearest:</div>
      {point.neighbors.slice(0, 5).map((n, i) => (
        <div
          key={i}
          style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: '#E0E0EC' }}
        >
          {i + 1}. {n.word}{' '}
          <span style={{ color: '#6B6B80' }}>{n.similarity.toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

export function HoverTooltip({ point, position }: HoverTooltipProps) {
  return (
    <Html position={position} style={{ pointerEvents: 'none' }}>
      <TooltipContent point={point} />
    </Html>
  )
}
