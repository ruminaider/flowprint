import { describe, it, expect } from 'vitest'
import { evaluateExpression } from '../../runner/evaluator.js'
import type { ExecutionContext } from '../../runner/types.js'

function makeContext(input: unknown = {}, results: Record<string, unknown> = {}): ExecutionContext {
  return {
    input,
    results: new Map(Object.entries(results)),
  }
}

describe('evaluator security', () => {
  it('codeGeneration strings:false blocks Function constructor from strings', () => {
    const ctx = makeContext({})
    // codeGeneration: { strings: false } prevents Function("return 1")() style attacks
    expect(() => evaluateExpression('Function("return 1")()', ctx)).toThrow()
  })

  it('process and require are not directly accessible in sandbox', () => {
    const ctx = makeContext({})
    // The sandbox only exposes input, Math, and node results
    expect(evaluateExpression('typeof process', ctx)).toBe('undefined')
    expect(evaluateExpression('typeof require', ctx)).toBe('undefined')
  })

  it('accessing nonexistent context variable throws ReferenceError', () => {
    const ctx = makeContext({})
    // In the vm sandbox, only input, Math, and previous node results are defined
    // Accessing an undefined variable throws ReferenceError
    expect(() => evaluateExpression('nonexistent.value', ctx)).toThrow()
  })
})
