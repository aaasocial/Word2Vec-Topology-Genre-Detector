import { useVisualizationStore } from '@/stores/visualizationStore'

export function Toggle2D3D() {
  const is2D = useVisualizationStore(s => s.is2D)
  const setIs2D = useVisualizationStore(s => s.setIs2D)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: '#6B6B80', fontWeight: 600 }}>View</span>
      <div
        style={{
          display: 'flex',
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid #2E2E3A',
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
                background: active ? '#6366F1' : '#1E1E2A',
                color: active ? '#FFFFFF' : '#6B6B80',
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
