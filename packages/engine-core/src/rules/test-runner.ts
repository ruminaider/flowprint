import type { RulesDocument, RulesEvaluationResult } from './types.js'
import { evaluateRules } from './evaluator.js'
import type { ExecutionContext } from '../runner/types.js'

export interface RulesTestCase {
  name: string
  input: Record<string, unknown>
  expected_output?: Record<string, unknown>
  expected_matched_count?: number
}

export interface RulesTestResult {
  name: string
  passed: boolean
  actual_output: Record<string, unknown> | Record<string, unknown>[]
  actual_matched_count: number
  errors: string[]
}

/**
 * Run a set of test cases against a rules document.
 *
 * Each test case provides input and optional expectations.
 * Returns per-test results with pass/fail and detailed errors.
 */
export function runRulesTests(
  rulesDoc: RulesDocument,
  testCases: RulesTestCase[],
): RulesTestResult[] {
  return testCases.map((tc) => runSingleTest(rulesDoc, tc))
}

function runSingleTest(rulesDoc: RulesDocument, tc: RulesTestCase): RulesTestResult {
  const errors: string[] = []

  const context: ExecutionContext = {
    input: tc.input,
    results: new Map(),
  }

  let result: RulesEvaluationResult
  try {
    result = evaluateRules(rulesDoc, context)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      name: tc.name,
      passed: false,
      actual_output: {},
      actual_matched_count: 0,
      errors: [`Evaluation error: ${message}`],
    }
  }

  if (tc.expected_matched_count !== undefined && result.matched_count !== tc.expected_matched_count) {
    errors.push(
      `Expected matched_count ${String(tc.expected_matched_count)}, got ${String(result.matched_count)}`,
    )
  }

  if (tc.expected_output !== undefined) {
    const actualJson = JSON.stringify(result.output)
    const expectedJson = JSON.stringify(tc.expected_output)
    if (actualJson !== expectedJson) {
      errors.push(`Expected output ${expectedJson}, got ${actualJson}`)
    }
  }

  return {
    name: tc.name,
    passed: errors.length === 0,
    actual_output: result.output,
    actual_matched_count: result.matched_count,
    errors,
  }
}
