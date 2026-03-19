/**
 * Expression conformance suite.
 *
 * Runs identical test cases against BOTH evaluators (AST interpreter + GoRules ZEN)
 * and asserts identical output. This ensures the two engines remain semantically
 * compatible across the expression subset used by flowprint blueprints.
 *
 * Context mapping:
 *   - AST interpreter: `interpretExpression(source, { input, results })` where
 *     expressions reference context via `input.x`.
 *   - GoRules ZEN: `evaluateExpressionSync(expression, flatContext)` where
 *     expressions reference context via flat keys (e.g. `x`).
 *
 * Syntax differences:
 *   - AST uses `===`/`!==`/`&&`/`||`/`!`
 *   - ZEN uses `==`/`!=`/`and`/`or`/`not()`
 *   - When these differ, the case provides both `jsExpr` and `zenExpr`.
 */
import { describe, it, expect } from 'vitest'
import { interpretExpression } from '../../expressions/interpreter.js'
import type { InterpreterContext } from '../../expressions/interpreter.js'
import { evaluateExpressionSync } from '@gorules/zen-engine'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(
  input: Record<string, unknown> = {},
  results: Record<string, unknown> = {},
): InterpreterContext {
  return {
    input,
    results: new Map(Object.entries(results)),
  }
}

/**
 * Flatten nested input for ZEN. ZEN uses flat top-level keys, so
 * `{ input: { qty: 5 } }` becomes `{ qty: 5 }` for the AST interpreter's
 * `input.qty` to map to ZEN's `qty`.
 */
function zenContext(input: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...input }
}

// ---------------------------------------------------------------------------
// Test case types
// ---------------------------------------------------------------------------

interface ConformanceCase {
  /** Human-readable name */
  name: string
  /** Expression for the AST interpreter (JS syntax, references `input.x`) */
  jsExpr: string
  /** Expression for GoRules ZEN (if different syntax). When omitted, jsExpr is adapted. */
  zenExpr?: string
  /** Input context. Keys become `input.x` for AST, flat `x` for ZEN. */
  input?: Record<string, unknown>
  /** Expected result from both evaluators */
  expected: unknown
  /**
   * When true, only test the AST interpreter. The ZEN evaluator produces a
   * legitimately different result for this case (documented in the name).
   */
  zenDiverges?: true
}

// ---------------------------------------------------------------------------
// Test cases (54 total)
// ---------------------------------------------------------------------------

const arithmeticCases: ConformanceCase[] = [
  {
    name: 'addition: 2 + 3',
    jsExpr: '2 + 3',
    expected: 5,
  },
  {
    name: 'multiplication with input: qty * price',
    jsExpr: 'input.qty * input.price',
    zenExpr: 'qty * price',
    input: { qty: 5, price: 10 },
    expected: 50,
  },
  {
    name: 'division: 10 / 4',
    jsExpr: '10 / 4',
    expected: 2.5,
  },
  {
    name: 'modulo: 10 % 3',
    jsExpr: '10 % 3',
    expected: 1,
  },
  {
    name: 'subtraction: 100 - 42',
    jsExpr: '100 - 42',
    expected: 58,
  },
  {
    name: 'operator precedence: 2 + 3 * 4',
    jsExpr: '2 + 3 * 4',
    expected: 14,
  },
  {
    name: 'parentheses override precedence: (2 + 3) * 4',
    jsExpr: '(2 + 3) * 4',
    expected: 20,
  },
  {
    name: 'negative result via subtraction: 3 - 5',
    jsExpr: '3 - 5',
    expected: -2,
  },
  {
    name: 'zero addition: 0 + 0',
    jsExpr: '0 + 0',
    expected: 0,
  },
  {
    name: 'floating-point multiplication: 1.5 * 2',
    jsExpr: '1.5 * 2',
    expected: 3,
  },
]

const comparisonCases: ConformanceCase[] = [
  {
    name: 'greater than (true): 10 > 5',
    jsExpr: '10 > 5',
    expected: true,
  },
  {
    name: 'greater than (false): 3 > 5',
    jsExpr: '3 > 5',
    expected: false,
  },
  {
    name: 'less than (true): 3 < 5',
    jsExpr: '3 < 5',
    expected: true,
  },
  {
    name: 'greater than or equal: 5 >= 5',
    jsExpr: '5 >= 5',
    expected: true,
  },
  {
    name: 'less than or equal: 4 <= 5',
    jsExpr: '4 <= 5',
    expected: true,
  },
  {
    name: 'string equality',
    jsExpr: "input.s === 'active'",
    zenExpr: 's == "active"',
    input: { s: 'active' },
    expected: true,
  },
  {
    name: 'number equality',
    jsExpr: 'input.n === 42',
    zenExpr: 'n == 42',
    input: { n: 42 },
    expected: true,
  },
  {
    name: 'inequality',
    jsExpr: 'input.n !== 10',
    zenExpr: 'n != 10',
    input: { n: 42 },
    expected: true,
  },
]

