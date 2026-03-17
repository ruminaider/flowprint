// Expressions
export { parseExpression, validateExpressions } from './expressions/index.js'
export type {
  ParseResult,
  ExpressionError,
  ParsedExpression,
  ExpressionValidationResult,
  ExpressionValidationError,
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

// Security
export { assertWithinProject } from './security/index.js'

// Codegen
export { generateCode } from './codegen/index.js'
export type { GenerateResult, GenerateOptions, GeneratedFile } from './codegen/index.js'
