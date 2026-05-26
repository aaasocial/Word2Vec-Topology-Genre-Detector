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
    """Verify jobs.py imports from backend.pipeline, not inline math (Blocker 2).

    Plan 09-03 (D-37/D-43) extends the import surface: predict_top_n replaces
    predict_genre as the canonical entry point, and compute_uncertainty_metrics
    is pulled in for the SSE result extension. Both still live under
    backend.pipeline so the Blocker-2 contract (no inline math) holds.
    """
    import backend.worker.jobs as jobs_mod
    import inspect
    source = inspect.getsource(jobs_mod)
    assert 'from backend.pipeline.embed import project_into_space' in source
    assert 'from backend.pipeline.homology import compute_book_homology' in source
    assert 'from backend.pipeline.features import build_feature_vector' in source
    # Phase 9: predict_top_n is the canonical classify entry; predict_genre is
    # kept as a thin top-1 wrapper for back-compat callers.
    assert 'from backend.pipeline.classify import predict_genre, predict_top_n' in source
    assert 'from backend.pipeline.explain import compute_uncertainty_metrics' in source
    # Verify no inline ripser or scipy distance imports
    assert 'from ripser import' not in source
    assert 'from scipy.spatial' not in source


def test_jobs_writes_feature_vec_to_redis():
    """D-47: classify_book writes feature_vec:{job_id} between step 5 and step 6.

    Verifies the Redis hand-off contract that the /explain endpoint consumes:
    bytes payload, 5-min TTL (ex=300), key shape `feature_vec:{job_id}`.
    """
    import backend.worker.jobs as jobs_mod
    import inspect
    source = inspect.getsource(jobs_mod.classify_book)
    assert "f'feature_vec:{job_id}'" in source, 'D-47 Redis key missing'
    assert 'ex=300' in source, '5-min TTL missing'


def test_jobs_sse_result_includes_phase9_fields():
    """D-41/D-43/DEPTH-07: SSE result payload gains top_n + entropy + gap + badge."""
    import backend.worker.jobs as jobs_mod
    import inspect
    source = inspect.getsource(jobs_mod.classify_book)
    for key in ("'top_n':", "'entropy':", "'top1_top2_gap':", "'badge_fires':"):
        assert key in source, f'SSE result missing {key}'
    # Legacy fields preserved for back-compat
    for key in ("'predicted_genre':", "'confidence':", "'oov_word_count':",
                "'total_words':", "'processing_time_s':"):
        assert key in source, f'legacy SSE field {key} missing'


def test_jobs_uses_cancel_event():
    """Verify jobs.py creates and passes cancel_event (Blocker 4)."""
    import backend.worker.jobs as jobs_mod
    import inspect
    source = inspect.getsource(jobs_mod.classify_book)
    assert 'cancel_event = asyncio.Event()' in source
    assert 'cancel_event=cancel_event' in source
