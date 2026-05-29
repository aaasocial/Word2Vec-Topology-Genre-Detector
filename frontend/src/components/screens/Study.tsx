// Reading Room — Comparative Study screen (Phase 12, 12-03, §6.5).
//
// A thin wrapper around StudyFolio (the masthead + footer are the App shell). Two
// regions side by side with shared/distinctive vocabulary + an Editor's note; the
// region pair is held in `readingRoomStore` (studyA/studyB).

import { StudyFolio } from '@/components/study/StudyFolio'

export function Study() {
  return <StudyFolio />
}
