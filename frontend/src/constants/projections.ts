import type { ProjectionKey } from '@/types/scatter'
export const PROJECTION_LABELS: Record<ProjectionKey, string> = {
  pca:  'PCA',
  kpca: 'KPCA',
  umap: 'UMAP',
  tsne: 't-SNE',
}
export const PROJECTION_KEYS: ProjectionKey[] = ['pca', 'kpca', 'umap', 'tsne']
// Keyboard keys 1-4 map to projections
export const KEY_TO_PROJECTION: Record<string, ProjectionKey> = {
  '1': 'pca', '2': 'kpca', '3': 'umap', '4': 'tsne',
}
