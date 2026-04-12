import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useGenreTfidf, useBookTfidf } from './useTfidfData'

// Mock apiFetch
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(async (path: string) => {
    return { mock_word: 0.42, test: 0.1 }
  }),
}))

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

describe('useGenreTfidf', () => {
  it('queryKey includes genre slug', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children)

    const { result } = renderHook(() => useGenreTfidf('romance'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const queries = qc.getQueryCache().getAll()
    const key = queries[0].queryKey
    expect(key).toContain('romance')
    expect(key).toContain('genre')
    expect(key).toContain('tfidf')
  })

  it('staleTime is Infinity (query does not refetch immediately)', async () => {
    const { apiFetch } = await import('@/lib/api')
    const mockFetch = vi.mocked(apiFetch)
    mockFetch.mockClear()

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children)

    const { rerender } = renderHook(() => useGenreTfidf('mystery'), { wrapper })
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))

    // Rerender — should NOT trigger another fetch because staleTime is Infinity
    rerender()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('null genre skips query (enabled: false)', () => {
    const { result } = renderHook(() => useGenreTfidf(null), { wrapper: makeWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
  })

  it('throws error for invalid genre (not in GENRE_LIST)', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children)

    const { result } = renderHook(() => useGenreTfidf('not_a_real_genre'), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeTruthy()
  })
})

describe('useBookTfidf', () => {
  it('book variant uses /viz/tfidf/book/{id} path', async () => {
    const { apiFetch } = await import('@/lib/api')
    const mockFetch = vi.mocked(apiFetch)
    mockFetch.mockClear()

    const { result } = renderHook(() => useBookTfidf('12345'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetch).toHaveBeenCalledWith('/viz/tfidf/book/12345')
  })

  it('null bookId skips query (enabled: false)', () => {
    const { result } = renderHook(() => useBookTfidf(null), { wrapper: makeWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })
})
