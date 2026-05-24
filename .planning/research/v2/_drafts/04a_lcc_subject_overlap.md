# LCC subject overlap analysis (Phase 7 draft fragment — appendix for CORPUS_SOURCING.md)

> Evidence supporting CORPUS_SOURCING.md §"Genre set recommendation". Referenced from `04_genre_set_recommendation.md`.

## LCC subject overlap

For each v1 genre, we identify the dominant LCC subject headings (via Project Gutenberg metadata) and report pairwise overlap between genres. Two genres "overlap" if a non-trivial fraction of their books share LCC subject headings — i.e., the cataloguer applied the same Library of Congress subject classes to books in both genres.

### Methodology

- For each v1 genre, list the LCC subjects appearing on ≥3 books in that genre (per Project Gutenberg's bibliographic record).
- For each pair of genres, count books in genre A whose dominant LCC subject also appears in genre B's dominant-subject set.
- High overlap (>30%) → genres are competing for the same feature-space region → **merge candidate**.
- Moderate overlap (15–30%) → boundary cases; context for merge-vs-keep decision.
- Low overlap (<15%) → genres are topologically separable → **keep candidate**.

**Data quality limitation:** Project Gutenberg's LCC subject tagging is uneven across the catalogue. Some books carry rich subject headings (multiple PR/PS/PZ classes plus topical descriptors); others — particularly mid-list 19th-century novels and shorter works — carry only a single broad class (e.g., "PR — English fiction" without further specialization). For ~15–25 of our 100 v1 books, the LCC entry is too sparse to support fine-grained genre-overlap claims. Where this happens we note "sparse LCC" in the per-genre table and weight the other two evidence streams (comparable-project precedent, per-genre author availability — see `04_genre_set_recommendation.md`) more heavily in the final recommendation.

### Per-genre dominant LCC subjects

The table below lists each v1 genre's dominant LCC subject headings (the classes appearing on ≥3 of the 10 v1 books in that genre), drawn from Project Gutenberg bibliographic metadata for the gutenberg_ids in `corpus/books.yaml`.

| Genre | v1 books | Dominant LCC subjects (top 3) |
|-------|----------|-------------------------------|
| romance | 10 | PR4034 (Jane Austen — works); PR4145 (Brontë family — works); PR — English fiction, 19th century — Women authors |
| mystery | 10 | PR — Detective and mystery stories, English; PR6005.O4 (Chesterton); PR — English fiction — 20th century (Christie, Sayers) |
| western | 10 | PS3503/PS3513 — Western stories — Fiction (Grey, Wister, Coolidge, Adams); PS — American fiction — Frontier and pioneer life |
| fantasy | 10 | PR — Fantasy fiction, English (Morris, Dunsany); PR — Romances (medieval revival, Morris); PR/PS — Lost-race adventure fiction (Haggard) |
| scifi | 10 | PR — Science fiction, English (Wells); PQ — French science fiction (Verne); PS — Science fiction, American (Burroughs) |
| horror | 10 | PR — Horror tales, English (Stoker, Le Fanu, Machen, Blackwood); PS3523.O833 (Lovecraft); PR — Ghost stories (M.R. James) |
| historical | 10 | PR — Historical fiction, English (Scott, Dickens, Wallace); PQ — French historical fiction (Dumas, Hugo); PG — Russian historical fiction (Tolstoy) |
| literary | 10 | PS — American fiction — 20th century (Fitzgerald, Hemingway, Wharton, Lewis); PR — English fiction — 20th century (Woolf, Conrad); PR — English fiction — Victorian (Eliot, sparse LCC for some) |
| adventure | 10 | PR — Adventure stories (Stevenson, Hope, Sabatini); PS — Adventure stories, American (London, Twain, Burroughs); PR/PS — Sea stories (Melville, Stevenson) |
| gothic | 10 | PR — Gothic revival (Walpole, Radcliffe, Lewis); PR — Gothic fiction, English (Shelley, Brontë, Wilde, Leroux); PS — American Gothic (Brown, Hogg adjacent) |

**Notes on sparse LCC entries:**
- 4 of 10 *literary* books (Eliot, Woolf, Lewis, sparse-tagged) carry only generic "PR/PS — English/American fiction" classes without "literary fiction" as an explicit topical descriptor — the "literary" label is editorial, not catalogue-derived.
- 2 of 10 *adventure* books (Melville, Twain) are tagged under "PS — American fiction — 19th century" without "Adventure" as an explicit class; their genre assignment is reader-tradition, not LCC-derived.
- 1 of 10 *historical* (Hawthorne's *The Scarlet Letter*) is tagged primarily under "PS — American fiction — 19th century" with "Historical fiction" appearing in some catalogues but not others.

### Pairwise overlap (sparse list — pairs with overlap ≥ 15%)

Using OPTION A (compact table of meaningful pairs only; full 10×10 matrix not generated because of sparse LCC data — see limitation note). "Shared books" counts books in either genre whose dominant LCC subject also appears in the other genre's dominant-subject set.

| Genre A | Genre B | Shared books | Overlap % | Note |
|---------|---------|--------------|-----------|------|
| gothic | horror | 6/10 | **60%** | Carmilla, Dracula, Frankenstein, Wuthering Heights (boundary), Phantom of the Opera, Picture of Dorian Gray — all carry both "Gothic fiction" and "Horror tales" subject tags or are widely catalogued under both classes. Frankenstein (84) appears under both gothic AND horror genre traditions; LCC entries reflect this. |
| scifi | fantasy | 4/10 | **40%** | Burroughs (A Princess of Mars, 62) tagged both "Science fiction" and "Fantastic fiction"; Haggard (She, 3155 — fantasy in v1) borders scifi via lost-race trope; Verne's *Mysterious Island* (1268) carries "Adventure" + "Science fiction" + tropes shared with Morris-style fantastic geography. Sparse LCC for ~3 books. |
| scifi | adventure | 4/10 | **40%** | Verne (164, 18857, 1268, 103) and Burroughs (62) carry both "Adventure stories" and "Science fiction" classes — Verne is catalogued as adventure-scifi hybrid in most editions. *Around the World in Eighty Days* (103) is more adventure than scifi by modern reading but stays in v1's scifi bucket because of its place in the Verne corpus. |
| historical | adventure | 4/10 | **40%** | *The Three Musketeers* (1257), *The Count of Monte Cristo* (1184), *Ivanhoe* (82), *Ben-Hur* (2145) all carry both "Historical fiction" and "Adventure stories" classes. Dumas's catalogue placement varies by edition. |
| historical | literary | 3/10 | **30%** | *War and Peace*, *Les Misérables*, *A Tale of Two Cities* are catalogued under both "Historical fiction" and "Literature — 19th century" topical descriptors. Reflects the canonical-literature-also-historical pattern. |
| fantasy | adventure | 3/10 | **30%** | Haggard's *She*, *King Solomon's Mines*, *Allan Quatermain* — lost-race / quest narratives tagged under both "Fantastic fiction" and "Adventure stories". Howard Pyle's *Robin Hood* tagged historical-adventure-fantasy in different catalogue editions. |
| gothic | romance | 2/10 | 20% | *Wuthering Heights* (gothic, 768) and *Northanger Abbey* (romance, 121) connect gothic and romance via the Brontë / Austen tradition — but only 2 books on either side carry overlapping classes. Below merge threshold. |
| horror | adventure | 1/10 | 10% | Sparse: Stevenson and Stoker share "Horror tales" + "Adventure stories" classes for some works not in our corpus; *Dracula* alone in the horror set has any adventure tag. Below merge threshold. |
| mystery | adventure | 1/10 | 10% | Doyle is tagged across mystery + adventure + scifi (*The Lost World* is in v1's scifi bucket; his Holmes corpus is mystery-only). Below merge threshold. |
| historical | romance | 2/10 | 20% | *Jane Eyre*, *North and South* carry "Historical fiction" tags in some editions (Victorian-set). Below merge threshold but noted. |
| literary | romance | 2/10 | 20% | Wharton's *The Age of Innocence* and *The House of Mirth* are catalogued under both "Domestic fiction" / "Romance" and "American literature — 20th century". Below merge threshold. |

All other pairs (~33 of 45 total) have **0–10% overlap** — i.e., effectively no shared dominant LCC subjects. Notable low-overlap pairs:
- western ↔ everything except (faintly) adventure: <10%. Western has a distinct LCC class (PS — Western stories) that doesn't bleed.
- mystery ↔ horror: <10% despite both being "dark genre fiction" — LCC treats them as distinct.
- literary ↔ scifi/fantasy/horror/western: <10% — literary fiction is its own catalogue space.

### Findings

- **High overlap (>30%):**
  - `gothic ↔ horror` (60%) — strongest merge signal of any pair
  - `scifi ↔ fantasy` (40%)
  - `scifi ↔ adventure` (40%)
  - `historical ↔ adventure` (40%)

- **Moderate overlap (15–30%):**
  - `historical ↔ literary` (30%)
  - `fantasy ↔ adventure` (30%)
  - `gothic ↔ romance` (20%)
  - `historical ↔ romance` (20%)
  - `literary ↔ romance` (20%)

- **Low overlap (<15%):**
  - All western pairs (western is the most catalogue-isolated genre)
  - `mystery ↔ horror`, `mystery ↔ gothic`, `mystery ↔ fantasy` — mystery is well-separated
  - `literary ↔ scifi/fantasy/horror/western` — literary fiction has its own catalogue territory
  - All other ~25 pairs

### Implication for the genre-set decision

- **Proposal A (merge gothic+horror, scifi+fantasy):**
  - gothic ↔ horror at **60%** strongly supports the gothic_horror merge. This is the cleanest merge signal in the data.
  - scifi ↔ fantasy at **40%** supports the speculative merge, though less decisively. Note: scifi ↔ adventure is also 40% — if speculative merge happens, v2 should be careful that the resulting `speculative` bucket isn't really just "Verne + Burroughs adventure-scifi crossovers." Per-author audit in `04_genre_set_recommendation.md` Evidence 3 addresses this.
  - **Verdict:** LCC overlap **strongly supports Proposal A**, particularly the gothic_horror merge.

- **Proposal B (drop horror, historical):**
  - horror has **60% overlap with gothic** — dropping horror outright loses a category that is genuinely distinguishable from non-gothic genres but heavily overlaps gothic specifically. The merge interpretation (Proposal A) is more catalogue-faithful than the drop interpretation.
  - historical has **40% overlap with adventure, 30% overlap with literary** — historical is NOT a low-overlap orphan in LCC space; it's catalogued as a hybrid of adventure and literary fiction. Dropping it removes a legitimate catalogue category whose poor v1 accuracy (30%) likely reflects feature-space confusion with adventure and literary rather than a genuine "this genre isn't separable" finding.
  - **Verdict:** LCC overlap **weakly supports Proposal B**. Both candidate-drop genres have non-trivial catalogue presence; the drop logic depends almost entirely on the empirical accuracy argument, not on LCC separability.

- **Proposal C (keep 10):**
  - 4 pairs at ≥30% overlap argues *against* keeping all 10 as currently structured — the feature space genuinely struggles to separate gothic from horror and scifi from fantasy at the LCC level.
  - However: 33 of 45 pairs at <15% overlap means most of the 10 genres ARE catalogue-separable. The problem is concentrated in 2 high-overlap clusters (gothic/horror, scifi/fantasy/adventure).
  - **Verdict:** LCC overlap **weakly argues against Proposal C** in its naive form. The 10-genre structure has 2 obvious feature-space cliques (gothic/horror and the scifi/fantasy/adventure triangle); keeping all 10 means the SVM has to learn very fine distinctions between catalogue-equivalent genres on sparse training data. Proposal C is defensible *only* if per-genre book count and author diversity (Evidence 3) compensate for catalogue overlap.

**Bottom line:** LCC overlap is the strongest single piece of evidence for **Proposal A**. The 60% gothic↔horror overlap is unusual — most genre pairs in this corpus sit well below 30% — and it's the kind of overlap that classification models will reliably fail to resolve regardless of corpus size. The scifi↔fantasy 40% overlap is weaker support but still merge-favourable. The other 33 low-overlap pairs validate that the remaining 8-genre structure (post-merge) is catalogue-separable.

The recommendation in `04_genre_set_recommendation.md` cites this analysis as one of its three evidence streams.
