import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadRulesFile, evaluateRules } from '../../rules/evaluator.js'
import type { RulesDocument } from '../../rules/types.js'
import type { ExecutionContext } from '../../runner/types.js'

// Mock fs and yaml for loadRulesFile tests
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
}))

import { readFileSync } from 'node:fs'

const mockedReadFileSync = vi.mocked(readFileSync)

function makeContext(input: unknown = {}, results?: Map<string, unknown>): ExecutionContext {
  return {
    input,
    results: results ?? new Map<string, unknown>(),
  }
}

function makeDoc(overrides: Partial<RulesDocument> = {}): RulesDocument {
  return {
    schema: 'flowprint-rules/1.0',
    name: 'test-rules',
    hit_policy: 'first',
    rules: [],
    ...overrides,
  }
}

describe('evaluateRules', () => {
  describe('operators', () => {
    describe('eq', () => {
      it('matches equal strings', () => {
        const doc = makeDoc({
          inputs: ['status'],
          rules: [{ when: { status: { eq: 'active' } }, then: { matched: true } }],
        })
        const ctx = makeContext({ status: 'active' })
        const result = evaluateRules(doc, ctx)
        expect(result.output).toEqual({ matched: true })
      })

      it('matches equal numbers', () => {
        const doc = makeDoc({
          inputs: ['count'],
          rules: [{ when: { count: { eq: 42 } }, then: { matched: true } }],
        })
        const ctx = makeContext({ count: 42 })
        expect(evaluateRules(doc, ctx).output).toEqual({ matched: true })
      })

      it('matches null', () => {
        const doc = makeDoc({
          inputs: ['value'],
          rules: [{ when: { value: { eq: null } }, then: { is_null: true } }],
        })
        const ctx = makeContext({ value: null })
        expect(evaluateRules(doc, ctx).output).toEqual({ is_null: true })
      })

      it('does not coerce types', () => {
        const doc = makeDoc({
          inputs: ['count'],
          rules: [
            { when: { count: { eq: '42' } }, then: { matched: true } },
            { then: { matched: false } },
          ],
        })
        const ctx = makeContext({ count: 42 })
        expect(evaluateRules(doc, ctx).output).toEqual({ matched: false })
      })
    })

    describe('not_eq', () => {
      it('matches when values differ', () => {
        const doc = makeDoc({
          inputs: ['status'],
          rules: [{ when: { status: { not_eq: 'inactive' } }, then: { active: true } }],
        })
        const ctx = makeContext({ status: 'active' })
        expect(evaluateRules(doc, ctx).output).toEqual({ active: true })
      })

      it('fails when values are equal', () => {
        const doc = makeDoc({
          inputs: ['status'],
          rules: [
            { when: { status: { not_eq: 'active' } }, then: { active: false } },
            { then: { fallback: true } },
          ],
        })
        const ctx = makeContext({ status: 'active' })
        expect(evaluateRules(doc, ctx).output).toEqual({ fallback: true })
      })
    })

    describe('gt', () => {
      it('matches when value is greater', () => {
        const doc = makeDoc({
          inputs: ['amount'],
          rules: [{ when: { amount: { gt: 100 } }, then: { high: true } }],
        })
        const ctx = makeContext({ amount: 150 })
        expect(evaluateRules(doc, ctx).output).toEqual({ high: true })
      })

      it('fails when value is equal', () => {
        const doc = makeDoc({
          inputs: ['amount'],
          rules: [
            { when: { amount: { gt: 100 } }, then: { high: true } },
            { then: { high: false } },
          ],
        })
        const ctx = makeContext({ amount: 100 })
        expect(evaluateRules(doc, ctx).output).toEqual({ high: false })
      })

      it('fails for non-number value', () => {
        const doc = makeDoc({
          inputs: ['amount'],
          rules: [
            { when: { amount: { gt: 100 } }, then: { high: true } },
            { then: { high: false } },
          ],
        })
        const ctx = makeContext({ amount: '150' })
        expect(evaluateRules(doc, ctx).output).toEqual({ high: false })
      })
    })

    describe('gte', () => {
      it('matches when value is equal', () => {
        const doc = makeDoc({
          inputs: ['amount'],
          rules: [{ when: { amount: { gte: 100 } }, then: { ok: true } }],
        })
        const ctx = makeContext({ amount: 100 })
        expect(evaluateRules(doc, ctx).output).toEqual({ ok: true })
      })

      it('matches when value is greater', () => {
        const doc = makeDoc({
          inputs: ['amount'],
          rules: [{ when: { amount: { gte: 100 } }, then: { ok: true } }],
        })
        const ctx = makeContext({ amount: 101 })
        expect(evaluateRules(doc, ctx).output).toEqual({ ok: true })
      })
    })

    describe('lt', () => {
      it('matches when value is less', () => {
        const doc = makeDoc({
          inputs: ['amount'],
          rules: [{ when: { amount: { lt: 50 } }, then: { low: true } }],
        })
        const ctx = makeContext({ amount: 25 })
        expect(evaluateRules(doc, ctx).output).toEqual({ low: true })
      })

      it('fails when value is equal', () => {
        const doc = makeDoc({
          inputs: ['amount'],
          rules: [
            { when: { amount: { lt: 50 } }, then: { low: true } },
            { then: { low: false } },
          ],
        })
        const ctx = makeContext({ amount: 50 })
        expect(evaluateRules(doc, ctx).output).toEqual({ low: false })
      })
    })

    describe('lte', () => {
      it('matches when value is equal', () => {
        const doc = makeDoc({
          inputs: ['amount'],
          rules: [{ when: { amount: { lte: 50 } }, then: { ok: true } }],
        })
        const ctx = makeContext({ amount: 50 })
        expect(evaluateRules(doc, ctx).output).toEqual({ ok: true })
      })

      it('matches when value is less', () => {
        const doc = makeDoc({
          inputs: ['amount'],
          rules: [{ when: { amount: { lte: 50 } }, then: { ok: true } }],
        })
        const ctx = makeContext({ amount: 49 })
        expect(evaluateRules(doc, ctx).output).toEqual({ ok: true })
      })
    })

    describe('in', () => {
      it('matches when value is in array', () => {
        const doc = makeDoc({
          inputs: ['tier'],
          rules: [
            { when: { tier: { in: ['gold', 'platinum'] } }, then: { premium: true } },
          ],
        })
        const ctx = makeContext({ tier: 'gold' })
        expect(evaluateRules(doc, ctx).output).toEqual({ premium: true })
      })

      it('fails when value is not in array', () => {
        const doc = makeDoc({
          inputs: ['tier'],
          rules: [
            { when: { tier: { in: ['gold', 'platinum'] } }, then: { premium: true } },
            { then: { premium: false } },
          ],
        })
        const ctx = makeContext({ tier: 'silver' })
        expect(evaluateRules(doc, ctx).output).toEqual({ premium: false })
      })
    })

    describe('not_in', () => {
      it('matches when value is not in array', () => {
        const doc = makeDoc({
          inputs: ['tier'],
          rules: [
            { when: { tier: { not_in: ['banned', 'suspended'] } }, then: { allowed: true } },
          ],
        })
        const ctx = makeContext({ tier: 'active' })
        expect(evaluateRules(doc, ctx).output).toEqual({ allowed: true })
      })

      it('fails when value is in array', () => {
        const doc = makeDoc({
          inputs: ['tier'],
          rules: [
            { when: { tier: { not_in: ['banned', 'suspended'] } }, then: { allowed: true } },
            { then: { allowed: false } },
          ],
        })
        const ctx = makeContext({ tier: 'banned' })
        expect(evaluateRules(doc, ctx).output).toEqual({ allowed: false })
      })
    })

    describe('between', () => {
      it('matches value within range (inclusive)', () => {
        const doc = makeDoc({
          inputs: ['score'],
          rules: [{ when: { score: { between: [50, 100] } }, then: { pass: true } }],
        })
        const ctx = makeContext({ score: 75 })
        expect(evaluateRules(doc, ctx).output).toEqual({ pass: true })
      })

      it('matches value at lower bound', () => {
        const doc = makeDoc({
          inputs: ['score'],
          rules: [{ when: { score: { between: [50, 100] } }, then: { pass: true } }],
        })
        const ctx = makeContext({ score: 50 })
        expect(evaluateRules(doc, ctx).output).toEqual({ pass: true })
      })

      it('matches value at upper bound', () => {
        const doc = makeDoc({
          inputs: ['score'],
          rules: [{ when: { score: { between: [50, 100] } }, then: { pass: true } }],
        })
        const ctx = makeContext({ score: 100 })
        expect(evaluateRules(doc, ctx).output).toEqual({ pass: true })
      })

      it('fails value below range', () => {
        const doc = makeDoc({
          inputs: ['score'],
          rules: [
            { when: { score: { between: [50, 100] } }, then: { pass: true } },
            { then: { pass: false } },
          ],
        })
        const ctx = makeContext({ score: 49 })
        expect(evaluateRules(doc, ctx).output).toEqual({ pass: false })
      })

      it('fails for non-number value', () => {
        const doc = makeDoc({
          inputs: ['score'],
          rules: [
            { when: { score: { between: [50, 100] } }, then: { pass: true } },
            { then: { pass: false } },
          ],
        })
        const ctx = makeContext({ score: '75' })
        expect(evaluateRules(doc, ctx).output).toEqual({ pass: false })
      })
    })
  })

  describe('shorthand scalars', () => {
    it('normalizes string shorthand to eq', () => {
      const doc = makeDoc({
        inputs: ['status'],
        rules: [{ when: { status: 'active' }, then: { matched: true } }],
      })
      const ctx = makeContext({ status: 'active' })
      expect(evaluateRules(doc, ctx).output).toEqual({ matched: true })
    })

    it('normalizes number shorthand to eq', () => {
      const doc = makeDoc({
        inputs: ['count'],
        rules: [{ when: { count: 42 }, then: { matched: true } }],
      })
      const ctx = makeContext({ count: 42 })
      expect(evaluateRules(doc, ctx).output).toEqual({ matched: true })
    })

    it('normalizes boolean shorthand to eq', () => {
      const doc = makeDoc({
        inputs: ['active'],
        rules: [{ when: { active: true }, then: { matched: true } }],
      })
      const ctx = makeContext({ active: true })
      expect(evaluateRules(doc, ctx).output).toEqual({ matched: true })
    })

    it('normalizes null shorthand to eq', () => {
      const doc = makeDoc({
        inputs: ['value'],
        rules: [{ when: { value: null }, then: { is_null: true } }],
      })
      const ctx = makeContext({ value: null })
      expect(evaluateRules(doc, ctx).output).toEqual({ is_null: true })
    })
  })

  describe('input resolution', () => {
    it('resolves nested dot-paths', () => {
      const doc = makeDoc({
        inputs: ['order.total_amount'],
        rules: [
          { when: { 'order.total_amount': { gte: 100 } }, then: { discount: 20 } },
        ],
      })
      const ctx = makeContext({ order: { total_amount: 150 } })
      expect(evaluateRules(doc, ctx).output).toEqual({ discount: 20 })
    })

    it('resolves labeled expressions', () => {
      const doc = makeDoc({
        inputs: [{ label: 'Is VIP', expr: 'input.loyalty > 1000' }],
        rules: [{ when: { 'Is VIP': true }, then: { vip: true } }],
      })
      const ctx = makeContext({ loyalty: 1500 })
      expect(evaluateRules(doc, ctx).output).toEqual({ vip: true })
    })

    it('returns undefined for missing dot-path', () => {
      const doc = makeDoc({
        inputs: ['order.missing_field'],
        rules: [
          { when: { 'order.missing_field': { eq: null } }, then: { found: false } },
          { then: { fallback: true } },
        ],
      })
      const ctx = makeContext({ order: { total: 100 } })
      // undefined !== null, so eq null fails
      expect(evaluateRules(doc, ctx).output).toEqual({ fallback: true })
    })

    it('auto-discovers inputs when none declared', () => {
      const doc = makeDoc({
        // No inputs declared
        rules: [
          { when: { 'order.total_amount': { gte: 100 } }, then: { discount: 20 } },
          { then: { discount: 0 } },
        ],
      })
      const ctx = makeContext({ order: { total_amount: 150 } })
      expect(evaluateRules(doc, ctx).output).toEqual({ discount: 20 })
    })

    it('resolves from node results', () => {
      const results = new Map<string, unknown>()
      results.set('calc_node', { score: 85 })
      const doc = makeDoc({
        inputs: ['calc_node.score'],
        rules: [{ when: { 'calc_node.score': { gte: 80 } }, then: { pass: true } }],
      })
      const ctx = makeContext({}, results)
      expect(evaluateRules(doc, ctx).output).toEqual({ pass: true })
    })

    it('handles deeply nested dot-paths', () => {
      const doc = makeDoc({
        inputs: ['customer.address.country'],
        rules: [
          {
            when: { 'customer.address.country': 'US' },
            then: { domestic: true },
          },
        ],
      })
      const ctx = makeContext({ customer: { address: { country: 'US' } } })
      expect(evaluateRules(doc, ctx).output).toEqual({ domestic: true })
    })

    it('resolves mixed simple and labeled inputs', () => {
      const doc = makeDoc({
        inputs: [
          'order.amount',
          { label: 'Is Premium', expr: 'input.tier === "premium"' },
        ],
        rules: [
          {
            when: { 'order.amount': { gte: 100 }, 'Is Premium': true },
            then: { discount: 25 },
          },
          { then: { discount: 0 } },
        ],
      })
      const ctx = makeContext({ order: { amount: 200 }, tier: 'premium' })
      expect(evaluateRules(doc, ctx).output).toEqual({ discount: 25 })
    })

    it('returns undefined for non-object intermediate in dot-path', () => {
      const doc = makeDoc({
        inputs: ['order.details.amount'],
        rules: [
          // undefined !== 42, so this rule won't match
          { when: { 'order.details.amount': { eq: 42 } }, then: { found: true } },
          { then: { fallback: true } },
        ],
      })
      // order.details is a string, not an object — dot-path returns undefined
      const ctx = makeContext({ order: { details: 'none' } })
      expect(evaluateRules(doc, ctx).output).toEqual({ fallback: true })
    })
  })

  describe('rule matching', () => {
    it('matches wildcard rule (no when clause)', () => {
      const doc = makeDoc({
        rules: [{ then: { default: true } }],
      })
      const ctx = makeContext()
      expect(evaluateRules(doc, ctx).output).toEqual({ default: true })
    })

    it('fails when no rule matches and no wildcard', () => {
      const doc = makeDoc({
        inputs: ['x'],
        rules: [{ when: { x: 'never' }, then: { matched: true } }],
      })
      const ctx = makeContext({ x: 'something' })
      const result = evaluateRules(doc, ctx)
      expect(result.matched_count).toBe(0)
      expect(result.output).toEqual({})
    })

    it('requires all conditions in when to match (AND)', () => {
      const doc = makeDoc({
        inputs: ['a', 'b'],
        rules: [
          { when: { a: 'x', b: 'y' }, then: { both: true } },
          { then: { both: false } },
        ],
      })
      // Only a matches
      expect(evaluateRules(doc, makeContext({ a: 'x', b: 'z' })).output).toEqual({
        both: false,
      })
      // Both match
      expect(evaluateRules(doc, makeContext({ a: 'x', b: 'y' })).output).toEqual({
        both: true,
      })
    })

    it('supports multi-operator conditions (AND within field)', () => {
      const doc = makeDoc({
        inputs: ['score'],
        rules: [
          { when: { score: { gte: 50, lte: 100 } }, then: { range: 'B' } },
          { then: { range: 'other' } },
        ],
      })
      expect(evaluateRules(doc, makeContext({ score: 75 })).output).toEqual({ range: 'B' })
      expect(evaluateRules(doc, makeContext({ score: 25 })).output).toEqual({ range: 'other' })
    })

    it('evaluates rules top-to-bottom for first hit', () => {
      const doc = makeDoc({
        inputs: ['x'],
        rules: [
          { when: { x: { gte: 10 } }, then: { rule: 1 } },
          { when: { x: { gte: 5 } }, then: { rule: 2 } },
          { then: { rule: 3 } },
        ],
      })
      // x=15 matches both rule 1 and 2, but first policy returns rule 1
      const result = evaluateRules(doc, makeContext({ x: 15 }))
      expect(result.output).toEqual({ rule: 1 })
    })
  })

  describe('hit policies', () => {
    describe('first', () => {
      it('returns first matching rule', () => {
        const doc = makeDoc({
          hit_policy: 'first',
          inputs: ['x'],
          rules: [
            { when: { x: { gt: 10 } }, then: { tier: 'high' } },
            { when: { x: { gt: 5 } }, then: { tier: 'mid' } },
            { then: { tier: 'low' } },
          ],
        })
        const result = evaluateRules(doc, makeContext({ x: 15 }))
        expect(result.hit_policy).toBe('first')
        expect(result.output).toEqual({ tier: 'high' })
        expect(result.matched_count).toBe(3) // All match
      })

      it('returns empty object when no match', () => {
        const doc = makeDoc({
          hit_policy: 'first',
          inputs: ['x'],
          rules: [{ when: { x: 'never' }, then: { matched: true } }],
        })
        const result = evaluateRules(doc, makeContext({ x: 'other' }))
        expect(result.output).toEqual({})
        expect(result.matched_count).toBe(0)
      })
    })

    describe('collect', () => {
      it('returns all matching rules as array', () => {
        const doc = makeDoc({
          hit_policy: 'collect',
          inputs: ['x'],
          rules: [
            { when: { x: { gt: 0 } }, then: { rule: 1 } },
            { when: { x: { gt: 5 } }, then: { rule: 2 } },
            { when: { x: { gt: 100 } }, then: { rule: 3 } },
          ],
        })
        const result = evaluateRules(doc, makeContext({ x: 10 }))
        expect(result.hit_policy).toBe('collect')
        expect(result.output).toEqual([{ rule: 1 }, { rule: 2 }])
        expect(result.matched_count).toBe(2)
      })

      it('returns empty array when no match', () => {
        const doc = makeDoc({
          hit_policy: 'collect',
          inputs: ['x'],
          rules: [{ when: { x: 'never' }, then: { matched: true } }],
        })
        const result = evaluateRules(doc, makeContext({ x: 'other' }))
        expect(result.output).toEqual([])
        expect(result.matched_count).toBe(0)
      })
    })

    describe('all', () => {
      it('returns all matching rules when at least one matches', () => {
        const doc = makeDoc({
          hit_policy: 'all',
          inputs: ['x'],
          rules: [
            { when: { x: { gt: 0 } }, then: { a: true } },
            { when: { x: { gt: 5 } }, then: { b: true } },
          ],
        })
        const result = evaluateRules(doc, makeContext({ x: 10 }))
        expect(result.output).toEqual([{ a: true }, { b: true }])
      })

      it('throws when no rule matches', () => {
        const doc = makeDoc({
          hit_policy: 'all',
          inputs: ['x'],
          rules: [{ when: { x: 'never' }, then: { matched: true } }],
        })
        expect(() => evaluateRules(doc, makeContext({ x: 'other' }))).toThrow(
          'Hit policy "all" requires at least one matching rule',
        )
      })
    })

    describe('priority', () => {
      it('returns rule with lowest priority number', () => {
        const doc = makeDoc({
          hit_policy: 'priority',
          inputs: ['x'],
          rules: [
            { when: { x: { gt: 0 } }, then: { rule: 'C' }, priority: 3 },
            { when: { x: { gt: 0 } }, then: { rule: 'A' }, priority: 1 },
            { when: { x: { gt: 0 } }, then: { rule: 'B' }, priority: 2 },
          ],
        })
        const result = evaluateRules(doc, makeContext({ x: 5 }))
        expect(result.hit_policy).toBe('priority')
        expect(result.output).toEqual({ rule: 'A' })
      })

      it('returns empty object when no match', () => {
        const doc = makeDoc({
          hit_policy: 'priority',
          inputs: ['x'],
          rules: [
            { when: { x: 'never' }, then: { matched: true }, priority: 1 },
          ],
        })
        const result = evaluateRules(doc, makeContext({ x: 'other' }))
        expect(result.output).toEqual({})
        expect(result.matched_count).toBe(0)
      })
    })
  })
})

