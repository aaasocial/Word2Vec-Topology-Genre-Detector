# Phase 4: Advanced Visualization and Parameter Controls - Research

**Researched:** 2026-04-12
**Domain:** 3D topology visualization, persistence image rendering, tiered recomputation, genre comparison
**Confidence:** MEDIUM-HIGH

## Summary

Phase 4 extends the Phase 3 React + R3F + FastAPI stack with four major feature groups: (1) a persistence image heatmap panel rendered via Canvas 2D with the plasma colorscale, (2) a Vietoris-Rips 3D filtration viewer using THREE.LineSegments for edge rendering, (3) genre comparison mode with dual brightness overlays, and (4) a settings drawer with tiered parameter controls that trigger selective backend recomputation via the existing arq/Redis job queue.

The critical technical challenge is the VR edge payload: with the CORPUS-03 max_words cap of 500, the theoretical maximum is 124,750 edges (~6 MB JSON, ~1.5 MB gzipped). This is manageable but requires (a) gzip compression on the endpoint, (b) pre-filtering to only emit edges that actually appear during filtration (many pairs never connect below epsilon_max), and (c) binary encoding consideration for the edge payload. The persistence image heatmap is straightforward -- a 20x20 to 50x50 Canvas 2D grid with the plasma colorscale, well within browser performance.

**Primary recommendation:** Precompute VR edges per genre/book during build time using the existing ripser output (extracting edge birth radii from the distance matrix + persistence diagram), cache as gzip-compressed JSON, serve via a new `/viz/vr/{genre}` endpoint. Render edges with THREE.LineSegments using a pre-allocated BufferGeometry where visibility is controlled by setting vertex positions to (0,0,0) for hidden edges (faster than drawRange manipulation for frequent updates). Heatmap rendering should use raw Canvas 2D fillRect -- no library needed for a simple M x M grid.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Top nav tabs with three modes: Scatter / Topology / Compare
- Topology tab: two-panel layout (left = persistence image heatmap, right = VR 3D viewer)
- VR data strategy: precomputed full edge graph, browser-side epsilon filtering. Payload: [{word_a, word_b, eps_birth, feature_type}...]
- Compare mode overlaid within Scatter tab. Second genre picker in sidebar, dual coloring in existing scatter canvas
- Settings drawer via shadcn Sheet (gear icon in top nav)
- Pipeline explanation: fullscreen slide deck (shadcn Dialog), 6 steps
- Export: PNG from canvas (renderer.domElement.toDataURL()), CSV for persistence data
- Topology disclaimer: persistent banner below top nav tabs

### Claude's Discretion
- Exact animation/transition when switching between tabs
- Loading skeleton style for topology panels while data loads
- Exact color for VR birth/death highlight (must be distinct from genre palette -- likely white or bright yellow)
- Slider debounce timing for epsilon slider (suggest 16ms for 60fps feel)
- Exact compact payload format for VR edges (binary vs JSON -- optimize for size)

