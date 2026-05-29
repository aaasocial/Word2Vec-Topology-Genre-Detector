// Reading Room — centralised tour anchor IDs + the 6-stop guided-tour script
// (Phase 12, 12-06, §6.10 / RR-08 / L-09).
//
// PITFALLS §14: every `data-tour-id` value in JSX MUST come from this constant —
// no string literals in JSX, no drift. `findAnchor()` is the single lookup
// helper; missing anchors return null (caller decides whether to wait/advance —
// never throws).
//
// This REPLACES the Phase 10 4-step onboarding script. The tour now navigates the
// REAL screens in masthead reading order (L-09): each step carries the `route` it
// lives on so the tour can drive `readingRoomStore.goTo()` before framing the
// anchor. Copy is verbatim from the prototype `tour.jsx` — do not paraphrase.

import type { RRRoute } from '@/stores/readingRoomStore'

export const TOUR_ANCHORS = {
  // The 6 reading-room stops (placed by 12-02..12-05; verified present in 12-06).
  plate: 'plate', // Collection — the R3F scatter plate
  catalogRail: 'catalog-rail', // Collection — the card-catalog rail
  catalogCard: 'catalog-card', // Card — the letterpress catalog card
  topologyPlate: 'topology-plate', // Topology — the VR filtration hero
  studyPickers: 'study-pickers', // Study — the two region dials
  readingDesk: 'reading-desk', // Submit a Text — the reading desk

  // Legacy Phase 10 anchors — kept so the now-dead indigo components
  // (ScatterCanvas / GenreSelect / UploadZone / Compare / Help / nav tabs /
  // explain) still compile. They are NOT part of the reading-room tour.
  scatterCanvas: 'scatter-canvas',
  genreSelect: 'genre-select',
  uploadZone: 'upload-zone',
  topologyTab: 'topology-tab',
  whyButton: 'why-button',
  classificationResult: 'classification-result',
  explainPanel: 'explain-panel',
  compareTab: 'compare-tab',
  helpMenu: 'help-menu',
  themeToggle: 'theme-toggle',
} as const

export type TourAnchorId = (typeof TOUR_ANCHORS)[keyof typeof TOUR_ANCHORS]

export interface TourStep {
  /** The screen this stop lives on — the tour navigates here first. */
  readonly route: RRRoute
  readonly anchor: TourAnchorId
  readonly title: string
  readonly body: string
}

/**
 * The 6-stop guided tour (§6.10 / L-09). Order = masthead reading order:
 * ① plate ② catalog rail (Collection) ③ catalog card (Card) ④ topology plate
 * (Topology — the provider pre-selects Mystery) ⑤ study pickers (Study)
 * ⑥ reading desk (Submit a Text). Copy verbatim from the prototype `tour.jsx`.
 */
export const TOUR_STEPS: readonly TourStep[] = [
  {
    route: 'collection',
    anchor: TOUR_ANCHORS.plate,
    title: 'This is the plate.',
    body:
      'Every catalogued novel is a point. Books that share vocabulary sit near one another — hover any point to read its margin note, click to open its card.',
  },
  {
    route: 'collection',
    anchor: TOUR_ANCHORS.catalogRail,
    title: 'Browse by region.',
    body:
      'The card catalog runs down the left. Click a genre to light up its region and dim the rest of the corpus; click it again to clear.',
  },
  {
    route: 'card',
    anchor: TOUR_ANCHORS.catalogCard,
    title: 'Each book has a card.',
    body:
      'A Library-of-Congress-style entry: shelfmark, driving vocabulary, and the five works nearest it in the embedding. Follow a neighbour to keep wandering.',
  },
  {
    route: 'topology',
    anchor: TOUR_ANCHORS.topologyPlate,
    title: 'See a region’s shape.',
    body:
      'The Topology plate reads one region three ways — a growing web of word-distances, the loops that persist as the radius widens, and the fingerprint the classifier consumes. Drag the radius and watch loops form, then fill in.',
  },
  {
    route: 'study',
    anchor: TOUR_ANCHORS.studyPickers,
    title: 'Set two regions against each other.',
    body:
      'Pick any pair from these two dials. The folio shows what their vocabularies share and where they part company, with an Editor’s note on the overlap.',
  },
  {
    route: 'upload',
    anchor: TOUR_ANCHORS.readingDesk,
    title: 'Submit a text of your own.',
    body:
      'Paste a passage onto the desk and ask for a reading — a short essay placing your manuscript among its likely neighbours, with footnotes you can open.',
  },
] as const

/**
 * Look up the live DOM element carrying `data-tour-id="{id}"`.
 * Returns null if no match — caller decides whether to wait then advance
 * (PITFALLS §14: NEVER throw on missing anchors).
 */
export function findAnchor(id: TourAnchorId): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.querySelector(`[data-tour-id="${id}"]`)
}
