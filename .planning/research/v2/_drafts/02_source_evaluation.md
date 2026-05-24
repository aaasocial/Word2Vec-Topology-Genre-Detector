# Source-by-source evaluation (Phase 7 draft fragment — to be assembled into CORPUS_SOURCING.md)

> Sources for CORPUS_SOURCING.md §"Source evaluation". Decision IDs implemented: D-02, D-03, D-04, D-05.

## Source evaluation

We evaluate every source against three roles: (a) **text fetch** — provides clean public-domain text bytes for training; (b) **curation** — provides candidate-title shortlists ranked by external consensus; (c) **labelling** — provides genre/subject labels we accept as ground truth. The most opinionated finding (per D-03): **Goodreads and LoC are CURATION-ONLY**, not text-fetch, not labelling — they tell us what titles are worth looking for, then we look those titles up in Gutenberg/Standard Ebooks/HathiTrust for the actual text. Labelling itself comes from institutional metadata (LCC subject headings via Gutenberg, BL Labs MARC fiction code) plus manual review on the 25-30 final picks per genre, never from crowdsourced shelves or LLM auto-classification.

Each subsection below records the role we assign, the coverage observed in 2024-2026, the access path (no Phase-7 installs per D-05), risks, and a binary Accept/Reject verdict with one-paragraph rationale. The verdicts in aggregate define the Phase-8 sourcing pipeline described in §"Pipeline implication" below.

### Source: Project Gutenberg via `gutenbergpy>=0.3.5`

- **Role:** text-fetch (primary)
- **Coverage:** ~70,000 public-domain English-language titles; deep on pre-1928 fiction; LCC subject metadata on most works
- **Genre labelling quality:** Weak — LCC subject headings only; many books carry generic "PR Language and Literature" with no narrower genre tag. Adequate as a starting filter, not as final labels.
- **Access:** Already installed (`gutenbergpy>=0.3.5` per `.planning/research/STACK.md §"Corpus Sourcing"`). Programmatic via `gutenbergpy.acquire_text` + metadata lookups. Header/footer stripping by the canonical `*** START OF` / `*** END OF` regex.
- **Risks:** Public-domain skew toward pre-1928; underrepresents 20th-century literary fiction, modern romance, contemporary mystery, post-WWII scifi. Author concentration in prolific public-domain authors (Wells, Verne, Austen, Lovecraft, Poe, Doyle) interacts with `PITFALLS.md §5` author-overlap leakage.
- **Verdict:** Accept — primary text-fetch source for v2; already proven by v1's 100-book corpus. Upholds `STACK.md §"Corpus Sourcing"` prior note. Phase 8 reuses the existing `scripts/01_download_corpus.py` + `scripts/02_preprocess.py` pipeline against the v2 candidate shortlist.

### Source: Open Library bulk JSON dumps

- **Role:** curation (subject-tag enrichment of Gutenberg matches) — NOT text-fetch, NOT primary labelling
- **Coverage:** ~50M titles with crowd-sourced subject tags and `lcc` / `dewey_decimal_class` codes; monthly bulk JSON dumps at `https://openlibrary.org/data/`
- **Access:** No Python lib needed (`requests` + `ijson` for streaming parse per `STACK.md`). Phase 7 reads documentation only; Phase 8 wires the parse script.
- **Risks:** Subject tags are user-generated and noisy at the long-tail; the full bulk dump is ~50GB compressed (~250GB uncompressed) — streaming parse is mandatory. Many Open Library editions lack LCC codes; cross-reference quality depends on ISBN/LCCN match against Gutenberg metadata.
- **Verdict:** Accept as a curation-and-enrichment source — Open Library's `lcc` field plus subject tags help triangulate genre when LCC alone is ambiguous (e.g., a Gutenberg book tagged only "PR Language and Literature" gains a "detective stories" Open Library subject tag, bumping it onto the mystery shortlist). Cost/benefit clears because Phase 8 needs *some* second opinion on Gutenberg's coarse labels, and Open Library is the only free, programmatic, license-clean option. Overturns the prior STACK.md ambivalence in favour of concrete pipeline use.

