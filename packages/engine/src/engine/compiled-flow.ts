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
import { walkGraph, walkBranch } from '../walker/walk.js'
import type { WalkGraphCallbacks } from '../walker/walk.js'
import type { ExecutionContext, NodeExecutionRecord } from '../walker/types.js'
import { evaluateExpression } from '../runner/evaluator.js'
import { loadRulesFile, evaluateRules } from '../rules/evaluator.js'
import { PlainAdapter } from '../adapters/plain.js'
import type { ExecutionAdapter } from '../adapters/types.js'
import { buildLegacyContext } from './engine.js'
import type { EngineOptions, ExecutionResult, ResolvedHandler, EngineHooks } from './types.js'

/**
 * An immutable, pre-compiled flow ready for execution.
 *
 * Created by `FlowprintEngine.load()`. Handler resolution is frozen at construction time,
 * so subsequent engine mutations do not affect this instance.
 */
export class CompiledFlow {
  private readonly adapter: ExecutionAdapter

  constructor(
    private readonly doc: FlowprintDocument,
    private readonly resolvedHandlers: ReadonlyMap<string, ResolvedHandler>,
    private readonly options: EngineOptions,
  ) {
    this.adapter = options.adapter ?? new PlainAdapter({ defaultTimeout: options.defaultTimeout })
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
        const strategy = node.join_strategy ?? 'all'
        const joinNodeId = node.join

        // Build a branch function for each branch ID.
        // Each branch gets an isolated copy of the parent state.
        const branchFns = node.branches.map((branchId) => {
          return async (): Promise<{ branchId: string; state: Record<string, unknown> }> => {
            const branchNode = doc.nodes[branchId]
            if (!branchNode) {
              throw new Error(`Parallel branch node "${branchId}" not found`)
            }

            // Isolated state: structuredClone ensures branches cannot see each other's writes
            const branchState = structuredClone(ctx.state)
            const branchCtx: ExecutionContext = {
              input: ctx.input,
              state: branchState,
              node: { id: branchId, type: branchNode.type, lane: branchNode.lane },
              signal: ctx.signal,
            }

            // Walk the branch subgraph from branchId until joinNodeId
            const finalState = await walkBranch(doc, branchId, joinNodeId, branchCtx, callbacks)
            return { branchId, state: finalState }
          }
        })

        // Execute branches through the adapter's parallel strategy
        const rawResults = await adapter.executeParallel(
          branchFns.map((fn) => fn as () => Promise<unknown>),
          strategy,
        )

        // Merge results: namespace by branch ID
        const resultMap: Record<string, unknown> = {}
        for (const raw of rawResults) {
          const result = raw as { branchId: string; state: Record<string, unknown> }
          resultMap[result.branchId] = result.state
        }

        // Write merged results into parent context
        Object.assign(ctx.state, resultMap)

        const parallelResult = resultMap

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
        _nodeId: string,
        _node: WaitNode,
        _ctx: ExecutionContext,
      ): Promise<unknown> => {
        throw new Error('Wait nodes require start(), not execute()')
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
