---
phase: 08-corpus-expansion
reviewed: 2026-05-26T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - scripts/06_validate.py
  - scripts/audit_corpus_gids.py
  - scripts/build_corpus.py
  - scripts/clean_stale_pipeline_artifacts.py
  - scripts/drop_serious_rows.py
  - scripts/repair_corpus.py
  - scripts/test_06_validate.py
  - scripts/test_build_corpus.py
findings:
  critical: 0
  warning: 7
  info: 11
  total: 18
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-05-26T00:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Phase 8 shipped a substantial reworking of the corpus-build, integrity-audit, and SVM-validation
pipeline. The code is generally careful: most network calls have retry-with-backoff, the audit and
drop scripts are idempotent in the meaningful sense (re-running on a clean corpus is a no-op), the
build script uses atomic-style writes with deterministic sort ordering, and the validation routines
use proper sklearn primitives (GroupKFold, LeaveOneOut, fresh per-fold pipelines to avoid leakage).
Test coverage for the new code is more than "shape-of-API" — the tests verify determinism, the
author-diversity invariant, byte-identical reproducibility under mocked fetches, and the
single-book-author-exclusion guardrail. The seven warnings below are real but non-blocking; the
informational items are quality nits.

Specific focus-area conclusions:

- **Security / injection:** No injection vectors. All URLs interpolate integer `gid` only (cast to
  `int` first) or use `requests` params. The path-writing surface uses `Path` joins and trusted
  inputs. The one weak spot is the gutendex response filter in `audit_corpus_gids.py` (WR-01).
- **Correctness:** The four new §10 routines implement the protocol correctly. Two statistical
  concerns are worth surfacing: a subtle off-by-one fix in the permutation p-value formula (WR-02)
  and the fact that `evaluate_on_holdout`'s docstring contradicts how `main()` calls it — main
  trains the eval SVM on `(v2 \ holdout)` first, which is correct, so the docstring's "WAS trained
  on these ids" caveat is misleading (IN-04).
