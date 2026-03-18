// Expressions
export {
  parseExpression,
  clearParseCache,
  validateExpressions,
  interpretExpression,
  InterpreterError,
  LRUCache,
} from './expressions/index.js'
export type {
  ParseResult,
  ExpressionError,
  ParsedExpression,
  ExpressionValidationResult,
  ExpressionValidationError,
  InterpreterContext,
} from './expressions/index.js'

// Runner
export {
  runGraph,
  formatTrace,
  evaluateExpression,
  ExpressionTimeoutError,
  loadEntryPoint,
  loadFixtures,
} from './runner/index.js'
export type { RunOptions, ExecutionTrace, StepResult, ExecutionContext } from './runner/index.js'

// Rules
export { loadRulesFile, evaluateRules, runRulesTests } from './rules/index.js'
export type {
  RulesDocument,
  HitPolicy,
  InputDef,
  LabeledInput,
  Rule,
  Condition,
  OperatorCondition,
  RulesEvaluationResult,
  RulesTestCase,
  RulesTestResult,
} from './rules/index.js'

// Walker (generic graph walker + types)
export { walkGraph } from './walker/index.js'
export type {
  ExecutionContext as WalkerExecutionContext,
  NodeExecutionRecord,
  WalkerCallbacks,
  WalkOptions,
  WalkResult,
  WalkGraphCallbacks,
  CompensationEntry,
} from './walker/index.js'

// Security
export { assertWithinProject } from './security/index.js'

// Engine
export { FlowprintEngine, CompiledFlow } from './engine/index.js'
export type { EngineOptions, EngineHooks, ExecutionResult } from './engine/index.js'

// Codegen
export { generateCode } from './codegen/index.js'
export type { GenerateResult, GenerateOptions, GeneratedFile } from './codegen/index.js'
