import { useRef, useEffect } from 'react'
import { PLASMA_256 } from '@/lib/plasma'

// Static example persistence image data (8x8 grid)
const EXAMPLE_DATA = [
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  0.0, 0.1, 0.2, 0.1, 0.0, 0.0, 0.0, 0.0,
  0.0, 0.3, 0.8, 0.5, 0.1, 0.0, 0.0, 0.0,
  0.0, 0.2, 0.6, 1.0, 0.4, 0.1, 0.0, 0.0,
  0.0, 0.0, 0.3, 0.5, 0.7, 0.3, 0.0, 0.0,
  0.0, 0.0, 0.1, 0.2, 0.4, 0.2, 0.0, 0.0,
  0.0, 0.0, 0.0, 0.1, 0.1, 0.1, 0.0, 0.0,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
]

export function Step5PersistenceImage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const M = 8
    const size = 160
    canvas.width = size
    canvas.height = size
    const cellW = size / M
    const cellH = size / M

    for (let row = 0; row < M; row++) {
      for (let col = 0; col < M; col++) {
        const val = EXAMPLE_DATA[row * M + col]
        const t = Math.max(0, Math.min(1, val))
        const idx = Math.round(t * 255)
        const [r, g, b] = PLASMA_256[idx]
        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.fillRect(col * cellW, row * cellH, cellW, cellH)
      }
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h3 style={{ fontSize: 24, fontWeight: 600, color: '#F5F5FF', margin: 0 }}>
        Persistence Image
      </h3>

      {/* Heatmap visual */}
      <div style={{ margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              color: '#6B6B80',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
            }}
          >
            Persistence
          </span>
          <canvas
            ref={canvasRef}
            width={160}
            height={160}
            style={{ width: 160, height: 160, imageRendering: 'pixelated', borderRadius: 4 }}
          />
        </div>
        <div style={{ fontSize: 11, color: '#6B6B80', marginTop: 4 }}>Birth scale</div>
      </div>

      <div style={{ fontSize: 14, color: '#9090A0', lineHeight: 1.7, maxWidth: 600 }}>
        <p style={{ margin: '0 0 12px' }}>
          The persistence diagram (birth vs. death of features) is converted into a
          fixed-resolution image using Gaussian smoothing. Bright regions indicate
          many persistent features at those birth/death coordinates.
        </p>
        <p style={{ margin: 0 }}>
          This transformation converts variable-length persistence diagrams into fixed-length
          vectors that a classifier can process. Each genre produces a distinctive heatmap
          pattern -- romance has different topological signatures than mystery.
        </p>
      </div>
    </div>
  )
}