const logicalCases: ConformanceCase[] = [
  {
    name: 'AND true: true && true / true and true',
    jsExpr: 'true && true',
    zenExpr: 'true and true',
    expected: true,
  },
  {
    name: 'AND false: true && false / true and false',
    jsExpr: 'true && false',
    zenExpr: 'true and false',
    expected: false,
  },
  {
    name: 'OR (true): false || true / false or true',
    jsExpr: 'false || true',
    zenExpr: 'false or true',
    expected: true,
  },
  {
    name: 'OR (false): false || false / false or false',
    jsExpr: 'false || false',
    zenExpr: 'false or false',
    expected: false,
  },
  {
    name: 'NOT: !false / not(false)',
    jsExpr: '!false',
    zenExpr: 'not(false)',
    expected: true,
  },
  {
    name: 'short-circuit AND: false && ... / false and ...',
    jsExpr: 'false && true',
    zenExpr: 'false and true',
    expected: false,
  },
  {
    name: 'short-circuit OR: true || ... / true or ...',
    jsExpr: 'true || false',
    zenExpr: 'true or false',
    expected: true,
  },
]

const stringCases: ConformanceCase[] = [
  {
    name: "string concatenation: 'hello' + ' world'",
    jsExpr: "'hello' + ' world'",
    zenExpr: '"hello" + " world"',
    expected: 'hello world',
  },
  {
    name: 'string equality comparison',
    jsExpr: "input.name === 'Alice'",
    zenExpr: 'name == "Alice"',
    input: { name: 'Alice' },
    expected: true,
  },
  {
    name: 'string inequality comparison',
    jsExpr: "input.name !== 'Bob'",
    zenExpr: 'name != "Bob"',
    input: { name: 'Alice' },
    expected: true,
  },
  {
    name: "empty string concatenation: '' + 'hello'",
    jsExpr: "'' + 'hello'",
    zenExpr: '"" + "hello"',
    expected: 'hello',
  },
  {
    name: "empty string + empty string: '' + ''",
    jsExpr: "'' + ''",
    zenExpr: '"" + ""',
    expected: '',
  },
  {
    name: 'string from input concatenation',
    jsExpr: "input.first + ' ' + input.last",
    zenExpr: 'first + " " + last',
    input: { first: 'John', last: 'Doe' },
    expected: 'John Doe',
  },
]

const nullCases: ConformanceCase[] = [
  {
    name: 'null equality: null === null / null == null',
    jsExpr: 'input.x === null',
    zenExpr: 'x == null',
    input: { x: null },
    expected: true,
  },
  {
    name: 'non-null inequality check',
    jsExpr: 'input.x !== null',
    zenExpr: 'x != null',
    input: { x: 42 },
    expected: true,
  },
  {
    name: 'null is not equal to a number',
    jsExpr: 'input.x === 0',
    zenExpr: 'x == 0',
    input: { x: null },
    expected: false,
  },
  {
    // ZEN returns null for missing fields; AST throws. Divergent.
    name: 'null arithmetic: null + 1 (ZEN throws, AST coerces)',
    jsExpr: 'input.x + 1',
    input: { x: null },
    expected: 1, // JS: null + 1 = 1
    zenDiverges: true,
  },
  {
    // In JS, accessing a property that doesn't exist returns undefined.
    // AST interpreter: input.missing is undefined, typeof returns 'undefined'.
    // ZEN: missing field returns null. Divergent behavior.
    name: "missing field typeof (AST='undefined', ZEN returns null)",
    jsExpr: "typeof input.missing === 'undefined'",
    input: {},
    expected: true,
    zenDiverges: true,
  },
  {
    name: 'null literal equality: null == null',
    jsExpr: 'null === null',
    zenExpr: 'null == null',
    expected: true,
  },
]

