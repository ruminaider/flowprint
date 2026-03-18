import type { PlainAdapter } from '../adapters/plain.js'
import type { Clock } from './clock.js'
import { TestClock } from './clock.js'
import { parseDuration } from './duration.js'
import type { ExecutionResult, ValidateSignalFn } from './types.js'

export type ExecutionStatus = 'running' | 'waiting' | 'completed' | 'failed'

/**
 * Handle returned by `CompiledFlow.start()` for flows that may contain wait nodes.
 *
 * Provides:
 * - Status tracking (running / waiting / completed / failed)
 * - Signal delivery to resume waiting nodes
 * - Time advancement for testing with TestClock
 * - A result promise that resolves when the flow completes
 */
export class Execution {
  private _status: ExecutionStatus = 'running'
  private _waitingNodeId?: string
  private _waitingFor?: string
  private _result?: ExecutionResult
  private _error?: Error
  private readonly resultPromise: Promise<ExecutionResult>
  private resolveResult!: (result: ExecutionResult) => void
  private rejectResult!: (error: Error) => void
  private ttlTimerId?: ReturnType<typeof setTimeout>

  constructor(
    private readonly adapter: PlainAdapter,
    private readonly clock: Clock,
    private readonly validateSignal?: ValidateSignalFn,
    private readonly ttl?: number,
  ) {
    this.resultPromise = new Promise<ExecutionResult>((resolve, reject) => {
      this.resolveResult = resolve
      this.rejectResult = reject
    })
  }

  /** Current execution status. */
  get status(): ExecutionStatus {
    return this._status
  }

  /** The event name the execution is currently waiting for, if any. */
  get waitingFor(): string | undefined {
    return this._waitingFor
  }

  /** Promise that resolves with the final result when the flow completes. */
  get result(): Promise<ExecutionResult> {
    return this.resultPromise
  }

  /** The synchronous result snapshot, available after status is 'completed'. */
  get completedResult(): ExecutionResult | undefined {
    return this._result
  }

  /** The error, available after status is 'failed'. */
  get error(): Error | undefined {
    return this._error
  }

  /** Send a signal to resume a waiting execution. */
  signal(eventName: string, data?: unknown): void {
    if (this._status !== 'waiting') {
      throw new Error(`Cannot signal execution in '${this._status}' state`)
    }

    if (this.validateSignal) {
      this.validateSignal(eventName, data)
    }

    const payload = data ?? {}
    const delivered = this.adapter.deliverSignal(this._waitingNodeId!, eventName, payload)
    if (!delivered) {
      throw new Error(`No pending wait for event '${eventName}'`)
    }
  }

  /** Advance synthetic time (TestClock only). Throws if using RealClock. */
  advanceTime(duration: string): void {
    if (!(this.clock instanceof TestClock)) {
      throw new Error('advanceTime() is only available with TestClock')
    }
    const ms = parseDuration(duration)
    this.clock.advance(ms)
  }

  // ── Internal methods called by the engine ──────────────────────────

  /** @internal */
  setWaiting(nodeId: string, eventName: string): void {
    this._status = 'waiting'
    this._waitingNodeId = nodeId
    this._waitingFor = eventName
    this.startTtl()
  }

  /** @internal */
  setRunning(): void {
    this._status = 'running'
    this._waitingNodeId = undefined
    this._waitingFor = undefined
    this.clearTtl()
  }

  /** @internal */
  complete(result: ExecutionResult): void {
    this._status = 'completed'
    this._result = result
    this.clearTtl()
    this.resolveResult(result)
  }

  /** @internal */
  fail(error: Error): void {
    this._status = 'failed'
    this._error = error
    this.clearTtl()
    this.rejectResult(error)
  }

  // ── TTL management ─────────────────────────────────────────────────

  private startTtl(): void {
    this.clearTtl()
    if (this.ttl != null && this.ttl > 0) {
      this.ttlTimerId = this.clock.setTimeout(() => {
        if (this._status === 'waiting') {
          this.fail(
            new Error(
              `Paused execution expired after ${this.ttl}ms TTL (waiting for '${this._waitingFor}')`,
            ),
          )
        }
      }, this.ttl)
    }
  }

  private clearTtl(): void {
    if (this.ttlTimerId != null) {
      this.clock.clearTimeout(this.ttlTimerId)
      this.ttlTimerId = undefined
    }
  }
}
