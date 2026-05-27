import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { Step1WordEmbed } from './steps/Step1WordEmbed'
import { Step2TfidfWeight } from './steps/Step2TfidfWeight'
import { Step3PointCloud } from './steps/Step3PointCloud'
import { Step4Homology } from './steps/Step4Homology'
import { Step5PersistenceImage } from './steps/Step5PersistenceImage'
import { Step6Classification } from './steps/Step6Classification'
import { Step7ValidationLimitations } from './steps/Step7ValidationLimitations'

const STEPS = [
  Step1WordEmbed,
  Step2TfidfWeight,
  Step3PointCloud,
  Step4Homology,
  Step5PersistenceImage,
  Step6Classification,
  Step7ValidationLimitations,   // Phase 9 D-51 (placement) + D-53 (voice: "upper bound", never "wrong")
]

const TOTAL_STEPS = STEPS.length

export function PipelineExplanation() {
  const open = useVisualizationStore((s) => s.pipelineExplanationOpen)
  const step = useVisualizationStore((s) => s.pipelineExplanationStep)
  const setOpen = useVisualizationStore((s) => s.setPipelineExplanationOpen)
  const setStep = useVisualizationStore((s) => s.setPipelineExplanationStep)

  const handleClose = useCallback(() => {
    setOpen(false)
    setStep(0)
  }, [setOpen, setStep])

  const handlePrev = useCallback(() => {
    if (step > 0) setStep(step - 1)
  }, [step, setStep])

  const handleNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1)
    } else {
      handleClose()
    }
  }, [step, setStep, handleClose])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, handleClose, handlePrev, handleNext])

  if (!open) return null

  const StepComponent = STEPS[step]
  const isLastStep = step === TOTAL_STEPS - 1

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,10,15,0.95)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      role="dialog"
      aria-label="Pipeline explanation"
    >
      <div
        style={{
          maxWidth: 960,
          width: '90%',
          maxHeight: '90vh',
          background: '#111118',
          borderRadius: 12,
          padding: 32,
          position: 'relative',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'transparent',
            border: 'none',
            color: '#6B6B80',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 4,
            padding: 0,
            zIndex: 1,
          }}
        >
          <X size={18} />
        </button>

        {/* Step indicator */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 52,
            fontSize: 12,
            color: '#6B6B80',
          }}
        >
          Step {step + 1} / {TOTAL_STEPS}
        </div>

        {/* Step content with crossfade */}
        <div
          key={step}
          style={{
            flex: 1,
            animation: 'fadeIn 200ms ease-out',
          }}
        >
          <StepComponent />
        </div>

        {/* Navigation footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid #1E1E2A',
          }}
        >
          {/* Previous button */}
          <button
            onClick={handlePrev}
            disabled={step === 0}
            style={{
              background: 'transparent',
              border: '1px solid #2E2E3A',
              color: step === 0 ? '#2E2E3A' : '#9090A0',
              padding: '8px 16px',
              borderRadius: 6,
              fontSize: 13,
              cursor: step === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>

          {/* Step dots */}
          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Step ${i + 1}`}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: i === step ? '#6366F1' : '#2A2A3A',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'background 150ms',
                }}
              />
            ))}
          </div>

          {/* Next / Close button */}
          <button
            onClick={handleNext}
            style={{
              background: isLastStep ? '#6366F1' : 'transparent',
              border: isLastStep ? '1px solid #6366F1' : '1px solid #2E2E3A',
              color: isLastStep ? '#F5F5FF' : '#9090A0',
              padding: '8px 16px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: isLastStep ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {isLastStep ? 'Close' : 'Next'}
          </button>
        </div>
      </div>

      {/* Crossfade animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
