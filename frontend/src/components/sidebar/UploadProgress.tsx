import { CheckCircle, XCircle, Loader } from 'lucide-react'
import type { ProgressStep } from '@/stores/uploadStore'

interface UploadProgressProps {
  steps: ProgressStep[]
  retryMessage: string | null
}

export function UploadProgress({ steps, retryMessage }: UploadProgressProps) {
  const completedCount = steps.filter((s) => s.status === 'complete').length
  const progressPct = (completedCount / 6) * 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))' }}>Processing...</div>

      <ol
        role="progressbar"
        aria-valuenow={completedCount}
        aria-valuemax={6}
        style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {steps.map((step, i) => (
          <li key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {step.status === 'complete' && (
                <CheckCircle size={16} color="hsl(var(--good))" />
              )}
              {step.status === 'error' && (
                <XCircle size={16} color="hsl(var(--destructive))" />
              )}
              {step.status === 'active' && (
                <div
                  className="pulse-dot"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'hsl(var(--primary))',
                    flexShrink: 0,
                    marginLeft: 4,
                    marginRight: 4,
                  }}
                />
              )}
              {step.status === 'pending' && (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'hsl(var(--muted))',
                    flexShrink: 0,
                    marginLeft: 4,
                    marginRight: 4,
                  }}
                />
              )}
              <span
                style={{
                  fontSize: 12,
                  color: step.status === 'pending'
                    ? 'hsl(var(--muted-foreground))'
                    : 'hsl(var(--card-foreground))',
                }}
              >
                {step.label}
              </span>
            </div>
            {step.status === 'error' && step.errorMessage && (
              <div style={{ fontSize: 12, color: 'hsl(var(--destructive))', paddingLeft: 24 }}>
                {step.errorMessage}
              </div>
            )}
          </li>
        ))}
      </ol>

      {/* Progress bar */}
      <div
        style={{
          height: 4,
          background: 'hsl(var(--muted))',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPct}%`,
            background: 'hsl(var(--primary))',
            borderRadius: 2,
            transition: 'width 300ms ease-in-out',
          }}
        />
      </div>

      {retryMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'hsl(var(--destructive))' }}>
          <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
          {retryMessage}
        </div>
      )}
    </div>
  )
}
