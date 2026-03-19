/**
 * Simple counting semaphore for limiting concurrent execute() calls.
 * When all slots are taken, acquire() returns a promise that resolves
 * when a slot becomes available.
 */
export class Semaphore {
  private current = 0
  private queue: (() => void)[] = []

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.current < this.max) {
      this.current++
      return
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.current++
        resolve()
      })
    })
  }

  release(): void {
    this.current--
    const next = this.queue.shift()
    if (next) next()
  }
}
