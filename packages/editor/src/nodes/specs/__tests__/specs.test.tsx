import { describe, it, expect } from 'vitest'
import { getAllNodeSpecs } from '../../registry'
import {
  nodeTypes,
  actionSpec,
  switchSpec,
  parallelSpec,
  waitSpec,
  errorSpec,
  terminalSpec,
  triggerSpec,
} from '../index'

const ALL_TYPES = ['action', 'switch', 'parallel', 'wait', 'error', 'terminal', 'trigger']

describe('Node specs registration', () => {
  it('registers all 7 specs in the registry', () => {
    const specs = getAllNodeSpecs()
    const registeredTypes = specs.map((s) => s.type)
    for (const type of ALL_TYPES) {
      expect(registeredTypes).toContain(type)
    }
  })

  it('nodeTypes map has all 7 entries', () => {
    expect(Object.keys(nodeTypes)).toHaveLength(7)
    for (const type of ALL_TYPES) {
      expect(nodeTypes[type]).toBeDefined()
      expect(typeof nodeTypes[type]).toBe('function')
    }
  })
})

describe('Node spec defaultData', () => {
  const specs = [
    actionSpec,
    switchSpec,
    parallelSpec,
    waitSpec,
    errorSpec,
    terminalSpec,
    triggerSpec,
  ]

  it.each(specs)(
    '$type spec defaultData returns correct type field',
    (spec) => {
      const data = spec.defaultData()
      expect(data.type).toBe(spec.type)
    },
  )

  it('action defaultData has expected fields', () => {
    const data = actionSpec.defaultData()
    expect(data).toEqual({
      type: 'action',
      lane: '',
      label: 'New Action',
      next: undefined,
      entry_points: [],
    })
  })

  it('switch defaultData has expected fields', () => {
    const data = switchSpec.defaultData()
    expect(data).toEqual({
      type: 'switch',
      lane: '',
      label: 'New Switch',
      cases: [{ when: '', next: '' }],
    })
  })

  it('parallel defaultData has expected fields', () => {
    const data = parallelSpec.defaultData()
    expect(data).toEqual({
      type: 'parallel',
      lane: '',
      label: 'New Parallel',
      branches: [],
      join: '',
    })
  })

  it('wait defaultData has expected fields', () => {
    const data = waitSpec.defaultData()
    expect(data).toEqual({
      type: 'wait',
      lane: '',
      label: 'New Wait',
      event: 'timer',
      duration: '1h',
    })
  })

  it('error defaultData has expected fields', () => {
    const data = errorSpec.defaultData()
    expect(data).toEqual({
      type: 'error',
      lane: '',
      label: 'New Error',
      next: undefined,
    })
  })

  it('terminal defaultData has expected fields', () => {
    const data = terminalSpec.defaultData()
    expect(data).toEqual({
      type: 'terminal',
      lane: '',
      label: 'New Terminal',
      outcome: 'success',
    })
  })

  it('trigger defaultData has expected fields', () => {
    const data = triggerSpec.defaultData()
    expect(data).toEqual({
      type: 'trigger',
      lane: '',
      label: 'New Trigger',
      trigger_type: 'manual',
      next: undefined,
    })
  })
})

describe('Node spec validate', () => {
  const specs = [
    actionSpec,
    switchSpec,
    parallelSpec,
    waitSpec,
    errorSpec,
    terminalSpec,
    triggerSpec,
  ]

  it.each(specs)('$type spec validate returns empty array', (spec) => {
    expect(spec.validate({})).toEqual([])
  })
})
