/**
 * Shared types and utilities for decision table components.
 *
 * Used by both the read-only DecisionTable and the EditableDecisionTable.
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

/**
 * Map operator keys to human-readable symbols for badge display.
 */
export const OPERATOR_SYMBOLS: Record<string, string> = {
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
export function getInputLabel(input: InputDef): string {
  if (typeof input === 'string') {
    return input
  }
  return input.label
}

/**
 * Collect all unique condition field names from rules (used when no inputs declared).
 */
export function discoverConditionFields(rules: RuleRow[]): string[] {
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
export function discoverOutputFields(rules: RuleRow[]): string[] {
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
 * Format a condition as a human-readable string with operator symbols.
 */
export function formatCondition(condition: Condition): string {
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
