export function Step2TfidfWeight() {
  const wordsUniform = [
    { word: 'the', size: 14 },
    { word: 'love', size: 14 },
    { word: 'is', size: 14 },
    { word: 'passion', size: 14 },
    { word: 'a', size: 14 },
    { word: 'heart', size: 14 },
  ]

  const wordsWeighted = [
    { word: 'the', size: 9, opacity: 0.2 },
    { word: 'love', size: 18, opacity: 1.0 },
    { word: 'is', size: 8, opacity: 0.15 },
    { word: 'passion', size: 16, opacity: 0.9 },
    { word: 'a', size: 8, opacity: 0.1 },
    { word: 'heart', size: 15, opacity: 0.8 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h3 style={{ fontSize: 24, fontWeight: 600, color: '#F5F5FF', margin: 0 }}>
        TF-IDF Weighting
      </h3>

      {/* Before/after comparison */}
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
        {/* Uniform */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#6B6B80', marginBottom: 8 }}>Before (uniform)</div>
          <div
            style={{
              width: 200,
              height: 120,
              background: '#0A0A0F',
              borderRadius: 8,
              border: '1px solid #1E1E2A',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 12,
            }}
          >
            {wordsUniform.map((w) => (
              <span key={w.word} style={{ fontSize: w.size, color: '#9090A0' }}>
                {w.word}
              </span>
            ))}
          </div>
        </div>

        {/* Weighted */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#6B6B80', marginBottom: 8 }}>After (TF-IDF)</div>
          <div
            style={{
              width: 200,
              height: 120,
              background: '#0A0A0F',
              borderRadius: 8,
              border: '1px solid #1E1E2A',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 12,
            }}
          >
            {wordsWeighted.map((w) => (
              <span
                key={w.word}
                style={{ fontSize: w.size, color: '#E0E0EC', opacity: w.opacity }}
              >
                {w.word}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 14, color: '#9090A0', lineHeight: 1.7, maxWidth: 600 }}>
        <p style={{ margin: '0 0 12px' }}>
          TF-IDF (Term Frequency-Inverse Document Frequency) assigns importance weights to each
          word. Common words like "the" and "is" receive low weights, while genre-distinguishing
          words like "love" and "passion" receive high weights.
        </p>
        <p style={{ margin: 0 }}>
          These weights are computed without genre labels -- they reflect how distinctive a word
          is within its document relative to the entire corpus. This ensures the geometry
          emerges from the text itself, not from supervised labels.
        </p>
      </div>
    </div>
  )
}
