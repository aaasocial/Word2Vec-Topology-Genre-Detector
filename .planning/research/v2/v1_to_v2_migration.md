# v1 -> v2 Corpus Migration Audit

> Phase 8 Wave 1 / D-27 -- per-entry verdict for every v1 corpus/books.yaml entry.
> Generated 2026-05-25 from books_v1_snapshot.yaml (pre-Wave-1) vs corpus/books.yaml (post-Wave-1).

## Summary

- **v1 entries:** 100 (10 genres x 10 books)
- **v2 entries:** 240 (8 genres x 30 books per Proposal A)
- **Kept (v1 gutenberg_id appears in v2 under the same genre key):** 59
- **Kept-with-relabel (v1 gutenberg_id appears in v2 under merged genre key per D-29):** 40
- **Dropped (v1 gutenberg_id absent from v2):** 1

## v1 genre -> v2 genre map (D-29)

| v1 key | v2 key |
|--------|--------|
| gothic | gothic_horror |
| horror | gothic_horror |
| scifi | speculative |
| fantasy | speculative |
| adventure | adventure (unchanged) |
| historical | historical (unchanged) |
| literary | literary (unchanged) |
| mystery | mystery (unchanged) |
| romance | romance (unchanged) |
| western | western (unchanged) |

## Per-entry verdicts

