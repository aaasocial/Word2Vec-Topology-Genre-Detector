# Comparable projects research (Phase 7 draft fragment — to be assembled into CORPUS_SOURCING.md)

> Sources for CORPUS_SOURCING.md §"Comparable projects". Decision IDs implemented: D-01.

## Comparable projects

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

## Cross-cutting findings

- **Common sourcing pattern:** Project Gutenberg is the default text source (3 of 4 surveyed projects); BL Labs is the institutional alternative for non-Gutenberg digitised text. Labels come from LCC subject headings (Worsham, Gutenberg-Genre-ID) or institutional metadata (BL MARC) — never from Goodreads or LLM auto-labelling. This validates D-03's reframing: curation sources (Goodreads, LoC) give candidate titles; text-fetch sources (Gutenberg, BL) give the bytes; labelling comes from institutional/expert review, not crowdsourcing or generative models.
- **Common validation gap we avoid:** None of the four projects use `GroupKFold(groups=author)`. All use either random k-fold or random train/test split at the *title* level. `PITFALLS.md §5` documents why this is a leakage trap when the same author appears 3+ times in a genre — exactly v1's situation (6 Austen, 5 Verne, 4 Lovecraft). v2 mandates author-grouped CV (D-16) precisely because this is the *unfixed* methodological flaw shared by all four comparable projects. `PITFALLS.md §4` covers the related "no held-out test set" issue; v2's D-11/D-12/D-13 fix this by pinning a 20% hold-out before Phase 8 retrains.
- **Sizes that work in this space:** Small academic corpora (Reagan: 1,327 unsupervised; Worsham: 996 supervised) cluster around ~100 books per genre at 10 genres. Large benchmark resources (BL Labs: ~49k) sit two orders of magnitude higher but with coarser labels. Our target of 25-30 books / genre × 8-10 genres (200-300 books total) is at the *small-academic* end — defensible for the topology+vocabulary feature space (where per-book features are rich) but acknowledged-small for the SVM (per `PITFALLS.md §6` macro-F1 is the right metric to surface imbalance).
- **Common labelling weakness:** Of the four projects, only BL Labs reports inter-annotator agreement (Cohen's κ ≈ 0.92). Worsham/Kalita and Gutenberg-Genre-ID inherit LCC subject headings without revising them; Reagan is unsupervised. v2's curation pipeline must publish a label-quality statement in CORPUS_SOURCING.md (Phase 7 documents it; Phase 8 produces the κ measurement on the held-out subset where two annotators independently re-label).

---

*Phase 7 draft fragment. Plan 05 will assemble this into `.planning/research/v2/CORPUS_SOURCING.md` §"Comparable projects".*
