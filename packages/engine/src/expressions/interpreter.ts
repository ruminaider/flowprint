/**
 * Browser-safe AST interpreter for flowprint expressions.
 *
 * Walks the acorn AST and evaluates expressions without `node:vm`.
 * Only supports the allowlisted AST types and operators.
 */
import * as acorn from 'acorn'
import {
  ALLOWED_BINARY_OPS,
  ALLOWED_LOGICAL_OPS,
  ALLOWED_UNARY_OPS,
  ALLOWED_METHODS,
  ALLOWED_MATH_MEMBERS,
} from './allowlist.js'

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

export class InterpreterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InterpreterError'
  }
}

/**
 * Build a frozen Math object with only allowlisted methods/constants.
 */
function buildSafeMath(): Readonly<Record<string, unknown>> {
  const safeMath: Record<string, unknown> = {}
  for (const key of ALLOWED_MATH_MEMBERS) {
    safeMath[key] = Math[key as keyof typeof Math]
  }
  return Object.freeze(safeMath)
}

const SAFE_MATH = buildSafeMath()

export interface InterpreterContext {
  /** Workflow input */
  input: unknown
  /** Previous node results keyed by node ID */
  results: Map<string, unknown>
}

/**
 * Interpret a flowprint expression by parsing and walking the AST.
 *
 * Browser-safe: no `node:vm` dependency. Uses only the allowlisted
 * operators and methods from the expression allowlist.
 *
 * @param source - The expression source string
 * @param context - Execution context with input and node results
 * @returns The evaluated result
 */
export function interpretExpression(source: string, context: InterpreterContext): unknown {
  const ast = acorn.parseExpressionAt(source, 0, { ecmaVersion: 2022 })
  return evaluate(ast as any, context)
}

function evaluate(node: any, ctx: InterpreterContext): unknown {
  switch (node.type as string) {
    case 'Literal':
      return node.value

    case 'TemplateLiteral':
      return evaluateTemplateLiteral(node, ctx)

    case 'Identifier':
      return resolveIdentifier(node.name as string, ctx)

    case 'MemberExpression':
      return evaluateMemberExpression(node, ctx)

    case 'BinaryExpression':
      return evaluateBinaryExpression(node, ctx)

    case 'LogicalExpression':
      return evaluateLogicalExpression(node, ctx)

    case 'UnaryExpression':
      return evaluateUnaryExpression(node, ctx)

    case 'ConditionalExpression':
      return evaluate(node.test, ctx) ? evaluate(node.consequent, ctx) : evaluate(node.alternate, ctx)

    case 'CallExpression':
      return evaluateCallExpression(node, ctx)

    default:
      throw new InterpreterError(`Unsupported AST node type: ${node.type as string}`)
  }
}

function resolveIdentifier(name: string, ctx: InterpreterContext): unknown {
  if (name === 'input') return ctx.input
  if (name === 'Math') return SAFE_MATH
  if (ctx.results.has(name)) return ctx.results.get(name)
  throw new InterpreterError(`Unknown identifier: ${name}`)
}

function evaluateMemberExpression(node: any, ctx: InterpreterContext): unknown {
  const object = evaluate(node.object, ctx)

  let property: string
  if (node.computed) {
    property = String(evaluate(node.property, ctx))
  } else {
    property = node.property.name as string
  }

  if (object === null || object === undefined) {
    throw new InterpreterError(`Cannot read property '${property}' of ${String(object)}`)
  }

  return (object as any)[property]
}

function evaluateBinaryExpression(node: any, ctx: InterpreterContext): unknown {
  const op = node.operator as string
  if (!ALLOWED_BINARY_OPS.has(op)) {
    throw new InterpreterError(`Disallowed binary operator: ${op}`)
  }

  const left = evaluate(node.left, ctx) as any
  const right = evaluate(node.right, ctx) as any

  switch (op) {
    case '===':
      return left === right
    case '!==':
      return left !== right
    case '>':
      return left > right
    case '<':
      return left < right
    case '>=':
      return left >= right
    case '<=':
      return left <= right
    case '+':
      return left + right
    case '-':
      return left - right
    case '*':
      return left * right
    case '/':
      return left / right
    case '%':
      return left % right
    default:
      throw new InterpreterError(`Unhandled binary operator: ${op}`)
  }
}

function evaluateLogicalExpression(node: any, ctx: InterpreterContext): unknown {
  const op = node.operator as string
  if (!ALLOWED_LOGICAL_OPS.has(op)) {
    throw new InterpreterError(`Disallowed logical operator: ${op}`)
  }

  if (op === '&&') {
    return evaluate(node.left, ctx) && evaluate(node.right, ctx)
  }
  // op === '||'
  return evaluate(node.left, ctx) || evaluate(node.right, ctx)
}

function evaluateUnaryExpression(node: any, ctx: InterpreterContext): unknown {
  const op = node.operator as string
  if (!ALLOWED_UNARY_OPS.has(op)) {
    throw new InterpreterError(`Disallowed unary operator: ${op}`)
  }

  const arg = evaluate(node.argument, ctx)

  if (op === '!') return !arg
  if (op === 'typeof') return typeof arg
  throw new InterpreterError(`Unhandled unary operator: ${op}`)
}

function evaluateTemplateLiteral(node: any, ctx: InterpreterContext): string {
  const quasis: string[] = (node.quasis as any[]).map((q: any) => q.value.cooked as string)
  const expressions: unknown[] = (node.expressions as any[]).map((e: any) => evaluate(e, ctx))

  let result = quasis[0]!
  for (let i = 0; i < expressions.length; i++) {
    result += String(expressions[i])
    result += quasis[i + 1]!
  }
  return result
}

function evaluateCallExpression(node: any, ctx: InterpreterContext): unknown {
  const callee = node.callee
  if (callee?.type !== 'MemberExpression') {
    throw new InterpreterError('Only method calls on objects are supported')
  }

  const object = evaluate(callee.object, ctx)
  const method = callee.computed
    ? String(evaluate(callee.property, ctx))
    : (callee.property.name as string)

  // Math.fn() calls
  if (object === SAFE_MATH) {
    if (!ALLOWED_MATH_MEMBERS.has(method)) {
      throw new InterpreterError(`Disallowed Math member: Math.${method}`)
    }
    const fn = (SAFE_MATH as any)[method]
    if (typeof fn !== 'function') {
      throw new InterpreterError(`Math.${method} is not a function`)
    }
    const args = (node.arguments as any[]).map((a: any) => evaluate(a, ctx))
    return fn(...args)
  }

  // obj.method() calls
  if (!ALLOWED_METHODS.has(method)) {
    throw new InterpreterError(`Disallowed method call: ${method}`)
  }

  const fn = (object as any)[method]
  if (typeof fn !== 'function') {
    throw new InterpreterError(`${method} is not a function`)
  }

  const args = (node.arguments as any[]).map((a: any) => evaluate(a, ctx))
  return fn.call(object, ...args)
}
