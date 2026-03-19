import { describe, it, expect } from 'vitest'
import { FlowprintEngine } from '../../engine/engine.js'
import { TestClock } from '../../engine/clock.js'
import type { ExecutionContext } from '../../walker/types.js'

/**
 * Flow with a single wait node: trigger → wait → action → terminal.
 */
const WAIT_FLOW = `
schema: flowprint/1.0
name: approval-flow
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
    next: wait_approval
  wait_approval:
    type: wait
    lane: default
    label: Wait for Approval
    event: approval
    timeout: PT24H
    timeout_next: auto_reject
    next: process_approved
  process_approved:
    type: action
    lane: default
    label: Process Approved
    next: done
  auto_reject:
    type: action
    lane: default
    label: Auto Reject
    next: done
  done:
    type: terminal
    lane: default
    label: Done
    outcome: success
`

/**
 * Flow with two sequential waits: trigger → wait1 → wait2 → terminal.
 */
const DOUBLE_WAIT_FLOW = `
schema: flowprint/1.0
name: double-wait-flow
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
    next: wait_first
  wait_first:
    type: wait
    lane: default
    label: Wait First
    event: first_signal
    next: wait_second
  wait_second:
    type: wait
    lane: default
    label: Wait Second
    event: second_signal
    next: done
  done:
    type: terminal
    lane: default
    label: Done
    outcome: success
`

/**
 * Simple wait flow without timeout (no timeout_next).
 */
const SIMPLE_WAIT_FLOW = `
schema: flowprint/1.0
name: simple-wait-flow
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
    next: wait_event
  wait_event:
    type: wait
    lane: default
    label: Wait Event
    event: my_event
    next: done
  done:
    type: terminal
    lane: default
    label: Done
    outcome: success
`

/**
 * Helper: wait for microtasks to flush so the async engine loop
 * reaches the wait node and suspends.
 */
async function flushMicrotasks(): Promise<void> {
  // Multiple rounds to ensure the walkGraph loop has suspended on the wait promise
  for (let i = 0; i < 10; i++) {
    await new Promise<void>((r) => setTimeout(r, 0))
  }
}

