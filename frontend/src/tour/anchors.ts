// Phase 10 D-71 — Centralised tour anchor IDs and step copy.
//
// PITFALLS §14: every `data-tour-id` value in JSX MUST come from this constant.
// No string literals in JSX. `findAnchor()` is the single lookup helper; missing
// anchors return null (caller decides whether to skip — never throws).
//
// TOUR_STEPS is the 4-step onboarding script (D-70). Copy is jargon-reduced and
// LOCKED — do not paraphrase. Cross-surface consistency contract.

export const TOUR_ANCHORS = {
  // Step 1
  scatterCanvas: 'scatter-canvas',
  // Step 2
  genreSelect: 'genre-select',
  // Step 3
  uploadZone: 'upload-zone',
  // Step 4
  topologyTab: 'topology-tab',

  // Anchors referenced by empty states + future tour re-add of Step "Why this genre?"
  whyButton: 'why-button',
  classificationResult: 'classification-result',
  explainPanel: 'explain-panel',
  compareTab: 'compare-tab',
  helpMenu: 'help-menu',
  themeToggle: 'theme-toggle',
} as const

export type TourAnchorId = (typeof TOUR_ANCHORS)[keyof typeof TOUR_ANCHORS]

export interface TourStep {
  readonly anchor: TourAnchorId
  readonly title: string
  readonly body: string
}

/**
 * D-70 — 4-step onboarding script. Copy is verbatim from CONTEXT.md `<specifics>`
 * and the README §9.2 table. Do not edit phrasing without a paired CONTEXT.md
 * decision update.
 */
export const TOUR_STEPS: readonly TourStep[] = [
  {
    anchor: TOUR_ANCHORS.scatterCanvas,
    title: 'Each dot is a word.',
    body:
      "Words from 154 books, arranged so similar-meaning words sit close together. " +
      "Drag to rotate, scroll to zoom, press R to reset. " +
      "You're seeing a 3D version of something that lives in higher dimensions — close enough to explore.",
  },
  {
    anchor: TOUR_ANCHORS.genreSelect,
    title: 'Light up a genre.',
    body:
      "Pick one — its signature words brighten, the common ones fade. " +
      "Brightness shows how strongly a word belongs to that genre vs the others. " +
      "Slide through individual books in that genre and watch the pattern shift, book by book.",
  },
  {
    anchor: TOUR_ANCHORS.uploadZone,
    title: 'Drop a book.',
    body:
      "Drag in any .txt file. We compare its shape to each genre's shape and predict what it is — " +
      "you'll get the three most likely genres with confidence scores, " +
      "and the book itself shows up in the cloud with its own bright words highlighted.",
  },
  {
    anchor: TOUR_ANCHORS.topologyTab,
    title: 'Two more views worth a look.',
    body:
      "Topology shows each genre as a shape, and tracks the holes that survive as you zoom out — " +
      "a fingerprint the classifier actually uses. " +
      "Compare puts two genres side-by-side. " +
      "Both work from the full geometry, not the 3D view you've been rotating.",
  },
] as const

/**
 * Look up the live DOM element carrying `data-tour-id="{id}"`.
 * Returns null if no match — caller decides whether to silently skip
 * (PITFALLS §14: NEVER throw on missing anchors).
 */
export function findAnchor(id: TourAnchorId): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.querySelector(`[data-tour-id="${id}"]`)
}
