// Reading Room — Topology screen (Phase 12, 12-05, §6.4 / L-11).
//
// One region's H₁ shape, three linked windows onto it:
//   i   · the Vietoris–Rips filtration viewer (the R3F hero) + ε slider
//   ii  · the persistence diagram (birth × death)
//   iii · the persistence image (the 20×20 → 400-vector the classifier reads)
//
// The ε slider links all three: edges appear at ε ≥ birth (fresh edges flash the
// accent); the diagram sweep + alive shading track ε; the image gets an ε
// birth-axis guide. The topology is computed in the FULL embedding — the 3D plate
// is a lossy projection, so the projection chips reshuffle only the hero (i),
// never the diagram (ii) or image (iii). H₁ only.
//
// Reuses the existing data hooks (useVRData / usePersistenceDiagram /
// usePersistenceImage) + the reskinned topology components, restyled to the
// reading-room idiom (accent ε signal, genre-hex heatmap ramp).

import { useMemo } from 'react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { useReadingRoomStore } from '@/stores/readingRoomStore'
import { useVRData } from '@/hooks/useVRData'
import { usePersistenceDiagram } from '@/hooks/usePersistenceDiagram'
import { getVisibleEdgeCount } from '@/lib/vrFiltering'
import { genreColor, GENRE_LIST, type Genre } from '@/constants/genres'
import { VRViewer } from '@/components/topology/VRViewer'
import { EpsilonSlider } from '@/components/topology/EpsilonSlider'
import { PersistenceDiagram } from '@/components/topology/PersistenceDiagram'
import { PersistenceHeatmap } from '@/components/topology/PersistenceHeatmap'
import { Footnote } from '@/components/shell/FootnoteHost'
import type { ProjectionKey } from '@/types/scatter'

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

const PROJECTIONS: { key: ProjectionKey; label: string }[] = [
  { key: 'pca', label: 'PCA' },
  { key: 'kpca', label: 'KPCA' },
  { key: 'umap', label: 'UMAP' },
  { key: 'tsne', label: 't-SNE' },
]

/** A small mono section label (i · … / ii · … / iii · …). */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="rr-label">{children}</div>
}

