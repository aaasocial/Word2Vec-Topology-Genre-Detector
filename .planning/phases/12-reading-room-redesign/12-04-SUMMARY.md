---
phase: 12-reading-room-redesign
plan: 12-04
subsystem: ui
tags: [react, zustand, react-query, sse, svg, reading-room, classify, explain, verdict]

# Dependency graph
requires:
  - phase: 12-01
    provides: reading-room tokens/theme, readingRoomStore (route + studyA/B + setStudy), L-05 genre hexes, masthead router, FootnoteHost (<Footnote n/> + notes 4/5/6), PlaceholderScreen shell
  - phase: 12-03
    provides: bookLayout (positionBooks / nearestNeighbours / PositionedBook), letterpress catalog-card pattern, SVG mini-plate pattern (MiniPlate)
  - phase: 09-classification-depth
    provides: useClassify (SSE job), useExplain (POST /explain mutation, 410/503 routing), uploadStore.ClassificationResult (+ top_n/entropy/gap/badge_fires), explain types (TopNPrediction / NearestTrainingBook / TrackContributions)
provides:
  - Submit a Text screen (RR-05, §6.6) — reading desk: foolscap textarea + live word count + .txt upload + 3 sample passages; right empty-state + privacy note OR staged pipeline progress while a real classify job runs
  - The Reading / verdict screen (RR-05, §6.7) — essay (footnotes⁴⁵⁶) + probability-fix bars from real top-N + Notes (two-track contributions from real useExplain) + text catalog card + where-it-landed SVG mini-plate + nearest five
  - reading/ReadingDesk (the editor + real useClassify wiring + staged progress + route→verdict on result)
  - reading/ProbabilityBars (horizontal probability fix from real TopNPrediction[])
  - reading/VerdictEssay (the full verdict composition; L-13 voice; useExplain nearest-five + track contributions; 410/503 framed states)
  - reading/WhereItLanded (SVG mini-plate with dashed accent pin, D-U1)
affects: [12-06-guide-tour, 12-07-responsive]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Real-pipeline upload: pasted text is wrapped into a `new File([body],'untitled.txt',{type:'text/plain'})` so the existing useClassify SSE job runs unchanged — NO prototype ~900ms simulation. Watch uploadStore.result and route→verdict; an errored step renders a framed progress panel (never blank)."
    - "Verdict reads the real classify result (uploadStore) + fires useExplain on mount; nearest-five prefers real useExplain.nearest_training_books and degrades to bookLayout.nearestNeighbours when explain is unavailable (backend down / 410 / 503) so the panel never blanks."
    - "L-13 voice as a hard branch: confidence < 0.80 → the word 'marginal' (essay + catalog card + footnote 6); never 'wrong'. Two-track centroid/topology fractions are MAPPED from useExplain.track_contributions.{vocabulary,topology}.pct/100 — the prototype's 0.76/0.24 demo numbers are NOT hardcoded."
    - "Decorative verdict mini-plate is SVG (D-U1 nuance): WhereItLanded reuses the id-seeded bookLayout corpus positions + a job-id-seeded dashed pin near the predicted region's centroid — one WebGL context per app stays in the Collection plate."

key-files:
  created:
    - frontend/src/components/reading/ReadingDesk.tsx
    - frontend/src/components/screens/Upload.tsx
    - frontend/src/components/reading/ProbabilityBars.tsx
    - frontend/src/components/reading/WhereItLanded.tsx
    - frontend/src/components/reading/VerdictEssay.tsx
    - frontend/src/components/screens/Verdict.tsx
  modified:
    - frontend/src/App.tsx

key-decisions:
  - "Pasted text → File for the real useClassify. useClassify.classify takes a File and validates `.txt`; the reading desk wraps pasted text into an in-memory .txt File so the SAME real SSE pipeline runs for paste and upload alike. This honours the env note ('use the REAL useClassify, NOT the prototype simulation') without touching the hook."
  - "Two-track contributions mapped from real useExplain, not hardcoded. The prototype's notes show fixed 0.76 (centroid) / 0.24 (topology). I render useExplain.track_contributions.vocabulary.pct/100 (centroid track ≈ vocabulary) and .topology.pct/100. When explain has not resolved (or 410/503), the notes read '(contribution pending the explanation)' rather than inventing numbers."
  - "Nearest-five uses real useExplain when present, derived fallback otherwise. useExplain.nearest_training_books gives real titles/authors/genres + real Euclidean distances; when the backend is down or returns 410/503 the panel falls back to bookLayout.nearestNeighbours over the real corpus (plate-distance proxy) so it is never blank. 410 → 'Upload expired — re-upload…'; 503 → 'explanation unavailable, the verdict still stands'."
  - "Essay drops the prototype's fabricated 'vocabulary of 4,832 distinct lemmas'. The real classify result carries total_words but not a distinct-lemma count, so the opening sentence states only the real word count (§11 'don't invent corpus data'). UMAP-x/y on the catalog card remain id-seeded derived values (Known Stub, consistent with 12-03), as the result carries no embedding coordinate."

