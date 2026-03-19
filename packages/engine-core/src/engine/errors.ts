import type { NodeExecutionRecord } from '../walker/types.js'

/**
 * Thrown when a flow execution fails. Contains the full trace up to the failure
 * point, information about which node failed, and details about compensation
 * (both successful compensations and ones that errored).
 */
export class ExecutionError extends Error {
  constructor(
    message: string,
    /** Full trace up to the failure point. */
    public readonly trace: NodeExecutionRecord[],
    /** Which node failed. */
    public readonly failedNode: string,
    /** Compensations that succeeded. */
    public readonly compensated: string[],
    /** Compensations that failed. */
    public readonly compensationErrors: { nodeId: string; error: Error }[],
  ) {
    super(message)
    this.name = 'ExecutionError'
  }
}
