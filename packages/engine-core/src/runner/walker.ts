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
import type { RunOptions, StepResult, ExecutionTrace } from './types.js'
import type { ExecutionContext } from '../walker/types.js'
import type { WalkGraphCallbacks } from '../walker/walk.js'
import { walkGraph } from '../walker/walk.js'
import { evaluateExpression } from './evaluator.js'
import { loadEntryPoint } from './loader.js'
import { loadRulesFile, evaluateRules } from '../rules/evaluator.js'

/**
 * Build an old-style ExecutionContext (Map-based) from the new walker context.
 * Used to maintain compatibility with the evaluator and rules engine
 * which expect { input, results: Map }.
 */
function buildLegacyContext(ctx: ExecutionContext): {
  input: unknown
  results: Map<string, unknown>
} {
  const results = new Map<string, unknown>()
  for (const [key, value] of Object.entries(ctx.state)) {
    results.set(key, value)
  }
  return { input: ctx.input, results }
}

/**
 * Execute a flowprint document using the generic graph walker.
 *
 * This is a thin adapter that wires the existing Node.js evaluator, loader,
 * and rules engine into walkGraph's callback interface.
 */
export async function runGraph(
  doc: FlowprintDocument,
  options: RunOptions,
): Promise<ExecutionTrace> {
  const startTime = performance.now()
  const input =
    options.input && typeof options.input === 'object' && !Array.isArray(options.input)
      ? (options.input as Record<string, unknown>)
      : ({} as Record<string, unknown>)

  // Externally tracked steps — survives even if walkGraph throws
  const steps: StepResult[] = []

  const recordStep = (record: StepResult): void => {
    steps.push(record)
  }

  const callbacks: WalkGraphCallbacks<StepResult> = {
    onAction: async (nodeId: string, node: ActionNode, ctx: ExecutionContext): Promise<unknown> => {
      const stepStart = performance.now()

      try {
        // Rules-driven action
        if (node.rules) {
          if (node.rules.evaluator && node.rules.evaluator !== 'builtin') {
            throw new Error(
              `Action node "${nodeId}" uses unknown evaluator "${node.rules.evaluator}". Only "builtin" is supported.`,
            )
          }

          const rulesDoc = loadRulesFile(node.rules.file, options.projectRoot)
          const legacyCtx = buildLegacyContext(ctx)
          const rulesResult = evaluateRules(rulesDoc, legacyCtx, options.expressionTimeout)

          // Store under nodeId for backward compat (evaluator references like "nodeId.field")
          ctx.state[nodeId] = rulesResult.output

          recordStep({
            node_id: nodeId,
            type: 'action',
            status: 'completed',
            duration_ms: Math.round(performance.now() - stepStart),
            next: node.next,
          })

          return rulesResult.output
        }

        const entryPoint = node.entry_points?.[0]
        if (!entryPoint) {
          throw new Error(`Action node "${nodeId}" has no entry_point or rules defined`)
        }

        const fn = await loadEntryPoint(entryPoint, options.projectRoot)

        // Evaluate input expressions if present
        let args: unknown
        if (node.inputs) {
          const evaluated: Record<string, unknown> = {}
          const legacyCtx = buildLegacyContext(ctx)
          for (const [key, expr] of Object.entries(node.inputs)) {
            evaluated[key] = evaluateExpression(expr, legacyCtx, options.expressionTimeout)
          }
          args = evaluated
        } else {
          args = ctx.input
        }

        const result = await fn(args)

        // Store under nodeId for backward compat (evaluator references like "nodeId.field")
        ctx.state[nodeId] = result

        recordStep({
          node_id: nodeId,
          type: 'action',
          status: 'completed',
          duration_ms: Math.round(performance.now() - stepStart),
          next: node.next,
        })

        return result
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err)

        recordStep({
          node_id: nodeId,
          type: 'action',
          status: 'error',
          duration_ms: Math.round(performance.now() - stepStart),
          error: errorMessage,
        })

        // Store error info in state so error handler can access it
        ctx.state[nodeId] = { error: errorMessage }

        throw err
      }
    },

    onSwitch: async (
      nodeId: string,
      node: SwitchNode,
      ctx: ExecutionContext,
    ): Promise<string | undefined> => {
      const stepStart = performance.now()
      const legacyCtx = buildLegacyContext(ctx)

      // Rules-driven switch
      if (node.rules) {
        if (node.rules.evaluator && node.rules.evaluator !== 'builtin') {
          throw new Error(
            `Switch node "${nodeId}" uses unknown evaluator "${node.rules.evaluator}". Only "builtin" is supported.`,
          )
        }

        const rulesDoc = loadRulesFile(node.rules.file, options.projectRoot)
        const rulesResult = evaluateRules(rulesDoc, legacyCtx, options.expressionTimeout)
        ctx.state[nodeId] = rulesResult.output

        const output = rulesResult.output as Record<string, unknown>
        const nextNode = output.next as string | undefined

        if (nextNode) {
          recordStep({
            node_id: nodeId,
            type: 'switch',
            status: 'matched',
            duration_ms: Math.round(performance.now() - stepStart),
            next: nextNode,
          })
          return nextNode
        }

        if (node.default) {
          recordStep({
            node_id: nodeId,
            type: 'switch',
            status: 'default',
            duration_ms: Math.round(performance.now() - stepStart),
            next: node.default,
          })
          return node.default
        }

        recordStep({
          node_id: nodeId,
          type: 'switch',
          status: 'no-match',
          duration_ms: Math.round(performance.now() - stepStart),
        })
        return undefined
      }

      // Evaluate cases top-to-bottom, follow first match
      for (let i = 0; i < (node.cases?.length ?? 0); i++) {
        const c = node.cases?.[i]
        if (!c) continue

        const result = evaluateExpression(c.when, legacyCtx, options.expressionTimeout)

        if (result) {
          recordStep({
            node_id: nodeId,
            type: 'switch',
            status: 'matched',
            duration_ms: Math.round(performance.now() - stepStart),
            matched_case: i,
            next: c.next,
          })
          return c.next
        }
      }

      // Fall through to default
      if (node.default) {
        recordStep({
          node_id: nodeId,
          type: 'switch',
          status: 'default',
          duration_ms: Math.round(performance.now() - stepStart),
          next: node.default,
        })
        return node.default
      }

      // No match and no default
      recordStep({
        node_id: nodeId,
        type: 'switch',
        status: 'no-match',
        duration_ms: Math.round(performance.now() - stepStart),
      })
      return undefined
    },

    onParallel: async (
      nodeId: string,
      node: ParallelNode,
      ctx: ExecutionContext,
    ): Promise<unknown> => {
      const stepStart = performance.now()

      const branchPromises = node.branches.map(async (branchId) => {
        const branchNode = doc.nodes[branchId]
        if (!branchNode) {
          throw new Error(`Parallel branch node "${branchId}" not found`)
        }

        if (isActionNode(branchNode)) {
          const entryPoint = branchNode.entry_points?.[0]
          if (!entryPoint) {
            throw new Error(`Action node "${branchId}" has no entry_point defined`)
          }

          const fn = await loadEntryPoint(entryPoint, options.projectRoot)

          let args: unknown
          if (branchNode.inputs) {
            const evaluated: Record<string, unknown> = {}
            const legacyCtx = buildLegacyContext(ctx)
            for (const [key, expr] of Object.entries(branchNode.inputs)) {
              evaluated[key] = evaluateExpression(expr, legacyCtx, options.expressionTimeout)
            }
            args = evaluated
          } else {
            args = ctx.input
          }

          const result = await fn(args)
          ctx.state[branchId] = result

          recordStep({
            node_id: branchId,
            type: 'action',
            status: 'completed',
          })

          return { branchId, result }
        }

        throw new Error(
          `Parallel branch "${branchId}" is not an action node (type: ${branchNode.type})`,
        )
      })

      const strategy = node.join_strategy ?? 'all'
      let parallelResult: unknown

      if (strategy === 'first') {
        const first = await Promise.race(branchPromises)
        ctx.state[nodeId] = first.result
        parallelResult = { [nodeId]: first.result }
      } else {
        const results = await Promise.all(branchPromises)
        const resultMap: Record<string, unknown> = {}
        for (const r of results) {
          resultMap[r.branchId] = r.result
        }
        ctx.state[nodeId] = resultMap
        parallelResult = { [nodeId]: resultMap }
      }

      recordStep({
        node_id: nodeId,
        type: 'parallel',
        status: 'completed',
        duration_ms: Math.round(performance.now() - stepStart),
        next: node.join,
      })

      return parallelResult
    },

    onWait: async (nodeId: string, node: WaitNode, ctx: ExecutionContext): Promise<unknown> => {
      const stepStart = performance.now()
      const fixtureData = options.fixtures?.[nodeId]

      if (fixtureData !== undefined) {
        ctx.state[nodeId] = fixtureData
        recordStep({
          node_id: nodeId,
          type: 'wait',
          status: 'fixture',
          duration_ms: Math.round(performance.now() - stepStart),
          next: node.next,
        })
        return fixtureData
      }

      // No fixture — if timeout_next is defined, route there as a timeout
      if (node.timeout_next) {
        ctx.state[nodeId] = undefined
        recordStep({
          node_id: nodeId,
          type: 'wait',
          status: 'timeout',
          duration_ms: Math.round(performance.now() - stepStart),
          next: node.timeout_next,
          error: `No fixture data for wait node "${nodeId}" (event: ${node.event}). Routing to timeout_next.`,
        })
        return undefined
      }

      // No fixture, no timeout_next — skip with warning
      ctx.state[nodeId] = undefined
      recordStep({
        node_id: nodeId,
        type: 'wait',
        status: 'skipped',
        duration_ms: Math.round(performance.now() - stepStart),
        next: node.next,
        error: `No fixture data for wait node "${nodeId}" (event: ${node.event}). Use --fixtures to provide signal data.`,
      })
      return undefined
    },

    onError: async (
      nodeId: string,
      node: ErrorNode,
      ctx: ExecutionContext,
    ): Promise<string | undefined> => {
      const stepStart = performance.now()

      if (node.entry_points?.[0]) {
        const fn = await loadEntryPoint(node.entry_points[0], options.projectRoot)
        const result = await fn(ctx.input)
        ctx.state[nodeId] = result
      }

      recordStep({
        node_id: nodeId,
        type: 'error',
        status: 'handled',
        duration_ms: Math.round(performance.now() - stepStart),
        next: node.next,
      })

      return node.next
    },

    onTrigger: async (
      nodeId: string,
      node: TriggerNode,
      _ctx: ExecutionContext,
    ): Promise<string | undefined> => {
      recordStep({
        node_id: nodeId,
        type: 'trigger',
        status: 'fired',
        next: node.next as string | undefined,
      })

      return node.next as string | undefined
    },

    onTerminal: async (
      nodeId: string,
      node: TerminalNode,
      _ctx: ExecutionContext,
    ): Promise<void> => {
      recordStep({
        node_id: nodeId,
        type: 'terminal',
        status: 'reached',
        outcome: node.outcome,
      })
    },

    onStep: (_record: StepResult): void => {
      // No-op: step recording is handled by the closure-captured recordStep
    },

    onCompensation: (
      _nodeId: string,
      compensation: { file: string; symbol: string },
      result: unknown,
    ): (() => Promise<void>) => {
      return async () => {
        const fn = await loadEntryPoint(compensation, options.projectRoot)
        await fn(result)
      }
    },

    onCompensationStep: (nodeId: string, error?: Error): void => {
      if (error) {
        recordStep({
          node_id: `${nodeId}:compensate`,
          type: 'compensation',
          status: 'error',
          duration_ms: 0,
          error: error.message,
        })
      } else {
        recordStep({
          node_id: `${nodeId}:compensate`,
          type: 'compensation',
          status: 'completed',
          duration_ms: 0,
        })
      }
    },

    resolveWaitNext: (nodeId: string, node: WaitNode, _result: unknown): string | undefined => {
      const fixtureData = options.fixtures?.[nodeId]
      if (fixtureData !== undefined) {
        return node.next
      }
      if (node.timeout_next) {
        return node.timeout_next
      }
      return node.next
    },
  }

  try {
    const result = await walkGraph(doc, input, callbacks)

    // Determine final status from the last step
    const lastStep = steps[steps.length - 1]
    const lastOutcome = lastStep?.outcome
    const status = result.outcome === 'failure' || lastOutcome === 'failure' ? 'failure' : 'success'

    // Collect output from the accumulated state
    const output = Object.keys(result.output).length > 0 ? result.output : undefined

    return {
      status,
      duration_ms: Math.round(performance.now() - startTime),
      steps,
      output,
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    return {
      status: 'error',
      duration_ms: Math.round(performance.now() - startTime),
      steps,
      error: errorMessage,
    }
  }
}
