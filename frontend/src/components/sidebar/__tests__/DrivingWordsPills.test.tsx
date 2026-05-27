// Vitest + @testing-library/react tests for DrivingWordsPills.
// Phase 9 DEPTH-06 -- driving-word pills with D-46 canonical disclosure copy.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DrivingWordsPills } from '../DrivingWordsPills'
import type { DrivingWord } from '@/types/explain'

const SAMPLE_WORDS: DrivingWord[] = [
  { word: 'mystery',   tfidf: 0.421, nearest_genre: 'mystery'   },
  { word: 'detective', tfidf: 0.342, nearest_genre: 'mystery'   },
  { word: 'dragon',    tfidf: 0.234, nearest_genre: 'fantasy'   },
  { word: 'unknown1',  tfidf: 0.150, nearest_genre: 'made_up_v2'},
]

describe('DrivingWordsPills', () => {
  it('renders one pill per word', () => {
    render(<DrivingWordsPills words={SAMPLE_WORDS} />)
    expect(screen.getAllByTestId('driving-word-pill')).toHaveLength(4)
  })

  it('renders the D-46 canonical disclosure copy ("proxies — not literal classifier inputs")', () => {
    render(<DrivingWordsPills words={SAMPLE_WORDS} />)
    const disclosure = screen.getByTestId('driving-words-disclosure')
    expect(disclosure.textContent).toContain('proxies')
    expect(disclosure.textContent).toContain('not literal classifier inputs')
  })

  it('preserves input order (does not re-sort by tfidf or genre)', () => {
    render(<DrivingWordsPills words={SAMPLE_WORDS} />)
    const pills = screen.getAllByTestId('driving-word-pill')
    expect(pills[0]).toHaveTextContent('mystery')
    expect(pills[1]).toHaveTextContent('detective')
    expect(pills[2]).toHaveTextContent('dragon')
    expect(pills[3]).toHaveTextContent('unknown1')
  })

  it('puts the tfidf + nearest_genre in the pill title tooltip', () => {
    render(<DrivingWordsPills words={SAMPLE_WORDS} />)
    const pills = screen.getAllByTestId('driving-word-pill')
    const title = (pills[0] as HTMLElement).getAttribute('title') ?? ''
    expect(title).toContain('tfidf=0.421')
    expect(title).toContain('nearest=mystery')
  })

  it('falls back to grey dot for unknown nearest_genre', () => {
    render(<DrivingWordsPills words={SAMPLE_WORDS} />)
    const dots = screen.getAllByTestId('driving-word-pill-dot')
    // 4th pill has unknown genre -> fallback colour
    expect((dots[3] as HTMLElement).style.background).toMatch(/#888888|rgb\(136, 136, 136\)/)
  })

  it('returns null on empty input', () => {
    const { container } = render(<DrivingWordsPills words={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
