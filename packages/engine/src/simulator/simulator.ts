import { walkGraph } from '../walker/walk.js'
import type { WalkHandlers, WalkContext } from '../walker/types.js'
import { type FlowprintDocument, isErrorNode } from '@ruminaider/flowprint-schema'
import { evaluateRules } from '../rules/core.js'
import type { ExpressionEvaluator } from '../rules/core.js'
import { interpretExpression, buildSafeMath } from '../expressions/interpreter.js'
import type { ExecutionContext } from '../runner/types.js'
import type {
  SimulationOptions,
  SimulationStep,
  SimulationTrace,
  RulesEvaluationDetail,
} from './types.js'

/**
 * Simulate a flowprint document in the browser.
 *
 * Uses the shared walkGraph skeleton with browser-safe handlers:
 * - Expression evaluation via AST interpreter (no node:vm)
 * - Rules evaluation via pre-loaded rulesData (no node:fs)
 * - Entry-point actions use fixture data (no dynamic import)
 */
export async function simulateGraph(
  doc: FlowprintDocument,
  options: SimulationOptions,
): Promise<SimulationTrace> {
  const results = new Map<string, unknown>()
  const safeMath = buildSafeMath()

  const buildScope = (ctx: WalkContext<SimulationStep>): Record<string, unknown> => {
    const scope: Record<string, unknown> = { input: options.input, Math: safeMath }
    for (const [nodeId, result] of ctx.results) {
      scope[nodeId] = result
    }
    return scope
  }

  const exprEval: ExpressionEvaluator = (expr, ctx) => {
    const scope: Record<string, unknown> = { input: ctx.input, Math: safeMath }
    for (const [nodeId, result] of ctx.results) {
      scope[nodeId] = result
    }
    return interpretExpression(expr, scope)
  }

  // Review #11: Extract shared rules evaluation helper
  const evaluateNodeRules = (
    nodeId: string,
    rulesRef: { file: string; evaluator?: string },
    ctx: WalkContext<SimulationStep>,
  ): { error?: SimulationStep; detail: RulesEvaluationDetail; output: unknown } | SimulationStep => {
    if (rulesRef.evaluator && rulesRef.evaluator !== 'builtin') {
      return {
        node_id: nodeId,
        type: 'action',
        status: 'error',
        error: `Unknown evaluator "${rulesRef.evaluator}"`,
      }
    }
    const rulesDoc = options.rulesData[rulesRef.file]
    if (!rulesDoc) {
      // Missing rules: continue simulation with empty output instead of halting.
      // This allows templates to be simulated without providing rules files.
      ctx.results.set(nodeId, {})
      return {
        detail: {
          file: rulesRef.file,
          hitPolicy: 'none',
          matchedCount: 0,
          output: {},
        },
        output: {},
      }
    }
    const execCtx: ExecutionContext = { input: options.input, results: ctx.results }
    const result = evaluateRules(rulesDoc, execCtx, exprEval)
    ctx.results.set(nodeId, result.output)
    return {
      detail: {
        file: rulesRef.file,
        hitPolicy: result.hit_policy,
        matchedCount: result.matched_count,
        output: result.output as Record<string, unknown>,
      },
      output: result.output,
    }
  }

  const handlers: WalkHandlers<SimulationStep> = {
    onAction(nodeId, node, ctx) {
      if (node.rules) {
        const rulesResult = evaluateNodeRules(nodeId, node.rules, ctx)
        // Error step returned directly
        if ('node_id' in rulesResult) return rulesResult
        return {
          node_id: nodeId,
          type: 'action',
          status: 'completed',
          next: node.next,
          rulesEvaluation: rulesResult.detail,
          stepOutput: { nodeId, value: rulesResult.output },
        }
      }

      // Entry-point action — use fixture or undefined
      const fixture = options.fixtures?.[nodeId]
      ctx.results.set(nodeId, fixture)

      // Check if fixture signals an error and node has error.catch
      const isErrorFixture =
        fixture === '_error' ||
        (typeof fixture === 'object' &&
          fixture !== null &&
          '_error' in (fixture as Record<string, unknown>) &&
          (fixture as Record<string, unknown>)._error === true)
      const catchTarget = node.error?.catch
      const canCatch =
        isErrorFixture && catchTarget && isErrorNode(ctx.doc.nodes[catchTarget])
      const next = canCatch ? catchTarget : node.next

      return {
        node_id: nodeId,
        type: 'action',
        status: canCatch ? 'error-caught' : 'completed',
        next,
        stepOutput: { nodeId, value: fixture },
      }
    },

    onSwitch(nodeId, node, ctx) {
      // Switch fixture support: match fixture string against case labels
      const switchFixture = options.fixtures?.[nodeId]
      if (switchFixture != null && typeof switchFixture === 'string') {
        for (let i = 0; i < (node.cases?.length ?? 0); i++) {
          const c = node.cases?.[i]
          if (!c) continue
          if (c.when === switchFixture) {
            ctx.results.set(nodeId, switchFixture)
            return {
              node_id: nodeId,
              type: 'switch',
              status: 'matched',
              matched_case: i,
              next: c.next,
              stepOutput: { nodeId, value: switchFixture },
            }
          }
        }
        if (switchFixture === 'default' && node.default) {
          ctx.results.set(nodeId, switchFixture)
          return {
            node_id: nodeId,
            type: 'switch',
            status: 'default',
            next: node.default,
            stepOutput: { nodeId, value: switchFixture },
          }
        }
        // No label match → fall through to normal rules/expression evaluation
      }

      if (node.rules) {
        const rulesResult = evaluateNodeRules(nodeId, node.rules, ctx)
        if ('node_id' in rulesResult) {
          return { ...rulesResult, type: 'switch' }
        }
        const output = rulesResult.output as Record<string, unknown>
        const nextNode = output.next as string | undefined

        if (nextNode) {
          return {
            node_id: nodeId,
            type: 'switch',
            status: 'matched',
            next: nextNode,
            rulesEvaluation: rulesResult.detail,
            stepOutput: { nodeId, value: rulesResult.output },
          }
        }
        if (node.default) {
          return {
            node_id: nodeId,
            type: 'switch',
            status: 'default',
            next: node.default,
            stepOutput: { nodeId, value: rulesResult.output },
          }
        }
        return { node_id: nodeId, type: 'switch', status: 'no-match' }
      }

      // Expression-based switch
      const scope = buildScope(ctx)
      for (let i = 0; i < (node.cases?.length ?? 0); i++) {
        const c = node.cases?.[i]
        if (!c) continue
        try {
          const result = interpretExpression(c.when, scope)
          if (result) {
            return {
              node_id: nodeId,
              type: 'switch',
              status: 'matched',
              matched_case: i,
              next: c.next,
              expressionEvaluation: { expression: c.when, result },
            }
          }
        } catch {
          // Label-style `when` values (e.g. "Approved") are not valid
          // expressions — treat as non-matching and continue to next case
        }
      }
      if (node.default) {
        return { node_id: nodeId, type: 'switch', status: 'default', next: node.default }
      }
      return { node_id: nodeId, type: 'switch', status: 'no-match' }
    },

    onParallel(nodeId, node, ctx) {
      ctx.steps.push({
        node_id: nodeId,
        type: 'parallel',
        status: 'entered',
      })

      // Process branches for results/fixtures without pushing individual steps
      const branchOutputs: Record<string, unknown> = {}
      for (const branchId of node.branches) {
        const fixture = options.fixtures?.[branchId]
        ctx.results.set(branchId, fixture)
        branchOutputs[branchId] = fixture
      }
      ctx.results.set(nodeId, branchOutputs)

      return {
        node_id: nodeId,
        type: 'parallel',
        status: 'completed',
        next: node.join,
        branchNodeIds: [...node.branches],
        branchOutputs,
        stepOutput: { nodeId, value: branchOutputs },
      }
    },

    onWait(nodeId, node, ctx) {
      const fixture = options.fixtures?.[nodeId]
      if (fixture !== undefined) {
        ctx.results.set(nodeId, fixture)
        return {
          node_id: nodeId,
          type: 'wait',
          status: 'fixture',
          next: node.next,
          stepOutput: { nodeId, value: fixture },
        }
      }
      if (node.timeout_next) {
        ctx.results.set(nodeId, undefined)
        return { node_id: nodeId, type: 'wait', status: 'timeout', next: node.timeout_next }
      }
      ctx.results.set(nodeId, undefined)
      return { node_id: nodeId, type: 'wait', status: 'skipped', next: node.next }
    },

    onError(nodeId, node, ctx) {
      ctx.results.set(nodeId, undefined)
      return { node_id: nodeId, type: 'error', status: 'handled', next: node.next }
    },

    onTerminal(nodeId, node) {
      return { node_id: nodeId, type: 'terminal', status: 'reached', outcome: node.outcome }
    },

    // Review #30: Trigger emits a synthetic "activated" step
    onTrigger(nodeId, node) {
      return {
        node_id: nodeId,
        type: 'trigger',
        status: 'activated',
        next: node.next as string | undefined,
      }
    },

    onUnknownNodeType(nodeId) {
      return {
        node_id: nodeId,
        type: 'unknown',
        status: 'error',
        error: `Unknown node type for "${nodeId}"`,
      }
    },
  }

  try {
    const steps = await walkGraph(doc, handlers, options.input, results, {
      maxSteps: options.maxSteps,
    })

    const lastStep = steps[steps.length - 1]
    const outcome = lastStep?.outcome
    const status = outcome === 'failure' ? 'failure' : 'success'
    const lastResultKey = [...results.keys()].pop()
    const output = lastResultKey !== undefined ? results.get(lastResultKey) : undefined

    return { status, steps, output }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    return { status: 'error', steps: [], error: errorMessage }
  }
}
