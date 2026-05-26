import { useRef, useCallback } from 'react'
import { apiFetch, API_BASE } from '@/lib/api'
import { useUploadStore } from '@/stores/uploadStore'
import type { ScatterPoint } from '@/types/scatter'

const MAX_FILE_SIZE = 5 * 1024 * 1024  // 5MB
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000
const MAX_UPLOADED_POINTS = 50_000

interface UseClassifyReturn {
  classify: (file: File) => Promise<void>
  reset: () => void
}

export function useClassify(): UseClassifyReturn {
  const esRef = useRef<EventSource | null>(null)
  const retryCountRef = useRef(0)
  const store = useUploadStore

  const classify = useCallback(async (file: File) => {
    // Client-side validation (T-3-04)
    if (!file.name.endsWith('.txt') && file.type !== 'text/plain') {
      throw new Error('Only .txt files are accepted. Convert other formats using the provided script.')
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File exceeds the 5MB size limit. Try a shorter text.')
    }

    // Reset previous state
    store.getState().reset()
    retryCountRef.current = 0

    // Mark step 1 active (use value form — setSteps accepts ProgressStep[], not a callback)
    const initSteps = store.getState().steps
    store.getState().setSteps(initSteps.map((s, i) => i === 0 ? { ...s, status: 'active' } : s))

    // POST to /classify
    const formData = new FormData()
    formData.append('file', file)
    const { job_id } = await apiFetch<{ job_id: string }>('/classify', {
      method: 'POST',
      body: formData,
    })
    store.getState().setJobId(job_id)

    // Open SSE stream for progress — SSE uses plain HTTP, works through Railway's proxy
    // (WebSocket upgrade headers are stripped by Railway's edge proxy)
    const sseUrl = `${API_BASE}/classify/${job_id}/progress`

    const connect = () => {
      const es = new EventSource(sseUrl)
      esRef.current = es

      es.onmessage = (event: MessageEvent) => {
        // Worker publishes: {step, index, total, message, status, result?}
        // status: 'running' | 'done' | 'error' | 'cancelled'
        const msg = JSON.parse(event.data as string)

        if (msg.status === 'running') {
          const prevSteps = store.getState().steps
          store.getState().setSteps(prevSteps.map((s, i) => {
            if (i === msg.index - 1) return { ...s, status: 'active', errorMessage: msg.message }
            if (i < msg.index - 1 && s.status !== 'error') return { ...s, status: 'complete' }
            return s
          }))
        } else if (msg.status === 'done' && msg.result) {
          store.getState().setResult({
            genre: msg.result.predicted_genre,
            confidence: msg.result.confidence,
            oov_count: msg.result.oov_word_count,
            total_words: msg.result.total_words,
            // Phase 9 -- read new SSE fields (optional for backwards compat)
            top_n: msg.result.top_n,
            entropy: msg.result.entropy,
            top1_top2_gap: msg.result.top1_top2_gap,
            badge_fires: msg.result.badge_fires,
          })
          // Cap at 50k points (T-3-03 DoS guard)
          const pts: ScatterPoint[] = ((msg.result.scatter_points ?? []) as ScatterPoint[]).slice(0, MAX_UPLOADED_POINTS)
          store.getState().setUploadedPoints(pts)
          es.close()
        } else if (msg.status === 'error' || msg.status === 'cancelled') {
          const errMsg = (msg.message as string) ?? 'Classification failed'
          const errSteps = store.getState().steps
          store.getState().setSteps(errSteps.map((s) =>
            s.status === 'active' ? { ...s, status: 'error', errorMessage: errMsg } : s
          ))
          es.close()
        }
      }

      es.onerror = () => {
        // Close to prevent EventSource's built-in auto-reconnect, then retry manually
        es.close()
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++
          store.getState().setRetryMessage(
            `Connection lost. Retrying... (${retryCountRef.current}/${MAX_RETRIES})`
          )
          setTimeout(connect, RETRY_DELAY_MS)
        } else {
          store.getState().setRetryMessage('Unable to connect to the server. Please refresh the page.')
        }
      }
    }
    connect()
  }, [])

  const reset = useCallback(() => {
    esRef.current?.close()
    esRef.current = null
    store.getState().reset()
  }, [])

  return { classify, reset }
}
