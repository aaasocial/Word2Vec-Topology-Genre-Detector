// Reading Room — curated study word tables (Phase 12, 12-03, §6.5).
//
// Hand-authored shared/distinctive vocabulary + Editor's note for a few region
// pairs, verbatim from the prototype `screens_study.jsx wordTables`. The prototype
// keys use bare genre ids; here we key by the app's `Genre` slugs (so `gothic` →
// `gothic_horror`). Looked up order-insensitively (A|B or B|A, mirroring onlyA/onlyB),
// with a generic fallback for un-studied pairs.
//
// README §9: real per-pair shared/distinctive vocabulary would be TF-IDF-computed;
// the handoff ships these as narrative copy ("In a real product these'd be computed;
// here we hand-author for narrative."). They are layout/copy, kept verbatim.

import type { ReactNode } from 'react'

export interface StudyWordTable {
  onlyA: string[]
  shared: string[]
  onlyB: string[]
  essay: ReactNode
}

/** Keyed by `${a}|${b}` using the app's Genre slugs (alphabetised at definition). */
const TABLES: Record<string, StudyWordTable> = {
  'mystery|romance': {
    onlyA: ['inspector', 'clue', 'alibi', 'footstep', 'suspect', 'witness', 'testimony', 'vault', 'cipher'],
    shared: ['letter', 'silence', 'hand', 'room', 'glance', 'window', 'answer', 'wait', 'strange', 'heart'],
    onlyB: ['lover', 'beloved', 'rose', 'kiss', 'promise', 'dance', 'vow', 'rapture', 'blush'],
    essay: (
      <>
        The two regions share more than reviewers might expect. <em>Letters</em> and{' '}
        <em>silences</em> appear in both — the lover’s telegram and the detective’s — but
        the verbs around them differ. Mystery <em>opens</em> them; Romance <em>holds</em> them.
      </>
    ),
  },
  'gothic_horror|literary': {
    onlyA: ['ghost', 'crypt', 'spectre', 'moor', 'undead', 'tomb', 'candle', 'dread'],
    shared: ['house', 'mother', 'parish', 'letter', 'window', 'silence', 'sister', 'room', 'reader', 'garden'],
    onlyB: ['vocation', 'provincial', 'marriage', 'study', 'reform', 'reader', 'parish'],
    essay: (
      <>
        Gothic and Literary share their architecture — houses, parishes, the domestic
        stage — but diverge in what walks the halls. Gothic adds an inhabitant from
        outside the frame; Literary keeps the frame.
      </>
    ),
  },
  'adventure|western': {
    onlyA: ['schooner', 'treasure', 'island', 'elephant', 'spear', 'musket', 'sextant', 'sail'],
    shared: ['horse', 'rifle', 'camp', 'stranger', 'river', 'trail', 'stars', 'dawn', 'smoke', 'wound'],
    onlyB: ['cowpuncher', 'rustler', 'sage', 'rim', 'herd', 'colt', 'ranch', 'remuda', 'sheriff'],
    essay: (
      <>
        Both are open-air. Both ride. But Adventure ships out — schooner, sextant — while
        the Western rides in, finds the same range it left.
      </>
    ),
  },
}

const GENERIC: StudyWordTable = {
  onlyA: ['—', '—', '—', '—'],
  shared: ['letter', 'silence', 'hand', 'room', 'glance', 'window', 'wait'],
  onlyB: ['—', '—', '—', '—'],
  essay: (
    <>
      This pair has not been studied yet. The shared vocabulary listed below is provisional
      and may revise as the corpus grows.
    </>
  ),
}

/**
 * Resolve the word table for the (a, b) pair, order-insensitively. If only the
 * mirrored key exists, swap onlyA/onlyB (shared + essay are symmetric). Falls back
 * to the generic shape for un-studied pairs.
 */
export function resolveWordTable(a: string, b: string): StudyWordTable {
  const direct = TABLES[`${a}|${b}`]
  if (direct) return direct
  const mirror = TABLES[`${b}|${a}`]
  if (mirror) {
    return {
      onlyA: mirror.onlyB,
      shared: mirror.shared,
      onlyB: mirror.onlyA,
      essay: mirror.essay,
    }
  }
  return GENERIC
}
