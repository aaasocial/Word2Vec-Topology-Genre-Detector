# Phase 3: Frontend Core and 3D Visualization - Research

**Researched:** 2026-04-12
**Domain:** React + Three.js 3D visualization, FastAPI endpoint extensions, dimensionality reduction
**Confidence:** HIGH

## Summary

Phase 3 builds a React 18 frontend with a full-viewport 3D scatter plot of ~58,000 word embeddings (one per unique word in the shared vocabulary). The scatter plot renders these points with per-genre coloring and per-word TF-IDF brightness encoding. Users switch between four pre-computed 3D projections (PCA, Kernel PCA, UMAP, t-SNE), select genres and books to shift brightness patterns, hover/click points for details, search for words, upload .txt files for classification, and see uploaded books appear in the scatter.

The backend extends with three new GET endpoints serving pre-computed projection and TF-IDF data, plus a precompute extension that runs PCA/KPCA/UMAP/t-SNE on the full 150D vocabulary. The frontend consumes these endpoints via React Query with `staleTime: Infinity` (data is immutable mid-session).

**Primary recommendation:** Use `THREE.Points` with custom `ShaderMaterial` and per-point `BufferAttribute`s (position, color, size, opacity) instead of `InstancedMesh` for the scatter plot. Points renders 58k items in a single draw call with no geometry overhead, which is significantly faster than InstancedMesh (which renders multiple triangles per sphere instance). The UI-SPEC references InstancedMesh, but research shows Points is the correct approach for this use case. R3F wraps Three.js Points natively.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Dark full-screen canvas with right sidebar (320px fixed width, collapsible)
- Server pre-computes all 4 projections at build time; served as JSON; switching is instant
- Two new API endpoints: GET /viz/scatter/{projection}, GET /viz/tfidf/{genre}, GET /viz/tfidf/book/{gutenberg_id}
- New endpoints in backend/api/routes/viz.py
- Precompute script extended for projections (backend/pipeline/precompute_viz.py or extension of precompute.py)
- Tailwind CSS + shadcn/ui (dark mode default, class strategy)
- React 18 + Vite, react-three-fiber + @react-three/drei, Zustand, React Query
- Frontend directory: frontend/ at project root
- Points rendered as instanced mesh for performance at 50k points (NOTE: research recommends THREE.Points instead -- see Architecture Patterns)
- TF-IDF brightness mapped to point opacity and emissive intensity
- Genre colours from fixed palette (defined in frontend/src/constants/genres.ts)
- Camera controls via drei OrbitControls
- Hover via raycasting -- tooltip shows word, TF-IDF weight, genre, top-5 nearest neighbours
- Click to select point -- detail panel in sidebar
- Word search (VIZ-10): filter/highlight matching points
- Zustand store slices: visualizationSlice, uploadSlice, uiSlice
- PDF upload deferred -- .txt only in Phase 3
- Phase 2 API consumed as-is; only new viz endpoints added

### Claude's Discretion
- Specific shadcn component configuration and Tailwind theme setup
- Data serialization format for scatter API responses
- WebSocket connection lifecycle management approach
- Debounce implementation details
- Camera animation implementation (lerp vs drei spring)
- Raycasting optimization strategy for 58k points

