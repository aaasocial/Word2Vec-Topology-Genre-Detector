// Reading Room — the plate frame (Phase 12, 12-02, §6.2).
//
// The framed editorial figure that houses the reskinned R3F scatter (D-U1). It
// renders the title row (section label + h2 + projection chips + 2D/3D toggle),
// the 1px-ink-bordered figure with corner rulings ("Plate I" top-left, "{proj} ·
// {dim} · ε 0.42" top-right) wrapping the canvas (passed as children), and the
// "fig. 1 — …" caption with footnote¹ + recompute/export affordances.
//
// Projection chips + the 2D/3D toggle are wired to the existing visualizationStore
// (projection / is2D) — the SAME state the R3F PointCloud animates on, so toggling
// here drives the real WebGL plate (3D = true R3F orbit, not a CSS tilt).

import type { ReactNode } from 'react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { Footnote } from '@/components/shell/FootnoteHost'
import type { ProjectionKey } from '@/types/scatter'

/** Store key → display label for the projection chips. */
const PROJECTIONS: { key: ProjectionKey; label: string }[] = [
  { key: 'pca', label: 'PCA' },
  { key: 'kpca', label: 'KPCA' },
  { key: 'umap', label: 'UMAP' },
  { key: 'tsne', label: 't-SNE' },
]

interface PlateFrameProps {
  /** Section label above the title (e.g. "Plate I · The full collection"). */
  label: string
  /** The plate heading (rich node so a region name can be colored). */
  title: ReactNode
  /** The fig. caption body (the footnote¹ is appended automatically). */
  caption: ReactNode
  /** The canvas / scatter to frame. */
  children: ReactNode
  /** Optional floating overlay (e.g. a hover tooltip) drawn inside the frame. */
  overlay?: ReactNode
}

/** A single mono control chip (projection / dim). Active = ink fill, paper text. */
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        all: 'unset',
        cursor: 'pointer',
        padding: '5px 11px',
        border: '1px solid var(--ink-55)',
        marginLeft: -1,
        background: active ? 'var(--ink)' : 'transparent',
        color: active ? 'var(--paper)' : 'var(--ink)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </button>
  )
}

export function PlateFrame({ label, title, caption, children, overlay }: PlateFrameProps) {
  const projection = useVisualizationStore((s) => s.projection)
  const setProjection = useVisualizationStore((s) => s.setProjection)
  const is2D = useVisualizationStore((s) => s.is2D)
  const setIs2D = useVisualizationStore((s) => s.setIs2D)

  const projLabel = PROJECTIONS.find((p) => p.key === projection)?.label ?? 'UMAP'
  const dimLabel = is2D ? '2D' : '3D'

  return (
    <main
      style={{
        padding: '24px 32px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 0,
      }}
    >
      {/* Title row + controls */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="rr-label">{label}</div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 26,
              fontWeight: 500,
              letterSpacing: '-0.005em',
              margin: '6px 0 0',
            }}
          >
            {title}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex' }}>
            {PROJECTIONS.map((p) => (
              <Chip key={p.key} active={p.key === projection} onClick={() => setProjection(p.key)}>
                {p.label}
              </Chip>
            ))}
          </div>
          <span style={{ width: 1, height: 18, background: 'var(--ink-33)' }} />
          <div style={{ display: 'flex' }}>
            <Chip active={is2D} onClick={() => setIs2D(true)}>
              2D
            </Chip>
            <Chip active={!is2D} onClick={() => setIs2D(false)}>
              3D
            </Chip>
          </div>
        </div>
      </div>

      {/* The framed figure — houses the R3F canvas. `flex:1` fills the spread on
          wide screens; the min-height clamp keeps the plate a usable square when
          the carrel stacks to one column on narrow screens (README §10). */}
      <figure
        data-tour-id="plate"
        style={{
          flex: 1,
          margin: 0,
          border: '1px solid var(--ink)',
          background: 'var(--card)',
          position: 'relative',
          minHeight: 320,
        }}
      >
        <div style={{ position: 'absolute', inset: 0 }}>{children}</div>

        {/* Corner rulings */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 12,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.15em',
            color: 'var(--muted)',
            pointerEvents: 'none',
          }}
        >
          Plate I
        </div>
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 12,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.15em',
            color: 'var(--muted)',
            pointerEvents: 'none',
          }}
        >
          {projLabel} · {dimLabel} · ε 0.42
        </div>

        {/* Drag-to-rotate hint in 3D */}
        {!is2D && (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.14em',
              color: 'var(--muted)',
              pointerEvents: 'none',
            }}
          >
            drag to rotate · scroll to zoom
          </div>
        )}

        {overlay}
      </figure>

      {/* Caption */}
      <figcaption
        style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 12.5,
          color: 'var(--muted)',
          lineHeight: 1.55,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 16,
        }}
      >
        <span>
          {caption}
          <Footnote n={1} />
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
          }}
        >
          ↻ recompute   ↗ export
        </span>
      </figcaption>
    </main>
  )
}
