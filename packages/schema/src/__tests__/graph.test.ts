import { describe, it, expect } from 'vitest'
import { getEdges, findRoots, topoSort, detectCycles } from '../graph.js'
import type { FlowprintDocument } from '../types.js'

/**
 * Minimal helper to build a FlowprintDocument with the given nodes.
 * All nodes default to lane "main".
 */
function makeDoc(nodes: FlowprintDocument['nodes']): FlowprintDocument {
  return {
    schema: 'flowprint/1.0',
    name: 'test-blueprint',
    version: '1.0.0',
    lanes: {
      main: { label: 'Main', visibility: 'internal', order: 0 },
    },
    nodes,
  }
}

// ---------------------------------------------------------------------------
// getEdges
// ---------------------------------------------------------------------------

describe('getEdges', () => {
  it('extracts normal edges from action.next', () => {
    const doc = makeDoc({
      a: { type: 'action', lane: 'main', label: 'A', next: 'b' },
      b: { type: 'terminal', lane: 'main', label: 'B', outcome: 'success' },
    })
    const edges = getEdges(doc)
    expect(edges).toEqual([{ source: 'a', target: 'b', type: 'normal' }])
  })

  it('extracts error edges from action.error.catch', () => {
    const doc = makeDoc({
      a: { type: 'action', lane: 'main', label: 'A', next: 'b', error: { catch: 'err' } },
      b: { type: 'terminal', lane: 'main', label: 'B', outcome: 'success' },
      err: { type: 'error', lane: 'main', label: 'Error' },
    })
    const edges = getEdges(doc)
    expect(edges).toContainEqual({ source: 'a', target: 'b', type: 'normal' })
    expect(edges).toContainEqual({ source: 'a', target: 'err', type: 'error' })
  })

  it('extracts labeled case edges from switch nodes', () => {
    const doc = makeDoc({
      sw: {
        type: 'switch',
        lane: 'main',
        label: 'Switch',
        cases: [
          { when: 'yes', next: 'a' },
          { when: 'no', next: 'b' },
        ],
        default: 'c',
      },
      a: { type: 'terminal', lane: 'main', label: 'A', outcome: 'success' },
      b: { type: 'terminal', lane: 'main', label: 'B', outcome: 'failure' },
      c: { type: 'terminal', lane: 'main', label: 'C', outcome: 'success' },
    })
    const edges = getEdges(doc)
    expect(edges).toContainEqual({ source: 'sw', target: 'a', label: 'yes', type: 'normal' })
    expect(edges).toContainEqual({ source: 'sw', target: 'b', label: 'no', type: 'normal' })
    expect(edges).toContainEqual({ source: 'sw', target: 'c', type: 'default' })
  })

  it('extracts branch and join edges from parallel nodes', () => {
    const doc = makeDoc({
      p: {
        type: 'parallel',
        lane: 'main',
        label: 'Parallel',
        branches: ['a', 'b'],
        join: 'c',
      },
      a: { type: 'action', lane: 'main', label: 'A', next: 'c' },
      b: { type: 'action', lane: 'main', label: 'B', next: 'c' },
      c: { type: 'terminal', lane: 'main', label: 'C', outcome: 'success' },
    })
    const edges = getEdges(doc)
    expect(edges).toContainEqual({ source: 'p', target: 'a', type: 'normal' })
    expect(edges).toContainEqual({ source: 'p', target: 'b', type: 'normal' })
    expect(edges).toContainEqual({ source: 'p', target: 'c', type: 'normal' })
  })

  it('extracts next and timeout_next edges from wait nodes', () => {
    const doc = makeDoc({
      w: {
        type: 'wait',
        lane: 'main',
        label: 'Wait',
        event: 'payment.received',
        timeout: '24h',
        next: 'a',
        timeout_next: 'b',
      },
      a: { type: 'terminal', lane: 'main', label: 'A', outcome: 'success' },
      b: { type: 'terminal', lane: 'main', label: 'B', outcome: 'failure' },
    })
    const edges = getEdges(doc)
    expect(edges).toContainEqual({ source: 'w', target: 'a', type: 'normal' })
    expect(edges).toContainEqual({ source: 'w', target: 'b', type: 'normal' })
  })

  it('extracts next edge from error nodes', () => {
    const doc = makeDoc({
      e: { type: 'error', lane: 'main', label: 'Error', next: 'a' },
      a: { type: 'terminal', lane: 'main', label: 'A', outcome: 'failure' },
    })
    const edges = getEdges(doc)
    expect(edges).toEqual([{ source: 'e', target: 'a', type: 'normal' }])
  })

  it('returns empty array for terminal-only graph', () => {
    const doc = makeDoc({
      done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
    })
    expect(getEdges(doc)).toEqual([])
  })

  it('handles action node without next (no outgoing edges)', () => {
    const doc = makeDoc({
      a: { type: 'action', lane: 'main', label: 'A' },
    })
    expect(getEdges(doc)).toEqual([])
  })

  it('handles action with error.retry but no error.catch', () => {
    const doc = makeDoc({
      a: { type: 'action', lane: 'main', label: 'A', next: 'b', error: { retry: { limit: 3 } } },
      b: { type: 'terminal', lane: 'main', label: 'B', outcome: 'success' },
    })
    const edges = getEdges(doc)
    expect(edges).toEqual([{ source: 'a', target: 'b', type: 'normal' }])
  })
})