### Deferred Ideas (OUT OF SCOPE)
- Browser-native PDF-to-txt conversion (Phase 4+)
- Topology views (persistence images, animated Vietoris-Rips) -- Phase 4
- Slow/very-slow parameter recompute controls -- Phase 4
- Pipeline explanation walkthrough -- Phase 4
- Mobile responsive layout -- out of scope for v1
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-04 | React + R3F frontend handles all 3D rendering and UI state | Standard Stack section covers exact versions and setup |
| VIZ-01 | 3D scatter plot at 60fps with up to 50k points | Architecture Patterns: THREE.Points with ShaderMaterial for 58k points |
| VIZ-02 | Switch between PCA, KPCA, UMAP, t-SNE projections | Backend precompute + scatter API endpoint; animated lerp on switch |
| VIZ-03 | TF-IDF brightness/size scaling per word | ShaderMaterial uniforms + per-point BufferAttribute for opacity/size |
| VIZ-04 | Genre dropdown filters brightness | TF-IDF endpoint per genre; Zustand slice triggers data refetch |
| VIZ-05 | Book slider within genre shifts brightness | TF-IDF endpoint per book; debounced 200ms |
| VIZ-06 | Hover tooltip with word, TF-IDF, genre, top-5 neighbors | Custom raycaster on Points + drei Html overlay |
| VIZ-07 | Click-to-select with persistent highlight | Zustand selectedPointIndex; white ring via second Points layer or shader uniform |
| VIZ-08 | Orbit, pan, zoom with reset camera | drei OrbitControls; camera tween via useFrame lerp |
| VIZ-09 | 2D/3D toggle | Animate Z to 0 via useFrame; lock OrbitControls polar angle |
| VIZ-10 | Word search with highlight | Client-side filter on cached word list; shader uniform for highlight mask |
| VIZ-11 | Consistent genre color coding | Genre palette constant in frontend/src/constants/genres.ts |
| CLASS-03 | Uploaded book appears in scatter after classification | Append uploaded word-points to Points buffer; amber highlight color |
| PARAM-01 | Instant-tier controls (projection, point size, opacity) | No debounce; direct Zustand mutation read in useFrame |
| PARAM-02 | Fast-tier controls debounced 200ms (TF-IDF threshold, brightness, book slider, genre) | useDebouncedCallback or setTimeout pattern |
| UX-04 | Keyboard shortcuts (R, 1-4, Esc) | Global keydown listener via useEffect; Zustand actions |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- WAT framework: check tools/ for existing scripts before building new ones
- Deliverables go to cloud services; local files are for processing
- .tmp/ for temporary files; tools/ for Python scripts; workflows/ for SOPs
- .env for API keys (never store secrets elsewhere)
- GSD workflow enforcement: use /gsd-execute-phase for planned phase work

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 18.3.1 | UI framework | Locked by CONTEXT.md; R3F v8 requires React 18 [VERIFIED: npm registry] |
| react-dom | 18.3.1 | React DOM renderer | Pairs with react [VERIFIED: npm registry] |
| @react-three/fiber | 8.18.0 | React renderer for Three.js | Latest v8 line; v9 requires React 19 (incompatible) [VERIFIED: npm registry peerDependencies] |
| @react-three/drei | 9.122.0 | R3F helpers (OrbitControls, Html, etc.) | Latest v9; peerDep `@react-three/fiber ^8` [VERIFIED: npm registry peerDependencies] |
| three | 0.172.0 | 3D rendering engine | Latest stable; R3F 8.18 supports >=0.133 [VERIFIED: npm registry] |
| zustand | 5.0.12 | State management | Lightweight, no boilerplate, no Provider needed; pmndrs ecosystem [VERIFIED: npm registry] |
| @tanstack/react-query | 5.99.0 | Data fetching/caching | Locked by CONTEXT.md [VERIFIED: npm registry] |
| tailwindcss | 4.2.2 | Utility CSS | Locked by CONTEXT.md [VERIFIED: npm registry] |
| @tailwindcss/vite | (bundled w/ tailwindcss 4) | Vite plugin | Required for Tailwind v4 with Vite [CITED: ui.shadcn.com/docs/installation/vite] |
| vite | 6.3.5 | Build tool | Latest stable [VERIFIED: npm registry] |
| typescript | 5.8.3 | Type safety | Standard for React + R3F projects [VERIFIED: npm registry] |
| lucide-react | 0.483.0 | Icon library | Specified in UI-SPEC [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | CLI latest | Copy-paste component library | Initialize with `npx shadcn@latest init`; components: button, input, select, slider, tabs, toggle, tooltip, progress [CITED: UI-SPEC registry safety] |
| @vitejs/plugin-react | 4.4.1 | React Fast Refresh for Vite | Standard Vite+React setup [VERIFIED: npm registry] |

### Backend Additions

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| umap-learn | 0.5.12 | UMAP projection | Already installed on system [VERIFIED: pip show] |
| scikit-learn | 1.6.1 | PCA, Kernel PCA, t-SNE | Already in requirements.txt [VERIFIED: pip show, requirements.txt] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| THREE.Points (recommended) | THREE.InstancedMesh (UI-SPEC says this) | InstancedMesh renders multiple triangles per sphere; Points renders one fragment per point. For 58k uniform-shape points, Points is 3-5x faster. InstancedMesh only wins if you need per-point geometric detail (spheres, cubes) [CITED: discourse.threejs.org/t/better-performance-instanced-mesh-or-points/20293] |
| Custom ShaderMaterial | drei PointMaterial | Custom shader gives fine control over per-point size, opacity, emissive, and highlight mask. PointMaterial is simpler but lacks TF-IDF brightness control |
| useFrame + getState() | Zustand selector subscriptions | For fast-changing 3D state (animations, hover), useFrame + getState() avoids React re-renders entirely [CITED: r3f.docs.pmnd.rs/advanced/pitfalls] |

**Installation (frontend):**
```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install three @react-three/fiber@^8 @react-three/drei@^9 zustand @tanstack/react-query lucide-react
npm install -D tailwindcss @tailwindcss/vite @types/three @types/node
npx shadcn@latest init
npx shadcn@latest add button input select slider tabs toggle tooltip progress
```

**Backend additions to requirements.txt:**
```
umap-learn>=0.5.0
```
(scikit-learn already present; umap-learn is installed but not in requirements.txt)

## Architecture Patterns

### Recommended Project Structure
```
frontend/
  src/
    main.tsx                  # Entry point
    App.tsx                   # Layout: Canvas + Sidebar
    index.css                 # Tailwind imports + CSS vars
    constants/
      genres.ts               # Genre color palette (VIZ-11)
      projections.ts          # Projection names and keyboard mappings
    stores/
      visualizationStore.ts   # Zustand: projection, selectedGenre, selectedBook, selectedPoint
      uploadStore.ts          # Zustand: jobId, progress steps, result
      uiStore.ts              # Zustand: sidebarOpen, searchQuery
    components/
      canvas/
        ScatterCanvas.tsx     # R3F Canvas wrapper
        PointCloud.tsx        # THREE.Points with custom ShaderMaterial
        HoverTooltip.tsx      # drei Html overlay for tooltip
        CameraController.tsx  # OrbitControls + reset + 2D lock
      sidebar/
        Sidebar.tsx           # 320px right panel container
        ProjectionTabs.tsx    # PCA/KPCA/UMAP/t-SNE tabs
        GenreSelect.tsx       # Genre dropdown with colored dots
        BookSlider.tsx        # Per-book slider within genre
        ControlSliders.tsx    # Point size, opacity, TF-IDF threshold, brightness
        Toggle2D3D.tsx        # 2D/3D toggle
        ResetCamera.tsx       # Reset view button
        WordSearch.tsx        # Search input + results list
        DetailPanel.tsx       # Selected point detail
        UploadZone.tsx        # Drag-and-drop upload
        UploadProgress.tsx    # 6-step progress stepper
        ClassificationResult.tsx
      ui/                     # shadcn components (auto-generated)
    hooks/
      useScatterData.ts       # React Query for GET /viz/scatter/{projection}
      useTfidfData.ts         # React Query for GET /viz/tfidf/{genre|book}
      useClassify.ts          # POST /classify + WebSocket progress
      useKeyboardShortcuts.ts # Global keyboard handler
      useDebounce.ts          # Generic debounce hook
    lib/
      utils.ts                # shadcn cn() utility
      api.ts                  # API base URL config
    types/
      scatter.ts              # TypeScript types for scatter data
```

### Pattern 1: THREE.Points with Custom ShaderMaterial for 58k Points

**What:** Render the entire word vocabulary as a single `THREE.Points` object with per-point attributes for position (3D coords), color (genre RGB), size (TF-IDF scaled), and opacity (TF-IDF brightness). A custom `ShaderMaterial` reads these attributes and renders circles with soft edges.

**When to use:** Always for this scatter plot. This is the only approach that achieves 60fps with 58k points.

**Why not InstancedMesh:** The UI-SPEC mentions InstancedMesh with sphere geometry (radius 0.015). However, even a low-poly sphere (8 segments) has ~200 triangles. 58k x 200 = 11.6M triangles per frame. Points renders 58k fragments -- 200x fewer GPU operations. Custom ShaderMaterial can render circles (not squares) via `gl_PointCoord` distance check.

**Example:**
```typescript
// Source: Three.js docs + R3F patterns [VERIFIED: threejs.org/docs + r3f.docs.pmnd.rs]
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = `
  attribute float aSize;
  attribute float aOpacity;
  attribute vec3 aColor;
  varying float vOpacity;
  varying vec3 vColor;
  uniform float uSizeMultiplier;
  void main() {
    vOpacity = aOpacity;
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uSizeMultiplier * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  varying float vOpacity;
  varying vec3 vColor;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.35, dist) * vOpacity;
    gl_FragColor = vec4(vColor, alpha);
  }
