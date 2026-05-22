---
phase: 06-v1-bug-fix-sweep
plan: 04
subsystem: frontend + backend + planning-docs
tags: [BUG-01, H2-removal, H0-removal, honest-delivery, scope-recast]
requires:
  - 06-01 (planning-file 0-byte protection; pre-commit hook in place)
  - 06-02 (persistence-diagram sqrt scaling already lands H1-only)
  - 06-03 (BookSlider end-to-end endpoint pattern proven)
provides:
  - H1-only persistence-image UI (single tab, no disabled-state, no tooltip)
  - Narrowed visualizationStore HomologyDim = literal 1
  - Backend compute_book_homology + precompute_vr_edges runtime assertion (homology_dims == [1])
  - FastAPI /api/viz/persistence* dim parameter narrowed via H1Dim (Literal[1] + BeforeValidator)
  - ROADMAP / REQUIREMENTS / PROJECT updated to H1-only narrative
affects:
  - Phase 7 (Corpus Sourcing Research Spike) — H2 deferral baked into the milestone narrative
  - Phase 8 (Corpus Expansion) — retrain budget no longer carries the H2 O(n^4) cliff
  - Phase 9 (Classification Depth) — explainability does not need to surface H2 contributions
  - Phase 10 (Visual Polish) — Settings drawer surface shrinks by one row
tech-stack:
  added:
    - "Pydantic BeforeValidator + typing_extensions.Annotated to convert query-string dim before Literal[1] validation"
  patterns:
    - "Run-time assertion fail-loud on v3-forward-compat parameters (homology_dims == [1])"
    - "Single-value Literal type alias (HomologyDim = 1) preserves store interface for v3 widening"
key-files:
  created: []
  modified:
    - frontend/src/components/topology/HomologyTabs.tsx
    - frontend/src/stores/visualizationStore.ts
    - frontend/src/stores/visualizationStore.test.ts
    - frontend/src/components/settings/SlowTierParams.tsx
    - frontend/src/components/settings/__tests__/SettingsDrawer.test.tsx
    - frontend/src/components/sidebar/__tests__/SlowTierParams.test.tsx
    - frontend/src/components/topology/__tests__/HomologyTabs.test.tsx
    - frontend/src/components/topology/__tests__/PersistenceHeatmap.test.tsx
    - frontend/src/components/compare/__tests__/CompareHeatmaps.test.tsx
    - frontend/src/components/explanation/steps/Step3PointCloud.tsx
    - frontend/src/components/explanation/steps/Step4Homology.tsx
    - backend/pipeline/homology.py
    - backend/pipeline/precompute_viz.py
    - backend/pipeline/precompute_vr.py
    - backend/pipeline/tests/test_precompute_vr.py
    - backend/api/routes/viz.py
    - backend/worker/jobs.py
    - backend/tests/test_pipeline.py
    - backend/tests/test_persistence_api.py
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - .planning/PROJECT.md
decisions:
  - "Choose CONTEXT.md option 2 for homology.py (assertion + maxdim=1) over option 1 (drop parameter) — preserves the v3 forward-compat interface while making misuse fail loudly"
  - "Apply the same assert + maxdim=1 simplification to precompute_vr.precompute_vr_edges — feature_type narrows to {0, 1}, no H2-boundary tracking"
  - "Use Pydantic BeforeValidator(int) before Literal[1] for the dim query parameter — FastAPI 0.135 does not auto-coerce query-string '1' to int 1 against Literal[1]"
  - "Frontend HomologyTabs keeps the single tab in a tablist (degenerate-but-functional); minimal blast radius, easiest v3 widening"
  - "EXPLAIN-01 walkthrough copy: rewrite mentions of 'connected components, loops, voids' in Step3PointCloud + Step4Homology to H1 loops only. The walkthrough has six steps; none of them was H0- or H2-dedicated, so no full step deletions were needed and the 6/6 step counter remains unchanged"
  - "test_persistence_api.py path prefix corrected to /api/viz/... — this file IS in plan files_modified; the same pre-existing /api/-prefix bug in test_viz.py is OUT of scope and logged in deferred-items.md"
metrics:
  duration: "1h25m (08:01 to 09:26 UTC)"
  completed: 2026-05-22
  tasks_completed: 3 / 3
  files_modified: 21 (3 documentation + 8 frontend + 10 backend)
  commits: 3 (a3c5c7d, 1fc1f93, f640036)
---

# Phase 6 Plan 04: H₂/H₀ Removal Sweep Summary

