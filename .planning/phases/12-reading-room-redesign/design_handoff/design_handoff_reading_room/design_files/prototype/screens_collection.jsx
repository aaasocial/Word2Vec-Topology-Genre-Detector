// Reading Room — Collection screen (main scatter + catalog rail) + Card screen (book detail).

// ────────────────────────────────────────────────────────────────
// Interactive scatter — renders BOOKS as points; hover/click handlers.
// ────────────────────────────────────────────────────────────────
function CorpusScatter({
  width, height,
  palette, accent,
  highlightGenre, selectedId, hoveredId,
  onHover, onPick, dimOthers,
  density = 280, seed = 4,
}) {
  // background filler points (decoration only)
  const fillerPts = React.useMemo(
    () => generateScatter(seed, density, width, height),
    [seed, density, width, height]
  );
  return (
    <svg
      width={width} height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
      onMouseLeave={() => onHover && onHover(null)}
    >
      {/* axes */}
      <line x1="0" y1={height - 0.5} x2={width} y2={height - 0.5} stroke={palette.ink} strokeOpacity="0.18" />
      <line x1="0.5" y1="0" x2="0.5" y2={height} stroke={palette.ink} strokeOpacity="0.18" />

      {/* filler scatter (greys-out when filter active) */}
      {fillerPts.map((p, i) => {
        const g = GENRES[p.g];
        const op = highlightGenre ? (g.id === highlightGenre ? 0.5 : 0.08) : 0.55;
        return <circle key={`f${i}`} cx={p.x} cy={p.y} r="1.8" fill={g.hex} opacity={op} />;
      })}

      {/* the real catalogued books */}
      {window.BOOKS.map(b => {
        const g = GENRES.find(gg => gg.id === b.g);
        const isHi = !highlightGenre || b.g === highlightGenre;
        const isSel = b.id === selectedId;
        const isHov = b.id === hoveredId;
        const r = isSel || isHov ? 5.5 : 3.4;
        const op = isHi ? 1 : 0.15;
        return (
          <g key={b.id} style={{ cursor: 'pointer' }}
             onMouseEnter={() => onHover && onHover(b.id)}
             onClick={() => onPick && onPick(b.id)}>
            <circle cx={b.x * width} cy={b.y * height} r={r + 8} fill="transparent" />
            <circle cx={b.x * width} cy={b.y * height} r={r} fill={g.hex} opacity={op}
              stroke={isSel ? palette.ink : isHov ? palette.ink : 'none'}
              strokeWidth={isSel ? 1.2 : 0.8}
            />
            {isSel && (
              <circle cx={b.x * width} cy={b.y * height} r={11} fill="none"
                stroke={accent} strokeWidth="1.4" strokeDasharray="2 3" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Collection({ palette, accent, goTo, state, dispatch, density, openGuide }) {
  const { genreFilter, hoveredBookId, selectedBookId } = state;
  const hovered = window.BOOKS.find(b => b.id === hoveredBookId);
  const filteredGenre = GENRES.find(g => g.id === genreFilter);
  const studyMode = density === 'study';

  return (
    <RRFrame palette={palette} accent={accent}>
      <RRMasthead palette={palette} accent={accent} section="collection" goTo={goTo} hasUpload={state.hasUploadedText} openGuide={openGuide} />

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: studyMode ? '260px 1fr' : '260px 1fr 300px', minHeight: 0 }}>

        {/* ── Catalog rail (left) ─────────────────────────────── */}
        <aside data-tour-id="catalog-rail" style={{
          padding: '22px 18px',
          borderRight: `1px solid ${palette.ink}33`,
          background: palette.paper2,
          overflowY: 'auto',
        }}>
          <RRLabel palette={palette}>Card catalog</RRLabel>
          <div style={{ marginTop: 8, fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 13.5, color: palette.muted }}>
            Browse by genre.
          </div>

          <button
            onClick={() => dispatch({ type: 'setGenre', genre: null })}
            style={{
              all: 'unset', cursor: 'pointer', display: 'block',
              marginTop: 16, padding: '6px 0 6px 8px',
              borderLeft: !genreFilter ? `2px solid ${accent}` : '2px solid transparent',
              fontFamily: 'Spectral, serif', fontSize: 13.5,
              color: !genreFilter ? palette.ink : palette.muted,
              fontStyle: !genreFilter ? 'normal' : 'italic',
              width: '100%',
            }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: palette.muted, marginRight: 8 }}>00</span>
            All regions <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: palette.muted, marginLeft: 6 }}>{window.BOOKS.length}</span>
          </button>

          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {GENRES.map((g, i) => {
              const isActive = genreFilter === g.id;
              const booksInGenre = window.BOOKS.filter(b => b.g === g.id);
              return (
                <div key={g.id}>
                  <button
                    onClick={() => dispatch({ type: 'setGenre', genre: isActive ? null : g.id })}
                    style={{
                      all: 'unset', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '6px 0 6px 8px',
                      borderLeft: isActive ? `2px solid ${accent}` : '2px solid transparent',
                    }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: palette.muted, width: 18 }}>{String(i + 1).padStart(2, '0')}</span>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.hex, display: 'inline-block' }} />
                      <span style={{ fontWeight: isActive ? 600 : 400, color: isActive ? palette.ink : palette.muted }}>{g.label}</span>
                    </span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: palette.muted }}>{booksInGenre.length}</span>
                  </button>
                  {isActive && (
                    <ul style={{ listStyle: 'none', padding: '4px 0 6px 30px', margin: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {booksInGenre.map(b => (
                        <li key={b.id}>
                          <button onClick={() => { dispatch({ type: 'pickBook', id: b.id }); goTo('card'); }} style={{
                            all: 'unset', cursor: 'pointer',
                            fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 12.5,
                            color: palette.ink,
                          }}>{b.t}</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 22, paddingTop: 14, borderTop: `1px solid ${palette.ink}22` }}>
            <RRLabel palette={palette}>Find</RRLabel>
            <input
              placeholder="a word, a title…"
              style={{
                marginTop: 8, padding: '8px 10px',
                background: palette.card, border: `1px solid ${palette.ink}33`,
                fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 13,
                color: palette.ink, width: '100%', outline: 'none',
              }}
            />
          </div>
        </aside>

        {/* ── The plate (center) ──────────────────────────────── */}
        <main style={{ padding: '24px 32px 18px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <RRLabel palette={palette}>Plate I · {filteredGenre ? filteredGenre.label : 'The full collection'}</RRLabel>
              <h2 style={{ fontFamily: 'Spectral, serif', fontSize: 26, fontWeight: 500, letterSpacing: '-0.005em', margin: '6px 0 0' }}>
                {filteredGenre ? <>The region of <span style={{ fontStyle: 'italic', color: filteredGenre.hex }}>{filteredGenre.label}</span></> : <>The space of the corpus</>}
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 0 }}>
                {PROJECTIONS.map(p => {
                  const active = p === state.projection;
                  return (
                    <button key={p} onClick={() => dispatch({ type: 'setProjection', value: p })} style={{
                      all: 'unset', cursor: 'pointer',
                      padding: '5px 11px',
                      border: `1px solid ${palette.ink}55`,
                      marginLeft: -1,
                      background: active ? palette.ink : 'transparent',
                      color: active ? palette.paper : palette.ink,
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.04em',
                    }}>{p}</button>
                  );
                })}
              </div>
              <span style={{ width: 1, height: 18, background: `${palette.ink}33` }} />
              <div style={{ display: 'flex', gap: 0 }}>
                {['2D', '3D'].map(d => {
                  const active = d === state.dim;
                  return (
                    <button key={d} onClick={() => dispatch({ type: 'setDim', value: d })} style={{
                      all: 'unset', cursor: 'pointer',
                      padding: '5px 11px',
                      border: `1px solid ${palette.ink}55`,
                      marginLeft: -1,
                      background: active ? palette.ink : 'transparent',
                      color: active ? palette.paper : palette.ink,
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.04em',
                    }}>{d}</button>
                  );
                })}
              </div>
            </div>
          </div>

          <figure data-tour-id="plate" style={{
            flex: 1, margin: 0,
            border: `1px solid ${palette.ink}`,
            background: palette.card,
            position: 'relative',
            minHeight: 0,
            perspective: state.dim === '3D' ? '1100px' : 'none',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              transform: state.dim === '3D' ? 'rotateX(28deg) rotateZ(-3deg) scale(0.94)' : 'none',
              transformStyle: 'preserve-3d',
              transformOrigin: 'center 60%',
              transition: 'transform 380ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
              <CorpusScatter
                width={620} height={500}
                palette={palette} accent={accent}
                highlightGenre={genreFilter}
                selectedId={selectedBookId}
                hoveredId={hoveredBookId}
                onHover={(id) => dispatch({ type: 'hoverBook', id })}
                onPick={(id) => { dispatch({ type: 'pickBook', id }); goTo('card'); }}
              />
            </div>
            {/* corner rulings */}
            <div style={{ position: 'absolute', top: 8, left: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.15em', color: palette.muted }}>Plate I</div>
            <div style={{ position: 'absolute', top: 8, right: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.15em', color: palette.muted }}>{state.projection} · {state.dim} · ε 0.42</div>

            {/* Z-axis compass in 3D mode */}
            {state.dim === '3D' && (
              <div style={{
                position: 'absolute', bottom: 12, left: 12,
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                letterSpacing: '0.14em', color: palette.muted,
              }}>
                <svg width="38" height="38" viewBox="0 0 38 38">
                  <line x1="6" y1="32" x2="32" y2="32" stroke={palette.ink} strokeWidth="0.8" />
                  <line x1="6" y1="32" x2="6"  y2="6"  stroke={palette.ink} strokeWidth="0.8" />
                  <line x1="6" y1="32" x2="20" y2="20" stroke={palette.ink} strokeWidth="0.8" strokeDasharray="2 2" />
                  <polygon points="32,32 28,30 28,34" fill={palette.ink} />
                  <polygon points="6,6   4,10  8,10"  fill={palette.ink} />
                  <polygon points="20,20 18,24 24,22" fill={palette.ink} />
                  <text x="34" y="34" fontSize="7" fontFamily="JetBrains Mono">x</text>
                  <text x="0"  y="6"  fontSize="7" fontFamily="JetBrains Mono">y</text>
                  <text x="22" y="18" fontSize="7" fontFamily="JetBrains Mono">z</text>
                </svg>
                <span>tilt 28° · drag to rotate</span>
              </div>
            )}

            {/* hover tooltip */}
            {hovered && (
              <div style={{
                position: 'absolute',
                left: `min(${hovered.x * 100}%, calc(100% - 220px))`,
                top: `calc(${hovered.y * 100}% - 64px)`,
                background: palette.paper,
                border: `1px solid ${palette.ink}`,
                padding: '8px 12px',
                pointerEvents: 'none',
                maxWidth: 220,
                boxShadow: `3px 3px 0 ${palette.ink}22`,
              }}>
                <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 14, color: palette.ink, lineHeight: 1.2 }}>{hovered.t}</div>
                <div style={{ fontFamily: 'Spectral, serif', fontSize: 11.5, color: palette.muted, marginTop: 2 }}>{hovered.a} · {hovered.y}</div>
              </div>
            )}
          </figure>

          <figcaption style={{
            fontFamily: 'Spectral, serif', fontStyle: 'italic',
            fontSize: 12.5, color: palette.muted, lineHeight: 1.55,
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          }}>
            <span>
              fig. 1 — {filteredGenre ? `${filteredGenre.label} highlighted within the corpus` : '122 books across 8 genres'}, projected via UMAP onto the plane.
              <Footnote n="1" accent={accent} />
            </span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, letterSpacing: '0.08em' }}>↻ recompute   ↗ export</span>
          </figcaption>
        </main>

        {/* ── Marginalia (right) ──────────────────────────────── */}
        {/* Marginalia (right) — hidden when density='study' */}
        {!studyMode && (
        <aside style={{
          padding: '28px 22px 22px',
          borderLeft: `1px solid ${palette.ink}33`,
          display: 'flex', flexDirection: 'column', gap: 16,
          overflowY: 'auto',
        }}>
          <RRLabel palette={palette}>Marginalia</RRLabel>

          {hovered ? (
            <div style={{
              padding: 12, background: palette.card, border: `1px solid ${palette.ink}33`,
              fontFamily: 'Spectral, serif',
            }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: palette.muted, letterSpacing: '0.18em' }}>HOVERED</div>
              <div style={{ marginTop: 4, fontStyle: 'italic', fontSize: 16, lineHeight: 1.25 }}>{hovered.t}</div>
              <div style={{ marginTop: 2, fontSize: 12.5, color: palette.muted }}>{hovered.a} · {hovered.y}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: palette.muted }}>
                <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: GENRES.find(g => g.id === hovered.g).hex, marginRight: 6 }} />
                {GENRES.find(g => g.id === hovered.g).label}
              </div>
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {hovered.kw.slice(0, 6).map(w => (
                  <span key={w} style={{ padding: '1px 6px', border: `0.5px solid ${palette.ink}55`, fontSize: 10.5, fontStyle: 'italic' }}>{w}</span>
                ))}
              </div>
              <button onClick={() => { dispatch({ type: 'pickBook', id: hovered.id }); goTo('card'); }} style={{
                all: 'unset', cursor: 'pointer',
                marginTop: 12, display: 'inline-block',
                padding: '4px 10px', border: `1px solid ${accent}`, color: accent,
                fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 12,
              }}>open catalog card →</button>
            </div>
          ) : (
            <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 14, color: palette.muted, lineHeight: 1.55 }}>
              Hover any point in the plate to read its margin note. Click to open its catalog card.
            </div>
          )}

          <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: `1px solid ${palette.ink}22` }}>
            <div style={{ fontSize: 11.5, fontStyle: 'italic', color: palette.muted, lineHeight: 1.55 }}>
              UMAP preserves local neighbourhoods well but distorts global distance.
              Persistent topology resists this distortion; both inform the verdicts under
              <em> Submit a Text</em>.
            </div>
          </div>
        </aside>
        )}
      </div>

      <RRFooter
        palette={palette}
        left="The Collection"
        center={`${window.BOOKS.length} works catalogued · 8 regions`}
        right="p. 3"
      />
    </RRFrame>
  );
}

Object.assign(window, { Collection, CorpusScatter });
