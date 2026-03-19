import { describe, it, expect } from 'vitest'
import { translateToJDM, conditionToUnary } from '../rules-translator.js'
import type { RulesDocument } from '@ruminaider/flowprint-engine-core'

function makeDoc(overrides: Partial<RulesDocument> = {}): RulesDocument {
  return {
    schema: 'flowprint-rules/1.0',
    name: 'test-rules',
    hit_policy: 'first',
    rules: [],
    ...overrides,
  }
}

describe('conditionToUnary', () => {
  it('maps eq string to quoted literal', () => {
    expect(conditionToUnary({ eq: 'enterprise' })).toBe('"enterprise"')
  })

  it('maps eq number to literal', () => {
    expect(conditionToUnary({ eq: 42 })).toBe('42')
  })

  it('maps eq null to null', () => {
    expect(conditionToUnary({ eq: null })).toBe('null')
  })

  it('maps eq boolean to literal', () => {
    expect(conditionToUnary({ eq: true })).toBe('true')
  })

  it('maps shorthand string scalar to eq', () => {
    expect(conditionToUnary('enterprise')).toBe('"enterprise"')
  })

  it('maps shorthand number scalar to eq', () => {
    expect(conditionToUnary(42)).toBe('42')
  })

  it('maps gt to > operator', () => {
    expect(conditionToUnary({ gt: 10000 })).toBe('> 10000')
  })

  it('maps gte to >= operator', () => {
    expect(conditionToUnary({ gte: 100 })).toBe('>= 100')
  })

  it('maps lt to < operator', () => {
    expect(conditionToUnary({ lt: 50 })).toBe('< 50')
  })

  it('maps lte to <= operator', () => {
    expect(conditionToUnary({ lte: 50 })).toBe('<= 50')
  })

  it('maps not_eq to not() expression', () => {
    expect(conditionToUnary({ not_eq: 'basic' })).toBe('not("basic")')
  })

  it('maps in to comma-separated values', () => {
    expect(conditionToUnary({ in: ['US', 'CA'] })).toBe('"US", "CA"')
  })

  it('maps not_in to ANDed not() expressions', () => {
    expect(conditionToUnary({ not_in: ['X', 'Y'] })).toBe('not("X") and not("Y")')
  })

  it('maps between to range syntax', () => {
    expect(conditionToUnary({ between: [10, 20] })).toBe('[10..20]')
  })

  it('maps multi-operator condition with and', () => {
    expect(conditionToUnary({ gte: 50, lte: 100 })).toBe('>= 50 and <= 100')
  })
})

describe('translateToJDM', () => {
  it('produces valid JDM structure with inputNode -> decisionTableNode -> outputNode', () => {
    const doc = makeDoc({
      rules: [{ when: { tier: 'enterprise' }, then: { discount: 20 } }],
    })
    const jdm = translateToJDM(doc)

    expect(jdm.nodes).toHaveLength(3)
    expect(jdm.nodes[0]!.type).toBe('inputNode')
    expect(jdm.nodes[1]!.type).toBe('decisionTableNode')
    expect(jdm.nodes[2]!.type).toBe('outputNode')

    expect(jdm.edges).toHaveLength(2)
    expect(jdm.edges[0]).toEqual({
      id: 'e1',
      type: 'edge',
      sourceId: 'input',
      targetId: 'table',
    })
    expect(jdm.edges[1]).toEqual({
      id: 'e2',
      type: 'edge',
      sourceId: 'table',
      targetId: 'output',
    })
  })

  it('translates first hit policy correctly', () => {
    const doc = makeDoc({
      hit_policy: 'first',
      rules: [
        { when: { tier: 'enterprise' }, then: { discount: 20 } },
        { then: { discount: 0 } },
      ],
    })
    const jdm = translateToJDM(doc)
    const table = jdm.nodes[1]!

    expect(table.content!.hitPolicy).toBe('first')
    expect(table.content!.rules).toHaveLength(2)
  })

  it('translates collect hit policy correctly', () => {
    const doc = makeDoc({
      hit_policy: 'collect',
      rules: [
        { when: { x: { gt: 0 } }, then: { rule: 1 } },
        { when: { x: { gt: 5 } }, then: { rule: 2 } },
      ],
    })
    const jdm = translateToJDM(doc)
    const table = jdm.nodes[1]!

    expect(table.content!.hitPolicy).toBe('collect')
  })

  it('translates all hit policy to collect', () => {
    const doc = makeDoc({
      hit_policy: 'all',
      rules: [{ when: { x: { gt: 0 } }, then: { out: true } }],
    })
    const jdm = translateToJDM(doc)
    const table = jdm.nodes[1]!

    expect(table.content!.hitPolicy).toBe('collect')
  })

  it('translates priority hit policy to first with sorted rules', () => {
    const doc = makeDoc({
      hit_policy: 'priority',
      rules: [
        { when: { x: { gt: 0 } }, then: { rule: 'C' }, priority: 3 },
        { when: { x: { gt: 0 } }, then: { rule: 'A' }, priority: 1 },
        { when: { x: { gt: 0 } }, then: { rule: 'B' }, priority: 2 },
      ],
    })
    const jdm = translateToJDM(doc)
    const table = jdm.nodes[1]!

    expect(table.content!.hitPolicy).toBe('first')
    // Rules should be sorted by priority (1, 2, 3)
    const outputCol = table.content!.outputs[0]!.id
    expect(table.content!.rules[0]![outputCol]).toBe('"A"')
    expect(table.content!.rules[1]![outputCol]).toBe('"B"')
    expect(table.content!.rules[2]![outputCol]).toBe('"C"')
  })

  it('discovers input fields from rule conditions', () => {
    const doc = makeDoc({
      rules: [
        { when: { tier: 'enterprise', amount: { gt: 1000 } }, then: { discount: 10 } },
      ],
    })
    const jdm = translateToJDM(doc)
    const table = jdm.nodes[1]!
    const inputFields = table.content!.inputs.map((i) => i.field)

    expect(inputFields).toContain('tier')
    expect(inputFields).toContain('amount')
  })

  it('discovers output fields from all rules', () => {
    const doc = makeDoc({
      rules: [
        { when: { tier: 'gold' }, then: { discount: 10, note: 'gold discount' } },
        { then: { discount: 0 } },
      ],
    })
    const jdm = translateToJDM(doc)
    const table = jdm.nodes[1]!
    const outputFields = table.content!.outputs.map((o) => o.field)

    expect(outputFields).toContain('discount')
    expect(outputFields).toContain('note')
  })

  it('maps operator conditions to JDM unary expressions', () => {
    const doc = makeDoc({
      rules: [
        {
          when: { amount: { gte: 100 }, tier: 'enterprise' },
          then: { approved: true },
        },
      ],
    })
    const jdm = translateToJDM(doc)
    const table = jdm.nodes[1]!
    const rule = table.content!.rules[0]!

    // Find the column IDs for the input fields
    const amountCol = table.content!.inputs.find((i) => i.field === 'amount')!.id
    const tierCol = table.content!.inputs.find((i) => i.field === 'tier')!.id

    expect(rule[amountCol]).toBe('>= 100')
    expect(rule[tierCol]).toBe('"enterprise"')
  })
})
