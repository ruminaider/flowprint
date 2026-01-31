import { describe, it, expect } from 'vitest'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { validateExpressions } from '../../expressions/validator.js'

function makeDoc(
  overrides: Partial<FlowprintDocument> & { nodes: FlowprintDocument['nodes'] },
): FlowprintDocument {
  return {
    schema: 'flowprint/2.0',
    name: 'test',
    version: '1.0.0',
    lanes: {
      main: { label: 'Main', visibility: 'internal', order: 0 },
    },
    ...overrides,
  }
}

describe('validateExpressions', () => {
  it('passes for expressions referencing input and upstream nodes', () => {
    const doc = makeDoc({
      nodes: {
        validate_order: {
          type: 'action',
          lane: 'main',
          label: 'Validate',
          entry_points: [{ file: 'src/validate.ts', symbol: 'validate' }],
          next: 'check_priority',
        },
        check_priority: {
          type: 'switch',
          lane: 'main',
          label: 'Check Priority',
          entry_points: [{ file: 'src/check.ts', symbol: 'check' }],
          cases: [
            {
              when: "validate_order.isValid && input.priority === 'rush'",
              next: 'done',
            },
          ],
          default: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'main',
          label: 'Done',
          outcome: 'success',
        },
      },
    })

    const result = validateExpressions(doc)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('fails for expression referencing non-existent node', () => {
    const doc = makeDoc({
      nodes: {
        check: {
          type: 'switch',
          lane: 'main',
          label: 'Check',
          entry_points: [{ file: 'src/check.ts', symbol: 'check' }],
          cases: [{ when: 'nonexistent.value > 0', next: 'done' }],
          default: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'main',
          label: 'Done',
          outcome: 'success',
        },
      },
    })

    const result = validateExpressions(doc)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.message).toContain('unknown node')
    expect(result.errors[0]?.message).toContain('nonexistent')
  })

  it('fails for expression referencing downstream node (wrong topo order)', () => {
    const doc = makeDoc({
      nodes: {
        check: {
          type: 'switch',
          lane: 'main',
          label: 'Check',
          entry_points: [{ file: 'src/check.ts', symbol: 'check' }],
          cases: [{ when: 'downstream.result > 0', next: 'downstream' }],
          default: 'done',
        },
        downstream: {
          type: 'action',
          lane: 'main',
          label: 'Downstream',
          entry_points: [{ file: 'src/down.ts', symbol: 'down' }],
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'main',
          label: 'Done',
          outcome: 'success',
        },
      },
    })

    const result = validateExpressions(doc)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('does not come before'))).toBe(true)
  })

  it('fails for action with 0 entry_points in 2.0', () => {
    const doc = makeDoc({
      nodes: {
        act: {
          type: 'action',
          lane: 'main',
          label: 'Act',
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'main',
          label: 'Done',
          outcome: 'success',
        },
      },
    })

    const result = validateExpressions(doc)
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.message.includes('exactly one entry_point') && e.message.includes('found 0'),
      ),
    ).toBe(true)
  })

  it('fails for action with 2 entry_points in 2.0', () => {
    const doc = makeDoc({
      nodes: {
        act: {
          type: 'action',
          lane: 'main',
          label: 'Act',
          entry_points: [
            { file: 'src/a.ts', symbol: 'a' },
            { file: 'src/b.ts', symbol: 'b' },
          ],
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'main',
          label: 'Done',
          outcome: 'success',
        },
      },
    })

    const result = validateExpressions(doc)
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.message.includes('exactly one entry_point') && e.message.includes('found 2'),
      ),
    ).toBe(true)
  })

  it('fails for malformed expression syntax', () => {
    const doc = makeDoc({
      nodes: {
        check: {
          type: 'switch',
          lane: 'main',
          label: 'Check',
          entry_points: [{ file: 'src/check.ts', symbol: 'check' }],
          cases: [{ when: 'input.x ===', next: 'done' }],
          default: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'main',
          label: 'Done',
          outcome: 'success',
        },
      },
    })

    const result = validateExpressions(doc)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('Parse error'))).toBe(true)
  })

  it('skips entry_point count check for 1.0 docs', () => {
    const doc = makeDoc({
      schema: 'flowprint/1.0',
      nodes: {
        act: {
          type: 'action',
          lane: 'main',
          label: 'Act',
          // No entry_points — valid for 1.0
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'main',
          label: 'Done',
          outcome: 'success',
        },
      },
    })

    const result = validateExpressions(doc)
    expect(result.valid).toBe(true)
  })

  it('reports all errors for mixed valid and invalid expressions', () => {
    const doc = makeDoc({
      nodes: {
        validate: {
          type: 'action',
          lane: 'main',
          label: 'Validate',
          entry_points: [{ file: 'src/v.ts', symbol: 'v' }],
          next: 'check',
        },
        check: {
          type: 'switch',
          lane: 'main',
          label: 'Check',
          entry_points: [{ file: 'src/c.ts', symbol: 'c' }],
          cases: [
            { when: "validate.ok && input.x === 'y'", next: 'done' },
            { when: 'ghost.value > 0', next: 'done' },
          ],
          default: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'main',
          label: 'Done',
          outcome: 'success',
        },
      },
    })

    const result = validateExpressions(doc)
    expect(result.valid).toBe(false)
    // One error: ghost is not a valid node
    expect(result.errors.some((e) => e.message.includes('ghost'))).toBe(true)
  })

  it('validates action input expressions', () => {
    const doc = makeDoc({
      nodes: {
        validate: {
          type: 'action',
          lane: 'main',
          label: 'Validate',
          entry_points: [{ file: 'src/v.ts', symbol: 'v' }],
          inputs: {
            priority: "input.priority === 'rush'",
          },
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'main',
          label: 'Done',
          outcome: 'success',
        },
      },
    })

    const result = validateExpressions(doc)
    expect(result.valid).toBe(true)
  })

  it('rejects action input expression referencing unknown node', () => {
    const doc = makeDoc({
      nodes: {
        act: {
          type: 'action',
          lane: 'main',
          label: 'Act',
          entry_points: [{ file: 'src/a.ts', symbol: 'a' }],
          inputs: {
            data: 'missing_node.value',
          },
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'main',
          label: 'Done',
          outcome: 'success',
        },
      },
    })

    const result = validateExpressions(doc)
    expect(result.valid).toBe(false)
    expect(result.errors[0]?.path).toBe('/nodes/act/inputs/data')
  })
})
