// Reading Room — The Guide side-sheet (Phase 12, 12-06, §6.9 / RR-07 / L-07).
//
// A 480-wide right side-sheet with three tabs:
//   01 Welcome        — what this is + a "you can do three things" card.
//   02 How to wander  — "Begin the guided tour" (closes the sheet + starts the
//                       6-stop tour) + the itinerary.
//   03 How it works   — 5 numbered method steps, each with a live figure
//                       (GuideFigures, wired in Task 2).
//
// Auto-opens ONCE per browser via the persisted `guideSeen` flag (semantic key
// rr.guide.seen.v1). The masthead "Guide" button reopens it anytime; a backdrop
// click closes it. This is the new onboarding (D-U2) — it replaces the Phase 11
// How-It-Works → tour chain, which 12-01 already removed from App.tsx.
//
// Copy is verbatim from the prototype `guide.jsx`. Skin reads the reading-room
// CSS vars on <html> (paper/paper2/card/ink/muted/accent) so it tracks Tweaks.

import { useEffect, useState } from 'react'
import { useReadingRoomStore } from '@/stores/readingRoomStore'
import { MethodPanel } from '@/components/guide/GuideFigures'

type GuideTab = 'welcome' | 'wander' | 'method'

const TABS: { id: GuideTab; label: string; num: string }[] = [
  { id: 'welcome', label: 'Welcome', num: '01' },
  { id: 'wander', label: 'How to wander', num: '02' },
  { id: 'method', label: 'How it works', num: '03' },
]

