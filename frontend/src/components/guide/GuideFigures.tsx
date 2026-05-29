// Reading Room — "How it works" method panel + 5 live figures (Phase 12, 12-06,
// §6.9 / RR-07 / L-08). Recreated from the prototype `guide_figures.jsx`.
//
// Each figure is a small self-animating diagram in the reading-room idiom (paper
// card, ink hairlines, Spectral + JetBrains type). They supersede the Phase 9/10
// PipelineExplanation modal visuals.
//
// ANIMATION ROBUSTNESS (L-08 / README §7, line "Animation robustness"):
// every figure MUST render a valid static frame AT REST. We never gate content
// behind `opacity:0 → forwards` entrance animations or the document timeline:
//   · FigWordEmbed / FigProjection — static SVG/markup; loops only re-tilt.
//   · FigCentroid — crosshair drawn at rest; the infinite rr-pulse ring is
//     decorative and starts visible.
//   · FigTopology — rAF auto-sweep is *seeded* at a valid ε (0.18) so a paused
//     background tab (rAF never fires) still shows a coherent filtration.
//   · FigVerdict — bars initialise to their target widths (`on=true`), so a
//     paused tab shows the full verdict, not empty tracks.
//
// Genre hexes come from RR_GENRE_HEX (theme-independent, L-05); the accent/ink/
// paper colours read the live reading-room CSS vars so the figures track Tweaks.

import { useEffect, useMemo, useRef, useState } from 'react'
import { RR_GENRE_HEX } from '@/theme/readingRoom'

// Reading-room surface vars (used inline; SVG fills accept var() directly).
const INK = 'var(--ink)'
const MUTED = 'var(--muted)'
const CARD = 'var(--card)'
const PAPER2 = 'var(--paper2)'
const ACCENT = 'var(--accent)'
const SERIF = 'var(--font-serif)'
const MONO = 'var(--font-mono)'

// ── shared chrome ───────────────────────────────────────────────
function FigFrame({
  label,
  height = 150,
  children,
}: {
  label?: string
  height?: number
  children: React.ReactNode
}) {
  return (
    <figure
      style={{
        margin: 0,
        border: '1px solid var(--ink)',
        background: CARD,
        position: 'relative',
        height,
        overflow: 'hidden',
      }}
    >
      {children}
      {label && (
        <figcaption
          style={{
            position: 'absolute',
            top: 6,
            left: 8,
            fontFamily: MONO,
            fontSize: 8.5,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: MUTED,
            pointerEvents: 'none',
          }}
        >
          {label}
        </figcaption>
      )}
    </figure>
  )
}

// ════════════════════════════════════════════════════════════════
// i — Tokenise & vectorise: words land as points; like sits by like.
// ════════════════════════════════════════════════════════════════
function FigWordEmbed() {
  const clusters: { hex: string; words: [string, number, number][] }[] = [
    { hex: RR_GENRE_HEX.romance, words: [['love', 54, 34], ['passion', 30, 52], ['heart', 70, 60]] },
    { hex: RR_GENRE_HEX.adventure, words: [['sword', 300, 40], ['battle', 332, 60], ['knight', 296, 78]] },
    { hex: RR_GENRE_HEX.speculative, words: [['spell', 70, 118], ['magic', 40, 100], ['dragon', 96, 102]] },
    { hex: RR_GENRE_HEX.mystery, words: [['clue', 320, 116], ['murder', 296, 100], ['witness', 318, 134]] },
  ]
  return (
    <FigFrame label="fig. i — the embedding">
      <svg viewBox="0 0 380 160" style={{ width: '100%', height: '100%', display: 'block' }}>
        <line x1="0" y1="159" x2="380" y2="159" stroke={INK} strokeOpacity="0.16" />
        <line x1="1" y1="0" x2="1" y2="160" stroke={INK} strokeOpacity="0.16" />
        {clusters.map((c, ci) => (
          <g key={ci}>
            {c.words.map(([w, x, y]) => (
              <g key={w}>
                <circle cx={x} cy={y} r="3.4" fill={c.hex} />
                <text
                  x={x + 7}
                  y={y + 3.5}
                  fontFamily={SERIF}
                  fontStyle="italic"
                  fontSize="12"
                  fill={INK}
                >
                  {w}
                </text>
              </g>
            ))}
          </g>
        ))}
      </svg>
    </FigFrame>
  )
}

