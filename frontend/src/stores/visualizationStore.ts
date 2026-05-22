import { create } from 'zustand'
import type { ProjectionKey } from '@/types/scatter'

export type TabKey = 'scatter' | 'topology' | 'compare'
// v2: H₁ only. H₀ removed (degenerate in weighted Vietoris-Rips — all births
// collapse to filtration time 0). H₂ deferred to v3 (PROJECT.md Key Decisions
// / PITFALLS.md §2-3). The literal-1 single-value type preserves the store
// interface for v3 forward-compat while making misuse a compile error today.
export type HomologyDim = 1

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
  // Phase 4 slices
  activeTab: TabKey
  selectedHomologyDim: HomologyDim
  vrEpsilon: number
  compareMode: boolean
  compareGenre: string | null
  settingsDrawerOpen: boolean
  pipelineExplanationOpen: boolean
  pipelineExplanationStep: number
  isRecomputing: boolean
  isRetraining: boolean
  dirtyParams: Set<string>
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
  // Phase 4 setters
  setActiveTab: (t: TabKey) => void
  setSelectedHomologyDim: (d: HomologyDim) => void
  setVrEpsilon: (v: number) => void
  setCompareMode: (v: boolean) => void
  setCompareGenre: (g: string | null) => void
  setSettingsDrawerOpen: (v: boolean) => void
  setPipelineExplanationOpen: (v: boolean) => void
  setPipelineExplanationStep: (v: number) => void
  setIsRecomputing: (v: boolean) => void
  setIsRetraining: (v: boolean) => void
  addDirtyParam: (p: string) => void
  removeDirtyParam: (p: string) => void
  clearDirtyParams: () => void
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
  // Phase 4 defaults
  activeTab: 'scatter',
  selectedHomologyDim: 1,
  vrEpsilon: 0,
  compareMode: false,
  compareGenre: null,
  settingsDrawerOpen: false,
  pipelineExplanationOpen: false,
  pipelineExplanationStep: 0,
  isRecomputing: false,
  isRetraining: false,
  dirtyParams: new Set<string>(),
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
  // Phase 4 setters
  setActiveTab: (t) => set({ activeTab: t }),
  setSelectedHomologyDim: (d) => set({ selectedHomologyDim: d }),
  setVrEpsilon: (v) => set({ vrEpsilon: v }),
  setCompareMode: (v) => set({ compareMode: v }),
  setCompareGenre: (g) => set({ compareGenre: g }),
  setSettingsDrawerOpen: (v) => set({ settingsDrawerOpen: v }),
  setPipelineExplanationOpen: (v) => set({ pipelineExplanationOpen: v }),
  setPipelineExplanationStep: (v) => set({ pipelineExplanationStep: v }),
  setIsRecomputing: (v) => set({ isRecomputing: v }),
  setIsRetraining: (v) => set({ isRetraining: v }),
  addDirtyParam: (p) => set((s) => ({ dirtyParams: new Set([...s.dirtyParams, p]) })),
  removeDirtyParam: (p) => set((s) => {
    const next = new Set(s.dirtyParams)
    next.delete(p)
    return { dirtyParams: next }
  }),
  clearDirtyParams: () => set({ dirtyParams: new Set<string>() }),
}))
