// Vitest + @testing-library/react tests for NearestBooksList.
// Phase 9 DEPTH-04 -- 5 nearest training books rendering.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NearestBooksList } from '../NearestBooksList'
import type { NearestTrainingBook } from '@/types/explain'

const SAMPLE_BOOKS: NearestTrainingBook[] = [
  { gutenberg_id: '11', title: 'Alice in Wonderland', author: 'Lewis Carroll',  genre: 'fantasy',    distance: 0.123 },
  { gutenberg_id: '76', title: 'Huck Finn',           author: 'Mark Twain',     genre: 'adventure',  distance: 0.234 },
  { gutenberg_id: '84', title: 'Frankenstein',        author: 'Mary Shelley',   genre: 'gothic',     distance: 0.345 },
  { gutenberg_id: '98', title: 'A Tale of Two Cities',author: 'Charles Dickens',genre: 'historical', distance: 0.456 },
  { gutenberg_id: '99', title: 'Heart of Darkness',   author: 'Joseph Conrad',  genre: 'literary',   distance: 0.567 },
]

describe('NearestBooksList', () => {
  it('renders 5 book rows for a 5-book input', () => {
    render(<NearestBooksList books={SAMPLE_BOOKS} />)
    expect(screen.getAllByTestId('nearest-book-row')).toHaveLength(5)
  })

  it('renders title, author, genre, and distance for each row', () => {
    render(<NearestBooksList books={SAMPLE_BOOKS} />)
    const titles = screen.getAllByTestId('nearest-book-title').map((el) => el.textContent)
    expect(titles[0]).toBe('Alice in Wonderland')
    const meta = screen.getAllByTestId('nearest-book-author-genre').map((el) => el.textContent)
    expect(meta[0]).toContain('Lewis Carroll')
    expect(meta[0]).toContain('fantasy')
    const dists = screen.getAllByTestId('nearest-book-distance').map((el) => el.textContent)
    expect(dists[0]).toBe('0.123')
  })

  it('formats distance to 3 decimal places', () => {
    const oneRow = [{ gutenberg_id: '1', title: 't', author: 'a', genre: 'romance', distance: 0.5 }]
    render(<NearestBooksList books={oneRow} />)
    expect(screen.getByTestId('nearest-book-distance').textContent).toBe('0.500')
  })

  it('falls back to grey for unknown genres', () => {
    const oneRow = [{ gutenberg_id: '1', title: 't', author: 'a', genre: 'unknown_v2', distance: 0.1 }]
    render(<NearestBooksList books={oneRow} />)
    const dot = screen.getByTestId('nearest-book-color-dot')
    expect((dot as HTMLElement).style.background).toMatch(/#888888|rgb\(136, 136, 136\)/)
  })

  it('returns null on empty input', () => {
    const { container } = render(<NearestBooksList books={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('preserves backend ordering (does not re-sort)', () => {
    render(<NearestBooksList books={SAMPLE_BOOKS} />)
    const titles = screen.getAllByTestId('nearest-book-title').map((el) => el.textContent)
    expect(titles).toEqual([
      'Alice in Wonderland',
      'Huck Finn',
      'Frankenstein',
      'A Tale of Two Cities',
      'Heart of Darkness',
    ])
  })
})
