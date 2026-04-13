export function Step1WordEmbed() {
  const words = [
    { word: 'love', x: 40, y: 30 },
    { word: 'passion', x: 55, y: 35 },
    { word: 'heart', x: 45, y: 45 },
    { word: 'sword', x: 170, y: 60 },
    { word: 'battle', x: 185, y: 55 },
    { word: 'knight', x: 175, y: 75 },
    { word: 'spell', x: 80, y: 150 },
    { word: 'magic', x: 95, y: 140 },
    { word: 'dragon', x: 110, y: 160 },
    { word: 'clue', x: 200, y: 140 },
    { word: 'murder', x: 215, y: 130 },
    { word: 'detect', x: 205, y: 155 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h3 style={{ fontSize: 24, fontWeight: 600, color: '#F5F5FF', margin: 0 }}>
        Word2Vec Embedding
      </h3>

      {/* Mini scatter visual */}
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
        {words.map((w) => (
          <div
            key={w.word}
            style={{
              position: 'absolute',
              left: w.x,
              top: w.y,
              fontSize: 10,
              color: '#9090A0',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#6366F1',
                marginRight: 4,
                verticalAlign: 'middle',
              }}
            />
            {w.word}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 14, color: '#9090A0', lineHeight: 1.7, maxWidth: 600 }}>
        <p style={{ margin: '0 0 12px' }}>
          Each word in the corpus is transformed into a high-dimensional vector using a Word2Vec
          model trained on the entire collection. Words that appear in similar contexts end up
          close together in this vector space.
        </p>
        <p style={{ margin: 0 }}>
          The model learns that "love" and "passion" are semantically related, placing them
          near each other, while "sword" and "battle" form their own cluster. These spatial
          relationships form the foundation for genre-specific geometric patterns.
        </p>
      </div>
    </div>
  )
}
