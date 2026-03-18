/**
 * Abstraction over time operations. Allows deterministic testing
 * of timeout-dependent code paths (wait nodes, TTL).
 */
export interface Clock {
  now(): number
  setTimeout(fn: () => void, ms: number): ReturnType<typeof setTimeout>
  clearTimeout(id: ReturnType<typeof setTimeout>): void
}

/**
 * Real clock backed by Date.now() and native timers.
 */
export class RealClock implements Clock {
  now(): number {
    return Date.now()
  }

  setTimeout(fn: () => void, ms: number): ReturnType<typeof setTimeout> {
    return setTimeout(fn, ms)
  }

  clearTimeout(id: ReturnType<typeof setTimeout>): void {
    clearTimeout(id)
  }
}

/**
 * Deterministic clock for testing. Time only advances via advance().
 * Timers fire synchronously in chronological order within the advanced window.
 */
export class TestClock implements Clock {
  private currentTime = 0
  private timers: ({ fn: () => void; triggerAt: number } | undefined)[] = []

  now(): number {
    return this.currentTime
  }

  setTimeout(fn: () => void, ms: number): ReturnType<typeof setTimeout> {
    const timer = { fn, triggerAt: this.currentTime + ms }
    this.timers.push(timer)
    // Return a fake timer ID (index-based)
    return (this.timers.length - 1) as unknown as ReturnType<typeof setTimeout>
  }

  clearTimeout(id: ReturnType<typeof setTimeout>): void {
    const index = id as unknown as number
    if (this.timers[index]) {
      this.timers[index] = undefined
    }
  }

  /** Advance time by `ms`. Triggers all timers that fire within the window, in order. */
  advance(ms: number): void {
    const targetTime = this.currentTime + ms

    // Collect and sort pending timers within the window
    const pending = this.timers
      .filter((t): t is { fn: () => void; triggerAt: number } => t != null && t.triggerAt <= targetTime)
      .sort((a, b) => a.triggerAt - b.triggerAt)

    for (const timer of pending) {
      // Clear the timer slot before firing (prevents double-fire)
      const idx = this.timers.indexOf(timer)
      if (idx !== -1) this.timers[idx] = undefined

      this.currentTime = timer.triggerAt
      timer.fn()
    }

    this.currentTime = targetTime
  }
}
