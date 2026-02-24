import { describe, it, expect } from 'vitest'
import { isValidConnection } from '../useConnectionValidator'
import type { Node, Edge } from '@xyflow/react'

function makeNode(id: string): Node {
  return { id, position: { x: 0, y: 0 }, data: {} }
}

function makeEdge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target }
}

describe('isValidConnection', () => {
  const nodes = [makeNode('a'), makeNode('b'), makeNode('c')]

  it('rejects self-connection', () => {
    expect(
      isValidConnection(
        { source: 'a', target: 'a', sourceHandle: null, targetHandle: null },
        nodes,
        [],
      ),
    ).toBe(false)
  })

  it('rejects duplicate edge', () => {
    const edges = [makeEdge('a', 'b')]
    expect(
      isValidConnection(
        { source: 'a', target: 'b', sourceHandle: null, targetHandle: null },
        nodes,
        edges,
      ),
    ).toBe(false)
  })

  it('rejects connection that creates a cycle', () => {
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')]
    expect(
      isValidConnection(
        { source: 'c', target: 'a', sourceHandle: null, targetHandle: null },
        nodes,
        edges,
      ),
    ).toBe(false)
  })

  it('accepts valid connection', () => {
    const edges = [makeEdge('a', 'b')]
    expect(
      isValidConnection(
        { source: 'b', target: 'c', sourceHandle: null, targetHandle: null },
        nodes,
        edges,
      ),
    ).toBe(true)
  })

  it('accepts connection with no existing edges', () => {
    expect(
      isValidConnection(
        { source: 'a', target: 'b', sourceHandle: null, targetHandle: null },
        nodes,
        [],
      ),
    ).toBe(true)
  })

  it('rejects when source is null', () => {
    expect(
      isValidConnection(
        {
          source: null as unknown as string,
          target: 'b',
          sourceHandle: null,
          targetHandle: null,
        },
        nodes,
        [],
      ),
    ).toBe(false)
  })

  it('rejects when target is null', () => {
    expect(
      isValidConnection(
        {
          source: 'a',
          target: null as unknown as string,
          sourceHandle: null,
          targetHandle: null,
        },
        nodes,
        [],
      ),
    ).toBe(false)
  })

  it('rejects indirect cycle (a->b->c->d, adding d->a)', () => {
    const fourNodes = [
      makeNode('a'),
      makeNode('b'),
      makeNode('c'),
      makeNode('d'),
    ]
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c'), makeEdge('c', 'd')]
    expect(
      isValidConnection(
        { source: 'd', target: 'a', sourceHandle: null, targetHandle: null },
        fourNodes,
        edges,
      ),
    ).toBe(false)
  })

  it('rejects reverse edge that would create a 2-node cycle', () => {
    const edges = [makeEdge('a', 'b')]
    expect(
      isValidConnection(
        { source: 'b', target: 'a', sourceHandle: null, targetHandle: null },
        nodes,
        edges,
      ),
    ).toBe(false)
  })

  it('allows connection to an unconnected node', () => {
    const edges = [makeEdge('a', 'b')]
    expect(
      isValidConnection(
        { source: 'a', target: 'c', sourceHandle: null, targetHandle: null },
        nodes,
        edges,
      ),
    ).toBe(true)
  })
})
