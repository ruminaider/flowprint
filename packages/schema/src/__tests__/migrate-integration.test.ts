import { describe, it, expect } from 'vitest'
import { parse } from 'yaml'
import { migrate, serialize, validate, CURRENT_VERSION } from '../index.js'
import type { FlowprintDocument } from '../types.js'

describe('migration integration', () => {
  it('current-version doc: migrate → validate → serialize roundtrip', () => {
    const yaml = `schema: flowprint/1.0
name: integration-test
version: "1.0.0"
lanes:
  main:
    label: Main
    visibility: external
    order: 0
nodes:
  start:
    type: trigger
    lane: main
    label: Start
    trigger_type: manual
    manual: {}
    next: process
  process:
    type: action
    lane: main
    label: Process
    next: done
  done:
    type: terminal
    lane: main
    label: Done
    outcome: success`

    const doc = parse(yaml) as FlowprintDocument
    const result = migrate(doc)
    expect(result.status).toBe('current')

    if (result.status === 'current') {
      const validation = validate(result.doc)
      expect(validation.valid).toBe(true)

      const serialized = serialize(result.doc)
      const reparsed = parse(serialized) as FlowprintDocument
      expect(reparsed.schema).toBe(CURRENT_VERSION)
      expect(reparsed.name).toBe('integration-test')
    }
  })

  it('future-version doc: returns future_version status', () => {
    const doc = {
      schema: 'flowprint/99.0',
      name: 'future',
      version: '1.0.0',
      lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
      nodes: {
        done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
      },
    } as FlowprintDocument

    const result = migrate(doc)
    expect(result.status).toBe('future_version')
    if (result.status === 'future_version') {
      expect(result.documentVersion).toBe('flowprint/99.0')
    }
  })
})
