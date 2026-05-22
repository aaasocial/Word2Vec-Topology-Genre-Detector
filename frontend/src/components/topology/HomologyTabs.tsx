import { useVisualizationStore, type HomologyDim } from '@/stores/visualizationStore'

// v2: H₁ only. H₀ removed (degenerate in weighted Vietoris-Rips — all births
// collapse to filtration time 0). H₂ deferred to v3 (PROJECT.md Key Decisions
// / PITFALLS.md §2-3). See Plan 06-04 + CONTEXT.md <domain> recast.
const DIMS: readonly { key: HomologyDim; label: string }[] = [
  { key: 1, label: 'H1' },
] as const

export function HomologyTabs() {
  const selectedDim = useVisualizationStore((s) => s.selectedHomologyDim)

  return (
    <div style={{ display: 'flex', gap: 0 }} role="tablist" aria-label="Homology dimension">
      {DIMS.map((d) => (
        <button
          key={d.key}
          role="tab"
          aria-selected={selectedDim === d.key}
          tabIndex={-1}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: '2px solid #6366F1',
            color: '#F5F5FF',
            cursor: 'default',
            fontSize: 12,
            fontWeight: 400,
            padding: '0 8px',
            height: 20,
            lineHeight: '20px',
          }}
        >
          {d.label}
        </button>
      ))}
    </div>
  )
}
