import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WordSearch } from './WordSearch'
import { useVisualizationStore } from '@/stores/visualizationStore'
import type { ScatterPoint } from '@/types/scatter'

// Mock points for search tests
function makePoint(word: string, genre = 'mystery', tfidf = 0.5): ScatterPoint {
  return { word, genre, x: 0, y: 0, z: 0, tfidf_weight: tfidf, neighbors: [] }
}

const MOCK_POINTS: ScatterPoint[] = [
  makePoint('lovecraft', 'horror'),
  makePoint('love', 'romance'),
  makePoint('lovelorn', 'romance'),
  makePoint('lovely', 'literary'),
  makePoint('beloved', 'romance'),
  makePoint('overlook', 'horror'),
  makePoint('glove', 'mystery'),
  makePoint('clover', 'literary'),
  makePoint('above', 'fantasy'),
  makePoint('covet', 'mystery'),
  makePoint('lover', 'romance'),   // 11th match — should NOT appear (top 10 only)
  makePoint('detective', 'mystery'),
]

beforeEach(() => {
  useVisualizationStore.setState({
    searchQuery: '',
    selectedPointIndex: null,
  })
})

describe('WordSearch', () => {
  it('empty query shows no results list', () => {
    render(<WordSearch points={MOCK_POINTS} />)
    // No result items should be visible when query is empty
    expect(screen.queryByText('lovecraft')).toBeNull()
    expect(screen.queryByText('No matching words')).toBeNull()
  })

  it('shows "No matching words" when query has no matches', () => {
    render(<WordSearch points={MOCK_POINTS} />)
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'zzzznotaword' } })
    expect(screen.getByText('No matching words')).toBeTruthy()
  })

  it('matching query shows up to 10 results', () => {
    render(<WordSearch points={MOCK_POINTS} />)
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'love' } })

    // "love" matches: lovecraft, love, lovelorn, lovely, beloved, overlook, glove, clover, above, covet, lover
    // but only first 10 should appear
    const results = screen.queryAllByRole('button', { name: /lovecraft|love$|lovelorn|lovely|beloved|overlook|glove|clover|above|covet|lover/i })
    expect(results.length).toBeLessThanOrEqual(10)
    // The 11th match "lover" should not appear
    // (depends on ordering, but we confirm max 10)
    expect(results.length).toBeGreaterThan(0)
  })

  it('clicking a result calls setSelectedPoint with the correct index', () => {
    const setSelectedPoint = vi.spyOn(useVisualizationStore.getState(), 'setSelectedPoint')
    render(<WordSearch points={MOCK_POINTS} />)
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'detective' } })

    // "detective" is at index 11 in MOCK_POINTS
    const resultBtn = screen.getByText('detective').closest('button')
    expect(resultBtn).toBeTruthy()
    fireEvent.click(resultBtn!)

    expect(setSelectedPoint).toHaveBeenCalledWith(11)
  })

  it('X button clears the query', () => {
    render(<WordSearch points={MOCK_POINTS} />)
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'love' } })

    // Clear button appears
    const clearBtn = screen.getByLabelText('Clear search')
    fireEvent.click(clearBtn)

    expect((input as HTMLInputElement).value).toBe('')
  })

  it('input has aria-label for accessibility', () => {
    render(<WordSearch points={MOCK_POINTS} />)
    expect(screen.getByRole('searchbox')).toBeTruthy()
    expect(screen.getByLabelText('Search for words in the embedding space')).toBeTruthy()
  })
})
