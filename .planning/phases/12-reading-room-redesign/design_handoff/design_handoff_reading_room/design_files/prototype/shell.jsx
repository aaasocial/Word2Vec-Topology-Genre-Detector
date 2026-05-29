// Reading Room — design tokens, frame, masthead, footnote system,
// and a tiny client-side router that drives screen switching.

// ────────────────────────────────────────────────────────────────
// Design tokens (derived from current Tweak state — see app.jsx)
// ────────────────────────────────────────────────────────────────

window.RR_PALETTES = {
  cream:     { paper: '#F2EDE0', paper2: '#E9E3D2', card: '#FAF6EC', ink: '#26211B', muted: '#736B5E' },
  bone:      { paper: '#F5F1E6', paper2: '#EBE6D7', card: '#FCF8EE', ink: '#1E1A14', muted: '#6E665A' },
  ivory:     { paper: '#F8F4E9', paper2: '#EFEADC', card: '#FFFBF1', ink: '#1A1814', muted: '#7A7165' },
  newsprint: { paper: '#EDE9DC', paper2: '#E2DCCB', card: '#F6F1E2', ink: '#231F18', muted: '#6F6857' },
};

window.RR_ACCENTS = {
  oxblood:    '#8B3B2B',
  libgreen:   '#3F6B4D',
  ink:        '#26211B',
  prussian:   '#274060',
};

// ────────────────────────────────────────────────────────────────
// Frame + masthead
// ────────────────────────────────────────────────────────────────

function RRFrame({ palette, accent, children, hideMasthead }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: palette.paper,
      color: palette.ink,
      fontFamily: 'Spectral, Georgia, serif',
      position: 'relative',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>{children}</div>
  );
}

function RRMasthead({ palette, accent, section, goTo, hasUpload, openGuide }) {
  const items = [
    { id: 'collection', label: 'The Collection' },
    { id: 'topology',   label: 'Topology' },
    { id: 'study',      label: 'A Comparative Study' },
    { id: 'upload',     label: 'Submit a Text' },
    { id: 'about',      label: 'About' },
  ];
  return (
    <header style={{
      padding: '14px 32px',
      borderBottom: `2px solid ${palette.ink}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: palette.paper,
      flexShrink: 0,
    }}>
      <button onClick={() => goTo('landing')} style={{
        all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: 14,
      }}>
        <span style={{ fontFamily: 'Spectral, serif', fontWeight: 600, fontSize: 18, letterSpacing: '0.04em' }}>
          Literary Genre Topology
        </span>
      </button>
      <nav style={{ display: 'flex', gap: 24, fontFamily: 'Spectral, serif', fontSize: 14, whiteSpace: 'nowrap', flexShrink: 0, alignItems: 'center' }}>
        {items.map(it => (
          <button key={it.id} onClick={() => goTo(it.id)} style={{
            all: 'unset', cursor: 'pointer',
            borderBottom: it.id === section ? `2px solid ${accent}` : '2px solid transparent',
            paddingBottom: 3,
            color: it.id === section ? palette.ink : palette.muted,
            fontStyle: it.id === section ? 'normal' : 'italic',
          }}>{it.label}</button>
        ))}
        {hasUpload && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            color: accent, paddingBottom: 3,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
            unread reading
          </span>
        )}
        <button onClick={openGuide} title="Newcomer's guide & how it works" style={{
          all: 'unset', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '3px 10px',
          border: `1px solid ${palette.ink}55`,
          fontFamily: 'Spectral, serif', fontStyle: 'italic',
          fontSize: 13, color: palette.ink,
        }}>
          <span style={{
            display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
            border: `1px solid ${palette.ink}`, textAlign: 'center', lineHeight: '14px',
            fontFamily: 'Spectral, serif', fontStyle: 'italic', fontWeight: 500, fontSize: 11,
          }}>?</span>
          Guide
        </button>
      </nav>
    </header>
  );
}

function RRFooter({ palette, left, center, right }) {
  return (
    <footer style={{
      padding: '10px 32px',
      borderTop: `1px solid ${palette.ink}`,
      display: 'flex', justifyContent: 'space-between',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: palette.muted,
      flexShrink: 0,
    }}>
      <span>{left}</span>
      <span>{center}</span>
      <span>{right}</span>
    </footer>
  );
}

function RRLabel({ children, palette, color }) {
  return (
    <div style={{
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 9.5,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color: color || palette.muted,
    }}>{children}</div>
  );
}

// ────────────────────────────────────────────────────────────────
// Footnote system — click any <Footnote n=…> to open the note.
// Notes live in a context keyed by n.
// ────────────────────────────────────────────────────────────────

const FootnoteCtx = React.createContext({ open: null, setOpen: () => {} });

function Footnote({ n, accent }) {
  const { setOpen } = React.useContext(FootnoteCtx);
  return (
    <sup
      onClick={(e) => { e.stopPropagation(); setOpen(String(n)); }}
      style={{
        color: accent || '#8B3B2B',
        cursor: 'pointer',
        fontFamily: 'Spectral, serif',
        fontWeight: 600,
        padding: '0 1px',
      }}
    >{n}</sup>
  );
}

function FootnoteHost({ children, notes, palette, accent }) {
  const [open, setOpen] = React.useState(null);
  const note = open ? notes[open] : null;
  return (
    <FootnoteCtx.Provider value={{ open, setOpen }}>
      {children}
      {note && (
        <div
          onClick={() => setOpen(null)}
          style={{
            position: 'absolute', inset: 0, zIndex: 50,
            background: 'rgba(38,33,27,0.32)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 40,
          }}>
          <article
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 480, width: '100%',
              background: palette.card,
              border: `1px solid ${palette.ink}`,
              padding: '24px 28px 22px',
              boxShadow: `6px 6px 0 ${palette.ink}33`,
              fontFamily: 'Spectral, serif', color: palette.ink,
            }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                letterSpacing: '0.18em', textTransform: 'uppercase', color: palette.muted,
              }}>Footnote · {open}</div>
              <button onClick={() => setOpen(null)} style={{
                all: 'unset', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11, color: palette.muted, letterSpacing: '0.1em',
              }}>close ×</button>
            </div>
            <h4 style={{
              fontFamily: 'Spectral, serif', fontStyle: 'italic',
              fontWeight: 500, fontSize: 18, margin: '8px 0 12px',
              lineHeight: 1.25,
            }}>{note.title}</h4>
            <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>{note.body}</div>
          </article>
        </div>
      )}
    </FootnoteCtx.Provider>
  );
}

Object.assign(window, {
  RRFrame, RRMasthead, RRFooter, RRLabel, Footnote, FootnoteHost,
});