// ════════════════════════════════════════════════════════════════
// ii — Centroid: weighted words resolve to a single position.
// ════════════════════════════════════════════════════════════════
function FigCentroid() {
  // weighted points (weight ~ size). centroid = weighted mean.
  const pts: [number, number, number][] = [
    [70, 50, 1.0], [120, 38, 0.55], [150, 70, 0.8],
    [95, 92, 0.7], [185, 58, 0.4], [60, 96, 0.5],
    [135, 110, 0.9], [205, 95, 0.45], [110, 64, 0.65],
  ]
  const sw = pts.reduce((s, p) => s + p[2], 0)
  const cx = pts.reduce((s, p) => s + p[0] * p[2], 0) / sw
  const cy = pts.reduce((s, p) => s + p[1] * p[2], 0) / sw
  return (
    <FigFrame label="fig. ii — the centroid" height={150}>
      <svg viewBox="0 0 260 150" style={{ width: '100%', height: '100%', display: 'block' }}>
        {/* spokes to the centroid */}
        {pts.map((p, i) => (
          <line
            key={'l' + i}
            x1={p[0]}
            y1={p[1]}
            x2={cx}
            y2={cy}
            stroke={MUTED}
            strokeOpacity="0.3"
            strokeWidth="0.6"
            strokeDasharray="2 2"
          />
        ))}
        {/* word points, size ~ weight */}
        {pts.map((p, i) => (
          <circle
            key={'p' + i}
            cx={p[0]}
            cy={p[1]}
            r={2 + p[2] * 4}
            fill={RR_GENRE_HEX.mystery}
            opacity={0.35 + p[2] * 0.5}
          />
        ))}
        {/* centroid crosshair + pulse (visible at rest; pulse is decorative) */}
        <g>
          <circle
            cx={cx}
            cy={cy}
            r="9"
            fill="none"
            stroke={ACCENT}
            strokeWidth="1.1"
            style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'rr-fig-pulse 2.4s ease-in-out infinite' }}
          />
          <line x1={cx - 11} y1={cy} x2={cx + 11} y2={cy} stroke={ACCENT} strokeWidth="1.2" />
          <line x1={cx} y1={cy - 11} x2={cx} y2={cy + 11} stroke={ACCENT} strokeWidth="1.2" />
          <text
            x={cx + 14}
            y={cy - 9}
            fontFamily={MONO}
            fontSize="8.5"
            letterSpacing="0.12em"
            fill={ACCENT}
          >
            POSITION
          </text>
        </g>
      </svg>
    </FigFrame>
  )
}

// ════════════════════════════════════════════════════════════════
// iii — Topology: an auto-sweeping Vietoris–Rips filtration; a loop
//        forms and dies as the radius ε grows. Also drag-scrubbable.
// ════════════════════════════════════════════════════════════════
const TOPO_POINTS = [
  { x: 70, y: 38 }, { x: 116, y: 28 }, { x: 152, y: 50 },
  { x: 58, y: 80 }, { x: 104, y: 92 }, { x: 162, y: 86 },
  { x: 82, y: 128 }, { x: 128, y: 138 }, { x: 188, y: 60 },
  { x: 36, y: 112 }, { x: 196, y: 120 }, { x: 138, y: 110 },
]
const TOPO_EDGES = [
  { a: 0, b: 1, e: 0.15 }, { a: 1, b: 2, e: 0.2 }, { a: 3, b: 4, e: 0.2 },
  { a: 4, b: 5, e: 0.25 }, { a: 6, b: 7, e: 0.2 }, { a: 0, b: 3, e: 0.3 },
  { a: 2, b: 5, e: 0.3 }, { a: 2, b: 8, e: 0.35 }, { a: 3, b: 9, e: 0.35 },
  { a: 5, b: 10, e: 0.4 }, { a: 4, b: 11, e: 0.4 }, { a: 5, b: 11, e: 0.4 },
  { a: 6, b: 9, e: 0.45 }, { a: 7, b: 11, e: 0.45 }, { a: 8, b: 10, e: 0.5 },
  { a: 1, b: 4, e: 0.55 }, { a: 10, b: 11, e: 0.55 }, { a: 9, b: 6, e: 0.5 },
]
// a 1-dimensional loop (H1) alive while ε ∈ [LOOP_BIRTH, LOOP_DEATH]
const LOOP = [2, 5, 11, 4, 1]
const LOOP_BIRTH = 0.4
const LOOP_DEATH = 0.56

