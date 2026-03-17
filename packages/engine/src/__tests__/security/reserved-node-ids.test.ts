import { describe, it, expect } from 'vitest'
import { validate } from '@ruminaider/flowprint-schema'

function makeDoc(nodeId: string) {
  return {
    schema: 'flowprint/1.0',
    name: 'test',
    version: '1.0.0',
    lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
    nodes: {
      [nodeId]: { type: 'action', lane: 'main', label: 'Step', next: 'end' },
      end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
    },
  }
}

describe('reserved node IDs', () => {
  it('rejects node ID "input"', () => {
    const result = validate(makeDoc('input'))
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.path === '/nodes/input' && e.message.includes('reserved'),
      ),
    ).toBe(true)
  })

  it('rejects node ID "state"', () => {
    const result = validate(makeDoc('state'))
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.path === '/nodes/state' && e.message.includes('reserved'),
      ),
    ).toBe(true)
  })

  it('rejects node ID "Math"', () => {
    const result = validate(makeDoc('Math'))
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.path === '/nodes/Math' && e.message.includes('reserved'),
      ),
    ).toBe(true)
  })

  it('rejects node ID "node"', () => {
    const result = validate(makeDoc('node'))
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.path === '/nodes/node' && e.message.includes('reserved'),
      ),
    ).toBe(true)
  })

  it('rejects node ID "output"', () => {
    const result = validate(makeDoc('output'))
    expect(result.valid).toBe(false)
    expect(
      result.errors.some(
        (e) => e.path === '/nodes/output' && e.message.includes('reserved'),
      ),
    ).toBe(true)
  })

  it('allows non-reserved node ID "my_action"', () => {
    const result = validate(makeDoc('my_action'))
    expect(result.valid).toBe(true)
  })

  it('allows non-reserved node ID "process_input"', () => {
    const result = validate(makeDoc('process_input'))
    expect(result.valid).toBe(true)
  })

  it('error message lists all reserved IDs', () => {
    const result = validate(makeDoc('input'))
    const error = result.errors.find((e) => e.path === '/nodes/input')
    expect(error?.message).toContain('input')
    expect(error?.message).toContain('state')
    expect(error?.message).toContain('Math')
    expect(error?.message).toContain('node')
    expect(error?.message).toContain('output')
  })
})
