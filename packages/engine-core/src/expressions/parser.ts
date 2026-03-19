import * as acorn from 'acorn'
import type { ParseResult, ExpressionError } from './types.js'
import {
  ALLOWED_AST_TYPES,
  ALLOWED_BINARY_OPS,
  ALLOWED_LOGICAL_OPS,
  ALLOWED_UNARY_OPS,
  ALLOWED_METHODS,
  ALLOWED_MATH_MEMBERS,
} from './allowlist.js'
import { LRUCache } from './cache.js'

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

const FORBIDDEN_IDENTIFIERS = new Set(['Date', 'this', 'globalThis', 'window', 'self', 'process'])

const PARSE_CACHE = new LRUCache<string, ParseResult>(1000)

/**
 * Clear the expression parse cache.
 * Useful for testing or when allowlist changes at runtime.
 */
export function clearParseCache(): void {
  PARSE_CACHE.clear()
}

export function parseExpression(source: string): ParseResult {
  const cached = PARSE_CACHE.get(source)
  if (cached) return cached

  if (source.trim().length === 0) {
    const result: ParseResult = { success: false, errors: [{ message: 'Expression is empty' }] }
    PARSE_CACHE.set(source, result)
    return result
  }

  let ast: acorn.Node
  try {
    ast = acorn.parseExpressionAt(source, 0, { ecmaVersion: 2022 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Parse error'
    const pos = e instanceof SyntaxError ? ((e as any).pos as number | undefined) : undefined
    const result: ParseResult = { success: false, errors: [{ message: msg, position: pos }] }
    PARSE_CACHE.set(source, result)
    return result
  }

  // Ensure the entire source was consumed (no trailing content except whitespace)
  if (ast.end < source.trimEnd().length) {
    const result: ParseResult = {
      success: false,
      errors: [{ message: 'Unexpected content after expression', position: ast.end }],
    }
    PARSE_CACHE.set(source, result)
    return result
  }

  const errors: ExpressionError[] = []
  const identifiers = new Set<string>()
  const memberPaths = new Set<string>()

  function walk(node: any, parentIsMember: boolean): void {
    if (!node || typeof node !== 'object') return

    const type = node.type as string

    if (!ALLOWED_AST_TYPES.has(type)) {
      errors.push({
        message: `Disallowed expression type: ${type}`,
        position: node.start as number,
      })
      return
    }

    switch (type) {
      case 'Identifier': {
        const name = node.name as string
        if (FORBIDDEN_IDENTIFIERS.has(name)) {
          errors.push({
            message: `Forbidden identifier: ${name}`,
            position: node.start as number,
          })
          return
        }
        // Only collect as root identifier if it's not a property of a MemberExpression
        // and it's not the global `Math`
        if (!parentIsMember && name !== 'Math') {
          identifiers.add(name)
        }
        break
      }

      case 'MemberExpression': {
        const path = resolveMemberPath(node)
        if (path) {
          // Check for forbidden globals in the root
          const root = path.split('.')[0]!
          if (FORBIDDEN_IDENTIFIERS.has(root)) {
            errors.push({
              message: `Forbidden identifier: ${root}`,
              position: node.start as number,
            })
            return
          }

          if (root === 'Math') {
            // Validate Math member access
            const parts = path.split('.')
            if (parts.length === 2) {
              const member = parts[1]!
              if (!ALLOWED_MATH_MEMBERS.has(member)) {
                errors.push({
                  message: `Disallowed Math member: Math.${member}`,
                  position: node.start as number,
                })
                return
              }
            }
          } else {
            memberPaths.add(path)
            identifiers.add(root)
          }
        } else {
          // Computed/dynamic member — walk children normally
          walk(node.object, false)
          walk(node.property, false)
        }
        return // Don't recurse further — we handled children
      }

      case 'BinaryExpression': {
        const op = node.operator as string
        if (!ALLOWED_BINARY_OPS.has(op)) {
          errors.push({
            message: `Disallowed binary operator: ${op}`,
            position: node.start as number,
          })
        }
        walk(node.left, false)
        walk(node.right, false)
        return
      }

      case 'LogicalExpression': {
        const op = node.operator as string
        if (!ALLOWED_LOGICAL_OPS.has(op)) {
          errors.push({
            message: `Disallowed logical operator: ${op}`,
            position: node.start as number,
          })
        }
        walk(node.left, false)
        walk(node.right, false)
        return
      }

      case 'UnaryExpression': {
        const op = node.operator as string
        if (!ALLOWED_UNARY_OPS.has(op)) {
          errors.push({
            message: `Disallowed unary operator: ${op}`,
            position: node.start as number,
          })
        }
        walk(node.argument, false)
        return
      }

      case 'ConditionalExpression': {
        walk(node.test, false)
        walk(node.consequent, false)
        walk(node.alternate, false)
        return
      }

      case 'CallExpression': {
        const callee = node.callee
        if (callee?.type === 'MemberExpression') {
          const path = resolveMemberPath(callee)
          if (path) {
            const parts = path.split('.')

            // Math.fn() calls
            if (parts[0] === 'Math' && parts.length === 2) {
              const mathFn = parts[1]!
              if (!ALLOWED_MATH_MEMBERS.has(mathFn)) {
                errors.push({
                  message: `Disallowed Math member: Math.${mathFn}`,
                  position: callee.start as number,
                })
              }
              // Walk arguments
              for (const arg of node.arguments ?? []) {
                walk(arg, false)
              }
              return
            }

            // obj.method() calls — method must be in ALLOWED_METHODS
            const method = parts[parts.length - 1]!
            if (!ALLOWED_METHODS.has(method)) {
              errors.push({
                message: `Disallowed method call: ${method}`,
                position: callee.start as number,
              })
            }

            // Collect identifier and member path for the object part
            const root = parts[0]!
            if (!FORBIDDEN_IDENTIFIERS.has(root) && root !== 'Math') {
              identifiers.add(root)
              if (parts.length > 1) {
                // Collect the object path (without the method)
                const objPath = parts.slice(0, -1).join('.')
                memberPaths.add(objPath)
              }
            }

            // Walk arguments
            for (const arg of node.arguments ?? []) {
              walk(arg, false)
            }
            return
          }
        }

        // Not a recognized call pattern
        errors.push({
          message: 'Disallowed call expression',
          position: node.start as number,
        })
        return
      }

      case 'TemplateLiteral': {
        for (const expr of node.expressions ?? []) {
          walk(expr, false)
        }
        // TemplateElements are allowed and contain no children to walk
        return
      }

      case 'Literal':
      case 'TemplateElement':
        // Leaf nodes — nothing to walk
        return
    }
  }

  walk(ast, false)

  if (errors.length > 0) {
    const result: ParseResult = { success: false, errors }
    PARSE_CACHE.set(source, result)
    return result
  }

  const result: ParseResult = {
    success: true,
    expression: {
      source,
      identifiers: [...identifiers],
      memberPaths: [...memberPaths],
    },
  }
  PARSE_CACHE.set(source, result)
  return result
}

/**
 * Resolve a MemberExpression chain to a dotted string path.
 * Returns null for computed/dynamic members.
 */
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
