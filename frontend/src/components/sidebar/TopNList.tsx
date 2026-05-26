// frontend/src/components/sidebar/TopNList.tsx
// Phase 9 DEPTH-01 / DEPTH-02 -- top-3 visible + collapsible +5 more expander (D-41/D-42).
// Visual is minimum-viable per Phase 10 deferred dark-mode sweep (user clarification).
// D-55: inline-hex styling only (no CSS variables; Phase 10 owns the sweep).
import { useState } from 'react'
import { GENRE_COLORS } from '@/constants/genres'
import type { TopNPrediction } from '@/types/explain'

interface TopNListProps {
  topN: TopNPrediction[]   // expected length 8, sorted descending; component does not re-sort
}

const DEFAULT_VISIBLE = 3
const FALLBACK_COLOR = '#888888'

export function TopNList({ topN }: TopNListProps) {
  const [expanded, setExpanded] = useState(false)

  if (!topN || topN.length === 0) {
    return null
  }

  const visible = expanded ? topN : topN.slice(0, DEFAULT_VISIBLE)
  const hiddenCount = Math.max(0, topN.length - DEFAULT_VISIBLE)

  return (
    <div data-testid="top-n-list">
      {visible.map((p, idx) => {
        const color = GENRE_COLORS[p.genre] ?? FALLBACK_COLOR
        return (
          <div
            key={`${p.genre}-${idx}`}
            data-testid="top-n-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
              fontSize: 13,
            }}
          >
            <span
              data-testid="top-n-color-dot"
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: color,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span style={{ color: '#E0E0EC', minWidth: 80 }}>{p.genre}</span>
            <div
              data-testid="top-n-bar"
              style={{
                flex: 1,
                height: 6,
                background: '#1E1E2A',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                data-testid="top-n-bar-fill"
                style={{
                  width: `${(p.probability * 100).toFixed(1)}%`,
                  height: '100%',
                  background: color,
                }}
              />
            </div>
            <span
              data-testid="top-n-pct"
              style={{
                marginLeft: 4,
                fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace',
                color: '#F5F5FF',
                minWidth: 48,
                textAlign: 'right',
              }}
            >
              {(p.probability * 100).toFixed(1)}%
            </span>
          </div>
        )
      })}
      {hiddenCount > 0 && (
        <button
          data-testid="top-n-expand"
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6366F1',
            fontSize: 12,
            cursor: 'pointer',
            padding: '4px 0',
            marginTop: 4,
          }}
        >
          {expanded ? 'Show fewer' : `+${hiddenCount} more`}
        </button>
      )}
    </div>
  )
}
