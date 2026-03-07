/**
 * Browser-safe AST expression interpreter.
 *
 * Evaluates acorn-parsed expression ASTs without node:vm.
 * Enforces the same allowlists as parser.ts for security.
 */

import * as acorn from 'acorn'
import {
  ALLOWED_BINARY_OPS,
  ALLOWED_LOGICAL_OPS,
  ALLOWED_UNARY_OPS,
  ALLOWED_METHODS,
  ALLOWED_MATH_MEMBERS,
  BLOCKED_PROPERTY_NAMES,
} from './allowlist.js'

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */

const FORBIDDEN_IDENTIFIERS = new Set([
  'Date',
  'this',
  'globalThis',
  'window',
  'self',
  'process',
])

const MAX_AST_DEPTH = 50

/** Module-level expression parse cache (Review #18). */
const parseCache = new Map<string, acorn.Node>()

/**
 * Build a frozen Math object with only allowlisted methods/constants.
 * Shared with runner/evaluator.ts (Review #4).
 */
export function buildSafeMath(): Readonly<Record<string, unknown>> {
  const safeMath: Record<string, unknown> = {}
  for (const key of ALLOWED_MATH_MEMBERS) {
    safeMath[key] = Math[key as keyof typeof Math]
  }
  return Object.freeze(safeMath)
}

/**
 * Interpret a flowprint expression using tree-walk AST evaluation.
 *
 * Scope should contain `input`, `Math` (safe subset), and node results by ID —
 * the same shape as the vm sandbox in runner/evaluator.ts.
 *
 * @param source - Expression source string
 * @param scope - Scope object for identifier resolution
 * @returns Evaluated result
 */
export function interpretExpression(
  source: string,
  scope: Record<string, unknown>,
): unknown {
  // Use null-prototype scope to prevent prototype chain traversal (Review #2)
  const safeScope = Object.create(null) as Record<string, unknown>
  for (const [key, value] of Object.entries(scope)) {
    safeScope[key] = value
  }

  let ast = parseCache.get(source)
  if (!ast) {
    try {
      ast = acorn.parseExpressionAt(source, 0, { ecmaVersion: 2022 })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Parse error'
      throw new Error(`Expression parse error: ${msg}`)
    }
    parseCache.set(source, ast)
  }

  return evaluate(ast as any, safeScope, 0)
}

function evaluate(node: any, scope: Record<string, unknown>, depth: number): unknown {
  if (depth > MAX_AST_DEPTH) {
    throw new Error(`Expression exceeds maximum AST depth (${String(MAX_AST_DEPTH)})`)
  }

  const type = node.type as string

  switch (type) {
    case 'Literal':
      return node.value as unknown

    case 'Identifier': {
      const name = node.name as string
      if (FORBIDDEN_IDENTIFIERS.has(name)) {
        throw new Error(`Forbidden identifier: ${name}`)
      }
      if (!(name in scope)) {
        throw new Error(`Undefined identifier: ${name}`)
      }
      return scope[name]
    }

    case 'MemberExpression': {
      const obj = evaluate(node.object, scope, depth + 1)
      if (node.computed) {
        throw new Error('Computed member access is not allowed')
      }
      const prop = node.property.name as string
      if (BLOCKED_PROPERTY_NAMES.has(prop)) {
        throw new Error(`Access to "${prop}" is blocked`)
      }
      if (typeof obj !== 'object' || obj === null) {
        return undefined
      }
      return (obj as Record<string, unknown>)[prop]
    }

    case 'BinaryExpression': {
      const op = node.operator as string
      if (!ALLOWED_BINARY_OPS.has(op)) {
        throw new Error(`Disallowed binary operator: ${op}`)
      }
      const left = evaluate(node.left, scope, depth + 1)
      const right = evaluate(node.right, scope, depth + 1)
      return evalBinaryOp(op, left, right)
    }

    case 'LogicalExpression': {
      const op = node.operator as string
      if (!ALLOWED_LOGICAL_OPS.has(op)) {
        throw new Error(`Disallowed logical operator: ${op}`)
      }
      if (op === '&&') {
        return evaluate(node.left, scope, depth + 1) && evaluate(node.right, scope, depth + 1)
      }
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- intentional logical OR for expression semantics
      return evaluate(node.left, scope, depth + 1) || evaluate(node.right, scope, depth + 1)
    }

    case 'UnaryExpression': {
      const op = node.operator as string
      if (!ALLOWED_UNARY_OPS.has(op)) {
        throw new Error(`Disallowed unary operator: ${op}`)
      }
      const arg = evaluate(node.argument, scope, depth + 1)
      if (op === '!') return !arg
      if (op === 'typeof') return typeof arg
      throw new Error(`Unsupported unary operator: ${op}`)
    }

    case 'ConditionalExpression': {
      const test = evaluate(node.test, scope, depth + 1)
      return test
        ? evaluate(node.consequent, scope, depth + 1)
        : evaluate(node.alternate, scope, depth + 1)
    }

    case 'CallExpression': {
      return evaluateCall(node, scope, depth)
    }

    case 'TemplateLiteral': {
      let result = ''
      const quasis = node.quasis as any[]
      const expressions = node.expressions as any[]
      for (let i = 0; i < quasis.length; i++) {
        result += quasis[i].value.cooked as string
        if (i < expressions.length) {
          result += String(evaluate(expressions[i], scope, depth + 1))
        }
      }
      return result
    }

    default:
      throw new Error(`Disallowed expression type: ${type}`)
  }
}

