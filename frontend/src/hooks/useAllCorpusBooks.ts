// Reading Room — fetch every catalogued book, grouped by genre (Phase 12, 12-02).
//
// The Collection catalog rail lists all 8 regions with their books + counts. The
// existing `useCorpusBooks(genre)` fetches one genre at a time, so we fan out over
// the canonical genre list with React Query's `useQueries` (each query is the SAME
// `['corpus','genres',genre,'books']` key + `staleTime: Infinity` as useCorpusBooks,
// so a later single-genre fetch shares this cache and vice-versa).
//
// No new endpoint: this is purely a client-side fan-out over the existing
// `GET /api/corpus/genres/{genre}/books` (BUG-03 / D-09). The bundled corpus only
// changes on retrain, so the eight cached responses are effectively permanent.

import { useQueries } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { GENRE_LIST, type Genre } from '@/constants/genres'
import type { CorpusBookFull } from '@/hooks/useCorpusBooks'

export interface AllCorpusBooks {
  /** genre slug → its books (empty array while a genre is still loading). */
  byGenre: Record<string, CorpusBookFull[]>
  /** Flat list across every genre (source order = GENRE_LIST). */
  all: CorpusBookFull[]
  /** Quick lookup by gutenberg_id. */
  byId: Record<string, CorpusBookFull>
  /** True until every genre query has resolved (or errored). */
  isLoading: boolean
  isError: boolean
}

export function useAllCorpusBooks(): AllCorpusBooks {
  const results = useQueries({
    queries: GENRE_LIST.map((genre: Genre) => ({
      queryKey: ['corpus', 'genres', genre, 'books'],
      queryFn: () =>
        apiFetch<CorpusBookFull[]>(`/corpus/genres/${encodeURIComponent(genre)}/books`),
      staleTime: Infinity,
      gcTime: Infinity,
    })),
  })

  const byGenre: Record<string, CorpusBookFull[]> = {}
  const all: CorpusBookFull[] = []
  const byId: Record<string, CorpusBookFull> = {}

  GENRE_LIST.forEach((genre, i) => {
    const books = results[i]?.data ?? []
    byGenre[genre] = books
    for (const b of books) {
      all.push(b)
      byId[b.gutenberg_id] = b
    }
  })

  return {
    byGenre,
    all,
    byId,
    isLoading: results.some((r) => r.isLoading),
    isError: results.some((r) => r.isError),
  }
}
