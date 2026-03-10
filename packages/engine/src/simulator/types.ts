import type { BaseStep, BaseTrace } from '../walker/types.js'
import type { RulesDocument } from '../rules/types.js'

export interface SimulationOptions {
  input: unknown
  fixtures?: Record<string, unknown>
  rulesData: Record<string, RulesDocument>
  maxSteps?: number
}

export interface RulesEvaluationDetail {
  file: string
  hitPolicy: string
  matchedCount: number
  output: Record<string, unknown>
}

export interface ExpressionEvaluationDetail {
  expression: string
  result: unknown
}

export interface SimulationStep extends BaseStep {
  rulesEvaluation?: RulesEvaluationDetail
  expressionEvaluation?: ExpressionEvaluationDetail
  stepOutput?: { nodeId: string; value: unknown }
  branchNodeIds?: string[]
  branchOutputs?: Record<string, unknown>
}

export interface SimulationTrace extends BaseTrace<SimulationStep> {}
