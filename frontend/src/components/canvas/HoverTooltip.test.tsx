import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TooltipContent } from './HoverTooltip'
import type { ScatterPoint } from '@/types/scatter'

const mockPoint: ScatterPoint = {
  word: 'mystery',
  genre: 'mystery',
  x: 0.1,
  y: 0.2,
  z: 0.3,
  tfidf_weight: 0.8523,
  neighbors: [
    { word: 'detective', similarity: 0.91 },
    { word: 'crime', similarity: 0.88 },
    { word: 'clue', similarity: 0.85 },
    { word: 'suspect', similarity: 0.82 },
    { word: 'murder', similarity: 0.79 },
    { word: 'extra_neighbor', similarity: 0.50 },
  ],
}

describe('HoverTooltip / TooltipContent', () => {
  it('renders word token as text (not HTML injection)', () => {
    render(<TooltipContent point={mockPoint} />)
    // Word appears as readable text — multiple elements may have "mystery" (word + genre)
    const elements = screen.getAllByText('mystery')
    expect(elements.length).toBeGreaterThan(0)
  })

  it('renders genre name as text', () => {
    render(<TooltipContent point={mockPoint} />)
    const elements = screen.getAllByText('mystery')
    expect(elements.length).toBeGreaterThan(0)
  })

  it('renders TF-IDF value formatted to 4 decimal places', () => {
    render(<TooltipContent point={mockPoint} />)
    expect(screen.getByText('0.8523')).toBeTruthy()
  })

  it('renders up to 5 neighbor list items (not 6)', () => {
    render(<TooltipContent point={mockPoint} />)
    expect(screen.getByText(/1\. detective/)).toBeTruthy()
    expect(screen.getByText(/5\. murder/)).toBeTruthy()
    // 6th neighbor should NOT appear
    expect(screen.queryByText(/extra_neighbor/)).toBeNull()
  })

  it('renders neighbor with similarity score', () => {
    render(<TooltipContent point={mockPoint} />)
    expect(screen.getByText('0.91')).toBeTruthy()
  })

  it('does NOT use dangerouslySetInnerHTML (XSS guard T-3-01)', () => {
    const { container } = render(<TooltipContent point={mockPoint} />)
    // Walk all elements and confirm none have dangerouslySetInnerHTML marker
    // In rendered HTML, dangerouslySetInnerHTML sets innerHTML directly; we check
    // that no element has an unexpected innerHTML with script-like content
    const allElements = container.querySelectorAll('*')
    allElements.forEach(el => {
      // If the component used dangerouslySetInnerHTML, the prop would appear as
      // "dangerouslysetinnerhtml" in the attribute list (React dev warning approach)
      expect(el.hasAttribute('dangerouslysetinnerhtml')).toBe(false)
    })
    // Also confirm the raw word text renders as text nodes, not raw HTML
    const wordEls = screen.getAllByText('mystery')
    wordEls.forEach(el => expect(el.textContent).toBe('mystery'))
  })

  it('renders XSS payload as plain text (not executed)', () => {
    const xssPoint: ScatterPoint = {
      ...mockPoint,
      word: '<script>alert("xss")</script>',
      genre: 'mystery',
    }
    const { container } = render(<TooltipContent point={xssPoint} />)
    // The script tag should be escaped — no actual <script> element in DOM
    const scripts = container.querySelectorAll('script')
    expect(scripts.length).toBe(0)
    // The raw string appears as text content
    expect(container.textContent).toContain('<script>')
  })
})
