// Reading Room — placeholder screen (Phase 12, 12-01). Stands in for the routes
// whose full compositions land in later plans (collection 12-02, card/study
// 12-03, upload/verdict 12-04, topology 12-05). Renders the route title + a "in
// preparation" note in the reading-room idiom so the masthead router is fully
// navigable from the foundation plan. Each later plan swaps its route's render
// in App.tsx for the real screen.

interface PlaceholderScreenProps {
  title: string
  note: string
  /** Which plan delivers the real screen — surfaced as a small mono shelfmark. */
  plan: string
}

export function PlaceholderScreen({ title, note, plan }: PlaceholderScreenProps) {
  return (
    <main
      style={{
        flex: 1,
        padding: '48px 64px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        minHeight: 0,
        overflow: 'auto',
      }}
      className="rr-scroll"
    >
      <div className="rr-label">In preparation · {plan}</div>
      <h1
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 500,
          fontSize: 38,
          letterSpacing: '-0.01em',
          lineHeight: 1.08,
          margin: 0,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.7,
          margin: 0,
          maxWidth: 560,
          color: 'var(--muted)',
          fontStyle: 'italic',
        }}
      >
        {note}
      </p>
      <div
        style={{
          marginTop: 12,
          width: '100%',
          maxWidth: 640,
          height: 220,
          border: '1px solid var(--ink-33)',
          background: 'var(--paper2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}
      >
        plate forthcoming
      </div>
    </main>
  )
}
