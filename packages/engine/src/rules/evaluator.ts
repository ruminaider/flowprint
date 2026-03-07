/**
 * Node.js rules evaluator — wraps core.ts with vm-based expression support.
 * File loading lives in loader.ts.
 */

import type { ExecutionContext } from '../runner/types.js'
import { evaluateExpression } from '../runner/evaluator.js'
import { evaluateRules as evaluateRulesCore, resolveDotPath } from './core.js'
import type { ExpressionEvaluator } from './core.js'
import type { RulesDocument, RulesEvaluationResult } from './types.js'

export { resolveDotPath }
export type { ExpressionEvaluator }
export { loadRulesFile } from './loader.js'

/**
 * Evaluate a rules document against a context.
 *
 * Node.js version: wraps core evaluateRules with a vm-based expression evaluator
 * so that labeled expressions are automatically supported.
 */
export function evaluateRules(
  doc: RulesDocument,
  context: ExecutionContext,
  expressionTimeout?: number,
): RulesEvaluationResult {
  const exprEval: ExpressionEvaluator = (expr, ctx) =>
    evaluateExpression(expr, ctx, expressionTimeout)

  return evaluateRulesCore(doc, context, exprEval)
}
