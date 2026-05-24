import { useState, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useRecompute } from '@/hooks/useRecompute'

interface VerySlowParam {
  key: string
  label: string
  min: number
  max: number
  default: number
  step: number
}

const VERY_SLOW_PARAMS: VerySlowParam[] = [
  { key: 'vector_size', label: 'Embedding Dimension', min: 50, max: 300, default: 150, step: 10 },
  { key: 'window', label: 'Context Window', min: 2, max: 15, default: 15, step: 1 },
]

export function VerySlowTierParams() {
  const { triggerRetrain } = useRecompute()

  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (const p of VERY_SLOW_PARAMS) init[p.key] = p.default
    return init
  })

  const [confirmDialog, setConfirmDialog] = useState<{ key: string; value: number } | null>(null)
  const [pendingValue, setPendingValue] = useState<{ key: string; prevValue: number } | null>(null)

  const handleChange = useCallback((key: string, value: number) => {
    const config = VERY_SLOW_PARAMS.find((p) => p.key === key)
    if (!config) return
    // Store previous value for revert
    setPendingValue({ key, prevValue: values[key] })
    setValues((prev) => ({ ...prev, [key]: value }))
    setConfirmDialog({ key, value })
  }, [values])

  const handleConfirmRetrain = useCallback(() => {
    void triggerRetrain({ vector_size: values.vector_size, window: values.window })
    setConfirmDialog(null)
    setPendingValue(null)
  }, [triggerRetrain, values])

  const handleCancelRetrain = useCallback(() => {
    // Revert value
    if (pendingValue) {
      setValues((prev) => ({ ...prev, [pendingValue.key]: pendingValue.prevValue }))
    }
    setConfirmDialog(null)
    setPendingValue(null)
  }, [pendingValue])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#F5F5FF' }}>
        Model Parameters
      </div>

      {/* Warning banner */}
      <div
        style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid #EF4444',
          borderRadius: 6,
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        <AlertTriangle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontSize: 12, color: '#F87171', lineHeight: 1.5 }}>
          Changing these will retrain the Word2Vec model. Estimated time: 2-5 minutes.
        </span>
      </div>

      {/* Parameter sliders */}
      {VERY_SLOW_PARAMS.map((p) => (
        <div key={p.key}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#6B6B80' }}>{p.label}</span>
            <span style={{ fontSize: 12, color: '#9090A0', fontFamily: 'monospace' }}>
              {values[p.key]}
            </span>
          </div>
          <input
            type="range"
            aria-label={p.label}
            min={p.min}
            max={p.max}
            step={p.step}
            value={values[p.key]}
            onChange={(e) => handleChange(p.key, Number(e.target.value))}
            style={{ width: '100%', accentColor: '#EF4444' }}
          />
        </div>
      ))}

      {/* Confirm dialog overlay */}
      {confirmDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={handleCancelRetrain}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#111118',
              border: '1px solid #2A2A3A',
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              width: '90%',
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#F5F5FF', margin: '0 0 12px' }}>
              Retrain Word2Vec Model?
            </h3>
            <p style={{ fontSize: 13, color: '#9090A0', margin: '0 0 20px', lineHeight: 1.6 }}>
              This will retrain the entire model with the new parameters. Current visualizations
              will be unavailable during retraining. Estimated time: 2-5 minutes.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelRetrain}
                style={{
                  background: 'transparent',
                  border: '1px solid #2E2E3A',
                  color: '#9090A0',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Keep Current Model
              </button>
              <button
                onClick={handleConfirmRetrain}
                style={{
                  background: '#EF4444',
                  border: 'none',
                  color: '#F5F5FF',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Retrain Model
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
