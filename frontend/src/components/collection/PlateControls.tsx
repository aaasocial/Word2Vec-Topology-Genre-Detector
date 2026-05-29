// Reading Room — plate display controls (Phase 12 fix).
//
// The Point Size / Opacity / TF-IDF Threshold / Brightness sliders for the
// Collection plate, re-homed into the marginalia rail in the reading-room idiom.
// They write to the SAME `visualizationStore` fields the R3F PointCloud already
// reads (pointSizeMultiplier / opacity / tfidfThreshold / brightnessSensitivity),
// so the live WebGL plate responds exactly as it did in the prior shell. Instant
// controls (size/opacity) write straight through; the heavier two (TF-IDF /
// brightness) are debounced 200ms.

import { useEffect, useState } from 'react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { useDebounce } from '@/hooks/useDebounce'

function SliderRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 12.5, color: 'var(--ink)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--muted)' }}>
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        style={{
          width: '100%',
          height: 4,
          appearance: 'none',
          WebkitAppearance: 'none',
          background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--ink-22) ${pct}%, var(--ink-22) 100%)`,
          outline: 'none',
          cursor: 'pointer',
          borderRadius: 0,
        }}
      />
    </div>
  )
}

export function PlateControls() {
  const setPointSizeMultiplier = useVisualizationStore((s) => s.setPointSizeMultiplier)
  const setOpacity = useVisualizationStore((s) => s.setOpacity)
  const setTfidfThreshold = useVisualizationStore((s) => s.setTfidfThreshold)
  const setBrightnessSensitivity = useVisualizationStore((s) => s.setBrightnessSensitivity)

  // Seed local state from the store's current values so the rails reflect reality.
  const [pointSize, setPointSize] = useState(() => useVisualizationStore.getState().pointSizeMultiplier)
  const [opacity, setOpacityLocal] = useState(() => useVisualizationStore.getState().opacity)
  const [tfidf, setTfidfLocal] = useState(() => useVisualizationStore.getState().tfidfThreshold)
  const [brightness, setBrightnessLocal] = useState(() => useVisualizationStore.getState().brightnessSensitivity)

  const debouncedTfidf = useDebounce(tfidf, 200)
  const debouncedBrightness = useDebounce(brightness, 200)

  useEffect(() => { setTfidfThreshold(debouncedTfidf) }, [debouncedTfidf, setTfidfThreshold])
  useEffect(() => { setBrightnessSensitivity(debouncedBrightness) }, [debouncedBrightness, setBrightnessSensitivity])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="rr-label">Display</div>
      <SliderRow
        label="Point size"
        min={0.5}
        max={2.0}
        step={0.05}
        value={pointSize}
        onChange={(v) => { setPointSize(v); setPointSizeMultiplier(v) }}
      />
      <SliderRow
        label="Opacity"
        min={0.1}
        max={1.0}
        step={0.05}
        value={opacity}
        onChange={(v) => { setOpacityLocal(v); setOpacity(v) }}
      />
      <SliderRow
        label="TF-IDF threshold"
        min={0.0}
        max={1.0}
        step={0.01}
        value={tfidf}
        onChange={setTfidfLocal}
      />
      <SliderRow
        label="Brightness"
        min={0.5}
        max={3.0}
        step={0.05}
        value={brightness}
        onChange={setBrightnessLocal}
      />
    </div>
  )
}
