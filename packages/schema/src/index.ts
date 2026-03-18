// Types (generated from JSON Schema + manual additions)
export type {
  FlowprintDocument,
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
  ValidationResult,
  ValidationError,
  OrderedNode,
  Edge,
  MigrationRule,
  MigrationResult,
  MigrationResultMigrated,
  MigrationResultError,
  MigrationResultFutureVersion,
  MigrationResultCurrent,
  MigrationChangelog,
  MigrationChangelogEntry,
  MigrationError,
  Transform,
  AddFieldTransform,
  RemoveFieldTransform,
  RenameFieldTransform,
  RenameNodeTypeTransform,
  SetDefaultTransform,
  ChangeFieldTypeTransform,
} from './types.js'

// Validation
export { validate, validateYaml, SUPPORTED_VERSIONS, NODE_TYPES } from './validate.js'

// Rules validation
export {
  validateRules,
  validateRulesYaml,
  validateRulesTest,
  validateRulesTestYaml,
  SUPPORTED_RULES_VERSIONS,
  SUPPORTED_RULES_TEST_VERSIONS,
  HIT_POLICIES,
  OPERATORS,
} from './rules.js'

// Graph utilities
export { topoSort, detectCycles, getEdges, findRoots } from './graph.js'

// Type guards
export {
  isActionNode,
  isSwitchNode,
  isParallelNode,
  isWaitNode,
  isErrorNode,
  isTerminalNode,
  isTriggerNode,
} from './guards.js'

// Serialization
export { serialize } from './serialize.js'

// Migration engine
export { migrate, buildMigrationPath } from './migrate.js'
export type { MigrateOptions } from './migrate.js'
export { CURRENT_VERSION, migrationRules, schemaSnapshots } from './migrations/index.js'

// Transforms
export { applyTransform, describeTransform } from './transforms.js'

// Version utilities
export { parseVersion, compareVersions, isMajorBump } from './version.js'
