import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

/**
 * Full per-book metadata served by ``GET /api/corpus/genres/{genre}/books``
 * (Plan 06-03 BUG-03 / CONTEXT.md D-09). Mirrors the backend's
 * ``CorpusBookFull`` Pydantic model exactly.
 */
export type CorpusBookFull = {
  gutenberg_id: string
  title: string
  author: string
  genre: string
  word_count: number
  color: string
  top_10_tfidf_words: string[]
}

/**
 * React Query hook fetching every book in a genre with full metadata for
 * the BookSlider (CONTEXT.md D-13).
 *
 * - ``staleTime: Infinity`` -- the bundled corpus only changes on retrain.
 * - ``enabled: !!genre`` -- a ``null`` selection skips the request entirely.
 */
export function useCorpusBooks(genre: string | null) {
  return useQuery<CorpusBookFull[]>({
    queryKey: ['corpus', 'genres', genre, 'books'],
    queryFn: () => {
      if (!genre) throw new Error('useCorpusBooks: no genre')
      return apiFetch<CorpusBookFull[]>(
        `/corpus/genres/${encodeURIComponent(genre)}/books`,
      )
    },
    enabled: !!genre,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
