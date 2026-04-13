import { useState, useCallback } from 'react'
import { useVisualizationStore } from '@/stores/visualizationStore'

interface ParamConfig {
  key: string
  label: string
  min: number
  max: number
  default: number
  step: number
}

const SLOW_PARAMS: ParamConfig[] = [
  { key: 'grid_resolution', label: 'Persistence Image Resolution (M)', min: 10, max: 100, default: 20, step: 5 },
  { key: 'sigma', label: 'Gaussian sigma', min: 0.01, max: 2.0, default: 0.1, step: 0.01 },
  { key: 'k_clusters', label: 'Cluster Count (K)', min: 10, max: 200, default: 50, step: 5 },
  { key: 'alpha', label: 'Feature Weight (alpha)', min: 0.0, max: 1.0, default: 0.5, step: 0.05 },
  { key: 'svm_gamma', label: 'SVM gamma', min: 0.001, max: 10.0, default: 1.0, step: 0.01 },
  { key: 'svm_C', label: 'SVM C', min: 0.01, max: 100.0, default: 1.0, step: 0.1 },
  { key: 'epsilon_max', label: 'Epsilon Max', min: 0.1, max: 5.0, default: 1.0, step: 0.05 },
  { key: 'epsilon_step', label: 'Epsilon Step Size', min: 0.001, max: 0.5, default: 0.01, step: 0.001 },
]

export function SlowTierParams() {
  const dirtyParams = useVisualizationStore((s) => s.dirtyParams)
  const addDirtyParam = useVisualizationStore((s) => s.addDirtyParam)
  const removeDirtyParam = useVisualizationStore((s) => s.removeDirtyParam)
  const h2Enabled = useVisualizationStore((s) => s.h2Enabled)
  const setH2Enabled = useVisualizationStore((s) => s.setH2Enabled)
  const isRecomputing = useVisualizationStore((s) => s.isRecomputing)

  // Track local param values (start at defaults = "last computed")
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (const p of SLOW_PARAMS) init[p.key] = p.default
    return init
  })

  // Track "last computed" values for dirty comparison
  const [lastComputed] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (const p of SLOW_PARAMS) init[p.key] = p.default
    return init
  })

  const handleParamChange = useCallback(
    (key: string, value: number) => {
      setValues((prev) => ({ ...prev, [key]: value }))
      const config = SLOW_PARAMS.find((p) => p.key === key)
      if (!config) return
      const lastVal = lastComputed[key]
      if (value !== lastVal) {
        addDirtyParam(key)
      } else {
        removeDirtyParam(key)
      }
    },
    [addDirtyParam, removeDirtyParam, lastComputed],
  )

  const handleH2Toggle = useCallback(() => {
    const next = !h2Enabled
    setH2Enabled(next)
    if (next) {
      addDirtyParam('h2')
    } else {
      removeDirtyParam('h2')
    }
  }, [h2Enabled, setH2Enabled, addDirtyParam, removeDirtyParam])

  const handleRecompute = useCallback(() => {
    // Collect changed params
    const changed: Record<string, number> = {}
    for (const key of dirtyParams) {
      if (key === 'h2') continue
      if (values[key] !== undefined) changed[key] = values[key]
    }
    // Trigger recompute via useRecompute hook (wired by parent)
    // For now just log - actual wiring uses useRecompute
    console.log('Recompute triggered with:', changed)
  }, [dirtyParams, values])

  const isDirty = dirtyParams.size > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#F5F5FF', marginBottom: 4 }}>
          Recompute Parameters
        </div>
        <div style={{ fontSize: 12, color: '#6B6B80' }}>
          Changes require explicit recomputation. Current view remains interactive.
        </div>
      </div>

      {/* Parameter sliders */}
      {SLOW_PARAMS.map((p) => (
        <div key={p.key}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#6B6B80' }}>{p.label}</span>
            <span style={{ fontSize: 12, color: '#9090A0', fontFamily: 'monospace' }}>
              {values[p.key].toFixed(p.step < 0.01 ? 3 : 2)}
            </span>
          </div>
          <input
            type="range"
            aria-label={p.label}
            min={p.min}
            max={p.max}
            step={p.step}
            value={values[p.key]}
            onChange={(e) => handleParamChange(p.key, Number(e.target.value))}
            style={{ width: '100%', accentColor: '#6366F1' }}
          />
        </div>
      ))}

      {/* H2 toggle */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          fontSize: 12,
          color: '#9090A0',
        }}
      >
        <input
          type="checkbox"
          aria-label="Enable H2 computation"
          checked={h2Enabled}
          onChange={handleH2Toggle}
          style={{ accentColor: '#6366F1' }}
        />
        Enable H2 computation
      </label>

      {/* Dirty badge */}
      {isDirty && (
        <div
          style={{
            background: '#FBBF24',
            color: '#111118',
            fontSize: 12,
            fontWeight: 600,
            padding: '6px 12px',
            borderRadius: 9999,
            textAlign: 'center',
          }}
        >
          Parameters changed -- Recompute Results
        </div>
      )}

      {/* Recompute button */}
      <button
        onClick={handleRecompute}
        disabled={!isDirty || isRecomputing}
        aria-label="Recompute Results"
        style={{
          width: '100%',
          height: 44,
          background: isDirty ? '#6366F1' : '#2A2A3A',
          color: isDirty ? '#F5F5FF' : '#6B6B80',
          border: 'none',
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 600,
          cursor: isDirty ? 'pointer' : 'not-allowed',
          opacity: isDirty ? 1 : 0.5,
          transition: 'all 150ms',
        }}
      >
        {isRecomputing ? 'Recomputing...' : 'Recompute Results'}
      </button>
    </div>
  )
}
