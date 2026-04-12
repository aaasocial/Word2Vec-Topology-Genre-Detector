"""Classification endpoints: file upload and WebSocket progress streaming.

Flow (per RESEARCH.md Pitfall 3 -- subscribe before enqueue):
  1. POST /classify -> validates file, stores content in Redis, returns job_id
  2. Client connects WS /ws/classify/{job_id}
  3. WS handler subscribes to Redis pub/sub channel job:{job_id}:progress
  4. WS handler THEN enqueues the arq job (guaranteeing no missed messages)
  5. WS handler forwards progress messages to client
  6. On client disconnect, WS handler aborts the arq job
"""
import json
from uuid import uuid4
from fastapi import APIRouter, UploadFile, HTTPException, WebSocket, WebSocketDisconnect, Request
from backend.api.models import ClassifyResponse
from backend.pipeline.tokenize import validate_and_tokenize

router = APIRouter()


@router.post('/classify', response_model=ClassifyResponse)
async def classify_upload(file: UploadFile, request: Request):
    """Accept .txt file upload, validate, store in Redis as pending.

    Does NOT enqueue an arq job. The WebSocket handler does that after
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
        # Content expires after 5 minutes (safety net if WS never connects)
        await redis.set(f'job:{job_id}:content', content, ex=300)
        await redis.set(f'job:{job_id}:status', 'pending', ex=300)

    return ClassifyResponse(job_id=job_id)


@router.websocket('/ws/classify/{job_id}')
async def ws_classify(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for streaming classification progress.

    Subscribes to Redis pub/sub channel job:{job_id}:progress BEFORE
    enqueuing the arq job (per RESEARCH.md Pitfall 3), then forwards
    all messages to the client. On client disconnect, aborts the arq job.
    """
    await websocket.accept()
    redis = websocket.app.state.redis

    if redis is None:
        # No Redis -- send a placeholder and close (testing without Redis)
        await websocket.send_json({
            'step': 'pending',
            'index': 0,
            'total': 6,
            'message': 'Job queued, waiting for worker...',
            'status': 'running'
        })
        # Block until client disconnects (placeholder for no-Redis testing)
        while True:
            try:
                await websocket.receive_text()
            except WebSocketDisconnect:
                break
        return

    # Step 1: Verify job exists and is pending
    status = await redis.get(f'job:{job_id}:status')
    if status is None:
        await websocket.send_json({
            'step': 'error', 'index': 0, 'total': 6,
            'message': f'Job {job_id} not found', 'status': 'error'
        })
        await websocket.close()
        return

    # Step 2: Subscribe to pub/sub BEFORE enqueuing (Blocker 1 fix)
    pubsub = redis.pubsub()
    channel = f'job:{job_id}:progress'
    await pubsub.subscribe(channel)

    try:
        # Step 3: NOW enqueue the arq job (after subscription is active)
        arq_pool = websocket.app.state.arq_pool
        file_content = await redis.get(f'job:{job_id}:content')
        if arq_pool is not None and file_content is not None:
            await arq_pool.enqueue_job('classify_book', file_content, job_id, _job_id=job_id)
            await redis.set(f'job:{job_id}:status', 'running', ex=300)

        # Step 4: Forward progress messages to client
        async for message in pubsub.listen():
            if message['type'] == 'message':
                data_str = message['data']
                if isinstance(data_str, bytes):
                    data_str = data_str.decode('utf-8')
                await websocket.send_text(data_str)
                data = json.loads(data_str)
                if data.get('status') in ('done', 'error'):
                    break
    except WebSocketDisconnect:
        # Cancel the job on client disconnect (per CONTEXT.md)
        try:
            from arq.jobs import Job
            job = Job(job_id, redis)
            await job.abort()
        except Exception:
            pass  # Best-effort cancellation
    finally:
        await pubsub.unsubscribe(channel)
        try:
            await pubsub.close()
        except Exception:
            pass
        # Clean up stored content
        try:
            await redis.delete(f'job:{job_id}:content')
        except Exception:
            pass
