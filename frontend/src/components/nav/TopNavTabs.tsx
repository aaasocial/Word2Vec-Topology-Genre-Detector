import { Settings, GraduationCap } from 'lucide-react'
import { useVisualizationStore, type TabKey } from '@/stores/visualizationStore'

const TABS: { key: TabKey; label: string; tourId?: string }[] = [
  { key: 'scatter', label: 'Scatter' },
  { key: 'topology', label: 'Topology', tourId: 'topology-tab' },
  { key: 'compare', label: 'Compare', tourId: 'compare-tab' },
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
        background: 'hsl(var(--card))',
        borderBottom: '1px solid hsl(var(--border))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 30,
        transition: 'background-color 240ms ease, border-color 240ms ease',
      }}
    >
      {/* Left: title + tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'hsl(var(--card-foreground))',
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
                data-tour-id={tab.tourId}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid hsl(var(--primary))' : '2px solid transparent',
                  color: isActive ? 'hsl(var(--card-foreground))' : 'hsl(var(--muted-foreground))',
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
                    e.currentTarget.style.color = 'hsl(var(--card-foreground))'
                    e.currentTarget.style.background = 'hsl(var(--secondary))'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'hsl(var(--muted-foreground))'
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

      {/* Right: How It Works + Help + gear */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => setPipelineExplanationOpen(!pipelineExplanationOpen)}
          aria-label="How it works"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'hsl(var(--muted-foreground))',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            padding: '4px 8px',
            borderRadius: 4,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'hsl(var(--foreground))' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--muted-foreground))' }}
        >
          <GraduationCap size={16} />
          <span>How It Works</span>
        </button>

        {/* Phase 10: Help dropdown mounts here in Task 9 */}

        <button
          onClick={() => setSettingsDrawerOpen(!settingsDrawerOpen)}
          aria-label="Open settings"
          title="Settings"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'hsl(var(--muted-foreground))',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 4,
            padding: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'hsl(var(--foreground))' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--muted-foreground))' }}
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
  )
}
