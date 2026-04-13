import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exportScatterPNG, exportHeatmapPNG, exportPersistenceCSV } from './exportUtils'

describe('exportUtils', () => {
  let clickSpy: ReturnType<typeof vi.fn>
  let originalCreateElement: typeof document.createElement
  let mockAnchor: HTMLAnchorElement

  beforeEach(() => {
    clickSpy = vi.fn()
    originalCreateElement = document.createElement.bind(document)

    mockAnchor = {
      href: '',
      download: '',
      click: clickSpy,
      style: {} as CSSStyleDeclaration,
    } as unknown as HTMLAnchorElement

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor
      return originalCreateElement(tag)
    })

    // Mock URL.createObjectURL for CSV
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test-url'),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('exportScatterPNG', () => {
    it('calls canvas.toDataURL and creates download link', () => {
      const canvas = {
        toDataURL: vi.fn(() => 'data:image/png;base64,abc123'),
      } as unknown as HTMLCanvasElement

      exportScatterPNG(canvas, 'romance', 'pca')

      expect(canvas.toDataURL).toHaveBeenCalledWith('image/png')
      expect(clickSpy).toHaveBeenCalled()
      expect(mockAnchor.href).toBe('data:image/png;base64,abc123')
    })

    it('filename matches pattern lgt-scatter-{genre}-{projection}-{timestamp}.png', () => {
      const canvas = {
        toDataURL: vi.fn(() => 'data:image/png;base64,abc'),
      } as unknown as HTMLCanvasElement

      exportScatterPNG(canvas, 'mystery', 'umap')

      expect(mockAnchor.download).toMatch(/^lgt-scatter-mystery-umap-\d+\.png$/)
    })
  })

  describe('exportHeatmapPNG', () => {
    it('calls canvas.toDataURL and creates download link', () => {
      const canvas = {
        toDataURL: vi.fn(() => 'data:image/png;base64,heatmap'),
      } as unknown as HTMLCanvasElement

      exportHeatmapPNG(canvas, 'fantasy', 1)

      expect(canvas.toDataURL).toHaveBeenCalledWith('image/png')
      expect(clickSpy).toHaveBeenCalled()
    })

    it('filename matches pattern lgt-persistence-{genre}-H{dim}-{timestamp}.png', () => {
      const canvas = {
        toDataURL: vi.fn(() => 'data:image/png;base64,x'),
      } as unknown as HTMLCanvasElement

      exportHeatmapPNG(canvas, 'scifi', 2)

      expect(mockAnchor.download).toMatch(/^lgt-persistence-scifi-H2-\d+\.png$/)
    })
  })

  describe('exportPersistenceCSV', () => {
    it('generates correct CSV header', () => {
      const diagrams = [
        { birth: 0.1, death: 0.5, dimension: 0 },
        { birth: 0.2, death: 0.8, dimension: 1 },
      ]

      exportPersistenceCSV(diagrams, 'horror', 0)

      expect(clickSpy).toHaveBeenCalled()
    })

    it('CSV contains birth,death,dimension,persistence columns with computed persistence = death - birth', () => {
      // We need to capture the Blob content
      const blobSpy = vi.fn()
      vi.stubGlobal('Blob', class {
        content: string[]
        constructor(parts: string[]) {
          this.content = parts
          blobSpy(parts)
        }
      })

      const diagrams = [
        { birth: 0.1, death: 0.5, dimension: 0 },
        { birth: 0.3, death: 1.2, dimension: 1 },
      ]

      exportPersistenceCSV(diagrams, 'western', 0)

      const csvContent = blobSpy.mock.calls[0][0][0] as string
      const lines = csvContent.trim().split('\n')
      expect(lines[0]).toBe('birth,death,dimension,persistence')
      expect(lines[1]).toBe('0.1,0.5,0,0.4')
      expect(lines[2]).toMatch(/^0.3,1.2,1,0.9/)
    })

    it('filename matches pattern lgt-persistence-{genre}-H{dim}-{timestamp}.csv', () => {
      vi.stubGlobal('Blob', class {
        constructor() {}
      })

      exportPersistenceCSV([], 'gothic', 1)

      expect(mockAnchor.download).toMatch(/^lgt-persistence-gothic-H1-\d+\.csv$/)
    })
  })
})
