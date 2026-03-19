import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import type { DataClassification } from './types.js'

/**
 * Resolve effective data classifications for a node.
 *
 * Node-level classifications take precedence. When a node has no
 * explicit `data_class`, the lane's `data_class` is inherited.
 * If neither node nor lane declares classifications, returns an empty array.
 */
export function resolveClassifications(
  nodeId: string,
  doc: FlowprintDocument,
): DataClassification[] {
  const node = doc.nodes[nodeId]
  if (!node) return []

  // Node-level classifications override lane-level
  const nodeClass = node.data_class as DataClassification[] | undefined
  if (nodeClass && nodeClass.length > 0) {
    return nodeClass
  }

  // Inherit from lane
  const lane = doc.lanes?.[node.lane]
  const laneClass = lane?.data_class as DataClassification[] | undefined
  if (laneClass && laneClass.length > 0) {
    return laneClass
  }

  return []
}
