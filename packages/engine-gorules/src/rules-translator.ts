/**
 * Translates flowprint `.rules.yaml` documents to GoRules JDM format.
 *
 * Our format uses operator-based conditions (eq, gt, gte, etc.) while
 * JDM uses unary expressions in decision table cells. This module
 * bridges the two representations.
 */

import type {
  RulesDocument,
  Rule,
  Condition,
  OperatorCondition,
} from '@ruminaider/flowprint-engine'

/** JDM decision table input column */
interface JDMInput {
  id: string
  name: string
  type: 'expression'
  field: string
}

/** JDM decision table output column */
interface JDMOutput {
  id: string
  name: string
  type: 'expression'
  field: string
}

/** JDM decision table rule row */
interface JDMRule {
  _id: string
  [columnId: string]: string
}

/** JDM decision table content */
interface JDMDecisionTableContent {
  hitPolicy: 'first' | 'collect'
  inputs: JDMInput[]
  outputs: JDMOutput[]
  rules: JDMRule[]
}

/** JDM graph node */
interface JDMNode {
  id: string
  type: string
  name: string
  position: { x: number; y: number }
  content?: JDMDecisionTableContent
}

/** JDM graph edge */
interface JDMEdge {
  id: string
  type: 'edge'
  sourceId: string
  targetId: string
}

/** Complete JDM document */
export interface JDMDocument {
  nodes: JDMNode[]
  edges: JDMEdge[]
}

/**
 * Translate a flowprint RulesDocument to GoRules JDM format.
 *
 * Maps our hit policies to JDM:
 * - `first` -> `first` (returns first match as object)
 * - `collect` / `all` -> `collect` (returns all matches as array)
 * - `priority` -> `first` (rules pre-sorted by priority)
 */
export function translateToJDM(doc: RulesDocument): JDMDocument {
  const { inputColumns, inputFieldMap } = buildInputColumns(doc)
  const outputColumns = buildOutputColumns(doc.rules)
  const hitPolicy = mapHitPolicy(doc.hit_policy)

  const rules = doc.hit_policy === 'priority'
    ? [...doc.rules].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    : doc.rules

  const jdmRules = rules.map((rule, i) =>
    translateRule(rule, i, inputFieldMap, outputColumns),
  )

  return {
    nodes: [
      {
        id: 'input',
        type: 'inputNode',
        name: 'Input',
        position: { x: 0, y: 0 },
      },
      {
        id: 'table',
        type: 'decisionTableNode',
        name: 'Rules',
        position: { x: 200, y: 0 },
        content: {
          hitPolicy,
          inputs: inputColumns,
          outputs: outputColumns,
          rules: jdmRules,
        },
      },
      {
        id: 'output',
        type: 'outputNode',
        name: 'Output',
        position: { x: 400, y: 0 },
      },
    ],
    edges: [
      { id: 'e1', type: 'edge', sourceId: 'input', targetId: 'table' },
      { id: 'e2', type: 'edge', sourceId: 'table', targetId: 'output' },
    ],
  }
}

function mapHitPolicy(hitPolicy: string): 'first' | 'collect' {
  switch (hitPolicy) {
    case 'first':
    case 'priority':
      return 'first'
    case 'collect':
    case 'all':
      return 'collect'
    default:
      return 'first'
  }
}

/**
 * Build input columns from the rules document.
 * Discovers all unique fields referenced in rule `when` conditions.
 */
function buildInputColumns(doc: RulesDocument): {
  inputColumns: JDMInput[]
  inputFieldMap: Map<string, string>
} {
  const fields = new Set<string>()

  // Collect fields from declared inputs
  if (doc.inputs) {
    for (const input of doc.inputs) {
      if (typeof input === 'string') {
        fields.add(input)
      }
      // Skip labeled expressions — not mappable to JDM columns
    }
  }

  // Collect fields from rule conditions
  for (const rule of doc.rules) {
    if (rule.when) {
      for (const field of Object.keys(rule.when)) {
        fields.add(field)
      }
    }
  }

  const inputColumns: JDMInput[] = []
  const inputFieldMap = new Map<string, string>()

  let i = 0
  for (const field of fields) {
    const id = `col-in-${String(i)}`
    inputColumns.push({
      id,
      name: field,
      type: 'expression',
      field,
    })
    inputFieldMap.set(field, id)
    i++
  }

  return { inputColumns, inputFieldMap }
}

