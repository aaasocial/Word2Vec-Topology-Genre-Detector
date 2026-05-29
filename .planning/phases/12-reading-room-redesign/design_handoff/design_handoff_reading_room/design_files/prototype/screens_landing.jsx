// Reading Room — Landing screen + About screen.
// The landing serves the "what is this?" need flagged in the Atlas review,
// without losing the editorial voice.

function Landing({ palette, accent, goTo, openGuide }) {
  return (
    <RRFrame palette={palette} accent={accent}>
      <RRMasthead palette={palette} accent={accent} section="landing" goTo={goTo} openGuide={openGuide} />

      <main style={{
        flex: 1, padding: '48px 64px 36px',
        display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 56,
        minHeight: 0,
      }}>
        {/* Left: editorial intro */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 680 }}>
          <RRLabel palette={palette}>Vol. I · A reading room for a corpus</RRLabel>
          <h1 style={{
            fontFamily: 'Spectral, serif',
            fontWeight: 500, fontSize: 64,
            letterSpacing: '-0.018em', lineHeight: 1.02,
            margin: 0,
          }}>
            A library of <span style={{ fontStyle: 'italic' }}>122 novels,</span><br />
            arranged by what they <em>say.</em>
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.7, margin: 0, maxWidth: 560 }}>
            Each book has been read into the vocabulary of a word2vec embedding, then
            placed on the plane below by the company it keeps. Books that share words
            sit near one another; books that don’t, drift to their own quarters.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.7, margin: 0, maxWidth: 560 }}>
            You can wander the collection, compare two regions, or submit a text of your
            own to receive <em>a reading</em> — a short essay placing the manuscript in the
            existing geography, with citations.
          </p>

          <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
            <button onClick={() => goTo('collection')} style={{
              all: 'unset', cursor: 'pointer',
              padding: '12px 22px',
              background: palette.ink, color: palette.paper,
              fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 15,
              border: `1px solid ${palette.ink}`,
            }}>Enter the reading room →</button>
            <button onClick={() => goTo('upload')} style={{
              all: 'unset', cursor: 'pointer',
              padding: '12px 22px',
              border: `1px solid ${palette.ink}`,
              color: palette.ink,
              fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 15,
            }}>Submit a text</button>
          </div>

          <div style={{
            marginTop: 32, paddingTop: 18,
            borderTop: `1px solid ${palette.ink}33`,
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24,
          }}>
            {[
              ['122',   'novels in the corpus'],
              ['8',     'genres represented'],
              ['12,808','distinct lemmas'],
              ['UMAP',  'projection in use'],
            ].map(([n, l]) => (
              <div key={l}>
                <div style={{ fontFamily: 'Spectral, serif', fontSize: 28, fontWeight: 500, letterSpacing: '-0.005em' }}>{n}</div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                  letterSpacing: '0.15em', textTransform: 'uppercase', color: palette.muted,
                  marginTop: 4,
                }}>{l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Right: the plate, as a preview */}
        <aside style={{
          background: palette.card,
          border: `1px solid ${palette.ink}`,
          position: 'relative',
          alignSelf: 'stretch',
          padding: 0, minHeight: 460,
        }}>
          <div style={{
            position: 'absolute', top: 14, left: 16, right: 16,
            display: 'flex', justifyContent: 'space-between',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5,
            letterSpacing: '0.18em', textTransform: 'uppercase', color: palette.muted,
          }}>
            <span>Plate I — the corpus</span>
            <span>UMAP · 2D · ε 0.42</span>
          </div>
          <div style={{ position: 'absolute', inset: '38px 16px 38px' }}>
            <ScatterPlaceholder width={460} height={460} seed={4} density={260} pointSize={2.6} opacity={0.92} />
            {/* a few region labels for legibility */}
            {[
              { x: 0.18, y: 0.62, t: 'Gothic' },
              { x: 0.78, y: 0.70, t: 'Mystery' },
              { x: 0.50, y: 0.42, t: 'Literary' },
              { x: 0.32, y: 0.20, t: 'Romance' },
              { x: 0.80, y: 0.20, t: 'Adventure' },
              { x: 0.92, y: 0.48, t: 'Western' },
              { x: 0.60, y: 0.78, t: 'Historical' },
              { x: 0.38, y: 0.88, t: 'Speculative' },
            ].map(r => (
              <div key={r.t} style={{
                position: 'absolute', left: `${r.x * 100}%`, top: `${r.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 12.5,
                color: palette.ink, background: palette.card,
                padding: '0 4px',
                pointerEvents: 'none',
              }}>{r.t}</div>
            ))}
          </div>
          <div style={{
            position: 'absolute', left: 16, right: 16, bottom: 14,
            fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 12,
            color: palette.muted,
          }}>fig. 1 — the full corpus, projected.</div>
        </aside>
      </main>

      <RRFooter
        palette={palette}
        left="A working library · est. 2026"
        center="Edited by the reading room"
        right="p. 1"
      />
    </RRFrame>
  );
}

function About({ palette, accent, goTo, openGuide }) {
  return (
    <RRFrame palette={palette} accent={accent}>
      <RRMasthead palette={palette} accent={accent} section="about" goTo={goTo} openGuide={openGuide} />
      <main style={{
        flex: 1, padding: '36px 80px', display: 'grid',
        gridTemplateColumns: '1fr 1fr', gap: 56, maxWidth: 1100, margin: '0 auto',
      }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <RRLabel palette={palette}>On the method</RRLabel>
          <h2 style={{ fontFamily: 'Spectral, serif', fontSize: 28, fontWeight: 500, margin: 0 }}>How the corpus is arranged</h2>
          <p style={{ fontSize: 14.5, lineHeight: 1.75, margin: 0 }}>
            Every novel in the collection is read into a word2vec embedding of dimension
            300, trained on the corpus itself with a window of 15 tokens. A novel’s
            <em> position</em> is the weighted centroid of its vocabulary; its <em>shape</em> is the
            persistent homology of its vocabulary’s pairwise distances. The plate you
            see is a UMAP projection of those positions onto the plane.
          </p>
          <p style={{ fontSize: 14.5, lineHeight: 1.75, margin: 0 }}>
            Two readings sit behind every verdict — the centroid track, which asks
            <em> where in the embedding does this book live?</em>, and the topology track,
            which asks <em>what shape does this book’s vocabulary make?</em> Most verdicts
            lean on the first; the second is what saves the close calls.
          </p>
        </section>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <RRLabel palette={palette}>On the genres</RRLabel>
          <h2 style={{ fontFamily: 'Spectral, serif', fontSize: 28, fontWeight: 500, margin: 0 }}>What we mean by a region</h2>
          <p style={{ fontSize: 14.5, lineHeight: 1.75, margin: 0 }}>
            The eight genre names are <em>tendencies</em>, not enclosures. The boundaries on the
            plate are perceptual — derived from where a region’s books cease to share
            neighbours with the next region — and most novels sit close to a border.
            Receiving a “marginal” reading is therefore normal, and not a failure of the method.
          </p>
          <p style={{ fontSize: 14.5, lineHeight: 1.75, margin: 0 }}>
            Where two regions abut — Mystery & Romance, say, or Gothic & Literary — the
            <em> Comparative Study</em> view shows the weighted overlap of their vocabularies,
            and where they part company.
          </p>
        </section>
      </main>
      <RRFooter palette={palette} left="About" center="" right="p. 2" />
    </RRFrame>
  );
}

Object.assign(window, { Landing, About });