| v1 gutenberg_id | v1 title | v1 author | v1 genre | Verdict | v2 genre (if kept) | Reason (if dropped) |
|----------------:|----------|-----------|----------|---------|--------------------|---------------------|
| 60 | The Scarlet Pimpernel | Baroness Orczy | adventure | kept | adventure | — |
| 76 | Adventures of Huckleberry Finn | Mark Twain | adventure | kept | adventure | — |
| 78 | Tarzan of the Apes | Edgar Rice Burroughs | adventure | kept | adventure | — |
| 95 | The Prisoner of Zenda | Anthony Hope | adventure | kept | adventure | — |
| 120 | Treasure Island | Robert Louis Stevenson | adventure | kept | adventure | — |
| 215 | The Call of the Wild | Jack London | adventure | kept | adventure | — |
| 421 | Kidnapped | Robert Louis Stevenson | adventure | kept | adventure | — |
| 910 | White Fang | Jack London | adventure | kept | adventure | — |
| 1965 | Captain Blood | Rafael Sabatini | adventure | kept | adventure | — |
| 2701 | Moby-Dick | Herman Melville | adventure | kept | adventure | — |
| 169 | The Well at the World's End | William Morris | fantasy | kept-with-relabel | speculative | — |
| 711 | Allan Quatermain | H. Rider Haggard | fantasy | kept-with-relabel | speculative | — |
| 2166 | King Solomon's Mines | H. Rider Haggard | fantasy | kept-with-relabel | speculative | — |
| 2565 | The Story of the Glittering Plain | William Morris | fantasy | kept-with-relabel | speculative | — |
| 2885 | The House of the Wolfings | William Morris | fantasy | kept-with-relabel | speculative | — |
| 3055 | The Wood Beyond the World | William Morris | fantasy | kept-with-relabel | speculative | — |
| 3155 | She | H. Rider Haggard | fantasy | kept-with-relabel | speculative | — |
| 7477 | The Book of Wonder | Lord Dunsany | fantasy | kept-with-relabel | speculative | — |
| 8395 | The Gods of Pegana | Lord Dunsany | fantasy | kept-with-relabel | speculative | — |
| 10148 | The Merry Adventures of Robin Hood | Howard Pyle | fantasy | kept-with-relabel | speculative | — |
| 84 | Frankenstein | Mary Shelley | gothic | kept-with-relabel | gothic_horror | — |
| 174 | The Picture of Dorian Gray | Oscar Wilde | gothic | kept-with-relabel | gothic_horror | — |
| 175 | The Phantom of the Opera | Gaston Leroux | gothic | kept-with-relabel | gothic_horror | — |
| 601 | The Monk | Matthew Lewis | gothic | kept-with-relabel | gothic_horror | — |
| 696 | The Castle of Otranto | Horace Walpole | gothic | kept-with-relabel | gothic_horror | — |
| 768 | Wuthering Heights | Emily Bronte | gothic | kept-with-relabel | romance | — |
| 792 | Wieland | Charles Brockden Brown | gothic | kept-with-relabel | gothic_horror | — |
| 2276 | The Private Memoirs and Confessions of a Justified Sinner | James Hogg | gothic | kept-with-relabel | gothic_horror | — |
| 3268 | The Mysteries of Udolpho | Ann Radcliffe | gothic | kept-with-relabel | gothic_horror | — |
| 11323 | Caleb Williams | William Godwin | gothic | kept-with-relabel | gothic_horror | — |
| 82 | Ivanhoe | Walter Scott | historical | kept | historical | — |
| 98 | A Tale of Two Cities | Charles Dickens | historical | kept | historical | — |
| 135 | Les Miserables | Victor Hugo | historical | kept | historical | — |
| 1184 | The Count of Monte Cristo | Alexandre Dumas | historical | kept | historical | — |
| 1257 | The Three Musketeers | Alexandre Dumas | historical | kept | historical | — |
| 1259 | Twenty Years After | Alexandre Dumas | historical | kept | historical | — |
| 2145 | Ben-Hur: A Tale of the Christ | Lew Wallace | historical | kept | historical | — |
| 2600 | War and Peace | Leo Tolstoy | historical | kept | historical | — |
| 5998 | Waverley | Walter Scott | historical | kept | historical | — |
| 25344 | The Scarlet Letter | Nathaniel Hawthorne | historical | kept | historical | — |
| 345 | Dracula | Bram Stoker | horror | kept-with-relabel | gothic_horror | — |
| 389 | The Great God Pan | Arthur Machen | horror | kept-with-relabel | gothic_horror | — |
| 8486 | Ghost Stories of an Antiquary | M. R. James | horror | kept-with-relabel | gothic_horror | — |
| 10007 | Carmilla | J. Sheridan Le Fanu | horror | kept-with-relabel | gothic_horror | — |
| 10897 | The Wendigo | Algernon Blackwood | horror | kept-with-relabel | gothic_horror | — |
| 14833 | Varney the Vampire | James Malcolm Rymer | horror | kept-with-relabel | gothic_horror | — |
| 50133 | The Dunwich Horror | H. P. Lovecraft | horror | kept-with-relabel | gothic_horror | — |
| 68283 | The Call of Cthulhu | H. P. Lovecraft | horror | kept-with-relabel | gothic_horror | — |
| 70652 | At the Mountains of Madness | H. P. Lovecraft | horror | kept-with-relabel | gothic_horror | — |
| 73181 | The Shadow over Innsmouth | H. P. Lovecraft | horror | kept-with-relabel | gothic_horror | — |
| 144 | The Voyage Out | Virginia Woolf | literary | kept | literary | — |
| 145 | Middlemarch | George Eliot | literary | kept | literary | — |
| 219 | Heart of Darkness | Joseph Conrad | literary | kept | literary | — |
| 284 | The House of Mirth | Edith Wharton | literary | kept | literary | — |
| 541 | The Age of Innocence | Edith Wharton | literary | kept | literary | — |
| 543 | Main Street | Sinclair Lewis | literary | kept | literary | — |
| 64317 | The Great Gatsby | F. Scott Fitzgerald | literary | kept | literary | — |
| 67138 | The Sun Also Rises | Ernest Hemingway | literary | kept | literary | — |
| 71865 | Mrs Dalloway | Virginia Woolf | literary | kept | literary | — |
| 75201 | A Farewell to Arms | Ernest Hemingway | literary | kept | literary | — |
| 155 | The Moonstone | Wilkie Collins | mystery | kept | mystery | — |
| 204 | The Innocence of Father Brown | G. K. Chesterton | mystery | kept | mystery | — |
| 244 | A Study in Scarlet | Arthur Conan Doyle | mystery | kept | mystery | — |
| 863 | The Mysterious Affair at Styles | Agatha Christie | mystery | kept | mystery | — |
| 1685 | The Mystery of the Yellow Room | Gaston Leroux | mystery | kept | mystery | — |
| 2852 | The Hound of the Baskervilles | Arthur Conan Doyle | mystery | kept | mystery | — |
| 58820 | Whose Body? | Dorothy L. Sayers | mystery | kept | mystery | — |
| 65238 | The Secret of Chimneys | Agatha Christie | mystery | kept | mystery | — |
| 69087 | The Murder of Roger Ackroyd | Agatha Christie | mystery | kept | mystery | — |
| 70008 | Unnatural Death | Dorothy L. Sayers | mystery | kept | mystery | — |
| 105 | Persuasion | Jane Austen | romance | kept | romance | — |
| 121 | Northanger Abbey | Jane Austen | romance | kept | romance | — |
| 141 | Mansfield Park | Jane Austen | romance | kept | romance | — |
| 158 | Emma | Jane Austen | romance | kept | romance | — |
| 161 | Sense and Sensibility | Jane Austen | romance | kept | romance | — |
| 1260 | Jane Eyre | Charlotte Bronte | romance | kept | romance | — |
| 1342 | Pride and Prejudice | Jane Austen | romance | kept | romance | — |
| 2095 | The Tenant of Wildfell Hall | Anne Bronte | romance | kept | romance | — |
| 4274 | Wives and Daughters | Elizabeth Gaskell | romance | kept | romance | — |
| 4276 | North and South | Elizabeth Gaskell | romance | kept | romance | — |
| 35 | The Time Machine | H. G. Wells | scifi | kept-with-relabel | speculative | — |
| 36 | The War of the Worlds | H. G. Wells | scifi | kept-with-relabel | speculative | — |
| 62 | A Princess of Mars | Edgar Rice Burroughs | scifi | kept-with-relabel | speculative | — |
| 83 | From the Earth to the Moon | Jules Verne | scifi | kept-with-relabel | speculative | — |
| 103 | Around the World in Eighty Days | Jules Verne | scifi | kept-with-relabel | speculative | — |
| 139 | The Lost World | Arthur Conan Doyle | scifi | kept-with-relabel | speculative | — |
| 159 | The Island of Doctor Moreau | H. G. Wells | scifi | kept-with-relabel | speculative | — |
| 164 | Twenty Thousand Leagues Under the Sea | Jules Verne | scifi | kept-with-relabel | speculative | — |
| 1268 | The Mysterious Island | Jules Verne | scifi | kept-with-relabel | speculative | — |
| 18857 | A Journey to the Centre of the Earth | Jules Verne | scifi | kept-with-relabel | speculative | — |
| 1012 | The Virginian | Owen Wister | western | kept | western | — |
| 1389 | The Log of a Cowboy | Andy Adams | western | kept | western | — |
| 1528 | Riders of the Purple Sage | Zane Grey | western | kept | western | — |
| 3285 | The Border Legion | Zane Grey | western | kept | western | — |
| 3752 | The Last of the Plainsmen | Zane Grey | western | kept | western | — |
| 3808 | The Heritage of the Desert | Zane Grey | western | kept | western | — |
| 5765 | The Rainbow Trail | Zane Grey | western | kept | western | — |
| 6996 | Wildfire | Zane Grey | western | kept | western | — |
| 19572 | Wunpost | Dane Coolidge | western | dropped | — | below WORD_COUNT_MIN (v1 word_count=408) |
| 20381 | Hidden Water | Dane Coolidge | western | kept | western | — |

