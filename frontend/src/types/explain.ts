// frontend/src/types/explain.ts
// Phase 9 (DEPTH-01..07) -- TypeScript mirror of backend/api/models.py Phase 9 classes.
// Field types match backend Pydantic verbatim; if you change one, change the other.

export interface TopNPrediction {
  genre: string
  probability: number   // [0, 1]
}

export interface NearestTrainingBook {
  gutenberg_id: string
  title: string
  author: string
  genre: string
  distance: number   // >= 0
}

export interface TrackContribution {
  pct: number          // [0, 100]
  direction: '+' | '-' | '0'
}

export interface TrackContributions {
  topology: TrackContribution
  vocabulary: TrackContribution
}

export interface DrivingWord {
  word: string
  tfidf: number   // >= 0
  nearest_genre: string
}

export interface UncertaintyMetrics {
  entropy: number          // [0, 1]
  top1_top2_gap: number    // ~[0, 1]
  badge_fires: boolean
}

export interface ExplainResponse {
  nearest_training_books: NearestTrainingBook[]  // exactly 5
  track_contributions: TrackContributions
  driving_words: DrivingWord[]                   // up to 15
  uncertainty: UncertaintyMetrics
  predicted_genre: string
}
