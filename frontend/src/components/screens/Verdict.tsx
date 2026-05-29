// Reading Room — The Reading screen (Phase 12, 12-04, §6.7).
//
// A thin wrapper around the verdict essay. The essay owns the breadcrumb +
// share/print, the real classify-result + useExplain wiring, the probability
// bars, the text catalog card, the where-it-landed SVG mini-plate, and the
// nearest-five (with framed 410/503 states). This screen exists so App.tsx can
// register a `verdict` route inside the masthead shell (matching the other
// screen wrappers).

import { VerdictEssay } from '@/components/reading/VerdictEssay'

export function Verdict() {
  return <VerdictEssay />
}
