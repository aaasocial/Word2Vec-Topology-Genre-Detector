// Phase 10 D-67 / D-68 — Header help dropdown with theme segmented control.
//
// Wraps the "?" button + popover. Click outside or Esc closes. Renders:
//   1. Replay tour (4 steps · ~90 seconds) — calls useTour().start()
//   2. How It Works (7-step math walkthrough) — opens existing pipeline dialog
//   3. Keyboard shortcuts (R · Esc · 1–4) — informational, no overlay yet
//   4. Divider
//   5. THEME label + 3-state segmented control [Light | System | Dark]
//      wrapped in data-tour-id="theme-toggle" anchor
//   6. Divider
//   7. View on GitHub external link

import { useEffect, useRef, useState } from 'react'
import { Sun, Moon, RotateCcw, BookOpen, Keyboard, ExternalLink } from 'lucide-react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { usePreferencesStore, type Theme } from '@/stores/preferencesStore'
import { useTour } from '@/tour/TourProvider'
import { TOUR_ANCHORS } from '@/tour/anchors'

const GITHUB_URL =
  'https://github.com/aaasocial/Word2Vec-Topology-Genre-Detector'

interface ThemeOption {
  key: Theme
  label: string
  icon: typeof Sun
}

const THEME_OPTIONS: ThemeOption[] = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'system', label: 'System', icon: RotateCcw },
  { key: 'dark', label: 'Dark', icon: Moon },
]

export function HelpDropdown() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const setPipelineExplanationOpen = useVisualizationStore((s) => s.setPipelineExplanationOpen)

  const theme = usePreferencesStore((s) => s.theme)
  const setTheme = usePreferencesStore((s) => s.setTheme)
  const tour = useTour()

  // Close on outside click + Esc
  useEffect(() => {
    if (!open) return
    function onPointer(e: PointerEvent) {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Help and preferences"
        aria-expanded={open}
        data-tour-id={TOUR_ANCHORS.helpMenu}
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 600,
          background: 'transparent',
          border: open ? '1.5px solid hsl(var(--primary))' : '1.5px solid transparent',
          color: open ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
          boxShadow: open ? '0 0 0 3px hsl(var(--primary) / 0.15)' : 'none',
          cursor: 'pointer',
          padding: '2px 8px',
          borderRadius: 5,
          fontSize: 13,
          height: 26,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
        }}
      >
        ?
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Help menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 12px)',
            right: 0,
            width: 280,
            background: 'hsl(var(--popover))',
            color: 'hsl(var(--popover-foreground))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 10,
            boxShadow: '0 14px 40px rgba(0,0,0,0.18)',
            padding: 8,
            fontSize: 13,
            zIndex: 50,
            animation: 'help-dd-in 160ms ease',
          }}
        >
          {/* Replay tour */}
          <HelpItem
            icon={<RotateCcw size={14} />}
            main="Replay tour"
            sub="4 steps · ~90 seconds"
            onClick={() => {
              setOpen(false)
              tour.start()
            }}
          />

          {/* How It Works */}
          <HelpItem
            icon={<BookOpen size={14} />}
            main="How It Works"
            sub="7-step math walkthrough"
            onClick={() => {
              setOpen(false)
              setPipelineExplanationOpen(true)
            }}
          />

          {/* Keyboard shortcuts */}
          <HelpItem
            icon={<Keyboard size={14} />}
            main="Keyboard shortcuts"
            sub="R · Esc · 1–4"
            onClick={() => setOpen(false)}
          />

          <Divider />

          {/* Theme segmented control */}
          <div style={{ padding: '8px 11px 4px' }} data-tour-id={TOUR_ANCHORS.themeToggle}>
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'hsl(var(--muted-foreground))',
                marginBottom: 6,
              }}
            >
              Theme
            </div>
            <div
              role="radiogroup"
              aria-label="Theme preference"
              style={{
                display: 'flex',
                background: 'hsl(var(--muted))',
                borderRadius: 6,
                padding: 2,
                fontSize: 11.5,
              }}
            >
              {THEME_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const active = theme === opt.key
                return (
                  <button
                    key={opt.key}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTheme(opt.key)}
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      background: active ? 'hsl(var(--card))' : 'transparent',
                      color: active ? 'hsl(var(--card-foreground))' : 'hsl(var(--muted-foreground))',
                      border: 'none',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      fontWeight: active ? 500 : 400,
                      boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      cursor: 'pointer',
                      transition: 'background 140ms ease, color 140ms ease',
                    }}
                  >
                    <Icon size={12} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <Divider />

          {/* GitHub link */}
          <HelpItem
            icon={<ExternalLink size={14} />}
            main="View on GitHub"
            sub={null}
            onClick={() => {
              window.open(GITHUB_URL, '_blank', 'noopener,noreferrer')
              setOpen(false)
            }}
            trailing="↗"
          />
        </div>
      )}

      <style>{`
        @keyframes help-dd-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

interface HelpItemProps {
  icon: React.ReactNode
  main: string
  sub: string | null
  onClick: () => void
  trailing?: string
}

function HelpItem({ icon, main, sub, onClick, trailing }: HelpItemProps) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '9px 11px',
        borderRadius: 6,
        color: 'hsl(var(--card-foreground))',
        background: 'transparent',
        border: 'none',
        width: '100%',
        textAlign: 'left',
        fontSize: 13,
        cursor: 'pointer',
        transition: 'background 140ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'hsl(var(--primary) / 0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <span
        style={{
          width: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'hsl(var(--muted-foreground))',
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1 }}>
        <div style={{ fontWeight: 500 }}>{main}</div>
        {sub && (
          <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 1 }}>
            {sub}
          </div>
        )}
      </span>
      {trailing && (
        <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 11 }}>{trailing}</span>
      )}
    </button>
  )
}

function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: 'hsl(var(--border))',
        margin: '6px 8px',
      }}
    />
  )
}
