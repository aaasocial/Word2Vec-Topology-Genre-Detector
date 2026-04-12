"""Tests for arq worker job functions -- covers INFRA-02."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from backend.worker.jobs import _publish_progress, STEPS, STEP_MESSAGES


@pytest.mark.asyncio
async def test_publish_progress_sends_json_to_channel():
    redis = AsyncMock()
    await _publish_progress(redis, 'job-123', 'tokenize', 1)
    redis.publish.assert_called_once()
    channel, msg = redis.publish.call_args[0]
    assert channel == 'job:job-123:progress'
    import json
    data = json.loads(msg)
    assert data['step'] == 'tokenize'
    assert data['index'] == 1
    assert data['total'] == 6
    assert data['status'] == 'running'


@pytest.mark.asyncio
async def test_publish_progress_done_includes_result():
    redis = AsyncMock()
    result = {'predicted_genre': 'horror'}
    await _publish_progress(redis, 'j1', 'classify', 6, status='done', result=result)
    import json
    data = json.loads(redis.publish.call_args[0][1])
    assert data['status'] == 'done'
    assert data['result'] == result


def test_steps_list_has_six_entries():
    assert len(STEPS) == 6


def test_step_messages_cover_all_steps():
    for step in STEPS:
        assert step in STEP_MESSAGES


def test_jobs_imports_pipeline_functions():
    """Verify jobs.py imports from backend.pipeline, not inline math (Blocker 2)."""
    import backend.worker.jobs as jobs_mod
    import inspect
    source = inspect.getsource(jobs_mod)
    assert 'from backend.pipeline.embed import project_into_space' in source
    assert 'from backend.pipeline.homology import compute_book_homology' in source
    assert 'from backend.pipeline.features import build_feature_vector' in source
    assert 'from backend.pipeline.classify import predict_genre' in source
    # Verify no inline ripser or scipy distance imports
    assert 'from ripser import' not in source
    assert 'from scipy.spatial' not in source


def test_jobs_uses_cancel_event():
    """Verify jobs.py creates and passes cancel_event (Blocker 4)."""
    import backend.worker.jobs as jobs_mod
    import inspect
    source = inspect.getsource(jobs_mod.classify_book)
    assert 'cancel_event = asyncio.Event()' in source
    assert 'cancel_event=cancel_event' in source