function FigTopology() {
  // Seeded at a valid ε so a paused background tab still shows a coherent frame.
  const [eps, setEps] = useState(0.18)
  const dragging = useRef(false)

  // auto-sweep unless the reader is scrubbing
  useEffect(() => {
    let raf = 0
    let t0: number | null = null
    const tick = (t: number) => {
      if (t0 == null) t0 = t
      if (!dragging.current) {
        const phase = ((t - t0) / 4200) % 1 // 0..1
        const tri = phase < 0.5 ? phase * 2 : (1 - phase) * 2 // 0..1..0
        setEps(0.08 + tri * 0.56)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const visible = TOPO_EDGES.filter((e) => e.e <= eps)
  const loopAlive = eps >= LOOP_BIRTH && eps <= LOOP_DEATH
  const loopPath = LOOP.map((i) => `${TOPO_POINTS[i].x},${TOPO_POINTS[i].y}`).join(' ')
  const ec = RR_GENRE_HEX.literary

  const onScrub = (clientX: number, target: HTMLElement) => {
    const r = target.getBoundingClientRect()
    const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width))
    setEps(0.08 + f * 0.56)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <FigFrame label="fig. iii — persistent homology" height={170}>
        <svg viewBox="0 0 240 170" style={{ width: '100%', height: '100%', display: 'block' }}>
          {/* ε-radius discs around each point */}
          {TOPO_POINTS.map((p, i) => (
            <circle
              key={'d' + i}
              cx={p.x}
              cy={p.y}
              r={eps * 95}
              fill={ACCENT}
              fillOpacity="0.05"
              stroke={ACCENT}
              strokeOpacity="0.1"
              strokeWidth="0.5"
            />
          ))}
          {/* the living loop */}
          {loopAlive && (
            <polygon
              points={loopPath}
              fill={ec}
              fillOpacity="0.12"
              stroke={ec}
              strokeWidth="1.4"
              strokeOpacity="0.8"
            />
          )}
          {/* edges */}
          {visible.map((e, i) => {
            const fresh = Math.abs(e.e - eps) < 0.05
            return (
              <line
                key={i}
                x1={TOPO_POINTS[e.a].x}
                y1={TOPO_POINTS[e.a].y}
                x2={TOPO_POINTS[e.b].x}
                y2={TOPO_POINTS[e.b].y}
                stroke={fresh ? ACCENT : MUTED}
                strokeWidth={fresh ? 1.8 : 1}
                strokeOpacity={fresh ? 1 : 0.5}
              />
            )
          })}
          {/* points */}
          {TOPO_POINTS.map((p, i) => (
            <circle key={'p' + i} cx={p.x} cy={p.y} r="3.4" fill={INK} />
          ))}
          {loopAlive && (
            <text
              x="120"
              y="162"
              textAnchor="middle"
              fontFamily={SERIF}
              fontStyle="italic"
              fontSize="11"
              fill={ec}
            >
              a loop — one H₁ feature, alive
            </text>
          )}
        </svg>
      </FigFrame>
      {/* ε scrubber */}
      <div
        onMouseDown={(e) => {
          dragging.current = true
          onScrub(e.clientX, e.currentTarget)
        }}
        onMouseMove={(e) => {
          if (dragging.current) onScrub(e.clientX, e.currentTarget)
        }}
        onMouseUp={() => {
          dragging.current = false
        }}
        onMouseLeave={() => {
          dragging.current = false
        }}
        style={{ cursor: 'ew-resize', padding: '4px 0' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED }}>ε</span>
          <div style={{ flex: 1, height: 3, background: 'var(--ink-33)', position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: `${((eps - 0.08) / 0.56) * 100}%`,
                background: ACCENT,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: -3.5,
                left: `calc(${((eps - 0.08) / 0.56) * 100}% - 5px)`,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: CARD,
                border: '1.4px solid var(--accent)',
              }}
            />
          </div>
          <span
            style={{ fontFamily: MONO, fontSize: 9.5, color: INK, width: 30, textAlign: 'right' }}
          >
            {eps.toFixed(2)}
          </span>
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 11, color: MUTED, marginTop: 4 }}>
          drag to grow the radius — watch edges (and the loop) appear, then fill in.
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// iv — Projection: a tilted 300-D cloud flattens onto the plane (UMAP).
// ════════════════════════════════════════════════════════════════
const GENRE_HEXES = Object.values(RR_GENRE_HEX)

/** Deterministic mulberry32 PRNG so the scatter is stable across renders. */
function makeScatter(seed: number, n: number) {
  let s = seed >>> 0
  const rand = () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return Array.from({ length: n }, () => ({
    x: 0.08 + rand() * 0.84,
    y: 0.08 + rand() * 0.84,
    hex: GENRE_HEXES[Math.floor(rand() * GENRE_HEXES.length)],
  }))
}

function FigProjection() {
  const pts = useMemo(() => makeScatter(20260529, 90), [])
  return (
    <FigFrame label="fig. iv — projection to the plane" height={170}>
      <div style={{ position: 'absolute', inset: 0, perspective: '520px' }}>
        <div
          style={{
            position: 'absolute',
            inset: '18px 20px',
            transformStyle: 'preserve-3d',
            transformOrigin: 'center 62%',
            animation: 'rr-fig-flatten 6s ease-in-out infinite',
          }}
        >
          {/* the plane the cloud settles onto */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              border: '1px solid var(--ink)',
              background: PAPER2,
            }}
          />
          {/* grid rulings */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          >
            {[20, 40, 60, 80].map((v) => (
              <g key={v} stroke={INK} strokeOpacity="0.1" strokeWidth="0.4">
                <line x1={v} y1="0" x2={v} y2="100" />
                <line x1="0" y1={v} x2="100" y2={v} />
              </g>
            ))}
          </svg>
          {pts.map((p, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: `${p.x * 100}%`,
                top: `${p.y * 100}%`,
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: p.hex,
                transform: 'translate(-50%,-50%)',
                opacity: 0.85,
              }}
            />
          ))}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 6,
          right: 8,
          fontFamily: MONO,
          fontSize: 8.5,
          letterSpacing: '0.12em',
          color: MUTED,
        }}
      >
        300-D → 2 · UMAP
      </div>
    </FigFrame>
  )
}