### Deferred Ideas (OUT OF SCOPE)
- SVG export for WebGL canvas (not technically feasible)
- Mobile-responsive topology views
- Per-book pipeline explanation (show genre average as fallback)
- Animated slide transitions between pipeline explanation steps
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TOPO-01 | Persistence image heatmap with (scale, persistence) axes after 45-degree rotation | Canvas 2D fillRect rendering with plasma colorscale; PersistenceImager already computes the rotated (birth, persistence) coordinates |
| TOPO-02 | H0/H1/H2 tab switcher (H2 disabled unless toggle on) | shadcn Tabs component; backend precompute persistence images per dimension |
| TOPO-03 | Separate 3D scatter showing animated VR filtration | New R3F Canvas with THREE.LineSegments for edges, reusing word positions from scatter projection |
| TOPO-04 | Epsilon slider controls filtration radius, edges appear/disappear | Browser-side filtering on precomputed edge array; eps_birth <= current_epsilon |
| TOPO-05 | Birth/death events highlighted in distinct color | Compare edge eps_birth against current epsilon step; highlight in #FACC15 with 500ms hold + fade |
| TOPO-06 | Persistence image updates on genre/book change | React Query cache per genre/book; Zustand selectedGenre/selectedBookId drives query key |
| TOPO-07 | Brushing-and-linking across all panels | Zustand store is single source of truth; all panels subscribe to selectedGenre/selectedBookId |
| COMP-01 | Two-genre simultaneous display | Second genre picker in sidebar; scatter renders both genres' brightness; sidebar shows stacked heatmaps |
| COMP-02 | Consistent color scale across comparison | Compute combined min/max from both persistence images before colorscale mapping |
| PARAM-03 | Slow-tier params with explicit Recompute button | Settings drawer with dirty-tracking via dirtyParams Set in Zustand; recompute triggers arq job |
| PARAM-04 | Very-slow params with warning + confirm dialog | shadcn Dialog confirm; retrain job through existing arq pipeline |
| PARAM-05 | Current viz remains interactive during recompute | Dim overlay (z-index 25) over canvas; pointer-events still pass through for orbit/pan/zoom |
| PARAM-06 | Selective downstream-only recomputation | Backend DAG: params -> affected steps mapping; POST /recompute with changed_params, backend determines subtree |
| EXPLAIN-01 | Interactive pipeline walkthrough with user's data | 6-step shadcn Dialog; step 4 embeds mini VR animation with ~50 points |
| UX-03 | Export PNG and CSV | renderer.domElement.toDataURL for scatter, canvas.toDataURL for heatmap, Blob+URL.createObjectURL for CSV |
| UX-05 | Persistent topology disclaimer | Static banner below tab bar, always visible on Scatter/Topology tabs |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- WAT framework: check tools/ before building new scripts, update workflows when patterns change
- Deliverables go to cloud services; intermediates in .tmp/; local files for processing only
- Python backend with gensim, scikit-learn, ripser for homology
- Mathematical invariants: single shared embedding space, persistent homology in full N-D, TF-IDF without genre labels, both feature tracks normalized before concatenation
- Performance constraint: VR construction O(n^2) to O(n^3) -- max_words cap essential
- GSD workflow enforcement: do not make direct repo edits outside GSD workflow

## Standard Stack

### Core (already installed -- no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 18.3.1 | UI framework | Already installed [VERIFIED: package.json] |
| @react-three/fiber | 8.18.0 | R3F for Three.js rendering | Already installed; VR viewer uses separate Canvas [VERIFIED: package.json] |
| three | 0.172.0 | 3D rendering (LineSegments, BufferGeometry) | Already installed [VERIFIED: package.json] |
| zustand | 5.0.12 | State management (brushing-and-linking hub) | Already installed [VERIFIED: package.json] |
| @tanstack/react-query | 5.99.0 | Data fetching (VR edges, persistence images) | Already installed [VERIFIED: package.json] |
| shadcn/ui | n/a | Sheet (drawer), Dialog (explanation), Tabs (H0/H1/H2) | Already initialized [VERIFIED: 04-UI-SPEC.md] |
| FastAPI | existing | Backend API for new endpoints | Already installed [VERIFIED: backend/api/app.py] |
| ripser | existing | VR persistence computation | Already installed [VERIFIED: scripts/04_compute_homology.py] |
| arq + Redis | existing | Background job queue for recomputation | Already installed [VERIFIED: backend/worker/jobs.py] |

### Supporting (no new npm/pip packages required)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Canvas 2D API | browser built-in | Persistence image heatmap rendering | Always -- no library needed for M x M grid |
| THREE.LineSegments | part of three | VR edge rendering | VR viewer panel |
| THREE.LineBasicMaterial | part of three | Edge material with color control | VR edge coloring |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Canvas 2D for heatmap | d3-heatmap or plotly.js | Massive dependency for a simple M x M grid; Canvas 2D is 20 lines of code |
| THREE.LineSegments | THREE.InstancedMesh (cylinders) | Overkill; LineSegments handles 100k+ edges at 60fps; lineWidth=1 is the WebGL limitation regardless |
| JSON for VR payload | MessagePack / Protobuf | JSON with gzip is adequate at ~1.5 MB; binary adds build complexity for marginal gain |

## Architecture Patterns

### Recommended Project Structure (Phase 4 additions)

