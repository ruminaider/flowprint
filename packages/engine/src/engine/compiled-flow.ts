import type {
  FlowprintDocument,
  ActionNode,
  SwitchNode,
  ParallelNode,
  WaitNode,
  ErrorNode,
  TriggerNode,
  TerminalNode,
} from '@ruminaider/flowprint-schema'
import { isActionNode } from '@ruminaider/flowprint-schema'
import { walkGraph } from '../walker/walk.js'
import type { WalkGraphCallbacks } from '../walker/walk.js'
import type { ExecutionContext, NodeExecutionRecord } from '../walker/types.js'
import { evaluateExpression } from '../runner/evaluator.js'
import { loadRulesFile, evaluateRules } from '../rules/evaluator.js'
import { PlainAdapter } from '../adapters/plain.js'
import type { ExecutionAdapter } from '../adapters/types.js'
import { Execution } from './execution.js'
import { RealClock } from './clock.js'
import type { Clock } from './clock.js'
import { parseDuration } from './duration.js'
import { buildLegacyContext } from './engine.js'
import type { EngineOptions, ExecutionResult, ResolvedHandler, EngineHooks } from './types.js'

/** Default TTL for paused executions: 1 hour. */
const DEFAULT_PAUSED_TTL = 3_600_000

/**
 * An immutable, pre-compiled flow ready for execution.
 *
 * Created by `FlowprintEngine.load()`. Handler resolution is frozen at construction time,
 * so subsequent engine mutations do not affect this instance.
 */
export class CompiledFlow {
  private readonly adapter: ExecutionAdapter
  private readonly clock: Clock

  constructor(
    private readonly doc: FlowprintDocument,
    private readonly resolvedHandlers: ReadonlyMap<string, ResolvedHandler>,
    private readonly options: EngineOptions,
  ) {
    this.clock = options.clock ?? new RealClock()
    this.adapter =
      options.adapter ??
      new PlainAdapter({ defaultTimeout: options.defaultTimeout, clock: this.clock })
  }

