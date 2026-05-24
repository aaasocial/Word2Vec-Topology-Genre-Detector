# Corpus shape — author distribution audit (Phase 7 draft fragment — to be assembled into CORPUS_SOURCING.md)

> Sources for `CORPUS_SOURCING.md` §"Author distribution audit" and §"books.yaml schema additions". Decision IDs implemented: D-06, D-07, D-08, D-10. Reads `.planning/research/v2/corpus_candidates.yaml` (Plan 03 Task 1) to compute v2 numbers.

## Author distribution audit

Per **D-08** (hard constraint): every genre must have ≥8 distinct authors. Per **D-07**: no per-author cap inside a genre. The combination is the controlled trade: we accept prolific-author concentration in exchange for a tight per-author held-out smoke test (**D-17**, ≤10pp gap pass criterion — defined in `VALIDATION_PROTOCOL.md`).

PITFALLS.md §5 ("Author overlap leakage") identifies author-style memorisation as the dominant failure mode for small-corpus genre classifiers. With D-07 in force, this audit + the D-17 smoke test are the **only** defences. The audit must therefore be honest about where author concentration is high — those rows identify the highest-risk authors for the smoke test to target.

### v1 baseline (current 100-book corpus)

Computed from `corpus/books.yaml` (commit `db7b1f8`, 2026-04-13 — the actual v1 corpus, not the stale "3 genres × 5 books" framing in PROJECT.md / REQUIREMENTS.md). Snippet:

```python
import yaml
from collections import Counter
v1 = yaml.safe_load(open('corpus/books.yaml', encoding='utf-8'))
for genre, books in v1['genres'].items():
    authors = Counter(b['author'] for b in books)
    print(genre, len(authors), authors.most_common(1)[0])
```

| Genre      | Distinct authors / 10 | Most-prolific author / count    | Meets D-08 floor (≥8)? |
|------------|----------------------|---------------------------------|------------------------|
| romance    | 4                    | Jane Austen / 6                 | no                     |
| mystery    | 6                    | Agatha Christie / 3             | no                     |
| western    | 4                    | Zane Grey / 6                   | no                     |
| fantasy    | 4                    | William Morris / 4              | no                     |
| scifi      | 4                    | Jules Verne / 5                 | no                     |
| horror     | 7                    | H. P. Lovecraft / 4             | no                     |
| historical | 7                    | Alexandre Dumas / 3             | no                     |
| literary   | 7                    | Ernest Hemingway / 2            | no                     |
| adventure  | 8                    | Robert Louis Stevenson / 2      | yes                    |
| gothic     | 10                   | (all authors distinct, 1 each)  | yes                    |

**Finding:** 8 of 10 v1 genres violate D-08. romance, western, and fantasy concentrate ≥40% of their books in a single author (Austen 6/10, Grey 6/10, Morris 4/10). The candidate-shortlist in `corpus_candidates.yaml` corrects this — every genre's candidate list has ≥8 distinct authors per Task 1's verification, with significant headroom in most genres.

### v2 candidate-list audit (from `corpus_candidates.yaml`)

Computed by running this reference snippet against `.planning/research/v2/corpus_candidates.yaml`:

```python
import yaml
from collections import Counter
data = yaml.safe_load(open('.planning/research/v2/corpus_candidates.yaml', encoding='utf-8'))
for genre, g in data['genres'].items():
    authors = Counter(c['author'] for c in g['candidates'])
    distinct = len(authors)
    most_prolific = authors.most_common(1)[0] if authors else ('-', 0)
    print(f"{genre}: {distinct} distinct authors; most-prolific = {most_prolific[0]} x {most_prolific[1]}")
```

| Genre      | Distinct authors in candidate list | Most-prolific candidate author / count | D-08 satisfied (≥8 distinct)? |
|------------|------------------------------------|----------------------------------------|-------------------------------|
| romance    | 20                                 | Jane Austen / 7                        | yes                           |
| mystery    | 22                                 | Arthur Conan Doyle / 8                 | yes                           |
| western    | 12                                 | Zane Grey / 17                         | yes                           |
| fantasy    | 11                                 | Lord Dunsany / 11                      | yes                           |
| scifi      | 14                                 | Jules Verne / 14                       | yes                           |
| horror     | 14                                 | H. P. Lovecraft / 8                    | yes                           |
| historical | 21                                 | Walter Scott / 7                       | yes                           |
| literary   | 15                                 | Henry James / 6                        | yes                           |
| adventure  | 14                                 | Mark Twain / 7                         | yes                           |
| gothic     | 28                                 | Charles Brockden Brown / 4             | yes                           |

