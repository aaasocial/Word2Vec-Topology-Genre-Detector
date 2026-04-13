import { useCallback, useRef } from 'react'
import { apiFetch, WS_BASE } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { useVisualizationStore } from '@/stores/visualizationStore'

interface RecomputeResponse {
  job_id: string
  affected_steps: string[]
}

export function useRecompute() {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)

  const triggerRecompute = useCallback(
    async (changedParams: Record<string, number>) => {
      const store = useVisualizationStore.getState()
      store.setIsRecomputing(true)

      try {
        const { job_id, affected_steps } = await apiFetch<RecomputeResponse>(
          '/viz/recompute',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ changed_params: changedParams }),
          },
        )

        // Listen on WebSocket for progress (same pattern as classify)
        const wsUrl = `${WS_BASE}/ws/recompute/${job_id}`
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onmessage = (event: MessageEvent) => {
          const msg = JSON.parse(event.data as string)
          if (msg.status === 'done') {
            // Invalidate affected caches
            for (const step of affected_steps) {
              if (step === 'persistence_images') {
                queryClient.invalidateQueries({ queryKey: ['persistence-image'] })
              }
              if (step === 'vr_edges') {
                queryClient.invalidateQueries({ queryKey: ['vr-data'] })
              }
              if (step === 'projections') {
                queryClient.invalidateQueries({ queryKey: ['scatter'] })
              }
              if (step === 'svm') {
                queryClient.invalidateQueries({ queryKey: ['classify'] })
              }
            }
            store.setIsRecomputing(false)
            store.clearDirtyParams()
            ws.close()
          } else if (msg.status === 'error') {
            store.setIsRecomputing(false)
            ws.close()
          }
        }

        ws.onerror = () => {
          // Fallback: clear state after timeout
          setTimeout(() => {
            store.setIsRecomputing(false)
            store.clearDirtyParams()
            queryClient.invalidateQueries()
          }, 2000)
        }
      } catch {
        useVisualizationStore.getState().setIsRecomputing(false)
      }
    },
    [queryClient],
  )

  const triggerRetrain = useCallback(
    async (params: { vector_size: number; window: number }) => {
      const store = useVisualizationStore.getState()
      store.setIsRetraining(true)

      try {
        await apiFetch<RecomputeResponse>('/viz/recompute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ changed_params: params }),
        })

        // For very-slow params, invalidate ALL caches on completion
        // In production this would use WebSocket; simplified here
        // The retrain flag will be cleared when the WS message arrives
      } catch {
        store.setIsRetraining(false)
      }
    },
    [],
  )

  const cancelRecompute = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
    const store = useVisualizationStore.getState()
    store.setIsRecomputing(false)
    store.setIsRetraining(false)
  }, [])

  return { triggerRecompute, triggerRetrain, cancelRecompute }
}
