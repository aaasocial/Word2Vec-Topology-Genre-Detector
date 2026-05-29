// Reading Room — mini figures for the "How it works" panel.
// Five small, self-animating diagrams in the reading-room idiom
// (paper card, ink hairlines, Spectral + JetBrains type). Each illustrates
// one step of the method. They mount only when the Method tab is open.

// ── shared chrome ───────────────────────────────────────────────
function FigFrame({ palette, label, height = 150, children }) {
  return (
    <figure style={{
      margin: 0,
      border: `1px solid ${palette.ink}`,
      background: palette.card,
      position: 'relative',
      height,
      overflow: 'hidden',
    }}>
      {children}
      {label && (
        <figcaption style={{
          position: 'absolute', top: 6, left: 8,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 8.5,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: palette.muted, pointerEvents: 'none',
        }}>{label}</figcaption>
      )}
    </figure>
  );
}

// ════════════════════════════════════════════════════════════════
// i — Tokenise & vectorise: words land as points; like sits by like.
// ════════════════════════════════════════════════════════════════
function FigWordEmbed({ palette, accent }) {
  const g = (id) => (GENRES.find(x => x.id === id) || {}).hex || palette.ink;
  const clusters = [
    { hex: g('romance'),     words: [['love', 54, 34], ['passion', 30, 52], ['heart', 70, 60]] },
    { hex: g('adventure'),   words: [['sword', 300, 40], ['battle', 332, 60], ['knight', 296, 78]] },
    { hex: g('speculative'), words: [['spell', 70, 118], ['magic', 40, 100], ['dragon', 96, 102]] },
    { hex: g('mystery'),     words: [['clue', 320, 116], ['murder', 296, 100], ['witness', 318, 134]] },
  ];
  return (
    <FigFrame palette={palette} label="fig. i — the embedding">
      <svg viewBox="0 0 380 160" style={{ width: '100%', height: '100%', display: 'block' }}>
        <line x1="0" y1="159" x2="380" y2="159" stroke={palette.ink} strokeOpacity="0.16" />
        <line x1="1" y1="0" x2="1" y2="160" stroke={palette.ink} strokeOpacity="0.16" />
        {clusters.map((c, ci) => (
          <g key={ci}>
            {c.words.map(([w, x, y], wi) => (
              <g key={w}>
                <circle cx={x} cy={y} r="3.4" fill={c.hex} />
                <text x={x + 7} y={y + 3.5} fontFamily="Spectral, serif" fontStyle="italic"
                  fontSize="12" fill={palette.ink}>{w}</text>
              </g>
            ))}
          </g>
        ))}
      </svg>
    </FigFrame>
  );
}

// ════════════════════════════════════════════════════════════════
// ii — Centroid: weighted words resolve to a single position.
// ════════════════════════════════════════════════════════════════
function FigCentroid({ palette, accent }) {
  // weighted points (weight ~ size). centroid = weighted mean.
  const pts = [
    [70, 50, 1.0], [120, 38, 0.55], [150, 70, 0.8],
    [95, 92, 0.7], [185, 58, 0.4], [60, 96, 0.5],
    [135, 110, 0.9], [205, 95, 0.45], [110, 64, 0.65],
  ];
  const sw = pts.reduce((s, p) => s + p[2], 0);
  const cx = pts.reduce((s, p) => s + p[0] * p[2], 0) / sw;
  const cy = pts.reduce((s, p) => s + p[1] * p[2], 0) / sw;
  return (
    <FigFrame palette={palette} label="fig. ii — the centroid" height={150}>
      <svg viewBox="0 0 260 150" style={{ width: '100%', height: '100%', display: 'block' }}>
        {/* spokes to the centroid */}
        {pts.map((p, i) => (
          <line key={'l' + i} x1={p[0]} y1={p[1]} x2={cx} y2={cy}
            stroke={palette.muted} strokeOpacity="0.3" strokeWidth="0.6"
            strokeDasharray="2 2" />
        ))}
        {/* word points, size ~ weight */}
        {pts.map((p, i) => (
          <circle key={'p' + i} cx={p[0]} cy={p[1]} r={2 + p[2] * 4}
            fill={(GENRES.find(x => x.id === 'mystery') || {}).hex || palette.ink}
            opacity={0.35 + p[2] * 0.5} />
        ))}
        {/* centroid crosshair + pulse */}
        <g>
          <circle cx={cx} cy={cy} r="9" fill="none" stroke={accent} strokeWidth="1.1"
            style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'rr-pulse 2.4s ease-in-out infinite' }} />
          <line x1={cx - 11} y1={cy} x2={cx + 11} y2={cy} stroke={accent} strokeWidth="1.2" />
          <line x1={cx} y1={cy - 11} x2={cx} y2={cy + 11} stroke={accent} strokeWidth="1.2" />
          <text x={cx + 14} y={cy - 9} fontFamily="JetBrains Mono, monospace" fontSize="8.5"
            letterSpacing="0.12em" fill={accent}>POSITION</text>
        </g>
      </svg>
    </FigFrame>
  );
}

