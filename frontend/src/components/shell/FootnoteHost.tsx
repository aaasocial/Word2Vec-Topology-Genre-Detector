// Reading Room — footnote system (Phase 12, L-06). Inline accent superscripts
// (<Footnote n={…} />) open a centered modal note. The 6 notes' copy is verbatim
// from the prototype `app.jsx FOOTNOTES` (locked copy). Backdrop click + Esc
// close; block shadow `6px 6px 0 {ink}33` (tokens.md).
//
// Usage: wrap the app subtree in <FootnoteHost> … </FootnoteHost>, then drop
// <Footnote n={1} /> anywhere inside it (e.g. a plate caption). The host renders
// the modal as a fixed overlay over the fluid layout.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

interface FootnoteNote {
  title: string
  body: ReactNode
}

/** Locked copy — verbatim from the prototype FOOTNOTES (do not edit wording). */
export const FOOTNOTES: Record<string, FootnoteNote> = {
  '1': {
    title: 'On the projection.',
    body: (
      <>
        The plate uses UMAP with neighbourhood = 15, min-dist = 0.10. UMAP
        preserves local neighbourhoods well but distorts global distance — two
        regions that look adjacent on the plane may not be adjacent in the
        embedding.
      </>
    ),
  },
  '2': {
    title: 'On the neighbourhood.',
    body: (
      <>
        “Neighbourhood” here means the five works with the smallest cosine
        distance in the embedding, not the five visually closest on the plate.
        The plate is a projection; the distance is real.
      </>
    ),
  },
  '3': {
    title: 'On shared vocabulary.',
    body: (
      <>
        The shared list shows the highest-weighted overlap between two regions’
        vocabularies, where weight is computed as TF-IDF against the rest of the
        corpus. A word appears only if both regions use it more than the corpus
        average.
      </>
    ),
  },
  '4': {
    title: 'The centroid track.',
    body: (
      <>
        Every word in the submitted text is looked up in the embedding. The
        text’s position is the inverse-frequency-weighted mean of those lookups.
        Genres are scored by the cosine distance of the text’s centroid to each
        genre’s centroid.
      </>
    ),
  },
  '5': {
    title: 'The topology track.',
    body: (
      <>
        Persistent homology turns the text’s vocabulary into a point cloud and
        reads the lifetimes of the holes that form as the scale grows. Texts with
        similar “shapes” — long-lived 0- and 1-dimensional features — score as
        similar regardless of their average position.
      </>
    ),
  },
  '6': {
    title: 'On marginal verdicts.',
    body: (
      <>
        A confidence below 0.80 is reported as <em>marginal</em>. ~22% of
        catalogued works receive a marginal reading on their own corpus, which is
        consistent with literary practice: most novels sit close to a border.
      </>
    ),
  },
}

interface FootnoteCtxValue {
  open: string | null
  setOpen: (n: string | null) => void
}

const FootnoteCtx = createContext<FootnoteCtxValue>({
  open: null,
  setOpen: () => {},
})

/** Inline accent superscript. Click opens note `n` in the host modal. */
export function Footnote({ n }: { n: number | string }) {
  const { setOpen } = useContext(FootnoteCtx)
  return (
    <sup
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation()
        setOpen(String(n))
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setOpen(String(n))
        }
      }}
      style={{
        color: 'var(--accent)',
        cursor: 'pointer',
        fontFamily: 'var(--font-serif)',
        fontWeight: 600,
        padding: '0 1px',
      }}
    >
      {n}
    </sup>
  )
}

export function FootnoteHost({
  children,
  notes = FOOTNOTES,
}: {
  children: ReactNode
  notes?: Record<string, FootnoteNote>
}) {
  const [open, setOpen] = useState<string | null>(null)
  const note = open ? notes[open] : null

  // Esc closes the note (the backdrop click also closes).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <FootnoteCtx.Provider value={{ open, setOpen }}>
      {children}
      {note && (
        <div
          onClick={() => setOpen(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(38,33,27,0.32)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
          }}
        >
          <article
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Footnote ${open}`}
            style={{
              maxWidth: 480,
              width: '100%',
              background: 'var(--card)',
              border: '1px solid var(--ink)',
              padding: '24px 28px 22px',
              boxShadow: 'var(--shadow-block)',
              fontFamily: 'var(--font-serif)',
              color: 'var(--ink)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Footnote · {open}
              </div>
              <button
                onClick={() => setOpen(null)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--muted)',
                  letterSpacing: '0.1em',
                }}
              >
                close ×
              </button>
            </div>
            <h4
              style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 18,
                margin: '8px 0 12px',
                lineHeight: 1.25,
              }}
            >
              {note.title}
            </h4>
            <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>{note.body}</div>
          </article>
        </div>
      )}
    </FootnoteCtx.Provider>
  )
}
