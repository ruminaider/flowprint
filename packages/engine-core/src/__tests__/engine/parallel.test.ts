import { describe, it, expect, vi } from 'vitest'
import { FlowprintEngine } from '../../engine/engine.js'
import type { ExecutionContext } from '../../walker/types.js'
import { walkBranch } from '../../walker/walk.js'
import type { WalkGraphCallbacks } from '../../walker/walk.js'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { validate } from '@ruminaider/flowprint-schema'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDoc(nodes: FlowprintDocument['nodes']): FlowprintDocument {
  return {
    schema: 'flowprint/1.0',
    name: 'parallel-test',
    version: '1.0.0',
    lanes: {
      default: { label: 'Default', visibility: 'internal', order: 0 },
    },
    nodes,
  }
}

/**
 * Minimal YAML for a parallel flow: trigger -> parallel(branch_a, branch_b) -> join -> terminal
 * Both branches are single-action nodes.
 */
const PARALLEL_FLOW = `
schema: flowprint/1.0
name: parallel-test
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
    next: merge
  branch_b:
    type: action
    lane: default
    label: Branch B
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

/**
 * Parallel flow with multi-node subgraph branches.
 * branch_a: action_a1 -> switch_a -> action_a2 -> merge (join)
 * branch_b: action_b1 -> merge (join)
 */
const MULTI_NODE_BRANCH_FLOW = `
schema: flowprint/1.0
name: multi-node-branch
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
      - action_a1
      - action_b1
    join: done
  action_a1:
    type: action
    lane: default
    label: A Step 1
    expressions:
      a1_value: "'step1'"
    next: switch_a
  switch_a:
    type: switch
    lane: default
    label: Switch A
    cases:
      - when: "true"
        next: action_a2
  action_a2:
    type: action
    lane: default
    label: A Step 2
    expressions:
      a2_value: "'step2'"
    next: done
  action_b1:
    type: action
    lane: default
    label: B Step 1
    expressions:
      b1_value: "'only_step'"
    next: done
  done:
    type: terminal
    lane: default
    label: Done
    outcome: success
`

/**
 * Parallel flow with 'first' join_strategy.
 */
const RACE_FLOW = `
schema: flowprint/1.0
name: race-test
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
      - fast_branch
      - slow_branch
    join: merge
    join_strategy: first
  fast_branch:
    type: action
    lane: default
    label: Fast Branch
    next: merge
  slow_branch:
    type: action
    lane: default
    label: Slow Branch
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

// ---------------------------------------------------------------------------
// Branch Isolation Tests
// ---------------------------------------------------------------------------

describe('Parallel branch isolation', () => {
  it('branches get isolated state copies — writes do not leak between branches', async () => {
    const engine = new FlowprintEngine()

    // branch_a writes x=1
    engine.register('branch_a', async (ctx: ExecutionContext) => {
      expect(ctx.state).not.toHaveProperty('branch_b_ran')
      return { x: 1, branch_a_ran: true }
    })

    // branch_b writes x=2
    engine.register('branch_b', async (ctx: ExecutionContext) => {
      expect(ctx.state).not.toHaveProperty('branch_a_ran')
      return { x: 2, branch_b_ran: true }
    })

    engine.register('merge', async () => ({ merged: true }))

    const flow = await engine.load(PARALLEL_FLOW)
    const result = await flow.execute({})

    expect(result.outcome).toBe('success')
    // Both branches' states are namespaced in the output
    expect(result.output).toHaveProperty('branch_a')
    expect(result.output).toHaveProperty('branch_b')
  })

  it('branches do not affect parent state until merge completes', async () => {
    const stateSnapshots: Record<string, unknown>[] = []

    const engine = new FlowprintEngine()

    engine.register('branch_a', async (ctx: ExecutionContext) => {
      // Capture what branch_a sees — should be a clean copy
      stateSnapshots.push(structuredClone(ctx.state))
      return { from_a: true }
    })

    engine.register('branch_b', async (ctx: ExecutionContext) => {
      stateSnapshots.push(structuredClone(ctx.state))
      return { from_b: true }
    })

    engine.register('merge', async (ctx: ExecutionContext) => {
      // At merge time, both branch results should be in state (namespaced)
      stateSnapshots.push(structuredClone(ctx.state))
      return { merged: true }
    })

    const flow = await engine.load(PARALLEL_FLOW)
    await flow.execute({})

    // Branch snapshots (first two) should not contain each other's data
    const branchASnap = stateSnapshots[0]!
    const branchBSnap = stateSnapshots[1]!

    // Branches start from the same parent state (empty at root)
    expect(branchASnap).not.toHaveProperty('from_b')
    expect(branchBSnap).not.toHaveProperty('from_a')

    // Merge step should see namespaced branch results
    const mergeSnap = stateSnapshots[2]!
    expect(mergeSnap).toHaveProperty('branch_a')
    expect(mergeSnap).toHaveProperty('branch_b')
  })
})