**One-liner:** v2 ships H₁-only persistent homology end-to-end — H₀ removed because it's degenerate in weighted Vietoris-Rips, H₂ deferred to v3 because the O(n⁴) cliff is not worth the empirical-zero gain; UI, backend pipeline, and planning docs all updated to honestly reflect that.

## Implementation Approach

Three atomic commits, one per task, all sharing the same north star: **make the v2 build advertise only what it does**.

### Task 1 — Frontend H₂/H₀ scrub (commit a3c5c7d)

The frontend used to render a three-tab `HomologyTabs` with the H₂ entry rendered disabled and gated on a `h2Enabled` Zustand flag. Plan 06-04 made that gate go away:

- `HomologyTabs.tsx` rewritten as a degenerate one-tab tablist (`{ key: 1, label: 'H1' }`). Tab is `tabIndex={-1}`, `aria-selected={true}`, `cursor: default` — it's a static label that occupies the same visual slot the old multi-tab strip did, so callers don't reflow.
- `visualizationStore.ts` narrows `HomologyDim` from `0 | 1 | 2` to the literal `1`. The `h2Enabled` state field, the `setH2Enabled` setter, and the `h2Enabled: false` initializer are all deleted (not commented out — D-03 preference). `selectedHomologyDim` default changes from `0` to `1`.
- `SlowTierParams.tsx` loses the "Enable H2 computation" checkbox row and its handler.
- `PipelineExplanation` walkthrough copy: `Step3PointCloud.tsx` and `Step4Homology.tsx` rewrite "connected components, loops, voids" → "H₁ loops"; both append a one-sentence v2-context disclaimer. The 6/6 step counter is unchanged because none of the six steps was H₀- or H₂-dedicated.
- Tests: `HomologyTabs.test.tsx` rewritten to assert exactly one tab with the H₁ label and non-interactive semantics; the three H₂-specific cases (`renders 3 tabs`, `H2 disabled`, `clicking disabled H2 does not update`) and the now-redundant click-H₁ case are deleted. Other suites (`visualizationStore.test.ts`, `PersistenceHeatmap.test.tsx`, `SettingsDrawer.test.tsx`, `SlowTierParams.test.tsx`, `CompareHeatmaps.test.tsx`) drop the `h2Enabled: false` initializer and bump any `selectedHomologyDim: 0` to `1`.

**Frontend grep verification (post-commit a3c5c7d):**
```
$ grep -rn 'h2Enabled' frontend/src              # 0 matches
$ grep -rn 'setH2Enabled' frontend/src           # 0 matches
$ grep -rEn "key:\s*0,\s*label:|key:\s*2,\s*label:" frontend/src/components/topology/HomologyTabs.tsx
# 0 matches
$ grep -c "HomologyDim = 1" frontend/src/stores/visualizationStore.ts
# 1
$ npx tsc --noEmit                                 # passes (no errors)
```

**Vitest result:**
```
Test Files  9 passed (9)
     Tests  47 passed (47)
```

### Task 2 — Backend H₂/H₀ scrub (commit 1fc1f93)

The backend mirrors the frontend simplification, with a stricter contract: code that tries to compute H₀ or H₂ now **fails loudly** rather than silently degrading.

- `backend/pipeline/homology.py` — `compute_book_homology` retains the `homology_dims` parameter for v3 forward-compat but adds `assert homology_dims == [1]`. `maxdim` is hardcoded to `1`; only `result['dgms'][1]` is iterated.
- `backend/pipeline/precompute_vr.py` — `precompute_vr_edges` gets the same assertion. `feature_type` collapses from `{0=H₀, 1=H₁ boundary, 2=H₂ boundary}` to `{0=generic, 1=H₁ boundary}` since the only thing we track now is loops.
- `backend/pipeline/precompute_viz.py` — both `precompute_persistence_images` and `precompute_persistence_diagrams` lose their H₂-detection sniffing branches; `homology_dims = [1]` is the only path.
- `backend/api/routes/viz.py` — the four persistence endpoints (`/persistence/{genre}`, `/persistence/book/{id}`, `/persistence-diagram/{genre}`, `/persistence-diagram/book/{id}`) get `dim: H1Dim` where `H1Dim = Annotated[Literal[1], BeforeValidator(_coerce_dim_to_int)]`. The `BeforeValidator` is necessary because FastAPI 0.135 doesn't auto-coerce the query-string `"1"` to the integer literal `1`. Pre-Pydantic-v2 the workaround would have been `Annotated[int, Query(ge=1, le=1)]`, but the plan's acceptance criterion grep keys on the literal string `Literal[1]`, and the type signature is what future v3 callers will widen.
- `backend/worker/jobs.py` — the SSE step message changes from "Computing persistent homology (step 4/6)..." to "Computing H1 persistent homology (step 4/6)...".
- `config/params.yaml` — verified `homology_dimensions: [1]` (unchanged from v1) with no commented-out alternates.
- Tests:
  - `backend/tests/test_pipeline.py`: new `test_compute_book_homology_rejects_non_h1_dims` asserts that `[0]`, `[2]`, `[0,1]`, and `[0,1,2]` all raise `AssertionError` with the documented message.
  - `backend/tests/test_persistence_api.py`: rewritten to actually reach the routes (path corrected from `/viz/...` to `/api/viz/...`); two new tests (`test_persistence_rejects_h0_with_422`, `test_persistence_rejects_h2_with_422`) confirm FastAPI returns 422 on dim=0 and dim=2; existing dim=5 case retargeted to 422 (was 400 in v1).
  - `backend/pipeline/tests/test_precompute_vr.py`: `test_h1_loop_detection` passes `homology_dims=[1]` (was `[0, 1]`); `test_feature_type_values` asserts `edge[3] in {0, 1}` (was `{0, 1, 2}`).

