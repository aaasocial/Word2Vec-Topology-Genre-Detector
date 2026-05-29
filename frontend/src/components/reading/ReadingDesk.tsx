// Reading Room — the reading desk (Submit a Text, Phase 12, 12-04, §6.6).
//
// Left: a "foolscap" framed textarea (paste a passage) with a live word count,
// a "Generate a reading →" action + an "or upload a .txt" file picker, and 3
// sample-passage buttons. Right: an empty-state panel ("The reading appears
// here") + a privacy note — OR, while a classify job runs, the staged pipeline
// progress (tokenize → tf-idf → point cloud → homology → classify).
//
// CRITICAL (env note / §11 "don't invent corpus data"): this runs the REAL
// `useClassify` SSE job, NOT the prototype's ~900ms `setTimeout` simulation.
// Pasted text is wrapped into a `File` (the hook validates `.txt`) before the
// real POST /classify + SSE progress stream. When `uploadStore.result` lands we
// route to `verdict`; an errored step renders a framed error (never blank).

import { useEffect, useRef, useState } from 'react'
import { useClassify } from '@/hooks/useClassify'
import { useUploadStore } from '@/stores/uploadStore'
import { useReadingRoomStore } from '@/stores/readingRoomStore'

/** Three sample passages (prototype copy). Each is padded so the real pipeline
 *  has enough tokens to read (the backend rejects very short texts). */
const SAMPLES: { label: string; preview: string }[] = [
  {
    label: 'A Sherlock-flavoured pastiche',
    preview: 'It was a fog that even the gas-lamps could not pierce…',
  },
  {
    label: 'A windswept moor scene',
    preview: 'The wind crossed the heath without obstacle, finding only…',
  },
  {
    label: 'A drawing-room courtship',
    preview: 'She entered the parlour with the colour still rising…',
  },
]

/** Pad a short sample so the real pipeline has ≥500 words to read (T-3 guard). */
function expandSample(preview: string): string {
  const filler =
    ' The passage continued in this manner, the narrator turning the matter over by ' +
    'candle and by daylight, weighing each circumstance against the last, until the ' +
    'shape of the thing grew plain. There were letters, and a journey, and a silence ' +
    'that lasted three chapters; and at the end of it the reader was no nearer the ' +
    'truth than the characters themselves, which is to say, entirely at the mercy of ' +
    'the prose.'
  // Repeat the filler until comfortably over the word floor.
  return preview + filler.repeat(12)
}

function wordCount(text: string): number {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}

