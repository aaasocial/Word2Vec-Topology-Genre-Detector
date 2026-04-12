import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useClassify } from './useClassify'
import { useUploadStore } from '@/stores/uploadStore'

// Mock apiFetch
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({ job_id: 'test-job-123' }),
  WS_BASE: '',
}))

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = []
  onmessage: ((e: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onopen: (() => void) | null = null
  close = vi.fn()
  constructor(public url: string) { MockWebSocket.instances.push(this) }
  send(_data: string) {}
}
;(global as any).WebSocket = MockWebSocket

describe('useClassify', () => {
  beforeEach(() => {
    MockWebSocket.instances = []
    useUploadStore.getState().reset()
    vi.clearAllMocks()
  })

  it('rejects non-txt files before calling fetch', async () => {
    const { result } = renderHook(() => useClassify())
    const badFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    await expect(result.current.classify(badFile)).rejects.toThrow('Only .txt files')
  })

  it('rejects files over 5MB', async () => {
    const { result } = renderHook(() => useClassify())
    const bigContent = new Uint8Array(6 * 1024 * 1024)
    const bigFile = new File([bigContent], 'large.txt', { type: 'text/plain' })
    await expect(result.current.classify(bigFile)).rejects.toThrow('5MB')
  })

  it('sets jobId after successful POST', async () => {
    const { result } = renderHook(() => useClassify())
    const file = new File(['hello world'], 'book.txt', { type: 'text/plain' })
    await act(async () => { await result.current.classify(file) })
    expect(useUploadStore.getState().jobId).toBe('test-job-123')
  })

  it('updates steps on progress messages', async () => {
    const { result } = renderHook(() => useClassify())
    const file = new File(['hello world'], 'book.txt', { type: 'text/plain' })
    await act(async () => { await result.current.classify(file) })
    const ws = MockWebSocket.instances[0]
    act(() => {
      ws.onmessage?.({ data: JSON.stringify({ type: 'progress', step: 1, status: 'complete' }) })
    })
    expect(useUploadStore.getState().steps[0].status).toBe('complete')
  })

  it('caps uploadedPoints at 50k', async () => {
    const { result } = renderHook(() => useClassify())
    const file = new File(['hello world'], 'book.txt', { type: 'text/plain' })
    await act(async () => { await result.current.classify(file) })
    const ws = MockWebSocket.instances[0]
    const manyPoints = Array.from({ length: 80_000 }, (_, i) => ({
      word: `word${i}`, genre: 'horror', x: 0, y: 0, z: 0, tfidf_weight: 0.1, neighbors: [],
    }))
    act(() => {
      ws.onmessage?.({ data: JSON.stringify({
        type: 'result', genre: 'horror', confidence: 0.9, oov_count: 10, total_words: 1000,
        scatter_points: manyPoints,
      }) })
    })
    expect(useUploadStore.getState().uploadedPoints.length).toBe(50_000)
  })

  it('retries on WebSocket error', async () => {
    const { result } = renderHook(() => useClassify())
    const file = new File(['hello world'], 'book.txt', { type: 'text/plain' })
    await act(async () => { await result.current.classify(file) })
    const ws = MockWebSocket.instances[0]
    act(() => { ws.onerror?.() })
    expect(useUploadStore.getState().retryMessage).toContain('Retrying')
  })

  it('sets Unable to connect after 3 retries', async () => {
    const { result } = renderHook(() => useClassify())
    const file = new File(['hello world'], 'book.txt', { type: 'text/plain' })
    await act(async () => { await result.current.classify(file) })
    // Trigger 4 errors (1 original + 3 retries): each new WS instance errors
    for (let i = 0; i < 4; i++) {
      const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1]
      act(() => { ws.onerror?.() })
    }
    expect(useUploadStore.getState().retryMessage).toContain('Unable to connect')
  })
})
