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

// Stub WebSocket so useRecompute's progress socket does not try to dial out.
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

import { SlowTierParams } from '../SlowTierParams'
import { useVisualizationStore } from '@/stores/visualizationStore'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('SlowTierParams - useRecompute wiring', () => {
  beforeEach(() => {
    apiFetchMock.mockClear()
    useVisualizationStore.setState({
      dirtyParams: new Set<string>(),
      isRecomputing: false,
      isRetraining: false,
      h2Enabled: false,
    })
  })

  it('clicking Recompute issues POST /viz/recompute with the changed param', async () => {
    render(<SlowTierParams />, { wrapper: makeWrapper() })

    // Move the grid_resolution slider away from its default (20) to dirty it.
    const slider = screen.getByLabelText('Persistence Image Resolution (M)')
    fireEvent.change(slider, { target: { value: '40' } })

    // The Recompute button should now be enabled because a param is dirty.
    const button = screen.getByRole('button', { name: /Recompute Results/i })
    expect(button).not.toBeDisabled()

    fireEvent.click(button)

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledTimes(1)
    })

    const [path, init] = apiFetchMock.mock.calls[0] as [string, RequestInit]
    expect(path).toBe('/viz/recompute')
    expect(init.method).toBe('POST')
    expect(typeof init.body).toBe('string')
    const parsed = JSON.parse(init.body as string)
    expect(parsed).toEqual({ changed_params: { grid_resolution: 40 } })
  })

  it('Recompute button is disabled at rest and never fires apiFetch', () => {
    render(<SlowTierParams />, { wrapper: makeWrapper() })

    const button = screen.getByRole('button', { name: /Recompute Results/i })
    expect(button).toBeDisabled()

    // Even if a determined user clicks the disabled button, no POST escapes.
    fireEvent.click(button)
    expect(apiFetchMock).not.toHaveBeenCalled()
  })
})
