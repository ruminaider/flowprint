import { describe, it, expect } from 'vitest'
import {
  registerNodeSpec,
  getNodeSpec,
  getAllNodeSpecs,
  getNodeSpecOrThrow,
} from '../registry'
import type { NodeSpec } from '../types'

function makeStubSpec(type: string): NodeSpec {
  return {
    type,
    displayName: type.charAt(0).toUpperCase() + type.slice(1),
    icon: () => null,
    color: `--fp-node-${type}`,
    shortcut: type[0],
    renderNode: () => null,
    renderProperties: () => null,
    renderEditor: () => null,
    defaultData: () => ({}),
    validate: () => [],
  }
}

describe('NodeSpec registry', () => {
  it('registers and retrieves a spec', () => {
    const spec = makeStubSpec('test-register')
    registerNodeSpec(spec)
    expect(getNodeSpec('test-register')).toBe(spec)
  })

  it('returns undefined for unknown type', () => {
    expect(getNodeSpec('nonexistent-type')).toBeUndefined()
  })

  it('throws for unknown type via getNodeSpecOrThrow', () => {
    expect(() => getNodeSpecOrThrow('nonexistent-throw')).toThrow(
      'No node spec registered for type: nonexistent-throw',
    )
  })

  it('getAllNodeSpecs returns all registered specs', () => {
    const before = getAllNodeSpecs().length
    registerNodeSpec(makeStubSpec('test-getall-a'))
    registerNodeSpec(makeStubSpec('test-getall-b'))
    expect(getAllNodeSpecs().length).toBe(before + 2)
  })
})
