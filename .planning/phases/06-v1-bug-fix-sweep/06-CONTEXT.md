# Phase 6: v1 Bug-Fix Sweep — Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Close the four visible v1 carry-over bugs and the latent cache-key bug before any retrain happens. Engineering hygiene over user-facing change — **no new features beyond making the broken ones honest**.

**In scope (Phase 6):** BUG-01, BUG-02, BUG-03, BUG-04, BUG-05

- BUG-01 — **Recast from "ship H₂" to "remove H₂ entirely"** (UI + backend scrub). Defer H₂ to v3.
- Bonus cleanup — Remove H₀ tab too (degenerate in weighted Vietoris-Rips; tab currently shows empty diagrams). Ship H₁ only.
- BUG-02 — Persistence-diagram dot scaling for H₁ readable at any zoom.
- BUG-03 — BookSlider wired via new `GET /api/corpus/genres/{genre}/books` endpoint with per-book metadata.
- BUG-04 — ROADMAP.md / STATE.md / all `.planning/**/*.md` protected against 0-byte commits + LFS pinning + snapshot backups.
- BUG-05 — Content-addressed cache key includes `corpus_hash` (sha256 of `books.yaml`) and `w2v_model_sha256` everywhere on disk; eager flush of `data/cache/` in the same PR.

**NOT in scope:** Corpus expansion (Phase 8), classification depth / top-N / explainability (Phase 9), dark mode / onboarding tour (Phase 10), new computation features.

**Scope changes vs. ROADMAP.md (require updates):**
- v2.0 milestone success criterion #1 — was "User can see all three homology dimensions (H₀, H₁, H₂)" — becomes "User no longer sees misleading disabled H₂ tab; H₀ tab removed; H₁ ships honestly. H₀ documented as degenerate in weighted VR; H₂ deferred to v3."
- REQUIREMENTS.md BUG-01 — was "System computes H₂ persistent homology and exposes it via the H₂ heatmap tab" — becomes "Remove H₂ UI tab + toggle + backend plumbing; document deferral in PROJECT.md decision table."
- REQUIREMENTS.md TOPO-02 (v1 Validated) — was "User can switch the persistence image between H₀, H₁, and H₂ tabs" — becomes "User views the H₁ persistence image (H₀/H₂ removed in v2.0 — H₀ degenerate, H₂ deferred)."
- PROJECT.md Key Decisions — add row: "v2: H₀ and H₂ removed from UI; H₀ mathematically degenerate in weighted VR (birth axis collapses to 0); H₂ deferred to v3 — sparse high-D point clouds rarely contain voids and O(n⁴) cliff is not worth the engineering for empirical-zero gain."

</domain>

<decisions>
## Implementation Decisions

### BUG-01 — H₂ removal (and H₀ cleanup)

