import { describe, it, expect } from 'vitest'
import { validate } from '../validate.js'
import { isTriggerNode } from '../guards.js'
import type { FlowprintDocument, TriggerNode } from '../types.js'

function makeDocWithTrigger(
  triggerOverrides: Partial<TriggerNode> & { trigger_type: string },
): FlowprintDocument {
  return {
    schema: 'flowprint/1.0',
    name: 'test',
    version: '1.0.0',
    lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
    nodes: {
      my_trigger: {
        type: 'trigger',
        lane: 'main',
        label: 'My Trigger',
        next: 'start',
        ...triggerOverrides,
      } as TriggerNode,
      start: { type: 'action', lane: 'main', label: 'Start', next: 'end' },
      end: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
    },
  }
}

describe('trigger node validation', () => {
  describe('basic validation', () => {
    it('accepts a valid schedule trigger', () => {
      const doc = makeDocWithTrigger({
        trigger_type: 'schedule',
        schedule: { cron: '0 9 * * MON-FRI', timezone: 'America/New_York' },
      })
      const result = validate(doc)
      expect(result.valid).toBe(true)
    })

    it('accepts a valid webhook trigger', () => {
      const doc = makeDocWithTrigger({
        trigger_type: 'webhook',
        webhook: { method: 'POST', path: '/api/webhook' },
      })
      const result = validate(doc)
      expect(result.valid).toBe(true)
    })

    it('accepts a valid event trigger', () => {
      const doc = makeDocWithTrigger({
        trigger_type: 'event',
        event: { source: 'stripe', type: 'payment.completed' },
      })
      const result = validate(doc)
      expect(result.valid).toBe(true)
    })

    it('accepts a valid manual trigger', () => {
      const doc = makeDocWithTrigger({
        trigger_type: 'manual',
        manual: {
          form_fields: [
            { name: 'reason', type: 'string', required: true },
          ],
        },
      })
      const result = validate(doc)
      expect(result.valid).toBe(true)
    })

    it('rejects a trigger with invalid trigger_type', () => {
      const doc = makeDocWithTrigger({ trigger_type: 'invalid' } as never)
      const result = validate(doc)
      expect(result.valid).toBe(false)
    })
  })

  describe('conditional schema enforcement', () => {
    it('schedule with schedule field passes', () => {
      const doc = makeDocWithTrigger({
        trigger_type: 'schedule',
        schedule: { cron: '0 9 * * *' },
      })
      expect(validate(doc).valid).toBe(true)
    })

    it('schedule with webhook field fails', () => {
      const doc = makeDocWithTrigger({
        trigger_type: 'schedule',
        schedule: { cron: '0 9 * * *' },
        webhook: { method: 'POST' },
      } as never)
      expect(validate(doc).valid).toBe(false)
    })

    it('schedule without schedule field fails', () => {
      const doc = makeDocWithTrigger({ trigger_type: 'schedule' })
      expect(validate(doc).valid).toBe(false)
    })

    it('webhook with webhook field passes', () => {
      const doc = makeDocWithTrigger({
        trigger_type: 'webhook',
        webhook: { method: 'GET', path: '/hook' },
      })
      expect(validate(doc).valid).toBe(true)
    })

    it('webhook with event field fails', () => {
      const doc = makeDocWithTrigger({
        trigger_type: 'webhook',
        webhook: { method: 'GET' },
        event: { source: 'stripe' },
      } as never)
      expect(validate(doc).valid).toBe(false)
    })

    it('event with event field passes', () => {
      const doc = makeDocWithTrigger({
        trigger_type: 'event',
        event: { source: 'stripe', type: 'charge.succeeded' },
      })
      expect(validate(doc).valid).toBe(true)
    })

    it('event with manual field fails', () => {
      const doc = makeDocWithTrigger({
        trigger_type: 'event',
        event: { source: 'stripe' },
        manual: { form_fields: [] },
      } as never)
      expect(validate(doc).valid).toBe(false)
    })

    it('manual with manual field passes', () => {
      const doc = makeDocWithTrigger({
        trigger_type: 'manual',
        manual: {},
      })
      expect(validate(doc).valid).toBe(true)
    })

    it('manual with schedule field fails', () => {
      const doc = makeDocWithTrigger({
        trigger_type: 'manual',
        manual: {},
        schedule: { cron: '0 * * * *' },
      } as never)
      expect(validate(doc).valid).toBe(false)
    })

    it('schedule with both schedule and webhook fails', () => {
      const doc = makeDocWithTrigger({
        trigger_type: 'schedule',
        schedule: { cron: '0 9 * * *' },
        webhook: { method: 'POST' },
      } as never)
      expect(validate(doc).valid).toBe(false)
    })
  })
})

describe('isTriggerNode guard', () => {
  it('returns true for trigger nodes', () => {
    const node = {
      type: 'trigger',
      lane: 'main',
      label: 'Test',
      trigger_type: 'schedule',
      next: 'start',
      schedule: { cron: '0 9 * * *' },
    } as TriggerNode
    expect(isTriggerNode(node)).toBe(true)
  })

  it('returns false for non-trigger nodes', () => {
    const node = { type: 'action', lane: 'main', label: 'Test' }
    expect(isTriggerNode(node as never)).toBe(false)
  })
})
