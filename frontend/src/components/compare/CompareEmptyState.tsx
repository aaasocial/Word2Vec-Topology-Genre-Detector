// Phase 10 D-78 — Compare tab empty state.
//
// Renders in the Compare tab's main view area when fewer than two genres
// are selected. Two ghost panels with dashed borders, tinted with the
// corresponding genre color at 4% alpha. Inline "+ Pick genre" buttons
// give the user an alternative entry path beyond the sidebar dropdowns.
//
// Carries data-tour-id={TOUR_ANCHORS.compareTab} on the outer wrapper so
// the future "Compare" tour step (when re-added) has a stable anchor.

import { Plus } from 'lucide-react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { genreColor as resolveGenreColor, GENRE_LIST } from '@/constants/genres'
import { useEffectiveTheme } from '@/stores/preferencesStore'
import { TOUR_ANCHORS } from '@/tour/anchors'

interface GhostPanelProps {
  label: string
  pickedGenre: string | null
  onPick: (genre: string) => void
  hintGenre: string
  hintColor: string
}

function GhostPanel({ label, pickedGenre, onPick, hintGenre, hintColor }: GhostPanelProps) {
  // Use the picked genre's color if known, otherwise the hint genre's color
  // for the dim dots + 4%-alpha tint.
  const tintColor = pickedGenre ?? hintGenre
  const theme = useEffectiveTheme()
  const dimColor = resolveGenreColor(tintColor, theme)

  return (
    <div
      style={{
        border: '1.5px dashed hsl(var(--border))',
        borderRadius: 14,
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        // 4%-alpha tint of the genre color hints at what the populated panel will feel like
        background: `${hintColor}0A`,
        minHeight: 280,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10.5,
            letterSpacing: '0.1em',
            color: 'hsl(var(--muted-foreground))',
          }}
        >
          {label}
        </span>
        <select
          value={pickedGenre ?? ''}
          onChange={(e) => e.target.value && onPick(e.target.value)}
          aria-label={`Pick genre for ${label}`}
          style={{
            padding: '5px 12px',
            background: 'hsl(var(--card))',
            border: `1px solid ${dimColor}`,
            color: dimColor,
            borderRadius: 6,
            fontSize: 12,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="">+ Pick genre</option>
          {GENRE_LIST.map((g) => (
            <option key={g} value={g}>
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Ghost scatter of ~10 dim dots in the genre's tint */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 140,
        }}
      >
        <svg width={140} height={90} viewBox="0 0 140 90" aria-hidden="true">
          {[
            [22, 18], [40, 14], [56, 28], [72, 18], [88, 32], [104, 22],
            [30, 46], [50, 54], [72, 62], [96, 56], [112, 70],
          ].map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={3}
              fill={dimColor}
              opacity={0.35}
            />
          ))}
        </svg>
      </div>

      <div
        style={{
          textAlign: 'center',
          fontSize: 11.5,
          color: 'hsl(var(--muted-foreground))',
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: '0.05em',
        }}
      >
        Brightness map will appear here
      </div>
    </div>
  )
}

export function CompareEmptyState() {
  const selectedGenre = useVisualizationStore((s) => s.selectedGenre)
  const compareGenre = useVisualizationStore((s) => s.compareGenre)
  const setSelectedGenre = useVisualizationStore((s) => s.setSelectedGenre)
  const setCompareGenre = useVisualizationStore((s) => s.setCompareGenre)
  const theme = useEffectiveTheme()

  // D-78: hint mentions gothic_horror and speculative — teaches the v2 keys
  const gothicColor = resolveGenreColor('gothic_horror', theme)
  const speculativeColor = resolveGenreColor('speculative', theme)

  return (
    <div
      data-tour-id={TOUR_ANCHORS.compareTab}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '50px 40px',
        gap: 24,
        overflow: 'auto',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
        <h2
          style={{
            margin: '0 0 8px',
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '-0.015em',
            color: 'hsl(var(--foreground))',
          }}
        >
          Pick two genres to compare
        </h2>
        <p
          style={{
            margin: 0,
            color: 'hsl(var(--muted-foreground))',
            fontSize: 13.5,
            lineHeight: 1.55,
          }}
        >
          Shared color scale · same projection · synchronised camera.
          {' '}
          Compare reveals where two genres&apos; vocabularies overlap and where they diverge.
        </p>
        {/* Hint: gothic_horror + speculative are natural compare candidates
            (Phase 8 corpus migration introduced the new v2 keys). */}
        <p
          style={{
            margin: '12px 0 0',
            fontSize: 12,
            color: 'hsl(var(--muted-foreground))',
            fontStyle: 'italic',
          }}
        >
          Try{' '}
          <span style={{ color: gothicColor, fontWeight: 500 }}>gothic_horror</span>
          {' '}vs{' '}
          <span style={{ color: speculativeColor, fontWeight: 500 }}>speculative</span>
          {' '}— they share more vocabulary than you&apos;d expect.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
          flex: 1,
          minHeight: 0,
        }}
      >
        <GhostPanel
          label="GENRE A"
          pickedGenre={selectedGenre}
          onPick={setSelectedGenre}
          hintGenre="mystery"
          hintColor={resolveGenreColor('mystery', theme)}
        />
        <GhostPanel
          label="GENRE B"
          pickedGenre={compareGenre}
          onPick={setCompareGenre}
          hintGenre="romance"
          hintColor={resolveGenreColor('romance', theme)}
        />
      </div>
    </div>
  )
}