```
frontend/src/
  components/
    nav/
      TopNavTabs.tsx          # Tab bar + gear icon + "How It Works"
      DisclaimerBanner.tsx    # Lossy projection disclaimer
    topology/
      PersistenceHeatmap.tsx  # Canvas 2D heatmap rendering
      HomologyTabs.tsx        # H0/H1/H2 tab switcher
      VRViewer.tsx            # R3F Canvas with VR edges
      VREdges.tsx             # THREE.LineSegments component
      EpsilonSlider.tsx       # Filtration radius control
      TopologyPanel.tsx       # Two-panel layout container
    compare/
      CompareControls.tsx     # Compare toggle + second genre picker
      CompareHeatmaps.tsx     # Stacked sidebar heatmaps
    settings/
      SettingsDrawer.tsx      # shadcn Sheet with parameter controls
      SlowTierParams.tsx      # Recompute parameters section
      VerySlowTierParams.tsx  # Model parameters section + confirm dialog
      RecomputeOverlay.tsx    # "Updating..." dim overlay
    explanation/
      PipelineExplanation.tsx # 6-step slide deck dialog
      steps/                  # Individual step content components
  hooks/
    useVRData.ts              # React Query hook for VR edge data
    usePersistenceImage.ts    # React Query hook for persistence images
    useRecompute.ts           # Recompute trigger + WebSocket progress
  lib/
    plasma.ts                 # Plasma colorscale lookup table (256 stops)
    heatmap.ts                # Canvas 2D heatmap renderer utility
    vrFiltering.ts            # Browser-side edge filtering by epsilon
    exportUtils.ts            # PNG/CSV export helpers
  stores/
    visualizationStore.ts     # Extended with topology/compare/settings state

backend/
  pipeline/
    precompute_vr.py          # VR edge precomputation (new)
  api/routes/
    viz.py                    # Extended with /viz/vr/{genre}, /viz/persistence/{genre}, /recompute
```

### Pattern 1: Browser-Side VR Edge Filtering

**What:** Precompute all VR edges server-side, send once to browser, filter client-side by epsilon.
**When to use:** VR viewer panel when epsilon slider changes.
**Example:**

```typescript
// Source: project architecture decision (04-CONTEXT.md)
interface VREdge {
  word_a_idx: number  // index into word positions array
  word_b_idx: number
  eps_birth: number
  feature_type: number  // 0=H0, 1=H1, 2=H2
}

function filterEdgesByEpsilon(
  edges: VREdge[],
  epsilon: number,
  positions: Float32Array,
): { linePositions: Float32Array; lineColors: Float32Array } {
  // Pre-allocated typed arrays (max possible size)
  const maxVisible = edges.length
  const posArr = new Float32Array(maxVisible * 6) // 2 vertices * 3 coords per edge
  const colArr = new Float32Array(maxVisible * 6) // 2 vertices * 3 color channels
  let count = 0

  const epsilonStep = epsilon // current threshold
  const birthWindow = 0.005 // highlight window for birth events

  for (const edge of edges) {
    if (edge.eps_birth > epsilon) continue
    const i = count * 6
    // Start vertex
    posArr[i]     = positions[edge.word_a_idx * 3]
    posArr[i + 1] = positions[edge.word_a_idx * 3 + 1]
    posArr[i + 2] = positions[edge.word_a_idx * 3 + 2]
    // End vertex
    posArr[i + 3] = positions[edge.word_b_idx * 3]
    posArr[i + 4] = positions[edge.word_b_idx * 3 + 1]
    posArr[i + 5] = positions[edge.word_b_idx * 3 + 2]
    // Color: highlight if born at current epsilon
    const isBirth = Math.abs(edge.eps_birth - epsilonStep) < birthWindow
    const r = isBirth ? 0.98 : 0.29
    const g = isBirth ? 0.80 : 0.29
    const b = isBirth ? 0.08 : 0.35
    colArr[i] = colArr[i + 3] = r
    colArr[i + 1] = colArr[i + 4] = g
    colArr[i + 2] = colArr[i + 5] = b
    count++
  }

  return {
    linePositions: posArr.subarray(0, count * 6),
    lineColors: colArr.subarray(0, count * 6),
  }
}
```

### Pattern 2: Canvas 2D Persistence Image Heatmap

