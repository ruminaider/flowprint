import type {
  FlowprintDocument,
  OrderedNode,
  Edge,
} from './types.js'

/**
 * Extract all edges from a Flowprint document's node definitions.
 *
 * Edge type mapping:
 * - `next` → normal
 * - `error.catch` → error
 * - `default` → default
 * - `cases[].next` → normal (label from `when`)
 * - `branches[]` → normal
 * - `join` → normal
 * - `timeout_next` → normal
 */
export function getEdges(doc: FlowprintDocument): Edge[] {
  const edges: Edge[] = []

  for (const [nodeId, node] of Object.entries(doc.nodes)) {
    switch (node.type) {
      case 'action': {
        if (node.next) {
          edges.push({ source: nodeId, target: node.next, type: 'normal' })
        }
        if (node.error?.catch) {
          edges.push({ source: nodeId, target: node.error.catch, type: 'error' })
        }
        break
      }

      case 'switch': {
        for (const c of node.cases) {
          edges.push({ source: nodeId, target: c.next, label: c.when, type: 'normal' })
        }
        if (node.default) {
          edges.push({ source: nodeId, target: node.default, type: 'default' })
        }
        break
      }

      case 'parallel': {
        for (const branch of node.branches) {
          edges.push({ source: nodeId, target: branch, type: 'normal' })
        }
        edges.push({ source: nodeId, target: node.join, type: 'normal' })
        break
      }

      case 'wait': {
        if (node.next) {
          edges.push({ source: nodeId, target: node.next, type: 'normal' })
        }
        if (node.timeout_next) {
          edges.push({ source: nodeId, target: node.timeout_next, type: 'normal' })
        }
        break
      }

      case 'error': {
        if (node.next) {
          edges.push({ source: nodeId, target: node.next, type: 'normal' })
        }
        break
      }

      case 'terminal': {
        // Terminal nodes have no outgoing edges
        break
      }
    }
  }

  return edges
}

/**
 * Find root nodes — nodes with zero in-degree (no incoming edges).
 * These are the entry points of the blueprint graph.
 */
export function findRoots(doc: FlowprintDocument): string[] {
  const allNodeIds = new Set(Object.keys(doc.nodes))
  const hasIncoming = new Set<string>()

  const edges = getEdges(doc)
  for (const edge of edges) {
    hasIncoming.add(edge.target)
  }

  const roots: string[] = []
  for (const nodeId of allNodeIds) {
    if (!hasIncoming.has(nodeId)) {
      roots.push(nodeId)
    }
  }

  return roots
}

/**
 * Topological sort using Kahn's algorithm with layer-based ordering.
 * Returns `OrderedNode[]` where `order` is the topological layer
 * (0 = root nodes, 1 = their immediate successors, etc.).
 *
 * Handles multi-root graphs. Throws if the graph contains cycles.
 */
export function topoSort(doc: FlowprintDocument): OrderedNode[] {
  const nodeIds = Object.keys(doc.nodes)
  const edges = getEdges(doc)

  // Build adjacency list and in-degree map
  const adjacency = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  for (const nodeId of nodeIds) {
    adjacency.set(nodeId, [])
    inDegree.set(nodeId, 0)
  }

  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
  }

  // Kahn's algorithm with layer tracking
  let queue: string[] = []
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId)
    }
  }

  const result: OrderedNode[] = []
  let layer = 0

  while (queue.length > 0) {
    const nextQueue: string[] = []

    for (const nodeId of queue) {
      const node = doc.nodes[nodeId]
      if (node) {
        result.push({ id: nodeId, node, order: layer })
      }

      const neighbors = adjacency.get(nodeId) ?? []
      for (const neighbor of neighbors) {
        const current = inDegree.get(neighbor) ?? 0
        inDegree.set(neighbor, current - 1)
        if (current - 1 === 0) {
          nextQueue.push(neighbor)
        }
      }
    }

    queue = nextQueue
    layer++
  }

  // If not all nodes were processed, the graph has cycles
  if (result.length !== nodeIds.length) {
    throw new Error('Graph contains cycles — cannot perform topological sort')
  }

  return result
}

/**
 * Detect cycles in the blueprint graph using DFS.
 * Returns arrays of node IDs forming cycles, or `null` if the graph is acyclic.
 */
export function detectCycles(doc: FlowprintDocument): string[][] | null {
  const nodeIds = Object.keys(doc.nodes)
  const edges = getEdges(doc)

  // Build adjacency list
  const adjacency = new Map<string, string[]>()
  for (const nodeId of nodeIds) {
    adjacency.set(nodeId, [])
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target)
  }

  const WHITE = 0 // unvisited
  const GRAY = 1  // in current DFS path
  const BLACK = 2 // fully processed

  const color = new Map<string, number>()
  const parent = new Map<string, string | null>()
  for (const nodeId of nodeIds) {
    color.set(nodeId, WHITE)
    parent.set(nodeId, null)
  }

  const cycles: string[][] = []

  function dfs(nodeId: string): void {
    color.set(nodeId, GRAY)

    const neighbors = adjacency.get(nodeId) ?? []
    for (const neighbor of neighbors) {
      const neighborColor = color.get(neighbor)

      if (neighborColor === GRAY) {
        // Found a cycle — reconstruct it
        const cycle: string[] = [neighbor]
        let current = nodeId
        while (current !== neighbor) {
          cycle.push(current)
          current = parent.get(current) ?? ''
        }
        cycle.reverse()
        cycles.push(cycle)
      } else if (neighborColor === WHITE) {
        parent.set(neighbor, nodeId)
        dfs(neighbor)
      }
    }

    color.set(nodeId, BLACK)
  }

  for (const nodeId of nodeIds) {
    if (color.get(nodeId) === WHITE) {
      dfs(nodeId)
    }
  }

  return cycles.length > 0 ? cycles : null
}
