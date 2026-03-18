import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { evaluateRules } from '../../rules/evaluator-browser.js'
import type { RulesDocument } from '../../rules/types.js'

function makeDoc(overrides: Partial<RulesDocument> = {}): RulesDocument {
  return {
    schema: 'flowprint-rules/1.0',
    name: 'test-rules',
    hit_policy: 'first',
    rules: [],
    ...overrides,
  }
}

describe('browser-safe evaluateRules', () => {
  describe('no Node.js imports', () => {
    it('does not import node:fs, node:path, node:vm, acorn, or yaml', () => {
      const forbidden = ['node:fs', 'node:path', 'node:vm', 'acorn', 'yaml']
      const files = [
        resolve(import.meta.dirname, '../../rules/evaluator-browser.ts'),
        resolve(import.meta.dirname, '../../rules/core.ts'),
      ]
      for (const filePath of files) {
        const source = readFileSync(filePath, 'utf-8')
        for (const mod of forbidden) {
          expect(source).not.toContain(`from '${mod}'`)
          expect(source).not.toContain(`from "${mod}"`)
          expect(source).not.toContain(`require('${mod}')`)
          expect(source).not.toContain(`require("${mod}")`)
        }
      }
    })
  })

  describe('operators', () => {
    it('evaluates eq operator', () => {
      const doc = makeDoc({
        inputs: ['status'],
        rules: [{ when: { status: { eq: 'active' } }, then: { matched: true } }],
      })
      expect(evaluateRules(doc, { status: 'active' }).output).toEqual({ matched: true })
    })

    it('evaluates shorthand scalar (normalized to eq)', () => {
      const doc = makeDoc({
        inputs: ['status'],
        rules: [{ when: { status: 'active' }, then: { matched: true } }],
      })
      expect(evaluateRules(doc, { status: 'active' }).output).toEqual({ matched: true })
    })

    it('evaluates gte operator', () => {
      const doc = makeDoc({
        inputs: ['amount'],
        rules: [
          { when: { amount: { gte: 100 } }, then: { high: true } },
          { then: { high: false } },
        ],
      })
      expect(evaluateRules(doc, { amount: 150 }).output).toEqual({ high: true })
      expect(evaluateRules(doc, { amount: 50 }).output).toEqual({ high: false })
    })

    it('evaluates between operator', () => {
      const doc = makeDoc({
        inputs: ['score'],
        rules: [
          { when: { score: { between: [50, 100] } }, then: { pass: true } },
          { then: { pass: false } },
        ],
      })
      expect(evaluateRules(doc, { score: 75 }).output).toEqual({ pass: true })
      expect(evaluateRules(doc, { score: 25 }).output).toEqual({ pass: false })
    })

    it('evaluates in operator', () => {
      const doc = makeDoc({
        inputs: ['tier'],
        rules: [
          { when: { tier: { in: ['gold', 'platinum'] } }, then: { premium: true } },
          { then: { premium: false } },
        ],
      })
      expect(evaluateRules(doc, { tier: 'gold' }).output).toEqual({ premium: true })
      expect(evaluateRules(doc, { tier: 'silver' }).output).toEqual({ premium: false })
    })
  })

  describe('dot-path resolution', () => {
    it('resolves nested dot-paths from input', () => {
      const doc = makeDoc({
        inputs: ['order.total'],
        rules: [
          { when: { 'order.total': { gte: 100 } }, then: { discount: 20 } },
          { then: { discount: 0 } },
        ],
      })
      expect(evaluateRules(doc, { order: { total: 150 } }).output).toEqual({ discount: 20 })
    })

    it('auto-discovers inputs when none declared', () => {
      const doc = makeDoc({
        rules: [
          { when: { 'order.total': { gte: 100 } }, then: { discount: 20 } },
          { then: { discount: 0 } },
        ],
      })
      expect(evaluateRules(doc, { order: { total: 150 } }).output).toEqual({ discount: 20 })
    })
  })

  describe('hit policies', () => {
    it('first: returns first matching rule', () => {
      const doc = makeDoc({
        hit_policy: 'first',
        inputs: ['x'],
        rules: [
          { when: { x: { gt: 10 } }, then: { tier: 'high' } },
          { when: { x: { gt: 5 } }, then: { tier: 'mid' } },
          { then: { tier: 'low' } },
        ],
      })
      const result = evaluateRules(doc, { x: 15 })
      expect(result.output).toEqual({ tier: 'high' })
      expect(result.matched_count).toBe(3)
    })

    it('collect: returns all matching rules', () => {
      const doc = makeDoc({
        hit_policy: 'collect',
        inputs: ['x'],
        rules: [
          { when: { x: { gt: 0 } }, then: { rule: 1 } },
          { when: { x: { gt: 5 } }, then: { rule: 2 } },
          { when: { x: { gt: 100 } }, then: { rule: 3 } },
        ],
      })
      const result = evaluateRules(doc, { x: 10 })
      expect(result.output).toEqual([{ rule: 1 }, { rule: 2 }])
      expect(result.matched_count).toBe(2)
    })

    it('priority: returns highest priority match', () => {
      const doc = makeDoc({
        hit_policy: 'priority',
        inputs: ['x'],
        rules: [
          { when: { x: { gt: 0 } }, then: { rule: 'C' }, priority: 3 },
          { when: { x: { gt: 0 } }, then: { rule: 'A' }, priority: 1 },
          { when: { x: { gt: 0 } }, then: { rule: 'B' }, priority: 2 },
        ],
      })
      expect(evaluateRules(doc, { x: 5 }).output).toEqual({ rule: 'A' })
    })

    it('all: throws when no rule matches', () => {
      const doc = makeDoc({
        hit_policy: 'all',
        inputs: ['x'],
        rules: [{ when: { x: 'never' }, then: { matched: true } }],
      })
      expect(() => evaluateRules(doc, { x: 'other' })).toThrow(
        'at least one matching rule',
      )
    })
  })

  describe('wildcard rules', () => {
    it('matches wildcard rule (no when clause)', () => {
      const doc = makeDoc({
        rules: [{ then: { default: true } }],
      })
      expect(evaluateRules(doc, {}).output).toEqual({ default: true })
    })

    it('returns empty object when no match and no wildcard', () => {
      const doc = makeDoc({
        inputs: ['x'],
        rules: [{ when: { x: 'never' }, then: { matched: true } }],
      })
      const result = evaluateRules(doc, { x: 'something' })
      expect(result.matched_count).toBe(0)
      expect(result.output).toEqual({})
    })
  })

  describe('labeled expressions', () => {
    it('skips labeled expressions (browser limitation)', () => {
      const doc = makeDoc({
        inputs: [
          'status',
          { label: 'Is VIP', expr: 'input.loyalty > 1000' },
        ],
        rules: [
          { when: { status: 'active', 'Is VIP': true }, then: { premium: true } },
          { when: { status: 'active' }, then: { premium: false } },
        ],
      })
      // "Is VIP" is not resolved, so the first rule fails (undefined !== true)
      // Second rule matches because only `status` is checked
      const result = evaluateRules(doc, { status: 'active', loyalty: 5000 })
      expect(result.output).toEqual({ premium: false })
    })
  })
})