`

function PointCloud({ positions, colors, sizes, opacities }) {
  const pointsRef = useRef<THREE.Points>(null)
  
  const [geometry, material] = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3))
    geo.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1))
    geo.setAttribute('aOpacity', new THREE.Float32BufferAttribute(opacities, 1))
    
    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      uniforms: { uSizeMultiplier: { value: 1.0 } },
    })
    return [geo, mat]
  }, []) // Geometry created once; attributes updated via needsUpdate
  
  return <points ref={pointsRef} geometry={geometry} material={material} />
}
```

### Pattern 2: Zustand Store with R3F useFrame Integration

**What:** Zustand stores hold UI state (projection, genre, book, selected point). Fast-changing state (hover, animation progress) is read via `store.getState()` inside `useFrame` to avoid React re-renders.

**When to use:** All 3D state that changes during animation frames.

**Example:**
```typescript
// Source: pmndrs/zustand + r3f pitfalls guide [CITED: r3f.docs.pmnd.rs/advanced/pitfalls]
import { create } from 'zustand'

interface VisualizationState {
  projection: 'pca' | 'kpca' | 'umap' | 'tsne'
  selectedGenre: string | null
  selectedBookId: string | null
  selectedPointIndex: number | null
  pointSizeMultiplier: number
  opacity: number
  tfidfThreshold: number
  brightnessSensitivity: number
  is2D: boolean
  setProjection: (p: VisualizationState['projection']) => void
  setSelectedGenre: (g: string | null) => void
  // ...
}

export const useVisualizationStore = create<VisualizationState>((set) => ({
  projection: 'pca',
  selectedGenre: null,
  selectedBookId: null,
  selectedPointIndex: null,
  pointSizeMultiplier: 1.0,
  opacity: 1.0,
  tfidfThreshold: 0.0,
  brightnessSensitivity: 1.0,
  is2D: false,
  setProjection: (p) => set({ projection: p }),
  setSelectedGenre: (g) => set({ selectedGenre: g, selectedBookId: null }),
  // ...
}))

// In useFrame (no React re-render):
useFrame(() => {
  const { pointSizeMultiplier } = useVisualizationStore.getState()
  materialRef.current.uniforms.uSizeMultiplier.value = pointSizeMultiplier
})
```

### Pattern 3: Projection Switch Animation via Lerp

**What:** When the user switches projection, interpolate all 58k point positions from old to new over 600ms using `useFrame` and `THREE.MathUtils.lerp`.

