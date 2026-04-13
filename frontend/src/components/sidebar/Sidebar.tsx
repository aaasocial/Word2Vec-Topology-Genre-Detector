import { useRef, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { useUploadStore } from '@/stores/uploadStore'
import { useClassify } from '@/hooks/useClassify'
import { ProjectionTabs } from './ProjectionTabs'
import { GenreSelect } from './GenreSelect'
import { BookSlider } from './BookSlider'
import { ControlSliders } from './ControlSliders'
import { Toggle2D3D } from './Toggle2D3D'
import { ResetCamera } from './ResetCamera'
import { WordSearch } from './WordSearch'
import { DetailPanel } from './DetailPanel'
import { UploadZone } from './UploadZone'
import { UploadProgress } from './UploadProgress'
import { ClassificationResult } from './ClassificationResult'
import { CompareControls } from '@/components/compare/CompareControls'
import { CompareHeatmaps } from '@/components/compare/CompareHeatmaps'
import type { ScatterPoint } from '@/types/scatter'

interface SidebarProps {
  points?: ScatterPoint[]
  open: boolean
  onToggle: () => void
  searchInputRef: React.RefObject<HTMLInputElement>
}

export function Sidebar({ points = [], open, onToggle, searchInputRef }: SidebarProps) {
  const selectedPointIndex = useVisualizationStore(s => s.selectedPointIndex)
  const selectedPoint = selectedPointIndex !== null ? (points[selectedPointIndex] ?? null) : null
  const selectedGenre = useVisualizationStore(s => s.selectedGenre)
  const compareMode = useVisualizationStore(s => s.compareMode)

  // Derive unique books for the selected genre from scatter points
  const books = useMemo(() => {
    if (!selectedGenre) return []
    const seen = new Set<string>()
    const result: { id: string; title: string }[] = []
    for (const p of points) {
      if (p.genre === selectedGenre && p.bookId && !seen.has(p.bookId)) {
        seen.add(p.bookId)
        result.push({ id: p.bookId, title: p.bookTitle ?? p.bookId })
      }
    }
    return result
  }, [points, selectedGenre])

  const { jobId, steps, result, retryMessage } = useUploadStore()
  const { classify } = useClassify()

  const showProgress = jobId !== null && result === null
  const showResult = result !== null

  return (
    <>
      {/* Collapse toggle button */}
      <button
        onClick={onToggle}
        aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
        style={{
          position: 'absolute',
          top: 16,
          right: open ? 336 : 16,
          zIndex: 20,
          background: '#1E1E2A',
          border: '1px solid #2E2E3A',
          borderRadius: 6,
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#9090A0',
          transition: 'right 300ms ease-out',
        }}
      >
        {open ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Sidebar panel */}
      <aside
        aria-label="Visualization controls"
        className="sidebar-scroll"
        style={{
          width: 320,
          flexShrink: 0,
          background: '#111118',
          borderLeft: '1px solid #1E1E2A',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          padding: '32px 32px 24px',
          transform: open ? 'translateX(0)' : 'translateX(320px)',
          transition: 'transform 300ms ease-out',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600, color: '#F5F5FF' }}>
          Literary Genre Topology
        </div>

        <ProjectionTabs />
        <GenreSelect />
        <CompareControls />
        {compareMode && <CompareHeatmaps />}
        <BookSlider books={books} />
        <ControlSliders />

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Toggle2D3D />
          <ResetCamera />
        </div>

        <WordSearch ref={searchInputRef} points={points} />

        {selectedPoint && <DetailPanel point={selectedPoint} />}

        {/* Upload section */}
        <div style={{ borderTop: '1px solid #1E1E2A', paddingTop: 16 }}>
          <div style={{ fontSize: 12, color: '#6B6B80', fontWeight: 600, marginBottom: 12 }}>
            Upload & Classify
          </div>
          {!showProgress && !showResult && <UploadZone onClassify={classify} />}
          {showProgress && <UploadProgress steps={steps} retryMessage={retryMessage} />}
          {showResult && (
            <>
              <UploadZone onClassify={classify} />
              <ClassificationResult result={result} />
            </>
          )}
        </div>
      </aside>
    </>
  )
}
