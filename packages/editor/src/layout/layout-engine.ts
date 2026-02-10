import type { FlowprintDocument, Edge as SchemaEdge } from '@ruminaider/flowprint-schema'
import { topoSort, getEdges } from '@ruminaider/flowprint-schema'
import type { Node as RFNode, Edge as RFEdge } from '@xyflow/react'
import { MarkerType } from '@xyflow/react'
import type { LaneBand, LayoutResult } from './types'
import {
  LANE_LABEL_WIDTH,
  NODE_WIDTH,
  NODE_HEIGHT,
  NODE_HORIZONTAL_GAP,
  NODE_VERTICAL_GAP,
  LANE_PADDING_TOP,
  LANE_PADDING_BOTTOM,
  LANE_PADDING_LEFT,
  MIN_LANE_HEIGHT,
  getLaneColor,
  getLaneBorderColor,
} from './constants'

/**
 * Compute edges from a Flowprint document.
 *
 * Extracts all connections (next, cases[].next, error.catch, branches, join,
 * timeout_next) and converts them to React Flow edges.
 */
export function computeEdges(doc: FlowprintDocument): RFEdge[] {
  const schemaEdges = getEdges(doc)
  return schemaEdges.map((edge, index) => toReactFlowEdge(edge, index))
}

/**
 * Compute swim lane bands and the line of visibility position.
 *
 * Groups document lanes by order, calculates vertical extents based on how
 * many node rows each lane contains, and finds the external/internal boundary.
 */
export function computeLaneBands(
  doc: FlowprintDocument,
): { bands: LaneBand[]; lineOfVisibilityY: number | null } {
  const orderedNodes = topoSort(doc)

  // Sort lanes by order
  const sortedLanes = Object.entries(doc.lanes)
    .map(([id, lane]) => ({ id, ...lane }))
    .sort((a, b) => a.order - b.order)

  // Group nodes by lane
  const nodesByLane = new Map<string, typeof orderedNodes>()
  for (const lane of sortedLanes) {
    nodesByLane.set(lane.id, [])
  }
  for (const on of orderedNodes) {
    const laneNodes = nodesByLane.get(on.node.lane)
    if (laneNodes) {
      laneNodes.push(on)
    }
  }

  // Calculate how many nodes per layer per lane to determine lane heights
  const laneRowCounts = new Map<string, number>()
  for (const [laneId, nodes] of nodesByLane) {
    const layerCounts = new Map<number, number>()
    for (const n of nodes) {
      layerCounts.set(n.order, (layerCounts.get(n.order) ?? 0) + 1)
    }
    const maxRows = Math.max(...Array.from(layerCounts.values()), 1)
    laneRowCounts.set(laneId, maxRows)
  }

  // Calculate lane bands
  const bands: LaneBand[] = []
  let currentY = 0

  for (let i = 0; i < sortedLanes.length; i++) {
    const lane = sortedLanes[i]
    if (!lane) continue
    const rowCount = laneRowCounts.get(lane.id) ?? 1
    const contentHeight =
      LANE_PADDING_TOP +
      rowCount * NODE_HEIGHT +
      (rowCount - 1) * NODE_VERTICAL_GAP +
      LANE_PADDING_BOTTOM
    const laneHeight = Math.max(MIN_LANE_HEIGHT, contentHeight, lane.height ?? 0)

    bands.push({
      laneId: lane.id,
      label: lane.label,
      visibility: lane.visibility,
      order: lane.order,
      y: currentY,
      height: laneHeight,
      color: getLaneColor(i),
      borderColor: getLaneBorderColor(i),
    })

    currentY += laneHeight
  }

  // Calculate line of visibility
  let lineOfVisibilityY: number | null = null
  for (let i = 0; i < bands.length - 1; i++) {
    const currentLane = bands[i]
    const nextLane = bands[i + 1]
    if (!currentLane || !nextLane) continue
    if (currentLane.visibility === 'external' && nextLane.visibility === 'internal') {
      lineOfVisibilityY = currentLane.y + currentLane.height
      break
    }
  }

  return { bands, lineOfVisibilityY }
}

/**
 * Compute auto-layout positions for all nodes using topological sort.
 *
 * Returns a map from node ID to `{ x, y }` position in canvas space. Nodes
 * are placed left-to-right by topological layer and top-to-bottom within each
 * lane band.
 */
