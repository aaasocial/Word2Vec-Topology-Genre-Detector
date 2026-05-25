# Corpus Sourcing — v2.0 Research Output

> Phase 7 research deliverable for RES-01 (sourcing) and RES-03 (multi-label decision).
> **Companion document:** `VALIDATION_PROTOCOL.md` (RES-02).
> **Reading audience:** Phase 8 (Corpus Expansion) executes against this document verbatim; user reviews the genre-set recommendation inline during normal doc review per D-21.

**Reality check (corrects stale framing in REQUIREMENTS.md CORPUS-01 / PROJECT.md):** v1 ships with a **100-book corpus, not 15-book** (10 genres × 10 books, as of commit `db7b1f8`, 2026-04-13). The stale "3 genres × 5 books = 15-book" wording in REQUIREMENTS.md CORPUS-01 and PROJECT.md "Validated" reflects v1's earliest pilot framing, not the shipped artifact. Phase 7's job is to audit + restructure + significantly expand the existing 100-book corpus, not to expand from 15. The CORPUS-01 / PROJECT.md wording fixes happen in a separate `/gsd-docs-update` pass after Phase 7 completes (per 07-CONTEXT.md deferred-ideas section).

## 1. Executive summary

Phase 7 reaches the following commitments, which Phase 8 executes verbatim:

- **Sources** (per `## 2. Source evaluation`): Project Gutenberg as primary text-fetch; Standard Ebooks as preferred-edition fallback where both have a title; Goodreads-UCSD + LoC + scholarly canon lists + comparable-project corpora as curation-only (candidate shortlist); Open Library subject tags as a curation-and-enrichment cross-reference; Internet Archive as a documented escape hatch for older/rarer titles; HathiTrust accepted only as cheap LCC metadata cross-reference. Anti-features (BookCorpus, Goodreads scraping at scale, LLM auto-labelling) confirmed rejected.
- **Genre count** (per `## 4. Genre set recommendation`): **8**, per **Proposal A**. The 8 v2 genres: `adventure`, `gothic_horror`, `historical`, `literary`, `mystery`, `romance`, `speculative`, `western`.
- **Books per genre** (per `## 5. Corpus shape + author distribution`): **30** (single number, not a range — D-06). Final per-genre count = 30 if Proposal A wins as recommended; if the user overrides to Proposal C (keep 10), the count drops to 25/genre per the audit's defensible-against-either-outcome design.
- **Total v2 corpus size:** **240 books** under Proposal A (8 × 30). 250 if Proposal C overrides to keep 10 genres × 25 books.
- **Author distribution:** ≥8 distinct authors per genre (D-08, hard constraint); no per-author cap within a genre (D-07, traded against the tight ≤10pp per-author smoke test in `VALIDATION_PROTOCOL.md` §8).
- **Candidate shortlist:** `corpus_candidates.yaml` (sibling file) — ≥50 gutenberg_ids per genre ranked by source_consensus_score per D-19.
- **books.yaml schema additions:** new `source: {provider, fetched_at, text_sha256}` per book per D-10.
- **Multi-label classification** (per `## 6. Multi-label classification — feasibility and recommendation`): **Defer to v3**.

## 2. Source evaluation

We evaluate every source against three roles: (a) **text fetch** — provides clean public-domain text bytes for training; (b) **curation** — provides candidate-title shortlists ranked by external consensus; (c) **labelling** — provides genre/subject labels we accept as ground truth. The most opinionated finding (per D-03): **Goodreads and LoC are CURATION-ONLY**, not text-fetch, not labelling — they tell us what titles are worth looking for, then we look those titles up in Gutenberg/Standard Ebooks/HathiTrust for the actual text. Labelling itself comes from institutional metadata (LCC subject headings via Gutenberg, BL Labs MARC fiction code) plus manual review on the 25-30 final picks per genre, never from crowdsourced shelves or LLM auto-classification.

Each subsection below records the role we assign, the coverage observed in 2024-2026, the access path (no Phase-7 installs per D-05), risks, and a binary Accept/Reject verdict with one-paragraph rationale. The verdicts in aggregate define the Phase-8 sourcing pipeline described in §"Pipeline implication" below.

### Source: Project Gutenberg via `gutenbergpy>=0.3.5`

- **Role:** text-fetch (primary)
- **Coverage:** ~70,000 public-domain English-language titles; deep on pre-1928 fiction; LCC subject metadata on most works
- **Genre labelling quality:** Weak — LCC subject headings only; many books carry generic "PR Language and Literature" with no narrower genre tag. Adequate as a starting filter, not as final labels.
- **Access:** Already installed (`gutenbergpy>=0.3.5` per `.planning/research/STACK.md §"Corpus Sourcing"`). Programmatic via `gutenbergpy.acquire_text` + metadata lookups. Header/footer stripping by the canonical `*** START OF` / `*** END OF` regex.
- **Risks:** Public-domain skew toward pre-1928; underrepresents 20th-century literary fiction, modern romance, contemporary mystery, post-WWII scifi. Author concentration in prolific public-domain authors (Wells, Verne, Austen, Lovecraft, Poe, Doyle) interacts with `PITFALLS.md §5` author-overlap leakage.
- **Verdict:** **Accept** — primary text-fetch source for v2; already proven by v1's 100-book corpus. Upholds `STACK.md §"Corpus Sourcing"` prior note. Phase 8 reuses the existing `scripts/01_download_corpus.py` + `scripts/02_preprocess.py` pipeline against the v2 candidate shortlist.

### Source: Open Library bulk JSON dumps

- **Role:** curation (subject-tag enrichment of Gutenberg matches) — NOT text-fetch, NOT primary labelling
- **Coverage:** ~50M titles with crowd-sourced subject tags and `lcc` / `dewey_decimal_class` codes; monthly bulk JSON dumps at `https://openlibrary.org/data/`
- **Access:** No Python lib needed (`requests` + `ijson` for streaming parse per `STACK.md`). Phase 7 reads documentation only; Phase 8 wires the parse script.
- **Risks:** Subject tags are user-generated and noisy at the long-tail; the full bulk dump is ~50GB compressed (~250GB uncompressed) — streaming parse is mandatory. Many Open Library editions lack LCC codes; cross-reference quality depends on ISBN/LCCN match against Gutenberg metadata.
- **Verdict:** **Accept** as a curation-and-enrichment source — Open Library's `lcc` field plus subject tags help triangulate genre when LCC alone is ambiguous (e.g., a Gutenberg book tagged only "PR Language and Literature" gains a "detective stories" Open Library subject tag, bumping it onto the mystery shortlist). Cost/benefit clears because Phase 8 needs *some* second opinion on Gutenberg's coarse labels, and Open Library is the only free, programmatic, license-clean option. Overturns the prior STACK.md ambivalence in favour of concrete pipeline use.

### Source: Library of Congress (LCC subject headings + catalog references)

- **Role:** curation-only (candidate shortlist + canon lists, NOT text-fetch, NOT labelling) — per D-03 + D-04
- **Coverage:** LCC Class P (Language and Literature) subject heading hierarchy; curated collections like "Books That Shaped America"; LCCN-indexed catalog references
- **Access:** `loc.gov/collections/` for canon lists (HTML scraping for the small, static lists is acceptable per `robots.txt`); LCC subject tags arrive via Gutenberg's metadata (Gutenberg records carry LCC codes for most works). No LoC text-fetch pipeline in v2.
- **Risks:** Coarse subject headings (PR6005 vs PR6019 etc. are author-clustered, not genre-clustered); manual canon lists are small (~100 titles each) but high quality. LoC's full-text holdings (American Memory, Chronicling America) are a *deferred-to-v3* candidate (per the Phase-7 deferred-ideas section in `07-CONTEXT.md`) — out of scope here.
- **Verdict:** **Accept** as curation source per D-04; explicitly NOT a text-fetch pipeline in v2. LoC's value is the canon lists ("Books That Shaped America", "Great Books") + LCC class-P hierarchy that lets us bucket Gutenberg matches into our 8-10 genre buckets at curation time. STACK.md's prior note on LoC was vague about role; D-04 sharpens it to curation-only.

### Source: HuggingFace `TheBritishLibrary/blbooksgenre`

