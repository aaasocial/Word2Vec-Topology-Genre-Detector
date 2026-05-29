// Reading Room — Collection screen (Phase 12, 12-02, §6.2).
//
// The 3-column carrel: catalog rail (260) · plate (1fr) · marginalia (300),
// collapsing to 2-col (rail · plate) under `study` density. The plate is the
// reskinned existing R3F word scatter (D-U1) wrapped in a reading-room PlateFrame;
// the rail + marginalia are the book index over `useAllCorpusBooks`.
//
// Data: `useScatterData(projection)` → buildBuffers → ScatterCanvas (the word
// geography); `useAllCorpusBooks` (the catalogued books, rail + marginalia). Region
// filter (`selectedGenre`) dims non-matching word points to ~0.15 in PointCloud.
// Plate hover → a floating word tooltip; book hover/click flows through the rail +
// marginalia (hoveredBookId / selectedBookId + route 'card').

import { useMemo } from 'react'
import { useScatterData } from '@/hooks/useScatterData'
import { useAllCorpusBooks } from '@/hooks/useAllCorpusBooks'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { useReadingRoomStore } from '@/stores/readingRoomStore'
import { buildBuffers } from '@/lib/buffers'
import { genreColor } from '@/constants/genres'
import { ScatterCanvas } from '@/components/canvas/ScatterCanvas'
import { PlateFrame } from '@/components/collection/PlateFrame'
import { CatalogRail } from '@/components/collection/CatalogRail'
import { Marginalia } from '@/components/collection/Marginalia'

const GENRE_LABELS: Record<string, string> = {
  adventure: 'Adventure',
  gothic_horror: 'Gothic Horror',
  historical: 'Historical',
  literary: 'Literary',
  mystery: 'Mystery',
  romance: 'Romance',
  speculative: 'Speculative',
  western: 'Western',
}

export function Collection() {
  const projection = useVisualizationStore((s) => s.projection)
  const selectedGenre = useVisualizationStore((s) => s.selectedGenre)
  const selectedPointIndex = useVisualizationStore((s) => s.selectedPointIndex)
  const hoveredPointIndex = useVisualizationStore((s) => s.hoveredPointIndex)
  const setSelectedPoint = useVisualizationStore((s) => s.setSelectedPoint)
  const setHoveredPoint = useVisualizationStore((s) => s.setHoveredPoint)
  const density = useReadingRoomStore((s) => s.tweaks.density)
  const studyMode = density === 'study'

  const { data: scatter } = useScatterData(projection)
  const corpus = useAllCorpusBooks()

  const points = scatter?.points ?? []

  // Build GPU buffers from the word points (colors flow from the L-05 genre hexes).
  const buffers = useMemo(() => buildBuffers(points, 'light'), [points])
  const tfidfWeights = buffers.normalizedWeights.length ? buffers.normalizedWeights : null

  const filteredLabel = selectedGenre ? GENRE_LABELS[selectedGenre] ?? selectedGenre : null

  // The hovered word point → floating tooltip in the plate frame.
  const hoveredPoint = hoveredPointIndex != null ? points[hoveredPointIndex] : undefined

  const tooltip = hoveredPoint ? (
    <div
      style={{
        position: 'absolute',
        left: 16,
        bottom: 36,
        background: 'var(--paper)',
        border: '1px solid var(--ink)',
        padding: '6px 12px',
        pointerEvents: 'none',
        maxWidth: 220,
        boxShadow: 'var(--shadow-card)',
        zIndex: 2,
      }}
    >
      <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink)', lineHeight: 1.2 }}>
        {hoveredPoint.word}
      </div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
        <span
          style={{
            display: 'inline-block',
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: genreColor(hoveredPoint.genre),
            marginRight: 6,
          }}
        />
        {GENRE_LABELS[hoveredPoint.genre] ?? hoveredPoint.genre}
      </div>
    </div>
  ) : null

  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: studyMode ? '260px 1fr' : '260px 1fr 300px',
        minHeight: 0,
      }}
    >
      <CatalogRail corpus={corpus} />

      <PlateFrame
        label={`Plate I · ${filteredLabel ?? 'The full collection'}`}
        title={
          filteredLabel ? (
            <>
              The region of{' '}
              <span style={{ fontStyle: 'italic', color: genreColor(selectedGenre) }}>{filteredLabel}</span>
            </>
          ) : (
            <>The space of the corpus</>
          )
        }
        caption={
          filteredLabel
            ? `fig. 1 — ${filteredLabel} highlighted within the corpus, projected onto the plane.`
            : `fig. 1 — ${corpus.all.length} works across 8 genres, projected onto the plane.`
        }
        overlay={tooltip}
      >
        <ScatterCanvas
          positions={buffers.positions}
          colors={buffers.colors}
          sizes={buffers.sizes}
          opacities={buffers.opacities}
          points={points}
          tfidfWeights={tfidfWeights}
          selectedIndex={selectedPointIndex}
          hoveredIndex={hoveredPointIndex}
          onHover={setHoveredPoint}
          onClick={setSelectedPoint}
        />
      </PlateFrame>

      {!studyMode && <Marginalia corpus={corpus} />}
    </div>
  )
}
