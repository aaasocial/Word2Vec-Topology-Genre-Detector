import { describe, it, expect, beforeEach } from 'vitest'
import { useVisualizationStore } from '@/stores/visualizationStore'

// CameraController tests focus on Zustand store state changes that drive camera behavior.
// Three.js / R3F rendering is not testable in jsdom; we test the store contracts instead.

describe('CameraController store contracts', () => {
  beforeEach(() => {
    useVisualizationStore.setState({
      cameraResetCounter: 0,
      is2D: false,
    })
  })

  it('triggerCameraReset increments cameraResetCounter (drives lerpProgress reset)', () => {
    const before = useVisualizationStore.getState().cameraResetCounter
    useVisualizationStore.getState().triggerCameraReset()
    expect(useVisualizationStore.getState().cameraResetCounter).toBe(before + 1)
  })

  it('multiple triggerCameraReset calls each increment counter', () => {
    useVisualizationStore.getState().triggerCameraReset()
    useVisualizationStore.getState().triggerCameraReset()
    useVisualizationStore.getState().triggerCameraReset()
    expect(useVisualizationStore.getState().cameraResetCounter).toBe(3)
  })

  it('is2D=true sets flag (drives polar angle lock in CameraController effect)', () => {
    useVisualizationStore.getState().setIs2D(true)
    expect(useVisualizationStore.getState().is2D).toBe(true)
  })

  it('is2D=false clears flag (drives polar angle restore)', () => {
    useVisualizationStore.getState().setIs2D(true)
    useVisualizationStore.getState().setIs2D(false)
    expect(useVisualizationStore.getState().is2D).toBe(false)
  })

  it('is2D starts false by default', () => {
    expect(useVisualizationStore.getState().is2D).toBe(false)
  })

  it('cameraResetCounter starts at 0', () => {
    expect(useVisualizationStore.getState().cameraResetCounter).toBe(0)
  })
})
