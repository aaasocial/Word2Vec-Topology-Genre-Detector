// Vitest + @testing-library/react tests for UncertaintyBadge.
// Phase 9 DEPTH-07 -- entropy badge conditional rendering + D-52 canonical tooltip.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UncertaintyBadge } from '../UncertaintyBadge'
import type { ClassificationResult } from '@/stores/uploadStore'

const baseResult: ClassificationResult = {
  genre: 'romance',
  confidence: 0.42,
  oov_count: 10,
  total_words: 1000,
}

describe('UncertaintyBadge', () => {
  it('renders nothing when badge_fires is undefined', () => {
    const { container } = render(<UncertaintyBadge result={baseResult} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when badge_fires is false', () => {
    const { container } = render(
      <UncertaintyBadge result={{ ...baseResult, badge_fires: false }} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders "Low confidence" badge when badge_fires is true', () => {
    render(<UncertaintyBadge result={{ ...baseResult, badge_fires: true }} />)
    const badge = screen.getByTestId('uncertainty-badge')
    expect(badge).toHaveTextContent('Low confidence')
  })

  it('tooltip contains the D-52 canonical phrasing', () => {
    render(<UncertaintyBadge result={{ ...baseResult, badge_fires: true }} />)
    const badge = screen.getByTestId('uncertainty-badge')
    const title = badge.getAttribute('title') ?? ''
    expect(title).toContain('Low confidence — top predictions are close')
    expect(title).toContain('authors already in the training corpus')
    expect(title).toContain('Why this genre?')
  })
})
