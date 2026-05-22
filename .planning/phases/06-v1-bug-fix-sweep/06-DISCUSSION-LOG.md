# Phase 6: v1 Bug-Fix Sweep — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `06-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 06-v1-bug-fix-sweep
**Areas discussed:** BookSlider metadata source, H₂ default state + tab UX (recast to H₂ removal + H₀ cleanup), H₀ infinity marker design (re-scoped to H₁ dot scaling), Cache migration + hook scope

---

## BookSlider metadata source (BUG-03)

### Q1: How should `author` and `word_count` be sourced for the bundled 15 books?

| Option | Description | Selected |
|---|---|---|
| Hybrid: word_count auto, author hand-edit | Auto-compute word_count at preprocess; hand-edit author in books.yaml. No external API dependency. | ✓ |
| Hand-edit both | Manual author + word_count entries. Brittle if preprocessing changes. | |
| Script-generate from Gutenberg metadata API | scripts/build_corpus.py auto-fetches. Network dependency + rate-limit handling NOW. | |

**User's choice:** Hybrid (Recommended)
**Notes:** Phase 8's `scripts/build_corpus.py` (CEXP-05) may revisit auto-fetch for the expanded corpus.

### Q2: top_10_tfidf_words storage strategy

| Option | Description | Selected |
|---|---|---|
| Precomputed at build time, baked into books.yaml or sidecar JSON | Cheap endpoint, aligns with `staleTime: Infinity`. | ✓ |
| Computed on first request, then cached in Redis | Lazy compute. More code (TTL strategy). | |
| Omit from endpoint entirely | Move to separate `/api/corpus/books/{id}/words` endpoint. | |

**User's choice:** Precomputed at build time (Recommended)
**Notes:** Sidecar JSON preferred over fattening books.yaml — exact path is Claude's discretion at planning time.

---

## H₂ default state + tab UX (BUG-01) — recast mid-discussion

### Q1: When the user views H₂ for a bundled book, what's the default state of the H₂ tab?

| Option | Description | Selected |
|---|---|---|
| Always visible, populated for bundled / disabled for uploads | H₂ enabled on bundled, disabled on uploads with tooltip. | |
| Behind 'Settings → Enable H₂' opt-in toggle | Hidden by default; user reveals. | |
| Always visible for both bundled and uploads | Live compute on uploads. Anti-recommended. | |

**User's choice (free-text):** *"H2 is not there because it is not computed. For fixing the H2 bug, can we just remove the H2 feature entirely"*
**Notes:** Course correction — user wants H₂ removed entirely instead of computed. Implications surfaced and confirmed below.

### Q2 (free-text in original prompt): empty-H₂ UX copy
**User's choice:** Honest copy: "No 2-dimensional voids detected — typical for sparse high-D point clouds at this vocabulary size" + zero-rendered heatmap.
**Notes:** Moot after H₂ removal — kept here as historical preference for similar future "honest empty state" decisions.

### Q3 (original prompt): bench gate failure handling
**User's choice:** Drop that book from H₂ precompute; UI surfaces "H₂ skipped: computation budget exceeded for this book."
**Notes:** Also moot after H₂ removal.

### Q4 (follow-up): Confirm H₂ removal scope

| Option | Description | Selected |
|---|---|---|
| Remove H₂ entirely (UI + computation) — defer to v3 | Cleanest. Updates REQUIREMENTS, ROADMAP, PROJECT. | ✓ |
| Keep H₂ UI but hide it (no compute, no tab visible) | Feature flag dormant in codebase. | |
| Keep H₂ as 'coming in v3' empty-state placeholder | User-facing acknowledgment. | |

**User's choice:** Remove H₂ entirely

### Q5 (follow-up): Removal scope

| Option | Description | Selected |
|---|---|---|
| Frontend-only removal | Delete H₂ tab + toggle; backend `homology_dims` stays. | |
| Frontend + backend scrub | Full cleanup including backend plumbing. | ✓ |
| Frontend hidden + backend untouched | Feature flag, leave dead code. | |

**User's choice:** Frontend + backend scrub
**Notes:** No dead code left behind.

### Q6 (follow-up after user surfaced data-error concern): H₀ cleanup

| Option | Description | Selected |
|---|---|---|
| Compute H₀ alongside H₁ (set homology_dimensions: [0, 1]) | Align code with v1 docs that promised H₀/H₁. Degenerate (all H₀ points lie on death-axis). | |
| Remove H₀ tab too — ship H₁ only | Aligns reality with shipped behavior. Both H₀ and H₂ tabs deleted. | ✓ |
| Leave H₀ tab visible, empty diagrams (status quo) | No code change for H₀. | |

