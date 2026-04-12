import { useState, useEffect } from 'react'
import { useVisualizationStore } from '@/stores/visualizationStore'

export function KeyboardHint() {
  const [visible, setVisible] = useState(true)
  const resetCounter = useVisualizationStore(s => s.cameraResetCounter)
  const projection = useVisualizationStore(s => s.projection)

  // Fade out after 5s on mount
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  // Reappear whenever a shortcut fires
  useEffect(() => {
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(timer)
  }, [resetCounter, projection])

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        fontSize: 11,
        color: '#6B6B80',
        opacity: visible ? 1 : 0,
        transition: 'opacity 600ms ease',
        pointerEvents: 'none',
        userSelect: 'none',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      R: Reset &nbsp; 1-4: Projection &nbsp; Esc: Deselect &nbsp; /: Search
    </div>
  )
}
