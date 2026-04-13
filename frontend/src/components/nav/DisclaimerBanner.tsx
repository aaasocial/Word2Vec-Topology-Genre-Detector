import { Info } from 'lucide-react'
import { useVisualizationStore } from '@/stores/visualizationStore'

export function DisclaimerBanner() {
  const activeTab = useVisualizationStore((s) => s.activeTab)

  // Hidden on Compare tab (UX-05)
  if (activeTab === 'compare') return null

  return (
    <div
      data-testid="disclaimer-banner"
      style={{
        position: 'fixed',
        top: 48,
        left: 0,
        right: 0,
        height: 28,
        background: '#0D0D14',
        borderBottom: '1px solid #1E1E2A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        zIndex: 29,
      }}
    >
      <Info size={14} color="#6B6B80" />
      <span
        style={{
          fontSize: 12,
          fontWeight: 400,
          color: '#6B6B80',
        }}
      >
        Topology is computed in the original N-dimensional space. The 3D view is a lossy projection.
      </span>
    </div>
  )
}
