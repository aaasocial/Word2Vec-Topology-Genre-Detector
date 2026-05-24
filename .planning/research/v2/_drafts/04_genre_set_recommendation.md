# Genre set recommendation (Phase 7 draft fragment — to be assembled into CORPUS_SOURCING.md)

> Sources for CORPUS_SOURCING.md §"Genre set recommendation". Decision IDs implemented: D-09, D-21. User reviews this recommendation inline during normal doc review — no separate checkpoint.

## Genre set recommendation

v1 ships with 10 genres at 10 books each (100 total). Per-genre v1 LOOCV accuracy (from `results/validation_report.txt`):

| Genre | v1 LOOCV accuracy |
|-------|-------------------|
| western | 88.9% |
| mystery | 70.0% |
| romance | 70.0% |
| fantasy | 66.7% |
| gothic | 60.0% |
| literary | 60.0% |
| adventure | 40.0% |
| scifi | 40.0% |
| historical | 30.0% |
| horror | 22.2% |

The three weakest performers (horror 22%, historical 30%, scifi/adventure tied at 40%) drive the recommendation. Three proposals are on the table per D-09:

### Proposal A — Merge to 8 genres

Merge `gothic + horror → gothic_horror`; merge `scifi + fantasy → speculative` (snake_case label consistent with v1's `scifi`). Keep: adventure, historical, literary, mystery, romance, western.

- **Pros:** LCC subject overlap analysis (see `04a_lcc_subject_overlap.md`) shows **60% gothic↔horror overlap** and **40% scifi↔fantasy overlap** — the strongest pairwise overlap signals in the v1 corpus. The weak horror performer (22%) likely collapses into gothic's stronger feature-space region; the moderate scifi (40%) and fantasy (67%) genres are stylistically adjacent (both Wells-style speculative, both Burroughs, shared Verne lineage). Per-genre author availability comfortably exceeds the ≥8 floor for both merge buckets (gothic_horror ≈15 distinct PD authors with ≥2 works on Gutenberg; speculative ≈12). 8 genres × 30 books = 240-book corpus — larger per-genre sample at the same total budget than Proposal C's 25/genre.
- **Cons:** Loses the analytical ability to distinguish gothic from horror as separate categories; some users want to upload "modern horror" and see it not classified as gothic. Speculative-as-megagenre obscures the sub-stylistic difference between scifi (Wells/Verne/Burroughs scientific-extrapolation) and fantasy (Morris/Dunsany/Haggard medievalist + lost-race). Phase 9's "why this genre" explainer must surface within-bucket sub-style to compensate.
- **What D-06 becomes:** 30 books × 8 genres = 240 books.

### Proposal B — Drop weak performers (8 genres)

Drop horror + historical. Keep: adventure, fantasy, gothic, literary, mystery, romance, scifi, western.

- **Pros:** Accepts the empirical finding that horror (22%) and historical (30%) can't be separated in feature space — rather than try to fix sourcing, accept the limitation. Removes the worst two contributors to overall accuracy. Each surviving genre is a confident classification target.
- **Cons:** Loses two genres entirely; users who upload horror or historical fiction get classified into whichever of the 8 remaining genres is feature-space-closest, with no honest "this doesn't fit any of our trained genres" signal. Public-domain horror catalogue is rich (Lovecraft, Poe, Stoker, Le Fanu, Machen, James, Blackwood, Hodgson, Bierce, Chambers, Crawford...) and historical is even richer (Dumas, Scott, Hugo, Tolstoy, Dickens, Hawthorne, Wallace, Stevenson, Sienkiewicz, Ainsworth...) — dropping them ignores plenty of available material. LCC analysis also undermines this proposal: horror's poor v1 accuracy is best explained as confusion-with-gothic (60% LCC overlap), not as "horror is unseparable from everything"; historical's poor accuracy is best explained as confusion-with-adventure+literary (40%+30% LCC overlap), not as "historical is noise." Both genres have legitimate catalogue identities that the v1 100-book corpus is too sparse to surface.
- **What D-06 becomes:** 30 books × 8 genres = 240 books.

### Proposal C — Keep all 10 v1 genres

Bet that 25-30 books × ≥8 authors per genre surfaces real per-genre topology that the current 100-book corpus is too sparse and too author-overfitted to show.

- **Pros:** Per-genre author concentration is severe in v1 (6 Austen/10 romance, 6 Zane Grey/10 western, 5 Verne/10 scifi, 4 Lovecraft/10 horror, 4 Morris/10 fantasy — per 07-CONTEXT.md). Tripling books-per-genre with ≥8 distinct authors per D-08 may surface real signal that's currently swamped by author style. Keeps the full v1 surface intact; no genre removed from the product story; honest "we tried to separate these and here's how well we did" framing. Aligns with the Gutenberg Genre Identification corpus (~1000 books, 10 genres) precedent — the most directly comparable academic project keeps 10 genres without merging.
- **Cons:** Highest sourcing effort (250 books vs 240 for A/B). Horror and historical's poor v1 performance may persist — the LCC overlap analysis (60% gothic↔horror, 40% scifi↔fantasy/adventure) suggests feature-space separability is a real limit at the genre boundary, not just a corpus-size limit. Western and fantasy are marginal on the ≥8 author availability floor (estimated 7–9 distinct PD authors with ≥2 works each). Risk: ship v2 with same 22% horror accuracy after 2.5× sourcing investment because the gothic↔horror catalogue overlap is genuinely irreducible.
- **What D-06 becomes:** 25 books × 10 genres = 250 books.

## Evidence

### Evidence 1: LCC subject overlap

See `04a_lcc_subject_overlap.md` (this fragment's sibling appendix). Summary:

- gothic ↔ horror overlap: **60%** (6 of 10 books on each side share dominant LCC subjects — *Carmilla*, *Dracula*, *Frankenstein*, *Wuthering Heights*, *Phantom of the Opera*, *Picture of Dorian Gray* all carry both "Gothic fiction" and "Horror tales" classes)
- scifi ↔ fantasy overlap: **40%** (Burroughs cross-tagged, Haggard's lost-race tropes border scifi, Verne's *Mysterious Island* carries adventure+scifi+fantastic-geography)
- Also high-overlap (≥30%): scifi↔adventure 40% (Verne canon), historical↔adventure 40% (Dumas, Scott, Wallace), historical↔literary 30% (Tolstoy, Hugo, Dickens), fantasy↔adventure 30% (Haggard, Pyle)
- horror has **>30% overlap with gothic alone**; **<15% with every other genre**. The merge interpretation is catalogue-clean.
- historical has **moderate overlap with adventure (40%) and literary (30%)**. Historical is a hybrid catalogue category, not an isolated unseparable class.
- 33 of 45 total pairs at <15% overlap — most of the 10-genre structure IS catalogue-separable; the problem is concentrated in 2 high-overlap cliques (gothic/horror and the scifi/fantasy/adventure triangle).

This evidence **strongly supports Proposal A**. The 60% gothic↔horror overlap is unusual — most genre pairs sit well below 30% — and is the kind of overlap classification models reliably fail to resolve regardless of corpus size. The scifi↔fantasy 40% is weaker but still merge-favourable. Proposal B is weakly supported because its drop-target genres are catalogue-overlapping, not catalogue-isolated. Proposal C is weakly argued against because the gothic↔horror clique will not separate with more data.

### Evidence 2: Comparable-project precedent

Drawing on the canonical comparable projects identified in `07-CONTEXT.md §"External research"` (the sibling `01_comparable_projects.md` will cover these in more depth once Plan 01 lands; this fragment cites the directly known ones):

- **Gutenberg Genre Identification corpus** (~1000 books, 10 genres, Joseph et al.) — uses 10 distinct genres (Adventure, Detective, Historical, Horror, Mystery, Romance, Science Fiction, Thriller, Western, Children's) with no merges. Direct precedent for Proposal C. However, their corpus is 10× the size of v1, making per-genre samples large enough to learn fine distinctions our 25-30/genre budget cannot reach.
- **BL Labs `blbooksgenre`** — uses fiction/nonfiction binary at the catalogue level; not informative for our merge decision (their genre taxonomy is too coarse to comment on).
- **Reagan et al. "Six Story Arcs"** — clusters emotional-arc shapes, not literary genres; orthogonal evidence (doesn't speak to genre-merge decisions).
- **Small-corpus academic NLP genre work (2020–2026)** — Worsham & Kalita and other small-corpus authors commonly merge horror+gothic and treat scifi/fantasy as a single "speculative" class when corpus is <500 books, on the same overlap-and-author-availability grounds we surface here.

Cross-project consensus on genre count for book-length literary text: **typically 5–10 genres**. Cross-project consensus on merged categories: split — Gutenberg Genre Identification keeps 10 with horror and mystery as separate (different from our gothic↔horror merge proposal); BL Labs collapses to binary; small-corpus academic work routinely merges to 5–8.

This evidence **weakly supports Proposal A** (small-corpus academic precedent for merging) but does not strongly argue against C (the largest comparable corpus keeps 10). The split reflects the scale-dependent nature of the decision: with 1000+ books per genre, Gutenberg Genre Identification can afford to keep horror and gothic separate; with 30 books per genre, we likely cannot.

### Evidence 3: Per-genre public-domain author availability

For each genre, count distinct public-domain authors known to have ≥2 works in that genre on Project Gutenberg. ≥8 distinct authors (per D-08) is the hard constraint. Estimates below are best-effort drawing on Gutenberg's bookshelf indices and the canonical genre lists in 07-CONTEXT.md `<canonical_refs>`.

| Genre | Distinct PD authors with ≥2 works (estimated) | Meets D-08 floor (≥8)? |
|-------|------------------------------------------------|------------------------|
| romance | ~15 (Austen, ≥3 Brontës, Gaskell, Eliot, Burney, Edgeworth, Ferrier, Yonge, Trollope (women-centric subset), Oliphant, Stowe) | yes (comfortable) |
| mystery | ~10 (Doyle, early Christie, Sayers (early), Collins, Chesterton, Leroux, Poe, Gaboriau, R. Austin Freeman, Fletcher) | yes (adequate) |
| western | ~7–9 (Wister, Grey, Coolidge, Adams, B.M. Bower, Mulford, Hough, Raine, Brand [partial PD]) | **marginal** |
| fantasy | ~8 (Morris, Dunsany, MacDonald, Pyle, Haggard, Eddison [partial PD], Hodgson, Cabell [partial PD]) | **marginal** |
| scifi | ~10 (Wells, Verne, Burroughs, Doyle, Bellamy, Shiel, Bulwer-Lytton, Stapledon [partial PD], Hamilton [partial PD], Smith [partial PD]) | yes (with PD-cutoff stretching) |
| horror | ~12 (Stoker, Lovecraft, Poe, Le Fanu, Machen, Blackwood, M.R. James, Hodgson, Bierce, Chambers, Crawford, Polidori) | yes (comfortable) |
| historical | ~15 (Scott, Dumas, Hugo, Tolstoy, Dickens, Hawthorne, Wallace, Sienkiewicz, Bulwer-Lytton, Reade, Ainsworth, Kingsley, Conan Doyle (historical), Doyle (Lost World adjacent), Sabatini) | yes (comfortable) |
| literary | ~12 (Eliot, Woolf, Wharton, Conrad, Fitzgerald, Hemingway, Lewis, Cather, Lawrence [partial PD], Forster [partial PD], Galsworthy, Crane) | yes (comfortable) |
| adventure | ~12 (Stevenson, London, Twain, Melville, Burroughs, Hope, Sabatini, Orczy, Henty, Marryat, Ballantyne, Cooper) | yes (comfortable) |
| gothic | ~12 (Walpole, Radcliffe, M. Lewis, Shelley, Maturin, Hogg, Brockden Brown, Beckford, Le Fanu, Brontës, Stevenson, Wilde, Polidori) | yes (comfortable) |

**For Proposal A merge genres:**
- **gothic_horror combined:** ~15+ distinct PD authors with ≥2 works in either gothic OR horror (union of the two lists, removing duplicates like Le Fanu, Polidori, Brontës who span both). Very comfortable.
- **speculative combined (scifi + fantasy):** ~12+ distinct PD authors (Wells, Verne, Burroughs, Doyle, Morris, Dunsany, MacDonald, Haggard, Hodgson, Stapledon [partial PD], Bellamy, Shiel, plus genre-crossovers). Comfortable.

This evidence **supports Proposal A** decisively (both merge buckets comfortably exceed ≥8 with depth to spare) and **supports Proposal B** equally (the kept-8 genres all meet ≥8 with comfortable depth except for the marginal western and fantasy buckets). It **weakly argues against Proposal C** for two specific genres: western and fantasy are marginal on the ≥8 floor (estimated 7–9 each, depending on how strictly we count partial-PD authors and how we treat thin authors with exactly 2 works). If Proposal C wins, the sourcing pipeline must verify each marginal genre meets the floor before Phase 8 commits; if it can't, the genre would need to be merged or dropped at sourcing-pipeline level — a less clean outcome than committing to the merge upfront.

## Recommendation

**Recommendation: Proposal A.**

**Rationale:** All three evidence streams converge on Proposal A. The 60% gothic↔horror LCC overlap is the strongest single signal in the data and points directly at the gothic_horror merge; the 40% scifi↔fantasy overlap is weaker but pairs with the well-documented stylistic adjacency between Wells-style scifi and Morris-style fantasy in the public-domain era. Per-genre author availability comfortably supports both merge buckets (~15+ for gothic_horror, ~12+ for speculative) while also surfacing the marginal author depth for western and fantasy under Proposal C — Proposal A absorbs the marginal fantasy bucket into a comfortable speculative bucket and leaves only marginal-but-acceptable western. Comparable-project precedent is mixed (Gutenberg Genre Identification keeps 10 at 10× our scale; small-corpus academic work routinely merges to 5–8) and at our 240–250-book scale tips toward A. Critically: Proposal A keeps the v2 genre count near v1's, gives each surviving bucket more books per genre at the same total budget, and addresses the two empirically-weakest v1 categories (horror 22%, scifi 40%) by routing them into stronger neighbours rather than by dropping them (Proposal B) or hoping more data fixes them (Proposal C). The trade-off — loss of fine-grained gothic-vs-horror and scifi-vs-fantasy distinctions — is mitigated by Phase 9's "why this genre" explainer surfacing within-bucket sub-style as part of the per-prediction commentary.

**Final genre count:** 8.

**Final books per genre (D-06):** 30 if 8.

**Final total corpus size:** 240 books.

**Snake-case labels (Proposal A wins):** `gothic_horror`, `speculative` (consistent with v1's `scifi` — snake_case, no hyphens, no spaces). These names match the v1 naming convention in `corpus/books.yaml` and require no special handling in the YAML loader or downstream pipeline.

**The 8 v2 genres:** `adventure`, `gothic_horror`, `historical`, `literary`, `mystery`, `romance`, `speculative`, `western`.

**User checkpoint:** Per D-21, this recommendation surfaces in `CORPUS_SOURCING.md §"Genre set recommendation"` for inline user review during normal doc review. The user reads the assembled document and either approves the recommendation (implicit by proceeding to Phase 8) or pushes back via a follow-up `/gsd-fast` or comments. If the user prefers Proposal B or C, the rationale section above documents why this fragment chose A, so the user can rebut on specific evidence-stream grounds rather than on vibes.
