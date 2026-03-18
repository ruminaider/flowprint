import { describe, it, expect, afterAll } from 'vitest'
import { evaluateRulesViaZen, disposeZenEngine } from '../rules-evaluator.js'
import type { RulesDocument } from '@ruminaider/flowprint-engine'

afterAll(() => {
  disposeZenEngine()
})

function makeDoc(overrides: Partial<RulesDocument> = {}): RulesDocument {
  return {
    schema: 'flowprint-rules/1.0',
    name: 'test-rules',
    hit_policy: 'first',
    rules: [],
    ...overrides,
  }
}

describe('evaluateRulesViaZen', () => {
  describe('first hit policy', () => {
    it('returns first matching rule output', async () => {
      const doc = makeDoc({
        hit_policy: 'first',
        inputs: ['tier'],
        rules: [
          { when: { tier: { eq: 'enterprise' } }, then: { discount: 20 } },
          { when: { tier: { eq: 'pro' } }, then: { discount: 10 } },
          { then: { discount: 0 } },
        ],
      })

      const result = await evaluateRulesViaZen(doc, { tier: 'enterprise' })
      expect(result.hit_policy).toBe('first')
      expect(result.output).toEqual({ discount: 20 })
      expect(result.matched_count).toBe(1)
    })

    it('returns empty object when no match', async () => {
      const doc = makeDoc({
        hit_policy: 'first',
        inputs: ['tier'],
        rules: [
          { when: { tier: { eq: 'enterprise' } }, then: { discount: 20 } },
        ],
      })

      const result = await evaluateRulesViaZen(doc, { tier: 'basic' })
      expect(result.matched_count).toBe(0)
      expect(result.output).toEqual({})
    })

    it('evaluates numeric comparison operators', async () => {
      const doc = makeDoc({
        hit_policy: 'first',
        inputs: ['amount'],
        rules: [
          { when: { amount: { gte: 1000 } }, then: { tier: 'high' } },
          { when: { amount: { gte: 100 } }, then: { tier: 'mid' } },
          { then: { tier: 'low' } },
        ],
      })

      const result = await evaluateRulesViaZen(doc, { amount: 500 })
      expect(result.output).toEqual({ tier: 'mid' })
    })
  })

  describe('collect hit policy', () => {
    it('returns all matching rules as array', async () => {
      const doc = makeDoc({
        hit_policy: 'collect',
        inputs: ['x'],
        rules: [
          { when: { x: { gt: 0 } }, then: { rule: 1 } },
          { when: { x: { gt: 5 } }, then: { rule: 2 } },
          { when: { x: { gt: 100 } }, then: { rule: 3 } },
        ],
      })

      const result = await evaluateRulesViaZen(doc, { x: 10 })
      expect(result.hit_policy).toBe('collect')
      expect(result.output).toEqual([{ rule: 1 }, { rule: 2 }])
      expect(result.matched_count).toBe(2)
    })

    it('returns empty array when no match', async () => {
      const doc = makeDoc({
        hit_policy: 'collect',
        inputs: ['x'],
        rules: [
          { when: { x: { gt: 100 } }, then: { rule: 1 } },
        ],
      })

      const result = await evaluateRulesViaZen(doc, { x: 5 })
      expect(result.output).toEqual([])
      expect(result.matched_count).toBe(0)
    })
  })

  describe('wildcard rules', () => {
    it('matches wildcard rule (no when clause)', async () => {
      const doc = makeDoc({
        hit_policy: 'first',
        rules: [{ then: { default: true } }],
      })

      const result = await evaluateRulesViaZen(doc, {})
      expect(result.output).toEqual({ default: true })
      expect(result.matched_count).toBe(1)
    })
  })
})
