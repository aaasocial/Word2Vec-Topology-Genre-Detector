export interface ScatterPoint {
  word: string
  genre: string
  x: number
  y: number
  z: number
  tfidf_weight: number
  neighbors: Array<{ word: string; similarity: number }>
  // Optional book-level fields populated when the API returns book-scoped points
  bookId?: string
  bookTitle?: string
}

export type ProjectionKey = 'pca' | 'kpca' | 'umap' | 'tsne'

export interface ScatterData {
  projection: ProjectionKey
  points: ScatterPoint[]
}
