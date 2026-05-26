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


# ============================================================================
# Phase 9: Classification Depth (DEPTH-01..07)
#
# All response models use ``extra='forbid'`` to prevent silent payload drift
# between backend and the Wave-3 frontend (which types against these exact
# shapes via auto-generated TypeScript types in 09-04/09-05).
# ============================================================================


class TopNPrediction(BaseModel):
    """One row of the ranked top-N list (D-37 / D-41)."""
    genre: str
    probability: float = Field(ge=0.0, le=1.0)

    model_config = {'extra': 'forbid'}


class NearestTrainingBook(BaseModel):
    """One of the 5 nearest training books for the explain panel (D-45)."""
    gutenberg_id: str
    title: str
    author: str
    genre: str
    distance: float = Field(ge=0.0)

    model_config = {'extra': 'forbid'}


class TrackContribution(BaseModel):
    """Per-track zero-ablation contribution (D-44).

    ``pct`` is the share of total |contribution| (the topology + vocabulary
    pcts sum to 100.0 ± 1e-6). ``direction`` is '+' / '-' / '0' per the
    sign of (base_proba - zeroed_proba) for this track.
    """
    pct: float = Field(ge=0.0, le=100.0)
    direction: str = Field(pattern=r'^[+\-0]$')

    model_config = {'extra': 'forbid'}


class TrackContributions(BaseModel):
    """Topology vs vocabulary zero-ablation split (D-44)."""
    topology: TrackContribution
    vocabulary: TrackContribution

    model_config = {'extra': 'forbid'}


class DrivingWord(BaseModel):
    """One pill in the driving-words list (D-46 / DEPTH-06).

    ``nearest_genre`` is the genre whose per-genre w2v centroid is closest
    (by cosine distance) to ``w2v.wv[word]`` -- "this word looks most like
    the {nearest_genre} cluster". Disclosure copy is owned by the frontend.
    """
    word: str
    tfidf: float = Field(ge=0.0)
    nearest_genre: str

    model_config = {'extra': 'forbid'}


class UncertaintyMetrics(BaseModel):
    """Entropy badge metrics for the result row (D-43 / D-52 / DEPTH-07).

    - ``entropy``: normalized Shannon entropy in [0, 1]; 0 = certain, 1 = uniform.
    - ``top1_top2_gap``: top1 - top2 probability (nominally [0, 1]; accept a
      tiny negative band for fp rounding noise).
    - ``badge_fires``: precomputed by the backend using the operative thresholds
      (gap < 0.2801 OR norm_entropy > 0.7738) so the frontend stays a renderer.
    """
    entropy: float = Field(ge=0.0, le=1.0)
    top1_top2_gap: float = Field(ge=-1.0, le=1.0)
    badge_fires: bool

    model_config = {'extra': 'forbid'}


class ExplainResponse(BaseModel):
    """Response shape for POST /api/classify/{job_id}/explain (D-46).

    Length constraints:
      * ``nearest_training_books`` is EXACTLY 5 (D-45).
      * ``driving_words`` is at most 15 (D-46).
    """
    nearest_training_books: list[NearestTrainingBook] = Field(
        min_length=5, max_length=5
    )
    track_contributions: TrackContributions
    driving_words: list[DrivingWord] = Field(max_length=15)
    uncertainty: UncertaintyMetrics
    predicted_genre: str

    model_config = {'extra': 'forbid'}


class ExtendedClassifyResult(BaseModel):
    """SSE 'done' result payload extension (D-37 / D-43 / DEPTH-07).

    Documents the keys the worker now emits on the existing SSE channel; not
    served as a route response but kept here so the Wave-3 frontend can type
    against the same shape the worker writes.
    """
    predicted_genre: str
    confidence: float = Field(ge=0.0, le=1.0)
    oov_word_count: int = Field(ge=0)
    total_words: int = Field(ge=0)
    processing_time_s: float = Field(ge=0.0)
    # Phase 9 additions (D-41 / D-43)
    top_n: list[TopNPrediction] = Field(min_length=1)
    entropy: float = Field(ge=0.0, le=1.0)
    top1_top2_gap: float = Field(ge=-1.0, le=1.0)
    badge_fires: bool

    model_config = {'extra': 'forbid'}
