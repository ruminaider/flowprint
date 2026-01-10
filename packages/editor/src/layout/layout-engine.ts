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

export function computeLayout(doc: FlowprintDocument): LayoutResult {
  const orderedNodes = topoSort(doc)
  const schemaEdges = getEdges(doc)

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

  // Calculate horizontal positions based on topological order
  const maxOrder = Math.max(...orderedNodes.map((n) => n.order), 0)
  const columnCount = maxOrder + 1

  // Calculate how many nodes per layer per lane to determine lane heights
  const laneRowCounts = new Map<string, number>()
  for (const [laneId, nodes] of nodesByLane) {
    // Count max nodes at any single topological layer within this lane
    const layerCounts = new Map<number, number>()
    for (const n of nodes) {
      layerCounts.set(n.order, (layerCounts.get(n.order) ?? 0) + 1)
    }
    const maxRows = Math.max(...Array.from(layerCounts.values()), 1)
    laneRowCounts.set(laneId, maxRows)
  }

  // Calculate lane bands
  const lanes: LaneBand[] = []
  let currentY = 0

  for (let i = 0; i < sortedLanes.length; i++) {
    const lane = sortedLanes[i]
    if (!lane) continue
    const rowCount = laneRowCounts.get(lane.id) ?? 1
    const laneHeight = Math.max(
      MIN_LANE_HEIGHT,
      LANE_PADDING_TOP +
        rowCount * NODE_HEIGHT +
        (rowCount - 1) * NODE_VERTICAL_GAP +
        LANE_PADDING_BOTTOM,
    )

    lanes.push({
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
  for (let i = 0; i < lanes.length - 1; i++) {
    const currentLane = lanes[i]
    const nextLane = lanes[i + 1]
    if (!currentLane || !nextLane) continue
    if (currentLane.visibility === 'external' && nextLane.visibility === 'internal') {
      lineOfVisibilityY = currentLane.y + currentLane.height
      break
    }
  }

  // Build lane lookup for positioning
  const laneBandMap = new Map<string, LaneBand>()
  for (const lane of lanes) {
    laneBandMap.set(lane.laneId, lane)
  }

  // Position nodes within their lanes
  // Track per-lane per-layer vertical slot index
  const laneLayerSlot = new Map<string, Map<number, number>>()
  for (const lane of sortedLanes) {
    laneLayerSlot.set(lane.id, new Map())
  }

  const rfNodes: RFNode[] = []
  for (const on of orderedNodes) {
    const band = laneBandMap.get(on.node.lane)
    if (!band) continue

    const layerSlots = laneLayerSlot.get(on.node.lane)
    if (!layerSlots) continue
    const slot = layerSlots.get(on.order) ?? 0
    layerSlots.set(on.order, slot + 1)

    const x = LANE_LABEL_WIDTH + LANE_PADDING_LEFT + on.order * (NODE_WIDTH + NODE_HORIZONTAL_GAP)
    const y = band.y + LANE_PADDING_TOP + slot * (NODE_HEIGHT + NODE_VERTICAL_GAP)

    rfNodes.push({
      id: on.id,
      type: on.node.type,
      position: { x, y },
      data: {
        label: on.node.label,
        nodeData: on.node,
        laneColor: band.borderColor,
      },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })
  }

  // Convert schema edges to React Flow edges
  const rfEdges: RFEdge[] = schemaEdges.map((edge, index) => toReactFlowEdge(edge, index))

  const totalWidth =
    LANE_LABEL_WIDTH + LANE_PADDING_LEFT + columnCount * (NODE_WIDTH + NODE_HORIZONTAL_GAP)
  const totalHeight = currentY

  return {
    nodes: rfNodes,
    edges: rfEdges,
    lanes,
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
        markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
      }
    case 'default':
      return {
        id,
        source: edge.source,
        target: edge.target,
        type: 'default',
        label: edge.label ?? 'default',
        data: { edgeType: 'default' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
      }
    default:
      return {
        id,
        source: edge.source,
        target: edge.target,
        type: 'normal',
        label: edge.label,
        data: { edgeType: 'normal' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
      }
  }
}
