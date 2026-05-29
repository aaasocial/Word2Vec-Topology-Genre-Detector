// Reading Room — Topology panel (Phase 12, 12-05).
//
// The Phase 10 dual-panel container (heatmap | VR) is superseded by the
// reading-room Topology *screen* (`components/screens/Topology.tsx`), which owns
// the header (title + Region chips + projection chips), the 1.5fr hero + 300px
// side column, the empty state, and the N-D disclaimer. This module re-exports
// that screen as `TopologyPanel` so any residual importer renders the new body.

export { Topology as TopologyPanel } from '@/components/screens/Topology'
