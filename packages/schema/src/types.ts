/**
 * Manual type definitions that complement the auto-generated types.
 *
 * Re-exports generated types with better names where needed, and defines
 * types for validation results, graph edges, and ordered nodes that are
 * part of the public API but not part of the JSON Schema.
 */

import type { FlowprintServiceBlueprint } from './types.generated.js'

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
  TriggerNode,
  EntryPoint,
  ErrorHandler,
  RulesRef,
  TemporalConfig,
  Position,
} from './types.generated.js'

/** Local alias for use within this file */
type FlowprintDocument = FlowprintServiceBlueprint

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

// ── Migration Types ─────────────────────────────────────────────

export type Transform =
  | AddFieldTransform
  | RemoveFieldTransform
  | RenameFieldTransform
  | RenameNodeTypeTransform
  | SetDefaultTransform
  | ChangeFieldTypeTransform

export interface AddFieldTransform {
  type: 'addField'
  scope: 'nodes' | 'metadata'
  /** When scope is 'nodes', only apply to nodes of this type. Omit to apply to all nodes. */
  nodeType?: string
  field: string
  value: unknown
}

export interface RemoveFieldTransform {
  type: 'removeField'
  scope: 'nodes' | 'metadata'
  nodeType?: string
  field: string
}

export interface RenameFieldTransform {
  type: 'renameField'
  scope: 'nodes' | 'metadata'
  nodeType?: string
  from: string
  to: string
}

export interface RenameNodeTypeTransform {
  type: 'renameNodeType'
  from: string
  to: string
}

export interface SetDefaultTransform {
  type: 'setDefault'
  scope: 'nodes' | 'metadata'
  nodeType?: string
  field: string
  value: unknown
}

export interface ChangeFieldTypeTransform {
  type: 'changeFieldType'
  scope: 'nodes'
  nodeType?: string
  field: string
  convert: (value: unknown) => unknown
}

export interface MigrationRule {
  from: string
  to: string
  required: boolean
  notable: boolean
  description: string
  transforms: Transform[]
  custom?: (doc: FlowprintDocument) => FlowprintDocument
  down?: (doc: FlowprintDocument) => FlowprintDocument
}

export interface MigrationChangelog {
  from: string
  to: string
  entries: MigrationChangelogEntry[]
}

export interface MigrationChangelogEntry {
  version: string
  description: string
  required: boolean
  notable: boolean
  transforms: string[]
}

export type MigrationResult =
  | MigrationResultMigrated
  | MigrationResultError
  | MigrationResultFutureVersion
  | MigrationResultCurrent

export interface MigrationResultMigrated {
  status: 'migrated'
  doc: FlowprintDocument
  changelog: MigrationChangelog
  fromVersion: string
  toVersion: string
}

export interface MigrationResultError {
  status: 'error'
  originalDoc: FlowprintDocument
  error: MigrationError
}

export interface MigrationResultFutureVersion {
  status: 'future_version'
  doc: FlowprintDocument
  documentVersion: string
  currentToolVersion: string
}

export interface MigrationResultCurrent {
  status: 'current'
  doc: FlowprintDocument
}

export interface MigrationError {
  failedRule: string
  reason: string
  stepIndex: number
}
