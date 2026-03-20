/**
 * Pure rules evaluation core.
 *
 * Contains all evaluation logic (operators, conditions, hit policies,
 * dot-path resolution) without Node.js dependencies. Both the Node.js
 * evaluator and browser simulator import from here.
 */

import type { ExecutionContext } from '../runner/types.js'
import { BLOCKED_PROPERTY_NAMES } from '../expressions/allowlist.js'
import type {
  RulesDocument,
  Rule,
  Condition,
  InputDef,
  OperatorCondition,
  RulesEvaluationResult,
} from './types.js'

/**
 * A function that evaluates an expression string in a given context.
 * The Node.js runner provides a `node:vm`-based evaluator;
 * the browser simulator provides an AST interpreter.
 */
export type ExpressionEvaluator = (expr: string, context: ExecutionContext) => unknown

/**
 * Evaluate a rules document against an execution context.
 *
 * Pure function: no I/O, no Node.js deps. Callers handle loading.
 * Pass an `expressionEvaluator` to support labeled expression inputs.
 *
 * @param doc - Parsed and validated rules document
 * @param context - Execution context with input and prior node results
 * @param expressionEvaluator - Optional evaluator for labeled expression inputs
 * @returns Evaluation result with matched output(s)
 */
export function evaluateRules(
  doc: RulesDocument,
  context: ExecutionContext,
  expressionEvaluator?: ExpressionEvaluator,
): RulesEvaluationResult {
  const rulesContext = buildRulesContext(context)
  const resolvedInputs = resolveInputs(doc.inputs, rulesContext, context, expressionEvaluator)

  const matchedRules: Rule[] = []

  for (const rule of doc.rules) {
    if (ruleMatches(rule, resolvedInputs, rulesContext)) {
      matchedRules.push(rule)
    }
  }

  return applyHitPolicy(doc.hit_policy, matchedRules)
}

/**
 * Resolve a dot-path (e.g., "order.total_amount") against a context object.
 * Blocks prototype chain traversal via BLOCKED_PROPERTY_NAMES.
 */
export function resolveDotPath(path: string, context: Record<string, unknown>): unknown {
  const parts = path.split('.')
  let current: unknown = context

  for (const part of parts) {
    if (BLOCKED_PROPERTY_NAMES.has(part)) {
      return undefined
    }
    if (typeof current !== 'object' || current === null) {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

/**
 * Build a flat context for dot-path resolution.
 * Spreads input fields and node results into a single object.
 */
function buildRulesContext(context: ExecutionContext): Record<string, unknown> {
  const flat: Record<string, unknown> = {}

  if (typeof context.input === 'object' && context.input !== null) {
    for (const [key, value] of Object.entries(context.input as Record<string, unknown>)) {
      flat[key] = value
    }
  }

  for (const [nodeId, result] of context.results) {
    flat[nodeId] = result
  }

  return flat
}

/**
 * Resolve input values from the context using declared inputs or auto-discovery.
 * Supports labeled expression inputs when an expressionEvaluator is provided.
 */
function resolveInputs(
  inputs: InputDef[] | undefined,
  rulesContext: Record<string, unknown>,
  executionContext: ExecutionContext,
  expressionEvaluator?: ExpressionEvaluator,
): Map<string, unknown> {
  const resolved = new Map<string, unknown>()

  if (!inputs || inputs.length === 0) {
    return resolved
  }

  for (const input of inputs) {
    if (typeof input === 'string') {
      resolved.set(input, resolveDotPath(input, rulesContext))
    } else {
      if (!expressionEvaluator) {
        throw new Error(
          `Labeled input "${input.label}" requires an expression evaluator, but none was provided`,
        )
      }
      const value = expressionEvaluator(input.expr, executionContext)
      resolved.set(input.label, value)
    }
  }

  return resolved
}

/**
 * Check if a single rule matches against the resolved inputs.
 * A rule with no `when` clause always matches (wildcard/default).
 */
function ruleMatches(
  rule: Rule,
  resolvedInputs: Map<string, unknown>,
  rulesContext: Record<string, unknown>,
): boolean {
  if (!rule.when) {
    return true
  }

  for (const [field, condition] of Object.entries(rule.when)) {
    const value = resolvedInputs.has(field)
      ? resolvedInputs.get(field)
      : resolveDotPath(field, rulesContext)
    if (!evaluateCondition(value, condition)) {
      return false
    }
  }

  return true
}

function evaluateCondition(value: unknown, condition: Condition): boolean {
  const normalized = normalizeCondition(condition)

  for (const [op, operand] of Object.entries(normalized)) {
    if (!evaluateOperator(op, value, operand)) {
      return false
    }
  }

  return true
}

function normalizeCondition(condition: Condition): OperatorCondition {
  if (
    condition === null ||
    typeof condition === 'string' ||
    typeof condition === 'number' ||
    typeof condition === 'boolean'
  ) {
    return { eq: condition }
  }
  return condition
}

function evaluateOperator(op: string, value: unknown, operand: unknown): boolean {
  switch (op) {
    case 'eq':
      return value === operand
    case 'not_eq':
      return value !== operand
    case 'gt':
      return typeof value === 'number' && typeof operand === 'number' && value > operand
    case 'gte':
      return typeof value === 'number' && typeof operand === 'number' && value >= operand
    case 'lt':
      return typeof value === 'number' && typeof operand === 'number' && value < operand
    case 'lte':
      return typeof value === 'number' && typeof operand === 'number' && value <= operand
    case 'in':
      return Array.isArray(operand) && operand.includes(value)
    case 'not_in':
      return Array.isArray(operand) && !operand.includes(value)
    case 'between': {
      if (!Array.isArray(operand) || operand.length !== 2) return false
      const [low, high] = operand as [number, number]
      return typeof value === 'number' && value >= low && value <= high
    }
    default:
      throw new Error(`Unknown rule operator: "${op}"`)
  }
}

function applyHitPolicy(
  hitPolicy: string,
  matchedRules: Rule[],
): RulesEvaluationResult {
  switch (hitPolicy) {
    case 'first':
      return {
        hit_policy: 'first',
        matched_count: matchedRules.length,
        output: matchedRules[0]?.then ?? {},
      }

    case 'collect':
      return {
        hit_policy: 'collect',
        matched_count: matchedRules.length,
        output: matchedRules.map((r) => r.then),
      }

    case 'all':
      if (matchedRules.length === 0) {
        throw new Error('Hit policy "all" requires at least one matching rule, but none matched')
      }
      return {
        hit_policy: 'all',
        matched_count: matchedRules.length,
        output: matchedRules.map((r) => r.then),
      }

    case 'priority': {
      const sorted = [...matchedRules].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
      return {
        hit_policy: 'priority',
        matched_count: matchedRules.length,
        output: sorted[0]?.then ?? {},
      }
    }

    default:
      throw new Error(`Unknown hit policy: ${hitPolicy}`)
  }
}