/**
 * Build output columns from all unique output fields across rules.
 */
function buildOutputColumns(rules: Rule[]): JDMOutput[] {
  const fields = new Set<string>()
  for (const rule of rules) {
    for (const key of Object.keys(rule.then)) {
      fields.add(key)
    }
  }

  return Array.from(fields).map((field, i) => ({
    id: `col-out-${String(i)}`,
    name: field,
    type: 'expression' as const,
    field,
  }))
}

/**
 * Translate a single rule to a JDM rule row.
 */
function translateRule(
  rule: Rule,
  index: number,
  inputFieldMap: Map<string, string>,
  outputColumns: JDMOutput[],
): JDMRule {
  const jdmRule: JDMRule = { _id: `r${String(index)}` }

  // Map when conditions to input columns
  if (rule.when) {
    for (const [field, condition] of Object.entries(rule.when)) {
      const colId = inputFieldMap.get(field)
      if (colId) {
        jdmRule[colId] = conditionToUnary(condition)
      }
    }
  }

  // Map then outputs to output columns
  for (const col of outputColumns) {
    const value = rule.then[col.field]
    if (value !== undefined) {
      jdmRule[col.id] = valueToExpression(value)
    }
  }

  return jdmRule
}

/**
 * Convert a flowprint condition to a JDM unary expression.
 *
 * Operator mapping:
 * - `eq: "enterprise"` -> `"enterprise"` (string literal)
 * - `eq: 42` -> `42` (number literal)
 * - `gt: 10000` -> `> 10000`
 * - `gte: 100` -> `>= 100`
 * - `lt: 50` -> `< 50`
 * - `lte: 50` -> `<= 50`
 * - `not_eq: "basic"` -> `not("basic")`
 * - `in: ["US", "CA"]` -> `"US", "CA"`
 * - `not_in: ["X"]` -> `not("X")`
 * - `between: [10, 20]` -> `[10..20]`
 * - Shorthand scalar -> normalized to eq first
 */
export function conditionToUnary(condition: Condition): string {
  const normalized = normalizeCondition(condition)
  const parts: string[] = []

  for (const [op, operand] of Object.entries(normalized)) {
    if (operand === undefined) continue
    parts.push(operatorToUnary(op, operand))
  }

  // Multiple operators are ANDed; join with `and` for ZEN
  return parts.length === 1 ? parts[0]! : parts.join(' and ')
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

function operatorToUnary(op: string, operand: unknown): string {
  switch (op) {
    case 'eq':
      return formatLiteral(operand)
    case 'not_eq':
      return `not(${formatLiteral(operand)})`
    case 'gt':
      return `> ${String(operand)}`
    case 'gte':
      return `>= ${String(operand)}`
    case 'lt':
      return `< ${String(operand)}`
    case 'lte':
      return `<= ${String(operand)}`
    case 'in':
      if (Array.isArray(operand)) {
        return operand.map((v: unknown) => formatLiteral(v)).join(', ')
      }
      return String(operand)
    case 'not_in':
      if (Array.isArray(operand)) {
        return operand.map((v: unknown) => `not(${formatLiteral(v)})`).join(' and ')
      }
      return `not(${String(operand)})`
    case 'between':
      if (Array.isArray(operand) && operand.length === 2) {
        return `[${String(operand[0])}..${String(operand[1])}]`
      }
      return String(operand)
    default:
      return String(operand)
  }
}

function formatLiteral(value: unknown): string {
  if (typeof value === 'string') {
    return `"${value}"`
  }
  if (value === null) {
    return 'null'
  }
  return String(value)
}

/**
 * Convert an output value to a JDM expression string.
 */
function valueToExpression(value: unknown): string {
  if (typeof value === 'string') {
    return `"${value}"`
  }
  if (value === null) {
    return 'null'
  }
  return String(value)
}
