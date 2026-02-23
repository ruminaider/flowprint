import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runGraph } from '../../runner/walker.js'
import type { RunOptions } from '../../runner/types.js'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

vi.mock('../../runner/loader.js', () => ({
  loadEntryPoint: vi.fn(),
}))

import { loadEntryPoint } from '../../runner/loader.js'

const mockedLoadEntryPoint = vi.mocked(loadEntryPoint)

function makeDoc(nodes: FlowprintDocument['nodes']): FlowprintDocument {
  return {
    schema: 'flowprint/1.0',
    name: 'test-flow',
    version: '1.0.0',
    lanes: {
      default: { label: 'Default', visibility: 'internal', order: 0 },
    },
    nodes,
  }
}

function makeOptions(overrides: Partial<RunOptions> = {}): RunOptions {
  return {
    input: {},
    projectRoot: '/tmp/test',
    ...overrides,
  }
}

describe('Error Handling & Recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('compensation failure continues to remaining compensations', async () => {
    // action1 (with comp) -> action2 (with comp) -> action3 (no comp, fails, no error handler)
    // action3 fails -> compensation runs LIFO: action2 comp (throws), then action1 comp (succeeds)
    const doc = makeDoc({
      action1: {
        type: 'action',
        lane: 'default',
        label: 'Action 1',
        entry_points: [{ file: 'a.ts', symbol: 'action1' }],
        compensation: { file: 'comp1.ts', symbol: 'undo1' },
        next: 'action2',
      },
      action2: {
        type: 'action',
        lane: 'default',
        label: 'Action 2',
        entry_points: [{ file: 'b.ts', symbol: 'action2' }],
        compensation: { file: 'comp2.ts', symbol: 'undo2' },
        next: 'action3',
      },
      action3: {
        type: 'action',
        lane: 'default',
        label: 'Action 3',
        entry_points: [{ file: 'c.ts', symbol: 'action3' }],
        next: 'done',
      },
      done: {
        type: 'terminal',
        lane: 'default',
        label: 'Done',
        outcome: 'success',
      },
    })

    // action1 succeeds
    mockedLoadEntryPoint.mockResolvedValueOnce(() => ({ created: true }))
    // action2 succeeds
    mockedLoadEntryPoint.mockResolvedValueOnce(() => ({ updated: true }))
    // action3 throws (no error handler -> triggers compensation)
    mockedLoadEntryPoint.mockResolvedValueOnce(() => {
      throw new Error('action3 failed')
    })
    // compensation for action2 throws
    mockedLoadEntryPoint.mockResolvedValueOnce(() => {
      throw new Error('comp2 failed')
    })
    // compensation for action1 succeeds
    mockedLoadEntryPoint.mockResolvedValueOnce(() => ({ undone: true }))

    const trace = await runGraph(doc, makeOptions())

    expect(trace.status).toBe('error')
    expect(trace.error).toContain('action3 failed')

    // Both compensations should have run
    const comp2Step = trace.steps.find((s) => s.node_id === 'action2:compensate')
    expect(comp2Step).toBeDefined()
    expect(comp2Step?.status).toBe('error')
    expect(comp2Step?.error).toContain('comp2 failed')

    const comp1Step = trace.steps.find((s) => s.node_id === 'action1:compensate')
    expect(comp1Step).toBeDefined()
    expect(comp1Step?.status).toBe('completed')
  })

  it('compensation runs in LIFO order', async () => {
    // action1 (comp) -> action2 (comp) -> action3 (fails, no comp, no handler)
    // LIFO: action2 comp runs first, then action1 comp
    const doc = makeDoc({
      action1: {
        type: 'action',
        lane: 'default',
        label: 'Action 1',
        entry_points: [{ file: 'a.ts', symbol: 'action1' }],
        compensation: { file: 'comp1.ts', symbol: 'undo1' },
        next: 'action2',
      },
      action2: {
        type: 'action',
        lane: 'default',
        label: 'Action 2',
        entry_points: [{ file: 'b.ts', symbol: 'action2' }],
        compensation: { file: 'comp2.ts', symbol: 'undo2' },
        next: 'action3',
      },
      action3: {
        type: 'action',
        lane: 'default',
        label: 'Action 3',
        entry_points: [{ file: 'c.ts', symbol: 'action3' }],
        next: 'done',
      },
      done: {
        type: 'terminal',
        lane: 'default',
        label: 'Done',
        outcome: 'success',
      },
    })

    const callOrder: string[] = []

    // action1 succeeds
    mockedLoadEntryPoint.mockResolvedValueOnce(() => ({ created: true }))
    // action2 succeeds
    mockedLoadEntryPoint.mockResolvedValueOnce(() => ({ updated: true }))
    // action3 throws
    mockedLoadEntryPoint.mockResolvedValueOnce(() => {
      throw new Error('action3 failed')
    })
    // compensation for action2 (LIFO — runs first)
    mockedLoadEntryPoint.mockResolvedValueOnce(() => {
      callOrder.push('comp2')
      return { undone2: true }
    })
    // compensation for action1 (LIFO — runs second)
    mockedLoadEntryPoint.mockResolvedValueOnce(() => {
      callOrder.push('comp1')
      return { undone1: true }
    })

    const trace = await runGraph(doc, makeOptions())

    expect(trace.status).toBe('error')
    expect(callOrder).toEqual(['comp2', 'comp1'])

    // Verify compensation was loaded with correct entry points (LIFO order)
    // Calls: action1 ep, action2 ep, action3 ep, comp2 ep, comp1 ep
    expect(mockedLoadEntryPoint).toHaveBeenNthCalledWith(
      4,
      { file: 'comp2.ts', symbol: 'undo2' },
      '/tmp/test',
    )
    expect(mockedLoadEntryPoint).toHaveBeenNthCalledWith(
      5,
      { file: 'comp1.ts', symbol: 'undo1' },
      '/tmp/test',
    )
  })

  it('error handler that throws propagates to outer catch and triggers compensation', async () => {
    const doc = makeDoc({
      risky: {
        type: 'action',
        lane: 'default',
        label: 'Risky',
        entry_points: [{ file: 'a.ts', symbol: 'risky' }],
        compensation: { file: 'comp.ts', symbol: 'undo' },
        next: 'done',
        error: { catch: 'handle_error' },
      },
      handle_error: {
        type: 'error',
        lane: 'default',
        label: 'Handle Error',
        entry_points: [{ file: 'err.ts', symbol: 'handleErr' }],
        next: 'failed',
      },
      done: {
        type: 'terminal',
        lane: 'default',
        label: 'Done',
        outcome: 'success',
      },
      failed: {
        type: 'terminal',
        lane: 'default',
        label: 'Failed',
        outcome: 'failure',
      },
    })

    // risky action throws
    mockedLoadEntryPoint.mockResolvedValueOnce(() => {
      throw new Error('risky failed')
    })
    // error handler entry_point throws
    mockedLoadEntryPoint.mockResolvedValueOnce(() => {
      throw new Error('handler also failed')
    })
    // Note: risky action failed, so it was NOT added to compensation stack
    // (compensation is only pushed for completed actions)

    const trace = await runGraph(doc, makeOptions())

    expect(trace.status).toBe('error')
    expect(trace.error).toContain('handler also failed')
  })

  it('error handler routes to next and continues flow', async () => {
    const doc = makeDoc({
      risky: {
        type: 'action',
        lane: 'default',
        label: 'Risky',
        entry_points: [{ file: 'a.ts', symbol: 'risky' }],
        next: 'done',
        error: { catch: 'handle_error' },
      },
      handle_error: {
        type: 'error',
        lane: 'default',
        label: 'Handle Error',
        next: 'recovery_terminal',
      },
      done: {
        type: 'terminal',
        lane: 'default',
        label: 'Done',
        outcome: 'success',
      },
      recovery_terminal: {
        type: 'terminal',
        lane: 'default',
        label: 'Recovered',
        outcome: 'failure',
      },
    })

    mockedLoadEntryPoint.mockResolvedValueOnce(() => {
      throw new Error('risky failed')
    })

    const trace = await runGraph(doc, makeOptions())

    expect(trace.status).toBe('failure')

    // Trace should include: risky (error), handle_error (handled), recovery_terminal (reached)
    const riskyStep = trace.steps.find((s) => s.node_id === 'risky')
    expect(riskyStep?.status).toBe('error')

    const errorStep = trace.steps.find((s) => s.node_id === 'handle_error')
    expect(errorStep?.status).toBe('handled')
    expect(errorStep?.next).toBe('recovery_terminal')

    const terminalStep = trace.steps.find((s) => s.node_id === 'recovery_terminal')
    expect(terminalStep?.outcome).toBe('failure')
  })

  it('nested error catch chain — handler routes to another action with its own handler', async () => {
    // action_a (catch: h_a) -> h_a has next: action_b (catch: h_b) -> action_b next: terminal
    // action_a throws -> routes to h_a -> continues to action_b (succeeds) -> terminal
    const doc = makeDoc({
      action_a: {
        type: 'action',
        lane: 'default',
        label: 'Action A',
        entry_points: [{ file: 'a.ts', symbol: 'actionA' }],
        next: 'done',
        error: { catch: 'handler_a' },
      },
      handler_a: {
        type: 'error',
        lane: 'default',
        label: 'Handler A',
        next: 'action_b',
      },
      action_b: {
        type: 'action',
        lane: 'default',
        label: 'Action B',
        entry_points: [{ file: 'b.ts', symbol: 'actionB' }],
        next: 'terminal',
        error: { catch: 'handler_b' },
      },
      handler_b: {
        type: 'error',
        lane: 'default',
        label: 'Handler B',
        next: 'terminal',
      },
      done: {
        type: 'terminal',
        lane: 'default',
        label: 'Done',
        outcome: 'success',
      },
      terminal: {
        type: 'terminal',
        lane: 'default',
        label: 'Terminal',
        outcome: 'success',
      },
    })

    // action_a throws
    mockedLoadEntryPoint.mockResolvedValueOnce(() => {
      throw new Error('action_a failed')
    })
    // action_b succeeds
    mockedLoadEntryPoint.mockResolvedValueOnce(() => ({ recovered: true }))

    const trace = await runGraph(doc, makeOptions())

    expect(trace.status).toBe('success')

    // All 4 nodes should execute: action_a (error), handler_a (handled), action_b (completed), terminal
    const nodeIds = trace.steps.map((s) => s.node_id)
    expect(nodeIds).toContain('action_a')
    expect(nodeIds).toContain('handler_a')
    expect(nodeIds).toContain('action_b')
    expect(nodeIds).toContain('terminal')
    expect(trace.steps).toHaveLength(4)
  })

  it('compensation receives action result from context', async () => {
    const doc = makeDoc({
      create_resource: {
        type: 'action',
        lane: 'default',
        label: 'Create Resource',
        entry_points: [{ file: 'create.ts', symbol: 'createResource' }],
        compensation: { file: 'undo.ts', symbol: 'undoCreate' },
        next: 'failing_action',
      },
      failing_action: {
        type: 'action',
        lane: 'default',
        label: 'Failing Action',
        entry_points: [{ file: 'fail.ts', symbol: 'failingAction' }],
        next: 'done',
      },
      done: {
        type: 'terminal',
        lane: 'default',
        label: 'Done',
        outcome: 'success',
      },
    })

    let capturedCompArg: unknown = null

    // create_resource succeeds with a specific result
    mockedLoadEntryPoint.mockResolvedValueOnce(() => ({ id: 'created-123' }))
    // failing_action throws
    mockedLoadEntryPoint.mockResolvedValueOnce(() => {
      throw new Error('second step failed')
    })
    // compensation receives the result from create_resource
    mockedLoadEntryPoint.mockResolvedValueOnce((arg: unknown) => {
      capturedCompArg = arg
      return { undone: true }
    })

    const trace = await runGraph(doc, makeOptions())

    expect(trace.status).toBe('error')
    // Compensation should receive the action result { id: 'created-123' }
    expect(capturedCompArg).toEqual({ id: 'created-123' })

    const compStep = trace.steps.find((s) => s.node_id === 'create_resource:compensate')
    expect(compStep).toBeDefined()
    expect(compStep?.status).toBe('completed')
  })
})
