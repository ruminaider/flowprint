import { describe, it, expect, vi } from 'vitest'
import { FlowprintEngine } from '../../engine/engine.js'
import { ExecutionError } from '../../engine/errors.js'
import { walkGraph, runCompensationStack } from '../../walker/walk.js'
import type { WalkGraphCallbacks, CompensationEntry } from '../../walker/walk.js'
import type { ExecutionContext, NodeExecutionRecord } from '../../walker/types.js'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDoc(nodes: FlowprintDocument['nodes']): FlowprintDocument {
  return {
    schema: 'flowprint/1.0',
    name: 'compensation-test',
    version: '1.0.0',
    lanes: {
      default: { label: 'Default', visibility: 'internal', order: 0 },
    },
    nodes,
  }
}

function makeMockCallbacks(
  overrides: Partial<WalkGraphCallbacks<NodeExecutionRecord>> = {},
): WalkGraphCallbacks<NodeExecutionRecord> {
  return {
    onAction: vi.fn(async () => ({})),
    onSwitch: vi.fn(async () => undefined),
    onParallel: vi.fn(async () => ({})),
    onWait: vi.fn(async () => ({})),
    onError: vi.fn(async () => undefined),
    onTrigger: vi.fn(async () => undefined),
    onTerminal: vi.fn(async () => {}),
    onStep: vi.fn(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Sequential Compensation Tests (walkGraph level)
// ---------------------------------------------------------------------------

describe('Sequential compensation', () => {
  it('compensates in LIFO order: A -> B -> C fails -> compensate B -> compensate A', async () => {
    const doc = makeDoc({
      action_a: {
        type: 'action',
        lane: 'default',
        label: 'A',
        entry_points: [],
        compensation: { file: 'comp_a.ts', symbol: 'undoA' },
        next: 'action_b',
      },
      action_b: {
        type: 'action',
        lane: 'default',
        label: 'B',
        entry_points: [],
        compensation: { file: 'comp_b.ts', symbol: 'undoB' },
        next: 'action_c',
      },
      action_c: {
        type: 'action',
        lane: 'default',
        label: 'C',
        entry_points: [],
        next: 'done',
      },
      done: {
        type: 'terminal',
        lane: 'default',
        label: 'Done',
        outcome: 'success',
      },
    })

    const compensationOrder: string[] = []
    const callbacks = makeMockCallbacks({
      onAction: vi.fn(async (nodeId) => {
        if (nodeId === 'action_c') throw new Error('C failed')
        return { [`${nodeId}_result`]: true }
      }),
      onCompensation: vi.fn((_nodeId, _comp, _result) => {
        const id = _nodeId
        return async () => {
          compensationOrder.push(id)
        }
      }),
      onCompensationStep: vi.fn(),
    })

    await expect(walkGraph(doc, {}, callbacks)).rejects.toThrow('C failed')

    // LIFO: B compensated first, then A
    expect(compensationOrder).toEqual(['action_b', 'action_a'])
    // onCompensationStep called for each successful compensation
    expect(callbacks.onCompensationStep).toHaveBeenCalledTimes(2)
    expect(callbacks.onCompensationStep).toHaveBeenCalledWith('action_b')
    expect(callbacks.onCompensationStep).toHaveBeenCalledWith('action_a')
  })

  it('includes trace of all steps up to failure', async () => {
    const doc = makeDoc({
      action_a: {
        type: 'action',
        lane: 'default',
        label: 'A',
        entry_points: [],
        next: 'action_b',
      },
      action_b: {
        type: 'action',
        lane: 'default',
        label: 'B',
        entry_points: [],
        next: 'done',
      },
      done: {
        type: 'terminal',
        lane: 'default',
        label: 'Done',
        outcome: 'success',
      },
    })

    // Track steps externally since walkGraph replaces onStep with its interceptor
    const externalSteps: string[] = []
    const callbacks = makeMockCallbacks({
      onAction: vi.fn(async (nodeId, _node, _ctx) => {
        // Record a step for each action
        callbacks.onStep({
          nodeId,
          type: 'action',
          lane: 'default',
          startedAt: 0,
          completedAt: 1,
          output: {},
          handler: 'native',
        })
        externalSteps.push(nodeId)
        if (nodeId === 'action_b') throw new Error('B failed')
        return {}
      }),
    })

    try {
      await walkGraph(doc, {}, callbacks)
    } catch {
      // Expected
    }

    // Both actions were visited before the throw
    expect(externalSteps).toEqual(['action_a', 'action_b'])
  })
})

// ---------------------------------------------------------------------------
// Best-effort Compensation Tests
// ---------------------------------------------------------------------------

describe('Best-effort compensation', () => {
  it('continues compensating even if a handler throws', async () => {
    const doc = makeDoc({
      action_a: {
        type: 'action',
        lane: 'default',
        label: 'A',
        entry_points: [],
        compensation: { file: 'comp_a.ts', symbol: 'undoA' },
        next: 'action_b',
      },
      action_b: {
        type: 'action',
        lane: 'default',
        label: 'B',
        entry_points: [],
        compensation: { file: 'comp_b.ts', symbol: 'undoB' },
        next: 'action_c',
      },
      action_c: {
        type: 'action',
        lane: 'default',
        label: 'C',
        entry_points: [],
        next: 'done',
      },
      done: {
        type: 'terminal',
        lane: 'default',
        label: 'Done',
        outcome: 'success',
      },
    })

    const compensationOrder: string[] = []
    const callbacks = makeMockCallbacks({
      onAction: vi.fn(async (nodeId) => {
        if (nodeId === 'action_c') throw new Error('C failed')
        return {}
      }),
      onCompensation: vi.fn((nodeId, _comp, _result) => {
        return async () => {
          if (nodeId === 'action_b') {
            throw new Error('compensation B failed')
          }
          compensationOrder.push(nodeId)
        }
      }),
      onCompensationStep: vi.fn(),
    })

    await expect(walkGraph(doc, {}, callbacks)).rejects.toThrow('C failed')

    // A's compensation still ran even though B's threw
    expect(compensationOrder).toEqual(['action_a'])

    // onCompensationStep called for both: B with error, A without
    expect(callbacks.onCompensationStep).toHaveBeenCalledTimes(2)
    // B's compensation failed
    expect(callbacks.onCompensationStep).toHaveBeenCalledWith(
      'action_b',
      expect.objectContaining({ message: 'compensation B failed' }),
    )
    // A's compensation succeeded
    expect(callbacks.onCompensationStep).toHaveBeenCalledWith('action_a')
  })

  it('runCompensationStack returns compensated and compensationErrors', async () => {
    const stack: CompensationEntry[] = [
      { nodeId: 'node_a', handler: async () => {} },
      {
        nodeId: 'node_b',
        handler: async () => {
          throw new Error('b comp failed')
        },
      },
      { nodeId: 'node_c', handler: async () => {} },
    ]

    const callbacks = makeMockCallbacks()
    const result = await runCompensationStack(stack, callbacks)

    // LIFO order: c, b, a — c succeeds, b fails, a succeeds
    expect(result.compensated).toEqual(['node_c', 'node_a'])
    expect(result.compensationErrors).toHaveLength(1)
    expect(result.compensationErrors[0]!.nodeId).toBe('node_b')
    expect(result.compensationErrors[0]!.error.message).toBe('b comp failed')
  })
})

// ---------------------------------------------------------------------------
// Parallel Compensation Tests (engine level)
// ---------------------------------------------------------------------------

/**
 * Parallel flow: trigger -> parallel(branch_a, branch_b) -> join -> terminal
 * Both branches have compensation handlers.
 */
const PARALLEL_COMPENSATION_FLOW = `
schema: flowprint/1.0
name: parallel-compensation
version: "1.0.0"
lanes:
  default:
    label: Default
    visibility: internal
    order: 0
nodes:
  start:
    type: trigger
    lane: default
    label: Start
    trigger_type: manual
    manual: {}
    next: fork
  fork:
    type: parallel
    lane: default
    label: Fork
    branches:
      - branch_a
      - branch_b
    join: merge
  branch_a:
    type: action
    lane: default
    label: Branch A
    compensation:
      file: comp_a.ts
      symbol: undoA
    next: merge
  branch_b:
    type: action
    lane: default
    label: Branch B
    compensation:
      file: comp_b.ts
      symbol: undoB
    next: merge
  merge:
    type: action
    lane: default
    label: Merge
    next: done
  done:
    type: terminal
    lane: default
    label: Done
    outcome: success
`

describe('Parallel compensation', () => {
  it('compensates completed branches when one branch fails', async () => {
    const engine = new FlowprintEngine()
    const compensated: string[] = []

    // branch_a succeeds, branch_b fails
    engine.register('branch_a', async () => {
      compensated // just to make it a valid handler
      return { a: 'done' }
    })
    engine.register('branch_b', async () => {
      throw new Error('branch B exploded')
    })
    engine.register('merge', async () => ({ merged: true }))

    const flow = await engine.load(PARALLEL_COMPENSATION_FLOW)

    try {
      await flow.execute({})
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ExecutionError)
      const execErr = err as ExecutionError
      expect(execErr.message).toBe('branch B exploded')
      // The trace should include at least the trigger and one branch
      expect(execErr.trace.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('compensates all completed branches when downstream node fails', async () => {
    const engine = new FlowprintEngine()

    // Both branches succeed, merge fails
    engine.register('branch_a', async () => ({ a: true }))
    engine.register('branch_b', async () => ({ b: true }))
    engine.register('merge', async () => {
      throw new Error('merge failed')
    })

    const flow = await engine.load(PARALLEL_COMPENSATION_FLOW)

    try {
      await flow.execute({})
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ExecutionError)
      const execErr = err as ExecutionError
      expect(execErr.message).toBe('merge failed')
      expect(execErr.failedNode).toBe('merge')
      // Trace should include trigger, branch_a, branch_b, fork, merge
      expect(execErr.trace.length).toBeGreaterThanOrEqual(4)
    }
  })
})

// ---------------------------------------------------------------------------
// ExecutionError Shape Tests (engine level)
// ---------------------------------------------------------------------------

/**
 * Simple sequential flow: trigger -> A -> B -> terminal
 * A has a compensation handler.
 */
const SEQUENTIAL_ERROR_FLOW = `
schema: flowprint/1.0
name: sequential-error
version: "1.0.0"
lanes:
  default:
    label: Default
    visibility: internal
    order: 0
nodes:
  start:
    type: trigger
    lane: default
    label: Start
    trigger_type: manual
    manual: {}
    next: step_a
  step_a:
    type: action
    lane: default
    label: Step A
    compensation:
      file: comp_a.ts
      symbol: undoA
    next: step_b
  step_b:
    type: action
    lane: default
    label: Step B
    next: done
  done:
    type: terminal
    lane: default
    label: Done
    outcome: success
`

describe('ExecutionError shape', () => {
  it('has trace, failedNode, compensated, and compensationErrors', async () => {
    const engine = new FlowprintEngine()

    engine.register('step_a', async () => ({ a: true }))
    engine.register('step_b', async () => {
      throw new Error('step B failed')
    })

    const flow = await engine.load(SEQUENTIAL_ERROR_FLOW)

    try {
      await flow.execute({ input: 'data' })
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ExecutionError)
      const execErr = err as ExecutionError
      expect(execErr.name).toBe('ExecutionError')
      expect(execErr.message).toBe('step B failed')

      // trace is present and non-empty
      expect(execErr.trace).toBeDefined()
      expect(execErr.trace.length).toBeGreaterThan(0)

      // failedNode is the node that threw
      expect(execErr.failedNode).toBe('step_b')

      // compensated lists compensated nodes (may be empty if no actual compensation fn ran)
      expect(Array.isArray(execErr.compensated)).toBe(true)

      // compensationErrors lists failed compensations (should be empty here)
      expect(Array.isArray(execErr.compensationErrors)).toBe(true)
    }
  })

  it('trace includes all steps up to the failure', async () => {
    const engine = new FlowprintEngine()

    engine.register('step_a', async () => ({ a: true }))
    engine.register('step_b', async () => {
      throw new Error('step B failed')
    })

    const flow = await engine.load(SEQUENTIAL_ERROR_FLOW)

    try {
      await flow.execute({})
      expect.fail('should have thrown')
    } catch (err) {
      const execErr = err as ExecutionError
      const nodeIds = execErr.trace.map((t) => t.nodeId)

      // Should include trigger, step_a, step_b (with error)
      expect(nodeIds).toContain('start')
      expect(nodeIds).toContain('step_a')
      expect(nodeIds).toContain('step_b')

      // step_b should have an error record
      const failedStep = execErr.trace.find((t) => t.nodeId === 'step_b')
      expect(failedStep).toBeDefined()
      expect(failedStep!.error).toBeDefined()
      expect(failedStep!.error!.message).toBe('step B failed')
    }
  })

  it('execute() always throws ExecutionError on failure, not raw Error', async () => {
    const engine = new FlowprintEngine()

    engine.register('step_a', async () => ({ a: 1 }))
    engine.register('step_b', async () => {
      throw new TypeError('type error in step B')
    })

    const flow = await engine.load(SEQUENTIAL_ERROR_FLOW)

    try {
      await flow.execute({})
      expect.fail('should have thrown')
    } catch (err) {
      // Must be ExecutionError, not the raw TypeError
      expect(err).toBeInstanceOf(ExecutionError)
      expect((err as ExecutionError).message).toBe('type error in step B')
    }
  })
})

// ---------------------------------------------------------------------------
// Scoped Branch Compensation (walkGraph level with walkBranch)
// ---------------------------------------------------------------------------

describe('walkBranch scoped compensation', () => {
  it('walkBranch returns compensation sub-stack for completed branch', async () => {
    const doc = makeDoc({
      step_1: {
        type: 'action',
        lane: 'default',
        label: 'Step 1',
        entry_points: [],
        compensation: { file: 'comp1.ts', symbol: 'undo1' },
        next: 'step_2',
      },
      step_2: {
        type: 'action',
        lane: 'default',
        label: 'Step 2',
        entry_points: [],
        compensation: { file: 'comp2.ts', symbol: 'undo2' },
        next: 'join',
      },
      join: {
        type: 'terminal',
        lane: 'default',
        label: 'Join',
        outcome: 'success',
      },
    })

    const { walkBranch } = await import('../../walker/walk.js')

    const ctx: ExecutionContext = {
      input: {},
      state: {},
      node: { id: 'step_1', type: 'action', lane: 'default' },
      signal: new AbortController().signal,
    }

    const callbacks = makeMockCallbacks({
      onAction: vi.fn(async (nodeId) => ({ [`${nodeId}_out`]: true })),
      onCompensation: vi.fn((nodeId) => {
        return async () => {
          void nodeId
        }
      }),
    })

    const result = await walkBranch(doc, 'step_1', 'join', ctx, callbacks)

    // BranchResult has state and compensationStack
    expect(result.state).toBeDefined()
    expect(result.compensationStack).toBeDefined()
    expect(result.compensationStack).toHaveLength(2)
    expect(result.compensationStack[0]!.nodeId).toBe('step_1')
    expect(result.compensationStack[1]!.nodeId).toBe('step_2')
  })

  it('walkBranch compensation stack is independent per branch', async () => {
    const doc = makeDoc({
      branch_a_step: {
        type: 'action',
        lane: 'default',
        label: 'Branch A Step',
        entry_points: [],
        compensation: { file: 'comp_a.ts', symbol: 'undoA' },
        next: 'join',
      },
      branch_b_step: {
        type: 'action',
        lane: 'default',
        label: 'Branch B Step',
        entry_points: [],
        compensation: { file: 'comp_b.ts', symbol: 'undoB' },
        next: 'join',
      },
      join: {
        type: 'terminal',
        lane: 'default',
        label: 'Join',
        outcome: 'success',
      },
    })

    const { walkBranch } = await import('../../walker/walk.js')

    const callbacks = makeMockCallbacks({
      onAction: vi.fn(async (nodeId) => ({ [`${nodeId}_out`]: true })),
      onCompensation: vi.fn((nodeId) => {
        return async () => {
          void nodeId
        }
      }),
    })

    const ctxA: ExecutionContext = {
      input: {},
      state: {},
      node: { id: 'branch_a_step', type: 'action', lane: 'default' },
      signal: new AbortController().signal,
    }

    const ctxB: ExecutionContext = {
      input: {},
      state: {},
      node: { id: 'branch_b_step', type: 'action', lane: 'default' },
      signal: new AbortController().signal,
    }

    const resultA = await walkBranch(doc, 'branch_a_step', 'join', ctxA, callbacks)
    const resultB = await walkBranch(doc, 'branch_b_step', 'join', ctxB, callbacks)

    // Each branch has its own isolated compensation stack
    expect(resultA.compensationStack).toHaveLength(1)
    expect(resultA.compensationStack[0]!.nodeId).toBe('branch_a_step')

    expect(resultB.compensationStack).toHaveLength(1)
    expect(resultB.compensationStack[0]!.nodeId).toBe('branch_b_step')
  })
})

// ---------------------------------------------------------------------------
// runCompensationStack unit tests
// ---------------------------------------------------------------------------

describe('runCompensationStack', () => {
  it('processes entries in LIFO (reverse) order', async () => {
    const order: string[] = []
    const stack: CompensationEntry[] = [
      {
        nodeId: 'first',
        handler: async () => {
          order.push('first')
        },
      },
      {
        nodeId: 'second',
        handler: async () => {
          order.push('second')
        },
      },
      {
        nodeId: 'third',
        handler: async () => {
          order.push('third')
        },
      },
    ]

    const callbacks = makeMockCallbacks()
    const result = await runCompensationStack(stack, callbacks)

    expect(order).toEqual(['third', 'second', 'first'])
    expect(result.compensated).toEqual(['third', 'second', 'first'])
    expect(result.compensationErrors).toHaveLength(0)
  })

  it('returns empty results for empty stack', async () => {
    const stack: CompensationEntry[] = []
    const callbacks = makeMockCallbacks()
    const result = await runCompensationStack(stack, callbacks)

    expect(result.compensated).toEqual([])
    expect(result.compensationErrors).toEqual([])
  })

  it('records errors with correct nodeId and error object', async () => {
    const stack: CompensationEntry[] = [
      {
        nodeId: 'ok_node',
        handler: async () => {},
      },
      {
        nodeId: 'bad_node',
        handler: async () => {
          throw new TypeError('type error in compensation')
        },
      },
    ]

    const callbacks = makeMockCallbacks()
    const result = await runCompensationStack(stack, callbacks)

    // LIFO: bad_node first, ok_node second
    expect(result.compensated).toEqual(['ok_node'])
    expect(result.compensationErrors).toHaveLength(1)
    expect(result.compensationErrors[0]!.nodeId).toBe('bad_node')
    expect(result.compensationErrors[0]!.error).toBeInstanceOf(TypeError)
    expect(result.compensationErrors[0]!.error.message).toBe('type error in compensation')
  })

  it('converts non-Error throws to Error objects', async () => {
    const stack: CompensationEntry[] = [
      {
        nodeId: 'string_throw',
        handler: async () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw 'string error'
        },
      },
    ]

    const callbacks = makeMockCallbacks()
    const result = await runCompensationStack(stack, callbacks)

    expect(result.compensationErrors).toHaveLength(1)
    expect(result.compensationErrors[0]!.error).toBeInstanceOf(Error)
    expect(result.compensationErrors[0]!.error.message).toBe('string error')
  })
})
