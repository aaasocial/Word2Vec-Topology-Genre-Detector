import { RotateCcw } from 'lucide-react'
import { useVisualizationStore } from '@/stores/visualizationStore'

export function ResetCamera() {
  return (
    <button
      onClick={() => useVisualizationStore.getState().triggerCameraReset()}
      title="Reset camera view (R)"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        background: 'transparent',
        border: '1px solid #2E2E3A',
        borderRadius: 6,
        color: '#9090A0',
        cursor: 'pointer',
        fontSize: 13,
        transition: 'border-color 150ms ease, color 150ms ease',
      }}
      onMouseEnter={e => {
        const btn = e.currentTarget
        btn.style.borderColor = '#6366F1'
        btn.style.color = '#F5F5FF'
      }}
      onMouseLeave={e => {
        const btn = e.currentTarget
        btn.style.borderColor = '#2E2E3A'
        btn.style.color = '#9090A0'
      }}
    >
      <RotateCcw size={14} />
      Reset View
    </button>
  )
}
