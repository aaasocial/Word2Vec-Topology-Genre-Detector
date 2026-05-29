// Reading Room — The Reading / verdict essay (Phase 12, 12-04, §6.7).
//
// The essay result for a submitted text, written from the REAL classify result
// (`uploadStore.result`) + `useExplain` (nearest-five + two-track contributions).
//
// Layout (matching `07-the-reading.png`):
//   breadcrumb (Submit a Text › Reading no. NNNN) + share / print
//   2-col: left the essay (label, 38px title, indented paragraphs w/ footnotes⁴⁵⁶,
//          a "Probability fix" bar chart from the real top-N, a Notes block)
//        · right a catalog card for the text (provisional shelfmark, Verdict +
//          Confidence, UMAP-x/y), a "Where it landed" SVG mini-plate w/ dashed pin,
//          and "Nearest five works".
//
// Voice rule L-13: a confidence < 0.80 is reported as "marginal", NEVER "wrong".
// Two-track framing: the topology / vocabulary contributions come from the REAL
// `useExplain().track_contributions` (mapped, NOT the prototype's hardcoded
// 0.76/0.24 demo numbers). When explain is unavailable (backend down / 410 / 503)
// the panels degrade to a framed note — never blank (§11 / env note).

import { useEffect, useMemo, useState } from 'react'
import { useUploadStore } from '@/stores/uploadStore'
import { useReadingRoomStore } from '@/stores/readingRoomStore'
import { useVisualizationStore } from '@/stores/visualizationStore'
import { useExplain } from '@/hooks/useExplain'
import { useAllCorpusBooks } from '@/hooks/useAllCorpusBooks'
import { genreColor } from '@/constants/genres'
import { Footnote } from '@/components/shell/FootnoteHost'
import { ProbabilityBars } from '@/components/reading/ProbabilityBars'
import { WhereItLanded } from '@/components/reading/WhereItLanded'
import {
  positionBooks,
  nearestNeighbours,
  type PositionedBook,
} from '@/components/card/bookLayout'
import type { TopNPrediction, NearestTrainingBook } from '@/types/explain'

const GENRE_LABELS: Record<string, string> = {
  adventure: 'Adventure',
  gothic_horror: 'Gothic',
  historical: 'Historical',
  literary: 'Literary',
  mystery: 'Mystery',
  romance: 'Romance',
  speculative: 'Speculative',
  western: 'Western',
}

const MARGINAL_THRESHOLD = 0.8

/** A stable +/− UMAP-ish coordinate derived from a seed (Known Stub — the corpus
 *  payload carries no per-text embedding coords; decorative catalog framing). */