export function autoLayout(
  doc: FlowprintDocument,
  bands: LaneBand[],
): Map<string, { x: number; y: number }> {
  const orderedNodes = topoSort(doc)

  // Build lane lookup for positioning
  const laneBandMap = new Map<string, LaneBand>()
  for (const band of bands) {
    laneBandMap.set(band.laneId, band)
  }

  // Sort lanes by order for slot tracking
  const sortedLanes = Object.entries(doc.lanes)
    .map(([id, lane]) => ({ id, ...lane }))
    .sort((a, b) => a.order - b.order)

  // Track per-lane per-layer vertical slot index
  const laneLayerSlot = new Map<string, Map<number, number>>()
  for (const lane of sortedLanes) {
    laneLayerSlot.set(lane.id, new Map())
  }

  const positions = new Map<string, { x: number; y: number }>()
  for (const on of orderedNodes) {
    const band = laneBandMap.get(on.node.lane)
    if (!band) continue

    const layerSlots = laneLayerSlot.get(on.node.lane)
    if (!layerSlots) continue
    const slot = layerSlots.get(on.order) ?? 0
    layerSlots.set(on.order, slot + 1)

    const x = LANE_LABEL_WIDTH + LANE_PADDING_LEFT + on.order * (NODE_WIDTH + NODE_HORIZONTAL_GAP)
    const y = band.y + LANE_PADDING_TOP + slot * (NODE_HEIGHT + NODE_VERTICAL_GAP)

    positions.set(on.id, { x, y })
  }

  return positions
}

/**
 * Compute the visual layout for a Flowprint document.
 *
 * Compatibility wrapper that calls `computeLaneBands`, `autoLayout`, and
 * `computeEdges`, then assembles the full `LayoutResult` with React Flow
 * nodes, edges, lane bands, and canvas dimensions.
 *
 * @param doc - The Flowprint document to layout.
 * @returns Positioned nodes, edges, lane bands, and canvas dimensions.
 */
export function computeLayout(doc: FlowprintDocument): LayoutResult {
  const { bands, lineOfVisibilityY } = computeLaneBands(doc)
  const positions = autoLayout(doc, bands)
  const edges = computeEdges(doc)

  // Build lane lookup for node data enrichment
  const laneBandMap = new Map<string, LaneBand>()
  for (const band of bands) {
    laneBandMap.set(band.laneId, band)
  }

  // Convert positions + doc.nodes into React Flow Node[] format
  const orderedNodes = topoSort(doc)
  const rfNodes: RFNode[] = []
  for (const on of orderedNodes) {
    const pos = positions.get(on.id)
    if (!pos) continue
    const band = laneBandMap.get(on.node.lane)
    if (!band) continue

    rfNodes.push({
      id: on.id,
      type: on.node.type,
      position: pos,
      data: {
        label: on.node.label,
        nodeData: on.node,
        laneColor: band.borderColor,
      },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })
  }

  // Calculate canvas dimensions
  const maxOrder = Math.max(...orderedNodes.map((n) => n.order), 0)
  const columnCount = maxOrder + 1
  const totalWidth =
    LANE_LABEL_WIDTH + LANE_PADDING_LEFT + columnCount * (NODE_WIDTH + NODE_HORIZONTAL_GAP)
  const totalHeight = bands.reduce((sum, b) => sum + b.height, 0)

  return {
    nodes: rfNodes,
    edges,
    lanes: bands,
    lineOfVisibilityY,
    width: totalWidth,
    height: totalHeight,
  }
}

function toReactFlowEdge(edge: SchemaEdge, index: number): RFEdge {
  const id = `e-${edge.source}-${edge.target}-${String(index)}`

  switch (edge.type) {
    case 'error':
      return {
        id,
        source: edge.source,
        target: edge.target,
        type: 'error',
        label: edge.label,
        data: { edgeType: 'error' },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--fp-edge-error)' },
      }
    case 'default':
      return {
        id,
        source: edge.source,
        target: edge.target,
        type: 'default',
        label: edge.label ?? 'default',
        data: { edgeType: 'default' },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--fp-edge-default)' },
      }
    default:
      return {
        id,
        source: edge.source,
        target: edge.target,
        type: 'normal',
        label: edge.label,
        data: { edgeType: 'normal' },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--fp-edge-normal)' },
      }
  }
}
