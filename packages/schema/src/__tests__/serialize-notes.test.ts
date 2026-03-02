import { describe, it, expect } from 'vitest'
import { serialize } from '../serialize.js'
import type { FlowprintDocument } from '../types.js'

describe('serialize notes field', () => {
  it('places notes after description in serialized output', () => {
    const doc: FlowprintDocument = {
      schema: 'flowprint/1.0',
      name: 'test',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        start: {
          type: 'action',
          lane: 'main',
          label: 'Start',
          description: 'First action',
          notes: 'Uses SKU prefix to determine category',
          next: 'end',
        },
        end: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
      },
    }
    const yaml = serialize(doc)
    const descIdx = yaml.indexOf('description: First action')
    const notesIdx = yaml.indexOf('notes: Uses SKU prefix')
    expect(notesIdx).toBeGreaterThan(descIdx)
    // notes should come before entry_points (metadata may not exist)
    const epIdx = yaml.indexOf('entry_points')
    if (epIdx !== -1) expect(notesIdx).toBeLessThan(epIdx)
  })
})
