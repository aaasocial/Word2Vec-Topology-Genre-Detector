import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface PersistenceDiagramData {
  /** Raw [birth, death] pairs */
  points: [number, number][]
  dim: number
  epsilon_max: number
}

/**
 * React Query hook for fetching raw persistence diagram scatter points.
 *
 * @param genreOrBookId - Genre name or Gutenberg book ID (null disables query)
 * @param dim - Homology dimension (0, 1, or 2)
 * @param isBook - If true, fetch per-book endpoint; otherwise per-genre
 */
export function usePersistenceDiagram(
  genreOrBookId: string | null,
  dim: number,
  isBook: boolean = false,
) {
  const path = isBook
    ? `/viz/persistence-diagram/book/${genreOrBookId}?dim=${dim}`
    : `/viz/persistence-diagram/${genreOrBookId}?dim=${dim}`

  return useQuery<PersistenceDiagramData>({
    queryKey: ['persistence-diagram', genreOrBookId, dim, isBook],
    queryFn: () => apiFetch<PersistenceDiagramData>(path),
    staleTime: Infinity,
    enabled: !!genreOrBookId,
  })
}
