// Reading Room — app shell + masthead router (Phase 12, 12-01).
//
// Replaces the Phase 10/11 tabbed indigo shell + onboarding orchestrator (D-U2)
// with: a sticky Masthead, a route switch rendering the active screen, a running
// Footer, the FootnoteHost overlay, and the Tweaks panel/toggle. Fluid editorial
// layout (L-14 / §10) — NOT the fixed 1240×780 prototype artboard.
//
// Routes not yet built (collection/card/topology/study/upload/verdict) render a
// PlaceholderScreen so the masthead is fully navigable from the foundation plan;
// later plans swap each route's render for the real composition. Landing + About
// are real here. The Guide side-sheet + 6-stop tour mount points land in 12-06.

import { useReadingRoomStore } from '@/stores/readingRoomStore'
import { Masthead } from '@/components/shell/Masthead'
import { Footer } from '@/components/shell/Footer'
import { FootnoteHost } from '@/components/shell/FootnoteHost'
import { TweaksPanel, TweaksToggle } from '@/components/shell/TweaksPanel'
import { Landing } from '@/components/screens/Landing'
import { About } from '@/components/screens/About'
import { Collection } from '@/components/screens/Collection'
import { Card } from '@/components/screens/Card'
import { Study } from '@/components/screens/Study'
import { Upload } from '@/components/screens/Upload'
import { Verdict } from '@/components/screens/Verdict'
import { PlaceholderScreen } from '@/components/screens/PlaceholderScreen'

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
        return (
          <PlaceholderScreen
            plan="12-05"
            title="Topology"
            note="One region's H₁ shape, three linked ways — VR filtration with an ε slider, persistence diagram, persistence image. Forthcoming."
          />
        )
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

      {/* Guide side-sheet + 6-stop guided tour mount points land in 12-06. */}
    </FootnoteHost>
  )
}