export function Guide() {
  const open = useReadingRoomStore((s) => s.guideOpen)
  const closeGuide = useReadingRoomStore((s) => s.closeGuide)
  const startTour = useReadingRoomStore((s) => s.startTour)

  const [tab, setTab] = useState<GuideTab>('welcome')

  // Reset to Welcome each time the sheet (re)opens, matching the prototype.
  useEffect(() => {
    if (open) setTab('welcome')
  }, [open])

  if (!open) return null

  const footerNum = tab === 'welcome' ? '01' : tab === 'wander' ? '02' : '03'

  return (
    <div
      onClick={closeGuide}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(38,33,27,0.34)',
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'rr-guide-backdrop-in 180ms ease',
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="The Guide"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxWidth: '100%',
          height: '100%',
          background: 'var(--paper)',
          borderLeft: '1px solid var(--ink)',
          boxShadow: '-14px 0 40px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-serif)',
          color: 'var(--ink)',
          animation: 'rr-guide-sheet-in 240ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header — "Reader's aid / The Guide" + close */}
        <header
          style={{
            padding: '18px 24px 14px',
            borderBottom: '1px solid var(--ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Reader&rsquo;s aid
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: 22,
                fontWeight: 500,
                margin: '4px 0 0',
              }}
            >
              The Guide
            </h2>
          </div>
          <button
            onClick={closeGuide}
            type="button"
            style={{
              all: 'unset',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.1em',
              color: 'var(--muted)',
            }}
          >
            close ×
          </button>
        </header>

        {/* Tabs */}
        <nav
          style={{
            display: 'flex',
            gap: 0,
            borderBottom: '1px solid var(--ink-33)',
            flexShrink: 0,
          }}
        >
          {TABS.map((t) => {
            const activeTab = t.id === tab
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={activeTab ? 'true' : undefined}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  flex: 1,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 1,
                  borderBottom: activeTab
                    ? '2px solid var(--accent)'
                    : '2px solid transparent',
                  marginBottom: -1,
                  background: activeTab ? 'var(--paper)' : 'var(--paper2)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    letterSpacing: '0.18em',
                    color: 'var(--muted)',
                  }}
                >
                  {t.num}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontStyle: activeTab ? 'italic' : 'normal',
                    fontWeight: activeTab ? 500 : 400,
                    fontSize: 14,
                    color: activeTab ? 'var(--ink)' : 'var(--muted)',
                  }}
                >
                  {t.label}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Body — scrolls within the sheet */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px 26px' }}>
          {tab === 'welcome' && <WelcomePanel onWander={() => setTab('wander')} />}
          {tab === 'wander' && (
            <WanderPanel
              onBeginTour={() => {
                // startTour() flips guideOpen → false in the store, closing the
                // sheet, and sets tourActive + tourStep 0.
                startTour()
              }}
            />
          )}
          {tab === 'method' && <MethodPanel />}
        </div>

        {/* Footer */}
        <footer
          style={{
            padding: '10px 24px',
            borderTop: '1px solid var(--ink-33)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              color: 'var(--muted)',
            }}
          >
            this guide is always here · {footerNum} / 03
          </span>
          <button
            onClick={closeGuide}
            type="button"
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '5px 14px',
              background: 'var(--ink)',
              color: 'var(--paper)',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 13,
            }}
          >
            {tab === 'method' ? 'Enter the room →' : 'Continue'}
          </button>
        </footer>
      </aside>

      <style>{`
        @keyframes rr-guide-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rr-guide-sheet-in { from { transform: translateX(24px); opacity: 0.4; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// Panel 01 — Welcome
// ───────────────────────────────────────────────────────────────
function WelcomePanel({ onWander }: { onWander: () => void }) {
  const things: [string, string][] = [
    ['Wander', 'browse the plate, hover any book, open its card.'],
    ['Compare', 'pick two regions to see what their vocabularies share.'],
    ['Submit', 'paste a passage and receive a written reading of it.'],
  ]
  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <h3
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 500,
          fontSize: 30,
          letterSpacing: '-0.01em',
          lineHeight: 1.1,
          margin: 0,
        }}
      >
        A library of <span style={{ fontStyle: 'italic' }}>122 novels,</span>
        <br />
        arranged by what they say.
      </h3>
      <p style={{ fontSize: 14.5, lineHeight: 1.7, margin: 0 }}>
        This is a small reading room sitting on top of a word2vec embedding. Each book
        in the corpus has been read into the embedding; books with overlapping
        vocabularies sit near one another on the plate.
      </p>
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--ink-33)',
          padding: '14px 16px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            marginBottom: 8,
          }}
        >
          You can do three things here
        </div>
        <ol
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {things.map(([h, b]) => (
            <li
              key={h}
              style={{
                display: 'grid',
                gridTemplateColumns: '78px 1fr',
                gap: 12,
                alignItems: 'baseline',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: 15,
                  color: 'var(--accent)',
                }}
              >
                {h}
              </span>
              <span style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink)' }}>
                {b}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <p
        style={{
          fontSize: 13.5,
          lineHeight: 1.7,
          margin: 0,
          fontStyle: 'italic',
          color: 'var(--muted)',
        }}
      >
        The room is small on purpose. Read the next tab for a short tour, or the third
        for the method behind the placements.
      </p>
      <button
        onClick={onWander}
        type="button"
        style={{
          all: 'unset',
          cursor: 'pointer',
          alignSelf: 'flex-start',
          padding: '8px 16px',
          border: '1px solid var(--accent)',
          color: 'var(--accent)',
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 14,
        }}
      >
        How to wander →
      </button>
    </article>
  )
}

// ───────────────────────────────────────────────────────────────
// Panel 02 — How to wander (launches the 6-stop tour)
// ───────────────────────────────────────────────────────────────
function WanderPanel({ onBeginTour }: { onBeginTour: () => void }) {
  const itinerary: [string, string, string][] = [
    ['01', 'The plate', 'Hover any book; like sits by like.'],
    ['02', 'The catalog rail', 'Filter the corpus down to one region.'],
    ['03', 'A catalog card', 'Open a book — neighbours, vocabulary, shelfmark.'],
    ['04', 'A region’s topology', 'Watch its loops form as the radius grows.'],
    ['05', 'A comparative study', 'Set two regions against each other.'],
    ['06', 'Submit a text', 'Place your own manuscript on the desk.'],
  ]
  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <p style={{ fontSize: 14.5, lineHeight: 1.7, margin: 0 }}>
        The fastest way in is the <em>guided tour</em>. It walks you through the room
        itself — moving between screens and lighting up each part in turn — rather than
        describing it from the sidelines. Six short stops; leave whenever you like.
      </p>

      <button
        onClick={onBeginTour}
        type="button"
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          background: 'var(--ink)',
          color: 'var(--paper)',
          fontFamily: 'var(--font-serif)',
        }}
      >
        <span>
          <span style={{ fontStyle: 'italic', fontSize: 17 }}>Begin the guided tour</span>
          <span
            style={{
              display: 'block',
              marginTop: 2,
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              opacity: 0.7,
            }}
          >
            6 stops · ~2 minutes · skippable
          </span>
        </span>
        <span style={{ fontSize: 20, fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
          →
        </span>
      </button>

      <div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            marginBottom: 8,
          }}
        >
          The itinerary
        </div>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {itinerary.map(([n, h, b]) => (
            <li
              key={n}
              style={{
                display: 'grid',
                gridTemplateColumns: '30px 1fr',
                gap: 12,
                padding: '11px 0',
                alignItems: 'baseline',
                borderBottom: '0.5px dotted var(--ink-33)',
              }}
            >
              <span
                style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--accent)' }}
              >
                {n}
              </span>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15 }}>
                  {h}
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--muted)' }}>{b}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p
        style={{
          fontSize: 13,
          lineHeight: 1.65,
          margin: 0,
          fontStyle: 'italic',
          color: 'var(--muted)',
        }}
      >
        Prefer to wander unaccompanied? Close the guide and explore — every screen is
        reachable from the masthead, and this guide is always one click away.
      </p>
    </article>
  )
}
