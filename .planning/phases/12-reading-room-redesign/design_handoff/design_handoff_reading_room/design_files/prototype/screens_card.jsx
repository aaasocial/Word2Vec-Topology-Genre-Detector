// Reading Room — Card screen. Shown when a book is selected.

function distance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function nearestNeighbours(book, n = 5) {
  return window.BOOKS
    .filter(b => b.id !== book.id)
    .map(b => ({ b, d: distance(book, b) }))
    .sort((a, c) => a.d - c.d)
    .slice(0, n);
}

function Card({ palette, accent, goTo, state, dispatch, density, openGuide }) {
  const book = window.BOOKS.find(b => b.id === state.selectedBookId) || window.BOOKS[0];
  const genre = GENRES.find(g => g.id === book.g);
  const neighbours = nearestNeighbours(book, 5);
  // for fig leader-lines we use the closer 4
  const leaderLabels = ['a','b','c','d'];
  const studyMode = density === 'study';

  return (
    <RRFrame palette={palette} accent={accent}>
      <RRMasthead palette={palette} accent={accent} section="collection" goTo={goTo} hasUpload={state.hasUploadedText} openGuide={openGuide} />

      {/* breadcrumb */}
      <div style={{
        padding: '10px 32px', borderBottom: `1px solid ${palette.ink}33`,
        fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 13, color: palette.muted,
        display: 'flex', alignItems: 'baseline', gap: 8,
      }}>
        <button onClick={() => goTo('collection')} style={{ all: 'unset', cursor: 'pointer' }}>The Collection</button>
        <span style={{ color: palette.muted }}>›</span>
        <button onClick={() => { dispatch({ type: 'setGenre', genre: book.g }); goTo('collection'); }} style={{ all: 'unset', cursor: 'pointer' }}>{genre.label}</button>
        <span style={{ color: palette.muted }}>›</span>
        <span style={{ color: palette.ink, fontStyle: 'normal' }}>{book.t}</span>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: studyMode ? '1fr 340px' : '260px 1fr 340px', minHeight: 0 }}>
        {/* Left rail: region siblings — hidden in study density */}
        {!studyMode && (
        <aside style={{
          padding: '22px 18px', borderRight: `1px solid ${palette.ink}33`,
          background: palette.paper2, overflowY: 'auto',
        }}>
          <RRLabel palette={palette}>You are reading</RRLabel>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: genre.hex }} />
            <span style={{ fontFamily: 'Spectral, serif', fontWeight: 600, fontSize: 14 }}>{genre.label}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: palette.muted, marginLeft: 'auto' }}>
              {window.BOOKS.filter(b => b.g === book.g).length} books
            </span>
          </div>
          <div style={{ marginTop: 4, fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 12.5, color: palette.muted }}>
            {window.GENRE_DESC[book.g]}
          </div>
          <ul style={{ listStyle: 'none', padding: '14px 0 0', margin: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {window.BOOKS.filter(b => b.g === book.g).map(b => {
              const isSel = b.id === book.id;
              return (
                <li key={b.id}>
                  <button onClick={() => dispatch({ type: 'pickBook', id: b.id })} style={{
                    all: 'unset', cursor: 'pointer',
                    display: 'block', width: '100%',
                    padding: '6px 10px', marginLeft: -10,
                    background: isSel ? palette.card : 'transparent',
                    borderLeft: isSel ? `2px solid ${accent}` : '2px solid transparent',
                    fontFamily: 'Spectral, serif', fontSize: 13,
                    fontStyle: isSel ? 'normal' : 'italic',
                    color: isSel ? palette.ink : palette.muted,
                    fontWeight: isSel ? 500 : 400,
                  }}>{b.t}</button>
                </li>
              );
            })}
          </ul>
        </aside>
        )}

        {/* Center: dimmed plate with focus on selected */}
        <main style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          <RRLabel palette={palette}>Catalog entry · Plate I · detail</RRLabel>

          <figure style={{
            flex: 1, margin: 0,
            background: palette.card, border: `1px solid ${palette.ink}`,
            position: 'relative', minHeight: 0,
          }}>
            <CorpusScatter
              width={620} height={520}
              palette={palette} accent={accent}
              highlightGenre={book.g}
              selectedId={book.id}
              hoveredId={state.hoveredBookId}
              onHover={(id) => dispatch({ type: 'hoverBook', id })}
              onPick={(id) => dispatch({ type: 'pickBook', id })}
            />
            {/* leader labels for the 4 closest neighbours */}
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} viewBox="0 0 620 520">
              {neighbours.slice(0, 4).map((n, i) => (
                <line key={n.b.id}
                  x1={book.x * 620} y1={book.y * 520}
                  x2={n.b.x * 620} y2={n.b.y * 520}
                  stroke={accent} strokeWidth="0.7" strokeOpacity="0.55"
                  strokeDasharray="2 3"
                />
              ))}
            </svg>
            {neighbours.slice(0, 4).map((n, i) => (
              <div key={n.b.id} style={{
                position: 'absolute',
                left: `calc(${n.b.x * 100}% + 10px)`,
                top: `calc(${n.b.y * 100}% - 9px)`,
                fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 11.5,
                color: palette.ink, background: palette.card,
                padding: '0 4px',
                pointerEvents: 'none',
              }}>
                <sup style={{ color: accent, fontStyle: 'normal' }}>{leaderLabels[i]}</sup>&nbsp;{n.b.t}
              </div>
            ))}
            {/* selected book label */}
            <div style={{
              position: 'absolute',
              left: `calc(${book.x * 100}% + 12px)`,
              top: `calc(${book.y * 100}% + 8px)`,
              fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 13.5,
              color: palette.ink,
              pointerEvents: 'none',
            }}>{book.t}</div>
          </figure>

          <figcaption style={{
            fontFamily: 'Spectral, serif', fontStyle: 'italic',
            fontSize: 12.5, color: palette.muted, lineHeight: 1.55,
          }}>
            fig. 2 — <em>{book.t}</em> and its immediate neighbourhood in the embedding.
            <Footnote n="2" accent={accent} />
          </figcaption>
        </main>

        {/* Right: catalog card */}
        <aside style={{
          padding: '24px 22px', borderLeft: `1px solid ${palette.ink}33`,
          display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto',
        }}>
          <RRLabel palette={palette}>Catalog card · {String(window.BOOKS.indexOf(book) + 1).padStart(3, '0')}</RRLabel>
          <div data-tour-id="catalog-card" style={{
            background: palette.card, border: `1px solid ${palette.ink}`,
            borderTop: `4px double ${palette.ink}`,
            padding: '18px 18px 20px',
            fontFamily: 'Spectral, serif', position: 'relative',
            boxShadow: `4px 4px 0 ${palette.ink}22`,
          }}>
            {/* punch hole */}
            <div style={{
              position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
              width: 10, height: 10, borderRadius: '50%',
              background: palette.paper2, border: `0.5px solid ${palette.ink}55`,
            }} />
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: palette.muted, letterSpacing: '0.1em' }}>
              {book.call}
            </div>
            <div style={{ marginTop: 10, fontSize: 24, fontWeight: 500, lineHeight: 1.05, letterSpacing: '-0.005em' }}>
              {book.t}
            </div>
            <div style={{ marginTop: 8, fontSize: 13, fontStyle: 'italic', color: palette.muted }}>
              {book.a} · {book.y}
            </div>
            <hr style={{ border: 0, borderTop: `1px solid ${palette.ink}33`, margin: '12px 0' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '78px 1fr', rowGap: 4, fontSize: 12.5 }}>
              <span style={{ color: palette.muted }}>Genre</span>
              <span>
                <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: genre.hex, marginRight: 6 }} />
                {genre.label}
              </span>
              <span style={{ color: palette.muted }}>Words</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{book.words.toLocaleString()}</span>
              <span style={{ color: palette.muted }}>Vocab</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{book.vocab.toLocaleString()}</span>
              <span style={{ color: palette.muted }}>UMAP-x</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{(book.x * 2 - 1).toFixed(3)}</span>
              <span style={{ color: palette.muted }}>UMAP-y</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{(book.y * 2 - 1).toFixed(3)}</span>
            </div>
            <hr style={{ border: 0, borderTop: `1px solid ${palette.ink}33`, margin: '12px 0' }} />
            <div style={{ fontSize: 11.5, fontStyle: 'italic', color: palette.muted, lineHeight: 1.55 }}>
              <strong style={{ fontStyle: 'normal', color: palette.ink, fontWeight: 500 }}>See also</strong> —{' '}
              {neighbours.slice(0, 4).map((n, i) => (
                <React.Fragment key={n.b.id}>
                  {i > 0 && ' · '}
                  <sup style={{ color: accent, fontStyle: 'normal' }}>{leaderLabels[i]}</sup>&nbsp;
                  <button onClick={() => dispatch({ type: 'pickBook', id: n.b.id })} style={{
                    all: 'unset', cursor: 'pointer', fontStyle: 'italic', color: palette.ink,
                    textDecorationLine: 'underline', textDecorationStyle: 'dotted', textDecorationColor: palette.muted,
                  }}>{n.b.t}</button>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div>
            <RRLabel palette={palette}>Driving vocabulary</RRLabel>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {book.kw.map(w => (
                <span key={w} style={{ padding: '2px 8px', border: `0.5px solid ${palette.ink}`, fontSize: 11.5, fontStyle: 'italic' }}>{w}</span>
              ))}
            </div>
          </div>

          <div>
            <RRLabel palette={palette}>Five nearest</RRLabel>
            <ol style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {neighbours.map((n) => {
                const ng = GENRES.find(g => g.id === n.b.g);
                return (
                  <li key={n.b.id} style={{ display: 'grid', gridTemplateColumns: '12px 1fr auto', gap: 8, alignItems: 'baseline', fontSize: 12.5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: ng.hex, marginTop: 4 }} />
                    <button onClick={() => dispatch({ type: 'pickBook', id: n.b.id })} style={{
                      all: 'unset', cursor: 'pointer',
                      fontStyle: 'italic',
                    }}>
                      {n.b.t} <span style={{ color: palette.muted, fontStyle: 'normal' }}>· {n.b.a}</span>
                    </button>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: palette.muted }}>{n.d.toFixed(3)}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>

      <RRFooter
        palette={palette}
        left={`The Collection › ${genre.label}`}
        center={`${book.t} · ${book.a} · ${book.y}`}
        right="p. 4"
      />
    </RRFrame>
  );
}

Object.assign(window, { Card });
