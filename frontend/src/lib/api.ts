export const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? '/api'
export const WS_BASE = (import.meta as any).env?.VITE_WS_BASE ?? '/api'

/**
 * Error subclass that carries the HTTP status code so callers can discriminate
 * 410 / 503 / 5xx without parsing the message string. Phase 9 DEPTH-03 (Q5 / Assumption A1).
 *
 * Backwards-compat: ApiError extends Error, so existing `instanceof Error` checks
 * still match. New callers (e.g., useExplain.ts) can `instanceof ApiError` to
 * access `.status` and route on it.
 */
export class ApiError extends Error {
  status: number
  body?: string
  constructor(message: string, status: number, body?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options)
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new ApiError(`API ${path} failed: ${res.status} ${text}`, res.status, text)
  }
  return res.json() as Promise<T>
}
