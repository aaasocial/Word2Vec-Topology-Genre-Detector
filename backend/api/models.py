from pydantic import BaseModel
from typing import Optional, Any


class ClassifyResponse(BaseModel):
    job_id: str


class ProgressWsMessage(BaseModel):
    step: str
    index: int
    total: int
    message: str
    status: str  # running | done | error | cancelled
    result: Optional[dict] = None


class ErrorResponse(BaseModel):
    detail: str


class HealthResponse(BaseModel):
    status: str


class CorpusBookSummary(BaseModel):
    gutenberg_id: str
    title: str
    genre: str
