import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runGraph } from '../../runner/walker.js'
import type { RunOptions } from '../../runner/types.js'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

// Mock the loader to avoid real file imports in tests
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

describe('runGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('linear flow', () => {
    it('executes action -> action -> terminal', async () => {
      const doc = makeDoc({
        step1: {
          type: 'action',
          lane: 'default',
          label: 'Step 1',
          entry_points: [{ file: 'a.ts', symbol: 'step1' }],
          next: 'step2',
        },
        step2: {
          type: 'action',
          lane: 'default',
          label: 'Step 2',
          entry_points: [{ file: 'b.ts', symbol: 'step2' }],
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      })

      mockedLoadEntryPoint
        .mockResolvedValueOnce(() => ({ result: 'one' }))
        .mockResolvedValueOnce(() => ({ result: 'two' }))

      const trace = await runGraph(doc, makeOptions())

      expect(trace.status).toBe('success')
      expect(trace.steps).toHaveLength(3)
      expect(trace.steps[0]?.node_id).toBe('step1')
      expect(trace.steps[0]?.status).toBe('completed')
      expect(trace.steps[1]?.node_id).toBe('step2')
      expect(trace.steps[1]?.status).toBe('completed')
      expect(trace.steps[2]?.node_id).toBe('done')
      expect(trace.steps[2]?.outcome).toBe('success')
    })

    it('handles single action -> terminal', async () => {
      const doc = makeDoc({
        step: {
          type: 'action',
          lane: 'default',
          label: 'Only Step',
          entry_points: [{ file: 'a.ts', symbol: 'doWork' }],
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
      expect(trace.steps).toHaveLength(2)
    })
  })

  describe('switch routing', () => {
    it('matches the correct case', async () => {
      const doc = makeDoc({
        decide: {
          type: 'switch',
          lane: 'default',
          label: 'Decide',
          cases: [
            { when: "input.priority === 'rush'", next: 'fast_track' },
            { when: "input.priority === 'normal'", next: 'standard' },
          ],
          default: 'standard',
        },
        fast_track: {
          type: 'terminal',
          lane: 'default',
          label: 'Fast Track',
          outcome: 'success',
        },
        standard: {
          type: 'terminal',
          lane: 'default',
          label: 'Standard',
          outcome: 'success',
        },
      })

      const trace = await runGraph(doc, makeOptions({ input: { priority: 'rush' } }))

      expect(trace.status).toBe('success')
      expect(trace.steps[0]?.node_id).toBe('decide')
      expect(trace.steps[0]?.matched_case).toBe(0)
      expect(trace.steps[0]?.next).toBe('fast_track')
      expect(trace.steps[1]?.node_id).toBe('fast_track')
    })

    it('falls through to default when no case matches', async () => {
      const doc = makeDoc({
        decide: {
          type: 'switch',
          lane: 'default',
          label: 'Decide',
          cases: [{ when: "input.priority === 'rush'", next: 'fast_track' }],
          default: 'standard',
        },
        fast_track: {
          type: 'terminal',
          lane: 'default',
          label: 'Fast Track',
          outcome: 'success',
        },
        standard: {
          type: 'terminal',
          lane: 'default',
          label: 'Standard',
          outcome: 'success',
        },
      })

      const trace = await runGraph(doc, makeOptions({ input: { priority: 'normal' } }))

      expect(trace.steps[0]?.status).toBe('default')
      expect(trace.steps[0]?.next).toBe('standard')
      expect(trace.steps[1]?.node_id).toBe('standard')
    })

    it('reports no-match when no case matches and no default', async () => {
      const doc = makeDoc({
        decide: {
          type: 'switch',
          lane: 'default',
          label: 'Decide',
          cases: [{ when: "input.x === 'never'", next: 'unreachable' }],
        },
        unreachable: {
          type: 'terminal',
          lane: 'default',
          label: 'Unreachable',
          outcome: 'success',
        },
      })

      const trace = await runGraph(doc, makeOptions({ input: { x: 'other' } }))

      expect(trace.steps[0]?.status).toBe('no-match')
      // Flow ends without reaching terminal
      expect(trace.steps).toHaveLength(1)
    })

    it('matches second case when first does not match', async () => {
      const doc = makeDoc({
        decide: {
          type: 'switch',
          lane: 'default',
          label: 'Decide',
          cases: [
            { when: 'input.x > 100', next: 'high' },
            { when: 'input.x > 50', next: 'medium' },
          ],
          default: 'low',
        },
        high: {
          type: 'terminal',
          lane: 'default',
          label: 'High',
          outcome: 'success',
        },
        medium: {
          type: 'terminal',
          lane: 'default',
          label: 'Medium',
          outcome: 'success',
        },
        low: {
          type: 'terminal',
          lane: 'default',
          label: 'Low',
          outcome: 'success',
        },
      })

      const trace = await runGraph(doc, makeOptions({ input: { x: 75 } }))

      expect(trace.steps[0]?.matched_case).toBe(1)
      expect(trace.steps[0]?.next).toBe('medium')
    })
  })

  describe('parallel execution', () => {
    it('executes all branches with join strategy all', async () => {
      const doc = makeDoc({
        parallel_step: {
          type: 'parallel',
          lane: 'default',
          label: 'Parallel',
          branches: ['branch_a', 'branch_b'],
          join: 'merge',
          join_strategy: 'all',
        },
        branch_a: {
          type: 'action',
          lane: 'default',
          label: 'Branch A',
          entry_points: [{ file: 'a.ts', symbol: 'branchA' }],
        },
        branch_b: {
          type: 'action',
          lane: 'default',
          label: 'Branch B',
          entry_points: [{ file: 'b.ts', symbol: 'branchB' }],
        },
        merge: {
          type: 'terminal',
          lane: 'default',
          label: 'Merge',
          outcome: 'success',
        },
      })

      mockedLoadEntryPoint
        .mockResolvedValueOnce(() => 'result-a')
        .mockResolvedValueOnce(() => 'result-b')

      const trace = await runGraph(doc, makeOptions())

      expect(trace.status).toBe('success')
      // branch_a step, branch_b step, parallel_step step, merge step
      const parallelStep = trace.steps.find((s) => s.node_id === 'parallel_step')
      expect(parallelStep?.status).toBe('completed')
      expect(parallelStep?.next).toBe('merge')

      const mergeStep = trace.steps.find((s) => s.node_id === 'merge')
      expect(mergeStep?.outcome).toBe('success')
    })
  })

  describe('wait with fixtures', () => {
    it('uses fixture data when available', async () => {
      const doc = makeDoc({
        start: {
          type: 'action',
          lane: 'default',
          label: 'Start',
          entry_points: [{ file: 'a.ts', symbol: 'start' }],
          next: 'wait_signal',
        },
        wait_signal: {
          type: 'wait',
          lane: 'default',
          label: 'Wait for Signal',
          event: 'approval',
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      })

      mockedLoadEntryPoint.mockResolvedValueOnce(() => 'started')

      const trace = await runGraph(
        doc,
        makeOptions({
          fixtures: { wait_signal: { approved: true } },
        }),
      )

      expect(trace.status).toBe('success')
      const waitStep = trace.steps.find((s) => s.node_id === 'wait_signal')
      expect(waitStep?.status).toBe('fixture')
    })

    it('skips wait node with warning when no fixture available', async () => {
      const doc = makeDoc({
        wait_signal: {
          type: 'wait',
          lane: 'default',
          label: 'Wait for Signal',
          event: 'approval',
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

      const waitStep = trace.steps.find((s) => s.node_id === 'wait_signal')
      expect(waitStep?.status).toBe('skipped')
      expect(waitStep?.error).toContain('No fixture data')
    })
  })

  describe('wait with timeout_next', () => {
    it('routes to timeout_next when no fixture is provided', async () => {
      const doc = makeDoc({
        wait_signal: {
          type: 'wait',
          lane: 'default',
          label: 'Wait for Signal',
          event: 'signal',
          next: 'done',
          timeout_next: 'timed_out',
          timeout: '1h',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
        timed_out: {
          type: 'terminal',
          lane: 'default',
          label: 'Timed Out',
          outcome: 'failure',
        },
      })

      const trace = await runGraph(doc, makeOptions())

      const waitStep = trace.steps.find((s) => s.node_id === 'wait_signal')
      expect(waitStep?.status).toBe('timeout')
      expect(waitStep?.next).toBe('timed_out')

      const timedOutStep = trace.steps.find((s) => s.node_id === 'timed_out')
      expect(timedOutStep?.outcome).toBe('failure')
      expect(trace.status).toBe('failure')
    })

    it('uses fixture data and routes to next (not timeout_next) when fixture is provided', async () => {
      const doc = makeDoc({
        wait_signal: {
          type: 'wait',
          lane: 'default',
          label: 'Wait for Signal',
          event: 'signal',
          next: 'done',
          timeout_next: 'timed_out',
          timeout: '1h',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
        timed_out: {
          type: 'terminal',
          lane: 'default',
          label: 'Timed Out',
          outcome: 'failure',
        },
      })

      const trace = await runGraph(
        doc,
        makeOptions({
          fixtures: { wait_signal: { received: true } },
        }),
      )

      const waitStep = trace.steps.find((s) => s.node_id === 'wait_signal')
      expect(waitStep?.status).toBe('fixture')
      expect(waitStep?.next).toBe('done')

      const doneStep = trace.steps.find((s) => s.node_id === 'done')
      expect(doneStep?.outcome).toBe('success')
      expect(trace.status).toBe('success')
    })
  })

  describe('error handling', () => {
    it('routes to error node when action fails', async () => {
      const doc = makeDoc({
        risky: {
          type: 'action',
          lane: 'default',
          label: 'Risky Action',
          entry_points: [{ file: 'a.ts', symbol: 'risky' }],
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

      mockedLoadEntryPoint.mockResolvedValueOnce(() => {
        throw new Error('Something broke')
      })

      const trace = await runGraph(doc, makeOptions())

      expect(trace.status).toBe('failure')
      const riskyStep = trace.steps.find((s) => s.node_id === 'risky')
      expect(riskyStep?.status).toBe('error')
      expect(riskyStep?.error).toContain('Something broke')

      const errorStep = trace.steps.find((s) => s.node_id === 'handle_error')
      expect(errorStep?.status).toBe('handled')

      const failedStep = trace.steps.find((s) => s.node_id === 'failed')
      expect(failedStep?.outcome).toBe('failure')
    })

    it('returns error trace when action fails without handler', async () => {
      const doc = makeDoc({
        risky: {
          type: 'action',
          lane: 'default',
          label: 'Risky Action',
          entry_points: [{ file: 'a.ts', symbol: 'risky' }],
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      })

      mockedLoadEntryPoint.mockResolvedValueOnce(() => {
        throw new Error('Unhandled failure')
      })

      const trace = await runGraph(doc, makeOptions())

      expect(trace.status).toBe('error')
      expect(trace.error).toContain('Unhandled failure')
    })

    it('executes error node entry_points when defined', async () => {
      const doc = makeDoc({
        risky: {
          type: 'action',
          lane: 'default',
          label: 'Risky Action',
          entry_points: [{ file: 'a.ts', symbol: 'risky' }],
          next: 'done',
          error: { catch: 'handle_error' },
        },
        handle_error: {
          type: 'error',
          lane: 'default',
          label: 'Handle Error',
          entry_points: [{ file: 'e.ts', symbol: 'handleError' }],
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

      // First call: action entry_point — throws
      mockedLoadEntryPoint.mockResolvedValueOnce(() => {
        throw new Error('Something broke')
      })
      // Second call: error handler entry_point — returns result
      mockedLoadEntryPoint.mockResolvedValueOnce(() => ({ alerted: true }))

      const trace = await runGraph(doc, makeOptions())

      expect(mockedLoadEntryPoint).toHaveBeenCalledTimes(2)
      expect(mockedLoadEntryPoint).toHaveBeenNthCalledWith(
        2,
        { file: 'e.ts', symbol: 'handleError' },
        '/tmp/test',
      )

      const errorStep = trace.steps.find((s) => s.node_id === 'handle_error')
      expect(errorStep?.status).toBe('handled')

      expect(trace.status).toBe('failure')
    })

    it('runs compensation on unhandled error', async () => {
      const doc = makeDoc({
        action1: {
          type: 'action',
          lane: 'default',
          label: 'Action 1',
          entry_points: [{ file: 'a.ts', symbol: 'action1' }],
          compensation: { file: 'comp.ts', symbol: 'undo' },
          next: 'action2',
        },
        action2: {
          type: 'action',
          lane: 'default',
          label: 'Action 2',
          entry_points: [{ file: 'b.ts', symbol: 'action2' }],
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      })

      // Call order: action1 entry_point, action2 entry_point (throws), compensation
      mockedLoadEntryPoint.mockResolvedValueOnce(() => ({ created: true }))
      mockedLoadEntryPoint.mockResolvedValueOnce(() => {
        throw new Error('action2 failed')
      })
      mockedLoadEntryPoint.mockResolvedValueOnce(() => ({ undone: true }))

      const trace = await runGraph(doc, makeOptions())

      expect(trace.status).toBe('error')
      const compStep = trace.steps.find((s) => s.node_id === 'action1:compensate')
      expect(compStep).toBeDefined()
      expect(compStep?.type).toBe('compensation')
      expect(compStep?.status).toBe('completed')
    })
  })

  describe('action with inputs expressions', () => {
    it('evaluates input expressions and passes to function', async () => {
      const doc = makeDoc({
        compute: {
          type: 'action',
          lane: 'default',
          label: 'Compute',
          entry_points: [{ file: 'a.ts', symbol: 'compute' }],
          inputs: {
            doubled: 'input.value',
            name: 'input.name',
          },
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      })

      let capturedArgs: unknown = null
      mockedLoadEntryPoint.mockResolvedValueOnce((args: unknown) => {
        capturedArgs = args
        return { ok: true }
      })

      await runGraph(doc, makeOptions({ input: { value: 42, name: 'test' } }))

      expect(capturedArgs).toEqual({ doubled: 42, name: 'test' })
    })
  })

  describe('empty/missing fixtures for wait nodes', () => {
    it('handles empty fixtures object', async () => {
      const doc = makeDoc({
        wait_signal: {
          type: 'wait',
          lane: 'default',
          label: 'Wait',
          event: 'signal',
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      })

      const trace = await runGraph(doc, makeOptions({ fixtures: {} }))

      const waitStep = trace.steps.find((s) => s.node_id === 'wait_signal')
      expect(waitStep?.status).toBe('skipped')
    })

    it('handles undefined fixtures option', async () => {
      const doc = makeDoc({
        wait_signal: {
          type: 'wait',
          lane: 'default',
          label: 'Wait',
          event: 'signal',
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

      const waitStep = trace.steps.find((s) => s.node_id === 'wait_signal')
      expect(waitStep?.status).toBe('skipped')
    })
  })

  describe('no root nodes', () => {
    it('returns error when no root nodes found', async () => {
      // Circular reference — both nodes point to each other
      // But since findRoots looks at in-degree, create a scenario with no roots
      const doc = makeDoc({
        a: {
          type: 'action',
          lane: 'default',
          label: 'A',
          entry_points: [{ file: 'a.ts', symbol: 'a' }],
          next: 'b',
        },
        b: {
          type: 'action',
          lane: 'default',
          label: 'B',
          entry_points: [{ file: 'b.ts', symbol: 'b' }],
          next: 'a',
        },
      })

      const trace = await runGraph(doc, makeOptions())

      expect(trace.status).toBe('error')
      expect(trace.error).toContain('No root nodes found')
    })
  })

  describe('terminal with failure outcome', () => {
    it('reports failure status for failure terminal', async () => {
      const doc = makeDoc({
        fail: {
          type: 'terminal',
          lane: 'default',
          label: 'Failed',
          outcome: 'failure',
        },
      })

      const trace = await runGraph(doc, makeOptions())

      expect(trace.status).toBe('failure')
      expect(trace.steps[0]?.outcome).toBe('failure')
    })
  })

  describe('switch with node references', () => {
    it('uses previous node result in switch expression', async () => {
      const doc = makeDoc({
        validate: {
          type: 'action',
          lane: 'default',
          label: 'Validate',
          entry_points: [{ file: 'a.ts', symbol: 'validate' }],
          next: 'decide',
        },
        decide: {
          type: 'switch',
          lane: 'default',
          label: 'Decide',
          cases: [{ when: 'validate.ok', next: 'proceed' }],
          default: 'reject',
        },
        proceed: {
          type: 'terminal',
          lane: 'default',
          label: 'Proceed',
          outcome: 'success',
        },
        reject: {
          type: 'terminal',
          lane: 'default',
          label: 'Reject',
          outcome: 'failure',
        },
      })

      mockedLoadEntryPoint.mockResolvedValueOnce(() => ({ ok: true }))

      const trace = await runGraph(doc, makeOptions())

      expect(trace.status).toBe('success')
      expect(trace.steps[1]?.matched_case).toBe(0)
      expect(trace.steps[1]?.next).toBe('proceed')
    })
  })

  describe('duration tracking', () => {
    it('records duration_ms for all steps', async () => {
      const doc = makeDoc({
        step: {
          type: 'action',
          lane: 'default',
          label: 'Step',
          entry_points: [{ file: 'a.ts', symbol: 'step' }],
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      })

      mockedLoadEntryPoint.mockResolvedValueOnce(() => 'ok')

      const trace = await runGraph(doc, makeOptions())

      expect(trace.duration_ms).toBeGreaterThanOrEqual(0)
      expect(trace.steps[0]?.duration_ms).toBeGreaterThanOrEqual(0)
    })
  })

  describe('integration: consultation flow', () => {
    it('runs a full consultation flow example', async () => {
      const doc = makeDoc({
        validate_request: {
          type: 'action',
          lane: 'default',
          label: 'Validate Request',
          entry_points: [{ file: 'validate.ts', symbol: 'validateRequest' }],
          next: 'check_priority',
        },
        check_priority: {
          type: 'switch',
          lane: 'default',
          label: 'Check Priority',
          cases: [
            { when: "input.priority === 'rush'", next: 'fast_track' },
            { when: "input.priority === 'normal'", next: 'standard_track' },
          ],
          default: 'standard_track',
        },
        fast_track: {
          type: 'action',
          lane: 'default',
          label: 'Fast Track',
          entry_points: [{ file: 'track.ts', symbol: 'fastTrack' }],
          next: 'complete',
        },
        standard_track: {
          type: 'action',
          lane: 'default',
          label: 'Standard Track',
          entry_points: [{ file: 'track.ts', symbol: 'standardTrack' }],
          next: 'complete',
        },
        complete: {
          type: 'terminal',
          lane: 'default',
          label: 'Complete',
          outcome: 'success',
        },
      })

      mockedLoadEntryPoint
        .mockResolvedValueOnce(() => ({ valid: true })) // validate_request
        .mockResolvedValueOnce(() => ({ expedited: true })) // fast_track

      const trace = await runGraph(doc, makeOptions({ input: { priority: 'rush' } }))

      expect(trace.status).toBe('success')
      expect(trace.steps).toHaveLength(4) // validate, switch, fast_track, terminal
      expect(trace.steps[0]?.node_id).toBe('validate_request')
      expect(trace.steps[1]?.node_id).toBe('check_priority')
      expect(trace.steps[1]?.matched_case).toBe(0)
      expect(trace.steps[2]?.node_id).toBe('fast_track')
      expect(trace.steps[3]?.node_id).toBe('complete')
      expect(trace.steps[3]?.outcome).toBe('success')
    })
  })
})
