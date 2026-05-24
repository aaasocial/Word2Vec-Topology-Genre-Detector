import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SettingsDrawer } from '../SettingsDrawer'
import { useVisualizationStore } from '@/stores/visualizationStore'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

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
    render(<SettingsDrawer />, { wrapper: Wrapper })
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('is not visible when settingsDrawerOpen=false', () => {
    render(<SettingsDrawer />, { wrapper: Wrapper })
    // Drawer still renders but is translated off-screen
    const aside = screen.getByLabelText('Settings drawer')
    expect(aside.style.transform).toContain('translateX(400px)')
  })
})
