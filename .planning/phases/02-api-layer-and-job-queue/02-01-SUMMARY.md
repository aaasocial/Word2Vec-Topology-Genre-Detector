---
phase: 02-api-layer-and-job-queue
plan: 01
subsystem: api
tags: [fastapi, websocket, redis, pydantic, upload-validation, chardet, langdetect]

# Dependency graph
requires:
  - phase: 01-pipeline-validation-spike
    provides: "Pipeline scripts (tokenization, embeddings, homology, features, validation) and config/params.yaml"
provides:
  - "FastAPI app factory with lifespan (backend/api/app.py)"
  - "POST /classify endpoint with file upload validation"
  - "WebSocket /ws/classify/{job_id} with subscribe-before-enqueue pattern"
  - "Shared pipeline types: PIPELINE_STEPS, ProgressMessage, PipelineResult"
  - "Pydantic request/response schemas (ClassifyResponse, ProgressWsMessage, ErrorResponse)"
  - "Test infrastructure: conftest with async client fixture, pytest-asyncio auto mode"
  - "Upload validation: extension, size, encoding, language, word count"
affects: [02-02-PLAN, 02-03-PLAN, 03-frontend]

# Tech tracking
tech-stack:
  added: [fastapi==0.135.3, uvicorn==0.44.0, arq==0.27.0, "redis>=4.2.0,<6", python-multipart==0.0.26, chardet==7.4.1, langdetect==1.0.9, httpx, pytest-asyncio]
  patterns: [app-factory-with-lifespan, subscribe-before-enqueue-websocket, tdd-red-green]

key-files:
  created:
    - backend/api/app.py
    - backend/api/models.py
    - backend/api/deps.py
    - backend/api/routes/health.py
    - backend/api/routes/corpus.py
    - backend/api/routes/classify.py
    - backend/pipeline/types.py
    - backend/pipeline/tokenize.py
    - backend/tests/conftest.py
    - backend/tests/test_api.py
    - backend/tests/test_upload.py
    - backend/tests/test_errors.py
    - backend/tests/test_websocket.py
  modified:
    - requirements.txt
    - pytest.ini

key-decisions:
  - "redis version pinned to >=4.2.0,<6 (not 7.4.0) due to arq==0.27.0 requiring redis<6"
  - "pytest-asyncio mode set to auto globally in pytest.ini for simpler async test authoring"
  - "conftest uses lifespan_context to initialize app.state before tests (httpx AsyncClient does not auto-trigger lifespan)"

patterns-established:
  - "App factory pattern: create_app() returns configured FastAPI instance with lifespan"
  - "Subscribe-before-enqueue: WS handler subscribes to Redis pub/sub THEN enqueues arq job"
  - "No-Redis fallback: classify endpoint and WS handler gracefully handle redis=None for testing"
  - "Validation-as-function: validate_and_tokenize() raises ValueError with actionable messages"

requirements-completed: [INFRA-01, CLASS-01, CLASS-04, CLASS-05, UX-01, UX-02]

# Metrics
duration: 6min
completed: 2026-04-12
---

# Phase 2 Plan 01: FastAPI App Skeleton Summary

**FastAPI app with file upload validation, subscribe-before-enqueue WebSocket flow, and 17-test TDD suite covering all validation edge cases**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-12T08:59:03Z
- **Completed:** 2026-04-12T09:04:59Z
- **Tasks:** 2
- **Files modified:** 22

## Accomplishments
- FastAPI app skeleton with health, corpus, and classify endpoints fully tested
- Upload validation pipeline (extension, size, encoding, language, word count) with specific actionable error messages per failure type
- Subscribe-before-enqueue WebSocket pattern preventing race conditions with Redis pub/sub (Blocker 1 from research)
- Complete test infrastructure: conftest with async client fixture, 17 tests all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Project structure, dependencies, shared types, and FastAPI app skeleton** - `cecd1c6` (feat)
2. **Task 2: Upload validation, classify endpoint with subscribe-before-enqueue WebSocket flow** - `a8be2ad` (feat)

_Both tasks followed TDD: RED (failing tests) -> GREEN (implementation) -> verify_

## Files Created/Modified
- `backend/api/app.py` - FastAPI app factory with lifespan, router registration
- `backend/api/models.py` - Pydantic schemas: ClassifyResponse, ProgressWsMessage, ErrorResponse, HealthResponse, CorpusBookSummary
- `backend/api/deps.py` - Dependency injection stubs for Redis and arq pool
- `backend/api/routes/health.py` - GET /health endpoint
- `backend/api/routes/corpus.py` - GET /corpus/books endpoint reading from books.yaml
- `backend/api/routes/classify.py` - POST /classify and WS /ws/classify/{job_id}
- `backend/pipeline/types.py` - PIPELINE_STEPS, ProgressMessage, PipelineResult, StepStatus, ProgressCallback
- `backend/pipeline/tokenize.py` - validate_and_tokenize() with 5 validation checks
- `backend/tests/conftest.py` - app and client fixtures with lifespan context
- `backend/tests/test_api.py` - 3 tests for health, corpus, app title
- `backend/tests/test_upload.py` - 6 tests for upload validation
- `backend/tests/test_errors.py` - 4 tests for actionable error messages
- `backend/tests/test_websocket.py` - 4 tests for WebSocket and progress format
- `requirements.txt` - Added Phase 2 dependencies
- `pytest.ini` - Added asyncio_mode = auto

## Decisions Made
- redis version pinned to >=4.2.0,<6 instead of 7.4.0 because arq==0.27.0 requires redis<6 (dependency conflict resolution)
- pytest-asyncio mode set to "auto" globally to avoid needing @pytest.mark.asyncio on every test
- conftest manually runs lifespan_context since httpx AsyncClient doesn't trigger ASGI lifespan events

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed redis version incompatibility with arq**
- **Found during:** Task 1 (dependency installation)
- **Issue:** arq==0.27.0 requires redis<6, but plan specified redis==7.4.0
- **Fix:** Changed redis pin to >=4.2.0,<6 (installs redis 5.3.1)
- **Files modified:** requirements.txt
- **Verification:** pip install succeeds, all tests pass
- **Committed in:** cecd1c6 (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed httpx AsyncClient not triggering ASGI lifespan**
- **Found during:** Task 2 (upload validation tests)
- **Issue:** httpx ASGITransport does not auto-trigger FastAPI lifespan, causing AttributeError on app.state.redis
- **Fix:** Updated conftest to manually enter lifespan_context in the app fixture
- **Files modified:** backend/tests/conftest.py
- **Verification:** All 17 tests pass including classify endpoint tests
- **Committed in:** a8be2ad (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for correct operation. No scope creep.

## Issues Encountered
None beyond the auto-fixed blocking issues above.

## User Setup Required
None - no external service configuration required. Tests run without Redis (no-Redis fallback path).

## Next Phase Readiness
- API contract fully defined: routes, request/response schemas, progress message format, error schema
- Plan 02 (arq worker) can wire into POST /classify and WebSocket /ws/classify/{job_id}
- Plan 03 (classification pipeline) can implement against backend/pipeline/types.py contracts
- Test infrastructure ready: conftest with async client, pytest-asyncio auto mode

## Self-Check: PASSED

- All 13 created files verified present on disk
- Commit cecd1c6 (Task 1) verified in git log
- Commit a8be2ad (Task 2) verified in git log
- 17/17 backend tests passing
- 26/26 Phase 1 tests still passing

---
*Phase: 02-api-layer-and-job-queue*
*Completed: 2026-04-12*
