import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { validateRules } from '@ruminaider/flowprint-schema'
import type { ExecutionContext } from '../runner/types.js'
import { evaluateExpression } from '../runner/evaluator.js'
import type {
  RulesDocument,
  Rule,
  Condition,
  OperatorCondition,
  InputDef,
  RulesEvaluationResult,
} from './types.js'

/**
 * Load and validate a `.rules.yaml` file.
 *
 * @param filePath - Relative path to the rules file
 * @param projectRoot - Root directory for path resolution
 * @returns Parsed and validated RulesDocument
 */
export function loadRulesFile(filePath: string, projectRoot: string): RulesDocument {
  const absolutePath = resolve(projectRoot, filePath)

  let content: string
  try {
    content = readFileSync(absolutePath, 'utf-8')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to load rules file "${filePath}" (resolved to ${absolutePath}): ${message}`)
  }

  let doc: unknown
  try {
    doc = parse(content)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to parse rules file "${filePath}": ${message}`)
  }

  const result = validateRules(doc)
  const errors = result.errors.filter((e) => e.severity === 'error')
  if (errors.length > 0) {
    const messages = errors.map((e) => `  ${e.path}: ${e.message}`).join('\n')
    throw new Error(`Rules file "${filePath}" has validation errors:\n${messages}`)
  }

  return doc as RulesDocument
}

/**
 * Evaluate a rules document against a context.
 *
 * Resolves inputs (dot-paths and labeled expressions), evaluates each rule's
 * conditions against the resolved values, and applies the hit policy.
 *
 * @param doc - Parsed rules document
 * @param context - Execution context with input and prior node results
 * @param expressionTimeout - Timeout for labeled expression evaluation (ms)
 * @returns Evaluation result with matched output(s)
 */
export function evaluateRules(
  doc: RulesDocument,
  context: ExecutionContext,
  expressionTimeout?: number,
): RulesEvaluationResult {
  const rulesContext = buildRulesContext(context)
  const resolvedInputs = resolveInputs(doc.inputs, rulesContext, context, expressionTimeout)

  const matchedRules: Rule[] = []

  for (const rule of doc.rules) {
    if (ruleMatches(rule, resolvedInputs, rulesContext)) {
      matchedRules.push(rule)
    }
  }

  return applyHitPolicy(doc.hit_policy, matchedRules)
}

/**
 * Build a flat context for dot-path resolution.
 * Spreads input fields and node results into a single object.
 */
function buildRulesContext(context: ExecutionContext): Record<string, unknown> {
  const flat: Record<string, unknown> = {}

  // Spread workflow input fields
  if (typeof context.input === 'object' && context.input !== null) {
    for (const [key, value] of Object.entries(context.input as Record<string, unknown>)) {
      flat[key] = value
    }
  }

  // Spread node results
  for (const [nodeId, result] of context.results) {
    flat[nodeId] = result
  }

  return flat
}

/**
 * Resolve input values from the context using declared inputs or auto-discovery.
 *
 * If no inputs are declared, auto-discovers from `when` clause field names
 * and resolves them as dot-paths.
 */
function resolveInputs(
  inputs: InputDef[] | undefined,
  rulesContext: Record<string, unknown>,
  executionContext: ExecutionContext,
  expressionTimeout?: number,
): Map<string, unknown> {
  const resolved = new Map<string, unknown>()

  if (!inputs || inputs.length === 0) {
    // No inputs declared — values resolved on-demand via dot-paths during condition evaluation
    return resolved
  }

  for (const input of inputs) {
    if (typeof input === 'string') {
      // Simple dot-path
      resolved.set(input, resolveDotPath(input, rulesContext))
    } else {
      // Labeled expression
      const labeled = input
      const value = evaluateExpression(labeled.expr, executionContext, expressionTimeout)
      resolved.set(labeled.label, value)
    }
  }

  return resolved
}

/**
 * Resolve a dot-path (e.g., "order.total_amount") against a context object.
 */
function resolveDotPath(path: string, context: Record<string, unknown>): unknown {
  const parts = path.split('.')
  let current: unknown = context

  for (const part of parts) {
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
function ruleMatches(
  rule: Rule,
  resolvedInputs: Map<string, unknown>,
  rulesContext: Record<string, unknown>,
): boolean {
  if (!rule.when) {
    return true // Wildcard rule
  }

  for (const [field, condition] of Object.entries(rule.when)) {
    // Use pre-resolved value if available, otherwise resolve dot-path on demand
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
function evaluateCondition(value: unknown, condition: Condition): boolean {
  const normalized = normalizeCondition(condition)

  // All operators in the condition must pass (AND semantics)
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

/**
 * Evaluate a single operator against a value.
 * No type coercion — types must match exactly.
 */
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
      return false
  }
}

/**
 * Apply the hit policy to the list of matched rules.
 */
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