// ════════════════════════════════════════════════════════════════
// iii — Topology: an auto-sweeping Vietoris–Rips filtration; a loop
//        forms and dies as the radius ε grows.
// ════════════════════════════════════════════════════════════════
const TOPO_POINTS = [
  { x: 70, y: 38 }, { x: 116, y: 28 }, { x: 152, y: 50 },
  { x: 58, y: 80 }, { x: 104, y: 92 }, { x: 162, y: 86 },
  { x: 82, y: 128 }, { x: 128, y: 138 }, { x: 188, y: 60 },
  { x: 36, y: 112 }, { x: 196, y: 120 }, { x: 138, y: 110 },
];
const TOPO_EDGES = [
  { a: 0, b: 1, e: 0.15 }, { a: 1, b: 2, e: 0.20 }, { a: 3, b: 4, e: 0.20 },
  { a: 4, b: 5, e: 0.25 }, { a: 6, b: 7, e: 0.20 }, { a: 0, b: 3, e: 0.30 },
  { a: 2, b: 5, e: 0.30 }, { a: 2, b: 8, e: 0.35 }, { a: 3, b: 9, e: 0.35 },
  { a: 5, b: 10, e: 0.40 }, { a: 4, b: 11, e: 0.40 }, { a: 5, b: 11, e: 0.40 },
  { a: 6, b: 9, e: 0.45 }, { a: 7, b: 11, e: 0.45 }, { a: 8, b: 10, e: 0.50 },
  { a: 1, b: 4, e: 0.55 }, { a: 10, b: 11, e: 0.55 }, { a: 9, b: 6, e: 0.50 },
];
// a 1-dimensional loop (H1) that is alive while ε ∈ [LOOP_BIRTH, LOOP_DEATH]
const LOOP = [2, 5, 11, 4, 1];
const LOOP_BIRTH = 0.40, LOOP_DEATH = 0.56;

