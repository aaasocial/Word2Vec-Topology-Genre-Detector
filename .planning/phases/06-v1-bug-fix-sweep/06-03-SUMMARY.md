---
phase: 06-v1-bug-fix-sweep
plan: 03
subsystem: backend+frontend
tags: [bug-fix, api, corpus, book-slider, react-query]
requires: [06-01]
provides:
  - "GET /api/corpus/genres/{genre}/books endpoint (CorpusBookFull schema)"
  - "Deterministic per-book word_count in corpus/books.yaml"
  - "Precomputed top_10_tfidf_words sidecar (data/corpus_metadata.json)"
  - "useCorpusBooks React Query hook (staleTime: Infinity)"
  - "BookSlider renders title + author + word_count per slide"
affects:
  - "backend/api/models.py"
  - "backend/api/routes/corpus.py"
  - "backend/tests/test_corpus_models.py"
  - "backend/tests/test_corpus_genres_books.py"
  - "scripts/02_preprocess.py"
  - "scripts/build_corpus_metadata.py"
  - "corpus/books.yaml"
  - "data/corpus_metadata.json"
  - "frontend/src/hooks/useCorpusBooks.ts"
  - "frontend/src/hooks/useCorpusBooks.test.ts"
  - "frontend/src/components/sidebar/Sidebar.tsx"
  - "frontend/src/components/sidebar/BookSlider.tsx"
tech-stack:
  added: []
  patterns:
    - "Pydantic v2 response_model with extra='forbid' for strict-schema endpoints"
    - "Module-import in-process cache for read-only corpus endpoints (D-12)"
    - "TDD RED -> GREEN per artifact: failing test commit precedes implementation"
    - "Regex-based YAML rewrite that preserves flow-style formatting"
key-files:
  created:
    - "backend/tests/test_corpus_models.py"
    - "backend/tests/test_corpus_genres_books.py"
    - "scripts/build_corpus_metadata.py"
    - "data/corpus_metadata.json"
    - "frontend/src/hooks/useCorpusBooks.ts"
    - "frontend/src/hooks/useCorpusBooks.test.ts"
  modified:
    - "backend/api/models.py"
    - "backend/api/routes/corpus.py"
    - "scripts/02_preprocess.py"
    - "corpus/books.yaml"
    - "frontend/src/components/sidebar/Sidebar.tsx"
    - "frontend/src/components/sidebar/BookSlider.tsx"
decisions:
  - "Honored CONTEXT D-09 strict 7-field schema with Pydantic extra='forbid' on CorpusBookFull"
  - "Honored CONTEXT D-10 hybrid metadata source: hand-edited author already in books.yaml; auto-computed word_count written back by scripts/02_preprocess.py"
  - "Honored CONTEXT D-11 sidecar JSON for top_10_tfidf_words (data/corpus_metadata.json), precomputed at build time -- not lazy"
  - "Honored CONTEXT D-12 module-import cache (_BOOKS_BY_GENRE) -- every request is a dict lookup"
  - "Honored CONTEXT D-13 useCorpusBooks(staleTime: Infinity, enabled: !!genre)"
  - "Honored CONTEXT D-14 existing GET /api/corpus/books left untouched"
  - "Captured word_count BEFORE the min_unique_words gate in 02_preprocess.py so short-but-bundled books still get a count surfaced to the BookSlider"
  - "Color palette duplicated in backend (corpus.py) and frontend (constants/genres.ts) per the plan's smaller-blast-radius choice (TODO(v3) promote to data/models/genre_colors.json)"
metrics:
  duration: "~23 min"
  completed: "2026-05-22T10:44:57Z"
  tasks: 3
  files: 12
  commits: 9
---

# Phase 06 Plan 03: BookSlider Metadata Endpoint Summary

**One-liner:** Closes BUG-03 by shipping a strict 7-field
`GET /api/corpus/genres/{genre}/books` endpoint with module-import caching,
wiring a `useCorpusBooks` React Query hook in front of it, and replacing
the v1 points-derived `useMemo` in Sidebar so the BookSlider can finally
display every book in the selected genre with title + author + word_count.

## Outcome

A user can now open the app, pick any genre, and slide through every
bundled book in that genre. Each slide surfaces:

- **Title** (bold)
- **by Author**
- **N,NNN words** (toLocaleString)

