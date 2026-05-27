// Vitest tests for useExplain hook (Phase 9 DEPTH-03).
// Covers: happy path (200), 410 -> onExpired, 503 -> onUncalibrated,
// generic errors surfaced via mutation.error, no auto-fire.
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useExplain } from './useExplain'
import { ApiError } from '@/lib/api'

// Mock fetch in the global so apiFetch hits our handler.
const originalFetch = global.fetch

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

const SAMPLE_EXPLAIN = {
  nearest_training_books: [
    { gutenberg_id: '1', title: 't', author: 'a', genre: 'romance', distance: 0.1 },
  ],
  track_contributions: {
    topology:   { pct: 60.0, direction: '+' as const },
    vocabulary: { pct: 40.0, direction: '+' as const },
  },
  driving_words: [{ word: 'love', tfidf: 0.5, nearest_genre: 'romance' }],
  uncertainty: { entropy: 0.5, top1_top2_gap: 0.3, badge_fires: false },
  predicted_genre: 'romance',
}

describe('useExplain', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('happy path: returns ExplainResponse on 200', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => SAMPLE_EXPLAIN,
    }) as unknown as typeof fetch

    const { result } = renderHook(() => useExplain('abc-123'), { wrapper: wrapper() })

    act(() => { result.current.mutate() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.predicted_genre).toBe('romance')
  })

  it('410: calls onExpired callback and exposes ApiError with .status=410', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 410,
      text: async () => 'Upload expired',
    }) as unknown as typeof fetch

    const onExpired = vi.fn()
    const onUncalibrated = vi.fn()

    const { result } = renderHook(
      () => useExplain('abc-123', { onExpired, onUncalibrated }),
      { wrapper: wrapper() },
    )

    act(() => { result.current.mutate() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(onExpired).toHaveBeenCalledOnce()
    expect(onUncalibrated).not.toHaveBeenCalled()
    expect(result.current.error).toBeInstanceOf(ApiError)
    expect(result.current.error?.status).toBe(410)
  })

  it('503: calls onUncalibrated callback and exposes ApiError with .status=503', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'SVM is not calibrated',
    }) as unknown as typeof fetch

    const onExpired = vi.fn()
    const onUncalibrated = vi.fn()

    const { result } = renderHook(
      () => useExplain('abc-123', { onExpired, onUncalibrated }),
      { wrapper: wrapper() },
    )

    act(() => { result.current.mutate() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(onUncalibrated).toHaveBeenCalledOnce()
    expect(onExpired).not.toHaveBeenCalled()
    expect(result.current.error?.status).toBe(503)
  })

  it('does NOT fire automatically -- consumer must call mutate()', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => SAMPLE_EXPLAIN,
    })
    global.fetch = fetchSpy as unknown as typeof fetch

    renderHook(() => useExplain('abc-123'), { wrapper: wrapper() })

    // Wait one microtask; fetch should not have been called
    await Promise.resolve()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('null jobId: rejects with ApiError before fetching', async () => {
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy as unknown as typeof fetch

    const { result } = renderHook(() => useExplain(null), { wrapper: wrapper() })

    // mutateAsync resolves/rejects -- easier to await directly than chase isError flag
    // under fake timers.
    await expect(result.current.mutateAsync()).rejects.toBeInstanceOf(ApiError)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
