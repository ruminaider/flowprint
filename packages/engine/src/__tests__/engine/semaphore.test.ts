import { describe, it, expect } from 'vitest'
import { Semaphore } from '../../engine/semaphore.js'
import { FlowprintEngine } from '../../engine/engine.js'
import type { ExecutionContext } from '../../walker/types.js'

/**
 * Minimal 3-node YAML: trigger -> action -> terminal.
 */
const SIMPLE_FLOW = `
schema: flowprint/1.0
name: test-flow
version: "1.0.0"
lanes:
  default:
    label: Default
    visibility: internal
    order: 0
nodes:
  start:
    type: trigger
    lane: default
    label: Start
    trigger_type: manual
    manual: {}
    next: process
  process:
    type: action
    lane: default
    label: Process
    next: done
  done:
    type: terminal
    lane: default
    label: Done
    outcome: success
`

/** Create a deferred promise for controlling async flow in tests. */
function deferred<T = void>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('Semaphore', () => {
  describe('unit tests', () => {
    it('acquires up to max without blocking', async () => {
      const sem = new Semaphore(3)

      // All three should resolve immediately
      await sem.acquire()
      await sem.acquire()
      await sem.acquire()
      // If we got here, none blocked
    })

    it('acquire beyond max blocks until release', async () => {
      const sem = new Semaphore(1)
      await sem.acquire()

      let acquired = false
      const pending = sem.acquire().then(() => {
        acquired = true
      })

      // Give microtask queue a chance to flush
      await Promise.resolve()
      expect(acquired).toBe(false)

      sem.release()
      await pending
      expect(acquired).toBe(true)
    })

    it('release unblocks waiting acquires in FIFO order', async () => {
      const sem = new Semaphore(1)
      await sem.acquire()

      const order: number[] = []

      const p1 = sem.acquire().then(() => {
        order.push(1)
      })
      const p2 = sem.acquire().then(() => {
        order.push(2)
      })
      const p3 = sem.acquire().then(() => {
        order.push(3)
      })

      // Release one at a time and verify FIFO
      sem.release()
      await p1

      sem.release()
      await p2

      sem.release()
      await p3

      expect(order).toEqual([1, 2, 3])
    })

    it('multiple waiters: release unblocks one at a time', async () => {
      const sem = new Semaphore(2)
      await sem.acquire()
      await sem.acquire()

      let count = 0
      const p1 = sem.acquire().then(() => {
        count++
      })
      const p2 = sem.acquire().then(() => {
        count++
      })

      await Promise.resolve()
      expect(count).toBe(0)

      // Release one slot — only one waiter should proceed
      sem.release()
      await p1
      expect(count).toBe(1)

      // Release another slot — the second waiter should proceed
      sem.release()
      await p2
      expect(count).toBe(2)
    })
  })

  describe('backpressure integration', () => {
    it('default: unlimited concurrency — multiple execute() calls run simultaneously', async () => {
      const engine = new FlowprintEngine()

      const barriers = [deferred(), deferred(), deferred()]
      let callIndex = 0
      const started: number[] = []

      engine.register('process', async (_ctx: ExecutionContext) => {
        const idx = callIndex++
        started.push(idx)
        await barriers[idx]!.promise
        return { idx }
      })

      const flow = await engine.load(SIMPLE_FLOW)

      // Launch 3 concurrent executions
      const p1 = flow.execute({ id: 1 })
      const p2 = flow.execute({ id: 2 })
      const p3 = flow.execute({ id: 3 })

      // Give microtasks time to schedule
      await Promise.resolve()
      await Promise.resolve()

      // All three should have started simultaneously (no backpressure)
      expect(started.length).toBe(3)

      // Resolve all barriers
      barriers[0]!.resolve()
      barriers[1]!.resolve()
      barriers[2]!.resolve()

      const [r1, r2, r3] = await Promise.all([p1, p2, p3])
      expect(r1.outcome).toBe('success')
      expect(r2.outcome).toBe('success')
      expect(r3.outcome).toBe('success')
    })

    it('maxConcurrency: 2 — third call waits until a slot is free', async () => {
      const engine = new FlowprintEngine({ maxConcurrency: 2 })

      const barriers = [deferred(), deferred(), deferred()]
      let callIndex = 0
      const started: number[] = []

      engine.register('process', async (_ctx: ExecutionContext) => {
        const idx = callIndex++
        started.push(idx)
        await barriers[idx]!.promise
        return { idx }
      })

      const flow = await engine.load(SIMPLE_FLOW)

      // Launch 3 concurrent executions
      const p1 = flow.execute({ id: 1 })
      const p2 = flow.execute({ id: 2 })
      const p3 = flow.execute({ id: 3 })

      // Give microtasks time to schedule
      await Promise.resolve()
      await Promise.resolve()

      // Only first 2 should have started (semaphore max = 2)
      expect(started.length).toBe(2)

      // Complete the first execution — this frees a slot
      barriers[0]!.resolve()
      await p1

      // Give microtasks time to propagate semaphore release
      await Promise.resolve()
      await Promise.resolve()

      // Third should now have started
      expect(started.length).toBe(3)

      // Resolve remaining
      barriers[1]!.resolve()
      barriers[2]!.resolve()

      const [r2, r3] = await Promise.all([p2, p3])
      expect(r2.outcome).toBe('success')
      expect(r3.outcome).toBe('success')
    })

    it('completed execution releases slot, allowing waiting execution to proceed', async () => {
      const engine = new FlowprintEngine({ maxConcurrency: 1 })

      const barriers = [deferred(), deferred()]
      let callIndex = 0
      const started: number[] = []

      engine.register('process', async (_ctx: ExecutionContext) => {
        const idx = callIndex++
        started.push(idx)
        await barriers[idx]!.promise
        return { idx }
      })

      const flow = await engine.load(SIMPLE_FLOW)

      // Launch 2 concurrent executions with maxConcurrency=1
      const p1 = flow.execute({ id: 1 })
      const p2 = flow.execute({ id: 2 })

      // Give microtasks time to schedule
      await Promise.resolve()
      await Promise.resolve()

      // Only first should have started
      expect(started.length).toBe(1)

      // Complete the first execution
      barriers[0]!.resolve()
      await p1

      // Give microtasks time to propagate
      await Promise.resolve()
      await Promise.resolve()

      // Second should now have started
      expect(started.length).toBe(2)

      // Complete the second
      barriers[1]!.resolve()
      const r2 = await p2
      expect(r2.outcome).toBe('success')
    })
  })
})