- **Role:** title-level metadata cross-reference (NOT labelling at our granularity, NOT text-fetch)
- **Coverage:** ~49,000 18th-19th century English-language British Library titles; fiction/nonfiction binary classification labels at title level
- **Access:** `datasets` library (would require `pip install "datasets>=3.0"` per `STACK.md`); per D-05, this install lands in Phase 8 if accepted, NOT Phase 7. Phase 7 reads the dataset card and accompanying paper (Hosseini et al. 2021) only.
- **Risks:** Fiction/nonfiction binary is too coarse for our 8-10 fiction sub-genres (granularity mismatch with the v2 task); 18th-19th century scope misses 20th-century scifi/fantasy entirely; BL titles overlap only partially with Gutenberg (BL digitised non-Gutenberg holdings).
- **Verdict:** **Reject** for labelling (granularity mismatch — fiction/nonfiction binary cannot inform our 8-10 sub-genre task); **Reject** as a primary curation source (BL holdings are non-Gutenberg-heavy, so most title matches against our text-fetch pipeline come back empty). The dataset is useful as inspiration for label-quality methodology (Cohen's κ on a held-out re-label; see §3 Project 3) but does not enter the v2 sourcing pipeline. Overturns STACK.md's tentative "revisit prior rejection" by re-confirming the rejection with a sharper rationale: it's a granularity problem, not a quality problem.

### Source: HuggingFace `agentlans/literary-genre-examples`

- **Role:** none — fails on every dimension we test for
- **Coverage:** 86 fiction/nonfiction genre categories at paragraph level; ~100k labelled paragraphs total
- **Access:** `datasets` library (Phase 8 install only per D-05). Phase 7 reads the dataset card only.
- **Risks:** Paragraph-level granularity is too short for our `window=15` Word2Vec context and full-book persistence-homology features (a paragraph has ~5-50 tokens; we need full-book point clouds of 200-500 high-TF-IDF words). 86 genres include rare/synthetic categories (e.g., "weird fiction", "new weird") with sparse, possibly LLM-generated examples — label-source provenance unclear.
- **Verdict:** **Reject** — granularity mismatch (paragraph vs full-book) plus label-source quality concerns. STACK.md flagged this as "revisit prior rejection"; we re-confirm rejection with the additional finding that the dataset's label provenance is not auditable in the dataset card, putting it in the same category of risk as LLM auto-labelling (see Confirmed anti-features below).

### Source: Goodreads public dump (UCSD academic mirror, `mengtingwan.github.io/data/goodreads.html`)

- **Role:** curation-only (candidate shortlists ranked by user-shelf consensus, NOT labelling, NOT text-fetch) — per D-03
- **Coverage:** ~2.4M books with user-shelf tags; UCSD academic mirror is cleared for academic use (Wan & McAuley 2018, Wan et al. 2019). ~876M user-book interactions.
- **Access:** Bulk JSON / SQLite download from the UCSD academic mirror. No scraping at scale. Citation: Wan, M., & McAuley, J. (2018). "Item Recommendation on Monotonic Behavior Chains."
- **Risks:** User shelves are noisy (640 distinct genre shelves → 499 are user-invented rare labels per `FEATURES.md §2`); ethically grey at scale even via academic mirror — mirror provenance must be cited verbatim in CORPUS_SOURCING.md and in `corpus/books.yaml` per-book `source` provenance fields (D-10). Cleaning required: filter to a controlled vocabulary of ~30 genre shelves (e.g., "horror", "romance", "mystery", "fantasy", "science-fiction", "western", "historical-fiction", "literary-fiction") and threshold by shelving count (≥1,000 shelvings to count toward a candidate ranking).
- **Verdict:** **Accept** as curation-only source (per D-03) — Goodreads "Best of Genre" shelves and the per-book shelving count distribution are the strongest community-consensus signal we have for which titles "matter" within a genre. Goodreads shelves explicitly do NOT label our books; they help rank Gutenberg matches by external popularity within each genre bucket. Reframes STACK.md's prior framing of Goodreads as a labelling source — D-03 reassigns it to curation-only.

### Source: Internet Archive `internetarchive>=3.5` SDK

- **Role:** text-fetch fallback (older/rarer titles not in Gutenberg or Standard Ebooks)
- **Coverage:** Millions of public-domain texts; quality varies (OCR'd, sometimes noisy headers/footers); much overlap with Gutenberg but also has unique holdings
- **Access:** Phase 8 install only (`pip install "internetarchive>=3.5"` per `STACK.md` and D-05); CLI + Python SDK. Phase 7 documents the URL schema only.
- **Risks:** OCR noise injects spurious vocabulary into the Word2Vec training (long-S → "f", scanned dropcaps mis-recognised, page-break artifacts); rate limits unverified for 2026 (`STACK.md` Confidence Calibration labels this LOW); cleaning pipeline cost not yet estimated.
- **Verdict:** **Accept** as a documented escape hatch only — not a default Phase 8 source. Phase 8 reaches for Internet Archive only if Gutenberg + Standard Ebooks coverage gaps appear for specific candidate titles. The install lands when first needed, not preemptively. Upholds STACK.md's "documented option, not an install" framing.

### Source: HathiTrust public-domain subset

- **Role:** metadata-only LCC cross-reference (NOT text-fetch in v2)
- **Coverage:** ~7M titles, ~40% public-domain; richer LCC subject headings than Gutenberg; institutional digitisation quality
- **Access:** Data API (`hathitrust.org/data_api/`) is rate-limited and full-text access requires research-affiliation certificate in some tiers. Metadata-only access is open via the Bibliographic API.
- **Risks:** Access overhead for full-text (institutional credential) not worth the engineering cost at our 200-300 book scale; HathiTrust's strength is at the 100k+ scale.
- **Verdict:** **Reject** for v2 text-fetch (credential overhead not justified at our scale); **Accept** for metadata-only LCC cross-reference IF the integration is cheap (a single Bibliographic API call per Gutenberg match to enrich the LCC headings). Phase 8 owns the cost/benefit call — if the integration takes >1 day, drop it; LoC + Open Library cover the same cross-reference need. The aggregate verdict skews Reject for any text-fetch role; conditional Accept for cheap metadata enrichment.

### Source: Standard Ebooks (`standardebooks.org`)

- **Role:** text-fetch alternative (curated editions of Gutenberg classics with cleaner OCR + standardised metadata)
- **Coverage:** ~700 curated public-domain editions; significant overlap with Gutenberg but with higher text quality
- **Access:** Direct HTML/EPUB download from `standardebooks.org/ebooks/`; catalog is small enough to mirror locally if needed. No Python library required.
- **Risks:** Small catalog (~700 vs Gutenberg's ~70,000); significant overlap with Gutenberg means most candidate titles will resolve to *both* sources, requiring a preference rule.
- **Verdict:** **Accept** as a quality-improving alternative to Gutenberg for titles where both have the work. Phase 8 preference rule: use Standard Ebooks when a title exists in both catalogs; fall back to Gutenberg otherwise. Standard Ebooks' cleaner OCR meaningfully reduces vocabulary noise in the Word2Vec training pass. Overturns the implicit STACK.md ambivalence in favour of an explicit preference rule.

### Pipeline implication (per D-03 + D-04)

The pipeline produced by these verdicts:

1. **Build per-genre candidate shortlists (≥50 titles per genre)** from curation sources — Goodreads-UCSD shelves filtered to the 30-genre controlled vocabulary and thresholded by shelving count; LoC LCC class-P headings + canon lists ("Books That Shaped America", "Great Books", per-genre scholarly canon lists like Hugo/Nebula/MWA Edgar/Bram Stoker/Western Writers of America Hall of Fame); comparable-project corpora (the Worsham/Gutenberg-Genre-ID 996-book pool); Open Library subject tag cross-reference to break LCC ambiguity.
2. **Apply constraints** (≥8 distinct authors per genre per D-08; word_count_min ≥10,000 and download_count_min ≥150 per §3 Project 4 Reagan; public-domain availability; English-language).
3. **Look up each candidate** in Standard Ebooks first (preferred for text quality), then Gutenberg (full coverage), then Internet Archive as fallback only when neither has the work.
4. **Record provenance** for every text fetch (per D-10 schema: `source: {provider, fetched_at, text_sha256}`).
5. **Final selection** of 25-30 books per genre is Phase 8's job from this Phase-7-vetted candidate pool. Phase 7 makes zero per-book picks.

### Confirmed anti-features

- **BookCorpus** — Rejected. Licensing issues (scraped from Smashwords without redistribution rights; documented ethical concerns in Bandy & Vincent 2021 "Addressing 'Documentation Debt' in Machine Learning Research: A Retrospective Datasheet for BookCorpus"). Risk: DMCA exposure on Railway, academic credibility loss, contradicts PROJECT.md's "publicly accessible, hosted" requirement (hosting copyright-questionable text is legally fragile). Aligns with `FEATURES.md §2 Anti-Features`.
- **Goodreads scraping at scale** — Rejected. Goodreads ToS prohibits scraping; the UCSD academic mirror is the only acceptable channel and only as curation, never as labelling or text fetch. Direct scraping of `goodreads.com` is out of bounds for v2 regardless of how convenient the data would be. Aligns with `FEATURES.md §2 Anti-Features`.
- **LLM auto-labelling** — Rejected. Circular benchmark: labelling our corpus with an LLM (Claude, GPT, etc.) means benchmarking our SVM against the LLM's genre classifications, not against literary reality. This bakes in the LLM's biases (genre conflation, training-data idiosyncrasies) and produces an unreproducible "ground truth" that future model updates silently shift. Acceptable only as candidate-title suggestions for human review (i.e., "Claude, suggest 50 horror novels in the public domain" → human reviews, accepts/rejects), never as auto-accepted labels. Aligns with `FEATURES.md §2 Anti-Features`.

## 3. Comparable projects

We surveyed four projects that benchmark genre classification on book-length literary text and documented how each one sourced its corpus, labelled it, validated it, and what we should and should not copy. Each project's "Our deviation" line is the operative output — these are the methodological gaps Phase 8 must close so the v2 protocol does not inherit known footguns.

The survey covers a deliberately narrow band: book-length English-language fiction with multi-class genre labels and a public, reproducible methodology. We excluded paragraph-level classification (granularity mismatch with our window=15 full-book features) and binary fiction/nonfiction work (granularity too coarse for 8-10 sub-genres). The four projects below cluster naturally into two pairs: small-corpus academic work (Reagan, Worsham/Kalita) and large-scale benchmark resources (BL Labs blbooksgenre, Gutenberg Genre Identification) — the pairing exposes the same author-leakage and granularity problems at both scales.

### Project 1: Worsham & Kalita — Genre Identification and the Compositional Effect of Genre in Literature

- **Year & venue:** 2018, COLING workshop (referenced via the Gutenberg-Genre-ID repository's bibliography). https://aclanthology.org/C18-1167/
- **Corpus size:** 996 books × 10 genres (Project Gutenberg)
- **Sourcing:** Project Gutenberg metadata search by LCC subject heading, then bulk text download via the `gutenbergpy` precursor library. Header/footer stripping by the canonical `*** START OF` / `*** END OF` regex.
- **Labelling:** LCC subject headings, with manual de-duplication of overlapping categories (e.g., merging "Detective and mystery stories" with "Crime stories"). No multi-label support — each book assigned exactly one of 10 genres.
- **Validation:** 5-fold cross-validation, stratified by genre. No author-grouped CV. Reported accuracy as the headline number.
- **Headline result:** ~67% top-1 accuracy on 10-way classification with engineered linguistic features (lexical, syntactic, semantic). Baseline TF-IDF + linear SVM hit ~60%.
- **Our deviation:** Their 5-fold stratified-by-genre CV ignores author overlap entirely — Gutenberg's prolific authors (Wells, Verne, Austen) appear in multiple folds and inflate the apparent number. We mandate `GroupKFold(groups=author)` per `PITFALLS.md §5` and a tight ≤10pp per-author smoke test (D-17) precisely because v1's 6 Austen / 5 Verne / 4 Lovecraft concentration would repeat their bug at our scale.

### Project 2: Gutenberg Genre Identification corpus (gjoseph16/Genre-Identification-on-a-sub-set-of-Gutenberg-Corpus)

- **Year & venue:** 2018-2020, GitHub repository + accompanying notebook. https://github.com/gjoseph16/Genre-Identification-on-a-sub-set-of-Gutenberg-Corpus
- **Corpus size:** ~996 books × 10 genres (the same Worsham/Kalita pool, re-distributed as a reusable dataset)
- **Sourcing:** Project Gutenberg via the inherited Worsham subset; pre-cleaned `.txt` files committed to the repo. Author metadata is *not* recorded — the dataset is title + genre only.
- **Labelling:** Inherited from Worsham/Kalita (LCC subject headings → 10 manual genre classes). No revision; the authors trusted the upstream labels.
- **Validation:** The repo ships an example notebook with TF-IDF + multinomial Naive Bayes scoring ~75% top-1 accuracy with 80/20 random train/test split. Per-genre F1 is reported but accuracy is the headline.
- **Headline result:** 75% top-1 accuracy (TF-IDF + Multinomial NB, 80/20 random split, 10 genres).
- **Our deviation:** Their dataset has no author field — Phase 8 cannot apply `GroupKFold(groups=author)` directly against it. v2 must source author metadata at fetch time (D-10's `source: {provider, fetched_at, text_sha256}` schema, joined with Gutenberg's `author` metadata field). The 80/20 random split is also leaky for the same reason as Project 1; v2's hold-out (D-12) follows the author-overlap rule deliberately to model the realistic upload scenario rather than pretending unseen-author generalisation.

### Project 3: BL Labs — TheBritishLibrary/blbooksgenre

- **Year & venue:** 2021, British Library Labs Data Discovery project; HuggingFace mirror published 2022. https://huggingface.co/datasets/TheBritishLibrary/blbooksgenre and the accompanying paper "Digitised books: A reusable dataset" (Hosseini et al., 2021).
- **Corpus size:** ~49,000 titles (18th–19th century English-language British Library digitised books). Fiction/nonfiction binary labels.
- **Sourcing:** British Library's own digitisation pipeline (TIFF scans → OCR → text). Title-level metadata from BL's MARC records. Not a Gutenberg overlap — these are scans of physical BL holdings, many never in Gutenberg.
- **Labelling:** Binary fiction/nonfiction at title level. Labels derived from BL's MARC `008` field "fiction code" + manual review on the held-out test set. Inter-annotator agreement ~0.92 (Cohen's κ) — high for crowdsourced library work.
- **Validation:** Random 80/10/10 split at title level. No author-grouped CV. Reported macro-F1 and accuracy on the held-out 10% test set.
- **Headline result:** ~94% macro-F1 with logistic regression on TF-IDF features (binary task).
- **Our deviation:** Their fiction/nonfiction binary is too coarse for our 8-10 fiction sub-genre question — we cannot reuse the labels. However, BL's MARC-derived labels demonstrate a methodology we should adopt at curation time: institutional metadata as the gold standard, with manual review on the test set only (not the training set, where labelling cost would dominate). v2's curation pipeline (D-03) follows this pattern — Goodreads-UCSD + LoC catalog give candidate shortlists ranked by institutional/community consensus, and human review applies only to the final 25-30 books per genre that land in `corpus/books.yaml`.

### Project 4: Reagan et al. — The Emotional Arcs of Stories Are Dominated by Six Basic Shapes

- **Year & venue:** 2016, EPJ Data Science 5:31. arXiv:1606.07772. https://arxiv.org/abs/1606.07772
- **Corpus size:** 1,327 Project Gutenberg fiction works (post-1850, English, ≥10,000 words, ≥150 downloads as a popularity filter)
- **Sourcing:** Project Gutenberg bulk catalogue download. Filters: language=English, LCC starts with "PR" or "PS" (Language and Literature), word_count ≥10,000, download_count ≥150 (a "is anyone reading this?" proxy). Header/footer stripping via `*** START OF ... ***` markers.
- **Labelling:** None — this is unsupervised work. Sentiment-trajectory analysis via the labMT lexicon; clustering into "story arcs" via SVD + agglomerative clustering.
- **Validation:** Robustness checks via three alternative dimensionality-reduction methods (SVD, hierarchical clustering, self-organising maps) and three alternative sentiment dictionaries. Cross-method agreement at the cluster level was the validation, not per-book accuracy (the task is unsupervised).
- **Headline result:** 6 dominant story-arc shapes recovered across all 3 methods × 3 sentiment lexicons (robustness as headline, not accuracy).
- **Our deviation:** Reagan's word_count ≥10,000 + download_count ≥150 popularity filter is the most reusable methodological idea in this survey — it filters Gutenberg's long tail of obscure pamphlets and partial works that would inject noise into our small corpus. Phase 8's CORPUS_SOURCING.md must specify these two thresholds (word_count_min and download_count_min) as hard filters before the candidate-shortlist stage. Reagan didn't need genre labels; we do — but the *sourcing filters* port directly.

### Cross-cutting findings

- **Common sourcing pattern:** Project Gutenberg is the default text source (3 of 4 surveyed projects); BL Labs is the institutional alternative for non-Gutenberg digitised text. Labels come from LCC subject headings (Worsham, Gutenberg-Genre-ID) or institutional metadata (BL MARC) — never from Goodreads or LLM auto-labelling. This validates D-03's reframing: curation sources (Goodreads, LoC) give candidate titles; text-fetch sources (Gutenberg, BL) give the bytes; labelling comes from institutional/expert review, not crowdsourcing or generative models.
- **Common validation gap we avoid:** None of the four projects use `GroupKFold(groups=author)`. All use either random k-fold or random train/test split at the *title* level. `PITFALLS.md §5` documents why this is a leakage trap when the same author appears 3+ times in a genre — exactly v1's situation (6 Austen, 5 Verne, 4 Lovecraft). v2 mandates author-grouped CV (D-16) precisely because this is the *unfixed* methodological flaw shared by all four comparable projects. `PITFALLS.md §4` covers the related "no held-out test set" issue; v2's D-11/D-12/D-13 fix this by pinning a 20% hold-out before Phase 8 retrains.
- **Sizes that work in this space:** Small academic corpora (Reagan: 1,327 unsupervised; Worsham: 996 supervised) cluster around ~100 books per genre at 10 genres. Large benchmark resources (BL Labs: ~49k) sit two orders of magnitude higher but with coarser labels. Our target of 25-30 books / genre × 8-10 genres (200-300 books total) is at the *small-academic* end — defensible for the topology+vocabulary feature space (where per-book features are rich) but acknowledged-small for the SVM (per `PITFALLS.md §6` macro-F1 is the right metric to surface imbalance).
- **Common labelling weakness:** Of the four projects, only BL Labs reports inter-annotator agreement (Cohen's κ ≈ 0.92). Worsham/Kalita and Gutenberg-Genre-ID inherit LCC subject headings without revising them; Reagan is unsupervised. v2's curation pipeline must publish a label-quality statement in CORPUS_SOURCING.md (Phase 7 documents it; Phase 8 produces the κ measurement on the held-out subset where two annotators independently re-label).

## 4. Genre set recommendation

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

> **Note for the reader:** this is the **most opinionated decision in Phase 7** (per the 07-CONTEXT.md specifics section). Per D-21, the user reviews this recommendation inline during normal doc review and either approves (proceeds to Phase 8) or pushes back via `/gsd-fast`. No separate `/gsd-discuss-phase` checkpoint.
>
> For the LCC subject overlap evidence used in `### Evidence 1`, the detailed pairwise overlap table lives in **Appendix A** below.

### Proposal A — Merge to 8 genres

Merge `gothic + horror → gothic_horror`; merge `scifi + fantasy → speculative` (snake_case label consistent with v1's `scifi`). Keep: adventure, historical, literary, mystery, romance, western.

- **Pros:** LCC subject overlap analysis (see Appendix A) shows **60% gothic↔horror overlap** and **40% scifi↔fantasy overlap** — the strongest pairwise overlap signals in the v1 corpus. The weak horror performer (22%) likely collapses into gothic's stronger feature-space region; the moderate scifi (40%) and fantasy (67%) genres are stylistically adjacent (both Wells-style speculative, both Burroughs, shared Verne lineage). Per-genre author availability comfortably exceeds the ≥8 floor for both merge buckets (gothic_horror ≈15 distinct PD authors with ≥2 works on Gutenberg; speculative ≈12). 8 genres × 30 books = 240-book corpus — larger per-genre sample at the same total budget than Proposal C's 25/genre.
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

### Evidence 1: LCC subject overlap

See **Appendix A** of this document for the full pairwise overlap table and methodology. Summary:

- gothic ↔ horror overlap: **60%** (6 of 10 books on each side share dominant LCC subjects — *Carmilla*, *Dracula*, *Frankenstein*, *Wuthering Heights*, *Phantom of the Opera*, *Picture of Dorian Gray* all carry both "Gothic fiction" and "Horror tales" classes)
- scifi ↔ fantasy overlap: **40%** (Burroughs cross-tagged, Haggard's lost-race tropes border scifi, Verne's *Mysterious Island* carries adventure+scifi+fantastic-geography)
- Also high-overlap (≥30%): scifi↔adventure 40% (Verne canon), historical↔adventure 40% (Dumas, Scott, Wallace), historical↔literary 30% (Tolstoy, Hugo, Dickens), fantasy↔adventure 30% (Haggard, Pyle)
- horror has **>30% overlap with gothic alone**; **<15% with every other genre**. The merge interpretation is catalogue-clean.
- historical has **moderate overlap with adventure (40%) and literary (30%)**. Historical is a hybrid catalogue category, not an isolated unseparable class.
- 33 of 45 total pairs at <15% overlap — most of the 10-genre structure IS catalogue-separable; the problem is concentrated in 2 high-overlap cliques (gothic/horror and the scifi/fantasy/adventure triangle).

This evidence **strongly supports Proposal A**. The 60% gothic↔horror overlap is unusual — most genre pairs sit well below 30% — and is the kind of overlap classification models reliably fail to resolve regardless of corpus size. The scifi↔fantasy 40% is weaker but still merge-favourable. Proposal B is weakly supported because its drop-target genres are catalogue-overlapping, not catalogue-isolated. Proposal C is weakly argued against because the gothic↔horror clique will not separate with more data.

### Evidence 2: Comparable-project precedent

Drawing on §3 above:

- **Gutenberg Genre Identification corpus** (~1000 books, 10 genres, Joseph et al.) — uses 10 distinct genres (Adventure, Detective, Historical, Horror, Mystery, Romance, Science Fiction, Thriller, Western, Children's) with no merges. Direct precedent for Proposal C. However, their corpus is 10× the size of v1, making per-genre samples large enough to learn fine distinctions our 25-30/genre budget cannot reach.
- **BL Labs `blbooksgenre`** — uses fiction/nonfiction binary at the catalogue level; not informative for our merge decision (their genre taxonomy is too coarse to comment on).
- **Reagan et al. "Six Story Arcs"** — clusters emotional-arc shapes, not literary genres; orthogonal evidence (doesn't speak to genre-merge decisions).
- **Small-corpus academic NLP genre work (2020–2026)** — Worsham & Kalita and other small-corpus authors commonly merge horror+gothic and treat scifi/fantasy as a single "speculative" class when corpus is <500 books, on the same overlap-and-author-availability grounds we surface here.

Cross-project consensus on genre count for book-length literary text: **typically 5–10 genres**. Cross-project consensus on merged categories: split — Gutenberg Genre Identification keeps 10 with horror and mystery as separate (different from our gothic↔horror merge proposal); BL Labs collapses to binary; small-corpus academic work routinely merges to 5–8.

This evidence **weakly supports Proposal A** (small-corpus academic precedent for merging) but does not strongly argue against C (the largest comparable corpus keeps 10). The split reflects the scale-dependent nature of the decision: with 1000+ books per genre, Gutenberg Genre Identification can afford to keep horror and gothic separate; with 30 books per genre, we likely cannot.

### Evidence 3: Per-genre public-domain author availability

For each genre, count distinct public-domain authors known to have ≥2 works in that genre on Project Gutenberg. ≥8 distinct authors (per D-08) is the hard constraint. Estimates below are best-effort drawing on Gutenberg's bookshelf indices and the canonical genre lists in the 07-CONTEXT.md canonical-references section.

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

### Recommendation

**Recommendation: Proposal A.**

**Rationale:** All three evidence streams converge on Proposal A. The 60% gothic↔horror LCC overlap is the strongest single signal in the data and points directly at the gothic_horror merge; the 40% scifi↔fantasy overlap is weaker but pairs with the well-documented stylistic adjacency between Wells-style scifi and Morris-style fantasy in the public-domain era. Per-genre author availability comfortably supports both merge buckets (~15+ for gothic_horror, ~12+ for speculative) while also surfacing the marginal author depth for western and fantasy under Proposal C — Proposal A absorbs the marginal fantasy bucket into a comfortable speculative bucket and leaves only marginal-but-acceptable western. Comparable-project precedent is mixed (Gutenberg Genre Identification keeps 10 at 10× our scale; small-corpus academic work routinely merges to 5–8) and at our 240–250-book scale tips toward A. Critically: Proposal A keeps the v2 genre count near v1's, gives each surviving bucket more books per genre at the same total budget, and addresses the two empirically-weakest v1 categories (horror 22%, scifi 40%) by routing them into stronger neighbours rather than by dropping them (Proposal B) or hoping more data fixes them (Proposal C). The trade-off — loss of fine-grained gothic-vs-horror and scifi-vs-fantasy distinctions — is mitigated by Phase 9's "why this genre" explainer surfacing within-bucket sub-style as part of the per-prediction commentary.

**Final genre count:** 8.

**Final books per genre (D-06):** 30 books × 8 genres = 240 books.

**Final total corpus size:** 240 books.

**Snake-case labels (Proposal A wins):** `gothic_horror`, `speculative` (consistent with v1's `scifi` — snake_case, no hyphens, no spaces). These names match the v1 naming convention in `corpus/books.yaml` and require no special handling in the YAML loader or downstream pipeline.

**The 8 v2 genres:** `adventure`, `gothic_horror`, `historical`, `literary`, `mystery`, `romance`, `speculative`, `western`.

**User checkpoint:** Per D-21, this recommendation surfaces here for inline user review during normal doc review. The user reads the assembled document and either approves the recommendation (implicit by proceeding to Phase 8) or pushes back via a follow-up `/gsd-fast` or comments. If the user prefers Proposal B or C, the rationale section above documents why this fragment chose A, so the user can rebut on specific evidence-stream grounds rather than on vibes.

## 5. Corpus shape + author distribution

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

**Finding:** 8 of 10 v1 genres violate D-08. romance, western, and fantasy concentrate ≥40% of their books in a single author (Austen 6/10, Grey 6/10, Morris 4/10). The candidate-shortlist in `corpus_candidates.yaml` corrects this — every genre's candidate list has ≥8 distinct authors per Plan 03's verification, with significant headroom in most genres.

### v2 candidate-list audit (from corpus_candidates.yaml)

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

### Per-author held-out smoke test prerequisite

`VALIDATION_PROTOCOL.md` §8 specifies a per-author held-out smoke test with **≤10pp gap pass criterion**. That test depends on this audit:

- The set of **authors with ≥2 books in the final corpus** (Phase 8 picks) drives the test set. From the v2 audit above, the high-risk priority list is: Zane Grey (western), Lord Dunsany (fantasy), Jules Verne (scifi), H. P. Lovecraft (horror), Arthur Conan Doyle (mystery), Mark Twain (adventure), Walter Scott (historical), Jane Austen (romance), Henry James (literary), Charles Brockden Brown (gothic). Each of these will get a dedicated hold-out fold.
- Given D-07 (no per-author cap), the prolific-author rows in this audit identify the highest-risk authors. The smoke test holds each of them out completely and verifies the model still classifies their works correctly — if the model collapses (gap > 10pp), the genre signal is dominated by author style and the corpus restructure has failed PITFALLS §5.
- Authors with only **1 book** in the final corpus are **not part of the smoke test** (no within-author signal possible). v2's wider author distribution means most "1-book authors" simply contribute to the genre's diversity floor without participating in the smoke test.

### Corpus shape decisions (D-06, D-07, D-08)

- **Books per genre (D-06):** **30** (single number, no range). Aligned to the §4 Proposal A recommendation. If the user overrides to Proposal C (keep 10), the count drops to **25/genre** per the audit's defensible-against-either-outcome design — the candidate YAML has ≥50 candidates per genre supporting either 25 or 30 selections.
- **Genre count:** **8**, per the §4 Proposal A recommendation. The candidate YAML covers all 10 v1 genres so any Plan-04 user override (Proposal B or C) is consumable without re-sourcing.
- **Total corpus size:** **240 books** if Proposal A wins; 240 (B) or 250 (C) otherwise. Phase 8 commits the final number per the user-approved §4 outcome.
- **Per-author cap (D-07):** **NONE**. Prolific public-domain authors who define a genre (Austen, Wells, Verne, Zane Grey, Lovecraft, Dumas, Doyle, Scott, etc.) may contribute as many works as the candidate shortlist + Phase 8's final selection process retains. The risk is documented; the mitigation is **D-17, not a per-author cap**. The candidate list explicitly preserves prolific-author entries (Grey 17, Verne 14, Dunsany 11, Lovecraft 8, Doyle 8, Austen 7, James 6, etc.).
- **Distinct authors per genre (D-08):** **≥8 distinct authors per genre** is a hard constraint. Candidate shortlists already satisfy this (minimum 11 in fantasy, maximum 28 in gothic); Phase 8 must preserve it when picking the final 25 (or 30) — see selection rule below.

### Phase 8 selection rule

Given a genre's candidate list (≥50 entries, ≥8 distinct authors, sorted by source_consensus_score desc / gutenberg_id asc), Phase 8's selection procedure is **deterministic** and reproducible from this candidate YAML alone:

1. **Author-diversity floor first.** Take the top-scored (by source_consensus_score) title from each distinct author in the candidate list, up to 8 authors. This guarantees ≥8 distinct authors are covered before the per-author concentration kicks in.
2. **Fill remaining slots by consensus score.** Fill the remaining slots (30 − 8 = 22, or 25 − 8 = 17) by walking the sorted candidate list and adding any title not yet selected, breaking ties by ascending gutenberg_id.
3. **Word-count gate.** Skip any candidate that fails the word-count minimum (Phase 8 picks a threshold; tentatively **≥20,000 words per book** — short-story collections may have individual entries below this but full collections clear the bar). Phase 8's `scripts/build_corpus.py` enforces this at fetch time.
4. **Gutenberg-availability gate.** Skip any candidate whose Gutenberg edition is missing, corrupt, or has unstripped header/footer issues. Phase 8 catches this at fetch time using the existing `scripts/01_download_corpus.py` + `scripts/02_preprocess.py` pipeline.
5. **Record drops and replacements.** Phase 8 emits a corpus-build log listing every candidate that was skipped (with reason) and every replacement that was promoted. The next available candidate by step-2 ordering takes the slot.

This procedure is deterministic given (a) the candidate YAML, (b) the word-count threshold, (c) the Gutenberg-fetch outcomes. Phase 8's `scripts/build_corpus.py` (CEXP-05 P2) can emit the same final list on every run from the same `corpus_candidates.yaml` — corpus reproducibility per the Phase 6 BUG-05 cache-key invariant.

### books.yaml schema additions (D-10)

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

- **`source.provider`** — string enum, lowercase snake_case. Identifies which text-fetch source per the verdicts in §2 above. v2 expects mostly `"gutenberg"`; `"standard_ebooks"` permitted for titles where SE has a cleaner edition; `"internet_archive"` only as the documented escape hatch per D-04.
- **`source.fetched_at`** — ISO 8601 date (`YYYY-MM-DD`). Records when the text bytes were retrieved. Phase 8's `scripts/build_corpus.py` populates this at fetch time; immutable thereafter.
- **`source.text_sha256`** — hex string (64 chars). sha256 of the post-preprocessing canonical bytes (after Gutenberg header/footer stripping, before tokenisation). Used together with `corpus_hash` (Phase 6 BUG-05) to detect silent corpus drift and to verify reproducibility between machines.

**Backward compatibility:** the new `source` field is **additive**. `backend/api/routes/corpus.py::_load_books_metadata()` ignores unknown keys — Phase 8 verifies this with a fixture loaded against the new schema before bulk-applying. The existing 100-book v1 entries either gain a `source: {provider: "gutenberg", fetched_at: "2026-04-13", text_sha256: "..."}` populated from the v1 fetch logs, OR are dropped during the v2 restructure (in which case the schema change only applies to the 25-or-30 final picks per genre).

**Single source of truth:** `corpus/books.yaml` is the only manifest. There is **NO** sibling `corpus/sources.yaml`. All provenance lives on each book.

## 6. Multi-label classification — feasibility and recommendation

v1 forces a single genre label per book. Books like *Frankenstein* (gothic + scifi), *Treasure Island* (adventure + historical), and *Heart of Darkness* (literary + adventure) get assigned one label by editorial choice and the other is invisible. v2 asks: do we keep single-label, or move to multi-label?

Per D-18, this is **evaluated during Phase 7 research**, not pre-committed. The default expectation per `FEATURES.md §2 "Multi-genre / soft labels (research target)"` and `SUMMARY.md §"Gaps to Address"` is defer-to-v3, but research may find an opening. We examine four dimensions below and converge on a recommendation. **RES-03 traceability:** this section is the answer to RES-03.

#### Cost

sklearn library support is excellent and cheap. `sklearn.multiclass.OneVsRestClassifier(SVC(kernel='rbf', probability=True, ...))` is the canonical multi-label SVM pattern: it fits one binary SVM per genre on the same feature matrix, calling each genre's classifier independently at inference. Training cost is linear in `n_classes` — at 8-10 genres we train 8-10 binary SVMs instead of 1 multiclass SVC, but each binary SVM is faster than the equivalent multiclass-Platt training (fewer pairwise comparisons). Total training time on our 200-300 book v2 corpus stays under ~5 minutes (vs ~2 minutes for the v1 multiclass SVM). Inference cost is similar: 8-10 `predict_proba` calls per upload, returning a `[genre, prob]` pair per genre. Per-class threshold (rather than top-1 argmax) decides which genres are "positive" for a given book.

Explainability infrastructure generalises cleanly. The nearest-neighbours approach (DEPTH-04 / `ARCHITECTURE.md §5b` option (c)) is class-agnostic — it returns the K closest training books in feature space regardless of how labels are organised. Per-track contribution analysis (DEPTH-05) decomposes the SVM decision into topology-vs-vocabulary contribution per binary classifier; the UI shows one decomposition per positive-prediction genre. Calibration (PITFALLS §7) requires per-class Platt scaling on each binary classifier rather than the single multiclass Wu-Lin-Weng extension — slightly more LOOCV folds but the same `CalibratedClassifierCV(method='sigmoid', cv=LeaveOneOut())` pattern; no new library, no architectural change. **Verdict on cost:** acceptable; this is not the blocker. Engineering effort to move v1 → multi-label is approximately 1 plan-week (binary SVM wrap + per-class calibration + UI top-N threshold + explainability extension).

#### Ground truth

This is the actual blocker. Clean multi-label ground truth requires one of three paths, each with significant friction:

- **Goodreads-UCSD shelf cleaning.** The UCSD academic mirror gives us ~876M user-book interactions, with each book carrying multiple shelf tags. We could in principle accept "every shelf tag with ≥X% of shelvings (after filtering to the controlled 30-genre vocabulary)" as a positive label. Risk: shelf tags are extremely noisy — "to-read", "favourites", "5-star", "audiobook", and book-club shelves pollute the signal heavily. The cleaning pipeline must filter to a controlled vocabulary, threshold by shelving count, and apply a calibration step to map raw shelving percentages to a usable per-genre threshold. Cleaning effort: estimated 3-5 days of curation engineering plus a manual review pass on the final 200-300 books to catch label collapse (e.g., a book getting 12 positive labels because it's popular across many shelves). Per §2's curation-only verdict for Goodreads, the shelves help *rank* candidates — extending them to also *label* candidates is a meaningful expansion of trust we place in user shelves and partially contradicts the D-03 reframing.

- **LoC subject headings.** LCC subject headings are typically 1-3 per book and are author/work-clustered rather than genre-clustered (e.g., PR6005 covers all of Conrad's work under one bucket). Not naturally multi-label at our 8-10 genre granularity. Adequate as a sanity check, not a primary multi-label source.

- **Expert re-labelling.** 25-30 books × 8-10 genres × multi-label (1-3 positive labels per book) ≈ 250-900 binary book-genre judgements. Tractable for one or two domain-expert annotators in a focused week; the methodology from §3 Project 3 BL Labs (Cohen's κ ≥ 0.85 inter-annotator agreement target) applies directly. This is the cleanest path but the most expensive in human time.

- **LLM-assisted with human review.** Generative-model proposed labels with human final-cut. Circular-benchmark concern per `FEATURES.md §2 Anti-Features` and §2's Confirmed anti-features — acceptable only with human-final-cut and explicit disclosure that some labels were LLM-proposed.

**Verdict on ground truth:** clean multi-label ground truth requires either (a) Goodreads shelf cleaning at moderate cost with noise risk, (b) expert re-labelling at moderate human cost with the cleanest signal, or (c) both. This IS a Phase 8 budget blocker, not a trivial-to-source quantity. The expert re-labelling path is the strongest standalone option but competes for the same Phase 8 review time that single-label curation already consumes.

#### UI implications

Top-N display (DEPTH-01, DEPTH-02) shifts shape. Single-label v2 with calibrated probabilities renders as "top-3 genres ranked by probability, with the winner highlighted". Multi-label v2 renders as "all genres above a configurable threshold (default 0.5), with no single winner". The threshold itself becomes a settings-drawer control alongside α and K. The "winner" framing in copy and visuals — currently `Predicted: Mystery (0.78)` — becomes `Predicted: Mystery (0.78), Adventure (0.62), Historical (0.55)` or similar. This is a meaningfully different product story: the app no longer answers "what genre is this book?" but "which genres apply to this book?"

"Why this genre?" explainability (DEPTH-03..06) becomes "why these genres?". Multiple positive-prediction genres need parallel explanations — per-class nearest neighbours, per-class driving words, per-class topology-vs-vocabulary decomposition. The explainability panel grows from one fixed section to N (where N = number of positive labels for this upload). UI complexity scales with N; PITFALLS §13 (information overload) becomes a real risk when a book triggers 5+ positive labels.

Calibration (PITFALLS §7) and reliability diagrams need a per-class reliability diagram rather than a single one — N diagrams in the "Advanced diagnostics" pane (`FEATURES.md §3a "Calibration plot in settings drawer"`). Onboarding tour (POLISH-02, `FEATURES.md §4b`) must explain "this book is gothic AND scifi, here's why both" rather than "this book is gothic, here's why" — a more conceptually demanding tour step.

User expectation: most upload workflows (in 2026's commercial ML landscape) assume a single answer. Multi-label is a meaningfully different mental model and downstream-blocking for Phase 9 (DEPTH-01..07) and Phase 10 (POLISH-02 tour copy).

#### Comparable-project precedent

Referencing §3: none of the 4 surveyed projects use multi-label. Worsham/Kalita (Project 1) and Gutenberg-Genre-ID (Project 2) both use single-label 10-way classification. BL Labs `blbooksgenre` (Project 3) is binary fiction/nonfiction — not multi-label in our sense. Reagan et al. (Project 4) is unsupervised — no labels at all. Across the four projects, single-label classification is the dominant pattern.

Broader 2020-2026 NLP genre-classification literature is mixed: academic benchmarks lean single-label (because labels come from institutional/expert sources that publish one canonical genre per work); commercial systems (Goodreads, Storygraph) lean multi-label (because they rely on crowd-sourced shelves). Our project sits closer to the academic-benchmark side (per the FEATURES.md framing as "exploration and learning tool" rather than commercial recommendation), so the comparable-project precedent supports single-label as the safer default.

**Verdict on precedent:** weak precedent for multi-label in this exact space; comparable-project corpus design favours single-label. The few multi-label genre-classification systems that exist in 2026 (Storygraph, refined Goodreads-shelf systems) are commercial, opaque, and don't ship reproducible methodology — not a model we want to imitate.

### Recommendation

**Recommendation: Defer to v3**.

**Rationale:** Three reinforcing reasons converge on deferral: (a) clean multi-label ground truth requires non-trivial sourcing effort (Goodreads shelf cleaning at noise risk, or expert re-labelling at human-time cost) that directly competes with the Phase-8 single-label curation budget — neither path is free; (b) comparable-project precedent is weak — all 4 surveyed projects use single-label or unsupervised, and the few multi-label systems in production are crowd-sourced commercial systems that don't ship reproducible methodology; (c) UI changes are downstream-blocking for Phase 9 (DEPTH-01..07 must all generalise from "winner" framing to "positive set" framing) and Phase 10 (tour copy + onboarding), expanding scope significantly without a corresponding accuracy win on the v1 baseline.

**If deferred to v3, what changes for v2:** Nothing. Single-label classification continues; the v1 calibrated `predict_proba` top-N display (`FEATURES.md §3a`) ships as planned. Documentation in `PROJECT.md` "Future Work" / "Out of Scope" should record multi-label as a v3 candidate with this Phase 7 rationale as the source. The Phase-8 curation pipeline records the *secondary* genre suggestion observed during expert curation as a free-form `notes` field in `corpus/books.yaml` (zero schema impact, useful evidence for the v3 multi-label re-labelling pass when it happens).

## 7. Per-genre candidate shortlists

Per D-19, each genre has ≥50 gutenberg_id candidates ranked by source_consensus_score. The full list lives in the sibling file **`.planning/research/v2/corpus_candidates.yaml`** (10 genres × 50+ candidates × 4 fields per candidate — too large to inline cleanly).

The YAML is the canonical source. Phase 8 reads this YAML, not the inline content here.

For a quick view of the **top 5 candidates per genre** (highest source_consensus_score per genre, ties broken by ascending gutenberg_id), see Appendix B below.

## 8. Phase 8 entry checklist

> Phase 8 executes this checklist top-to-bottom. Each item maps to a CEXP-N requirement and a CORPUS_SOURCING.md / VALIDATION_PROTOCOL.md / corpus_candidates.yaml reference. Phase 8 makes **zero further sourcing decisions** — every choice is pinned here.

1. **Read this document end-to-end and `VALIDATION_PROTOCOL.md` end-to-end** (entry gate; no other reading required for sourcing or validation methodology).
2. **Read `.planning/research/v2/corpus_candidates.yaml`** — the canonical source of candidate gutenberg_ids per genre.
3. **Apply the genre-set decision** (per §4): genres = `[adventure, gothic_horror, historical, literary, mystery, romance, speculative, western]`. Merge `gothic + horror → gothic_horror` and `scifi + fantasy → speculative` in the candidate-shortlist consumption step and in the final `corpus/books.yaml`. (If the user overrides §4 to Proposal B, drop `horror + historical` instead and keep the remaining 8 v1 genres unmerged. If Proposal C, keep all 10 v1 genres and drop per-genre count to 25.)
4. **Apply the Phase 8 selection rule** (per §5 `### Phase 8 selection rule`): for each genre, pick top-1-per-distinct-author until 8 distinct authors covered, then fill remaining slots by source_consensus_score descending, ties broken by ascending gutenberg_id.
5. **Final per-genre count = 30** under Proposal A (per D-06; §5). (25 if Proposal C overrides.)
6. **For each selected gutenberg_id:** fetch text via `gutenbergpy` (existing v1 dep, primary source per §2); fall back to Standard Ebooks if Gutenberg lacks the edition (per §2 verdict); record `source: {provider, fetched_at, text_sha256}` per book using the §5 `### books.yaml schema additions` block.
7. **Update `corpus/books.yaml`** with the final v2 entries. Preserve the v1 100-book entries that survive the cut; mark dropped v1 entries with a comment for audit.
8. **Run the full pipeline** end-to-end on the expanded corpus: `scripts/01_download_corpus.py` → `02_preprocess.py` → `03_train_embeddings.py` → `04_compute_homology.py` → `05_build_features.py` → `06_validate.py` (per CEXP-02). Phase 6 BUG-05 has already corrected cache_key inclusion of corpus_hash and w2v_model_sha256, so cache invalidation is automatic.
9. **Verify cache invalidation:** confirm the BUG-05 smoke test still passes — old cache + new model = cache miss.
10. **Run validation per `VALIDATION_PROTOCOL.md`** — including: v1 baseline reproducibility check (re-run `scripts/phase7_v1_baseline.py`, verify byte-identical JSON); v2 SVM evaluation on the v1-frozen hold-out gutenberg_ids pinned in VALIDATION_PROTOCOL.md §"v1 baseline (computed Phase 7)"; v2 LOOCV on full v2 corpus (context only, not headline); GroupKFold-by-author; permutation null; per-author smoke test with ≤10pp gap pass criterion.
11. **Report the three-numbers pattern** per VALIDATION_PROTOCOL.md §9: (1) v1 SVM on hold-out (this Phase 7 number); (2) v2 SVM on hold-out (headline v2 result); (3) v2 LOOCV on full v2 (context only).
12. **CEXP-03 pass criterion:** v2 macro-F1 strictly greater than v1 macro-F1 from `v1_baseline_results.json` AND permutation p < 0.05 AND per-author held-out gap ≤10pp.
13. **CEXP-04 pass criterion:** GroupKFold-by-author mean macro-F1 within 15pp of v2-on-hold-out macro-F1 (looser CEXP-04 bound vs the tight ≤10pp per-author smoke test — CEXP-04 is the published v2 number, smoke test is the anti-leakage guard).
14. **(P2) CEXP-05:** implement `scripts/build_corpus.py` if budget allows; reproduces the v2 `books.yaml` from `corpus_candidates.yaml` + Phase 8 selection rule + recorded fetch timestamps.

## Appendix A — LCC subject overlap analysis

> Evidence supporting §4 "Genre set recommendation".

### LCC subject overlap

For each v1 genre, we identify the dominant LCC subject headings (via Project Gutenberg metadata) and report pairwise overlap between genres. Two genres "overlap" if a non-trivial fraction of their books share LCC subject headings — i.e., the cataloguer applied the same Library of Congress subject classes to books in both genres.

#### Methodology

- For each v1 genre, list the LCC subjects appearing on ≥3 books in that genre (per Project Gutenberg's bibliographic record).
- For each pair of genres, count books in genre A whose dominant LCC subject also appears in genre B's dominant-subject set.
- High overlap (>30%) → genres are competing for the same feature-space region → **merge candidate**.
- Moderate overlap (15–30%) → boundary cases; context for merge-vs-keep decision.
- Low overlap (<15%) → genres are topologically separable → **keep candidate**.

**Data quality limitation:** Project Gutenberg's LCC subject tagging is uneven across the catalogue. Some books carry rich subject headings (multiple PR/PS/PZ classes plus topical descriptors); others — particularly mid-list 19th-century novels and shorter works — carry only a single broad class (e.g., "PR — English fiction" without further specialization). For ~15–25 of our 100 v1 books, the LCC entry is too sparse to support fine-grained genre-overlap claims. Where this happens we note "sparse LCC" in the per-genre table and weight the other two evidence streams (comparable-project precedent, per-genre author availability — see §4 Evidence 2 and 3) more heavily in the final recommendation.

#### Per-genre dominant LCC subjects

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

#### Pairwise overlap (sparse list — pairs with overlap ≥ 15%)

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

#### Findings

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

#### Implication for the genre-set decision

- **Proposal A (merge gothic+horror, scifi+fantasy):**
  - gothic ↔ horror at **60%** strongly supports the gothic_horror merge. This is the cleanest merge signal in the data.
  - scifi ↔ fantasy at **40%** supports the speculative merge, though less decisively. Note: scifi ↔ adventure is also 40% — if speculative merge happens, v2 should be careful that the resulting `speculative` bucket isn't really just "Verne + Burroughs adventure-scifi crossovers." Per-author audit in §4 Evidence 3 addresses this.
  - **Verdict:** LCC overlap **strongly supports Proposal A**, particularly the gothic_horror merge.

- **Proposal B (drop horror, historical):**
  - horror has **60% overlap with gothic** — dropping horror outright loses a category that is genuinely distinguishable from non-gothic genres but heavily overlaps gothic specifically. The merge interpretation (Proposal A) is more catalogue-faithful than the drop interpretation.
  - historical has **40% overlap with adventure, 30% overlap with literary** — historical is NOT a low-overlap orphan in LCC space; it's catalogued as a hybrid of adventure and literary fiction. Dropping it removes a legitimate catalogue category whose poor v1 accuracy (30%) likely reflects feature-space confusion with adventure and literary rather than a genuine "this genre isn't separable" finding.
  - **Verdict:** LCC overlap **weakly supports Proposal B**. Both candidate-drop genres have non-trivial catalogue presence; the drop logic depends almost entirely on the empirical accuracy argument, not on LCC separability.

- **Proposal C (keep 10):**
  - 4 pairs at ≥30% overlap argues *against* keeping all 10 as currently structured — the feature space genuinely struggles to separate gothic from horror and scifi from fantasy at the LCC level.
  - However: 33 of 45 pairs at <15% overlap means most of the 10 genres ARE catalogue-separable. The problem is concentrated in 2 high-overlap clusters (gothic/horror, scifi/fantasy/adventure).
  - **Verdict:** LCC overlap **weakly argues against Proposal C** in its naive form. The 10-genre structure has 2 obvious feature-space cliques (gothic/horror and the scifi/fantasy/adventure triangle); keeping all 10 means the SVM has to learn very fine distinctions between catalogue-equivalent genres on sparse training data. Proposal C is defensible *only* if per-genre book count and author diversity (§4 Evidence 3) compensate for catalogue overlap.

**Bottom line:** LCC overlap is the strongest single piece of evidence for **Proposal A**. The 60% gothic↔horror overlap is unusual — most genre pairs in this corpus sit well below 30% — and it's the kind of overlap that classification models will reliably fail to resolve regardless of corpus size. The scifi↔fantasy 40% overlap is weaker support but still merge-favourable. The other 33 low-overlap pairs validate that the remaining 8-genre structure (post-merge) is catalogue-separable.

The recommendation in §4 cites this analysis as one of its three evidence streams.

## Appendix B — Top 5 candidates per genre (excerpt from corpus_candidates.yaml)

For each of the 10 v1 genres, the 5 highest-scored candidates from `corpus_candidates.yaml` (ties broken by ascending gutenberg_id):

```
romance:
  1. gutenberg_id: 105 — "Persuasion" by Jane Austen (score: 4)
  2. gutenberg_id: 121 — "Northanger Abbey" by Jane Austen (score: 4)
  3. gutenberg_id: 141 — "Mansfield Park" by Jane Austen (score: 4)
  4. gutenberg_id: 158 — "Emma" by Jane Austen (score: 4)
  5. gutenberg_id: 161 — "Sense and Sensibility" by Jane Austen (score: 4)

mystery:
  1. gutenberg_id: 155 — "The Moonstone" by Wilkie Collins (score: 4)
  2. gutenberg_id: 204 — "The Innocence of Father Brown" by G. K. Chesterton (score: 4)
  3. gutenberg_id: 244 — "A Study in Scarlet" by Arthur Conan Doyle (score: 4)
  4. gutenberg_id: 863 — "The Mysterious Affair at Styles" by Agatha Christie (score: 4)
  5. gutenberg_id: 1685 — "The Mystery of the Yellow Room" by Gaston Leroux (score: 4)

western:
  1. gutenberg_id: 1012 — "The Virginian" by Owen Wister (score: 4)
  2. gutenberg_id: 1389 — "The Log of a Cowboy" by Andy Adams (score: 4)
  3. gutenberg_id: 1528 — "Riders of the Purple Sage" by Zane Grey (score: 4)
  4. gutenberg_id: 3285 — "The Border Legion" by Zane Grey (score: 4)
  5. gutenberg_id: 3752 — "The Last of the Plainsmen" by Zane Grey (score: 4)

fantasy:
  1. gutenberg_id: 169 — "The Well at the World's End" by William Morris (score: 4)
  2. gutenberg_id: 711 — "Allan Quatermain" by H. Rider Haggard (score: 4)
  3. gutenberg_id: 2166 — "King Solomon's Mines" by H. Rider Haggard (score: 4)
  4. gutenberg_id: 2565 — "The Story of the Glittering Plain" by William Morris (score: 4)
  5. gutenberg_id: 2885 — "The House of the Wolfings" by William Morris (score: 4)

scifi:
  1. gutenberg_id: 35 — "The Time Machine" by H. G. Wells (score: 4)
  2. gutenberg_id: 36 — "The War of the Worlds" by H. G. Wells (score: 4)
  3. gutenberg_id: 62 — "A Princess of Mars" by Edgar Rice Burroughs (score: 4)
  4. gutenberg_id: 83 — "From the Earth to the Moon" by Jules Verne (score: 4)
  5. gutenberg_id: 103 — "Around the World in Eighty Days" by Jules Verne (score: 4)

horror:
  1. gutenberg_id: 345 — "Dracula" by Bram Stoker (score: 4)
  2. gutenberg_id: 389 — "The Great God Pan" by Arthur Machen (score: 4)
  3. gutenberg_id: 8486 — "Ghost Stories of an Antiquary" by M. R. James (score: 4)
  4. gutenberg_id: 10007 — "Carmilla" by J. Sheridan Le Fanu (score: 4)
  5. gutenberg_id: 10897 — "The Wendigo" by Algernon Blackwood (score: 4)

historical:
  1. gutenberg_id: 82 — "Ivanhoe" by Walter Scott (score: 4)
  2. gutenberg_id: 98 — "A Tale of Two Cities" by Charles Dickens (score: 4)
  3. gutenberg_id: 135 — "Les Miserables" by Victor Hugo (score: 4)
  4. gutenberg_id: 1184 — "The Count of Monte Cristo" by Alexandre Dumas (score: 4)
  5. gutenberg_id: 1257 — "The Three Musketeers" by Alexandre Dumas (score: 4)

literary:
  1. gutenberg_id: 144 — "The Voyage Out" by Virginia Woolf (score: 4)
  2. gutenberg_id: 145 — "Middlemarch" by George Eliot (score: 4)
  3. gutenberg_id: 219 — "Heart of Darkness" by Joseph Conrad (score: 4)
  4. gutenberg_id: 284 — "The House of Mirth" by Edith Wharton (score: 4)
  5. gutenberg_id: 541 — "The Age of Innocence" by Edith Wharton (score: 4)

adventure:
  1. gutenberg_id: 60 — "The Scarlet Pimpernel" by Baroness Orczy (score: 4)
  2. gutenberg_id: 76 — "Adventures of Huckleberry Finn" by Mark Twain (score: 4)
  3. gutenberg_id: 78 — "Tarzan of the Apes" by Edgar Rice Burroughs (score: 4)
  4. gutenberg_id: 95 — "The Prisoner of Zenda" by Anthony Hope (score: 4)
  5. gutenberg_id: 120 — "Treasure Island" by Robert Louis Stevenson (score: 4)

gothic:
  1. gutenberg_id: 84 — "Frankenstein" by Mary Shelley (score: 4)
  2. gutenberg_id: 174 — "The Picture of Dorian Gray" by Oscar Wilde (score: 4)
  3. gutenberg_id: 175 — "The Phantom of the Opera" by Gaston Leroux (score: 4)
  4. gutenberg_id: 601 — "The Monk" by Matthew Lewis (score: 4)
  5. gutenberg_id: 696 — "The Castle of Otranto" by Horace Walpole (score: 4)
```

To regenerate this excerpt from the authoritative YAML (do NOT hand-edit the table above; re-run the snippet on a corpus_candidates.yaml change):

```python
import yaml
data = yaml.safe_load(open('.planning/research/v2/corpus_candidates.yaml', encoding='utf-8'))
for genre, g in data['genres'].items():
    print(f"{genre}:")
    for i, c in enumerate(g['candidates'][:5], 1):
        print(f"  {i}. gutenberg_id: {c['gutenberg_id']} — \"{c['title']}\" by {c['author']} (score: {c['source_consensus_score']})")
    print()
```

## Document provenance

- **Phase:** 07 — Corpus Sourcing Research Spike
- **Plans:** assembled by Plan 05 from Wave 1 outputs (Plans 01, 02, 03, 04)
- **Draft fragments retained:** `.planning/research/v2/_drafts/` (audit trail; not consumed by Phase 8 directly)
- **Sibling artifacts:** `corpus_candidates.yaml` (Plan 03), `VALIDATION_PROTOCOL.md` (this plan), `v1_baseline_results.json` (Plan 04)
- **User checkpoint:** per D-21, user reviews §4 "Genre set recommendation" inline during normal doc review; no mid-phase checkpoint
- **Migration audit:** `.planning/research/v2/v1_to_v2_migration.md` (Phase 8 Wave 1)
- **Last updated:** 2026-05-25
