import type { ExecutionTrace } from './types.js'

/**
 * Format an execution trace for display.
 *
 * @param trace - The execution trace to format
 * @param json - If true, output structured JSON; otherwise output a human-readable table
 * @returns Formatted string
 */
export function formatTrace(trace: ExecutionTrace, json: boolean): string {
  if (json) {
    return JSON.stringify(trace, null, 2)
  }

  const lines: string[] = []

  // Header
  lines.push(`Status: ${trace.status}  Duration: ${String(trace.duration_ms)}ms`)
  lines.push('')

  // Step table
  const idWidth = Math.max(7, ...trace.steps.map((s) => s.node_id.length))
  const typeWidth = Math.max(4, ...trace.steps.map((s) => s.type.length))

  for (const step of trace.steps) {
    const id = step.node_id.padEnd(idWidth)
    const type = step.type.padEnd(typeWidth)
    const status = step.status
    const duration = step.duration_ms !== undefined ? ` (${String(step.duration_ms)}ms)` : ''
    const extra: string[] = []

    if (step.matched_case !== undefined) {
      extra.push(`case=${String(step.matched_case)}`)
    }
    if (step.next) {
      extra.push(`-> ${step.next}`)
    }
    if (step.outcome) {
      extra.push(`outcome=${step.outcome}`)
    }
    if (step.error) {
      extra.push(`error: ${step.error}`)
    }

    const suffix = extra.length > 0 ? `  ${extra.join('  ')}` : ''
    lines.push(`${id}  ${type}  ${status}${duration}${suffix}`)
  }

  // Output/error
  if (trace.output !== undefined) {
    lines.push('')
    lines.push(`Output: ${JSON.stringify(trace.output)}`)
  }
  if (trace.error) {
    lines.push('')
    lines.push(`Error: ${trace.error}`)
  }

  return lines.join('\n')
}
