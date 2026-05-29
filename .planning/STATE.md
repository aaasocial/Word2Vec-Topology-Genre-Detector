---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: — Accuracy, Depth, and Polish (Shipped 2026-05-30)
status: milestone-complete
last_updated: "2026-05-30T05:00:00.000Z"
last_activity: 2026-05-30
progress:
  total_phases: 13
  completed_phases: 12
  total_plans: 46
  completed_plans: 46
  percent: 100
---

# STATE

## Current Position

**▶ v2.0 MILESTONE COMPLETE — Shipped 2026-05-30.** Phases 6–12 all closed; archived to `.planning/milestones/v2.0-{ROADMAP,REQUIREMENTS}.md`; git tag `v2.0`. Four documented caveats carried to v2.1 (V21-01 author-leakage · V21-02 α-miscalibration · V21-03 Phase-9 UAT · V21-04 per-book persistence — see `REQUIREMENTS.md` §"v2.1 Carry-over"). The live `ROADMAP.md`/`REQUIREMENTS.md` were intentionally kept (not reset) since v2.1 isn't started yet; `/gsd-new-milestone` will reset requirements when v2.1 opens. Next: `/gsd-new-milestone` (v2.1) or address a carry-over (e.g. re-sweep α).

---

Phase: 12 (reading-room-redesign) — **COMPLETE 2026-05-29** (7/7 plans) — **THE READING ROOM SHIPPED**

- **Milestone:** v2.0 — Accuracy, Depth, and Polish
- **Phase:** 12 — **COMPLETE.** All 7 plans landed (12-01 foundation → 12-02 Collection → 12-03 Card+Study → 12-04 Submit→Reading → 12-05 Topology → 12-06 Guide+tour → 12-07 responsive+robustness+close). RR-01..RR-09 all met. The entire front end is recast into the editorial reading-room idiom — masthead-routed 8-screen library + Guide side-sheet + 6-stop guided tour + paper/accent/density Tweaks — reusing every data hook, store, and endpoint unchanged (D-U2). The Phase 10 indigo theme + Phase 11 onboarding chain are superseded in the live app (their milestone requirements remain historically met).
- **Status (12-07, RR-09):** Plan 12-07 closed the phase in 2 atomic task commits (`4b61181` feat → `b2dabde` fix) + this docs commit. **Responsive (Task 1, §10/L-14):** replaced every screen's inline `gridTemplateColumns` with reusable CSS-grid classes in `index.css` (`.rr-carrel/-card`, `.rr-verdict`, `.rr-desk`, `.rr-folio`, `.rr-topo`) driven by `@media` breakpoints — at ≤1100px drop the marginalia/sibling rail/topology side panels/study center binding (the `study` density 2-col fallback by viewport); at ≤768px stack to one column in source order. `.rr-dense` keeps the `study` density 2-col fallback at any width. The shell lifts its `100vh/overflow:hidden` artboard lock below 768px (`.rr-shell` → height:auto/overflow:visible, body scrolls) so stacked columns don't clip; plate gets a `min-height:320` clamp to stay a usable square; Guide is already `maxWidth:100%`; tour card clamped to `calc(100vw - 56px)`. The fixed 1240×780 artboard is NOT shipped. **Animation-robustness (Task 2, §7/L-08):** audited every live "alive" element — the 5 Guide figures, VR birth-fade (useFrame holds the last ε frame when rAF pauses), and probability-bar fills were already background-tab-safe from 12-06; fixed the topology loading skeletons (referenced an unreachable/undefined `pulse` keyframe → replaced with static "reading…" frames) and gated FigVerdict's 120ms replay on `document.visibilityState` (forced-visible on `visibilitychange`) so a backgrounded tab can never strand the bars at width:0. **Verification:** tsc 0; vite build clean (715 modules); Vitest 167 in-scope green (6 Phase 9 deferred unchanged, no tests retired); Playwright 5/5 green (incl. the end-to-end 6-stop tour). Manual screenshot sweep: no indigo remains, "marginal" verdict voice, topology H₁-only + N-D disclaimer. **Deviation (Rule 1):** a duplicate `className` on the ReadingDesk `<main>` (my Task-1 edit) silently dropped `rr-desk` — caught via the Vite warning in the Playwright run and fixed in the closeout commit.
- **Next phase:** Phase 12 complete — milestone v2.0 (Accuracy, Depth, and Polish) has Phases 6–12 all closed. Consider `/gsd-complete-milestone` for v2.0, or open Phase 13 if scoped. Optional: in-browser 3-width responsive confirmation (wide / ~1000px / ~700px) across all 8 routes + Guide + tour + Tweaks with backend :8000 up.
- **Last activity:** 2026-05-29

### Phase 12 plan 12-05 complete (2026-05-29)

Plan 12-05 re-skinned the Topology tab into the reading-room idiom (RR-06 / §6.4 / L-11) on the existing R3F components + hooks, in 3 atomic feat commits (`04af82a` → `8988e7b` → `ea3f16e`):

