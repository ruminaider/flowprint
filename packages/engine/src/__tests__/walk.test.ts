import { describe, it, expect, vi } from 'vitest'
import { walkGraph } from '../walker/walk.js'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import type { BaseStep, WalkHandlers, WalkContext } from '../walker/types.js'

/** Minimal step type for testing. */
interface TestStep extends BaseStep {
  calledWith?: string
}

/** Build a minimal FlowprintDocument from a nodes map. */
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
 * Build mock handlers that produce minimal steps.
 * Each handler records the nodeId it was called with.
 */
function makeMockHandlers(
  overrides: Partial<WalkHandlers<TestStep>> = {},
): WalkHandlers<TestStep> {
  const makeStep = (
    nodeId: string,
    type: TestStep['type'],
    status: TestStep['status'],
    next?: string,
  ): TestStep => ({
    node_id: nodeId,
    type,
    status,
    next,
    calledWith: nodeId,
  })

  return {
    onAction: vi.fn((nodeId, node) =>
      makeStep(nodeId, 'action', 'completed', node.next),
    ),
    onSwitch: vi.fn((nodeId, node) =>
      makeStep(nodeId, 'switch', 'matched', node.default),
    ),
    onParallel: vi.fn(async (nodeId, node, _ctx, walkBranch) => {
      for (const branch of node.branches) {
        await walkBranch(branch)
      }
      return makeStep(nodeId, 'parallel', 'completed', node.join)
    }),
    onWait: vi.fn((nodeId, node) =>
      makeStep(nodeId, 'wait', 'completed', node.next),
    ),
    onError: vi.fn((nodeId, node) =>
      makeStep(nodeId, 'error', 'handled', node.next),
    ),
    onTerminal: vi.fn((nodeId) =>
      makeStep(nodeId, 'terminal', 'reached', undefined),
    ),
    onTrigger: vi.fn((nodeId, node) =>
      makeStep(nodeId, 'trigger', 'activated', node.next),
    ),
    ...overrides,
  }
}