**What:** Render M x M persistence image grid using Canvas 2D fillRect with plasma colorscale.
**When to use:** Persistence image panel, compare mode sidebar heatmaps.
**Example:**

```typescript
// Plasma colorscale: 256 RGBA stops precomputed from matplotlib's plasma
// Source: matplotlib colormaps (standard reference)
const PLASMA_256: [number, number, number][] = [
  [13, 8, 135],    // index 0 (low)
  // ... 254 intermediate values ...
  [240, 249, 33],  // index 255 (high)
]

function renderHeatmap(
  canvas: HTMLCanvasElement,
  data: number[],  // M*M flat array, row-major
  M: number,
  vmin: number,
  vmax: number,
) {
  const ctx = canvas.getContext('2d')!
  const cellW = canvas.width / M
  const cellH = canvas.height / M
  const range = vmax - vmin || 1

  for (let row = 0; row < M; row++) {
    for (let col = 0; col < M; col++) {
      const val = data[row * M + col]
      const normalized = Math.max(0, Math.min(1, (val - vmin) / range))
      const idx = Math.round(normalized * 255)
      const [r, g, b] = PLASMA_256[idx]
      ctx.fillStyle = `rgb(${r},${g},${b})`
      // Y-axis inverted: row 0 at top (high persistence) -> row M-1 at bottom (low)
      ctx.fillRect(col * cellW, (M - 1 - row) * cellH, cellW, cellH)
    }
  }
}
```

### Pattern 3: Selective Recomputation DAG

**What:** Backend maps each parameter to the pipeline steps it invalidates, recomputes only the affected subtree.
**When to use:** POST /recompute endpoint.
**Example:**

```python
# Source: project pipeline architecture [ASSUMED]
# Parameter -> downstream steps that must be recomputed
PARAM_DEPENDENCY_MAP = {
    # Slow-tier (PARAM-03)
    'grid_resolution': ['persistence_images', 'features', 'svm'],
    'sigma': ['persistence_images', 'features', 'svm'],
    'k_clusters': ['cluster_distribution', 'features', 'svm'],
    'alpha': ['features', 'svm'],
    'svm_C': ['svm'],
    'svm_gamma': ['svm'],
    'epsilon_max': ['homology', 'persistence_images', 'vr_edges', 'features', 'svm'],
    # Very-slow-tier (PARAM-04)
    'vector_size': ['word2vec', 'tfidf', 'homology', 'persistence_images',
                    'cluster_distribution', 'features', 'svm', 'projections', 'vr_edges'],
    'window': ['word2vec', 'tfidf', 'homology', 'persistence_images',
               'cluster_distribution', 'features', 'svm', 'projections', 'vr_edges'],
}
```

### Pattern 4: Brushing-and-Linking via Zustand

**What:** All panels subscribe to the same Zustand store slices. Changing selectedGenre or selectedBookId in any panel updates all synchronized panels simultaneously.
**When to use:** TOPO-07 cross-panel synchronization.
**Example:**

```typescript
// Source: existing visualizationStore.ts pattern [VERIFIED: codebase]
// New state slices to add:
interface TopologyState {
  activeTab: 'scatter' | 'topology' | 'compare'
  selectedHomologyDim: 0 | 1 | 2
  vrEpsilon: number
  compareMode: boolean
  compareGenre: string | null
  settingsDrawerOpen: boolean
  pipelineExplanationOpen: boolean
  pipelineExplanationStep: number
  isRecomputing: boolean
  isRetraining: boolean
  dirtyParams: Set<string>
}

// In VRViewer: read selectedGenre to load correct VR edges
const selectedGenre = useVisualizationStore(s => s.selectedGenre)
// React Query re-fetches when selectedGenre changes:
const { data: vrEdges } = useQuery({
  queryKey: ['vr-edges', selectedGenre],
  queryFn: () => fetchVREdges(selectedGenre),
  staleTime: Infinity,
  enabled: !!selectedGenre,
})
```

### Anti-Patterns to Avoid