export function ReadingDesk() {
  const [text, setText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { classify, reset } = useClassify()
  const goTo = useReadingRoomStore((s) => s.goTo)

  const steps = useUploadStore((s) => s.steps)
  const result = useUploadStore((s) => s.result)
  const retryMessage = useUploadStore((s) => s.retryMessage)

  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  // A job is "running" once any step is active and no result/error has landed.
  const errored = steps.some((s) => s.status === 'error')
  const running = submitting || steps.some((s) => s.status === 'active')

  // When the real classify result lands, route to the verdict essay.
  useEffect(() => {
    if (result) {
      setSubmitting(false)
      goTo('verdict')
    }
  }, [result, goTo])

  // An errored step ends the "submitting" spinner so the desk stays interactive.
  useEffect(() => {
    if (errored) setSubmitting(false)
  }, [errored])

  const runReading = (raw: string) => {
    const body = raw.trim()
    if (!body) {
      setLocalError('Paste a passage or upload a .txt before requesting a reading.')
      return
    }
    setLocalError(null)
    setSubmitting(true)
    reset()
    // Wrap the pasted text into a .txt File so the real hook can POST it.
    const file = new File([body], 'untitled.txt', { type: 'text/plain' })
    classify(file).catch((err: unknown) => {
      setSubmitting(false)
      setLocalError(
        err instanceof Error ? err.message : 'The reading could not be requested.',
      )
    })
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    setLocalError(null)
    setSubmitting(true)
    reset()
    classify(file).catch((err: unknown) => {
      setSubmitting(false)
      setLocalError(
        err instanceof Error ? err.message : 'The reading could not be requested.',
      )
    })
  }

  const wc = wordCount(text)

  return (
    <main
      className="rr-desk rr-scroll"
      style={{
        flex: 1,
        padding: '36px 64px',
        maxWidth: 1180,
        margin: '0 auto',
        width: '100%',
        minHeight: 0,
        overflowY: 'auto',
      }}
    >
      {/* ── Left: the editor ─────────────────────────────────────── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
        <div className="rr-label">Submit a text · empty desk</div>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 500,
            fontSize: 40,
            letterSpacing: '-0.01em',
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          Place your manuscript on the{' '}
          <span style={{ fontStyle: 'italic' }}>reading desk.</span>
        </h1>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.65,
            margin: 0,
            color: 'var(--ink)',
            maxWidth: 560,
          }}
        >
          Paste a passage, or upload a .txt of a complete work. We will read it into
          the embedding, place it on the plate, and return a short essay locating it
          among its likely neighbours.
        </p>

        {/* Foolscap framed textarea. */}
        <div
          data-tour-id="reading-desk"
          style={{
            position: 'relative',
            border: '1px solid var(--ink)',
            background: 'var(--card)',
            minHeight: 240,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 12,
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.15em',
              color: 'var(--muted)',
            }}
          >
            foolscap · paste below
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="The fog had not lifted, and the lamps still burned…"
            spellCheck={false}
            style={{
              width: '100%',
              minHeight: 240,
              padding: '32px 22px 28px',
              boxSizing: 'border-box',
              background: 'transparent',
              border: 'none',
              resize: 'vertical',
              fontFamily: 'var(--font-serif)',
              fontSize: 14.5,
              lineHeight: 1.7,
              color: 'var(--ink)',
              outline: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 12,
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              letterSpacing: '0.15em',
              color: 'var(--muted)',
            }}
          >
            {wc ? `${wc.toLocaleString()} words` : 'no text yet'}
          </div>
        </div>

        {/* Actions. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button
            onClick={() => runReading(text)}
            disabled={running}
            style={{
              all: 'unset',
              cursor: running ? 'progress' : 'pointer',
              padding: '12px 22px',
              background: 'var(--ink)',
              color: 'var(--paper)',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 15,
              border: '1px solid var(--ink)',
              opacity: running ? 0.7 : 1,
            }}
          >
            {running ? 'reading the text…' : 'Generate a reading →'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={running}
            style={{
              all: 'unset',
              cursor: running ? 'progress' : 'pointer',
              padding: '12px 18px',
              border: '1px solid var(--ink)',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 14,
              opacity: running ? 0.6 : 1,
            }}
          >
            or upload a .txt
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            onChange={onFile}
            style={{ display: 'none' }}
          />
        </div>

        {localError && (
          <div
            style={{
              border: '1px solid var(--accent)',
              background: 'var(--paper2)',
              padding: '10px 14px',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 13,
              color: 'var(--accent)',
              lineHeight: 1.5,
            }}
          >
            {localError}
          </div>
        )}

        {/* Sample passages. */}
        <div style={{ marginTop: 6 }}>
          <div className="rr-label">Try a sample passage</div>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: '8px 0 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {SAMPLES.map((s) => (
              <li key={s.label}>
                <button
                  onClick={() => setText(expandSample(s.preview))}
                  disabled={running}
                  style={{
                    all: 'unset',
                    cursor: running ? 'progress' : 'pointer',
                    display: 'block',
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 14px',
                    background: 'var(--paper2)',
                    border: '0.5px solid var(--ink-22)',
                    opacity: running ? 0.6 : 1,
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 13.5 }}>
                    {s.label}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      marginTop: 4,
                      fontFamily: 'var(--font-serif)',
                      fontStyle: 'italic',
                      fontSize: 12,
                      color: 'var(--muted)',
                    }}
                  >
                    “{s.preview}”
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Right: empty state / staged progress ─────────────────── */}
      <aside
        style={{
          background: 'var(--paper2)',
          border: '1px solid var(--ink-33)',
          padding: '24px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          minHeight: 0,
        }}
      >
        <div className="rr-label">The reading appears here</div>

        <div style={{ flex: 1, position: 'relative', minHeight: 220 }}>
          {running || errored ? (
            <PipelineProgress steps={steps} retryMessage={retryMessage} errored={errored} />
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                border: '1px dashed var(--ink-55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 22,
                textAlign: 'center',
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: 14,
                color: 'var(--muted)',
                lineHeight: 1.6,
              }}
            >
              No reading yet. Submit a passage on the left — you will receive a short
              essay, a catalog card for your text, and the five nearest catalogued works.
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 'auto',
            paddingTop: 14,
            borderTop: '1px solid var(--ink-22)',
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 11.5,
            color: 'var(--muted)',
            lineHeight: 1.55,
          }}
        >
          Your text is read locally. We do not retain it. Readings persist only in this
          browser, under <em>Submit a Text</em>.
        </div>
      </aside>
    </main>
  )
}

/** The staged pipeline list, framed (not blank), driven by the real SSE steps. */
function PipelineProgress({
  steps,
  retryMessage,
  errored,
}: {
  steps: { label: string; status: 'pending' | 'active' | 'complete' | 'error'; errorMessage?: string }[]
  retryMessage: string | null
  errored: boolean
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        border: errored ? '1px solid var(--accent)' : '1px solid var(--ink-33)',
        background: 'var(--card)',
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        overflowY: 'auto',
      }}
      className="rr-scroll"
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}
      >
        {errored ? 'The reading could not be completed' : 'Reading the text…'}
      </div>

      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {steps.map((s, i) => {
          const glyph =
            s.status === 'complete'
              ? '✓'
              : s.status === 'error'
                ? '×'
                : s.status === 'active'
                  ? '·'
                  : '○'
          const color =
            s.status === 'error'
              ? 'var(--accent)'
              : s.status === 'complete'
                ? 'var(--ink)'
                : s.status === 'active'
                  ? 'var(--ink)'
                  : 'var(--muted)'
          return (
            <li
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '18px 1fr',
                gap: 10,
                alignItems: 'baseline',
                fontFamily: 'var(--font-serif)',
                fontSize: 13.5,
                color,
                fontStyle: s.status === 'active' ? 'italic' : 'normal',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color,
                  textAlign: 'center',
                }}
              >
                {glyph}
              </span>
              <span>
                {s.label}
                {s.status === 'error' && s.errorMessage ? (
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--accent)', fontStyle: 'italic' }}>
                    {s.errorMessage}
                  </span>
                ) : null}
              </span>
            </li>
          )
        })}
      </ol>

      {retryMessage && (
        <div
          style={{
            marginTop: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            color: 'var(--accent)',
            letterSpacing: '0.05em',
          }}
        >
          {retryMessage}
        </div>
      )}
    </div>
  )
}
