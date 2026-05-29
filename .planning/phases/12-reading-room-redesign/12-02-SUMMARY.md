---
phase: 12-reading-room-redesign
plan: 12-02
subsystem: ui
tags: [react, r3f, three, zustand, react-query, reading-room, collection, scatter]

# Dependency graph
requires:
  - phase: 12-01
    provides: reading-room tokens/theme, readingRoomStore (route + tweaks), L-05 genre hexes, masthead router + FootnoteHost, PlaceholderScreen shell
  - phase: 03-frontend-core-and-3d-visualization
    provides: ScatterCanvas/PointCloud R3F scatter + useScatterData + buildBuffers
  - phase: 06-v1-bug-fix-sweep
    provides: useCorpusBooks + GET /api/corpus/genres/{genre}/books (BUG-03)
provides:
  - Collection screen — 3-col carrel (catalog rail / reskinned R3F plate / marginalia), 2-col under study density
  - Reskinned R3F plate (paper scene bg, L-05 genre hexes, region filter dims non-selected to ~0.15, ink selection ring)
  - PlateFrame — reading-room framed figure (corner rulings, projection chips, 2D/3D toggle, fig.¹ caption) housing the WebGL canvas
  - CatalogRail (data-tour-id="catalog-rail") — region index + filter + expand-titles + Find search
  - Marginalia — hovered-book note + standing UMAP-distortion note
  - useAllCorpusBooks — client-side fan-out over useCorpusBooks (all 8 genres, no new endpoint)
  - visualizationStore.hoveredBookId / setHoveredBook (book-level hover)
affects: [12-03-card-study, 12-06-guide-tour, 12-07-responsive]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "React Query useQueries fan-out over the canonical genre list to assemble the full corpus index from the per-genre useCorpusBooks endpoint (shared cache key, staleTime Infinity)"
    - "The R3F word scatter is the Collection plate (D-U1): scene.background reads --paper imperatively (no canvas remount), point colors flow from the L-05 genre hexes via buildBuffers; region filter is visualizationStore.selectedGenre"
    - "Book identity (hover/select/route-to-card) lives in the rail + marginalia (book-keyed); the plate carries word-point hover→tooltip (the geography), keeping the WebGL plate and the book index cleanly separated"

key-files:
  created:
    - frontend/src/components/collection/PlateFrame.tsx
    - frontend/src/components/collection/CatalogRail.tsx
    - frontend/src/components/collection/Marginalia.tsx
    - frontend/src/components/screens/Collection.tsx
    - frontend/src/hooks/useAllCorpusBooks.ts
  modified:
    - frontend/src/components/canvas/ScatterCanvas.tsx
    - frontend/src/components/canvas/PointCloud.tsx
    - frontend/src/stores/visualizationStore.ts
    - frontend/src/App.tsx

key-decisions:
  - "The plate is the existing R3F WORD scatter reskinned (D-U1); /viz/scatter returns word-level points, not books. Book hover/select/route-to-card is driven by the catalog rail + marginalia (book-keyed via useCorpusBooks); the plate's own hover yields a word tooltip per §6.2. This satisfies hoveredBookId+tooltip+click→card faithfully without faking books-as-points."
  - "Region filter dims non-selected to 0.15 (PointCloud genre-dim path raised from 0.04). Compare-mode dim stays 0.04 (not used by Collection)."
  - "useAllCorpusBooks fans out over the 8 canonical genres via React Query useQueries on the SAME ['corpus','genres',genre,'books'] cache key as useCorpusBooks — no new endpoint, cache shared both ways."
  - "Scene background now reads --paper (reading-room) instead of the dead Phase 10 --scene-bg; re-applies on the active paper Tweak. Selection-ring shader color flipped white→ink (#26211B) so it reads on warm paper."
  - "2D/3D maps to visualizationStore.is2D (3D = true R3F orbit per D-U1, not a CSS tilt); projection chips map PCA/KPCA/UMAP/t-SNE to the store projection key the PointCloud already animates on."

requirements-completed: [RR-02]

# Metrics
duration: ~7min
completed: 2026-05-29
---

# Phase 12 Plan 02: Collection Screen Summary

**The Collection — a 3-column carrel (catalog rail / reskinned R3F plate / marginalia) over the real `useScatterData` word geography and the `useCorpusBooks` book index, with a region filter, Find search, hover→marginalia, and click→catalog-card routing.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-29T04:55:06Z
- **Completed:** 2026-05-29T05:01:46Z
- **Tasks:** 4
- **Files modified:** 9 (5 created, 4 modified)

