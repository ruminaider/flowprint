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
// Named `evaluateRulesCore` to distinguish from the Node.js `evaluateRules` in the
// main entry point, which wraps this with a vm-based expression evaluator.
export { evaluateRules as evaluateRulesCore } from './rules/core.js'
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
export type { BaseStep, BaseTrace, ExecutionContext, StepNodeType, StepStatus } from './walker/types.js'