function derivedCoord(seed: string, salt: number): string {
  let h = 0x811c9dc5 ^ salt
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  const u = (h >>> 0) / 4294967296
  const v = (u - 0.5) * 0.6 // ~[-0.3, +0.3]
  return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(3)}`
}

export function VerdictEssay() {
  const result = useUploadStore((s) => s.result)
  const jobId = useUploadStore((s) => s.jobId)
  const goTo = useReadingRoomStore((s) => s.goTo)
  const setStudy = useReadingRoomStore((s) => s.setStudy)
  const setSelectedBook = useVisualizationStore((s) => s.setSelectedBook)

  const corpus = useAllCorpusBooks()
  const positioned = useMemo<PositionedBook[]>(
    () => positionBooks(corpus.all),
    [corpus.all],
  )

  const [shared, setShared] = useState(false)
  const [expired, setExpired] = useState(false)
  const [uncalibrated, setUncalibrated] = useState(false)

  const explain = useExplain(jobId, {
    onExpired: () => setExpired(true),
    onUncalibrated: () => setUncalibrated(true),
  })
  const { mutate: fireExplain } = explain

  // Fire the real explain mutation once a job id is available.
  useEffect(() => {
    if (jobId) fireExplain()
  }, [jobId, fireExplain])

  // Derived nearest-five over the positioned corpus (fallback when useExplain is
  // unavailable). Computed before any early return so the hook order is stable.
  const derivedNearest = useMemo(() => {
    if (!result) return []
    const self =
      positioned.find((b) => b.genre === result.genre) ?? positioned[0]
    return self ? nearestNeighbours(self, positioned, 5) : []
  }, [positioned, result])

  // No reading yet → guide the reader back to the desk (framed, never blank).
  if (!result) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
        }}
      >
        <div
          style={{
            border: '1px dashed var(--ink-55)',
            background: 'var(--paper2)',
            padding: '28px 32px',
            maxWidth: 460,
            textAlign: 'center',
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 15,
            color: 'var(--muted)',
            lineHeight: 1.6,
          }}
        >
          No reading has been requested yet.{' '}
          <button
            onClick={() => goTo('upload')}
            style={{
              all: 'unset',
              cursor: 'pointer',
              color: 'var(--accent)',
              textDecoration: 'underline',
            }}
          >
            Submit a text
          </button>{' '}
          to receive one.
        </div>
      </div>
    )
  }

  const genre = result.genre
  const genreHex = genreColor(genre)
  const genreLabel = GENRE_LABELS[genre] ?? genre
  const confidence = result.confidence
  const isMarginal = confidence < MARGINAL_THRESHOLD
  const confidenceWord = isMarginal ? 'marginal' : 'confident'

  // Real top-N (from the SSE `done` payload); synthesise a single row if a
  // pre-Phase-9 SVM omitted it (backward compat — same fallback as Phase 9 UI).
  const topN: TopNPrediction[] =
    result.top_n && result.top_n.length
      ? result.top_n
      : [{ genre, probability: confidence }]

  // The second-likeliest region (for the "shares vocabulary with…" framing + the
  // comparative-study deep link). Real, from top-N.
  const runnerUp = topN.find((p) => p.genre !== genre)
  const runnerUpLabel = runnerUp ? GENRE_LABELS[runnerUp.genre] ?? runnerUp.genre : null

  // Two-track contributions — REAL values from useExplain (NOT hardcoded). The
  // backend returns pct in [0,100] summing to 100; render as 0.NN fractions to
  // match the essay's notes idiom. Falls back to a framed note when unavailable.
  const tracks = explain.data?.track_contributions
  const topologyFrac = tracks ? (tracks.topology.pct / 100).toFixed(2) : null
  const vocabularyFrac = tracks ? (tracks.vocabulary.pct / 100).toFixed(2) : null

  // Nearest five — REAL from useExplain when present (real titles + distances);
  // otherwise derive from the positioned corpus so the panel never blanks.
  const explainNearest: NearestTrainingBook[] = explain.data?.nearest_training_books ?? []

  const seed = jobId ?? 'reading'
  const words = result.total_words
  const today = new Date().toISOString().slice(0, 10)
  const readingNo = (hashSeed(seed) % 9000 + 1000).toString()

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Breadcrumb + actions. */}
      <div
        style={{
          padding: '10px 32px',
          borderBottom: '1px solid var(--ink-33)',
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 13,
          color: 'var(--muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <button
            onClick={() => goTo('upload')}
            style={{ all: 'unset', cursor: 'pointer' }}
          >
            Submit a Text
          </button>
          <span>›</span>
          <span style={{ color: 'var(--ink)', fontStyle: 'normal' }}>
            Reading no. {readingNo}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href)
              setShared(true)
              setTimeout(() => setShared(false), 1600)
            }}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '4px 12px',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 12,
            }}
          >
            {shared ? '✓ link copied' : '↗ share this reading'}
          </button>
          <button
            onClick={() => window.print && window.print()}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '4px 12px',
              border: '1px solid var(--ink-55)',
              color: 'var(--ink)',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 12,
            }}
          >
            ⌥ print
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          minHeight: 0,
        }}
      >
        {/* ── Left: the essay ──────────────────────────────────── */}
        <article
          className="rr-scroll"
          style={{
            padding: '34px 56px 30px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            overflowY: 'auto',
            minHeight: 0,
          }}
        >
          <div className="rr-label">
            Reading no. {readingNo} · submitted {today}
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 500,
              fontSize: 38,
              letterSpacing: '-0.01em',
              lineHeight: 1.08,
              margin: 0,
            }}
          >
            On the placement of{' '}
            <span style={{ fontStyle: 'italic' }}>your manuscript.</span>
          </h1>

          <p style={{ fontSize: 15, lineHeight: 1.75, margin: 0, textIndent: '1.4em' }}>
            The text submitted comprises {words.toLocaleString()} words. We undertook
            two readings of it. The first averaged the position of its words in the
            trained embedding;<Footnote n={4} /> the second examined the shape its
            words trace through that space, by way of persistent homology.
            <Footnote n={5} />
          </p>

          <p style={{ fontSize: 15, lineHeight: 1.75, margin: 0, textIndent: '1.4em' }}>
            On both readings, the manuscript was found to{' '}
            <em>resemble works of </em>
            <span style={{ color: genreHex, fontWeight: 600 }}>{genreLabel}</span>
            {isMarginal ? ', though imperfectly' : ''}. Its nearest catalogued
            neighbours are listed at right. The result rests on a confidence of{' '}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                background: 'var(--card)',
                padding: '0 4px',
                border: '0.5px solid var(--ink-55)',
                fontSize: 13,
              }}
            >
              {confidence.toFixed(2)}
            </span>{' '}
            — {isMarginal ? 'a marginal call' : 'a confident call'}
            {isMarginal && runnerUpLabel ? (
              <>
                , suggesting the text shares vocabulary with adjacent regions,
                particularly <em>{runnerUpLabel}</em>
              </>
            ) : null}
            .<Footnote n={6} />
          </p>

          <p style={{ fontSize: 15, lineHeight: 1.75, margin: 0, textIndent: '1.4em' }}>
            {isMarginal ? (
              <>
                A reader inclined to take the result at face value should consider it a{' '}
                <em>qualified</em> assignment: the manuscript belongs <em>most</em> to{' '}
                {genreLabel}, but sits close enough to a border that another corpus, or
                another projection, might revise the call.
              </>
            ) : (
              <>
                A reader may take the result with some assurance: the manuscript sits
                well inside {genreLabel}, away from the borders that make a verdict
                marginal.
              </>
            )}
            {runnerUpLabel ? (
              <>
                {' '}
                See the{' '}
                <button
                  onClick={() => {
                    setStudy('A', genre)
                    if (runnerUp) setStudy('B', runnerUp.genre)
                    goTo('study')
                  }}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    color: 'var(--accent)',
                    fontStyle: 'italic',
                  }}
                >
                  comparative study of {genreLabel} and {runnerUpLabel}
                </button>
                .
              </>
            ) : null}
          </p>

          {/* Probability fix — from the REAL top-N. */}
          <div style={{ marginTop: 8 }}>
            <div className="rr-label">Probability fix</div>
            <div style={{ marginTop: 10, maxWidth: 480 }}>
              <ProbabilityBars topN={topN} />
            </div>
          </div>

          {/* Notes — two-track contributions from the REAL useExplain. */}
          <div
            style={{
              marginTop: 'auto',
              paddingTop: 16,
              borderTop: '1px solid var(--ink-33)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginBottom: 8,
              }}
            >
              Notes
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--ink)',
                lineHeight: 1.65,
                fontStyle: 'italic',
              }}
            >
              <div style={{ display: 'flex', gap: 8 }}>
                <sup style={{ color: 'var(--accent)', fontStyle: 'normal' }}>4</sup>
                <span>
                  The <em>centroid track</em> — a weighted average of where the text’s
                  words live in word2vec space
                  {vocabularyFrac ? (
                    <>
                      , contribution{' '}
                      <strong style={{ fontStyle: 'normal', fontWeight: 500 }}>
                        {vocabularyFrac}
                      </strong>
                    </>
                  ) : (
                    <> (contribution pending the explanation)</>
                  )}
                  .
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <sup style={{ color: 'var(--accent)', fontStyle: 'normal' }}>5</sup>
                <span>
                  The <em>topology track</em> — features of the persistent diagram of
                  the text’s vocabulary
                  {topologyFrac ? (
                    <>
                      , contribution{' '}
                      <strong style={{ fontStyle: 'normal', fontWeight: 500 }}>
                        {topologyFrac}
                      </strong>
                    </>
                  ) : (
                    <> (contribution pending the explanation)</>
                  )}
                  .
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <sup style={{ color: 'var(--accent)', fontStyle: 'normal' }}>6</sup>
                <span>
                  “Marginal” means the verdict’s confidence falls below 0.80. At the
                  present threshold, a fair share of catalogued works receive a marginal
                  reading.
                </span>
              </div>
            </div>
          </div>
        </article>

        {/* ── Right: catalog card + where it landed + nearest five ── */}
        <aside
          className="rr-scroll"
          style={{
            borderLeft: '1px solid var(--ink-33)',
            padding: '28px 28px 24px',
            background: 'var(--paper2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            overflowY: 'auto',
            minHeight: 0,
          }}
        >
          <div className="rr-label">A catalog card for your text</div>
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--ink)',
              borderTop: '4px double var(--ink)',
              padding: '16px 18px 18px',
              fontFamily: 'var(--font-serif)',
              boxShadow: 'var(--shadow-card)',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                bottom: 6,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'var(--paper2)',
                border: '0.5px solid var(--ink-55)',
              }}
            />
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--muted)',
                letterSpacing: '0.1em',
              }}
            >
              provisional · {readingNo}
            </div>
            <div style={{ marginTop: 8, fontSize: 19, fontWeight: 500 }}>untitled.txt</div>
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                fontStyle: 'italic',
                color: 'var(--muted)',
              }}
            >
              uploaded {today} · {(words / 1000).toFixed(1)}k words
            </div>
            <hr style={{ border: 0, borderTop: '1px solid var(--ink-33)', margin: '10px 0' }} />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '88px 1fr',
                rowGap: 4,
                fontSize: 12.5,
              }}
            >
              <span style={{ color: 'var(--muted)' }}>Verdict</span>
              <span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: genreHex,
                    marginRight: 6,
                  }}
                />
                {genreLabel}
              </span>
              <span style={{ color: 'var(--muted)' }}>Confidence</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                {confidence.toFixed(2)} · {confidenceWord}
              </span>
              <span style={{ color: 'var(--muted)' }}>UMAP-x</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{derivedCoord(seed, 1)}</span>
              <span style={{ color: 'var(--muted)' }}>UMAP-y</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{derivedCoord(seed, 2)}</span>
            </div>
          </div>

          {/* Where it landed — SVG mini-plate w/ dashed pin (D-U1). */}
          <div>
            <div className="rr-label">Where it landed</div>
            <div style={{ marginTop: 8 }}>
              <WhereItLanded corpus={positioned} genre={genre} seed={seed} />
            </div>
          </div>

          {/* Nearest five — real from useExplain when present; framed states never blank. */}
          <div>
            <div className="rr-label">Nearest five works</div>
            {expired ? (
              <FramedNote tone="accent">
                The upload expired — re-upload to see the nearest works.
              </FramedNote>
            ) : uncalibrated ? (
              <FramedNote tone="muted">
                The explanation is unavailable for this model. The verdict and
                probability fix above still stand.
              </FramedNote>
            ) : explain.isPending ? (
              <FramedNote tone="muted">Reading the neighbourhood…</FramedNote>
            ) : explainNearest.length ? (
              <ol
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '10px 0 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {explainNearest.map((n, i) => (
                  <li
                    key={`${n.gutenberg_id}-${i}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '18px 12px 1fr auto',
                      gap: 8,
                      alignItems: 'baseline',
                      fontSize: 12.5,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: 'var(--muted)',
                      }}
                    >
                      {i + 1}.
                    </span>
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: genreColor(n.genre),
                        marginTop: 4,
                      }}
                    />
                    <button
                      onClick={() => {
                        setSelectedBook(n.gutenberg_id)
                        goTo('card')
                      }}
                      style={{
                        all: 'unset',
                        cursor: 'pointer',
                        textDecorationLine: 'underline',
                        textDecorationStyle: 'dotted',
                        textDecorationColor: 'var(--muted)',
                      }}
                    >
                      <em>{n.title}</em>
                      <span style={{ color: 'var(--muted)', fontStyle: 'normal' }}>
                        {' '}
                        · {n.author}
                      </span>
                    </button>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10.5,
                        color: 'var(--muted)',
                      }}
                    >
                      d {n.distance.toFixed(3)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : derivedNearest.length ? (
              <ol
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '10px 0 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {derivedNearest.map((n, i) => (
                  <li
                    key={n.book.gutenberg_id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '18px 12px 1fr auto',
                      gap: 8,
                      alignItems: 'baseline',
                      fontSize: 12.5,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: 'var(--muted)',
                      }}
                    >
                      {i + 1}.
                    </span>
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: genreColor(n.book.genre),
                        marginTop: 4,
                      }}
                    />
                    <button
                      onClick={() => {
                        setSelectedBook(n.book.gutenberg_id)
                        goTo('card')
                      }}
                      style={{
                        all: 'unset',
                        cursor: 'pointer',
                        textDecorationLine: 'underline',
                        textDecorationStyle: 'dotted',
                        textDecorationColor: 'var(--muted)',
                      }}
                    >
                      <em>{n.book.title}</em>
                      <span style={{ color: 'var(--muted)', fontStyle: 'normal' }}>
                        {' '}
                        · {n.book.author}
                      </span>
                    </button>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10.5,
                        color: 'var(--muted)',
                      }}
                    >
                      d {n.d.toFixed(3)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <FramedNote tone="muted">The neighbourhood could not be read.</FramedNote>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

/** A framed inline note (never a blank panel — §11). */
function FramedNote({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'accent' | 'muted'
}) {
  return (
    <div
      style={{
        marginTop: 10,
        border: `1px solid ${tone === 'accent' ? 'var(--accent)' : 'var(--ink-33)'}`,
        background: 'var(--card)',
        padding: '10px 14px',
        fontFamily: 'var(--font-serif)',
        fontStyle: 'italic',
        fontSize: 12.5,
        color: tone === 'accent' ? 'var(--accent)' : 'var(--muted)',
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  )
}

function hashSeed(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}
