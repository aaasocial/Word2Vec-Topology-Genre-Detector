// Vitest + @testing-library/react tests for TopNList.
// Phase 9 DEPTH-01 / DEPTH-02 -- top-3 visible + collapsible +5 more expander.
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TopNList } from '../TopNList'

const SAMPLE_TOP_N = [
  { genre: 'romance',    probability: 0.421 },
  { genre: 'mystery',    probability: 0.234 },
  { genre: 'fantasy',    probability: 0.137 },
  { genre: 'gothic',     probability: 0.082 },
  { genre: 'horror',     probability: 0.061 },
  { genre: 'scifi',      probability: 0.038 },
  { genre: 'historical', probability: 0.018 },
  { genre: 'literary',   probability: 0.009 },
]

describe('TopNList', () => {
  it('renders top-3 rows by default', () => {
    render(<TopNList topN={SAMPLE_TOP_N} />)
    const rows = screen.getAllByTestId('top-n-row')
    expect(rows).toHaveLength(3)
  })

  it('shows percent labels to 1 decimal', () => {
    render(<TopNList topN={SAMPLE_TOP_N} />)
    const pcts = screen.getAllByTestId('top-n-pct').map((el) => el.textContent)
    expect(pcts).toEqual(['42.1%', '23.4%', '13.7%'])
  })

  it('preserves input order (does not re-sort)', () => {
    render(<TopNList topN={SAMPLE_TOP_N} />)
    const rows = screen.getAllByTestId('top-n-row')
    expect(rows[0]).toHaveTextContent('romance')
    expect(rows[1]).toHaveTextContent('mystery')
    expect(rows[2]).toHaveTextContent('fantasy')
  })

  it('renders +5 more button when topN.length > 3', () => {
    render(<TopNList topN={SAMPLE_TOP_N} />)
    expect(screen.getByTestId('top-n-expand')).toHaveTextContent('+5 more')
  })

  it('expands to 8 rows when +5 more clicked, button changes to "Show fewer"', () => {
    render(<TopNList topN={SAMPLE_TOP_N} />)
    fireEvent.click(screen.getByTestId('top-n-expand'))
    expect(screen.getAllByTestId('top-n-row')).toHaveLength(8)
    expect(screen.getByTestId('top-n-expand')).toHaveTextContent('Show fewer')
  })

  it('collapses back to 3 rows on second click', () => {
    render(<TopNList topN={SAMPLE_TOP_N} />)
    const btn = screen.getByTestId('top-n-expand')
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(screen.getAllByTestId('top-n-row')).toHaveLength(3)
    expect(btn).toHaveTextContent('+5 more')
  })

  it('sets bar-fill width proportional to probability', () => {
    render(<TopNList topN={SAMPLE_TOP_N} />)
    const fills = screen.getAllByTestId('top-n-bar-fill')
    expect((fills[0] as HTMLElement).style.width).toBe('42.1%')
  })

  it('falls back to grey for unknown genres', () => {
    const oneRow = [{ genre: 'unknown_v2_genre', probability: 1.0 }]
    render(<TopNList topN={oneRow} />)
    const dot = screen.getByTestId('top-n-color-dot')
    expect((dot as HTMLElement).style.background).toMatch(/#888888|rgb\(136, 136, 136\)/)
  })

  it('returns null on empty topN', () => {
    const { container } = render(<TopNList topN={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('hides the expand button when topN has <=3 rows', () => {
    render(<TopNList topN={SAMPLE_TOP_N.slice(0, 3)} />)
    expect(screen.queryByTestId('top-n-expand')).toBeNull()
  })
})