- **Idempotency:** `audit_corpus_gids.py` and `drop_serious_rows.py` are idempotent; re-running
  produces the same output (with the caveat that the audit hits gutendex and so any upstream
  metadata change would shift results — that's correctness, not idempotency). `repair_corpus.py`
  is **partially idempotent** — re-running after a successful repair would attempt to re-repair
  the same SERIOUS rows from the original audit jsonl, but because the candidates.yaml has
  already been edited the `(title, author, old_gid)` lookup keys no longer match the file, so
  edits become no-ops. This is the *practical* idempotency the task wants, but the script does
  re-do all the gutendex network work (WR-05).
- **Test coverage:** The new tests are *meaningful*. `test_select_books_returns_30_with_author_
  diversity_floor` enforces the actual semantic invariant (author-diversity floor + tiebreak
  ordering). `test_reproducible_build_produces_byte_identical_books_yaml` is a real
  reproducibility check via mocked `fetch_fn`. `test_per_author_held_out_filters_single_book_
  authors` exercises a boundary condition. Gaps noted in IN-03 (no test for `_v1_baseline()` or
  the verdict-classification ladder in `main()`), but the core logic is well-tested.

## Warnings

### WR-01: `fetch_gutendex_batch` accepts unrequested gids

**File:** `scripts/audit_corpus_gids.py:113-116`

**Issue:** The filter is

```python
for book in data.get("results", []):
    bid = int(book.get("id", -1))
    if bid in gids or bid > 0:
        results[bid] = book
```

`bid > 0` is `True` for essentially every real Gutenberg id, so the `bid in gids` test is dead — the
function will happily accept any book id gutendex returns, even ones not in the request. In
practice this is harmless today because the `ids=` parameter constrains the server's response, but
if a future gutendex change ever returns extra rows (or if the function is reused in a non-`ids`
context), the audit's classification could silently key off the wrong row. The intent is clearly
"keep only requested ids."

**Fix:**
```python
for book in data.get("results", []):
    bid = int(book.get("id", -1))
    if bid in set(gids):  # gids is a list arg; precompute outside the loop
        results[bid] = book
```
Or hoist `requested = set(gids)` before the loop and test `if bid in requested`.

### WR-02: Permutation p-value formula has a fence-post inconsistency

**File:** `scripts/06_validate.py:373-374`

**Issue:** The implementation is

```python
p_value = float((np.sum(permuted_arr >= observed) + 1) / (n_permutations + 1))
```

The docstring above (line 374) says `(count(permuted >= observed) + 1) / (n + 1)`, which is the
standard "add 1 to both numerator and denominator" Monte-Carlo p-value (Phipson & Smyth 2010).
That's the correct formula and matches the code. **However**, the `observed` macro-F1 is itself
computed on the *unpermuted* labels via LOOCV, and `permuted_arr` contains scores from LOOCV on
*permuted* labels — the comparison is therefore "is the real signal at least as extreme as a
permutation draw". The implementation is statistically correct, but two minor nits worth
flagging:

1. The condition should arguably be `permuted_arr >= observed` (currently `>=`, correct) — but if
   any permutation by chance produces an *identical* macro-F1 to observed (possible with
   small-corpus discretisation), it inflates the p-value conservatively. That's the intended
   behaviour but worth a comment.
2. The seed (`random_state=42`) is used to construct the RNG but `rng.permutation(y)` is called
   inside a loop — each call advances RNG state deterministically, which is correct, but the
   reproducibility guarantee depends on never inserting code between `np.random.default_rng(...)`
   and the loop. A comment locking this contract would protect future maintainers.

**Fix:** Add a comment on line 366 explaining "RNG state must not be perturbed before the loop —
reproducibility of `permuted_macro_f1s` depends on a fixed call sequence."

### WR-03: `evaluate_on_holdout` uses `pipe.classes_` to define label set — empty hold-out edge case

**File:** `scripts/06_validate.py:125-131`

**Issue:** When `n_in_comparison == 0` the function returns early (line 105-115), which is
correct. But when `n_in_comparison > 0` and the *predicted* labels happen not to include every
class in `svm_pipeline.classes_`, the macro-F1 is still computed across all 8 v2 classes —
`zero_division=0` handles divide-by-zero but masks the fact that several genres simply had no
test examples. The headline number is therefore averaged over many `0.0`s for classes absent
from the hold-out. On the actual 20-id hold-out (which is unlikely to cover all 8 genres
uniformly) this depresses the macro-F1 vs. what a per-class-present average would show.

**Fix:** Either (a) average only across classes present in `y_test` and document that change, or
(b) document in `_compose_report()` that macro-F1 averages over *all 8 classes* including those
with no support, so the table makes that visible. Lower-effort fix: at line 127 also compute
`macro_f1_present = f1_score(y_test, y_pred, average="macro", zero_division=0)` (no `labels=`
kwarg → sklearn uses unique labels in y_true ∪ y_pred) and surface both.

### WR-04: `is_audiobook_record` treats records with empty `formats` as non-audiobook

**File:** `scripts/repair_corpus.py:167-170`

**Issue:**

```python
formats = book.get("formats", {}) or {}
if not formats:
    return False
```

If gutendex returns a book with `formats: {}` (or absent), the function returns `False` ("not
audiobook"), meaning the candidate is considered usable. But a record with no formats at all is
*definitely* not fetchable as text — it has no URLs to try. The downstream `download_and_hash`
would then fail all three URLs in the cascade and trigger the D-30 fetch-failure halt, which is
likely the symptom that led to this script being patched in `02.1`. The semantic intent ("can
build_corpus.py fetch text for this row?") is better expressed as "treat empty formats as
audiobook-equivalent."

**Fix:**
```python
formats = book.get("formats", {}) or {}
if not formats:
    return True  # no fetchable URLs at all -> reject
```
(The current `if not text_urls: return True` branch handles the case where `formats` is non-empty
but has no `text/plain` keys — the `if not formats` branch should match that semantics.)

### WR-05: `repair_corpus.py` re-does all gutendex work on re-run

**File:** `scripts/repair_corpus.py:306-465`

**Issue:** The script is advertised as idempotent. In the *effect* sense it is — the
`edit_candidates_file` step is keyed on `(title, author, old_gid)` triples, so after a successful
run the candidates.yaml no longer matches any repair key and re-running is a no-op for the file.
But every re-run still:
1. Performs the ThreadPoolExecutor author-bulk-fetch (potentially dozens of paginated gutendex
   calls).
2. Does HTML probes on rows that previously fell into the `BENIGN_CONFIRMED via HTML probe`
   branch.
3. Rewrites the repair-decisions log from scratch.

This means a "safe re-run to confirm idempotency" can take 10+ minutes and hammer gutendex. The
script has no mode like `--skip-if-up-to-date` or a cache of prior decisions.

**Fix:** Add an early-exit check: if every SERIOUS row's `(title, author, old_gid)` triple is
absent from the current candidates.yaml AND the out-log path already exists with the expected
counts, log "candidates.yaml already repaired — re-run is a no-op" and return. Or, more
defensively, persist the per-row author-cache to disk and gate the gutendex re-fetch on a
content-hash of the input jsonl.

### WR-06: `_compose_report` has dead loop at lines 608-611

**File:** `scripts/06_validate.py:608-611`

**Issue:**

```python
n_books_per_author = Counter()
for a, acc in per_author.items():
    # Recover books-per-author from the smoke-test logic: tested only if >=2 books
    pass
```

This is a no-op block with a `pass` statement that the function does not consume. It looks like
the author intended to count books-per-author but abandoned the implementation. The
`n_books_per_author` local is never read. This is harmless but signals incomplete intent and
will trip code reviewers / linters.

**Fix:** Either delete the block, or finish the implementation — the disclaimer table currently
only shows author + accuracy; adding "(N books)" beside each row would meaningfully clarify
which low-accuracy authors are statistically meaningful vs. random:
```python
n_books_per_author = Counter(authors_arr.tolist())  # need to pass `authors` in
# then in the disclaimer: f"- {author}: {acc*100:.2f}% ({n_books_per_author[author]} books)"
```

### WR-07: `datetime.utcnow()` is deprecated in modern Python

**File:** `scripts/06_validate.py:991`

**Issue:**

```python
timestamp = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
```

`datetime.utcnow()` is deprecated as of Python 3.12 (`DeprecationWarning`) and returns a naive
datetime — which is exactly the bug the deprecation is trying to flag. Elsewhere in the codebase
(`scripts/build_corpus.py:265`) the correct timezone-aware form is used:

```python
return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
```

The two scripts will produce identical strings today but differ in behaviour under 3.13+.

**Fix:** Replace with `datetime.datetime.now(datetime.timezone.utc).strftime(...)` and add
`from datetime import timezone` (or do `from datetime import datetime, timezone` at the top of
the file consistent with `build_corpus.py`).

## Info

### IN-01: `clean_stale_pipeline_artifacts.py` regex misses adapter window variants

**File:** `scripts/clean_stale_pipeline_artifacts.py:78`

The pattern `^(?:diagrams|tfidf|vectors|words)_(\d+)_w\d+(?:_adap)?\.(?:npy|json)$` matches the
five filename templates listed in the comment. If the pipeline ever adds a new derived-feature
type (e.g., `histogram_{gid}_w{N}.npy`) the script silently retains stale files. Consider
either inverting the logic (delete anything matching `_{gid_not_in_keep}_w` regardless of
prefix) or making the prefix list a module-level constant near the comment so it co-evolves.

### IN-02: `clean_stale_pipeline_artifacts.py` shadows builtin `f`

**File:** `scripts/clean_stale_pipeline_artifacts.py:45-50`

The `for f in sorted(raw_dir.glob('*.txt')):` loop uses `f` as the loop variable, then the same
file is referenced as `f.unlink()`. The single-letter is acceptable but several recent Python
style guides discourage shadowing common short names. Lower-priority style nit.

### IN-03: Test coverage gaps in `test_06_validate.py`

**File:** `scripts/test_06_validate.py`

The five tests cover the four §10 routines well at the shape + determinism layer, but there is
no test for:
- `_v1_baseline()` (file-load helper) — could break silently if the JSON schema drifts.
- `_v1_holdout_support_per_v1_genre()` — produces the area-weighted denominator for the merged
  per-genre F1 table.
- The verdict classification ladder in `main()` (PASS / PARTIAL-VALIDATED / FAIL) — this is the
  business logic that drives D-31. A unit test that feeds fake numbers into a small `_decide_
  verdicts()` helper (extracted from main()) would protect against regression.
- `_area_weighted_v1_f1_for_merged()` — non-trivial arithmetic, untested.

### IN-04: `evaluate_on_holdout` docstring contradicts main() usage

**File:** `scripts/06_validate.py:92-95`

The docstring says "the svm_pipeline passed here is the production SVM (which WAS trained on
these ids if they're in v2); for true out-of-sample eval, the caller must pass an svm_pipeline
trained on (v2 corpus MINUS holdout_ids). See main() for the train/eval split." `main()` at
lines 901-909 does in fact train `eval_pipe` on `(v2 \ holdout_ids)` — i.e., the correct
out-of-sample case. The docstring's "WAS trained on these ids" warning misleads readers into
thinking the production code path is the leaky one. Rephrase to: "Caller is responsible for
passing an SVM trained on `(corpus \ holdout_gutenberg_ids)`. See main() for the canonical
split."

### IN-05: `_legacy_main` silently disables the report

**File:** `scripts/06_validate.py:790-849`

`--legacy` runs the original LOOCV + permutation flow and prints to stdout but writes no report
file. A user running `--legacy` will not see the absence — `--report-out` is silently ignored.
Either print a warning at the top of `_legacy_main()` ("legacy mode does not produce a report")
or honour `--report-out` with a minimal legacy-format report.

### IN-06: `build_corpus.py` import of `gutenbergpy` happens per call

**File:** `scripts/build_corpus.py:216`

`from gutenbergpy.textget import strip_headers` is inside `download_and_hash()`, so each book
fetch re-imports. Python caches imports so this is cheap (~µs after the first call), but it
defeats import-time error detection. If `gutenbergpy` is missing, the user sees the failure
on the *first fetch* (potentially after the file's been edited) rather than at script start.

**Fix:** Move the import to module top-level (with a `try/except ImportError` that sets a sentinel
flag), or call `from gutenbergpy.textget import strip_headers` once in `build_corpus()` and pass
the function down.

### IN-07: `repair_corpus.py` author-cache page cap may truncate prolific authors

**File:** `scripts/repair_corpus.py:93`

`max_pages: int = 5` × `BATCH_SIZE = 32` = 160 results per lastname. Authors like Twain, Dickens,
or Wells have well over 200 gutendex hits. The function logs `"%d hits across %d page(s)"` but
doesn't surface the "truncated" condition. If a SERIOUS row references a less-popular work by
a prolific author, the lookup may miss the canonical gid.

**Fix:** When `page == max_pages` and `data.get("next")` is non-empty, log a warning
("possibly truncated — author '<n>' has additional pages") so the operator can re-run with a
higher cap.

### IN-08: `_log_event` opens + closes the log file on every line

**File:** `scripts/build_corpus.py:268-271`

Each `_log_event(log_path, line)` call opens the file, writes a line, and closes it. For a full
240-book build this is several hundred open/close cycles. Not a correctness problem and the
file system handles this efficiently, but a thread-local logger or a context-managed batch
write would be cleaner.

### IN-09: `select_books` author key uses `.strip().lower()` without unicode normalization

**File:** `scripts/build_corpus.py:146`

`author = str(cand.get("author", "")).strip().lower()` does case-insensitive comparison but
doesn't NFC-normalize. Two candidate rows with the same author whose YAML uses different
unicode sequences (e.g., precomposed vs. decomposed accented characters in "Brontë" /
"Brontë") would be treated as distinct authors, satisfying the diversity floor twice.
Phase 8.1 already filtered the corpus by lastname-match against gutendex, so the practical
risk is low, but a `unicodedata.normalize("NFC", a)` would harden this.

### IN-10: `drop_serious_rows.py` assertion failure surfaces as AssertionError

**File:** `scripts/drop_serious_rows.py:135-138`

`assert gid not in serious_gids, ...` inside `verify_books_yaml` raises `AssertionError` with
no clean operator-facing message — if it ever fires, the script prints a traceback rather than
a structured error. Production-style code typically prefers `raise RuntimeError(...)` for
verifiable invariants and reserves `assert` for documentation. Lower-priority.

### IN-11: `repair_corpus.py` shared session leaks on early return

**File:** `scripts/repair_corpus.py:350-352, 506`

The `session` opened at line 350 (`requests.Session()` for HTML probes) is never `.close()`d.
For a single-shot CLI this is harmless — process exit reclaims sockets — but `requests.Session`
holds a connection pool. Wrap with `with requests.Session() as session:` for cleanliness.

---

_Reviewed: 2026-05-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