**Finding:** every genre clears the D-08 floor. Author concentration remains highest in western (Zane Grey 17/52, 33%), fantasy (Dunsany 11/50, 22%), scifi (Verne 14/50, 28%), and horror (Lovecraft 8/50, 16%). These four genres are the priority targets for the D-17 per-author smoke test — if author-style memorisation is driving classification, those genres should show the widest held-out gap.

Per **D-07** (no per-author cap), Phase 8 is *not required* to compress these concentrations when picking the final 25–30 per genre. The candidate ordering (source_consensus_score descending, gutenberg_id ascending) means the most-canonical works are first in the list regardless of author; Phase 8's selection rule below ensures author diversity is satisfied at the floor without artificially capping the ceiling.

### Per-author held-out smoke test prerequisite (D-17 cross-reference)

`VALIDATION_PROTOCOL.md` (Plan 04 output) specifies a per-author held-out smoke test with **≤10pp gap pass criterion**. That test depends on this audit:

- The set of **authors with ≥2 books in the final corpus** (Phase 8 picks) drives the test set. From the v2 audit above, the high-risk priority list is: Zane Grey (western), Lord Dunsany (fantasy), Jules Verne (scifi), H. P. Lovecraft (horror), Arthur Conan Doyle (mystery), Mark Twain (adventure), Walter Scott (historical), Jane Austen (romance), Henry James (literary), Charles Brockden Brown (gothic). Each of these will get a dedicated hold-out fold.
- Given D-07 (no per-author cap), the prolific-author rows in this audit identify the highest-risk authors. The smoke test holds each of them out completely and verifies the model still classifies their works correctly — if the model collapses (gap > 10pp), the genre signal is dominated by author style and the corpus restructure has failed PITFALLS §5.
- Authors with only **1 book** in the final corpus are **not part of the smoke test** (no within-author signal possible). v2's wider author distribution means most "1-book authors" simply contribute to the genre's diversity floor without participating in the smoke test.

### Corpus shape decisions (D-06, D-07, D-08)

- **Books per genre (D-06):** **25**. Single number, no range. Defensible against either Plan 02 outcome:
  - If Plan 02 recommends **Proposal C** (keep all 10 genres) — 10 × 25 = 250 corpus → 50 hold-out (5/genre).
  - If Plan 02 recommends **Proposal A** (merge to 8) or **Proposal B** (drop 2) — 8 × 25 = 200 corpus, or Phase 8 may pick 30/genre from the same candidate pool (≥50 candidates per genre supports both 25 and 30 selections). Phase 8 makes the final pick from the user-approved Plan 02 recommendation; the candidate YAML is sized for either outcome.
- **Genre count:** depends on Plan 02 recommendation (Wave 1 sibling plan). The candidate YAML covers all 10 v1 genres so any Plan 02 outcome is consumable.
- **Total corpus size:** 250 if Proposal C, 200–240 if Proposal A/B (Phase 8 commits the final number).
- **Per-author cap (D-07):** **NONE**. Prolific public-domain authors who define a genre (Austen, Wells, Verne, Zane Grey, Lovecraft, Dumas, Doyle, Scott, etc.) may contribute as many works as the candidate shortlist + Phase 8's final selection process retains. The risk is documented; the mitigation is **D-17, not a per-author cap**. The candidate list explicitly preserves prolific-author entries (Grey 17, Verne 14, Dunsany 11, Lovecraft 8, Doyle 8, Austen 7, James 6, etc.).
- **Distinct authors per genre (D-08):** **≥8 distinct authors per genre** is a hard constraint. Candidate shortlists already satisfy this (minimum 11 in fantasy, maximum 28 in gothic); Phase 8 must preserve it when picking the final 25 (or 30) — see selection rule below.

### Phase 8 selection rule

Given a genre's candidate list (≥50 entries, ≥8 distinct authors, sorted by source_consensus_score desc / gutenberg_id asc), Phase 8's selection procedure is **deterministic** and reproducible from this candidate YAML alone:

1. **Author-diversity floor first.** Take the top-scored (by source_consensus_score) title from each distinct author in the candidate list, up to 8 authors. This guarantees ≥8 distinct authors are covered before the per-author concentration kicks in.
2. **Fill remaining slots by consensus score.** Fill the remaining slots (25 − 8 = 17, or 30 − 8 = 22) by walking the sorted candidate list and adding any title not yet selected, breaking ties by ascending gutenberg_id.
3. **Word-count gate.** Skip any candidate that fails the word-count minimum (Phase 8 picks a threshold; tentatively **≥20,000 words per book** — short-story collections may have individual entries below this but full collections clear the bar). Phase 8's `scripts/build_corpus.py` enforces this at fetch time.
4. **Gutenberg-availability gate.** Skip any candidate whose Gutenberg edition is missing, corrupt, or has unstripped header/footer issues. Phase 8 catches this at fetch time using the existing `scripts/01_download_corpus.py` + `scripts/02_preprocess.py` pipeline.
5. **Record drops and replacements.** Phase 8 emits a corpus-build log listing every candidate that was skipped (with reason) and every replacement that was promoted. The next available candidate by step-2 ordering takes the slot.

This procedure is deterministic given (a) the candidate YAML, (b) the word-count threshold, (c) the Gutenberg-fetch outcomes. Phase 8's `scripts/build_corpus.py` (CEXP-05 P2) can emit the same final list on every run from the same `corpus_candidates.yaml` — corpus reproducibility per the Phase 6 BUG-05 cache-key invariant.

## books.yaml schema additions (D-10)

Phase 7 specifies these additions; Phase 8 applies them to `corpus/books.yaml` during CEXP-01.

**Existing schema (v1):**

```yaml
- {gutenberg_id: 84, title: "Frankenstein", author: "Mary Shelley", word_count: 75500}
```

**v2 additions (D-10):**

```yaml
- {gutenberg_id: 84, title: "Frankenstein", author: "Mary Shelley",
   word_count: 75500,
   source:
     provider: "gutenberg"           # one of: gutenberg, standard_ebooks, internet_archive
     fetched_at: "2026-06-XX"        # ISO 8601 date of the text fetch
     text_sha256: "abc123def456..."} # sha256 of the canonical preprocessed text bytes
```

**Field semantics:**

- **`source.provider`** — string enum, lowercase snake_case. Identifies which text-fetch source per the verdicts in `_drafts/02_source_evaluation.md` (Plan 02 output). v2 expects mostly `"gutenberg"`; `"standard_ebooks"` permitted for titles where SE has a cleaner edition; `"internet_archive"` only as the documented escape hatch per D-04.
- **`source.fetched_at`** — ISO 8601 date (`YYYY-MM-DD`). Records when the text bytes were retrieved. Phase 8's `scripts/build_corpus.py` populates this at fetch time; immutable thereafter.
- **`source.text_sha256`** — hex string (64 chars). sha256 of the post-preprocessing canonical bytes (after Gutenberg header/footer stripping, before tokenisation). Used together with `corpus_hash` (Phase 6 BUG-05) to detect silent corpus drift and to verify reproducibility between machines.

**Backward compatibility:** the new `source` field is **additive**. `backend/api/routes/corpus.py::_load_books_metadata()` ignores unknown keys — Phase 8 verifies this with a fixture loaded against the new schema before bulk-applying. The existing 100-book v1 entries either gain a `source: {provider: "gutenberg", fetched_at: "2026-04-13", text_sha256: "..."}` populated from the v1 fetch logs, OR are dropped during the v2 restructure (in which case the schema change only applies to the 25-or-30 final picks per genre).

**Single source of truth:** `corpus/books.yaml` is the only manifest. There is **NO** sibling `corpus/sources.yaml`. All provenance lives on each book.

## Phase 7 self-check

Per **D-06**: ☑ single number committed (25; no range)
Per **D-07**: ☑ no per-author cap imposed in candidate list (Zane Grey 17, Verne 14, etc. preserved)
Per **D-08**: ☑ ≥8 distinct authors per genre in candidate list (minimum 11 fantasy, max 28 gothic)
Per **D-10**: ☑ schema spec with provider / fetched_at / text_sha256 written above; Phase 8 applies it
Per **D-19**: ☑ candidate list ≥50 per genre (see `corpus_candidates.yaml` — 50 to 54 per genre)