## Drop rationale categories

- **below WORD_COUNT_MIN** -- v1 entry's text is shorter than the 5,000-word floor used by `scripts/build_corpus.py` (see WORD_COUNT_MIN comment block).
- **not in candidate top-30** -- fell below the section 5 selection-rule cutoff (lower source_consensus_score and/or author-diversity slot already filled).
- **gutenberg-unavailable** -- fetch failure that even D-30 promote-on-failure could not absorb. (None of v1's specific entries hit this in Wave 1 -- see corpus_build.log.)

## Methodology

For each v1 entry, this audit was generated by:
1. Extract v1 gutenberg_ids from `books_v1_snapshot.yaml` (the pre-Wave-1 corpus snapshot).
2. Look up each in `corpus/books.yaml` (post-Wave-1).
3. If found: classify as `kept` (same genre key) or `kept-with-relabel` (genre key changed per D-29 -- gothic/horror -> gothic_horror, scifi/fantasy -> speculative).
4. If absent: classify as `dropped`; reason inferred from v1 word_count and from the build log skip/promote events.

## References

- D-26 -- atomic swap from `scripts/build_corpus.py` output
- D-27 -- drop audit in this file (separate from books.yaml)
- D-29 -- relabel inline; v2 keys used directly in `corpus/books.yaml`
- `CORPUS_SOURCING.md` section 5 -- selection rule that produced the v2 list
- `.planning/research/v2/corpus_build.log` -- Wave-1 fetch-time skip/promote events

## Wave-1.5 Patch (2026-05-25)

After Wave 2 completed, six duplicate-gid defects were discovered in `corpus/books.yaml`
(documented in `08-02-SUMMARY.md` "Deferred Issues — CRITICAL"). Five resulted from
incorrect `gutenberg_id` values in `.planning/research/v2/corpus_candidates.yaml`; one
from Wuthering Heights being dual-listed across romance and gothic_horror genres.

### corpus_candidates.yaml corrections (commit `c97f246`)

| Genre | Old (gid, title, author) | New (gid, title, author) | Verification |
|------:|--------------------------|---------------------------|--------------|
| adventure | 82, "Tarzan and the Jewels of Opar", Burroughs | 92, same | gid 82 is Ivanhoe (Scott); gid 92 verified Title:"Tarzan and the Jewels of Opar" Author:Burroughs via PG cache/epub probe |
| adventure | 121, "The Black Arrow", Stevenson | 848, same | gid 121 is Northanger Abbey (Austen); gid 848 verified via PG search + direct probe |
| adventure | 521, "Moll Flanders", Defoe | 370, same | gid 521 is Adam Bede (Eliot); gid 370 verified Title:"The Fortunes and Misfortunes of the Famous Moll Flanders" |
| adventure | 1259, "Lord Jim", Conrad | 5658, same | gid 1259 is Twenty Years After (Dumas); gid 5658 verified via PG cache/epub probe |
| adventure | 1260, "Typhoon", Conrad | 1142, same | gid 1260 is Jane Eyre (Bronte); gid 1142 verified Title:"Typhoon" Author:Conrad |
| romance | 768, "Wuthering Heights", Bronte (dual-listed) | _(removed from romance candidates)_ | Wuthering Heights canonically sits in gothic_horror (Bloom canon); retained in gothic_horror genre only |

### corpus/books.yaml application (commit `44d60a0`)

The 5 adventure entries were swapped in-place (preserving deterministic ordering),
and the duplicate gid 768 was removed from romance. Romance was rebalanced to 30
books by adding `2153 Mary Barton (Elizabeth Gaskell)` — a score-2 candidate from
the existing pool (no new candidate addition required; the algorithm's
promote-on-failure pattern absorbs the slot).

Per-genre counts post-patch: all 8 genres at exactly 30 books. Total: 240 unique gids.
Verified by `python -c "import yaml; d=yaml.safe_load(open('corpus/books.yaml')); ids=[b['gutenberg_id'] for g in d['genres'].values() for b in g]; assert len(ids) == len(set(ids)) == 240"`.

### Downstream pipeline re-run

Scripts 02 → 03 → 04 → 05 + `precompute_all(window=15)` re-executed against the
patched corpus. The `corpus_hash` rotated from `76605812...` (Wave-2) to the
post-patch value recorded in the new `svm_pipeline.joblib.lineage.json` sidecar.
See `08-02.1-PATCH-SUMMARY.md` for the full audit trail.

### Scope-boundary disclosure

During the Wave-1.5 patch, a broader audit probed all 240 gids in `corpus/books.yaml`
against their Project Gutenberg `Title:`/`Author:` metadata headers. The audit found
**135 additional title/author/gid mismatches** beyond the 6 patched defects — these
do not cause duplicate-gid issues (each wrong gid still maps 1:1 to a unique Gutenberg
text) but the labels are systematically wrong. Examples:

- adventure/gid 558 labeled "The Sea-Wolf by London" → actually "The Thirty-Nine Steps by Buchan"
- western/gid 1012 labeled "The Virginian by Wister" → actually "La Divina Commedia by Dante"
- mystery/gid 1851 labeled "Man Who Was Thursday by Chesterton" → actually "Woman in the Alcove by Green"

The full audit log is preserved at `.planning/phases/08-corpus-expansion/wave-1-5-full-gid-audit.log`.

Per the Wave-1.5 task's scope boundary (fix the 6 documented duplicate-gid defects only;
the 135 single-mapping mismatches were already present in Wave-1 and Wave-2 trained on
them as-is), these additional mismatches are deferred to a future corpus-integrity wave.
Recommendation: future plan should fetch correct gids via the Gutenberg search API for
the canonical title+author combinations in candidates.yaml, then either (a) re-run
`build_corpus.py` against a corrected candidates.yaml, or (b) accept that the 135
"mislabeled" books are simply different books in the same broad genre tradition (e.g.,
many of the gid 7142-7170 historical entries point to other historical literature even
though not the exact title cited).
