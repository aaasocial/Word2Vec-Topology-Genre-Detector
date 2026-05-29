// Reading Room — book-layout helpers for the Catalog card (Phase 12, 12-03, §6.3).
//
// The card screen needs a 2D position per book (for the plate detail + leader
// lines), a cosine-distance ordering for "five nearest", and a few editorial
// catalog fields (shelfmark, year, vocab) that the real `useCorpusBooks` payload
// (`CorpusBookFull`) does NOT carry — it exposes gutenberg_id / title / author /
// genre / word_count / color / top_10_tfidf_words only (no positions, no year,
// no vocab, no shelfmark).
//
// Per README §9 + the plan's environment notes: the REAL hooks are the source of
// truth for everything they expose (title, author, genre, word_count, driving
// vocabulary, the corpus membership the nearest-list is computed over). The
// positions and the three missing catalog fields are derived DETERMINISTICALLY
// from the gutenberg_id (a stable per-book seed) so the plate detail + card render
// faithfully against the bundled corpus without inventing a books-as-points
// endpoint the backend doesn't serve. These derived values are decorative
// editorial framing, flagged as Known Stubs in the plan SUMMARY; the live per-book
// embedding coordinates land if/when a book-scoped scatter endpoint is added.

import type { CorpusBookFull } from '@/hooks/useCorpusBooks'

/** A small deterministic hash of a string → 32-bit unsigned int (FNV-1a). */
function hashId(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** A seeded [0,1) pseudo-random from an integer seed (mulberry32 step). */
function seededUnit(seed: number): number {
  let t = (seed + 0x6d2b79f5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** Stable index of a genre slug among the corpus's genres (for cluster centres). */
const GENRE_ANGLE: Record<string, number> = {
  adventure: 0,
  gothic_horror: 1,
  historical: 2,
  literary: 3,
  mystery: 4,
  romance: 5,
  speculative: 6,
  western: 7,
}

/**
 * A book positioned in the unit square [0,1]², clustered by genre. The cluster
 * centre is the genre's slot on a ring; the per-book offset is a stable jitter
 * seeded by the gutenberg_id, so the same book always lands in the same place and
 * same-genre books form a visible neighbourhood (matching the prototype plate).
 */
export interface PositionedBook extends CorpusBookFull {
  /** Plate x in [0,1]. */
  x: number
  /** Plate y in [0,1]. */
  y: number
}

export function positionBook(book: CorpusBookFull): PositionedBook {
  const slot = GENRE_ANGLE[book.genre] ?? hashId(book.genre) % 8
  const angle = (slot / 8) * Math.PI * 2
  // Genre cluster centre on a ring inset from the edges.
  const cx = 0.5 + Math.cos(angle) * 0.3
  const cy = 0.5 + Math.sin(angle) * 0.3
  const seed = hashId(book.gutenberg_id)
  const jx = (seededUnit(seed) - 0.5) * 0.26
  const jy = (seededUnit(seed ^ 0x9e3779b9) - 0.5) * 0.26
  return {
    ...book,
    x: Math.min(0.96, Math.max(0.04, cx + jx)),
    y: Math.min(0.96, Math.max(0.04, cy + jy)),
  }
}

/** Position every book in a flat corpus list (stable ordering preserved). */
export function positionBooks(books: CorpusBookFull[]): PositionedBook[] {
  return books.map(positionBook)
}

/** Euclidean distance between two positioned books on the plate. */
function dist(a: PositionedBook, b: PositionedBook): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

export interface Neighbour {
  book: PositionedBook
  /** Plate distance, reported as the cosine-distance proxy on the card. */
  d: number
}

/**
 * The `n` nearest neighbours of `book` across the whole positioned corpus, by
 * plate distance (smallest first). Mirrors the prototype `nearestNeighbours`. The
 * corpus membership is the REAL `useCorpusBooks` data; only the metric is derived.
 */
export function nearestNeighbours(
  book: PositionedBook,
  corpus: PositionedBook[],
  n = 5,
): Neighbour[] {
  return corpus
    .filter((b) => b.gutenberg_id !== book.gutenberg_id)
    .map((b) => ({ book: b, d: dist(book, b) }))
    .sort((a, c) => a.d - c.d)
    .slice(0, n)
}

/**
 * A deterministic editorial shelfmark (Library-of-Congress-flavoured) for a book.
 * Derived from the genre + a hash of the id — decorative catalog framing, not a
 * real call number (the corpus payload has none). Stable per book.
 */
const LC_CLASS: Record<string, string> = {
  adventure: 'PR',
  gothic_horror: 'PR',
  historical: 'PS',
  literary: 'PR',
  mystery: 'PS',
  romance: 'PR',
  speculative: 'PS',
  western: 'PS',
}

export function shelfmark(book: CorpusBookFull): string {
  const cls = LC_CLASS[book.genre] ?? 'PZ'
  const seed = hashId(book.gutenberg_id)
  const num = 3000 + (seed % 6000)
  const cutter = String.fromCharCode(65 + (seed % 26))
  const year = derivedYear(book)
  return `${cls} ${num} .${cutter}${(seed % 9) + 1} ${year}`
}

/**
 * A derived publication year (the corpus payload has none). Public-domain corpus
 * → a plausible 1719–1929 window, stable per book. Decorative.
 */
export function derivedYear(book: CorpusBookFull): number {
  const seed = hashId(book.gutenberg_id)
  return 1719 + (seed % 211)
}

/**
 * A derived vocabulary (distinct-word) count. Real `word_count` is known; vocab is
 * not served, so we model it as a stable fraction of the word count (Heaps'-law
 * flavoured) seeded by the id. Decorative.
 */
export function derivedVocab(book: CorpusBookFull): number {
  const seed = hashId(book.gutenberg_id) ^ 0x2545f491
  const frac = 0.045 + seededUnit(seed >>> 0) * 0.02 // ~4.5–6.5% of tokens unique
  return Math.round(book.word_count * frac)
}
