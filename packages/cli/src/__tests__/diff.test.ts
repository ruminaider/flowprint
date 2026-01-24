import { describe, it, expect } from 'vitest'
import { computeDiff } from '../commands/diff.js'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

function makeDoc(overrides: Partial<FlowprintDocument> = {}): FlowprintDocument {
  return {
    schema: 'flowprint/1.0',
    name: 'test',
    version: '1.0.0',
    lanes: {
      frontstage: { label: 'Frontstage', visibility: 'external', order: 0 },
    },
    nodes: {
      start: {
        type: 'action',
        lane: 'frontstage',
        label: 'Start',
        next: 'end',
      },
      end: {
        type: 'terminal',
        lane: 'frontstage',
        label: 'End',
        outcome: 'success',
      },
    },
    ...overrides,
  }
}

describe('computeDiff', () => {
  it('should detect no differences for identical documents', () => {
    const doc = makeDoc()
    expect(computeDiff(doc, doc)).toHaveLength(0)
  })

  it('should detect added nodes', () => {
    const doc1 = makeDoc()
    const doc2 = makeDoc({
      nodes: {
        ...doc1.nodes,
        new_node: {
          type: 'action',
          lane: 'frontstage',
          label: 'New',
          next: 'end',
        },
      },
    })
    const changes = computeDiff(doc1, doc2)
    const added = changes.filter((c) => c.type === 'added' && c.category === 'node')
    expect(added.length).toBe(1)
    expect(added[0]?.id).toBe('new_node')
  })

  it('should detect removed nodes', () => {
    const doc1 = makeDoc()
    const doc2 = makeDoc({
      nodes: {
        end: {
          type: 'terminal',
          lane: 'frontstage',
          label: 'End',
          outcome: 'success',
        },
      },
    })
    const changes = computeDiff(doc1, doc2)
    const removed = changes.filter((c) => c.type === 'removed' && c.category === 'node')
    expect(removed.length).toBe(1)
    expect(removed[0]?.id).toBe('start')
  })

  it('should detect modified nodes', () => {
    const doc1 = makeDoc()
    const doc2 = makeDoc({
      nodes: {
        start: {
          type: 'action',
          lane: 'frontstage',
          label: 'Updated Start',
          next: 'end',
        },
        end: {
          type: 'terminal',
          lane: 'frontstage',
          label: 'End',
          outcome: 'success',
        },
      },
    })
    const changes = computeDiff(doc1, doc2)
    const modified = changes.filter((c) => c.type === 'modified' && c.category === 'node')
    expect(modified.length).toBe(1)
    expect(modified[0]?.detail).toContain('label')
  })

  it('should detect added and removed lanes', () => {
    const doc1 = makeDoc()
    const doc2 = makeDoc({
      lanes: {
        backstage: { label: 'Backstage', visibility: 'internal', order: 1 },
      },
    })
    const changes = computeDiff(doc1, doc2)
    const addedLanes = changes.filter((c) => c.type === 'added' && c.category === 'lane')
    const removedLanes = changes.filter((c) => c.type === 'removed' && c.category === 'lane')
    expect(addedLanes.length).toBe(1)
    expect(addedLanes[0]?.id).toBe('backstage')
    expect(removedLanes.length).toBe(1)
    expect(removedLanes[0]?.id).toBe('frontstage')
  })

  it('should detect edge changes', () => {
    const doc1 = makeDoc()
    const doc2 = makeDoc({
      nodes: {
        start: {
          type: 'action',
          lane: 'frontstage',
          label: 'Start',
          // removed next -> no edge
        },
        end: {
          type: 'terminal',
          lane: 'frontstage',
          label: 'End',
          outcome: 'success',
        },
      },
    })
    const changes = computeDiff(doc1, doc2)
    const removedEdges = changes.filter((c) => c.type === 'removed' && c.category === 'edge')
    expect(removedEdges.length).toBe(1)
    expect(removedEdges[0]?.id).toBe('start -> end')
  })
})