**When to use:** Projection switch, 2D/3D toggle.

**Example:**
```typescript
// [ASSUMED] -- standard Three.js animation pattern
useFrame((_, delta) => {
  if (!animating) return
  progress.current = Math.min(progress.current + delta / 0.6, 1.0) // 600ms
  const t = easeOut(progress.current)
  const positions = geometry.attributes.position.array as Float32Array
  for (let i = 0; i < count * 3; i++) {
    positions[i] = THREE.MathUtils.lerp(fromPositions[i], toPositions[i], t)
  }
  geometry.attributes.position.needsUpdate = true
  if (progress.current >= 1.0) setAnimating(false)
})
```

### Pattern 4: Raycasting for Points with 58k Items

**What:** Custom raycaster on `THREE.Points` using `raycaster.params.Points.threshold` for hit detection. R3F supports `onPointerMove` on `<points>` natively, but for 58k points the default raycasting can be slow. Optimize by setting a tight threshold.

**When to use:** Hover tooltip and click-to-select.

**Example:**
```typescript
// [ASSUMED] -- standard R3F event pattern
<Canvas raycaster={{ params: { Points: { threshold: 0.05 } } }}>
  <points
    onPointerMove={(e) => {
      e.stopPropagation()
      const idx = e.index // THREE.Points intersection includes index
      setHoveredIndex(idx)
    }}
    onPointerLeave={() => setHoveredIndex(null)}
    onClick={(e) => {
      e.stopPropagation()
      setSelectedIndex(e.index)
    }}
  />
</Canvas>
```

**Performance note:** THREE.Points raycasting iterates all points and checks distance. For 58k points this is O(n) per mouse move. At 60fps mouse updates, this is ~3.5M distance checks per second. This is fast enough on modern hardware (simple arithmetic). If laggy, throttle `onPointerMove` to every other frame.

### Pattern 5: React Query with staleTime Infinity for Pre-computed Data

**What:** Scatter data and TF-IDF data are pre-computed and immutable during a session. Use `staleTime: Infinity` to cache responses permanently.

**Example:**
```typescript
// [CITED: tanstack.com/query/latest/docs]
import { useQuery } from '@tanstack/react-query'

function useScatterData(projection: string) {
  return useQuery({
    queryKey: ['scatter', projection],
    queryFn: () => fetch(`/api/viz/scatter/${projection}`).then(r => r.json()),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
```

### Pattern 6: WebSocket Classification Progress in React

**What:** After POST /classify returns job_id, open a WebSocket to /ws/classify/{job_id} to receive 6 progress steps. Manage WS lifecycle in a custom hook.

**Example:**
```typescript
// [ASSUMED] -- standard WebSocket + React pattern
function useClassificationProgress(jobId: string | null) {
  const [steps, setSteps] = useState<ProgressStep[]>([])
  const [result, setResult] = useState<ClassificationResult | null>(null)
  
  useEffect(() => {
    if (!jobId) return
    const ws = new WebSocket(`${WS_BASE}/ws/classify/${jobId}`)
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      setSteps(prev => updateSteps(prev, msg))
      if (msg.status === 'done') setResult(msg.result)
    }
    ws.onerror = () => { /* retry logic */ }
    return () => ws.close()
  }, [jobId])
  
  return { steps, result }
}
```

### Anti-Patterns to Avoid

- **Anti-pattern: InstancedMesh for uniform points.** Use THREE.Points instead. InstancedMesh is for when you need per-instance geometry variation (different shapes). All scatter points are circles -- use Points + ShaderMaterial. [CITED: discourse.threejs.org/t/better-performance-instanced-mesh-or-points/20293]
- **Anti-pattern: React state for animation values.** Never do `setState({ x: newX })` inside useFrame. Mutate refs or buffer attributes directly. [CITED: r3f.docs.pmnd.rs/advanced/pitfalls]
- **Anti-pattern: Creating new THREE objects per frame.** Reuse Vector3, Color, Matrix4 instances. Allocate once outside useFrame, set values inside. [CITED: r3f.docs.pmnd.rs/advanced/pitfalls]
- **Anti-pattern: Conditional mounting/unmounting 3D objects.** Use `visible={false}` instead of `{condition && <mesh />}`. Mounting triggers buffer/material recompilation. [CITED: r3f.docs.pmnd.rs/advanced/pitfalls]
- **Anti-pattern: Zustand selector for per-frame values.** `useVisualizationStore(s => s.pointSize)` causes component re-render. Use `useVisualizationStore.getState().pointSize` inside useFrame. [CITED: r3f.docs.pmnd.rs/advanced/pitfalls]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 3D camera controls | Custom orbit/pan/zoom | drei `OrbitControls` | Touch support, damping, polar limits all handled |
| HTML overlays in 3D | Manual CSS positioning synced to 3D coords | drei `Html` component | Automatically tracks 3D world position, handles occlusion |
| Dropdown/Select | Custom dropdown | shadcn Select (Radix) | Accessibility (ARIA, keyboard nav), portal rendering |
| Slider | Custom range input | shadcn Slider (Radix) | Accessible, styled, supports step/range |
| Tooltip | Custom hover div | drei Html (3D) + shadcn Tooltip (UI) | 3D tooltips need world-to-screen projection; UI tooltips need portal |
| Debounce | Manual setTimeout | `useDebouncedCallback` from `use-debounce` npm package or simple custom hook | Edge cases (cleanup, stale closures) |
| Data fetching cache | Manual fetch + useState | React Query (TanStack Query) | Cache invalidation, deduplication, loading/error states |
| Dark mode theming | Manual CSS variables | shadcn dark mode class strategy + Tailwind `dark:` | Consistent with component library |
| PCA/UMAP/t-SNE | Custom implementation | scikit-learn PCA/KPCA/TSNE + umap-learn UMAP | Numerical stability, GPU acceleration (UMAP), validated implementations |

