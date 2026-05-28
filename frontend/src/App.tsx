import { useEffect, useMemo, useRef } from 'react'
import { ScatterCanvas } from '@/components/canvas/ScatterCanvas'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { GenreLegend } from '@/components/sidebar/GenreLegend'
import { KeyboardHint } from '@/components/sidebar/KeyboardHint'
import { TopNavTabs } from '@/components/nav/TopNavTabs'
import { DisclaimerBanner } from '@/components/nav/DisclaimerBanner'
import { TopologyPanel } from '@/components/topology/TopologyPanel'
import { CompareEmptyState } from '@/components/compare/CompareEmptyState'
import { SettingsDrawer } from '@/components/settings/SettingsDrawer'
import { RecomputeOverlay } from '@/components/settings/RecomputeOverlay'
import { PipelineExplanation } from '@/components/explanation/PipelineExplanation'
import { useScatterData } from '@/hooks/useScatterData'
import { useGenreTfidf, useBookTfidf } from '@/hooks/useTfidfData'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { useUploadStore } from '@/stores/uploadStore'
import { useUIStore } from '@/stores/uiStore'
import {
  usePreferencesStore,
  applyTheme,
  resolveEffectiveTheme,
  subscribeToSystemTheme,
  isIntroStale,
} from '@/stores/preferencesStore'
import { TourProvider, useTour } from '@/tour/TourProvider'
import { buildBuffers, buildUploadedBuffers } from '@/lib/buffers'

/** Height of top nav (48px) + disclaimer banner (28px) + borders (2px) */
const TOP_OFFSET = 78

/**
 * Delay between How It Works closing and the tour starting (Phase 11 D-88).
 * Lets the modal unmount so the tour can measure its anchor rects.
 */
const INTRO_CHAIN_DELAY_MS = 300

/**
 * Phase 11 D-88/D-90 — first-visit onboarding orchestration. Renders INSIDE
 * <TourProvider> so it can call useTour().start(). Runs the once-on-mount
 * auto-intro (How It Works → tour chain) and observes the How-It-Works close.
 *
 * Distinguishes the auto-intro from manual opens via `introSequenceActiveRef`:
 * only set true when THIS component auto-opens How It Works. Manual nav/Help
 * opens leave it false, so closing them does NOT chain into the tour (D-90).
 */
