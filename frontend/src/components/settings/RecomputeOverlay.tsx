import { useVisualizationStore } from '@/stores/visualizationStore'

export function RecomputeOverlay() {
  const isRecomputing = useVisualizationStore((s) => s.isRecomputing)
  const isRetraining = useVisualizationStore((s) => s.isRetraining)

  if (!isRecomputing && !isRetraining) return null

  const message = isRetraining ? 'Retraining model...' : 'Updating...'

  return (
    <div
      data-testid="recompute-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(10,10,15,0.4)',
        zIndex: 25,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: '#1E1E2A',
          border: '1px solid #2A2A3A',
          borderRadius: 8,
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          pointerEvents: 'auto',
        }}
      >
        {/* Spinner */}
        <div
          style={{
            width: 16,
            height: 16,
            border: '2px solid #2A2A3A',
            borderTopColor: '#6366F1',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontSize: 13, color: '#E0E0EC', fontWeight: 500 }}>
          {message}
        </span>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
