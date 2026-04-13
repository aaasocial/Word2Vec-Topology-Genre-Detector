import { PersistenceHeatmap } from './PersistenceHeatmap'

/**
 * TopologyPanel: Container for the Topology tab.
 * Two-panel flex layout: left = persistence heatmap, right = VR viewer placeholder.
 */
export function TopologyPanel() {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Left panel: persistence heatmap */}
      <div
        style={{
          width: '50%',
          background: '#111118',
          borderRight: '1px solid #1E1E2A',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        <PersistenceHeatmap />
      </div>

      {/* Right panel: VR viewer placeholder */}
      <div
        style={{
          width: '50%',
          background: '#0A0A0F',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            color: '#6B6B80',
            fontSize: 14,
            textAlign: 'center',
            padding: 24,
          }}
        >
          Vietoris-Rips viewer -- coming in Plan 02
        </div>
      </div>
    </div>
  )
}
