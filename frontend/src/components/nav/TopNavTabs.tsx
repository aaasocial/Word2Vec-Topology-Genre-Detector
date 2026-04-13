import { Settings, GraduationCap } from 'lucide-react'
import { useVisualizationStore, type TabKey } from '@/stores/visualizationStore'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'scatter', label: 'Scatter' },
  { key: 'topology', label: 'Topology' },
  { key: 'compare', label: 'Compare' },
]

export function TopNavTabs() {
  const activeTab = useVisualizationStore((s) => s.activeTab)
  const setActiveTab = useVisualizationStore((s) => s.setActiveTab)
  const setSettingsDrawerOpen = useVisualizationStore((s) => s.setSettingsDrawerOpen)
  const settingsDrawerOpen = useVisualizationStore((s) => s.settingsDrawerOpen)
  const setPipelineExplanationOpen = useVisualizationStore((s) => s.setPipelineExplanationOpen)
  const pipelineExplanationOpen = useVisualizationStore((s) => s.pipelineExplanationOpen)

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 48,
        background: '#0D0D14',
        borderBottom: '1px solid #1E1E2A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 30,
      }}
    >
      {/* Left: title + tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#F5F5FF',
            whiteSpace: 'nowrap',
          }}
        >
          Literary Genre Topology
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                role="tab"
                aria-selected={isActive}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #6366F1' : '2px solid transparent',
                  color: isActive ? '#F5F5FF' : '#6B6B80',
                  fontSize: 12,
                  fontWeight: 400,
                  padding: '0 12px',
                  height: 24,
                  cursor: 'pointer',
                  transition: 'color 150ms, background 150ms',
                  borderRadius: '4px 4px 0 0',
                  lineHeight: '24px',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#E0E0EC'
                    e.currentTarget.style.background = '#151520'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#6B6B80'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: gear icon + How It Works */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => setPipelineExplanationOpen(!pipelineExplanationOpen)}
          aria-label="How it works"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6B6B80',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            padding: '4px 8px',
            borderRadius: 4,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#E0E0EC' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#6B6B80' }}
        >
          <GraduationCap size={16} />
          <span>How It Works</span>
        </button>

        <button
          onClick={() => setSettingsDrawerOpen(!settingsDrawerOpen)}
          aria-label="Open settings"
          title="Settings"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6B6B80',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 4,
            padding: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#E0E0EC' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#6B6B80' }}
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
  )
}
