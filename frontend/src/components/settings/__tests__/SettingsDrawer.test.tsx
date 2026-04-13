import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SettingsDrawer } from '../SettingsDrawer'
import { useVisualizationStore } from '@/stores/visualizationStore'

describe('SettingsDrawer', () => {
  beforeEach(() => {
    useVisualizationStore.setState({
      settingsDrawerOpen: false,
      dirtyParams: new Set<string>(),
      isRecomputing: false,
      isRetraining: false,
      h2Enabled: false,
    })
  })

  it('renders Settings heading when settingsDrawerOpen=true', () => {
    useVisualizationStore.setState({ settingsDrawerOpen: true })
    render(<SettingsDrawer />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('is not visible when settingsDrawerOpen=false', () => {
    render(<SettingsDrawer />)
    // Drawer still renders but is translated off-screen
    const aside = screen.getByLabelText('Settings drawer')
    expect(aside.style.transform).toContain('translateX(400px)')
  })
})