function evaluateCall(node: any, scope: Record<string, unknown>, depth: number): unknown {
  const callee = node.callee
  if (callee?.type !== 'MemberExpression') {
    throw new Error('Only method calls on objects are allowed')
  }

  if (callee.computed) {
    throw new Error('Computed member access is not allowed')
  }

  // Resolve the full member path
  const path = resolveMemberPath(callee)
  if (!path) {
    throw new Error('Disallowed call expression')
  }

  const parts = path.split('.')
  const args = (node.arguments as any[]).map((arg: any) => evaluate(arg, scope, depth + 1))

  // Math.fn() calls
  if (parts[0] === 'Math' && parts.length === 2) {
    // parts.length === 2 is checked above, so parts[1] is always defined
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const mathFn = parts[1]!
    if (!ALLOWED_MATH_MEMBERS.has(mathFn)) {
      throw new Error(`Disallowed Math member: Math.${mathFn}`)
    }
    const mathObj = scope.Math as Record<string, unknown> | undefined
    if (!mathObj) {
      throw new Error('Math is not available in scope')
    }
    const fn = mathObj[mathFn]
    if (typeof fn === 'function') {
      return (fn as (...a: unknown[]) => unknown)(...args)
    }
    // Math.PI, Math.E — property access, not a call
    throw new Error(`Math.${mathFn} is not a function`)
  }

  // obj.method() calls
  // split('.') always returns at least one element
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const method = parts[parts.length - 1]!
  if (!ALLOWED_METHODS.has(method)) {
    throw new Error(`Disallowed method call: ${method}`)
  }

  // Evaluate the object (everything before the method)
  const obj = evaluate(callee.object, scope, depth + 1)
  if (obj === null || obj === undefined) {
    throw new Error(`Cannot call method "${method}" on ${String(obj)}`)
  }

  const fn = (obj as Record<string, unknown>)[method]
  if (typeof fn !== 'function') {
    throw new Error(`"${method}" is not a function`)
  }

  return (fn as (...a: unknown[]) => unknown).call(obj, ...args)
}

function resolveMemberPath(node: any): string | null {
  if (node.computed) return null
  const property = node.property?.name as string | undefined
  if (!property) return null

  if (node.object?.type === 'Identifier') {
    return `${node.object.name as string}.${property}`
  }

  if (node.object?.type === 'MemberExpression') {
    const parentPath = resolveMemberPath(node.object)
    if (parentPath) return `${parentPath}.${property}`
  }

  return null
}

function evalBinaryOp(op: string, left: unknown, right: unknown): boolean {
  switch (op) {
    case '===':
      return left === right
    case '!==':
      return left !== right
    case '>':
      return (left as number) > (right as number)
    case '<':
      return (left as number) < (right as number)
    case '>=':
      return (left as number) >= (right as number)
    case '<=':
      return (left as number) <= (right as number)
    default:
      throw new Error(`Unsupported binary operator: ${op}`)
  }
}
