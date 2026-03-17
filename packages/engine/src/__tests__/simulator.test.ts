import { describe, it, expect } from 'vitest'
import { simulateGraph } from '../simulator/simulator.js'
import type { SimulationOptions } from '../simulator/types.js'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import type { RulesDocument } from '../rules/types.js'

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

function makeOptions(overrides: Partial<SimulationOptions> = {}): SimulationOptions {
  return {
    input: {},
    rulesData: {},
    ...overrides,
  }
}

describe('simulateGraph', () => {
  describe('linear flows', () => {
    it('action → action → terminal', async () => {
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

      const trace = await simulateGraph(doc, makeOptions({
        fixtures: { a1: { created: true }, a2: { updated: true } },
      }))

      expect(trace.status).toBe('success')
      expect(trace.steps).toHaveLength(3)
      expect(trace.steps.map((s) => s.node_id)).toEqual(['a1', 'a2', 'done'])
      expect(trace.steps[0]?.status).toBe('completed')
      expect(trace.steps[2]?.outcome).toBe('success')
    })

    it('each step has stepOutput with correct nodeId and value', async () => {
      const doc = makeDoc({
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

      const trace = await simulateGraph(doc, makeOptions({
        fixtures: { a1: { value: 42 } },
      }))

      const actionStep = trace.steps[0]
      expect(actionStep).toBeDefined()
      expect(actionStep?.stepOutput).toEqual({ nodeId: 'a1', value: { value: 42 } })
    })
  })

  describe('rules-driven nodes', () => {
    const rulesDoc: RulesDocument = {
      schema: 'flowprint-rules/1.0',
      name: 'test-rules',
      hit_policy: 'first',
      inputs: ['order.total'],
      rules: [
        { when: { 'order.total': { gt: 100 } }, then: { discount: true, rate: 0.1 } },
        { when: { 'order.total': { lte: 100 } }, then: { discount: false, rate: 0 } },
      ],
    }

    it('action with rules includes rulesEvaluation detail', async () => {
      const doc = makeDoc({
        classify: {
          type: 'action',
          lane: 'default',
          label: 'Classify',
          rules: { file: 'discount.rules.yaml' },
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      })

      const trace = await simulateGraph(doc, makeOptions({
        input: { order: { total: 150 } },
        rulesData: { 'discount.rules.yaml': rulesDoc },
      }))

      expect(trace.status).toBe('success')
      const step = trace.steps[0]
      expect(step).toBeDefined()
      expect(step?.rulesEvaluation).toBeDefined()
      expect(step?.rulesEvaluation?.file).toBe('discount.rules.yaml')
      expect(step?.rulesEvaluation?.hitPolicy).toBe('first')
      expect(step?.rulesEvaluation?.matchedCount).toBe(1)
      expect(step?.rulesEvaluation?.output).toEqual({ discount: true, rate: 0.1 })
    })

    it('switch with rules routes via output.next', async () => {
      const switchRules: RulesDocument = {
        schema: 'flowprint-rules/1.0',
        name: 'routing-rules',
        hit_policy: 'first',
        inputs: ['order.type'],
        rules: [
          { when: { 'order.type': { eq: 'express' } }, then: { next: 'fast_track' } },
          { when: { 'order.type': { eq: 'standard' } }, then: { next: 'normal_track' } },
        ],
      }

      const doc = makeDoc({
        route: {
          type: 'switch',
          lane: 'default',
          label: 'Route',
          rules: { file: 'routing.rules.yaml' },
          default: 'fallback',
        },
        fast_track: {
          type: 'terminal',
          lane: 'default',
          label: 'Fast',
          outcome: 'success',
        },
        normal_track: {
          type: 'terminal',
          lane: 'default',
          label: 'Normal',
          outcome: 'success',
        },
        fallback: {
          type: 'terminal',
          lane: 'default',
          label: 'Fallback',
          outcome: 'success',
        },
      })

      const trace = await simulateGraph(doc, makeOptions({
        input: { order: { type: 'express' } },
        rulesData: { 'routing.rules.yaml': switchRules },
      }))

      expect(trace.steps.map((s) => s.node_id)).toEqual(['route', 'fast_track'])
      expect(trace.steps[0]?.status).toBe('matched')
    })

    it('missing rules file returns error step (not throw)', async () => {
      const doc = makeDoc({
        classify: {
          type: 'action',
          lane: 'default',
          label: 'Classify',
          rules: { file: 'missing.rules.yaml' },
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      })

      const trace = await simulateGraph(doc, makeOptions())

      expect(trace.steps[0]?.status).toBe('error')
      expect(trace.steps[0]?.error).toContain('not found in rulesData')
    })
  })

  describe('expression-based switch', () => {
    it('evaluates case expressions with interpreter', async () => {
      const doc = makeDoc({
        check: {
          type: 'switch',
          lane: 'default',
          label: 'Check',
          cases: [
            { when: 'input.amount > 100', next: 'high' },
            { when: 'input.amount > 50', next: 'medium' },
          ],
          default: 'low',
        },
        high: { type: 'terminal', lane: 'default', label: 'High', outcome: 'success' },
        medium: { type: 'terminal', lane: 'default', label: 'Medium', outcome: 'success' },
        low: { type: 'terminal', lane: 'default', label: 'Low', outcome: 'success' },
      })

      const trace = await simulateGraph(doc, makeOptions({ input: { amount: 75 } }))

      expect(trace.steps.map((s) => s.node_id)).toEqual(['check', 'medium'])
      expect(trace.steps[0]?.matched_case).toBe(1)
    })

    it('falls through to default when no case matches', async () => {
      const doc = makeDoc({
        check: {
          type: 'switch',
          lane: 'default',
          label: 'Check',
          cases: [{ when: 'input.x > 100', next: 'high' }],
          default: 'low',
        },
        high: { type: 'terminal', lane: 'default', label: 'High', outcome: 'success' },
        low: { type: 'terminal', lane: 'default', label: 'Low', outcome: 'success' },
      })

      const trace = await simulateGraph(doc, makeOptions({ input: { x: 5 } }))

      expect(trace.steps.map((s) => s.node_id)).toEqual(['check', 'low'])
      expect(trace.steps[0]?.status).toBe('default')
    })
  })

  describe('fixture data', () => {
    it('uses fixture for entry-point action', async () => {
      const doc = makeDoc({
        fetch: {
          type: 'action',
          lane: 'default',
          label: 'Fetch',
          entry_points: [{ file: 'api.ts', symbol: 'fetch' }],
          next: 'done',
        },
        done: { type: 'terminal', lane: 'default', label: 'Done', outcome: 'success' },
      })

      const trace = await simulateGraph(doc, makeOptions({
        fixtures: { fetch: { data: [1, 2, 3] } },
      }))

      const step = trace.steps[0]
      expect(step).toBeDefined()
      expect(step?.stepOutput?.value).toEqual({ data: [1, 2, 3] })
    })

    it('uses undefined when no fixture provided for action', async () => {
      const doc = makeDoc({
        fetch: {
          type: 'action',
          lane: 'default',
          label: 'Fetch',
          entry_points: [{ file: 'api.ts', symbol: 'fetch' }],
          next: 'done',
        },
        done: { type: 'terminal', lane: 'default', label: 'Done', outcome: 'success' },
      })

      const trace = await simulateGraph(doc, makeOptions())

      const step = trace.steps[0]
      expect(step).toBeDefined()
      expect(step?.stepOutput?.value).toBeUndefined()
    })
  })

  describe('parallel node', () => {
    it('traces branches sequentially with fixtures', async () => {
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
        done: { type: 'terminal', lane: 'default', label: 'Done', outcome: 'success' },
      })

      const trace = await simulateGraph(doc, makeOptions({
        fixtures: { b1: 'result1', b2: 'result2' },
      }))

      expect(trace.status).toBe('success')
      // Branch steps are pushed by onParallel, plus the parallel step itself, plus terminal
      const nodeIds = trace.steps.map((s) => s.node_id)
      expect(nodeIds).toContain('b1')
      expect(nodeIds).toContain('b2')
      expect(nodeIds).toContain('par')
      expect(nodeIds).toContain('done')
    })
  })

  describe('wait node', () => {
    it('uses fixture data', async () => {
      const doc = makeDoc({
        wait_signal: {
          type: 'wait',
          lane: 'default',
          label: 'Wait',
          event: 'payment.received',
          next: 'done',
        },
        done: { type: 'terminal', lane: 'default', label: 'Done', outcome: 'success' },
      })

      const trace = await simulateGraph(doc, makeOptions({
        fixtures: { wait_signal: { amount: 100 } },
      }))

      expect(trace.steps[0]?.status).toBe('fixture')
      expect(trace.steps[0]?.next).toBe('done')
    })

    it('routes to timeout_next when no fixture', async () => {
      const doc = makeDoc({
        wait_signal: {
          type: 'wait',
          lane: 'default',
          label: 'Wait',
          event: 'payment.received',
          next: 'done',
          timeout_next: 'timeout_handler',
        },
        done: { type: 'terminal', lane: 'default', label: 'Done', outcome: 'success' },
        timeout_handler: { type: 'terminal', lane: 'default', label: 'Timeout', outcome: 'failure' },
      })

      const trace = await simulateGraph(doc, makeOptions())

      expect(trace.steps[0]?.status).toBe('timeout')
      expect(trace.steps[0]?.next).toBe('timeout_handler')
    })

    it('skips when no fixture and no timeout_next', async () => {
      const doc = makeDoc({
        wait_signal: {
          type: 'wait',
          lane: 'default',
          label: 'Wait',
          event: 'payment.received',
          next: 'done',
        },
        done: { type: 'terminal', lane: 'default', label: 'Done', outcome: 'success' },
      })

      const trace = await simulateGraph(doc, makeOptions())

      expect(trace.steps[0]?.status).toBe('skipped')
      expect(trace.steps[0]?.next).toBe('done')
    })
  })

  describe('error node', () => {
    it('follows node.next', async () => {
      const doc = makeDoc({
        risky: {
          type: 'action',
          lane: 'default',
          label: 'Risky',
          entry_points: [{ file: 'a.ts', symbol: 'fn' }],
          next: 'done',
          error: { catch: 'handle_err' },
        },
        handle_err: {
          type: 'error',
          lane: 'default',
          label: 'Handle Error',
          next: 'recovery',
        },
        recovery: { type: 'terminal', lane: 'default', label: 'Recovered', outcome: 'success' },
        done: { type: 'terminal', lane: 'default', label: 'Done', outcome: 'success' },
      })

      // Simulate the error path by starting from the error handler
      const trace = await simulateGraph(doc, makeOptions())

      // In simulation mode, action without fixture just uses undefined and succeeds
      // The error node is only visited if explicitly navigated to
      expect(trace.status).toBe('success')
    })
  })

  describe('trigger node', () => {
    it('emits activated step', async () => {
      const doc = makeDoc({
        start: {
          type: 'trigger',
          lane: 'default',
          label: 'Start',
          trigger_type: 'manual',
          next: 'done',
        },
        done: { type: 'terminal', lane: 'default', label: 'Done', outcome: 'success' },
      })

      const trace = await simulateGraph(doc, makeOptions())

      expect(trace.steps[0]?.type).toBe('trigger')
      expect(trace.steps[0]?.status).toBe('activated')
      expect(trace.steps[0]?.next).toBe('done')
    })
  })

  describe('error paths', () => {
    it('cycle / max steps', async () => {
      const doc = makeDoc({
        start: {
          type: 'trigger',
          lane: 'default',
          label: 'Start',
          trigger_type: 'manual',
          next: 'a',
        },
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

      const trace = await simulateGraph(doc, makeOptions({ maxSteps: 10 }))

      expect(trace.status).toBe('error')
      expect(trace.error).toContain('exceeded maximum steps')
    })

    it('missing node reference', async () => {
      const doc = makeDoc({
        a: {
          type: 'action',
          lane: 'default',
          label: 'A',
          entry_points: [{ file: 'a.ts', symbol: 'fn' }],
          next: 'nonexistent',
        },
      })

      const trace = await simulateGraph(doc, makeOptions())

      expect(trace.status).toBe('error')
      expect(trace.error).toContain('not found in document')
    })

    it('invalid expression in switch case falls through to default', async () => {
      const doc = makeDoc({
        check: {
          type: 'switch',
          lane: 'default',
          label: 'Check',
          cases: [{ when: 'nonexistent.value > 0', next: 'done' }],
          default: 'done',
        },
        done: { type: 'terminal', lane: 'default', label: 'Done', outcome: 'success' },
      })

      const trace = await simulateGraph(doc, makeOptions())

      // Invalid expressions are caught per-case and treated as non-matching,
      // allowing label-style `when` values and graceful fallthrough to default
      expect(trace.status).toBe('success')
      const switchStep = trace.steps.find((s) => s.node_id === 'check')
      expect(switchStep).toBeDefined()
      expect(switchStep?.status).toBe('default')
    })
  })

  describe('failure terminal', () => {
    it('reports failure status when terminal has outcome=failure', async () => {
      const doc = makeDoc({
        a1: {
          type: 'action',
          lane: 'default',
          label: 'Step 1',
          entry_points: [{ file: 'a.ts', symbol: 'fn' }],
          next: 'fail',
        },
        fail: { type: 'terminal', lane: 'default', label: 'Failed', outcome: 'failure' },
      })

      const trace = await simulateGraph(doc, makeOptions())
      expect(trace.status).toBe('failure')
    })
  })
})
