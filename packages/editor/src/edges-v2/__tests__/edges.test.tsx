import { describe, it, expect } from 'vitest'
import { edgeTypes } from '../index'

describe('Edge types', () => {
  it('exports all required edge types', () => {
    expect(edgeTypes.normal).toBeDefined()
    expect(edgeTypes.error).toBeDefined()
    expect(edgeTypes.default).toBeDefined()
    expect(edgeTypes.conditional).toBeDefined()
  })

  it('normal and default map to the same component', () => {
    expect(edgeTypes.normal).toBe(edgeTypes.default)
  })

  it('each edge type is a valid React component (function)', () => {
    expect(typeof edgeTypes.normal).toBe('object') // memo wraps as object
    expect(typeof edgeTypes.error).toBe('object')
    expect(typeof edgeTypes.conditional).toBe('object')
  })
})
