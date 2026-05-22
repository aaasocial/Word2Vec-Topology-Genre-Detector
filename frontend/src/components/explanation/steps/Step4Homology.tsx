import { useState } from 'react'

const POINTS = [
  { x: 60, y: 40 }, { x: 100, y: 30 }, { x: 130, y: 50 },
  { x: 50, y: 80 }, { x: 90, y: 90 }, { x: 140, y: 85 },
  { x: 70, y: 130 }, { x: 110, y: 140 }, { x: 160, y: 60 },
  { x: 30, y: 110 }, { x: 170, y: 120 }, { x: 120, y: 110 },
]

// Pre-computed edges with birth epsilon
const EDGES: { a: number; b: number; eps: number }[] = [
  { a: 0, b: 1, eps: 0.15 }, { a: 1, b: 2, eps: 0.2 },
  { a: 3, b: 4, eps: 0.2 }, { a: 4, b: 5, eps: 0.25 },
  { a: 6, b: 7, eps: 0.2 }, { a: 0, b: 3, eps: 0.3 },
  { a: 2, b: 5, eps: 0.3 }, { a: 2, b: 8, eps: 0.35 },
  { a: 3, b: 9, eps: 0.35 }, { a: 5, b: 10, eps: 0.4 },
  { a: 4, b: 11, eps: 0.4 }, { a: 5, b: 11, eps: 0.4 },
  { a: 6, b: 9, eps: 0.45 }, { a: 7, b: 11, eps: 0.45 },
  { a: 8, b: 10, eps: 0.5 }, { a: 1, b: 4, eps: 0.55 },
  { a: 10, b: 11, eps: 0.55 }, { a: 0, b: 6, eps: 0.6 },
  { a: 7, b: 10, eps: 0.65 }, { a: 9, b: 6, eps: 0.5 },
]

export function Step4Homology() {
  const [epsilon, setEpsilon] = useState(0.3)

  const visibleEdges = EDGES.filter((e) => e.eps <= epsilon)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h3 style={{ fontSize: 24, fontWeight: 600, color: '#F5F5FF', margin: 0 }}>
        Persistent Homology
      </h3>

      {/* Mini VR animation */}
      <div style={{ margin: '0 auto' }}>
        <svg
          width={220}
          height={180}
          style={{
            background: '#0A0A0F',
            borderRadius: 8,
            border: '1px solid #1E1E2A',
          }}
        >
          {/* Edges */}
          {visibleEdges.map((e, i) => {
            const isNew = Math.abs(e.eps - epsilon) < 0.06
            return (
              <line
                key={i}
                x1={POINTS[e.a].x}
                y1={POINTS[e.a].y}
                x2={POINTS[e.b].x}
                y2={POINTS[e.b].y}
                stroke={isNew ? '#FACC15' : '#4A4A5A'}
                strokeWidth={isNew ? 2 : 1}
                opacity={isNew ? 1 : 0.6}
              />
            )
          })}
          {/* Points */}
          {POINTS.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill="#6366F1"
              opacity={0.9}
            />
          ))}
        </svg>

        {/* Epsilon slider */}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#6B6B80', width: 16 }}>0</span>
          <input
            type="range"
            min={0}
            max={0.7}
            step={0.01}
            value={epsilon}
            onChange={(e) => setEpsilon(Number(e.target.value))}
            aria-label="Epsilon slider"
            style={{ flex: 1, accentColor: '#FACC15' }}
          />
          <span style={{ fontSize: 11, color: '#6B6B80', fontFamily: 'monospace' }}>
            {epsilon.toFixed(2)}
          </span>
        </div>
      </div>

      <div style={{ fontSize: 14, color: '#9090A0', lineHeight: 1.7, maxWidth: 600 }}>
        <p style={{ margin: '0 0 12px' }}>
          As the distance threshold (epsilon) increases, edges form between nearby points.
          <strong style={{ color: '#FACC15' }}> Yellow edges</strong> are newly born at the
          current threshold.
        </p>
        <p style={{ margin: 0 }}>
          Persistent homology tracks when H₁ loops appear and disappear during this
          filtration. Loops that persist across many epsilon values represent genuine
          geometric structure of the genre. (v2 ships H₁-only — H₀ is degenerate in the
          weighted Vietoris-Rips construction and H₂ is deferred to v3; see
          PROJECT.md Key Decisions.)
        </p>
      </div>
    </div>
  )
}
