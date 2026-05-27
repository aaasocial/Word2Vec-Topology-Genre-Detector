import { useRef, useState, useCallback } from 'react'
import { Upload } from 'lucide-react'
import { TOUR_ANCHORS } from '@/tour/anchors'
import { useEffectiveTheme } from '@/stores/preferencesStore'
import { UPLOADED_BOOK_COLOR } from '@/constants/genres'

interface UploadZoneProps {
  onClassify: (file: File) => Promise<void>
}

/**
 * Ghost-scatter helper (D-77): tiny SVG showing ~7 dim genre dots + one
 * dashed-circle ghost marker in UPLOADED_BOOK_COLOR[theme]. Teaches the user
 * "your uploaded book becomes a marker in the same cloud" before they upload.
 */
function GhostScatterHelper({ markerColor }: { markerColor: string }) {
  return (
    <svg
      width={70}
      height={44}
      viewBox="0 0 70 44"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {/* 7 dim genre dots (muted-foreground) scattered across the canvas */}
      <circle cx={8} cy={14} r={2} fill="currentColor" opacity={0.35} />
      <circle cx={16} cy={28} r={2} fill="currentColor" opacity={0.35} />
      <circle cx={24} cy={12} r={2} fill="currentColor" opacity={0.35} />
      <circle cx={28} cy={34} r={2} fill="currentColor" opacity={0.35} />
      <circle cx={40} cy={22} r={2} fill="currentColor" opacity={0.35} />
      <circle cx={52} cy={32} r={2} fill="currentColor" opacity={0.35} />
      <circle cx={62} cy={18} r={2} fill="currentColor" opacity={0.35} />
      {/* Ghost marker — dashed outline circle showing where the upload will land */}
      <circle
        cx={36}
        cy={20}
        r={5}
        fill="none"
        stroke={markerColor}
        strokeWidth={1.5}
        strokeDasharray="2 2"
      />
      <circle cx={36} cy={20} r={1.5} fill={markerColor} />
    </svg>
  )
}

export function UploadZone({ onClassify }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const theme = useEffectiveTheme()

  const showError = useCallback((msg: string) => {
    setError(msg)
    setTimeout(() => setError(null), 3000)
  }, [])

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return
      onClassify(file).catch((err: Error) => showError(err.message))
    },
    [onClassify, showError],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      handleFile(e.dataTransfer.files[0])
    },
    [handleFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        inputRef.current?.click()
      }
    },
    [],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFile(e.target.files?.[0])
      // Reset input so same file can be re-selected
      e.target.value = ''
    },
    [handleFile],
  )

  // D-77: drop zone visual — solid --primary on drag, --primary tint background,
  // text/icon recolor to --primary.
  const borderColor = error
    ? 'hsl(var(--destructive))'
    : isDragOver ? 'hsl(var(--primary))' : 'hsl(var(--border))'
  const borderStyle = isDragOver ? 'solid' : 'dashed'
  const bg = isDragOver ? 'hsl(var(--primary) / 0.08)' : 'transparent'
  const iconColor = isDragOver ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
  const textColor = isDragOver ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        role="button"
        aria-label="Upload text file for genre classification"
        data-tour-id={TOUR_ANCHORS.uploadZone}
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          borderWidth: '2px',
          borderStyle,
          borderColor,
          borderRadius: 8,
          height: 120,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          cursor: 'pointer',
          background: bg,
          transition: 'border-color 150ms, background 150ms',
          outline: 'none',
        }}
      >
        <Upload size={24} color={iconColor} />
        <span style={{ fontSize: 14, color: textColor, fontWeight: 500 }}>
          Drop a book to classify
        </span>
        {/* D-77: constraints shown BEFORE upload — reduces downstream errors */}
        <span style={{ fontSize: 11.5, color: textColor }}>
          .txt · ≤5MB · ≥500 words
        </span>
      </div>

      {/* D-77 ghost-scatter helper: only renders when not actively uploading + no error */}
      {!error && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            padding: '10px 12px',
            background: 'hsl(var(--muted))',
            borderRadius: 6,
            fontSize: 11.5,
            color: 'hsl(var(--muted-foreground))',
            lineHeight: 1.45,
          }}
        >
          <GhostScatterHelper markerColor={UPLOADED_BOOK_COLOR[theme]} />
          <div>
            Your book will appear in the cloud — the marker shows where it&apos;ll land.
            <div style={{ marginTop: 2, fontSize: 10.5, opacity: 0.85 }}>
              Usually under 12 seconds.
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ fontSize: 12, color: 'hsl(var(--destructive))', padding: '4px 0' }}>
          {error}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".txt"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </div>
  )
}