function OnboardingOrchestrator() {
  const tour = useTour()
  const introSeenAt = usePreferencesStore((s) => s.introSeenAt)
  const setIntroSeenAt = usePreferencesStore((s) => s.setIntroSeenAt)
  const pipelineExplanationOpen = useVisualizationStore((s) => s.pipelineExplanationOpen)
  const setPipelineExplanationOpen = useVisualizationStore((s) => s.setPipelineExplanationOpen)

  // True only while the auto-intro's How It Works is open. Closing it then
  // chains into the tour; manual opens never set this, so they don't chain.
  const introSequenceActiveRef = useRef(false)
  // Latch so the mount effect runs exactly once (not on every render).
  const mountFiredRef = useRef(false)
  // Track previous open state to detect the true->false (close) transition.
  const prevOpenRef = useRef(pipelineExplanationOpen)

  // Once-on-mount auto-intro (D-88). Read introSeenAt at fire time so we don't
  // re-run when the store updates. `eslint-disable` deps: intentional run-once.
  useEffect(() => {
    if (mountFiredRef.current) return
    mountFiredRef.current = true
    if (!isIntroStale(introSeenAt)) return
    // 1) auto-open How It Works  2) mark this as the auto-intro sequence
    // 3) consume-on-fire so a mid-sequence reload doesn't reopen it (D-88).
    introSequenceActiveRef.current = true
    setPipelineExplanationOpen(true)
    setIntroSeenAt(Date.now())
    prevOpenRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Observe How It Works closing during the auto-intro -> chain into the tour.
  useEffect(() => {
    const was = prevOpenRef.current
    prevOpenRef.current = pipelineExplanationOpen
    // Only a true->false transition while the auto-intro is active chains.
    if (was && !pipelineExplanationOpen && introSequenceActiveRef.current) {
      introSequenceActiveRef.current = false
      const t = setTimeout(() => tour.start(), INTRO_CHAIN_DELAY_MS)
      return () => clearTimeout(t)
    }
  }, [pipelineExplanationOpen, tour])

  return null
}

export default function App() {
  // --- Theme wiring (POLISH-01 / D-63) ---
  // Apply theme on mount + whenever preferencesStore.theme changes.
  // System mode subscribes to OS prefers-color-scheme so it tracks live.
  const theme = usePreferencesStore((s) => s.theme)
  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    // Re-apply when OS preference flips while user is on System mode.
    return subscribeToSystemTheme(() => applyTheme('system'))
  }, [theme])
  const effectiveTheme = resolveEffectiveTheme(theme)

  const projection = useVisualizationStore((s) => s.projection)
  const selectedGenre = useVisualizationStore((s) => s.selectedGenre)
  const selectedBookId = useVisualizationStore((s) => s.selectedBookId)
  const selectedPointIndex = useVisualizationStore((s) => s.selectedPointIndex)
  const hoveredPointIndex = useVisualizationStore((s) => s.hoveredPointIndex)
  const setSelectedPoint = useVisualizationStore((s) => s.setSelectedPoint)
  const setHoveredPoint = useVisualizationStore((s) => s.setHoveredPoint)

  const activeTab = useVisualizationStore((s) => s.activeTab)
  const compareMode = useVisualizationStore((s) => s.compareMode)
  const compareGenre = useVisualizationStore((s) => s.compareGenre)

  const sidebarOpen = useUIStore(s => s.sidebarOpen)
  const toggleSidebar = useUIStore(s => s.toggleSidebar)

  const { uploadedPoints } = useUploadStore()

  // Search input ref — passed to both WordSearch and useKeyboardShortcuts
  const searchInputRef = useRef<HTMLInputElement>(null)
  const scatterCanvasRef = useRef<HTMLCanvasElement | null>(null)
  useKeyboardShortcuts(searchInputRef)

  const { data, isLoading } = useScatterData(projection)

  // TF-IDF data for genre/book brightness encoding
  const { data: genreTfidf } = useGenreTfidf(selectedGenre)
  const { data: bookTfidf } = useBookTfidf(selectedBookId)
  const activeTfidf = bookTfidf ?? genreTfidf ?? null

  // Compare genre TF-IDF (for dual brightness in compare mode)
  const { data: compareTfidfData } = useGenreTfidf(compareMode ? compareGenre : null)

  const corpusBuffers = useMemo(() => {
    if (!data?.points) return null
    // Phase 10 D-62: buildBuffers picks the genre palette based on effective theme.
    return buildBuffers(data.points, effectiveTheme)
  }, [data, effectiveTheme])

  // Build tfidfWeights Float32Array aligned to corpus points, normalized to [0,1]
  const tfidfWeights = useMemo<Float32Array | null>(() => {
    if (!activeTfidf || !data?.points) return null
    const weights = new Float32Array(data.points.length)
    let maxW = 1
    for (let i = 0; i < data.points.length; i++) {
      weights[i] = activeTfidf[data.points[i].word] ?? 0
      if (weights[i] > maxW) maxW = weights[i]
    }
    for (let i = 0; i < weights.length; i++) weights[i] /= maxW
    return weights
  }, [activeTfidf, data])

  // Build compareTfidfWeights Float32Array for compare genre
  const compareTfidfWeights = useMemo<Float32Array | null>(() => {
    if (!compareTfidfData || !data?.points) return null
    const weights = new Float32Array(data.points.length)
    let maxW = 1
    for (let i = 0; i < data.points.length; i++) {
      weights[i] = compareTfidfData[data.points[i].word] ?? 0
      if (weights[i] > maxW) maxW = weights[i]
    }
    for (let i = 0; i < weights.length; i++) weights[i] /= maxW
    return weights
  }, [compareTfidfData, data])

  const uploadedBuffers = useMemo(() => {
    return buildUploadedBuffers(uploadedPoints, effectiveTheme)
  }, [uploadedPoints, effectiveTheme])

  // Merge corpus + uploaded points into single buffer
  const mergedBuffers = useMemo(() => {
    if (!corpusBuffers) return null
    if (uploadedBuffers.positions.length === 0) return corpusBuffers

    const cn = corpusBuffers.positions.length / 3
    const un = uploadedBuffers.positions.length / 3
    const n = cn + un

    const positions = new Float32Array(n * 3)
    const colors = new Float32Array(n * 3)
    const sizes = new Float32Array(n)
    const opacities = new Float32Array(n)

    positions.set(corpusBuffers.positions)
    positions.set(uploadedBuffers.positions, cn * 3)
    colors.set(corpusBuffers.colors)
    colors.set(uploadedBuffers.colors, cn * 3)
    sizes.set(corpusBuffers.sizes)
    sizes.set(uploadedBuffers.sizes, cn)
    opacities.set(corpusBuffers.opacities)
    opacities.set(uploadedBuffers.opacities, cn)

    return { positions, colors, sizes, opacities }
  }, [corpusBuffers, uploadedBuffers])

  const allPoints = useMemo(() => {
    if (!data?.points) return []
    return [...data.points, ...uploadedPoints]
  }, [data, uploadedPoints])

  return (
    <TourProvider>
      {/* Phase 11 — first-visit How-It-Works→tour onboarding chain (D-88/D-90).
          Inside TourProvider so it can call useTour().start(). */}
      <OnboardingOrchestrator />

      {/* Unsupported screen overlay — pure CSS, no React state */}
      <style>{`
        @media (max-width: 767px) {
          .unsupported { display: flex !important; }
          .app-root { display: none !important; }
        }
      `}</style>

      <div
        className="unsupported"
        style={{
          display: 'none',
          position: 'fixed',
          inset: 0,
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A0A0F',
          color: '#9090A0',
          fontSize: 16,
          textAlign: 'center',
          padding: 24,
          zIndex: 9999,
        }}
      >
        Literary Genre Topology requires a screen wider than 768px.
      </div>

      <div
        className="app-root"
        style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden' }}
      >
        {/* Top navigation + disclaimer */}
        <TopNavTabs />
        <DisclaimerBanner />

        {/* Main content area below top bars */}
        <div style={{ display: 'flex', flex: 1, marginTop: TOP_OFFSET, minHeight: 0 }}>
          {/* Main view area */}
          <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
            {/* Recompute overlay — renders above canvas when recomputing */}
            <RecomputeOverlay />
            {/* Scatter tab */}
            {activeTab === 'scatter' && (
              <>
                {isLoading && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'hsl(var(--muted-foreground))',
                      fontSize: 14,
                      zIndex: 10,
                    }}
                  >
                    Loading scatter data...
                  </div>
                )}
                {mergedBuffers && (
                  <ScatterCanvas
                    positions={mergedBuffers.positions}
                    colors={mergedBuffers.colors}
                    sizes={mergedBuffers.sizes}
                    opacities={mergedBuffers.opacities}
                    points={allPoints}
                    tfidfWeights={tfidfWeights}
                    compareTfidfWeights={compareTfidfWeights}
                    selectedIndex={selectedPointIndex}
                    hoveredIndex={hoveredPointIndex}
                    onHover={setHoveredPoint}
                    onClick={setSelectedPoint}
                    onCanvasReady={(c) => { scatterCanvasRef.current = c }}
                  />
                )}
                <GenreLegend />
                <KeyboardHint />
              </>
            )}

            {/* Topology tab */}
            {activeTab === 'topology' && <TopologyPanel />}

            {/* Compare tab — renders scatter with compareMode active.
                Phase 10 D-78: when either genre is unselected, the empty
                state with ghost panels + pick-genre prompt renders instead. */}
            {activeTab === 'compare' && (!selectedGenre || !compareGenre) && (
              <CompareEmptyState />
            )}
            {activeTab === 'compare' && selectedGenre && compareGenre && (
              <>
                {isLoading && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'hsl(var(--muted-foreground))',
                      fontSize: 14,
                      zIndex: 10,
                    }}
                  >
                    Loading scatter data...
                  </div>
                )}
                {mergedBuffers && (
                  <ScatterCanvas
                    positions={mergedBuffers.positions}
                    colors={mergedBuffers.colors}
                    sizes={mergedBuffers.sizes}
                    opacities={mergedBuffers.opacities}
                    points={allPoints}
                    tfidfWeights={tfidfWeights}
                    compareTfidfWeights={compareTfidfWeights}
                    selectedIndex={selectedPointIndex}
                    hoveredIndex={hoveredPointIndex}
                    onHover={setHoveredPoint}
                    onClick={setSelectedPoint}
                  />
                )}
                <GenreLegend />
              </>
            )}
          </div>

          {/* Sidebar (persistent across all tabs) */}
          <Sidebar
            points={allPoints}
            open={sidebarOpen}
            onToggle={toggleSidebar}
            searchInputRef={searchInputRef}
            scatterCanvasRef={scatterCanvasRef}
          />
        </div>

        {/* Settings drawer (overlays from right) */}
        <SettingsDrawer />

        {/* Pipeline explanation dialog (fullscreen overlay) */}
        <PipelineExplanation />
      </div>
    </TourProvider>
  )
}
