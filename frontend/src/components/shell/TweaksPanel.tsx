// Reading Room — Tweaks (Phase 12, §6.11 / L-02/L-03). A small floating panel:
//   Warmth — 4 paper swatches (cream · bone · ivory · newsprint)
//   Mark   — 4 accent swatches (oxblood · libgreen · ink · prussian)
//   Layout — carrel · study (segmented)
// Writes through the readingRoomStore (which persists + calls
// applyReadingRoomTheme live). Hidden unless toggled on via a small toolbar
// control (the "Tweaks" pill bottom-right). Defaults cream / oxblood / carrel.
//
// This is a reading-room-native control set, not the prototype's host-protocol
// tweaks-panel.jsx (that one drives an editor-iframe postMessage bridge that has
// no analogue here). The behaviour — swatches + segmented density, persisted —
// matches the handoff.

import type { CSSProperties } from 'react'
import {
  RR_PALETTES,
  RR_ACCENTS,
  RR_PAPER_IDS,
  RR_ACCENT_IDS,
  RR_DENSITY_IDS,
  type PaperId,
  type AccentId,
  type DensityId,
} from '@/theme/readingRoom'
import { useReadingRoomStore } from '@/stores/readingRoomStore'

const SECTION_LABEL: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9.5,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginBottom: 8,
}

/** Bottom-right pill that toggles the Tweaks panel open/closed. */
export function TweaksToggle() {
  const tweaksOpen = useReadingRoomStore((s) => s.tweaksOpen)
  const toggleTweaks = useReadingRoomStore((s) => s.toggleTweaks)
  if (tweaksOpen) return null
  return (
    <button
      onClick={toggleTweaks}
      title="Adjust paper, accent and layout"
      style={{
        all: 'unset',
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 50,
        cursor: 'pointer',
        padding: '6px 12px',
        background: 'var(--card)',
        border: '1px solid var(--ink)',
        boxShadow: 'var(--shadow-card)',
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--ink)',
      }}
    >
      Tweaks
    </button>
  )
}

function PaperSwatches({
  value,
  onChange,
}: {
  value: PaperId
  onChange: (id: PaperId) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {RR_PAPER_IDS.map((id) => {
        const p = RR_PALETTES[id]
        const on = id === value
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            title={id}
            aria-pressed={on}
            style={{
              all: 'unset',
              cursor: 'pointer',
              flex: 1,
              height: 36,
              background: p.paper,
              border: `1px solid ${p.ink}`,
              boxShadow: on ? `0 0 0 2px ${p.ink}` : 'none',
              position: 'relative',
            }}
          >
            {/* a thin recessed-rail + card stripe so palettes read distinctly */}
            <span
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 10,
                background: p.paper2,
                borderTop: `1px solid ${p.ink}33`,
              }}
            />
          </button>
        )
      })}
    </div>
  )
}

function AccentSwatches({
  value,
  onChange,
}: {
  value: AccentId
  onChange: (id: AccentId) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {RR_ACCENT_IDS.map((id) => {
        const hex = RR_ACCENTS[id]
        const on = id === value
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            title={id}
            aria-pressed={on}
            style={{
              all: 'unset',
              cursor: 'pointer',
              flex: 1,
              height: 28,
              background: hex,
              border: '1px solid var(--ink)',
              boxShadow: on ? '0 0 0 2px var(--ink)' : 'none',
            }}
          />
        )
      })}
    </div>
  )
}

function DensitySegmented({
  value,
  onChange,
}: {
  value: DensityId
  onChange: (id: DensityId) => void
}) {
  return (
    <div
      role="radiogroup"
      style={{
        display: 'flex',
        border: '1px solid var(--ink)',
      }}
    >
      {RR_DENSITY_IDS.map((id, i) => {
        const on = id === value
        return (
          <button
            key={id}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(id)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              flex: 1,
              textAlign: 'center',
              padding: '6px 0',
              fontFamily: 'var(--font-serif)',
              fontStyle: on ? 'normal' : 'italic',
              fontSize: 13,
              color: on ? 'var(--paper)' : 'var(--ink)',
              background: on ? 'var(--ink)' : 'transparent',
              borderLeft: i === 0 ? 'none' : '1px solid var(--ink)',
            }}
          >
            {id}
          </button>
        )
      })}
    </div>
  )
}

export function TweaksPanel() {
  const tweaksOpen = useReadingRoomStore((s) => s.tweaksOpen)
  const setTweaksOpen = useReadingRoomStore((s) => s.setTweaksOpen)
  const tweaks = useReadingRoomStore((s) => s.tweaks)
  const setTweak = useReadingRoomStore((s) => s.setTweak)

  if (!tweaksOpen) return null

  return (
    <aside
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 55,
        width: 260,
        background: 'var(--card)',
        border: '1px solid var(--ink)',
        boxShadow: 'var(--shadow-block)',
        fontFamily: 'var(--font-serif)',
        color: 'var(--ink)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--ink)',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '0.02em' }}>
          Tweaks
        </span>
        <button
          onClick={() => setTweaksOpen(false)}
          aria-label="Close tweaks"
          style={{
            all: 'unset',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.1em',
            color: 'var(--muted)',
          }}
        >
          close ×
        </button>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={SECTION_LABEL}>Warmth</div>
          <PaperSwatches value={tweaks.paper} onChange={(v) => setTweak('paper', v)} />
        </div>
        <div>
          <div style={SECTION_LABEL}>Mark</div>
          <AccentSwatches value={tweaks.accent} onChange={(v) => setTweak('accent', v)} />
        </div>
        <div>
          <div style={SECTION_LABEL}>Layout</div>
          <DensitySegmented value={tweaks.density} onChange={(v) => setTweak('density', v)} />
        </div>
      </div>
    </aside>
  )
}
