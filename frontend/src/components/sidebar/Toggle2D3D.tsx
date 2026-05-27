import { useVisualizationStore } from '@/stores/visualizationStore'

export function Toggle2D3D() {
  const is2D = useVisualizationStore(s => s.is2D)
  const setIs2D = useVisualizationStore(s => s.setIs2D)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>View</span>
      <div
        style={{
          display: 'flex',
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid hsl(var(--border))',
        }}
      >
        {(['3D', '2D'] as const).map(mode => {
          const active = (mode === '2D') === is2D
          return (
            <button
              key={mode}
              onClick={() => setIs2D(mode === '2D')}
              style={{
                padding: '5px 14px',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                background: active ? 'hsl(var(--primary))' : 'hsl(var(--secondary))',
                color: active ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
                transition: 'background 150ms ease, color 150ms ease',
              }}
            >
              {mode}
            </button>
          )
        })}
      </div>
    </div>
  )
}
