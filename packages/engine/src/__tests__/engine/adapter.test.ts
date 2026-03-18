import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PlainAdapter, ActionTimeoutError } from '../../adapters/plain.js'
import type { ExecutionAdapter, ActionConfig } from '../../adapters/types.js'
import type { ExecutionContext } from '../../walker/types.js'
import { FlowprintEngine } from '../../engine/engine.js'

/**
 * Helper: create a minimal ExecutionContext for adapter tests.
 */
function makeCtx(overrides?: Partial<ExecutionContext>): ExecutionContext {
  return {
    input: {},
    state: {},
    node: { id: 'test_node', type: 'action', lane: 'default' },
    signal: new AbortController().signal,
    ...overrides,
  }
}

/**
 * Minimal 3-node YAML: trigger -> action -> terminal.
 */
const SIMPLE_FLOW = `
schema: flowprint/1.0
name: adapter-test-flow
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

describe('PlainAdapter', () => {
  let adapter: PlainAdapter

  beforeEach(() => {
    adapter = new PlainAdapter()
  })

  describe('executeAction', () => {
    it('executes handler and returns result', async () => {
      const handler = async () => ({ result: 42 })
      const ctx = makeCtx()

      const result = await adapter.executeAction('test_node', handler, ctx, {})
      expect(result).toEqual({ result: 42 })
    })

    it('handler receives ExecutionContext with AbortSignal', async () => {
      let receivedSignal: AbortSignal | undefined

      const handler = async (ctx: ExecutionContext) => {
        receivedSignal = ctx.signal
        return {}
      }
      const ctx = makeCtx()

      await adapter.executeAction('test_node', handler, ctx, {})

      expect(receivedSignal).toBeDefined()
      expect(receivedSignal).toBeInstanceOf(AbortSignal)
      expect(receivedSignal!.aborted).toBe(false)
    })

    it('times out handler that takes too long', async () => {
      const handler = async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000))
        return { never: 'reached' }
      }
      const ctx = makeCtx()

      await expect(
        adapter.executeAction('slow_node', handler, ctx, { timeout: 50 }),
      ).rejects.toThrow(ActionTimeoutError)

      await expect(
        adapter.executeAction('slow_node', handler, ctx, { timeout: 50 }),
      ).rejects.toThrow("timed out after 50ms")
    })

    it('handler that completes quickly with generous timeout succeeds', async () => {
      const handler = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return { fast: true }
      }
      const ctx = makeCtx()

      const result = await adapter.executeAction('fast_node', handler, ctx, { timeout: 1000 })
      expect(result).toEqual({ fast: true })
    })

    it('rejects immediately with pre-aborted signal', async () => {
      const controller = new AbortController()
      controller.abort(new Error('already cancelled'))

      const handler = vi.fn(async () => ({ never: 'called' }))
      const ctx = makeCtx({ signal: controller.signal })

      await expect(
        adapter.executeAction('pre_aborted', handler, ctx, { timeout: 5000 }),
      ).rejects.toThrow()
    })

    it('completes normally with very large timeout', async () => {
      const handler = async () => ({ ok: true })
      const ctx = makeCtx()

      const result = await adapter.executeAction('no_timeout', handler, ctx, {
        timeout: 999_999_999,
      })
      expect(result).toEqual({ ok: true })
    })

    it('uses default timeout when config.timeout is not set', async () => {
      const shortAdapter = new PlainAdapter({ defaultTimeout: 50 })

      const handler = async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000))
        return {}
      }
      const ctx = makeCtx()

      await expect(
        shortAdapter.executeAction('default_timeout', handler, ctx, {}),
      ).rejects.toThrow(ActionTimeoutError)
    })

    it('config.timeout overrides defaultTimeout', async () => {
      const shortAdapter = new PlainAdapter({ defaultTimeout: 10 })

      const handler = async () => {
        await new Promise((resolve) => setTimeout(resolve, 30))
        return { completed: true }
      }
      const ctx = makeCtx()

      // The default timeout is 10ms which would fail, but config says 1000ms
      const result = await shortAdapter.executeAction('override_timeout', handler, ctx, {
        timeout: 1000,
      })
      expect(result).toEqual({ completed: true })
    })

    it('propagates handler errors (not timeout)', async () => {
      const handler = async () => {
        throw new Error('handler exploded')
      }
      const ctx = makeCtx()

      await expect(adapter.executeAction('error_node', handler, ctx, {})).rejects.toThrow(
        'handler exploded',
      )
    })
  })
})

describe('Adapter integration with engine', () => {
  it('engine with PlainAdapter: registered handler executes through adapter', async () => {
    const engine = new FlowprintEngine({ adapter: new PlainAdapter() })
    engine.register('process', async () => ({ adapted: true }))

    const flow = await engine.load(SIMPLE_FLOW)
    const result = await flow.execute({})

    expect(result.outcome).toBe('success')
    expect(result.output).toMatchObject({ adapted: true })
  })

  it('engine with custom mock adapter: mock.executeAction called with correct args', async () => {
    const mockAdapter: ExecutionAdapter = {
      name: 'mock',
      executeAction: vi.fn(
        async (
          _nodeId: string,
          handler: (ctx: ExecutionContext) => Promise<unknown>,
          context: ExecutionContext,
          _config: ActionConfig,
        ) => {
          return handler(context)
        },
      ),
    }

    const engine = new FlowprintEngine({ adapter: mockAdapter })
    engine.register('process', async () => ({ mocked: true }))

    const flow = await engine.load(SIMPLE_FLOW)
    const result = await flow.execute({ data: 'test' })

    expect(result.outcome).toBe('success')
    expect(result.output).toMatchObject({ mocked: true })

    // Verify mock was called with correct arguments
    expect(mockAdapter.executeAction).toHaveBeenCalledWith(
      'process',
      expect.any(Function),
      expect.objectContaining({
        input: { data: 'test' },
        node: expect.objectContaining({ id: 'process', type: 'action' }),
      }),
      expect.objectContaining({}),
    )
  })

  it('default adapter: engine without explicit adapter uses PlainAdapter', async () => {
    const engine = new FlowprintEngine()
    engine.register('process', async () => ({ default_adapter: true }))

    const flow = await engine.load(SIMPLE_FLOW)
    const result = await flow.execute({})

    expect(result.outcome).toBe('success')
    expect(result.output).toMatchObject({ default_adapter: true })
  })
})

describe('Adapter lifecycle', () => {
  it('init() is callable on PlainAdapter (no-op)', async () => {
    const adapter = new PlainAdapter()
    // PlainAdapter doesn't define init(), but the interface allows it
    await adapter.init?.()
  })

  it('shutdown() is callable on PlainAdapter (no-op)', async () => {
    const adapter = new PlainAdapter()
    // PlainAdapter doesn't define shutdown(), but the interface allows it
    await adapter.shutdown?.()
  })

  it('custom adapter with init/shutdown lifecycle', async () => {
    const initFn = vi.fn(async () => {})
    const shutdownFn = vi.fn(async () => {})

    const lifecycleAdapter: ExecutionAdapter = {
      name: 'lifecycle-test',
      init: initFn,
      shutdown: shutdownFn,
      executeAction: async (_nodeId, handler, ctx) => handler(ctx),
    }

    await lifecycleAdapter.init?.()
    expect(initFn).toHaveBeenCalledOnce()

    const ctx = makeCtx()
    await lifecycleAdapter.executeAction('test', async () => ({ ok: true }), ctx, {})

    await lifecycleAdapter.shutdown?.()
    expect(shutdownFn).toHaveBeenCalledOnce()
  })
})
