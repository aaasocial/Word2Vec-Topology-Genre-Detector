import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

describe('SlowTierParams', () => {
  beforeEach(() => {
    useVisualizationStore.setState({
      dirtyParams: new Set<string>(),
      isRecomputing: false,
    })
  })

  it('renders all 8 parameter sliders with correct labels (PARAM-03)', () => {
    render(<SlowTierParams />)
    for (const label of PARAM_LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('changing sigma slider adds "sigma" to dirtyParams in store', () => {
    render(<SlowTierParams />)
    const sigmaSlider = screen.getByLabelText('Gaussian sigma')
    fireEvent.change(sigmaSlider, { target: { value: '0.5' } })
    expect(useVisualizationStore.getState().dirtyParams.has('sigma')).toBe(true)
  })

  // H₂ toggle test deleted in Plan 06-04 — H₂ removed from v2 settings drawer
  // (CONTEXT.md <domain> recast / PROJECT.md Key Decisions / PITFALLS.md §2-3).

  it('Recompute button is disabled when dirtyParams is empty', () => {
    render(<SlowTierParams />)
    const btn = screen.getByRole('button', { name: /recompute results/i })
    expect(btn).toBeDisabled()
  })

  it('Recompute button is enabled when dirtyParams is non-empty', () => {
    useVisualizationStore.setState({ dirtyParams: new Set(['sigma']) })
    render(<SlowTierParams />)
    const btn = screen.getByRole('button', { name: /recompute results/i })
    expect(btn).not.toBeDisabled()
  })

  it('shows amber dirty badge when dirtyParams is non-empty', () => {
    useVisualizationStore.setState({ dirtyParams: new Set(['sigma']) })
    render(<SlowTierParams />)
    expect(screen.getByText(/parameters changed/i)).toBeInTheDocument()
  })
})