- **VR hero (i):** `VRViewer` scene bg reads `--paper` imperatively (re-applied on the paper Tweak, no canvas remount — PITFALLS §13); ring/structural nodes take the region's reading-room genre hex; freshly-born edges flash the active **accent** (read from `--accent`) and fade to an ink-ish hairline (`--ink`) over ~500ms. `vrFiltering.filterEdgesByEpsilon` now takes the highlight/rest colors (the amber `#FACC15` + indigo subdued literals are gone); `birthWindow` stays the 4th positional arg so the existing `vrFiltering.test.ts` calls stay green.
- **ε slider:** `EpsilonSlider`'s filled track is `--accent` (replaces `#FACC15`), reading-room type, 3-decimal `ε` readout + edge count. Store-driven, no server calls.
- **Diagram (ii):** `PersistenceDiagram` recolored to the reading room (accent dots + ink outline + card ground); **accent sweep lines** at ε + **shaded alive corner** (birth ≤ ε ≤ death); alive dots opaque w/ ink outline, others dimmed; √persistence dots; ∞ strip — `Infinity` filtered from the finite set **before** axis bounds (v1 auto-rescale trap preserved).
- **Image (iii):** `PersistenceHeatmap` swaps PLASMA for the **`paper2 → genreHex → ink`** ramp (genreHex = the region's hex) + a horizontal **density legend** (vmin·density·vmax, stepped fillRect so it renders under the jsdom canvas mock) + an **ε birth-axis guide** line. `lib/heatmap.ts` gains `readingRoomRamp` + `renderReadingRoomHeatmap`; PLASMA `renderHeatmap` retained for other consumers.
- **Screen:** new `screens/Topology.tsx` owns the header (title + Region chips + projection chips), the 1.5fr hero (`data-tour-id="topology-plate"` + "{n} edges · {k} loop(s) alive" readout off `useVRData`+`usePersistenceDiagram`), the 300px side column, the dashed-ring empty state, and the N-D disclaimer with footnote⁵. **ε links all three** off `visualizationStore.vrEpsilon`; **projection chips drive only the hero** (`useVRData`), never the diagram/image (genre+dim-keyed). H₁ only. Collapses to 1-col under `study` density. `TopologyPanel` re-exports the screen; `App.tsx` registers the route (drops the last PlaceholderScreen).
- **Deviations:** 2 Rule-3 blockers — (a) jsdom canvas mock lacks `createLinearGradient` → density legend uses stepped fillRect; (b) the tour-anchor smoke iterated orphaned Phase-10 anchors (dead since 12-01's shell swap) → rewrote it to assert the live reading-room anchors (plate/catalog-rail/topology-plate/study-pickers/reading-desk) via masthead nav. `tour/anchors.ts` left untouched (the 6-stop `TOUR_STEPS` rewrite is 12-06's scope).
- **Verification:** tsc clean; vite build clean (711 modules); 167 Vitest in-scope green (6 Phase 9 deferred unchanged); Playwright 4/4 green; live visual check vs `04-topology.png` confirmed (backend :8000 returned 200). No stubs — wired to the real hooks.

### Phase 12 plan 12-04 complete (2026-05-29)

Plan 12-04 landed the Submit-a-Text → verdict flow on the REAL classify pipeline (RR-05):

- **Real pipeline, not a simulation:** the reading desk wraps pasted text into an in-memory `.txt` File so the existing `useClassify` SSE job runs unchanged for paste + upload alike; the right panel swaps the empty-state for staged SSE progress while the job runs and routes to `verdict` on `uploadStore.result`. Errored step / retry message → framed panel (never blank).
- **Verdict reads the real result + useExplain:** `VerdictEssay` fires `useExplain` on mount; "Probability fix" bars from the real `result.top_n`; Notes-block centroid/topology fractions MAPPED from `useExplain.track_contributions.{vocabulary,topology}.pct/100` (the prototype's 0.76/0.24 are NOT hardcoded); nearest-five from real `useExplain.nearest_training_books` with a `bookLayout.nearestNeighbours` fallback so the panel never blanks. 410/503 render framed notes.
- **L-13 voice:** `result.confidence < 0.80` → the word "marginal" (essay, catalog card, footnote⁶), never "wrong"; ≥0.80 drops the hedging and reads "confident".
- **D-U1 SVG mini-plate:** `WhereItLanded` reuses the id-seeded `bookLayout` corpus positions + a job-id-seeded dashed accent pin near the predicted region — decorative SVG, no second WebGL context.
- **Known Stubs:** the where-it-landed pin position, the catalog-card UMAP-x/y, and the sample-passage filler body are derived/decorative (the classify result carries no plate coordinate; the previews are too short for the real classifier). All real fields (verdict genre, confidence, word count, top-N, nearest, track contributions) come from the hooks.
- **Verification:** tsc clean; vite build clean (700 modules, +8 vs 12-03); 167 Vitest in-scope green (6 Phase 9 deferred unchanged). Live classify run (backend :8000 + Redis + arq) is the user's verify step.

### Phase 12 plan 12-01 complete (2026-05-29)

Plan 12-01 laid the reading-room foundation every later Phase-12 screen builds on (RR-01):

- **Tokens (D-U2):** `index.css` indigo `:root`/`:root.light` HSL block replaced by reading-room paper/paper2/card/ink/muted surfaces + accent + rule/shadow tokens + a `.rr-*` type scale; cream/oxblood defaults baked in so first paint is correct. `index.html` loads Spectral + JetBrains Mono and drops the Phase 11 light-default FOUC script + Inter.
- **Theme of record:** `theme/readingRoom.ts` — 4 paper palettes, 4 accents, `RR_GENRE_HEX` (the fixed 8 L-05 hexes), and `applyReadingRoomTheme(palette, accent)` writing the surface/accent CSS vars (+ alpha-derived ink shadow tints) onto `<html>`.
- **Genre palette (L-05):** `constants/genres.ts` now carries the reading-room hexes, theme-independent. Kept the `Record<Theme,...>` API + `genreColor`/`GENRE_LIST`/`UPLOADED_BOOK_COLOR[theme]`/`HISTORICAL_DIM_COLOR` so all ~14 consumers compile unchanged (both subrecords identical). `gothic_horror` → tokens.md `gothic` (#6E4A8E); uploaded-book marker is now the oxblood accent.
- **Shell store:** new `readingRoomStore` (route over 8 screens, guideOpen + persisted guideSeen, persisted `tweaks{paper,accent,density}`, tour cursor). `setTweak` reapplies the theme live; `onRehydrateStorage` + `initReadingRoomTheme()` (in main.tsx) apply persisted palette before/at first paint. Data-side stores (visualization/upload) untouched per CONTEXT discretion.
- **Shell + screens:** Masthead (L-04 active = accent underline + ink + roman, others italic + muted; 2px ink rule; sticky), Footer (running labels), FootnoteHost (6 verbatim notes + centered modal, backdrop/Esc close, block shadow), native TweaksPanel (Warmth/Mark/Layout swatches + bottom-right toggle). App.tsx masthead router replaces the tabbed shell + Phase 11 onboarding orchestrator; Landing (§6.1) + About (§6.8) ship with verbatim copy; collection/card/topology/study/upload/verdict render a navigable PlaceholderScreen owned by later plans.
- **Deviations:** none — executed exactly as written; no Rule 1/2/3 auto-fixes needed; no tests retired (no test imports the replaced App or asserts old genre hexes).
- **Known stubs (intentional, owned by later plans):** PlaceholderScreens (12-02..12-05), Landing static-SVG plate (live R3F in 12-02), Guide button opens nothing yet (12-06).

### Phase 11 Complete (2026-05-28)

Plan 11-01 (the only plan in Phase 11) landed the onboarding + theme-defaults reversal:

- **D-86 light default:** `preferencesStore` default theme `'system' → 'light'`; inline pre-hydration `<head>` script in `index.html` adds `.light` to `<html>` before the bundle (reads `lgt-prefs-v1` persist payload `.state.theme`, new users → light, parse errors → light per Rule 1); removed `class="dark"` from `<html>`. Persisted dark/system users unaffected.
- **D-87 introSeenAt:** added `introSeenAt: number | null` + `setIntroSeenAt`; exported `INTRO_TTL_MS` (30 days) + `isIntroStale()` helper (null/undefined or ≥30 days). Rides the existing `lgt-prefs-v1` persist key.
- **D-89 no tour auto-start:** removed the `tourCompleted`-driven first-load `useEffect` from `TourProvider` (reverses D-73); `start/next/prev/skip/done` + `useTour()` intact; manual Replay still works.
- **D-88/D-90 onboarding chain:** `OnboardingOrchestrator` (null-rendering child inside `TourProvider` so it can call `useTour().start()`) runs once-on-mount: stale `introSeenAt` → open How It Works + set `introSequenceActive` + `setIntroSeenAt(Date.now())` (consume-on-fire); observes `pipelineExplanationOpen` true→false and chains to the tour after 300ms; manual opens leave `introSequenceActive` false so they do NOT chain.
- **Verification:** tsc --noEmit clean; 167 Vitest in-scope green (6 Phase 9 deferred failures unchanged); 9/9 Playwright tour-anchor smoke green after seeding `introSeenAt` in the fixture (1 Rule 3 deviation).
- **ONBOARD-01..03 requirements all complete.**

### Phase 10 Complete (2026-05-28)

Plan 10-01 (the only plan in Phase 10) landed the full Visual Polish sweep per the design handoff:

- **Theming infrastructure:** :root.light Paper theme (#FBF9F2 cream / #FFFFFF cards) added alongside dark; 13 new tokens (--scene-bg, --sidebar-bg/border, --warn/--good families, --error wash) in both scopes
- **preferencesStore (Zustand persist, key `lgt-prefs-v1`):** theme + tourCompleted; applyTheme toggles `<html>.light`; System mode subscribes to OS prefers-color-scheme live (D-63/D-65)
- **v2 dual-token GENRE_COLORS:** Record<'light'|'dark', Record<Genre, string>> shape; 8 v2 keys (adventure/gothic_horror/historical/literary/mystery/romance/speculative/western); UPLOADED_BOOK_COLOR.light = #1D4ED8 deep blue (saffron melts into cream) (D-60/D-61)
- **Imperative scene.background:** ScatterCanvas + VRViewer read --scene-bg via getComputedStyle round-trip, push to scene.background in useEffect([theme]) — no Canvas remount, no WebGL context loss, camera pose preserved (PITFALLS §13 / D-64)
- **Component sweep:** ~30 Phase 9 inline-hex components lifted to hsl(var(--*)) tokens following D-82 canonical pattern; UncertaintyBadge keeps amber identity per D-84 exception
- **Hand-rolled 4-step onboarding tour:** TourOverlay (~250 LoC) + TourProvider (~100 LoC); centralised TOUR_ANCHORS in src/tour/anchors.ts; first-load auto-open at 600ms grace; replayable from Help dropdown; Esc/←/→ keyboard wired; missing-anchor silent-skip after 600ms grace (PITFALLS §14)
- **Header HelpDropdown:** `?` button + popover with Replay tour / How It Works / Keyboard shortcuts / 3-state theme segmented control / GitHub link; closes on outside-pointerdown or Esc
- **Four empty states (POLISH-05) + Topology empty:**
  - UploadZone: constraints copy `.txt · ≤5MB · ≥500 words` + ghost-scatter helper SVG
  - Compare tab: two ghost panels with `+ Pick genre` shortcuts + gothic_horror/speculative hint
  - Classification failure: FailureCard with 5 variants (encoding/too_short/wrong_format = red wash, expired_410/uncalibrated_503 = amber wash; 503 keeps top-1 prediction visible per D-79)
  - Explain pre-upload: three ghost rows mirroring real sub-panels; "Upload a book first." headline; D-51 footnote intentionally omitted (D-80)
  - Topology empty: 320×240 ghost heatmap with --muted→--secondary gradient at 50% opacity (D-81)
- **Playwright smoke test (D-76):** 9 specs guarding tour anchor presence on fresh mount; passes in 9.1s; vitest excludes tests/e2e/** so the two runners don't collide
- **Auto-fixed deviations:** 3 (border-shorthand jsdom workaround, vitest Playwright exclude, final inline-hex leftover in PersistenceDiagram loading skeleton) — all documented in 10-01-SUMMARY.md
- **Verification:** tsc --noEmit clean; 167 Vitest tests passing (6 pre-existing Phase 9 deferred failures unchanged); 9/9 Playwright tour-anchor specs green; manual browser verification via HMR throughout
- **POLISH-01..05 requirements all complete**

### Phase 9 Complete (2026-05-27)

6/6 plans landed end-to-end via `/gsd-execute-phase 9`. Calibration empirical pick (`libsvm_platt`, Brier 0.0481) retrained `svm_pipeline.joblib` and extended the lineage sidecar; build-time `explain_artifacts.npz` + FastAPI lifespan loader provides per-genre w2v centroids, 5-NN index, calibrated training-set probabilities, and frozen vocabulary; the explainability spine (zero-ablation track contributions, NN search, centroid-attribution driving words, entropy/gap badge) is wired through `classify.predict_top_n` → SSE → `POST /api/classify/{job_id}/explain` with Redis hand-off (5-min `feature_vec`) and 1-hour result cache (410 Gone on expiry). Frontend mounts TopNList + UncertaintyBadge inline and a Why button opening ClassificationExplain (NearestBooksList + TrackContributionBars + DrivingWordsPills); Step7ValidationLimitations walkthrough closes the loop with D-53 "upper bound" framing. Measured `/explain` p50 = 15ms cache-miss / 1ms cache-hit (200ms target). Verifier confirmed 5/5 ROADMAP success criteria + 7/7 DEPTH requirements directly from code; 91 Phase 9 tests green; code review 0 critical / 5 warnings advisory.

### Phase 8 Complete (2026-05-26)

Phase 8 paused on 2026-05-25 after Wave 1.5 because a full gid integrity audit found 141/240 books had wrong `gid` bindings. Resumed and closed via Phase 8.1 sub-phase (drop strategy):

### Phase 8 Complete (2026-05-26)

Phase 8 paused on 2026-05-25 after Wave 1.5 because a full gid integrity audit found 141/240 books had wrong `gid` bindings. Resumed and closed via Phase 8.1 sub-phase (drop strategy):

**Phase 8.1 — Corpus Integrity Rebuild (drop strategy):**

- Repair attempt via gutendex bulk lookup reduced 145 SERIOUS → 86 SERIOUS (40.7%) but hit diminishing returns
- User-authorized drop: removed the 86 unresolvable rows from `corpus/books.yaml` and `corpus_candidates.yaml`
- Final v2 corpus: **154 verified-clean books** across 8 genres (15–25 per genre); 0 SERIOUS in final audit
- Wave-2 pipeline re-run end-to-end on clean corpus; lineage rotated `f6cf71fa → 3f4fe940`; all 7 frozen hyperparameters preserved

**Phase 8 Wave 3 — Validation Report:**

- Hold-out macro-F1: **v2 = 0.7367 vs v1 = 0.3235** (+41pp, permutation p=0.0010) → **CEXP-03 PARTIAL-VALIDATED**
- GroupKFold-by-author mean macro-F1: 0.2865 (gap 45pp vs hold-out, >> 15pp threshold) → **CEXP-04 BLOCKED**
- Per-author smoke test failed → D-31 disclaimer path triggered
- 4 §10 validation routines added to `scripts/06_validate.py` with unit-test coverage in `scripts/test_06_validate.py`

**Phase 8 Wave 4 — Publish + Doc Alignment:**

- D-33 publish-with-disclaimer decision applied (CEXP-03 PARTIAL-VALIDATED → publish; CEXP-04 BLOCKED non-gating)
- v2.0-data GitHub Release published to https://github.com/aaasocial/Word2Vec-Topology-Genre-Detector/releases/tag/v2.0-data with 10 assets (~194 MB) including v2 validation report
- Doc alignment landed: REQUIREMENTS.md CORPUS-01, PROJECT.md Validated list + Key Decisions, ROADMAP.md Phase 8 closure + Phase 9 unblock
- Code review: 0 critical / 7 warnings / 11 info — advisory only, not blocking

**Repo migration (2026-05-26):** Phase 6-8 work was originally committed to a misconfigured parent repo (`aaasocial/F1Dashboard`) because the project working tree sat inside a home-directory-rooted git repo. On 2026-05-26 the W2V subdirectory history was extracted via `git filter-repo` and fast-forwarded onto `aaasocial/Word2Vec-Topology-Genre-Detector` master (`af43deb → fb504a7`, 121 new commits + 18 LFS objects, 272 MB upload). The v2.0-data Release was republished to the correct repo; the home-directory git repo was deinitialized. Full migration sidebar in `08-04-SUMMARY.md`.

### Phase 9 plan 09-01 complete (2026-05-27)

Plan 09-01 landed the SVM calibration spike + retrain + D-40 lineage extension + Wave-0 test scaffolds (DEPTH-01):

- **D-37 winner: libsvm_platt** (Brier 0.3459 << 0.6041 for CalibratedClassifierCV-StratifiedKFold-5; delta 0.2583 >> 1e-3 tie-break threshold).
- **D-38 retrain:** `data/models/svm_pipeline.joblib` rotated; `predict_proba` now returns (n, 8) rows summing to 1.0 ± 1e-6. Deployed-model Brier on in-comparison hold-out: 0.0481.
- **D-39 evidence:** `results/v2_calibration_report.md` + `results/figures/v2_calibration_reliability.png` written. Contains Brier table, reliability PNG, entropy distribution, and the load-bearing `## Entropy threshold decision` YAML block.
- **D-40 lineage:** schema extended with `calibration_method` / `calibration_brier_score` / `calibration_report`. `verify_svm_lineage` refuses pre-Phase-9 SVMs (missing `calibration_method`) and any value outside the `{libsvm_platt, calibrated_cv_sigmoid}` allow-list.
- **Q4 entropy decision: `tighten`.** Defaults fired on 9/17 (53%) hold-out (within 50-80% band). Operative thresholds: gap < 0.2801 (p25) OR normalized entropy > 0.7738 (p75). These values land in `backend/pipeline/explain.py` via plan 09-03.
- **Wave-0 scaffolds:** 6 explain math tests + 4 lineage calibration tests + deterministic 600-D feature_vec_sample.npy fixture.
- **Single source of truth:** `scripts/constants.py::HOLDOUT_GUTENBERG_IDS` is now the sole place the 20 pinned hold-out ids live (T-9-31 mitigation: 06_validate asserts the constant matches v1_baseline JSON at runtime).

Plan-research deviations auto-applied:

- Rule 1 bug: plan-prescribed `cv=LeaveOneOut()` for CalibratedClassifierCV is rejected by sklearn 1.6.1 for multiclass. Substituted `StratifiedKFold(n_splits=5)`.
- Rule 3 blocker: `data/features/` missing on fresh machine; created `scripts/rebuild_per_book_artifacts.py` to regenerate per-book outputs from the existing W2V model without rotating `w2v_model_sha256`.
- Rule 1 bug: two `test_lineage_smoke.py` tests asserted the pre-D-40 contract; updated to pass `calibration_method` through and assert the new D-40 fields + rotated `created_by` provenance.

### Phase 9 plan 09-02 complete (2026-05-27)

Plan 09-02 landed the build-time explain artifact (D-50) + run-time FastAPI lifespan extension (Q6) (DEPTH-04 + DEPTH-06):

- **D-50 artifact:** `data/models/explain_artifacts.npz` (269.7 KB LFS-tracked) emitted with six canonical keys -- `feature_matrix_l2` (151, 600) float32 alpha-weighted + L2-normed (matches runtime feature_vec layout), `book_metadata` (151,) object array of dicts, `per_genre_centroids` (8, 150) float32 L2-normed, `genre_names` (8,) object array, `cluster_to_representative_words` (200,) object array of 10-word-lists, `metadata` dict with `corpus_hash=3f4fe940...` + `w2v_model_sha256=cd81f9e6...` + window + k_clusters + alpha + created_utc.
- **Q6 lifespan extension:** `backend/api/app.py` now loads `svm_pipeline` + `w2v_model` + `genre_names` + `lineage` + `explain_artifacts` + `nn_index` (fitted `NearestNeighbors(5, euclidean)`) + `params` onto `app.state`. Defaults-first + isolated try/except per sub-load (Pitfall 3). `verify_svm_lineage` gates `app.state.calibration_available`.
- **Pitfall 5 drift check:** lifespan cross-checks artifact metadata.corpus_hash vs lineage.corpus_hash; mismatch sets `nn_index = None` and logs (NOT raises) so `/health` stays green and `/explain` can 503 cleanly (T-9-06 mitigation).
- **Q7 LFS gap closed:** `.gitattributes` now LFS-tracks `data/models/*.npz` -- verified via `git check-attr filter` returning `filter: lfs` (T-9-10 mitigation).
- **CLAUDE.md Fresh Machine Setup updated** with the new `python -m backend.pipeline.precompute_explain --window 15` step.
- **12 tests green:** 7 schema tests (`backend/tests/test_explain_artifacts.py`) + 5 lifespan contract tests (`backend/tests/test_app_lifespan.py`).
- **Lifespan memory footprint observed:** ~78 MB total (5 MB SVM + 70 MB w2v + 3 MB explain_artifacts + 0.4 MB nn_index) -- well within Railway 1 GB worker budget (T-9-09 acceptable per CONTEXT.md).

Plan-research deviations auto-applied:

- Rule 1 bug: plan code referenced `book["id"]` but `corpus/books.yaml` uses `gutenberg_id`; added fallback for both keys in `compute_per_genre_centroids` + `book_meta_lookup` builder.
- Rule 1 bug: `np.savez_compressed` auto-appends `.npz` to non-`.npz` filenames -- plan's `tmp_path = out_path.with_suffix(".npz.tmp")` produced `explain_artifacts.npz.tmp.npz` on disk while `os.replace` looked for `explain_artifacts.npz.tmp`. Renamed temp file to `explain_artifacts.tmp.npz` so the auto-append no-ops.
- Rule 1 bug: `np.array(list_of_equal_length_lists, dtype=object)` collapses to a 2-D array (200, 10). Switched to pre-allocated 1-D object array with explicit element assignment so `cluster_to_representative_words[i]` is a Python list as the contract requires.

### Phase 9 plan 09-03 complete (2026-05-27)

Plan 09-03 landed the backend explainability spine (DEPTH-03 + DEPTH-04 + DEPTH-05 + DEPTH-07):

- **Task 1 -- math + Pydantic spine** (`3bee4b7`): `backend/pipeline/explain.py` exports 7 helpers (multiclass_brier_score, normalized_entropy, compute_uncertainty_metrics, compute_track_contributions with batched (3,n_features) predict_proba per Pitfall 2, find_nearest_training_books, compute_driving_words with tfidf-desc + alpha-tiebreak sort + OOV skip, explain_cache_key). The operative entropy thresholds (`ENTROPY_BADGE_DEFAULT_TOP1_TOP2_GAP = 0.2801`, `ENTROPY_BADGE_DEFAULT_NORMALIZED_ENTROPY = 0.7738` from `results/v2_calibration_report.md`) are the SINGLE source of truth -- callers import them, never re-declare. `backend/pipeline/classify.py::predict_top_n` returns the full ranked list using calibrated `predict_proba` + `classes_`; legacy `predict_genre` is a thin top-1 wrapper for back-compat. `backend/api/models.py` gains 8 new Pydantic models with `extra='forbid'` (TopNPrediction, NearestTrainingBook, TrackContribution/s, DrivingWord, UncertaintyMetrics, ExplainResponse, ExtendedClassifyResult).
- **Task 2 -- worker hand-off** (`4795ad5`): `backend/worker/jobs.py::classify_book` now writes `feature_vec:{job_id}` as `np.float64.tobytes()` to Redis with `ex=300` (5-min TTL per D-47) between step 5 and step 6. Step 6 calls `predict_top_n`; the SSE result payload gains `top_n` (length 8, sorted desc, sums to 1.0), `entropy`, `top1_top2_gap`, `badge_fires` (precomputed using the operative thresholds). Legacy keys (`predicted_genre`, `confidence`, `oov_word_count`, `total_words`, `processing_time_s`) preserved verbatim.
- **Task 3 -- /explain endpoint** (`b859ab0`): `backend/api/routes/explain.py` implements POST `/api/classify/{job_id}/explain` with a 9-step defense-in-depth flow: UUID4 validation (T-9-12) -> calibration gate -> NN/artifacts gate (Pitfall 3) -> Redis gate -> feature_vec read (D-47, shape-validated against T-9-16) -> cache lookup (D-48: `explain:{sha256(feature_vec)}:{w2v_model_sha256[:16]}`) -> compute payload -> Pydantic validation -> cache SET with `ex=3600`. Canonical 410 phrasing "Upload expired — re-upload to see the explanation." preserved verbatim per D-49. Driving-words surrogate sourced from the upload's vocab slab + `cluster_to_representative_words` (no new Redis hand-off needed). `backend/api/app.py` mounts the new router additively without modifying the lifespan function 09-02 wrote.
- **Latency measured:** cache-miss p50 = **15 ms** / cache-hit p50 = **1 ms** on the deployed v2 SVM (TestClient + MagicMock Redis). Well under the 200 ms ARCHITECTURE.md §5b target. The batched (3, n_features) predict_proba delivered a **2.79× speedup** over three separate calls (1.48 ms → 0.53 ms), beating Pitfall 2's 1.5× estimate.
- **38 new tests:** 24 explain-math (uncertainty range + badge fire/no-fire at operative thresholds + threshold override + cache key shape + rotation + batched-call assertion + 50/50 fallback on zero total + NN order + driving-words sort + OOV skip + max_n cap + top-N sum-to-1 + real-SVM integration), 8 endpoint integration (happy + 410 + 3×503 + 404 + cache-hit short-circuit + cache-miss writes ex=3600). Suite total under the Phase 9 surface: **90 tests passing, 26.71 s**.

Plan-research deviations auto-applied:

- Rule 1 bug: plan `<action>` hardcoded research-default thresholds (0.10 / 0.7) while the same plan's `<success_criteria>` mandated operative thresholds (0.2801 / 0.7738). Honored the success criteria + 09-01 SUMMARY's explicit "plan 09-03 reads these values verbatim" callout. Tests verify callers CAN pass the un-tightened defaults if needed.
- Rule 1 bug: legacy `test_predict_genre_returns_tuple` mocked the v1 SVM API (`predict` + `decision_function`); updated to the new `predict_proba` + `classes_` contract.
- Rule 1 bug: `test_jobs_imports_pipeline_functions` asserted the old single-name import line; updated to match the new `predict_genre, predict_top_n` + `compute_uncertainty_metrics` imports. Added two new tests for the D-47 Redis write + SSE result Phase 9 additions.
- Rule 1 bug: module-scoped TestClient fixture leaked MagicMock instances into lifespan-exit `await app.state.redis.close()` (TypeError). Fix: snapshot original redis at fixture entry, restore in try/finally.

### Phase 9 plan 09-04 complete (2026-05-27)

Plan 09-04 landed the frontend SSE field wiring + top-N + uncertainty badge (DEPTH-02 + DEPTH-07):

- **Task 1** (`d16db8c`): `frontend/src/types/explain.ts` exports 7 TS interfaces mirroring backend Pydantic verbatim; `uploadStore.ClassificationResult` gains 4 optional Phase 9 fields (`top_n?`, `entropy?`, `top1_top2_gap?`, `badge_fires?`); `useClassify.ts` SSE `done` handler forwards the new fields into `setResult`.
- **Task 2** (`9a7c2a1`): `TopNList.tsx` (top-3 horizontal probability bars + collapsible "+5 more" expander revealing all 8 genres; D-41/D-42) + `UncertaintyBadge.tsx` (conditional "Low confidence" badge with D-52 canonical tooltip; renders null when `badge_fires !== true`). 14 vitest tests covering sort order, default-3-visible / 8-after-expand, percent formatting, bar-fill width, color fallback, empty input, badge conditional render, D-52 tooltip phrasing.
- **Task 3** (`ddbbe94`): `ClassificationResult.tsx` rewired to mount `<TopNList>` + `<UncertaintyBadge>` with backward-compat fallback (synthesizes single-row top-N when `result.top_n` is absent). Mount points scoped so 09-05 can land Why-button + ClassificationExplain between OOV line and View in Scatter button without conflict.
- **Pre-existing test failures logged** to `.planning/phases/09-classification-depth/deferred-items.md`: `useClassify.test.ts` (5 failures, EventSource vs WebSocket mock mismatch from SSE migration) + `SlowTierParams.test.tsx` (1 failure, `setH2Enabled is not a function`). Confirmed pre-existing via `git stash` re-run; out of scope for this plan.

### Phase 9 plan 09-05 complete (2026-05-27)

Plan 09-05 landed the Why-this-genre explain frontend (DEPTH-03 + DEPTH-04 + DEPTH-05 + DEPTH-06):

- **Task 1** (`5444102`): `frontend/src/lib/api.ts` extended with `ApiError extends Error` carrying `.status` and `.body` (backwards-compat: `instanceof Error` still matches; new `instanceof ApiError` callers access `.status`); `frontend/src/hooks/useExplain.ts` wraps `useMutation<ExplainResponse, ApiError>` calling POST `/classify/{job_id}/explain`. Routes 410 -> `opts.onExpired`, 503 -> `opts.onUncalibrated`; retry skips terminal 410/503 and any 4xx, otherwise up to 2 retries.
- **Task 2** (`118233d`): three minimum-viable sub-components in `frontend/src/components/sidebar/`: `NearestBooksList.tsx` (5-row list with color dot + title + author/genre + 3-decimal Euclidean distance), `TrackContributionBars.tsx` (topology + vocabulary bars with direction glyph ↑ green / ↓ red / · muted), `DrivingWordsPills.tsx` (pills with D-46 canonical "proxies -- not literal classifier inputs" disclosure copy). 18 vitest tests (6 per component) covering render, content, order preservation, fallback, empty input.
- **Task 3** (`f752e08`): `ClassificationExplain.tsx` orchestrates the three sub-components with a 5-branch state machine (expired -> uncalibrated -> isPending -> error -> success) + D-51 footnote linking to `results/v2_validation_report.md`; auto-fires useExplain on mount via useEffect keyed on jobId. `ClassificationResult.tsx` adds Why-button (`Why this genre?` / `Hide explanation`) between OOV line and View in Scatter button per 09-04's pre-planned mount point; conditional `{explainOpen && <ClassificationExplain />}` mounts below the View in Scatter button. 5 useExplain vitest tests (happy + 410 + 503 + no auto-fire + null jobId rejects).
- **All 37 Phase 9 frontend tests pass** (14 from 09-04 + 23 from 09-05); tsc --noEmit clean.
- **D-46 disclosure copy enforced as a contract:** the strings "proxies" and "not literal classifier inputs" both appear verbatim in `DrivingWordsPills.tsx` and are asserted via vitest. Phase 06 walkthrough's Step7ValidationLimitations component should mirror the D-51 footnote phrasing for cross-surface consistency.

Plan-research deviations auto-applied:

- Rule 1 bug: useExplain test `null jobId` originally polled `result.current.isError` via waitFor and flaked under fake timers. Switched to `await expect(mutateAsync()).rejects.toBeInstanceOf(ApiError)` which awaits the actual Promise rejection directly (canonical React Query test pattern for synchronous-throw mutationFn).
- Rule 3 blocker: `.git/refs/heads/master` was empty at plan start (`git log` reported "branch appears to be broken"). Restored from `.git/logs/refs/heads/master` reflog (last good commit `0684445`). No code/test impact; all task commits land normally.

### Known limitations (deferred to v2.1 / future phase)

- **CEXP-04 author-leakage BLOCKED** — v2 SVM generalizes poorly to unseen authors (15 of 34 multi-book authors score 0% when held out). Honest mitigation candidates for v2.1: max-N-per-author cap in corpus design, or per-author held-out fine-tuning routine.
- **86 dropped corpus rows** — listed in `.planning/research/v2/v1_to_v2_migration.md` "08.1 Final Resolution". Re-sourcing them via authoritative author bibliographies is a candidate for Phase 8.2 if corpus growth back toward 240 books is desired.
- **7 advisory code-review warnings** — see `08-REVIEW.md`. Can be addressed via `/gsd-code-review-fix 08` when convenient.
- **Frontend test-hygiene gaps** (logged to `.planning/phases/09-classification-depth/deferred-items.md`): `useClassify.test.ts` 5 failures (EventSource/WebSocket mock mismatch); `SlowTierParams.test.tsx` 1 failure (`setH2Enabled` missing). Both pre-existing; recommend follow-up quick fix.

### Next step

Phase 9 (Classification Depth) — plans 09-01..09-05 complete 2026-05-27. Backend explainability spine + frontend explain panel both landed; only plan 09-06 remains (walkthrough Step7ValidationLimitations + 09-VALIDATION.md sign-off + end-to-end test gate covering classify -> Why -> sub-components render -> 410 expiry path). Run `/gsd-execute-phase 9` to land 09-06 and close Phase 9.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260524-w2l | v1.0.1 patch: wire useRecompute into SlowTierParams + VerySlowTierParams | 2026-05-24 | b2d5ee7 | [260524-w2l-v1-0-1-patch-wire-userecompute-into-slow](./quick/260524-w2l-v1-0-1-patch-wire-userecompute-into-slow/) |

## Milestone v2.0 — Phases

| # | Phase | Status |
|---|---|---|
| 6 | v1 Bug-Fix Sweep | Complete (2026-05-23; commits 5a37a28, e57ea67) |
| 7 | Corpus Sourcing Research Spike | Complete (2026-05-25; CORPUS_SOURCING.md + VALIDATION_PROTOCOL.md + corpus_candidates.yaml + v1_baseline_results.json delivered) |
| 8 | Corpus Expansion | Complete (2026-05-26; v2.0-data Release published with D-31 disclaimer; v2 macro-F1 = 0.7367 vs v1 0.3235) |
| 9 | Classification Depth | Complete (2026-05-27; 6/6 plans; calibration + explain spine + Why panel; 91 tests green) |
| 10 | Visual Polish | Complete (2026-05-28; plan 10-01 landed in 22 commits; theme toggle + tour + 4 empty states + Playwright smoke test; 167 vitest + 9 playwright green) |
| 11 | Onboarding & Theme Defaults | Complete (2026-05-28; plan 11-01 in 6 commits; light default + no-FOUC + first-visit How-It-Works→tour chain; D-58/D-73 reversed; 167 vitest in-scope + 9 playwright green) |
| 12 | The Reading Room (redesign) | Complete (2026-05-29; 7/7 plans; full editorial front-end reskin/restructure reusing the data layer — masthead 8-screen library + Guide + 6-stop tour + Tweaks; RR-01..RR-09; Phase 10/11 indigo UI superseded; tsc 0, 167 vitest in-scope + 5 playwright green) |

## Accumulated Context

### v1.0 — Shipped 2026-04-13

Live at https://word2vec-topology-genre-detector-production.up.railway.app

| # | Phase | Outcome |
|---|---|---|
| 1 | Pipeline Validation Spike | 6-script CLI pipeline; 27 tests green; weighted VR homology proven via permutation test |
| 2 | API Layer and Job Queue | FastAPI + arq/Redis backend; pipeline refactored into `backend/pipeline/`; content-addressed cache; 34 tests green |
| 3 | Frontend Core and 3D Visualization | React + R3F scatter (PCA/KPCA/UMAP/t-SNE); brightness/hover/search/upload flow; 4/5 success criteria verified |
| 4 | Advanced Viz and Parameter Controls | Topology/Compare tabs; VR ε-slider; persistence heatmap (H₀/H₁); settings drawer; PNG/CSV export; 13/15 UAT pass |
| 5 | Deployment and Public Access | Dockerized; Railway deploy; models via GitHub Release asset; SSE replaces WS post-deploy |

### v1 Carry-overs (addressed in v2.0 Phase 6)

- H₂ homology not computed; H₂ tab tooltip not firing → BUG-01
- Persistence-diagram dot scaling unreadable → BUG-02
- BookSlider receives `books={[]}` — per-book slide-through hidden (needs corpus metadata endpoint) → BUG-03
- ROADMAP.md and STATE.md were 0 bytes on disk at v2.0 start (this rebuild restores them) → BUG-04
- Latent: `cache_key` does not include `corpus_hash` / `w2v_model_sha256` (must land before Phase 8 retrain) → BUG-05

### Key Architectural Anchors

- Single shared Word2Vec embedding space (mathematical invariant)
- Persistent homology runs in full N-D, never on projections
- TF-IDF fit corpus-wide without genre labels (no circular dependency)
- Both feature tracks L2-normalized before α-weighted concatenation
- `backend/pipeline/` functions accept `cancel_event` for cooperative cancellation
- Content-addressed cache: `sha256(step_name, params)` → result (will become `sha256(step_name, params, corpus_hash, w2v_model_sha256)` after BUG-05)
- Frontend state in Zustand; React Query for server cache with `staleTime: Infinity` on precomputed data

### v2.0 Phase Map (drafted 2026-05-22)

| # | Phase | Goal | Requirements |
|---|---|---|---|
| 6 | v1 Bug-Fix Sweep | Close H₂, BookSlider, dot-scaling, planning-doc, and latent cache-key bug before any retrain | BUG-01..05 |
| 7 | Corpus Sourcing Research Spike | Defensible written plan for sources, per-genre counts, author distribution, validation protocol — research only | RES-01..03 |
| 8 | Corpus Expansion | Larger, balanced, author-diverse corpus; retrained model beats v1 baseline on frozen test | CEXP-01..05 |
| 9 | Classification Depth | Top-N calibrated predictions + "why this genre?" with nearest-neighbours + per-track contribution | DEPTH-01..07 |
| 10 | Visual Polish | Light/dark/system theming, onboarding tour, empty-state polish — horizontal sweep last | POLISH-01..05 |

### Key Decisions Recorded in v2.0 Research

- **H₂ is visualisation-only in v2** — not a feature-vector input (`ARCHITECTURE.md §5a` + `PITFALLS.md §3`).
- **Explainability via nearest-neighbour + per-track contribution** — no synchronous Kernel SHAP (`ARCHITECTURE.md §5b` + `PITFALLS.md §8`); commits to option (c) from `ARCHITECTURE.md §11`.
- **Theme store separate from visualization store** — different lifetimes (persisted vs session) (`ARCHITECTURE.md §5c`).
- **Dark mode last** — horizontal concern touching ~30 components (`ARCHITECTURE.md §6`).
- **Cache-key correction (BUG-05) in Phase 6, not Phase 8** — prevents stale-cache footgun during retrain (`ARCHITECTURE.md §10`).
- **Within Phase 6: BookSlider before H₂** — smaller "new endpoint" pattern proves out first (`ARCHITECTURE.md §6`).

## Performance Metrics

| Metric | Target | Current |
|---|---|---|
| v2 macro-F1 (v1-frozen test set) | > v1 baseline | **0.7367** (vs v1 0.3235; +41pp; p=0.0010) ✓ |
| Per-author held-out gap vs LOOCV | ≤ 15pp | **45.03pp** (BLOCKED — v2.1 follow-up needed) ✗ |
| H₂ P95 runtime per book | < 30s | — (deferred — H₂ removed from v2 per ROADMAP success criterion #1) |
| Explainability response time | < 5s (target ~200ms) | — (measured in Phase 9) |
| Corpus metadata endpoint payload | < 100KB total | ~35 KB ✓ |
| Phase 09 P02 | 25min | 2 tasks | 7 files |
| Phase 09 P03 | 35 | 3 tasks | 10 files |
| Phase 09 P04 | 7min | 3 tasks | 9 files |
| Phase 09 P05 | ~5min | 3 tasks | 11 files |
| Phase 09 P06 | 18min | 3 tasks | 4 files |
| Phase 10 P10-01 | ~6h | 12 tasks | 40 files |
| Phase 11 P11-01 | 6min | 6 tasks | 6 files |
| Phase 12 P12-01 | 40min | 6 tasks | 14 files |
| Phase 12 P12-02 | ~7min | 4 tasks | 9 files |
| Phase 12 P12-03 | ~6min | 4 tasks | 10 files |
| Phase 12 P12-04 | ~10min | 3 tasks | 7 files |
| Phase 12 P12-05 | ~11min | 4 tasks | 11 files |
| Phase 12 P12-06 | ~10min | 4 tasks | 7 files |
| Phase 12 P12-07 | ~10min | 3 tasks | 16 files |

## Open Blockers

**B-08-01 — RESOLVED (2026-05-26).** Phase 8 corpus integrity blocker resolved via Phase 8.1 drop strategy. v2 corpus is 154 verified-clean books; 0 SERIOUS in final audit; v2.0-data Release published to `aaasocial/Word2Vec-Topology-Genre-Detector`. CEXP-04 author-leakage gap (45pp) is documented as v2.1 follow-up, not blocking Phase 9.

---

Phase 8 plans the **4-wave structure** (build → retrain → validate → release) per 08-CONTEXT.md D-22. Wave 1 includes `scripts/build_corpus.py` (D-24 upgraded CEXP-05 from P2 to P1) and the byte-identical re-run of `scripts/phase7_v1_baseline.py` as the entry gate.

Documentation drift to clean up (folded into Wave 4 per D-34, no longer a separate `/gsd-docs-update` pass):

- REQUIREMENTS.md CORPUS-01 still says "3 genres × 5 books"; PROJECT.md "Validated" list mirrors this. v1 actually shipped with 10 genres × 10 books per commit db7b1f8 (2026-04-13); v2 ships with 8 genres × 30 books = 240 books per Proposal A.
- ROADMAP.md "v1 outcomes" implicitly references the same stale framing.
- CEXP-01..05 traceability rows flip from Pending → Validated per-wave (D-36), not as a terminal sweep.

## Session Continuity

**Stopped at (2026-05-29):** Completed 12-07-PLAN.md — **Phase 12 (The Reading Room) COMPLETE (7/7 plans).** The closing responsive + animation-robustness pass (RR-09) via `/gsd-execute-phase 12`. Two atomic task commits (`4b61181` feat: fluid responsive editorial layout · `b2dabde` fix: animation-robustness) + this docs/closeout commit (12-07-SUMMARY + STATE/ROADMAP/REQUIREMENTS/PROJECT + the ReadingDesk duplicate-className fix). **Responsive (§10/L-14):** screen column grids moved out of inline styles into reusable `index.css` classes (`.rr-carrel/-card`, `.rr-verdict`, `.rr-desk`, `.rr-folio`, `.rr-topo`) with `@media` breakpoints — drop marginalia/sibling-rail/topology-side-panels/study-center-binding at ≤1100px, stack to one column in source order at ≤768px; `.rr-dense` keeps the `study` density 2-col fallback at any width; `.rr-shell` lifts the `100vh/overflow:hidden` artboard lock below 768px so stacked columns scroll; plate `min-height:320` clamp; tour card clamped to viewport. No fixed artboard. **Robustness (§7/L-08):** the 5 Guide figures + VR birth-fade + probability fills were already background-tab-safe (12-06); fixed the topology loading skeletons (unreachable/undefined `pulse` keyframe → static "reading…" frames) and visibility-gated FigVerdict's replay so a backgrounded tab can't strand the bars at width:0. **Verification:** tsc 0; vite build clean (715 modules); Vitest 167 in-scope green (6 Phase 9 deferred unchanged, none retired); Playwright 5/5 green (incl. the end-to-end 6-stop tour). Manual screenshot sweep confirmed no indigo, "marginal" voice, topology H₁-only + N-D disclaimer. RR-09 complete → RR-01..RR-09 all met → **Phase 12 closed.**

**Next command:** Phase 12 is the last planned phase of milestone v2.0. Run `/gsd-complete-milestone` to close v2.0 (Accuracy, Depth, and Polish — Phases 6–12 all complete), or `/gsd-discuss-phase 13` / `/gsd-plan-phase` if new work is scoped. Optional in-browser confirmation first (needs backend :8000 up): at three widths (~wide / ~1000px / ~700px) walk all 8 routes + Guide + tour + Tweaks — confirm the marginalia/sibling rail/topology side panels drop ~1100px, columns stack in source order ~768px, the Guide goes full-width, the tour card clamps, and no figure goes blank when the tab is backgrounded.

---

**Prior (12-06):** Completed 12-06-PLAN.md — Phase 12 (The Reading Room) Guide side-sheet + 6-stop guided tour (RR-07/RR-08) via `/gsd-execute-phase 12`. Three atomic feat commits (`eea2f69` → `2ef0f14` → `3df110c`) + this docs commit. **The Guide (§6.9):** `components/guide/Guide.tsx` — 480-wide right side-sheet, header "Reader's aid / The Guide", 3 tabs (01 Welcome "three things" card · 02 How to wander "Begin the guided tour" [closes sheet + `startTour()`] + 6-stop itinerary · 03 How it works = the 5 figures), footer (Continue / Enter the room →), backdrop close. **Auto-opens once per browser** via persisted `guideSeen` (semantic key `rr.guide.seen.v1`, consume-on-fire in an App mount effect); masthead "Guide" reopens. **5 live figures (§6.9 / L-08):** `components/guide/GuideFigures.tsx` — FigWordEmbed/FigCentroid/FigTopology(auto-sweep ε + drag-scrub)/FigProjection/FigVerdict, all **render a valid static frame at rest** + degrade safely in a background tab (FigTopology seeds ε=0.18, FigVerdict inits bars at target width — no opacity:0→forwards gating, no document-timeline dependence). Supersedes the Phase 9/10 `PipelineExplanation` modal visuals (already unmounted since 12-01). **6-stop tour (§6.10 / L-09/L-10):** `tour/anchors.ts` TOUR_STEPS → the 6 reading-room stops (each w/ its route) — ①plate ②catalog-rail (collection) ③catalog-card (card) ④topology-plate (topology, **pre-selects Mystery**) ⑤study-pickers (study) ⑥reading-desk (upload). Store-driven `GuidedTour` (`tour/TourProvider.tsx`) navigates `goTo()` per stop + `setSelectedGenre('mystery')` before Topology so the region-gated VR hero mounts; `tour/TourOverlay.tsx` reskinned to **four dim panels** (`rgba(38,33,27,0.46)`) + 1.5px accent frame + corner ticks, margin card pinned to the viewport quadrant **opposite** the anchor (STOP n/6 · ← Back · Next → · End tour); ←/→/Esc; missing anchor → ~700ms wait then advance. **Replaces** (not stacks on) the Phase 10 single box-shadow glow + 4-step script; legacy `TourProvider`/`useTour` kept as store-backed shims for the dead HelpDropdown. `App.tsx` mounts `<Guide />` + `<GuidedTour />`. tsc clean; vite build clean (715 modules, +4 vs 711); 167 Vitest in-scope green (6 Phase 9 deferred unchanged); Playwright **5/5 green** (per-masthead anchor checks + an end-to-end 6-stop tour test stepping through every anchor incl. the masthead-less Card; backend :8000 up). RR-07 + RR-08 complete.

**Next command:** `/gsd-execute-phase 12` to land 12-07 (responsive + animation-robustness pass, final theme/Tweaks verification, suite + Playwright green, RR-09) — the last plan, which closes Phase 12 / The Reading Room redesign. Optional in-browser verification of 12-06 first (needs backend :8000 up): clear `rr.guide.seen.v1` (or use a fresh profile) and reload → the Guide auto-opens once; flip to "03 How it works" → confirm all 5 figures animate at rest (and keep a coherent frame when the tab is backgrounded); "02 How to wander" → "Begin the guided tour" → step Next through all 6 stops and confirm the four-panel spotlight + corner-ticked accent frame frames each screen's anchor, the margin card sits opposite the anchor, stop ④ lands on Topology with Mystery already selected, and ←/→/Esc work; compare against `09-guide-how-it-works.png` + `10-guided-tour.png`.

**Decision (12-03):** Card plate detail is SVG, not R3F. The reused R3F scatter is WORD-keyed (12-02) so it has no book points to highlight or draw leader lines to; SVG over deterministic id-seeded book positions renders `03-catalog-card.png` faithfully and honours D-U1's nuance (detail/decorative plates = SVG, one WebGL context per app). `CorpusBookFull` carries no x/y, year, vocab, or shelfmark — those are derived deterministically (id-seeded, Known Stubs); all real fields (title/author/genre/word_count/driving vocabulary/region membership) come from the hook. studyA/studyB live in the shell store, default Mystery & Romance.

**Next command:** `/gsd-execute-phase 12` to land 12-04 (Submit a Text → The Reading). Optional in-browser verification first (needs backend :8000 + Redis + arq up): masthead → The Collection → click a title (or rail expand) → Catalog card (breadcrumb, siblings rail swaps selection, plate detail with leader lines, letterpress card); masthead → A Comparative Study → swap the two pickers (Mystery & Romance default), folio shows shared/distinctive vocab + Venn motif + Editor's note; compare against 03-catalog-card.png + 05-comparative-study.png.

**Prior (Phase 11 archived):** plan 11-01 complete 2026-05-28 (`0f0d111` → `8397206`): light default + no-FOUC + How-It-Works→tour chain. Phase 12 D-U2 supersedes this front end (the Phase 10/11 indigo UI is now replaced; their milestone requirements remain historically met).

**Prior (Phase 10 archived):** `/gsd-discuss-phase 10` paused at "select gray areas"; design brief at `.planning/phases/10-visual-polish/10-CLAUDE-DESIGN-BRIEF.md` (commit b6b4447) was folded into 10-CONTEXT.md and Phase 10 shipped.

**Reading order for the next Phase 10 session:**

1. `.planning/phases/10-visual-polish/10-CLAUDE-DESIGN-BRIEF.md` — the brief that defines what Claude Design produced output against (read FIRST)
2. `.planning/phases/09-classification-depth/09-CONTEXT.md` — D-54 (no Playwright until Phase 10) + D-55 (inline-hex used in Phase 9 — Phase 10's sweep target)
3. `.planning/phases/08-corpus-expansion/08-CONTEXT.md` — frontend genre relabel was explicitly deferred to Phase 10 (gothic_horror, speculative keys)
4. `.planning/phases/06-v1-bug-fix-sweep/06-CONTEXT.md` — theme store separation rationale (lifetimes: persisted vs session)
5. `.planning/phases/03-frontend-core-and-3d-visualization/03-CONTEXT.md` — dark theme as default established here
6. `.planning/research/PITFALLS.md` §13 (scene background must not remount canvas) + §14 (tour anchors brittle without centralization)
7. `.planning/research/ARCHITECTURE.md` §5c (theme store lifetime split) + §5d (tour library tradeoffs) + §6 (why dark mode is the horizontal sweep)
8. `.planning/REQUIREMENTS.md` POLISH-01..05 verbatim
9. `.planning/ROADMAP.md` §"Phase 10: Visual Polish" — success criteria + open tour-library decision
10. `frontend/src/index.css` — existing `:root` HSL variables (need light-mode counterparts)
11. `frontend/src/constants/genres.ts` — v1 palette (needs v2 key update)

### Phase 9 history (closed 2026-05-27 — kept for context)

Original Phase 9 reading order remains valid for any retrospective work:

- `09-CONTEXT.md` (D-37..D-55) + `09-DISCUSSION-LOG.md` (alternatives)
- `09-VERIFICATION.md` + `09-VALIDATION.md` + `09-HUMAN-UAT.md` (7 items pending live walkthrough)
- `09-REVIEW.md` (0 critical / 5 warnings / 8 info — advisory)
- `data/models/svm_pipeline.joblib.lineage.json` (calibration_method=libsvm_platt, brier=0.0481)
- `results/v2_calibration_report.md` (D-51 walkthrough disclaimer links here)

**Phase 9 decision summary (D-37..D-45 user-authored, D-46..D-55 research-inherited):**

- **Calibration**: empirical pick between libsvm Platt and `CalibratedClassifierCV` LOOCV sigmoid via reliability diagram on the 20-book hold-out; lower-Brier winner ships; loser archived in `results/v2_calibration_report.md`; lineage extended with `calibration_method`/`calibration_brier_score`/`calibration_report`.
- **Top-N**: top-3 horizontal probability bars + collapsible "+5 more" expander revealing all 8 genres; 1-decimal percent labels; sorted descending.
- **Explainability**: local per-upload zero-ablation for topology vs vocabulary (two extra SVM calls); 5 nearest training books on L2-normalized features with Euclidean distance; BOTH P2 items ship (DEPTH-06 driving words + DEPTH-07 entropy badge) as separable atomic plans.
- **Research-inherited (skipped areas)**: `POST /api/classify/{job_id}/explain` synchronous ~200ms; Redis `feature_vec:{job_id}` 5-min TTL + `explain:{hash}:{model_hash}` 1-h TTL; 410 Gone on expiry; new `precompute_explain.py` artifact; walkthrough + Why-panel-footnote disclaimer; math unit tests + integration test (no Playwright); inline-hex styling deferring CSS-var sweep to Phase 10.

---
*v1.0 shipped: 2026-04-13*
*v2.0 milestone started: 2026-05-22*
*Last updated: 2026-05-27 — Phase 8 complete (2026-05-26); Phase 9 context gathered via interactive `/gsd-discuss-phase 9` (9 user-authored decisions, 10 research-inherited)*
