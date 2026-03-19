import type { ExecutionContext, NodeExecutionRecord } from '../walker/types.js'

/** How a node's handler was resolved at load() time. */
export type ResolvedHandler =
  | { type: 'registered'; fn: (ctx: ExecutionContext) => Promise<unknown> }
  | { type: 'expressions'; exprs: Record<string, string> }
  | { type: 'rules'; rulesFile: string }
  | { type: 'entry_point'; fn: (ctx: ExecutionContext) => Promise<unknown> }
  | { type: 'native' } // terminals, triggers, switches, waits, parallels, errors

/** Observability hooks. Called synchronously. Must not throw. */
export interface EngineHooks {
  onNodeStart?(nodeId: string, type: string, lane: string): void
  onNodeComplete?(record: NodeExecutionRecord): void
  onFlowError?(error: Error): void
}

/** Engine configuration options. */
export interface EngineOptions {
  /** Project root for resolving entry_points and rules files. */
  projectRoot?: string
  /** Default timeout for action handlers in ms. */
  defaultTimeout?: number
  /** Expression evaluation timeout in ms. */
  expressionTimeout?: number
  /** Observability hooks. */
  hooks?: EngineHooks
}

/** Result of a successful execution. */
export interface ExecutionResult {
  output: Record<string, unknown>
  trace: NodeExecutionRecord[]
  outcome?: 'success' | 'failure'
}

/** Handler function type. */
export type HandlerFn = (ctx: ExecutionContext) => Promise<unknown>

/** Registration options. */
export interface RegisterOptions {
  /** Suppress debug log when overriding expressions/rules. */
  override?: boolean
}
