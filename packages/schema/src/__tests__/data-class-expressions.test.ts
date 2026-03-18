import { describe, it, expect } from 'vitest'
import { parse } from 'yaml'
import { validate } from '../validate.js'
import { serialize } from '../serialize.js'
import type { FlowprintDocument } from '../types.js'

/**
 * Helper to create a minimal valid FlowprintDocument.
 */
function makeDoc(overrides: Partial<FlowprintDocument> = {}): FlowprintDocument {
  return {
    schema: 'flowprint/1.0',
    name: 'test-blueprint',
    version: '1.0.0',
    lanes: {
      main: { label: 'Main', visibility: 'internal', order: 0 },
    },
    nodes: {
      start: { type: 'action', lane: 'main', label: 'Start', next: 'done' },
      done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
    },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// data_class on lanes
// ---------------------------------------------------------------------------

describe('data_class on lanes', () => {
  it('accepts a lane with data_class', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: {
        main: { label: 'Main', visibility: 'external', order: 0, data_class: ['pii', 'financial'] },
      },
      nodes: {
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('accepts a lane without data_class (backward compat)', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: {
        main: { label: 'Main', visibility: 'external', order: 0 },
      },
      nodes: {
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects invalid data_class value on lane', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: {
        main: {
          label: 'Main',
          visibility: 'external',
          order: 0,
          data_class: ['invalid_class'],
        },
      },
      nodes: {
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// data_class on nodes
// ---------------------------------------------------------------------------

describe('data_class on nodes', () => {
  it('accepts an action node with data_class', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step: {
          type: 'action',
          lane: 'main',
          label: 'Step',
          data_class: ['credentials'],
          next: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('accepts a switch node with data_class', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        decision: {
          type: 'switch',
          lane: 'main',
          label: 'Decision',
          data_class: ['pii'],
          cases: [{ when: 'yes', next: 'end' }],
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('accepts a terminal node with data_class', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        end: {
          type: 'terminal',
          lane: 'main',
          label: 'End',
          data_class: ['internal'],
          outcome: 'success',
        },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects invalid data_class value on node', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step: {
          type: 'action',
          lane: 'main',
          label: 'Step',
          data_class: ['invalid_class'],
          next: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('accepts multiple valid data_class values on a node', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step: {
          type: 'action',
          lane: 'main',
          label: 'Step',
          data_class: ['pii', 'financial', 'credentials', 'internal'],
          next: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// expressions field on action nodes
// ---------------------------------------------------------------------------

describe('expressions field', () => {
  it('accepts an action node with only expressions', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        transform: {
          type: 'action',
          lane: 'main',
          label: 'Transform',
          expressions: { total: 'price * quantity', tax: 'total * 0.1' },
          next: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('accepts an action node with only rules', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step: {
          type: 'action',
          lane: 'main',
          label: 'Step',
          rules: { file: 'rules/pricing.rules.yaml' },
          next: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('accepts an action node with only entry_points', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step: {
          type: 'action',
          lane: 'main',
          label: 'Step',
          entry_points: [{ file: 'src/handler.ts', symbol: 'handle' }],
          next: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('accepts an action node with none of expressions, rules, or entry_points', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step: {
          type: 'action',
          lane: 'main',
          label: 'Step',
          next: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Mutual exclusivity: expressions vs rules vs entry_points
// ---------------------------------------------------------------------------

describe('mutual exclusivity', () => {
  it('rejects action node with both expressions and rules', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step: {
          type: 'action',
          lane: 'main',
          label: 'Step',
          expressions: { total: 'price * quantity' },
          rules: { file: 'rules/pricing.rules.yaml' },
          next: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) =>
          e.path === '/nodes/step' &&
          e.message.includes('expressions') &&
          e.message.includes('rules'),
      ),
    ).toBe(true)
  })

  it('rejects action node with both expressions and entry_points', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step: {
          type: 'action',
          lane: 'main',
          label: 'Step',
          expressions: { total: 'price * quantity' },
          entry_points: [{ file: 'src/handler.ts', symbol: 'handle' }],
          next: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) =>
          e.path === '/nodes/step' &&
          e.message.includes('expressions') &&
          e.message.includes('entry_points'),
      ),
    ).toBe(true)
  })

  it('rejects action node with both rules and entry_points', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step: {
          type: 'action',
          lane: 'main',
          label: 'Step',
          rules: { file: 'rules/pricing.rules.yaml' },
          entry_points: [{ file: 'src/handler.ts', symbol: 'handle' }],
          next: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) =>
          e.path === '/nodes/step' &&
          e.message.includes('rules') &&
          e.message.includes('entry_points'),
      ),
    ).toBe(true)
  })

  it('rejects action node with all three: expressions, rules, and entry_points', () => {
    const result = validate({
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        step: {
          type: 'action',
          lane: 'main',
          label: 'Step',
          expressions: { total: 'price * quantity' },
          rules: { file: 'rules/pricing.rules.yaml' },
          entry_points: [{ file: 'src/handler.ts', symbol: 'handle' }],
          next: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    })
    expect(result.valid).toBe(false)
    // Should have multiple mutual exclusivity errors
    const mutualErrors = result.errors.filter(
      (e) => e.path === '/nodes/step' && e.severity === 'error',
    )
    expect(mutualErrors.length).toBeGreaterThanOrEqual(3)
  })
})

// ---------------------------------------------------------------------------
// Serialization: data_class and expressions
// ---------------------------------------------------------------------------

describe('serialization', () => {
  it('round-trips document with data_class on lanes', () => {
    const doc = makeDoc({
      lanes: {
        main: {
          label: 'Main',
          visibility: 'internal',
          order: 0,
          data_class: ['pii', 'financial'],
        },
      },
    })
    const yaml = serialize(doc)
    const parsed = parse(yaml) as FlowprintDocument
    expect(parsed.lanes.main?.data_class).toEqual(['pii', 'financial'])
  })

  it('round-trips document with data_class on nodes', () => {
    const doc = makeDoc({
      nodes: {
        step: {
          type: 'action',
          lane: 'main',
          label: 'Step',
          data_class: ['credentials'],
          next: 'done',
        },
        done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
      },
    })
    const yaml = serialize(doc)
    const parsed = parse(yaml) as FlowprintDocument
    const node = parsed.nodes.step as { data_class?: string[] }
    expect(node.data_class).toEqual(['credentials'])
  })

  it('round-trips document with expressions on action node', () => {
    const doc = makeDoc({
      nodes: {
        transform: {
          type: 'action',
          lane: 'main',
          label: 'Transform',
          expressions: { total: 'price * quantity', tax: 'total * 0.1' },
          next: 'done',
        },
        done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
      },
    })
    const yaml = serialize(doc)
    const parsed = parse(yaml) as FlowprintDocument
    const node = parsed.nodes.transform as { expressions?: Record<string, string> }
    expect(node.expressions).toEqual({ total: 'price * quantity', tax: 'total * 0.1' })
  })

  it('round-trips document with data_class and expressions together', () => {
    const doc = makeDoc({
      lanes: {
        main: {
          label: 'Main',
          visibility: 'internal',
          order: 0,
          data_class: ['financial'],
        },
      },
      nodes: {
        transform: {
          type: 'action',
          lane: 'main',
          label: 'Transform',
          data_class: ['pii'],
          expressions: { total: 'price * quantity' },
          next: 'done',
        },
        done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
      },
    })
    const yaml = serialize(doc)
    const parsed = parse(yaml) as FlowprintDocument
    expect(parsed).toEqual(doc)
  })

  describe('key ordering', () => {
    it('outputs data_class before metadata in node key order', () => {
      const doc = makeDoc({
        nodes: {
          my_node: {
            type: 'action',
            lane: 'main',
            label: 'My Node',
            description: 'Does things',
            data_class: ['pii'],
            metadata: { sla: '5m' },
            next: 'done',
          },
          done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
        },
      })
      const yaml = serialize(doc)

      const lines = yaml.split('\n')
      const nodeStart = lines.findIndex((l) => l.trimStart().startsWith('my_node:'))
      expect(nodeStart).toBeGreaterThan(-1)

      const nodeKeys: string[] = []
      for (let i = nodeStart + 1; i < lines.length; i++) {
        const line = lines[i] ?? ''
        if (/^ {2}\S/.exec(line) || /^\S/.exec(line)) break
        const keyMatch = /^ {4}(\w+):/.exec(line)
        if (keyMatch) {
          nodeKeys.push(keyMatch[1] ?? '')
        }
      }

      const dcIdx = nodeKeys.indexOf('data_class')
      const mdIdx = nodeKeys.indexOf('metadata')
      expect(dcIdx).toBeGreaterThan(-1)
      expect(mdIdx).toBeGreaterThan(-1)
      expect(dcIdx).toBeLessThan(mdIdx)
    })

    it('outputs expressions after entry_points in action node key order', () => {
      const doc = makeDoc({
        nodes: {
          my_node: {
            type: 'action',
            lane: 'main',
            label: 'My Node',
            expressions: { total: 'price * quantity' },
            next: 'done',
          },
          done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
        },
      })
      const yaml = serialize(doc)

      const lines = yaml.split('\n')
      const nodeStart = lines.findIndex((l) => l.trimStart().startsWith('my_node:'))
      expect(nodeStart).toBeGreaterThan(-1)

      const nodeKeys: string[] = []
      for (let i = nodeStart + 1; i < lines.length; i++) {
        const line = lines[i] ?? ''
        if (/^ {2}\S/.exec(line) || /^\S/.exec(line)) break
        const keyMatch = /^ {4}(\w+):/.exec(line)
        if (keyMatch) {
          nodeKeys.push(keyMatch[1] ?? '')
        }
      }

      // expressions should appear before next but after type-specific prefix fields
      const exprIdx = nodeKeys.indexOf('expressions')
      const nextIdx = nodeKeys.indexOf('next')
      expect(exprIdx).toBeGreaterThan(-1)
      expect(nextIdx).toBeGreaterThan(-1)
      expect(exprIdx).toBeLessThan(nextIdx)
    })

    it('outputs data_class in correct position in lane key order', () => {
      const doc = makeDoc({
        lanes: {
          main: {
            label: 'Main',
            visibility: 'internal',
            order: 0,
            data_class: ['pii'],
          },
        },
      })
      const yaml = serialize(doc)

      const lines = yaml.split('\n')
      const laneStart = lines.findIndex((l) => l.trimStart().startsWith('main:'))
      expect(laneStart).toBeGreaterThan(-1)

      const laneKeys: string[] = []
      for (let i = laneStart + 1; i < lines.length; i++) {
        const line = lines[i] ?? ''
        // Stop if we hit a same-level or top-level key
        if (/^ {2}\S/.exec(line) || /^\S/.exec(line)) break
        const keyMatch = /^ {4}(\w+):/.exec(line)
        if (keyMatch) {
          laneKeys.push(keyMatch[1] ?? '')
        }
      }

      const orderIdx = laneKeys.indexOf('order')
      const dcIdx = laneKeys.indexOf('data_class')
      expect(orderIdx).toBeGreaterThan(-1)
      expect(dcIdx).toBeGreaterThan(-1)
      expect(dcIdx).toBeGreaterThan(orderIdx)
    })
  })
})
