---
phase: 07-corpus-sourcing-research-spike
reviewed: 2026-05-25T00:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - scripts/phase7_v1_baseline.py
findings:
  critical: 0
  warning: 2
  info: 5
  total: 7
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-05-25T00:00:00Z
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

Reviewed `scripts/phase7_v1_baseline.py`, a one-shot read-only evaluator that loads the v1 SVM artifact, picks a D-12-compliant 20-book hold-out, and emits a pinned baseline JSON for Phase 8 to compare against.

The script is well-scoped, well-documented, and defensive in the right places: it shape-checks the feature matrix, verifies the lineage sidecar before doing anything destructive, mirrors `scripts/06_validate.py` alpha-weighting exactly, and sorts JSON output for stable diffs. Determinism is achievable here because the selection rule is fully deterministic (sort-based, no random tie-break), so the unused RNG is a minor smell rather than a bug.

The two warnings are correctness-adjacent: a docstring-vs-code drift (the script claims it cross-checks `config/params.yaml`, but only reads the lineage sidecar), and a swallowed `except Exception` in the lineage echo block. Neither blocks the headline metric, but both should be tightened before this artifact is treated as audit-grade evidence in `VALIDATION_PROTOCOL.md`.

No security vulnerabilities found. `joblib.load` is invoked on a path under the repo's own `data/models/` tree (already trusted, already committed via Git LFS), not on user input. `yaml.safe_load` is used correctly. No `eval`, no `shell=True`, no untrusted deserialization surface.

## Warnings

### WR-01: Docstring promises a `params.yaml` cross-check that the code does not perform

**File:** `scripts/phase7_v1_baseline.py:24-25`
**Issue:** The module docstring states:

> "Verify lineage match before running. If lineage.json's alpha/k/window disagree with config/params.yaml values used here, refuse to run."

`verify_lineage()` (lines 81-99) only compares `lineage.json` against the hardcoded `EXPECTED_*` constants. `params.yaml` is never opened or parsed. `PARAMS_YAML` is declared as a module constant (line 62) but is unused — confirming the intent existed but was dropped. This matters because the headline baseline number could be silently invalidated if someone edits `params.yaml` (e.g., changes default `alpha` from 0.7 to 0.6) without retraining: the script would still report a result and claim lineage was verified, but the result would be against stale hyperparameters.

**Fix:** Either remove the docstring claim, or add the third leg of the check:

```python
def verify_lineage() -> None:
    """Refuse to run if v1 artifacts or live config don't match expected hyperparameters."""
    if not LINEAGE_PATH.exists():
        sys.exit(f"ERROR: lineage sidecar missing at {LINEAGE_PATH}")
    lineage = json.loads(LINEAGE_PATH.read_text(encoding="utf-8"))

    with open(PARAMS_YAML, "r", encoding="utf-8") as f:
        params = yaml.safe_load(f)
    live = {
        "alpha":      params["features"]["alpha"],
        "k_clusters": params["features"]["k_clusters"],
        "window":     params["word2vec"]["window"],
    }

    for key, expected in (("alpha", EXPECTED_ALPHA),
                          ("k_clusters", EXPECTED_K),
                          ("window", EXPECTED_WINDOW)):
        if lineage.get(key) != expected:
            sys.exit(f"ERROR: lineage.json {key}={lineage.get(key)!r}, "
                     f"expected {expected!r}. v1 SVM lineage drift detected.")
        if live[key] != expected:
            sys.exit(f"ERROR: params.yaml {key}={live[key]!r}, "
                     f"expected {expected!r}. Config drifted from v1 SVM.")
    print(f"[OK] Lineage match (sidecar + params.yaml): "
          f"alpha={EXPECTED_ALPHA}, k={EXPECTED_K}, window={EXPECTED_WINDOW}")
```

The first option (remove the claim) is cheaper if the cross-check was deliberately dropped; the second is the right call if this script is going to be cited as audit evidence.

### WR-02: Bare `except Exception` swallows lineage-echo failures silently

**File:** `scripts/phase7_v1_baseline.py:303-309`
**Issue:** The "echo the on-disk lineage sidecar for full audit trail" block catches all exceptions and swallows them. The inline comment justifies it ("Non-fatal — lineage already passed verify_lineage() so keys exist"), but that justification only covers `KeyError`. If, for example, the sidecar file becomes unreadable, gets a permission error, or contains malformed JSON between `verify_lineage()` and this block (TOCTOU window), the audit trail will be silently incomplete and the resulting JSON will be missing `corpus_hash` / `w2v_model_sha256` with no signal to the user.

For an "audit trail" that downstream Phase 8 / `VALIDATION_PROTOCOL.md` will compare against, silent omission is worse than failure.

**Fix:** Narrow the exception to the case the comment actually defends, and log at minimum when it triggers:

