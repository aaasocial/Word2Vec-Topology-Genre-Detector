import { useState } from 'react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { TOUR_ANCHORS } from '@/tour/anchors'
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
    <div
      data-tour-id={TOUR_ANCHORS.classificationResult}
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 8,
        padding: 16,
        marginTop: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: 18,
          fontWeight: 600,
          color: 'hsl(var(--card-foreground))',
          marginBottom: 12,
        }}
      >
        Classification Result
        <UncertaintyBadge result={result} />
      </div>

      {/* Phase 9: top-N bars + +N more expander (D-41/D-42) */}
      <TopNList topN={topN} />

      <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 12, marginBottom: 12 }}>
        OOV words: {result.oov_count} / {result.total_words}
      </div>

      {/* Phase 9 DEPTH-03 -- Why this genre? expander (mounts ClassificationExplain) */}
      <button
        data-testid="why-this-genre-button"
        data-tour-id={TOUR_ANCHORS.whyButton}
        onClick={() => setExplainOpen(!explainOpen)}
        style={{
          background: 'transparent',
          color: 'hsl(var(--primary))',
          width: '100%',
          border: '1px solid hsl(var(--primary))',
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
          background: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
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