describe('loadRulesFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const validYaml = `schema: flowprint-rules/1.0
name: test
hit_policy: first
rules:
  - when:
      x:
        eq: 1
    then:
      out: true`

  it('loads and parses a valid rules file', () => {
    mockedReadFileSync.mockReturnValue(validYaml)
    const doc = loadRulesFile('rules.yaml', '/project')
    expect(doc.name).toBe('test')
    expect(doc.hit_policy).toBe('first')
    expect(doc.rules).toHaveLength(1)
  })

  it('throws when file not found', () => {
    mockedReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory')
    })
    expect(() => loadRulesFile('missing.yaml', '/project')).toThrow(
      'Failed to load rules file "missing.yaml"',
    )
  })

  it('throws on invalid YAML', () => {
    mockedReadFileSync.mockReturnValue('{{invalid yaml')
    expect(() => loadRulesFile('bad.yaml', '/project')).toThrow(
      'Failed to parse rules file "bad.yaml"',
    )
  })

  it('throws on validation errors', () => {
    mockedReadFileSync.mockReturnValue(`schema: flowprint-rules/1.0
name: test
rules:
  - then: {}`)
    // Missing hit_policy
    expect(() => loadRulesFile('invalid.yaml', '/project')).toThrow(
      'validation errors',
    )
  })

  it('resolves path relative to projectRoot', () => {
    mockedReadFileSync.mockReturnValue(validYaml)
    loadRulesFile('rules/order.rules.yaml', '/project/root')
    expect(mockedReadFileSync).toHaveBeenCalledWith(
      expect.stringContaining('/project/root/rules/order.rules.yaml'),
      'utf-8',
    )
  })
})