- **Server round-trip on epsilon slider drag:** The epsilon slider fires at 60fps. All filtering MUST happen browser-side on the preloaded edge array. Never make API calls on slider change.
- **Separate Zustand stores per panel:** Would break brushing-and-linking. One store, many subscribers.
- **Re-rendering all points on epsilon change:** Only the LineSegments geometry needs updating, not the PointCloud. Keep them as separate THREE objects.
- **Computing persistence images in the browser:** The PersistenceImager needs scipy/numpy and the fitted grid from the full corpus. Keep this server-side.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Plasma colorscale | Custom gradient calculation | Pre-computed 256-stop lookup table from matplotlib | Exact perceptual uniformity matters; copy the official stops |
| VR edge birth detection | Custom Vietoris-Rips from scratch | ripser output + distance matrix threshold scan | ripser is optimized C++; hand-rolling is O(n^3) and buggy |
| Slide-in drawer | Custom CSS animation + portal | shadcn Sheet | Already installed, handles backdrop, escape, focus trap |
| Fullscreen dialog | Custom overlay + z-index management | shadcn Dialog | Already installed, handles accessibility, focus management |
| Background job progress | Custom polling loop | Existing arq + Redis pub/sub + WebSocket pattern | Already built in classify.py; recompute jobs follow same pattern |

## Common Pitfalls

### Pitfall 1: VR Edge Payload Too Large

**What goes wrong:** With 500 words, the naive approach (all pairwise edges) produces 124,750 entries (~6 MB JSON). Loading this per genre/book is slow.
**Why it happens:** Not all word pairs ever connect below epsilon_max. Many edges have eps_birth > epsilon_max and are never visible.
**How to avoid:** During precomputation, only emit edges where the weighted distance <= epsilon_max. This typically cuts the edge count by 50-90%. Additionally, use word indices (integers) instead of word strings to reduce payload size. Serve with gzip compression (FastAPI middleware or response class). [ASSUMED]
**Warning signs:** Network tab showing > 2 MB per VR data request; visible load lag when switching genres on Topology tab.

### Pitfall 2: LineSegments drawRange vs. Vertex Zeroing

**What goes wrong:** Using `geometry.setDrawRange(0, visibleCount)` requires sorting edges by eps_birth and maintaining a contiguous range. When birth/death highlighting requires non-contiguous selection, drawRange breaks.
**Why it happens:** drawRange only controls a contiguous slice of the buffer.
**How to avoid:** Pre-sort edges by eps_birth at load time. Use drawRange for the main epsilon filter (all edges with eps_birth <= epsilon form a contiguous prefix after sorting). For birth/death highlighting, use vertex colors (update the color buffer attribute for highlighted edges). [VERIFIED: THREE.js docs -- drawRange works on contiguous ranges; color attributes are per-vertex]
**Warning signs:** Edges disappearing unexpectedly; birth/death highlights not visible.

### Pitfall 3: Persistence Image Axis Orientation

**What goes wrong:** The standard persistence diagram uses (birth, death) axes. The persistence IMAGE uses the rotated (birth, persistence) axes where persistence = death - birth. Confusing these produces an upside-down or mirrored heatmap.
**Why it happens:** The 45-degree coordinate rotation is mathematically standard but easy to forget in rendering code.
**How to avoid:** The existing `diagram_to_birth_persistence()` function in `backend/pipeline/features.py` already performs this rotation (line 20: `np.stack([bd[:, 0], bd[:, 1] - bd[:, 0]], axis=1)`). The heatmap renderer must label X-axis as "Birth scale" and Y-axis as "Persistence" (not "Death"). [VERIFIED: codebase features.py]
**Warning signs:** Heatmap axes labeled as "birth" and "death" instead of "birth scale" and "persistence".

### Pitfall 4: Compare Mode Shared Color Scale

**What goes wrong:** Each genre's persistence image has different value ranges. If each heatmap uses its own min/max for colorscale mapping, visual comparison is meaningless.
**Why it happens:** Independent normalization is the default behavior.
**How to avoid:** When compare mode is active, compute combined vmin = min(genreA_min, genreB_min), vmax = max(genreA_max, genreB_max) and pass to both heatmap renderers. [VERIFIED: COMP-02 requirement + 04-CONTEXT.md decision]
**Warning signs:** Both heatmaps showing similar visual intensity despite one genre having much stronger topological signal.

### Pitfall 5: Recomputation Job Collision

