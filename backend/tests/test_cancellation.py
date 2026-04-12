"""Tests for job cancellation on WebSocket disconnect -- covers INFRA-02."""
import pytest
from backend.worker.settings import WorkerSettings


def test_worker_settings_allow_abort():
    """arq worker must have allow_abort_jobs=True for cancellation to work."""
    assert WorkerSettings.allow_abort_jobs is True


def test_worker_settings_max_jobs_is_one():
    """Sequential processing to avoid model thread-safety issues."""
    assert WorkerSettings.max_jobs == 1


def test_worker_settings_job_timeout():
    """Job timeout should be 120s (2 minutes)."""
    assert WorkerSettings.job_timeout == 120


def test_worker_settings_has_classify_function():
    """Worker must register classify_book job function."""
    func_names = [f.__name__ for f in WorkerSettings.functions]
    assert 'classify_book' in func_names