export function Topology() {
  const selectedGenre = useVisualizationStore((s) => s.selectedGenre)
  const setSelectedGenre = useVisualizationStore((s) => s.setSelectedGenre)
  const projection = useVisualizationStore((s) => s.projection)
  const setProjection = useVisualizationStore((s) => s.setProjection)
  const vrEpsilon = useVisualizationStore((s) => s.vrEpsilon)
  const density = useReadingRoomStore((s) => s.tweaks.density)
  const studyMode = density === 'study'

  const { data: vrData } = useVRData(selectedGenre, projection)
  const { data: diagram } = usePersistenceDiagram(selectedGenre, 1, false)

  const label = selectedGenre ? GENRE_LABELS[selectedGenre] ?? selectedGenre : null
  const genreHex = selectedGenre ? genreColor(selectedGenre) : 'var(--muted)'

  // ε links the readout: visible edges (VR) + loops alive at ε (diagram).
  const visibleEdges = vrData ? getVisibleEdgeCount(vrData.edges, vrEpsilon) : 0
  const aliveLoops = useMemo(() => {
    if (!diagram) return 0
    return diagram.points.filter(
      ([birth, death]) =>
        Number.isFinite(birth) &&
        vrEpsilon >= birth &&
        (!Number.isFinite(death) || vrEpsilon <= death),
    ).length
  }, [diagram, vrEpsilon])

  const hasRegion = !!selectedGenre

  return (
    <main
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '18px 32px 12px',
        gap: 12,
        minHeight: 0,
        overflow: 'auto',
      }}
      className="rr-scroll"
    >
      {/* ── Header: title + Region chips + projection chips ─────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <SectionLabel>Plate II · the shape of a region</SectionLabel>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 500,
              fontSize: 26,
              letterSpacing: '-0.005em',
              margin: '6px 0 0',
            }}
          >
            {label ? (
              <>
                The topology of <span style={{ fontStyle: 'italic', color: genreHex }}>{label}</span>
              </>
            ) : (
              <>The topology of a region</>
            )}
          </h2>
        </div>

        {/* Region chips */}
        <div>
          <SectionLabel>Region</SectionLabel>
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 380, justifyContent: 'flex-end' }}>
            {(GENRE_LIST as Genre[]).map((g) => {
              const active = g === selectedGenre
              const hex = genreColor(g)
              return (
                <button
                  key={g}
                  onClick={() => setSelectedGenre(active ? null : g)}
                  aria-pressed={active}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 8px',
                    border: `1px solid ${active ? hex : 'var(--ink-33)'}`,
                    background: active ? hex : 'transparent',
                    color: active ? '#fff' : 'var(--muted)',
                    fontFamily: 'var(--font-serif)',
                    fontSize: 11.5,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: active ? '#fff' : hex,
                    }}
                  />
                  {GENRE_LABELS[g] ?? g}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {hasRegion ? (
        <div className={`rr-topo${studyMode ? ' rr-dense' : ''}`}>
          {/* ── i · Vietoris–Rips filtration — the hero ──────────── */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <SectionLabel>i · Vietoris–Rips filtration</SectionLabel>
              {/* Projection chips — change only the 3D viewer. */}
              <div style={{ display: 'flex' }}>
                {PROJECTIONS.map((p) => {
                  const active = p.key === projection
                  return (
                    <button
                      key={p.key}
                      onClick={() => setProjection(p.key)}
                      aria-pressed={active}
                      style={{
                        all: 'unset',
                        cursor: 'pointer',
                        padding: '3px 9px',
                        marginLeft: -1,
                        border: '1px solid var(--ink-55)',
                        background: active ? 'var(--ink)' : 'transparent',
                        color: active ? 'var(--paper)' : 'var(--ink)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* The framed R3F filtration viewer (tour anchor). */}
            <figure
              data-tour-id="topology-plate"
              style={{
                flex: 1,
                margin: 0,
                border: '1px solid var(--ink)',
                background: 'var(--card)',
                position: 'relative',
                minHeight: 280,
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', inset: 0 }}>
                <VRViewer />
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 12,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.14em',
                  color: 'var(--muted)',
                  pointerEvents: 'none',
                }}
              >
                {PROJECTIONS.find((p) => p.key === projection)?.label ?? 'UMAP'} · drag to rotate
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 12,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  color: 'var(--muted)',
                  pointerEvents: 'none',
                }}
              >
                {visibleEdges.toLocaleString()} edges · {aliveLoops} loop{aliveLoops === 1 ? '' : 's'} alive
              </div>
            </figure>

            {/* ε slider */}
            <EpsilonSlider vrData={vrData} />

            {/* caption */}
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: 11.5,
                color: 'var(--muted)',
                lineHeight: 1.55,
              }}
            >
              At ε = 0 the cloud is dust; as the radius grows, points connect, loops are born and later
              fill in. The loops that survive a wide span of ε are the region's real structure.
            </div>
          </section>

          {/* ── ii + iii · linked side panels ───────────────────── */}
          {/* Dropped under `study` density (React tree) and hidden by CSS at
              ≤1100px (`.rr-side`); the VR hero owns the full width below that. */}
          {!studyMode && (
            <section className="rr-side" style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <SectionLabel>
                  ii · Persistence diagram{' '}
                  <span style={{ textTransform: 'none', letterSpacing: 0, fontStyle: 'italic' }}>(H₁)</span>
                </SectionLabel>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ border: '1px solid var(--ink)', background: 'var(--card)', padding: 4 }}>
                    <PersistenceDiagram />
                  </div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 11.5, lineHeight: 1.55, color: 'var(--muted)', flex: 1 }}>
                    Each dot is one loop — its <em>birth</em> and <em>death</em> radius. Dots far above the
                    diagonal are long-lived and real; dots hugging it are noise. The{' '}
                    <span style={{ color: 'var(--accent)' }}>shaded corner</span> holds the loops alive at the
                    current ε; the ▲ marks a feature that never closes.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <SectionLabel>
                  iii · Persistence image{' '}
                  <span style={{ textTransform: 'none', letterSpacing: 0, fontStyle: 'italic' }}>
                    (20 × 20 → 400-vector)
                  </span>
                </SectionLabel>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ border: '1px solid var(--ink)', background: 'var(--card)', padding: 4 }}>
                    <PersistenceHeatmap />
                  </div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 11.5, lineHeight: 1.55, color: 'var(--muted)', flex: 1 }}>
                    The diagram, smoothed onto a fixed grid — <em>this</em> is the number the classifier
                    reads. Bright cells are where {label} reliably grows long-lived loops.
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      ) : (
        // ── empty state ──────────────────────────────────────────
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
            minHeight: 0,
          }}
        >
          <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden>
            {Array.from({ length: 12 }).map((_, i) => {
              const t = (i / 12) * Math.PI * 2
              return (
                <circle
                  key={i}
                  cx={60 + Math.cos(t) * 36}
                  cy={60 + Math.sin(t) * 36}
                  r="3.2"
                  fill="var(--ink)"
                  opacity="0.3"
                />
              )
            })}
            <circle cx="60" cy="60" r="40" fill="none" stroke="var(--ink)" strokeOpacity="0.18" strokeDasharray="2 4" />
          </svg>
          <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 19, color: 'var(--muted)' }}>
            Pick a region to see its topology.
          </div>
        </div>
      )}

      {/* ── N-D disclaimer footer ─────────────────────────────────── */}
      <div
        style={{
          borderTop: '1px solid var(--ink-22)',
          paddingTop: 8,
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 11.5,
          color: 'var(--muted)',
        }}
      >
        Only H₁ — loops — is shown here. The persistence is computed in the full embedding; the 3D plate is
        a lossy projection, so changing it never changes the diagram or the image.
        <Footnote n={5} />
      </div>
    </main>
  )
}
