import { useState } from 'react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import type { ClassificationResult as ClassificationResultType } from '@/stores/uploadStore'
import { TopNList } from './TopNList'
import { UncertaintyBadge } from './UncertaintyBadge'
import { ClassificationExplain } from './ClassificationExplain'

interface ClassificationResultProps {
  result: ClassificationResultType
}

// XSS: never use dangerouslySetInnerHTML (T-3-01)
export function ClassificationResult({ result }: ClassificationResultProps) {
  const triggerCameraFocusUpload = useVisualizationStore((s) => s.triggerCameraFocusUpload)
  const [explainOpen, setExplainOpen] = useState(false)

  // Backward compat: synthesize a single-row top-N when the backend SVM is pre-Phase-9
  // (calibration_available = False) and didn't emit top_n.
  const topN = result.top_n ?? [{ genre: result.genre, probability: result.confidence }]

  return (
    <div style={{ background: '#16161F', borderRadius: 8, padding: 16, marginTop: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: 18,
          fontWeight: 600,
          color: '#F5F5FF',
          marginBottom: 12,
        }}
      >
        Classification Result
        <UncertaintyBadge result={result} />
      </div>

      {/* Phase 9: top-N bars + +N more expander (D-41/D-42) */}
      <TopNList topN={topN} />

      <div style={{ fontSize: 12, color: '#6B6B80', marginTop: 12, marginBottom: 12 }}>
        OOV words: {result.oov_count} / {result.total_words}
      </div>

      {/* Phase 9 DEPTH-03 -- Why this genre? expander (mounts ClassificationExplain) */}
      <button
        data-testid="why-this-genre-button"
        onClick={() => setExplainOpen(!explainOpen)}
        style={{
          background: 'transparent',
          color: '#6366F1',
          width: '100%',
          border: '1px solid #6366F1',
          borderRadius: 6,
          padding: '8px 16px',
          fontSize: 13,
          cursor: 'pointer',
          fontFamily: 'Inter, system-ui, sans-serif',
          marginBottom: 8,
        }}
      >
        {explainOpen ? 'Hide explanation' : 'Why this genre?'}
      </button>

      <button
        onClick={triggerCameraFocusUpload}
        style={{
          background: '#6366F1',
          color: '#fff',
          width: '100%',
          border: 'none',
          borderRadius: 6,
          padding: '8px 16px',
          fontSize: 14,
          cursor: 'pointer',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        View in Scatter
      </button>

      {explainOpen && <ClassificationExplain />}
    </div>
  )
}
