import { describe, it, expect } from 'vitest'
import { evaluateRules, resolveDotPath } from '../rules/core.js'
import type { ExpressionEvaluator } from '../rules/core.js'
import type { RulesDocument } from '../rules/types.js'
import type { ExecutionContext } from '../runner/types.js'

function makeContext(input: unknown = {}, results?: Map<string, unknown>): ExecutionContext {
  return { input, results: results ?? new Map<string, unknown>() }
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

describe('rules/core', () => {
  describe('resolveDotPath', () => {
    it('resolves a top-level key', () => {
      expect(resolveDotPath('name', { name: 'Alice' })).toBe('Alice')
    })

    it('resolves nested paths', () => {
      const ctx = { order: { items: { length: 3 } } }
      expect(resolveDotPath('order.items.length', ctx)).toBe(3)
    })

    it('returns undefined for missing paths', () => {
      expect(resolveDotPath('order.missing', { order: {} })).toBeUndefined()
    })

    it('returns undefined when traversing through null', () => {
      expect(resolveDotPath('a.b', { a: null })).toBeUndefined()
    })

    it('returns undefined when traversing through primitive', () => {
      expect(resolveDotPath('a.b', { a: 42 })).toBeUndefined()
    })

    it('blocks __proto__ access', () => {
      expect(resolveDotPath('__proto__', {})).toBeUndefined()
    })

    it('blocks constructor access', () => {
      expect(resolveDotPath('constructor', {})).toBeUndefined()
    })

    it('blocks prototype in nested path', () => {
      expect(resolveDotPath('a.prototype.b', { a: {} })).toBeUndefined()
    })
  })

  describe('evaluateRules', () => {
    it('evaluates simple dot-path inputs without expression evaluator', () => {
      const doc = makeDoc({
        inputs: ['order.total'],
        rules: [
          { when: { 'order.total': { gt: 100 } }, then: { discount: true } },
          { when: { 'order.total': { lte: 100 } }, then: { discount: false } },
        ],
      })
      const ctx = makeContext({ order: { total: 150 } })
      const result = evaluateRules(doc, ctx)
      expect(result.output).toEqual({ discount: true })
      expect(result.matched_count).toBe(1)
      expect(result.hit_policy).toBe('first')
    })

    it('evaluates with labeled expression input and custom evaluator', () => {
      const doc = makeDoc({
        inputs: [{ label: 'total_with_tax', expr: 'input.total * 1.1' }],
        rules: [
          { when: { total_with_tax: { gt: 100 } }, then: { high: true } },
        ],
      })
      const exprEval: ExpressionEvaluator = (expr, ctx) => {
        if (expr === 'input.total * 1.1') {
          const input = ctx.input as Record<string, number | undefined>
          return (input.total ?? 0) * 1.1
        }
        return undefined
      }
      const ctx = makeContext({ total: 100 })
      const result = evaluateRules(doc, ctx, exprEval)
      expect(result.output).toEqual({ high: true })
    })

    it('throws when labeled expression used without evaluator', () => {
      const doc = makeDoc({
        inputs: [{ label: 'computed', expr: 'input.x + 1' }],
        rules: [{ when: { computed: { gt: 0 } }, then: { ok: true } }],
      })
      const ctx = makeContext({ x: 5 })
      expect(() => evaluateRules(doc, ctx)).toThrow(
        'Labeled input "computed" requires an expression evaluator',
      )
    })

    it('uses results from prior nodes in context', () => {
      const results = new Map<string, unknown>([
        ['step1', { value: 42 }],
      ])
      const doc = makeDoc({
        inputs: ['step1.value'],
        rules: [
          { when: { 'step1.value': { eq: 42 } }, then: { found: true } },
        ],
      })
      const ctx = makeContext({}, results)
      expect(evaluateRules(doc, ctx).output).toEqual({ found: true })
    })

    it('returns empty output when no rules match with first policy', () => {
      const doc = makeDoc({
        rules: [
          { when: { status: { eq: 'active' } }, then: { ok: true } },
        ],
      })
      const ctx = makeContext({ status: 'inactive' })
      const result = evaluateRules(doc, ctx)
      expect(result.output).toEqual({})
      expect(result.matched_count).toBe(0)
    })

    it('collects all matches with collect policy', () => {
      const doc = makeDoc({
        hit_policy: 'collect',
        rules: [
          { when: { x: { gt: 0 } }, then: { positive: true } },
          { when: { x: { gt: 5 } }, then: { large: true } },
        ],
      })
      const ctx = makeContext({ x: 10 })
      const result = evaluateRules(doc, ctx)
      expect(result.matched_count).toBe(2)
      // collect returns an array of matched `then` outputs
      expect(result.output).toEqual([{ positive: true }, { large: true }])
    })
  })
})
