import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecomputeOverlay } from '../RecomputeOverlay'
import { useVisualizationStore } from '@/stores/visualizationStore'

describe('RecomputeOverlay', () => {
  beforeEach(() => {
    useVisualizationStore.setState({
      isRecomputing: false,
      isRetraining: false,
    })
  })

  it('renders nothing when isRecomputing=false and isRetraining=false', () => {
    const { container } = render(<RecomputeOverlay />)
    expect(container.firstChild).toBeNull()
  })

  it('renders "Updating..." when isRecomputing=true', () => {
    useVisualizationStore.setState({ isRecomputing: true })
    render(<RecomputeOverlay />)
    expect(screen.getByText(/updating/i)).toBeInTheDocument()
  })

  it('renders "Retraining model..." when isRetraining=true', () => {
    useVisualizationStore.setState({ isRetraining: true })
    render(<RecomputeOverlay />)
    expect(screen.getByText(/retraining model/i)).toBeInTheDocument()
  })

  it('has pointer-events: none on overlay so canvas stays interactive', () => {
    useVisualizationStore.setState({ isRecomputing: true })
    render(<RecomputeOverlay />)
    const overlay = screen.getByTestId('recompute-overlay')
    expect(overlay.style.pointerEvents).toBe('none')
  })
})
