import type { NodeExecutionRecord } from '../walker/types.js'
import type { DataClassification, RedactionPolicy } from './types.js'

/**
 * Apply redaction policy to a trace record based on node/lane classifications.
 *
 * If no classifications apply, or none of the classifications are marked
 * `'redact'` in the policy, the record is returned unchanged.
 *
 * When redaction is triggered, the `output` field is replaced with
 * `{ __redacted: true }`. All other fields (nodeId, type, lane, timing,
 * handler, error) are preserved for observability.
 */
export function redactRecord(
  record: NodeExecutionRecord,
  classifications: DataClassification[],
  policy: RedactionPolicy,
): NodeExecutionRecord {
  if (classifications.length === 0) return record

  // Any classification marked 'redact' triggers redaction
  const shouldRedact = classifications.some((c) => policy[c] === 'redact')
  if (!shouldRedact) return record

  return {
    ...record,
    output: { __redacted: true },
  }
}