// ════════════════════════════════════════════════════════════════
// v — Read & report: score against each region; the verdict + bars.
// ════════════════════════════════════════════════════════════════
function FigVerdict() {
  const rows: { id: keyof typeof RR_GENRE_HEX; label: string; pct: number }[] = [
    { id: 'mystery', label: 'Mystery', pct: 71 },
    { id: 'literary', label: 'Literary', pct: 12 },
    { id: 'gothic', label: 'Gothic', pct: 8 },
    { id: 'romance', label: 'Romance', pct: 5 },
  ]
  // Initialise visible (`on=true`) so a paused background tab shows the full
  // verdict rather than empty tracks (L-08 robustness). The cycle re-plays the
  // fill purely for delight when the tab is foregrounded — and ONLY when the
  // document is visible, so a tab backgrounded mid-replay can never strand the
  // bars at width:0 (the §7 "degrade to a valid static frame" contract).
  const [on, setOn] = useState(true)
  useEffect(() => {
    let alive = true
    let restore: ReturnType<typeof setTimeout> | null = null
    const cycle = () => {
      if (!alive || document.hidden) return
      setOn(false)
      restore = setTimeout(() => alive && setOn(true), 120)
    }
    // Whenever the tab is hidden, force the bars back to their target widths so
    // the static frame is always coherent.
    const onVisibility = () => {
      if (document.hidden) {
        if (restore) clearTimeout(restore)
        setOn(true)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    const iv = setInterval(cycle, 4200)
    return () => {
      alive = false
      clearInterval(iv)
      if (restore) clearTimeout(restore)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
  return (
    <FigFrame label="fig. v — the verdict" height={156}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '24px 16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
        }}
      >
        {rows.map((r) => {
          const hex = RR_GENRE_HEX[r.id]
          return (
            <div
              key={r.id}
              style={{ display: 'grid', gridTemplateColumns: '58px 1fr 30px', gap: 8, alignItems: 'center' }}
            >
              <span
                style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 11.5, color: INK, textAlign: 'right' }}
              >
                {r.label}
              </span>
              <div style={{ height: 9, background: 'var(--ink-22)', position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: on ? `${r.pct}%` : '0%',
                    background: hex,
                    transition: 'width 760ms cubic-bezier(0.4,0,0.2,1)',
                  }}
                />
              </div>
              <span style={{ fontFamily: MONO, fontSize: 9.5, color: MUTED, textAlign: 'right' }}>
                {r.pct}
              </span>
            </div>
          )
        })}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 12, color: INK }}>
            verdict — <span style={{ color: RR_GENRE_HEX.mystery }}>Mystery</span>
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: '0.1em',
              color: ACCENT,
              border: '0.5px solid var(--accent)',
              padding: '1px 6px',
            }}
          >
            0.71 · marginal
          </span>
        </div>
      </div>
    </FigFrame>
  )
}

