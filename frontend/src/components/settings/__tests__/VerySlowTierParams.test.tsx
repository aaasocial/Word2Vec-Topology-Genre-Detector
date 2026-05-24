import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// vi.hoisted lets us share the mock fn between the hoisted vi.mock factory
// and the test body. Without this, the mock factory cannot reference the
// outer `const apiFetchMock = ...` (TDZ error).
const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn().mockResolvedValue({ job_id: 'test-job', affected_steps: [] }),
}))

vi.mock('@/lib/api', () => ({
  apiFetch: apiFetchMock,
  API_BASE: '/api',
  WS_BASE: 'ws://localhost:8000',
}))

// Stub WebSocket so triggerRetrain's any internal progress socket does not dial out.
class StubWebSocket {
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  readyState = 0
  constructor(_url: string) {}
  close() {}
  send(_: string) {}
}
;(globalThis as unknown as { WebSocket: typeof StubWebSocket }).WebSocket = StubWebSocket

import { VerySlowTierParams } from '../VerySlowTierParams'
import { useVisualizationStore } from '@/stores/visualizationStore'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('VerySlowTierParams - useRecompute.triggerRetrain wiring', () => {
  beforeEach(() => {
    apiFetchMock.mockClear()
    useVisualizationStore.setState({
      dirtyParams: new Set<string>(),
      isRecomputing: false,
      isRetraining: false,
      h2Enabled: false,
    })
  })

  it('confirming the retrain dialog issues POST /viz/recompute with vector_size + window', async () => {
    render(<VerySlowTierParams />, { wrapper: makeWrapper() })

    // Move the Context Window slider; this opens the confirm dialog.
    const slider = screen.getByLabelText('Context Window')
    fireEvent.change(slider, { target: { value: '10' } })

    // Dialog should appear with the Retrain Model button.
    const confirmButton = await screen.findByRole('button', { name: /Retrain Model/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledTimes(1)
    })

    const [path, init] = apiFetchMock.mock.calls[0] as [string, RequestInit]
    expect(path).toBe('/viz/recompute')
    expect(init.method).toBe('POST')
    const parsed = JSON.parse(init.body as string)
    // triggerRetrain wraps params under changed_params with the current
    // vector_size (default 150) and the new window value (10).
    expect(parsed).toEqual({ changed_params: { vector_size: 150, window: 10 } })
  })

  it('clicking Keep Current Model reverts the slider and never POSTs', () => {
    render(<VerySlowTierParams />, { wrapper: makeWrapper() })

    const slider = screen.getByLabelText('Context Window') as HTMLInputElement
    const initialValue = slider.value
    fireEvent.change(slider, { target: { value: '10' } })
    expect(slider.value).toBe('10')

    const cancelButton = screen.getByRole('button', { name: /Keep Current Model/i })
    fireEvent.click(cancelButton)

    expect(slider.value).toBe(initialValue)
    expect(apiFetchMock).not.toHaveBeenCalled()
  })
})
