import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runGraph } from '../../runner/walker.js'
import type { RunOptions } from '../../runner/types.js'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

// Mock both loader and rules evaluator
vi.mock('../../runner/loader.js', () => ({
  loadEntryPoint: vi.fn(),
}))

vi.mock('../../rules/loader.js', () => ({
  loadRulesFile: vi.fn(),
}))

vi.mock('../../rules/core.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../rules/core.js')>()
  return {
    ...actual,
    evaluateRules: vi.fn(),
  }
})

import { loadEntryPoint } from '../../runner/loader.js'
import { loadRulesFile } from '../../rules/loader.js'
import { evaluateRules } from '../../rules/core.js'

const mockedLoadEntryPoint = vi.mocked(loadEntryPoint)
const mockedLoadRulesFile = vi.mocked(loadRulesFile)
const mockedEvaluateRules = vi.mocked(evaluateRules)

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

describe('walker with rules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('action + rules', () => {
    it('evaluates rules and stores result for rules-driven action', async () => {
      const doc = makeDoc({
        compute: {
          type: 'action',
          lane: 'default',
          label: 'Compute Discount',
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

      mockedLoadRulesFile.mockReturnValue({
        schema: 'flowprint-rules/1.0',
        name: 'discount',
        hit_policy: 'first',
        rules: [],
      })
      mockedEvaluateRules.mockReturnValue({
        hit_policy: 'first',
        matched_count: 1,
        output: { discount_percent: 20, shipping: 'free' },
      })

      const trace = await runGraph(doc, makeOptions({ input: { amount: 150 } }))

      expect(trace.status).toBe('success')
      expect(trace.steps).toHaveLength(2)
      expect(trace.steps[0]?.node_id).toBe('compute')
      expect(trace.steps[0]?.status).toBe('completed')
      expect(trace.output).toEqual({ discount_percent: 20, shipping: 'free' })
      expect(mockedLoadRulesFile).toHaveBeenCalledWith('discount.rules.yaml', '/tmp/test')
      expect(mockedLoadEntryPoint).not.toHaveBeenCalled()
    })

    it('routes to error handler on rules evaluation failure', async () => {
      const doc = makeDoc({
        compute: {
          type: 'action',
          lane: 'default',
          label: 'Compute',
          rules: { file: 'broken.rules.yaml' },
          next: 'done',
          error: { catch: 'handle_error' },
        },
        handle_error: {
          type: 'error',
          lane: 'default',
          label: 'Handle Error',
          next: 'fail',
        },
        fail: {
          type: 'terminal',
          lane: 'default',
          label: 'Fail',
          outcome: 'failure',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      })

      mockedLoadRulesFile.mockImplementation(() => {
        throw new Error('Rules file not found')
      })

      const trace = await runGraph(doc, makeOptions())

      expect(trace.status).toBe('failure')
      expect(trace.steps[0]?.status).toBe('error')
      expect(trace.steps[0]?.error).toContain('Rules file not found')
    })

    it('downstream node can access rules result', async () => {
      const doc = makeDoc({
        compute: {
          type: 'action',
          lane: 'default',
          label: 'Compute',
          rules: { file: 'rules.yaml' },
          next: 'process',
        },
        process: {
          type: 'action',
          lane: 'default',
          label: 'Process',
          entry_points: [{ file: 'process.ts', symbol: 'process' }],
          inputs: { discount: 'compute.discount_percent' },
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      })

      mockedLoadRulesFile.mockReturnValue({
        schema: 'flowprint-rules/1.0',
        name: 'test',
        hit_policy: 'first',
        rules: [],
      })
      mockedEvaluateRules.mockReturnValue({
        hit_policy: 'first',
        matched_count: 1,
        output: { discount_percent: 15 },
      })
      mockedLoadEntryPoint.mockResolvedValue((args: unknown) => ({
        applied: args,
      }))

      const trace = await runGraph(doc, makeOptions())

      expect(trace.status).toBe('success')
      expect(trace.steps).toHaveLength(3)
      // The process node received the discount from compute's rules result
      expect(trace.output).toEqual({ applied: { discount: 15 } })
    })

    it('rejects unknown evaluator plugin', async () => {
      const doc = makeDoc({
        compute: {
          type: 'action',
          lane: 'default',
          label: 'Compute',
          rules: { file: 'rules.yaml', evaluator: 'gorules-zen' },
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
      expect(trace.error).toContain('unknown evaluator "gorules-zen"')
    })
  })

  describe('switch + rules', () => {
    it('routes via then.next from matching rule', async () => {
      const doc = makeDoc({
        route: {
          type: 'switch',
          lane: 'default',
          label: 'Route',
          rules: { file: 'routing.rules.yaml' },
          default: 'fallback',
        },
        premium_path: {
          type: 'terminal',
          lane: 'default',
          label: 'Premium',
          outcome: 'success',
        },
        fallback: {
          type: 'terminal',
          lane: 'default',
          label: 'Fallback',
          outcome: 'success',
        },
      })

      mockedLoadRulesFile.mockReturnValue({
        schema: 'flowprint-rules/1.0',
        name: 'routing',
        hit_policy: 'first',
        rules: [],
      })
      mockedEvaluateRules.mockReturnValue({
        hit_policy: 'first',
        matched_count: 1,
        output: { next: 'premium_path', discount: 20 },
      })

      const trace = await runGraph(doc, makeOptions({ input: { tier: 'premium' } }))

      expect(trace.status).toBe('success')
      expect(trace.steps[0]?.status).toBe('matched')
      expect(trace.steps[0]?.next).toBe('premium_path')
      expect(trace.steps[1]?.node_id).toBe('premium_path')
    })

    it('falls back to default when no next in output', async () => {
      const doc = makeDoc({
        route: {
          type: 'switch',
          lane: 'default',
          label: 'Route',
          rules: { file: 'routing.rules.yaml' },
          default: 'fallback',
        },
        fallback: {
          type: 'terminal',
          lane: 'default',
          label: 'Fallback',
          outcome: 'success',
        },
      })

      mockedLoadRulesFile.mockReturnValue({
        schema: 'flowprint-rules/1.0',
        name: 'routing',
        hit_policy: 'first',
        rules: [],
      })
      mockedEvaluateRules.mockReturnValue({
        hit_policy: 'first',
        matched_count: 0,
        output: {},
      })

      const trace = await runGraph(doc, makeOptions())

      expect(trace.status).toBe('success')
      expect(trace.steps[0]?.status).toBe('default')
      expect(trace.steps[0]?.next).toBe('fallback')
    })

    it('reports no-match when no next and no default', async () => {
      const doc = makeDoc({
        route: {
          type: 'switch',
          lane: 'default',
          label: 'Route',
          rules: { file: 'routing.rules.yaml' },
        },
      })

      mockedLoadRulesFile.mockReturnValue({
        schema: 'flowprint-rules/1.0',
        name: 'routing',
        hit_policy: 'first',
        rules: [],
      })
      mockedEvaluateRules.mockReturnValue({
        hit_policy: 'first',
        matched_count: 0,
        output: {},
      })

      const trace = await runGraph(doc, makeOptions())

      expect(trace.status).toBe('success')
      expect(trace.steps[0]?.status).toBe('no-match')
    })

    it('stores rules result in context for downstream access', async () => {
      const doc = makeDoc({
        route: {
          type: 'switch',
          lane: 'default',
          label: 'Route',
          rules: { file: 'routing.rules.yaml' },
        },
        process: {
          type: 'action',
          lane: 'default',
          label: 'Process',
          entry_points: [{ file: 'p.ts', symbol: 'process' }],
          inputs: { tier: 'route.tier' },
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      })

      mockedLoadRulesFile.mockReturnValue({
        schema: 'flowprint-rules/1.0',
        name: 'routing',
        hit_policy: 'first',
        rules: [],
      })
      mockedEvaluateRules.mockReturnValue({
        hit_policy: 'first',
        matched_count: 1,
        output: { next: 'process', tier: 'gold' },
      })
      mockedLoadEntryPoint.mockResolvedValue((args: unknown) => args)

      const trace = await runGraph(doc, makeOptions())

      expect(trace.status).toBe('success')
      expect(trace.output).toEqual({ tier: 'gold' })
    })

    it('rejects unknown evaluator plugin on switch', async () => {
      const doc = makeDoc({
        route: {
          type: 'switch',
          lane: 'default',
          label: 'Route',
          rules: { file: 'rules.yaml', evaluator: 'opa' },
          default: 'done',
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
      expect(trace.error).toContain('unknown evaluator "opa"')
    })
  })

  describe('mixed flows', () => {
    it('handles flow with both rules-driven and entry_point nodes', async () => {
      const doc = makeDoc({
        classify: {
          type: 'action',
          lane: 'default',
          label: 'Classify',
          rules: { file: 'classify.rules.yaml' },
          next: 'route',
        },
        route: {
          type: 'switch',
          lane: 'default',
          label: 'Route',
          cases: [{ when: 'classify.priority === "high"', next: 'urgent' }],
          default: 'normal',
        },
        urgent: {
          type: 'action',
          lane: 'default',
          label: 'Urgent',
          entry_points: [{ file: 'u.ts', symbol: 'handleUrgent' }],
          next: 'done',
        },
        normal: {
          type: 'action',
          lane: 'default',
          label: 'Normal',
          entry_points: [{ file: 'n.ts', symbol: 'handleNormal' }],
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      })

      mockedLoadRulesFile.mockReturnValue({
        schema: 'flowprint-rules/1.0',
        name: 'classify',
        hit_policy: 'first',
        rules: [],
      })
      mockedEvaluateRules.mockReturnValue({
        hit_policy: 'first',
        matched_count: 1,
        output: { priority: 'high' },
      })
      mockedLoadEntryPoint.mockResolvedValue(() => ({ handled: true }))

      const trace = await runGraph(doc, makeOptions())

      expect(trace.status).toBe('success')
      expect(trace.steps.map((s) => s.node_id)).toEqual([
        'classify',
        'route',
        'urgent',
        'done',
      ])
    })

    it('handles flow with rules-driven switch and cases-driven switch', async () => {
      const doc = makeDoc({
        rules_route: {
          type: 'switch',
          lane: 'default',
          label: 'Rules Route',
          rules: { file: 'route.rules.yaml' },
          default: 'cases_route',
        },
        cases_route: {
          type: 'switch',
          lane: 'default',
          label: 'Cases Route',
          cases: [{ when: 'true', next: 'done' }],
        },
        premium: {
          type: 'terminal',
          lane: 'default',
          label: 'Premium',
          outcome: 'success',
        },
        done: {
          type: 'terminal',
          lane: 'default',
          label: 'Done',
          outcome: 'success',
        },
      })

      mockedLoadRulesFile.mockReturnValue({
        schema: 'flowprint-rules/1.0',
        name: 'route',
        hit_policy: 'first',
        rules: [],
      })
      mockedEvaluateRules.mockReturnValue({
        hit_policy: 'first',
        matched_count: 1,
        output: { next: 'premium' },
      })

      const trace = await runGraph(doc, makeOptions())

      expect(trace.status).toBe('success')
      expect(trace.steps.map((s) => s.node_id)).toEqual(['rules_route', 'premium'])
    })
  })
})