// keyframes used by the figures (scoped once, mounted with the panel)
function FigKeyframes() {
  return (
    <style>{`
      @keyframes rr-fig-pulse { 0%,100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.5); opacity: 0.25; } }
      @keyframes rr-fig-flatten {
        0%, 18%   { transform: rotateX(58deg) rotateZ(-4deg) scale(0.9); }
        50%, 68%  { transform: rotateX(0deg)  rotateZ(0deg)  scale(1); }
        100%      { transform: rotateX(58deg) rotateZ(-4deg) scale(0.9); }
      }
    `}</style>
  )
}

// ───────────────────────────────────────────────────────────────
// Panel 03 — How it works (5 numbered method steps + live figures)
// ───────────────────────────────────────────────────────────────
function Step({
  n,
  h,
  fig,
  children,
}: {
  n: string
  h: string
  fig?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <li style={{ padding: '16px 0', borderBottom: '0.5px dotted var(--ink-33)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 14 }}>
        <span
          style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 28, color: ACCENT, lineHeight: 1 }}
        >
          {n}
        </span>
        <div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15.5, marginBottom: 4 }}>
            {h}
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.65 }}>{children}</div>
        </div>
      </div>
      {fig && <div style={{ marginTop: 12 }}>{fig}</div>}
    </li>
  )
}

export function MethodPanel() {
  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FigKeyframes />
      <p style={{ fontSize: 14.5, lineHeight: 1.7, margin: 0 }}>
        Every novel is reduced to two readings of itself — a <em>position</em> and a
        <em> shape</em> — and then placed on the plate. Submitted texts go through the
        same pipeline. The little plates below are live — they redraw as you read.
      </p>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        <Step n="i" h="Tokenise &amp; vectorise the corpus." fig={<FigWordEmbed />}>
          The 122 novels are read into a word2vec embedding of dimension 300, trained on
          the corpus itself with a window of 15 tokens. Words used in similar company
          settle near one another.
        </Step>
        <Step n="ii" h="Position — the centroid track." fig={<FigCentroid />}>
          A book&rsquo;s <em>position</em> is the inverse-frequency-weighted mean of its
          word vectors — the marked point below. This carries the bulk of the signal,
          about{' '}
          <span
            style={{
              fontFamily: MONO,
              background: CARD,
              padding: '0 4px',
              border: '0.5px solid var(--ink-33)',
            }}
          >
            0.76
          </span>{' '}
          of a typical verdict.
        </Step>
        <Step n="iii" h="Shape — the topology track." fig={<FigTopology />}>
          A book&rsquo;s <em>shape</em> is the persistent homology of its
          vocabulary&rsquo;s pairwise distances. As the radius grows, edges form and
          loops are born; the long-lived ones become the book&rsquo;s signature. This
          catches the close calls.
        </Step>
        <Step n="iv" h="Project to the plane." fig={<FigProjection />}>
          To draw a plate, we project the 300-dimensional positions to two dimensions via
          UMAP. The plane preserves local neighbourhoods; it distorts global distance. You
          can swap the projection in the chip row on Collection.
        </Step>
        <Step n="v" h="Read &amp; report." fig={<FigVerdict />}>
          A submitted text is run through (i) and then scored against each region&rsquo;s
          centroid and topological signature. The verdict is the highest-scoring region, a
          confidence, and the five catalogued works closest to it.
        </Step>
      </ol>
      <div
        style={{
          marginTop: 4,
          padding: '12px 14px',
          background: CARD,
          border: '1px solid var(--ink-33)',
          fontSize: 12.5,
          lineHeight: 1.6,
          fontStyle: 'italic',
          color: MUTED,
        }}
      >
        Confidences below 0.80 are reported as <em>marginal</em>. Roughly a fifth of
        catalogued works receive a marginal reading on their own corpus — most novels sit
        close to a border, and the method tries to be honest about that.
      </div>
    </article>
  )
}
