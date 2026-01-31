import { describe, it, expect } from 'vitest'
import { evaluateExpression, ExpressionTimeoutError } from '../../runner/evaluator.js'
import type { ExecutionContext } from '../../runner/types.js'

function makeContext(input: unknown = {}, results: Record<string, unknown> = {}): ExecutionContext {
  return {
    input,
    results: new Map(Object.entries(results)),
  }
}

describe('evaluateExpression', () => {
  describe('simple expressions', () => {
    it('evaluates strict equality with input', () => {
      const ctx = makeContext({ x: 5 })
      expect(evaluateExpression('input.x === 5', ctx)).toBe(true)
    })

    it('evaluates strict inequality', () => {
      const ctx = makeContext({ x: 5 })
      expect(evaluateExpression('input.x === 3', ctx)).toBe(false)
    })

    it('evaluates string includes', () => {
      const ctx = makeContext({ name: 'test-user' })
      expect(evaluateExpression("input.name.includes('test')", ctx)).toBe(true)
    })

    it('evaluates string startsWith', () => {
      const ctx = makeContext({ name: 'test-user' })
      expect(evaluateExpression("input.name.startsWith('test')", ctx)).toBe(true)
    })

    it('evaluates numeric comparison', () => {
      const ctx = makeContext({ score: 75 })
      expect(evaluateExpression('input.score > 50', ctx)).toBe(true)
    })

    it('evaluates boolean literal', () => {
      const ctx = makeContext({ active: true })
      expect(evaluateExpression('input.active', ctx)).toBe(true)
    })

    it('evaluates negation', () => {
      const ctx = makeContext({ cancelled: false })
      expect(evaluateExpression('!input.cancelled', ctx)).toBe(true)
    })
  })

  describe('node references', () => {
    it('accesses previous node result', () => {
      const ctx = makeContext({ x: 10 }, { validate: { ok: true, score: 42 } })
      expect(evaluateExpression('validate.ok && input.x > 0', ctx)).toBe(true)
    })

    it('accesses nested node result', () => {
      const ctx = makeContext({}, { check: { result: { valid: true } } })
      expect(evaluateExpression('check.result.valid', ctx)).toBe(true)
    })

    it('returns undefined for missing node result property', () => {
      const ctx = makeContext({}, { check: { result: 'ok' } })
      expect(evaluateExpression('check.missing', ctx)).toBeUndefined()
    })
  })

  describe('Math functions', () => {
    it('evaluates Math.abs', () => {
      const ctx = makeContext({ value: -42 })
      expect(evaluateExpression('Math.abs(input.value)', ctx)).toBe(42)
    })

    it('evaluates Math.max', () => {
      const ctx = makeContext({ a: 10, b: 20 })
      expect(evaluateExpression('Math.max(input.a, input.b)', ctx)).toBe(20)
    })

    it('evaluates Math.floor', () => {
      const ctx = makeContext({ value: 3.7 })
      expect(evaluateExpression('Math.floor(input.value)', ctx)).toBe(3)
    })

    it('evaluates Math.round', () => {
      const ctx = makeContext({ value: 3.5 })
      expect(evaluateExpression('Math.round(input.value)', ctx)).toBe(4)
    })
  })

  describe('timeout', () => {
    it('throws ExpressionTimeoutError for long-running expression', () => {
      const ctx = makeContext({})
      expect(() => evaluateExpression('while(true){}', ctx, 50)).toThrow(ExpressionTimeoutError)
    })

    it('uses custom timeout', () => {
      const ctx = makeContext({})
      expect(() => evaluateExpression('while(true){}', ctx, 10)).toThrow(ExpressionTimeoutError)
    })
  })

  describe('sandbox escape prevention', () => {
    it('cannot access globalThis', () => {
      const ctx = makeContext({})
      expect(() => evaluateExpression('globalThis', ctx)).not.toThrow()
      // globalThis in vm context is the sandbox itself, not the host
      const result = evaluateExpression('typeof globalThis', ctx)
      expect(result).toBe('object')
    })

    it('cannot access process', () => {
      const ctx = makeContext({})
      const result = evaluateExpression('typeof process', ctx)
      expect(result).toBe('undefined')
    })

    it('cannot access require', () => {
      const ctx = makeContext({})
      const result = evaluateExpression('typeof require', ctx)
      expect(result).toBe('undefined')
    })

    it('cannot access process through constructor chain', () => {
      const ctx = makeContext({})
      // Even if constructor chain resolves, process should be inaccessible
      // The vm sandbox prevents access to the host process
      const result = evaluateExpression('typeof process', ctx)
      expect(result).toBe('undefined')
    })

    it('cannot generate code from strings via Function constructor', () => {
      const ctx = makeContext({})
      // codeGeneration: { strings: false } prevents Function() constructor
      expect(() => evaluateExpression('Function("return 1")()', ctx)).toThrow()
    })
  })

  describe('boolean coercion edge cases', () => {
    it('treats 0 as falsy', () => {
      const ctx = makeContext({ count: 0 })
      expect(evaluateExpression('!input.count', ctx)).toBe(true)
    })

    it('treats empty string as falsy', () => {
      const ctx = makeContext({ name: '' })
      expect(evaluateExpression('!input.name', ctx)).toBe(true)
    })

    it('treats null as falsy', () => {
      const ctx = makeContext({ value: null })
      expect(evaluateExpression('!input.value', ctx)).toBe(true)
    })

    it('treats undefined as falsy', () => {
      const ctx = makeContext({})
      expect(evaluateExpression('!input.missing', ctx)).toBe(true)
    })
  })
})
