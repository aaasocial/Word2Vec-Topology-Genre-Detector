// Reading Room — the Topology tab.
// One computation, three windows onto it:
//   (1) a Vietoris–Rips filtration viewer with a live ε slider (the hero),
//   (2) a persistence diagram (birth vs death), and
//   (3) a persistence image (the fixed-size grid the classifier consumes).
// All three are driven by one genre selection; the ε slider links (1)→(2)→(3).
// The topology is computed in the full embedding; the 3D view is a lossy
// projection only, so changing the projection reshuffles (1) but never (2)/(3).

// ── deterministic rng (local; shared.jsx keeps its own private one) ──
function rrRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rrHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const EPS_MAX = 10;

// Build the full topological model for a genre (+ a 3D layout for one projection).
function rrTopoModel(genreId, projection) {
  const baseSeed = rrHash('topo:' + genreId);
  const viewSeed = rrHash(genreId + ':' + projection);

  // ── 3D point cloud: a dominant ring (→ one long-lived H₁ loop) plus a
  //    couple of small sub-clusters and scattered dust. View-seeded so each
  //    projection reshuffles the embedding into a different 3D shadow.
  const vr = rrRng(viewSeed);
  const pts = [];
  const ringN = 18, ringR = 0.92;
  for (let i = 0; i < ringN; i++) {
    const t = (i / ringN) * Math.PI * 2;
    pts.push({
      x: Math.cos(t) * ringR + (vr() - 0.5) * 0.16,
      y: (vr() - 0.5) * 0.34,
      z: Math.sin(t) * ringR + (vr() - 0.5) * 0.16,
      ring: true,
    });
  }
  // two satellite clusters
  for (let c = 0; c < 2; c++) {
    const cxp = (vr() - 0.5) * 1.6, cyp = (vr() - 0.5) * 1.2, czp = (vr() - 0.5) * 1.6;
    for (let i = 0; i < 7; i++) {
      pts.push({ x: cxp + (vr() - 0.5) * 0.4, y: cyp + (vr() - 0.5) * 0.4, z: czp + (vr() - 0.5) * 0.4 });
    }
  }
  // dust
  for (let i = 0; i < 14; i++) {
    pts.push({ x: (vr() - 0.5) * 2.2, y: (vr() - 0.5) * 1.6, z: (vr() - 0.5) * 2.2 });
  }
  const N = pts.length;

  // edges: pairs within a distance cap; birth radius = pairwise distance,
  // normalised so the largest kept edge ≈ EPS_MAX.
  const raw = [];
  let maxD = 0;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, dz = pts[i].z - pts[j].z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < 1.9) { raw.push({ a: i, b: j, d }); if (d > maxD) maxD = d; }
    }
  }
  const edges = raw
    .map(e => ({ a: e.a, b: e.b, birth: +(e.d / maxD * EPS_MAX).toFixed(3) }))
    .sort((p, q) => p.birth - q.birth);

  // ── H₁ persistence features (projection-independent). A handful of real,
  //    long-lived loops sit well above the diagonal; the rest is noise hugging
  //    it. One feature never dies (∞). Genre-seeded so it's stable.
  const pr = rrRng(baseSeed);
  const h1 = [];
  // the dominant ring → one long-lived loop
  h1.push({ birth: 1.1 + pr() * 0.5, death: 6.2 + pr() * 1.4 });
  // a few secondary real loops
  const real = 2 + Math.floor(pr() * 3);
  for (let i = 0; i < real; i++) {
    const birth = 0.8 + pr() * 2.6;
    h1.push({ birth, death: birth + 1.8 + pr() * 2.8 });
  }
  // an immortal feature (one connected component that never closes)
  h1.push({ birth: 0.4 + pr() * 0.3, death: Infinity, inf: true });
  // noise near the diagonal
  const noise = 24 + Math.floor(pr() * 10);
  for (let i = 0; i < noise; i++) {
    const birth = pr() * 7.2;
    h1.push({ birth, death: Math.min(EPS_MAX, birth + 0.06 + pr() * 0.7) });
  }

  // ── persistence image: rotate (birth, death) → (birth, persistence),
  //    splat a Gaussian weighted by persistence onto an M×M grid.
  const M = 20;
  const img = new Float32Array(M * M);
  const maxPers = 8;            // persistence axis range
  const sigma = 0.9;
  h1.forEach(f => {
    if (f.inf || !isFinite(f.death)) return;
    const pers = f.death - f.birth;
    const gx = (f.birth / EPS_MAX) * (M - 1);
    const gy = (1 - pers / maxPers) * (M - 1); // top = high persistence
    const w = pers;
    for (let r = 0; r < M; r++) {
      for (let c = 0; c < M; c++) {
        const dx = c - gx, dy = r - gy;
        img[r * M + c] += w * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      }
    }
  });
  let vmax = 0;
  for (let i = 0; i < img.length; i++) if (img[i] > vmax) vmax = img[i];

  // a believable raw edge total for the readout
  const edgeTotal = edges.length;
  return { pts, edges, h1, M, img, vmin: 0, vmax, edgeTotal, maxPers };
}

