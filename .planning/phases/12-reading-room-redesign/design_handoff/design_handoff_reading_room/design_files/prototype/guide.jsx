// Reading Room — Newcomer's Guide & How it works.
// A slide-in side sheet from the right. Three tabs:
//   1. Welcome — what this is
//   2. How to wander — 3-step tour, action-oriented
//   3. How it works — the method (centroid + topology + UMAP)
// Auto-opens once on first visit; persisted via localStorage.

const GUIDE_SEEN_KEY = 'rr.guide.seen.v1';

function Guide({ open, onClose, palette, accent, goTo, dispatch }) {
  const [tab, setTab] = React.useState('welcome');
  // Reset tab when the guide is reopened
  React.useEffect(() => { if (open) setTab('welcome'); }, [open]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 40,
        background: 'rgba(38,33,27,0.34)',
        display: 'flex', justifyContent: 'flex-end',
      }}>
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480, height: '100%',
          background: palette.paper,
          borderLeft: `1px solid ${palette.ink}`,
          boxShadow: `-14px 0 40px rgba(0,0,0,0.18)`,
          display: 'flex', flexDirection: 'column',
          fontFamily: 'Spectral, Georgia, serif',
        }}>
        {/* Header */}
        <header style={{
          padding: '18px 24px 14px',
          borderBottom: `1px solid ${palette.ink}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5,
              letterSpacing: '0.2em', textTransform: 'uppercase', color: palette.muted,
            }}>Reader’s aid</div>
            <h2 style={{
              fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 22,
              fontWeight: 500, margin: '4px 0 0',
            }}>The Guide</h2>
          </div>
          <button onClick={onClose} style={{
            all: 'unset', cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
            letterSpacing: '0.1em', color: palette.muted,
          }}>close ×</button>
        </header>

        {/* Tabs */}
        <nav style={{
          display: 'flex', gap: 0,
          borderBottom: `1px solid ${palette.ink}33`,
          flexShrink: 0,
        }}>
          {[
            { id: 'welcome',   label: 'Welcome',         num: '01' },
            { id: 'wander',    label: 'How to wander',   num: '02' },
            { id: 'method',    label: 'How it works',    num: '03' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              all: 'unset', cursor: 'pointer',
              flex: 1, padding: '10px 12px',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
              borderBottom: t.id === tab ? `2px solid ${accent}` : '2px solid transparent',
              marginBottom: -1,
              background: t.id === tab ? palette.paper : palette.paper2,
            }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                letterSpacing: '0.18em', color: palette.muted,
              }}>{t.num}</span>
              <span style={{
                fontFamily: 'Spectral, serif',
                fontStyle: t.id === tab ? 'italic' : 'normal',
                fontWeight: t.id === tab ? 500 : 400,
                fontSize: 14, color: t.id === tab ? palette.ink : palette.muted,
              }}>{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Body — scrolls within the sheet */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px 26px' }}>
          {tab === 'welcome' && (
            <WelcomePanel palette={palette} accent={accent} setTab={setTab} />
          )}
          {tab === 'wander' && (
            <WanderPanel palette={palette} accent={accent} goTo={goTo} onClose={onClose} dispatch={dispatch} />
          )}
          {tab === 'method' && (
            <MethodPanel palette={palette} accent={accent} />
          )}
        </div>

        {/* Footer */}
        <footer style={{
          padding: '10px 24px',
          borderTop: `1px solid ${palette.ink}33`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            letterSpacing: '0.12em', color: palette.muted,
          }}>this guide is always here · {tab === 'welcome' ? '01' : tab === 'wander' ? '02' : '03'} / 03</span>
          <button onClick={onClose} style={{
            all: 'unset', cursor: 'pointer',
            padding: '5px 14px', background: palette.ink, color: palette.paper,
            fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 13,
          }}>{tab === 'method' ? 'Enter the room →' : 'Continue'}</button>
        </footer>
      </aside>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Panel 01 — Welcome
// ───────────────────────────────────────────────────────────────
function WelcomePanel({ palette, accent, setTab }) {
  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <h3 style={{
        fontFamily: 'Spectral, serif', fontWeight: 500, fontSize: 30,
        letterSpacing: '-0.01em', lineHeight: 1.1, margin: 0,
      }}>
        A library of <span style={{ fontStyle: 'italic' }}>122 novels,</span><br />
        arranged by what they say.
      </h3>
      <p style={{ fontSize: 14.5, lineHeight: 1.7, margin: 0 }}>
        This is a small reading room sitting on top of a word2vec embedding. Each book
        in the corpus has been read into the embedding; books with overlapping
        vocabularies sit near one another on the plate.
      </p>
      <div style={{
        background: palette.card, border: `1px solid ${palette.ink}33`,
        padding: '14px 16px',
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5,
          letterSpacing: '0.18em', textTransform: 'uppercase', color: palette.muted, marginBottom: 8,
        }}>You can do three things here</div>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['Wander', 'browse the plate, hover any book, open its card.'],
            ['Compare', 'pick two regions to see what their vocabularies share.'],
            ['Submit', 'paste a passage and receive a written reading of it.'],
          ].map(([h, b]) => (
            <li key={h} style={{ display: 'grid', gridTemplateColumns: '78px 1fr', gap: 12, alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 15, color: accent }}>{h}</span>
              <span style={{ fontSize: 13.5, lineHeight: 1.55, color: palette.ink }}>{b}</span>
            </li>
          ))}
        </ol>
      </div>
      <p style={{ fontSize: 13.5, lineHeight: 1.7, margin: 0, fontStyle: 'italic', color: palette.muted }}>
        The room is small on purpose. Read the next tab for a short tour, or the third
        for the method behind the placements.
      </p>
      <button onClick={() => setTab('wander')} style={{
        all: 'unset', cursor: 'pointer', alignSelf: 'flex-start',
        padding: '8px 16px', border: `1px solid ${accent}`, color: accent,
        fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 14,
      }}>How to wander →</button>
    </article>
  );
}

// ───────────────────────────────────────────────────────────────
// Panel 02 — How to wander (action-oriented; buttons jump in-room)
// ───────────────────────────────────────────────────────────────
function WanderPanel({ palette, accent, goTo, onClose, dispatch }) {
  const itinerary = [
    ['01', 'The plate', 'Hover any book; like sits by like.'],
    ['02', 'The catalog rail', 'Filter the corpus down to one region.'],
    ['03', 'A catalog card', 'Open a book — neighbours, vocabulary, shelfmark.'],
    ['04', 'A region’s topology', 'Watch its loops form as the radius grows.'],
    ['05', 'A comparative study', 'Set two regions against each other.'],
    ['06', 'Submit a text', 'Place your own manuscript on the desk.'],
  ];
  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <p style={{ fontSize: 14.5, lineHeight: 1.7, margin: 0 }}>
        The fastest way in is the <em>guided tour</em>. It walks you through the room
        itself — moving between screens and lighting up each part in turn — rather than
        describing it from the sidelines. Five short stops; leave whenever you like.
      </p>

      <button
        onClick={() => dispatch({ type: 'startTour' })}
        style={{
          all: 'unset', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          background: palette.ink, color: palette.paper,
          fontFamily: 'Spectral, serif',
        }}>
        <span>
          <span style={{ fontStyle: 'italic', fontSize: 17 }}>Begin the guided tour</span>
          <span style={{
            display: 'block', marginTop: 2,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5,
            letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.7,
          }}>6 stops · ~2 minutes · skippable</span>
        </span>
        <span style={{ fontSize: 20, fontStyle: 'italic', fontFamily: 'Spectral, serif' }}>→</span>
      </button>

      <div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5,
          letterSpacing: '0.18em', textTransform: 'uppercase', color: palette.muted, marginBottom: 8,
        }}>The itinerary</div>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {itinerary.map(([n, h, b]) => (
            <li key={n} style={{
              display: 'grid', gridTemplateColumns: '30px 1fr', gap: 12,
              padding: '11px 0', alignItems: 'baseline',
              borderBottom: `0.5px dotted ${palette.ink}33`,
            }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: accent }}>{n}</span>
              <div>
                <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 15 }}>{h}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: palette.muted }}>{b}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p style={{ fontSize: 13, lineHeight: 1.65, margin: 0, fontStyle: 'italic', color: palette.muted }}>
        Prefer to wander unaccompanied? Close the guide and explore — every screen is
        reachable from the masthead, and this guide is always one click away.
      </p>
    </article>
  );
}

// ───────────────────────────────────────────────────────────────
// Panel 03 — How it works (method)
// ───────────────────────────────────────────────────────────────
function MethodPanel({ palette, accent }) {
  const Step = ({ n, h, fig, children }) => (
    <li style={{
      padding: '16px 0',
      borderBottom: `0.5px dotted ${palette.ink}33`,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 14 }}>
        <span style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 28, color: accent, lineHeight: 1 }}>{n}</span>
        <div>
          <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 15.5, marginBottom: 4 }}>{h}</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.65 }}>{children}</div>
        </div>
      </div>
      {fig && <div style={{ marginTop: 12 }}>{fig}</div>}
    </li>
  );
  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FigKeyframes />
      <p style={{ fontSize: 14.5, lineHeight: 1.7, margin: 0 }}>
        Every novel is reduced to two readings of itself — a <em>position</em> and a
        <em> shape</em> — and then placed on the plate. Submitted texts go through the
        same pipeline. The little plates below are live — they redraw as you read.
      </p>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        <Step n="i" h="Tokenise & vectorise the corpus."
          fig={<FigWordEmbed palette={palette} accent={accent} />}>
          The 122 novels are read into a word2vec embedding of dimension 300, trained
          on the corpus itself with a window of 15 tokens. Words used in similar company
          settle near one another.
        </Step>
        <Step n="ii" h="Position — the centroid track."
          fig={<FigCentroid palette={palette} accent={accent} />}>
          A book’s <em>position</em> is the inverse-frequency-weighted mean of its word
          vectors — the marked point below. This carries the bulk of the signal, about <span style={{
            fontFamily: 'JetBrains Mono, monospace', background: palette.card,
            padding: '0 4px', border: `0.5px solid ${palette.ink}33`,
          }}>0.76</span> of a typical verdict.
        </Step>
        <Step n="iii" h="Shape — the topology track."
          fig={<FigTopology palette={palette} accent={accent} />}>
          A book’s <em>shape</em> is the persistent homology of its vocabulary’s pairwise
          distances. As the radius grows, edges form and loops are born; the long-lived
          ones become the book’s signature. This catches the close calls.
        </Step>
        <Step n="iv" h="Project to the plane."
          fig={<FigProjection palette={palette} accent={accent} />}>
          To draw a plate, we project the 300-dimensional positions to two dimensions via
          UMAP. The plane preserves local neighbourhoods; it distorts global distance. You
          can swap the projection in the chip row on Collection.
        </Step>
        <Step n="v" h="Read & report."
          fig={<FigVerdict palette={palette} accent={accent} />}>
          A submitted text is run through (i) and then scored against each region’s
          centroid and topological signature. The verdict is the highest-scoring region,
          a confidence, and the five catalogued works closest to it.
        </Step>
      </ol>
      <div style={{
        marginTop: 4, padding: '12px 14px',
        background: palette.card, border: `1px solid ${palette.ink}33`,
        fontSize: 12.5, lineHeight: 1.6, fontStyle: 'italic', color: palette.muted,
      }}>
        Confidences below 0.80 are reported as <em>marginal</em>. Roughly a fifth of
        catalogued works receive a marginal reading on their own corpus — most novels
        sit close to a border, and the method tries to be honest about that.
      </div>
    </article>
  );
}

Object.assign(window, { Guide, GUIDE_SEEN_KEY });
