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

## 08.1 Final Resolution (2026-05-26)

After Phase 8.1's two repair sessions (gutendex bulk-by-author lookups, audiobook-record
filtering, title-score-first match sort) drove the SERIOUS count from 145 → 86 and the
entry gate (`>5 SERIOUS = halt`) still failed, the user authorized a **drop strategy**:
remove every still-SERIOUS row from both `corpus/books.yaml` and
`.planning/research/v2/corpus_candidates.yaml` rather than continue repair attempts.

**Result:** v2 corpus = 154 verified-clean books across 8 genres (per-genre counts
15-25, see `08.1-01-SUMMARY.md` for the table). Every (title, author, gid) triple in
the surviving manifest was verified via gutendex (rapidfuzz title token_set_ratio ≥ 85
AND author lastname match) — i.e., the post-drop audit
(`08.1-gid-audit-final.log`) reports **0 SERIOUS / 154 BENIGN / 0 MISSING**.

### The 86 dropped rows

These are the rows whose (yaml_title, yaml_author) did not match the book Gutenberg
actually serves at the listed gid. Removed in commit `7feb909`
(`feat(08.1-01): drop 86 SERIOUS rows`):

| gid | genre | yaml_title (expected) | actual_at_gid (gutendex) | dropped_in_08.1 |
|----:|-------|----------------------|--------------------------|:---------------:|
| 96 | adventure | Rupert of Hentzau by Anthony Hope | The Monster Men by Burroughs, Edgar Rice | yes |
| 559 | adventure | The Thirty-Nine Steps by John Buchan | Greenmantle by Buchan, John | yes |
| 560 | adventure | Greenmantle by John Buchan | Mr. Standfast by Buchan, John | yes |
| 561 | adventure | Tales of the Fish Patrol by Jack London | The Further Adventures of Robinson Crusoe by Defoe, Daniel | yes |
| 562 | adventure | Prester John by John Buchan | The Go Ahead Boys and the Racing Motor-Boat by Kay, Ross | yes |
| 563 | adventure | Salute to Adventurers by John Buchan | The Planet Mars and Its Inhabitants, a Psychic Revelation by Kennon, J. L. | yes |
| 848 | adventure | The Black Arrow by Robert Louis Stevenson | The Black Arrow: A Tale of the Two Roses by Stevenson, Robert Louis | yes |
| 864 | adventure | The Master of Ballantrae by Robert Louis Stevenson | The Master of Ballantrae: A Winter's Tale by Stevenson, Robert Louis | yes |
| 2701 | adventure | Moby-Dick by Herman Melville | Moby Dick; Or, The Whale by Melville, Herman | yes |
| 32954 | adventure | The Black Arrow by Robert Louis Stevenson | The Black Arrow: A Tale of the Two Roses by Stevenson, Robert Louis | yes |
| 43 | gothic_horror | The Strange Case of Dr Jekyll and Mr Hyde by Robert Louis Stevenson | The strange case of Dr. Jekyll and Mr. Hyde by Stevenson, Robert Louis | yes |
| 84 | gothic_horror | Frankenstein by Mary Shelley | Frankenstein; or, the modern prometheus by Shelley, Mary Wollstonecraft | yes |
| 376 | gothic_horror | The Three Imposters by Arthur Machen | A Journal of the Plague Year: Being Observations of the Most Remarkable Occurrences by Defoe, Daniel | yes |
| 378 | gothic_horror | The White People by Arthur Machen | The White Knight: Tirant Lo Blanc by Martorell, Joanot; Galba, Marti Joan de | yes |
| 601 | gothic_horror | The Monk by Matthew Lewis | The Monk: A Romance by Lewis, M. G. (Matthew Gregory) | yes |
| 768 | gothic_horror | Wuthering Heights by Emily Bronte | Wuthering Heights by Brontë, Emily | yes |
| 792 | gothic_horror | Wieland by Charles Brockden Brown | Wieland; Or, The Transformation: An American Tale by Brown, Charles Brockden | yes |
| 5145 | gothic_horror | The Italian by Ann Radcliffe | The Heart of the Hills by Fox, John, Jr. | yes |
| 5152 | gothic_horror | Villette by Charlotte Bronte | One Thousand Questions in California Agriculture Answered by Wickson, Edward J. | yes |
| 5153 | gothic_horror | Northanger Abbey by Jane Austen | Rung Ho! A Novel by Mundy, Talbot | yes |
| 5154 | gothic_horror | Uncle Silas by J. Sheridan Le Fanu | La Bête humaine by Zola, Émile | yes |
| 8487 | gothic_horror | More Ghost Stories by M. R. James | Dame Care by Sudermann, Hermann | yes |
| 11323 | gothic_horror | Caleb Williams by William Godwin | Caleb Williams; Or, Things as They Are by Godwin, William | yes |
| 14833 | gothic_horror | Varney the Vampire by James Malcolm Rymer | Varney the vampyre; or, the feast of blood by Prest, Thomas Peckett; Rymer | yes |
| 82 | historical | Ivanhoe by Walter Scott | Ivanhoe: A Romance by Scott, Walter | yes |
| 917 | historical | Barnaby Rudge by Charles Dickens | Barnaby Rudge: A Tale of the Riots of 'Eighty by Dickens, Charles | yes |
| 940 | historical | The Last of the Mohicans by James Fenimore Cooper | The Last of the Mohicans; A narrative of 1757 by Cooper, James Fenimore | yes |
| 5998 | historical | Waverley by Walter Scott | Waverley; or, 'Tis sixty years since by Scott, Walter | yes |
| 6941 | historical | Old Mortality by Walter Scott | Old Mortality, Complete by Scott, Walter | yes |
| 7151 | historical | Quo Vadis by Henryk Sienkiewicz | Clelia: Il governo dei preti — Romanzo storico politico by Garibaldi, Giuseppe | yes |
| 7153 | historical | The Deluge by Henryk Sienkiewicz | Elder Conklin and Other Stories by Harris, Frank | yes |
| 7154 | historical | Pan Michael by Henryk Sienkiewicz | The Prince and the Pauper, Part 1. by Twain, Mark | yes |
| 7155 | historical | The Hunchback of Notre-Dame by Victor Hugo | The Prince and the Pauper, Part 2. by Twain, Mark | yes |
| 7159 | historical | The Deerslayer by James Fenimore Cooper | The Prince and the Pauper, Part 6. by Twain, Mark | yes |
| 7160 | historical | The Pathfinder by James Fenimore Cooper | The Prince and the Pauper, Part 7. by Twain, Mark | yes |
| 7161 | historical | The Pioneers by James Fenimore Cooper | The Prince and the Pauper, Part 8. by Twain, Mark | yes |
| 7162 | historical | The Prairie by James Fenimore Cooper | The Prince and the Pauper, Part 9. by Twain, Mark | yes |
| 7163 | historical | Romola by George Eliot | The History of Australian Exploration from 1788 to 1888 by Favenc, Ernest | yes |
| 7164 | historical | Henry Esmond by William Makepeace Thackeray | Gitanjali by Tagore, Rabindranath | yes |
| 208 | literary | Daisy Miller by Henry James | Daisy Miller: A Study by James, Henry | yes |
| 210 | literary | The Ambassadors by Henry James | An International Episode by James, Henry | yes |
| 211 | literary | The Wings of the Dove by Henry James | The Aspern Papers by James, Henry | yes |
| 214 | literary | The Golden Bowl by Henry James | In the Days When the World Was Wide, and Other Verses by Lawson, Henry | yes |
| 542 | literary | Ethan Frome by Edith Wharton | The Life of Me: An Autobiography by Johnson, Clarence Edgar | yes |
| 4275 | literary | Howards End by E. M. Forster | Ruth by Gaskell, Elizabeth Cleghorn | yes |
| 5817 | literary | Lord Jim by Joseph Conrad | The Clockmaker — or, the Sayings and Doings of Samuel Slick by Haliburton, Thomas Chandler | yes |
| 5818 | literary | Nostromo by Joseph Conrad | The Gilded Age, Part 1. by Twain, Mark; Warner, Charles D | yes |
| 9183 | literary | Poor White by Sherwood Anderson | Wilfrid Cumbermede by MacDonald, George | yes |
| 480 | mystery | Armadale by Wilkie Collins | "Undo": A Novel by Hutsko, Joe | yes |
| 583 | mystery | The Mystery of Edwin Drood by Charles Dickens | The Woman in White by Collins, Wilkie | yes |
| 834 | mystery | His Last Bow by Arthur Conan Doyle | The Memoirs of Sherlock Holmes by Doyle, Arthur Conan | yes |
| 1155 | mystery | The Circular Staircase by Mary Roberts Rinehart | The Secret Adversary by Christie, Agatha | yes |
| 1661 | mystery | The Memoirs of Sherlock Holmes by Arthur Conan Doyle | The Adventures of Sherlock Holmes by Doyle, Arthur Conan | yes |
| 1695 | mystery | The Man Who Was Thursday by G. K. Chesterton | The Man Who Was Thursday: A Nightmare by Chesterton, G. K. (Gilbert Keith) | yes |
| 1851 | mystery | The Man in Lower Ten by Mary Roberts Rinehart | The Woman in the Alcove by Green, Anna Katharine | yes |
| 2098 | mystery | A Thief in the Night by E. W. Hornung | A Thief in the Night: A Book of Raffles' Adventures by Hornung, E. W. (Ernest William) | yes |
| 2155 | mystery | The Door of Death by Mary Roberts Rinehart | Phyllis of Philistia by Moore, Frank Frankfort | yes |
| 2371 | mystery | The Filigree Ball by Anna Katharine Green | The Filigree Ball: Being a full and true account of an extraordinary mystery by Green, Anna Katharine | yes |
| 3307 | mystery | That Affair Next Door by Anna Katharine Green | The Pagan Tribes of Borneo by Hose, Charles; McDougall, William | yes |
| 110 | romance | Tess of the d'Urbervilles by Thomas Hardy | Tess of the d'Urbervilles: A Pure Woman by Hardy, Thomas | yes |
| 1245 | romance | Villette by Charlotte Bronte | Night and Day by Woolf, Virginia | yes |
| 1252 | romance | Shirley by Charlotte Bronte | Le Morte d'Arthur: Volume 2 by Malory, Thomas, Sir | yes |
| 1260 | romance | Jane Eyre by Charlotte Bronte | Jane Eyre: An Autobiography by Brontë, Charlotte | yes |
| 1392 | romance | Lady Susan by Jane Austen | The Seven Poor Travellers by Dickens, Charles | yes |
| 2095 | romance | The Tenant of Wildfell Hall by Anne Bronte | Clotelle: A Tale of the Southern States by Brown, William Wells | yes |
| 2891 | romance | The Heart of Midlothian by Walter Scott | Howards End by Forster, E. M. (Edward Morgan) | yes |
| 4860 | romance | The Mill on the Floss by George Eliot | History of the United Netherlands, 1586-89 — Complete by Motley, John Lothrop | yes |
| 325 | speculative | Phantastes by George MacDonald | Phantastes: A Faerie Romance for Men and Women by MacDonald, George | yes |
| 706 | speculative | Lilith by George MacDonald | The Amateur Cracksman by Hornung, E. W. (Ernest William) | yes |
| 1353 | speculative | Off on a Comet by Jules Verne | Off on a Comet! a Journey through Planetary Space by Verne, Jules | yes |
| 1652 | speculative | Robur the Conqueror by Jules Verne | The Survivors of the Chancellor: Diary of J.R. Kazallon by Verne, Jules | yes |
| 5231 | speculative | The Gods of Mars by Edgar Rice Burroughs | The Way We Live Now by Trollope, Anthony | yes |
| 1012 | western | The Virginian by Owen Wister | La Divina Commedia di Dante by Dante Alighieri | yes |
| 1027 | western | The Spirit of the Border by Zane Grey | The Lone Star Ranger: A Romance of the Border by Grey, Zane | yes |
| 1078 | western | The Texan Scouts by Joseph A. Altsheler | The Scouts of the Valley by Altsheler, Joseph A. | yes |
| 3756 | western | Betty Zane by Zane Grey | Indiscretions of Archie by Wodehouse, P. G. (Pelham Grenville) | yes |
| 4051 | western | The Lone Star Ranger by Zane Grey | Lady Bridget in the Never-Never Land by Praed, Campbell, Mrs. | yes |
| 4684 | western | The U.P. Trail by Zane Grey | The U. P. Trail by Grey, Zane | yes |
| 8087 | western | Buck Peters, Ranchman by Clarence E. Mulford | A Fountain Sealed by Sedgwick, Anne Douglas | yes |
| 8088 | western | The Outlet by Andy Adams | Passages from the American Notebooks, Volume 1 by Hawthorne, Nathaniel | yes |
| 8089 | western | Cattle Brands by Andy Adams | Passages from the American Notebooks, Volume 2. by Hawthorne, Nathaniel | yes |
| 8090 | western | Reed Anthony, Cowman by Andy Adams | Our Old Home: A Series of English Sketches by Hawthorne, Nathaniel | yes |
| 8091 | western | Wells Brothers by Andy Adams | Sketches and Studies by Hawthorne, Nathaniel | yes |
| 8094 | western | The Texan Star by Joseph A. Altsheler | Certain Noble Plays of Japan by (anonymous) | yes |
| 8095 | western | Riders of the Silences by Max Brand | Awful Disclosures of the Hotel Dieu Nunnery of Montreal by Monk, Maria | yes |
| 12797 | western | The Log of a Cowboy by Andy Adams | The Log of a Cowboy: A Narrative of the Old Trail Days by Adams, Andy | yes |

