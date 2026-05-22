import { describe, it, expect, beforeEach } from 'vitest'
import { useVisualizationStore } from './visualizationStore'

beforeEach(() => {
  useVisualizationStore.setState({
    projection: 'pca',
    selectedGenre: null,
    selectedBookId: null,
    selectedPointIndex: null,
    pointSizeMultiplier: 1.0,
    opacity: 1.0,
    tfidfThreshold: 0.0,
    brightnessSensitivity: 1.0,
    is2D: false,
    searchQuery: '',
    cameraResetCounter: 0,
    cameraFocusUploadCounter: 0,
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
  })
})

describe('visualizationStore', () => {
  it('setProjection updates store', () => {
    useVisualizationStore.getState().setProjection('umap')
    expect(useVisualizationStore.getState().projection).toBe('umap')
  })

  it('setProjection can switch between all projection keys', () => {
    const projections = ['pca', 'kpca', 'umap', 'tsne'] as const
    for (const p of projections) {
      useVisualizationStore.getState().setProjection(p)
      expect(useVisualizationStore.getState().projection).toBe(p)
    }
  })

  it('setSelectedGenre updates selectedGenre', () => {
    useVisualizationStore.getState().setSelectedGenre('romance')
    expect(useVisualizationStore.getState().selectedGenre).toBe('romance')
  })

  it('setSelectedGenre to null clears genre', () => {
    useVisualizationStore.getState().setSelectedGenre('horror')
    useVisualizationStore.getState().setSelectedGenre(null)
    expect(useVisualizationStore.getState().selectedGenre).toBeNull()
  })

  it('setSelectedPoint stores index', () => {
    useVisualizationStore.getState().setSelectedPoint(42)
    expect(useVisualizationStore.getState().selectedPointIndex).toBe(42)
  })

  it('setSelectedPoint(null) clears selection', () => {
    useVisualizationStore.getState().setSelectedPoint(5)
    useVisualizationStore.getState().setSelectedPoint(null)
    expect(useVisualizationStore.getState().selectedPointIndex).toBeNull()
  })

  it('setOpacity updates without debounce (instant)', () => {
    useVisualizationStore.getState().setOpacity(0.5)
    // Instant — value is immediately available in the same tick
    expect(useVisualizationStore.getState().opacity).toBe(0.5)
  })

  it('setPointSizeMultiplier updates instantly', () => {
    useVisualizationStore.getState().setPointSizeMultiplier(1.8)
    expect(useVisualizationStore.getState().pointSizeMultiplier).toBe(1.8)
  })

  it('triggerCameraReset increments cameraResetCounter', () => {
    const before = useVisualizationStore.getState().cameraResetCounter
    useVisualizationStore.getState().triggerCameraReset()
    expect(useVisualizationStore.getState().cameraResetCounter).toBe(before + 1)
  })

  it('setIs2D updates is2D flag', () => {
    useVisualizationStore.getState().setIs2D(true)
    expect(useVisualizationStore.getState().is2D).toBe(true)
    useVisualizationStore.getState().setIs2D(false)
    expect(useVisualizationStore.getState().is2D).toBe(false)
  })

  // Phase 4 store slices
  it('Phase 4 slices have correct defaults', () => {
    const s = useVisualizationStore.getState()
    expect(s.activeTab).toBe('scatter')
    // v2 (Plan 06-04): selectedHomologyDim narrowed to literal `1`.
    // Default was `0` in v1; H₀ removed because it is degenerate in
    // weighted Vietoris-Rips.
    expect(s.selectedHomologyDim).toBe(1)
    expect(s.vrEpsilon).toBe(0)
    expect(s.compareMode).toBe(false)
    expect(s.compareGenre).toBeNull()
    expect(s.settingsDrawerOpen).toBe(false)
    expect(s.pipelineExplanationOpen).toBe(false)
    expect(s.pipelineExplanationStep).toBe(0)
    expect(s.isRecomputing).toBe(false)
    expect(s.isRetraining).toBe(false)
    expect(s.dirtyParams).toBeInstanceOf(Set)
    expect(s.dirtyParams.size).toBe(0)
  })

  it('setActiveTab switches tabs', () => {
    useVisualizationStore.getState().setActiveTab('topology')
    expect(useVisualizationStore.getState().activeTab).toBe('topology')
    useVisualizationStore.getState().setActiveTab('compare')
    expect(useVisualizationStore.getState().activeTab).toBe('compare')
  })

  it('setSelectedHomologyDim accepts the literal-1 dimension', () => {
    // v2 (Plan 06-04): HomologyDim narrowed to literal `1`. The setter is
    // type-only — at runtime it still accepts whatever caller passes, but
    // TypeScript will reject `0` / `2` at compile time.
    useVisualizationStore.getState().setSelectedHomologyDim(1)
    expect(useVisualizationStore.getState().selectedHomologyDim).toBe(1)
  })

  it('addDirtyParam accumulates dirty parameters', () => {
    useVisualizationStore.getState().addDirtyParam('sigma')
    useVisualizationStore.getState().addDirtyParam('epsilon_max')
    const dirty = useVisualizationStore.getState().dirtyParams
    expect(dirty.has('sigma')).toBe(true)
    expect(dirty.has('epsilon_max')).toBe(true)
    expect(dirty.size).toBe(2)
  })

  it('clearDirtyParams resets to empty set', () => {
    useVisualizationStore.getState().addDirtyParam('sigma')
    useVisualizationStore.getState().clearDirtyParams()
    expect(useVisualizationStore.getState().dirtyParams.size).toBe(0)
  })

  // H₂-toggle setter test deleted in Plan 06-04 — H₂ removed from v2 store
  // (PROJECT.md Key Decisions; PITFALLS.md §2-3).
})
