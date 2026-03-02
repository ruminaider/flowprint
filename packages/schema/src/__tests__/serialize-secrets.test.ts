import { describe, it, expect } from 'vitest'
import { serialize } from '../serialize.js'
import type { FlowprintDocument } from '../types.js'

describe('serialize secrets section', () => {
  it('serializes secrets between metadata and lanes', () => {
    const doc: FlowprintDocument = {
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      secrets: {
        STRIPE_API_KEY: { description: 'Stripe secret key' },
        DATABASE_URL: { description: 'PostgreSQL connection string' },
      },
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        start: { type: 'action', lane: 'main', label: 'Start', next: 'end' },
        end: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
      },
    }
    const yaml = serialize(doc)
    expect(yaml).toContain('STRIPE_API_KEY')
    expect(yaml).toContain('description: Stripe secret key')
    const secretsIdx = yaml.indexOf('secrets:')
    const lanesIdx = yaml.indexOf('lanes:')
    expect(secretsIdx).toBeLessThan(lanesIdx)
  })

  it('omits secrets section when not present', () => {
    const doc: FlowprintDocument = {
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        start: { type: 'action', lane: 'main', label: 'Start', next: 'end' },
        end: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
      },
    }
    const yaml = serialize(doc)
    expect(yaml).not.toContain('secrets:')
  })
})
