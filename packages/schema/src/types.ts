/**
 * Manual type definitions that complement the auto-generated types.
 *
 * Re-exports generated types with better names where needed, and defines
 * types for validation results, graph edges, and ordered nodes that are
 * part of the public API but not part of the JSON Schema.
 */

// Re-export all generated types
export type {
  FlowprintServiceBlueprint as FlowprintDocument,
  Lane,
  Node,
  ActionNode,
  SwitchNode,
  ParallelNode,
  WaitNode,
  ErrorNode,
  TerminalNode,
  EntryPoint,
  ErrorHandler,
  TemporalConfig,
  Position,
} from './types.generated.js'

/**
 * Result of validating a Flowprint document.
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * A single validation error with location and severity.
 */
export interface ValidationError {
  /** JSON pointer to the error location (e.g. "/nodes/my_node/next") */
  path: string
  /** Human-readable error message */
  message: string
  /** Error severity: "error" for schema/structural violations, "warning" for non-blocking issues */
  severity: 'error' | 'warning'
}

/**
 * A node with its topological sort order.
 */
export interface OrderedNode {
  /** Node ID */
  id: string
  /** The node definition */
  node: import('./types.generated.js').Node
  /** Topological layer (0 = root nodes) */
  order: number
}

/**
 * An edge in the blueprint graph.
 */
export interface Edge {
  /** Source node ID */
  source: string
  /** Target node ID */
  target: string
  /** Condition label for switch edges */
  label?: string
  /** Edge type: normal flow, error handling, or default branch */
  type: 'normal' | 'error' | 'default'
}
