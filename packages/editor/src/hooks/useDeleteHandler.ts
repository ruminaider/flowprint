import { useCallback, useState } from 'react'
import type { Node, Edge } from '@xyflow/react'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { getEdges } from '@ruminaider/flowprint-schema'
import type { UseFlowprintStateReturn } from './useFlowprintState'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PendingDeletion {
  type: 'node'
  id: string
  connectionCount: number
}

export interface UseDeleteHandlerReturn {
  onNodesDelete: (nodes: Node[]) => void
  onEdgesDelete: (edges: Edge[]) => void
  pendingDeletion: PendingDeletion | null
  confirmDeletion: () => void
  cancelDeletion: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Count the total connections (incoming + outgoing) for a given node ID
 * using the schema-level edge extraction.
 */
function countConnections(doc: FlowprintDocument, nodeId: string): number {
  const edges = getEdges(doc)
  let count = 0
  for (const edge of edges) {
    if (edge.source === nodeId || edge.target === nodeId) {
      count++
    }
  }
  return count
}

/**
 * Parse a React Flow edge ID in the format `e-{source}-{target}-{index}`
 * and return { source, target }. Returns null if the format is unrecognised.
 */
function parseEdgeId(edgeId: string): { source: string; target: string } | null {
  const match = edgeId.match(/^e-(.+)-(.+)-\d+$/)
  if (!match) return null
  return { source: match[1]!, target: match[2]! }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDeleteHandler(
  state: UseFlowprintStateReturn,
  doc: FlowprintDocument,
): UseDeleteHandlerReturn {
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null)

  const onNodesDelete = useCallback(
    (nodes: Node[]) => {
      for (const node of nodes) {
        const connectionCount = countConnections(doc, node.id)
        if (connectionCount >= 3) {
          setPendingDeletion({ type: 'node', id: node.id, connectionCount })
        } else {
          state.removeNode(node.id)
        }
      }
    },
    [doc, state],
  )

  const onEdgesDelete = useCallback(
    (edges: Edge[]) => {
      for (const edge of edges) {
        const parsed = parseEdgeId(edge.id)
        if (parsed) {
          state.disconnectNodes(parsed.source, parsed.target)
        }
      }
    },
    [state],
  )

  const confirmDeletion = useCallback(() => {
    if (pendingDeletion) {
      state.removeNode(pendingDeletion.id)
      setPendingDeletion(null)
    }
  }, [pendingDeletion, state])

  const cancelDeletion = useCallback(() => {
    setPendingDeletion(null)
  }, [])

  return {
    onNodesDelete,
    onEdgesDelete,
    pendingDeletion,
    confirmDeletion,
    cancelDeletion,
  }
}
