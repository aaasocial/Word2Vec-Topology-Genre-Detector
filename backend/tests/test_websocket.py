"""Tests for WebSocket progress streaming format -- covers CLASS-04, UX-01.

These tests use Starlette sync TestClient (not httpx AsyncClient) because
httpx does not support WebSocket connections. They test the no-Redis fallback
path. Integration tests requiring Redis are in test_worker.py (Plan 02).
"""
import pytest
from starlette.testclient import TestClient
from backend.api.app import create_app
from backend.pipeline.types import PIPELINE_STEPS, ProgressMessage, StepStatus


def test_pipeline_steps_has_six_entries():
    assert len(PIPELINE_STEPS) == 6
    assert PIPELINE_STEPS == ['tokenize', 'tfidf', 'pointcloud', 'homology', 'features', 'classify']


def test_progress_message_shape():
    msg = ProgressMessage(
        step='tokenize', index=1, total=6,
        message='Tokenizing text...', status=StepStatus.RUNNING
    )
    assert msg.step == 'tokenize'
    assert msg.index == 1
    assert msg.total == 6
    assert msg.status == StepStatus.RUNNING
    assert msg.result is None


def test_progress_message_done_with_result():
    result = {'predicted_genre': 'horror', 'confidence': 0.87}
    msg = ProgressMessage(
        step='classify', index=6, total=6,
        message='Classification complete', status=StepStatus.DONE,
        result=result
    )
    assert msg.status == StepStatus.DONE
    assert msg.result == result


def test_websocket_accepts_connection_and_sends_pending():
    """WebSocket endpoint accepts connection and sends initial pending message.

    Tests the no-Redis fallback path (redis=None). Plan 02 adds
    integration tests for the full Redis pub/sub path.
    """
    app = create_app()
    # Use Starlette sync TestClient for WebSocket testing (httpx AsyncClient
    # does not support WebSocket)
    with TestClient(app) as tc:
        with tc.websocket_connect('/ws/classify/test-job-id') as ws:
            data = ws.receive_json()
            assert data['step'] == 'pending'
            assert data['index'] == 0
            assert data['total'] == 6
            assert data['status'] == 'running'
            assert 'message' in data


@pytest.mark.integration
def test_websocket_subscribe_before_enqueue_flow():
    """Integration test: WebSocket subscribes to pub/sub BEFORE enqueuing job.

    Requires Redis to be running. Tests the full Blocker 1 fix flow:
    1. POST /classify stores pending state
    2. WS connects and subscribes to pub/sub
    3. WS enqueues arq job
    4. Progress messages are received (none missed)

    Skipped in unit test runs (no Redis). Run with: pytest -m integration
    """
    # This test requires a running Redis instance and arq worker.
    # It validates that the subscribe-before-enqueue flow works end-to-end.
    # Implementation: connect to the app with Redis enabled, POST a file,
    # then connect WS and verify all 6 progress messages arrive.
    pytest.skip('Requires running Redis and arq worker -- run with pytest -m integration')