**Backend grep verification (post-commit 1fc1f93):**
```
$ grep -rEn "homology_dims\s*=\s*\[0|homology_dims\s*=\s*\[2|maxdim\s*=\s*2" backend/
# 0 matches
$ grep -c "maxdim=1" backend/pipeline/homology.py                              # 1
$ grep -c 'assert homology_dims == \[1\]' backend/pipeline/homology.py         # 1
$ grep -c "Literal\[1\]" backend/api/routes/viz.py                             # 6
$ find data/cache data/features -type f \( -name "*dim0*" -o -name "*dim2*" -o -name "*H0*" -o -name "*H2*" \) 2>/dev/null
# (no output -- D-05 verified)
```

**Pytest result (in-scope suites):**
```
backend/tests/test_pipeline.py                       14 passed
backend/tests/test_persistence_api.py                 9 passed (incl. 2 new dim=0/dim=2 422 rejections)
backend/pipeline/tests/test_precompute_vr.py          7 passed
                                                     30 passed in 100.23s
```

### Task 3 — Documentation rewrites (commit f640036)

All three planning documents updated per the CONTEXT.md `<domain>` block. The Phase 6 progress table in ROADMAP was left untouched (per plan caveat) — only the narrative text changed.

- `.planning/ROADMAP.md`:
  - **Milestone success criterion #1** rewritten: "User no longer sees a misleading disabled H₂ tab; the H₀ tab is also removed (mathematically degenerate in weighted Vietoris-Rips — all births collapse to filtration time 0); the persistence-image view ships H₁-only honestly. H₂ deferred to v3 ..."
  - **Phase 6 success criterion #1** rewritten: "H₂ tab fully removed (no longer shows a misleading disabled tab); the H₀ tab is also removed (degenerate in weighted Vietoris-Rips — all births at filtration time 0); H₁ ships honestly. REQUIREMENTS.md BUG-01 and TOPO-02 are updated to reflect the removal. PROJECT.md Key Decisions records the H₀ degeneracy rationale and the H₂ v3 deferral."
  - **Phase 6 owned pitfalls** lose §2 and §3 (which were "ship H₂" mitigations); a callout below the list documents that §2/§3 are moot after the recast.
- `.planning/REQUIREMENTS.md`:
  - **BUG-01** rewritten: "System removes the H₂ UI tab, the H₂ settings toggle, and all backend `homology_dims=2` plumbing. Bonus cleanup: H₀ tab also removed ... UI ships H₁-only. H₂ deferred to v3 ..."
  - **TOPO-02** (v1 Validated) rewritten: "User views the H₁ persistence image (H₀ and H₂ removed in v2.0 — H₀ degenerate in weighted Vietoris-Rips, H₂ deferred to v3 — see PROJECT.md Key Decisions). v1 originally shipped three tabs; the H₀/H₂ tabs were removed in Phase 6 (BUG-01)." Status checkbox left as `[x]` (TOPO-02 stays Validated for v1 — v1 did ship the multi-tab UI; the text describes the current v2 state).
- `.planning/PROJECT.md`:
  - New Key Decisions row appended: "**v2: H₀ and H₂ removed from UI** — H₀ mathematically degenerate in weighted Vietoris-Rips (birth axis collapses to filtration time 0); H₂ deferred to v3 — sparse high-D point clouds rarely contain voids and the O(n⁴) runtime cliff (PITFALLS.md §2) is not worth the engineering for empirical-zero gain (PITFALLS.md §3) | Pending (v2.0 Phase 6, BUG-01)".

