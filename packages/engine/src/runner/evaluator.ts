import { createContext, runInNewContext } from 'node:vm'
import type { ExecutionContext } from './types.js'
import { ALLOWED_MATH_MEMBERS } from '../expressions/allowlist.js'

export class ExpressionTimeoutError extends Error {
  constructor(source: string, timeout: number) {
    super(`Expression timed out after ${String(timeout)}ms: ${source}`)
    this.name = 'ExpressionTimeoutError'
  }
}

/**
 * Build a frozen Math object with only allowlisted methods/constants.
 */
function buildSafeMath(): Readonly<Record<string, unknown>> {
  const safeMath: Record<string, unknown> = {}
  for (const key of ALLOWED_MATH_MEMBERS) {
    const value = Math[key as keyof typeof Math]
    safeMath[key] = value
  }
  return Object.freeze(safeMath)
}

const SAFE_MATH = buildSafeMath()

/**
 * Evaluate a flowprint expression in a sandboxed context.
 *
 * The sandbox contains:
 * - `input` from the execution context
 * - Node ID keys from context.results (so previous node outputs can be referenced)
 * - `Math` with only allowlisted methods
 *
 * All other globals (process, require, globalThis, etc.) are inaccessible.
 */
export function evaluateExpression(
  source: string,
  context: ExecutionContext,
  timeout?: number,
): unknown {
  const effectiveTimeout = timeout ?? 1000

  // Build sandbox with input and node results
  const sandbox: Record<string, unknown> = {
    input: context.input,
    Math: SAFE_MATH,
  }

  for (const [nodeId, result] of context.results) {
    sandbox[nodeId] = result
  }

  // Freeze the sandbox to prevent modifications
  Object.freeze(sandbox)

  const vmContext = createContext(sandbox, {
    codeGeneration: { strings: false, wasm: false },
  })

  try {
    return runInNewContext(source, vmContext, { timeout: effectiveTimeout })
  } catch (err: unknown) {
    // Node.js vm timeout errors are cross-context objects — they fail
    // instanceof Error checks. Detect them by duck-typing message/code.
    if (isVmTimeoutError(err)) {
      throw new ExpressionTimeoutError(source, effectiveTimeout)
    }
    throw err
  }
}

/**
 * Detect vm timeout errors by duck-typing. Cross-context errors from
 * node:vm do not pass `instanceof Error` checks because they use the
 * vm's Error constructor, not the host's.
 */
function isVmTimeoutError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const obj = err as Record<string, unknown>
  // Check for ERR_SCRIPT_EXECUTION_TIMEOUT code (Node 22+)
  if (obj.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') return true
  // Fallback: check message content
  if (typeof obj.message === 'string' && obj.message.includes('timed out')) return true
  return false
}
