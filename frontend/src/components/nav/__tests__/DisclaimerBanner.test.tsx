import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DisclaimerBanner } from '../DisclaimerBanner'
import { useVisualizationStore } from '@/stores/visualizationStore'

beforeEach(() => {
  useVisualizationStore.setState({ activeTab: 'scatter' })
})

describe('DisclaimerBanner', () => {
  it('renders on Scatter tab with disclaimer text', () => {
    useVisualizationStore.setState({ activeTab: 'scatter' })
    render(<DisclaimerBanner />)
    expect(screen.getByText(/lossy projection/i)).toBeInTheDocument()
  })

  it('renders on Topology tab', () => {
    useVisualizationStore.setState({ activeTab: 'topology' })
    render(<DisclaimerBanner />)
    expect(screen.getByTestId('disclaimer-banner')).toBeInTheDocument()
  })

  it('is hidden on Compare tab (UX-05)', () => {
    useVisualizationStore.setState({ activeTab: 'compare' })
    const { container } = render(<DisclaimerBanner />)
    expect(container.innerHTML).toBe('')
  })
})
