import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CompareHeatmaps } from '../CompareHeatmaps'
import { useVisualizationStore } from '@/stores/visualizationStore'
import * as heatmapLib from '@/lib/heatmap'

// Mock usePersistenceImage
const mockDataA = { data: [0, 1, 2, 3], M: 2, dim: 0, vmin: 0, vmax: 3 }
const mockDataB = { data: [1, 2, 3, 4], M: 2, dim: 0, vmin: 1, vmax: 4 }

vi.mock('@/hooks/usePersistenceImage', () => ({
  usePersistenceImage: vi.fn((genreOrBookId: string | null) => {
    if (genreOrBookId === 'romance') return { data: mockDataA, isLoading: false }
    if (genreOrBookId === 'mystery') return { data: mockDataB, isLoading: false }
    return { data: null, isLoading: false }
  }),
}))

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient()
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('CompareHeatmaps', () => {
  beforeEach(() => {
    useVisualizationStore.setState({
      compareMode: true,
      selectedGenre: 'romance',
      compareGenre: 'mystery',
      selectedHomologyDim: 0,
    })
  })

  it('renders two heatmap canvases when both genres are selected', () => {
    render(<CompareHeatmaps />, { wrapper: Wrapper })
    const canvases = document.querySelectorAll('canvas')
    expect(canvases.length).toBeGreaterThanOrEqual(2)
  })

  it('computes shared vmin/vmax from combined datasets (COMP-02)', () => {
    const spy = vi.spyOn(heatmapLib, 'computeMinMax')
    render(<CompareHeatmaps />, { wrapper: Wrapper })
    // computeMinMax should be called with combined data from both datasets
    const calls = spy.mock.calls
    const combinedCall = calls.find(
      (c) => Array.isArray(c[0]) && c[0].length === 8 // 4 + 4 combined
    )
    expect(combinedCall).toBeDefined()
    spy.mockRestore()
  })

  it('labels each heatmap with genre name', () => {
    render(<CompareHeatmaps />, { wrapper: Wrapper })
    expect(screen.getByText(/romance/i)).toBeInTheDocument()
    expect(screen.getByText(/mystery/i)).toBeInTheDocument()
  })

  it('renders nothing when compareGenre is null', () => {
    useVisualizationStore.setState({ compareGenre: null })
    const { container } = render(<CompareHeatmaps />, { wrapper: Wrapper })
    expect(container.querySelector('canvas')).toBeNull()
  })
})
