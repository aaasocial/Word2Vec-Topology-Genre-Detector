from pydantic import BaseModel, Field
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


class CorpusBookFull(BaseModel):
    """Full per-book metadata for BookSlider (Plan 06-03 BUG-03).

    Schema strictly per CONTEXT.md decision D-09:
        {gutenberg_id, title, author, genre, word_count, color, top_10_tfidf_words}

    Payload discipline (PITFALLS.md §12):
        <2 KB per book, <100 KB per genre.

    Notes:
        - ``extra='forbid'`` prevents the response model from leaking extra fields.
        - ``top_10_tfidf_words`` is bounded by ``max_length=10`` (it is a top-N list).
        - ``color`` must be a 6-digit hex string (matches frontend GENRE_COLORS palette).
    """
    gutenberg_id: str
    title: str
    author: str
    genre: str
    word_count: int = Field(ge=0)
    color: str = Field(pattern=r'^#[0-9A-Fa-f]{6}$')
    top_10_tfidf_words: list[str] = Field(max_length=10)

    model_config = {'extra': 'forbid'}
