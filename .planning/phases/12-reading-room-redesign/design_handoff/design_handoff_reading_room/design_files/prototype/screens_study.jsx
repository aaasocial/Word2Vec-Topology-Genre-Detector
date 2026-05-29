// Reading Room — Comparative Study screen.
// Two regions, side by side, with a shared-vocabulary binding in the middle.

function GenrePicker({ palette, accent, value, onChange, side }) {
  const [open, setOpen] = React.useState(false);
  const g = GENRES.find(gg => gg.id === value);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        all: 'unset', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '4px 10px',
        border: `1px solid ${palette.ink}33`,
        background: palette.card,
        fontFamily: 'Spectral, serif', fontSize: 13.5,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.hex }} />
        <span>{g.label}</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: palette.muted, marginLeft: 4 }}>▾</span>
      </button>
      {open && (
        <ul style={{
          position: 'absolute', top: 'calc(100% + 4px)',
          [side === 'right' ? 'right' : 'left']: 0,
          zIndex: 10,
          listStyle: 'none', padding: 6, margin: 0,
          background: palette.card, border: `1px solid ${palette.ink}`,
          boxShadow: `4px 4px 0 ${palette.ink}22`,
          minWidth: 180,
        }}>
          {GENRES.map(gg => (
            <li key={gg.id}>
              <button onClick={() => { onChange(gg.id); setOpen(false); }} style={{
                all: 'unset', cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: 8, padding: '6px 8px', width: '100%',
                background: gg.id === value ? palette.paper2 : 'transparent',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: gg.hex }} />
                <span style={{ fontFamily: 'Spectral, serif', fontSize: 13 }}>{gg.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Study({ palette, accent, goTo, state, dispatch, openGuide }) {
  const a = GENRES.find(g => g.id === state.studyA);
  const b = GENRES.find(g => g.id === state.studyB);
  const booksA = window.BOOKS.filter(book => book.g === a.id);
  const booksB = window.BOOKS.filter(book => book.g === b.id);

  // Faux-curated word lists for distinctiveness/overlap.
  // (In a real product these'd be computed; here we hand-author for narrative.)
  const wordTables = {
    'mystery|romance': {
      onlyA: ['inspector','clue','alibi','footstep','suspect','witness','testimony','vault','cipher'],
      shared: ['letter','silence','hand','room','glance','window','answer','wait','strange','heart'],
      onlyB: ['lover','beloved','rose','kiss','promise','dance','vow','rapture','blush'],
      essay: <>The two regions share more than reviewers might expect. <em>Letters</em> and <em>silences</em> appear in both — the lover’s telegram and the detective’s — but the verbs around them differ. Mystery <em>opens</em> them; Romance <em>holds</em> them.</>,
    },
    'gothic|literary': {
      onlyA: ['ghost','crypt','spectre','moor','undead','tomb','candle','dread'],
      shared: ['house','mother','parish','letter','window','silence','sister','room','reader','garden'],
      onlyB: ['vocation','provincial','marriage','study','reform','reader','parish'],
      essay: <>Gothic and Literary share their architecture — houses, parishes, the domestic stage — but diverge in what walks the halls. Gothic adds an inhabitant from outside the frame; Literary keeps the frame.</>,
    },
    'adventure|western': {
      onlyA: ['schooner','treasure','island','elephant','spear','musket','sextant','sail'],
      shared: ['horse','rifle','camp','stranger','river','trail','stars','dawn','smoke','wound'],
      onlyB: ['cowpuncher','rustler','sage','rim','herd','colt','ranch','remuda','sheriff'],
      essay: <>Both are open-air. Both ride. But Adventure ships out — schooner, sextant — while the Western rides in, finds the same range it left.</>,
    },
  };
  // pick the right table (alphabetised key), or fall back to a generic shape
  const key1 = `${a.id}|${b.id}`;
  const key2 = `${b.id}|${a.id}`;
  let tbl = wordTables[key1];
  if (!tbl && wordTables[key2]) {
    const r = wordTables[key2];
    tbl = { onlyA: r.onlyB, shared: r.shared, onlyB: r.onlyA, essay: r.essay };
  }
  if (!tbl) {
    tbl = {
      onlyA: ['—','—','—','—'],
      shared: ['letter','silence','hand','room','glance','window','wait'],
      onlyB: ['—','—','—','—'],
      essay: <>This pair has not been studied yet. The shared vocabulary listed below is provisional and may revise as the corpus grows.</>,
    };
  }

  return (
    <RRFrame palette={palette} accent={accent}>
      <RRMasthead palette={palette} accent={accent} section="study" goTo={goTo} hasUpload={state.hasUploadedText} openGuide={openGuide} />

      <div style={{
        flex: 1, padding: '24px 36px 18px',
        display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0,
      }}>
        {/* Title bar with two pickers */}
        <div style={{ textAlign: 'center' }}>
          <RRLabel palette={palette}>A comparative study</RRLabel>
          <h2 data-tour-id="study-pickers" style={{
            fontFamily: 'Spectral, serif', fontWeight: 500, fontSize: 28,
            letterSpacing: '-0.005em', margin: '8px 0 4px',
            display: 'inline-flex', alignItems: 'center', gap: 14,
          }}>
            <GenrePicker palette={palette} accent={accent} value={a.id} side="left"
              onChange={(id) => dispatch({ type: 'setStudy', side: 'A', id })} />
            <span style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 22, color: palette.muted }}>&amp;</span>
            <GenrePicker palette={palette} accent={accent} value={b.id} side="right"
              onChange={(id) => dispatch({ type: 'setStudy', side: 'B', id })} />
          </h2>
          <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 13, color: palette.muted, marginTop: 2 }}>
            On what these regions share, and where they part company.
          </div>
        </div>

        {/* Three-column folio */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 260px 1fr', gap: 0, minHeight: 0 }}>
          {/* Left folio */}
          <section style={{ borderRight: `1px solid ${palette.ink}33`, paddingRight: 22, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: a.hex }} />
              <span style={{ fontFamily: 'Spectral, serif', fontWeight: 500, fontSize: 16 }}>{a.label}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: palette.muted, marginLeft: 'auto' }}>
                {booksA.length} books
              </span>
            </div>
            <div style={{ flex: 1, position: 'relative', background: palette.card, border: `1px solid ${palette.ink}`, minHeight: 0 }}>
              <ScatterPlaceholder width={360} height={300} seed={3} density={160} pointSize={2.4} opacity={0.85}
                highlightGenre={a.id} dimOthers />
            </div>
            <div>
              <RRLabel palette={palette}>Only in {a.label}</RRLabel>
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {tbl.onlyA.map(w => (
                  <span key={w} style={{ padding: '2px 7px', border: `0.5px solid ${a.hex}`, color: a.hex, fontStyle: 'italic', fontSize: 11.5 }}>{w}</span>
                ))}
              </div>
            </div>
          </section>

          {/* Center: shared binding */}
          <section style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
            <div style={{ textAlign: 'center' }}>
              <RRLabel palette={palette}>what they share</RRLabel>
            </div>
            <div style={{
              flex: 1, position: 'relative',
              background: palette.card, border: `1px solid ${palette.ink}`,
              minHeight: 0, padding: 14,
            }}>
              {/* Venn-style two-circle motif */}
              <svg viewBox="0 0 220 220" style={{ width: '100%', height: 'auto', maxHeight: 200 }}>
                <circle cx="86" cy="110" r="68" fill={a.hex} fillOpacity="0.18" stroke={a.hex} strokeWidth="1" />
                <circle cx="134" cy="110" r="68" fill={b.hex} fillOpacity="0.18" stroke={b.hex} strokeWidth="1" />
                <text x="50" y="60" fontSize="9" fontFamily="JetBrains Mono, monospace" letterSpacing="0.12em" textAnchor="middle" fill={a.hex}>{a.label.toUpperCase()}</text>
                <text x="170" y="60" fontSize="9" fontFamily="JetBrains Mono, monospace" letterSpacing="0.12em" textAnchor="middle" fill={b.hex}>{b.label.toUpperCase()}</text>
                <text x="110" y="115" fontSize="11" fontFamily="Spectral, serif" fontStyle="italic" textAnchor="middle" fill={palette.ink}>shared</text>
                <text x="110" y="130" fontSize="9" fontFamily="JetBrains Mono, monospace" textAnchor="middle" fill={palette.muted}>{tbl.shared.length} terms</text>
              </svg>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                {tbl.shared.map(w => (
                  <span key={w} style={{
                    padding: '2px 7px', border: `0.5px solid ${palette.ink}55`,
                    fontStyle: 'italic', fontSize: 11.5, color: palette.ink, background: palette.paper,
                  }}>{w}</span>
                ))}
              </div>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: palette.muted, textAlign: 'center' }}>
              ε ∈ [0, 0.6]
            </div>
          </section>

          {/* Right folio */}
          <section style={{ borderLeft: `1px solid ${palette.ink}33`, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: b.hex }} />
              <span style={{ fontFamily: 'Spectral, serif', fontWeight: 500, fontSize: 16 }}>{b.label}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: palette.muted, marginLeft: 'auto' }}>
                {booksB.length} books
              </span>
            </div>
            <div style={{ flex: 1, position: 'relative', background: palette.card, border: `1px solid ${palette.ink}`, minHeight: 0 }}>
              <ScatterPlaceholder width={360} height={300} seed={8} density={160} pointSize={2.4} opacity={0.85}
                highlightGenre={b.id} dimOthers />
            </div>
            <div>
              <RRLabel palette={palette}>Only in {b.label}</RRLabel>
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {tbl.onlyB.map(w => (
                  <span key={w} style={{ padding: '2px 7px', border: `0.5px solid ${b.hex}`, color: b.hex, fontStyle: 'italic', fontSize: 11.5 }}>{w}</span>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Editorial */}
        <div style={{
          paddingTop: 12, borderTop: `1px solid ${palette.ink}33`,
          display: 'grid', gridTemplateColumns: '120px 1fr', gap: 18, alignItems: 'baseline',
        }}>
          <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 15 }}>Editor’s note</div>
          <p style={{ fontSize: 13.5, lineHeight: 1.7, margin: 0, maxWidth: 880 }}>
            {tbl.essay} <Footnote n="3" accent={accent} />
          </p>
        </div>
      </div>

      <RRFooter
        palette={palette}
        left="A comparative study"
        center={`${a.label} & ${b.label}`}
        right="p. 5"
      />
    </RRFrame>
  );
}

Object.assign(window, { Study });
