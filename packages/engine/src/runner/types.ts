import type { BaseStep, BaseTrace } from '../walker/types.js'

// Re-export ExecutionContext from its canonical location for backwards compatibility
export type { ExecutionContext } from '../walker/types.js'

export interface RunOptions {
  input: unknown
  projectRoot: string
  fixtures?: Record<string, unknown>
  expressionTimeout?: number // ms, default 1000
  json?: boolean
}

export interface StepResult extends BaseStep {
  duration_ms?: number
}

export interface ExecutionTrace extends BaseTrace<StepResult> {
  duration_ms: number
}
