import { useState, useEffect } from 'react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { useDebounce } from '@/hooks/useDebounce'

interface SliderRowProps {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  accentColor?: string
}

function SliderRow({ label, min, max, step, value, onChange, accentColor = 'hsl(var(--primary))' }: SliderRowProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{label}</span>
        <span style={{ fontSize: 12, color: 'hsl(var(--foreground))', fontFamily: 'monospace' }}>
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor }}
      />
    </div>
  )
}

export function ControlSliders() {
  const setPointSizeMultiplier = useVisualizationStore(s => s.setPointSizeMultiplier)
  const setOpacity = useVisualizationStore(s => s.setOpacity)
  const setTfidfThreshold = useVisualizationStore(s => s.setTfidfThreshold)
  const setBrightnessSensitivity = useVisualizationStore(s => s.setBrightnessSensitivity)

  // Instant sliders — call setter directly
  const [pointSize, setPointSize] = useState(1.0)
  const [opacity, setOpacityLocal] = useState(1.0)

  // Debounced sliders — local state + debounce
  const [tfidfThreshold, setTfidfThresholdLocal] = useState(0.0)
  const [brightness, setBrightnessLocal] = useState(1.0)
  const debouncedTfidf = useDebounce(tfidfThreshold, 200)
  const debouncedBrightness = useDebounce(brightness, 200)

  useEffect(() => { setTfidfThreshold(debouncedTfidf) }, [debouncedTfidf, setTfidfThreshold])
  useEffect(() => { setBrightnessSensitivity(debouncedBrightness) }, [debouncedBrightness, setBrightnessSensitivity])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>Display</div>

      {/* Instant sliders */}
      <SliderRow
        label="Point Size"
        min={0.5} max={2.0} step={0.05}
        value={pointSize}
        onChange={v => { setPointSize(v); setPointSizeMultiplier(v) }}
      />
      <SliderRow
        label="Opacity"
        min={0.1} max={1.0} step={0.05}
        value={opacity}
        onChange={v => { setOpacityLocal(v); setOpacity(v) }}
      />

      {/* Debounced sliders */}
      <SliderRow
        label="TF-IDF Threshold"
        min={0.0} max={1.0} step={0.01}
        value={tfidfThreshold}
        onChange={setTfidfThresholdLocal}
        accentColor="hsl(var(--good))"
      />
      <SliderRow
        label="Brightness"
        min={0.5} max={3.0} step={0.05}
        value={brightness}
        onChange={setBrightnessLocal}
        accentColor="hsl(var(--warn))"
      />
    </div>
  )
}
