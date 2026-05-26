import { create } from 'zustand'
import type { ScatterPoint } from '@/types/scatter'
import type { TopNPrediction } from '@/types/explain'

export interface ProgressStep {
  label: string
  status: 'pending' | 'active' | 'complete' | 'error'
  errorMessage?: string
}

export interface ClassificationResult {
  genre: string
  confidence: number
  oov_count: number
  total_words: number
  // Phase 9 (DEPTH-01/02/07) -- optional for backward compat with pre-Phase-9 SVM
  top_n?: TopNPrediction[]
  entropy?: number
  top1_top2_gap?: number
  badge_fires?: boolean
}

interface UploadState {
  jobId: string | null
  steps: ProgressStep[]
  result: ClassificationResult | null
  uploadedPoints: ScatterPoint[]
  retryMessage: string | null
  setJobId: (id: string | null) => void
  setSteps: (steps: ProgressStep[]) => void
  setResult: (r: ClassificationResult | null) => void
  setUploadedPoints: (pts: ScatterPoint[]) => void
  setRetryMessage: (msg: string | null) => void
  reset: () => void
}

const INITIAL_STEPS: ProgressStep[] = [
  { label: 'Uploading file...', status: 'pending' },
  { label: 'Tokenizing text...', status: 'pending' },
  { label: 'Computing TF-IDF...', status: 'pending' },
  { label: 'Building point cloud...', status: 'pending' },
  { label: 'Computing homology...', status: 'pending' },
  { label: 'Classifying genre...', status: 'pending' },
]

export const useUploadStore = create<UploadState>()((set) => ({
  jobId: null,
  steps: INITIAL_STEPS.map((s) => ({ ...s })),
  result: null,
  uploadedPoints: [],
  retryMessage: null,
  setJobId: (id) => set({ jobId: id }),
  setSteps: (steps) => set({ steps }),
  setResult: (r) => set({ result: r }),
  setUploadedPoints: (pts) => set({ uploadedPoints: pts }),
  setRetryMessage: (msg) => set({ retryMessage: msg }),
  reset: () => set({
    jobId: null,
    steps: INITIAL_STEPS.map((s) => ({ ...s })),
    result: null,
    uploadedPoints: [],
    retryMessage: null,
  }),
}))
