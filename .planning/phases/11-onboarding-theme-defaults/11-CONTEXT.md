# Phase 11: Onboarding & Theme Defaults - Context

**Gathered:** 2026-05-28
**Status:** Ready for execution (decisions locked inline — discuss skipped per user)

<domain>
## Phase Boundary

Two related first-run behavior changes layered on the Phase 10 theming + tour work:
1. Make **light** the default theme for new visitors (reverses the Phase 3 / D-58 dark-default lock).
2. Build a **first-visit onboarding sequence**: auto-open "How It Works" on first visit (or first in ≥30 days), then chain into the existing 4-step tour when it closes. Gated by a persisted timestamp.

No new visualization features. No backend changes. Frontend-only, building directly on Phase 10's `preferencesStore`, `TourProvider`, and `PipelineExplanation`.
</domain>

<decisions>
## Implementation Decisions (locked 2026-05-28)

- **D-86 — Light is the default theme.** New users get `theme: 'light'` and a light first paint (no dark flash). Reverses D-58 (Phase 3 dark-default lock). Persisted users keep their stored choice. `system` and `dark` remain fully selectable from the Help dropdown. First-paint is handled by an inline pre-hydration script in `index.html` that reads `localStorage['lgt-prefs-v1']` and toggles `<html>.light` before React mounts — defaulting to light when no stored preference exists.
- **D-87 — Re-trigger window = first visit OR ≥30 days.** A persisted `introSeenAt: number | null` timestamp in `preferencesStore` (localStorage via the existing `persist` middleware — no real cookies; localStorage achieves the identical "remember across visits" goal and is already wired). The intro fires when `introSeenAt` is null OR `Date.now() - introSeenAt >= 30 days`.
- **D-88 — Intro sequence = How It Works → tour.** On app mount, if the re-trigger condition is met: (a) auto-open the "How It Works" walkthrough, (b) set `introSeenAt = Date.now()` immediately so a reload mid-sequence doesn't reopen it (consume-on-fire), (c) when How It Works closes, start the 4-step onboarding tour.
- **D-89 — Tour no longer auto-starts independently.** Reverses D-73. `TourProvider` must NOT auto-start on `tourCompleted === false`. The tour starts only via (a) the How-It-Works→tour chain in the auto-intro, or (b) the manual "Replay tour" Help-dropdown item.
- **D-90 — Early dismissal still chains; manual opens do not.** Closing How It Works by any means (X / Esc / outside-click) during the auto-intro still chains into the tour — "closed" = "done with the intro step". But opening How It Works manually from the nav button must NOT chain into the tour. Distinguish the two with an `introSequenceActive` flag (component ref/state in `App`) set only when the auto-intro opened the walkthrough.

### Edge cases resolved

- **Persisted-user migration:** existing localStorage has `{ theme, tourCompleted }` but no `introSeenAt`. Treat missing `introSeenAt` as null → the intro fires once for them too (acceptable: they see the polished intro once, then it's suppressed 30 days). If this is undesirable, a future tweak could seed `introSeenAt` from an existing `tourCompleted === true`. For now: missing timestamp = show once.
- **User on `system` or `dark`:** D-86 only changes the *default for new users*. Anyone who already chose a theme is untouched.
- **How It Works reopened manually during the 30-day window:** allowed anytime via nav; does not affect `introSeenAt` and does not start the tour (D-90).

</decisions>

<canonical_refs>
## Canonical References

### Phase 10 artifacts being modified
- `frontend/src/stores/preferencesStore.ts` — add `introSeenAt`; default `theme` → `'light'`; keep `tourCompleted` for the tour's own replay state
- `frontend/src/App.tsx` — onboarding orchestration (auto-open How It Works on stale intro; chain to tour on close)
- `frontend/src/tour/TourProvider.tsx` — remove independent first-load auto-start (D-89); keep `start()` for chain + manual replay
- `frontend/src/components/explanation/PipelineExplanation.tsx` — surface an onClose hook so App can chain to the tour
- `frontend/src/stores/visualizationStore.ts` — `pipelineExplanationOpen` + `setPipelineExplanationOpen` (existing controlled state for How It Works)
- `frontend/index.html` — inline pre-hydration theme script for light-first-paint (no FOUC)

### Decision lineage
- `.planning/phases/10-visual-polish/10-CONTEXT.md` — D-58 (dark default, now reversed by D-86), D-63/D-65 (preferencesStore + applyTheme), D-73 (tour auto-start, now reversed by D-89)
- `.planning/phases/03-frontend-core-and-3d-visualization/03-CONTEXT.md` — original dark-default decision (superseded)
- `.planning/REQUIREMENTS.md` ONBOARD-01..03

</canonical_refs>

<code_context>
## Existing Code Insights

- **How It Works** is controlled by `visualizationStore.pipelineExplanationOpen` (session-scoped) and rendered by `<PipelineExplanation />` in `App.tsx:287`. Opened via `setPipelineExplanationOpen(true)` from `HelpDropdown` and `TopNavTabs`.
- **Tour** is controlled by `TourProvider` (`useTour()`); first-load auto-start currently in a `useEffect` keyed on `tourCompleted` (TourProvider.tsx ~line 60). `HelpDropdown` calls `tour.start()` for manual replay.
- **Theme** default is currently `'system'` in `preferencesStore`; first paint is dark because `index.html` `<html>` ships without `.light` and `:root` is the dark scope.
- `applyTheme()` toggles `<html>.light` and is called synchronously in `setTheme` (Phase 10 fix) + on mount/system-subscription in `App.tsx`.

## Integration Points

- App mount: read `preferencesStore.introSeenAt`; compute staleness; if stale → `setPipelineExplanationOpen(true)` + set `introSequenceActive` flag + `setIntroSeenAt(Date.now())`.
- `PipelineExplanation` close handler: if `introSequenceActive` → clear flag + `tour.start()`.
- `TourProvider`: delete the `tourCompleted`-driven auto-start effect.
- `index.html`: inline script in `<head>` before the module script.

</code_context>

<specifics>
## Specific values

- **30-day window:** `const INTRO_TTL_MS = 30 * 24 * 60 * 60 * 1000` (2,592,000,000 ms).
- **Inline pre-hydration script (index.html `<head>`, before the bundle):**
  ```html
  <script>
    (function () {
      try {
        var raw = localStorage.getItem('lgt-prefs-v1');
        var theme = raw ? (JSON.parse(raw).state || {}).theme : null;
        // New user (no stored theme) defaults to light per D-86.
        var effective = theme || 'light';
        if (effective === 'system') {
          effective = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        }
        if (effective === 'light') document.documentElement.classList.add('light');
      } catch (e) { document.documentElement.classList.add('light'); }
    })();
  </script>
  ```
  (Zustand `persist` stores under `{ state: {...}, version }` — read `.state.theme`.)

</specifics>

<deferred>
## Deferred Ideas

- Seeding `introSeenAt` from legacy `tourCompleted === true` so long-time users don't see the intro again — deferred; current behavior shows it once for them.
- Real HTTP cookies (vs localStorage) — not needed; localStorage via Zustand persist already survives across visits and is the established mechanism.
- A "don't show this again" checkbox on How It Works — out of scope; the 30-day window covers re-show fatigue.

</deferred>

---

*Phase: 11-onboarding-theme-defaults*
*Context gathered: 2026-05-28 (discuss skipped — decisions locked inline with user)*
