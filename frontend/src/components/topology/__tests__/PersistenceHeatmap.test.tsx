import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistenceHeatmap } from '../PersistenceHeatmap'
import { useVisualizationStore } from '@/stores/visualizationStore'

// Mock the usePersistenceImage hook
vi.mock('@/hooks/usePersistenceImage', () => ({
  usePersistenceImage: vi.fn(),
}))

import { usePersistenceImage } from '@/hooks/usePersistenceImage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useVisualizationStore.setState({
    selectedGenre: null,
    selectedBookId: null,
    selectedHomologyDim: 1,
  })
})

describe('PersistenceHeatmap', () => {
  // Phase 12 (12-05) reading-room reskin: the side-column persistence image now
  // renders a framed heatmap (paper2→genreHex→ink ramp) + a horizontal density
  // legend. The empty-state copy, axis labels, and legend layout changed from the
  // Phase 9/10 version; these assertions track the reskin.
  it('shows empty state when no genre selected', () => {
    ;(usePersistenceImage as any).mockReturnValue({ data: null, isLoading: false })
    render(<PersistenceHeatmap />, { wrapper: Wrapper })
    expect(screen.getByText(/pick a region/i)).toBeInTheDocument()
  })

  it('renders heatmap + legend canvases when data is present', () => {
    useVisualizationStore.setState({ selectedGenre: 'romance' })
    const mockData = {
      data: [0.1, 0.2, 0.3, 0.4],
      M: 2,
      dim: 1,
      vmin: 0.1,
      vmax: 0.4,
    }
    ;(usePersistenceImage as any).mockReturnValue({ data: mockData, isLoading: false })
    const { container } = render(<PersistenceHeatmap />, { wrapper: Wrapper })
    const canvases = container.querySelectorAll('canvas')
    // Heatmap canvas + density-legend canvas.
    expect(canvases.length).toBeGreaterThanOrEqual(2)
  })

  it('shows loading state while fetching', () => {
    useVisualizationStore.setState({ selectedGenre: 'romance' })
    ;(usePersistenceImage as any).mockReturnValue({ data: null, isLoading: true })
    const { container } = render(<PersistenceHeatmap />, { wrapper: Wrapper })
    // Should show skeleton (animated div, no canvas)
    const canvases = container.querySelectorAll('canvas')
    expect(canvases.length).toBe(0)
  })

  it('renders the density legend caption when data present', () => {
    useVisualizationStore.setState({ selectedGenre: 'romance' })
    const mockData = {
      data: [0.1, 0.2, 0.3, 0.4],
      M: 2,
      dim: 1,
      vmin: 0.1,
      vmax: 0.4,
    }
    ;(usePersistenceImage as any).mockReturnValue({ data: mockData, isLoading: false })
    render(<PersistenceHeatmap />, { wrapper: Wrapper })
    expect(screen.getByText('density')).toBeInTheDocument()
  })

  it('displays vmin/vmax labels on the density legend', () => {
    useVisualizationStore.setState({ selectedGenre: 'romance' })
    const mockData = {
      data: [0.1, 0.2, 0.3, 0.4],
      M: 2,
      dim: 1,
      vmin: 0.10,
      vmax: 0.40,
    }
    ;(usePersistenceImage as any).mockReturnValue({ data: mockData, isLoading: false })
    render(<PersistenceHeatmap />, { wrapper: Wrapper })
    // Legend labels: vmin → toFixed(0) = "0", vmax → toFixed(1) = "0.4".
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('0.4')).toBeInTheDocument()
  })
})