- **D-01:** Remove H₂ entirely — frontend tab + settings toggle + backend `homology_dims=2` plumbing + tests. No feature flag, no "coming soon" placeholder.
- **D-02:** Remove H₀ tab and supporting backend plumbing as part of the same sweep — H₀ is currently in the tab UI ([HomologyTabs.tsx:5](frontend/src/components/topology/HomologyTabs.tsx#L5)) but `homology_dimensions: [1]` ([config/params.yaml:22](config/params.yaml#L22)) excludes it. Ship H₁-only honestly.
- **D-03:** Frontend + backend scrub (not "frontend-only hide"). Files to touch:
  - Frontend: `HomologyTabs.tsx`, `visualizationStore.ts` (drop `h2Enabled`, `setH2Enabled`, and review `HomologyDim` type), `SettingsDrawer.tsx`, `SlowTierParams.tsx`, `PersistenceHeatmap.tsx`, `PersistenceDiagram.tsx`, `CompareHeatmaps.tsx`, and matching `__tests__` files (delete H₂/H₀ cases rather than maintain dead test paths).
  - Backend: `homology.py` (simplify `homology_dims` parameter to a fixed `[1]` or drop the parameter), `features.py`, `precompute.py`, `precompute_viz.py`, `precompute_vr.py`, `worker/jobs.py`, `config/params.yaml`, and matching tests.
- **D-04:** Update `EXPLAIN-01` pipeline-explanation walkthrough copy to reference H₁ only (remove H₀/H₂ steps).
- **D-05:** Verify `data/cache/` and `data/features/` contain no H₂-named or H₀-named artifacts before the PR lands (confirmed none at discussion time; re-verify at planning time).

### BUG-02 — Persistence-diagram dot scaling (H₁ only)

- **D-06:** Finite-persistence dots scaled by `sqrt(persistence / max_finite_persistence)` with linear bounds. Formula shape: `size = base + scale * sqrt(persistence / max_finite_persistence)`, capped at `max_size`.
- **D-07:** Rare H₁ infinity dots (loops not closed within `epsilon_max`): rendered on a dedicated top-line strip above the main scatter with a distinct marker shape; tooltip explains "loop survives beyond ε_max — feature persists past the filtration window."
- **D-08:** Snapshot test in `frontend/src/components/topology/__tests__/PersistenceDiagram.test.tsx` covers (a) a fixture with finite-only dots (verify sqrt scaling), (b) a synthetic fixture with one `np.inf` death (verify top-line strip rendering, no NaN/off-screen, no auto-rescale of finite dots).

### BUG-03 — BookSlider metadata endpoint

- **D-09:** New endpoint `GET /api/corpus/genres/{genre}/books` returns flat array of book metadata. Schema strictly `{gutenberg_id, title, author, genre, word_count, color, top_10_tfidf_words}` — **<2KB per book, <100KB total payload**. 404 if genre unknown (reuse `_KNOWN_GENRES` pattern from `viz.py`).
- **D-10:** **Hybrid metadata source:** `word_count` auto-computed deterministically at preprocess time (from tokenized text). `author` hand-edited per book in `corpus/books.yaml` (15 entries — trivial one-time effort, no Gutenberg API dependency).
- **D-11:** `top_10_tfidf_words` precomputed at build time. Storage: prefer baking into a sidecar JSON keyed by `gutenberg_id` (cleaner than fattening `books.yaml`) — final location decided in planning, but it must NOT be lazily computed on first request.
- **D-12:** Backend cache: in-memory at module import (corpus only changes on retrain — no need for Redis-level caching for this endpoint).
- **D-13:** Frontend: `useCorpusBooks(selectedGenre)` React Query hook with `staleTime: Infinity`. `Sidebar.tsx` lines 46-57 replaced — drop the points-derived `books` `useMemo`; `BookSlider.tsx` accepts richer `BookMeta = { id, title, author, word_count, ... }`.
- **D-14:** Backwards compatibility: existing `GET /api/corpus/books` (flat list) stays unchanged. New endpoint is additive.

### BUG-04 — ROADMAP/STATE protection

- **D-15:** Pre-commit hook scope: **all `.planning/**/*.md`** (catches future CONTEXT/PLAN/VERIFICATION drift too, not just ROADMAP/STATE/PROJECT). Hook rejects any 0-byte commit to files matching that pattern with a clear error message.
- **D-16:** Hook install: **one-shot `scripts/install-hooks.sh`** that sets `git config core.hooksPath .githooks` and verifies the hook is executable. No `pre-commit` framework dependency — single shell script keeps the dev surface small.
- **D-17:** Hook lives in `.githooks/pre-commit` (versioned with the repo, not in `.git/hooks` which is local-only).
- **D-18:** **Snapshot backup enabled.** A second hook (or appended to the same pre-commit hook) copies `ROADMAP.md` and `STATE.md` (and possibly `PROJECT.md`) to `.planning/.snapshots/{YYYY-MM-DD-HHMMSS}/` on every commit. Add `.planning/.snapshots/` to `.gitignore` — these are local recovery files only.
- **D-19:** `.gitattributes` additions: `.planning/**/*.md -lfs -filter -diff -merge` — ensures planning files never get LFS-pointer'd by accident.
- **D-20:** CI backstop: same 0-byte check runs in CI as well, in case a contributor commits without running `install-hooks.sh`.
- **D-21:** Audit step: planning must include a one-time `git log -p --diff-filter=D -- .planning/ROADMAP.md .planning/STATE.md` review to identify which past command/PR wiped the files; if root cause is a GSD command bug, file an issue.

### BUG-05 — Cache key + corpus_hash + w2v_model_sha256

- **D-22:** Every `cache_key(step_name, params, ...)` site on disk gains `corpus_hash` (sha256 of `corpus/books.yaml` content) and `w2v_model_sha256` (sha256 of the Word2Vec model file). Sites to touch identified by grep against `backend/cache/store.py` callers (canonical list during planning).
- **D-23:** **Eager cache migration:** flush `data/cache/` as part of the BUG-05 PR. First request after deploy triggers full recompute (~20 min per the CLAUDE.md fresh-machine path). No lazy/orphan strategy, no migration script. Aligns with the Phase 8 retrain workflow.
- **D-24:** Smoke test in `backend/tests/`: load v1 cached artifact, swap to a freshly-trained W2V model (or simulate by changing `w2v_model_sha256` input), assert cache-miss → recompute path is hit. Required before Phase 8 starts.
- **D-25:** SVM training data lineage: save alongside the SVM file the model hash, corpus manifest hash, feature-track normalization stats, and α. Refuse to load an SVM whose lineage doesn't match the currently-loaded W2V model. (Defense-in-depth on top of the cache-key fix.)

### Within-Phase Build Order

- **D-26:** Build order: **BUG-04 first** (restore docs so GSD workflow is unblocked — already partially done; finalize hooks now) → **BUG-02** (frontend-only, smallest change) → **BUG-03** (smallest end-to-end new-endpoint integration; proves the v2 endpoint-addition pattern) → **BUG-01** (frontend + backend scrub; touches the most files) → **BUG-05** (cache-key change; lands after everything else so the cache flush isn't redone). Matches [ARCHITECTURE.md §6](.planning/research/ARCHITECTURE.md) within-phase ordering.

### Claude's Discretion

- Exact mechanism for "auto-computed `word_count`" — likely the preprocess step in `scripts/02_preprocess.py` writes `word_count` back to `corpus/books.yaml` or a sidecar JSON; planner decides the exact integration point.
- Sidecar JSON path/name for `top_10_tfidf_words` (`data/corpus_metadata.json` is a reasonable default).
- Exact wording of the pre-commit hook error message and CI failure copy.
- Whether the "audit who wiped ROADMAP/STATE" step (D-21) produces a written postmortem or is a one-line note in the PR description.
- Visual details of the H₁ infinity top-line strip (color, marker shape, exact label).
- Cap value for `max_size` in BUG-02 dot scaling.
- How aggressively to delete vs. comment out the H₀/H₂ test cases (preference: full delete).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase research (v2)

- `.planning/research/SUMMARY.md` — v2 spine; §"Phase 6: v1 Bug-Fix Sweep" pins deliverables and avoided pitfalls
- `.planning/research/ARCHITECTURE.md` §1, §2 (feature → file matrix), §3 (NEW/MODIFIED files), §5e (corpus expansion cache invalidation), §6 (within-phase build order), §8 (cache invalidation plan), §10 (Phase 6 file checklist)
- `.planning/research/PITFALLS.md` §1 (W2V retrain rotates space — owned partially by BUG-05), §10 (persistence-diagram dot scaling), §12 (BookSlider metadata schema), §15 (ROADMAP/STATE wiped — pre-commit hook + .gitattributes + .snapshots)
- `.planning/research/PITFALLS.md` §2, §3 — **historical context only for the removed H₂ work**; no longer load-bearing after BUG-01 recast

### v1 codebase (existing artifacts)

- [config/params.yaml](config/params.yaml) line 22 — current `homology_dimensions: [1]` (informs H₀/H₂ removal scope)
- [backend/pipeline/homology.py](backend/pipeline/homology.py) — `compute_book_homology` and `homology_dims` parameter
- [backend/api/routes/corpus.py](backend/api/routes/corpus.py) — existing `_KNOWN_GENRES` pattern and cache_key sites (BUG-05 line 46-51 latent bug)
- [backend/cache/store.py](backend/cache/store.py) — content-addressed cache implementation (BUG-05 touchpoint)
- [backend/worker/jobs.py](backend/worker/jobs.py) — arq job pipeline (only H₂-removal touchpoint here)
- [backend/api/routes/viz.py](backend/api/routes/viz.py) — `_KNOWN_GENRES` reference and `dim` parameter validation (currently accepts `dim ∈ {0,1,2}` — will simplify to `{1}`)
- [frontend/src/components/topology/HomologyTabs.tsx](frontend/src/components/topology/HomologyTabs.tsx) — H₀/H₁/H₂ tab definition
- [frontend/src/components/topology/PersistenceDiagram.tsx](frontend/src/components/topology/PersistenceDiagram.tsx) line 83 — current step-function radius logic (BUG-02 fix point)
- [frontend/src/stores/visualizationStore.ts](frontend/src/stores/visualizationStore.ts) lines 33, 61, 90, 122 — `h2Enabled` state to remove
- [frontend/src/components/settings/SettingsDrawer.tsx](frontend/src/components/settings/SettingsDrawer.tsx), [frontend/src/components/settings/SlowTierParams.tsx](frontend/src/components/settings/SlowTierParams.tsx) — H₂ toggle UI to remove
- [frontend/src/components/sidebar/Sidebar.tsx](frontend/src/components/sidebar/Sidebar.tsx) lines 46-57 — points-derived `books` to replace with `useCorpusBooks` hook
- [frontend/src/components/sidebar/BookSlider.tsx](frontend/src/components/sidebar/BookSlider.tsx) — currently receives `books={[]}` (BUG-03)
- [corpus/books.yaml](corpus/books.yaml) — needs `author` and `word_count` field additions (BUG-03)
- [.planning/REQUIREMENTS.md](.planning/REQUIREMENTS.md) — BUG-01..05 verbatim wording; TOPO-02 to be rewritten
- [.planning/ROADMAP.md](.planning/ROADMAP.md) — milestone success criterion #1 to be rewritten

### Mathematical invariants

- [.planning/PROJECT.md](.planning/PROJECT.md) §Constraints — invariants (1)–(4); BUG-05 protects invariant (1); H₀/H₂ removal does NOT violate (2)–(4)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`_KNOWN_GENRES` pattern in `backend/api/routes/viz.py` and `corpus.py`** — reuse for the new `GET /api/corpus/genres/{genre}/books` endpoint validation.
- **`cache_key()` in `backend/cache/store.py`** — extend signature to include `corpus_hash` and `w2v_model_sha256`; all callers updated atomically (BUG-05).
- **React Query setup in frontend** — already used for precomputed corpus data with `staleTime: Infinity`. New `useCorpusBooks` hook follows the same pattern.
- **Zustand `visualizationStore`** — already houses `selectedHomologyDim`; `h2Enabled` removal is a clean subtraction.
- **`scripts/02_preprocess.py` (or equivalent preprocess stage)** — natural insertion point for `word_count` auto-compute step (BUG-03).

### Established Patterns

- **Content-addressed cache:** `sha256(step_name, params)` → result on disk. BUG-05 extends to `sha256(step_name, params, corpus_hash, w2v_model_sha256)`. Eager flush + recompute is consistent with prior phase patterns.
- **Backwards-compatible additive endpoints:** `GET /api/corpus/books` stays; new `GET /api/corpus/genres/{genre}/books` is additive. No breaking changes to v1 consumers.
- **Frontend test colocation:** `__tests__` directories alongside components; H₀/H₂ test cases deleted (not commented out) per project style.
- **SSE result payload extension:** Top-N / explainability work in Phase 9 will piggyback on the same payload pattern BookSlider establishes here.

### Integration Points

- **`Sidebar.tsx` lines 46-57** — replace the points-derived `books` `useMemo` with the new `useCorpusBooks(selectedGenre)` React Query hook. Most surgical change.
- **`HomologyTabs.tsx` DIMS array** — drop entries `{ key: 0, label: 'H0' }` and `{ key: 2, label: 'H2' }`; verify `selectedDim` initial state is `1`.
- **`SettingsDrawer.tsx` H₂ toggle row** — full removal including row label, switch, and any conditional rendering.
- **`backend/pipeline/homology.py:23-58`** — `homology_dims` parameter can be removed entirely OR fixed to a constant `[1]`; planner picks the smaller-blast-radius option.
- **`.githooks/pre-commit` (new)** — installed via `scripts/install-hooks.sh` → `git config core.hooksPath .githooks`.
- **`.gitattributes`** — append `.planning/**/*.md -lfs -filter -diff -merge`.
- **CI workflow** — add 0-byte planning-file check as backstop.

</code_context>

<specifics>
## Specific Ideas

- **H₀ tab removal is bonus cleanup not in the BUG-01..05 list** — surfaced during discussion because `homology_dimensions: [1]` already excludes H₀ but the UI still shows the empty tab. Cleaning this in Phase 6 means v2 ships honest UI; deferring it would leave a dead-tab carry-over identical to the H₂ one we're fixing.
- **No "Coming in v3" placeholder for H₂.** User wants a clean removal, not an empty-state tab. v3 considers re-introducing H₂ as a fresh feature.
- **`top_10_tfidf_words` in BookSlider:** these are display-only book characterization; not used in any classification logic. Storage choice is purely about endpoint payload discipline.
- **BUG-05 also pins SVM training-data lineage (model_hash + corpus_hash + α + normalization stats saved with the SVM file)** — defense-in-depth beyond cache-key fix, surfaced from PITFALLS §1. Phase 8 will need this guard.
- **Audit step for "who wiped ROADMAP/STATE?"** — D-21 is forensics, not just prevention. Even if no root cause is found, the audit documents the search.
- **Build order is locked in CONTEXT (D-26) but planner can revisit during PLAN.md if dependencies tighten.**

</specifics>

<deferred>
## Deferred Ideas

- **H₂ persistent homology (compute + UI)** — deferred to v3. Re-evaluate after Phase 8's corpus expansion: if larger corpora (50+ points per genre) make non-empty H₂ diagrams more common, the engineering investment becomes more defensible.
- **H₀ persistent homology** — deferred indefinitely; degenerate in weighted Vietoris-Rips (all points born at filtration time 0). Could be revisited if a non-weighted VR variant is ever introduced.
- **CI/CD automation for the pre-commit hook installer** — would auto-install via a workspace setup script. Out of scope for Phase 6; can be a Phase 10 polish item.
- **Author/word_count auto-fetch from Gutenberg metadata API** — script-generated source rejected in favor of hand-edit for the 15 bundled books. Phase 8's `scripts/build_corpus.py` (CEXP-05) may revisit this for the expanded corpus.
- **Bench gate (`scripts/bench_h2.py`) and dedicated H₂ queue** — irrelevant after H₂ removal. Was a planned mitigation for PITFALLS §2; no longer load-bearing.
- **"Why empty H₂ is normal" educational copy in EXPLAIN-01** — moot after H₂ removal.

### Reviewed Todos (not folded)

None — `gsd-tools todo match-phase 6` returned 0 matches.

</deferred>

---

*Phase: 06-v1-bug-fix-sweep*
*Context gathered: 2026-05-22 via /gsd-discuss-phase*
