export const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? '/api'
export const WS_BASE = (import.meta as any).env?.VITE_WS_BASE ?? '/api'

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options)
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new Error(`API ${path} failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<T>
}