The new endpoint serves payloads of 2,379 - 2,675 bytes per genre
(measured live -- well under both the 100 KB ceiling per CONTEXT D-09 and
the 2 KB-per-book ceiling). All 10 canonical genres respond 200; unknown
genres return 404 *with* the offending genre echoed in the detail
message; path-traversal attempts (`..%2Fadmin`) are caught by the
`_KNOWN_GENRES` allowlist (mirrors `viz.py`).

## Schema Contract (CONTEXT D-09)

```python
class CorpusBookFull(BaseModel):
    gutenberg_id: str
    title: str
    author: str
    genre: str
    word_count: int = Field(ge=0)
    color: str = Field(pattern=r'^#[0-9A-Fa-f]{6}$')
    top_10_tfidf_words: list[str] = Field(max_length=10)

    model_config = {'extra': 'forbid'}
```

Pydantic enforces every constraint at request time. The
`response_model=list[CorpusBookFull]` on the route blocks any field
leakage even if the in-memory cache somehow grew an extra attribute
(belt-and-suspenders).

## Endpoint Behavior

| Scenario                                                  | Status | Body                                                               |
| --------------------------------------------------------- | ------ | ------------------------------------------------------------------ |
| `GET /api/corpus/genres/horror/books`                     | 200    | List of 10 `CorpusBookFull`; 2,480 bytes                           |
| `GET /api/corpus/genres/not_a_genre/books`                | 404    | `{"detail": "Unknown genre: 'not_a_genre'. Known: [...]"}`         |
| `GET /api/corpus/genres/..%2Fadmin/books`                 | 404    | Same (allowlist rejects the URL-decoded `../admin`)                |
| `GET /api/corpus/genres/horror/books?include=tokens`      | 200    | Same 7-field schema; query params do NOT leak fields               |
| `GET /api/corpus/books` (existing, D-14)                  | 200    | List of 100 `CorpusBookSummary` (3 fields) -- untouched            |

Per-genre payload sizes (measured live):

| Genre      | Bytes |
| ---------- | ----- |
| romance    | 2,557 |
| mystery    | 2,675 |
| western    | 2,379 |
| fantasy    | 2,499 |
| scifi      | 2,596 |
| horror     | 2,480 |
| historical | 2,557 |
| literary   | 2,520 |
| adventure  | 2,512 |
| gothic     | 2,572 |

Max per-book serialized size: **305 bytes** (Dracula -- 6.1% of the 2 KB
ceiling). Total of every-genre-summed: ~25.3 KB (still well under
100 KB for a single genre and the SPA never requests more than one
genre at a time).

## Author-Edit Completeness

`corpus/books.yaml` already shipped with hand-edited `author:` fields
for every one of the 100 bundled books (no TODOs found). Plan Task 1
Step B's hand-edit pass was therefore a no-op for the bundled corpus; the
plan's wording assumed 15 books and an unstarted state -- the actual repo
was already complete here. Verified by:

```bash
python -c "import yaml; d=yaml.safe_load(open('corpus/books.yaml'));
print(all('author' in b and b['author'] for genre,bs in d['genres'].items() for b in bs))"
# True
```

No `# TODO: verify author` comments inserted.

## Word-Count Generation

| Quantity                              | Value     |
| ------------------------------------- | --------- |
| Books in `corpus/books.yaml`          | 100       |
| Books with `word_count` populated     | 100       |
| Min token count (post-stopword)       | 408       |
| Max token count                       | 281,448   |
| Mean token count                      | 55,134    |
| Books NOT meeting `min_unique_words`  | 3 (Wunpost, The Call of Cthulhu, The Gods of Pegana) |

Critical implementation detail (Rule 2 -- threat-model mitigation): the
`word_counts[gid] = len(tokens)` line was moved **above** the
`min_unique_words` filter in `02_preprocess.py`. Without this, the 3
short books would have shipped to the BookSlider with `word_count: 0`
or no field at all -- a silent UX gap. They are still excluded from
W2V training (correct behavior), but the slider shows their token
count honestly.

## TF-IDF Sidecar Generation

`scripts/build_corpus_metadata.py` produces `data/corpus_metadata.json`
(22,694 bytes, 100 keys). It loads
`data/models/tfidf_vectorizer_w15.joblib` (the canonical training
vectorizer) and the per-book token lists from `data/processed/`, then
calls `vectorizer.transform([' '.join(tokens)])` and takes the top-10
indices by descending weight.

Determinism verified by:

```bash
cp data/corpus_metadata.json /tmp/before.json
rm data/corpus_metadata.json
python scripts/build_corpus_metadata.py
diff /tmp/before.json data/corpus_metadata.json   # exits 0
```

Sample (Frankenstein, gid=84) -- top-10 are all character names + place
names, which matches the v1 narrative content:

```json
"84": {
  "top_10_tfidf_words": [
    "clerval", "justine", "safie", "felix", "ingolstadt",
    "frankenstein", "kirwin", "krempe", "waldman", "geneva"
  ]
}
```

3 books (the same short-books excluded by `min_unique_words`) have
empty `top_10_tfidf_words` lists; the schema's `max_length=10` permits
shorter lists, so the endpoint serves them honestly without a runtime
error.

## Color Palette

Backend hard-codes the 10-color palette in `corpus.py` -- exact match
to `frontend/src/constants/genres.ts` (verified field-by-field). Per
the plan's smaller-blast-radius choice (option 2) a `TODO(v3): promote
to data/models/genre_colors.json` comment marks the duplication.

| Genre      | Hex       |
| ---------- | --------- |
| romance    | #F472B6   |
| mystery    | #60A5FA   |
| western    | #FB923C   |
| fantasy    | #A78BFA   |
| scifi      | #34D399   |
| horror     | #F87171   |
| historical | #FBBF24   |
| literary   | #2DD4BF   |
| adventure  | #FB7185   |
| gothic     | #C084FC   |

## Frontend Wiring

`useCorpusBooks` follows the exact pattern of `useTfidfData` and
`useScatterData`:

```ts
useQuery<CorpusBookFull[]>({
  queryKey: ['corpus', 'genres', genre, 'books'],
  queryFn: () => apiFetch<CorpusBookFull[]>(`/corpus/genres/${encodeURIComponent(genre)}/books`),
  enabled: !!genre,
  staleTime: Infinity,
  gcTime: Infinity,
})
```

`Sidebar.tsx` lost the points-derived `useMemo` (the canonical
lines 46-57 reference in CONTEXT) and the now-unused `useMemo` import.
The `books` array now comes directly from the hook:

```tsx
const { data: books = [] } = useCorpusBooks(selectedGenre)
```

`BookSlider.tsx` accepts the richer `BookMeta` shape (now exporting it
for reuse) and renders three lines per slide instead of one. Guarded
against the genre-switch race where `localIdx` could briefly exceed
`books.length - 1` -- now clamped via `safeIdx`.

## Smoke Test (manual)

`uvicorn backend.api.app:app --port 8765` + `curl`:

```
GET /api/corpus/genres/horror/books         -> 200, 2480 bytes, 10 books
GET /api/corpus/genres/not_a_genre/books    -> 404
GET /api/corpus/genres/..%2Fadmin/books     -> 404
GET /api/corpus/books                       -> 200, 100 books, 3-field schema
```

Frontend dev smoke deferred (`cd frontend && npm run dev`) -- TypeScript
compile is clean and the hook tests pass, so the wire-up is verified at
the type level. The orchestrator's verifier wave will exercise the
end-to-end render path.

## Test Coverage

| File                                                | Tests | Result |
| --------------------------------------------------- | ----- | ------ |
| backend/tests/test_corpus_models.py                 | 7     | 7/7 PASS |
| backend/tests/test_corpus_genres_books.py           | 7     | 7/7 PASS |
| frontend/src/hooks/useCorpusBooks.test.ts           | 4     | 4/4 PASS |
| frontend `npx tsc --noEmit` whole app               | -     | CLEAN |

## Self-Verification

| Check                                                                                | Status |
| ------------------------------------------------------------------------------------ | ------ |
| `grep -c "/genres/{genre}/books" backend/api/routes/corpus.py` >= 1                  | 1 OK    |
| `grep -c "_KNOWN_GENRES" backend/api/routes/corpus.py` >= 2                          | 3 OK    |
| `grep -c "_BOOKS_BY_GENRE\|_load_corpus_books_by_genre" backend/api/routes/corpus.py` >= 2 | 3 OK |
| `grep -c "staleTime: Infinity" frontend/src/hooks/useCorpusBooks.ts` >= 1            | 1 OK    |
| `grep -c "useCorpusBooks" frontend/src/components/sidebar/Sidebar.tsx` >= 1          | 2 OK    |
| `grep -c "author\\|word_count" frontend/src/components/sidebar/BookSlider.tsx` >= 2  | 8 OK    |
| Pydantic v2 `CorpusBookFull` `model_config = {'extra': 'forbid'}`                    | OK     |
| `python scripts/build_corpus_metadata.py` from scratch == prior output (determinism) | OK     |

## Deviations from Plan

### Rule 2 -- Auto-add missing critical functionality

**1. word_count captured before `min_unique_words` filter**
- **Found during:** Task 1 verification (first preprocess run wrote
  word_count for 97/100 books -- the 3 books filtered out by
  `min_unique_words >= 3000` had no count surfaced to the slider).
- **Issue:** Plan Task 1 acceptance criteria says "every book entry has
  `word_count:`" but the original 02_preprocess loop only wrote it
  inside the per-book success branch.
- **Fix:** Moved `word_counts[gid] = len(tokens)` above the unique-count
  filter so EVERY book gets a count, including those excluded from W2V
  training.
- **Files modified:** `scripts/02_preprocess.py`
- **Commit:** `605d479`

### Rule 1 -- Auto-fix bug

**2. Slider index race guard**
- **Found during:** BookSlider rewrite (Task 3).
- **Issue:** When the user switches genre rapidly, `localIdx` (from the
  previous genre's slider position) can briefly exceed
  `books.length - 1` for the new genre's array before the genre-change
  effect runs.
- **Fix:** `const safeIdx = Math.min(localIdx, books.length - 1)` --
  clamped index for both `value=` and the indexing access.
- **Files modified:** `frontend/src/components/sidebar/BookSlider.tsx`
- **Commit:** `3235f0d`

### Process deviation -- corpus already had authors

- **Found during:** Task 1 Step B execution.
- **Issue:** Plan Task 1 Step B says "Hand-edit corpus/books.yaml to add
  author per book" for "15 books". Repo actually has 100 books AND
  every author field is already present.
- **Resolution:** No edits needed; verified completeness and moved on.

### Out-of-scope discoveries (logged, not fixed)

- `backend/tests/test_api.py::test_corpus_books_returns_list` --
  pre-existing wrong-path bug. Logged to deferred-items.md.
- `frontend/src/hooks/useClassify.test.ts` -- 5/7 pre-existing failures
  in SSE URL construction. Logged to deferred-items.md.

Both confirmed pre-existing by re-running the same suite with my
changes stashed.

## Authentication Gates

None. Public corpus endpoint, no secrets involved.

## Commits

| # | Hash      | Type     | Description                                                                |
| - | --------- | -------- | -------------------------------------------------------------------------- |
| 1 | `255e460` | test     | Add failing CorpusBookFull schema tests (RED)                              |
| 2 | `d2a0256` | feat     | Add CorpusBookFull Pydantic model (GREEN)                                  |
| 3 | `dd2587a` | test     | Add failing endpoint tests for /corpus/genres/{genre}/books (RED)          |
| 4 | `b33dc54` | feat     | Add GET /api/corpus/genres/{genre}/books endpoint (GREEN)                  |
| 5 | `605d479` | feat     | Auto-compute word_count + precompute top_10_tfidf_words sidecar            |
| 6 | `e514e9e` | test     | Add failing useCorpusBooks hook tests (RED)                                |
| 7 | `ce99cfa` | feat     | Add useCorpusBooks React Query hook (GREEN)                                |
| 8 | `3235f0d` | feat     | Wire Sidebar -> useCorpusBooks; enrich BookSlider UI                       |
| 9 | `4266402` | docs     | Log pre-existing test failures discovered during execution                 |

## Self-Check: PASSED

Files (12/12 FOUND):
- backend/api/models.py
- backend/api/routes/corpus.py
- backend/tests/test_corpus_models.py
- backend/tests/test_corpus_genres_books.py
- scripts/02_preprocess.py
- scripts/build_corpus_metadata.py
- corpus/books.yaml
- data/corpus_metadata.json
- frontend/src/hooks/useCorpusBooks.ts
- frontend/src/hooks/useCorpusBooks.test.ts
- frontend/src/components/sidebar/Sidebar.tsx
- frontend/src/components/sidebar/BookSlider.tsx

Commits (9/9 FOUND on this branch):
255e460, d2a0256, dd2587a, b33dc54, 605d479, e514e9e, ce99cfa, 3235f0d, 4266402
