// Reading Room — Submit a Text screen (Phase 12, 12-04, §6.6).
//
// A thin wrapper around the reading desk. The desk owns the editor, the real
// `useClassify` job wiring, the staged progress, and the route → verdict on
// completion. This screen exists so App.tsx can register an `upload` route that
// composes cleanly inside the masthead shell (matching the Collection/Card/Study
// screen pattern).

import { ReadingDesk } from '@/components/reading/ReadingDesk'

export function Upload() {
  return <ReadingDesk />
}
