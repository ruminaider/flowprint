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
    schema: 'flowprint/2.0',
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

describe('Graph Topology Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('switch no-match no-default ends flow with success status', async () => {
    const doc = makeDoc({
      decide: {
        type: 'switch',
        lane: 'default',
        label: 'Decide',
        cases: [
          { when: "input.x === 'a'", next: 'path_a' },
          { when: "input.x === 'b'", next: 'path_b' },
        ],
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
        outcome: 'success',
      },
    })

    const trace = await runGraph(doc, makeOptions({ input: { x: 'neither' } }))

    // Flow ends silently — no terminal reached, but status is 'success' (not 'error')
    expect(trace.status).toBe('success')
    expect(trace.steps).toHaveLength(1)
    expect(trace.steps[0]?.node_id).toBe('decide')
    expect(trace.steps[0]?.status).toBe('no-match')
    expect(trace.steps[0]?.next).toBeUndefined()
  })

  it('only uses the first entry_point from an action node', async () => {
    const doc = makeDoc({
      action: {
        type: 'action',
        lane: 'default',
        label: 'Action',
        entry_points: [
          { file: 'first.ts', symbol: 'primary' },
          { file: 'second.ts', symbol: 'secondary' },
        ],
        next: 'done',
      },
      done: {
        type: 'terminal',
        lane: 'default',
        label: 'Done',
        outcome: 'success',
      },
    })

    mockedLoadEntryPoint.mockResolvedValueOnce(() => 'result')

    const trace = await runGraph(doc, makeOptions())

    expect(trace.status).toBe('success')
    expect(mockedLoadEntryPoint).toHaveBeenCalledTimes(1)
    expect(mockedLoadEntryPoint).toHaveBeenCalledWith(
      { file: 'first.ts', symbol: 'primary' },
      '/tmp/test',
    )
  })

  it('disconnected subgraph — only first root chain executes', async () => {
    // Two separate chains: a -> a_done and b -> b_done
    // Both are roots (no incoming edges). Walker starts from roots[0].
    const doc = makeDoc({
      a: {
        type: 'action',
        lane: 'default',
        label: 'A',
        entry_points: [{ file: 'a.ts', symbol: 'a' }],
        next: 'a_done',
      },
      a_done: {
        type: 'terminal',
        lane: 'default',
        label: 'A Done',
        outcome: 'success',
      },
      b: {
        type: 'action',
        lane: 'default',
        label: 'B',
        entry_points: [{ file: 'b.ts', symbol: 'b' }],
        next: 'b_done',
      },
      b_done: {
        type: 'terminal',
        lane: 'default',
        label: 'B Done',
        outcome: 'success',
      },
    })

    mockedLoadEntryPoint.mockResolvedValueOnce(() => 'chain-a-result')

    const trace = await runGraph(doc, makeOptions())

    expect(trace.status).toBe('success')
    // Only the first chain's nodes should appear in trace
    const nodeIds = trace.steps.map((s) => s.node_id)
    expect(nodeIds).toContain('a')
    expect(nodeIds).toContain('a_done')
    expect(nodeIds).not.toContain('b')
    expect(nodeIds).not.toContain('b_done')
    expect(mockedLoadEntryPoint).toHaveBeenCalledTimes(1)
  })

  it('parallel with non-action branch throws', async () => {
    const doc = makeDoc({
      parallel_step: {
        type: 'parallel',
        lane: 'default',
        label: 'Parallel',
        branches: ['branch_action', 'branch_switch'],
        join: 'merge',
        join_strategy: 'all',
      },
      branch_action: {
        type: 'action',
        lane: 'default',
        label: 'Branch Action',
        entry_points: [{ file: 'a.ts', symbol: 'branchA' }],
      },
      branch_switch: {
        type: 'switch',
        lane: 'default',
        label: 'Branch Switch',
        cases: [{ when: 'true', next: 'merge' }],
      },
      merge: {
        type: 'terminal',
        lane: 'default',
        label: 'Merge',
        outcome: 'success',
      },
    })

    mockedLoadEntryPoint.mockResolvedValueOnce(() => 'result')

    const trace = await runGraph(doc, makeOptions())

    expect(trace.status).toBe('error')
    expect(trace.error).toContain('is not an action node')
    expect(trace.error).toContain('branch_switch')
  })

  it('parallel first strategy races branches', async () => {
    const doc = makeDoc({
      parallel_step: {
        type: 'parallel',
        lane: 'default',
        label: 'Parallel',
        branches: ['fast_branch', 'slow_branch'],
        join: 'done',
        join_strategy: 'first',
      },
      fast_branch: {
        type: 'action',
        lane: 'default',
        label: 'Fast',
        entry_points: [{ file: 'fast.ts', symbol: 'fast' }],
      },
      slow_branch: {
        type: 'action',
        lane: 'default',
        label: 'Slow',
        entry_points: [{ file: 'slow.ts', symbol: 'slow' }],
      },
      done: {
        type: 'terminal',
        lane: 'default',
        label: 'Done',
        outcome: 'success',
      },
    })

    // Fast branch resolves immediately, slow branch takes longer
    mockedLoadEntryPoint.mockResolvedValueOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve('fast-result')
          }, 1)
        }),
    )
    mockedLoadEntryPoint.mockResolvedValueOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve('slow-result')
          }, 100)
        }),
    )

    const trace = await runGraph(doc, makeOptions())

    expect(trace.status).toBe('success')
    // Parallel step should be completed
    const parallelStep = trace.steps.find((s) => s.node_id === 'parallel_step')
    expect(parallelStep?.status).toBe('completed')
  })

  it('action with no entry_points throws', async () => {
    const doc = makeDoc({
      action: {
        type: 'action',
        lane: 'default',
        label: 'No Entry',
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

    const trace = await runGraph(doc, makeOptions())

    expect(trace.status).toBe('error')
    expect(trace.error).toContain('has no entry_point defined')
    expect(trace.error).toContain('action')
  })

  it('dangling next reference throws node not found', async () => {
    const doc = makeDoc({
      action: {
        type: 'action',
        lane: 'default',
        label: 'Action',
        entry_points: [{ file: 'a.ts', symbol: 'doStuff' }],
        next: 'nonexistent',
      },
    })

    mockedLoadEntryPoint.mockResolvedValueOnce(() => 'result')

    const trace = await runGraph(doc, makeOptions())

    expect(trace.status).toBe('error')
    expect(trace.error).toContain('Node "nonexistent" not found in document')
  })

  it('multiple roots — first declared root executes', async () => {
    // Three roots with no incoming edges
    const doc = makeDoc({
      root_a: {
        type: 'action',
        lane: 'default',
        label: 'Root A',
        entry_points: [{ file: 'a.ts', symbol: 'rootA' }],
        next: 'done_a',
      },
      done_a: {
        type: 'terminal',
        lane: 'default',
        label: 'Done A',
        outcome: 'success',
      },
      root_b: {
        type: 'action',
        lane: 'default',
        label: 'Root B',
        entry_points: [{ file: 'b.ts', symbol: 'rootB' }],
        next: 'done_b',
      },
      done_b: {
        type: 'terminal',
        lane: 'default',
        label: 'Done B',
        outcome: 'success',
      },
      root_c: {
        type: 'action',
        lane: 'default',
        label: 'Root C',
        entry_points: [{ file: 'c.ts', symbol: 'rootC' }],
        next: 'done_c',
      },
      done_c: {
        type: 'terminal',
        lane: 'default',
        label: 'Done C',
        outcome: 'success',
      },
    })

    mockedLoadEntryPoint.mockResolvedValueOnce(() => 'result-a')

    const trace = await runGraph(doc, makeOptions())

    expect(trace.status).toBe('success')
    // First declared root should execute
    expect(trace.steps[0]?.node_id).toBe('root_a')
    expect(trace.steps[1]?.node_id).toBe('done_a')
    expect(trace.steps).toHaveLength(2)
  })

  it('switch first match wins when multiple cases match', async () => {
    const doc = makeDoc({
      decide: {
        type: 'switch',
        lane: 'default',
        label: 'Decide',
        cases: [
          { when: 'input.x > 0', next: 'first_match' },
          { when: 'input.x > 0', next: 'second_match' },
        ],
        default: 'fallback',
      },
      first_match: {
        type: 'terminal',
        lane: 'default',
        label: 'First Match',
        outcome: 'success',
      },
      second_match: {
        type: 'terminal',
        lane: 'default',
        label: 'Second Match',
        outcome: 'success',
      },
      fallback: {
        type: 'terminal',
        lane: 'default',
        label: 'Fallback',
        outcome: 'success',
      },
    })

    const trace = await runGraph(doc, makeOptions({ input: { x: 5 } }))

    expect(trace.status).toBe('success')
    expect(trace.steps[0]?.matched_case).toBe(0)
    expect(trace.steps[0]?.next).toBe('first_match')
    expect(trace.steps[1]?.node_id).toBe('first_match')
  })
})
