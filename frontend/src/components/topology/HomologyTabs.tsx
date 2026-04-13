import { useVisualizationStore, type HomologyDim } from '@/stores/visualizationStore'

const DIMS: { key: HomologyDim; label: string }[] = [
  { key: 0, label: 'H0' },
  { key: 1, label: 'H1' },
  { key: 2, label: 'H2' },
]

export function HomologyTabs() {
  const selectedDim = useVisualizationStore((s) => s.selectedHomologyDim)
  const setDim = useVisualizationStore((s) => s.setSelectedHomologyDim)
  const h2Enabled = useVisualizationStore((s) => s.h2Enabled)

  return (
    <div style={{ display: 'flex', gap: 0 }} role="tablist" aria-label="Homology dimension">
      {DIMS.map((d) => {
        const isActive = selectedDim === d.key
        const isDisabled = d.key === 2 && !h2Enabled

        return (
          <button
            key={d.key}
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            title={isDisabled ? 'Enable H2 in Settings' : undefined}
            onClick={() => {
              if (!isDisabled) setDim(d.key)
            }}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: isActive ? '2px solid #6366F1' : '2px solid transparent',
              color: isDisabled ? '#3A3A4A' : isActive ? '#F5F5FF' : '#6B6B80',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 400,
              padding: '0 8px',
              height: 20,
              lineHeight: '20px',
            }}
          >
            {d.label}
          </button>
        )
      })}
    </div>
  )
}
