import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomologyTabs } from '../HomologyTabs'
import { useVisualizationStore } from '@/stores/visualizationStore'

beforeEach(() => {
  useVisualizationStore.setState({
    selectedHomologyDim: 0,
    h2Enabled: false,
  })
})

describe('HomologyTabs', () => {
  it('renders 3 tabs: H0, H1, H2', () => {
    render(<HomologyTabs />)
    expect(screen.getByText('H0')).toBeInTheDocument()
    expect(screen.getByText('H1')).toBeInTheDocument()
    expect(screen.getByText('H2')).toBeInTheDocument()
  })

  it('H2 tab is disabled when h2Enabled=false', () => {
    render(<HomologyTabs />)
    const h2 = screen.getByText('H2')
    expect(h2).toHaveAttribute('aria-disabled', 'true')
    expect(h2).toHaveAttribute('title', 'Enable H2 in Settings')
  })

  it('H2 tab is enabled when h2Enabled=true', () => {
    useVisualizationStore.setState({ h2Enabled: true })
    render(<HomologyTabs />)
    const h2 = screen.getByText('H2')
    expect(h2).toHaveAttribute('aria-disabled', 'false')
  })

  it('clicking H1 updates selectedHomologyDim', async () => {
    const user = userEvent.setup()
    render(<HomologyTabs />)
    await user.click(screen.getByText('H1'))
    expect(useVisualizationStore.getState().selectedHomologyDim).toBe(1)
  })

  it('clicking disabled H2 does not update dimension', async () => {
    const user = userEvent.setup()
    render(<HomologyTabs />)
    await user.click(screen.getByText('H2'))
    expect(useVisualizationStore.getState().selectedHomologyDim).toBe(0)
  })
})
