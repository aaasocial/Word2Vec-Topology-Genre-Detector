// Reading Room — masthead (Phase 12, L-04). Sticky top bar: wordmark (→ landing)
// + nav items + a "Guide" button. Active item = accent underline + ink color +
// roman; others italic + muted. `2px solid ink` rule under the bar (tokens.md).
//
// Routes live in the readingRoomStore; the wordmark goes to landing. The five
// nav items map to collection/topology/study/upload/about. The Guide button
// opens the side-sheet (stubbed in 12-01 — the Guide itself lands in 12-06).

import { useReadingRoomStore, type RRRoute } from '@/stores/readingRoomStore'

interface NavItem {
  id: RRRoute
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'collection', label: 'The Collection' },
  { id: 'topology', label: 'Topology' },
  { id: 'study', label: 'A Comparative Study' },
  { id: 'upload', label: 'Submit a Text' },
  { id: 'about', label: 'About' },
]

export function Masthead() {
  const route = useReadingRoomStore((s) => s.route)
  const goTo = useReadingRoomStore((s) => s.goTo)
  const openGuide = useReadingRoomStore((s) => s.openGuide)

  return (
    <header
      style={{
        padding: '14px 32px',
        borderBottom: 'var(--rule-masthead)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        background: 'var(--paper)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        flexShrink: 0,
      }}
    >
      <button
        onClick={() => goTo('landing')}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'baseline',
          gap: 14,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 600,
            fontSize: 18,
            letterSpacing: '0.04em',
            color: 'var(--ink)',
          }}
        >
          Literary Genre Topology
        </span>
      </button>

      <nav
        style={{
          display: 'flex',
          gap: 24,
          fontFamily: 'var(--font-serif)',
          fontSize: 14,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
        }}
      >
        {NAV_ITEMS.map((it) => {
          const active = it.id === route
          return (
            <button
              key={it.id}
              onClick={() => goTo(it.id)}
              aria-current={active ? 'page' : undefined}
              style={{
                all: 'unset',
                cursor: 'pointer',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                paddingBottom: 3,
                color: active ? 'var(--ink)' : 'var(--muted)',
                fontStyle: active ? 'normal' : 'italic',
              }}
            >
              {it.label}
            </button>
          )
        })}

        <button
          onClick={openGuide}
          title="Newcomer's guide & how it works"
          style={{
            all: 'unset',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            border: '1px solid var(--ink-55)',
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 13,
            color: 'var(--ink)',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: '1px solid var(--ink)',
              textAlign: 'center',
              lineHeight: '14px',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 11,
            }}
          >
            ?
          </span>
          Guide
        </button>
      </nav>
    </header>
  )
}
