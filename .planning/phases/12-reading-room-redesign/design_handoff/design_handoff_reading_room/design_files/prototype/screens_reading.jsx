// Reading Room — Submit a Text (empty state) + The Reading (verdict).

// ────────────────────────────────────────────────────────────────
// Upload / empty state
// ────────────────────────────────────────────────────────────────
function Upload({ palette, accent, goTo, state, dispatch, openGuide }) {
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const samples = [
    { label: 'A Sherlock-flavoured pastiche', preview: 'It was a fog that even the gas-lamps could not pierce…' },
    { label: 'A windswept moor scene',         preview: 'The wind crossed the heath without obstacle, finding only…' },
    { label: 'A drawing-room courtship',       preview: 'She entered the parlour with the colour still rising…' },
  ];

  const submit = () => {
    setBusy(true);
    setTimeout(() => {
      dispatch({ type: 'completeReading' });
      goTo('verdict');
    }, 900);
  };

  return (
    <RRFrame palette={palette} accent={accent}>
      <RRMasthead palette={palette} accent={accent} section="upload" goTo={goTo} hasUpload={state.hasUploadedText} openGuide={openGuide} />

      <main style={{
        flex: 1, padding: '36px 80px',
        display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 56, minHeight: 0,
        maxWidth: 1180, margin: '0 auto', width: '100%',
      }}>
        {/* Left: the editor */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
          <RRLabel palette={palette}>Submit a text · empty desk</RRLabel>
          <h1 style={{
            fontFamily: 'Spectral, serif', fontWeight: 500, fontSize: 40,
            letterSpacing: '-0.01em', lineHeight: 1.1, margin: 0,
          }}>
            Place your manuscript on the <span style={{ fontStyle: 'italic' }}>reading desk.</span>
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: 0, color: palette.ink, maxWidth: 560 }}>
            Paste a passage, or upload a .txt of a complete work. We will read it into
            the embedding, place it on the plate, and return a short essay locating
            it among its likely neighbours.
          </p>

          <div data-tour-id="reading-desk" style={{
            position: 'relative',
            border: `1px solid ${palette.ink}`,
            background: palette.card, minHeight: 240,
          }}>
            <div style={{
              position: 'absolute', top: 8, left: 12,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
              letterSpacing: '0.15em', color: palette.muted,
            }}>
              foolscap · paste below
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="The fog had not lifted, and the lamps still burned…"
              style={{
                width: '100%', minHeight: 240, padding: '32px 22px 22px',
                background: 'transparent', border: 'none', resize: 'vertical',
                fontFamily: 'Spectral, serif', fontSize: 14.5, lineHeight: 1.7,
                color: palette.ink, outline: 'none',
              }}
            />
            <div style={{
              position: 'absolute', bottom: 8, right: 12,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5,
              letterSpacing: '0.15em', color: palette.muted,
            }}>
              {text.trim() ? `${text.trim().split(/\s+/).length} words` : 'no text yet'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={submit}
              disabled={busy}
              style={{
                all: 'unset', cursor: busy ? 'progress' : 'pointer',
                padding: '12px 22px',
                background: palette.ink, color: palette.paper,
                fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 15,
                border: `1px solid ${palette.ink}`,
                opacity: busy ? 0.7 : 1,
              }}>
              {busy ? 'reading the text…' : 'Generate a reading →'}
            </button>
            <button style={{
              all: 'unset', cursor: 'pointer',
              padding: '12px 18px',
              border: `1px solid ${palette.ink}`,
              fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 14,
            }}>or upload a .txt</button>
          </div>

          <div style={{ marginTop: 6 }}>
            <RRLabel palette={palette}>Try a sample passage</RRLabel>
            <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {samples.map(s => (
                <li key={s.label}>
                  <button onClick={() => setText(s.preview + ' (lorem ipsum that would extend the passage for a few thousand more words…)' )} style={{
                    all: 'unset', cursor: 'pointer', display: 'block', width: '100%',
                    padding: '10px 14px', background: palette.paper2,
                    border: `0.5px solid ${palette.ink}22`,
                  }}>
                    <span style={{ fontFamily: 'Spectral, serif', fontSize: 13.5 }}>{s.label}</span>
                    <span style={{ display: 'block', marginTop: 4, fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 12, color: palette.muted }}>“{s.preview}”</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Right: empty state of the reading */}
        <aside style={{
          background: palette.paper2, border: `1px solid ${palette.ink}33`,
          padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 16,
          minHeight: 0,
        }}>
          <RRLabel palette={palette}>The reading appears here</RRLabel>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{
              position: 'absolute', inset: 0,
              border: `1px dashed ${palette.ink}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 22, textAlign: 'center',
              fontFamily: 'Spectral, serif', fontStyle: 'italic',
              fontSize: 14, color: palette.muted, lineHeight: 1.6,
            }}>
              No reading yet. Submit a passage on the left — you will receive a short
              essay, a catalog card for your text, and the five nearest catalogued works.
            </div>
          </div>
          <div style={{
            marginTop: 'auto', paddingTop: 14, borderTop: `1px solid ${palette.ink}22`,
            fontFamily: 'Spectral, serif', fontStyle: 'italic',
            fontSize: 11.5, color: palette.muted, lineHeight: 1.55,
          }}>
            Your text is read locally. We do not retain it. Readings persist only in
            this browser, under <em>Submit a Text</em>.
          </div>
        </aside>
      </main>

      <RRFooter palette={palette} left="Submit a text" center="" right="p. 6" />
    </RRFrame>
  );
}

// ────────────────────────────────────────────────────────────────
// Verdict — the reading itself, written as an essay with footnotes.
// ────────────────────────────────────────────────────────────────
function Verdict({ palette, accent, goTo, state, dispatch, openGuide }) {
  const myst = GENRES.find(g => g.id === 'mystery');
  // The "user text" sits between mystery, gothic and literary —
  // 5 nearest neighbours from the corpus, sorted by faked distance.
  const neighbours = [
    { id: 'hb', d: 0.142 },
    { id: 'mn', d: 0.171 },
    { id: 'ss', d: 0.198 },
    { id: 'ww', d: 0.234 },
    { id: 'bh', d: 0.244 },
  ].map(n => ({ ...n, book: window.BOOKS.find(b => b.id === n.id) }));

  const [shared, setShared] = React.useState(false);

  return (
    <RRFrame palette={palette} accent={accent}>
      <RRMasthead palette={palette} accent={accent} section="upload" goTo={goTo} hasUpload={state.hasUploadedText} openGuide={openGuide} />

      {/* breadcrumb */}
      <div style={{
        padding: '10px 32px', borderBottom: `1px solid ${palette.ink}33`,
        fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 13, color: palette.muted,
        display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <button onClick={() => goTo('upload')} style={{ all: 'unset', cursor: 'pointer' }}>Submit a Text</button>
          <span>›</span>
          <span style={{ color: palette.ink, fontStyle: 'normal' }}>Reading no. 0142</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => { navigator.clipboard?.writeText(window.location.href); setShared(true); setTimeout(() => setShared(false), 1600); }} style={{
            all: 'unset', cursor: 'pointer',
            padding: '4px 12px', border: `1px solid ${accent}`, color: accent,
            fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 12,
          }}>{shared ? '✓ link copied' : '↗ share this reading'}</button>
          <button onClick={() => window.print && window.print()} style={{
            all: 'unset', cursor: 'pointer',
            padding: '4px 12px', border: `1px solid ${palette.ink}55`, color: palette.ink,
            fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 12,
          }}>⌥ print</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.5fr 1fr', minHeight: 0 }}>

        {/* Left: the essay */}
        <article style={{ padding: '34px 56px 30px', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto' }}>
          <RRLabel palette={palette}>Reading no. 0142 · submitted 2026-05-29</RRLabel>
          <h1 style={{
            fontFamily: 'Spectral, serif', fontWeight: 500, fontSize: 38,
            letterSpacing: '-0.01em', lineHeight: 1.08, margin: 0,
          }}>
            On the placement of <span style={{ fontStyle: 'italic' }}>your manuscript.</span>
          </h1>

          <p style={{ fontSize: 15, lineHeight: 1.75, margin: 0, textIndent: '1.4em' }}>
            The text submitted comprises 78,420 words and a vocabulary of 4,832 distinct
            lemmas. We undertook two readings of it. The first averaged the position of
            its words in the trained embedding;<Footnote n="4" accent={accent} /> the
            second examined the shape its words trace through that space, by way of
            persistent homology.<Footnote n="5" accent={accent} />
          </p>

          <p style={{ fontSize: 15, lineHeight: 1.75, margin: 0, textIndent: '1.4em' }}>
            On both readings, the manuscript was found to <em>resemble works of </em>
            <span style={{ color: myst.hex, fontWeight: 600 }}>Mystery</span>, though
            imperfectly. Its nearest catalogued neighbours are listed at right — chiefly
            Conan Doyle and Wilkie Collins, with one Dickens at the edge. The result rests
            on a confidence of <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              background: palette.card, padding: '0 4px', border: `0.5px solid ${palette.ink}55`,
              fontSize: 13,
            }}>0.71</span> — a marginal call, suggesting the text shares vocabulary with
            adjacent regions, particularly <em>Literary</em>.<Footnote n="6" accent={accent} />
          </p>

          <p style={{ fontSize: 15, lineHeight: 1.75, margin: 0, textIndent: '1.4em' }}>
            A reader inclined to take the result at face value should consider it a
            <em> qualified</em> assignment: the manuscript belongs <em>most</em> to Mystery, but
            sits close enough to the literary border that another corpus, or another
            projection, might revise the call. See the <button onClick={() => { dispatch({ type: 'setStudy', side: 'A', id: 'mystery' }); dispatch({ type: 'setStudy', side: 'B', id: 'literary' }); goTo('study'); }} style={{ all: 'unset', cursor: 'pointer', textDecoration: 'underline', color: accent, fontStyle: 'italic' }}>comparative study of Mystery and Literary</button>.
          </p>

          <div style={{ marginTop: 8 }}>
            <RRLabel palette={palette}>Probability fix</RRLabel>
            <div style={{ marginTop: 10, maxWidth: 480 }}>
              <ProbBars
                data={[
                  { label: 'Mystery',  pct: 71, color: myst.hex },
                  { label: 'Literary', pct: 12, color: GENRES.find(g=>g.id==='literary').hex },
                  { label: 'Gothic',   pct: 8,  color: GENRES.find(g=>g.id==='gothic').hex },
                  { label: 'Romance',  pct: 5,  color: GENRES.find(g=>g.id==='romance').hex },
                  { label: 'Other',    pct: 4,  color: palette.muted },
                ]}
                color={palette.ink}
                trackBg={palette.paper2}
                fontColor={palette.ink}
                mono={false}
              />
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: `1px solid ${palette.ink}33` }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: palette.muted, marginBottom: 8 }}>
              Notes
            </div>
            <div style={{ fontSize: 12, color: palette.ink, lineHeight: 1.65, fontStyle: 'italic' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <sup style={{ color: accent, fontStyle: 'normal' }}>4</sup>
                <span>The <em>centroid track</em> — a weighted average of where the text’s words live in word2vec space, contribution <strong style={{ fontStyle: 'normal', color: palette.ink, fontWeight: 500 }}>0.76</strong>.</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <sup style={{ color: accent, fontStyle: 'normal' }}>5</sup>
                <span>The <em>topology track</em> — features of the persistent diagram of the text’s vocabulary, contribution <strong style={{ fontStyle: 'normal', color: palette.ink, fontWeight: 500 }}>0.24</strong>.</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <sup style={{ color: accent, fontStyle: 'normal' }}>6</sup>
                <span>“Marginal” means the verdict’s confidence falls below 0.80. At the present threshold, ~22% of catalogued works receive a marginal reading.</span>
              </div>
            </div>
          </div>
        </article>

        {/* Right: catalog card for the user's text + nearest + a small plate */}
        <aside style={{
          borderLeft: `1px solid ${palette.ink}33`, padding: '28px 28px 24px',
          background: palette.paper2,
          display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto',
        }}>
          <RRLabel palette={palette}>A catalog card for your text</RRLabel>
          <div style={{
            background: palette.card, border: `1px solid ${palette.ink}`,
            borderTop: `4px double ${palette.ink}`,
            padding: '16px 18px 18px', fontFamily: 'Spectral, serif',
            boxShadow: `3px 3px 0 ${palette.ink}22`,
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', width: 10, height: 10, borderRadius: '50%', background: palette.paper2, border: `0.5px solid ${palette.ink}55` }} />
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: palette.muted, letterSpacing: '0.1em' }}>provisional · 0142</div>
            <div style={{ marginTop: 8, fontSize: 19, fontWeight: 500 }}>untitled.txt</div>
            <div style={{ marginTop: 4, fontSize: 12, fontStyle: 'italic', color: palette.muted }}>uploaded 2026-05-29 · 78.4k words</div>
            <hr style={{ border: 0, borderTop: `1px solid ${palette.ink}33`, margin: '10px 0' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', rowGap: 4, fontSize: 12.5 }}>
              <span style={{ color: palette.muted }}>Verdict</span>
              <span>
                <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: myst.hex, marginRight: 6 }} />
                Mystery
              </span>
              <span style={{ color: palette.muted }}>Confidence</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>0.71 · marginal</span>
              <span style={{ color: palette.muted }}>UMAP-x</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>+0.184</span>
              <span style={{ color: palette.muted }}>UMAP-y</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>−0.122</span>
            </div>
          </div>

          {/* A small plate showing where the text landed */}
          <div>
            <RRLabel palette={palette}>Where it landed</RRLabel>
            <div style={{
              marginTop: 8, position: 'relative',
              background: palette.card, border: `1px solid ${palette.ink}`,
              height: 180,
            }}>
              <ScatterPlaceholder width={300} height={180} seed={4} density={140} pointSize={1.9} opacity={0.7} />
              {/* the user's pin */}
              <div style={{ position: 'absolute', left: '62%', top: '70%', transform: 'translate(-50%,-50%)' }}>
                <svg width="34" height="34" viewBox="0 0 34 34">
                  <circle cx="17" cy="17" r="14" fill="none" stroke={accent} strokeWidth="0.6" strokeDasharray="2 3" />
                  <circle cx="17" cy="17" r="8" fill="none" stroke={accent} strokeWidth="1.2" />
                  <circle cx="17" cy="17" r="3" fill={accent} />
                </svg>
              </div>
              <div style={{ position: 'absolute', left: '64%', top: 'calc(70% - 28px)', fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 11.5, color: palette.ink }}>your text</div>
            </div>
          </div>

          <div>
            <RRLabel palette={palette}>Nearest five works</RRLabel>
            <ol style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {neighbours.map((n, i) => {
                const ng = GENRES.find(g => g.id === n.book.g);
                return (
                  <li key={n.id} style={{ display: 'grid', gridTemplateColumns: '18px 12px 1fr auto', gap: 8, alignItems: 'baseline', fontSize: 12.5 }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: palette.muted }}>{i + 1}.</span>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: ng.hex, marginTop: 4 }} />
                    <button onClick={() => { dispatch({ type: 'pickBook', id: n.id }); goTo('card'); }} style={{
                      all: 'unset', cursor: 'pointer',
                      textDecorationLine: 'underline', textDecorationStyle: 'dotted', textDecorationColor: palette.muted,
                    }}>
                      <em>{n.book.t}</em>
                      <span style={{ color: palette.muted, fontStyle: 'normal' }}> · {n.book.a}</span>
                    </button>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: palette.muted }}>d {n.d.toFixed(3)}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>

      <RRFooter
        palette={palette}
        left="A reading"
        center="Reading no. 0142"
        right="p. 7"
      />
    </RRFrame>
  );
}

Object.assign(window, { Upload, Verdict });