function FigTopology({ palette, accent }) {
  const [eps, setEps] = React.useState(0.18);
  const dragging = React.useRef(false);
  // auto-sweep unless the reader is scrubbing
  React.useEffect(() => {
    let raf, t0;
    const tick = (t) => {
      if (t0 == null) t0 = t;
      if (!dragging.current) {
        const phase = ((t - t0) / 4200) % 1;               // 0..1
        const tri = phase < 0.5 ? phase * 2 : (1 - phase) * 2; // 0..1..0
        setEps(0.08 + tri * 0.56);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const visible = TOPO_EDGES.filter(e => e.e <= eps);
  const loopAlive = eps >= LOOP_BIRTH && eps <= LOOP_DEATH;
  const loopPath = LOOP.map(i => `${TOPO_POINTS[i].x},${TOPO_POINTS[i].y}`).join(' ');
  const ec = (GENRES.find(x => x.id === 'literary') || {}).hex || palette.ink;

  const onScrub = (clientX, target) => {
    const r = target.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    setEps(0.08 + f * 0.56);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <FigFrame palette={palette} label="fig. iii — persistent homology" height={170}>
        <svg viewBox="0 0 240 170" style={{ width: '100%', height: '100%', display: 'block' }}>
          {/* ε-radius discs around each point */}
          {TOPO_POINTS.map((p, i) => (
            <circle key={'d' + i} cx={p.x} cy={p.y} r={eps * 95} fill={accent} fillOpacity="0.05"
              stroke={accent} strokeOpacity="0.10" strokeWidth="0.5" />
          ))}
          {/* the living loop */}
          {loopAlive && (
            <polygon points={loopPath} fill={ec} fillOpacity="0.12"
              stroke={ec} strokeWidth="1.4" strokeOpacity="0.8" />
          )}
          {/* edges */}
          {visible.map((e, i) => {
            const fresh = Math.abs(e.e - eps) < 0.05;
            return (
              <line key={i}
                x1={TOPO_POINTS[e.a].x} y1={TOPO_POINTS[e.a].y}
                x2={TOPO_POINTS[e.b].x} y2={TOPO_POINTS[e.b].y}
                stroke={fresh ? accent : palette.muted}
                strokeWidth={fresh ? 1.8 : 1}
                strokeOpacity={fresh ? 1 : 0.5} />
            );
          })}
          {/* points */}
          {TOPO_POINTS.map((p, i) => (
            <circle key={'p' + i} cx={p.x} cy={p.y} r="3.4" fill={palette.ink} />
          ))}
          {loopAlive && (
            <text x="120" y="162" textAnchor="middle" fontFamily="Spectral, serif" fontStyle="italic"
              fontSize="11" fill={ec}>a loop — one H₁ feature, alive</text>
          )}
        </svg>
      </FigFrame>
      {/* ε scrubber */}
      <div
        onMouseDown={(e) => { dragging.current = true; onScrub(e.clientX, e.currentTarget); }}
        onMouseMove={(e) => { if (dragging.current) onScrub(e.clientX, e.currentTarget); }}
        onMouseUp={() => { dragging.current = false; }}
        onMouseLeave={() => { dragging.current = false; }}
        style={{ cursor: 'ew-resize', padding: '4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: palette.muted }}>ε</span>
          <div style={{ flex: 1, height: 3, background: `${palette.ink}22`, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, width: `${((eps - 0.08) / 0.56) * 100}%`, background: accent }} />
            <div style={{
              position: 'absolute', top: -3.5, left: `calc(${((eps - 0.08) / 0.56) * 100}% - 5px)`,
              width: 10, height: 10, borderRadius: '50%', background: palette.card,
              border: `1.4px solid ${accent}`,
            }} />
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, color: palette.ink, width: 30, textAlign: 'right' }}>
            {eps.toFixed(2)}
          </span>
        </div>
        <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 11, color: palette.muted, marginTop: 4 }}>
          drag to grow the radius — watch edges (and the loop) appear, then fill in.
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// iv — Projection: a tilted 300-D cloud flattens onto the plane (UMAP).
// ════════════════════════════════════════════════════════════════
function FigProjection({ palette, accent }) {
  const pts = React.useMemo(() => generateScatter(4, 90, 1, 1), []);
  return (
    <FigFrame palette={palette} label="fig. iv — projection to the plane" height={170}>
      <div style={{ position: 'absolute', inset: 0, perspective: '520px' }}>
        <div style={{
          position: 'absolute', inset: '18px 20px',
          transformStyle: 'preserve-3d',
          transformOrigin: 'center 62%',
          animation: 'rr-flatten 6s ease-in-out infinite',
        }}>
          {/* the plane the cloud settles onto */}
          <div style={{
            position: 'absolute', inset: 0,
            border: `1px solid ${palette.ink}`,
            background: `${palette.paper2}`,
          }} />
          {/* grid rulings */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            {[20, 40, 60, 80].map(v => (
              <g key={v} stroke={palette.ink} strokeOpacity="0.10" strokeWidth="0.4">
                <line x1={v} y1="0" x2={v} y2="100" />
                <line x1="0" y1={v} x2="100" y2={v} />
              </g>
            ))}
          </svg>
          {pts.map((p, i) => {
            const g = GENRES[p.g];
            return (
              <span key={i} style={{
                position: 'absolute',
                left: `${p.x * 100}%`, top: `${p.y * 100}%`,
                width: 4, height: 4, borderRadius: '50%',
                background: g.hex, transform: 'translate(-50%,-50%)',
                opacity: 0.85,
              }} />
            );
          })}
        </div>
      </div>
      <div style={{
        position: 'absolute', bottom: 6, right: 8,
        fontFamily: 'JetBrains Mono, monospace', fontSize: 8.5,
        letterSpacing: '0.12em', color: palette.muted,
      }}>300-D → 2 · UMAP</div>
    </FigFrame>
  );
}

// ════════════════════════════════════════════════════════════════
// v — Read & report: score against each region; the verdict + bars.
// ════════════════════════════════════════════════════════════════
function FigVerdict({ palette, accent }) {
  const rows = [
    { id: 'mystery',  label: 'Mystery',  pct: 71 },
    { id: 'literary', label: 'Literary', pct: 12 },
    { id: 'gothic',   label: 'Gothic',   pct: 8 },
    { id: 'romance',  label: 'Romance',  pct: 5 },
  ];
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    const cycle = () => { if (!alive) return; setOn(false); setTimeout(() => alive && setOn(true), 120); };
    cycle();
    const iv = setInterval(cycle, 4200);
    return () => { alive = false; clearInterval(iv); };
  }, []);
  return (
    <FigFrame palette={palette} label="fig. v — the verdict" height={156}>
      <div style={{ position: 'absolute', inset: 0, padding: '24px 16px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {rows.map((r) => {
          const hex = (GENRES.find(x => x.id === r.id) || {}).hex || palette.ink;
          return (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '58px 1fr 30px', gap: 8, alignItems: 'center' }}>
              <span style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 11.5, color: palette.ink, textAlign: 'right' }}>{r.label}</span>
              <div style={{ height: 9, background: `${palette.ink}14`, position: 'relative' }}>
                <div style={{
                  position: 'absolute', inset: 0, width: on ? `${r.pct}%` : '0%',
                  background: hex, transition: 'width 760ms cubic-bezier(0.4,0,0.2,1)',
                }} />
              </div>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, color: palette.muted, textAlign: 'right' }}>{r.pct}</span>
            </div>
          );
        })}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 12, color: palette.ink }}>
            verdict — <span style={{ color: (GENRES.find(x => x.id === 'mystery') || {}).hex }}>Mystery</span>
          </span>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
            letterSpacing: '0.1em', color: accent,
            border: `0.5px solid ${accent}`, padding: '1px 6px',
          }}>0.71 · marginal</span>
        </div>
      </div>
    </FigFrame>
  );
}

// keyframes used by the figures (scoped once)
function FigKeyframes() {
  return (
    <style>{`
      @keyframes rr-fade-up { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes rr-fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes rr-pulse { 0%,100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.5); opacity: 0.25; } }
      @keyframes rr-flatten {
        0%, 18%   { transform: rotateX(58deg) rotateZ(-4deg) scale(0.9); }
        50%, 68%  { transform: rotateX(0deg)  rotateZ(0deg)  scale(1); }
        100%      { transform: rotateX(58deg) rotateZ(-4deg) scale(0.9); }
      }
    `}</style>
  );
}

Object.assign(window, {
  FigWordEmbed, FigCentroid, FigTopology, FigProjection, FigVerdict, FigKeyframes,
});
