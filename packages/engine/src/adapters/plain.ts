import type { ExecutionContext } from '../walker/types.js'
import type { ExecutionAdapter, ActionConfig } from './types.js'
import type { Clock } from '../engine/clock.js'
import { RealClock } from '../engine/clock.js'

/**
 * Error thrown when an action handler exceeds its timeout.
 */
export class ActionTimeoutError extends Error {
  constructor(
    public readonly nodeId: string,
    public readonly timeoutMs: number,
  ) {
    super(`Action handler for node '${nodeId}' timed out after ${timeoutMs}ms`)
    this.name = 'ActionTimeoutError'
  }
}

/**
 * Error thrown when a wait node times out before receiving a signal.
 */
export class WaitTimeoutError extends Error {
  constructor(
    public readonly nodeId: string,
    public readonly eventName: string,
    public readonly timeoutMs: number,
  ) {
    super(`Wait node '${nodeId}' timed out after ${timeoutMs}ms waiting for event '${eventName}'`)
    this.name = 'WaitTimeoutError'
  }
}

/**
 * Combine multiple AbortSignals into a single signal that aborts
 * when any of the input signals abort.
 */
function combineSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      return controller.signal
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }
  return controller.signal
}

/**
 * In-process execution adapter. Runs handlers directly with timeout enforcement.
 *
 * Suitable for dev-mode execution, testing, and short-lived workflows
 * that don't require durable execution guarantees.
 */
export class PlainAdapter implements ExecutionAdapter {
  readonly name = 'plain'

  private defaultTimeout: number
  private readonly clock: Clock
  private readonly pendingWaits = new Map<
    string,
    {
      resolve: (data: unknown) => void
      reject: (err: Error) => void
      eventName: string
      timeoutId?: ReturnType<typeof setTimeout>
    }
  >()

  constructor(options?: { defaultTimeout?: number; clock?: Clock }) {
    this.defaultTimeout = options?.defaultTimeout ?? 30_000 // 30s default
    this.clock = options?.clock ?? new RealClock()
  }

  async executeAction(
    nodeId: string,
    handler: (ctx: ExecutionContext) => Promise<unknown>,
    context: ExecutionContext,
    config: ActionConfig,
  ): Promise<unknown> {
    const timeout = config.timeout ?? this.defaultTimeout
    const controller = new AbortController()

    // Create a new context with the adapter's abort signal
    // Combine with any existing signal from the walk
    const combinedSignal = combineSignals(context.signal, controller.signal)
    const adapterCtx: ExecutionContext = {
      ...context,
      signal: combinedSignal,
    }

    // Reject immediately if signal is already aborted
    if (combinedSignal.aborted) {
      throw new ActionTimeoutError(nodeId, timeout)
    }

    // Promise.race: handler vs timeout backstop
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    try {
      const result = await Promise.race([
        handler(adapterCtx),
        new Promise<never>((_, reject) => {
          combinedSignal.addEventListener(
            'abort',
            () => {
              reject(new ActionTimeoutError(nodeId, timeout))
            },
            { once: true },
          )
        }),
      ])
      return result
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Suspend execution at a wait node until an external signal arrives or timeout fires.
   * Returns the signal payload when delivered.
   */
  async waitForEvent(nodeId: string, eventName: string, timeout?: number): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      const entry: {
        resolve: (data: unknown) => void
        reject: (err: Error) => void
        eventName: string
        timeoutId?: ReturnType<typeof setTimeout>
      } = { resolve, reject, eventName }

      if (timeout != null && timeout > 0) {
        entry.timeoutId = this.clock.setTimeout(() => {
          this.pendingWaits.delete(nodeId)
          reject(new WaitTimeoutError(nodeId, eventName, timeout))
        }, timeout)
      }

      this.pendingWaits.set(nodeId, entry)
    })
  }

  /**
   * Deliver an external signal to a waiting node.
   * Returns true if the signal was delivered, false if no matching wait exists.
   */
  deliverSignal(nodeId: string, eventName: string, data: unknown): boolean {
    const wait = this.pendingWaits.get(nodeId)
    if (!wait || wait.eventName !== eventName) return false

    if (wait.timeoutId != null) this.clock.clearTimeout(wait.timeoutId)
    this.pendingWaits.delete(nodeId)
    wait.resolve(data)
    return true
  }

  /** Returns true if there is a pending wait for the given node. */
  hasPendingWait(nodeId: string): boolean {
    return this.pendingWaits.has(nodeId)
  }
}
