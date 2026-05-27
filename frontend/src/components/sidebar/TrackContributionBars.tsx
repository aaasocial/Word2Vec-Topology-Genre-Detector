// frontend/src/components/sidebar/TrackContributionBars.tsx
// Phase 9 DEPTH-05 -- topology vs vocabulary contribution bars (D-44 local zero-ablation).
// Signs: '+' = slab pushed TOWARD predicted genre, '-' = pushed AWAY, '0' = no effect.
// Backend's compute_track_contributions normalises pct to sum to 100; this component
// does NOT recompute -- it renders the backend's truth.
// Phase 10 D-82 sweep: inline-hex lifted to hsl(var(--*)) tokens.
// Direction glyph colors (--good, --destructive, --muted-foreground) preserve
// the semantic +/-/0 signal across themes.
import type { TrackContributions } from '@/types/explain'

interface TrackContributionBarsProps {
  contributions: TrackContributions
}

function directionGlyph(dir: '+' | '-' | '0'): string {
  if (dir === '+') return '↑'
  if (dir === '-') return '↓'
  return '·'
}

function directionColor(dir: '+' | '-' | '0'): string {
  if (dir === '+') return 'hsl(var(--good))'               // supports predicted genre
  if (dir === '-') return 'hsl(var(--destructive))'        // pulled away from predicted genre
  return 'hsl(var(--muted-foreground))'                    // no signed direction
}

export function TrackContributionBars({ contributions }: TrackContributionBarsProps) {
  if (!contributions) return null
  const rows = [
    { label: 'Topology',   data: contributions.topology },
    { label: 'Vocabulary', data: contributions.vocabulary },
  ]
  return (
    <div data-testid="track-contribution-bars" style={{ marginTop: 16 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'hsl(var(--card-foreground))',
          marginBottom: 8,
        }}
      >
        Per-track contribution
      </div>
      {rows.map((row) => (
        <div
          key={row.label}
          data-testid="track-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 6,
            fontSize: 12,
          }}
        >
          <span style={{ color: 'hsl(var(--foreground))', minWidth: 80 }}>{row.label}</span>
          <span
            data-testid="track-direction"
            style={{
              color: directionColor(row.data.direction),
              width: 16,
              textAlign: 'center',
            }}
          >
            {directionGlyph(row.data.direction)}
          </span>
          <div
            data-testid="track-bar"
            style={{
              flex: 1,
              height: 6,
              background: 'hsl(var(--muted))',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              data-testid="track-bar-fill"
              style={{
                width: `${row.data.pct.toFixed(1)}%`,
                height: '100%',
                background: 'hsl(var(--primary))',
              }}
            />
          </div>
          <span
            data-testid="track-pct"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'hsl(var(--foreground))',
              minWidth: 48,
              textAlign: 'right',
            }}
          >
            {row.data.pct.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}
