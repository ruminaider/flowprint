import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FlowprintEngine } from '../../engine/engine.js'
import type { CompiledFlow } from '../../engine/compiled-flow.js'
import type { ExecutionContext, NodeExecutionRecord } from '../../walker/types.js'
import type { EngineHooks } from '../../engine/types.js'

/**
 * Minimal 3-node YAML: trigger → action → terminal.
 */
const SIMPLE_FLOW = `
schema: flowprint/1.0
name: test-flow
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
    next: process
  process:
    type: action
    lane: default
    label: Process
    next: done
  done:
    type: terminal
    lane: default
    label: Done
    outcome: success
`

/**
 * Flow with expressions on an action node.
 */
const EXPRESSIONS_FLOW = `
schema: flowprint/1.0
name: expr-flow
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
    next: compute
  compute:
    type: action
    lane: default
    label: Compute
    expressions:
      doubled: "input.value * 2"
      greeting: "'hello'"
    next: done
  done:
    type: terminal
    lane: default
    label: Done
    outcome: success
`

/**
 * Flow with a switch node.
 */
const SWITCH_FLOW = `
schema: flowprint/1.0
name: switch-flow
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
    next: decide
  decide:
    type: switch
    lane: default
    label: Decide
    cases:
      - when: "input.route === 'a'"
        next: done_a
      - when: "input.route === 'b'"
        next: done_b
    default: done_b
  done_a:
    type: terminal
    lane: default
    label: Done A
    outcome: success
  done_b:
    type: terminal
    lane: default
    label: Done B
    outcome: failure
`

/**
 * Flow with a wait node (should throw on execute()).
 */
const WAIT_FLOW = `
schema: flowprint/1.0
name: wait-flow
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
    next: wait_signal
  wait_signal:
    type: wait
    lane: default
    label: Wait for Signal
    event: user_response
    next: done
  done:
    type: terminal
    lane: default
    label: Done
    outcome: success
`

/**
 * Two-action flow where both have no handler.
 */
const NO_HANDLER_FLOW = `
schema: flowprint/1.0
name: no-handler-flow
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
    next: unhandled
  unhandled:
    type: action
    lane: default
    label: Unhandled
    next: done
  done:
    type: terminal
    lane: default
    label: Done
    outcome: success
`

