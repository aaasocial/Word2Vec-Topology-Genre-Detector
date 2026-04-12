import { useRef, useCallback } from 'react'
import { apiFetch, WS_BASE } from '@/lib/api'
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
  const wsRef = useRef<WebSocket | null>(null)
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

    // Connect WebSocket with retry logic
    let retryCount = 0
    const connect = () => {
      const wsUrl = `${WS_BASE}/ws/classify/${job_id}`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onmessage = (event: MessageEvent) => {
        const msg = JSON.parse(event.data as string)
        if (msg.type === 'progress') {
          const prevSteps = store.getState().steps
          store.getState().setSteps(prevSteps.map((s, i) => {
            if (i === msg.step - 1) return { ...s, status: msg.status, errorMessage: msg.message }
            if (i < msg.step - 1 && s.status !== 'error') return { ...s, status: 'complete' }
            return s
          }))
        } else if (msg.type === 'result') {
          store.getState().setResult({
            genre: msg.genre,
            confidence: msg.confidence,
            oov_count: msg.oov_count,
            total_words: msg.total_words,
          })
          // Cap at 50k points (T-3-03 DoS guard)
          const pts: ScatterPoint[] = ((msg.scatter_points ?? []) as ScatterPoint[]).slice(0, MAX_UPLOADED_POINTS)
          store.getState().setUploadedPoints(pts)
          ws.close()
        } else if (msg.type === 'error') {
          const errMsg = (msg.message as string) ?? 'Classification failed'
          const errSteps = store.getState().steps
          store.getState().setSteps(errSteps.map((s) =>
            s.status === 'active' ? { ...s, status: 'error', errorMessage: errMsg } : s
          ))
        }
      }

      ws.onerror = () => {
        if (retryCount < MAX_RETRIES) {
          retryCount++
          store.getState().setRetryMessage(`Connection lost. Retrying... (${retryCount}/${MAX_RETRIES})`)
          setTimeout(connect, RETRY_DELAY_MS)
        } else {
          store.getState().setRetryMessage('Unable to connect to the server. Please refresh the page.')
        }
      }
    }
    connect()
  }, [])

  const reset = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
    store.getState().reset()
  }, [])

  return { classify, reset }
}
