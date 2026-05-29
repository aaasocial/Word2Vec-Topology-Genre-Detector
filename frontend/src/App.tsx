// Reading Room — app shell + masthead router (Phase 12, 12-01).
//
// Replaces the Phase 10/11 tabbed indigo shell + onboarding orchestrator (D-U2)
// with: a sticky Masthead, a route switch rendering the active screen, a running
// Footer, the FootnoteHost overlay, and the Tweaks panel/toggle. Fluid editorial
// layout (L-14 / §10) — NOT the fixed 1240×780 prototype artboard.
//
// All eight screens are now real compositions (landing/about/collection/card/
// topology/study/upload/verdict). The Guide side-sheet (12-06) auto-opens once
// per browser, and the 6-stop guided tour mounts alongside it.

import { useEffect } from 'react'
import { useReadingRoomStore } from '@/stores/readingRoomStore'
import { Guide } from '@/components/guide/Guide'
import { Masthead } from '@/components/shell/Masthead'
import { Footer } from '@/components/shell/Footer'
import { FootnoteHost } from '@/components/shell/FootnoteHost'
import { TweaksPanel, TweaksToggle } from '@/components/shell/TweaksPanel'
import { Landing } from '@/components/screens/Landing'
import { About } from '@/components/screens/About'
import { Collection } from '@/components/screens/Collection'
import { Card } from '@/components/screens/Card'
import { Topology } from '@/components/screens/Topology'
import { Study } from '@/components/screens/Study'
import { Upload } from '@/components/screens/Upload'
import { Verdict } from '@/components/screens/Verdict'

/** Per-route running-footer text (left running note + right page marker). */
const FOOTER: Record<string, { left: string; center: string; right: string }> = {
  landing: { left: 'A working library · est. 2026', center: 'Edited by the reading room', right: 'p. 1' },
  about: { left: 'About', center: '', right: 'p. 2' },
  collection: { left: 'The Collection', center: 'Edited by the reading room', right: '' },
  card: { left: 'Catalog card', center: 'Edited by the reading room', right: '' },
  topology: { left: 'Topology', center: 'Edited by the reading room', right: '' },
  study: { left: 'A Comparative Study', center: 'Edited by the reading room', right: '' },
  upload: { left: 'Submit a Text', center: 'Edited by the reading room', right: '' },
  verdict: { left: 'The Reading', center: 'Edited by the reading room', right: '' },
}

export default function App() {
  const route = useReadingRoomStore((s) => s.route)

  // L-07 — auto-open the Guide ONCE per browser. `guideSeen` is persisted
  // (semantic key rr.guide.seen.v1); flipping it here is the "consume on fire"
  // that prevents a re-open on the next visit. This is the new onboarding (D-U2);
  // the Phase 11 How-It-Works → tour chain was already removed in 12-01.
  useEffect(() => {
    const { guideSeen, openGuide, markGuideSeen } = useReadingRoomStore.getState()
    if (!guideSeen) {
      openGuide()
      markGuideSeen()
    }
  }, [])

  const screen = (() => {
    switch (route) {
      case 'landing':
        return <Landing />
      case 'about':
        return <About />
      case 'collection':
        return <Collection />
      case 'card':
        return <Card />
      case 'topology':
        return <Topology />
      case 'study':
        return <Study />
      case 'upload':
        return <Upload />
      case 'verdict':
        return <Verdict />
      default:
        return <Landing />
    }
  })()

  const footer = FOOTER[route] ?? FOOTER.landing

  return (
    <FootnoteHost>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100vw',
          height: '100vh',
          background: 'var(--paper)',
          color: 'var(--ink)',
          overflow: 'hidden',
        }}
      >
        <Masthead />
        {screen}
        <Footer left={footer.left} center={footer.center} right={footer.right} />
      </div>

      {/* Tweaks (paper/accent/density) — toggled from the bottom-right pill. */}
      <TweaksToggle />
      <TweaksPanel />

      {/* Guide side-sheet (auto-opens once; masthead "Guide" reopens). */}
      <Guide />
    </FootnoteHost>
  )
}
