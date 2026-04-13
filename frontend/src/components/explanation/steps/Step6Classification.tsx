const GENRES = [
  { name: 'Romance', confidence: 0.78, color: '#F472B6' },
  { name: 'Literary', confidence: 0.09, color: '#2DD4BF' },
  { name: 'Mystery', confidence: 0.05, color: '#60A5FA' },
  { name: 'Gothic', confidence: 0.03, color: '#C084FC' },
  { name: 'Fantasy', confidence: 0.02, color: '#A78BFA' },
  { name: 'Others', confidence: 0.03, color: '#4A4A5A' },
]

export function Step6Classification() {
  const maxConfidence = Math.max(...GENRES.map((g) => g.confidence))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h3 style={{ fontSize: 24, fontWeight: 600, color: '#F5F5FF', margin: 0 }}>
        SVM Classification
      </h3>

      {/* Bar chart */}
      <div
        style={{
          width: 320,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {GENRES.map((g) => (
          <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#9090A0', width: 60, textAlign: 'right' }}>
              {g.name}
            </span>
            <div style={{ flex: 1, height: 20, background: '#1A1A25', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${(g.confidence / maxConfidence) * 100}%`,
                  height: '100%',
                  background: g.color,
                  borderRadius: 4,
                  transition: 'width 500ms ease-out',
                }}
              />
            </div>
            <span style={{ fontSize: 11, color: '#6B6B80', fontFamily: 'monospace', width: 36 }}>
              {(g.confidence * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 14, color: '#9090A0', lineHeight: 1.7, maxWidth: 600 }}>
        <p style={{ margin: '0 0 12px' }}>
          A kernel SVM (Support Vector Machine) classifies each text based on its concatenated
          feature vector: persistence image features and cluster distribution features,
          weighted by the alpha parameter.
        </p>
        <p style={{ margin: 0 }}>
          The classifier outputs confidence scores for each genre. The genre with the highest
          score becomes the prediction. Because the features capture topological structure,
          the classifier can detect genre-specific geometric patterns that simple bag-of-words
          approaches miss.
        </p>
      </div>
    </div>
  )
}
