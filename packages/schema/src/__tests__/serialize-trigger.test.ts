import { describe, it, expect } from 'vitest'
import { serialize } from '../serialize.js'
import type { FlowprintDocument } from '../types.js'

function makeDocWithTrigger(triggerNode: Record<string, unknown>): FlowprintDocument {
  return {
    schema: 'flowprint/1.0',
    name: 'test',
    version: '1.0.0',
    lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
    nodes: {
      on_schedule: {
        type: 'trigger',
        lane: 'main',
        label: 'Daily Check',
        ...triggerNode,
      } as FlowprintDocument['nodes'][string],
      start: { type: 'action', lane: 'main', label: 'Start', next: 'end' },
      end: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
    },
  }
}

describe('serialize trigger node', () => {
  it('places trigger_type before next in output', () => {
    const doc = makeDocWithTrigger({
      trigger_type: 'schedule',
      schedule: { cron: '0 9 * * MON-FRI' },
      next: 'start',
    })
    const yaml = serialize(doc)
    const triggerTypeIdx = yaml.indexOf('trigger_type: schedule')
    const nextIdx = yaml.indexOf('next: start')
    expect(triggerTypeIdx).toBeGreaterThan(-1)
    expect(nextIdx).toBeGreaterThan(triggerTypeIdx)
  })

  it('places schedule config between trigger_type and next', () => {
    const doc = makeDocWithTrigger({
      trigger_type: 'schedule',
      schedule: { cron: '0 9 * * MON-FRI', timezone: 'America/New_York' },
      next: 'start',
    })
    const yaml = serialize(doc)
    const triggerTypeIdx = yaml.indexOf('trigger_type: schedule')
    // Use indented key to avoid matching the node ID 'on_schedule:'
    const scheduleIdx = yaml.indexOf('    schedule:')
    const cronIdx = yaml.indexOf('cron:')
    const nextIdx = yaml.indexOf('next: start')
    expect(scheduleIdx).toBeGreaterThan(triggerTypeIdx)
    expect(cronIdx).toBeGreaterThan(scheduleIdx)
    expect(nextIdx).toBeGreaterThan(cronIdx)
  })

  it('serializes webhook config object', () => {
    const doc = makeDocWithTrigger({
      trigger_type: 'webhook',
      webhook: { method: 'POST', path: '/api/webhook' },
      next: 'start',
    })
    const yaml = serialize(doc)
    expect(yaml).toContain('webhook:')
    expect(yaml).toContain('method: POST')
    expect(yaml).toContain('path: /api/webhook')
  })

  it('serializes event config object', () => {
    const doc = makeDocWithTrigger({
      trigger_type: 'event',
      event: { source: 'stripe', type: 'payment.completed' },
      next: 'start',
    })
    const yaml = serialize(doc)
    expect(yaml).toContain('event:')
    expect(yaml).toContain('source: stripe')
    expect(yaml).toContain('type: payment.completed')
  })

  it('serializes manual config with form_fields array', () => {
    const doc = makeDocWithTrigger({
      trigger_type: 'manual',
      manual: {
        form_fields: [
          { name: 'reason', type: 'string', required: true },
        ],
      },
      next: 'start',
    })
    const yaml = serialize(doc)
    expect(yaml).toContain('manual:')
    expect(yaml).toContain('form_fields:')
    expect(yaml).toContain('name: reason')
  })
})