requirements-completed: [RR-05]

# Metrics
duration: ~10min
completed: 2026-05-29
---

# Phase 12 Plan 04: Submit a Text → The Reading Summary

**The upload → verdict flow in the reading-room idiom, on the REAL pipeline: a foolscap reading desk that runs the actual `useClassify` SSE job (staged progress, no simulation) and routes to a verdict essay — footnoted prose, a probability-fix chart from the real top-N, a letterpress catalog card for the text, an SVG where-it-landed mini-plate with a dashed pin, and the five nearest works — with the L-13 "marginal" voice and two-track contributions mapped from the real `useExplain`.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-29T05:19:17Z
- **Tasks:** 3
- **Files modified:** 7 (6 created, 1 modified)

## Accomplishments

- **Submit a Text (RR-05, §6.6)** matching `06-submit-a-text.png`: a 2-col reading desk — left the "foolscap" framed textarea (`foolscap · paste below` corner mark, live `N words` / `no text yet` counter, `data-tour-id="reading-desk"`), a "Generate a reading →" ink button + "or upload a .txt" file picker, and the 3 sample-passage buttons; right the empty-state panel ("The reading appears here" + the verbatim dashed-panel copy) and the privacy note.
- **Real pipeline, not a simulation.** Submitting wraps the pasted text into an in-memory `.txt` File and runs the existing `useClassify` SSE job (POST /classify → progress stream). While the job runs, the right panel swaps the empty-state for a **staged pipeline progress** list (Uploading → Tokenizing → TF-IDF → Point cloud → Homology → Classifying) driven by the real SSE step statuses; when `uploadStore.result` lands it routes to `verdict`. An errored step (or retry message) renders a **framed** progress panel — never blank.
- **The Reading / verdict (RR-05, §6.7)** matching `07-the-reading.png`: breadcrumb (Submit a Text › Reading no. NNNN) + share/print; 2-col — left the **essay** (label, 38px title, three indented paragraphs with footnotes⁴⁵⁶, the **"Probability fix"** bars from the real top-N, a **Notes** block) · right a **letterpress catalog card** for the text (provisional shelfmark, Verdict + Confidence "0.NN · marginal", UMAP-x/y, punch hole), a **"Where it landed"** SVG mini-plate with a dashed accent pin, and **"Nearest five works"**.
- **L-13 voice rule.** A confidence < 0.80 reads "**marginal**" in the essay, the catalog card, and footnote 6 — never "wrong". ≥ 0.80 reads "confident" and the essay drops the "though imperfectly" / "qualified assignment" hedging. The framed confidence numeral is the real `result.confidence` (1-decimal mono in the card, 2-decimal in the essay's mono chip).
- **Two-track contributions from real `useExplain`.** The Notes block's centroid (vocabulary) and topology fractions are `useExplain.track_contributions.{vocabulary,topology}.pct / 100` — the prototype's 0.76/0.24 demo numbers are NOT hardcoded. Nearest-five prefers `useExplain.nearest_training_books` (real titles/authors + Euclidean distances) and falls back to `bookLayout.nearestNeighbours` over the real corpus when the explanation is unavailable. 410 (expired) and 503 (uncalibrated/unavailable) both render framed notes.
- **Routing + store reuse.** Both screens are thin wrappers (`Upload` → `ReadingDesk`, `Verdict` → `VerdictEssay`) registered in `App.tsx`, replacing the two 12-04-owned PlaceholderScreens. The verdict's "comparative study of {A} and {B}" deep link uses the real second-likeliest region from top-N + `readingRoomStore.setStudy`; the nearest-works links set `visualizationStore.selectedBook` + route to `card`.

## Task Commits

1. **Task 1: Reading desk (Submit a Text) on the real classify pipeline** — `82a8e8e` (feat)
2. **Task 2: The Reading — verdict essay, probability bars, text card** — `496d023` (feat)
3. **Task 3: Verify + SUMMARY** — _(this docs commit)_

All task commits carry the `Co-Authored-By: Claude Opus 4.7 (1M context)` trailer.

## Files Created/Modified

- `frontend/src/components/reading/ReadingDesk.tsx` — foolscap editor + real useClassify wiring + staged progress + route→verdict (created)
- `frontend/src/components/screens/Upload.tsx` — thin Submit-a-Text screen wrapper (created)
- `frontend/src/components/reading/ProbabilityBars.tsx` — "Probability fix" bars from real TopNPrediction[] (created)
- `frontend/src/components/reading/WhereItLanded.tsx` — SVG where-it-landed mini-plate w/ dashed accent pin (created)
- `frontend/src/components/reading/VerdictEssay.tsx` — the full verdict composition; L-13 voice; useExplain nearest-five + track contributions; 410/503 framed states (created)
- `frontend/src/components/screens/Verdict.tsx` — thin The-Reading screen wrapper (created)
- `frontend/src/App.tsx` — register the upload + verdict routes (replace the two 12-04 PlaceholderScreens)

## Decisions Made

See the frontmatter `key-decisions`. The load-bearing ones: (1) pasted text is wrapped into a `.txt` File so the **real** `useClassify` SSE job runs for paste and upload alike (no prototype simulation); (2) the two-track centroid/topology fractions are **mapped from the real `useExplain.track_contributions`**, never the prototype's 0.76/0.24; (3) nearest-five uses real `useExplain.nearest_training_books` with a derived `bookLayout` fallback so the panel is never blank; (4) the essay states only the real `total_words` and drops the prototype's fabricated distinct-lemma count (§11 "don't invent corpus data").

## Deviations from Plan

None requiring Rule 1-3 auto-fixes to the shipped behaviour. Two implementation judgements, documented as decisions (not code deviations):

1. **Hook-order correctness (preventive, not a bug).** `VerdictEssay` returns early when there is no `result`. The derived-nearest `useMemo` was authored above that early return (computing from `result?.genre`) so React's hook order stays stable — standard React-rules compliance, caught and structured before the first tsc run, not an in-flight fix.
2. **Sample-passage padding.** The prototype's sample buttons paste a one-line preview (which the prototype's fake 900ms pipeline accepts). Because we run the **real** pipeline (which rejects very short texts), the sample buttons paste the preview followed by deterministic filler so a sample click produces a text long enough for the real classifier to read. The visible button copy + preview quote are verbatim from the prototype.

