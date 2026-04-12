# Phase 2: API Layer and Job Queue — Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase wraps the validated Phase 1 CLI pipeline in a FastAPI backend with:
- Content-addressed cache for bundled corpus pre-computed results (CORPUS-02)
- Async job queue (arq + Redis) for long-running pipeline execution (INFRA-02)
- WebSocket progress streaming for real-time step-by-step feedback (CLASS-04, UX-01)
- File upload → classify endpoint with validation and error handling (CLASS-01, CLASS-02, CLASS-05)
- Actionable error messages for all failure modes (UX-02)

The frontend (Phase 3) is NOT in scope. This phase delivers the API contract that Phase 3 will consume.

</domain>

<decisions>
## Implementation Decisions

### New Book Classification Strategy
- **Decision: Project into existing Word2Vec space (do NOT retrain)**
- When a user uploads a .txt file, the API uses the pre-trained Word2Vec model as-is
- Words in the uploaded book that exist in the model vocabulary get their pre-trained vectors
- OOV (out-of-vocabulary) words are silently excluded; the response includes a count: `{"oov_word_count": N, "total_words": M}`
- The shared embedding space (trained on bundled corpus) is immutable — uploads do not modify it
- This preserves the mathematical invariant: single shared embedding space for all books
- Target: classification result within 60 seconds (LOOCV is NOT re-run; SVM trained on corpus predicts the upload)

### Job Queue Technology
- **Decision: arq + Redis**
- One Redis instance serves as both arq broker and content-addressed cache store
- One arq worker process handles pipeline jobs sequentially (no multi-queue routing needed)
- Worker defined in `backend/worker/` — imports pipeline functions directly

### Project Layout
- **Decision: Refactor pipeline logic into importable `backend/pipeline/` package**
- Move pipeline logic out of `scripts/` into `backend/pipeline/` as proper Python functions
- FastAPI app (`backend/api/`) imports from `backend/pipeline/` directly — no subprocess calls
- CLI scripts in `scripts/` kept as thin wrappers (`if __name__ == "__main__":`) for dev convenience
- Suggested structure:
  ```
  backend/
    api/          ← FastAPI routes, WebSocket handlers, request/response models
    pipeline/     ← importable pipeline functions (refactored from scripts/)
      embed.py    ← Word2Vec loading, OOV projection
      homology.py ← Vietoris-Rips, diagram computation
      features.py ← persistence images, K-means cluster distribution
      classify.py ← SVM prediction
      precompute.py ← build-time corpus pre-computation
    worker/       ← arq worker definition, job functions
    cache/        ← content-addressed cache (hash → result) backed by Redis
  scripts/        ← thin CLI wrappers (unchanged interface, delegate to backend/pipeline/)
  ```

### Stale Job / Cancellation Behaviour
- **Decision: Cancel job when WebSocket disconnects**
- API detects WebSocket disconnect and signals the arq worker to cancel the running job
- Cancellation must be clean: pipeline functions check a cancellation token between steps (not mid-computation)
  - Steps are atomic: tokenize → embed → homology → features → classify — cancel between steps, not within
- If user re-uploads the same file after cancellation, job restarts from scratch (no partial cache)
- No job TTL / result persistence required (cancelled jobs leave no stored state)
- Implication for implementation: each pipeline step must accept and check a `cancel_event: asyncio.Event` parameter

### Content-Addressed Cache (Bundled Corpus)
- Cache key format: `sha256(step_name + canonical_params)`
- Bundled corpus results pre-computed at build time via `python backend/pipeline/precompute.py`
- Cache stored on disk (not Redis) for build-time results — Redis used only for in-flight job state
- GET endpoints for bundled books return pre-computed results instantly (no job queue involved)

### WebSocket Progress Format
- Progress messages follow a standard shape:
  ```json
  {"step": "tokenize", "index": 1, "total": 5, "message": "Tokenizing text...", "status": "running"}
  {"step": "homology", "index": 3, "total": 5, "message": "Computing persistent homology (step 3/5)...", "status": "running"}
  {"step": "classify", "index": 5, "total": 5, "message": "Classifying genre...", "status": "done", "result": {...}}
  ```
- Steps enumerated per CLASS-04: tokenize → tfidf → pointcloud → homology → features → classify (6 steps)
- Error shape: `{"status": "error", "step": "homology", "message": "Too few words after stopword removal (min 500 required)"}`

### File Upload Validation (CLASS-01, CLASS-05)
- Client-side: validate extension (.txt only), size (≤5MB), encoding (UTF-8 sniff)
- Server-side: validate encoding, word count after tokenization (min 500 words per CLASS-05), language detection
- Error messages must be specific per CLASS-05:
  - Wrong format → "Only .txt files are accepted"
  - Too large → "File exceeds 5MB limit"
  - Too few words → "Book has only N words after processing — minimum 500 required"
  - Encoding issue → "File encoding not detected as UTF-8. Save the file as UTF-8 and retry"
  - Language → "Non-English text detected. The model is trained on English-language books only"

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 Pipeline (integration points)
- `scripts/03_train_embeddings.py` — Word2Vec training, TF-IDF computation, per-book point cloud generation
- `scripts/04_compute_homology.py` — Vietoris-Rips persistent homology (ripser), adaptive/fixed epsilon modes
- `scripts/05_build_features.py` — 400D persistence image + K-means cluster distribution feature construction
- `scripts/06_validate.py` — SVM pipeline (StandardScaler → VarianceThreshold → SVC RBF), LOOCV, permutation test
- `scripts/utils.py` — `load_params()` utility for config/params.yaml loading with override support

### Configuration
- `config/params.yaml` — All pipeline parameters (Word2Vec, homology, features, validation)

### Corpus Metadata
- `corpus/books.yaml` — Bundled corpus genre labels and Gutenberg IDs

### Roadmap / Requirements
- `.planning/ROADMAP.md` — Phase 2 goal, requirements list (INFRA-01..03, CORPUS-02, CLASS-01..05, UX-01..02)
- `.planning/REQUIREMENTS.md` — Full requirement specs for INFRA-01, INFRA-02, INFRA-03, CLASS-01, CLASS-02, CLASS-04, CLASS-05, UX-01, UX-02

</canonical_refs>

<specifics>
## Specific Ideas

- Keep `scripts/` CLI wrappers intact — they're useful for dev/debug; just have them delegate to `backend/pipeline/`
- The SVM model trained on bundled corpus should be serialized at build time alongside feature matrices — not retrained per request
- arq worker should log step timings for observability (helps diagnose slow books in prod)
- Consider `anyio` cancellation scopes rather than raw `asyncio.Event` for cleaner cancellation propagation through pipeline

</specifics>

<deferred>
## Deferred Ideas

None — all discussion stayed within Phase 2 scope.

</deferred>

---

*Phase: 02-api-layer-and-job-queue*
*Context gathered: 2026-04-12 via discuss-phase*
