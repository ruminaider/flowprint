import { describe, it, expect } from 'vitest'
import { runRulesTests } from '../../rules/test-runner.js'
import type { RulesTestCase } from '../../rules/test-runner.js'
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

describe('runRulesTests', () => {
  const doc = makeDoc({
    inputs: ['tier'],
    rules: [
      { when: { tier: 'gold' }, then: { discount: 20 } },
      { when: { tier: 'silver' }, then: { discount: 10 } },
      { then: { discount: 0 } },
    ],
  })

  it('returns passing result when output matches', () => {
    const cases: RulesTestCase[] = [
      { name: 'gold tier', input: { tier: 'gold' }, expected_output: { discount: 20 } },
    ]
    const [result] = runRulesTests(doc, cases)
    expect(result.passed).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.actual_output).toEqual({ discount: 20 })
    expect(result.actual_matched_count).toBe(2) // gold + wildcard
  })

  it('returns failing result on output mismatch', () => {
    const cases: RulesTestCase[] = [
      { name: 'wrong output', input: { tier: 'gold' }, expected_output: { discount: 99 } },
    ]
    const [result] = runRulesTests(doc, cases)
    expect(result.passed).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('Expected output')
    expect(result.errors[0]).toContain('"discount":99')
    expect(result.errors[0]).toContain('"discount":20')
  })

  it('returns failing result on matched_count mismatch', () => {
    const cases: RulesTestCase[] = [
      { name: 'wrong count', input: { tier: 'gold' }, expected_matched_count: 1 },
    ]
    const [result] = runRulesTests(doc, cases)
    expect(result.passed).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('Expected matched_count 1, got 2')
  })

  it('passes when matched_count matches', () => {
    const cases: RulesTestCase[] = [
      { name: 'correct count', input: { tier: 'gold' }, expected_matched_count: 2 },
    ]
    const [result] = runRulesTests(doc, cases)
    expect(result.passed).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('passes when no expectations are specified', () => {
    const cases: RulesTestCase[] = [
      { name: 'no expectations', input: { tier: 'silver' } },
    ]
    const [result] = runRulesTests(doc, cases)
    expect(result.passed).toBe(true)
    expect(result.actual_output).toEqual({ discount: 10 })
    expect(result.actual_matched_count).toBe(2)
  })

  it('reports multiple errors when both output and count mismatch', () => {
    const cases: RulesTestCase[] = [
      {
        name: 'double mismatch',
        input: { tier: 'gold' },
        expected_output: { discount: 99 },
        expected_matched_count: 5,
      },
    ]
    const [result] = runRulesTests(doc, cases)
    expect(result.passed).toBe(false)
    expect(result.errors).toHaveLength(2)
  })

  it('runs multiple test cases and returns results for each', () => {
    const cases: RulesTestCase[] = [
      { name: 'gold', input: { tier: 'gold' }, expected_output: { discount: 20 } },
      { name: 'silver', input: { tier: 'silver' }, expected_output: { discount: 10 } },
      { name: 'other', input: { tier: 'bronze' }, expected_output: { discount: 0 } },
    ]
    const results = runRulesTests(doc, cases)
    expect(results).toHaveLength(3)
    expect(results.every((r) => r.passed)).toBe(true)
    expect(results.map((r) => r.name)).toEqual(['gold', 'silver', 'other'])
  })

  it('handles evaluation errors gracefully', () => {
    const badDoc = makeDoc({
      hit_policy: 'all' as RulesDocument['hit_policy'],
      inputs: ['x'],
      rules: [{ when: { x: 'never' }, then: { out: true } }],
    })
    const cases: RulesTestCase[] = [
      { name: 'will throw', input: { x: 'something' } },
    ]
    const [result] = runRulesTests(badDoc, cases)
    expect(result.passed).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('Evaluation error')
    expect(result.errors[0]).toContain('at least one matching rule')
    expect(result.actual_output).toEqual({})
    expect(result.actual_matched_count).toBe(0)
  })
})
