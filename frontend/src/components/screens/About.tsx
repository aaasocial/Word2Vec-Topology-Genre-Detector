// Reading Room — About screen (Phase 12, §6.8). Two-column prose: "On the
// method" / "On the genres". Copy verbatim from the prototype
// `screens_landing.jsx About`.

export function About() {
  return (
    <main
      style={{
        flex: 1,
        padding: '36px 80px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 56,
        maxWidth: 1100,
        width: '100%',
        margin: '0 auto',
        overflow: 'auto',
      }}
      className="rr-scroll"
    >
      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="rr-label">On the method</div>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 28,
            fontWeight: 500,
            margin: 0,
          }}
        >
          How the corpus is arranged
        </h2>
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
        <div className="rr-label">On the genres</div>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 28,
            fontWeight: 500,
            margin: 0,
          }}
        >
          What we mean by a region
        </h2>
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
  )
}