**User's choice:** Remove H₀ tab too
**Notes:** User's "wouldn't there be errors with H₂ data references" question surfaced this latent inconsistency. params.yaml already excludes H₀ but tab is shown.

---

## H₀ infinity marker design (BUG-02) — re-scoped to H₁ dot scaling after H₀ removal

### Q1: Scaling formula for H₁ finite-persistence dots

| Option | Description | Selected |
|---|---|---|
| sqrt(persistence / max_finite_persistence) | PITFALLS §10 recommendation. Outliers don't dominate. | ✓ |
| log(1 + persistence) | Heavier compression. Less standard. | |
| Linear with cap | Simplest; may look cramped with outliers. | |

**User's choice:** sqrt scaling (Recommended)

### Q2: H₁ infinity dot rendering (rare — loop that never closes within epsilon_max)

| Option | Description | Selected |
|---|---|---|
| Dedicated 'infinite persistence' marker on top-line strip + tooltip | TDA-paper convention. Honest visual signal. | ✓ |
| Clamp death to epsilon_max + small offset, render with hatched outline | Visually consistent; less faithful. | |
| Hide infinity dots silently | Cleanest visual; hides real info. Not recommended. | |

**User's choice:** Dedicated top-line marker (Recommended)
**Notes:** With H₀ removed, the original BUG-02 "connected-component infinite-persistence dot" case no longer exists. The H₁ infinity dot is a rare-but-possible edge case (loop survives beyond epsilon_max) and must still be handled.

---

## Cache migration + hook scope (BUG-04, BUG-05)

### Q1: BUG-05 cache migration approach

| Option | Description | Selected |
|---|---|---|
| Eager: flush `data/cache/` as part of the BUG-05 PR | Clean slate. First request triggers full recompute (~20 min). | ✓ |
| Lazy: leave old files on disk, cache-miss recomputes on demand | Orphan files accumulate. | |
| Migration script: re-derive new keys for current corpus | More code; subtle bug risk. | |

**User's choice:** Eager flush (Recommended)
**Notes:** Aligns with Phase 8 retrain workflow which would do the same.

### Q2: BUG-04 pre-commit hook scope + install

| Option | Description | Selected |
|---|---|---|
| Scope `.planning/**/*.md` + `scripts/install-hooks.sh` shell installer | Broad protection; no framework dependency. | ✓ |
| Scope only ROADMAP/STATE/PROJECT + same shell installer | Narrower blast radius. | |
| Scope `.planning/**/*.md` + `pre-commit` framework | Industry-standard tool, adds Python dev dep. | |

**User's choice:** Broad scope + shell installer (Recommended)

### Q3: BUG-04 snapshot backup

| Option | Description | Selected |
|---|---|---|
| Yes — git hook copies ROADMAP/STATE on every commit to `.planning/.snapshots/` | Defense in depth. | ✓ |
| No — pre-commit hook + `.gitattributes -lfs` is enough | Trust prevention; save disk. | |

**User's choice:** Yes, snapshots (Recommended)
**Notes:** PITFALLS §15 lists snapshots as belt-and-suspenders. User opted for full defense in depth.

---

## Claude's Discretion

Captured in `06-CONTEXT.md` `<decisions>` § "Claude's Discretion":
- Exact mechanism for auto-computing `word_count` (which preprocess script does the write-back).
- Sidecar JSON path/name for `top_10_tfidf_words`.
- Exact wording of pre-commit hook error message and CI failure copy.
- Whether D-21 audit produces a written postmortem or PR-description note.
- Visual details of H₁ infinity top-line strip (color, marker shape, label).
- Cap value for `max_size` in BUG-02 dot scaling.
- How aggressively to delete vs. comment out H₀/H₂ test cases (preference: full delete).

## Deferred Ideas

Captured in `06-CONTEXT.md` `<deferred>`. Notable scope-creep-adjacent items raised:
- H₂ persistent homology compute + UI — deferred to v3.
- H₀ persistent homology — deferred indefinitely (degenerate in weighted VR).
- CI/CD automation for pre-commit hook installer — Phase 10 polish if needed.
- Author/word_count auto-fetch from Gutenberg — Phase 8 CEXP-05 may revisit.
- Bench gate + dedicated H₂ queue — moot after H₂ removal.

---

*Discussion conducted via /gsd-discuss-phase 6 — 2026-05-22*
