---
phase: "01"
plan: "01-01"
subsystem: corpus-pipeline
tags: [corpus, preprocessing, gutenberg, nltk, tokenization]
dependency_graph:
  requires: []
  provides: [data/raw/*.txt, data/processed/*.json, scripts/01_download_corpus.py, scripts/02_preprocess.py]
  affects: [01-02-word2vec-training, 01-03-homology-validation]
tech_stack:
  added: [gutenbergpy, nltk, pyyaml, pytest]
  patterns: [pathlib for all paths, dot-notation CLI overrides, fail-soft download with logging]
key_files:
  created:
    - config/params.yaml
    - corpus/books.yaml
    - scripts/utils.py
    - scripts/01_download_corpus.py
    - scripts/02_preprocess.py
    - tests/conftest.py
    - tests/test_corpus.py
    - tests/test_preprocess.py
    - requirements.txt
    - pytest.ini
  modified: []
decisions:
  - "Use re.findall(r'[a-z]+') for tokenization — combines lowercase, punctuation removal, and splitting in one pass; avoids NLTK tokenizer overhead"
  - "Validate Gutenberg IDs as positive integers before constructing file paths (path traversal prevention per threat model)"
  - "10,000 unique word minimum enforced post-stopword-removal; books below threshold logged and skipped rather than aborting the run"
  - "Download script is resumable: skips files already on disk with size > 1000 bytes"
  - "Custom pytest markers (integration, slow) registered in pytest.ini to eliminate warnings from CI runs"
metrics:
  duration_minutes: 15
  completed_date: "2026-04-12"
  tasks_completed: 3
  files_created: 10
---

# Phase 1 Plan 01: Corpus Assembly and Text Processing Pipeline Summary

Corpus download and preprocessing pipeline using gutenbergpy to fetch 15 public domain books across 3 genres, with regex tokenization, NLTK stopword removal, and JSON output per book.

## What Was Built

**Configuration scaffold** (`config/params.yaml`, `corpus/books.yaml`): All pipeline parameters centralized with YAML; 15 books (5 per genre: horror, scifi, romance) registered with Gutenberg IDs. CLI overrides use dot-notation keys (e.g., `corpus.download_sleep`) merged via `scripts/utils.py`.

**Download script** (`scripts/01_download_corpus.py`): Reads `corpus/books.yaml`, validates each Gutenberg ID as a positive integer (path traversal guard), skips already-downloaded files, fetches via `gutenbergpy.textget`, enforces 1000-char minimum before saving to `data/raw/{id}.txt`. Verbose per-book timing, fail-soft on individual failures, configurable sleep between downloads.

**Preprocessing script** (`scripts/02_preprocess.py`): Reads each `data/raw/*.txt`, applies `re.findall(r"[a-z]+", text.lower())` for single-pass tokenization, filters NLTK English stopwords, enforces 10,000 unique word minimum (D-13), saves `data/processed/{id}.json` with tokens list plus metadata. Warns if any genre drops below 5 books.

**Test suite**: 7 tests covering YAML validity, ID validation, tokenization, stopword removal, minimum word filter logic, and JSON output format. Integration/network tests marked with `@pytest.mark.slow` and deselected in normal runs.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 01-01-00 | Wave 0: config scaffold, test stubs, fixtures | 742d274 |
| 01-01-01 | Gutenberg download script | c0b23bd |
| 01-01-02 | Text preprocessing pipeline | 9d0d9cd |

## Deviations from Plan

### Auto-added improvements

**1. [Rule 2 - Missing Config] Added pytest.ini with marker registration**
- Found during: Task 01-01-00 verification
- Issue: Custom markers `integration` and `slow` produced `PytestUnknownMarkWarning` warnings that would clutter CI output
- Fix: Created `pytest.ini` registering both markers with descriptions
- Files modified: `pytest.ini` (new)
- Commit: 742d274 (included in scaffold commit)

## Known Stubs

None. All scripts are complete implementations. Data files (`data/raw/`, `data/processed/`) are empty until `01_download_corpus.py` and `02_preprocess.py` are run — this is expected and intentional; these are runtime outputs, not stubs.

## Threat Flags

None. All threat model mitigations from the plan are implemented:
- UTF-8 decode with `errors='replace'` on all Gutenberg text
- Gutenberg ID validated as positive integer before use in file paths
- Download sleep enforced (configurable, default 2s)
- Text length validated before saving

## Self-Check: PASSED

Files exist:
- config/params.yaml: FOUND
- corpus/books.yaml: FOUND
- scripts/utils.py: FOUND
- scripts/01_download_corpus.py: FOUND
- scripts/02_preprocess.py: FOUND
- tests/conftest.py: FOUND
- tests/test_corpus.py: FOUND
- tests/test_preprocess.py: FOUND
- requirements.txt: FOUND
- pytest.ini: FOUND

Commits exist:
- 742d274: FOUND (Wave 0 scaffold)
- c0b23bd: FOUND (download script)
- 9d0d9cd: FOUND (preprocess script)

Test results: 7 passed, 1 deselected (slow/integration) in 1.01s
