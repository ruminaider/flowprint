import { describe, it, expect, vi } from 'vitest'
import { walkGraph } from '../../walker/walk.js'
import type { WalkGraphCallbacks } from '../../walker/walk.js'
import type { ExecutionContext } from '../../walker/types.js'
import type { StepResult } from '../../runner/types.js'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

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

/**
 * Build minimal mock callbacks that record step data.
 * All handlers return simple outputs that can be flat-merged into state.
 */
function makeMockCallbacks(
  overrides: Partial<WalkGraphCallbacks<StepResult>> = {},
): WalkGraphCallbacks<StepResult> {
  return {
    onAction: vi.fn(async (_nodeId, _node, _ctx) => ({})),
    onSwitch: vi.fn(async (_nodeId, _node, _ctx) => undefined),
    onParallel: vi.fn(async (_nodeId, _node, _ctx) => ({})),
    onWait: vi.fn(async (_nodeId, _node, _ctx) => ({})),
    onError: vi.fn(async (_nodeId, _node, _ctx) => undefined),
    onTrigger: vi.fn(async (_nodeId, _node, _ctx) => undefined),
    onTerminal: vi.fn(async (_nodeId, _node, _ctx) => {}),
    onStep: vi.fn(),
    ...overrides,
  }
}

describe('walkGraph', () => {
  describe('traversal order', () => {
    it('follows next pointers through a simple linear flow', async () => {
      const doc = makeDoc({
        step1: {
          type: 'action',
          lane: 'default',
          label: 'Step 1',
          entry_points: [],
          next: 'step2',
        },
        step2: {
          type: 'action',
          lane: 'default',
          label: 'Step 2',
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

      const visitOrder: string[] = []
      const callbacks = makeMockCallbacks({
        onAction: vi.fn(async (nodeId) => {
          visitOrder.push(nodeId)
          return { [`${nodeId}_output`]: true }
        }),
        onTerminal: vi.fn(async (nodeId) => {
          visitOrder.push(nodeId)
        }),
      })

      const result = await walkGraph(doc, {}, callbacks)

      expect(visitOrder).toEqual(['step1', 'step2', 'done'])
      expect(result.outcome).toBe('success')
    })
  })

  describe('flat merge behavior', () => {
    it('merges node outputs into accumulated state', async () => {
      const doc = makeDoc({
        node_a: {
          type: 'action',
          lane: 'default',
          label: 'A',
          entry_points: [],
          next: 'node_b',
        },
        node_b: {
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

      const callbacks = makeMockCallbacks({
        onAction: vi.fn(async (nodeId) => {
          if (nodeId === 'node_a') return { x: 1 }
          if (nodeId === 'node_b') return { y: 2 }
          return {}
        }),
      })

      const result = await walkGraph(doc, {}, callbacks)

      expect(result.output).toMatchObject({ x: 1, y: 2 })
    })

    it('last writer wins on flat merge conflict', async () => {
      const doc = makeDoc({
        node_a: {
          type: 'action',
          lane: 'default',
          label: 'A',
          entry_points: [],
          next: 'node_b',
        },
        node_b: {
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

      const callbacks = makeMockCallbacks({
        onAction: vi.fn(async (nodeId) => {
          if (nodeId === 'node_a') return { x: 1 }
          if (nodeId === 'node_b') return { x: 2 }
          return {}
        }),
      })

      const result = await walkGraph(doc, {}, callbacks)

      expect(result.output.x).toBe(2) // last writer wins
    })
  })

  describe('AbortSignal', () => {
    it('terminates immediately with pre-aborted signal', async () => {
      const doc = makeDoc({
        step1: {
          type: 'action',
          lane: 'default',
          label: 'Step 1',
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

      const controller = new AbortController()
      controller.abort()

      const callbacks = makeMockCallbacks()

      const result = await walkGraph(doc, {}, callbacks, {
        abortController: controller,
      })

      // Should not have visited any nodes
      expect(callbacks.onAction).not.toHaveBeenCalled()
      expect(callbacks.onTerminal).not.toHaveBeenCalled()
      expect(result.outcome).toBeUndefined()
    })
  })

  describe('switch traversal', () => {
    it('follows the branch returned by onSwitch', async () => {
      const doc = makeDoc({
        decide: {
          type: 'switch',
          lane: 'default',
          label: 'Decide',
          cases: [
            { when: 'true', next: 'path_a' },
            { when: 'false', next: 'path_b' },
          ],
          default: 'path_b',
        },
        path_a: {
          type: 'terminal',
          lane: 'default',
          label: 'Path A',
          outcome: 'success',
        },
        path_b: {
          type: 'terminal',
          lane: 'default',
          label: 'Path B',
          outcome: 'failure',
        },
      })

      const callbacks = makeMockCallbacks({
        onSwitch: vi.fn(async () => 'path_a'),
      })

      const result = await walkGraph(doc, {}, callbacks)

      expect(result.outcome).toBe('success')
      expect(callbacks.onTerminal).toHaveBeenCalledWith(
        'path_a',
        expect.objectContaining({ type: 'terminal', outcome: 'success' }),
        expect.any(Object),
      )
    })
  })

  describe('terminal handling', () => {
    it('stops at terminal node and returns outcome', async () => {
      const doc = makeDoc({
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'failure',
        },
      })

      const callbacks = makeMockCallbacks()

      const result = await walkGraph(doc, {}, callbacks)

      expect(result.outcome).toBe('failure')
      expect(callbacks.onTerminal).toHaveBeenCalledTimes(1)
    })
  })

  describe('trigger -> action -> terminal', () => {
    it('handles a basic 3-node flow starting with trigger', async () => {
      const doc = makeDoc({
        start: {
          type: 'trigger',
          lane: 'default',
          label: 'Start',
          trigger_type: 'manual',
          next: 'process',
        },
        process: {
          type: 'action',
          lane: 'default',
          label: 'Process',
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

      const visitOrder: string[] = []
      const callbacks = makeMockCallbacks({
        onTrigger: vi.fn(async (nodeId) => {
          visitOrder.push(nodeId)
          return undefined // let walker use node.next
        }),
        onAction: vi.fn(async (nodeId) => {
          visitOrder.push(nodeId)
          return { processed: true }
        }),
        onTerminal: vi.fn(async (nodeId) => {
          visitOrder.push(nodeId)
        }),
      })

      const result = await walkGraph(doc, { initial: 'data' }, callbacks)

      expect(visitOrder).toEqual(['start', 'process', 'done'])
      expect(result.outcome).toBe('success')
      expect(result.output).toMatchObject({ processed: true })
    })
  })

  describe('context management', () => {
    it('passes input to ExecutionContext', async () => {
      const doc = makeDoc({
        step: {
          type: 'action',
          lane: 'default',
          label: 'Step',
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

      let capturedCtx: ExecutionContext | undefined
      const callbacks = makeMockCallbacks({
        onAction: vi.fn(async (_nodeId, _node, ctx) => {
          capturedCtx = ctx
          return {}
        }),
      })

      await walkGraph(doc, { user: 'alice' }, callbacks)

      expect(capturedCtx?.input).toEqual({ user: 'alice' })
      expect(capturedCtx?.node.id).toBe('step')
      expect(capturedCtx?.node.type).toBe('action')
      expect(capturedCtx?.node.lane).toBe('default')
    })

    it('accumulated state is visible to subsequent callbacks', async () => {
      const doc = makeDoc({
        first: {
          type: 'action',
          lane: 'default',
          label: 'First',
          entry_points: [],
          next: 'second',
        },
        second: {
          type: 'action',
          lane: 'default',
          label: 'Second',
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

      let secondCtxState: Record<string, unknown> | undefined
      const callbacks = makeMockCallbacks({
        onAction: vi.fn(async (nodeId, _node, ctx) => {
          if (nodeId === 'first') return { fromFirst: 42 }
          if (nodeId === 'second') {
            secondCtxState = { ...ctx.state }
            return {}
          }
          return {}
        }),
      })

      await walkGraph(doc, {}, callbacks)

      expect(secondCtxState).toMatchObject({ fromFirst: 42 })
    })
  })

  describe('error handling', () => {
    it('routes action error to error node when error.catch is defined', async () => {
      const doc = makeDoc({
        risky: {
          type: 'action',
          lane: 'default',
          label: 'Risky',
          entry_points: [],
          next: 'done',
          error: { catch: 'handle_error' },
        },
        handle_error: {
          type: 'error',
          lane: 'default',
          label: 'Handle Error',
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

      const visitOrder: string[] = []
      const callbacks = makeMockCallbacks({
        onAction: vi.fn(async (nodeId) => {
          visitOrder.push(nodeId)
          throw new Error('action failed')
        }),
        onError: vi.fn(async (nodeId) => {
          visitOrder.push(nodeId)
          return 'failed'
        }),
        onTerminal: vi.fn(async (nodeId) => {
          visitOrder.push(nodeId)
        }),
      })

      const result = await walkGraph(doc, {}, callbacks)

      expect(visitOrder).toEqual(['risky', 'handle_error', 'failed'])
      expect(result.outcome).toBe('failure')
    })

    it('throws when action fails without error.catch', async () => {
      const doc = makeDoc({
        risky: {
          type: 'action',
          lane: 'default',
          label: 'Risky',
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

      const callbacks = makeMockCallbacks({
        onAction: vi.fn(async () => {
          throw new Error('unhandled failure')
        }),
      })

      await expect(walkGraph(doc, {}, callbacks)).rejects.toThrow('unhandled failure')
    })
  })

  describe('compensation', () => {
    it('runs compensation in LIFO order on error', async () => {
      const doc = makeDoc({
        action1: {
          type: 'action',
          lane: 'default',
          label: 'Action 1',
          entry_points: [],
          compensation: { file: 'comp1.ts', symbol: 'undo1' },
          next: 'action2',
        },
        action2: {
          type: 'action',
          lane: 'default',
          label: 'Action 2',
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
          if (nodeId === 'action1') return { created: true }
          throw new Error('action2 failed')
        }),
        onCompensation: vi.fn((_nodeId, _comp, _result) => {
          return async () => {
            compensationOrder.push('comp_action1')
          }
        }),
        onCompensationStep: vi.fn(),
      })

      await expect(walkGraph(doc, {}, callbacks)).rejects.toThrow('action2 failed')
      expect(compensationOrder).toEqual(['comp_action1'])
      expect(callbacks.onCompensationStep).toHaveBeenCalledWith('action1')
    })
  })

  describe('no root nodes', () => {
    it('throws when no root nodes found', async () => {
      const doc = makeDoc({
        a: {
          type: 'action',
          lane: 'default',
          label: 'A',
          entry_points: [],
          next: 'b',
        },
        b: {
          type: 'action',
          lane: 'default',
          label: 'B',
          entry_points: [],
          next: 'a',
        },
      })

      const callbacks = makeMockCallbacks()

      await expect(walkGraph(doc, {}, callbacks)).rejects.toThrow(
        'No root nodes found in the document',
      )
    })
  })

  describe('node not found', () => {
    it('throws when next points to nonexistent node', async () => {
      const doc = makeDoc({
        step: {
          type: 'action',
          lane: 'default',
          label: 'Step',
          entry_points: [],
          next: 'nonexistent',
        },
      })

      const callbacks = makeMockCallbacks({
        onAction: vi.fn(async () => ({})),
      })

      await expect(walkGraph(doc, {}, callbacks)).rejects.toThrow(
        'Node "nonexistent" not found in document',
      )
    })
  })

  describe('onStep trace collection', () => {
    it('collects steps from onStep calls into WalkResult.trace', async () => {
      const doc = makeDoc({
        step: {
          type: 'action',
          lane: 'default',
          label: 'Step',
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

      const callbacks = makeMockCallbacks({
        onAction: vi.fn(async (nodeId, _node, _ctx) => {
          // Simulate the adapter calling onStep
          callbacks.onStep({
            node_id: nodeId,
            type: 'action',
            status: 'completed',
          })
          return {}
        }),
        onTerminal: vi.fn(async (nodeId) => {
          callbacks.onStep({
            node_id: nodeId,
            type: 'terminal',
            status: 'reached',
            outcome: 'success',
          })
        }),
      })

      const result = await walkGraph(doc, {}, callbacks)

      expect(result.trace).toHaveLength(2)
      expect(result.trace[0]?.node_id).toBe('step')
      expect(result.trace[1]?.node_id).toBe('done')
    })
  })
})
