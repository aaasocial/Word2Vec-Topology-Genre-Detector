// Reading Room — running footer (Phase 12). Three mono labels: a left running
// note, a center editor's mark, and a right page marker (screenshots 01/08).
// `1px solid ink` rule on top (tokens.md). Per-screen text is passed in so each
// screen can set its own left label + page marker (e.g. Landing "p. 1" / About
// "p. 2").

interface FooterProps {
  left?: string
  center?: string
  right?: string
}

export function Footer({
  left = 'A working library · est. 2026',
  center = 'Edited by the reading room',
  right = '',
}: FooterProps) {
  return (
    <footer
      style={{
        padding: '10px 32px',
        borderTop: '1px solid var(--ink)',
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        flexShrink: 0,
        background: 'var(--paper)',
      }}
    >
      <span>{left}</span>
      <span>{center}</span>
      <span>{right}</span>
    </footer>
  )
}
