// Reading Room — Landing screen (Phase 12, §6.1). Two-column cover: left
// editorial intro (label, 64px display H1, two lede paragraphs, two CTAs, a 4-up
// stat row) · right a framed plate preview. Copy verbatim from the prototype
// `screens_landing.jsx Landing`.
//
// Plate preview: a cheap static SVG scatter thumbnail (plan discretion — the live
// reskinned R3F plate lands in 12-02). Region labels match the prototype layout;
// point colors use the fixed reading-room genre palette (L-05).

import { useMemo } from 'react'
import { useReadingRoomStore } from '@/stores/readingRoomStore'
import { RR_GENRE_HEX } from '@/theme/readingRoom'

const STATS: [string, string][] = [
  ['122', 'novels in the corpus'],
  ['8', 'genres represented'],
  ['12,808', 'distinct lemmas'],
  ['UMAP', 'projection in use'],
]

const REGION_LABELS = [
  { x: 0.18, y: 0.62, t: 'Gothic' },
  { x: 0.78, y: 0.7, t: 'Mystery' },
  { x: 0.5, y: 0.42, t: 'Literary' },
  { x: 0.32, y: 0.2, t: 'Romance' },
  { x: 0.8, y: 0.2, t: 'Adventure' },
  { x: 0.92, y: 0.48, t: 'Western' },
  { x: 0.6, y: 0.78, t: 'Historical' },
  { x: 0.38, y: 0.88, t: 'Speculative' },
]

const GENRE_HEXES = Object.values(RR_GENRE_HEX)

/** A deterministic static SVG scatter — preview only, not the interactive plate. */
function PlatePreview() {
  // Seeded LCG so the thumbnail is stable across renders (no flicker on Tweaks).
  const dots = useMemo(() => {
    let s = 4
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      return s / 0x7fffffff
    }
    return Array.from({ length: 220 }, () => ({
      cx: rnd() * 100,
      cy: rnd() * 100,
      hex: GENRE_HEXES[Math.floor(rnd() * GENRE_HEXES.length)],
    }))
  }, [])

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={0.7} fill={d.hex} opacity={0.92} />
      ))}
    </svg>
  )
}

export function Landing() {
  const goTo = useReadingRoomStore((s) => s.goTo)

  return (
    <main
      style={{
        flex: 1,
        padding: '48px 64px 36px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
        gap: 56,
        minHeight: 0,
        overflow: 'auto',
      }}
      className="rr-scroll"
    >
      {/* Left: editorial intro */}
      <section
        style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 680 }}
      >
        <div className="rr-label">Vol. I · A reading room for a corpus</div>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 500,
            fontSize: 64,
            letterSpacing: '-0.018em',
            lineHeight: 1.02,
            margin: 0,
          }}
        >
          A library of <span style={{ fontStyle: 'italic' }}>122 novels,</span>
          <br />
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

        <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => goTo('collection')}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '12px 22px',
              background: 'var(--ink)',
              color: 'var(--paper)',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 15,
              border: '1px solid var(--ink)',
            }}
          >
            Enter the reading room →
          </button>
          <button
            onClick={() => goTo('upload')}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '12px 22px',
              border: '1px solid var(--ink)',
              color: 'var(--ink)',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 15,
            }}
          >
            Submit a text
          </button>
        </div>

        <div
          style={{
            marginTop: 32,
            paddingTop: 18,
            borderTop: '1px solid var(--ink-33)',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 24,
          }}
        >
          {STATS.map(([n, l]) => (
            <div key={l}>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 28,
                  fontWeight: 500,
                  letterSpacing: '-0.005em',
                }}
              >
                {n}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  marginTop: 4,
                }}
              >
                {l}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Right: the plate, as a preview */}
      <aside
        style={{
          background: 'var(--card)',
          border: '1px solid var(--ink)',
          position: 'relative',
          alignSelf: 'stretch',
          padding: 0,
          minHeight: 460,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 16,
            right: 16,
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          <span>Plate I — the corpus</span>
          <span>UMAP · 2D · ε 0.42</span>
        </div>
        <div style={{ position: 'absolute', inset: '38px 16px 38px' }}>
          <PlatePreview />
          {REGION_LABELS.map((r) => (
            <div
              key={r.t}
              style={{
                position: 'absolute',
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: 12.5,
                color: 'var(--ink)',
                background: 'var(--card)',
                padding: '0 4px',
                pointerEvents: 'none',
              }}
            >
              {r.t}
            </div>
          ))}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 14,
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 12,
            color: 'var(--muted)',
          }}
        >
          fig. 1 — the full corpus, projected.
        </div>
      </aside>
    </main>
  )
}
