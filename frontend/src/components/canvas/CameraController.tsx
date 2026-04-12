import { useRef, useEffect } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useVisualizationStore } from '@/stores/visualizationStore'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

export function CameraController() {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const { camera } = useThree()
  const defaultPosition = useRef(new THREE.Vector3(0, 0, 5))
  const defaultTarget = useRef(new THREE.Vector3(0, 0, 0))
  const lerpProgress = useRef(1.0) // 1.0 = not animating
  const is2D = useVisualizationStore(s => s.is2D)
  const resetCounter = useVisualizationStore(s => s.cameraResetCounter)
  const prevReset = useRef(resetCounter)

  // Trigger camera reset animation when counter increments
  useEffect(() => {
    if (resetCounter !== prevReset.current) {
      prevReset.current = resetCounter
      lerpProgress.current = 0.0
    }
  }, [resetCounter])

  // Lock polar angle in 2D mode
  useEffect(() => {
    if (!controlsRef.current) return
    if (is2D) {
      controlsRef.current.minPolarAngle = Math.PI / 2
      controlsRef.current.maxPolarAngle = Math.PI / 2
    } else {
      controlsRef.current.minPolarAngle = 0
      controlsRef.current.maxPolarAngle = Math.PI
    }
  }, [is2D])

  useFrame((_, delta) => {
    if (lerpProgress.current >= 1.0) return
    lerpProgress.current = Math.min(lerpProgress.current + delta / 0.5, 1.0)
    const t = 1 - Math.pow(1 - lerpProgress.current, 3)
    camera.position.lerp(defaultPosition.current, t)
    controlsRef.current?.target.lerp(defaultTarget.current, t)
    controlsRef.current?.update()
  })

  return <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.1} />
}
