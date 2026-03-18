import { evaluateExpressionSync } from '@gorules/zen-engine'

/**
 * Evaluate a single expression using GoRules ZEN.
 * Wraps evaluateExpressionSync with our context mapping.
 *
 * GoRules uses `and`/`or`/`not` syntax (not `&&`/`||`/`!`).
 * Expressions must use ZEN syntax directly.
 */
export function evaluateExpression(
  expression: string,
  context: Record<string, unknown>,
): unknown {
  return evaluateExpressionSync(expression, context)
}

/**
 * Evaluate multiple expressions (expression node).
 * Returns output object with computed values.
 *
 * Later expressions can reference the results of earlier ones,
 * enabling chained computations within a single node.
 */
export function evaluateExpressions(
  expressions: Record<string, string>,
  context: Record<string, unknown>,
): Record<string, unknown> {
  const output: Record<string, unknown> = {}
  const evalContext = { ...context }

  for (const [key, expr] of Object.entries(expressions)) {
    const result = evaluateExpressionSync(expr, evalContext)
    output[key] = result
    evalContext[key] = result
  }

  return output
}
