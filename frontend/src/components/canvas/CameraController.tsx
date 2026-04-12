import { useRef, useEffect } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { useUploadStore } from '@/stores/uploadStore'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

export function CameraController() {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const { camera } = useThree()
  const defaultPosition = useRef(new THREE.Vector3(0, 0, 5))
  const defaultTarget = useRef(new THREE.Vector3(0, 0, 0))
  const lerpProgress = useRef(1.0) // 1.0 = not animating
  const lerpTargetPosition = useRef(new THREE.Vector3(0, 0, 5))
  const lerpTargetLookAt = useRef(new THREE.Vector3(0, 0, 0))
  const is2D = useVisualizationStore(s => s.is2D)
  const resetCounter = useVisualizationStore(s => s.cameraResetCounter)
  const focusUploadCounter = useVisualizationStore(s => s.cameraFocusUploadCounter)
  const prevReset = useRef(resetCounter)
  const prevFocusUpload = useRef(focusUploadCounter)

  // Trigger camera reset animation when counter increments
  useEffect(() => {
    if (resetCounter !== prevReset.current) {
      prevReset.current = resetCounter
      lerpTargetPosition.current.copy(defaultPosition.current)
      lerpTargetLookAt.current.copy(defaultTarget.current)
      lerpProgress.current = 0.0
    }
  }, [resetCounter])

  // Trigger camera pan to uploaded book centroid when counter increments
  useEffect(() => {
    if (focusUploadCounter !== prevFocusUpload.current) {
      prevFocusUpload.current = focusUploadCounter
      const uploadedPoints = useUploadStore.getState().uploadedPoints
      if (uploadedPoints.length === 0) return
      // Compute centroid of uploaded book points
      const centroid = uploadedPoints.reduce(
        (acc, p) => acc.add(new THREE.Vector3(p.x, p.y, p.z)),
        new THREE.Vector3(),
      ).divideScalar(uploadedPoints.length)
      // Pan camera so centroid is at center, maintaining current distance
      const currentDist = camera.position.distanceTo(controlsRef.current?.target ?? new THREE.Vector3())
      const offset = camera.position.clone().sub(controlsRef.current?.target ?? new THREE.Vector3()).normalize().multiplyScalar(currentDist)
      lerpTargetPosition.current.copy(centroid).add(offset)
      lerpTargetLookAt.current.copy(centroid)
      lerpProgress.current = 0.0
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusUploadCounter])

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
    // 800ms tween: delta / 0.8 increments
    lerpProgress.current = Math.min(lerpProgress.current + delta / 0.8, 1.0)
    const t = 1 - Math.pow(1 - lerpProgress.current, 3) // cubic ease-out
    camera.position.lerp(lerpTargetPosition.current, t)
    controlsRef.current?.target.lerp(lerpTargetLookAt.current, t)
    controlsRef.current?.update()
  })

  return <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.1} />
}
