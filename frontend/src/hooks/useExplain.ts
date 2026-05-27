// frontend/src/hooks/useExplain.ts
// Phase 9 DEPTH-03 -- React Query mutation calling POST /api/classify/{job_id}/explain.
//
// Routes errors via .status (from ApiError):
//   - 410 Gone        -> onExpired callback (feature_vec evicted from Redis per D-49)
//   - 503             -> onUncalibrated callback (SVM not calibrated OR artifacts not loaded
//                                                OR explain cache unavailable)
//   - other 4xx/5xx   -> surfaced via React Query's `error` field; no callback
//
// Mutation NOT useQuery because POST + lazy on-demand fetch (consumer decides when to fire).
// Hook does NOT auto-fire -- the consumer component owns the mutate() trigger.
import { useMutation } from '@tanstack/react-query'
import { apiFetch, ApiError } from '@/lib/api'
import type { ExplainResponse } from '@/types/explain'

export interface UseExplainOptions {
  /** 410 -- feature_vec evicted from Redis (5-min TTL passed). Terminal; user must re-upload. */
  onExpired?: () => void
  /** 503 -- SVM not calibrated OR explain artifacts not loaded OR Redis unavailable. */
  onUncalibrated?: () => void
}

export function useExplain(jobId: string | null, opts: UseExplainOptions = {}) {
  return useMutation<ExplainResponse, ApiError>({
    mutationFn: async () => {
      if (!jobId) {
        throw new ApiError('No job_id available -- re-upload first.', 0)
      }
      return apiFetch<ExplainResponse>(`/classify/${jobId}/explain`, {
        method: 'POST',
      })
    },
    onError: (err) => {
      if (err.status === 410) {
        opts.onExpired?.()
      } else if (err.status === 503) {
        opts.onUncalibrated?.()
      }
    },
    retry: (failureCount, err) => {
      // Don't retry terminal failures or any 4xx (client errors).
      if (err instanceof ApiError) {
        if (err.status === 410 || err.status === 503) return false
        if (err.status >= 400 && err.status < 500) return false
      }
      // Network / 5xx (non-503): up to 2 retries.
      return failureCount < 2
    },
  })
}
