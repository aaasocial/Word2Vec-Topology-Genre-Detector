// Vitest + @testing-library/react tests for TrackContributionBars.
// Phase 9 DEPTH-05 -- per-track contribution rendering (topology + vocabulary).
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrackContributionBars } from '../TrackContributionBars'
import type { TrackContributions } from '@/types/explain'

describe('TrackContributionBars', () => {
  it('renders two rows: topology + vocabulary', () => {
    const contributions: TrackContributions = {
      topology: { pct: 67.0, direction: '+' },
      vocabulary: { pct: 33.0, direction: '+' },
    }
    render(<TrackContributionBars contributions={contributions} />)
    expect(screen.getAllByTestId('track-row')).toHaveLength(2)
  })

  it('renders percent labels formatted to 1 decimal', () => {
    const contributions: TrackContributions = {
      topology: { pct: 67.3, direction: '+' },
      vocabulary: { pct: 32.7, direction: '+' },
    }
    render(<TrackContributionBars contributions={contributions} />)
    const pcts = screen.getAllByTestId('track-pct').map((el) => el.textContent)
    expect(pcts).toEqual(['67.3%', '32.7%'])
  })

  it('sets bar-fill width proportional to pct', () => {
    const contributions: TrackContributions = {
      topology: { pct: 67.3, direction: '+' },
      vocabulary: { pct: 32.7, direction: '-' },
    }
    render(<TrackContributionBars contributions={contributions} />)
    const fills = screen.getAllByTestId('track-bar-fill')
    expect((fills[0] as HTMLElement).style.width).toBe('67.3%')
    expect((fills[1] as HTMLElement).style.width).toBe('32.7%')
  })

  it('renders direction glyphs: ↑ for +, ↓ for -, · for 0', () => {
    const contributions: TrackContributions = {
      topology: { pct: 50.0, direction: '+' },
      vocabulary: { pct: 50.0, direction: '-' },
    }
    render(<TrackContributionBars contributions={contributions} />)
    const dirs = screen.getAllByTestId('track-direction').map((el) => el.textContent)
    expect(dirs[0]).toBe('↑')
    expect(dirs[1]).toBe('↓')
  })

  it('renders middle-dot glyph for direction "0"', () => {
    const contributions: TrackContributions = {
      topology: { pct: 50.0, direction: '0' },
      vocabulary: { pct: 50.0, direction: '0' },
    }
    render(<TrackContributionBars contributions={contributions} />)
    const dirs = screen.getAllByTestId('track-direction').map((el) => el.textContent)
    expect(dirs[0]).toBe('·')
    expect(dirs[1]).toBe('·')
  })

  it('renders the Topology + Vocabulary labels in order', () => {
    const contributions: TrackContributions = {
      topology: { pct: 60.0, direction: '+' },
      vocabulary: { pct: 40.0, direction: '+' },
    }
    render(<TrackContributionBars contributions={contributions} />)
    const rows = screen.getAllByTestId('track-row')
    expect(rows[0]).toHaveTextContent('Topology')
    expect(rows[1]).toHaveTextContent('Vocabulary')
  })
})
