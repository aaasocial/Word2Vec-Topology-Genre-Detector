import { useEffect } from 'react'
import type React from 'react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { KEY_TO_PROJECTION } from '@/constants/projections'

export function useKeyboardShortcuts(searchInputRef?: React.RefObject<HTMLInputElement>) {
  const setProjection = useVisualizationStore(s => s.setProjection)
  const setSelectedPoint = useVisualizationStore(s => s.setSelectedPoint)
  const setSearchQuery = useVisualizationStore(s => s.setSearchQuery)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Do not fire if user is typing in an input/textarea
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase() ?? ''
      if (tag === 'input' || tag === 'textarea') return

      if (e.key === 'r' || e.key === 'R') {
        // Trigger camera reset — CameraController listens to resetTrigger in store
        useVisualizationStore.getState().triggerCameraReset()
      } else if (KEY_TO_PROJECTION[e.key]) {
        setProjection(KEY_TO_PROJECTION[e.key])
      } else if (e.key === 'Escape') {
        setSelectedPoint(null)
        setSearchQuery('')
      } else if (e.key === '/') {
        e.preventDefault()
        searchInputRef?.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setProjection, setSelectedPoint, setSearchQuery, searchInputRef])
}
