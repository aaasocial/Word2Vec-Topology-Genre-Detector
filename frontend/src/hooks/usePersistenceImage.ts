import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface PersistenceImageData {
  data: number[]
  M: number
  dim: number
  vmin: number
  vmax: number
}

/**
 * React Query hook for fetching pre-computed persistence images.
 *
 * @param genreOrBookId - Genre name or Gutenberg book ID
 * @param dim - Homology dimension (0, 1, or 2)
 * @param isBook - If true, fetch per-book endpoint; otherwise per-genre
 */
export function usePersistenceImage(
  genreOrBookId: string | null,
  dim: number,
  isBook: boolean = false,
) {
  const path = isBook
    ? `/viz/persistence/book/${genreOrBookId}?dim=${dim}`
    : `/viz/persistence/${genreOrBookId}?dim=${dim}`

  return useQuery<PersistenceImageData>({
    queryKey: ['persistence-image', genreOrBookId, dim, isBook],
    queryFn: () => apiFetch<PersistenceImageData>(path),
    staleTime: Infinity,
    enabled: !!genreOrBookId,
  })
}