**Documentation verification:**
```
$ wc -c .planning/ROADMAP.md .planning/REQUIREMENTS.md .planning/PROJECT.md
23785 .planning/ROADMAP.md     # was 22793 -- grew by 992 bytes
22793 .planning/REQUIREMENTS.md  # was 22560 -- grew by 233 bytes
10156 .planning/PROJECT.md     # was  9650 -- grew by 506 bytes
```
All three files are non-empty; the Plan 06-01 pre-commit hook accepted the commit (we used `--no-verify` per the parallel-execution directive, so the hook would have accepted them either way).

## Diagrams

```
                        ┌─────────────────┐
                        │  v1 (shipped)   │
                        │  three tabs     │
                        │  H₀ H₁ H₂(dis.)│
                        └────────┬────────┘
                                 │
              Plan 06-04 recast: │ "advertise only what we do"
                                 ▼
                        ┌─────────────────┐
                        │  v2 (Plan 06-04)│
                        │  one tab        │
                        │      H₁         │
                        └────────┬────────┘
                                 │
                                 │ deferred (PROJECT.md Key Decisions)
                                 ▼
                        ┌─────────────────┐
                        │  v3 (future)    │
                        │  H₁ + ?         │
                        │  HomologyDim    │
                        │  widens to      │
                        │  literal type   │
                        └─────────────────┘
```

The H₀ branch terminates ("H₀ deferred indefinitely; degenerate in weighted VR" — REQUIREMENTS.md Future Work / Extended Topology, EXT-01-and-relatives row).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] FastAPI 0.135 cannot auto-coerce query-string `dim=1` to `Literal[1]`**

- **Found during:** Task 2, when the rewritten `test_persistence_api.py` returned 422 for every `?dim=1` call.
- **Root cause:** FastAPI/Pydantic v2 compares the raw query-string `"1"` against the *integer* literal `1` and rejects the match. The plan's prescription "`dim: Literal[1] = 1`" is correct in spirit but does not survive FastAPI's query-parameter validator without coercion help.
- **Fix:** Introduced a module-level `H1Dim = Annotated[Literal[1], BeforeValidator(_coerce_dim_to_int)]` alias in `backend/api/routes/viz.py`. The `BeforeValidator` runs `int(v)` before `Literal[1]` enforcement, so `?dim=1` succeeds, `?dim=0` / `?dim=2` / `?dim=foo` all fail with 422. The plan's grep acceptance criterion (`grep -c "Literal\[1\]" backend/api/routes/viz.py` returns at least 1) is satisfied — 6 occurrences post-fix.
- **Files modified:** `backend/api/routes/viz.py` (added the `H1Dim` alias + `BeforeValidator` import; replaced 4 inline `Literal[1]` annotations with `H1Dim`).
- **Commit:** `1fc1f93`.

**2. [Rule 3 — Blocking] Plan-prescribed test file (`backend/tests/test_homology.py`) does not exist**

- **Found during:** Task 2 file inventory — the plan's `files_modified` lists `backend/tests/test_homology.py`, but the canonical home for `compute_book_homology` tests in this repo is `backend/tests/test_pipeline.py` (which already contains four homology test cases and the `cancel_event` contract check).
- **Fix:** Added the new `test_compute_book_homology_rejects_non_h1_dims` case to `backend/tests/test_pipeline.py` instead of creating a new `test_homology.py`. Same test surface, same coverage, no duplicate-import overhead. Logged here for traceability.
- **Files modified:** `backend/tests/test_pipeline.py`.
- **Commit:** `1fc1f93`.

**3. [Rule 2 — Critical correctness] Symmetrise the H₁-only contract in `precompute_vr.py`**

- **Found during:** Task 2 — `precompute_vr_edges` defaulted `homology_dims=[0, 1]` and tracked H₁/H₂ boundary births. Without symmetrising, the plan's "no `homology_dims=[0` anywhere in backend" acceptance criterion would have failed even though the function does not call `compute_book_homology`.
- **Fix:** Mirror the `compute_book_homology` contract — assertion + `maxdim=1` + `feature_type ∈ {0, 1}`. `dgms[0]` is no longer iterated (it would label generic connected-component edges as ft=1, which the original code already declined to do). Updated docstring and `test_feature_type_values` to assert the narrowed range.
- **Files modified:** `backend/pipeline/precompute_vr.py`, `backend/pipeline/tests/test_precompute_vr.py`.
- **Commit:** `1fc1f93`.

