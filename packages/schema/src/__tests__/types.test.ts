import { describe, it, expect } from 'vitest'
import type {
  FlowprintDocument,
  Lane,
  Node,
  ActionNode,
  SwitchNode,
  ParallelNode,
  WaitNode,
  ErrorNode,
  TerminalNode,
  EntryPoint,
  ErrorHandler,
  ValidationResult,
  ValidationError,
  OrderedNode,
  Edge,
} from '../index.js'

/**
 * These tests verify that the generated and manual types compile correctly.
 * They are primarily compile-time checks — if the types are broken,
 * the TypeScript compiler will reject them before the tests even run.
 */

describe('generated types compile correctly', () => {
  it('creates a valid FlowprintDocument', () => {
    const doc: FlowprintDocument = {
      schema: 'flowprint/1.0',
      name: 'test-blueprint',
      version: '1.0.0',
      lanes: {
        main: { label: 'Main', visibility: 'external', order: 0 },
      },
      nodes: {
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    }
    expect(doc.schema).toBe('flowprint/1.0')
    expect(doc.name).toBe('test-blueprint')
  })

  it('creates valid Lane type', () => {
    const lane: Lane = { label: 'Test', visibility: 'internal', order: 1 }
    expect(lane.label).toBe('Test')
    expect(lane.visibility).toBe('internal')
    expect(lane.order).toBe(1)
  })

  it('creates valid ActionNode', () => {
    const node: ActionNode = {
      type: 'action',
      lane: 'main',
      label: 'Do Something',
      description: 'A description',
      entry_points: [{ file: 'src/index.ts', symbol: 'doSomething' }],
      next: 'next_node',
      error: { retry: { limit: 3, backoff: 'linear' }, catch: 'err' },
    }
    expect(node.type).toBe('action')
  })

  it('creates valid SwitchNode', () => {
    const node: SwitchNode = {
      type: 'switch',
      lane: 'main',
      label: 'Decision',
      cases: [{ when: 'yes', next: 'a' }],
      default: 'b',
    }
    expect(node.type).toBe('switch')
    expect(node.cases?.length).toBe(1)
  })

  it('creates valid ParallelNode', () => {
    const node: ParallelNode = {
      type: 'parallel',
      lane: 'main',
      label: 'Fork',
      branches: ['a', 'b'],
      join: 'c',
      join_strategy: 'all',
    }
    expect(node.type).toBe('parallel')
  })

  it('creates valid WaitNode', () => {
    const node: WaitNode = {
      type: 'wait',
      lane: 'main',
      label: 'Wait',
      event: 'something.happened',
      timeout: '7d',
      next: 'a',
      timeout_next: 'b',
    }
    expect(node.type).toBe('wait')
  })

  it('creates valid ErrorNode', () => {
    const node: ErrorNode = {
      type: 'error',
      lane: 'main',
      label: 'Handle Error',
      next: 'a',
    }
    expect(node.type).toBe('error')
  })

  it('creates valid TerminalNode', () => {
    const node: TerminalNode = {
      type: 'terminal',
      lane: 'main',
      label: 'Done',
      outcome: 'failure',
    }
    expect(node.type).toBe('terminal')
  })

  it('Node union type works with discriminated union', () => {
    // Use identity function to prevent TS from narrowing the literal to ActionNode
    const makeNode = (n: Node): Node => n
    const node = makeNode({
      type: 'action',
      lane: 'main',
      label: 'Test',
    })

    // TypeScript narrows based on type discriminator
    if (node.type === 'action') {
      // Can access action-specific fields after narrowing
      const _next: string | undefined = node.next
      expect(_next).toBeUndefined()
    }
  })

  it('creates valid EntryPoint', () => {
    const ep: EntryPoint = { file: 'src/main.ts', symbol: 'main' }
    expect(ep.file).toBe('src/main.ts')
    expect(ep.symbol).toBe('main')
  })

  it('creates valid ErrorHandler', () => {
    const eh: ErrorHandler = {
      retry: { limit: 5, backoff: 'exponential' },
      catch: 'error_handler_node',
    }
    expect(eh.retry?.limit).toBe(5)
  })
})

describe('manual types compile correctly', () => {
  it('creates valid ValidationResult', () => {
    const result: ValidationResult = {
      valid: true,
      errors: [],
    }
    expect(result.valid).toBe(true)
  })

  it('creates valid ValidationError', () => {
    const err: ValidationError = {
      path: '/nodes/foo/next',
      message: 'Reference to non-existent node',
      severity: 'error',
    }
    expect(err.severity).toBe('error')
  })

  it('creates valid OrderedNode', () => {
    const ordered: OrderedNode = {
      id: 'my_node',
      node: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      order: 0,
    }
    expect(ordered.order).toBe(0)
  })

  it('creates valid Edge', () => {
    const edge: Edge = {
      source: 'a',
      target: 'b',
      label: 'condition',
      type: 'normal',
    }
    expect(edge.type).toBe('normal')
  })

  it('Edge type union includes all variants', () => {
    const normal: Edge = { source: 'a', target: 'b', type: 'normal' }
    const error: Edge = { source: 'a', target: 'b', type: 'error' }
    const dflt: Edge = { source: 'a', target: 'b', type: 'default' }
    expect(normal.type).toBe('normal')
    expect(error.type).toBe('error')
    expect(dflt.type).toBe('default')
  })

  it('FlowprintDocument includes optional fields', () => {
    const doc: FlowprintDocument = {
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      description: 'A test blueprint',
      metadata: { owner: 'team-a', domain: 'testing' },
      lanes: {
        main: { label: 'Main', visibility: 'external', order: 0 },
      },
      nodes: {
        end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
      },
    }
    expect(doc.description).toBe('A test blueprint')
    expect(doc.metadata?.owner).toBe('team-a')
  })
})
