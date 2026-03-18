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
}