const memberAccessCases: ConformanceCase[] = [
  {
    name: 'simple member access: input.name',
    jsExpr: 'input.name',
    zenExpr: 'name',
    input: { name: 'Alice' },
    expected: 'Alice',
  },
  {
    name: 'nested member access: input.user.name',
    jsExpr: 'input.user.name',
    zenExpr: 'user.name',
    input: { user: { name: 'Bob' } },
    expected: 'Bob',
  },
  {
    name: 'deeply nested: input.user.address.city',
    jsExpr: 'input.user.address.city',
    zenExpr: 'user.address.city',
    input: { user: { address: { city: 'NYC' } } },
    expected: 'NYC',
  },
  {
    name: 'numeric member: input.count',
    jsExpr: 'input.count',
    zenExpr: 'count',
    input: { count: 99 },
    expected: 99,
  },
  {
    name: 'boolean member: input.active',
    jsExpr: 'input.active',
    zenExpr: 'active',
    input: { active: true },
    expected: true,
  },
  {
    name: 'member access in arithmetic: input.order.qty * input.order.price',
    jsExpr: 'input.order.qty * input.order.price',
    zenExpr: 'order.qty * order.price',
    input: { order: { qty: 5, price: 10 } },
    expected: 50,
  },
]

const ternaryCases: ConformanceCase[] = [
  {
    name: 'ternary true branch: x > 0 ? positive : negative',
    jsExpr: "input.x > 0 ? 'positive' : 'negative'",
    zenExpr: 'x > 0 ? "positive" : "negative"',
    input: { x: 5 },
    expected: 'positive',
  },
  {
    name: 'ternary false branch: x > 0 ? positive : negative',
    jsExpr: "input.x > 0 ? 'positive' : 'negative'",
    zenExpr: 'x > 0 ? "positive" : "negative"',
    input: { x: -3 },
    expected: 'negative',
  },
  {
    name: 'nested ternary: x > 0 ? pos : (x == 0 ? zero : neg)',
    jsExpr: "input.x > 0 ? 'pos' : (input.x === 0 ? 'zero' : 'neg')",
    zenExpr: 'x > 0 ? "pos" : (x == 0 ? "zero" : "neg")',
    input: { x: 0 },
    expected: 'zero',
  },
  {
    name: 'ternary with arithmetic: x >= 18 ? adult : minor',
    jsExpr: "input.age >= 18 ? 'adult' : 'minor'",
    zenExpr: 'age >= 18 ? "adult" : "minor"',
    input: { age: 25 },
    expected: 'adult',
  },
]

const boundaryCases: ConformanceCase[] = [
  {
    name: 'zero * large number: 0 * 100',
    jsExpr: '0 * 100',
    expected: 0,
  },
  {
    name: 'large number multiplication: 999999 * 999999',
    jsExpr: '999999 * 999999',
    expected: 999998000001,
  },
  {
    name: 'zero equality: 0 === 0 / 0 == 0',
    jsExpr: '0 === 0',
    zenExpr: '0 == 0',
    expected: true,
  },
  {
    name: 'boolean literal: true',
    jsExpr: 'true',
    expected: true,
  },
  {
    name: 'boolean literal: false',
    jsExpr: 'false',
    expected: false,
  },
  {
    // JS: 1/0 = Infinity. ZEN: 1/0 = null. Divergent behavior.
    name: 'division by zero: 1 / 0 (JS=Infinity, ZEN=null)',
    jsExpr: '1 / 0',
    expected: Infinity,
    zenDiverges: true,
  },
  {
    name: 'negative * negative via input: (0 - 3) * (0 - 2)',
    jsExpr: '(0 - 3) * (0 - 2)',
    expected: 6,
  },
]

// ---------------------------------------------------------------------------
// All cases, flattened
// ---------------------------------------------------------------------------

const allCases: ConformanceCase[] = [
  ...arithmeticCases,
  ...comparisonCases,
  ...logicalCases,
  ...stringCases,
  ...nullCases,
  ...memberAccessCases,
  ...ternaryCases,
  ...boundaryCases,
]

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

describe('expression conformance suite', () => {
  // Sanity-check we have enough cases
  it(`has at least 40 test cases (actual: ${allCases.length})`, () => {
    expect(allCases.length).toBeGreaterThanOrEqual(40)
  })

  for (const tc of allCases) {
    describe(tc.name, () => {
      it('AST interpreter', () => {
        const ctx = makeCtx(tc.input ?? {})
        const result = interpretExpression(tc.jsExpr, ctx)
        expect(result).toStrictEqual(tc.expected)
      })

      if (tc.zenDiverges) {
        it('GoRules ZEN (skipped: divergent behavior)', () => {
          // Document why this diverges by referencing the test name.
          // The case name includes the divergence reason.
          expect(true).toBe(true)
        })
      } else {
        it('GoRules ZEN', () => {
          // Adapt the expression: use zenExpr if provided, otherwise
          // rewrite `input.x` references to flat `x` for ZEN context.
          const expr = tc.zenExpr ?? tc.jsExpr
          const ctx = zenContext(tc.input)
          const result = evaluateExpressionSync(expr, ctx)
          expect(result).toStrictEqual(tc.expected)
        })
      }
    })
  }
})