## Accomplishments
- **Reskinned the R3F plate (D-U1).** `ScatterCanvas` now paints its scene background from `--paper` (the reading-room page color) instead of the dead Phase 10 `--scene-bg`, re-applying imperatively when the reader changes the paper Tweak — no canvas remount, camera pose preserved (PITFALLS §13 pattern kept). Point colors already flow from the L-05 reading-room genre hexes through `buildBuffers`. The region filter dims non-selected genre points to ~0.15 (raised from 0.04), and the selection ring is now ink-toned so it reads against warm paper.
- **PlateFrame** — the reading-room framed figure that houses the WebGL canvas: 1px-ink border, corner rulings ("Plate I" top-left, "{proj} · {dim} · ε 0.42" top-right), a `fig. 1 — …` caption with footnote¹, "↻ recompute / ↗ export" affordances, projection chips (PCA/KPCA/UMAP/t-SNE) + a 2D/3D toggle wired to `visualizationStore` (the same `projection`/`is2D` the PointCloud animates on, so 3D is the real R3F orbit), and `data-tour-id="plate"`.
- **CatalogRail** — "Card catalog" header, "All regions {n}", then the 8 genres each with a mono index numeral + color dot + count; clicking a genre toggles the region filter (`selectedGenre`, accent left-border) AND expands its titles → clicking a title opens that book's card (`selectedBookId` + route 'card'); a "Find" field filters listed titles by title/author/driving word with a live match count. `data-tour-id="catalog-rail"`.
- **Marginalia** — the hovered book's note (title, author, region dot + label + word count, driving-word chips, "open catalog card →") or a prompt, plus the standing UMAP-distortion note; hidden under `study` density.
- **useAllCorpusBooks** — a client-side fan-out over the existing `useCorpusBooks` endpoint (React Query `useQueries` over the 8 canonical genres, same cache key) assembling `byGenre` / `all` / `byId` — no new backend route.
- **Collection** composes the 3-col carrel (rail 260 / plate 1fr / marginalia 300), dropping to 2-col under `study` density, and wires the plate's word-point hover to a floating word tooltip in the frame.

## Task Commits

1. **Task 1: Reskin R3F scatter** — `5291a0d` (feat)
2. **Task 2: PlateFrame + projection/2D-3D controls** — `2b73ac5` (feat)
3. **Task 3: Catalog rail + Find + marginalia + Collection composition** — `0927371` (feat)
4. **Task 4: Verify + SUMMARY** — _(this docs commit)_

