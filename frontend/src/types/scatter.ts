export interface ScatterPoint {
  word: string
  genre: string
  x: number
  y: number
  z: number
  tfidf_weight: number
  neighbors: Array<{ word: string; similarity: number }>
}

export type ProjectionKey = 'pca' | 'kpca' | 'umap' | 'tsne'

export interface ScatterData {
  projection: ProjectionKey
  points: ScatterPoint[]
}