// ---------------------------------------------------------------------------
// findRoots
// ---------------------------------------------------------------------------

describe('findRoots', () => {
  it('finds root nodes with zero in-degree', () => {
    const doc = makeDoc({
      a: { type: 'action', lane: 'main', label: 'A', next: 'b' },
      b: { type: 'action', lane: 'main', label: 'B', next: 'c' },
      c: { type: 'terminal', lane: 'main', label: 'C', outcome: 'success' },
    })
    expect(findRoots(doc)).toEqual(['a'])
  })

  it('finds multiple roots in a multi-root graph', () => {
    const doc = makeDoc({
      a: { type: 'action', lane: 'main', label: 'A', next: 'c' },
      b: { type: 'action', lane: 'main', label: 'B', next: 'c' },
      c: { type: 'terminal', lane: 'main', label: 'C', outcome: 'success' },
    })
    const roots = findRoots(doc)
    expect(roots).toContain('a')
    expect(roots).toContain('b')
    expect(roots).toHaveLength(2)
  })

  it('returns all nodes if none have incoming edges (disconnected)', () => {
    const doc = makeDoc({
      a: { type: 'terminal', lane: 'main', label: 'A', outcome: 'success' },
      b: { type: 'terminal', lane: 'main', label: 'B', outcome: 'success' },
    })
    const roots = findRoots(doc)
    expect(roots).toContain('a')
    expect(roots).toContain('b')
    expect(roots).toHaveLength(2)
  })

  it('returns empty array when all nodes have incoming edges (cyclic graph)', () => {
    const doc = makeDoc({
      a: { type: 'action', lane: 'main', label: 'A', next: 'b' },
      b: { type: 'action', lane: 'main', label: 'B', next: 'a' },
    })
    expect(findRoots(doc)).toEqual([])
  })

  it('finds root in a switch graph', () => {
    const doc = makeDoc({
      sw: {
        type: 'switch',
        lane: 'main',
        label: 'Switch',
        cases: [{ when: 'yes', next: 'a' }],
        default: 'b',
      },
      a: { type: 'terminal', lane: 'main', label: 'A', outcome: 'success' },
      b: { type: 'terminal', lane: 'main', label: 'B', outcome: 'failure' },
    })
    expect(findRoots(doc)).toEqual(['sw'])
  })
})

// ---------------------------------------------------------------------------
// topoSort
// ---------------------------------------------------------------------------

