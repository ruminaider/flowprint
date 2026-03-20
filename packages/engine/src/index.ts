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
  ExpressionEvaluator,
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

// Walker (shared skeleton)
export { walkGraph } from './walker/index.js'
export type {
  BaseStep,
  BaseTrace,
  StepNodeType,
  StepStatus,
  WalkHandlers,
  WalkContext,
  WalkOptions,
} from './walker/index.js'

// Simulator
export { simulateGraph } from './simulator/index.js'
export type {
  SimulationOptions,
  SimulationStep,
  SimulationTrace,
  RulesEvaluationDetail,
  ExpressionEvaluationDetail,
} from './simulator/index.js'

// Expression interpreter (also available from ./browser)
export { interpretExpression, ExpressionParseError, clearParseCache } from './expressions/index.js'

// Codegen
export { generateCode } from './codegen/index.js'
export type { GenerateResult, GenerateOptions, GeneratedFile } from './codegen/index.js'