## Files Created/Modified
- `frontend/src/components/canvas/ScatterCanvas.tsx` — scene bg from `--paper` (was Phase 10 `--scene-bg`); re-apply trigger switched from `usePreferencesStore.theme` to `readingRoomStore.tweaks.paper`
- `frontend/src/components/canvas/PointCloud.tsx` — region-filter dim raised 0.04 → 0.15; selection-ring shader color white → ink (#26211B)
- `frontend/src/components/collection/PlateFrame.tsx` — framed figure + corner rulings + projection/2D-3D chips + fig.¹ caption (created)
- `frontend/src/components/collection/CatalogRail.tsx` — region index + filter + expand-titles + Find (created)
- `frontend/src/components/collection/Marginalia.tsx` — hovered-book note + UMAP note (created)
- `frontend/src/components/screens/Collection.tsx` — 3-col carrel composition (created)
- `frontend/src/hooks/useAllCorpusBooks.ts` — all-genre corpus fan-out (created)
- `frontend/src/stores/visualizationStore.ts` — `hoveredBookId` + `setHoveredBook`
- `frontend/src/App.tsx` — register the Collection route (replaces the PlaceholderScreen)

## Decisions Made
- **Plate = reskinned word scatter, book identity in the rail.** `/viz/scatter/{projection}` returns word-level points (each point is a word colored by genre), not books. Per D-U1 the plate is that existing R3F scatter, reskinned. So the prototype's "hover a point → book note / click → card" maps onto the **catalog rail + marginalia** (the only surfaces where book identity actually lives, via `useCorpusBooks`): rail-row hover sets `hoveredBookId` (marginalia), rail-row/marginalia click sets `selectedBookId` + routes to `card`. The plate's own hover yields a floating **word** tooltip (word + genre), which is exactly the §6.2 "floating tooltip" behaviour. This honours the success criteria without inventing a books-as-points layer the backend doesn't serve.
- **Region filter = `selectedGenre` at 0.15.** Reused PointCloud's existing genre-dim path; only the non-selected opacity changed (0.04 → 0.15) so the un-highlighted corpus stays a legible ghost. Compare-mode's 0.04 dim is untouched (Collection never enters compare mode).
- **No new endpoint for the rail.** `useAllCorpusBooks` fans out over `useCorpusBooks` with `useQueries` on the identical cache key, so a later single-genre fetch (e.g. the 12-03 card screen) shares this cache and vice-versa; the bundled corpus only changes on retrain so the 8 responses are effectively permanent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `ScatterCanvas` read the dead Phase 10 `--scene-bg` token**
- **Found during:** Task 1
- **Issue:** 12-01 replaced the indigo `:root` block; `--scene-bg` no longer exists, so `readSceneBgFromCss()` fell back to near-black `#0A0A0F` — a black plate on a paper page. The plan said to "point it at `--paper`/the reading-room scene token", so this is the prescribed fix, executed as a blocking-issue correction.
- **Fix:** Read `--paper` (a literal hex in the reading-room tokens) and mint a THREE.Color from it; re-apply trigger switched from `usePreferencesStore.theme` to `readingRoomStore.tweaks.paper`. Removed the now-unused `usePreferencesStore` import + the matchMedia OS-pref subscription (Phase 10 light/dark machinery with no reading-room analogue).
- **Files modified:** `frontend/src/components/canvas/ScatterCanvas.tsx`
- **Commit:** `5291a0d`

**2. [Rule 2 - Missing critical functionality] No book-level hover state**
- **Found during:** Task 3
- **Issue:** `visualizationStore` had `selectedBookId` but no `hoveredBookId`; the marginalia note + rail-row hover need book-level hover distinct from the word-point `hoveredPointIndex`.
- **Fix:** Added `hoveredBookId: string | null` + `setHoveredBook` to `visualizationStore` (small additive field, not architectural — Rule 4 not triggered).
- **Files modified:** `frontend/src/stores/visualizationStore.ts`
- **Commit:** `0927371`

**3. [Rule 1 - Bug] White selection ring on paper**
- **Found during:** Task 1
- **Issue:** the PointCloud fragment shader hardcoded a white selection-ring annulus (a dark-theme convention) — a white ring is near-invisible on warm paper.
- **Fix:** changed the ring `gl_FragColor` to ink (#26211B → `vec4(0.149,0.129,0.106,1.0)`).
- **Files modified:** `frontend/src/components/canvas/PointCloud.tsx`
- **Commit:** `5291a0d`

### Process note (commit trailer)
Task 1's commit (`5291a0d`) was made before I noticed the prompt's required trailer `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`; it landed without that trailer. Tasks 2–4 carry the trailer. Not amended (git-safety: never amend a landed commit without explicit request); flagged here for transparency. No content impact.

## Known Stubs

| Stub | File | Line | Reason / resolves in |
|------|------|------|----------------------|
| Corner ruling "ε 0.42" is a fixed editorial label, not a live ε value | `frontend/src/components/collection/PlateFrame.tsx` | corner-ruling block | Intentional design copy — the README §6.2 / prototype draw a static `{proj} · {dim} · ε 0.42` ruling on the Collection plate; ε is a topology concept (the live ε slider is the Topology screen, 12-05). Not a data stub — the plate has no ε to compute. |

The `↻ recompute / ↗ export` figcaption affordances are rendered per the screenshot as static glyphs (no wired action) — they match the design and are not required interactive controls for this screen; can be wired later if a phase scopes them.

## Verification
- `npx tsc --noEmit` → exit 0 (clean) after every task.
- `npx vite build` → 684 modules, built clean (R3F/three now in the live bundle since Collection mounts the WebGL plate — expected). Chunk-size warning is pre-existing/advisory.
- `npx vitest run` → **167 in-scope tests pass**; the only 6 failures are the documented Phase 9 deferred set (`useClassify.test.ts` ×5 EventSource/WebSocket mock + `SlowTierParams.test.tsx` ×1 `setH2Enabled`), unchanged from the 12-01 baseline. No test imports the reskinned ScatterCanvas/PointCloud or the new Collection components; the suite is fully runnable.
- Layout/behaviour vs `02-collection.png`: 3-col carrel (rail/plate/marginalia); rail "All regions {n}" + 8 genres with mono numeral + dot + count; click filters (accent left-border) + expands titles; Find field; framed plate with corner rulings + fig.¹ caption + recompute/export; projection chips + 2D/3D; `data-tour-id="catalog-rail"`/`"plate"` present. Live backend (:8000) data render is the user's in-browser verify step (the plan does not require a running backend for the executor's tsc/build/test gate).

## Self-Check: PASSED

All 5 created files exist on disk; all 3 task commit hashes (`5291a0d`, `2b73ac5`, `0927371`) present in git history.

---
*Phase: 12-reading-room-redesign*
*Completed: 2026-05-29*
