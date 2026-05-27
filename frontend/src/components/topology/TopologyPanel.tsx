import { PersistenceHeatmap } from './PersistenceHeatmap'
import { PersistenceDiagram } from './PersistenceDiagram'
import { VRViewer } from './VRViewer'
import { EpsilonSlider } from './EpsilonSlider'
import { useVRData } from '@/hooks/useVRData'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { TOUR_ANCHORS } from '@/tour/anchors'

/**
 * Phase 10 D-81 — Empty Topology tab.
 * Ghost heatmap 320×240px with dashed --border + --muted→--secondary linear
 * gradient at 50% opacity. Copy locked per README §9.6.
 */
function TopologyEmpty() {
  return (
    <div
      data-tour-id={TOUR_ANCHORS.topologyTab}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        padding: 40,
        color: 'hsl(var(--muted-foreground))',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 320,
          height: 240,
          border: '1.5px dashed hsl(var(--border))',
          borderRadius: 10,
          background:
            'linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--secondary)) 100%)',
          opacity: 0.5,
        }}
      />
      <h2
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 600,
          color: 'hsl(var(--foreground))',
        }}
      >
        Pick a genre to see its topology.
      </h2>
      <p
        style={{
          maxWidth: 440,
          margin: 0,
          fontSize: 13,
          lineHeight: 1.55,
        }}
      >
        Topology shows the H₁ persistence image — the holes that survive as
        you zoom out. Pick a genre or book from the sidebar to compute it.
      </p>
    </div>
  )
}

/**
 * TopologyPanel: Container for the Topology tab.
 * Two-panel flex layout: left = persistence heatmap, right = VR viewer + epsilon slider.
 * Renders TopologyEmpty when no genre/book is selected (D-81).
 */
export function TopologyPanel() {
  const selectedGenre = useVisualizationStore((s) => s.selectedGenre)
  const selectedBookId = useVisualizationStore((s) => s.selectedBookId)
  const projection = useVisualizationStore((s) => s.projection)
  const { data: vrData } = useVRData(selectedGenre, projection)

  // Phase 10 D-81: when nothing is selected, show the canonical empty state
  // instead of the dual-panel layout. The data-tour-id="topology-tab" anchor
  // lives on the empty state so the tour finds it even on first visit.
  if (!selectedGenre && !selectedBookId) {
    return <TopologyEmpty />
  }

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
          background: 'hsl(var(--sidebar-bg))',
          borderRight: '1px solid hsl(var(--sidebar-border))',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
          overflow: 'auto',
        }}
      >
        <PersistenceHeatmap />
        <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: 24 }}>
          <PersistenceDiagram />
        </div>
      </div>

      {/* Right panel: VR viewer + epsilon slider */}
      <div
        style={{
          width: '50%',
          background: 'hsl(var(--background))',
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