describe('topoSort', () => {
  it('sorts a linear graph', () => {
    const doc = makeDoc({
      a: { type: 'action', lane: 'main', label: 'A', next: 'b' },
      b: { type: 'action', lane: 'main', label: 'B', next: 'c' },
      c: { type: 'terminal', lane: 'main', label: 'C', outcome: 'success' },
    })
    const result = topoSort(doc)
    expect(result).toHaveLength(3)
    expect(result[0]?.id).toBe('a')
    expect(result[0]?.order).toBe(0)
    expect(result[1]?.id).toBe('b')
    expect(result[1]?.order).toBe(1)
    expect(result[2]?.id).toBe('c')
    expect(result[2]?.order).toBe(2)
  })

  it('assigns layer 0 to all roots in a multi-root graph', () => {
    const doc = makeDoc({
      root1: { type: 'action', lane: 'main', label: 'R1', next: 'merge' },
      root2: { type: 'action', lane: 'main', label: 'R2', next: 'merge' },
      merge: { type: 'terminal', lane: 'main', label: 'Merge', outcome: 'success' },
    })
    const result = topoSort(doc)
    const rootNodes = result.filter((n) => n.order === 0)
    expect(rootNodes).toHaveLength(2)
    const rootIds = rootNodes.map((n) => n.id)
    expect(rootIds).toContain('root1')
    expect(rootIds).toContain('root2')

    const mergeNode = result.find((n) => n.id === 'merge')
    expect(mergeNode?.order).toBe(1)
  })

  it('assigns correct layers for a diamond graph', () => {
    const doc = makeDoc({
      start: {
        type: 'parallel',
        lane: 'main',
        label: 'Start',
        branches: ['left', 'right'],
        join: 'end',
      },
      left: { type: 'action', lane: 'main', label: 'Left', next: 'end' },
      right: { type: 'action', lane: 'main', label: 'Right', next: 'end' },
      end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
    })
    const result = topoSort(doc)
    const startNode = result.find((n) => n.id === 'start')
    const leftNode = result.find((n) => n.id === 'left')
    const rightNode = result.find((n) => n.id === 'right')
    const endNode = result.find((n) => n.id === 'end')

    expect(startNode?.order).toBe(0)
    expect(leftNode?.order).toBe(1)
    expect(rightNode?.order).toBe(1)
    expect(endNode?.order).toBe(2)
  })

  it('includes node references in result', () => {
    const nodeA = { type: 'action' as const, lane: 'main', label: 'A' }
    const doc = makeDoc({ a: nodeA })
    const result = topoSort(doc)
    expect(result[0]?.node).toBe(nodeA)
  })

  it('throws on cyclic graph', () => {
    const doc = makeDoc({
      a: { type: 'action', lane: 'main', label: 'A', next: 'b' },
      b: { type: 'action', lane: 'main', label: 'B', next: 'a' },
    })
    expect(() => topoSort(doc)).toThrow(/cycle/i)
  })

  it('handles a single node', () => {
    const doc = makeDoc({
      only: { type: 'terminal', lane: 'main', label: 'Only', outcome: 'success' },
    })
    const result = topoSort(doc)
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('only')
    expect(result[0]?.order).toBe(0)
  })

  it('handles switch with multiple branches at different depths', () => {
    const doc = makeDoc({
      sw: {
        type: 'switch',
        lane: 'main',
        label: 'Switch',
        cases: [
          { when: 'fast', next: 'done' },
          { when: 'slow', next: 'extra' },
        ],
      },
      extra: { type: 'action', lane: 'main', label: 'Extra', next: 'done' },
      done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
    })
    const result = topoSort(doc)
    const swNode = result.find((n) => n.id === 'sw')
    const extraNode = result.find((n) => n.id === 'extra')
    const doneNode = result.find((n) => n.id === 'done')

    expect(swNode?.order).toBe(0)
    expect(extraNode?.order).toBe(1)
    expect(doneNode?.order).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// detectCycles
// ---------------------------------------------------------------------------

describe('detectCycles', () => {
  it('returns null for an acyclic graph', () => {
    const doc = makeDoc({
      a: { type: 'action', lane: 'main', label: 'A', next: 'b' },
      b: { type: 'terminal', lane: 'main', label: 'B', outcome: 'success' },
    })
    expect(detectCycles(doc)).toBeNull()
  })

  it('detects a simple two-node cycle', () => {
    const doc = makeDoc({
      a: { type: 'action', lane: 'main', label: 'A', next: 'b' },
      b: { type: 'action', lane: 'main', label: 'B', next: 'a' },
    })
    const cycles = detectCycles(doc)
    expect(cycles).not.toBeNull()
    expect(cycles).toHaveLength(1)
    const cycle0 = cycles?.[0]
    expect(cycle0).toContain('a')
    expect(cycle0).toContain('b')
  })

  it('detects a self-loop', () => {
    const doc = makeDoc({
      a: { type: 'action', lane: 'main', label: 'A', next: 'a' },
    })
    const cycles = detectCycles(doc)
    expect(cycles).not.toBeNull()
    expect(cycles?.length).toBeGreaterThanOrEqual(1)
    expect(cycles?.[0]).toContain('a')
  })

  it('detects a three-node cycle', () => {
    const doc = makeDoc({
      a: { type: 'action', lane: 'main', label: 'A', next: 'b' },
      b: { type: 'action', lane: 'main', label: 'B', next: 'c' },
      c: { type: 'action', lane: 'main', label: 'C', next: 'a' },
    })
    const cycles = detectCycles(doc)
    expect(cycles).not.toBeNull()
    expect(cycles?.length).toBeGreaterThanOrEqual(1)
    const cycle = cycles?.[0]
    expect(cycle).toContain('a')
    expect(cycle).toContain('b')
    expect(cycle).toContain('c')
  })

  it('returns null for a graph with only terminal nodes', () => {
    const doc = makeDoc({
      done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
    })
    expect(detectCycles(doc)).toBeNull()
  })

  it('returns null for a diamond graph (no cycles)', () => {
    const doc = makeDoc({
      start: {
        type: 'switch',
        lane: 'main',
        label: 'Start',
        cases: [
          { when: 'left', next: 'a' },
          { when: 'right', next: 'b' },
        ],
      },
      a: { type: 'action', lane: 'main', label: 'A', next: 'end' },
      b: { type: 'action', lane: 'main', label: 'B', next: 'end' },
      end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
    })
    expect(detectCycles(doc)).toBeNull()
  })

  it('detects cycle through error.catch edge', () => {
    const doc = makeDoc({
      a: { type: 'action', lane: 'main', label: 'A', next: 'b', error: { catch: 'b' } },
      b: { type: 'error', lane: 'main', label: 'Error', next: 'a' },
    })
    const cycles = detectCycles(doc)
    expect(cycles).not.toBeNull()
    expect(cycles?.length).toBeGreaterThanOrEqual(1)
  })
})
