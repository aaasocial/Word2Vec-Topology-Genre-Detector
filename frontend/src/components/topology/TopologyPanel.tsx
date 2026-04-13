import { PersistenceHeatmap } from './PersistenceHeatmap'
import { PersistenceDiagram } from './PersistenceDiagram'
import { VRViewer } from './VRViewer'
import { EpsilonSlider } from './EpsilonSlider'
import { useVRData } from '@/hooks/useVRData'
import { useVisualizationStore } from '@/stores/visualizationStore'

/**
 * TopologyPanel: Container for the Topology tab.
 * Two-panel flex layout: left = persistence heatmap, right = VR viewer + epsilon slider.
 */
export function TopologyPanel() {
  const selectedGenre = useVisualizationStore((s) => s.selectedGenre)
  const projection = useVisualizationStore((s) => s.projection)
  const { data: vrData } = useVRData(selectedGenre, projection)

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Left panel: persistence heatmap + diagram */}
      <div
        style={{
          width: '50%',
          background: '#111118',
          borderRight: '1px solid #1E1E2A',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
          overflow: 'auto',
        }}
      >
        <PersistenceHeatmap />
        <div style={{ borderTop: '1px solid #1E1E2A', paddingTop: 24 }}>
          <PersistenceDiagram />
        </div>
      </div>

      {/* Right panel: VR viewer + epsilon slider */}
      <div
        style={{
          width: '50%',
          background: '#0A0A0F',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flex: 1, minHeight: 0 }}>
          <VRViewer />
        </div>
        <EpsilonSlider vrData={vrData} />
      </div>
    </div>
  )
}
