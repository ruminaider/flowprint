import type { ExecutionContext } from '../walker/types.js'

export interface ActionConfig {
  timeout?: number // ms, overrides engine default
  metadata?: Record<string, unknown>
}

export interface ExecutionAdapter {
  readonly name: string

  /** Optional lifecycle: initialize resources (e.g., Temporal client connection). */
  init?(): Promise<void>

  /** Optional lifecycle: clean up resources (e.g., drain connections). */
  shutdown?(): Promise<void>

  /**
   * Execute an action handler with timeout and cancellation support.
   * The adapter wraps the handler call with timeout enforcement.
   */
  executeAction(
    nodeId: string,
    handler: (ctx: ExecutionContext) => Promise<unknown>,
    context: ExecutionContext,
    config: ActionConfig,
  ): Promise<unknown>

  /**
   * Execute parallel branches with the given strategy.
   *
   * - `'all'`: Run all branches concurrently. All must complete. On failure,
   *   abort remaining branches and propagate the error.
   * - `'first'`: Run all branches to completion. Return all results but mark
   *   the first to finish as primary.
   *
   * Each branch function receives its own AbortController that the adapter
   * can signal on failure.
   */
  executeParallel(
    branches: (() => Promise<unknown>)[],
    strategy: 'all' | 'first',
  ): Promise<unknown[]>

  /**
   * Suspend execution at a wait node until an external signal arrives or timeout fires.
   * Returns the signal payload when delivered.
   */
  waitForEvent?(
    nodeId: string,
    eventName: string,
    timeout?: number,
  ): Promise<unknown>
}