describe('walkGraph', () => {
  describe('abort signal handling', () => {
    it('stops immediately when passed an already-aborted signal', async () => {
      const doc = makeDoc({
        start: {
          type: 'trigger',
          lane: 'default',
          label: 'Start',
          trigger_type: 'manual',
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

      const handlers = makeMockHandlers()
      const results = new Map<string, unknown>()

      await expect(
        walkGraph(doc, handlers, {}, results, { signal: controller.signal }),
      ).rejects.toThrow('Walk aborted')

      // No handlers should have been called
      expect(handlers.onTrigger).not.toHaveBeenCalled()
      expect(handlers.onTerminal).not.toHaveBeenCalled()
    })

    it('stops mid-walk when signal is aborted during execution', async () => {
      const controller = new AbortController()

      const doc = makeDoc({
        a1: {
          type: 'action',
          lane: 'default',
          label: 'Step 1',
          entry_points: [{ file: 'a.ts', symbol: 'fn' }],
          next: 'a2',
        },
        a2: {
          type: 'action',
          lane: 'default',
          label: 'Step 2',
          entry_points: [{ file: 'b.ts', symbol: 'fn' }],
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      })

      const handlers = makeMockHandlers({
        onAction: vi.fn((nodeId, node) => {
          // Abort after visiting the first action node
          if (nodeId === 'a1') {
            controller.abort()
          }
          return {
            node_id: nodeId,
            type: 'action',
            status: 'completed',
            next: node.next,
          }
        }),
      })

      const results = new Map<string, unknown>()

      await expect(
        walkGraph(doc, handlers, {}, results, { signal: controller.signal }),
      ).rejects.toThrow('Walk aborted')

      // First action was called, but second should not have been
      expect(handlers.onAction).toHaveBeenCalledTimes(1)
    })
  })

  describe('no root nodes found', () => {
    it('throws when every node has incoming edges (cycle, no entry point)', async () => {
      // a -> b -> a: both nodes are targets of edges, so neither is a root
      const doc = makeDoc({
        a: {
          type: 'action',
          lane: 'default',
          label: 'A',
          entry_points: [{ file: 'a.ts', symbol: 'fn' }],
          next: 'b',
        },
        b: {
          type: 'action',
          lane: 'default',
          label: 'B',
          entry_points: [{ file: 'b.ts', symbol: 'fn' }],
          next: 'a',
        },
      })

      const handlers = makeMockHandlers()
      const results = new Map<string, unknown>()

      await expect(
        walkGraph(doc, handlers, {}, results),
      ).rejects.toThrow('No root nodes found in the document')
    })
  })

  describe('onUnknownNodeType', () => {
    it('throws when encountering unknown node type without handler', async () => {
      const doc = makeDoc({
        mystery: {
          type: 'custom_thing' as 'action', // force a fake type past TS
          lane: 'default',
          label: 'Mystery',
        },
      })

      const handlers = makeMockHandlers()
      const results = new Map<string, unknown>()

      await expect(
        walkGraph(doc, handlers, {}, results),
      ).rejects.toThrow('Unknown node type for node "mystery"')
    })

    it('calls onUnknownNodeType handler when provided', async () => {
      const doc = makeDoc({
        mystery: {
          type: 'custom_thing' as 'action',
          lane: 'default',
          label: 'Mystery',
        },
      })

      const onUnknownNodeType = vi.fn((nodeId: string): TestStep => ({
        node_id: nodeId,
        type: 'unknown',
        status: 'skipped',
        next: undefined,
      }))

      const handlers = makeMockHandlers({ onUnknownNodeType })
      const results = new Map<string, unknown>()

      const steps = await walkGraph(doc, handlers, {}, results)

      expect(onUnknownNodeType).toHaveBeenCalledTimes(1)
      expect(onUnknownNodeType).toHaveBeenCalledWith('mystery')
      expect(steps).toHaveLength(1)
      expect(steps[0]?.type).toBe('unknown')
      expect(steps[0]?.node_id).toBe('mystery')
    })
  })

  describe('walkBranch results isolation', () => {
    it('mutations in one branch do not leak to sibling branches', async () => {
      const doc = makeDoc({
        par: {
          type: 'parallel',
          lane: 'default',
          label: 'Parallel',
          branches: ['b1', 'b2'],
          join: 'done',
        },
        b1: {
          type: 'action',
          lane: 'default',
          label: 'Branch 1',
          entry_points: [{ file: 'a.ts', symbol: 'fn' }],
        },
        b2: {
          type: 'action',
          lane: 'default',
          label: 'Branch 2',
          entry_points: [{ file: 'b.ts', symbol: 'fn' }],
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      })

      // Track what each branch sees in the results map
      const branchResultSnapshots: Map<string, Map<string, unknown>> = new Map()

      const handlers = makeMockHandlers({
        onAction: vi.fn(
          (nodeId: string, node, ctx: WalkContext<TestStep>): TestStep => {
            // Record snapshot of results before mutation
            branchResultSnapshots.set(nodeId, new Map(ctx.results))
            // Mutate: each branch sets its own key
            ctx.results.set(nodeId, `result-from-${nodeId}`)
            return {
              node_id: nodeId,
              type: 'action',
              status: 'completed',
              next: node.next,
            }
          },
        ),
      })

      const sharedResults = new Map<string, unknown>()
      sharedResults.set('pre_existing', 'shared-value')

      const steps = await walkGraph(doc, handlers, {}, sharedResults)

      // b2 should NOT see b1's mutation, since branches get snapshot copies
      const b2Snapshot = branchResultSnapshots.get('b2')
      expect(b2Snapshot).toBeDefined()
      expect(b2Snapshot!.has('b1')).toBe(false)
      expect(b2Snapshot!.get('pre_existing')).toBe('shared-value')

      // The parent sharedResults should NOT contain branch mutations
      // (branches operate on copies)
      expect(sharedResults.has('b1')).toBe(false)
      expect(sharedResults.has('b2')).toBe(false)

      // Walk completed with par + done steps
      const nodeIds = steps.map((s) => s.node_id)
      expect(nodeIds).toContain('par')
      expect(nodeIds).toContain('done')
    })
  })

  describe('maxSteps limit', () => {
    it('throws when walk exceeds maxSteps', async () => {
      const doc = makeDoc({
        a: {
          type: 'action',
          lane: 'default',
          label: 'A',
          entry_points: [{ file: 'a.ts', symbol: 'fn' }],
          next: 'b',
        },
        b: {
          type: 'action',
          lane: 'default',
          label: 'B',
          entry_points: [{ file: 'b.ts', symbol: 'fn' }],
          next: 'a',
        },
      })

      const handlers = makeMockHandlers()
      const results = new Map<string, unknown>()

      // This is a cycle — a -> b -> a -> b -> ...
      // With startNodeId we bypass root detection
      await expect(
        walkGraph(doc, handlers, {}, results, { maxSteps: 5, startNodeId: 'a' }),
      ).rejects.toThrow('Walk exceeded maximum steps (5)')

      // Verify exactly 5 handler calls were made
      const totalCalls =
        (handlers.onAction as ReturnType<typeof vi.fn>).mock.calls.length
      expect(totalCalls).toBe(5)
    })
  })

  describe('startNodeId option', () => {
    it('starts walk from the specified node instead of root', async () => {
      const doc = makeDoc({
        start: {
          type: 'trigger',
          lane: 'default',
          label: 'Start',
          trigger_type: 'manual',
          next: 'a1',
        },
        a1: {
          type: 'action',
          lane: 'default',
          label: 'Step 1',
          entry_points: [{ file: 'a.ts', symbol: 'fn' }],
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      })

      const handlers = makeMockHandlers()
      const results = new Map<string, unknown>()

      const steps = await walkGraph(doc, handlers, {}, results, {
        startNodeId: 'a1',
      })

      // Should skip trigger, start at a1
      expect(steps.map((s) => s.node_id)).toEqual(['a1', 'done'])
      expect(handlers.onTrigger).not.toHaveBeenCalled()
      expect(handlers.onAction).toHaveBeenCalledTimes(1)
      expect(handlers.onTerminal).toHaveBeenCalledTimes(1)
    })

    it('throws when startNodeId references a nonexistent node', async () => {
      const doc = makeDoc({
        a1: {
          type: 'action',
          lane: 'default',
          label: 'A',
          entry_points: [{ file: 'a.ts', symbol: 'fn' }],
        },
      })

      const handlers = makeMockHandlers()
      const results = new Map<string, unknown>()

      await expect(
        walkGraph(doc, handlers, {}, results, { startNodeId: 'nonexistent' }),
      ).rejects.toThrow('Node "nonexistent" not found in document')
    })
  })
})
