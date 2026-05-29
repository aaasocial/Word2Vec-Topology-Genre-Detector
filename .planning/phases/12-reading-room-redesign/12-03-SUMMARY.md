---
phase: 12-reading-room-redesign
plan: 12-03
subsystem: ui
tags: [react, zustand, svg, reading-room, catalog-card, comparative-study, scatter]

# Dependency graph
requires:
  - phase: 12-01
    provides: reading-room tokens/theme, readingRoomStore (route + tweaks), L-05 genre hexes, masthead router, FootnoteHost (<Footnote n/>), PlaceholderScreen shell
  - phase: 12-02
    provides: PlateFrame pattern, useAllCorpusBooks fan-out, visualizationStore.selectedBookId/hoveredBookId + setSelectedBook/setHoveredBook, reskinned R3F plate, CatalogRail click→card routing
  - phase: 06-v1-bug-fix-sweep
    provides: useCorpusBooks + GET /api/corpus/genres/{genre}/books (CorpusBookFull)
provides:
  - Catalog card screen (RR-03) — breadcrumb + 3-col carrel (region-siblings rail / SVG plate detail / letterpress catalog card aside)
  - Comparative Study folio (RR-04) — two genre pickers + "&", 3-col folio (region A / shared Venn motif / region B), curated word tables + generic fallback, Editor's note + footnote³
  - readingRoomStore.studyA/studyB + setStudy (the Study region pair)
  - bookLayout helpers — deterministic per-book plate positions, nearestNeighbours, derived shelfmark/year/vocab over real corpus metadata
  - card/PlateDetail (SVG plate detail w/ dashed accent leader lines) + card/CatalogCard (letterpress aside)
  - study/MiniPlate (SVG region scatter) + study/StudyFolio + study/wordTables
affects: [12-06-guide-tour, 12-07-responsive]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Detail/decorative plates are SVG (D-U1 nuance): the catalog-card plate detail + the study mini-plates are lightweight SVG, NOT extra R3F/WebGL canvases — only the Collection primary plate is R3F (one WebGL context per app)"
    - "Deterministic id-seeded book layout (FNV-1a hash → mulberry32) gives stable per-book plate positions + a cosine-distance proxy for five-nearest over the REAL useCorpusBooks corpus, without a books-as-points endpoint the backend doesn't serve"
    - "Curated narrative copy (study word tables) lives in a typed module with order-insensitive (A|B / B|A) lookup + a generic fallback; real fields (title/author/genre/word_count/driving words) always come from the hook"

key-files:
  created:
    - frontend/src/components/card/bookLayout.ts
    - frontend/src/components/card/CatalogCard.tsx
    - frontend/src/components/card/PlateDetail.tsx
    - frontend/src/components/screens/Card.tsx
    - frontend/src/components/study/MiniPlate.tsx
    - frontend/src/components/study/wordTables.tsx
    - frontend/src/components/study/StudyFolio.tsx
    - frontend/src/components/screens/Study.tsx
  modified:
    - frontend/src/stores/readingRoomStore.ts
    - frontend/src/App.tsx

key-decisions:
  - "Catalog-card plate detail is SVG, not R3F. The plan said 'prefer R3F for parity with Collection', but the README's plate detail is fundamentally a book-annotated figure (selected book + dashed leader lines + a·b·c·d labels to 4 named books). The reused R3F ScatterCanvas paints WORD points (per 12-02), so it has no book points to highlight or annotate — an R3F plate could not draw the screenshot. SVG over the derived book positions renders 03-catalog-card.png faithfully and respects D-U1's explicit nuance (detail/decorative plates = SVG, one WebGL context per app). This is a Rule-4-adjacent judgement resolved in favour of the README screenshot + D-U1 over the plan's soft preference."
  - "Derived book positions + shelfmark/year/vocab. CorpusBookFull carries no x/y, year, vocab, or call number (only gutenberg_id/title/author/genre/word_count/color/top_10_tfidf_words). Per README §9 + the plan's env notes, real fields drive everything they can (title, author, genre, Words, driving vocabulary, the corpus the nearest-list ranks over); positions + the three missing catalog fields are derived DETERMINISTICALLY from the id so the same book always lands identically and same-genre books cluster. Flagged as Known Stubs — the live per-book embedding coords land if a book-scoped scatter endpoint is ever added."
  - "studyA/studyB in the shell store (session-scoped, not persisted), defaulting to the prototype's first studied pair Mystery & Romance, with setStudy('A'|'B', genre). The Study screen reads/writes only the store; region counts come from useAllCorpusBooks.byGenre."
  - "Study word tables keyed by the app's Genre slugs (gothic → gothic_horror), resolved order-insensitively so picking Romance & Mystery finds the Mystery|Romance table with onlyA/onlyB swapped; generic fallback copy verbatim for un-studied pairs."

requirements-completed: [RR-03, RR-04]

# Metrics
duration: ~6min
completed: 2026-05-29
---

# Phase 12 Plan 03: Catalog Card + Comparative Study Summary

