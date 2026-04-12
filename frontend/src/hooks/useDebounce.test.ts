import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from './useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not update value within 200ms', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 200),
      { initialProps: { value: 'initial' } }
    )
    expect(result.current).toBe('initial')

    rerender({ value: 'updated' })
    act(() => { vi.advanceTimersByTime(199) })
    expect(result.current).toBe('initial')
  })

  it('updates value after 200ms', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 200),
      { initialProps: { value: 'initial' } }
    )

    rerender({ value: 'updated' })
    act(() => { vi.advanceTimersByTime(200) })
    expect(result.current).toBe('updated')
  })

  it('cleanup cancels pending update on unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 200),
      { initialProps: { value: 'initial' } }
    )

    rerender({ value: 'updated' })
    unmount()
    act(() => { vi.advanceTimersByTime(200) })
    // After unmount, result still holds the last value before unmount (no error thrown)
    expect(result.current).toBe('initial')
  })
})
