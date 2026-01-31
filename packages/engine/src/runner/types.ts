export interface RunOptions {
  input: unknown
  projectRoot: string
  fixtures?: Record<string, unknown>
  expressionTimeout?: number // ms, default 1000
  json?: boolean
}

export interface ExecutionContext {
  input: unknown
  results: Map<string, unknown> // nodeId -> output
}

export interface StepResult {
  node_id: string
  type: string
  status: string
  duration_ms?: number
  matched_case?: number
  next?: string
  outcome?: string
  error?: string
}

export interface ExecutionTrace {
  status: 'success' | 'failure' | 'error'
  duration_ms: number
  steps: StepResult[]
  output?: unknown
  error?: string
}
