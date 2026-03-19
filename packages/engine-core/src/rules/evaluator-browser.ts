/**
 * Browser-safe rules evaluator.
 *
 * Contains the browser-safe entry point that delegates to shared core logic.
 * The Node.js evaluator adds file-loading + labeled expression support.
 */

import type {
  RulesDocument,
  Rule,
  RulesEvaluationResult,
} from './types.js'
import {
  resolveDotPath,
  ruleMatches,
  applyHitPolicy,
} from './core.js'

// Re-export core functions for consumers that import from this module
export {
  resolveDotPath,
  ruleMatches,
  evaluateCondition,
  normalizeCondition,
  evaluateOperator,
  applyHitPolicy,
} from './core.js'

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
