import { useCallback, useState } from 'react'
import type { Node as RFNode } from '@xyflow/react'
import type { LaneBand } from '../layout/types'
import { NODE_HEIGHT } from '../layout/constants'
import type { UseFlowprintStateReturn } from './useFlowprintState'

/**
 * Pure utility: determine which lane a node's center-point falls within.
 *
 * Uses the node's vertical center (y + height/2) to find the containing lane.
 * Returns the lane ID, or null if outside all lanes.
 */
export function detectLane(
  nodeY: number,
  nodeHeight: number,
  lanes: LaneBand[],
): string | null {
  if (lanes.length === 0) return null
  const centerY = nodeY + nodeHeight / 2
  for (const lane of lanes) {
    if (centerY >= lane.y && centerY < lane.y + lane.height) {
      return lane.laneId
    }
  }
  return null
}

export interface UseLaneDragReturn {
  onNodeDrag: (_event: React.MouseEvent, node: RFNode) => void
  onNodeDragStop: (_event: React.MouseEvent, node: RFNode) => void
  highlightedLaneId: string | null
}

/**
 * React hook that provides drag interaction with lane snapping.
 *
 * - `onNodeDrag`: detects which lane the node center is over and sets highlight
 * - `onNodeDragStop`: persists position, updates lane if changed, clears highlight
 */
export function useLaneDrag(
  state: UseFlowprintStateReturn,
  lanes: LaneBand[],
): UseLaneDragReturn {
  const [highlightedLaneId, setHighlightedLaneId] = useState<string | null>(null)

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, node: RFNode) => {
      const laneId = detectLane(node.position.y, node.height ?? NODE_HEIGHT, lanes)
      setHighlightedLaneId(laneId)
    },
    [lanes],
  )

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: RFNode) => {
      setHighlightedLaneId(null)

      const nodeHeight = node.height ?? NODE_HEIGHT
      const currentNode = state.doc.nodes[node.id]
      const targetLaneId = detectLane(node.position.y, nodeHeight, lanes)

      const laneChanged = targetLaneId != null && currentNode != null && currentNode.lane !== targetLaneId

      let finalY = node.position.y

      if (laneChanged) {
        // Crossed into a different lane — clamp to stay within the new lane bounds
        const targetLane = lanes.find((l) => l.laneId === targetLaneId)
        if (targetLane) {
          const minY = targetLane.y
          const maxY = targetLane.y + targetLane.height - nodeHeight
          finalY = Math.max(minY, Math.min(finalY, maxY))
        }
      }

      // Persist position (free within same lane, clamped when crossing)
      state.updateNodePosition(node.id, { x: node.position.x, y: finalY })

      // Update lane assignment if changed
      if (laneChanged && targetLaneId) {
        state.updateNode(node.id, { lane: targetLaneId })
      }
    },
    [state, lanes],
  )

  return { onNodeDrag, onNodeDragStop, highlightedLaneId }
}
