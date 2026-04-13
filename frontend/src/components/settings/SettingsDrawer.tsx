import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { SlowTierParams } from './SlowTierParams'
import { VerySlowTierParams } from './VerySlowTierParams'

export function SettingsDrawer() {
  const open = useVisualizationStore((s) => s.settingsDrawerOpen)
  const setOpen = useVisualizationStore((s) => s.setSettingsDrawerOpen)

  const handleClose = useCallback(() => setOpen(false), [setOpen])

  // Esc key closes drawer
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, handleClose])

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          onClick={handleClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 39,
          }}
        />
      )}

      {/* Drawer */}
      <aside
        aria-label="Settings drawer"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 400,
          background: '#111118',
          borderLeft: '1px solid #1E1E2A',
          zIndex: 40,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(400px)',
          transition: 'transform 300ms ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid #1E1E2A',
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F5FF', margin: 0 }}>
            Settings
          </h2>
          <button
            onClick={handleClose}
            aria-label="Close settings"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#6B6B80',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 4,
              padding: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <SlowTierParams />
          <div style={{ height: 1, background: '#1E1E2A' }} />
          <VerySlowTierParams />
        </div>
      </aside>
    </>
  )
}
