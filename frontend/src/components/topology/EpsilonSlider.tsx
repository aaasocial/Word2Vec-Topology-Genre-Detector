import { useVisualizationStore } from '@/stores/visualizationStore'
import { getVisibleEdgeCount } from '@/lib/vrFiltering'
import type { VRPayload } from '@/hooks/useVRData'

interface EpsilonSliderProps {
  vrData: VRPayload | undefined
}

/**
 * EpsilonSlider: controls the filtration radius (ε) for the VR viewer.
 * Updates vrEpsilon in the store directly — NO debounce, NO server calls; the
 * render loop reads straight from store state and the diagram/image track it.
 *
 * Phase 12 (12-05) reading-room skin: the filled track is the active **accent**
 * (replacing the amber #FACC15 literal); the label/readout use the reading-room
 * serif/mono type, the value carries 3 decimals, and the edge count sits below.
 */
export function EpsilonSlider({ vrData }: EpsilonSliderProps) {
  const vrEpsilon = useVisualizationStore((s) => s.vrEpsilon)
  const setVrEpsilon = useVisualizationStore((s) => s.setVrEpsilon)

  if (!vrData) return null

  const epsilonMax = vrData.epsilon_max
  const step = epsilonMax / 200
  const edgeCount = getVisibleEdgeCount(vrData.edges, vrEpsilon)
  const pct = epsilonMax > 0 ? (vrEpsilon / epsilonMax) * 100 : 0

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <label
          htmlFor="epsilon-slider"
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 12.5,
            color: 'var(--muted)',
            width: 96,
          }}
        >
          Filtration radius
        </label>

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
            flex: 1,
            height: 6,
            appearance: 'none',
            WebkitAppearance: 'none',
            // Filled track: accent up to the thumb, soft ink past it — the ε
            // signal is the active reading-room accent, not the amber #FACC15.
            background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--ink-22) ${pct}%, var(--ink-22) 100%)`,
            borderRadius: 0,
            outline: 'none',
            cursor: 'pointer',
            accentColor: 'var(--accent)',
          }}
        />

        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--ink)',
            width: 64,
            textAlign: 'right',
          }}
        >
          ε {vrEpsilon.toFixed(3)}
        </span>
      </div>

      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.06em',
          color: 'var(--muted)',
          marginTop: 5,
        }}
      >
        {edgeCount.toLocaleString()} edges visible
      </div>
    </div>
  )
}
