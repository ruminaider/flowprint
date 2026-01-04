import { useCallback } from 'react'
import type { Node as RFNode } from '@xyflow/react'
import type { LaneBand } from '../layout/types'
import { NODE_HEIGHT } from '../layout/constants'

/**
 * Pure utility: determine which lane a y-position falls within.
 *
 * - If y is inside a lane band, returns that lane with snappedY centered.
 * - If y falls between two lane bands, snaps to the nearest lane.
 * - If y is outside all lane bands (above the topmost or below the bottommost),
 *   returns null (unassigned).
 */
export function snapToLane(
  y: number,
  lanes: LaneBand[],
): { laneId: string; snappedY: number } | null {
  if (lanes.length === 0) return null

  const sorted = [...lanes].sort((a, b) => a.y - b.y)

  // Check if y is above the first lane or below the last lane
  const first = sorted[0]!
  const last = sorted[sorted.length - 1]!

  if (y < first.y || y >= last.y + last.height) {
    return null
  }

  // Check if y is directly inside a lane band
  for (const lane of sorted) {
    if (y >= lane.y && y < lane.y + lane.height) {
      return {
        laneId: lane.laneId,
        snappedY: lane.y + (lane.height - NODE_HEIGHT) / 2,
      }
    }
  }

  // y is between two lane bands -- snap to the nearest one
  let bestLane: LaneBand | null = null
  let bestDistance = Infinity

  for (const lane of sorted) {
    const laneTop = lane.y
    const laneBottom = lane.y + lane.height
    const distToTop = Math.abs(y - laneTop)
    const distToBottom = Math.abs(y - laneBottom)
    const dist = Math.min(distToTop, distToBottom)

    if (dist < bestDistance) {
      bestDistance = dist
      bestLane = lane
    }
  }

  if (!bestLane) return null

  return {
    laneId: bestLane.laneId,
    snappedY: bestLane.y + (bestLane.height - NODE_HEIGHT) / 2,
  }
}

/**
 * React hook wrapper around snapToLane.
 * Returns an onNodeDragStop handler that uses node.position.y to determine the lane.
 */
export function useLaneSnap(lanes: LaneBand[]) {
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: RFNode): { laneId: string; snappedY: number } | null => {
      return snapToLane(node.position.y, lanes)
    },
    [lanes],
  )

  return { onNodeDragStop }
}