**Key insight:** This phase has two halves: (1) a Python backend extension that runs dimensionality reduction (solved libraries), and (2) a WebGL frontend that renders the results (solved by R3F + Three.js). The creative work is in the shader (TF-IDF brightness encoding) and the UX (smooth transitions, responsive controls).

## Common Pitfalls

### Pitfall 1: React 18 + R3F Version Mismatch
**What goes wrong:** Installing `@react-three/fiber@latest` (v9.5.0) with React 18 causes peer dependency errors or runtime crashes because R3F v9 requires React 19.
**Why it happens:** R3F v9 was released for React 19. The latest tag points to v9.
**How to avoid:** Pin to `@react-three/fiber@^8` and `@react-three/drei@^9`. R3F 8.18.0 and drei 9.122.0 are the latest compatible versions.
**Warning signs:** `npm install` peer dependency warnings mentioning react version.

### Pitfall 2: BufferAttribute needsUpdate Flag
**What goes wrong:** Updating Float32Array data for positions/colors/opacity has no visual effect because the GPU buffer isn't re-uploaded.
**Why it happens:** Three.js caches buffer data on the GPU. You must set `geometry.attributes.position.needsUpdate = true` after modifying the array.
**How to avoid:** After every buffer data modification, set `needsUpdate = true` on the changed attribute. Do this inside useFrame for animated transitions.
**Warning signs:** Points don't move when switching projections; colors don't change when switching genres.

### Pitfall 3: Zustand Re-renders Killing 3D Performance
**What goes wrong:** Using `const value = useStore(s => s.x)` in a 3D component causes React re-renders on every state change, which triggers Three.js buffer recompilation.
**Why it happens:** Zustand selectors are React hooks that trigger re-renders. R3F components should minimize re-renders.
**How to avoid:** For values read in useFrame, use `useStore.getState().x` (no subscription). Only use selectors for values that should trigger React re-renders (e.g., sidebar UI text).
**Warning signs:** FPS drops when moving sliders; React DevTools shows excessive re-renders on canvas components.

### Pitfall 4: UMAP Non-Determinism
**What goes wrong:** UMAP produces different layouts on each run, making the pre-computed projection inconsistent.
**Why it happens:** UMAP uses random initialization by default.
**How to avoid:** Set `random_state=42` in UMAP constructor. Also set `n_jobs=1` for full determinism.
**Warning signs:** Scatter layout changes after re-running precompute.

### Pitfall 5: t-SNE Slow on 58k Points
**What goes wrong:** sklearn t-SNE with 58k points takes 10+ minutes because default implementation is O(n^2).
**Why it happens:** Exact t-SNE is quadratic. The `method='barnes_hut'` approximation is O(n log n) but still slow at 58k.
**How to avoid:** Use `sklearn.manifold.TSNE(method='barnes_hut', n_components=3, random_state=42, n_iter=300)`. Consider reducing iterations or using openTSNE for faster computation. This runs at precompute time, not runtime, so 1-2 minutes is acceptable.
**Warning signs:** Precompute script hangs on t-SNE step.

### Pitfall 6: Raycasting Performance on Points
**What goes wrong:** Mouse hover causes frame drops because raycasting iterates all 58k points on every mouse move.
**Why it happens:** R3F fires onPointerMove on every requestAnimationFrame by default. THREE.Points raycasting is O(n).
**How to avoid:** Set a tight `threshold` on the raycaster (e.g., 0.05) to reject distant points early. If still slow, throttle onPointerMove to fire every 2nd frame, or use a spatial index (e.g., octree).
**Warning signs:** FPS drops when moving mouse over the scatter plot.

### Pitfall 7: Large JSON Response for 58k Points
**What goes wrong:** Serializing 58k point records as JSON produces a 5-15MB response that is slow to parse.
**Why it happens:** JSON is text-based with key repetition per record.
**How to avoid:** Use a columnar format: return arrays of positions (Float32Array), words (string[]), genres (uint8[]), and TF-IDF weights (Float32Array) as separate fields. Consider MessagePack or binary encoding for positions. Alternatively, gzip the JSON response (FastAPI middleware).
**Warning signs:** Page load takes 3+ seconds on first visit; browser hangs parsing JSON.

### Pitfall 8: shadcn/ui Tailwind v4 CSS Variables
**What goes wrong:** shadcn components render without any styles, or dark mode doesn't apply.
**Why it happens:** Tailwind v4 uses `@import "tailwindcss"` instead of `@tailwind` directives. shadcn requires CSS variables to be defined in the right place.
**How to avoid:** Follow the exact shadcn Vite installation guide. Use `@import "tailwindcss"` in index.css. Run `npx shadcn@latest init` which auto-generates the CSS variables layer.
**Warning signs:** Components render as unstyled HTML. Dark mode class on `<html>` has no effect.

