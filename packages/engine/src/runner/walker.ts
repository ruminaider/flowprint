import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { isActionNode, isErrorNode } from '@ruminaider/flowprint-schema'
import { walkGraph } from '../walker/walk.js'
import type { WalkHandlers } from '../walker/types.js'
import type { RunOptions, ExecutionContext, StepResult, ExecutionTrace } from './types.js'
import { evaluateExpression } from './evaluator.js'
import { loadEntryPoint } from './loader.js'
import { loadRulesFile } from '../rules/loader.js'
import { evaluateRules } from '../rules/core.js'
import type { ExpressionEvaluator } from '../rules/core.js'

interface CompensationEntry {
  nodeId: string
  entry: { file: string; symbol: string }
}

/**
 * Execute a flowprint document using an in-process graph walker.
 *
 * Delegates graph traversal to the shared walkGraph skeleton, providing
 * Node.js-specific handlers for entry point loading, vm-based expression
 * evaluation, and compensation.
 */
export async function runGraph(
  doc: FlowprintDocument,
  options: RunOptions,
): Promise<ExecutionTrace> {
  const startTime = performance.now()
  const context: ExecutionContext = {
    input: options.input,
    results: new Map(),
  }

  const compensationStack: CompensationEntry[] = []

  const handlers: WalkHandlers<StepResult> = {
    async onAction(nodeId, node, ctx) {
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
          const exprEval: ExpressionEvaluator = (expr, exprCtx) =>
            evaluateExpression(expr, exprCtx, options.expressionTimeout)
          const rulesResult = evaluateRules(rulesDoc, context, exprEval)
          ctx.results.set(nodeId, rulesResult.output)

          return {
            node_id: nodeId,
            type: 'action',
            status: 'completed',
            duration_ms: Math.round(performance.now() - stepStart),
            next: node.next,
          }
        }

        const entryPoint = node.entry_points?.[0]
        if (!entryPoint) {
          throw new Error(`Action node "${nodeId}" has no entry_point or rules defined`)
        }

        const fn = await loadEntryPoint(entryPoint, options.projectRoot)

        let args: unknown
        if (node.inputs) {
          const evaluated: Record<string, unknown> = {}
          for (const [key, expr] of Object.entries(node.inputs)) {
            evaluated[key] = evaluateExpression(expr, context, options.expressionTimeout)
          }
          args = evaluated
        } else {
          args = context.input
        }

        const result = await fn(args)
        ctx.results.set(nodeId, result)

        if (node.compensation) {
          compensationStack.push({ nodeId, entry: node.compensation })
        }

        return {
          node_id: nodeId,
          type: 'action',
          status: 'completed',
          duration_ms: Math.round(performance.now() - stepStart),
          next: node.next,
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err)

        // Route to error handler if defined
        if (node.error?.catch) {
          const errorNodeId = node.error.catch
          const errorNode = doc.nodes[errorNodeId]
          if (errorNode && isErrorNode(errorNode)) {
            ctx.results.set(nodeId, { error: errorMessage })
            return {
              node_id: nodeId,
              type: 'action',
              status: 'error',
              duration_ms: Math.round(performance.now() - stepStart),
              error: errorMessage,
              next: errorNodeId,
            }
          }
        }

        throw err
      }
    },

    onSwitch(nodeId, node, ctx) {
      const stepStart = performance.now()

      // Rules-driven switch
      if (node.rules) {
        if (node.rules.evaluator && node.rules.evaluator !== 'builtin') {
          throw new Error(
            `Switch node "${nodeId}" uses unknown evaluator "${node.rules.evaluator}". Only "builtin" is supported.`,
          )
        }

        const rulesDoc = loadRulesFile(node.rules.file, options.projectRoot)
        const exprEval: ExpressionEvaluator = (expr, exprCtx) =>
          evaluateExpression(expr, exprCtx, options.expressionTimeout)
        const rulesResult = evaluateRules(rulesDoc, context, exprEval)
        ctx.results.set(nodeId, rulesResult.output)

        const output = rulesResult.output as Record<string, unknown>
        const nextNode = output.next as string | undefined

        if (nextNode) {
          return {
            node_id: nodeId,
            type: 'switch',
            status: 'matched',
            duration_ms: Math.round(performance.now() - stepStart),
            next: nextNode,
          }
        }

        if (node.default) {
          return {
            node_id: nodeId,
            type: 'switch',
            status: 'default',
            duration_ms: Math.round(performance.now() - stepStart),
            next: node.default,
          }
        }

        return {
          node_id: nodeId,
          type: 'switch',
          status: 'no-match',
          duration_ms: Math.round(performance.now() - stepStart),
        }
      }

      // Expression-based switch
      for (let i = 0; i < (node.cases?.length ?? 0); i++) {
        const c = node.cases?.[i]
        if (!c) continue

        const result = evaluateExpression(c.when, context, options.expressionTimeout)

        if (result) {
          return {
            node_id: nodeId,
            type: 'switch',
            status: 'matched',
            duration_ms: Math.round(performance.now() - stepStart),
            matched_case: i,
            next: c.next,
          }
        }
      }

      if (node.default) {
        return {
          node_id: nodeId,
          type: 'switch',
          status: 'default',
          duration_ms: Math.round(performance.now() - stepStart),
          next: node.default,
        }
      }

      return {
        node_id: nodeId,
        type: 'switch',
        status: 'no-match',
        duration_ms: Math.round(performance.now() - stepStart),
      }
    },

    async onParallel(nodeId, node, ctx, _walkBranch) {
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
            for (const [key, expr] of Object.entries(branchNode.inputs)) {
              evaluated[key] = evaluateExpression(expr, context, options.expressionTimeout)
            }
            args = evaluated
          } else {
            args = context.input
          }

          const result = await fn(args)
          ctx.results.set(branchId, result)

          if (branchNode.compensation) {
            compensationStack.push({ nodeId: branchId, entry: branchNode.compensation })
          }

          ctx.steps.push({
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

      if (strategy === 'first') {
        const first = await Promise.race(branchPromises)
        ctx.results.set(nodeId, first.result)
      } else {
        const results = await Promise.all(branchPromises)
        const resultMap: Record<string, unknown> = {}
        for (const r of results) {
          resultMap[r.branchId] = r.result
        }
        ctx.results.set(nodeId, resultMap)
      }

      return {
        node_id: nodeId,
        type: 'parallel',
        status: 'completed',
        duration_ms: Math.round(performance.now() - stepStart),
        next: node.join,
      }
    },

    onWait(nodeId, node, ctx) {
      const stepStart = performance.now()

      const fixtureData = options.fixtures?.[nodeId]

      if (fixtureData !== undefined) {
        ctx.results.set(nodeId, fixtureData)
        return {
          node_id: nodeId,
          type: 'wait',
          status: 'fixture',
          duration_ms: Math.round(performance.now() - stepStart),
          next: node.next,
        }
      }

      if (node.timeout_next) {
        ctx.results.set(nodeId, undefined)
        return {
          node_id: nodeId,
          type: 'wait',
          status: 'timeout',
          duration_ms: Math.round(performance.now() - stepStart),
          next: node.timeout_next,
          error: `No fixture data for wait node "${nodeId}" (event: ${node.event}). Routing to timeout_next.`,
        }
      }

      ctx.results.set(nodeId, undefined)
      return {
        node_id: nodeId,
        type: 'wait',
        status: 'skipped',
        duration_ms: Math.round(performance.now() - stepStart),
        next: node.next,
        error: `No fixture data for wait node "${nodeId}" (event: ${node.event}). Use --fixtures to provide signal data.`,
      }
    },

    async onError(nodeId, node, ctx) {
      const stepStart = performance.now()

      if (node.entry_points?.[0]) {
        const fn = await loadEntryPoint(node.entry_points[0], options.projectRoot)
        const result = await fn(context.input)
        ctx.results.set(nodeId, result)
      }

      return {
        node_id: nodeId,
        type: 'error',
        status: 'handled',
        duration_ms: Math.round(performance.now() - stepStart),
        next: node.next,
      }
    },

    onTrigger(nodeId, node) {
      return {
        node_id: nodeId,
        type: 'trigger',
        status: 'fired',
        next: node.next as string | undefined,
      }
    },

    onTerminal(nodeId, node) {
      return {
        node_id: nodeId,
        type: 'terminal',
        status: 'reached',
        outcome: node.outcome,
      }
    },
  }

  // Collect steps across try/catch so compensation steps are included in trace
  let allSteps: StepResult[] = []

  try {
    allSteps = await walkGraph(doc, handlers, options.input, context.results)

    const lastStep = allSteps[allSteps.length - 1]
    const outcome = lastStep?.outcome
    const status = outcome === 'failure' ? 'failure' : 'success'

    const lastResultKey = [...context.results.keys()].pop()
    const output = lastResultKey !== undefined ? context.results.get(lastResultKey) : undefined

    return {
      status,
      duration_ms: Math.round(performance.now() - startTime),
      steps: allSteps,
      output,
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    await runCompensation(compensationStack, context, options, allSteps)

    return {
      status: 'error',
      duration_ms: Math.round(performance.now() - startTime),
      steps: allSteps,
      error: errorMessage,
    }
  }
}

async function runCompensation(
  compensationStack: CompensationEntry[],
  context: ExecutionContext,
  options: RunOptions,
  steps: StepResult[],
): Promise<void> {
  while (compensationStack.length > 0) {
    const comp = compensationStack.pop()
    if (!comp) break

    const stepStart = performance.now()
    try {
      const fn = await loadEntryPoint(comp.entry, options.projectRoot)
      const result = context.results.get(comp.nodeId)
      await fn(result)
      steps.push({
        node_id: `${comp.nodeId}:compensate`,
        type: 'compensation',
        status: 'completed',
        duration_ms: Math.round(performance.now() - stepStart),
      })
    } catch (err: unknown) {
      steps.push({
        node_id: `${comp.nodeId}:compensate`,
        type: 'compensation',
        status: 'error',
        duration_ms: Math.round(performance.now() - stepStart),
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
}
