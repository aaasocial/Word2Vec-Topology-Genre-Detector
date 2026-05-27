// frontend/src/components/sidebar/ClassificationExplain.tsx
// Phase 9 DEPTH-03 -- orchestrator panel for the explain payload.
//
// Composes NearestBooksList + TrackContributionBars + DrivingWordsPills + D-51 footnote.
// Auto-fires the useExplain mutation on mount; consumer (ClassificationResult) decides
// when to mount/unmount the component via a Why-button toggle.
//
// Branches:
//   - 410 expired       -> "Upload expired" prompt, points at existing UploadZone (D-49)
//   - 503 uncalibrated  -> "Explanation unavailable" degraded-mode message
//   - isPending         -> "Loading explanation..."
//   - error (non-410/503)-> generic error message with .message
//   - success           -> sub-components + D-51 footnote
//
// Phase 10 D-82 sweep: inline-hex lifted to hsl(var(--*)) tokens.
import { useEffect, useState } from 'react'
import { useUploadStore } from '@/stores/uploadStore'
import { useExplain } from '@/hooks/useExplain'
import { TOUR_ANCHORS } from '@/tour/anchors'
import { NearestBooksList } from './NearestBooksList'
import { TrackContributionBars } from './TrackContributionBars'
import { DrivingWordsPills } from './DrivingWordsPills'

// D-51 Why-panel footnote link -- v2 validation report URL (locked from CONTEXT.md).
const VALIDATION_REPORT_URL =
  'https://github.com/aaasocial/Word2Vec-Topology-Genre-Detector/blob/master/results/v2_validation_report.md'

export function ClassificationExplain() {
  const jobId = useUploadStore((s) => s.jobId)
  const [expired, setExpired] = useState(false)
  const [uncalibrated, setUncalibrated] = useState(false)

  const { mutate, data, error, isPending, isSuccess } = useExplain(jobId, {
    onExpired: () => setExpired(true),
    onUncalibrated: () => setUncalibrated(true),
  })

  // Auto-fire on mount (once). Re-mount (toggle off -> on) re-fires; that's the
  // explicit contract -- the user clicked Why again, so refresh.
  useEffect(() => {
    if (jobId && !data && !error) {
      mutate()
    }
    // Intentionally only depends on jobId -- don't re-fire on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  // --- 410 expired branch (amber wash — "we'll handle this" per D-79) ---
  if (expired) {
    return (
      <div
        data-testid="explain-expired"
        data-tour-id={TOUR_ANCHORS.explainPanel}
        style={{
          background: 'hsl(var(--warn-soft))',
          border: '1px solid hsl(var(--warn))',
          padding: 12,
          borderRadius: 8,
          marginTop: 12,
          fontSize: 12,
          color: 'hsl(var(--card-foreground))',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: 'hsl(var(--warn-strong))' }}>Upload expired</strong>
        <div style={{ marginTop: 6, color: 'hsl(var(--muted-foreground))' }}>
          The explanation cache lives for 5 minutes after upload. Please re-upload
          your file (use the upload zone above) to see the explanation.
        </div>
      </div>
    )
  }

  // --- 503 uncalibrated branch (amber wash per D-79) ---
  if (uncalibrated) {
    return (
      <div
        data-testid="explain-uncalibrated"
        data-tour-id={TOUR_ANCHORS.explainPanel}
        style={{
          background: 'hsl(var(--warn-soft))',
          border: '1px solid hsl(var(--warn))',
          padding: 12,
          borderRadius: 8,
          marginTop: 12,
          fontSize: 12,
          color: 'hsl(var(--card-foreground))',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: 'hsl(var(--warn-strong))' }}>Explanation unavailable</strong>
        <div style={{ marginTop: 6, color: 'hsl(var(--muted-foreground))' }}>
          The deployed model is missing required calibration metadata or explain
          artifacts. Re-run the precompute pipeline to enable explanations.
        </div>
      </div>
    )
  }

  // --- Loading branch ---
  if (isPending) {
    return (
      <div
        data-testid="explain-loading"
        style={{
          padding: 12,
          fontSize: 12,
          color: 'hsl(var(--muted-foreground))',
          marginTop: 12,
        }}
      >
        Loading explanation...
      </div>
    )
  }

  // --- Generic error branch (non-410, non-503) ---
  if (error && !isSuccess) {
    return (
      <div
        data-testid="explain-error"
        style={{
          padding: 12,
          fontSize: 12,
          color: 'hsl(var(--destructive))',
          marginTop: 12,
        }}
      >
        Failed to load explanation: {error.message}
      </div>
    )
  }

  // --- Success branch ---
  if (!data) return null
  return (
    <div
      data-testid="explain-panel"
      data-tour-id={TOUR_ANCHORS.explainPanel}
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
      }}
    >
      <NearestBooksList books={data.nearest_training_books} />
      <TrackContributionBars contributions={data.track_contributions} />
      <DrivingWordsPills words={data.driving_words} />

      {/* D-51 footnote -- author-leakage disclaimer canonical copy */}
      <div
        data-testid="explain-footnote"
        style={{
          fontSize: 11,
          color: 'hsl(var(--muted-foreground))',
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid hsl(var(--border))',
          lineHeight: 1.5,
        }}
      >
        The v2 model was validated on books by authors already in the training
        corpus; performance on unseen authors is typically lower. See{' '}
        <a
          href={VALIDATION_REPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'hsl(var(--primary))' }}
        >
          validation report
        </a>
        .
      </div>
    </div>
  )
}
