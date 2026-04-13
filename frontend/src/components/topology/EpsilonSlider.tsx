import { useVisualizationStore } from '@/stores/visualizationStore'
import { getVisibleEdgeCount } from '@/lib/vrFiltering'
import type { VRPayload } from '@/hooks/useVRData'

interface EpsilonSliderProps {
  vrData: VRPayload | undefined
}

/**
 * EpsilonSlider: Controls the filtration radius for the VR viewer.
 * Updates vrEpsilon in store directly -- NO debounce, NO server calls.
 * Render loop reads directly from store state.
 */
export function EpsilonSlider({ vrData }: EpsilonSliderProps) {
  const vrEpsilon = useVisualizationStore((s) => s.vrEpsilon)
  const setVrEpsilon = useVisualizationStore((s) => s.setVrEpsilon)

  if (!vrData) return null

  const epsilonMax = vrData.epsilon_max
  const step = epsilonMax / 200
  const edgeCount = getVisibleEdgeCount(vrData.edges, vrEpsilon)

  return (
    <div
      style={{
        padding: '12px 16px',
        borderTop: '1px solid #1E1E2A',
        background: '#111118',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}
      >
        <label
          htmlFor="epsilon-slider"
          style={{ color: '#A0A0B0', fontSize: 12 }}
        >
          Filtration radius (epsilon)
        </label>
        <span
          style={{
            color: '#F5F5FF',
            fontSize: 13,
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          {vrEpsilon.toFixed(3)}
        </span>
      </div>

      <input
        id="epsilon-slider"
        type="range"
        min={0}
        max={epsilonMax}
        step={step}
        value={vrEpsilon}
        onChange={(e) => setVrEpsilon(parseFloat(e.target.value))}
        aria-label="Filtration radius epsilon"
        style={{
          width: '100%',
          height: 6,
          appearance: 'none',
          WebkitAppearance: 'none',
          background: `linear-gradient(to right, #FACC15 0%, #FACC15 ${(vrEpsilon / epsilonMax) * 100}%, #2A2A3A ${(vrEpsilon / epsilonMax) * 100}%, #2A2A3A 100%)`,
          borderRadius: 3,
          outline: 'none',
          cursor: 'pointer',
        }}
      />

      <div
        style={{
          color: '#6B6B80',
          fontSize: 11,
          marginTop: 4,
        }}
      >
        {edgeCount} edges visible
      </div>
    </div>
  )
}
