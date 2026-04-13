import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { ProjectionKey } from '@/types/scatter'

export interface VRPayload {
  words: string[]
  edges: [number, number, number, number][]  // [word_a_idx, word_b_idx, eps_birth, feature_type]
  epsilon_max: number
  positions: [number, number, number][]
}

/**
 * React Query hook for fetching pre-computed VR edge data.
 *
 * @param genre - Genre name (null disables query)
 * @param projection - Projection method for 3D coordinates
 */
export function useVRData(genre: string | null, projection: ProjectionKey) {
  return useQuery<VRPayload>({
    queryKey: ['vr-edges', genre, projection],
    queryFn: () => apiFetch<VRPayload>(`/viz/vr/${genre}?projection=${projection}`),
    staleTime: Infinity,
    enabled: !!genre,
  })
}