```python
try:
    lineage = json.loads(LINEAGE_PATH.read_text(encoding="utf-8"))
    results["v1_lineage"]["corpus_hash"] = lineage.get("corpus_hash")
    results["v1_lineage"]["w2v_model_sha256"] = lineage.get("w2v_model_sha256")
except (OSError, json.JSONDecodeError) as e:
    print(f"[WARN] Could not re-read lineage sidecar for audit echo: {e}",
          file=sys.stderr)
```

Or, given `verify_lineage()` ran two function calls earlier, just drop the try/except entirely and let it fail loudly — the file demonstrably existed seconds ago.

## Info

### IN-01: `np.random.default_rng(SEED)` is created and immediately discarded

**File:** `scripts/phase7_v1_baseline.py:171`
**Issue:** Line 171 reads `_ = np.random.default_rng(SEED)`. The RNG object is never used. The comment block (lines 169-171) acknowledges this and frames `SEED` as forward-compatibility for tie-breaker extensions. As written, this line does nothing — including not seeding numpy's global RNG (it constructs a local `Generator` and throws it away). The `SEED` constant still appears in the output JSON's `v1_lineage` block, which is the part that matters for audit.

**Fix:** Drop the dead line; the comment already explains why `SEED` exists. Reviewers reading this will wonder if they missed an implicit-global-seed effect (there isn't one — `default_rng()` does not touch `np.random`'s legacy global state).

```python
# Determinism note: selection is fully deterministic via sort-key
# (-other_count, gutenberg_id). SEED is recorded in the output JSON
# for forward compatibility with future random tie-break extensions.
```

### IN-02: Tuple type-hint on `scored` is one element too short

**File:** `scripts/phase7_v1_baseline.py:186`
**Issue:** Declared as `list[tuple[int, int, int, dict]]` (4-tuple), but each appended item on line 190 is `(other_count, int(b["gutenberg_id"]), idx, b)` — also a 4-tuple, which actually matches. However, the unpacking on line 205 (`for _, _gid, idx, _ in eligible`) reads as 4 elements too, so this is fine. (Self-correction: I initially flagged a mismatch; on re-read the annotation is correct.) **Withdrawn — no action needed.** Leaving this entry as a noted false-positive to avoid wasted reviewer time later.

### IN-03: Genre-name lookup falls back to a label-only string instead of failing

**File:** `scripts/phase7_v1_baseline.py:245`, `:250`, `:259-260`
**Issue:** `label_to_genre.get(int(lbl), f"label_{lbl}")` is used in three places to map predicted integer labels back to genre names. The fallback `f"label_{lbl}"` will silently appear in the output JSON if the SVM predicts a label that doesn't exist anywhere in the (filtered) hold-out's `book_order`. Since `book_order` is filtered to the same 99-book set the SVM was trained on, this should never trigger in practice — but if it ever does (e.g., SVM trained on labels 0-9 but `book_order` only contains 0-8 after filtering), it will appear as `"label_9"` in the per-genre F1 dict and the confusion matrix labels, masking a real corpus-vs-model mismatch.

**Fix:** Build `label_to_genre` from `books.yaml` (which already has all 10 genre names) instead of from the filtered `book_order`, or assert that every label in `y_pred` is present in `label_to_genre` after construction.

### IN-04: Magic number 400 for topology feature width is duplicated in two layers

**File:** `scripts/phase7_v1_baseline.py:68`
**Issue:** `EXPECTED_TOPO_DIMS = 400` with the comment "features.grid_resolution=20 -> 20x20 persistence image flattened". The math `20*20=400` is correct, but the value is encoded as a literal here while the source-of-truth (`config/params.yaml`) sets `features.grid_resolution: 20`. If `grid_resolution` is ever tuned, this constant won't update and the shape check on line 114 will fire with a misleading message. The same brittleness exists in `06_validate.py` (line 115 uses `400` directly), so this is consistent with existing project style — but worth flagging.

**Fix:** Derive it explicitly so the connection is auditable:

```python
EXPECTED_GRID_RES = 20
EXPECTED_TOPO_DIMS = EXPECTED_GRID_RES * EXPECTED_GRID_RES  # 20x20 persistence image
```

This is a tiny win but it makes the lineage chain (params.yaml → constants → shape check) explicit.

### IN-05: `_gid_to_genre` returned by `load_v1_artifacts` is unused at the call site

**File:** `scripts/phase7_v1_baseline.py:285`
**Issue:** `load_v1_artifacts()` builds and returns `gid_to_genre` (lines 140, 145, 147), but `main()` unpacks it as `_gid_to_genre` and discards it. The construction loop adds negligible cost (~100 iterations), but the function's return contract is wider than its consumers need, which makes the code harder to refactor.

**Fix:** Either remove `gid_to_genre` from the return tuple (and the build loop), or use it — the genre source-of-truth in `books.yaml` would be a more principled basis for `label_to_genre` than reconstructing from `book_order` (see IN-03).

---

_Reviewed: 2026-05-25T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
