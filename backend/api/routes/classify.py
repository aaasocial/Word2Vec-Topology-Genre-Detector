"""Classification endpoints: file upload and SSE progress streaming.

Flow (per RESEARCH.md Pitfall 3 -- subscribe before enqueue):
  1. POST /classify -> validates file, stores content in Redis, returns job_id
  2. Client opens GET /classify/{job_id}/progress (SSE)
  3. SSE handler subscribes to Redis pub/sub channel job:{job_id}:progress
  4. SSE handler THEN enqueues the arq job (guaranteeing no missed messages)
  5. SSE handler streams progress messages to client as text/event-stream
  6. Stream ends when job reaches status 'done', 'error', or 'cancelled'

SSE replaces WebSocket: Railway's edge proxy strips WebSocket upgrade headers,
converting the request to a plain HTTP GET. SSE is plain HTTP streaming and
works through any proxy without special configuration.
"""
import json
from uuid import uuid4
from fastapi import APIRouter, UploadFile, HTTPException, Request
from fastapi.responses import StreamingResponse
from backend.api.models import ClassifyResponse
from backend.pipeline.tokenize import validate_and_tokenize

router = APIRouter()


@router.post('/classify', response_model=ClassifyResponse)
async def classify_upload(file: UploadFile, request: Request):
    """Accept .txt file upload, validate, store in Redis as pending.

    Does NOT enqueue an arq job. The SSE handler does that after
    subscribing to pub/sub, preventing the race condition where workers
    publish progress before the client subscribes.
    """
    content = await file.read()

    try:
        text, tokens = validate_and_tokenize(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    job_id = str(uuid4())

    redis = request.app.state.redis
    if redis is not None:
        # Store file content and pending status in Redis
        # Content expires after 5 minutes (safety net if SSE never connects)
        await redis.set(f'job:{job_id}:content', content, ex=300)
        await redis.set(f'job:{job_id}:status', 'pending', ex=300)

    return ClassifyResponse(job_id=job_id)


@router.get('/classify/{job_id}/progress')
async def sse_classify(job_id: str, request: Request):
    """SSE endpoint for streaming classification progress.

    Subscribes to Redis pub/sub channel job:{job_id}:progress BEFORE
    enqueuing the arq job (per RESEARCH.md Pitfall 3), then streams
    all messages as Server-Sent Events. The stream terminates when
    the job reaches status 'done', 'error', or 'cancelled'.
    """
    redis = request.app.state.redis

    async def event_stream():
        if redis is None:
            # No Redis -- send a placeholder and close
            yield 'data: {"step":"pending","index":0,"total":6,"message":"Job queued, waiting for worker...","status":"running"}\n\n'
            return

        # Step 1: Verify job exists
        status = await redis.get(f'job:{job_id}:status')
        if status is None:
            payload = json.dumps({
                'step': 'error', 'index': 0, 'total': 6,
                'message': f'Job {job_id} not found', 'status': 'error',
            })
            yield f'data: {payload}\n\n'
            return

        # Step 2: Subscribe to pub/sub BEFORE enqueuing (Blocker 1 fix)
        pubsub = redis.pubsub()
        channel = f'job:{job_id}:progress'
        await pubsub.subscribe(channel)

        try:
            # Step 3: NOW enqueue the arq job (after subscription is active)
            # If file_content is None the job was already enqueued by a prior connection
            arq_pool = request.app.state.arq_pool
            file_content = await redis.get(f'job:{job_id}:content')
            if arq_pool is not None and file_content is not None:
                await arq_pool.enqueue_job('classify_book', file_content, job_id, _job_id=job_id)
                await redis.set(f'job:{job_id}:status', 'running', ex=300)

            # Step 4: Stream progress messages to client
            async for message in pubsub.listen():
                if message['type'] == 'message':
                    data_str = message['data']
                    if isinstance(data_str, bytes):
                        data_str = data_str.decode('utf-8')
                    yield f'data: {data_str}\n\n'
                    data = json.loads(data_str)
                    if data.get('status') in ('done', 'error', 'cancelled'):
                        break
        except Exception:
            pass
        finally:
            await pubsub.unsubscribe(channel)
            try:
                await pubsub.close()
            except Exception:
                pass
            # Clean up stored content (worker already has a copy in memory)
            try:
                await redis.delete(f'job:{job_id}:content')
            except Exception:
                pass

    return StreamingResponse(
        event_stream(),
        media_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
        },
    )
