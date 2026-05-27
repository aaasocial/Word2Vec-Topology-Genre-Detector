// Phase 10 D-80 — ClassificationExplain pre-upload empty state.
//
// Renders three ghost rows mirroring the real sub-panels (NearestBooksList,
// TrackContributionBars, DrivingWordsPills). Headline: "Upload a book first."
// (honest, not coy). The D-51 footnote does NOT render here — it only
// appears once there's a verdict to qualify.

import { TOUR_ANCHORS } from '@/tour/anchors'

function GhostRow({ label, lines }: { label: string; lines: number }) {
  // Vary the bar widths so the rows don't look templated
  const widths = ['78%', '64%', '85%', '58%', '72%'].slice(0, lines)
  return (
    <div
      style={{
        background: 'hsl(var(--muted))',
        border: '1.5px dashed hsl(var(--border))',
        borderRadius: 6,
        padding: 12,
      }}
    >
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9.5,
          fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'hsl(var(--muted-foreground))',
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {widths.map((w, i) => (
          <div
            key={i}
            style={{
              height: 8,
              width: w,
              background: 'hsl(var(--secondary))',
              borderRadius: 2,
              opacity: 0.7,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export function ExplainEmptyState() {
  return (
    <div
      data-testid="explain-empty"
      data-tour-id={TOUR_ANCHORS.explainPanel}
      style={{
        marginTop: 14,
        padding: 14,
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'hsl(var(--card-foreground))',
          }}
        >
          Why this genre?
        </span>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            letterSpacing: '0.1em',
            color: 'hsl(var(--muted-foreground))',
          }}
        >
          EMPTY
        </span>
      </div>

      {/* Three ghost rows mirroring the real sub-panels */}
      <GhostRow label="5 nearest training books" lines={5} />
      <GhostRow label="Track contribution" lines={2} />
      <GhostRow label="Driving words" lines={3} />

      {/* Headline copy (D-80): honest, not coy */}
      <div
        style={{
          marginTop: 4,
          fontSize: 13,
          fontWeight: 600,
          color: 'hsl(var(--card-foreground))',
        }}
      >
        Upload a book first.
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: 'hsl(var(--muted-foreground))',
          lineHeight: 1.5,
        }}
      >
        This panel will show the five nearest training books, how topology and
        vocabulary contributed to the verdict, and the words that drove the
        prediction — once there&apos;s a verdict to explain.
      </div>
      {/* D-80: D-51 footnote intentionally OMITTED in empty state. */}
    </div>
  )
}
