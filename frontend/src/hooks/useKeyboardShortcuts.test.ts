import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { useVisualizationStore } from '@/stores/visualizationStore'

function fireKeydown(key: string, target?: HTMLElement) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true })
  if (target) {
    Object.defineProperty(event, 'target', { value: target })
  }
  window.dispatchEvent(event)
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    useVisualizationStore.setState({
      projection: 'pca',
      selectedGenre: null,
      selectedBookId: null,
      selectedPointIndex: null,
      cameraResetCounter: 0,
      searchQuery: '',
    })
  })

  it('pressing r triggers camera reset (increments cameraResetCounter)', () => {
    renderHook(() => useKeyboardShortcuts())
    const before = useVisualizationStore.getState().cameraResetCounter
    fireKeydown('r')
    expect(useVisualizationStore.getState().cameraResetCounter).toBe(before + 1)
  })

  it('pressing R triggers camera reset', () => {
    renderHook(() => useKeyboardShortcuts())
    const before = useVisualizationStore.getState().cameraResetCounter
    fireKeydown('R')
    expect(useVisualizationStore.getState().cameraResetCounter).toBe(before + 1)
  })

  it('pressing 1 sets projection to pca', () => {
    renderHook(() => useKeyboardShortcuts())
    useVisualizationStore.setState({ projection: 'tsne' })
    fireKeydown('1')
    expect(useVisualizationStore.getState().projection).toBe('pca')
  })

  it('pressing 2 sets projection to kpca', () => {
    renderHook(() => useKeyboardShortcuts())
    fireKeydown('2')
    expect(useVisualizationStore.getState().projection).toBe('kpca')
  })

  it('pressing 3 sets projection to umap', () => {
    renderHook(() => useKeyboardShortcuts())
    fireKeydown('3')
    expect(useVisualizationStore.getState().projection).toBe('umap')
  })

  it('pressing 4 sets projection to tsne', () => {
    renderHook(() => useKeyboardShortcuts())
    fireKeydown('4')
    expect(useVisualizationStore.getState().projection).toBe('tsne')
  })

  it('pressing Escape calls setSelectedPoint(null)', () => {
    renderHook(() => useKeyboardShortcuts())
    useVisualizationStore.setState({ selectedPointIndex: 42 })
    fireKeydown('Escape')
    expect(useVisualizationStore.getState().selectedPointIndex).toBeNull()
  })

  it('pressing Escape also clears searchQuery', () => {
    renderHook(() => useKeyboardShortcuts())
    useVisualizationStore.setState({ searchQuery: 'love' })
    fireKeydown('Escape')
    expect(useVisualizationStore.getState().searchQuery).toBe('')
  })

  it('pressing / focuses the search input ref', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    const ref = { current: input }
    const focusSpy = vi.spyOn(input, 'focus')
    renderHook(() => useKeyboardShortcuts(ref))
    fireKeydown('/')
    expect(focusSpy).toHaveBeenCalled()
    document.body.removeChild(input)
  })

  it('does not fire when target is an input element', () => {
    renderHook(() => useKeyboardShortcuts())
    const before = useVisualizationStore.getState().cameraResetCounter

    const input = document.createElement('input')
    document.body.appendChild(input)
    // Dispatch directly on the input so target is the input
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }))
    // Since the event bubbles to window and we check tagName, it should be blocked
    // Note: in jsdom, e.target in the window listener will be the input
    expect(useVisualizationStore.getState().cameraResetCounter).toBe(before)
    document.body.removeChild(input)
  })
})
