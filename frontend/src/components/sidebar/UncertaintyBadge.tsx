// frontend/src/components/sidebar/UncertaintyBadge.tsx
// Phase 9 DEPTH-07 -- entropy badge (D-43/D-52). Renders only when badge_fires=true.
//
// Phase 10 D-84: UncertaintyBadge stays AMBER-ON-AMBER-TINT in BOTH themes.
// Signals shouldn't theme away — `--warn-soft` (bg) and `--warn-strong` (fg)
// are tuned per theme so the amber stays legible without losing identity.
import type { ClassificationResult } from '@/stores/uploadStore'

interface UncertaintyBadgeProps {
  result: ClassificationResult
}

// D-52 canonical tooltip text (mirrors the D-51 walkthrough disclaimer footnote).
// Wording is part of the disclosure contract -- do NOT translate or paraphrase.
const TOOLTIP_TEXT =
  'Low confidence — top predictions are close. The v2 model was validated on books by ' +
  'authors already in the training corpus; performance on unseen authors is typically lower. ' +
  'Open "Why this genre?" for the per-prediction breakdown.'

export function UncertaintyBadge({ result }: UncertaintyBadgeProps) {
  if (result.badge_fires !== true) {
    return null
  }
  return (
    <span
      data-testid="uncertainty-badge"
      title={TOOLTIP_TEXT}
      style={{
        display: 'inline-block',
        fontSize: 11,
        padding: '2px 6px',
        // D-84: amber-on-amber-tint stays in both themes (signals don't theme away).
        background: 'hsl(var(--warn-soft))',
        color: 'hsl(var(--warn-strong))',
        borderRadius: 4,
        marginLeft: 8,
        cursor: 'help',
      }}
    >
      Low confidence
    </span>
  )
}