describe('wait/signal system', () => {
  describe('basic signal delivery', () => {
    it('wait node pauses execution — status is waiting, waitingFor is event name', async () => {
      const clock = new TestClock()
      const engine = new FlowprintEngine({ clock })
      engine.register('process_approved', async () => ({ approved: true }))
      engine.register('auto_reject', async () => ({ rejected: true }))

      const flow = await engine.load(WAIT_FLOW)
      const execution = flow.start({})

      await flushMicrotasks()

      expect(execution.status).toBe('waiting')
      expect(execution.waitingFor).toBe('approval')
    })

    it('signal resumes execution and continues to next node', async () => {
      const clock = new TestClock()
      const engine = new FlowprintEngine({ clock })
      engine.register('process_approved', async () => ({ approved: true }))
      engine.register('auto_reject', async () => ({ rejected: true }))

      const flow = await engine.load(WAIT_FLOW)
      const execution = flow.start({})

      await flushMicrotasks()
      expect(execution.status).toBe('waiting')

      execution.signal('approval', { approver: 'alice' })

      const result = await execution.result
      expect(execution.status).toBe('completed')
      expect(result.outcome).toBe('success')
      expect(result.output).toMatchObject({ approved: true })
    })

    it('signal data is merged into execution state', async () => {
      const clock = new TestClock()
      const engine = new FlowprintEngine({ clock })
      let capturedState: Record<string, unknown> = {}

      engine.register('process_approved', async (ctx: ExecutionContext) => {
        capturedState = { ...ctx.state }
        return { approved: true }
      })
      engine.register('auto_reject', async () => ({ rejected: true }))

      const flow = await engine.load(WAIT_FLOW)
      const execution = flow.start({})

      await flushMicrotasks()
      execution.signal('approval', { approver: 'bob' })

      await execution.result

      expect(capturedState).toMatchObject({ approver: 'bob' })
    })
  })

  describe('multiple sequential waits', () => {
    it('two sequential waits work correctly', async () => {
      const clock = new TestClock()
      const engine = new FlowprintEngine({ clock })

      const flow = await engine.load(DOUBLE_WAIT_FLOW)
      const execution = flow.start({})

      // First wait
      await flushMicrotasks()
      expect(execution.status).toBe('waiting')
      expect(execution.waitingFor).toBe('first_signal')

      execution.signal('first_signal', { step: 1 })

      // Second wait
      await flushMicrotasks()
      expect(execution.status).toBe('waiting')
      expect(execution.waitingFor).toBe('second_signal')

      execution.signal('second_signal', { step: 2 })

      const result = await execution.result
      expect(execution.status).toBe('completed')
      expect(result.outcome).toBe('success')
      expect(result.output).toMatchObject({ step: 2 })
    })
  })

  describe('timeout', () => {
    it('wait expires and routes to timeout_next using TestClock.advance', async () => {
      const clock = new TestClock()
      // Set TTL higher than the 24h wait timeout so TTL doesn't interfere
      const engine = new FlowprintEngine({ clock, pausedExecutionTTL: 48 * 3600 * 1000 })
      engine.register('process_approved', async () => ({ approved: true }))
      engine.register('auto_reject', async () => ({ rejected: true }))

      const flow = await engine.load(WAIT_FLOW)
      const execution = flow.start({})

      await flushMicrotasks()
      expect(execution.status).toBe('waiting')

      // Advance past the 24h timeout
      execution.advanceTime('PT24H')

      const result = await execution.result
      expect(execution.status).toBe('completed')
      expect(result.outcome).toBe('success')
      // Should have gone through auto_reject path
      expect(result.output).toMatchObject({ rejected: true })
    })

    it('TestClock.advance triggers timeout synchronously', async () => {
      const clock = new TestClock()
      // Set TTL higher than the 24h wait timeout so TTL doesn't interfere
      const engine = new FlowprintEngine({ clock, pausedExecutionTTL: 48 * 3600 * 1000 })
      engine.register('process_approved', async () => ({ approved: true }))
      engine.register('auto_reject', async () => ({ rejected: true }))

      const flow = await engine.load(WAIT_FLOW)
      const execution = flow.start({})

      await flushMicrotasks()
      expect(execution.status).toBe('waiting')

      // Advance exactly to the timeout boundary
      clock.advance(24 * 3600 * 1000)

      // The timeout fires synchronously, but the async flow needs a tick
      await flushMicrotasks()
      expect(execution.status).toBe('completed')
    })
  })

  describe('signal validation', () => {
    it('wrong signal name throws error', async () => {
      const clock = new TestClock()
      const engine = new FlowprintEngine({ clock })

      const flow = await engine.load(SIMPLE_WAIT_FLOW)
      const execution = flow.start({})

      await flushMicrotasks()
      expect(execution.status).toBe('waiting')

      expect(() => execution.signal('wrong_event', {})).toThrow(
        "No pending wait for event 'wrong_event'",
      )
    })

    it('signal on non-waiting execution throws', async () => {
      const clock = new TestClock()
      const engine = new FlowprintEngine({ clock })

      const flow = await engine.load(SIMPLE_WAIT_FLOW)
      const execution = flow.start({})

      // Don't wait for it to reach the wait node — still running
      expect(() => execution.signal('my_event', {})).toThrow(
        "Cannot signal execution in 'running' state",
      )
    })

    it('validateSignal hook rejects invalid signal data', async () => {
      const clock = new TestClock()
      const engine = new FlowprintEngine({
        clock,
        validateSignal: (eventName, data) => {
          if (eventName === 'my_event' && !(data as Record<string, unknown>)?.valid) {
            throw new Error('Signal data must have valid=true')
          }
        },
      })

      const flow = await engine.load(SIMPLE_WAIT_FLOW)
      const execution = flow.start({})

      await flushMicrotasks()
      expect(execution.status).toBe('waiting')

      expect(() => execution.signal('my_event', { valid: false })).toThrow(
        'Signal data must have valid=true',
      )

      // Valid signal should work
      execution.signal('my_event', { valid: true })
      await execution.result
      expect(execution.status).toBe('completed')
    })
  })

  describe('execute() vs start()', () => {
    it('execute() throws on flow with wait nodes', async () => {
      const engine = new FlowprintEngine()
      engine.register('process_approved', async () => ({ approved: true }))
      engine.register('auto_reject', async () => ({ rejected: true }))

      const flow = await engine.load(WAIT_FLOW)
      await expect(flow.execute({})).rejects.toThrow('Wait nodes require start(), not execute()')
    })
  })

  describe('result promise', () => {
    it('result promise resolves when flow completes after signal', async () => {
      const clock = new TestClock()
      const engine = new FlowprintEngine({ clock })

      const flow = await engine.load(SIMPLE_WAIT_FLOW)
      const execution = flow.start({})

      await flushMicrotasks()
      execution.signal('my_event', { data: 42 })

      const result = await execution.result
      expect(result.outcome).toBe('success')
      expect(result.trace.length).toBeGreaterThan(0)
    })

    it('completedResult is available after completion', async () => {
      const clock = new TestClock()
      const engine = new FlowprintEngine({ clock })

      const flow = await engine.load(SIMPLE_WAIT_FLOW)
      const execution = flow.start({})

      expect(execution.completedResult).toBeUndefined()

      await flushMicrotasks()
      execution.signal('my_event', {})

      await execution.result
      expect(execution.completedResult).toBeDefined()
      expect(execution.completedResult!.outcome).toBe('success')
    })
  })

  describe('paused execution TTL', () => {
    it('paused execution expires after TTL', async () => {
      const clock = new TestClock()
      const engine = new FlowprintEngine({
        clock,
        pausedExecutionTTL: 5000, // 5 seconds TTL
      })

      const flow = await engine.load(SIMPLE_WAIT_FLOW)
      const execution = flow.start({})

      await flushMicrotasks()
      expect(execution.status).toBe('waiting')

      // Advance past TTL
      clock.advance(6000)

      await expect(execution.result).rejects.toThrow('expired after 5000ms TTL')
      expect(execution.status).toBe('failed')
    })

    it('TTL does not fire if signal arrives in time', async () => {
      const clock = new TestClock()
      const engine = new FlowprintEngine({
        clock,
        pausedExecutionTTL: 5000,
      })

      const flow = await engine.load(SIMPLE_WAIT_FLOW)
      const execution = flow.start({})

      await flushMicrotasks()
      execution.signal('my_event', {})

      const result = await execution.result
      expect(result.outcome).toBe('success')

      // Advance past TTL — should not fail since already completed
      clock.advance(10000)
      expect(execution.status).toBe('completed')
    })
  })

  describe('advanceTime', () => {
    it('advanceTime() throws with RealClock', async () => {
      const engine = new FlowprintEngine() // default = RealClock

      const flow = await engine.load(SIMPLE_WAIT_FLOW)
      const execution = flow.start({})

      await flushMicrotasks()
      expect(() => execution.advanceTime('PT1H')).toThrow(
        'advanceTime() is only available with TestClock',
      )
    })

    it('advanceTime() parses ISO 8601 duration', async () => {
      const clock = new TestClock()
      // Set TTL higher than the 25h advance so TTL doesn't interfere
      const engine = new FlowprintEngine({ clock, pausedExecutionTTL: 48 * 3600 * 1000 })
      engine.register('process_approved', async () => ({ approved: true }))
      engine.register('auto_reject', async () => ({ rejected: true }))

      const flow = await engine.load(WAIT_FLOW)
      const execution = flow.start({})

      await flushMicrotasks()

      // Advance 25 hours (past the 24h timeout)
      execution.advanceTime('PT25H')

      const result = await execution.result
      expect(result.output).toMatchObject({ rejected: true })
    })
  })

  describe('trace recording', () => {
    it('wait node appears in the execution trace', async () => {
      const clock = new TestClock()
      const engine = new FlowprintEngine({ clock })
      engine.register('process_approved', async () => ({ approved: true }))
      engine.register('auto_reject', async () => ({ rejected: true }))

      const flow = await engine.load(WAIT_FLOW)
      const execution = flow.start({})

      await flushMicrotasks()
      execution.signal('approval', { approver: 'alice' })

      const result = await execution.result
      const waitStep = result.trace.find((t) => t.nodeId === 'wait_approval')
      expect(waitStep).toBeDefined()
      expect(waitStep!.type).toBe('wait')
      expect(waitStep!.handler).toBe('native')
    })
  })
})