## Code Examples

### Backend: Precompute Projections (precompute_viz.py)

```python
# Source: scikit-learn docs + umap-learn docs [VERIFIED: installed packages]
import numpy as np
from sklearn.decomposition import PCA, KernelPCA
from sklearn.manifold import TSNE
from umap import UMAP

def compute_projections(vectors: np.ndarray, random_state: int = 42) -> dict:
    """Compute all 4 projections for the full vocabulary.
    
    Args:
        vectors: (N, 150) word vectors from Word2Vec model
    
    Returns:
        dict mapping projection name to (N, 3) coordinate arrays
    """
    projections = {}
    
    # PCA -- fast, deterministic
    pca = PCA(n_components=3, random_state=random_state)
    projections['pca'] = pca.fit_transform(vectors).astype(np.float32)
    
    # Kernel PCA -- RBF kernel for nonlinear structure
    kpca = KernelPCA(n_components=3, kernel='rbf', random_state=random_state)
    projections['kpca'] = kpca.fit_transform(vectors).astype(np.float32)
    
    # UMAP -- fast, preserves global+local structure
    umap = UMAP(n_components=3, random_state=random_state, n_jobs=1)
    projections['umap'] = umap.fit_transform(vectors).astype(np.float32)
    
    # t-SNE -- slowest, best local structure
    tsne = TSNE(n_components=3, method='barnes_hut', random_state=random_state)
    projections['tsne'] = tsne.fit_transform(vectors).astype(np.float32)
    
    # Normalize all projections to [-1, 1] for consistent camera framing
    for name, coords in projections.items():
        max_abs = np.abs(coords).max()
        if max_abs > 0:
            projections[name] = coords / max_abs
    
    return projections
```

### Backend: Scatter API Response Format

```python
# Source: FastAPI docs [ASSUMED -- standard pattern]
# GET /viz/scatter/{projection}
# Response body (JSON, gzipped):
{
    "projection": "pca",
    "count": 57818,
    "words": ["the", "and", ...],          # string[57818]
    "positions": [[0.12, -0.34, 0.56], ...], # float[57818][3]
    "genres": [0, 0, 1, 2, ...],           # uint8[57818] -- genre index per word
    "genre_names": ["romance", "mystery", ...], # string[10]
    "tfidf_global": [0.001, 0.002, ...],   # float[57818] -- corpus-wide TF-IDF
}

# GET /viz/tfidf/{genre}
{
    "genre": "romance",
    "weights": { "love": 0.042, "heart": 0.038, ... }  # word -> weight map
}

# GET /viz/tfidf/book/{gutenberg_id}
{
    "gutenberg_id": "1342",
    "title": "Pride and Prejudice",
    "genre": "romance",
    "weights": { "love": 0.042, "heart": 0.038, ... }
}
```

**Note on word-to-genre mapping:** Each word in the vocabulary may appear in multiple genres. For the scatter plot, assign each word to the genre where it has the highest aggregate TF-IDF weight. This gives each point a single "primary genre" for coloring purposes.

### Frontend: shadcn Dark Mode Setup

```typescript
// Source: ui.shadcn.com/docs/dark-mode [CITED]
// In index.html: <html class="dark">
// In index.css (after shadcn init):
@import "tailwindcss";
// shadcn generates @theme and color variable blocks automatically
```

### Frontend: Debounced Control Pattern

```typescript
// [ASSUMED] -- standard React debounce pattern
import { useRef, useCallback } from 'react'

function useDebounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  const timer = useRef<ReturnType<typeof setTimeout>>()
  return useCallback((...args: Parameters<T>) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), ms)
  }, [fn, ms])
}

// Usage in GenreSelect:
const debouncedSetGenre = useDebounce(
  (genre: string) => useVisualizationStore.getState().setSelectedGenre(genre),
  200
)
```

### Frontend: Keyboard Shortcuts

