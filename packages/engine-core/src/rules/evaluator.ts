import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { assertWithinProject } from '../security/index.js'
import { validateRules } from '@ruminaider/flowprint-schema'
import type { ExecutionContext } from '../runner/types.js'
import { evaluateExpression } from '../runner/evaluator.js'
import {
  resolveDotPath,
  ruleMatches,
  applyHitPolicy,
} from './core.js'
import type {
  RulesDocument,
  Rule,
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
  assertWithinProject(filePath, projectRoot)
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
    doc = parse(content, { maxAliasCount: 100, schema: 'core' })
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
 * Full Node.js version: supports labeled expressions (via `node:vm`),
 * ExecutionContext with node results, and expression timeouts.
 * For browser usage, import from `./evaluator-browser.js` instead.
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
 * Extends the browser-safe dot-path resolution with labeled expression support
 * via Node.js `node:vm`.
 */
function resolveInputs(
  inputs: InputDef[] | undefined,
  rulesContext: Record<string, unknown>,
  executionContext: ExecutionContext,
  expressionTimeout?: number,
): Map<string, unknown> {
  const resolved = new Map<string, unknown>()

  if (!inputs || inputs.length === 0) {
    return resolved
  }

  for (const input of inputs) {
    if (typeof input === 'string') {
      resolved.set(input, resolveDotPath(input, rulesContext))
    } else {
      // Labeled expression — requires Node.js `node:vm`
      const value = evaluateExpression(input.expr, executionContext, expressionTimeout)
      resolved.set(input.label, value)
    }
  }

  return resolved
}