// ---------------------------------------------------------------------------
// Merge at Join Tests
// ---------------------------------------------------------------------------

describe('Merge at join', () => {
  it('results are namespaced by branch ID after join', async () => {
    const engine = new FlowprintEngine()

    engine.register('branch_a', async () => ({ result_a: 'alpha' }))
    engine.register('branch_b', async () => ({ result_b: 'beta' }))
    engine.register('merge', async () => ({}))

    const flow = await engine.load(PARALLEL_FLOW)
    const result = await flow.execute({})

    expect(result.outcome).toBe('success')

    // Branch results are namespaced
    const branchA = result.output.branch_a as Record<string, unknown>
    const branchB = result.output.branch_b as Record<string, unknown>
    expect(branchA).toMatchObject({ result_a: 'alpha' })
    expect(branchB).toMatchObject({ result_b: 'beta' })
  })
})

// ---------------------------------------------------------------------------
// Strategy Tests
// ---------------------------------------------------------------------------

describe('Parallel strategies', () => {
  it('"all" strategy: both branches must complete', async () => {
    const completionOrder: string[] = []
    const engine = new FlowprintEngine()

    engine.register('branch_a', async () => {
      completionOrder.push('a')
      return { a: true }
    })

    engine.register('branch_b', async () => {
      completionOrder.push('b')
      return { b: true }
    })

    engine.register('merge', async () => ({}))

    const flow = await engine.load(PARALLEL_FLOW)
    const result = await flow.execute({})

    expect(result.outcome).toBe('success')
    expect(completionOrder).toContain('a')
    expect(completionOrder).toContain('b')
    expect(result.output).toHaveProperty('branch_a')
    expect(result.output).toHaveProperty('branch_b')
  })

  it('"all" strategy with failure: one branch throws -> execution fails', async () => {
    const engine = new FlowprintEngine()

    engine.register('branch_a', async () => ({ a: true }))
    engine.register('branch_b', async () => {
      throw new Error('Branch B failed')
    })
    engine.register('merge', async () => ({}))

    const flow = await engine.load(PARALLEL_FLOW)

    await expect(flow.execute({})).rejects.toThrow('Branch B failed')
  })

  it('"first" strategy: both branches complete, results available', async () => {
    const engine = new FlowprintEngine()

    engine.register('fast_branch', async () => {
      return { speed: 'fast' }
    })

    engine.register('slow_branch', async () => {
      // Simulate slower branch (still completes)
      await new Promise((r) => setTimeout(r, 10))
      return { speed: 'slow' }
    })

    engine.register('merge', async () => ({}))

    const flow = await engine.load(RACE_FLOW)
    const result = await flow.execute({})

    expect(result.outcome).toBe('success')
    // Both branch results should be available
    expect(result.output).toHaveProperty('fast_branch')
    expect(result.output).toHaveProperty('slow_branch')
  })
})

// ---------------------------------------------------------------------------
// Multi-Node Subgraph Tests
// ---------------------------------------------------------------------------

describe('Multi-node branch subgraphs', () => {
  it('branch with action -> switch -> action chain walks correctly', async () => {
    const engine = new FlowprintEngine()

    // No explicit registrations needed — branches use expressions (handled natively)
    const flow = await engine.load(MULTI_NODE_BRANCH_FLOW)
    const result = await flow.execute({})

    expect(result.outcome).toBe('success')

    // Branch subgraphs should have walked through multiple nodes
    const branchA = result.output.action_a1 as Record<string, unknown>
    const branchB = result.output.action_b1 as Record<string, unknown>

    expect(branchA).toBeDefined()
    expect(branchB).toBeDefined()

    // Branch A walked through: action_a1 -> switch_a -> action_a2
    // Its state should contain both a1 and a2 outputs
    expect(branchA).toHaveProperty('a1_value', 'step1')
    expect(branchA).toHaveProperty('a2_value', 'step2')

    // Branch B walked through: action_b1 only
    expect(branchB).toHaveProperty('b1_value', 'only_step')
  })
})

// ---------------------------------------------------------------------------
// Nested Parallel Rejection Tests
// ---------------------------------------------------------------------------