```typescript
// [ASSUMED] -- standard React keyboard pattern
import { useEffect } from 'react'

function useKeyboardShortcuts() {
  const setProjection = useVisualizationStore(s => s.setProjection)
  const setSelectedPointIndex = useVisualizationStore(s => s.setSelectedPointIndex)
  
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      switch (e.key) {
        case 'r': case 'R': resetCamera(); break
        case '1': setProjection('pca'); break
        case '2': setProjection('kpca'); break
        case '3': setProjection('umap'); break
        case '4': setProjection('tsne'); break
        case 'Escape': setSelectedPointIndex(null); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| R3F v8 + React 18 | R3F v9 + React 19 | 2024-Q4 | We must use v8 line since CONTEXT locks React 18 |
| Tailwind v3 (@tailwind directives) | Tailwind v4 (@import "tailwindcss") | 2025-Q1 | Different CSS setup; shadcn CLI handles it |
| shadcn/ui separate packages | shadcn/ui unified CLI + copy-paste | 2024 | Components copied into project, full ownership |
| React Query v4 | TanStack Query v5 | 2023 | useQuery API changes (object syntax only) |
| THREE.Geometry | THREE.BufferGeometry | 2021 (r125) | Geometry removed; BufferGeometry is the only option |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | THREE.Points is faster than InstancedMesh for 58k uniform points | Architecture Patterns | If wrong, switch to InstancedMesh with low-poly sphere. Performance difference is well-documented but the exact crossover depends on GPU. |
| A2 | R3F `onPointerMove` on `<points>` returns `e.index` for the hit point | Pattern 4 | If wrong, need custom raycaster setup. THREE.Points raycasting does return index in intersections. |
| A3 | Raycasting 58k points at 60fps is acceptable without spatial indexing | Pitfall 6 | If wrong, add octree (three-mesh-bvh). Fallback is throttling to 30fps raycasting. |
| A4 | shadcn/ui init with Tailwind v4 works correctly with Vite + React 18 | Pitfall 8 | If wrong, may need manual CSS variable setup or Tailwind v3 fallback. |
| A5 | t-SNE on 58k 150D vectors completes in under 5 minutes | Pitfall 5 | If wrong, reduce to a subset of vocabulary (top 30k by TF-IDF). Runs at build time so latency is tolerable. |
| A6 | Word-to-genre assignment (highest aggregate TF-IDF) produces visually meaningful genre clusters | Code Examples | If wrong, try majority-vote across books or allow multi-genre coloring. |
| A7 | Projection animation (lerping 58k x 3 floats per frame) runs at 60fps | Pattern 3 | If wrong, chunk updates across frames or reduce animation resolution. |

## Open Questions

1. **Word-to-genre mapping strategy**
   - What we know: Each word exists in the shared vocabulary. Each book has TF-IDF weights for its words. A word may appear in books of multiple genres.
   - What's unclear: How to assign a single "primary genre" color to each word.
   - Recommendation: Sum TF-IDF weights per genre across all books in that genre. Assign word to the genre with the highest sum. This is Claude's discretion per CONTEXT.md.

2. **Nearest neighbor computation for tooltip (VIZ-06)**
   - What we know: Tooltip shows top-5 nearest neighbors in embedding space.
   - What's unclear: Whether to pre-compute all pairwise similarities (58k x 58k = 3.3B pairs) or compute on-hover.
   - Recommendation: Pre-compute top-10 neighbors per word at build time using cosine similarity on the 150D vectors (using sklearn NearestNeighbors). Store as part of the scatter endpoint response. ~58k x 10 = 580k neighbor entries -- manageable in JSON.

3. **Uploaded book integration with scatter (CLASS-03)**
   - What we know: After classification, the uploaded book's word-points should appear in the scatter with amber highlight.
   - What's unclear: Whether uploaded words already in the vocabulary should be highlighted at their existing positions, or whether new OOV-excluded points should be added.
   - Recommendation: Highlight existing vocabulary words that appear in the uploaded book. The upload response should include the list of matched words and their indices in the vocabulary array. No new points are added (OOV words have no vectors).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend build | Yes | v24.14.1 | -- |
| npm | Package management | Yes | 11.11.0 | -- |
| Python 3 | Backend projections | Yes | 3.12.0 | -- |
| scikit-learn | PCA, KPCA, t-SNE | Yes | 1.6.1 | -- |
| umap-learn | UMAP projection | Yes | 0.5.12 | -- |
| Redis | WebSocket classify flow | Conditional | Unknown | Phase 2 already handles Redis-absent gracefully |
| gensim | Word2Vec model loading | Yes | 4.4.0 (in requirements.txt) | -- |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None. All required tools are available.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (backend) | pytest 8.0+ (already in requirements.txt) |
| Framework (frontend) | vitest (standard for Vite projects) |
| Config file (backend) | pytest.ini or pyproject.toml (existing) |
| Config file (frontend) | vitest.config.ts (Wave 0 -- create) |
| Quick run command (backend) | `pytest backend/api/tests/test_viz.py -x` |
| Quick run command (frontend) | `npx vitest run --reporter=verbose` |
| Full suite command | `pytest backend/ -x && cd frontend && npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-04 | Frontend builds and renders | smoke | `cd frontend && npm run build` | No -- Wave 0 |
| VIZ-01 | 58k points render without error | unit | `npx vitest run src/components/canvas/PointCloud.test.tsx` | No -- Wave 0 |
| VIZ-02 | Projection switch updates positions | unit | `npx vitest run src/hooks/useScatterData.test.ts` | No -- Wave 0 |
| VIZ-03 | TF-IDF brightness maps to opacity | unit | `npx vitest run src/components/canvas/PointCloud.test.tsx` | No -- Wave 0 |
| VIZ-04-05 | Genre/book selection triggers data fetch | unit | `npx vitest run src/hooks/useTfidfData.test.ts` | No -- Wave 0 |
| VIZ-06-07 | Hover/click state management | unit | `npx vitest run src/stores/visualizationStore.test.ts` | No -- Wave 0 |
| VIZ-08 | Camera reset action | unit | `npx vitest run src/components/canvas/CameraController.test.tsx` | No -- Wave 0 |
| VIZ-09 | 2D/3D toggle state | unit | `npx vitest run src/stores/visualizationStore.test.ts` | No -- Wave 0 |
| VIZ-10 | Word search filters points | unit | `npx vitest run src/components/sidebar/WordSearch.test.tsx` | No -- Wave 0 |
| VIZ-11 | Genre palette constant has 10 entries | unit | `npx vitest run src/constants/genres.test.ts` | No -- Wave 0 |
| CLASS-03 | Upload result highlights in scatter | integration | `npx vitest run src/hooks/useClassify.test.ts` | No -- Wave 0 |
| PARAM-01 | Instant controls update without debounce | unit | `npx vitest run src/stores/visualizationStore.test.ts` | No -- Wave 0 |
| PARAM-02 | Debounced controls wait 200ms | unit | `npx vitest run src/hooks/useDebounce.test.ts` | No -- Wave 0 |
| UX-04 | Keyboard shortcuts fire actions | unit | `npx vitest run src/hooks/useKeyboardShortcuts.test.ts` | No -- Wave 0 |
| Backend viz endpoints | GET /viz/scatter, /viz/tfidf | unit | `pytest backend/api/tests/test_viz.py -x` | No -- Wave 0 |
| Backend precompute | Projections computed correctly | unit | `pytest backend/pipeline/tests/test_precompute_viz.py -x` | No -- Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run` (frontend) + `pytest backend/api/tests/test_viz.py -x` (backend)
- **Per wave merge:** Full suite: `pytest backend/ -x && cd frontend && npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `frontend/vitest.config.ts` -- Vitest configuration for React + R3F
- [ ] `frontend/src/test/setup.ts` -- Test setup (jsdom, Three.js mocks)
- [ ] `backend/api/tests/test_viz.py` -- Tests for new viz endpoints
- [ ] `backend/pipeline/tests/test_precompute_viz.py` -- Tests for projection computation
- [ ] `frontend/package.json` dev dependencies: `vitest`, `@testing-library/react`, `jsdom`, `@vitest/coverage-v8`