**Note on benign-looking SERIOUS rows.** Some of the 86 above are technically the
"correct" book at the listed gid (e.g., gid 84 Frankenstein, gid 82 Ivanhoe, gid 768
Wuthering Heights). The audit's strict `rapidfuzz token_set_ratio >= 85` + author
lastname check is over-strict on subtitle differences ("Frankenstein" vs
"Frankenstein; or, the modern prometheus" — token_set_ratio = 80 < 85). These rows
were dropped along with the truly-broken ones because the drop strategy uses a single
uniform threshold; recovering them is a v2.1 follow-up task (see below).

### v2.1 follow-up: re-source the 86 dropped entries

Phase 8.2 (or a v2.1 patch wave) should re-source the 86 dropped books using
**authoritative author bibliographies** (Wikipedia author pages, Library of
Congress catalog entries, canonical book lists like Bloom's Western Canon for
literary/historical), then query gutendex by the verified canonical (title, author)
to find the correct gid. Target: restore the v2 corpus to 240+ books with all gids
verified-correct, and re-trigger the retrain pipeline. The infrastructure to do this
already exists (`scripts/audit_corpus_gids.py`, `scripts/repair_corpus.py`,
`scripts/build_corpus.py`) — the gap is the (title, author) → gid mapping for the
86 entries that the Phase 8.1 author-bulk-fetch could not resolve.