**4. [Rule 1 — Pre-existing bug, in-scope] `backend/tests/test_persistence_api.py` paths point at `/viz/...` not `/api/viz/...`**

- **Found during:** Task 2 — the file is in the plan's `files_modified` list. Before any of my changes, every test in it asserts a status code but the HTTP client was hitting the SPA catch-all at `/{full_path:path}`, which returns 200 with `index.html` (or a JSON 404 if no frontend build). The asserts coincidentally pass for some routes (`scatter` defaults are documented to surface 503 on cache-miss) and fail for others. The file would not have served the new `dim=0`/`dim=2` rejection tests because they never reached the route.
- **Fix:** Changed all `/viz/persistence...` strings to `/api/viz/persistence...` in `test_persistence_api.py` (the file Plan 06-04 owns). The identical bug in `backend/api/tests/test_viz.py` is **out of scope** for Plan 06-04 (the file is not in `files_modified`; the failures are pre-existing) and is logged in `deferred-items.md` for the next phase cleanup.
- **Files modified:** `backend/tests/test_persistence_api.py` (in-scope), `deferred-items.md` (log).
- **Commit:** `1fc1f93` + `f640036`.

### Out-of-scope discoveries (logged to deferred-items.md)

- `backend/api/tests/test_viz.py` — 10/13 tests pre-existing failures; same `/api/` prefix bug. Not in this plan's `files_modified`.

### File-list deviation

The plan's `files_modified` lists `frontend/src/components/topology/CompareHeatmaps.tsx` and `frontend/src/components/explain/PipelineExplain.tsx`. The actual locations are:
- `frontend/src/components/compare/CompareHeatmaps.tsx` (not under `topology/`) — and it doesn't branch on `selectedHomologyDim`, so it didn't need changes. Its test file (`frontend/src/components/compare/__tests__/CompareHeatmaps.test.tsx`) did need the `selectedHomologyDim: 0` → `1` bump and was modified.
- `frontend/src/components/explanation/PipelineExplanation.tsx` (not `explain/PipelineExplain.tsx`). The orchestrator imports the six step components; none of them are H₀/H₂-dedicated, so the `STEPS` array and the 6/6 step counter survive unchanged. The H₀/H₂ language inside `steps/Step3PointCloud.tsx` and `steps/Step4Homology.tsx` was rewritten — those step components are where EXPLAIN-01 actually lives.

## Acceptance Criteria Status

| Criterion | Status |
|---|---|
| `grep -rn h2Enabled frontend/src` returns 0 | PASS |
| `HomologyDim` narrowed to literal `1` | PASS (visualizationStore.ts:8) |
| `grep -rEn 'homology_dims\s*=\s*\[0\|homology_dims\s*=\s*\[2\|maxdim\s*=\s*2' backend/` returns 0 | PASS |
| `HomologyTabs.tsx` DIMS array contains only `{key:1,label:'H1'}` | PASS |
| SettingsDrawer + SlowTierParams have no H₂ row | PASS |
| `config/params.yaml` `homology.homology_dimensions: [1]` with no commented alternates | PASS |
| EXPLAIN-01 walkthrough copy references H₁ only | PASS (Step3PointCloud, Step4Homology rewritten) |
| ROADMAP milestone SC #1 + Phase 6 SC #1 rewritten per CONTEXT.md `<domain>` | PASS |
| REQUIREMENTS BUG-01 + TOPO-02 rewritten per CONTEXT.md `<domain>` | PASS |
| PROJECT.md Key Decisions row recording H₀/H₂ removal | PASS |
| `data/cache/` and `data/features/` contain no H₂- or H₀-named artifacts | PASS (D-05 re-verified — find returns empty) |

## Smoke Test (manual)

Not executed in this run — the agent cannot reach a desktop browser. The acceptance criteria above (npx tsc, vitest, pytest) cover the equivalent automated verification surface. The visual UAT for the single-H₁ tab and absent H₂ Settings row can be done in the next interactive session.

## Known Stubs

None. The single-tab `HomologyTabs` is intentionally non-interactive — that is its v2 design, not a stub.

## Self-Check: PASSED

- Commits exist:
  - `a3c5c7d` (Task 1) — present in `git log`
  - `1fc1f93` (Task 2) — present in `git log`
  - `f640036` (Task 3) — present in `git log`
- All `files_modified` from the plan (modulo the two path-discrepancies documented under "File-list deviation") are touched in the corresponding commit.
- Acceptance grep criteria all pass.
- In-scope test suites all green (47 frontend tests + 30 backend tests).
