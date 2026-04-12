import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { GENRE_LIST } from '@/constants/genres'

export interface TfidfMap { [word: string]: number }

// Genre-level TF-IDF: GET /viz/tfidf/{genre}
export function useGenreTfidf(genre: string | null) {
  return useQuery<TfidfMap>({
    queryKey: ['tfidf', 'genre', genre],
    queryFn: () => {
      if (!genre) throw new Error('no genre')
      // Runtime guard against path injection (T-3-02)
      if (!GENRE_LIST.includes(genre)) throw new Error(`Invalid genre: ${genre}`)
      return apiFetch<TfidfMap>(`/viz/tfidf/${genre}`)
    },
    enabled: genre !== null,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

// Book-level TF-IDF: GET /viz/tfidf/book/{gutenberg_id}
export function useBookTfidf(bookId: string | null) {
  return useQuery<TfidfMap>({
    queryKey: ['tfidf', 'book', bookId],
    queryFn: () => apiFetch<TfidfMap>(`/viz/tfidf/book/${bookId}`),
    enabled: bookId !== null,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
