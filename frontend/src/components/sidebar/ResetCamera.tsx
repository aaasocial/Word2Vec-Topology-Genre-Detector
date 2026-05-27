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
        border: '1px solid hsl(var(--border))',
        borderRadius: 6,
        color: 'hsl(var(--muted-foreground))',
        cursor: 'pointer',
        fontSize: 13,
        transition: 'border-color 150ms ease, color 150ms ease',
      }}
      onMouseEnter={e => {
        const btn = e.currentTarget
        btn.style.borderColor = 'hsl(var(--primary))'
        btn.style.color = 'hsl(var(--foreground))'
      }}
      onMouseLeave={e => {
        const btn = e.currentTarget
        btn.style.borderColor = 'hsl(var(--border))'
        btn.style.color = 'hsl(var(--muted-foreground))'
      }}
    >
      <RotateCcw size={14} />
      Reset View
    </button>
  )
}
