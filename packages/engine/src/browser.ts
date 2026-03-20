// Simulator (primary browser API)
export { simulateGraph } from './simulator/index.js'
export type {
  SimulationOptions,
  SimulationStep,
  SimulationTrace,
  RulesEvaluationDetail,
  ExpressionEvaluationDetail,
} from './simulator/index.js'

// Rules evaluation (browser-safe, for standalone rules testing)
export { evaluateRules } from './rules/core.js'
export type { ExpressionEvaluator } from './rules/core.js'
export type {
  RulesDocument,
  Rule,
  Condition,
  OperatorCondition,
  HitPolicy,
  InputDef,
  RulesEvaluationResult,
} from './rules/types.js'

// Expression interpretation (browser-safe)
export {
  interpretExpression,
  ExpressionParseError,
  clearParseCache,
} from './expressions/interpreter.js'

// Shared walk types
export type { BaseStep, BaseTrace, StepNodeType, StepStatus } from './walker/types.js'

// Shared context type
export type { ExecutionContext } from './runner/types.js'
