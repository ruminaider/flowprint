import type { ExecutionContext, NodeExecutionRecord } from '../walker/types.js'
import type { ExecutionAdapter } from '../adapters/types.js'
import type { Clock } from './clock.js'

/** How a node's handler was resolved at load() time. */
export type ResolvedHandler =
  | { type: 'registered'; fn: (ctx: ExecutionContext) => Promise<unknown> }
  | { type: 'expressions'; exprs: Record<string, string> }
  | { type: 'rules'; rulesFile: string }
  | { type: 'entry_point'; fn: (ctx: ExecutionContext) => Promise<unknown> }
  | { type: 'native' } // terminals, triggers, switches, waits, parallels, errors

/** Signal validation function. Throw to reject a signal. */
export type ValidateSignalFn = (eventName: string, data: unknown) => void

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
  /** Execution adapter for action handlers. Defaults to PlainAdapter. */
  adapter?: ExecutionAdapter
  /** Clock implementation for time-dependent operations. Defaults to RealClock. */
  clock?: Clock
  /** Signal validation function. Called before delivering a signal to a wait node. */
  validateSignal?: ValidateSignalFn
  /** TTL for paused executions in ms. Default: 3600000 (1 hour). */
  pausedExecutionTTL?: number
  /** Maximum concurrent execute() calls on a CompiledFlow. Unlimited if omitted. */
  maxConcurrency?: number
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
