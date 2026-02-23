/**
 * Read-only decision table grid component.
 *
 * Renders a tabular view of a rules document: condition columns (inputs),
 * output columns (from `then`), rows for each rule, operator badges,
 * wildcard indicators, and a hit policy badge.
 */

export type HitPolicy = 'first' | 'collect' | 'all' | 'priority'

export interface OperatorCondition {
  eq?: unknown
  not_eq?: unknown
  gt?: number
  gte?: number
  lt?: number
  lte?: number
  in?: unknown[]
  not_in?: unknown[]
  between?: [number, number]
}

export type Condition = OperatorCondition | string | number | boolean | null

export interface RuleRow {
  when?: Record<string, Condition>
  then: Record<string, unknown>
  priority?: number
}

export type InputDef = string | { label: string; expr: string }

export interface RulesData {
  hit_policy: HitPolicy
  inputs?: InputDef[]
  rules: RuleRow[]
}

export interface DecisionTableProps {
  rules: RulesData
}

/**
 * Map operator keys to human-readable symbols for badge display.
 */
const OPERATOR_SYMBOLS: Record<string, string> = {
  eq: '=',
  not_eq: '\u2260',
  gt: '>',
  gte: '\u2265',
  lt: '<',
  lte: '\u2264',
  in: '\u2208',
  not_in: '\u2209',
  between: '\u2194',
}

/**
 * Get the display label for an input definition.
 */
function getInputLabel(input: InputDef): string {
  if (typeof input === 'string') {
    return input
  }
  return input.label
}

/**
 * Collect all unique condition field names from rules (used when no inputs declared).
 */
function discoverConditionFields(rules: RuleRow[]): string[] {
  const fields = new Set<string>()
  for (const rule of rules) {
    if (rule.when) {
      for (const key of Object.keys(rule.when)) {
        fields.add(key)
      }
    }
  }
  return [...fields]
}

/**
 * Collect all unique output field names from rules.
 */
function discoverOutputFields(rules: RuleRow[]): string[] {
  const fields = new Set<string>()
  for (const rule of rules) {
    for (const key of Object.keys(rule.then)) {
      fields.add(key)
    }
  }
  return [...fields]
}

/**
 * Normalize a condition to an OperatorCondition object.
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
 * Format a condition as a human-readable string with operator badge.
 */
function formatCondition(condition: Condition): string {
  const normalized = normalizeCondition(condition)
  const parts: string[] = []

  for (const [op, value] of Object.entries(normalized)) {
    if (value === undefined) continue
    const symbol = OPERATOR_SYMBOLS[op] ?? op

    if (op === 'in' || op === 'not_in') {
      const items = Array.isArray(value) ? value.join(', ') : String(value)
      parts.push(`${symbol} [${items}]`)
    } else if (op === 'between') {
      const [low, high] = value as [number, number]
      parts.push(`${String(low)} ${symbol} ${String(high)}`)
    } else {
      parts.push(`${symbol} ${String(value)}`)
    }
  }

  return parts.join(', ')
}

export function DecisionTable({ rules }: DecisionTableProps) {
  const conditionFields =
    rules.inputs?.map(getInputLabel) ?? discoverConditionFields(rules.rules)
  const outputFields = discoverOutputFields(rules.rules)

  return (
    <div className="fp-decision-table" data-testid="decision-table">
      <div className="fp-decision-table__header">
        <span className="fp-decision-table__hit-policy" data-testid="hit-policy-badge">
          {rules.hit_policy}
        </span>
      </div>

      {rules.rules.length === 0 ? (
        <div className="fp-decision-table__empty">No rules defined</div>
      ) : (
        <table className="fp-decision-table__table">
          <thead>
            <tr>
              <th>#</th>
              {conditionFields.map((field) => (
                <th key={`cond-${field}`} className="fp-decision-table__table th--condition">
                  {field}
                </th>
              ))}
              {outputFields.map((field) => (
                <th key={`out-${field}`} className="fp-decision-table__table th--output">
                  {field}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.rules.map((rule, rowIdx) => (
              <tr key={rowIdx} data-testid={`rule-row-${String(rowIdx)}`}>
                <td>{rowIdx + 1}</td>
                {conditionFields.map((field) => {
                  const condition = rule.when?.[field]
                  if (condition === undefined) {
                    return (
                      <td key={`cond-${field}`}>
                        <span className="fp-decision-table__wildcard">{'\u2014'}</span>
                      </td>
                    )
                  }
                  return (
                    <td key={`cond-${field}`}>
                      <span className="fp-decision-table__operator-badge">
                        {formatCondition(condition)}
                      </span>
                    </td>
                  )
                })}
                {outputFields.map((field) => {
                  const val = rule.then[field]
                  const display =
                    val === undefined || val === null
                      ? ''
                      : typeof val === 'object'
                        ? JSON.stringify(val)
                        : String(val as string | number | boolean)
                  return <td key={`out-${field}`}>{display}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