// ── 3D → 2D orthographic projection with yaw/pitch ──
function rrProject(p, yaw, pitch, cx, cy, scale) {
  const cy0 = Math.cos(yaw), sy0 = Math.sin(yaw);
  let x = p.x * cy0 - p.z * sy0;
  let z = p.x * sy0 + p.z * cy0;
  const cx0 = Math.cos(pitch), sx0 = Math.sin(pitch);
  let y = p.y * cx0 - z * sx0;
  let z2 = p.y * sx0 + z * cx0;
  return { X: cx + x * scale, Y: cy + y * scale, depth: z2 };
}

// ════════════════════════════════════════════════════════════════
// (1) Vietoris–Rips filtration viewer
// ════════════════════════════════════════════════════════════════
function VRViewer({ model, eps, palette, accent, genreHex, width, height }) {
  const [rot, setRot] = React.useState({ yaw: 0.6, pitch: 0.5 });
  const drag = React.useRef(null);
  const idle = React.useRef(true);

  React.useEffect(() => {
    let raf;
    const tick = () => {
      if (idle.current) setRot(r => ({ ...r, yaw: r.yaw + 0.0032 }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onDown = (e) => { idle.current = false; drag.current = { x: e.clientX, y: e.clientY, ...rot }; };
  const onMove = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
    setRot({ yaw: drag.current.yaw + dx * 0.01, pitch: Math.max(-1.2, Math.min(1.2, drag.current.pitch + dy * 0.01)) });
  };
  const onUp = () => { drag.current = null; setTimeout(() => { idle.current = true; }, 2600); };

  const cx = width / 2, cy = height / 2, scale = Math.min(width, height) * 0.34;
  const proj = model.pts.map(p => rrProject(p, rot.yaw, rot.pitch, cx, cy, scale));
  const visible = model.edges.filter(e => e.birth <= eps);
  const freshFrom = Math.max(0, eps - 0.5);

  return (
    <svg
      width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', cursor: drag.current ? 'grabbing' : 'grab', touchAction: 'none' }}
      onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}>
      {/* edges */}
      {visible.map((e, i) => {
        const A = proj[e.a], B = proj[e.b];
        const fresh = e.birth >= freshFrom;
        return (
          <line key={i} x1={A.X} y1={A.Y} x2={B.X} y2={B.Y}
            stroke={fresh ? accent : palette.ink}
            strokeOpacity={fresh ? 0.95 : 0.22}
            strokeWidth={fresh ? 1.3 : 0.6} />
        );
      })}
      {/* points (painter's order by depth) */}
      {proj.map((p, i) => ({ p, i }))
        .sort((u, v) => u.p.depth - v.p.depth)
        .map(({ p, i }) => {
          const k = (p.depth + 1.4) / 2.8;             // 0..1 front→back-ish
          const r = 3.6 - k * 1.6;
          return (
            <circle key={i} cx={p.X} cy={p.Y} r={Math.max(1.4, r)}
              fill={model.pts[i].ring ? genreHex : palette.ink}
              opacity={0.45 + (1 - k) * 0.5} />
          );
        })}
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════
// (2) Persistence diagram
// ════════════════════════════════════════════════════════════════
function TopoDiagram({ model, eps, palette, accent, size }) {
  const pad = 30;
  const inner = size - pad * 2;
  const sx = (v) => pad + (v / EPS_MAX) * inner;
  const sy = (v) => size - pad - (Math.min(v, EPS_MAX) / EPS_MAX) * inner;
  const finite = model.h1.filter(f => isFinite(f.death));
  const infinite = model.h1.filter(f => !isFinite(f.death));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {/* frame + diagonal */}
      <line x1={pad} y1={size - pad} x2={size - pad} y2={size - pad} stroke={palette.ink} strokeOpacity="0.4" />
      <line x1={pad} y1={size - pad} x2={pad} y2={pad} stroke={palette.ink} strokeOpacity="0.4" />
      <line x1={pad} y1={size - pad} x2={size - pad} y2={pad} stroke={palette.ink} strokeOpacity="0.3" strokeDasharray="2 3" />
      {/* the "alive at ε" region: birth ≤ ε ≤ death → upper-left of (ε,ε) */}
      <rect x={pad} y={pad} width={Math.max(0, sx(eps) - pad)} height={Math.max(0, sy(eps) - pad)}
        fill={accent} fillOpacity="0.06" />
      <line x1={sx(eps)} y1={pad} x2={sx(eps)} y2={size - pad} stroke={accent} strokeOpacity="0.5" strokeWidth="1" />
      <line x1={pad} y1={sy(eps)} x2={size - pad} y2={sy(eps)} stroke={accent} strokeOpacity="0.5" strokeWidth="1" />
      <text x={sx(eps) + 3} y={pad + 9} fontFamily="JetBrains Mono, monospace" fontSize="7.5" fill={accent}>ε</text>

      {/* finite features */}
      {finite.map((f, i) => {
        const pers = f.death - f.birth;
        const r = 1.6 + Math.sqrt(pers) * 2.1;
        const alive = f.birth <= eps && f.death >= eps;
        return (
          <circle key={i} cx={sx(f.birth)} cy={sy(f.death)} r={r}
            fill={accent} fillOpacity={alive ? 0.9 : 0.28}
            stroke={alive ? palette.ink : 'none'} strokeWidth={alive ? 0.8 : 0} />
        );
      })}
      {/* infinite features pinned to the top edge */}
      {infinite.map((f, i) => (
        <polygon key={'inf' + i}
          points={`${sx(f.birth)},${pad - 1} ${sx(f.birth) - 4},${pad + 7} ${sx(f.birth) + 4},${pad + 7}`}
          fill={palette.ink} stroke={accent} strokeWidth="1" />
      ))}
      {/* axis labels */}
      <text x={size - pad} y={size - pad + 14} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="8" fill={palette.muted}>birth →</text>
      <text x={pad - 8} y={pad + 2} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="8" fill={palette.muted} transform={`rotate(-90 ${pad - 8} ${pad + 2})`}>death →</text>
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════
// (3) Persistence image (canvas heatmap)
// ════════════════════════════════════════════════════════════════
function lerp(a, b, t) { return a + (b - a) * t; }
function hexToRgb(h) {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rampColor(t, paper2, genreHex, ink) {
  const A = hexToRgb(paper2), B = hexToRgb(genreHex), C = hexToRgb(ink);
  let r, g, b;
  if (t < 0.5) { const u = t / 0.5; r = lerp(A[0], B[0], u); g = lerp(A[1], B[1], u); b = lerp(A[2], B[2], u); }
  else { const u = (t - 0.5) / 0.5; r = lerp(B[0], C[0], u); g = lerp(B[1], C[1], u); b = lerp(B[2], C[2], u); }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function TopoImage({ model, palette, genreHex, size }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    const M = model.M, cell = size / M;
    for (let r = 0; r < M; r++) {
      for (let c = 0; c < M; c++) {
        const t = model.vmax > 0 ? model.img[r * M + c] / model.vmax : 0;
        ctx.fillStyle = rampColor(Math.pow(t, 0.85), palette.paper2, genreHex, palette.ink);
        ctx.fillRect(c * cell, r * cell, Math.ceil(cell), Math.ceil(cell));
      }
    }
  }, [model, genreHex, palette, size]);
  return <canvas ref={ref} width={size} height={size} style={{ display: 'block', width: size, height: size, borderRadius: 1 }} />;
}

// ════════════════════════════════════════════════════════════════
// The screen
// ════════════════════════════════════════════════════════════════
function Topology({ palette, accent, goTo, state, dispatch, openGuide }) {
  const [genreId, setGenreId] = React.useState(null);
  const [projection, setProjection] = React.useState('UMAP');
  const [eps, setEps] = React.useState(2.4);

  // When the guided tour lands here, pre-select a region so the plate (not the
  // empty state) is on screen for the spotlight.
  React.useEffect(() => {
    if (state.tourActive && genreId === null) setGenreId('mystery');
  }, [state.tourActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const genre = GENRES.find(g => g.id === genreId);
  const genreHex = genre ? genre.hex : accent;
  const model = React.useMemo(
    () => (genreId ? rrTopoModel(genreId, projection) : null),
    [genreId, projection]
  );
  const visibleEdges = model ? model.edges.filter(e => e.birth <= eps).length : 0;
  const aliveLoops = model ? model.h1.filter(f => f.birth <= eps && f.death >= eps).length : 0;

  return (
    <RRFrame palette={palette} accent={accent}>
      <RRMasthead palette={palette} accent={accent} section="topology" goTo={goTo} hasUpload={state.hasUploadedText} openGuide={openGuide} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '18px 32px 12px', minHeight: 0, gap: 12 }}>

        {/* ── Shared inputs ─────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <RRLabel palette={palette}>Plate II · the shape of a region</RRLabel>
            <h2 style={{ fontFamily: 'Spectral, serif', fontWeight: 500, fontSize: 25, letterSpacing: '-0.005em', margin: '6px 0 0' }}>
              {genre ? <>The topology of <span style={{ fontStyle: 'italic', color: genreHex }}>{genre.label}</span></> : <>The topology of a region</>}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div>
              <RRLabel palette={palette}>Region</RRLabel>
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 360, justifyContent: 'flex-end' }}>
                {GENRES.map(g => {
                  const active = g.id === genreId;
                  return (
                    <button key={g.id} onClick={() => setGenreId(active ? null : g.id)} style={{
                      all: 'unset', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 8px',
                      border: `1px solid ${active ? g.hex : palette.ink + '33'}`,
                      background: active ? g.hex : 'transparent',
                      color: active ? '#fff' : palette.muted,
                      fontFamily: 'Spectral, serif', fontSize: 11.5,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#fff' : g.hex }} />
                      {g.label}
                    </button>
                  );
                })}
                {state.hasUploadedText && (
                  <button onClick={() => setGenreId('__text')} style={{
                    all: 'unset', cursor: 'pointer', padding: '3px 8px',
                    border: `1px dashed ${genreId === '__text' ? accent : palette.ink + '55'}`,
                    color: genreId === '__text' ? accent : palette.muted,
                    fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 11.5,
                  }}>your text</button>
                )}
              </div>
            </div>
          </div>
        </div>

        {model ? (
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 18, minHeight: 0 }}>

            {/* ── (1) VR filtration viewer — the hero ──────────── */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <RRLabel palette={palette}>i · Vietoris–Rips filtration</RRLabel>
                <div style={{ display: 'flex', gap: 0 }}>
                  {PROJECTIONS.map(p => {
                    const active = p === projection;
                    return (
                      <button key={p} onClick={() => setProjection(p)} style={{
                        all: 'unset', cursor: 'pointer', padding: '3px 9px', marginLeft: -1,
                        border: `1px solid ${palette.ink}55`,
                        background: active ? palette.ink : 'transparent',
                        color: active ? palette.paper : palette.ink,
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.04em',
                      }}>{p}</button>
                    );
                  })}
                </div>
              </div>

              <figure data-tour-id="topology-plate" style={{ flex: 1, margin: 0, border: `1px solid ${palette.ink}`, background: palette.card, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0 }}>
                  <VRViewerAuto model={model} eps={eps} palette={palette} accent={accent} genreHex={genreHex} />
                </div>
                <div style={{ position: 'absolute', top: 8, left: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em', color: palette.muted }}>
                  {projection} · drag to rotate
                </div>
                <div style={{ position: 'absolute', top: 8, right: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.1em', color: palette.muted }}>
                  {visibleEdges.toLocaleString()} edges · {aliveLoops} loop{aliveLoops === 1 ? '' : 's'} alive
                </div>
              </figure>

              {/* ε slider */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 12.5, color: palette.muted, width: 92 }}>Filtration radius</span>
                  <input
                    type="range" min={0} max={EPS_MAX} step={EPS_MAX / 200} value={eps}
                    onChange={(e) => setEps(Number(e.target.value))}
                    style={{ flex: 1, accentColor: accent, cursor: 'pointer' }}
                  />
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: palette.ink, width: 52, textAlign: 'right' }}>
                    ε {eps.toFixed(3)}
                  </span>
                </div>
                <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 11.5, color: palette.muted, marginTop: 4 }}>
                  At ε = 0 the cloud is dust; as the radius grows, points connect, loops are born and later fill in. The loops that survive a wide span of ε are the region’s real structure.
                </div>
              </div>
            </section>

            {/* ── (2) + (3) linked panels ───────────────────────── */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <RRLabel palette={palette}>ii · Persistence diagram <span style={{ textTransform: 'none', letterSpacing: 0, fontStyle: 'italic' }}>(H₁)</span></RRLabel>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ border: `1px solid ${palette.ink}`, background: palette.card, padding: 4 }}>
                    <TopoDiagram model={model} eps={eps} palette={palette} accent={accent} size={188} />
                  </div>
                  <div style={{ fontSize: 11.5, lineHeight: 1.55, color: palette.muted, flex: 1 }}>
                    Each dot is one loop — its <em>birth</em> and <em>death</em> radius. Dots far above the diagonal are long-lived and real; dots hugging it are noise. The <span style={{ color: accent }}>shaded corner</span> holds the loops alive at the current ε; the ▲ marks a feature that never closes.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <RRLabel palette={palette}>iii · Persistence image <span style={{ textTransform: 'none', letterSpacing: 0, fontStyle: 'italic' }}>(20 × 20 → 400-vector)</span></RRLabel>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ border: `1px solid ${palette.ink}`, background: palette.card, padding: 4 }}>
                    <TopoImage model={model} palette={palette} genreHex={genreHex} size={150} />
                  </div>
                  <div style={{ fontSize: 11.5, lineHeight: 1.55, color: palette.muted, flex: 1 }}>
                    The diagram, smoothed onto a fixed grid — <em>this</em> is the number the classifier reads. Bright cells are where {genre.label} reliably grows long-lived loops.
                    <div style={{ marginTop: 8 }}>
                      <div style={{ height: 8, background: `linear-gradient(90deg, ${palette.paper2}, ${genreHex}, ${palette.ink})`, border: `0.5px solid ${palette.ink}33` }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 8.5, color: palette.muted, marginTop: 2 }}>
                        <span>{model.vmin.toFixed(0)}</span><span>density</span><span>{model.vmax.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : (
          // ── empty state ───────────────────────────────────────
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, minHeight: 0 }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              {Array.from({ length: 12 }).map((_, i) => {
                const t = (i / 12) * Math.PI * 2;
                return <circle key={i} cx={60 + Math.cos(t) * 36} cy={60 + Math.sin(t) * 36} r="3.2" fill={palette.ink} opacity="0.3" />;
              })}
              <circle cx="60" cy="60" r="40" fill="none" stroke={palette.ink} strokeOpacity="0.18" strokeDasharray="2 4" />
            </svg>
            <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 19, color: palette.muted }}>
              Pick a region to see its topology.
            </div>
          </div>
        )}

        {/* disclaimer */}
        <div style={{
          borderTop: `1px solid ${palette.ink}22`, paddingTop: 8,
          fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 11.5, color: palette.muted,
          display: 'flex', justifyContent: 'space-between', gap: 16,
        }}>
          <span>Only H₁ — loops — is shown here. The persistence is computed in the full embedding; the 3D plate is a lossy projection, so changing it never changes the diagram or the image.<Footnote n="5" accent={accent} /></span>
        </div>
      </div>

      <RRFooter palette={palette} left="Topology" center={genre ? `${genre.label} · H₁` : '—'} right="pl. II" />
    </RRFrame>
  );
}

// Re-mount the VR viewer when the model identity changes (genre/projection)
// so its rotation/idle state resets cleanly.
function VRViewerAuto({ model, eps, palette, accent, genreHex }) {
  const ref = React.useRef(null);
  const [box, setBox] = React.useState({ w: 600, h: 380 });
  React.useEffect(() => {
    const fit = () => { if (ref.current) setBox({ w: ref.current.clientWidth, h: ref.current.clientHeight }); };
    fit();
    window.addEventListener('resize', fit);
    const iv = setInterval(fit, 400);
    return () => { window.removeEventListener('resize', fit); clearInterval(iv); };
  }, []);
  return (
    <div ref={ref} style={{ width: '100%', height: '100%' }}>
      <VRViewer model={model} eps={eps} palette={palette} accent={accent} genreHex={genreHex} width={box.w} height={box.h} />
    </div>
  );
}

Object.assign(window, { Topology });
