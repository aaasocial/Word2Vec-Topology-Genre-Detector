// Shared wireframe primitives + fake data — used by all directions.

const GENRES = [
  { id: 'adventure',      label: 'Adventure',      hex: '#C45533', count: 14 },
  { id: 'gothic',         label: 'Gothic Horror',  hex: '#6E4A8E', count: 11 },
  { id: 'historical',     label: 'Historical',     hex: '#B68D3F', count: 18 },
  { id: 'literary',       label: 'Literary',       hex: '#3E7F75', count: 22 },
  { id: 'mystery',        label: 'Mystery',        hex: '#3A6CA8', count: 16 },
  { id: 'romance',        label: 'Romance',        hex: '#B65385', count: 13 },
  { id: 'speculative',    label: 'Speculative',    hex: '#5E5EA6', count: 19 },
  { id: 'western',        label: 'Western',        hex: '#A85C2D', count: 9  },
];

const PROJECTIONS = ['PCA', 'KPCA', 'UMAP', 't-SNE'];

// Deterministic pseudo-random for stable wireframes.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generates a believable cluster-shaped scatter:
// each genre gets a cluster center + spread. Returns an array of {x, y, genreIdx}.
function generateScatter(seed, count = 320, w = 1, h = 1) {
  const rng = mulberry32(seed);
  const centers = GENRES.map((_, i) => {
    const theta = (i / GENRES.length) * Math.PI * 2 + rng() * 0.4;
    const r = 0.27 + rng() * 0.08;
    return {
      cx: 0.5 + Math.cos(theta) * r,
      cy: 0.5 + Math.sin(theta) * r * 0.78,
      spread: 0.06 + rng() * 0.05,
    };
  });
  const points = [];
  for (let i = 0; i < count; i++) {
    const gi = Math.floor(rng() * GENRES.length);
    const c = centers[gi];
    // box-muller-ish blob
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(-2 * Math.log(rng() + 1e-9)) * c.spread;
    const x = c.cx + Math.cos(a) * d;
    const y = c.cy + Math.sin(a) * d;
    if (x > 0.02 && x < 0.98 && y > 0.02 && y < 0.98) {
      points.push({ x: x * w, y: y * h, g: gi });
    }
  }
  return points;
}

// A pure SVG scatter — used inside wireframes to suggest the canvas
// without committing to actual visuals.
function ScatterPlaceholder({
  width, height, seed = 7, density = 320,
  pointSize = 2.4, opacity = 0.85, monoColor = null,
  highlightGenre = null, dimOthers = false,
  showAxes = false, background = 'transparent', stroke = null,
  className = '',
}) {
  const pts = React.useMemo(
    () => generateScatter(seed, density, width, height),
    [seed, density, width, height]
  );
  return (
    <svg
      className={className}
      width={width} height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', background }}
    >
      {showAxes && (
        <g stroke={stroke || 'currentColor'} strokeOpacity="0.18" strokeWidth="1">
          <line x1="0" y1={height - 0.5} x2={width} y2={height - 0.5} />
          <line x1="0.5" y1="0" x2="0.5" y2={height} />
        </g>
      )}
      {pts.map((p, i) => {
        const g = GENRES[p.g];
        let fill = monoColor || g.hex;
        let op = opacity;
        if (highlightGenre !== null) {
          if (g.id !== highlightGenre) {
            if (dimOthers) op = opacity * 0.18;
          } else {
            op = 1;
          }
        }
        return (
          <circle
            key={i}
            cx={p.x} cy={p.y} r={pointSize}
            fill={fill}
            opacity={op}
          />
        );
      })}
    </svg>
  );
}

// A faux topographic field — looks like contour lines.
function ContourField({ width, height, seed = 11, stroke = 'currentColor', strokeOpacity = 0.22 }) {
  const rng = mulberry32(seed);
  const layers = [];
  const layerCount = 9;
  for (let l = 0; l < layerCount; l++) {
    const cx = 0.2 + rng() * 0.6;
    const cy = 0.2 + rng() * 0.6;
    for (let i = 0; i < 5; i++) {
      const rx = (0.05 + i * 0.05 + rng() * 0.02) * width;
      const ry = (0.04 + i * 0.045 + rng() * 0.02) * height;
      const rot = rng() * 60 - 30;
      layers.push(
        <ellipse
          key={`${l}-${i}`}
          cx={cx * width} cy={cy * height}
          rx={rx} ry={ry}
          fill="none"
          stroke={stroke} strokeOpacity={strokeOpacity * (1 - i * 0.12)}
          strokeWidth="0.8"
          transform={`rotate(${rot} ${cx * width} ${cy * height})`}
        />
      );
    }
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {layers}
    </svg>
  );
}

