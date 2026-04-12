import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { ScatterData, ProjectionKey } from '@/types/scatter'

export function useScatterData(projection: ProjectionKey) {
  return useQuery<ScatterData>({
    queryKey: ['scatter', projection],
    queryFn: () => apiFetch<ScatterData>(`/viz/scatter/${projection}`),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