**Note:** Three.js WebGL rendering cannot be tested in jsdom. Unit tests verify data flow (stores, hooks, API calls). Visual correctness requires manual browser testing.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth (REQUIREMENTS: no user accounts) |
| V3 Session Management | No | Stateless |
| V4 Access Control | No | Public API |
| V5 Input Validation | Yes | File upload validation (type, size) already in Phase 2 classify endpoint; new viz endpoints are read-only GET with path parameter validation |
| V6 Cryptography | No | No secrets in frontend |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via word tokens in tooltip | Tampering | React auto-escapes JSX; drei Html renders in React context |
| Large file upload DoS | Denial of Service | 5MB limit enforced in Phase 2 classify endpoint |
| Path traversal in projection param | Tampering | FastAPI path parameter validated against enum (pca/kpca/umap/tsne) |
| Malicious .txt content | Tampering | Server-side tokenization strips non-alpha; no eval/exec on content |

## Sources

### Primary (HIGH confidence)
- npm registry -- verified versions: react 18.3.1, @react-three/fiber 8.18.0, @react-three/drei 9.122.0, three 0.172.0, zustand 5.0.12, @tanstack/react-query 5.99.0, tailwindcss 4.2.2, vite 6.3.5, lucide-react 0.483.0
- pip -- verified: scikit-learn 1.6.1, umap-learn 0.5.12 (both installed)
- R3F v8.18.0 peerDependencies: react >=18 <19, three >=0.133 [VERIFIED: npm view]
- R3F v9.5.0 peerDependencies: react >=19 <19.3 [VERIFIED: npm view]
- drei 9.122.0 peerDependencies: @react-three/fiber ^8, react ^18 [VERIFIED: npm view]
- Existing codebase: backend/api/app.py, backend/pipeline/precompute.py, backend/cache/store.py, config/params.yaml, corpus/books.yaml
- Actual data: 57,818 vocabulary words, 150D vectors, 99 books, 10 genres [VERIFIED: Python inspection of data files]

### Secondary (MEDIUM confidence)
- [shadcn/ui Vite installation](https://ui.shadcn.com/docs/installation/vite) -- setup steps
- [R3F performance pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls) -- anti-patterns
- [Three.js InstancedMesh docs](https://threejs.org/docs/pages/InstancedMesh.html) -- setColorAt/setMatrixAt patterns
- [Three.js forum: Points vs InstancedMesh](https://discourse.threejs.org/t/better-performance-instanced-mesh-or-points/20293) -- performance comparison

### Tertiary (LOW confidence)
- t-SNE timing estimate for 58k points (A5) -- based on general knowledge, not benchmarked on this machine
- Raycasting performance for 58k Points (A3) -- needs runtime validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified against npm/pip registries; R3F v8/v9 React compatibility confirmed via peerDependencies
- Architecture: HIGH -- THREE.Points vs InstancedMesh comparison backed by official docs and community benchmarks; Zustand + R3F patterns from official pitfalls guide
- Pitfalls: HIGH -- React 18/R3F version mismatch confirmed; BufferAttribute.needsUpdate from Three.js docs; UMAP determinism from library docs
- Backend projections: HIGH -- scikit-learn and umap-learn both installed and verified; API pattern follows existing precompute.py

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable ecosystem, 30 days)