describe('FlowprintEngine', () => {
  let engine: FlowprintEngine

  beforeEach(() => {
    engine = new FlowprintEngine()
  })

  describe('lifecycle: register → load → execute', () => {
    it('executes a simple trigger → action → terminal flow', async () => {
      engine.register('process', async (ctx: ExecutionContext) => {
        return { processed: true, input_value: ctx.input }
      })

      const flow = await engine.load(SIMPLE_FLOW)
      const result = await flow.execute({ data: 'test' })

      expect(result.outcome).toBe('success')
      expect(result.output).toMatchObject({ processed: true })
      expect(result.trace.length).toBeGreaterThanOrEqual(3)
    })

    it('supports chained register calls', async () => {
      const flow = await engine.register('process', async () => ({ a: 1 })).load(SIMPLE_FLOW)

      const result = await flow.execute({})
      expect(result.output).toMatchObject({ a: 1 })
    })
  })

  describe('load() with YAML content string', () => {
    it('detects YAML content by schema: prefix', async () => {
      engine.register('process', async () => ({ ok: true }))

      const flow = await engine.load(SIMPLE_FLOW.trim())
      const result = await flow.execute({})
      expect(result.outcome).toBe('success')
    })

    it('detects YAML content by newlines', async () => {
      engine.register('process', async () => ({ ok: true }))

      const flow = await engine.load(SIMPLE_FLOW)
      const result = await flow.execute({})
      expect(result.outcome).toBe('success')
    })
  })

  describe('load() validation', () => {
    it('throws on invalid YAML syntax', async () => {
      const invalidYaml = '{{{{not valid yaml\n  broken: [['
      await expect(engine.load(invalidYaml)).rejects.toThrow('YAML parse error')
    })

    it('throws on schema validation failure', async () => {
      const invalidYaml = `
schema: flowprint/1.0
name: bad
version: "1.0.0"
lanes:
  default:
    label: Default
    visibility: internal
    order: 0
nodes:
  broken:
    type: action
    lane: default
    label: Broken
    next: nonexistent_node
`
      await expect(engine.load(invalidYaml)).rejects.toThrow('validation failed')
    })
  })

  describe('handler resolution', () => {
    it('registered handler takes priority over expressions', async () => {
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

      engine.register('compute', async () => ({ overridden: true }))
      const flow = await engine.load(EXPRESSIONS_FLOW)
      const result = await flow.execute({ value: 5 })

      expect(result.output).toMatchObject({ overridden: true })
      // Should have logged a debug message about override
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('overrides expressions'))

      debugSpy.mockRestore()
    })

    it('registered handler with override: true suppresses debug log', async () => {
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

      engine.register('compute', async () => ({ overridden: true }), { override: true })
      await engine.load(EXPRESSIONS_FLOW)

      expect(debugSpy).not.toHaveBeenCalledWith(expect.stringContaining('overrides expressions'))

      debugSpy.mockRestore()
    })

    it('expressions-only action works', async () => {
      const flow = await engine.load(EXPRESSIONS_FLOW)
      const result = await flow.execute({ value: 5 })

      expect(result.output).toMatchObject({ doubled: 10, greeting: 'hello' })
    })

    it('no handler throws at load() time', async () => {
      await expect(engine.load(NO_HANDLER_FLOW)).rejects.toThrow('No handler for node "unhandled"')
    })
  })

  describe('CompiledFlow.execute()', () => {
    it('returns ExecutionResult with output, trace, and outcome', async () => {
      engine.register('process', async () => ({ value: 42 }))
      const flow = await engine.load(SIMPLE_FLOW)
      const result = await flow.execute({})

      expect(result).toHaveProperty('output')
      expect(result).toHaveProperty('trace')
      expect(result).toHaveProperty('outcome')
      expect(result.outcome).toBe('success')
      expect(result.output).toMatchObject({ value: 42 })
    })

    it('trace contains NodeExecutionRecord entries', async () => {
      engine.register('process', async () => ({ done: true }))
      const flow = await engine.load(SIMPLE_FLOW)
      const result = await flow.execute({})

      for (const record of result.trace) {
        expect(record).toHaveProperty('nodeId')
        expect(record).toHaveProperty('type')
        expect(record).toHaveProperty('lane')
        expect(record).toHaveProperty('startedAt')
        expect(record).toHaveProperty('completedAt')
        expect(record).toHaveProperty('output')
        expect(record).toHaveProperty('handler')
      }
    })

    it('multiple execute() calls on same CompiledFlow have independent state', async () => {
      let callCount = 0
      engine.register('process', async (ctx: ExecutionContext) => {
        callCount++
        return { callNumber: callCount, inputData: ctx.input }
      })

      const flow = await engine.load(SIMPLE_FLOW)

      const [result1, result2] = await Promise.all([
        flow.execute({ id: 'first' }),
        flow.execute({ id: 'second' }),
      ])

      // Each call should have independent state
      expect(result1.output.inputData).toEqual({ id: 'first' })
      expect(result2.output.inputData).toEqual({ id: 'second' })
      // Both should succeed
      expect(result1.outcome).toBe('success')
      expect(result2.outcome).toBe('success')
    })
  })

  describe('hot reload: handler isolation', () => {
    it('old CompiledFlow uses handler A, new uses handler B after re-register', async () => {
      engine.register('process', async () => ({ version: 'A' }))
      const flowA = await engine.load(SIMPLE_FLOW)

      engine.register('process', async () => ({ version: 'B' }))
      const flowB = await engine.load(SIMPLE_FLOW)

      const resultA = await flowA.execute({})
      const resultB = await flowB.execute({})

      expect(resultA.output).toMatchObject({ version: 'A' })
      expect(resultB.output).toMatchObject({ version: 'B' })
    })

    it('mutating engine handlers after load() does not affect existing CompiledFlow', async () => {
      engine.register('process', async () => ({ value: 'original' }))
      const flow = await engine.load(SIMPLE_FLOW)

      // Register a new handler after load
      engine.register('process', async () => ({ value: 'mutated' }))

      const result = await flow.execute({})
      // The original CompiledFlow should still use the handler from load() time
      expect(result.output).toMatchObject({ value: 'original' })
    })
  })

  describe('switch node execution', () => {
    it('follows the matched case', async () => {
      const flow = await engine.load(SWITCH_FLOW)
      const result = await flow.execute({ route: 'a' })

      expect(result.outcome).toBe('success')
    })

    it('falls through to default when no case matches', async () => {
      const flow = await engine.load(SWITCH_FLOW)
      const result = await flow.execute({ route: 'unknown' })

      expect(result.outcome).toBe('failure')
    })
  })

  describe('wait node', () => {
    it('throws "Wait nodes require start()" on execute()', async () => {
      engine.register('process', async () => ({}))

      // Build a flow with a wait node (the trigger goes to wait)
      const flow = await engine.load(WAIT_FLOW)
      await expect(flow.execute({})).rejects.toThrow('Wait nodes require start(), not execute()')
    })
  })

  describe('observability hooks', () => {
    let hooks: Required<EngineHooks>
    let flow: CompiledFlow

    beforeEach(async () => {
      hooks = {
        onNodeStart: vi.fn(),
        onNodeComplete: vi.fn(),
        onFlowError: vi.fn(),
      }

      const hookedEngine = new FlowprintEngine({ hooks })
      hookedEngine.register('process', async () => ({ hooked: true }))
      flow = await hookedEngine.load(SIMPLE_FLOW)
    })

    it('calls onNodeStart before each node with correct args', async () => {
      await flow.execute({})

      expect(hooks.onNodeStart).toHaveBeenCalledWith('start', 'trigger', 'default')
      expect(hooks.onNodeStart).toHaveBeenCalledWith('process', 'action', 'default')
      expect(hooks.onNodeStart).toHaveBeenCalledWith('done', 'terminal', 'default')
    })

    it('calls onNodeComplete after each node with NodeExecutionRecord', async () => {
      await flow.execute({})

      expect(hooks.onNodeComplete).toHaveBeenCalledTimes(3)

      // Verify the record shape for the action node
      const actionCall = (hooks.onNodeComplete as ReturnType<typeof vi.fn>).mock.calls.find(
        (call: unknown[]) => (call[0] as NodeExecutionRecord).nodeId === 'process',
      )
      expect(actionCall).toBeDefined()
      const record = actionCall![0] as NodeExecutionRecord
      expect(record.nodeId).toBe('process')
      expect(record.type).toBe('action')
      expect(record.lane).toBe('default')
      expect(record.handler).toBe('registered')
      expect(record.output).toMatchObject({ hooked: true })
      expect(record.startedAt).toBeLessThanOrEqual(record.completedAt)
    })

    it('calls onFlowError on execution error', async () => {
      const errorEngine = new FlowprintEngine({ hooks })
      errorEngine.register('process', async () => {
        throw new Error('deliberate failure')
      })
      const errorFlow = await errorEngine.load(SIMPLE_FLOW)

      await expect(errorFlow.execute({})).rejects.toThrow('deliberate failure')
      expect(hooks.onFlowError).toHaveBeenCalledWith(expect.any(Error))
      expect((hooks.onFlowError as ReturnType<typeof vi.fn>).mock.calls[0]![0].message).toBe(
        'deliberate failure',
      )
    })

    it('hook that throws does not break execution', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const throwingHooks: EngineHooks = {
        onNodeStart: () => {
          throw new Error('hook explosion')
        },
        onNodeComplete: vi.fn(),
      }

      const throwEngine = new FlowprintEngine({ hooks: throwingHooks })
      throwEngine.register('process', async () => ({ survived: true }))
      const throwFlow = await throwEngine.load(SIMPLE_FLOW)

      const result = await throwFlow.execute({})
      expect(result.outcome).toBe('success')
      expect(result.output).toMatchObject({ survived: true })

      // Error should have been logged
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[flowprint] Hook error:'),
        expect.stringContaining('hook explosion'),
      )

      errorSpy.mockRestore()
    })
  })

  describe('handler override logging', () => {
    it('logs debug when registered handler overrides expressions', async () => {
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

      engine.register('compute', async () => ({ overridden: true }))
      await engine.load(EXPRESSIONS_FLOW)

      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('overrides expressions'))

      debugSpy.mockRestore()
    })

    it('no debug log with override: true', async () => {
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

      engine.register('compute', async () => ({ overridden: true }), { override: true })
      await engine.load(EXPRESSIONS_FLOW)

      const expressionOverrideCalls = debugSpy.mock.calls.filter(
        (call) => typeof call[0] === 'string' && call[0].includes('overrides expressions'),
      )
      expect(expressionOverrideCalls).toHaveLength(0)

      debugSpy.mockRestore()
    })
  })

  describe('trace handler discriminant', () => {
    it('records "registered" handler type for registered handlers', async () => {
      engine.register('process', async () => ({ data: 1 }))
      const flow = await engine.load(SIMPLE_FLOW)
      const result = await flow.execute({})

      const actionRecord = result.trace.find((r) => r.nodeId === 'process')
      expect(actionRecord?.handler).toBe('registered')
    })

    it('records "expressions" handler type for expression nodes', async () => {
      const flow = await engine.load(EXPRESSIONS_FLOW)
      const result = await flow.execute({ value: 3 })

      const exprRecord = result.trace.find((r) => r.nodeId === 'compute')
      expect(exprRecord?.handler).toBe('expressions')
    })

    it('records "native" handler type for trigger and terminal nodes', async () => {
      engine.register('process', async () => ({}))
      const flow = await engine.load(SIMPLE_FLOW)
      const result = await flow.execute({})

      const triggerRecord = result.trace.find((r) => r.nodeId === 'start')
      expect(triggerRecord?.handler).toBe('native')

      const terminalRecord = result.trace.find((r) => r.nodeId === 'done')
      expect(terminalRecord?.handler).toBe('native')
    })
  })
})
