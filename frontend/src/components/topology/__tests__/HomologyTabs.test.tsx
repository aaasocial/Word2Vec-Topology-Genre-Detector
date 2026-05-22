import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HomologyTabs } from '../HomologyTabs'
import { useVisualizationStore } from '@/stores/visualizationStore'

// v2 (Plan 06-04): tabs scrubbed to H₁ only. H₀ removed (degenerate in
// weighted VR — all births collapse to filtration time 0). H₂ deferred to v3
// (PROJECT.md Key Decisions / PITFALLS.md §2-3). The legacy three-tab and
// disabled-H₂ cases were deleted, not commented out (D-03).
beforeEach(() => {
  useVisualizationStore.setState({
    selectedHomologyDim: 1,
  })
})

describe('HomologyTabs', () => {
  it('renders exactly one tab labelled H1', () => {
    render(<HomologyTabs />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(1)
    expect(screen.getByText('H1')).toBeInTheDocument()
  })

  it('the single H1 tab is marked selected and non-interactive', () => {
    render(<HomologyTabs />)
    const tab = screen.getByRole('tab')
    expect(tab).toHaveAttribute('aria-selected', 'true')
    expect(tab).toHaveAttribute('tabIndex', '-1')
  })
})
