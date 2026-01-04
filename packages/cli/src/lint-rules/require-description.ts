import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import type { LintRule, LintResult } from './types.js'

export const requireDescription: LintRule = {
  name: 'require-description',
  check(doc: FlowprintDocument): LintResult[] {
    const results: LintResult[] = []

    for (const [nodeId, node] of Object.entries(doc.nodes)) {
      if (node.type === 'action' && !node.description) {
        results.push({
          rule: 'require-description',
          path: `/nodes/${nodeId}`,
          message: `Action node "${nodeId}" is missing a description`,
        })
      }
    }

    return results
  },
}
