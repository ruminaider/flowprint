import type { Node, Edge, Connection } from '@xyflow/react'

export function isValidConnection(
  connection: Connection,
  nodes: Node[],
  edges: Edge[],
): boolean {
  const { source, target } = connection
  if (!source || !target) return false

  // No self-connections
  if (source === target) return false

  // No duplicate edges (same source+target)
  if (edges.some((e) => e.source === source && e.target === target))
    return false

  // Cycle detection (DFS from target back to source)
  if (wouldCreateCycle(source, target, edges)) return false

  return true
}

function wouldCreateCycle(
  source: string,
  target: string,
  edges: Edge[],
): boolean {
  // Check if there is already a path from target to source via existing edges.
  // If so, adding source->target would create a cycle.
  const visited = new Set<string>()
  const stack = [target]

  // Build adjacency list from existing edges
  const adjacency = new Map<string, string[]>()
  for (const edge of edges) {
    const neighbors = adjacency.get(edge.source) ?? []
    neighbors.push(edge.target)
    adjacency.set(edge.source, neighbors)
  }

  while (stack.length > 0) {
    const current = stack.pop()!
    if (current === source) return true
    if (visited.has(current)) continue
    visited.add(current)

    const neighbors = adjacency.get(current) ?? []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        stack.push(neighbor)
      }
    }
  }

  return false
}
