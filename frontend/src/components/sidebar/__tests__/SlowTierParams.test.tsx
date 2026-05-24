import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SlowTierParams } from '@/components/settings/SlowTierParams'
import { useVisualizationStore } from '@/stores/visualizationStore'

const PARAM_LABELS = [
  'Persistence Image Resolution (M)',
  'Gaussian sigma',
  'Cluster Count (K)',
  'Feature Weight (alpha)',
  'SVM gamma',
  'SVM C',
  'Epsilon Max',
  'Epsilon Step Size',
]

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('SlowTierParams', () => {
  beforeEach(() => {
    useVisualizationStore.setState({
      dirtyParams: new Set<string>(),
      isRecomputing: false,
      h2Enabled: false,
    })
  })

  it('renders all 8 parameter sliders with correct labels (PARAM-03)', () => {
    render(<SlowTierParams />, { wrapper: Wrapper })
    for (const label of PARAM_LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('changing sigma slider adds "sigma" to dirtyParams in store', () => {
    render(<SlowTierParams />, { wrapper: Wrapper })
    const sigmaSlider = screen.getByLabelText('Gaussian sigma')
    fireEvent.change(sigmaSlider, { target: { value: '0.5' } })
    expect(useVisualizationStore.getState().dirtyParams.has('sigma')).toBe(true)
  })

  it('H2 toggle adds "h2" to dirtyParams when enabled', () => {
    render(<SlowTierParams />, { wrapper: Wrapper })
    const h2Toggle = screen.getByLabelText(/enable h2/i)
    fireEvent.click(h2Toggle)
    expect(useVisualizationStore.getState().dirtyParams.has('h2')).toBe(true)
  })

  it('Recompute button is disabled when dirtyParams is empty', () => {
    render(<SlowTierParams />, { wrapper: Wrapper })
    const btn = screen.getByRole('button', { name: /recompute results/i })
    expect(btn).toBeDisabled()
  })

  it('Recompute button is enabled when dirtyParams is non-empty', () => {
    useVisualizationStore.setState({ dirtyParams: new Set(['sigma']) })
    render(<SlowTierParams />, { wrapper: Wrapper })
    const btn = screen.getByRole('button', { name: /recompute results/i })
    expect(btn).not.toBeDisabled()
  })

  it('shows amber dirty badge when dirtyParams is non-empty', () => {
    useVisualizationStore.setState({ dirtyParams: new Set(['sigma']) })
    render(<SlowTierParams />, { wrapper: Wrapper })
    expect(screen.getByText(/parameters changed/i)).toBeInTheDocument()
  })
})
