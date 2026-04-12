"""Shared pipeline types for the backend."""
from dataclasses import dataclass
from typing import Any, Callable, Awaitable, Optional
import asyncio
import enum

PIPELINE_STEPS = ['tokenize', 'tfidf', 'pointcloud', 'homology', 'features', 'classify']


class StepStatus(str, enum.Enum):
    RUNNING = 'running'
    DONE = 'done'
    ERROR = 'error'
    CANCELLED = 'cancelled'


@dataclass
class ProgressMessage:
    step: str
    index: int
    total: int = 6
    message: str = ''
    status: StepStatus = StepStatus.RUNNING
    result: Optional[dict] = None


@dataclass
class PipelineResult:
    predicted_genre: str
    confidence: float
    oov_word_count: int
    total_words: int
    processing_time_s: float


# Type alias for progress callback used by worker
ProgressCallback = Callable[[ProgressMessage], Awaitable[None]]
