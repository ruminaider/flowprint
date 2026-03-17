/**
 * Browser-safe rules evaluator.
 *
 * Contains all pure evaluation logic (operators, conditions, hit policies,
 * dot-path resolution) without Node.js dependencies. The Node.js evaluator
 * imports these helpers and adds file-loading + labeled expression support.
 */

import { BLOCKED_PROPERTY_NAMES } from '../expressions/allowlist.js'
import type {
  RulesDocument,
  Rule,
  Condition,
  OperatorCondition,
  RulesEvaluationResult,
} from './types.js'

/**
 * Evaluate a rules document against a plain input object.
 *
 * Browser-safe: no Node.js APIs, no labeled expression support.
 * Only simple dot-path inputs are resolved.
 *
 * @param doc - Parsed and validated rules document
 * @param input - Flat input values (dot-path fields are resolved automatically)
 * @returns Evaluation result with matched output(s)
 */
export function evaluateRules(
  doc: RulesDocument,
  input: Record<string, unknown>,
): RulesEvaluationResult {
  const resolvedInputs = resolveSimpleInputs(doc.inputs, input)

  const matchedRules: Rule[] = []

  for (const rule of doc.rules) {
    if (ruleMatches(rule, resolvedInputs, input)) {
      matchedRules.push(rule)
    }
  }

  return applyHitPolicy(doc.hit_policy, matchedRules)
}

/**
 * Resolve only simple dot-path inputs from the context.
 * Labeled expression inputs are skipped (they require Node.js `vm`).
 */
function resolveSimpleInputs(
  inputs: RulesDocument['inputs'],
  context: Record<string, unknown>,
): Map<string, unknown> {
  const resolved = new Map<string, unknown>()

  if (!inputs || inputs.length === 0) {
    return resolved
  }

  for (const input of inputs) {
    if (typeof input === 'string') {
      resolved.set(input, resolveDotPath(input, context))
    }
    // Skip labeled expressions — not supported in browser
  }

  return resolved
}

/**
 * Resolve a dot-path (e.g., "order.total_amount") against a context object.
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
 * Check if a single rule matches against the resolved inputs.
 * A rule with no `when` clause always matches (wildcard/default).
 */
export function ruleMatches(
  rule: Rule,
  resolvedInputs: Map<string, unknown>,
  rulesContext: Record<string, unknown>,
): boolean {
  if (!rule.when) {
    return true // Wildcard rule
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

/**
 * Evaluate a condition against a value.
 * Handles both shorthand scalars and operator objects.
 */
export function evaluateCondition(value: unknown, condition: Condition): boolean {
  const normalized = normalizeCondition(condition)

  for (const [op, operand] of Object.entries(normalized)) {
    if (!evaluateOperator(op, value, operand)) {
      return false
    }
  }

  return true
}

/**
 * Normalize a condition to an OperatorCondition.
 * Shorthand scalars (string, number, boolean, null) become { eq: value }.
 */
export function normalizeCondition(condition: Condition): OperatorCondition {
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

/**
 * Evaluate a single operator against a value.
 * No type coercion — types must match exactly.
 */
export function evaluateOperator(op: string, value: unknown, operand: unknown): boolean {
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
      return false
  }
}

/**
 * Apply the hit policy to the list of matched rules.
 */
export function applyHitPolicy(
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
