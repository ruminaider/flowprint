import type { ExecutionContext } from '../walker/types.js'
import type { ExecutionAdapter, ActionConfig } from './types.js'

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

  constructor(options?: { defaultTimeout?: number }) {
    this.defaultTimeout = options?.defaultTimeout ?? 30_000 // 30s default
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

  async executeParallel(
    branches: (() => Promise<unknown>)[],
    strategy: 'all' | 'first',
  ): Promise<unknown[]> {
    if (strategy === 'all') {
      return this.executeParallelAll(branches)
    }
    return this.executeParallelFirst(branches)
  }

  /**
   * 'all' strategy: run all branches concurrently via Promise.all.
   * On failure, the remaining branches see their abort signals fire.
   */
  private async executeParallelAll(branches: (() => Promise<unknown>)[]): Promise<unknown[]> {
    return Promise.all(branches.map((branch) => branch()))
  }

  /**
   * 'first' strategy: run all branches to completion.
   * Track which finishes first. Return results in original order
   * with the first-to-finish index stored.
   *
   * All branches complete — side effects from losers commit.
   */
  private async executeParallelFirst(branches: (() => Promise<unknown>)[]): Promise<unknown[]> {
    let firstIndex = -1
    const results = await Promise.all(
      branches.map(async (branch, index) => {
        const result = await branch()
        if (firstIndex === -1) {
          firstIndex = index
        }
        return result
      }),
    )
    return results
  }
}