describe('Nested parallel rejection', () => {
  it('walkBranch throws when encountering a parallel node inside a branch', async () => {
    const doc = makeDoc({
      outer_parallel: {
        type: 'parallel',
        lane: 'default',
        label: 'Outer',
        branches: ['inner_parallel'],
        join: 'done',
      },
      inner_parallel: {
        type: 'parallel',
        lane: 'default',
        label: 'Inner',
        branches: ['leaf'],
        join: 'done',
      },
      leaf: {
        type: 'action',
        lane: 'default',
        label: 'Leaf',
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

    const ctx: ExecutionContext = {
      input: {},
      state: {},
      node: { id: 'inner_parallel', type: 'parallel', lane: 'default' },
      signal: new AbortController().signal,
    }

    const callbacks: WalkGraphCallbacks = {
      onAction: vi.fn(async () => ({})),
      onSwitch: vi.fn(async () => undefined),
      onParallel: vi.fn(async () => ({})),
      onWait: vi.fn(async () => ({})),
      onError: vi.fn(async () => undefined),
      onTrigger: vi.fn(async () => undefined),
      onTerminal: vi.fn(async () => {}),
      onStep: vi.fn(),
    }

    await expect(walkBranch(doc, 'inner_parallel', 'done', ctx, callbacks)).rejects.toThrow(
      'Nested parallel node "inner_parallel" found inside a parallel branch',
    )
  })

  it('structural validation rejects nested parallel in branch subgraph', () => {
    const doc = {
      schema: 'flowprint/1.0',
      name: 'nested-parallel',
      version: '1.0.0',
      lanes: {
        default: { label: 'Default', visibility: 'internal', order: 0 },
      },
      nodes: {
        start: {
          type: 'trigger',
          lane: 'default',
          label: 'Start',
          trigger_type: 'manual',
          manual: {},
          next: 'outer',
        },
        outer: {
          type: 'parallel',
          lane: 'default',
          label: 'Outer',
          branches: ['branch_a'],
          join: 'done',
        },
        branch_a: {
          type: 'action',
          lane: 'default',
          label: 'Branch A',
          expressions: { x: '1' },
          next: 'inner',
        },
        inner: {
          type: 'parallel',
          lane: 'default',
          label: 'Inner',
          branches: ['leaf'],
          join: 'done',
        },
        leaf: {
          type: 'action',
          lane: 'default',
          label: 'Leaf',
          expressions: { y: '2' },
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      },
    }

    const result = validate(doc)
    const nestedErrors = result.errors.filter((e) => e.message.includes('Nested parallel'))
    expect(nestedErrors.length).toBeGreaterThan(0)
    expect(nestedErrors[0]!.severity).toBe('error')
  })

  it('structural validation allows non-nested parallel nodes (siblings)', () => {
    const doc = {
      schema: 'flowprint/1.0',
      name: 'sibling-parallel',
      version: '1.0.0',
      lanes: {
        default: { label: 'Default', visibility: 'internal', order: 0 },
      },
      nodes: {
        start: {
          type: 'trigger',
          lane: 'default',
          label: 'Start',
          trigger_type: 'manual',
          manual: {},
          next: 'parallel_1',
        },
        parallel_1: {
          type: 'parallel',
          lane: 'default',
          label: 'First Parallel',
          branches: ['branch_1a'],
          join: 'mid',
        },
        branch_1a: {
          type: 'action',
          lane: 'default',
          label: 'Branch 1A',
          expressions: { x: '1' },
          next: 'mid',
        },
        mid: {
          type: 'action',
          lane: 'default',
          label: 'Mid',
          expressions: { mid: 'true' },
          next: 'parallel_2',
        },
        parallel_2: {
          type: 'parallel',
          lane: 'default',
          label: 'Second Parallel',
          branches: ['branch_2a'],
          join: 'done',
        },
        branch_2a: {
          type: 'action',
          lane: 'default',
          label: 'Branch 2A',
          expressions: { y: '2' },
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      },
    }

    const result = validate(doc)
    const nestedErrors = result.errors.filter((e) => e.message.includes('Nested parallel'))
    expect(nestedErrors).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Adapter executeParallel Tests
// ---------------------------------------------------------------------------

describe('PlainAdapter.executeParallel', () => {
  it('"all" strategy runs all branches concurrently', async () => {
    const { PlainAdapter } = await import('../../adapters/plain.js')
    const adapter = new PlainAdapter()

    const results = await adapter.executeParallel(
      [async () => 'a', async () => 'b', async () => 'c'],
      'all',
    )

    expect(results).toEqual(['a', 'b', 'c'])
  })

  it('"all" strategy propagates first error', async () => {
    const { PlainAdapter } = await import('../../adapters/plain.js')
    const adapter = new PlainAdapter()

    await expect(
      adapter.executeParallel(
        [
          async () => 'ok',
          async () => {
            throw new Error('boom')
          },
        ],
        'all',
      ),
    ).rejects.toThrow('boom')
  })

  it('"first" strategy runs all branches to completion', async () => {
    const { PlainAdapter } = await import('../../adapters/plain.js')
    const adapter = new PlainAdapter()

    const completionOrder: string[] = []

    const results = await adapter.executeParallel(
      [
        async () => {
          completionOrder.push('fast')
          return 'fast_result'
        },
        async () => {
          await new Promise((r) => setTimeout(r, 10))
          completionOrder.push('slow')
          return 'slow_result'
        },
      ],
      'first',
    )

    // Both complete
    expect(results).toEqual(['fast_result', 'slow_result'])
    expect(completionOrder).toContain('fast')
    expect(completionOrder).toContain('slow')
  })
})
