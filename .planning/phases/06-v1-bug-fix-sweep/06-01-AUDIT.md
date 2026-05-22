# 06-01 — Audit: Who Wiped ROADMAP.md and STATE.md?

**Plan:** 06-01 (BUG-04)
**Audit performed:** 2026-05-22
**Performed by:** Plan 06-01 executor (per D-21 forensic requirement)

## Audit Window

Scanned the full history of `Desktop/CC/Word2Vec Genre Analyser/.planning/ROADMAP.md` and `.planning/STATE.md` via `git log --all -p --follow` and `git log --all --diff-filter=M`. History spans **2026-04-12 → 2026-05-22** (v1 inception through v2.0 milestone restart).

## Suspect Commits

A single truncation event was identified: both ROADMAP.md and STATE.md were emptied (to git's well-known empty-blob hash `e69de29`) in the same commit.

| Commit  | Date       | Message                                   | File                         | Before → After (blob)    | Bytes lost |
| ------- | ---------- | ----------------------------------------- | ---------------------------- | ------------------------ | ---------- |
| 336eb7c | 2026-04-13 | `chore(05): update state after Wave 1 completion` | `.planning/ROADMAP.md` | `e2416a4` (9106 B) → `e69de29` (0 B) | **9,106 B** |
| 336eb7c | 2026-04-13 | `chore(05): update state after Wave 1 completion` | `.planning/STATE.md`   | `887ecdc` (3142 B) → `e69de29` (0 B) | **3,142 B** |

Co-author on that commit was `Claude Sonnet 4.6 <noreply@anthropic.com>` — i.e. an agent-driven GSD-state update, not a human edit.

Restoration commits:

| Commit  | Date       | Message                                                                    | File          | After (blob)         |
| ------- | ---------- | -------------------------------------------------------------------------- | ------------- | -------------------- |
| f9a5c02 | 2026-05-22 | `docs: start milestone v2.0 — Accuracy, Depth, and Polish`                 | STATE.md      | `e69de29` → `0344224` (restored) |
| 47c7be2 | 2026-05-22 | `docs: create milestone v2.0 roadmap (5 phases, 25 reqs, v1 archive preserved)` | ROADMAP.md | `e69de29` → `11500dd` (restored) |

The files lived as 0-byte blobs in HEAD for **39 days** (2026-04-13 → 2026-05-22) before the v2.0 milestone rebuild restored them.

## Root-Cause Hypothesis

**PITFALLS.md §15 hypothesis #1: GSD command bug (template-rendering error).**

Evidence:

1. The commit message (`chore(05): update state after Wave 1 completion`) is the canonical signature of a GSD `state advance-plan` / `state record-session` invocation at the end of a wave, not a user-authored edit. No human types "update state after Wave 1 completion" verbatim — that string is template-generated.
2. The co-author tag `Claude Sonnet 4.6 <noreply@anthropic.com>` and absence of any human-readable context confirm an agent-driven commit, consistent with a `/gsd-execute-phase` or `/gsd-transition` wrap-up step that writes state then commits.
3. Both files were emptied simultaneously in the *same* commit — exactly what happens when a single rendering pipeline produces both outputs and both renderings fail (or are skipped, or the write happens before the render). A merge-conflict resolution or editor truncation would much more likely affect only one file at a time.
4. The neighboring commits (`53661f4` "create phase 5 deployment plans" earlier that evening; `db7b1f8` "persistence diagram pipeline" hours later) all have rich, hand-shaped messages and non-empty content changes — pointing to `336eb7c` as the anomalous outlier.

Alternative hypotheses ruled out:

- **#2 Editor truncation:** Would not co-empty two unrelated files in one commit; would not produce a templated commit message.
- **#3 Merge conflict resolution:** The commit shows a clean (non-merge) diff index — no `Merge:` header on the commit object.
- **#4 Local cleanup script:** Possible but unlikely given the agent co-author tag; no evidence of a developer-authored cleanup script in `scripts/` from this era.
- **#5 LFS misconfiguration:** Files were never LFS-tracked (verified by current `.gitattributes` showing only `data/models/*` LFS rules at every revision before this audit's Task 2 change), so this hypothesis is excluded.

**Conclusion:** A GSD wrap-up command (most likely a `state advance-plan` step rendering `STATE.md` then `ROADMAP.md`) wrote empty content because the rendering template either (a) had unbound variables, (b) executed the write before the render produced any bytes, or (c) wrote to a partially-prepared buffer. The bug landed because there was no pre-commit hook to reject 0-byte planning files — exactly the gap PITFALLS.md §15 calls out.

## Prevention Now In Place

PITFALLS.md §15 lists five hypothesized root-cause categories. The Plan 06-01 deliverables map to each as follows:

- **Local enforcement (catches all five categories at commit time):** `.githooks/pre-commit` (Task 1) — rejects any 0-byte `.planning/**/*.md` commit with a clear error pointing back to PITFALLS §15. Set `set -eu` so silent failures bubble up. Even if a GSD command produces empty content (hypothesis #1) or an editor truncates a file (hypothesis #2), the hook refuses the commit.
- **CI backstop (catches contributors who haven't run the installer):** `.github/workflows/planning-files-check.yml` (Task 2) — independent enforcement layer. Even if a malicious or misconfigured client bypasses the local hook, CI fails the push/PR.
- **LFS-pointer defense (hypothesis #5):** `.gitattributes` (Task 2) appends `.planning/**/*.md -lfs -filter -diff -merge -text` so planning markdown is excluded from LFS tracking regardless of which patterns may match in future. `git check-attr -a .planning/ROADMAP.md` confirms `lfs: unset`.
- **Recovery layer (last-resort):** `.planning/.snapshots/{UTC}/` — every successful commit triggers a snapshot of ROADMAP.md, STATE.md, PROJECT.md via the pre-commit hook. Gitignored (Task 1). If a 0-byte commit somehow lands despite the hook + CI, the previous good state is one `cp` away. Snapshot dirs are timestamped with UTC to avoid cross-machine clock drift.
- **One-shot installer:** `scripts/install-hooks.sh` (Task 1) — sets `git config core.hooksPath .githooks`; smoke-tests the hook with empty stdin to catch syntax errors at install time.

## Install Status (this clone)

In a standalone Word2Vec repo (the layout this plan was written for), running `bash scripts/install-hooks.sh` from the repo root would set `core.hooksPath=.githooks` exactly as the plan specifies.

In **this clone**, the Word2Vec project is a subtree of a single combined repo at `C:/Users/Eason/` whose `git rev-parse --show-toplevel` resolves to the worktree root, not the Word2Vec subdir. To wire the hook up for this clone without affecting other worktrees or the F1 Dashboard subtree, the executor used per-worktree configuration:

```
git config extensions.worktreeConfig true
git config --worktree core.hooksPath "Desktop/CC/Word2Vec Genre Analyser/.githooks"
```

`git config --get core.hooksPath` from this worktree now returns `Desktop/CC/Word2Vec Genre Analyser/.githooks`, and `sh "$(git config --get core.hooksPath)/pre-commit" </dev/null` exits 0. The hook is installed and the smoke test passes.

**Known limitation:** The hook's regex `^\.planning/.*\.md$` (Task 1, line ~14 of `.githooks/pre-commit`) matches staged paths beginning with `.planning/`. In the giant-repo layout, staged Word2Vec planning files are prefixed (`Desktop/CC/Word2Vec Genre Analyser/.planning/...`), so the regex does **not** match them and the 0-byte guard does **not** fire on `git commit` operations performed from the giant-repo root. When the Word2Vec project is later extracted to its own standalone repo (matching the layout assumed by `.planning/research/STACK.md` and `CLAUDE.md`'s "Fresh Machine Setup" instructions), the hook will fire as designed without any code change. The CI backstop (`.github/workflows/planning-files-check.yml`) similarly assumes a `.planning/` at repo root.

For full enforcement under the current giant-repo layout, the hook's regex would need to be loosened to `\.planning/.*\.md$` (drop the `^` anchor). That adaptation is **out of scope** for Plan 06-01 (the plan specifies the literal hook content). Tracking as a follow-up in `deferred-items.md`.

## Remaining Risk

If the root cause is the GSD command bug hypothesized above, the prevention layers (local hook + CI backstop + LFS exclusion + snapshots) still mitigate — the bug will be caught at commit time before it can damage repo history. Re-audit if a wipe recurs despite all four layers; the most likely surface for a recurrence is the giant-repo path-prefix limitation noted above (resolved automatically once Word2Vec is its own repo, or by relaxing the hook's regex).
