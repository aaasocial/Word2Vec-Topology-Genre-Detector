import { create } from 'zustand'
import type { ProjectionKey } from '@/types/scatter'

interface VisualizationState {
  projection: ProjectionKey
  selectedGenre: string | null
  selectedBookId: string | null
  selectedPointIndex: number | null
  hoveredPointIndex: number | null
  pointSizeMultiplier: number
  opacity: number
  tfidfThreshold: number
  brightnessSensitivity: number
  is2D: boolean
  searchQuery: string
  cameraFocusUploadCounter: number
  cameraResetCounter: number
  setProjection: (p: ProjectionKey) => void
  setSelectedGenre: (g: string | null) => void
  setSelectedBook: (id: string | null) => void
  setSelectedPoint: (idx: number | null) => void
  setHoveredPoint: (idx: number | null) => void
  setPointSizeMultiplier: (v: number) => void
  setOpacity: (v: number) => void
  setTfidfThreshold: (v: number) => void
  setBrightnessSensitivity: (v: number) => void
  setIs2D: (v: boolean) => void
  setSearchQuery: (q: string) => void
  triggerCameraFocusUpload: () => void
  triggerCameraReset: () => void
}

export const useVisualizationStore = create<VisualizationState>()((set) => ({
  projection: 'pca',
  selectedGenre: null,
  selectedBookId: null,
  selectedPointIndex: null,
  hoveredPointIndex: null,
  pointSizeMultiplier: 1.0,
  opacity: 1.0,
  tfidfThreshold: 0.0,
  brightnessSensitivity: 1.0,
  is2D: false,
  searchQuery: '',
  cameraFocusUploadCounter: 0,
  cameraResetCounter: 0,
  setProjection: (p) => set({ projection: p }),
  setSelectedGenre: (g) => set({ selectedGenre: g }),
  setSelectedBook: (id) => set({ selectedBookId: id }),
  setSelectedPoint: (idx) => set({ selectedPointIndex: idx }),
  setHoveredPoint: (idx) => set({ hoveredPointIndex: idx }),
  setPointSizeMultiplier: (v) => set({ pointSizeMultiplier: v }),
  setOpacity: (v) => set({ opacity: v }),
  setTfidfThreshold: (v) => set({ tfidfThreshold: v }),
  setBrightnessSensitivity: (v) => set({ brightnessSensitivity: v }),
  setIs2D: (v) => set({ is2D: v }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  triggerCameraFocusUpload: () => set((s) => ({ cameraFocusUploadCounter: s.cameraFocusUploadCounter + 1 })),
  triggerCameraReset: () => set((s) => ({ cameraResetCounter: s.cameraResetCounter + 1 })),
}))