  /**
   * Execute a flow that has no wait nodes. Returns when complete.
   *
   * Each call creates independent state — multiple concurrent executions
   * on the same CompiledFlow instance do not interfere.
   */
  async execute(input: Record<string, unknown>): Promise<ExecutionResult> {
    const hooks = this.options.hooks
    const projectRoot = this.options.projectRoot ?? process.cwd()
    const expressionTimeout = this.options.expressionTimeout

    const callbacks = this.buildCallbacks(hooks, projectRoot, expressionTimeout)

    try {
      const result = await walkGraph(this.doc, input, callbacks)
      return {
        output: result.output,
        trace: result.trace,
        outcome: result.outcome,
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      safeCallHook(() => hooks?.onFlowError?.(error))
      throw err
    }
  }

  /**
   * Start a flow that may contain wait nodes. Returns an Execution handle
   * for signal delivery and status tracking.
   *
   * The flow runs asynchronously. Use `execution.result` to await completion.
   */
  start(input: Record<string, unknown>): Execution {
    const adapter = this.adapter
    if (!(adapter instanceof PlainAdapter)) {
      throw new Error('start() requires PlainAdapter (or a subclass)')
    }

    const ttl = this.options.pausedExecutionTTL ?? DEFAULT_PAUSED_TTL
    const execution = new Execution(adapter, this.clock, this.options.validateSignal, ttl)

    // Run the flow asynchronously
    this.runAsync(input, execution, adapter).then(
      (result) => execution.complete(result),
      (error) => {
        const err = error instanceof Error ? error : new Error(String(error))
        execution.fail(err)
      },
    )

    return execution
  }

  /**
   * Run the flow asynchronously with wait-node support.
   * When a wait node is hit, calls adapter.waitForEvent() which suspends
   * until a signal is delivered via Execution.signal().
   */
  private async runAsync(
    input: Record<string, unknown>,
    execution: Execution,
    adapter: PlainAdapter,
  ): Promise<ExecutionResult> {
    const hooks = this.options.hooks
    const projectRoot = this.options.projectRoot ?? process.cwd()
    const expressionTimeout = this.options.expressionTimeout

    const callbacks = this.buildCallbacks(hooks, projectRoot, expressionTimeout, execution, adapter)

    try {
      const result = await walkGraph(this.doc, input, callbacks)
      return {
        output: result.output,
        trace: result.trace,
        outcome: result.outcome,
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      safeCallHook(() => hooks?.onFlowError?.(error))
      throw err
    }
  }

  /**
   * Build WalkerCallbacks that dispatch to resolvedHandlers.
   *
   * walkGraph replaces `callbacks.onStep` in-place with an interceptor that
   * pushes records into its internal trace array. The node callbacks below
   * call `callbacks.onStep(record)` which, at call time, is the intercepted
   * version. The original onStep is a no-op, so no recursion occurs.
   */
  private buildCallbacks(
    hooks: EngineHooks | undefined,
    projectRoot: string,
    expressionTimeout: number | undefined,
    execution?: Execution,
    plainAdapter?: PlainAdapter,
  ): WalkGraphCallbacks<NodeExecutionRecord> {
    const resolvedHandlers = this.resolvedHandlers
    const doc = this.doc
    const adapter = this.adapter

    // eslint-disable-next-line prefer-const
    let callbacks: WalkGraphCallbacks<NodeExecutionRecord>

    /**
     * Record a step. Delegates to callbacks.onStep which walkGraph has
     * replaced with its trace-collecting interceptor.
     */
    const recordStep = (record: NodeExecutionRecord): void => {
      callbacks.onStep(record)
    }

    callbacks = {
      onAction: async (
        nodeId: string,
        node: ActionNode,
        ctx: ExecutionContext,
      ): Promise<unknown> => {
        safeCallHook(() => hooks?.onNodeStart?.(nodeId, node.type, node.lane))
        const startedAt = performance.now()

        try {
          const handler = resolvedHandlers.get(nodeId)
          let result: unknown

          if (!handler) {
            throw new Error(`No resolved handler for action node "${nodeId}"`)
          }

          switch (handler.type) {
            case 'registered':
            case 'entry_point':
              result = await adapter.executeAction(nodeId, handler.fn, ctx, {
                metadata: node.metadata as Record<string, unknown> | undefined,
              })
              break

            case 'expressions': {
              const legacyCtx = buildLegacyContext(ctx)
              const output: Record<string, unknown> = {}
              for (const [key, expr] of Object.entries(handler.exprs)) {
                output[key] = evaluateExpression(expr, legacyCtx, expressionTimeout)
              }
              result = output
              break
            }

            case 'rules': {
              const rulesDoc = loadRulesFile(handler.rulesFile, projectRoot)
              const legacyCtx = buildLegacyContext(ctx)
              const rulesResult = evaluateRules(rulesDoc, legacyCtx, expressionTimeout)
              ctx.state[nodeId] = rulesResult.output
              result = rulesResult.output
              break
            }

            case 'native':
              result = {}
              break
          }

          const record: NodeExecutionRecord = {
            nodeId,
            type: node.type,
            lane: node.lane,
            startedAt,
            completedAt: performance.now(),
            output:
              result && typeof result === 'object' && !Array.isArray(result)
                ? (result as Record<string, unknown>)
                : {},
            handler: handler.type === 'entry_point' ? 'entry_point' : handler.type,
          }
          safeCallHook(() => hooks?.onNodeComplete?.(record))
          recordStep(record)

          return result
        } catch (err: unknown) {
          const error = err instanceof Error ? err : new Error(String(err))
          const handlerType = resolvedHandlers.get(nodeId)?.type ?? 'native'
          const record: NodeExecutionRecord = {
            nodeId,
            type: node.type,
            lane: node.lane,
            startedAt,
            completedAt: performance.now(),
            output: {},
            handler:
              handlerType === 'entry_point'
                ? 'entry_point'
                : (handlerType as NodeExecutionRecord['handler']),
            error: { message: error.message, stack: error.stack },
          }
          safeCallHook(() => hooks?.onNodeComplete?.(record))
          recordStep(record)
          throw err
        }
      },

      onSwitch: async (
        nodeId: string,
        node: SwitchNode,
        ctx: ExecutionContext,
      ): Promise<string | undefined> => {
        safeCallHook(() => hooks?.onNodeStart?.(nodeId, node.type, node.lane))
        const startedAt = performance.now()

        const legacyCtx = buildLegacyContext(ctx)

        // Rules-driven switch
        if (node.rules) {
          const rulesDoc = loadRulesFile(node.rules.file, projectRoot)
          const rulesResult = evaluateRules(rulesDoc, legacyCtx, expressionTimeout)
          ctx.state[nodeId] = rulesResult.output

          const output = rulesResult.output as Record<string, unknown>
          const nextNode = output.next as string | undefined

          const record: NodeExecutionRecord = {
            nodeId,
            type: node.type,
            lane: node.lane,
            startedAt,
            completedAt: performance.now(),
            output: rulesResult.output as Record<string, unknown>,
            handler: 'rules',
          }
          safeCallHook(() => hooks?.onNodeComplete?.(record))
          recordStep(record)

          if (nextNode) return nextNode
          return node.default
        }

        // Expression-based switch — evaluate cases top-to-bottom
        for (const c of node.cases ?? []) {
          const result = evaluateExpression(c.when, legacyCtx, expressionTimeout)
          if (result) {
            const record: NodeExecutionRecord = {
              nodeId,
              type: node.type,
              lane: node.lane,
              startedAt,
              completedAt: performance.now(),
              output: {},
              handler: 'native',
            }
            safeCallHook(() => hooks?.onNodeComplete?.(record))
            recordStep(record)
            return c.next
          }
        }

        // Default branch
        const record: NodeExecutionRecord = {
          nodeId,
          type: node.type,
          lane: node.lane,
          startedAt,
          completedAt: performance.now(),
          output: {},
          handler: 'native',
        }
        safeCallHook(() => hooks?.onNodeComplete?.(record))
        recordStep(record)
        return node.default
      },

      onParallel: async (
        nodeId: string,
        node: ParallelNode,
        ctx: ExecutionContext,
      ): Promise<unknown> => {
        safeCallHook(() => hooks?.onNodeStart?.(nodeId, node.type, node.lane))
        const startedAt = performance.now()

        const branchPromises = node.branches.map(async (branchId) => {
          const branchNode = doc.nodes[branchId]
          if (!branchNode) {
            throw new Error(`Parallel branch node "${branchId}" not found`)
          }

          const handler = resolvedHandlers.get(branchId)
          if (!handler) {
            throw new Error(`No resolved handler for parallel branch "${branchId}"`)
          }

          if (isActionNode(branchNode)) {
            let result: unknown
            switch (handler.type) {
              case 'registered':
              case 'entry_point':
                result = await adapter.executeAction(branchId, handler.fn, ctx, {
                  metadata: branchNode.metadata as Record<string, unknown> | undefined,
                })
                break
              case 'expressions': {
                const legacyCtx = buildLegacyContext(ctx)
                const output: Record<string, unknown> = {}
                for (const [key, expr] of Object.entries(handler.exprs)) {
                  output[key] = evaluateExpression(expr, legacyCtx, expressionTimeout)
                }
                result = output
                break
              }
              case 'rules': {
                const rulesDoc = loadRulesFile(handler.rulesFile, projectRoot)
                const legacyCtx = buildLegacyContext(ctx)
                const rulesResult = evaluateRules(rulesDoc, legacyCtx, expressionTimeout)
                result = rulesResult.output
                break
              }
              case 'native':
                result = {}
                break
            }

            ctx.state[branchId] = result
            return { branchId, result }
          }

          throw new Error(
            `Parallel branch "${branchId}" is not an action node (type: ${branchNode.type})`,
          )
        })

        const results = await Promise.all(branchPromises)
        const resultMap: Record<string, unknown> = {}
        for (const r of results) {
          resultMap[r.branchId] = r.result
        }
        ctx.state[nodeId] = resultMap
        const parallelResult = { [nodeId]: resultMap }

        const record: NodeExecutionRecord = {
          nodeId,
          type: node.type,
          lane: node.lane,
          startedAt,
          completedAt: performance.now(),
          output: parallelResult,
          handler: 'native',
        }
        safeCallHook(() => hooks?.onNodeComplete?.(record))
        recordStep(record)
        return parallelResult
      },

      onWait: async (
        nodeId: string,
        node: WaitNode,
        _ctx: ExecutionContext,
      ): Promise<unknown> => {
        if (!execution || !plainAdapter) {
          throw new Error('Wait nodes require start(), not execute()')
        }

        safeCallHook(() => hooks?.onNodeStart?.(nodeId, node.type, node.lane))
        const startedAt = performance.now()

        // Parse timeout from the node's duration string
        let timeoutMs: number | undefined
        if (node.timeout) {
          timeoutMs = parseDuration(node.timeout)
        }

        // Suspend: mark execution as waiting, then block on adapter
        execution.setWaiting(nodeId, node.event)
        let signalData: unknown

        try {
          signalData = await plainAdapter.waitForEvent(nodeId, node.event, timeoutMs)
        } catch (err: unknown) {
          // WaitTimeoutError — route to timeout_next if available
          if (err instanceof Error && err.name === 'WaitTimeoutError' && node.timeout_next) {
            signalData = undefined
          } else {
            throw err
          }
        }

        execution.setRunning()

        const record: NodeExecutionRecord = {
          nodeId,
          type: node.type,
          lane: node.lane,
          startedAt,
          completedAt: performance.now(),
          output: signalData && typeof signalData === 'object' && !Array.isArray(signalData)
            ? (signalData as Record<string, unknown>)
            : {},
          handler: 'native',
        }
        safeCallHook(() => hooks?.onNodeComplete?.(record))
        recordStep(record)

        return signalData
      },

      resolveWaitNext: (
        _nodeId: string,
        node: WaitNode,
        result: unknown,
      ): string | undefined => {
        // If result is undefined (timeout case) and timeout_next exists, route there
        if (result === undefined && node.timeout_next) {
          return node.timeout_next
        }
        return node.next
      },

      onError: async (
        nodeId: string,
        node: ErrorNode,
        ctx: ExecutionContext,
      ): Promise<string | undefined> => {
        safeCallHook(() => hooks?.onNodeStart?.(nodeId, node.type, node.lane))
        const startedAt = performance.now()

        const handler = resolvedHandlers.get(nodeId)

        if (handler && (handler.type === 'entry_point' || handler.type === 'registered')) {
          const result = await adapter.executeAction(nodeId, handler.fn, ctx, {
            metadata: node.metadata as Record<string, unknown> | undefined,
          })
          ctx.state[nodeId] = result
        }

        const record: NodeExecutionRecord = {
          nodeId,
          type: node.type,
          lane: node.lane,
          startedAt,
          completedAt: performance.now(),
          output: {},
          handler: handler?.type === 'entry_point' ? 'entry_point' : 'native',
        }
        safeCallHook(() => hooks?.onNodeComplete?.(record))
        recordStep(record)

        return node.next
      },

      onTrigger: async (
        nodeId: string,
        node: TriggerNode,
        _ctx: ExecutionContext,
      ): Promise<string | undefined> => {
        safeCallHook(() => hooks?.onNodeStart?.(nodeId, node.type, node.lane))
        const startedAt = performance.now()

        const record: NodeExecutionRecord = {
          nodeId,
          type: node.type,
          lane: node.lane,
          startedAt,
          completedAt: performance.now(),
          output: {},
          handler: 'native',
        }
        safeCallHook(() => hooks?.onNodeComplete?.(record))
        recordStep(record)

        return node.next as string | undefined
      },

      onTerminal: async (
        nodeId: string,
        node: TerminalNode,
        _ctx: ExecutionContext,
      ): Promise<void> => {
        safeCallHook(() => hooks?.onNodeStart?.(nodeId, node.type, node.lane))
        const startedAt = performance.now()

        const record: NodeExecutionRecord = {
          nodeId,
          type: node.type,
          lane: node.lane,
          startedAt,
          completedAt: performance.now(),
          output: {},
          handler: 'native',
        }
        safeCallHook(() => hooks?.onNodeComplete?.(record))
        recordStep(record)
      },

      onStep: (_record: NodeExecutionRecord): void => {
        // No-op: walkGraph replaces this with its trace-collecting interceptor.
        // The original must be a no-op to prevent infinite recursion.
      },
    }

    return callbacks
  }
}

/**
 * Safely call an observability hook. If the hook throws, log and continue.
 */
function safeCallHook(fn: () => void): void {
  try {
    fn()
  } catch (err: unknown) {
    console.error('[flowprint] Hook error:', err instanceof Error ? err.message : String(err))
  }
}