### Source: Library of Congress (LCC subject headings + catalog references)

- **Role:** curation-only (candidate shortlist + canon lists, NOT text-fetch, NOT labelling) — per D-03 + D-04
- **Coverage:** LCC Class P (Language and Literature) subject heading hierarchy; curated collections like "Books That Shaped America"; LCCN-indexed catalog references
- **Access:** `loc.gov/collections/` for canon lists (HTML scraping for the small, static lists is acceptable per `robots.txt`); LCC subject tags arrive via Gutenberg's metadata (Gutenberg records carry LCC codes for most works). No LoC text-fetch pipeline in v2.
- **Risks:** Coarse subject headings (PR6005 vs PR6019 etc. are author-clustered, not genre-clustered); manual canon lists are small (~100 titles each) but high quality. LoC's full-text holdings (American Memory, Chronicling America) are a *deferred-to-v3* candidate (per the Phase-7 deferred-ideas section in `07-CONTEXT.md`) — out of scope here.
- **Verdict:** Accept as curation source per D-04; explicitly NOT a text-fetch pipeline in v2. LoC's value is the canon lists ("Books That Shaped America", "Great Books") + LCC class-P hierarchy that lets us bucket Gutenberg matches into our 8-10 genre buckets at curation time. STACK.md's prior note on LoC was vague about role; D-04 sharpens it to curation-only.

### Source: HuggingFace `TheBritishLibrary/blbooksgenre`