// Persistence-diagram placeholder.
function PersistenceDiagram({ width, height, seed = 3, color = 'currentColor', accent = '#FF2D7E' }) {
  const rng = mulberry32(seed);
  const pad = 24;
  const pts = [];
  for (let i = 0; i < 28; i++) {
    const birth = rng() * 0.6;
    const death = birth + rng() * (0.4 - birth * 0.2) + 0.04;
    pts.push({ birth, death, dim: rng() < 0.25 ? 1 : 0 });
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <line x1={pad} y1={height - pad} x2={width - pad} y2={pad}
        stroke={color} strokeOpacity="0.3" strokeWidth="1" strokeDasharray="2 3" />
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke={color} strokeOpacity="0.4" strokeWidth="1" />
      <line x1={pad} y1={height - pad} x2={pad} y2={pad} stroke={color} strokeOpacity="0.4" strokeWidth="1" />
      {pts.map((p, i) => {
        const x = pad + p.birth * (width - 2 * pad);
        const y = height - pad - p.death * (height - 2 * pad);
        return p.dim === 0 ? (
          <circle key={i} cx={x} cy={y} r="3" fill={color} opacity="0.7" />
        ) : (
          <rect key={i} x={x - 3} y={y - 3} width="6" height="6"
            fill="none" stroke={accent} strokeWidth="1.4" />
        );
      })}
    </svg>
  );
}

// Heatmap grid (genre-vs-word).
function HeatmapGrid({ rows = 8, cols = 18, width, height, base = '#222', accent = '#000' }) {
  const rng = mulberry32(rows * 17 + cols);
  const cellW = width / cols;
  const cellH = height / rows;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = rng();
      const op = Math.pow(v, 1.7);
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={c * cellW} y={r * cellH}
          width={cellW - 1} height={cellH - 1}
          fill={accent} fillOpacity={op}
        />
      );
    }
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <rect x="0" y="0" width={width} height={height} fill={base} />
      {cells}
    </svg>
  );
}

// Simple VR-edge graph placeholder.
function VREdges({ width, height, seed = 19, stroke = 'currentColor', node = 'currentColor' }) {
  const rng = mulberry32(seed);
  const nodes = [];
  for (let i = 0; i < 14; i++) {
    nodes.push({ x: 0.1 + rng() * 0.8, y: 0.12 + rng() * 0.76 });
  }
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 0.28) edges.push([i, j, d]);
    }
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {edges.map(([i, j, d], k) => (
        <line key={k}
          x1={nodes[i].x * width} y1={nodes[i].y * height}
          x2={nodes[j].x * width} y2={nodes[j].y * height}
          stroke={stroke} strokeOpacity={0.5 - d}
          strokeWidth="0.8" />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x * width} cy={n.y * height} r="3.5"
          fill={node} />
      ))}
    </svg>
  );
}

// Probability bars.
function ProbBars({ data, width, color, trackBg, fontColor, labelWidth = 88, mono = true }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: `${labelWidth}px 1fr 44px`, gap: 10, alignItems: 'center', fontSize: 11.5 }}>
          <span style={{ color: fontColor, fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit', textTransform: mono ? 'uppercase' : 'none', letterSpacing: mono ? '0.04em' : 0 }}>{d.label}</span>
          <div style={{ height: 8, background: trackBg, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, width: `${d.pct}%`, background: d.color || color }} />
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, textAlign: 'right', color: fontColor }}>{d.pct.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, {
  GENRES, PROJECTIONS,
  ScatterPlaceholder, ContourField, PersistenceDiagram, HeatmapGrid, VREdges, ProbBars,
  generateScatter,
});
