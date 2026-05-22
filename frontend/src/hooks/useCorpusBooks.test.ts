import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useCorpusBooks } from './useCorpusBooks'

// Plan 06-03 BUG-03 -- React Query hook for /api/corpus/genres/{genre}/books.
// Mocks the project's apiFetch helper so we never hit the network.

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(async (_path: string) => [
    {
      gutenberg_id: '84',
      title: 'Frankenstein',
      author: 'Mary Shelley',
      genre: 'horror',
      word_count: 75500,
      color: '#F87171',
      top_10_tfidf_words: ['clerval', 'justine', 'safie', 'felix', 'ingolstadt',
                          'frankenstein', 'kirwin', 'krempe', 'waldman', 'geneva'],
    },
  ]),
}))

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

describe('useCorpusBooks', () => {
  it('fetches /api/corpus/genres/{genre}/books and returns the parsed array', async () => {
    const { apiFetch } = await import('@/lib/api')
    const mockFetch = vi.mocked(apiFetch)
    mockFetch.mockClear()

    const { result } = renderHook(() => useCorpusBooks('horror'), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetch).toHaveBeenCalledWith('/corpus/genres/horror/books')
    expect(Array.isArray(result.current.data)).toBe(true)
    expect(result.current.data?.[0].author).toBe('Mary Shelley')
    expect(result.current.data?.[0].word_count).toBe(75500)
  })

  it('queryKey includes the genre slug', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children)

    const { result } = renderHook(() => useCorpusBooks('mystery'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const key = qc.getQueryCache().getAll()[0].queryKey
    expect(key).toContain('mystery')
    expect(key).toContain('corpus')
  })

  it('staleTime is Infinity (no re-fetch on rerender)', async () => {
    const { apiFetch } = await import('@/lib/api')
    const mockFetch = vi.mocked(apiFetch)
    mockFetch.mockClear()

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children)

    const { rerender } = renderHook(() => useCorpusBooks('horror'), { wrapper })
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    rerender()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('null genre disables the query (no fetch)', () => {
    const { apiFetch } = vi.hoisted ? { apiFetch: undefined as any } : { apiFetch: undefined }
    const { result } = renderHook(() => useCorpusBooks(null), { wrapper: makeWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
  })
})
