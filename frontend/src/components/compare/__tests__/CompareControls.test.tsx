import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CompareControls } from '../CompareControls'
import { useVisualizationStore } from '@/stores/visualizationStore'

describe('CompareControls', () => {
  beforeEach(() => {
    useVisualizationStore.setState({
      compareMode: false,
      compareGenre: null,
      selectedGenre: 'romance',
    })
  })

  it('renders "Compare Genres" toggle button', () => {
    render(<CompareControls />)
    expect(screen.getByRole('button', { name: /compare genres/i })).toBeInTheDocument()
  })

  it('clicking toggle activates compareMode in store', () => {
    render(<CompareControls />)
    fireEvent.click(screen.getByRole('button', { name: /compare genres/i }))
    expect(useVisualizationStore.getState().compareMode).toBe(true)
  })

  it('shows second genre picker when compareMode=true', () => {
    useVisualizationStore.setState({ compareMode: true })
    render(<CompareControls />)
    expect(screen.getByLabelText(/compare with/i)).toBeInTheDocument()
  })

  it('hides second genre picker when compareMode=false', () => {
    useVisualizationStore.setState({ compareMode: false })
    render(<CompareControls />)
    expect(screen.queryByLabelText(/compare with/i)).not.toBeInTheDocument()
  })

  it('selecting a genre in second picker sets compareGenre in store', () => {
    useVisualizationStore.setState({ compareMode: true })
    render(<CompareControls />)
    const select = screen.getByLabelText(/compare with/i)
    fireEvent.change(select, { target: { value: 'mystery' } })
    expect(useVisualizationStore.getState().compareGenre).toBe('mystery')
  })

  it('deactivating compare mode clears compareGenre', () => {
    useVisualizationStore.setState({ compareMode: true, compareGenre: 'mystery' })
    render(<CompareControls />)
    fireEvent.click(screen.getByRole('button', { name: /compare genres/i }))
    expect(useVisualizationStore.getState().compareMode).toBe(false)
    expect(useVisualizationStore.getState().compareGenre).toBeNull()
  })
})
