/**
 * Engine-internal types for parsed rules documents.
 *
 * These types represent the runtime shape of a `.rules.yaml` file
 * after parsing and validation. They are NOT generated from JSON Schema —
 * the schema package owns validation, but the engine owns evaluation types.
 */

export type HitPolicy = 'first' | 'collect' | 'all' | 'priority'

/** A simple dot-path input (e.g., "order.total_amount") */
export type SimpleInput = string

/** A labeled expression input (e.g., { label: "Is VIP", expr: "customer.loyalty_points > 1000" }) */
export interface LabeledInput {
  label: string
  expr: string
}

export type InputDef = SimpleInput | LabeledInput

/**
 * Operator-based condition (e.g., { gte: 100 }) or shorthand scalar.
 * Multiple operators in one object are ANDed.
 */
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

/** A condition can be an operator object or a shorthand scalar (normalized to { eq: value }). */
export type Condition = OperatorCondition | string | number | boolean | null

export interface Rule {
  when?: Record<string, Condition>
  then: Record<string, unknown>
  priority?: number
}

export interface RulesDocument {
  schema: string
  name: string
  description?: string
  hit_policy: HitPolicy
  inputs?: InputDef[]
  rules: Rule[]
}

/** Result of evaluating a rules document against a context. */
export interface RulesEvaluationResult {
  /** The hit policy used */
  hit_policy: HitPolicy
  /** Number of rules that matched */
  matched_count: number
  /** The output — shape depends on hit policy */
  output: Record<string, unknown> | Record<string, unknown>[]
}