**What goes wrong:** User clicks "Recompute" while a previous recomputation is still running, or changes params again during recompute.
**Why it happens:** No job deduplication or cancellation on new request.
**How to avoid:** (a) Disable the Recompute button during active computation (isRecomputing flag). (b) For very-slow-tier, the confirm dialog prevents accidental double-trigger. (c) Backend should check for in-flight jobs with the same scope and either cancel the old one or reject the new request. [ASSUMED]
**Warning signs:** Multiple overlapping "Updating..." overlays; stale results replacing newer computation.

### Pitfall 6: WebGL lineWidth Limitation

**What goes wrong:** `THREE.LineBasicMaterial({ lineWidth: 2 })` only works on some browsers/GPUs. Most WebGL implementations clamp lineWidth to 1.
**Why it happens:** WebGL spec does not guarantee lineWidth > 1.
**How to avoid:** The UI spec already accounts for this: birth/death edges use a "double-line" approach (offset +/- 0.002 in screen space). Alternatively, use `Line2` from drei/three examples for thick lines, but this is heavier. For Phase 4, stick with lineWidth=1 for default edges and use bright color (#FACC15) for visual emphasis instead of thickness. [VERIFIED: THREE.js docs -- lineWidth browser limitation is well-documented]
**Warning signs:** Birth/death edges looking identical to regular edges on Windows/Chrome.

## Code Examples

### VR Edge Precomputation (Backend)

```python
# Source: project architecture + existing homology.py [VERIFIED: codebase]
def precompute_vr_edges(
    vectors: np.ndarray,
    tfidf_weights: np.ndarray,
    words: list[str],
    epsilon_max: float,
    homology_dims: list[int] = [0, 1],
) -> list[dict]:
    """Precompute all VR edges up to epsilon_max for a single book/genre.

    Returns list of edge dicts sorted by eps_birth (ascending).
    """
    from backend.pipeline.homology import build_weighted_distance_matrix
    dist_matrix = build_weighted_distance_matrix(vectors, tfidf_weights)

    # All edges: upper triangle of distance matrix, filtered by epsilon_max
    n = len(words)
    edges = []
    for i in range(n):
        for j in range(i + 1, n):
            d = dist_matrix[i, j]
            if d <= epsilon_max:
                edges.append({
                    'a': i,   # word index (not string -- saves payload)
                    'b': j,
                    'eps': round(float(d), 5),
                })

    # Sort by birth epsilon for efficient drawRange filtering
    edges.sort(key=lambda e: e['eps'])

    # Edge metadata includes word list for index->word mapping
    return edges
```

### Export PNG from Three.js Canvas

```typescript
// Source: THREE.js WebGLRenderer docs [VERIFIED: THREE.js docs]
function exportScatterPNG(
  canvas: HTMLCanvasElement,
  genre: string,
  projection: string,
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `lgt-scatter-${genre}-${projection}-${timestamp}.png`

  // Force a render frame with preserveDrawingBuffer
  // Note: Canvas must have preserveDrawingBuffer: true or use
  // renderer.render() just before toDataURL()
  const dataURL = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = dataURL
  a.download = filename
  a.click()
}
```

### Export CSV for Persistence Data

```typescript
// Source: standard browser download pattern [ASSUMED]
function exportPersistenceCSV(
  diagrams: { birth: number; death: number; dimension: number }[],
  genre: string,
  dim: number,
) {
  const header = 'birth,death,dimension,persistence\n'
  const rows = diagrams
    .map(d => `${d.birth},${d.death},${d.dimension},${d.death - d.birth}`)
    .join('\n')
  const csv = header + rows
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lgt-persistence-${genre}-H${dim}-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| d3 for all heatmaps | Canvas 2D for simple grids, d3 for complex interactions | Always | Canvas 2D is 10-50x faster for simple grid rendering with no DOM overhead |
| THREE.Line for edges | THREE.LineSegments | Three.js r60+ | LineSegments pairs vertices (0-1, 2-3, ...) vs Line chains (0-1-2-3); LineSegments is correct for disconnected edges |
| Polling for job status | WebSocket + Redis pub/sub | Already built | Real-time progress; no polling overhead |
| Full pipeline recomputation | DAG-based selective recompute | Phase 4 new | Only invalidated downstream steps run; changing sigma skips Word2Vec and TF-IDF |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Filtering edges by epsilon_max during precompute reduces edge count by 50-90% | Pitfall 1 | If most edges are below epsilon_max, payload will be larger than estimated. Mitigation: add a max_edges cap. |
| A2 | gzip compression on JSON VR payload achieves ~4x compression | Standard Stack / Alternatives | If compression is lower, consider binary encoding (MessagePack) |
| A3 | Backend recomputation job collision should be handled by disabling button + cancelling old jobs | Pitfall 5 | If not handled, user may see stale/conflicting results |
| A4 | The POST /recompute endpoint should follow the same arq + Redis pub/sub + WebSocket pattern as classify_book | Architecture Patterns | Pattern is already proven in codebase; reuse is straightforward |
| A5 | preserveDrawingBuffer needed for PNG export from WebGL canvas | Code Examples | If not set at Canvas creation, toDataURL returns blank. Must be set on R3F Canvas gl prop. |
| A6 | Edge count for typical genre top-300 words with epsilon_max=1.0 is ~10k-40k edges | Pitfall 1 | Depends on actual distance distribution in the trained model |

## Open Questions (RESOLVED)

1. **preserveDrawingBuffer performance impact**
   - What we know: THREE.js Canvas needs `preserveDrawingBuffer: true` for `toDataURL()` to work, but this can reduce rendering performance
   - What's unclear: Whether to set it globally or only temporarily for export
   - **RESOLVED:** Recommendation: Set it globally (performance impact is minimal on modern GPUs). If noticeable, use a render-then-capture approach: call renderer.render() and immediately toDataURL() in the same frame, without preserveDrawingBuffer.

2. **VR edge payload format: indices vs strings**
   - What we know: Using word indices instead of strings reduces payload 3-4x
   - What's unclear: Whether to send word list separately or rely on scatter data already loaded
   - **RESOLVED:** Recommendation: VR endpoint returns `{ words: string[], edges: [a_idx, b_idx, eps_birth][], epsilon_max: number }`. Words array provides index mapping; edges use compact array-of-arrays format.

3. **H2 computation toggle**
   - What we know: H2 is computationally expensive and disabled by default (TOPO-02)
   - What's unclear: Where in the settings drawer does the H2 enable toggle live
   - **RESOLVED:** Recommendation: Add an "Enable H2 computation" toggle in the slow-tier settings section. When toggled on, mark as dirty param requiring recompute. H2 tab in persistence panel becomes enabled after recompute completes.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| ripser | VR edge precompute | Yes | existing | -- |
| scipy | Distance matrix computation | Yes | existing | -- |
| Redis | Background recompute jobs | Yes (required) | existing | -- |
| arq | Job queue | Yes | existing | -- |
| Canvas 2D API | Heatmap rendering | Yes (browser) | -- | -- |
| THREE.LineSegments | VR edge rendering | Yes (three 0.172.0) | 0.172.0 | -- |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x + React Testing Library |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest run --reporter=verbose` |
| Full suite command | `cd frontend && npx vitest run --coverage` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TOPO-01 | Persistence heatmap renders with correct axes | unit | `cd frontend && npx vitest run src/components/topology/PersistenceHeatmap.test.tsx -x` | Wave 0 |
| TOPO-02 | H0/H1/H2 tabs switch selected dimension | unit | `cd frontend && npx vitest run src/components/topology/HomologyTabs.test.tsx -x` | Wave 0 |
| TOPO-04 | Epsilon slider filters edges client-side | unit | `cd frontend && npx vitest run src/lib/vrFiltering.test.ts -x` | Wave 0 |
| TOPO-07 | Genre change in sidebar updates all panels | integration | `cd frontend && npx vitest run src/stores/visualizationStore.test.ts -x` | Exists (extend) |
| COMP-02 | Shared color scale computed from combined data | unit | `cd frontend && npx vitest run src/lib/heatmap.test.ts -x` | Wave 0 |
| PARAM-03 | Dirty params tracked, recompute button enabled | unit | `cd frontend && npx vitest run src/components/settings/SlowTierParams.test.tsx -x` | Wave 0 |
| PARAM-06 | Backend recompute endpoint triggers correct subtree | unit (backend) | `cd backend && python -m pytest tests/test_recompute.py -x` | Wave 0 |
| UX-03 | PNG export produces valid data URL | unit | `cd frontend && npx vitest run src/lib/exportUtils.test.ts -x` | Wave 0 |
| UX-05 | Disclaimer banner renders on Scatter/Topology tabs | unit | `cd frontend && npx vitest run src/components/nav/DisclaimerBanner.test.tsx -x` | Wave 0 |

### Sampling Rate

- **Per task commit:** `cd frontend && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd frontend && npx vitest run --coverage`
- **Phase gate:** Full suite green before /gsd-verify-work

### Wave 0 Gaps

- [ ] `frontend/src/lib/vrFiltering.test.ts` -- covers TOPO-04 edge filtering logic
- [ ] `frontend/src/lib/heatmap.test.ts` -- covers COMP-02 shared color scale
- [ ] `frontend/src/lib/exportUtils.test.ts` -- covers UX-03 export functions
- [ ] `frontend/src/components/topology/PersistenceHeatmap.test.tsx` -- covers TOPO-01
- [ ] `frontend/src/components/topology/HomologyTabs.test.tsx` -- covers TOPO-02
- [ ] `frontend/src/components/nav/DisclaimerBanner.test.tsx` -- covers UX-05
- [ ] `frontend/src/components/settings/SlowTierParams.test.tsx` -- covers PARAM-03
- [ ] `backend/tests/test_recompute.py` -- covers PARAM-06 subtree recomputation
- [ ] Extend `frontend/src/stores/visualizationStore.test.ts` -- covers TOPO-07 new slices

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | App has no auth (out of scope per REQUIREMENTS.md) |
| V3 Session Management | No | Stateless app |
| V4 Access Control | No | No auth, public access |
| V5 Input Validation | Yes | FastAPI path validation (genre names, gutenberg IDs); parameter range validation on POST /recompute |
| V6 Cryptography | No | No secrets handled |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Parameter injection via POST /recompute | Tampering | Pydantic model with strict field validation; reject unknown params; range constraints on all numeric values |
| Denial of service via very-slow-tier recompute | Denial of Service | Rate limit recompute endpoint (1 concurrent job per session); confirm dialog on frontend; job timeout in arq |
| Path traversal via genre/book ID in new endpoints | Tampering | Validate against known genre list and gutenberg_id regex (already done in viz.py) |

## Sources

### Primary (HIGH confidence)
- Codebase: `backend/pipeline/homology.py`, `backend/pipeline/features.py` -- existing VR computation and persistence image generation
- Codebase: `frontend/src/components/canvas/PointCloud.tsx` -- existing shader pattern to extend
- Codebase: `backend/worker/jobs.py` -- existing arq job pattern for recompute jobs
- Codebase: `backend/cache/store.py` -- content-addressed disk cache for VR data
- Codebase: `frontend/src/stores/visualizationStore.ts` -- Zustand store to extend
- [THREE.js LineSegments docs](https://threejs.org/docs/pages/LineSegments.html) -- LineSegments API
- [THREE.js BufferGeometry docs](https://threejs.org/docs/pages/BufferGeometry.html) -- dynamic attribute updates

### Secondary (MEDIUM confidence)
- [persim 0.3.8 docs](https://persim.scikit-tda.org/en/latest/notebooks/Persistence%20images.html) -- persistence image theory reference
- [ripser.py cocycles docs](https://ripser.scikit-tda.org/en/latest/notebooks/Representative%20Cocycles.html) -- ripser output format

### Tertiary (LOW confidence)
- WebSearch: THREE.js line performance patterns -- general guidance, not version-specific

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and verified in package.json/codebase
- Architecture: MEDIUM-HIGH -- patterns follow existing codebase conventions; VR precompute is new but follows precompute_viz.py pattern
- Pitfalls: MEDIUM -- edge payload size estimates are theoretical; actual distribution depends on trained model data
- Recomputation DAG: MEDIUM -- parameter dependency mapping is assumed; needs validation against actual pipeline structure

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable stack, no fast-moving dependencies)
