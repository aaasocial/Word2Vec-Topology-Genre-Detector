// Phase 10 D-79 — Classification failure card with red/amber severity levels.
//
// Headline pattern: "We couldn't [verb] this file" or specific copy table.
// NEVER "Error occurred" or "Something went wrong."
//
// Severity:
//   - red    = fixable by the user (encoding, too short, wrong format)
//             uses --destructive / --error-* token family
//   - amber  = handled-by-us (410 Gone TTL expired, 503 calibration missing)
//             uses --warn family
//
// For the 503 variant, the top-1 prediction stays rendered alongside the
// warning (D-79: "Don't hide partial results"). Other variants offer
// exactly one next action.

import { AlertTriangle, AlertCircle } from 'lucide-react'
import { TOUR_ANCHORS } from '@/tour/anchors'

export type FailureVariant =
  | 'encoding'
  | 'too_short'
  | 'wrong_format'
  | 'expired_410'
  | 'uncalibrated_503'
  | 'generic'

interface FailureSpec {
  severity: 'red' | 'amber'
  headline: string
  body: string
  retryLabel?: string
}

const FAILURES: Record<Exclude<FailureVariant, 'generic'>, FailureSpec> = {
  encoding: {
    severity: 'red',
    headline: "We couldn't read this file",
    body: "Looks like the encoding wasn't UTF-8. Try saving the file as plain UTF-8 text and dropping it again.",
    retryLabel: 'Try another file',
  },
  too_short: {
    severity: 'red',
    headline: 'Too short to classify.',
    body: 'Try a longer book — at least 500 words.',
    retryLabel: 'Try another file',
  },
  wrong_format: {
    severity: 'red',
    headline: 'Only .txt files for now.',
    body: 'PDF and EPUB support is on the v3 roadmap.',
    retryLabel: 'Try another file',
  },
  expired_410: {
    severity: 'amber',
    headline: 'This result expired.',
    body: 'Upload the file again to recompute. (5-min Redis TTL on feature_vec.)',
    retryLabel: 'Upload again',
  },
  uncalibrated_503: {
    severity: 'amber',
    headline: 'Top genre still shown.',
    body: 'Probability bars degraded. The classifier is fine; only the calibration step missed.',
  },
}

interface FailureCardProps {
  variant: FailureVariant
  /** Free-form message for the generic catch-all variant. */
  message?: string
  onRetry?: () => void
  /** For uncalibrated_503: top-1 prediction string, e.g. "mystery (62%)". */
  topPrediction?: string
}

/**
 * Map a raw error message or HTTP status to a known variant. Falls back to
 * `generic` for anything we don't recognise — caller passes `message` so the
 * card still tells the user something useful.
 */
export function classifyError(message: string, status?: number): FailureVariant {
  if (status === 410) return 'expired_410'
  if (status === 503) return 'uncalibrated_503'
  const m = message.toLowerCase()
  if (m.includes('utf-8') || m.includes('encoding') || m.includes('decode')) return 'encoding'
  if (m.includes('too short') || m.includes('500 words') || m.includes('minimum')) return 'too_short'
  if (m.includes('.txt') || m.includes('format') || m.includes('not supported')) return 'wrong_format'
  return 'generic'
}

export function FailureCard({ variant, message, onRetry, topPrediction }: FailureCardProps) {
  // Generic fallback uses the same pattern with the upstream message
  const spec: FailureSpec = variant === 'generic'
    ? {
        severity: 'red',
        headline: "We couldn't classify this file",
        body: message || 'Please try a different upload.',
        retryLabel: 'Try another file',
      }
    : FAILURES[variant]

  const isAmber = spec.severity === 'amber'
  const Icon = isAmber ? AlertTriangle : AlertCircle

  // Token families per D-79
  const bg = isAmber ? 'hsl(var(--warn-soft))' : 'hsl(var(--error-bg))'
  const border = isAmber ? 'hsl(var(--warn))' : 'hsl(var(--error-border))'
  const titleColor = isAmber ? 'hsl(var(--warn-strong))' : 'hsl(var(--error-fg))'
  const bodyColor = isAmber ? 'hsl(var(--warn-strong))' : 'hsl(var(--error-mid))'

  return (
    <div
      data-testid="failure-card"
      data-tour-id={TOUR_ANCHORS.classificationResult}
      style={{
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: 10,
        padding: '14px 16px',
        display: 'flex',
        gap: 12,
        marginTop: 14,
      }}
    >
      <Icon size={18} color={titleColor} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: titleColor, marginBottom: 4 }}>
          {spec.headline}
        </div>
        <div style={{ fontSize: 12, color: bodyColor, lineHeight: 1.5 }}>
          {spec.body}
        </div>

        {/* 503 variant keeps top-1 prediction rendered (D-79 partial results) */}
        {variant === 'uncalibrated_503' && topPrediction && (
          <div
            style={{
              marginTop: 10,
              padding: '8px 10px',
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 6,
              fontSize: 12,
              color: 'hsl(var(--card-foreground))',
            }}
          >
            <span style={{ color: 'hsl(var(--muted-foreground))', marginRight: 6 }}>
              Top-1 prediction:
            </span>
            <strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{topPrediction}</strong>
          </div>
        )}

        {spec.retryLabel && onRetry && (
          <button
            onClick={onRetry}
            style={{
              marginTop: 10,
              padding: '6px 12px',
              background: 'transparent',
              color: titleColor,
              border: `1px solid ${border}`,
              borderRadius: 5,
              fontSize: 11.5,
              cursor: 'pointer',
            }}
          >
            {spec.retryLabel}
          </button>
        )}
      </div>
    </div>
  )
}
