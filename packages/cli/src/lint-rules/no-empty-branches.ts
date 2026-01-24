import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import type { LintRule, LintResult } from './types.js'

export const noEmptyBranches: LintRule = {
  name: 'no-empty-branches',
  check(doc: FlowprintDocument): LintResult[] {
    const results: LintResult[] = []

    for (const [nodeId, node] of Object.entries(doc.nodes)) {
      if (node.type === 'parallel') {
        if ((node.branches as unknown as string[]).length === 0) {
          results.push({
            rule: 'no-empty-branches',
            path: `/nodes/${nodeId}/branches`,
            message: `Parallel node "${nodeId}" has no branches`,
          })
        }
      }
    }

    return results
  },
}