## Known Stubs

| Stub | File | Reason / resolves in |
|------|------|----------------------|
| Where-it-landed pin position is derived (predicted-region centroid + job-id jitter), not a real per-text embedding coordinate | `frontend/src/components/reading/WhereItLanded.tsx` (`pin`) | The classify result carries no plate coordinate and `/viz/scatter` is WORD-keyed (12-02); the pin is a stable per-reading proxy near the predicted region so the figure renders faithfully. Live coords would need a text-scoped scatter endpoint the backend does not serve. Same id-seeded `bookLayout` approach as 12-03. |
| Catalog-card UMAP-x / UMAP-y are id-seeded derived values | `frontend/src/components/reading/VerdictEssay.tsx` (`derivedCoord`) | The `ClassificationResult` payload carries no embedding coordinate; decorative catalog framing matching the prototype's fabricated `+0.184 / −0.122`, stable per reading. The real fields (verdict genre, confidence, word count, top-N, nearest, track contributions) all come from the hooks. |
| Sample-passage body is padded filler appended to the prototype preview | `frontend/src/components/reading/ReadingDesk.tsx` (`expandSample`) | The real pipeline needs enough tokens to classify; the previews are too short. The filler is editorial placeholder prose — the user's own paste/upload is always their real text. |

None of these block the plan's goal: a real paste/upload runs the actual `useClassify` job with staged progress and routes to a verdict that reads the real classify result + `useExplain` (top-N probability bars, nearest-five, two-track contributions, L-13 voice). The stubs are the decorative plate/coordinate framing the backend does not serve.

## Verification

- `npx tsc --noEmit` → exit 0 (clean) after every task.
- `npx vite build` → **700 modules**, built clean (+8 vs the 12-03 baseline of 692 — the 5 new reading components + 2 screen wrappers now in the bundle). The >500 kB chunk-size warning is pre-existing/advisory (R3F/three since 12-02), not introduced here.
- `npx vitest run` → **167 in-scope tests pass**; the only 6 failures are the documented Phase 9 deferred set (`useClassify.test.ts` ×5 EventSource/WebSocket mock mismatch + `SlowTierParams.test.tsx` ×1 `setH2Enabled is not a function`), unchanged from the 12-01/12-02/12-03 baseline. No new failures; no test imports the new reading components; the suite is fully runnable.
- Layout/behaviour vs the screenshots: **Submit a Text** (`06-submit-a-text.png`) — masthead, "Submit a text · empty desk" label, 40px title with italic "reading desk.", intro paragraph, foolscap textarea (`foolscap · paste below` + word counter, `data-tour-id="reading-desk"`), "Generate a reading →" / "or upload a .txt", 3 sample passages, right empty-state ("The reading appears here" + verbatim dashed-panel copy) + privacy note. **The Reading** (`07-the-reading.png`) — breadcrumb + share/print, essay (label, 38px title, indented paragraphs with footnotes⁴⁵⁶, verdict genre in its hex, confidence framed mono "0.NN · marginal", comparative-study deep link), "Probability fix" bars, Notes block, catalog card (4px-double top border, hard shadow, punch hole; provisional shelfmark, Verdict/Confidence/UMAP-x/y), "Where it landed" SVG mini-plate with dashed accent pin + "your text" label, "Nearest five works". The live classify run (needs backend :8000 + Redis + arq up) is the user's verify step; the executor gate is tsc/build/test, which the plan does not require a running backend for.

## Self-Check: PASSED

All 6 created files exist on disk; both task commit hashes (`82a8e8e`, `496d023`) present in git history.

---
*Phase: 12-reading-room-redesign*
*Completed: 2026-05-29*
