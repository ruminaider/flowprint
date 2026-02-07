import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runGraph } from '../../runner/walker.js'
import type { RunOptions, ExecutionContext } from '../../runner/types.js'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { evaluateExpression } from '../../runner/evaluator.js'

vi.mock('../../runner/loader.js', () => ({
  loadEntryPoint: vi.fn(),
}))

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

function makeContext(input: unknown, results: Record<string, unknown> = {}): ExecutionContext {
  const map = new Map<string, unknown>()
  for (const [k, v] of Object.entries(results)) {
    map.set(k, v)
  }
  return { input, results: map }
}

describe('Fixtures Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('wait fixture wins over timeout_next', async () => {
    const doc = makeDoc({
      wait_signal: {
        type: 'wait',
        lane: 'default',
        label: 'Wait for Signal',
        event: 'approval',
        next: 'approved',
        timeout_next: 'timed_out',
        timeout: '1h',
      },
      approved: {
        type: 'terminal',
        lane: 'default',
        label: 'Approved',
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
        fixtures: { wait_signal: { approved: true } },
      }),
    )

    expect(trace.status).toBe('success')
    const waitStep = trace.steps.find((s) => s.node_id === 'wait_signal')
    expect(waitStep?.status).toBe('fixture')
    expect(waitStep?.next).toBe('approved')

    // Should reach 'approved' terminal, not 'timed_out'
    const approvedStep = trace.steps.find((s) => s.node_id === 'approved')
    expect(approvedStep?.outcome).toBe('success')
    const timedOutStep = trace.steps.find((s) => s.node_id === 'timed_out')
    expect(timedOutStep).toBeUndefined()
  })

  it('wait with no fixture and no timeout_next skips to next', async () => {
    const doc = makeDoc({
      wait_signal: {
        type: 'wait',
        lane: 'default',
        label: 'Wait',
        event: 'some_event',
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

    expect(trace.status).toBe('success')
    const waitStep = trace.steps.find((s) => s.node_id === 'wait_signal')
    expect(waitStep?.status).toBe('skipped')
    expect(waitStep?.next).toBe('done')
    expect(waitStep?.error).toContain('No fixture data')

    const doneStep = trace.steps.find((s) => s.node_id === 'done')
    expect(doneStep?.outcome).toBe('success')
  })

  it('expression timeout is configurable', async () => {
    const doc = makeDoc({
      decide: {
        type: 'switch',
        lane: 'default',
        label: 'Decide',
        cases: [{ when: 'while(true){}', next: 'done' }],
        default: 'done',
      },
      done: {
        type: 'terminal',
        lane: 'default',
        label: 'Done',
        outcome: 'success',
      },
    })

    const trace = await runGraph(doc, makeOptions({ expressionTimeout: 50 }))

    expect(trace.status).toBe('error')
    expect(trace.error).toContain('timed out')
  })

  it('evaluator returns undefined for nonexistent property on context input', () => {
    const context = makeContext({}, {})
    // Accessing a property on input that doesn't exist returns undefined (no throw)
    const result = evaluateExpression('input.nonexistent', context)

    expect(result).toBeUndefined()
  })
})