- **Role:** title-level metadata cross-reference (NOT labelling at our granularity, NOT text-fetch)
- **Coverage:** ~49,000 18th-19th century English-language British Library titles; fiction/nonfiction binary classification labels at title level
- **Access:** `datasets` library (would require `pip install "datasets>=3.0"` per `STACK.md`); per D-05, this install lands in Phase 8 if accepted, NOT Phase 7. Phase 7 reads the dataset card and accompanying paper (Hosseini et al. 2021) only.
- **Risks:** Fiction/nonfiction binary is too coarse for our 8-10 fiction sub-genres (granularity mismatch with the v2 task); 18th-19th century scope misses 20th-century scifi/fantasy entirely; BL titles overlap only partially with Gutenberg (BL digitised non-Gutenberg holdings).
- **Verdict:** Reject for labelling (granularity mismatch — fiction/nonfiction binary cannot inform our 8-10 sub-genre task); Reject as a primary curation source (BL holdings are non-Gutenberg-heavy, so most title matches against our text-fetch pipeline come back empty). The dataset is useful as inspiration for label-quality methodology (Cohen's κ on a held-out re-label; see `01_comparable_projects.md §Project 3`) but does not enter the v2 sourcing pipeline. Overturns STACK.md's tentative "revisit prior rejection" by re-confirming the rejection with a sharper rationale: it's a granularity problem, not a quality problem.

### Source: HuggingFace `agentlans/literary-genre-examples`

- **Role:** none — fails on every dimension we test for
- **Coverage:** 86 fiction/nonfiction genre categories at paragraph level; ~100k labelled paragraphs total
- **Access:** `datasets` library (Phase 8 install only per D-05). Phase 7 reads the dataset card only.
- **Risks:** Paragraph-level granularity is too short for our `window=15` Word2Vec context and full-book persistence-homology features (a paragraph has ~5-50 tokens; we need full-book point clouds of 200-500 high-TF-IDF words). 86 genres include rare/synthetic categories (e.g., "weird fiction", "new weird") with sparse, possibly LLM-generated examples — label-source provenance unclear.
- **Verdict:** Reject — granularity mismatch (paragraph vs full-book) plus label-source quality concerns. STACK.md flagged this as "revisit prior rejection"; we re-confirm rejection with the additional finding that the dataset's label provenance is not auditable in the dataset card, putting it in the same category of risk as LLM auto-labelling (see Confirmed anti-features below).

### Source: Goodreads public dump (UCSD academic mirror, `mengtingwan.github.io/data/goodreads.html`)

- **Role:** curation-only (candidate shortlists ranked by user-shelf consensus, NOT labelling, NOT text-fetch) — per D-03
- **Coverage:** ~2.4M books with user-shelf tags; UCSD academic mirror is cleared for academic use (Wan & McAuley 2018, Wan et al. 2019). ~876M user-book interactions.
- **Access:** Bulk JSON / SQLite download from the UCSD academic mirror. No scraping at scale. Citation: Wan, M., & McAuley, J. (2018). "Item Recommendation on Monotonic Behavior Chains."
- **Risks:** User shelves are noisy (640 distinct genre shelves → 499 are user-invented rare labels per `FEATURES.md §2`); ethically grey at scale even via academic mirror — mirror provenance must be cited verbatim in CORPUS_SOURCING.md and in `corpus/books.yaml` per-book `source` provenance fields (D-10). Cleaning required: filter to a controlled vocabulary of ~30 genre shelves (e.g., "horror", "romance", "mystery", "fantasy", "science-fiction", "western", "historical-fiction", "literary-fiction") and threshold by shelving count (≥1,000 shelvings to count toward a candidate ranking).
- **Verdict:** Accept as curation-only source (per D-03) — Goodreads "Best of Genre" shelves and the per-book shelving count distribution are the strongest community-consensus signal we have for which titles "matter" within a genre. Goodreads shelves explicitly do NOT label our books; they help rank Gutenberg matches by external popularity within each genre bucket. Reframes STACK.md's prior framing of Goodreads as a labelling source — D-03 reassigns it to curation-only.

### Source: Internet Archive `internetarchive>=3.5` SDK

- **Role:** text-fetch fallback (older/rarer titles not in Gutenberg or Standard Ebooks)
- **Coverage:** Millions of public-domain texts; quality varies (OCR'd, sometimes noisy headers/footers); much overlap with Gutenberg but also has unique holdings
- **Access:** Phase 8 install only (`pip install "internetarchive>=3.5"` per `STACK.md` and D-05); CLI + Python SDK. Phase 7 documents the URL schema only.
- **Risks:** OCR noise injects spurious vocabulary into the Word2Vec training (long-S → "f", scanned dropcaps mis-recognised, page-break artifacts); rate limits unverified for 2026 (`STACK.md` Confidence Calibration labels this LOW); cleaning pipeline cost not yet estimated.
- **Verdict:** Accept as a documented escape hatch only — not a default Phase 8 source. Phase 8 reaches for Internet Archive only if Gutenberg + Standard Ebooks coverage gaps appear for specific candidate titles. The install lands when first needed, not preemptively. Upholds STACK.md's "documented option, not an install" framing.

### Source: HathiTrust public-domain subset

- **Role:** metadata-only LCC cross-reference (NOT text-fetch in v2)
- **Coverage:** ~7M titles, ~40% public-domain; richer LCC subject headings than Gutenberg; institutional digitisation quality
- **Access:** Data API (`hathitrust.org/data_api/`) is rate-limited and full-text access requires research-affiliation certificate in some tiers. Metadata-only access is open via the Bibliographic API.
- **Risks:** Access overhead for full-text (institutional credential) not worth the engineering cost at our 200-300 book scale; HathiTrust's strength is at the 100k+ scale.
- **Verdict:** Reject for v2 text-fetch (credential overhead not justified at our scale); Accept for metadata-only LCC cross-reference IF the integration is cheap (a single Bibliographic API call per Gutenberg match to enrich the LCC headings). Phase 8 owns the cost/benefit call — if the integration takes >1 day, drop it; LoC + Open Library cover the same cross-reference need. The aggregate verdict skews Reject for any text-fetch role; conditional Accept for cheap metadata enrichment.

### Source: Standard Ebooks (`standardebooks.org`)

- **Role:** text-fetch alternative (curated editions of Gutenberg classics with cleaner OCR + standardised metadata)
- **Coverage:** ~700 curated public-domain editions; significant overlap with Gutenberg but with higher text quality
- **Access:** Direct HTML/EPUB download from `standardebooks.org/ebooks/`; catalog is small enough to mirror locally if needed. No Python library required.
- **Risks:** Small catalog (~700 vs Gutenberg's ~70,000); significant overlap with Gutenberg means most candidate titles will resolve to *both* sources, requiring a preference rule.
- **Verdict:** Accept as a quality-improving alternative to Gutenberg for titles where both have the work. Phase 8 preference rule: use Standard Ebooks when a title exists in both catalogs; fall back to Gutenberg otherwise. Standard Ebooks' cleaner OCR meaningfully reduces vocabulary noise in the Word2Vec training pass. Overturns the implicit STACK.md ambivalence in favour of an explicit preference rule.

## Pipeline implication (per D-03 + D-04)

The pipeline produced by these verdicts:

1. **Build per-genre candidate shortlists (≥50 titles per genre)** from curation sources — Goodreads-UCSD shelves filtered to the 30-genre controlled vocabulary and thresholded by shelving count; LoC LCC class-P headings + canon lists ("Books That Shaped America", "Great Books", per-genre scholarly canon lists like Hugo/Nebula/MWA Edgar/Bram Stoker/Western Writers of America Hall of Fame); comparable-project corpora (the Worsham/Gutenberg-Genre-ID 996-book pool); Open Library subject tag cross-reference to break LCC ambiguity.
2. **Apply constraints** (≥8 distinct authors per genre per D-08; word_count_min ≥10,000 and download_count_min ≥150 per `01_comparable_projects.md §Project 4 Reagan`; public-domain availability; English-language).
3. **Look up each candidate** in Standard Ebooks first (preferred for text quality), then Gutenberg (full coverage), then Internet Archive as fallback only when neither has the work.
4. **Record provenance** for every text fetch (per D-10 schema: `source: {provider, fetched_at, text_sha256}`).
5. **Final selection** of 25-30 books per genre is Phase 8's job from this Phase-7-vetted candidate pool. Phase 7 makes zero per-book picks.

## Confirmed anti-features

- **BookCorpus** — Rejected. Licensing issues (scraped from Smashwords without redistribution rights; documented ethical concerns in Bandy & Vincent 2021 "Addressing 'Documentation Debt' in Machine Learning Research: A Retrospective Datasheet for BookCorpus"). Risk: DMCA exposure on Railway, academic credibility loss, contradicts PROJECT.md's "publicly accessible, hosted" requirement (hosting copyright-questionable text is legally fragile). Aligns with `FEATURES.md §2 Anti-Features`.
- **Goodreads scraping at scale** — Rejected. Goodreads ToS prohibits scraping; the UCSD academic mirror is the only acceptable channel and only as curation, never as labelling or text fetch. Direct scraping of `goodreads.com` is out of bounds for v2 regardless of how convenient the data would be. Aligns with `FEATURES.md §2 Anti-Features`.
- **LLM auto-labelling** — Rejected. Circular benchmark: labelling our corpus with an LLM (Claude, GPT, etc.) means benchmarking our SVM against the LLM's genre classifications, not against literary reality. This bakes in the LLM's biases (genre conflation, training-data idiosyncrasies) and produces an unreproducible "ground truth" that future model updates silently shift. Acceptable only as candidate-title suggestions for human review (i.e., "Claude, suggest 50 horror novels in the public domain" → human reviews, accepts/rejects), never as auto-accepted labels. Aligns with `FEATURES.md §2 Anti-Features`.

---

*Phase 7 draft fragment. Plan 05 will assemble this into `.planning/research/v2/CORPUS_SOURCING.md` §"Source evaluation".*
