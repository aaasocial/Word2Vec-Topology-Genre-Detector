import { useRef, useState, useCallback } from 'react'
import { Upload } from 'lucide-react'

interface UploadZoneProps {
  onClassify: (file: File) => Promise<void>
}

export function UploadZone({ onClassify }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const borderColor = error ? '#EF4444' : isDragOver ? '#6366F1' : '#2A2A3A'
  const borderStyle = isDragOver ? 'solid' : 'dashed'
  const bg = isDragOver ? 'rgba(99,102,241,0.08)' : 'transparent'
  const iconColor = isDragOver ? '#818CF8' : '#6B6B80'
  const textColor = isDragOver ? '#818CF8' : '#6B6B80'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        role="button"
        aria-label="Upload text file for genre classification"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px ${borderStyle} ${borderColor}`,
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
        <span style={{ fontSize: 14, color: textColor }}>Drop .txt file here</span>
        <span style={{ fontSize: 12, color: textColor }}>or click to browse</span>
      </div>
      {error && (
        <div style={{ fontSize: 12, color: '#EF4444', padding: '4px 0' }}>
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
