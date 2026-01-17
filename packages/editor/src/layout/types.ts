import type { Node as RFNode, Edge as RFEdge } from '@xyflow/react'

/**
 * Computed geometry for a single swim lane in the layout.
 *
 * Used by {@link LaneBackground} to render the colored lane bands behind the
 * node graph, and by {@link useLaneSnap} to snap dragged nodes to their lane.
 */
export interface LaneBand {
  /** Lane identifier from the document */
  laneId: string
  /** Human-readable lane label */
  label: string
  /** Whether this lane is customer-facing or internal */
  visibility: 'external' | 'internal'
  /** Sort order (0-based) */
  order: number
  /** Top y-coordinate of this lane band in canvas space */
  y: number
  /** Height of this lane band in pixels */
  height: number
  /** Background fill color */
  color: string
  /** Border/separator color */
  borderColor: string
}

/**
 * Complete layout computation result for a Flowprint document.
 *
 * Produced by {@link computeLayout} and consumed by the React Flow renderer.
 */
export interface LayoutResult {
  /** Positioned React Flow nodes */
  nodes: RFNode[]
  /** React Flow edges derived from node connections */
  edges: RFEdge[]
  /** Computed lane bands for the background layer */
  lanes: LaneBand[]
  /** Y-coordinate of the line of visibility separator, or `null` if not applicable */
  lineOfVisibilityY: number | null
  /** Total canvas width in pixels */
  width: number
  /** Total canvas height in pixels */
  height: number
}
