const CLUSTERS = [
  { genre: 'romance', color: '#F472B6', points: [
    { x: 60, y: 50, r: 6, w: 0.9 }, { x: 75, y: 40, r: 5, w: 0.7 },
    { x: 55, y: 65, r: 4, w: 0.5 }, { x: 70, y: 55, r: 7, w: 1.0 },
    { x: 85, y: 48, r: 3, w: 0.3 },
  ]},
  { genre: 'mystery', color: '#60A5FA', points: [
    { x: 190, y: 50, r: 6, w: 0.85 }, { x: 200, y: 65, r: 5, w: 0.7 },
    { x: 180, y: 60, r: 4, w: 0.5 }, { x: 195, y: 40, r: 7, w: 0.95 },
    { x: 210, y: 55, r: 3, w: 0.35 },
  ]},
  { genre: 'fantasy', color: '#A78BFA', points: [
    { x: 120, y: 140, r: 6, w: 0.8 }, { x: 135, y: 130, r: 5, w: 0.65 },
    { x: 110, y: 150, r: 4, w: 0.55 }, { x: 130, y: 145, r: 7, w: 0.95 },
    { x: 145, y: 135, r: 3, w: 0.3 },
  ]},
]

export function Step3PointCloud() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h3 style={{ fontSize: 24, fontWeight: 600, color: '#F5F5FF', margin: 0 }}>
        Weighted Point Cloud
      </h3>

      {/* Mini point cloud visual */}
      <div
        style={{
          width: 280,
          height: 200,
          background: '#0A0A0F',
          borderRadius: 8,
          position: 'relative',
          margin: '0 auto',
          border: '1px solid #1E1E2A',
        }}
      >
        {CLUSTERS.map((cluster) =>
          cluster.points.map((p, i) => (
            <div
              key={`${cluster.genre}-${i}`}
              style={{
                position: 'absolute',
                left: p.x - p.r,
                top: p.y - p.r,
                width: p.r * 2,
                height: p.r * 2,
                borderRadius: '50%',
                background: cluster.color,
                opacity: p.w,
              }}
            />
          ))
        )}
        {/* Genre labels */}
        {CLUSTERS.map((c) => (
          <div
            key={c.genre}
            style={{
              position: 'absolute',
              left: c.points[0].x - 15,
              top: c.points[0].y + 15,
              fontSize: 9,
              color: c.color,
              opacity: 0.7,
            }}
          >
            {c.genre}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 14, color: '#9090A0', lineHeight: 1.7, maxWidth: 600 }}>
        <p style={{ margin: '0 0 12px' }}>
          Each word becomes a point in the embedding space. Point size and brightness reflect
          the TF-IDF weight -- more distinctive words appear larger and brighter. Genre colors
          are applied to reveal spatial clustering.
        </p>
        <p style={{ margin: 0 }}>
          Words from the same genre naturally cluster together because they share semantic
          context. These clusters form topological shapes -- loops, voids, and connected
          components -- that characterize each genre's geometric signature.
        </p>
      </div>
    </div>
  )
}
