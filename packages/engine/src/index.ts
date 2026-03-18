export * from '@ruminaider/flowprint-engine-core'

// Re-export engine-gorules, renaming colliding symbols
export {
  evaluateExpression as zenEvaluateExpression,
  evaluateExpressions as zenEvaluateExpressions,
  evaluateRulesViaZen,
  disposeZenEngine,
  translateToJDM,
  conditionToUnary,
} from '@ruminaider/flowprint-engine-gorules'
export type { ZenRulesResult, JDMDocument } from '@ruminaider/flowprint-engine-gorules'
