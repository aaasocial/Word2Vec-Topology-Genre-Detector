import { useVisualizationStore } from '@/stores/visualizationStore'
import { PROJECTION_KEYS, PROJECTION_LABELS } from '@/constants/projections'
import type { ProjectionKey } from '@/types/scatter'

export function ProjectionTabs() {
  const projection = useVisualizationStore(s => s.projection)
  const setProjection = useVisualizationStore(s => s.setProjection)

  return (
    <div>
      <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', fontWeight: 600, marginBottom: 8 }}>
        Projection
      </div>
      <div
        role="tablist"
        aria-label="Projection type"
        style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}
      >
        {PROJECTION_KEYS.map((key: ProjectionKey) => (
          <button
            key={key}
            role="tab"
            aria-selected={projection === key}
            onClick={() => setProjection(key)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              background: projection === key ? 'hsl(var(--primary))' : 'hsl(var(--secondary))',
              color: projection === key ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
              transition: 'background 150ms ease, color 150ms ease',
            }}
          >
            {PROJECTION_LABELS[key]}
          </button>
        ))}
      </div>
    </div>
  )
}
