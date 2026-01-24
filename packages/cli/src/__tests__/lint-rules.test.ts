import { describe, it, expect } from 'vitest'
import { nodeNaming } from '../lint-rules/node-naming.js'
import { laneOrdering } from '../lint-rules/lane-ordering.js'
import { requireDescription } from '../lint-rules/require-description.js'
import { noEmptyBranches } from '../lint-rules/no-empty-branches.js'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

function makeDoc(overrides: Partial<FlowprintDocument> = {}): FlowprintDocument {
  return {
    schema: 'flowprint/1.0',
    name: 'test',
    version: '1.0.0',
    lanes: {
      frontstage: { label: 'Frontstage', visibility: 'external', order: 0 },
      backstage: { label: 'Backstage', visibility: 'internal', order: 1 },
    },
    nodes: {
      start_action: {
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

describe('node-naming rule', () => {
  it('should pass for snake_case node IDs', () => {
    const doc = makeDoc()
    expect(nodeNaming.check(doc)).toHaveLength(0)
  })

  it('should flag non-snake_case node IDs', () => {
    const doc = makeDoc({
      nodes: {
        StartAction: {
          type: 'action',
          lane: 'frontstage',
          label: 'Start',
          next: 'endSuccess',
        },
        endSuccess: {
          type: 'terminal',
          lane: 'frontstage',
          label: 'End',
          outcome: 'success',
        },
      },
    })
    const results = nodeNaming.check(doc)
    expect(results.length).toBe(2)
    expect(results[0]?.message).toContain('StartAction')
    expect(results[1]?.message).toContain('endSuccess')
  })
})

describe('lane-ordering rule', () => {
  it('should pass when external lanes come before internal', () => {
    const doc = makeDoc()
    expect(laneOrdering.check(doc)).toHaveLength(0)
  })

  it('should flag external lanes after internal lanes', () => {
    const doc = makeDoc({
      lanes: {
        backstage: { label: 'Backstage', visibility: 'internal', order: 0 },
        frontstage: { label: 'Frontstage', visibility: 'external', order: 1 },
      },
    })
    const results = laneOrdering.check(doc)
    expect(results.length).toBe(1)
    expect(results[0]?.message).toContain('frontstage')
  })
})

describe('require-description rule', () => {
  it('should pass when action nodes have descriptions', () => {
    const doc = makeDoc({
      nodes: {
        start_action: {
          type: 'action',
          lane: 'frontstage',
          label: 'Start',
          description: 'A description',
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
    expect(requireDescription.check(doc)).toHaveLength(0)
  })

  it('should flag action nodes without descriptions', () => {
    const doc = makeDoc()
    const results = requireDescription.check(doc)
    expect(results.length).toBe(1)
    expect(results[0]?.message).toContain('start_action')
  })
})

describe('no-empty-branches rule', () => {
  it('should pass for parallel nodes with branches', () => {
    const doc = makeDoc({
      nodes: {
        fork: {
          type: 'parallel',
          lane: 'frontstage',
          label: 'Fork',
          branches: ['a', 'b'],
          join: 'end',
        },
        a: {
          type: 'action',
          lane: 'frontstage',
          label: 'A',
          next: 'end',
        },
        b: {
          type: 'action',
          lane: 'frontstage',
          label: 'B',
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
    expect(noEmptyBranches.check(doc)).toHaveLength(0)
  })

  it('should flag parallel nodes with empty branches array', () => {
    const doc = makeDoc({
      nodes: {
        fork: {
          type: 'parallel',
          lane: 'frontstage',
          label: 'Fork',
          branches: [] as unknown as [string, ...string[]],
          join: 'end',
        },
        end: {
          type: 'terminal',
          lane: 'frontstage',
          label: 'End',
          outcome: 'success',
        },
      },
    })
    const results = noEmptyBranches.check(doc)
    expect(results.length).toBe(1)
    expect(results[0]?.message).toContain('fork')
  })
})