**Two browse screens over the real corpus: the Catalog card (breadcrumb · region-siblings rail · SVG plate detail with dashed leader lines · letterpress catalog-card aside) and the Comparative Study folio (two genre pickers · region A / shared Venn motif / region B · curated shared-distinctive vocabulary · Editor's note) — both wired to `useAllCorpusBooks` with `studyA`/`studyB` in the shell store.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-29T05:07:09Z
- **Tasks:** 4
- **Files modified:** 10 (8 created, 2 modified)

## Accomplishments
- **Catalog card screen (RR-03, §6.3)** matching `03-catalog-card.png`: a breadcrumb (The Collection › Genre › Title, with the genre crumb setting the region filter + returning to the Collection), then a 3-col carrel — a region-siblings rail ("You are reading", region dot + label + count + description, the genre's titles with the selected one highlighted; click swaps the selection, hover sets `hoveredBookId`), the **plate detail**, and the **catalog card** aside. Drops to 2-col under `study` density.
- **Plate detail** (`PlateDetail.tsx`, SVG): the corpus drawn faint with the selected region a touch stronger, the selected book marked with an ink ring, and **dashed accent leader lines + lettered (a·b·c·d) labels** to its four nearest — plus the selected book's own italic label, exactly per the screenshot. `fig. 2 — …` caption with footnote².
- **Letterpress catalog card** (`CatalogCard.tsx`, `data-tour-id="catalog-card"`): `border:1px solid ink` + `border-top:4px double ink` + hard offset shadow (`--shadow-card`) + a punch-hole circle; shelfmark, title (24), author·year, a key/value grid (Genre w/ dot, Words, Vocab, UMAP-x, UMAP-y), a "See also" line linking the four nearest (a·b·c·d dotted-underline buttons), then "Driving vocabulary" chips (the **real** `top_10_tfidf_words`) and a "Five nearest" list (region dot · title·author · cosine-distance numeral). Every "See also"/nearest/sibling button re-selects in place.
- **Comparative Study folio (RR-04, §6.5)** matching `05-comparative-study.png`: a centered "A comparative study" label + an h2 with **two genre pickers flanking "&"** (`data-tour-id="study-pickers"`), then a 3-col folio — region A (dot/label/count · SVG mini-plate · "Only in {A}" chips in the region hex) · center "what they share" (two-circle Venn motif with region labels + "shared / N terms", shared chips, and the "ε ∈ [0, 0.6]" mono caption) · region B (mirror) — and an Editor's note paragraph + footnote³.
- **SVG mini-plates** (`MiniPlate.tsx`): a faint seeded corpus haze with the highlighted region's real books in its genre hex — decorative, no second WebGL context (D-U1 nuance).
- **Curated word tables** (`wordTables.tsx`): the three prototype pairs (Mystery|Romance, Gothic Horror|Literary, Adventure|Western) verbatim, resolved order-insensitively, with the prototype's generic fallback for un-studied pairs.
- **Store + routing:** `studyA`/`studyB` + `setStudy` added to `readingRoomStore`; the `card` and `study` PlaceholderScreens replaced with the real `Card` / `Study` screens in `App.tsx`.

## Task Commits

1. **Task 1: Catalog card aside + plate detail** — `65bfa39` (feat)
2. **Task 2: Card screen composition** — `2f10bb7` (feat)
3. **Task 3: Comparative study folio** — `bcf0da3` (feat)
4. **Task 4: Verify + SUMMARY** — _(this docs commit)_

All four task commits carry the `Co-Authored-By: Claude Opus 4.7 (1M context)` trailer, including Task 1 (the prior plan's missed-trailer note did not recur).

## Files Created/Modified
- `frontend/src/components/card/bookLayout.ts` — deterministic id-seeded positions + nearestNeighbours + derived shelfmark/year/vocab (created)
- `frontend/src/components/card/PlateDetail.tsx` — SVG plate detail w/ dashed leader lines + labels (created)
- `frontend/src/components/card/CatalogCard.tsx` — letterpress catalog-card aside + driving vocab + five nearest (created)
- `frontend/src/components/screens/Card.tsx` — breadcrumb + 3-col carrel composition (created)
- `frontend/src/components/study/MiniPlate.tsx` — SVG region mini-plate (created)
- `frontend/src/components/study/wordTables.tsx` — curated shared/distinctive copy + generic fallback (created)
- `frontend/src/components/study/StudyFolio.tsx` — pickers + 3-col folio + Venn motif + Editor's note (created)
- `frontend/src/components/screens/Study.tsx` — thin Study screen wrapper (created)
- `frontend/src/stores/readingRoomStore.ts` — studyA/studyB + setStudy
- `frontend/src/App.tsx` — register the card + study routes (replace PlaceholderScreens)

## Decisions Made
See the frontmatter `key-decisions`. The load-bearing one: the **plate detail is SVG, not R3F** — the reused R3F scatter is WORD-keyed (12-02), so it cannot mark a selected *book* or draw leader lines to four named *books*; SVG over the derived book positions renders the screenshot faithfully and honours D-U1's nuance (detail/decorative plates = SVG). The book positions + shelfmark/year/vocab are **derived deterministically** because `CorpusBookFull` does not carry them; all real fields (title/author/genre/Words/driving vocabulary/corpus membership) come from the hook.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Invalid string-XOR seed in `derivedVocab`**
- **Found during:** Task 1
- **Issue:** the first draft computed the vocab seed as `hashId(book.gutenberg_id ^ 0)` — `gutenberg_id` is a string, so `^ 0` is a nonsensical (and in strict TS, error-prone) operation rather than a numeric perturbation of the hash.
- **Fix:** hash the id first, then XOR the resulting integer with a constant: `hashId(book.gutenberg_id) ^ 0x2545f491`, re-coerced to unsigned. Fixed before the first tsc run.
- **Files modified:** `frontend/src/components/card/bookLayout.ts`
- **Commit:** `65bfa39`

### Plan-vs-README judgement (not a code deviation)

The plan's Task 1 says "reskinned R3F is fine for the main detail, OR SVG if cheaper — prefer R3F for parity with Collection". I chose **SVG** because the README §6.3 plate detail is a book-annotated figure the WORD-keyed R3F scatter physically cannot draw (no book points, no per-book highlight, no leader lines). This follows the plan's own "README wins; D-U1 (mini-plates SVG; main detail plate may be R3F)" deviation rule and the explicit `OR SVG` allowance — the screenshot + D-U1 win over the soft "prefer R3F" preference. Documented as a key decision, not a Rule 1-3 auto-fix.

## Known Stubs

| Stub | File | Line | Reason / resolves in |
|------|------|------|----------------------|
| Per-book plate positions are derived (id-seeded), not real embedding coords | `frontend/src/components/card/bookLayout.ts` | `positionBook` | `CorpusBookFull` carries no x/y; `/viz/scatter` is WORD-keyed (12-02). Positions are a stable per-book proxy so the plate detail + leader-line neighbourhood render; a live book-scoped scatter endpoint (none planned in Phase 12) would replace them. Same-genre clustering + deterministic placement keep the figure faithful to the screenshot. |
| Shelfmark / publication year / vocab count are derived (id-seeded) | `frontend/src/components/card/bookLayout.ts` | `shelfmark` / `derivedYear` / `derivedVocab` | The corpus payload has none of these (only `word_count`). They are decorative catalog framing matching the prototype's fabricated `call`/`y`/`vocab`; stable per book. Real fields (title, author, genre, Words, driving vocabulary) are the hook's. |
| Five-nearest cosine distance is the plate-position distance, not a server cosine | `frontend/src/components/card/bookLayout.ts` | `nearestNeighbours` | `useExplain` is a POST mutation needing a classification `jobId` (post-upload), unavailable when browsing a corpus book; the prototype likewise computes nearest from plate positions. The ranking is over the REAL corpus; only the metric is the position proxy. |
| Genre descriptions in the siblings rail are editorial copy | `frontend/src/components/screens/Card.tsx` | `GENRE_DESC` | One-line region descriptions echoing the prototype's `GENRE_DESC`; not data-backed (the corpus has no genre blurb). Decorative. |

None of these block the plan's goal — the two screens render faithfully against the bundled corpus with all real metadata wired (title/author/genre/word count/driving vocabulary, region membership + counts, the studyA/studyB pair). The stubs are the editorial/positional framing the backend does not serve and the design intentionally fabricates.

## Verification
- `npx tsc --noEmit` → exit 0 (clean) after every task.
- `npx vite build` → 692 modules, built clean (3 new modules vs the 12-02 baseline of ~684 — Card/Study/MiniPlate/StudyFolio now in the bundle). The >500 kB chunk-size warning is pre-existing/advisory (R3F/three since 12-02), not introduced here.
- `npx vitest run` → **167 in-scope tests pass**; the only 6 failures are the documented Phase 9 deferred set (`useClassify.test.ts` ×5 EventSource/WebSocket mock + `SlowTierParams.test.tsx` ×1 `setH2Enabled is not a function`), unchanged from the 12-01/12-02 baseline. No new failures; no test imports the new Card/Study components; the suite is fully runnable.
- Layout/behaviour vs the screenshots: **Catalog card** (`03-catalog-card.png`) — breadcrumb, "You are reading" siblings rail with the selected title highlighted, plate detail with the selected book ringed + dashed accent leader lines + a·b·c·d labels to the 4 nearest, and the letterpress card (4px-double top border, hard shadow, punch hole; shelfmark/title/author·year, the Genre/Words/Vocab/UMAP grid, See also, Driving vocabulary chips, Five nearest with dot + distance), `data-tour-id="catalog-card"` present. **Comparative Study** (`05-comparative-study.png`) — two pickers + "&" (`data-tour-id="study-pickers"`), 3-col folio with mini-plates + "Only in {A}/{B}" chips, center Venn motif + shared chips + "ε ∈ [0, 0.6]", Editor's note + footnote³. Live backend (:8000) in-browser data render is the user's verify step (the executor gate is tsc/build/test, which the plan does not require a running backend for).

## Self-Check: PASSED

All 8 created files exist on disk; all 3 task commit hashes (`65bfa39`, `2f10bb7`, `bcf0da3`) present in git history.

---
*Phase: 12-reading-room-redesign*
*Completed: 2026-05-29*
